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
  return { RT: context.RtAssistant, elMap };
}

(async () => {
  const { RT, elMap } = laadRtAssistant();
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
    const scrolledDown = respEl.scrollTop === respEl.scrollHeight;
    assert("Geschiedenis bewaart eerdere antwoorden", count1 === 1 && count2 === 2 && respEl.innerHTML.includes("Selenium-75") && respEl.innerHTML.includes("Iridium-192"), `c1=${count1}, c2=${count2}`);
    assert("Geschiedenis scrolt automatisch omlaag", scrolledDown, `scrollTop=${respEl.scrollTop}`);

    RT.resetGespreksGeheugen();
    const afterReset = respEl.innerHTML;
    const countReset = (afterReset.match(/rt-ai-history-entry/g) || []).length;
    assert("Prullenbak-reset wist geschiedenis", countReset === 0 && afterReset.includes("Stel je vraag") && respEl.scrollTop === 0, `count=${countReset}`);
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
