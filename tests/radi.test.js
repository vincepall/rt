"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const rootDir = path.resolve(__dirname, "..");
const assistantPath = path.join(rootDir, "rt-assistant.js");

function maakDomStub() {
  const makeNode = (id = "") => ({
    id,
    tagName: id === "rt-ai-input" ? "TEXTAREA" : "DIV",
    style: {
      setProperty: () => {},
      removeProperty: () => {},
    },
    dataset: {},
    value: "",
    innerHTML: "",
    textContent: "",
    scrollTop: 0,
    scrollHeight: 420,
    clientHeight: 200,
    classList: {
      _set: new Set(),
      add(...cls) { cls.forEach((c) => this._set.add(c)); },
      remove(...cls) { cls.forEach((c) => this._set.delete(c)); },
      toggle(c, f) {
        if (typeof f === "boolean") {
          if (f) this._set.add(c);
          else this._set.delete(c);
        } else if (this._set.has(c)) this._set.delete(c);
        else this._set.add(c);
      },
      contains(c) { return this._set.has(c); },
    },
    setAttribute: () => {},
    getAttribute: () => null,
    appendChild: () => {},
    addEventListener: () => {},
    contains: () => false,
    querySelector: () => null,
    querySelectorAll(sel) {
      if (sel === ".rt-ai-history-entry") {
        const html = String(elMap["rt-ai-response"].innerHTML || "");
        const matches = html.match(/class="rt-ai-history-entry[^"]*"/g) || [];
        return matches.map((_, i) => ({ offsetTop: i * 120, offsetHeight: 110 }));
      }
      return [];
    },
    focus: () => {},
    blur: () => {},
    remove: () => {},
  });

  const elMap = {
    "rt-ai-response": makeNode("rt-ai-response"),
    "rt-ai-transcript": makeNode("rt-ai-transcript"),
    "rt-ai-memory-bar": makeNode("rt-ai-memory-bar"),
    "rt-ai-input": makeNode("rt-ai-input"),
  };

  const head = makeNode("head");
  const body = makeNode("body");

  return {
    elMap,
    document: {
      readyState: "complete",
      head,
      body,
      documentElement: makeNode("html"),
      activeElement: null,
      addEventListener: () => {},
      createElement: (tag) => makeNode(tag),
      getElementById: (id) => elMap[id] || null,
      querySelector: () => null,
      querySelectorAll: () => [],
    },
  };
}

function laadRtAssistant() {
  const src = fs.readFileSync(assistantPath, "utf8");
  const { elMap, document } = maakDomStub();
  const context = {
    window: {},
    document,
    localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
    navigator: { userAgent: "node" },
    fetch: async () => ({ ok: false, text: async () => "" }),
    console,
    Math,
    Date,
    Set,
    Map,
    RegExp,
    Error,
    JSON,
    parseFloat,
    parseInt,
    isNaN,
    isFinite,
    encodeURIComponent,
    decodeURIComponent,
    setTimeout: () => 0,
    clearTimeout: () => {},
    requestAnimationFrame: (fn) => {
      if (typeof fn === "function") fn();
      return 0;
    },
  };
  context.window = context;
  context.globalThis = context;
  vm.runInNewContext(src, context, { filename: "rt-assistant.js" });
  return { RT: context.RtAssistant, elMap, context };
}

(async () => {
  const { RT, elMap, context } = laadRtAssistant();
  await RT.laadBronnenCsv(true);

  let passed = 0;
  let failed = 0;
  function assert(naam, ok, detail = "") {
    if (ok) {
      passed++;
    } else {
      failed++;
      console.error(`FAIL | ${naam}${detail ? " => " + detail : ""}`);
    }
  }

  const norm = (s) => RT.herstelVakjargon(RT.corrigeerSpraakTekst(s));
  const stripTags = (s) => String(s || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

  // 1. Spraak & Vakjargon Normalisatie
  const spraakCases = [
    ["zes duimig van 3 tik", /diameter 168\.3.*3 dik/i],
    ["4 duimelot wand 6", /diameter 114\.3 wand 6/i],
    ["on striem opname draatje", /onstream.*draadje/i],
    ["beeld kwalitijd draatjes b k i", /beeldkwaliteit draadjes BKI/i],
    ["kwadraat wet focus wissel", /kwadratenwet focusverandering/i],
    ["dosis tempel met kobold", /dosistempo.*Co-60/i],
    ["iridium 192 afscherming met wolf ram", /Ir-192.*wolfraam/i],
    ["balteau seram onstream t a", /Balteau Ceram \(2\.5 mm\) onstream klasse TA/i],
    ["300 café rond straler", /300 kV Balteau Rondstraler \(5 mm\)/i],
    ["Lasprieten", /^lasbreedte$/i],
    ["Driedijk", /^3 dik$/i],
    ["hoe groot moeten afstapping zijn als ik een 30 creeridium gebruik", /hoe groot moet de afzetting zijn.*30 curie Ir-192/i],
    ["Hoeveel lood heb ik nodig om een afzetting van 10 meter te maken met een 30-gerie selenium bron", /afzetting van 10 meter.*30 curie selenium/i],
    ["voorkeurs van 400 mm", /^focus van 400 mm$/i],
    ["Achtung", /^diameter 219\.1$/i],
    ["Wat is de wandelijke van een 8e schedule 10s", /wanddikte van een diameter 219\.1 schedule 10s/i],
    ["Vierduino scheelt 10s", /^diameter 114\.3 schedule 10s$/i],
    ["wat is de wanddikte van een 8 duiker schedule 10s", /wanddikte van een diameter 219\.1 schedule 10s/i],
    ["single wall single image", /\bSWSI\b/],
    ["enkel wand enkel beeld", /\bSWSI\b/],
    ["double wall single image", /\bDWSI\b/],
    ["dubbel wand enkel beeld", /\bDWSI\b/],
    ["double wall double image", /\bDWDI\b/],
    ["dubbel wand dubbel beeld", /\bDWDI\b/],
    ["film focus distance", /\bFFD\b/],
    ["object to film distance", /\bOFD\b/],
    ["source to object distance", /\bSOD\b/],
    ["source to detector distance", /\bSDD\b/],
    ["image quality indicator", /\bIQI BKI\b/],
    ["half value layer van lood", /halveringsdikte hvl van lood/i],
    ["geometric unsharpness", /geometrische onscherpte Ug/i],
    ["maximum wall thickness 12 mm", /Wmax 12 mm/i],
    ["DN150 van schedule XXS", /diameter 168\.3 van schedule xxs/i],
    ["Yxlon 300 en Smart EVO", /Yxlon 300 \(3 mm\) en Smart EVO \(1 mm\)/i],
    ["staarste selenium", /\bsterkste selenium\b/i],
    ["de stagische selenium", /\bsterkste selenium\b/i],
    ["achterma", /\bdiameter 219\.1\b/i],
    ["een achterma van 6 dik", /diameter 219\.1.*6 dik/i],
    ["achterman schedule 40", /diameter 219\.1.*schedule 40/i],
    ["zestuimer van 8 dik", /diameter 168\.3.*8 dik/i],
    ["vijftuimer schedule 40", /diameter 141\.3.*schedule 40/i],
    ["vierduino van 6 dik", /diameter 114\.3.*6 dik/i],
    ["dertigcurie selenium", /30 curie selenium/i],
    [
      "Ik heb een staling steeds van 1 minuut en Sword 1.5 hoe ga krijg ik zwart in 2.5",
      /stralingstijd van 1 minuut en zwarting 1\.5 hoe krijg ik zwarting 2\.5/i,
    ],
    [
      "extra 1 minuut en heb swording 1.5 Hoe krijg ik zwart in 2.5",
      /ik straal 1 minuut en heb zwarting 1\.5 hoe krijg ik zwarting 2\.5/i,
    ],
    ["van drietig", /^van 3 dik$/i],
    ["Hoe dik is een teamd want ik ga zo 40", /hoe dik is een diameter 273 van schedule 40/i],
    ["Hoe dik is een 10-dij mag van schedule 40", /hoe dik is een diameter 273 van schedule 40/i],
    ["een 4d humor", /^een diameter 114\.3$/i],
    ["een 4 dik humor", /^een diameter 114\.3$/i],
    ["vier humor van 6 dik", /diameter 114\.3 van 6 dik/i],
    ["minimale voorkeur op een 6 duimer", /minimale focus op een diameter 168\.3/i],
    ["film voorkeur afstand en veel type", /FFD en film(?:type|kwaliteit)/i],
    ["welke BKI houder voor wee 13", /welke BKI houder voor W13/i],
    ["verdeel een langstraat met 10 bij 48", /verdeel een langsnaad met 10x48/i],
    ["chemische onscherpte en los compensatie", /geometrische onscherpte Ug en lascompensatie/i],
    ["tweede man", /^diameter 60\.3$/i],
    ["op een vierde man van 6 dik", /op een diameter 114\.3 van 6 dik/i],
    ["zesde maar schedule 80", /diameter 168\.3 schedule 80/i],
    ["tiende mag van 8 dik", /diameter 273 van 8 dik/i],
    ["een vierde van zes dik", /een diameter 114\.3 van 6 dik/i],
    [
      "Hoe lang moet ik stralen om een 2 duimer van schedule 80 met de stangste selenium en een Focus van 500",
      /de sterkste selenium/i,
    ],
    [
      "kan ik draadje maar ik zie dat mijn plaats van ardijk volgens SV",
      /welk draadje moet ik zien op een plaat van 8 dik volgens ASME/i,
    ],
  ];
  for (const [inp, rx] of spraakCases) {
    const out = norm(inp);
    assert(`Spraak: "${inp}"`, rx.test(out), out);
  }

  // 2. False-Positive Veiligheidschecks
  const safeCases = [
    ["minimale doorstraalde dikte voor water in een stalen pijp", (o) => o === "minimale doorstraalde dikte voor water in een stalen pijp"],
    ["de kleinere buis is groter dan drie meter", (o) => o === "de kleinere buis is groter dan 3 meter"],
    ["de pijp is dikker dan 12 mm", (o) => o === "de pijp is dikker dan 12 mm"],
    ["mijn voorkeur gaat uit naar selenium", (o) => o === "mijn voorkeur gaat uit naar selenium"],
    ["enkel wand dubbel beeld", (o) => !/\bSWSI\b/i.test(o)],
    ["97969M (25.2 Ci)", (o) => o.toLowerCase() === "97969m (25.2 ci)"],
    ["achter de collimator", (o) => o === "achter de collimator"],
    ["achteraan de leiding", (o) => o === "achteraan de leiding"],
    ["Ik straal 1 minuut en heb zwarting 1.5 hoe krijg ik 2.5", (o) => !/\bminffd\b/i.test(o) && /\b1 minuut\b/i.test(o)],
  ];
  for (const [inp, fn] of safeCases) {
    const out = norm(inp);
    assert(`Veiligheid: "${inp}"`, fn(out), out);
  }

  // 3. E2E Rekenmodules
  {
    RT.resetGespreksGeheugen();
    const res = await RT.verwerkUniverseleVraag("Wat is de minimale ffd op een 2 duimer volgens klasse b met een selenium?");
    const txt = stripTags(res && res.text);
    assert("E2E MinFFD in cm", /Minimaal 75\.2 cm \(752 mm\)/i.test(txt), txt);
  }
  {
    RT.resetGespreksGeheugen();
    const res = await RT.verwerkUniverseleVraag("hoeveel opnames moet ik maken op een DN150 van schedule XXS met een Yxlon 300 en een focus van 350 mm volgens klasse b");
    const txt = stripTags(res && res.text);
    assert(
      "E2E Opnames DN150 XXS FFD>De",
      /21\.95 mm/.test(txt) && /7 opnames/.test(txt) && /375 mm/.test(txt) && !/welke opstelling/i.test(txt) && !/wat is de wanddikte/i.test(txt),
      txt
    );
  }
  {
    RT.resetGespreksGeheugen();
    await RT.verwerkUniverseleVraag("Hoeveel lood heb ik nodig om een afzetting van 10 meter te maken met een selenium bron");
    const res = await RT.verwerkUniverseleVraag("97969M (25.2 Ci)");
    const txt = stripTags(res && res.text);
    assert("E2E Lood 97969M zonder 97969 meter", /\d+(?:\.\d+)? Curie Se-75/i.test(txt) && /10 meter/i.test(txt) && !/97969 meter/i.test(txt), txt);
  }
  {
    RT.resetGespreksGeheugen();
    const res = await RT.verwerkUniverseleVraag("ik straal 2 minuten op 500 mm, hoelang moet ik stralen op 700 mm");
    const txt = stripTags(res && res.text);
    assert("E2E Focusverandering", /3m 55s/.test(txt), txt);
  }
  {
    RT.resetGespreksGeheugen();
    const res = await RT.verwerkUniverseleVraag("welk draadje voor 10 mm dik op een plaat volgens klasse b");
    const txt = stripTags(res && res.text);
    assert("E2E BKI draadje", /\bW14\b/.test(txt), txt);
  }
  {
    RT.resetGespreksGeheugen();
    const res = await RT.verwerkUniverseleVraag("gevuld met benzeen 6 duimer wand 6");
    const txt = stripTags(res && res.text);
    assert("E2E Gevulde leiding", /Benzeen/i.test(txt) && /879 kg\/m/i.test(txt), txt);
  }
  {
    RT.resetGespreksGeheugen();
    const res = await RT.verwerkUniverseleVraag("Ik straal 1 minuut en heb zwarting 1.5 hoe krijg ik 2.5");
    const txt = stripTags(res && res.text);
    assert(
      "E2E Zwarting tijd 1.5 -> 2.5 zonder MinFFD fout",
      /1 minuut en 40 seconden/i.test(txt) && !/minimale film-focusafstand/i.test(txt) && !/Volgens welke norm/i.test(txt),
      txt
    );
  }
  {
    RT.resetGespreksGeheugen();
    const res = await RT.verwerkUniverseleVraag(RT.corrigeerSpraakTekst("Ik heb een staling steeds van 1 minuut en Sword 1.5 hoe ga krijg ik zwart in 2.5"));
    const txt = stripTags(res && res.text);
    assert("E2E Spraak Zwarting staling steeds + Sword", /1 minuut en 40 seconden/i.test(txt), txt);
  }
  {
    RT.resetGespreksGeheugen();
    const res = await RT.verwerkUniverseleVraag(RT.corrigeerSpraakTekst("Hoe dik is een teamd want ik ga zo 40"));
    const txt = stripTags(res && res.text);
    assert("E2E Spraak 10 duimer Sch 40 (teamd want ik ga zo 40)", /9\.27 mm/.test(txt), txt);
  }
  {
    RT.resetGespreksGeheugen();
    await RT.verwerkUniverseleVraag(
      RT.corrigeerSpraakTekst("Hoe lang moet ik stralen op een 2 duimer van schouder 80 voor een cm klasse B met een Focus van 1 meter")
    );
    RT.selecteerBronUitDropdown("bron_97969M");
    const res = await RT.verwerkUniverseleVraag("25.1 Curie");
    const txt = stripTags(res && res.text);
    assert(
      "E2E Stralingstijd schouder 80 + cm klasse B direct berekend",
      /Stralingstijd voor/i.test(txt) && /2 duimer/i.test(txt) && !/Wat is de leidingmaat/i.test(txt),
      txt
    );
  }
  {
    RT.resetGespreksGeheugen();
    await RT.verwerkUniverseleVraag("Hoe lang moet ik stralen op een 2 duimer met een focus van 1 meter");
    RT.selecteerBronUitDropdown("bron_97969M");
    const res = await RT.verwerkUniverseleVraag("25.1 Curie");
    const txt = stripTags(res && res.text);
    assert(
      "E2E Stralingstijd bekende diameter vraagt alleen wanddikte/schedule",
      /2 duimer/i.test(txt) && /wanddikte/i.test(txt) && !/Wat is de leidingmaat/i.test(txt),
      txt
    );
  }
  {
    RT.resetGespreksGeheugen();
    RT.selecteerBronUitDropdown("balteau_ceram");
    const res = await RT.verwerkUniverseleVraag("Asme, balteau, hoeveel opnames moet ik maken op een 8 duim van 7.8 dik");
    const txt = stripTags(res && res.text);
    assert(
      "E2E X-ray Balteau voorgestelde FFD is De+150 (369 mm) en niet De+15 (234 mm)",
      /369 mm/.test(txt) && !/234 mm/.test(txt),
      txt
    );
  }
  {
    RT.resetGespreksGeheugen();
    RT.selecteerBronUitDropdown("balteau_rondstraler");
    const res = await RT.verwerkUniverseleVraag("Asme, hoeveel opnames moet ik maken op een 8 duim van 7.8 dik");
    const txt = stripTags(res && res.text);
    assert(
      "E2E Balteau Rondstraler gebruikt opstelling centraal en FFD = De/2 (110 mm)",
      /centrale \(panoramische\) opstelling/i.test(txt) && /1 opname/i.test(txt) && /110 mm/.test(txt) && RT.actiefGespreksGeheugen.sfd === 110,
      `${txt} | sfd=${RT.actiefGespreksGeheugen.sfd}`
    );
    const voorgesteld = RT.bepaalVoorgesteldeFFD({ diameter: 219.1, bronTekst: "Balteau Rondstraler (5.0 mm)", bronType: "Rontgen" }, "");
    assert("bepaalVoorgesteldeFFD voor Rondstraler is halve diameter (110 mm)", voorgesteld === 110, `got=${voorgesteld}`);
  }
  {
    RT.resetGespreksGeheugen();
    const res1 = await RT.verwerkUniverseleVraag("Wat is de minimale FFD volgens asme als ik een brongrootte heb van 3 en mijn ofa is 50");
    const txt1 = stripTags(res1 && res1.text);
    assert(
      "E2E MinFFD ASME met brongrootte 3 en OFA 50 vraagt om wanddikte (wt voor Ug)",
      /wanddikte/i.test(txt1) && RT.actiefGespreksGeheugen.diameter === null && RT.actiefGespreksGeheugen.wanddikte === null && RT.actiefGespreksGeheugen.ofa === 50 && RT.actiefGespreksGeheugen.brongrootte === 3,
      `${txt1} | mem=${JSON.stringify({ d: RT.actiefGespreksGeheugen.diameter, wt: RT.actiefGespreksGeheugen.wanddikte, ofa: RT.actiefGespreksGeheugen.ofa, bg: RT.actiefGespreksGeheugen.brongrootte })}`
    );
    const res2 = await RT.verwerkUniverseleVraag("10 mm dik");
    const txt2 = stripTags(res2 && res2.text);
    assert(
      "E2E MinFFD ASME met brongrootte 3, OFA 50 en wt 10 mm -> 344 mm (Ug 0.51, conform MinFFD.html)",
      /344 mm/.test(txt2) && /OFA 50 mm/i.test(txt2),
      txt2
    );
  }
  {
    RT.resetGespreksGeheugen();
    const res = await RT.verwerkUniverseleVraag(RT.corrigeerSpraakTekst("kan ik draadje maar ik zie dat mijn plaats van ardijk volgens SV"));
    const txt = stripTags(res && res.text);
    assert("E2E Spraak draadje plaat 8 dik ASME", /ASME/i.test(txt) && /8(?:\.0)? mm/i.test(txt), txt);
  }
  {
    RT.resetGespreksGeheugen();
    const res = await RT.verwerkUniverseleVraag("Hoe bereken ik de onscherpte bij asme?");
    const txt = stripTags(res && res.text);
    assert(
      "E2E Kennisvraag: Hoe bereken ik de onscherpte bij ASME (Ug formule + grenzen)",
      /F (?:&times;|×) d/i.test(txt) && /FFD (?:&minus;|−) d/i.test(txt) && /0\.51 mm/i.test(txt) && /0\.76 mm/i.test(txt) && /1\.02 mm/i.test(txt),
      txt
    );
  }
  {
    RT.resetGespreksGeheugen();
    const rAlara = await RT.verwerkUniverseleVraag("Wat is het ALARA principe?");
    assert("E2E Kennisvraag: ALARA principe", /As Low As Reasonably Achievable/i.test(stripTags(rAlara && rAlara.text)), stripTags(rAlara && rAlara.text));

    const rGrens10 = await RT.verwerkUniverseleVraag("Grens 10 microSv/uur", { isChip: true });
    assert("E2E Chip: Grens 10 microSv/uur geeft uitleg gecontroleerde zone (niet NDO-groeperingen)", /gecontroleerde zone/i.test(stripTags(rGrens10 && rGrens10.text)) && /Euratom/i.test(stripTags(rGrens10 && rGrens10.text)), stripTags(rGrens10 && rGrens10.text));

    const rD4D7 = await RT.verwerkUniverseleVraag("Film D4 vs D7", { isChip: true });
    assert("E2E Chip: Film D4 vs D7 geeft Agfa Structurix uitleg", /Agfa Structurix/i.test(stripTags(rD4D7 && rD4D7.text)), stripTags(rD4D7 && rD4D7.text));

    const rRadi = await RT.verwerkUniverseleVraag("Wat betekent R.A.D.I?");
    const tRadi = stripTags(rRadi && rRadi.text);
    assert("E2E App-info: Wat betekent R.A.D.I? legt alle 4 woorden uit", /Radiografie Assistent Deterministische Inferentie/i.test(tRadi) && /Deterministische/i.test(tRadi) && /Inferentie/i.test(tRadi), tRadi);

    const rHvl = await RT.verwerkUniverseleVraag("Wat is de halveringsdikte HVL?");
    assert("E2E Kennisvraag: Halveringsdikte HVL", /Half Value Layer/i.test(stripTags(rHvl && rHvl.text)) && /3\.0 mm/i.test(stripTags(rHvl && rHvl.text)), stripTags(rHvl && rHvl.text));

    const rZwart = await RT.verwerkUniverseleVraag("Wat is de formule van zwarting?");
    assert("E2E Kennisvraag: Zwarting formule", /log\s*10/i.test(stripTags(rZwart && rZwart.text)), stripTags(rZwart && rZwart.text));

    const rLood = await RT.verwerkUniverseleVraag("Waarom gebruiken we loodfolie in de cassette?");
    assert("E2E Kennisvraag: Loodfolie / Versterkingsschermen", /foto-elektronen/i.test(stripTags(rLood && rLood.text)) && /Loodfolie/i.test(stripTags(rLood && rLood.text)), stripTags(rLood && rLood.text));

    const rVerval = await RT.verwerkUniverseleVraag("Hoe bereken ik het radioactief verval?");
    assert("E2E Kennisvraag: Radioactief verval formule", /73\.83 dagen/i.test(stripTags(rVerval && rVerval.text)), stripTags(rVerval && rVerval.text));
  }
  {
    RT.resetGespreksGeheugen();
    let openedUrl = null;
    context.open = (url) => { openedUrl = url; return {}; };
    RT.verstuurSuggestie("lasfout.html");
    assert("Chip lasfout.html opent directe URL in plaats van chatvraag", openedUrl === "lasfout.html", `openedUrl=${openedUrl}`);

    elMap["rt-ai-input"].value = "welke lasfouten ken je?";
    RT.verstuurTekst();
    await new Promise((r) => setImmediate(r));
    const html = elMap["rt-ai-response"].innerHTML;
    assert("UI rendert lasfout.html chip als echte <a>-link", /<a href="lasfout\.html"[^>]*class="rt-ai-chip-btn"/i.test(html), html.slice(-260));
  }
  {
    RT.resetGespreksGeheugen();
    const res = await RT.verwerkUniverseleVraag("Ik heb met de sterkste selenium een afzetting van 5 meter en er zit een betonnen muur tussen van 10cm, hoeveel lood heb ik nodig om de afzetting goed te krijgen?");
    const txt = stripTags(res && res.text);
    assert(
      "E2E Afzetting lood nodig met 10cm betonnen muur (sterkste Se-75, 5 meter)",
      /10 cm \(100 mm\) beton/i.test(txt) && /HVL beton = 30 mm/i.test(txt) && /mm lood/i.test(txt) && RT.actiefGespreksGeheugen.betonMm === 100 && RT.actiefGespreksGeheugen.sfd === null && RT.actiefGespreksGeheugen.diameter === null,
      `${txt} | mem=${JSON.stringify({ beton: RT.actiefGespreksGeheugen.betonMm, sfd: RT.actiefGespreksGeheugen.sfd, d: RT.actiefGespreksGeheugen.diameter })}`
    );

    const resDt = await RT.verwerkUniverseleVraag("Wat is het dosistempo op 5 meter achter een bakstenen muur van 20 cm met 30 Ci Ir-192?");
    const txtDt = stripTags(resDt && resDt.text);
    assert(
      "E2E Dosistempo achter 20 cm bakstenen muur (30 Ci Ir-192, 5 meter)",
      /20 cm \(200 mm\) baksteen/i.test(txtDt) && /HVL baksteen = 60 mm/i.test(txtDt) && /μSv\/uur/i.test(txtDt),
      txtDt
    );

    RT.resetGespreksGeheugen();
    const resAfst = await RT.verwerkUniverseleVraag("Wat is de afzettingsafstand voor 30 Ci Ir-192 met een betonnen muur van 15 cm?");
    const txtAfst = stripTags(resAfst && resAfst.text);
    assert(
      "E2E Afzettingsafstand met 15 cm betonnen muur (30 Ci Ir-192)",
      /15 cm \(150 mm\) beton/i.test(txtAfst) && /Incl\. 15 cm beton/i.test(txtAfst),
      txtAfst
    );

    RT.resetGespreksGeheugen();
    const resMuur1 = await RT.verwerkUniverseleVraag("Ik heb met de sterkste selenium een afzetting van 5 meter en er zit een muur van 10cm tussen, hoeveel lood heb ik nodig?");
    const txtMuur1 = stripTags(resMuur1 && resMuur1.text);
    assert(
      "E2E Onbekende muur 10cm vraagt om beton of baksteen",
      /beton/i.test(txtMuur1) && /baksteen/i.test(txtMuur1) && Array.isArray(resMuur1.chips) && resMuur1.chips.includes("Beton") && resMuur1.chips.includes("Baksteen"),
      txtMuur1
    );
    const resMuur2 = await RT.verwerkUniverseleVraag("Beton", { isChip: true });
    const txtMuur2 = stripTags(resMuur2 && resMuur2.text);
    assert(
      "E2E Vervolgkeuze Beton rekent direct door met 10 cm beton",
      /10 cm \(100 mm\) beton/i.test(txtMuur2) && /mm lood/i.test(txtMuur2) && RT.actiefGespreksGeheugen.betonMm === 100 && !RT.actiefGespreksGeheugen.muurOnbekendMm,
      txtMuur2
    );

    RT.resetGespreksGeheugen();
    const resMuurAfst1 = await RT.verwerkUniverseleVraag("Wat is het dosistempo achter een muur op 5 meter met de sterkste iridium");
    const txtMuurAfst1 = stripTags(resMuurAfst1 && resMuurAfst1.text);
    assert(
      "E2E 'achter een muur op 5 meter' ziet 5 meter als afstand (niet als 500 cm muur!) en vraagt dikte+materiaal",
      !/500 cm|5000 mm/i.test(txtMuurAfst1) && /dikte/i.test(txtMuurAfst1) && RT.actiefGespreksGeheugen.afzettingDoelMeter === 5 && !RT.actiefGespreksGeheugen.muurOnbekendMm,
      `${txtMuurAfst1} | doelM=${RT.actiefGespreksGeheugen.afzettingDoelMeter} | muur=${RT.actiefGespreksGeheugen.muurOnbekendMm}`
    );
    const resMuurAfst2 = await RT.verwerkUniverseleVraag("10 cm beton", { isChip: true });
    const txtMuurAfst2 = stripTags(resMuurAfst2 && resMuurAfst2.text);
    assert(
      "E2E Vervolg '10 cm beton' rekent dosistempo op 5 meter met 10 cm beton",
      /5 meter/i.test(txtMuurAfst2) && /10 cm \(100 mm\) beton/i.test(txtMuurAfst2) && /μSv\/uur/i.test(txtMuurAfst2),
      txtMuurAfst2
    );
    const resMuurAfst3 = await RT.verwerkUniverseleVraag("en met een loodplaat ertussen");
    const txtMuurAfst3 = stripTags(resMuurAfst3 && resMuurAfst3.text);
    assert(
      "E2E Vervolg 'en met een loodplaat ertussen' blijft in dosistempo-modus (μSv/uur, niet meters)",
      /Dosistempo op 5 meter/i.test(txtMuurAfst3) && /6 mm lood/i.test(txtMuurAfst3) && /10 cm \(100 mm\) beton/i.test(txtMuurAfst3) && /μSv\/uur/i.test(txtMuurAfst3),
      txtMuurAfst3
    );
  }
  {
    RT.resetGespreksGeheugen();
    elMap["rt-ai-input"].value = "halveringstijd van selenium";
    RT.verstuurTekst();
    await new Promise((r) => setImmediate(r));
    const kopieTekst = RT.kopieerGesprek();
    assert(
      "QOL kopieerGesprek geeft leesbare platte tekst zonder HTML-tags",
      /R\.A\.D\.I\. Gesprek/i.test(kopieTekst) && /119\.78 dagen/.test(kopieTekst) && !/<div|<strong/i.test(kopieTekst),
      kopieTekst.slice(0, 200)
    );
    const mailUrl = RT.meldFoutViaMail();
    assert(
      "QOL meldFoutViaMail bouwt direct vooraf ingevulde mailto-link naar vincepall@gmail.com",
      /^mailto:vincepall@gmail\.com\?subject=/.test(mailUrl) && decodeURIComponent(mailUrl).includes("119.78 dagen"),
      mailUrl.slice(0, 180)
    );
  }
  {
    // Audit-fixes regressietests
    RT.resetGespreksGeheugen();
    const rAsmeCentraal = await RT.verwerkUniverseleVraag("Mag ik een pijp met diameter 700 mm van 60 mm dik centraal schieten met focus 3 mm volgens ASME?");
    const tAsmeCentraal = stripTags(rAsmeCentraal && rAsmeCentraal.text);
    assert(
      "Audit fix 1: berekenMagIk ASME centraal wt=60 mm gebruikt Ug=0.76 (min FFD 297 mm, niet 413 mm)",
      /297 mm/.test(tAsmeCentraal) && !/413 mm/.test(tAsmeCentraal) && /Ja, dat is toegestaan/i.test(tAsmeCentraal),
      tAsmeCentraal
    );

    const bkiRvs = RT.geefBkiMateriaalgroepInfo("RVS 316Ti");
    const bkiTin = RT.geefBkiMateriaalgroepInfo("Tinbrons");
    const bkiTi = RT.geefBkiMateriaalgroepInfo("Titanium Grade 2");
    assert(
      "Audit fix 3: RVS 316Ti (FE) en Tinbrons (CU) niet als TI EN; Titanium wel TI EN",
      bkiRvs && bkiRvs.isoGroup === "FE" && bkiTin && bkiTin.isoGroup === "CU" && bkiTi && bkiTi.isoGroup === "TI",
      JSON.stringify({ bkiRvs, bkiTin, bkiTi })
    );

    RT.resetGespreksGeheugen();
    const rAsmeEq = await RT.verwerkUniverseleVraag("Welk draadje in plaats van ASME draadje 6?");
    const tAsmeEq = stripTags(rAsmeEq && rAsmeEq.text);
    assert(
      "Audit fix 2: ASME 6 (W12) staat op 6 FE EN of 10 FE EN (niet 13 FE EN)",
      /6 FE EN of 10 FE EN/.test(tAsmeEq) && !/13 FE EN/.test(tAsmeEq),
      tAsmeEq
    );

    RT.resetGespreksGeheugen();
    const rBuis60 = await RT.verwerkUniverseleVraag("5.99 mA*min bij 3 mA");
    const tBuis60 = stripTags(rBuis60 && rBuis60.text);
    assert(
      "Audit fix 4: geen '1 minuut en 60 seconden' afrondingsbug bij buistabel",
      !/60 seconden/.test(tBuis60) && /2 minuten/.test(tBuis60),
      tBuis60
    );

    RT.resetGespreksGeheugen();
    const rBundel = await RT.verwerkUniverseleVraag("Welke focus heb ik nodig voor een 48 cm film bij een openingshoek van 35 graden?");
    const tBundel = stripTags(rBundel && rBundel.text);
    assert(
      "Audit fix 5: bundelbreedte gebruikt customAngle 35° bij minimale focusvraag (762 mm)",
      /35°/.test(tBundel) && /762 mm/.test(tBundel),
      tBundel
    );

    RT.resetGespreksGeheugen();
    const rVervalTerug = await RT.verwerkUniverseleVraag("Wat was een 50 Ci Ir-192 bron 30 dagen geleden?");
    const tVervalTerug = stripTags(rVervalTerug && rVervalTerug.text);
    assert(
      "Audit fix 6: bronverval 'wat was ... 30 dagen geleden' rekent terug (66.22 Ci, niet 37.75 Ci)",
      /66\.22 Ci/.test(tVervalTerug) && !/37\.75 Ci/.test(tVervalTerug),
      tVervalTerug
    );

    RT.resetGespreksGeheugen();
    const rAsmeDraad1 = await RT.verwerkUniverseleVraag("Welk draadje moet ik zien op een plaat van 6 mm volgens ASME?");
    assert(
      "Audit fix 7a: ASME draadje toont ASTM eerst (EN tussen haakjes) + vraagt lasoverdikte met Lascategorie.png en chips A/B/C/D",
      /ASTM #5 \(EN W13\)/.test(rAsmeDraad1.text) && /Lascategorie\.png/.test(rAsmeDraad1.text) && rAsmeDraad1.chips.includes("Lastype A"),
      rAsmeDraad1.text.slice(0, 260)
    );
    const rAsmeDraad2 = await RT.verwerkUniverseleVraag("Lastype A", { isChip: true });
    const tAsmeDraad2 = stripTags(rAsmeDraad2 && rAsmeDraad2.text);
    assert(
      "Audit fix 7b: Lastype A telt 2.5 mm overdikte op bij 6 mm (8.5 mm -> ASTM #6 (EN W12))",
      /ASTM #6 \(EN W12\)/.test(tAsmeDraad2) && /8\.5 mm/.test(tAsmeDraad2),
      tAsmeDraad2
    );

    RT.resetGespreksGeheugen();
    const rZwCompact = await RT.verwerkUniverseleVraag("Ik straal 1m20s en heb zwarting 2.0, hoelang moet ik stralen om 2.5 te krijgen");
    const tZwCompact = stripTags(rZwCompact && rZwCompact.text);
    assert(
      "E2E Compacte tijd 1m20s bij zwarting 2.0 -> 2.5 geeft 1m 40s (100s) zonder DN50/wanddikte in geheugen",
      /1m 40s/.test(tZwCompact) && /100s/.test(tZwCompact) && RT.actiefGespreksGeheugen.diameter === null && RT.actiefGespreksGeheugen.wanddikte === null,
      `${tZwCompact} | mem=${JSON.stringify({ d: RT.actiefGespreksGeheugen.diameter, wt: RT.actiefGespreksGeheugen.wanddikte })}`
    );

    RT.resetGespreksGeheugen();
    const rMaWissel = await RT.verwerkUniverseleVraag("Ik straal 2 minuten met 3 mA hoelang is het met 5 mA");
    const tMaWissel = stripTags(rMaWissel && rMaWissel.text);
    assert(
      "E2E Buisstroom (mA) wissel: 2 minuten bij 3 mA -> 5 mA geeft 1m 12s (6 mA·min)",
      /1m 12s/.test(tMaWissel) && /3 mA/.test(tMaWissel) && /5 mA/.test(tMaWissel),
      tMaWissel
    );
    const rMaVervolg = await RT.verwerkUniverseleVraag("hoelang met 1.75");
    const tMaVervolg = stripTags(rMaVervolg && rMaVervolg.text);
    assert(
      "E2E Buisstroom vervolgvraag 'hoelang met 1.75' rekent direct door (6 mA·min -> 3m 26s)",
      /3m 26s/.test(tMaVervolg) && /1\.75 mA/.test(tMaVervolg),
      tMaVervolg
    );

    RT.resetGespreksGeheugen();
    const rCombo1 = await RT.verwerkUniverseleVraag("ik straal 1 minuut met 2 mA op d4, hoelang is het met 4 mA op d5");
    const tCombo1 = stripTags(rCombo1 && rCombo1.text);
    assert("E2E Combinatie mA + film: 1m bij 2mA D4 -> 4mA D5 = 18s", /18 seconden/.test(tCombo1), tCombo1);
    const rCombo2 = await RT.verwerkUniverseleVraag("en met 3 ma");
    const tCombo2 = stripTags(rCombo2 && rCombo2.text);
    assert(
      "E2E Combinatie vervolg 'en met 3 ma' past D4->D5 niet dubbel toe (18s * 4/3 = 24s, niet 14s)",
      /24 seconden/.test(tCombo2) && !/14 seconden/.test(tCombo2),
      tCombo2
    );

    // Regressietests voor alle 9 vervolgvraag-fixes
    RT.resetGespreksGeheugen();
    await RT.verwerkUniverseleVraag("1 minuut op 80 cm, hoelang op 56 cm");
    const rFoc100 = await RT.verwerkUniverseleVraag("en op 100 cm");
    const tFoc100 = stripTags(rFoc100 && rFoc100.text);
    assert("Vervolg 1: 'en op 100 cm' blijft focuswissel (niet Scheur code 100)", /56 naar 100 cm FFD/.test(tFoc100) && !/Scheur/i.test(tFoc100), tFoc100);

    RT.resetGespreksGeheugen();
    await RT.verwerkUniverseleVraag("2 minuten met 30 Ci, hoelang met 20 Ci");
    const rCi15 = await RT.verwerkUniverseleVraag("en met 15 Ci");
    const tCi15 = stripTags(rCi15 && rCi15.text);
    assert("Vervolg 2: 'en met 15 Ci' rekent door van 20 Ci naar 15 Ci (4 minuten)", /van 20 Ci naar 15 Ci/.test(tCi15) && /4 minuten/.test(tCi15), tCi15);

    RT.resetGespreksGeheugen();
    await RT.verwerkUniverseleVraag("1 minuut op D7, hoelang op D4");
    const rFilmD5 = await RT.verwerkUniverseleVraag("en op D5");
    const tFilmD5 = stripTags(rFilmD5 && rFilmD5.text);
    assert("Vervolg 3: 'en op D5' rekent van D4 naar D5 (1m 28s)", /D4 naar D5/.test(tFilmD5) && /1m 28s/.test(tFilmD5), tFilmD5);

    RT.resetGespreksGeheugen();
    await RT.verwerkUniverseleVraag("ik straal 1 minuut en heb zwarting 1.5, hoe krijg ik 2.5");
    const rZw3 = await RT.verwerkUniverseleVraag("en naar 3.0");
    const tZw3 = stripTags(rZw3 && rZw3.text);
    assert("Vervolg 4: zwarting 'en naar 3.0' rekent door van 2.5 naar 3.0 (2 minuten)", /van 2\.5 naar 3/.test(tZw3) && /2 minuten/.test(tZw3), tZw3);

    RT.resetGespreksGeheugen();
    await RT.verwerkUniverseleVraag("hoeveel opnames op een 6 duimer van 8 dik volgens klasse B");
    await RT.verwerkUniverseleVraag("400 mm");
    const rOpnCentr = await RT.verwerkUniverseleVraag("en centraal");
    const tOpnCentr = stripTags(rOpnCentr && rOpnCentr.text);
    assert("Vervolg 5: opnames 'en centraal' zet FFD op halve diameter (84 mm, niet 400 mm)", /84 mm/.test(tOpnCentr) && !/400 mm/.test(tOpnCentr), tOpnCentr);

    RT.resetGespreksGeheugen();
    await RT.verwerkUniverseleVraag("hoeveel kV op 10 mm staal");
    const rKv15 = await RT.verwerkUniverseleVraag("en 15 mm");
    const tKv15 = stripTags(rKv15 && rKv15.text);
    assert("Vervolg 6: KV-regel 'en 15 mm' werkt wanddikte bij naar 15 mm (30.0 mm dubbelwandig)", /30\.0 mm/.test(tKv15), tKv15);

    RT.resetGespreksGeheugen();
    await RT.verwerkUniverseleVraag("hoe lang stralen op een 6 duimer sch 40 met 25 Ci Se-75 op 400 mm");
    const rStr500 = await RT.verwerkUniverseleVraag("en op 500 mm");
    const tStr500 = stripTags(rStr500 && rStr500.text);
    assert("Vervolg 7: stralingstijd 'en op 500 mm' werkt FFD bij naar 500 mm", /500 mm/.test(tStr500), tStr500);

    RT.resetGespreksGeheugen();
    await RT.verwerkUniverseleVraag("bundelbreedte balteau op 80 cm");
    const rBund120 = await RT.verwerkUniverseleVraag("en op 1 meter 20");
    const tBund120 = stripTags(rBund120 && rBund120.text);
    assert("Vervolg 8a: bundelbreedte 'en op 1 meter 20' onthoudt Balteau Ceram 300", /Balteau Ceram 300/.test(tBund120) && /1200 mm/.test(tBund120), tBund120);
    const rBundSmart = await RT.verwerkUniverseleVraag("en met smart evo");
    const tBundSmart = stripTags(rBundSmart && rBundSmart.text);
    assert("Vervolg 8b: bundelbreedte 'en met smart evo' onthoudt 1200 mm", /Smart EVO/.test(tBundSmart) && /1200 mm/.test(tBundSmart), tBundSmart);

    RT.resetGespreksGeheugen();
    const rLas10 = await RT.verwerkUniverseleVraag("hoe groot mag een porie zijn bij 10 mm level 1");
    const tLas10 = stripTags(rLas10 && rLas10.text);
    assert("Vervolg 9: lasfout 'bij 10 mm level 1' leest 10 mm (niet 1 mm uit level 1)", /wanddikte van 10 mm/.test(tLas10), tLas10);

    RT.resetGespreksGeheugen();
    const rTriple = await RT.verwerkUniverseleVraag("ik straal 2 minuten op 80 op d4 met 6 mA, hoelang is het op 56 op d5 met 3 mA");
    const tTriple = stripTags(rTriple && rTriple.text);
    assert(
      "E2E Triple combinatie (focus 80->56 + film D4->D5 + mA 6->3) berekent alle 3 (1m 11s)",
      /80 naar 56 cm FFD/.test(tTriple) && /6 mA naar 3 mA/.test(tTriple) && /D4 naar D5/.test(tTriple) && /1m 11s/.test(tTriple),
      tTriple
    );

    RT.resetGespreksGeheugen();
    const rMaMinCombo = await RT.verwerkUniverseleVraag("Ik heb 20 mA*min op 80 op D4, hoelang moet ik stralen op 56 op D5 met 4 mA?");
    const tMaMinCombo = stripTags(rMaMinCombo && rMaMinCombo.text);
    assert(
      "E2E mA*min combinatie (20 mA*min bij 4 mA + focus 80->56 + film D4->D5 = 1m 28s)",
      /20 mA\*min bij 4 mA = 5m 00s/.test(tMaMinCombo) && /80 naar 56 cm FFD/.test(tMaMinCombo) && /D4 naar D5/.test(tMaMinCombo) && /1m 28s/.test(tMaMinCombo),
      tMaMinCombo
    );

    RT.resetGespreksGeheugen();
    const rOmtrek = await RT.verwerkUniverseleVraag("Wat is de omtrek van een 8 duimer");
    const tOmtrek = stripTags(rOmtrek && rOmtrek.text);
    assert(
      "E2E Omtrek van een 8 duimer (68.8 cm / 688.3 mm, geen opnames-wizard)",
      /68\.8 cm/.test(tOmtrek) && /688\.3 mm/.test(tOmtrek) && !/welke opstelling/i.test(tOmtrek),
      tOmtrek
    );

    RT.resetGespreksGeheugen();
    const rVerdeel = await RT.verwerkUniverseleVraag("Hoe verdeel ik een 4 duimer in 7 opnames");
    const tVerdeel = stripTags(rVerdeel && rVerdeel.text);
    assert(
      "E2E Verdelen 4 duimer in 7 opnames (5.1 cm, Film 1 = 0.0 cm t/m Film 7 = 30.8 cm)",
      /Effectieve filmlengte: 5\.1 cm/.test(tVerdeel) &&
        /Film 1 = 0\.0 cm/.test(tVerdeel) &&
        /Film 2 = 5\.1 cm/.test(tVerdeel) &&
        /Film 3 = 10\.3 cm/.test(tVerdeel) &&
        /Film 7 = 30\.8 cm/.test(tVerdeel),
      tVerdeel
    );

    RT.resetGespreksGeheugen();
    const rOpn4 = await RT.verwerkUniverseleVraag("Hoeveel opnames op een 4 duimer van 6 dik volgens klasse B met 40cm focus?");
    const tOpn4 = stripTags(rOpn4 && rOpn4.text);
    assert(
      "E2E Aantal opnames toont effectieve filmlengte (cm) zonder graden + chip 'Verdelen van de opnames'",
      /Effectieve filmlengte: \d+\.\d cm/.test(tOpn4) &&
        !/om de \d+°/.test(tOpn4) &&
        Array.isArray(rOpn4.chips) &&
        rOpn4.chips.includes("Verdelen van de opnames"),
      tOpn4
    );
    const rOpn4Verdeel = await RT.verwerkUniverseleVraag("Verdelen van de opnames", { isChip: true });
    const tOpn4Verdeel = stripTags(rOpn4Verdeel && rOpn4Verdeel.text);
    assert(
      "E2E Chip 'Verdelen van de opnames' gebruikt berekende aantal opnames en diameter uit geheugen",
      /Effectieve filmlengte: \d+\.\d cm/.test(tOpn4Verdeel) && /Film 1 = 0\.0 cm/.test(tOpn4Verdeel),
      tOpn4Verdeel
    );

    // Spraakherstel T5/T4/T7 -> D5/D4/D7 + mA*min focus+film zonder mA + vervolg met mA
    assert(
      "Spraakherstel: 'op T5' wordt gecorrigeerd naar 'op D5'",
      /\bop D5\b/.test(RT.corrigeerSpraakTekst("Hoe lang moet ik stralen op 1 meter 45 Focus op T5")),
      RT.corrigeerSpraakTekst("Hoe lang moet ik stralen op 1 meter 45 Focus op T5")
    );
    RT.resetGespreksGeheugen();
    const rMaMinGeenMa = await RT.verwerkUniverseleVraag(
      RT.corrigeerSpraakTekst("Ik heb een stralingstijd van 8 mA*min op 80 Focus op D4 Hoe lang moet ik stralen op 1 meter 45 Focus op T5")
    );
    const tMaMinGeenMa = stripTags(rMaMinGeenMa && rMaMinGeenMa.text);
    assert(
      "E2E 8 mA*min (80->145 cm, D4->T5/D5) zonder mA rekent 15.77 mA·min + tabel uit",
      /80 naar 145 cm FFD/.test(tMaMinGeenMa) &&
        /D4 naar D5/.test(tMaMinGeenMa) &&
        /15\.77 mA(?:\*|·|&middot;)min/.test(tMaMinGeenMa) &&
        /Bij 4 mA\s*:\s*3m 57s/.test(tMaMinGeenMa) &&
        Array.isArray(rMaMinGeenMa.chips) &&
        rMaMinGeenMa.chips.includes("4 mA"),
      tMaMinGeenMa
    );
    const rMaMinMet4Ma = await RT.verwerkUniverseleVraag("4 mA", { isChip: true });
    const tMaMinMet4Ma = stripTags(rMaMinMet4Ma && rMaMinMet4Ma.text);
    assert(
      "E2E Vervolg '4 mA' na 8 mA*min focus+film rekent definitieve tijd uit (3m 57s)",
      /80 naar 145 cm FFD/.test(tMaMinMet4Ma) && /D4 naar D5/.test(tMaMinMet4Ma) && /3m 57s/.test(tMaMinMet4Ma),
      tMaMinMet4Ma
    );

    // Timer-knop + ingebouwde timer API + mini-SVG bij verdelen van opnames
    assert(
      "Timer API: openTimer en sluitTimer zijn beschikbaar op RtAssistant",
      typeof RT.openTimer === "function" && typeof RT.sluitTimer === "function",
      typeof RT.openTimer
    );
    assert(
      "Timer-knop aanwezig in focusverandering-antwoord (openTimer(237, ...))",
      /openTimer\(237,/.test(rMaMinMet4Ma && rMaMinMet4Ma.text),
      rMaMinMet4Ma && rMaMinMet4Ma.text
    );
    assert(
      "Mini-SVG rondnaadschets aanwezig bij verdelen van opnames",
      /<svg[\s\S]*Rondnaad filmverdeling[\s\S]*<\/svg>/.test(rVerdeel && rVerdeel.text),
      rVerdeel && rVerdeel.text
    );
    assert(
      "Workflow-chips verschijnen automatisch na complete leidingberekening (opnames -> verdelen, min FFD, draadje, stralingstijd)",
      Array.isArray(rOpn4.chips) &&
        rOpn4.chips.includes("Verdelen van de opnames") &&
        rOpn4.chips.includes("Minimale FFD") &&
        rOpn4.chips.includes("BKI draadje") &&
        rOpn4.chips.includes("Stralingstijd"),
      JSON.stringify(rOpn4.chips)
    );
  }

  // 4. Multi-Turn Geheugen, Bron-Dropdown & Chip-Flows
  {
    RT.resetGespreksGeheugen();
    const r1 = await RT.verwerkUniverseleVraag(RT.corrigeerSpraakTekst("wat is de wanddikte van een 8 duiker schedule 10s"));
    const t1 = stripTags(r1 && r1.text);
    assert("Flow Schedule 10S", /3\.76 mm/.test(t1) && Array.isArray(r1.chips) && r1.chips.includes("Stralingstijd"), t1);

    RT.selecteerBronUitDropdown("bron_97969M");
    const r2 = await RT.verwerkUniverseleVraag("Stralingstijd", { isChip: true });
    const t2 = stripTags(r2 && r2.text);
    assert("Flow Chip Stralingstijd na bronwissel", /Stralingstijd voor/i.test(t2) && !/ASME B36\.10M/i.test(t2), t2);

    const r3 = await RT.verwerkUniverseleVraag("400 mm FFD", { isChip: true });
    const t3 = stripTags(r3 && r3.text);
    assert("Flow Chip 400 mm FFD", /Stralingstijd voor/i.test(t3) && /D4:/i.test(t3) && /D5:/i.test(t3), t3);
  }

  // 5. Antwoordgeschiedenis & Prullenbak-Reset
  {
    RT.resetGespreksGeheugen();
    const respEl = elMap["rt-ai-response"];

    elMap["rt-ai-input"].value = "halveringstijd van selenium";
    RT.verstuurTekst();
    await new Promise((r) => setImmediate(r));
    await new Promise((r) => setImmediate(r));
    const count1 = (respEl.innerHTML.match(/rt-ai-history-entry/g) || []).length;

    elMap["rt-ai-input"].value = "wat is de hvl van iridium";
    RT.verstuurTekst();
    await new Promise((r) => setImmediate(r));
    await new Promise((r) => setImmediate(r));
    const count2 = (respEl.innerHTML.match(/rt-ai-history-entry/g) || []).length;
    const scrolledToStartOfLatest = respEl.scrollTop === 112;
    assert("Geschiedenis bewaart eerdere antwoorden", count1 === 1 && count2 === 2 && respEl.innerHTML.includes("Selenium-75") && respEl.innerHTML.includes("Iridium-192"), `c1=${count1}, c2=${count2}`);
    assert("Geschiedenis springt naar het begin van het laatste antwoord", scrolledToStartOfLatest, `scrollTop=${respEl.scrollTop}`);
    assert("UI exporteert openAfbeeldingZoom voor vergrootglas/inzoomen", typeof RT.openAfbeeldingZoom === "function");

    RT.resetGespreksGeheugen();
    const afterReset = respEl.innerHTML;
    const countReset = (afterReset.match(/rt-ai-history-entry/g) || []).length;
    assert("Prullenbak-reset wist geschiedenis", countReset === 0 && afterReset.includes("Stel je vraag") && respEl.scrollTop === 0, `count=${countReset}`);

    context.innerWidth = 1200;
    const htmlPc = RT.genereerStartSchermHtml();
    const countPc = (htmlPc.match(/rt-ai-start-example-item/g) || []).length;
    context.innerWidth = 390;
    const htmlMob = RT.genereerStartSchermHtml();
    const countMob = (htmlMob.match(/rt-ai-start-example-item/g) || []).length;
    assert("Startscherm toont 5 random vragen op PC en 2 op mobiel met minimalistisch icoon", countPc === 5 && countMob === 2 && htmlPc.includes("rt-ai-start-example-icon"), `pc=${countPc}, mob=${countMob}`);
  }

  // 6. TTS Kernantwoord
  {
    RT.resetGespreksGeheugen();
    const rMin = await RT.verwerkUniverseleVraag("Wat is de minimale ffd op een 2 duimer volgens klasse b met een selenium?");
    assert("TTS MinFFD", RT.maakKorteSpraakTekst(rMin.text) === "Minimaal 75,2 centimeter", RT.maakKorteSpraakTekst(rMin.text));

    RT.resetGespreksGeheugen();
    const rBki = await RT.verwerkUniverseleVraag("welk draadje voor 10 mm dik op een plaat volgens klasse b");
    assert("TTS BKI draadje", RT.maakKorteSpraakTekst(rBki.text) === "Vereist draadje: W 14", RT.maakKorteSpraakTekst(rBki.text));

    RT.resetGespreksGeheugen();
    const rFoc = await RT.verwerkUniverseleVraag("ik straal 2 minuten op 500 mm, hoelang moet ik stralen op 700 mm");
    assert("TTS Focusverandering", RT.maakKorteSpraakTekst(rFoc.text) === "Uiteindelijke stralingstijd: 3 minuten en 55 seconden", RT.maakKorteSpraakTekst(rFoc.text));
  }

  console.log(`RADI Testsuite: ${passed} passed, ${failed} failed (totaal ${passed + failed})`);
  process.exit(failed ? 1 : 0);
})();
