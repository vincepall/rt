  // --- Levenshtein & Fuzzy Woordenboek ---
  function levenshteinAfstand(a, b) {
    const matrix = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        const cost = b.charAt(i - 1) === a.charAt(j - 1) ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost,
        );
      }
    }
    return matrix[b.length][a.length];
  }

  // Uitgebreid NDO Spraakwoordenboek (voor SpeechGrammarList & Alternatieven-scoring)
  const NDO_SPRAAK_WOORDENBOEK = [
    // Geometrie & Lastechniek
    "wanddikte", "diameter", "buitendiameter", "binnendiameter", "lasbreedte", "lasoverdikte",
    "rondnaad", "langsnaad", "lasnaad", "ovaal", "ovaaltje", "ovaaltjes", "verzet", "voorzet",
    "kruislas", "omtrek", "schietkaart", "overzichtskaart", "werkstuk",

    // Buisopstellingen & Technieken
    "centraal", "panoramisch", "excentrisch", "dubbelwandig", "enkelwandig",
    "DWSI", "SWSI", "DWDI", "DWSD", "DWEB", "EWEB", "DWDB", "superpositie",
    "tangentiaal", "onstream", "RT-21021", "RT-21022", "isolatiedikte", "isolatie",
    "loodrecht", "openingshoek", "bundelbreedte", "bundel",
    "Single wall single image", "Double wall double image", "Double wall single image",
    "Enkel wand", "enkelwand", "dubbel wand", "dubbelwand",

    // Bronnen, Isotopen & Röntgen
    "Iridium", "Iridium-192", "Ir-192", "Selenium", "Selenium-75", "Se-75", "Kobalt", "Kobalt-60", "Co-60",
    "Balteau", "Balteau Ceram", "Balteau Ceram 300", "Balteau Ceram35P", "Ceram35P", "Balteau Rondstraler", "directional", "Ceram",
    "Yxlon", "Yxlon 300", "Smart EVO", "Smart EVO 300DS", "Smart 300",
    "röntgen", "röntgenbuis", "X-ray", "rondstraler", "collimator", "brongrootte", "focusgrootte", "bronkeuze", "focus",
    "focusafstand", "film focus afstand", "bron film afstand", "object film afstand", "focusverandering", "focuswissel", "openingshoek", "bundelhoek", "graden",
    "FFD", "SFD", "OFA", "OFD", "SOD", "SDD", "MinFFD", "minimale FFD", "minimale focus", "voorgestelde FFD",

    // Eenheden & Radiologie
    "Curie", "Ci", "halfwaardetijd", "halveringstijd", "bronverval", "vervaltijd", "activiteit",
    "straling", "stralingstijd", "belichtingstijd", "schiettijd", "lascompensatie", "compensatie",
    "milliampère", "milliampère-minuten", "mA", "mA*min",
    "kV", "kilovolt", "buisspanning", "buistabel", "KV-regel", "keverregel", "kwadratenwet", "diktevermeerdering",
    "materiaalfactor", "stralingsfactor", "staalequivalent", "afzetting", "afzettingsafstand", "dosistempo", "microsievert", "millisievert", "uSv", "mSv",
    "beton", "betonnen", "betonmuur", "baksteen", "bakstenen", "baksteenmuur", "metselwerk",

    // Films & Beeldkwaliteit
    "filmsoort", "filmtype", "filmklasse", "filmkwaliteit", "D2", "D3", "D4", "D5", "D7", "D8",
    "10x24", "10x40", "10x48", "6x24", "6x48",
    "C1", "C2", "C3", "C4", "C5", "C6", "Agfa", "Structurix", "zwarting", "zwartingseisen", "sluierzwarting", "optische dichtheid",
    "loodfolie", "loodfolies", "loodscherm", "loodschermen", "versterkingsscherm", "versterkingsschermen", "loodletter B", "ALARA", "halveringsdikte", "tiendewaardelaag",
    "BKI", "BKI's", "beeldkwaliteit", "beeldkwaliteitsindicator", "penetrameter", "draadje", "draadjes", "draad", "draden", "draadvereiste", "gevoeligheid",
    "W1", "W2", "W3", "W4", "W5", "W6", "W7", "W8", "W9", "W10", "W11", "W12", "W13", "W14", "W15", "W16", "W17", "W18", "W19",
    "1 FE EN", "6 FE EN", "10 FE EN", "13 FE EN", "Set A", "Set B", "Set C", "Set D", "Set 1A", "Set 2A",
    "hole-type", "hole type", "shim", "plaatje", "plaatjes", "1T", "2T", "4T", "2T-gat", "2T gat", "loodletter", "loodletter B", "terugverstrooiing", "backscatter",
    "bronzijde", "filmzijde", "geometrische onscherpte", "Ug",
    "SNR", "SNR_N", "verzadiging", "saturation", "digitale radiografie", "DDA", "fosforplaat", "flat panel", "centerlijn",

    // Normen & Kwaliteitsklassen
    "ASME", "Section V", "Artikel 2", "EN", "ISO", "EN ISO", "ISO 17636", "ISO 17636-1", "ISO 17636-2",
    "ISO 19232", "ISO 19232-1", "ISO 5817", "ISO 10675", "ASTM", "ASTM E747", "ASTM E1025", "ASTM E1815", "ISO 11699-1",
    "Klasse A", "Klasse B", "EN-A", "EN-B", "Klasse TA", "Klasse TB", "Level 1", "Level 2", "Level 3",

    // Duimsmaten, Leidingmaten, Schedules, Materialen & Media
    "duims", "duimer", "duimers", "duimen", "opname", "opnames", "gevuld", "gevulde leiding", "doorstraalde dikte",
    "halve duimer", "driekwart duims", "1 duimer", "anderhalf duimer", "2 duimer", "3 duimer", "4 duimer",
    "5 duimer", "6 duimer", "8 duimer", "10 duimer", "12 duimer", "14 duimer", "16 duimer", "18 duimer", "20 duimer", "24 duimer",
    "DN 15", "DN 20", "DN 25", "DN 50", "DN 80", "DN 90", "DN90", "dia9", "dl90", "DN 100", "DN 150", "DN 200", "DN 250", "DN 300", "DN 400", "DN 500", "DN 600",
    "schedule", "schedules", "schedule 5", "schedule 10", "schedule 20", "schedule 30", "schedule 40", "schedule 60", "schedule 80",
    "schedule 100", "schedule 120", "schedule 140", "schedule 160", "Sch 10", "Sch 40", "Sch 80", "Sch 160", "STD", "standard",
    "XS", "extra strong", "XXS", "ASME B36.10M", "ASME B36.19M", "wanddiktes",
    "haffmans", "sitech", "sabic", "lood", "staal", "koolstofstaal", "roestvast", "roestvrij", "RVS", "duplex", "superduplex",
    "aluminium", "titanium", "titaan", "inconel", "incoloy", "monel", "hastelloy", "stellite", "messing", "tinbrons", "roodbrons", "aluminiumbrons", "cupronikkel", "koper", "nikkel", "zirkonium", "tantaal", "molybdeen",
    "water", "aardolie", "benzeen", "benzine", "aceton", "chloorbenzeen", "ammoniak", "methanol", "alcohol", "ethaan", "propaan",
    "dosislimiet", "dosislimieten", "stralingswerker", "gecontroleerde zone", "bewaakte zone", "halveringsdikte", "halfwaardedikte", "loodplaat", "loodplaten",
    "opstelling", "opstellingen", "wolfraam", "doorstraling", "radiografie", "flenslas", "rondnaadje", "rondnaadjes", "verliestijd", "schaduwhoek", "schaduwbreedte", "onscherpte", "loodletter", "loodletters", "filmzijde", "bronzijde", "pijpleiding", "slakinsluitsel", "slaklijn", "wolfraaminsluitsel", "porositeit", "nestporositeit", "gaspit", "randinkarteling", "wormgat", "bindingsfout", "onvolkomen doorlassing", "worteldoorzakking", "kraterscheur", "wortelfout", "lasfout", "lasfouten", "corrosie", "wanddiktemeting", "draadindicator", "stappenwig", "densitometer", "benzeen", "tolueen", "nafta", "kerosine", "diesel", "stookolie", "ethanol", "methanol", "ammoniak", "isolatie", "steenwol", "glaswol", "contrast"
  ];

  const NDO_FUZZY_WOORDENBOEK = NDO_SPRAAK_WOORDENBOEK;

  const UITGESLOTEN_ENKELWOORD_TRIGGERS = new Set([
    "minffd", "single", "double", "image", "extra", "strong", "section", "artikel", "standard", "b3610m", "b3619m"
  ]);

  const NDO_ENKELWOORD_TRIGGERS = Array.from(
    new Set(
      NDO_SPRAAK_WOORDENBOEK
        .flatMap((term) => term.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").split(/[\s\/]+/))
        .map((w) => w.replace(/[^a-z]/g, ""))
        .filter((w) => w.length >= 5 && !UITGESLOTEN_ENKELWOORD_TRIGGERS.has(w))
    )
  );

  const NDO_COMPOUND_TRIGGERS = NDO_ENKELWOORD_TRIGGERS.filter((w) => w.length >= 7);

  const NDO_TRIGGERS_SET = new Set([
    ...NDO_ENKELWOORD_TRIGGERS,
    "ir-192", "se-75", "co-60", "dwsi", "swsi", "dwdi", "bki", "iqi", "ffd", "sfd", "ofa",
    "asme", "en-a", "en-b", "dik", "ci", "kv", "ma", "lood", "staal", "buis", "pijp", "plaat",
    "duim", "duims", "draad", "norm", "bron", "film", "tijd", "klas", "evo", "agfa", "shim", "astm"
  ]);

  // Synthetische aaneengeschreven vakterm-samenstellingen (getalwoord/modifier + eenheid/bron) -> canonieke vorm met spatie
  const SYNTHETISCHE_SAMENSTELLINGEN_MAP = {
    halveduimer: "0.5 duimer",
    anderhalfduimer: "1.5 duimer",
    anderhalveduimer: "1.5 duimer",
    driekwartduimer: "0.75 duimer",
    sterksteselenium: "sterkste selenium",
    sterksteiridium: "sterkste iridium",
    sterkstekobalt: "sterkste kobalt",
    zwaksteselenium: "zwakste selenium",
    zwaksteiridium: "zwakste iridium",
  };
  for (const [woord, cijfer] of [
    ["een", "1"], ["twee", "2"], ["drie", "3"], ["vier", "4"], ["vijf", "5"], ["zes", "6"],
    ["zeven", "7"], ["acht", "8"], ["negen", "9"], ["tien", "10"], ["elf", "11"], ["twaalf", "12"],
    ["veertien", "14"], ["zestien", "16"], ["achttien", "18"], ["twintig", "20"], ["vierentwintig", "24"],
  ]) {
    SYNTHETISCHE_SAMENSTELLINGEN_MAP[`${woord}duimer`] = `${cijfer} duimer`;
    SYNTHETISCHE_SAMENSTELLINGEN_MAP[`${woord}duims`] = `${cijfer} duims`;
    SYNTHETISCHE_SAMENSTELLINGEN_MAP[`${woord}duimse`] = `${cijfer} duimse`;
    SYNTHETISCHE_SAMENSTELLINGEN_MAP[`${woord}dik`] = `${cijfer} dik`;
    SYNTHETISCHE_SAMENSTELLINGEN_MAP[`${woord}curie`] = `${cijfer} Curie`;
  }
  for (const synthKey of Object.keys(SYNTHETISCHE_SAMENSTELLINGEN_MAP)) {
    if (!NDO_ENKELWOORD_TRIGGERS.includes(synthKey)) NDO_ENKELWOORD_TRIGGERS.push(synthKey);
    if (synthKey.length >= 7 && !NDO_COMPOUND_TRIGGERS.includes(synthKey)) NDO_COMPOUND_TRIGGERS.push(synthKey);
  }

  // Normale Nederlandse woorden die nooit door de fuzzy-matcher veranderd mogen worden
  const NORMALE_NL_STOPWOORDEN = new Set([
    "aantal", "aantallen", "verdelen", "verdeling", "verdeel", "minimale", "veilige", "posities", "opname", "opnames",
    "plaats", "plaatsen", "geplaatst", "leggen", "gelegd", "plakken", "geplakt", "rekening", "letten", "verplicht", "verplichte", "gegevens", "voorkeur", "scherpte", "contrast",
    "straal", "straalt", "stralen", "stalen", "minuut", "minuten", "seconde", "seconden", "bereken", "berekent", "berekenen", "hoeveel", "wanneer",
    "waarom", "waarmee", "waarbij", "waarop", "waarin", "waarvan", "hoelang", "hoever", "hoezo",
    "binnen", "buiten", "tussen", "zonder", "achter", "achteraan", "achteraf", "achtergrond", "achterkant",
    "achterzijde", "achterin", "achterop", "achteruit", "doordat", "zodat", "zolang", "voornaam", "voorkeur", "voorkomen", "afgelopen",
    "volgens", "eerste", "laatste", "steeds", "extra", "echter", "verder", "anders", "daarom", "daarna",
    "grootste", "kleinste", "hoogste", "laagste", "kortste", "langste", "dikste", "dunste",
    "oudste", "nieuwste", "meeste", "minste", "zwaarste", "lichtste", "tweede", "derde", "vierde",
    "vijfde", "zesde", "zevende", "achtste", "negende", "tiende", "twaalfde", "veertiende", "zestiende", "achttiende",
    "twintigste", "zeven", "negen", "twaalf", "dertien", "veertien", "vijftien", "zestien", "zeventien", "achttien", "negentien",
    "twintig", "dertig", "veertig", "vijftig", "zestig", "zeventig", "tachtig", "negentig", "honderd", "duizend",
    "halve", "anderhalf", "anderhalve", "driekwart",
    "medium", "aluminium", "benzeen", "benzine", "aardolie", "aceton", "water",
    "leiding", "gebruiken", "gebruikt", "aanhouden", "houden", "houdt", "toegestaan", "geschikt", "nodig", "maken", "maakt", "weten", "zien",
    "welke", "kunnen", "worden", "wordt", "hebben", "heeft", "hadden", "moeten", "zullen", "waren", "zouden", "vraag", "vragen",
    "antwoord", "graag", "alstublieft", "alsjeblieft", "misschien", "eigenlijk", "ongeveer", "precies",
    "totaal", "alleen", "samen", "kleine", "kleiner", "kleinere", "grote", "groter", "grotere", "nieuwe", "andere", "zelfde", "dezelfde",
    "eerder", "later", "boven", "onder", "rechts", "links", "midden", "direct", "meteen", "klopt",
    "staat", "blijft", "lijkt", "gebruik", "gezien", "gedaan", "gehad", "gegeven", "genomen",
    "dikte", "opstelling", "doorstraalde", "doorstraald", "maximale", "minimale", "maximaal", "minimaal",
    "veilige", "veilig", "normale", "normaal", "standaard", "langer", "korter",
    "dikker", "dunner", "sterker", "zwakker", "zwaarder", "lichter", "dubbel", "dubbele", "enkel", "enkele", "beeld", "beelden",
    "centimeter", "millimeter", "verplicht", "mogelijk", "waardoor", "waarvoor", "daarmee", "hiermee",
    "eigen", "welks", "vanaf", "omdat", "indien", "zodra", "nadat", "voordat", "tijdens", "tegen",
    "mogen", "willen", "hoeft", "moest", "komen", "gaat", "staan", "vinden",
    "lopen", "zetten", "halen", "haalt", "geven", "geeft", "nemen", "neemt", "krijg", "krijgt", "krijgen", "lezen", "zeggen", "horen", "voelen",
    "schiet", "schieten", "belicht", "belichten", "kiezen", "kiest", "pakken", "draaien", "draait", "wissel", "wisselt", "wisselen", "verander", "veranderen", "bepalen", "zoeken",
    "afstand", "ruimte", "plaats", "moment", "meter", "meters", "tweemaal", "driemaal", "geleden", "vandaag", "morgen", "dagen", "weken", "maanden"
  ]);

  const SAMENGESTELDE_GETAL_PREFIXEN = [
    ["vierentwintig", "24"],
    ["anderhalve", "1.5"],
    ["anderhalf", "1.5"],
    ["driekwart", "0.75"],
    ["zeventien", "17"],
    ["negentien", "19"],
    ["veertien", "14"],
    ["vijftien", "15"],
    ["zestien", "16"],
    ["achttien", "18"],
    ["zeventig", "70"],
    ["negentig", "90"],
    ["twintig", "20"],
    ["dertien", "13"],
    ["dertig", "30"],
    ["veertig", "40"],
    ["vijftig", "50"],
    ["zestig", "60"],
    ["tachtig", "80"],
    ["twaalf", "12"],
    ["halve", "0.5"],
    ["zeven", "7"],
    ["negen", "9"],
    ["twee", "2"],
    ["drie", "3"],
    ["vier", "4"],
    ["vijf", "5"],
    ["acht", "8"],
    ["tien", "10"],
    ["half", "0.5"],
    ["zaas", "6"],
    ["een", "1"],
    ["zes", "6"],
    ["elf", "11"],
    ["ach", "8"],
  ];

  /** Ontleedt aaneengeschreven of geassimileerde <telwoord>+<vakterm> spraakvormen (bijv. "achterma" -> "8 duimer", "drietig" -> "3 dik"). */
  function herstelSamengesteldGetalEnEenheid(tekst) {
    if (!tekst || typeof tekst !== "string") return tekst;
    return tekst.split(/(\s+)/).map((tok) => {
      if (!tok || /^\s+$/.test(tok)) return tok;
      const m = tok.match(/^([("'«]*)(.*?)([)"'».,!?;:]*)$/);
      if (!m) return tok;
      const [, lead, core, trail] = m;
      if (!core) return tok;
      const clean = core.toLowerCase();
      const alphaOnly = clean.replace(/[^a-z]/g, "");
      if (NORMALE_NL_STOPWOORDEN.has(alphaOnly) || NDO_TRIGGERS_SET.has(clean)) return tok;

      let cijfer = null;
      let tail = "";
      let prefixStr = "";

      const numMatch = clean.match(/^(\d+(?:[.,]\d+)?)-?([a-z]{2,})$/);
      if (numMatch) {
        cijfer = numMatch[1].replace(",", ".");
        tail = numMatch[2];
      } else {
        for (const [pref, val] of SAMENGESTELDE_GETAL_PREFIXEN) {
          if (clean.startsWith(pref) && clean.length > pref.length) {
            let rest = clean.slice(pref.length);
            if (rest.startsWith("-")) rest = rest.slice(1);
            if (rest.length >= 3 && /^[a-z]+$/.test(rest)) {
              cijfer = val;
              tail = rest;
              prefixStr = pref;
            }
            break;
          }
        }
      }

      if (!cijfer || !tail) return tok;

      const tailKandidaten = [tail];
      if (prefixStr && tail.length >= 3) {
        const lastChar = prefixStr[prefixStr.length - 1];
        if (lastChar === "t" || lastChar === "d") {
          tailKandidaten.push(lastChar + tail);
        }
      }

      for (const cand of tailKandidaten) {
        if (/^(?:[dt]?u+[ijy]?mse(?:leiding)?|[dt]?[eao]+mse(?:leiding)?)$/i.test(cand)) {
          const heeftLeiding = cand.endsWith("leiding");
          return `${lead}${cijfer} ${heeftLeiding ? "duimse leiding" : "duimse"}${trail}`;
        }
        if (/^(?:[dt]?u+[ijy]?m+(?:er|ar|a|el|en|pje|s)?|[dt]?[eao]+m+(?:er|ar|a|el|en|an|ig|or)?|[dt]?i+m+(?:er|ar|a|el)?|(?:de|ste)?(?:man|mannen|maar|mar|mer|men|mag|dag|kamer|hamer|zomer|jammer|emmer|immer|umer|umar|omer|nummer|remmer|remma|dimmer|demer|damer|domer|timer|timmer|tuimer|luier|humor|humer|hummer)|erma(?:n|ar|r|s)?|erme(?:r|n)?|[dt]?uino|dino|[dt]?uik(?:er|ers)?|duif|duiven)$/i.test(cand)) {
          return `${lead}${cijfer} duimer${trail}`;
        }
        if (/^(?:[dt]ik(?:ke|te)?|[dt]ig|[dt]ijk|stik|deuk)$/i.test(cand)) {
          return `${lead}${cijfer} dik${trail}`;
        }
        if (/^(?:[ckg][uoei]+r(?:ie|y|i)|cie)$/i.test(cand)) {
          return `${lead}${cijfer} Curie${trail}`;
        }
        if (/^(?:k[aou]v[eé]\w*|c[aou]f[eé]\w*|kv)$/i.test(cand)) {
          return `${lead}${cijfer} kV${trail}`;
        }
      }
      return tok;
    }).join("");
  }

  function medeklinkerSkelet(woord) {
    return woord
      .toLowerCase()
      .replace(/[^a-z]/g, "")
      .replace(/sch/g, "sg")
      .replace(/ch/g, "g")
      .replace(/ph/g, "f")
      .replace(/th/g, "t")
      .replace(/qu/g, "kw")
      .replace(/c(?=[eiy])/g, "s")
      .replace(/c/g, "k")
      .replace(/z/g, "s")
      .replace(/v/g, "f")
      .replace(/(?<=.)d/g, "t")
      .replace(/b$/g, "p")
      .replace(/ij/g, "")
      .replace(/[aeiouy]/g, "")
      .replace(/(.)\1+/g, "$1");
  }

  function nlFonetischeSleutel(woord) {
    return woord
      .toLowerCase()
      .replace(/[^a-z]/g, "")
      .replace(/aa/g, "a")
      .replace(/ee/g, "e")
      .replace(/oo/g, "o")
      .replace(/uu/g, "u")
      .replace(/ij|ei/g, "E")
      .replace(/ou|au/g, "O")
      .replace(/eu/g, "U")
      .replace(/oe/g, "W")
      .replace(/ie|y/g, "i")
      .replace(/sch/g, "sg")
      .replace(/ch/g, "g")
      .replace(/ph/g, "f")
      .replace(/th/g, "t")
      .replace(/qu/g, "kw")
      .replace(/c(?=[eiy])/g, "s")
      .replace(/c/g, "k")
      .replace(/z/g, "s")
      .replace(/v/g, "f")
      .replace(/dt/g, "t")
      .replace(/(?<=.)d/g, "t")
      .replace(/(.)\1+/g, "$1");
  }

  function besteTriggerMatch(s, kandidaten, minScore = 45) {
    if (!s || s.length < 5) return null;
    if (/^duim[a-z]{1,5}$/.test(s) && s !== "duimer" && s !== "duims" && s !== "duimen") {
      return { match: "duimer", score: 95 };
    }
    const sFon = nlFonetischeSleutel(s);
    const sSkel = medeklinkerSkelet(s);
    let bestMatch = null;
    let bestScore = -1;

    for (const d of kandidaten) {
      if (Math.abs(s.length - d.length) > (d.length >= 7 ? 3 : 2)) continue;
      const dist = levenshteinAfstand(s, d);
      const dFon = nlFonetischeSleutel(d);
      const fonDist = levenshteinAfstand(sFon, dFon);
      const dSkel = medeklinkerSkelet(d);
      const skelDist = levenshteinAfstand(sSkel, dSkel);

      const prefix3 = s.length >= 5 && d.length >= 5 && s.slice(0, 3) === d.slice(0, 3);
      const rhyme3 = s.length >= 5 && d.length >= 5 && s.slice(-3) === d.slice(-3);
      const fonEdge = sFon.length >= 4 && dFon.length >= 4 && (sFon.slice(0, 2) === dFon.slice(0, 2) || sFon.slice(-2) === dFon.slice(-2));

      const qualifies =
        dist <= (d.length >= 8 ? 2 : 1) ||
        (dist <= 2 && (prefix3 || rhyme3)) ||
        (fonDist === 0 && d.length >= 5) ||
        (fonDist === 1 && fonEdge && s.length >= 5 && d.length >= 5) ||
        (sSkel.length >= 4 && dSkel.length >= 4 && skelDist === 0 && (prefix3 || sSkel[0] === dSkel[0])) ||
        (sSkel.length >= 5 && dSkel.length >= 5 && skelDist <= 1 && sSkel[0] === dSkel[0] && sSkel.slice(-1) === dSkel.slice(-1) && dist <= 3);

      if (!qualifies) continue;

      const prefix4 = s.length >= 6 && d.length >= 6 && s.slice(0, 4) === d.slice(0, 4);
      const score =
        (dist === 0 ? 100 : dist === 1 ? 50 : dist === 2 ? 25 : 10) +
        (fonDist === 0 ? 55 : fonDist === 1 ? 15 : 0) +
        (skelDist === 0 ? 35 : skelDist === 1 ? 10 : 0) +
        (prefix4 ? 22 : prefix3 ? 12 : 0) +
        (rhyme3 ? 12 : 0);

      if (score >= minScore && score > bestScore) {
        bestScore = score;
        bestMatch = d;
      }
    }

    return bestMatch ? { match: bestMatch, score: bestScore } : null;
  }

  // Corrigeert veelvoorkomende Nederlandse spraakherkenningsfouten (STT lookalikes) naar leesbare RT-termen
  function corrigeerSpraakTekst(ruweTekst) {
    if (!ruweTekst || typeof ruweTekst !== "string") return "";
    let s = ruweTekst.normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    const getalWoorden =
      "een|twee|drie|vier|vijf|zes|zeven|acht|negen|tien|elf|twaalf|dertien|veertien|vijftien|zestien|twintig|half|halve|anderhalf";

    // 'k heb / k heb -> ik heb
    s = s.replace(/\b(?:'k|k)\s+heb\b/gi, "ik heb");

    // DN 90 STT lookalikes: "dia9", "dia 9", "dl90", "dl 90", "dm90", "dm 90", "dn9", "dn 9", "dia90", "dia 90", "den 90", "den 9"
    s = s.replace(/\b(?:dia\s*90?|dl\s*90?|dm\s*90?|dn\s*9\b|dn9\b)\b/gi, "DN 90");

    // 0. Losmaken van aan elkaar geplakte samengestelde spraakwoorden en koppeltekens
    // Voorbeeld: "zesdek" -> "zes dek", "4-duin" -> "4 duin", "driedijk" -> "drie dijk", "6-dik" -> "6 dik"
    s = s.replace(
      new RegExp(
        `\\b(${getalWoorden})[-\\s]*(dek|deck|dicht|dak|dok|dijk|dijken|diks|dikke|dik|duin|duins|duinen|duim|duims|duimen|duimer|duimers|duif|duiven|duyven|tuin|tuinen|dimmer|dimmers|mm|cm|meter)\\b`,
        "gi",
      ),
      "$1 $2",
    );
    s = s.replace(
      /(\d+(?:[.,]\d+)?)[-\s]*(dek|deck|dicht|dak|dok|dijk|dijken|diks|dikke|dik|duin|duins|duinen|duim|duims|duimen|duimer|duimers|duif|duiven|duyven|tuin|tuinen|dimmer|dimmers|inch|inches|mm|cm|meter|m\b|ci|curie|ma|kv|mill?i|mamin)/gi,
      (match, num, unit) => {
        // Bescherm bronnamen uit bronnen.csv / brongrootte-codes zoals "97969M" tegen splitsen naar "97969 M" (= meter)
        if (/^m$/i.test(unit)) {
          const rawCombined = (num + unit).toLowerCase();
          const isBronNaam =
            /^(97969m|35598p|35041p)$/i.test(rawCombined) ||
            (Array.isArray(bronnenData) && bronnenData.some((b) => b.name && b.name.toLowerCase() === rawCombined)) ||
            (!num.includes(".") && !num.includes(",") && num.length >= 4 && !/[-\s]/.test(match.slice(num.length, match.length - unit.length)));
          if (isBronNaam) return match;
        }
        return `${num} ${unit}`;
      },
    );

    // 1. mA*min varianten (minuten deel is VERPLICHT zodat pure milliampere stroom niet verward wordt!)
    s = s.replace(/\b(?:mill?i[-\s]?(?:amp[eè]res?|amps?)|mamp|m\s*a|ma)\s*(?:[\*x\s-]|per\s+|keer\s+)?(?:minuuten|minuten|minuut|min\b)\b/gi, "mA*min");

    // Herstel per ongeluk aaneengeplakt mA*mingebruiken / mA*mingebruik
    s = s.replace(/\bmA\*min(?:gebruik(?:en)?)\b/gi, "mA gebruiken");

    // 2. Pure mA (buisstroom in milliampere): strictly without minutes
    s = s.replace(/\b(\d+(?:[.,]\d+)?)\s*(?:mill?i[-\s]?(?:amp[eè]res?|amps?)|m\.a\.|m\s+a)\b/gi, "$1 mA");
    s = s.replace(/\b(?:mill?i[-\s]?(?:amp[eè]res?|amps?))\s*(\d+(?:[.,]\d+)?)\b/gi, "$1 mA");
    s = s.replace(/\bmill?i[-\s]?(?:amp[eè]res?|amps?)\b/gi, "mA");

    // Focus spraaklookalikes (fokus / vocus / fokkers / volkus)
    s = s.replace(/\b(fokus|vocus|fokkers|volkus)\b/gi, "focus");

    // 3. Film lookalikes in spraak (bijv. "op de 4" -> "op D4", "op T5" -> "op D5", "op B5" -> "op D5", "op de vier" -> "op D4")
    s = s.replace(/\b(?:op|naar|met|film|wissel\s+naar)\s+(?:de\s+|d\s+)?([234578])\b(?!\s*[.,]\d)(?!\s*(?:mm|cm|meter|m\b|inch|duim|dik|bar|sec|seconden|min|minuut|minuten|uur|opname|opnames|ma\b|kv\b|ci\b|curie\b|lood|pb|loodplaat|loodplaten|plaat|platen|scherm|schermen))/gi, (match, d) => {
      const prefix = match.split(/\s+(?:de\s+|d\s+)?\d/i)[0];
      return `${prefix} D${d}`;
    });
    s = s.replace(/\b(?:op|naar|met|film)\s+de\s+(twee|drie|vier|vijf|zeven|acht)\b(?!\s*(?:ma\b|kv\b|ci\b|curie\b|mm|cm|meter|lood|pb|loodplaat|loodplaten|plaat|platen|scherm|schermen))/gi, (match, w) => {
      const map = { twee: "2", drie: "3", vier: "4", vijf: "5", zeven: "7", acht: "8" };
      const prefix = match.split(/\s+de\s+/i)[0];
      return `${prefix} D${map[w.toLowerCase()] || w}`;
    });
    s = s.replace(/\b(?:en|als|of)\s+de\s*([234578])\b(?!\s*[.,]\d)(?!\s*(?:mm|cm|meter|m\b|inch|duim|dik|bar|sec|seconden|min|minuut|minuten|uur|opname|opnames|ma\b|kv\b|ci\b|curie\b|lood|pb|loodplaat|loodplaten|plaat|platen|scherm|schermen))/gi, "en D$1");
    s = s.replace(/\b(?:en|als|of)\s+d\s*([234578])\b(?!\s*(?:ma\b|kv\b|ci\b|curie\b))/gi, "en D$1");
    s = s.replace(/\b(?:op|naar|met|van|film|agfa|wissel\s+naar|en|of)\s+(?:t|b|p|g|v|tee|thee|day|the)[-\s]*([234578])\b(?!\s*[.,]\d)(?!\s*(?:mm|cm|meter|m\b|inch|duim|dik|bar|sec|seconden|min|minuut|minuten|uur|opname|opnames|ma\b|kv\b|ci\b|curie\b))/gi, (match, d) => {
      const prefix = match.replace(/\s+(?:t|b|p|g|v|tee|thee|day|the)[-\s]*[234578]$/i, "");
      return `${prefix} D${d}`;
    });
    s = s.replace(/\b(?:op|naar|met|van|film|agfa|wissel\s+naar|en|of)\s+(?:t|b|p|g|v|tee|thee|day|the)\s+(twee|drie|vier|vijf|zeven|acht)\b/gi, (match, w) => {
      const map = { twee: "2", drie: "3", vier: "4", vijf: "5", zeven: "7", acht: "8" };
      const prefix = match.replace(/\s+(?:t|b|p|g|v|tee|thee|day|the)\s+(?:twee|drie|vier|vijf|zeven|acht)$/i, "");
      return `${prefix} D${map[w.toLowerCase()] || w}`;
    });
    s = s.replace(/\bt[-\s]?([234578])\b(?!\s*(?:mm|cm|meter|m\b|duim|inch|dik|ma\b|kv\b|ci\b|curie\b))/gi, "D$1");

    // Dek / deck / dak / dijk / diks / dikke na een getal of getalwoord -> dik
    s = s.replace(
      new RegExp(`\\b(${getalWoorden}|\\d+(?:[.,]\\d+)?)\\s+(dek|deck|dicht|dak|dok|dijk|dijken|diks|dikke|dikte)\\b`, "gi"),
      "$1 dik",
    );
    s = s.replace(
      new RegExp(`\\bvan\\s+(${getalWoorden}|\\d+(?:[.,]\\d+)?)\\s+(tik|pik|lik|rik|kik|blik|stik|spik|deuk|duik)\\b`, "gi"),
      "van $1 dik",
    );

    // Duimig / duin / duins / tuin / dimmer / duiven / rijmwoorden na een getal of getalwoord -> duimer
    s = s.replace(
      new RegExp(
        `\\b(${getalWoorden}|\\d+(?:[.,]\\d+)?)[-\\s]*(duim(?:ig|ige|igs|t|el|els|ar|a|e|en|er|ers|s|se|ik|ink)?|duin(?:en|er|ers|s|ig)?|duif|duiven|duyven|tuin(?:en|er|ers)?|tuim(?:el|er)?|dimmer|dimmers|duivel|duvel|duwer|duiker|duitser|luier|ruimer|schuimer|pluimer|sluimer)\\b`,
        "gi",
      ),
      "$1 duimer",
    );

    // Standalone duin / duins in leiding/pijp context -> duim / duims
    s = s.replace(/\b(duin)\b/gi, "duim");
    s = s.replace(/\b(duins)\b/gi, "duims");
    s = s.replace(/\b(duinen)\b/gi, "duimen");
    s = s.replace(/\b(duiven|duyven)\b(?=\s+(?:centraal|panoramisch|excentrisch|ovaal|loodrecht|rt|en[-\s]?[ab]|asme|schedule|sch\b|\d+\s*mm|\d+\s*dik))/gi, "duimer");

    // Onstream opname lookalikes (bijv. "ons schimmelname", "ontstemont name", "onzin opname", "ons iemand namen")
    s = s.replace(/\b(?:ons|ont|on)\s*(?:schimmel|stemont|zin|iemand|schimmel\s*ont|stem)\s*(?:opname|opnames|name|namen)\b/gi, "onstream opname");
    s = s.replace(/\b(ons\s*schimmelname|ontstemont\s*name|onzin\s*opname|ons\s*iemand\s*namen|ons\s*iemand\s*name|onstreamopname)\b/gi, "onstream opname");
    s = s.replace(/\bin\s+iridium\b/gi, "een iridium");
    s = s.replace(/\bw[-]?max\b/gi, "Wmax");
    s = s.replace(/\bzaas\b/gi, "zes");

    // Ovaaltjes lookalikes (bijv. "hoefeltjes", "hoef foutje", "hoeffoutjes")
    s = s.replace(/\b(hoefeltjes|hoefeltje|hoeffoutje|hoeffoutjes|hoef\s*foutje|hoef\s*foutjes)\b/gi, "ovaaltjes");
    s = s.replace(/van\s+(\d+(?:[.,]\d+)?)\s*duimer\s+(?:een|met\s+een)\s+lasbreedte/gi, "van $1 dik met een lasbreedte");
    s = s.replace(/\blausbreedte\b/gi, "lasbreedte");

    // Excentrisch & duimer lookalikes ("6 dik nog", "zesdemig", "bruine grote van 3")
    s = s.replace(/\b(\d+|een|twee|drie|vier|vijf|zes|acht|tien|twaalf)[-\s]*(?:dik\s*nog|diknog)\b/gi, "$1 duimer");
    s = s.replace(/\b(zesdemig|zesdemik)\b/gi, "6 duimer");
    s = s.replace(/\bm\s+aan\s+een\b/gi, "met een");
    s = s.replace(/\b(?:bruine\s*grote|bruine\s*grootte|bronnen\s*grote)\b/gi, "brongrootte");
    s = s.replace(/\bvoor\s+ons\s+klasse\b/gi, "volgens klasse");
    s = s.replace(/\bexcentrisch\s+(?:gieter|gieten)\b/gi, "excentrisch schieten");

    // Specifieke spraakvormen voor duimermaten uit praktijk (bijv. "tweede man", "vierde man", "zesde maar", "4d humor", "4 dik humor", "zaalstein maar", "zesdedag")
    const RANG_EN_TELWOORD_NAAR_DUIM = {
      half: "0.5", halve: "0.5", "0.5": "0.5", "1/2": "0.5",
      driekwart: "0.75", "0.75": "0.75", "3/4": "0.75",
      anderhalf: "1.5", anderhalve: "1.5", "1.5": "1.5",
      een: "1", eerste: "1", "1": "1", "1e": "1", "1ste": "1",
      twee: "2", tweede: "2", "2": "2", "2e": "2", "2de": "2",
      drie: "3", derde: "3", "3": "3", "3e": "3", "3de": "3",
      vier: "4", vierde: "4", "4": "4", "4e": "4", "4de": "4",
      vijf: "5", vijfde: "5", "5": "5", "5e": "5", "5de": "5",
      zes: "6", zesde: "6", zaas: "6", "6": "6", "6e": "6", "6de": "6",
      zeven: "7", zevende: "7", "7": "7", "7e": "7", "7de": "7",
      acht: "8", achtste: "8", achter: "8", ach: "8", "8": "8", "8e": "8", "8ste": "8",
      negen: "9", negende: "9", "9": "9", "9e": "9", "9de": "9",
      tien: "10", tiende: "10", team: "10", "10": "10", "10e": "10", "10de": "10",
      elf: "11", elfde: "11", "11": "11", "11e": "11", "11de": "11",
      twaalf: "12", twaalfde: "12", "12": "12", "12e": "12", "12de": "12",
      veertien: "14", veertiende: "14", "14": "14", "14e": "14", "14de": "14",
      zestien: "16", zestiende: "16", "16": "16", "16e": "16", "16de": "16",
      achttien: "18", achttiende: "18", "18": "18", "18e": "18", "18de": "18",
      twintig: "20", twintigste: "20", "20": "20", "20e": "20", "20ste": "20",
      vierentwintig: "24", vierentwintigste: "24", "24": "24", "24e": "24", "24ste": "24",
    };
    s = s.replace(/\b(orguinse|ochtendse|arduimse|arduimseleiding|achttuimse|achttruimse|achttuimseleiding|achttruimseleiding|ach\s*duimse|arduinse)(?:\s*leiding)?\b/gi, "8 duimse leiding");
    s = s.replace(/\b(zaalstein\s*maar|zaalstein|zesdemer|zesdem\s*maar|zesdem|zesdedag)\b/gi, "6 duimer");
    // Rangtelwoord ("tweede", "vierde", "zesde", "achtste", "tiende", etc.) + ingeslikte "-uimer" ("man", "maar", "ma", "mag", "meer", "men", "dag", "kamer", "hamer", "emmer", "humor", "nummer", "remmer", "dimmer", "luier", "helemaal")
    s = s.replace(
      /\b(eerste|tweede|derde|vierde|vijfde|zesde|zevende|achtste|negende|tiende|elfde|twaalfde|veertiende|zestiende|achttiende|twintigste|vierentwintigste|1e|1ste|2e|2de|3e|3de|4e|4de|5e|5de|6e|6de|8e|8ste|10e|10de|12e|12de|14e|14de|16e|16de|18e|18de|20e|20ste|24e|24ste)[-\s]+(?:man|mannen|maar|ma|mar|mer|men|meer|mag|mat|mand|munt|dag|helemaal|emmer|immer|ommer|ammer|umer|umar|omer|kamer|hamer|zomer|jammer|humor|humer|hummer|nummer|remmer|remma|dimmer|dimme|dimma|demer|demmer|damer|damers|domer|timer|timers|timmer|tuimer|tuimel|luier|luiers|duimel|duimar|duima|duiker|duikers|duitser|duitsers|duivel|duvel|duwer|stuiver|ruimer|schuimer|pluimer|sluimer|duino|duimo|dino|duimno|ar?duino|duif|duiven|tuin|tuinen)\b/gi,
      (m, ord) => `${RANG_EN_TELWOORD_NAAR_DUIM[ord.toLowerCase()] || ord} duimer`,
    );
    // Gewoon telwoord / getal + (optioneel d / de / dik) + duimer-lookalike (inclusief "man", "humor", "kamer", "hamer", "emmer", "nummer", "remmer", etc.)
    s = s.replace(
      /\b(\d+(?:[.,]\d+)?|half|halve|driekwart|anderhalf|een|twee|drie|vier|vijf|zes|zeven|acht|negen|tien|elf|twaalf|veertien|zestien|achttien|twintig|vierentwintig)[-\s]*(?:[dD]\b\s*|de\s+|dik\s+)?(?:man|mannen|duimel|duimar|duima|demer|demmer|damer|damers|domer|remmer|remma|nummer|helemaal|duif|duiven|humor|humer|hummer|hamer|kamer|zomer|jammer|emmer|immer|ommer|ammer|umer|umar|omer|timer|timers|timmer|tuimer|tuimel|dimmer|dimmers|dimme|dimma|duiker|duikers|duitser|duitsers|duivel|duvel|duvels|duwer|duwers|luier|luiers|stuiver|stuivers|ruimer|schuimer|pluimer|sluimer|duino|duimo|dino|duimno|ar?duino)\b/gi,
      (m, num) => `${RANG_EN_TELWOORD_NAAR_DUIM[num.toLowerCase()] || num} duimer`,
    );
    s = s.replace(/\b(?:[dD]\s+|de\s+|dik\s+)?(humor|humer|hummer|duimel|duimar|duima|tuimer)\b/gi, "duimer");
    s = s.replace(
      /\b(\d+|een|twee|drie|vier|vijf|zes|zeven|acht|negen|tien|elf|twaalf|veertien|zestien|achttien|twintig|vierentwintig)[-\s]*(?:damer|damers|dik\s*maar|dik\s*mag|dikmer|dikmag|dij\s*mag|dij\s*maar|dijmag|dijmaar|dei\s*mag|dei\s*maar|tij\s*mag|tij\s*maar|duim\s*mag|duim\s*maar|dijk\s*mag|dijk\s*maar|dag\s*mag|dag\s*maar)\b/gi,
      (m, num) => `${RANG_EN_TELWOORD_NAAR_DUIM[num.toLowerCase()] || num} duimer`,
    );
    s = s.replace(/\b(?:teamd|tiend|team\s+d|tien\s+d|team\s*duim(?:er|s|se)?)\b/gi, "10 duimer");
    s = s.replace(/\b(?:achterma|achterman|achtermaar|achtuimer)\b/gi, "8 duimer");
    s = s.replace(/\bachter\s+ma\b/gi, "8 duimer");
    s = s.replace(/\b((?:een|op|voor|van|met|naar|bij)\s+)?achter\s+maar(?=\s*(?:van|met|schedule|sch\b|sched|leiding|buis|pijp|rondnaad|langsnaad|wand|dik|\d|$))/gi, (m, prep) => `${prep || ""}8 duimer`);
    s = s.replace(/\b(zestuimer|zestumer|zestimer)\b/gi, "6 duimer");
    s = s.replace(/\b(vijftuimer|vijftumer|vijftimer)\b/gi, "5 duimer");
    s = herstelSamengesteldGetalEnEenheid(s);
    s = s.replace(/\b(?:om|op)\s+een\s+duimer\b/gi, "op 1 duimer");

    // Wanddikte patronen: "10D" -> "10 dik", "4D" -> "4 dik", "vierdijk" -> "4 dik", "drie trek" -> "3 dik", "drietig" -> "3 dik", "43 die gevuld" -> "4 dik die gevuld"
    s = s.replace(/\b(\d+)\s*[dD]\b(?!\s*(?:duimer|duims|duim\b|humor|humer|hummer|uimer|umer))/gi, "$1 dik");
    s = s.replace(/\b(vierdijk|vier\s*dijk|viertig|vier\s*tig)\b/gi, "4 dik");
    s = s.replace(/\b(drie\s*trek|drietrek|drietig|drie\s*tig)\b/gi, "3 dik");
    s = s.replace(/\b(tweetig|twee\s*tig)\b/gi, "2 dik");
    s = s.replace(/\b(achttig|acht\s*tig)\b/gi, "8 dik");
    s = s.replace(/\b(\d+|een|twee|drie|vier|vijf|zes|zeven|acht|negen|tien|twaalf)[-\s]*(?:tig|dig)\b/gi, "$1 dik");
    s = s.replace(/\bvan\s*43\s*(?=die\s*gevuld|gevuld|gevuldest)/gi, "van 4 dik ");
    s = s.replace(/\bgevuldest\b/gi, "gevuld is");
    s = s.replace(/(\d+(?:[.,]\d+)?)[-\s]*(?:mm\s*)?\b(dek|deck|decks|dec|decs|deken|dekens|dijk|dijken|deuk|deuken|deutjes|deukjes)\b/gi, "$1 dik");
    s = s.replace(/\b(woonde\s*ik\s*(?:de|te|er)?|wandde\s*ik\s*(?:de|te|er)|wonde\s*ik\s*(?:de|te|er)|woonde\s*ik|wandelijke|wandlijke|wanddijke|wandelijk|wandelik)\b/gi, "wanddikte");
    s = s.replace(/\bachtung\b/gi, "8 duimer");
    s = s.replace(/\b(een|twee|drie|vier|vijf|zes|zeven|acht|tien|twaalf|\d+)\s*(?:duino|duimo|dino|duimno|ar?duino|duiker|duikers)\b/gi, "$1 duimer");
    s = s.replace(
      new RegExp(`\\b(${getalWoorden}|\\d+(?:[.,]\\d+)?)\\s+(?:duino|duimo|dino|duimno|duiker|duikers)\\b`, "gi"),
      "$1 duimer",
    );
    s = s.replace(
      /\b(1\/2|0\.5|1\/4|3\/4|1|2|3|4|5|6|8|10|12|14|16|18|20|24)(?:e|ste|de)\b(?=\s*(?:schedule|sch\b|sched\b|scheelt|pijp|buis|leiding|rondnaad|langsnaad|wand|volgens\s+klasse|van\s+(?:\d+|een|twee|drie|vier|vijf|zes|zeven|acht|negen|tien|twaalf|veertien|zestien)\s*(?:mm|dik)|van\s+(?:sch|schedule)))/gi,
      "$1 duimer",
    );
    s = s.replace(
      /\b(tweede|derde|vierde|vijfde|zesde|achtste|tiende|twaalfde|veertiende|zestiende|achttiende|twintigste|vierentwintigste)\b(?=\s*(?:schedule|sch\b|sched\b|scheelt|pijp|buis|leiding|rondnaad|langsnaad|wand|volgens\s+klasse|van\s+(?:\d+|een|twee|drie|vier|vijf|zes|zeven|acht|negen|tien|twaalf|veertien|zestien)\s*(?:mm|dik)|van\s+(?:sch|schedule)))/gi,
      (w) => `${RANG_EN_TELWOORD_NAAR_DUIM[w.toLowerCase()] || w} duimer`,
    );

    // Algemene RT-triggerwoord lookalikes & rijmwoorden (Curie, Schedule, Opnames, Tijd, Afzetting, Bronnen, Normen, Draadjes, etc.)
    s = s.replace(/\b(\d+(?:[.,]\d+)?)\s*(?:c|k|g)(?:u|e|ee|ie|ë)?r+[a-zäëïöü]*ridi[a-z]+\b/gi, "$1 Curie iridium");
    s = s.replace(/\b(?:c|k|g)(?:u|e|ee|ie|ë)?r+[a-zäëïöü]*ridi[a-z]+\b/gi, "Curie iridium");
    s = s.replace(/\b(\d+(?:[.,]\d+)?)\s*(?:c|k|g)(?:u|e|ee|ie|ë)?r+[a-zäëïöü]*seleni[a-z]+\b/gi, "$1 Curie selenium");
    s = s.replace(/\b(\d+(?:[.,]\d+)?)\s*(?:c|k|g)(?:u|e|ee|ie|ë)?r+[a-zäëïöü]*[ck]obal[td]\b/gi, "$1 Curie kobalt");
    s = s.replace(
      new RegExp(`\\b(${getalWoorden}|\\d+(?:[.,]\\d+)?)[-\\s]+(gerie|gerrie|gerry|geerie|gery|geurie|geury|kerrie|keurie|kirie|kiri|kiere|curry|jury|furie|kierie|kurie|kyrie|kerie|ceurie|curies|gereed|carry)\\b`, "gi"),
      "$1 Curie",
    );
    s = s.replace(
      new RegExp(`\\b(${getalWoorden}|\\d+(?:[.,]\\d+)?)\\s+(si|cie)\\b`, "gi"),
      "$1 Curie",
    );
    s = s.replace(/\b(?:want|van)\s+(?:ik\s+)?(?:ga\s+zo|ga\s+ze|krijg\s+zo|schat\s+zo|schiet\s+zo|kijk\s+zo|geef\s+zo|doe\s+zo|is\s+zo|gazo)\s+(5s?|10s?|20|30|40s?|60|80s?|100|120|140|160|xxs|xs|std)\b/gi, "van schedule $1");
    s = s.replace(/\b(?:ik\s+)?(?:ga\s+zo|ga\s+ze|krijg\s+zo|schat\s+zo|schiet\s+zo|kijk\s+zo|gazo)\s+(5s?|10s?|20|30|40s?|60|80s?|100|120|140|160|xxs|xs|std)\b/gi, "schedule $1");
    s = s.replace(/\b(skedule|skedjul|skedjoel|schedul|scedule|schede|schedel|schouder|schouders|schotel|schotels|schaduw|schade|schaal|school|schoen|schakel|schild|schil|ketel|scheelt|scheel|schel|sheelt|sjeelt)\s+(5s?|10s?|20|30|40s?|60|80s?|100|120|140|160|xxs|xs|std|\d+[a-z]?)\b/gi, "schedule $2");
    s = s.replace(/\b(?:voor\s+een\s+|volgens\s+een\s+|een\s+)?(?:cm|centimeter)\s+klasse\s*([ab])\b/gi, (_, kl) => `volgens EN-${kl.toUpperCase()}`);
    s = s.replace(/\b(hoeveel|aantal)\s+(afnames|afname|toename|opnamen|opnaam|opnaams)\b/gi, "$1 opnames");
    s = s.replace(/\b(straling\s*tijd|stralings\s*tijd|straal\s*tijd|straaltijd|stralingstijden|staling\s*steeds|straling\s*steeds|stalings\s*steeds|staling\s*tijd|stalings\s*tijd|stalingstijd|straling\s*staat|staling\s*staat|stralings\s*staat|straling\s*stad|staling\s*stad|straling\s*strijd|staling\s*strijd|straling\s*stijgt|staling\s*stijgt|verlichtingstijd|berichtingtijd|plichtingstijd|belichting\s*tijd|belichtings\s*tijd|schiet\s*tijd)\b/gi, "stralingstijd");
    s = s.replace(/\bstaling\b/gi, "straling");
    s = s.replace(/\b(?:extra(?:\s+al)?|ik\s+sta(?:\s+al)?|ik\s+stalen|ik\s+straalt|ik\s+stralen|ik\s+schaal|ik\s+zaal)\s+(?=\d+(?:[.,]\d+)?\s*(?:minuut|minuten|min\b|sec\b|seconden)\b)/gi, "ik straal ");
    s = s.replace(/\bhoe\s+ga\s+krijg\s+ik\b/gi, "hoe krijg ik");
    s = s.replace(/\bhoe\s+krijg\s+ga\s+ik\b/gi, "hoe ga ik");
    s = s.replace(/\b(on\s*stream|ons\s*stream|onstroom|ontstroom|ons\s*droom|onstrie|onstriem|ons\s*riem|ontstem)\b/gi, "onstream");
    s = s.replace(/\b(af\s*stapping|afstappen|af\s*zetting|afzeting|afzettings|opzetting|uitzetting)\b/gi, "afzetting");
    s = s.replace(/\bhoe\s+groot\s+moet(?:en)?\s+(?:de\s+|het\s+|een\s+)?afzetting\b/gi, "hoe groot moet de afzetting");
    s = s.replace(/\b(veilige?|grote?)\s+afzetten\b/gi, "$1 afzetting");
    s = s.replace(/\b(las\s*prieten?|las\s*sprieten?|laspriet(?:en)?)\b/gi, "lasbreedte");
    s = s.replace(/\bvoorkeurs(\s*afstand)?\b/gi, (_, afst) => (afst ? "focusafstand" : "focus"));
    s = s.replace(/\bvoorkeur\b(?=\s+(?:van\s+\d|is\s+\d|\d|afstand|verandering|wissel))/gi, "focus");
    s = s.replace(/\b(fokkes|fokkus|vokus)\b/gi, "focus");
    s = s.replace(/\b(draatje|draadjes|raadje|raadjes|braadje)\b(?=\s|$|\?)/gi, (m) => (m.toLowerCase().endsWith("s") ? "draadjes" : "draadje"));
    s = s.replace(/\b(aas\s*mee|esmee|as\s*mee|azme)\b/gi, "ASME");
    s = s.replace(/\b(iridieum|iridiem|iridum|iridim|eridium)\b/gi, "iridium");
    s = s.replace(/\b(selenieum|celenium|seleniem|silenium)\b/gi, "selenium");
    s = s.replace(/\b(koebalt|kobald|kobaldt|cobalt)\b/gi, "kobalt");
    s = s.replace(/\b(balto|ball\s*toe|bal\s*toe|baltoo|balteauw|baltoh)\b/gi, "Balteau");
    s = s.replace(/\b(keram|seram|ceran|seeraam)\b/gi, "Ceram");
    s = s.replace(/\b(ikslon|ixlon|ykslon|ichslon|exlon|yx\s*lon|ijxlon|ypsilon\s*300|epsilon\s*300)\b/gi, "Yxlon");
    s = s.replace(/\b(smart\s*info|smart\s*ever|smart\s*ivo|smartieve|smart\s*efo|smart\s*ifo|smart\s*iwo)\b/gi, "Smart EVO");
    s = s.replace(/\b(kollimator|kolimator|colimator|collimater|kolimater)\b/gi, "collimator");
    s = s.replace(/\b(doosistempo|doosis\s*tempo|dosis\s*tempo)\b/gi, "dosistempo");
    s = s.replace(/\b(lootplaat|lood\s*plaat)\b/gi, "loodplaat");
    s = s.replace(/\b(lootplaten|lood\s*platen)\b/gi, "loodplaten");
    s = s.replace(/\b(gefuld|gevult)\b/gi, "gevuld");
    s = s.replace(/\b(er\s*vees|r\s*v\s*s|air\s*vs|rfs)\b/gi, "RVS");
    s = s.replace(/\b(316\s*el|316\s*ell)\b/gi, "316L");
    s = s.replace(/\b(304\s*el|304\s*ell)\b/gi, "304L");
    s = s.replace(/\b(dupleks|dublex)\b/gi, "duplex");
    s = s.replace(/\b(inkonel|in\s*konel)\b/gi, "Inconel");
    s = s.replace(/\b(tytanium)\b/gi, "titanium");
    s = s.replace(/\b(lasdikte|las\s*dikte|pijpdikte|pijp\s*dikte|buisdikte|buis\s*dikte)\b/gi, "wanddikte");
    s = s.replace(/\b(pijpdiameter|pijp\s*diameter|buisdiameter|buis\s*diameter)\b/gi, "diameter");
    s = s.replace(/\b(bron\s*zeide|bron\s*zij)\b/gi, "bronzijde");
    s = s.replace(/\b(film\s*zeide|film\s*zij)\b/gi, "filmzijde");
    s = s.replace(/\b(vilm|filmje)\b/gi, "film");
    s = s.replace(/\b(onstream\s*(?:klasse\s*)?(?:thee\s*b|t\s*b|tb)|klasse\s*(?:thee\s*b|t\s*b)|tee\s*bee)\b/gi, "onstream klasse TB");
    s = s.replace(/\b(onstream\s*(?:klasse\s*)?(?:thee\s*a|t\s*a|ta)|klasse\s*(?:thee\s*a|t\s*a)|tee\s*aa)\b/gi, "onstream klasse TA");

    // Zwarting & Verwachting fonetische spraakcorrecties (incl. "Sword 1.5", "swording 1.5", "zwart in 2.5")
    s = s.replace(/\b(zwartings?\s*vrijste|zwartingsvrijste|zwartingvrijste|zwartings?\s*vrijsten|zwartings?\s*vereiste|zwartings?\s*vereisten)\b/gi, "zwartingseisen");
    s = s.replace(/\b(swording|swarting|sworting|swords|sword|zwart\s+in|zwart\s+ik|zwart\s+ding|zwarte\s+in|zwarting\s+in)\b/gi, "zwarting");
    s = s.replace(/\b(?:zwart|zwarte)\s+(?=(?:van\s+|is\s+)?\d+(?:[.,]\d+)?\b)/gi, "zwarting ");
    s = s.replace(/\b(maximale|minimale|vereiste|toelaatbare|film)\s+verwachting\b/gi, "$1 zwarting");
    s = s.replace(/\bverwachting\s+(?=voor\s+en[-\s]?[ab]|voor\s+asme|volgens\s+en[-\s]?[ab]|volgens\s+asme|van\s+en[-\s]?[ab]|bij\s+en[-\s]?[ab]|van\s+de\s+film|op\s+de\s+film)/gi, "zwarting ");
    s = s.replace(/\b(verwachtingseisen|verwachtingseis)\b/gi, "zwartingseisen");

    // Schietkaart, Overzichtskaart & Hole-Type IQI fonetische spraakcorrecties
    s = s.replace(/\b(?:schiet\s*kaart|schietkaarten)\b/gi, "schietkaart");
    s = s.replace(/\b(?:overzichts\s*kaart|overzichtskaarten)\b/gi, "overzichtskaart");
    s = s.replace(/\b(?:hol\s*type|holetype|holtype)\b/gi, "hole type");
    s = s.replace(/\b(?:shim\s*type|shimtype)\b/gi, "shim iqi");
    s = s.replace(/\b(?:twee\s*t|2\s*t)\b/gi, "2T");
    s = s.replace(/\b(?:een\s*t|1\s*t)\b/gi, "1T");
    s = s.replace(/\b(?:vier\s*t|4\s*t)\b/gi, "4T");
    s = s.replace(/\b(?:in\s+plaats\s+van\s+esmee|in\s+plaats\s+van\s+aasmee|in\s+plaats\s+van\s+a\s*s\s*mee)\b/gi, "in plaats van ASME");

    // EN-B / EN-A fonetische lookalikes (bijv. "airklasse B", "airclasse B", "Jan klasse B", "1 klasse B", "een klasse B")
    s = s.replace(/\b(?:air\s*klasse|airklasse|air\s*classe|airclasse|jan\s*klasse|1\s*klasse|een\s*klasse)\s*b\b/gi, "EN-B");
    s = s.replace(/\b(?:air\s*klasse|airklasse|air\s*classe|airclasse|jan\s*klasse|1\s*klasse|een\s*klasse)\s*a\b/gi, "EN-A");

    // ASME fonetische lookalikes (bijv. "voor ons Esmee", "volgens SV", "aas mee", "aasmee", "volgens Esmee", "volgens a s mee", "voor ons aalsmee")
    s = s.replace(
      /\b(?:voor\s+(?:ons|onze)\s+(?:esmee|aalsmee|alsmee|aas\s*mee|aasmee|aas\s*me|sv|s\s*v|es\s*v|es\s*vee)|volgens\s+(?:esmee|a\s*s\s*mee|aalsmee|alsmee|aas\s*mee|aasmee|aas\s*me|sv|s\s*v|es\s*v|es\s*vee|as\s*v)|a\s*s\s*mee|voorons\s+(?:aalsmee|alsmee))\b/gi,
      "volgens ASME",
    );
    s = s.replace(/\b(aalsmee|alsmee|aas\s*mee|aasmee|aas\s*me|aasme)\b/gi, "ASME");

    // Praktijk spraakvormen voor draadjes/plaat/dikte (bijv. "kan ik draadje maar ik zie dat mijn plaats van ardijk volgens SV")
    s = s.replace(/\b(?:kan|ken)\s+ik\s+(draadje|draadjes)\s+(?:maar|moet|mag)\s+ik\s+zie(?:n)?\b/gi, "welk $1 moet ik zien");
    s = s.replace(/\b(?:kan|ken)\s+ik\s+(draadje|draadjes)\b/gi, "welk $1");
    s = s.replace(/\b(draadje|draadjes|bki|iqi)\s+(?:maar|mag)\s+ik\s+zie(?:n)?\b/gi, "$1 moet ik zien");
    s = s.replace(/\b(?:dat\s+mijn|op\s+mijn|mijn)\s+(plaats|praat|blad|plaad)\s+van\b/gi, "op een plaat van");
    s = s.replace(/\b(ardijk|aardijk|achtdijk|achdijk|ardek)\b/gi, "8 dik");

    // Brongrootte lookalikes (bijv. "de bron groot is 3", "de volgende groot is 3", "de bruynegoot is 3", "bronnen grote virus")
    s = s.replace(/\b(?:de\s+)?(?:bron\s*groot|volgende\s*groot|bruyne\s*goot|bruynegoot|bruine\s*goot|bruinegoot)\s*(?:is|van|=|:)?\s*(\d+(?:[.,]\d+)?)\b/gi, "brongrootte $1");
    s = s.replace(/\b(?:bronnen\s*grote|brongrootte|bron\s*grootte)\s*(?:is\s*)?virus\b/gi, "brongrootte 4 is");

    // Iridium lookalikes (bijv. "die ridem", "ingrediën", "ingrediënt", "ingrediënten", "ridia", "ridium", "de stage iridium")
    s = s.replace(/\b(?:en\s+die\s+|die\s+|de\s+)?(?:ridem|ridium|ridia|ingredi[eë]n|ingredi[eë]nt|ingredi[eë]nten)\b/gi, "iridium");
    s = s.replace(/\b(?:de|die)?\s*(?:sterkste|stangste|stangse|stankste|stamste|stage|stagste|stagische|statische|strategische|staarste|strakste|steekste|st[a-z]{2,8}(?:ste|ische))\s+(iridium|selenium|seleen|kobalt|bron|bronnen|cilinder)\b/gi, "de sterkste $1");

    // Curie & Selenium lookalikes (bijv. "30 Carry", "30 gereed", "chryslering" -> "Curie selenium", "cilinder in bron" -> "selenium bron")
    s = s.replace(/\b(\d+)\s*(?:carry|gereed|jullie)\b/gi, "$1 Curie");
    s = s.replace(/\bmisdaad\s+dat\s+jullie\b/gi, "is 30 Curie");
    s = s.replace(/\b(?:chryslering|chrysler\s*ing|chrysler)\b/gi, "Curie selenium");
    s = s.replace(/\b(?:cilinder\s*in\s*bron|cilinder\s*inbron)\b/gi, "selenium bron");
    s = s.replace(/\b(cilinder\s*in|cilinder)\s+(?=bron|bronnen|isotoop|curie|ci\b)/gi, "selenium ");
    s = s.replace(/\b(cilinder\s*in)\b/gi, "selenium");

    // Focus / FFD spraakvormen (bijv. "focus hebt van 13 cm", "focus heb vandaag 10 cm", "focus heb van 13 cm")
    s = s.replace(/\b(focus|ffd|sfd)\s+(?:hebt\s*van|heb\s*van|heb\s*ik\s*van|heb\s*vandaag|hebt|heb)\s+(\d+(?:[.,]\d+)?)\s*(cm|centimeter|mm)?/gi, "$1 $2 $3");
    s = s.replace(/\bheb\s+vandaag\s+(\d+)\s*(cm|mm)?/gi, "focus $1 $2");
    s = s.replace(/\bmaar\s+(?=een\s+focus|focus)/gi, "met ");

    // Verzet & Lasbreedte lookalikes
    s = s.replace(/\b(?:laspreter|las\s*preter|lasbreter|las\s*breter|lasbieten|las\s*bieten|laspieten|las\s*pieten|lasbeter)\b/gi, "lasbreedte");
    s = s.replace(/\b(?:overall|overal|of\s*af|ofaf)\s*schieten\b/gi, "ovaal schieten");
    s = s.replace(/\boverallschieten\b/gi, "ovaal schieten");
    s = s.replace(/\b(mag\s+ik\s+.+?)\s+hoeveel\s+schieten\b/gi, "$1 ovaal schieten");
    s = s.replace(/(\d+(?:[.,]\d+)?)\s*(?:hoeveel|hoefel|hoeffout)\s*schieten\b/gi, "$1 ovaal schieten");

    // Hastelloy lookalikes (bijv. "hasteloy", "hasseler die 300 café")
    s = s.replace(/\b(?:hasseler\s*die|hasselerdie)\b/gi, "Hastelloy bij");
    s = s.replace(/\b(hasteloy|hastelloy|hasseloy|hasteloj|hastelloj|hasterloy)\b/gi, "Hastelloy");

    // Centraal schieten
    s = s.replace(/\bcentraalschieten\b/gi, "centraal te schieten");

    // Rondnaad lookalikes (bijv. "hond na het", "hond naad", "rond na te", "rond na het")
    s = s.replace(/\b(?:mijn|om\s+een|in\s+een|een)\s+(?:hond\s+na\s+het|hond\s*naad|rond\s*na\s*te|rond\s*na\s*het)\b/gi, "om een rondnaad");
    s = s.replace(/\b(?:hond\s*na\s*het|hond\s*naad|rond\s*na\s*te|rond\s*na\s*het)\b/gi, "rondnaad");

    // Centraal lookalikes ("Cent Raalte", "centraalte", "mcentraal")
    s = s.replace(/\b(?:cent\s*raalte|centraalte)\s*(?:te\s*)?schieten\b/gi, "centraal te schieten");
    s = s.replace(/\b(?:cent\s*raalte|centraalte)\b/gi, "centraal te");
    s = s.replace(/\b(\d+(?:[.,]\d+)?)\s*mcentraal\b/gi, "$1 meter centraal");
    s = s.replace(/\b(\d+)[.,](\d{1,2})\s*(?:centraal\s*te|centraal)\b/gi, "$1.$2 meter centraal");

    // Wanddikte lookalikes (bijv. "the wonderte", "wanddeegte", "wandelen", "the 100", "de 100", "de wandel ik de", "wandel ik de", "de wandeling te", "woonde ik de")
    s = s.replace(
      /\b(?:the|de)?\s*(?:wonderte|wonder\s*te|wonder\s*de|wandert|wondert|wonderten|wondertek|wondertec|wandd?eeg(?:te)?|wandd?eg(?:te)?|wandd?ek(?:te)?|wandtegte|wandtekte|wanddigte|wandel(?:en|ing|ingen|er|ers|aars?|de|t)?(?:\s*ik)?(?:\s*(?:de|te|er))?|wondikte|wanddecte|one\s*dikte|onedikte|woonde\s*ik\s*(?:de|te|er)?|wandde\s*ik\s*(?:de|te|er)?|wonde\s*ik\s*(?:de|te|er)?)\s*(?:is|van|=|:)?\s*(\d+(?:[.,]\d+)?)\b/gi,
      "de wanddikte is $1",
    );
    s = s.replace(
      /\b(?:the|de)\s*(?:100|hundred|one\s*hundred|honderd)\s*(?:is|van|=|:)?\s*(\d+(?:[.,]\d+)?)\b/gi,
      "de wanddikte is $1",
    );
    s = s.replace(
      /\b(?:the|de)\s*(?:wonderte|wonder\s*te|wonder\s*de|wandert|wondert|wonderten|wondertek|wondertec|wandd?eeg(?:te)?|wandd?eg(?:te)?|wandd?ek(?:te)?|wandtegte|wandtekte|wanddigte|wandel(?:en|ing|ingen|er|ers|aars?|de|t)?(?:\s*ik)?(?:\s*(?:de|te|er))?|wondikte|wanddecte|one\s*dikte|onedikte|woonde\s*ik\s*(?:de|te|er)?|wandde\s*ik\s*(?:de|te|er)?|wonde\s*ik\s*(?:de|te|er)?)\b/gi,
      "de wanddikte",
    );
    s = s.replace(
      /\b(?:wonderte|wonder\s*te|wonder\s*de|wandert|wondert|wonderten|wondertek|wondertec|wandd?eeg(?:te)?|wandd?eg(?:te)?|wandd?ek(?:te)?|wandtegte|wandtekte|wanddigte|wandel(?:en|ing|ingen|er|ers|aars?|de|t)?(?:\s*ik)?(?:\s*(?:de|te|er))?|wondikte|wanddecte|one\s*dikte|onedikte|woonde\s*ik\s*(?:de|te|er)?|wandde\s*ik\s*(?:de|te|er)?|wonde\s*ik\s*(?:de|te|er)?)\b/gi,
      "wanddikte",
    );
    s = s.replace(
      /\b(?:the|de)\s*(?:100|hundred|one\s*hundred|honderd)\b(?=\s+(?:is|van|=|\d+\s*dik|\d+\s*mm|welk|volgens|\d+\b))/gi,
      "de wanddikte",
    );
    s = s.replace(
      /\b(?:the|de)?\s*(?:one|1)\s*that(?:['’]?s|\s*is|\s*van|\s*was)?\s*(?:is|van|=|:)?\s*(\d+(?:[.,]\d+)?)\b/gi,
      "de wanddikte is $1",
    );
    s = s.replace(
      /\b(?:the|de)?\s*(?:one|1)\s*that\s*(\d+(?:[.,]\d+)?)\s*(?:is|dik)?\b/gi,
      "de wanddikte is $1",
    );
    s = s.replace(
      /\b(?:the|de)\s*(?:one|1)\s*that\s*(?:is|was)\b/gi,
      "de wanddikte is",
    );
    s = s.replace(
      /\b(?:the|de)\s*(?:one|1)\s*that\b(?=\s+(?:is|van|=|\d+\s*dik|\d+\s*mm|welk|volgens|\d+\b))/gi,
      "de wanddikte",
    );

    const spraakCorrecties = [
      // 1. Isotopen, Bronnen & Sterkste / Zwakste
      // Iridium lookalikes (radium, rhodium, indium, etc.)
      [/\b(radium|radiumbron|rhodium|rodium|indium|strontium|thorium|uranium|tritium|iridjum|ieridium|eridium|uridium|yridium|aridum|aredium|iriedium|iredium|irideum|iridion|iridiem|riedium|redium|riejem|ridiam|ridiem|iridi|iridie|irrie)\b/gi, "iridium"],
      [/\b(radio|podium|stadium|medium|helium|lithium|museum|gymnasium|aquarium|terrarium|solarium|planetarium)\s+(?=bron|bronnen|192|isotoop|curie|ci\b|brom|kroon)\b/gi, "iridium "],
      [/\b(ier|hier|er|eer|uur|jaar|haar|daar|ijzer|erik|i\s*r|i\.r\.)\s*192\b/gi, "Ir-192"],
      // Selenium lookalikes (silicium, geranium, celine, etc.)
      [/\b(seleniun|zeleen|zaleen|sileen|saleen|selleen|selen|zelen|silicium|millennium|decennium|celine|celien|seline|selene|heleen|marleen|paulien|jolien|evelien|aline|sirene|serene|serenium|silenium|zelenium|zillenium|seleniem|selenia|celenium|cilenium|slenium|salenium|sylenium|solenium|zeelieden)\b/gi, "selenium"],
      [/\b(geranium|titanium|titaan|serum|serie|sessie|ze|see|zee|c|ce|s\s*e|s\.e\.|es\s*ee|es\s*e|zij|hij|seth)\s*75\b/gi, "Se-75"],
      [/\b(geranium|serum|sirene|celine|heleen|marleen)\s+(?=bron|bronnen|isotoop|curie|ci\b|brom|kroon)\b/gi, "selenium "],
      // Kobalt lookalikes
      [/\b(kobal|koba|kobold|kobald|cobald)\b/gi, "kobalt"],
      [/\b(ko|kool|koolstof|koopman|c\s*o|c\.o\.)\s*60\b/gi, "Co-60"],
      // Sterkste / Zwakste
      [/\b(stangste|stangse|stankste|stamste|staarste|stearste|starste|sterste|stèrste|sterksten|strakste|strikste|stekste|streekste|stiekste|steekste|sterfte|stelligste|stoutste|stagische|stagste|stugste|stomste|stijfste)\b/gi, "sterkste"],
      [/\b(zwaarste|heetste|felste|grootste|hoogste)\s+(?=(?:(?:iridium|ir[-\s]?192|selenium|se[-\s]?75|kobalt|co[-\s]?60|gamma)\s+)?(?:bron|bronnen|isotoop|radium|brom|kroon))\b/gi, "sterkste "],
      [/\bhoe\s+(?:staar|star|strak|ster|stèr|zwaar|heet|fel)\s+(?=is|zijn|waren)\b/gi, "hoe sterk "],
      [/\b(zachtste|slapste|lichtste|kleinste|laagste|oudste)\s+(?=(?:(?:iridium|ir[-\s]?192|selenium|se[-\s]?75|kobalt|co[-\s]?60|gamma)\s+)?(?:bron|bronnen|isotoop|radium|brom|kroon))\b/gi, "zwakste "],
      // Bron / Bronnen lookalikes (brom, kroon, droom, boon, etc. in bron-context)
      [/\b(sterkste|zwakste|welke|onze|actuele|iridium|ir-192|selenium|se-75|kobalt|co-60|gamma)\s+(brom|brommer|kroon|droom|boon|bon|zon|ton|ballon|perron|baron|brons|grond|hond|mond|blond)\b/gi, "$1 bron"],
      [/\b(sterkste|zwakste|welke|onze|actuele|iridium|ir-192|selenium|se-75|kobalt|co-60|gamma)\s+(brommen|kronen|dromen|bonen|bonnen|zonnen|tonnen|bronzen)\b/gi, "$1 bronnen"],
      [/\b(brom|kroon|droom|boon|ballon|baron|brons)\s+(?=van\s+\d+\s*(?:curie|ci|mm)|97969|35598|35041|rr\d+)\b/gi, "bron "],
      [/\b(brongrote|bron\s*grote|broodgrootte|kroongrootte|droomgrootte|grondgrootte|boongrootte|brandvlekgrootte|brandvlek\s*grootte|focusafmeting|focus\s*afmeting|bronafmeting|bron\s*afmeting|focusgrootte|focus\s*grootte)\b/gi, "brongrootte"],
      [/\b(bronkhuyzen|bronkhuizen|bronkhuis|bronhuizen|bronhuis|bronkruis|bronbuis|bron\s*kruis|bron\s*buis|bron\s*cursus|bron\s*keuring|broodkeuze|kroonkeuze|droomkeuze|boomkeuze|bonkeuze)\b/gi, "bronkeuze"],
      [/\b(geval|beval|afval|uitval|inval|aanval|toeval|waterval|interval)\s+(?=van\s+(?:de\s+)?(?:bron|iridium|selenium|se-75|ir-192|curie))\b/gi, "verval "],
      // Curie & Activiteit lookalikes
      [/\b(kirie|kiere|kiri|kierie|kuri|kuries|curies|cuypers|kuipers|kuiper|kurie|kurië|curië|kuriën|kurius|curius|quri|qurie|kyrie|curi|curri|keuri|kewrie)\b/gi, "Curie"],
      [/\b(\d+(?:[.,]\d+)?)\s*(?:kuur|kuren|kuub|kuubs|keur|keuren|keurig|kerrie|curry|ferry|harry|barry|larry|gerrie|gerry|terry|jerry|perry|merrie|merry|berrie|berry|furie|jurie|jury|juli|julie|joelie|koerier|koeriers)\b(?!\s*20\d\d)/gi, "$1 Curie"],
      [/\b(activiteid|aktieviteit|activitijd|bronsterkte|bron\s*sterkte)\b/gi, "activiteit"],
      [/\b(effectiviteit|productiviteit|creativiteit|festiviteit|intensiteit|capaciteit|elektriciteit|actualiteit|autoriteit|mobiliteit|stabiliteit)\s+(?=van\s+(?:de\s+)?(?:bron|iridium|selenium|se-75|ir-192))\b/gi, "activiteit "],

      // 2. Focus / FFD / Onstream / Isolatie / Bundel
      [/\b(film\s*(?:voorkeur|voorkeurs|fokkers|fokker|vogels|vogel|fokus)\s*afstand|(?:veel|velum)\s*focus\s*afstand|film\s*focus\s*afstand|filmfocusafstand)\b/gi, "film focus afstand"],
      [/\b(bron\s*(?:veel|velum|voorkeur|voorkeurs|fokkers|vogels)\s*afstand|bron\s*film\s*afstand|bronfilmafstand)\b/gi, "bron film afstand"],
      [/\b((?:object|opject|op\s*je)\s*(?:veel|velum|film)\s*afstand|objectfilmafstand)\b/gi, "object film afstand"],
      [/\b(fokkers\s*afstand|fokker\s*afstand|foto\s*afstand|vogels\s*afstand|vogel\s*afstand|fokus\s*afstand|fokusafstand|focus\s*afstand)\b/gi, "focusafstand"],
      [/\b(focus\s*verandering|focusverandering|ffd\s*verandering|focus\s*wissel|focuswissel|(?:voorkeur|voorkeurs|fokkers|vogels|fokus)\s*(?:verandering|wissel))\b/gi, "focusverandering"],
      [/\b(effe\s+de|effe\s+dee|ef\s*ef\s*de|ef\s*ef\s*dee|ef\s*dee|f\s*f\s*d|effd|ff\s*d|f\s*f\s*t|f\s*v\s*d|fvd)\b/gi, "FFD"],
      [/\b(fokkers|fokker|fokus|vokkes|fokkes|fokke|vokke|vogels|vogel|locus|crocus|krokus|hocus|pocus|pokus|circus|ficus|lotus|foetus|cactus|fakkel|fakkels)\b(?=\s+(?:afstand|op|voor|bij|van|moet|aanhouden|nodig|berekenen|wissel|verandering|is|\d+)|\s*$)/gi, "focus"],
      [/\b(hoeveel|welke|minimale|wat\s+is\s+de|kleinste|kortste|nieuwe|oude)\s+(fokkers|fokker|fokus|vokkes|fokkes|fokke|vokke|vogels|vogel|locus|crocus|krokus|hocus|pocus|pokus|circus|ficus|lotus|foetus|cactus|fakkel|fakkels)\b/gi, "$1 focus"],
      [/\b(optimale|normale|finale|ideale|militair|militaire|minima|minimaal|mini)\s+(?=ffd|sfd|focus|focusafstand)\b/gi, "minimale "],
      [/\bminimale\s+(?:voorkeur|voorkeurs)\b/gi, "minimale focus"],
      [/\b(bundel\s*breedte|bundel\s*weten|bundel\s*vreten|buitenbreedte)\b/gi, "bundelbreedte"],
      [/\b(openings\s*hoek|opening\s*hoek|open\s*hoek)\b/gi, "openingshoek"],
      [/\b(on\s*stream|onstreamer|on\s*streamer|ontstroom|omstroom|instroom|uitstroom|onderstroom|bovenstroom|rondstroom|aanstroom|doorstroom|opstroom|(?:een|1|in|om|aan)\s*stream(?:er)?|instream|omstream|onscreen|on\s*screen|onze\s*team|ons\s*team|onze\s*riem|oom\s*stoom|onze\s*droom)\b/gi, "onstream"],
      [/\b(amsterdam|monster|monsterm|ontstaan|online)\s+(?=opname|opnames|ffd|focus|pijp|buis|leiding|duimer|duim|rt21021|rt21022|tangentiaal)\b/gi, "onstream "],
      [/\b(tangensiaal|tangensieël|tangentieel|tagentiaal|tangesiaal|tangeciaan)\b/gi, "tangentiaal"],
      [/\b(dubbelband|dubbelhand|dubbelzand|dubbelkant|dubbelland|dubbelpand|dubbelrand|dubbeltand)\b/gi, "dubbelwand"],
      [/\b(installatie|inflatie|ventilatie|simulatie|situatie|operatie|integratie|inspiratie|informatie|locatie|relatie|irritatie|irrigatie|imitatie)\s*(?=dikte|laag\b)/gi, "isolatie"],
      [/\b(zonder|geen|met|\d+\s*mm)\s+(installatie|inflatie|ventilatie|simulatie|irritatie|irrigatie|imitatie)\b/gi, "$1 isolatie"],

      // 3. Wanddikte / Diameter / Duimer / Getallen-homofonen
      [/\b(want\s*dikte|van\s*dikte|vandikte|wamdikte|waterdikte|wat\s*dikte|wanddikten|handdikte|banddikte|zanddikte|randdikte|kantdikte|landdikte|panddikte|tanddikte|manddikte|branddikte|stranddikte|wanten\s*dikte|wante\s*dikte|wang\s*dikte|wangdikte|wan\s*dikte|warmte\s*dikte|wandsdikte|wand\s*dicht|want\s*dicht|wanddichte|waterdichte|waterdicht|winddichte|winddicht|luchtdichte|luchtdicht|lichtdichte|lichtdicht|stofdichte|stofdicht)\b/gi, "wanddikte"],
      [/\b(doorstaande\s*dikte|door\s*staande\s*dikte|doorslaande\s*dikte|door\s*slaande\s*dikte|doorspraak\s*dikte|doorslag\s*dikte|doorgaande\s*dikte|doorstralings?\s*dikte|doorgestraalde\s*dikte|door\s*schijnende\s*dikte|doorbetaalde\s*dikte|doorgehaalde\s*dikte|doorvertaalde\s*dikte|doorgedraaide\s*dikte)\b/gi, "doorstraalde dikte"],
      [/\b(die\s*ja\s*meter|dieja\s*meter|dia\s*meeter|diamater|diaprojector|barometer|thermometer|parkeermeter|watermeter|gasmeter|stroommeter|snelheidsmeter|hoogtemeter|dieptemeter)\b/gi, "diameter"],
      // Eerst duimer-lookalikes normaliseren, daarna getallen-homofonen vlak voor duimer/duim/dik/mm
      [/\b(\d+(?:[.,]\d+)?|half|halve|driekwart|anderhalf|een|twee|drie|vier|vijf|zes|acht|tien|twaalf|veertien|zestien|achttien|twintig|vierentwintig|thee|zee|mee|wie|knie|hier|vuur|bier|dier|mier|gier|stier|wier|kier|sier|tier|wijf|lijf|schijf|stijf|les|mes|fles|bes|echt|wacht|zacht|nacht|zien|wien)[-\s]*(?:duim|duims|duimse|duimen|duimpje|duimer|duimers|duin|duins|duinen|duif|duiven|duyven|timer|timers|tuin|tuinen|tuintje|dimmer|dimmers|dimme|dimma|duivel|duvel|duvels|duwer|duwers|duiker|duikers|duitser|duitsers|luier|luiers|stuiver|stuivers|ruimer|ruimers|sluier|kruier|schuiver|inch|inches|")\b/gi, "$1 duimer"],
      [/\b(thee|zee|mee)\s+(?=duimer|duim|mm\b|dik\b|wanddikte\b)/gi, "2 "],
      [/\b(wie|knie)\s+(?=duimer|duim|mm\b|dik\b|wanddikte\b)/gi, "3 "],
      [/\b(hier|vuur|bier|dier|mier|gier|stier|wier|kier|sier|tier)\s+(?=duimer|duim|mm\b|dik\b|wanddikte\b)/gi, "4 "],
      [/\b(wijf|lijf|schijf|stijf|blijf|drijf|wrijf)\s+(?=duimer|duim|mm\b|dik\b|wanddikte\b)/gi, "5 "],
      [/\b(les|mes|fles|bes|nes|des|hes|tes)\s+(?=duimer|duim|mm\b|dik\b|wanddikte\b)/gi, "6 "],
      [/\b(echt|wacht|zacht|nacht|kracht|klacht|jacht|vacht|pacht|gracht|dracht|macht|lacht|dacht|bracht)\s+(?=duimer|duim|mm\b|dik\b|wanddikte\b)/gi, "8 "],
      [/\b(zien|wien)\s+(?=duimer|duim|mm\b|dik\b|wanddikte\b)/gi, "10 "],
      // Uitgeschreven Nederlandse getalwoorden direct converteren naar cijfer vóór duimer / duims / duim
      [/\b(half|halve)\s+(?=duimer|duims|duim\b)/gi, "0.5 "],
      [/\b(driekwart)\s+(?=duimer|duims|duim\b)/gi, "0.75 "],
      [/\b(anderhalf)\s+(?=duimer|duims|duim\b)/gi, "1.5 "],
      [/\b(een|1)\s+(?=duimer|duims|duim\b)/gi, "1 "],
      [/\b(twee|2)\s+(?=duimer|duims|duim\b)/gi, "2 "],
      [/\b(drie|3)\s+(?=duimer|duims|duim\b)/gi, "3 "],
      [/\b(vier|4)\s+(?=duimer|duims|duim\b)/gi, "4 "],
      [/\b(vijf|5)\s+(?=duimer|duims|duim\b)/gi, "5 "],
      [/\b(zes|6)\s+(?=duimer|duims|duim\b)/gi, "6 "],
      [/\b(zeven|7)\s+(?=duimer|duims|duim\b)/gi, "7 "],
      [/\b(acht|8)\s+(?=duimer|duims|duim\b)/gi, "8 "],
      [/\b(negen|9)\s+(?=duimer|duims|duim\b)/gi, "9 "],
      [/\b(tien|10)\s+(?=duimer|duims|duim\b)/gi, "10 "],
      [/\b(twaalf|12)\s+(?=duimer|duims|duim\b)/gi, "12 "],
      [/\b(veertien|14)\s+(?=duimer|duims|duim\b)/gi, "14 "],
      [/\b(zestien|16)\s+(?=duimer|duims|duim\b)/gi, "16 "],
      [/\b(achttien|18)\s+(?=duimer|duims|duim\b)/gi, "18 "],
      [/\b(twintig|20)\s+(?=duimer|duims|duim\b)/gi, "20 "],
      [/\b(vierentwintig|24)\s+(?=duimer|duims|duim\b)/gi, "24 "],

      // 4. Stralingstijd / Belichtingstijd / Buistabel / KV-regel / Kwadratenwet / Lascompensatie
      [/\b(betalingstijd|vertalingstijd|herhalingstijd|belastingstijd|bestralingstijd|verlichtingstijd|verrichtingstijd|inrichtingstijd|oprichtingstijd|toelichtingstijd|verplichtingstijd|stichtingstijd|richtingstijd|dalingstijd|bepalingstijd|schietteid|schijt\s*tijd)\b/gi, "stralingstijd"],
      [/\b(hoe\s*lang|hoelang)\s+(?:moet|mag|kan|wil|zal|ga)\s+(?:ik|je|men|we)\s+(?:betalen|vertalen|herhalen|balen|halen|dwalen|malen|palen|gieten|genieten|verlichten|stichten|inrichten|oprichten|verrichten|verplichten)\b/gi, "hoe lang moet ik stralen"],
      [/\b(moet|wil|kan|ga)\s+ik\s+(?:betalen|vertalen|herhalen|balen|malen)\s+(?=met|bij|op|voor)\b/gi, "$1 ik stralen "],
      [/\b(kwadraten\s*wet|kwadraat\s*wet|omgekeerde\s*kwadratenwet|kadratenwet|kwadraat\s*met|kwadraten\s*met)\b/gi, "kwadratenwet"],
      [/\b(las\s*compensatie|los\s*compensatie|lascombinatie|las\s*combinatie)\b/gi, "lascompensatie"],
      [/\b(materiaal\s*factor|materiaal\s*vakter|materiaal\s*vak|stralings\s*factor)\b/gi, "materiaalfactor"],
      [/\b(buitenspel|kruistabel|thuistabel|huistabel|muistabel|ruistabel|luistabel|kluistabel|pijptabel|stroomtabel)\b/gi, "buistabel"],
      [/\b(miljardair|miljonair|militair|militaire|militairen|ministerie|materie|bacterie|calorie|galerie|batterij|familie|milli|mili)\s*(?:amp[eè]re|amber|amper|empire|vampier|papier|manier)?\s*(?:minut(?:en|ie)?|minuut)\b/gi, "milliampère-minuten"],
      [/\b(\d+(?:[.,]\d+)?)\s*(?:miljardair|miljonair|militair|militaire|milli|mili)\s*(?:amp[eè]re|amber|amper|empire|vampier|papier|manier)\b(?!\s*[-]?\s*min)/gi, "$1 mA"],
      [/\b(kever\s*regels?|kabel\s*regels?|kavel\s*regels?|koffie\s*regels?|keverregel|kabelregel|kavelregel|koffieregel)\b/gi, "KV-regel"],
      [/\b(bijspanning|huisspanning|kruisspanning|uitspanning|inspanning|ontspanning|verspanning|overspanning|buispanning|buis\s*paning|buis\s*spring|buis\s*panging)\b/gi, "buisspanning"],

      // 5. Afzetting / Collimator / Langsnaad / Rondnaad / Draadje / Ovaaltje / Opnames / Films / Lasfouten
      [/\b(bezetting|omzetting|inzetting|uitzetting|voortzetting|overzetting|bijzetting|ontzetting|verzetting)\b/gi, "afzetting"],
      [/\b(doosje\s*stempel|dosis\s*stempel|dosis\s*tempel)\b/gi, "dosistempo"],
      [/\b(micro\s*sievert|micro\s*cijfers?|micro\s*zever|micro\s*sever)\b/gi, "microsievert"],
      [/\b(loopplaat|bootplaat|noodplaat|roodplaat|grootplaat)\b/gi, "loodplaat"],
      [/\b(colimator|kollimator|kolimator|combinator|coördinator|coordinator|alligator|navigator|ventilator|generator|simulator|isolator|transformator|incubator)\b/gi, "collimator"],
      [/\bachter\s+(?:de|een)\s+(radiator|calculator|indicator)\b/gi, "achter de collimator"],
      [/\b(langsnaat|langstraat|landstraat|zandstraat|kantstraat|handstraat|brandstraat|strandstraat)\b/gi, "langsnaad"],
      [/\b(langzaam|langzaamaan|langsgaan|langslaan)\s+(?=van\s+\d+|verdelen|verdeel|verdeling|lengte|opnames)\b/gi, "langsnaad "],
      [/\b(verdeel|verdelen|verdeling)\s+(?:van\s+)?(?:een\s+|de\s+)?(langzaam|langzaamaan|langstraat)\b/gi, "$1 langsnaad"],
      [/\b(rondnaat|rondmaat|rondlaat|rondgaat|rondstaat|rondpraat|rondvaart|rondaan|hondnaad|hondnaat|mondnaad|bondnaad|grondnaad|bontnaad|zondnaad|frontnaad|kontnaad|rodenaad|rondenaad)\b/gi, "rondnaad"],
      [/\b(welk|welke)\s+(praatje|straatje|maatje|blaadje|zaadje|naadje|raadje|vaatje|kraantje|baantje|haantje|maantje|traantje|zwaantje|graantje)\b/gi, "$1 draadje"],
      [/\b(praatje|straatje|maatje|blaadje|zaadje|naadje|raadje|vaatje|kraantje|baantje)\s+(?=bki|nodig|moet|gebruiken|zien|op\s+de\s+film|voor\s+\d+|bij\s+\d+)/gi, "draadje "],
      [/\b(?:wee|dubbel\s*v|w)\s*[-]?\s*(1[0-9]|[1-9])\b/gi, "W$1"],
      [/\b(ophaaltje|of\s*haaltje|verhaaltje|taaltje|paaltje|zaaltje|baaltje|schaaltje|kwaaltje|straaltje|kanaaltje|signaaltje|metaaltje|garnaaltje|journaaltje)\b/gi, "ovaaltje"],
      [/\b(hoeveel|aantal)\s+(aannames?|afnames?|innames?|deelnames?|toenames?|overnames?|uitnames?)\b/gi, "$1 opnames"],
      [/\bhoeveel\s+(voorzet|inzet|opzet|afzet|omzet|uitzet|bijzet|ontzet|bezet|gezet)\b/gi, "hoeveel verzet"],
      [/\b(10|6)\s*(?:bij|maal|keer|x)\s*(24|40|48)\b/gi, "$1x$2"],
      [/\b((?:veel|velum|filmen)\s*type|film\s*tiepe|film\s*type)\b/gi, "filmtype"],
      [/\b(film\s*soort|veel\s*soort)\b/gi, "filmsoort"],
      [/\b(film\s*kwaliteit|veel\s*kwaliteit)\b/gi, "filmkwaliteit"],
      [/\b(las\s*fout|los\s*fout|last\s*fout)\b/gi, "lasfout"],
      [/\b(slak\s*insluitsel|slakken\s*insluitsel|slak\s*sluitsel)\b/gi, "slakinsluitsel"],
      [/\b(binding\s*fout|bindings\s*fout|binnenfout)\b/gi, "bindingsfout"],
      [/\b(rand\s*inkarteling|randen\s*karteling)\b/gi, "randinkarteling"],
      [/\b(wortel\s*doorzakking|wortel\s*zakking)\b/gi, "worteldoorzakking"],

      // BKI / IQI / Draadjes / Schedule / Structurix lookalikes
      [/\b(beke|beki|beekie|bekkie|bikkie|wiki|mickey|tikkie|b\s*k\s*ie|b\s*k\s*i)\b/gi, "BKI"],
      [/\b(i\s*q\s*i|iqi)\b/gi, "IQI"],
      [/\b(draatjes|traatjes)\b/gi, "draadjes"],
      [/\b(draatje|traatje)\b/gi, "draadje"],
      [/\b(beeld\s+kwaliteit)\b/gi, "beeldkwaliteit"],
      [/\b(schedel|schedul|skedule|skedul|shedul|schetsel)\b/gi, "schedule"],
      [/\b(structuriks|structurex|structuriek)\b/gi, "Structurix"],

      // 6. Technieken (DWSI / SWSI / DWDI) + volledig uitgesproken RT-afkortingen (NL & EN, excl. onbestaand 'enkel wand dubbel beeld')
      [/\b(de\s+wc|dw\s*zie|d\s*w\s*s\s*i|dwz\s*i|dw\s*si|dw-si|(?:double|dubbel|dobbel|dubble)\s*(?:wall|wol|wal|wand)\s*(?:single|singel)\s*(?:image|imige|iemets|imids)|dubbele\s+wand\s+enkel\s+beeld|dubbelwand(?:ig)?\s*(?:enkel|een)\s*(?:beeld|beelt)?|dubbel\s*(?:wand|want|wandt)\s*(?:enkel|een)\s*(?:beeld|beelt)|twee\s*wanden\s*enkel\s*beeld|d\s*w\s*e\s*b|dweb|d\.w\.e\.b\.)\b/gi, "DWSI"],
      [/\b((?:single|singel)\s*(?:wall|wol|wal)\s*(?:single|singel)\s*(?:image|imige|iemets|imids)|(?:single|singel)\s*(?:wall|wol|wal)(?!\s*(?:double|dubbel))|souci|sw\s*zie|s\s*w\s*s\s*i|s\s*w\s*c|sw\s*si|sw-si|enkele?\s*(?:wand|want|wandt)\s*(?:enkel|een)\s*(?:beeld|beelt)|enkeld?wand(?:ig)?\s*(?:enkel|een)\s*(?:beeld|beelt)?|enkele?\s*(?:wand|want)(?!\s*(?:dubbel|twee))|e\s*w\s*e\s*b|eweb|e\.w\.e\.b\.)\b/gi, "SWSI"],
      [/\b((?:double|dubbel|dobbel|dubble)\s*(?:wall|wol|wal|wand)\s*(?:double|dubbel|dobbel)\s*(?:image|imige|iemets|imids)|(?:double|dubbel|dobbel)\s*(?:wall|wol|wal)\s*(?:double|dubbel)|dw\s*die|d\s*w\s*d\s*i|dw\s*di|dw-di|dubbele\s+wand\s+dubbel\s+beeld|dubbel\s*(?:wand|want|wandt)\s*dubbel(?:\s*(?:beeld|beelt))?|dubbelwand(?:ig)?\s*dubbel(?:\s*(?:beeld|beelt))?|twee\s*wanden\s*dubbel\s*beeld|d\s*w\s*d\s*b|dwdb|d\.w\.d\.b\.)\b/gi, "DWDI"],
      [/\b(focus\s*(?:tot\s*|to\s*)?film\s*(?:afstand|distance)|film\s*(?:tot\s*|to\s*)?focus\s*(?:afstand|distance)|bron\s*(?:tot\s*|to\s*)?film\s*(?:afstand|distance)|source\s*(?:to\s*)?film\s*(?:distance|afstand))\b/gi, "FFD"],
      [/\b(object\s*(?:tot\s*|to\s*)?film\s*(?:afstand|distance)|voorwerp\s*(?:tot\s*)?film\s*(?:afstand|distance)|onderwerp\s*(?:tot\s*)?film\s*(?:afstand|distance)|las\s*(?:tot\s*)?film\s*(?:afstand|distance))\b/gi, "OFD"],
      [/\b(source\s*(?:to\s*)?object\s*(?:distance|afstand)|bron\s*(?:tot\s*)?object\s*(?:afstand|distance)|focus\s*(?:tot\s*)?object\s*(?:afstand|distance))\b/gi, "SOD"],
      [/\b(source\s*(?:to\s*)?detector\s*(?:distance|afstand)|bron\s*(?:tot\s*)?detector\s*(?:afstand|distance))\b/gi, "SDD"],
      [/\b(source\s*(?:to\s*)?film\s*factor|s\s*f\s*f)\b/gi, "SFF"],
      [/\b(image\s*quality\s*indicators?|beeld\s*kwaliteits?\s*indicators?)\b/gi, "IQI BKI"],
      [/\b(half\s*value\s*layer|halve\s*waarde\s*laag|halfwaarde\s*laag|halfwaarde\s*dikte|halverings\s*dikte)\b(?!\s*HVL)/gi, "halveringsdikte HVL"],
      [/(?<!halveringsdikte\s)\b(h\s*v\s*l|h\.v\.l\.|ha\s*vee\s*el)\b/gi, "halveringsdikte HVL"],
      [/\b(?:geometrische?\s*(?:on\s*scherpte|onscherpte)|chemische\s*onscherpte|geometric(?:al)?\s*unsharpness)\b(?!\s*Ug\b)/gi, "geometrische onscherpte Ug"],
      [/\b(niet[-\s]*destructief\s*onderzoek|n\s*d\s*o)\b/gi, "NDO"],
      [/\b(non[-\s]*destructive\s*testing|nondestructive\s*testing|n\s*d\s*t)\b/gi, "NDT"],
      [/\b(half\s*life)\b/gi, "halfwaardetijd"],
      [/\b(exposure\s*time)\b/gi, "stralingstijd"],
      [/\b(dose\s*rate)\b/gi, "dosistempo"],
      [/\b(optical\s*density|film\s*density)\b/gi, "zwarting"],
      [/\b(maximum\s*wall\s*thickness|w\s*max|wee\s*max|w-max)\b/gi, "Wmax"],
      [/\b(nominal\s*wall\s*thickness|wall\s*thickness)\b/gi, "wanddikte"],
      [/\b(outer\s*diameter|outside\s*diameter|nominal\s*pipe\s*size|n\s*p\s*s)\b/gi, "diameter"],
      [/\b((?:effective\s*)?focal\s*spot(?:\s*size)?|source\s*size|source\s*dimension)\b/gi, "brongrootte"],
      [/\b(stainless\s*steel)\b/gi, "RVS"],
      [/\b(carbon\s*steel)\b/gi, "staal"],
      [/\b(tungsten)\b/gi, "wolfraam"],
      [/\b(concrete)\b/gi, "beton"],
    ];

    for (const [pat, rep] of spraakCorrecties) {
      s = s.replace(pat, rep);
    }

    s = herstelTriggerWoordenInTekst(s, false);

    return s.replace(/\s+/g, " ").trim();
  }

  function herstelTriggerWoordenInTekst(tekst, vervangIsotopenNaarCode = false) {
    if (!tekst || typeof tekst !== "string") return "";
    let t = herstelSamengesteldGetalEnEenheid(tekst);

    // 4A. Bigram-Samenvoeger (gesplitste of licht verbasterde samenstellingen tegen NDO_COMPOUND_TRIGGERS)
    const gramWoordenStop = new Set([
      "de", "het", "een", "van", "op", "in", "bij", "met", "voor", "naar", "aan", "om", "uit", "door", "over",
      "als", "dan", "of", "en", "is", "zijn", "was", "kan", "mag", "moet", "wil", "zal", "zou", "hoe", "wat",
      "welk", "welke", "waar", "wanneer", "wie", "mijn", "jouw", "onze", "dit", "dat", "deze", "die", "veel",
      "hoeveel", "kleine", "grote", "nieuwe", "oude", "wordt", "heeft", "heb", "ik", "je", "we", "men"
    ]);
    const stopExactPrefix = new Set(["ons", "door", "op", "af", "over"]);
    const beschermdeEenheden = new Set([
      "mm", "cm", "dm", "kv", "ma", "ci", "msv", "usv", "ug",
      "ffd", "sfd", "ofa", "ofd", "sod", "sdd", "sff", "hvl",
      "bki", "iqi", "dwsi", "swsi", "dwdi", "dwbi", "eweb", "dweb", "dwdb",
      "ndo", "ndt", "wmax", "sch", "schedule", "std", "xs", "xxs",
      "smart", "balteau", "yxlon", "ceram", "agfa", "klasse", "opstelling", "set"
    ]);
    const tokens = t.split(/\s+/).filter(Boolean);
    const mergedTokens = [];
    for (let idx = 0; idx < tokens.length; idx++) {
      const w1 = tokens[idx];
      const w2 = tokens[idx + 1];
      if (w2 && !/[).,!?;:]$/.test(w1) && !/^[(\[]/.test(w2)) {
        const c1 = w1.replace(/[^a-z]/gi, "").toLowerCase();
        const c2 = w2.replace(/[^a-z]/gi, "").toLowerCase();
        const allowBigram =
          c1.length >= 2 &&
          c2.length >= 3 &&
          !/\d/.test(w1) &&
          !/\d/.test(w2) &&
          !beschermdeEenheden.has(c1) &&
          !beschermdeEenheden.has(c2) &&
          (!gramWoordenStop.has(c1) || stopExactPrefix.has(c1)) &&
          !gramWoordenStop.has(c2) &&
          c1.length <= 10 &&
          c2.length <= 12;
        if (allowBigram) {
          const combo = c1 + c2;
          if (NDO_COMPOUND_TRIGGERS.includes(combo)) {
            mergedTokens.push(SYNTHETISCHE_SAMENSTELLINGEN_MAP[combo] || combo);
            idx++;
            continue;
          }
          if (!gramWoordenStop.has(c1) || c1 === "ons") {
            const comboRes = besteTriggerMatch(combo, NDO_COMPOUND_TRIGGERS, 54);
            if (comboRes && (c1 !== "ons" || comboRes.match === "onstream")) {
              mergedTokens.push(SYNTHETISCHE_SAMENSTELLINGEN_MAP[comboRes.match] || comboRes.match);
              idx++;
              continue;
            }
          }
        }
      }
      mergedTokens.push(w1);
    }
    t = mergedTokens.join(" ");

    // 4B. Best-Match Enkelwoord Fuzzy / Rijm / Fonetisch / Medeklinkerskelet Engine
    t = t.split(/\s+/).map((w) => {
      const m = w.match(/^([("'«]*)(.*?)([)"'».,!?;:]*)$/);
      const lead = m ? m[1] : "";
      const core = m ? m[2] : w;
      const trail = m ? m[3] : "";
      const s = core.replace(/[^a-z]/gi, "").toLowerCase();
      if (SYNTHETISCHE_SAMENSTELLINGEN_MAP[s] && !/\d/.test(core)) {
        return `${lead}${SYNTHETISCHE_SAMENSTELLINGEN_MAP[s]}${trail}`;
      }
      if (/\d/.test(core) || s.length < 5 || NORMALE_NL_STOPWOORDEN.has(s) || NDO_TRIGGERS_SET.has(s)) return w;
      const res = besteTriggerMatch(s, NDO_ENKELWOORD_TRIGGERS, 45);
      if (!res) return w;
      if (SYNTHETISCHE_SAMENSTELLINGEN_MAP[res.match]) {
        return `${lead}${SYNTHETISCHE_SAMENSTELLINGEN_MAP[res.match]}${trail}`;
      }
      if (vervangIsotopenNaarCode) {
        if (res.match === "iridium") return `${lead}Ir-192${trail}`;
        if (res.match === "selenium") return `${lead}Se-75${trail}`;
        if (res.match === "kobalt") return `${lead}Co-60${trail}`;
      }
      return `${lead}${res.match}${trail}`;
    }).join(" ");

    return t;
  }


  // --- Fonetische Vaktaal-Hersteller ---
  function herstelVakjargon(ruweTekst) {
    if (!ruweTekst || typeof ruweTekst !== "string") return "";
    let t = corrigeerSpraakTekst(ruweTekst).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

    // 1. Cijfers voluit in letters & komma's
    t = t.replace(/(\d+)\s*komma\s*(\d+)/gi, "$1.$2");
    t = t.replace(/(\d+)\s*punt\s*(\d+)/gi, "$1.$2");
    t = t.replace(/\bkomma\s*(\d+)\b/gi, ".$1");
    t = t.replace(/\bkomma\b/gi, ".");
    t = t.replace(/\bkwart\b/gi, "0.25");
    t = t.replace(/\bhalf\b/gi, "0.5");
    t = t.replace(/\banderhalf\b/gi, "1.5");
    t = t.replace(/\btwee\s+en\s+een\s+half\b/gi, "2.5");
    t = t.replace(/\bdrie\s+en\s+een\s+half\b/gi, "3.5");

    // Samengestelde Nederlandse getallen (bijv. vijfentwintig -> 25, tweeëntwintig -> 22)
    const eenheden = {
      een: 1, twee: 2, drie: 3, vier: 4, vijf: 5,
      zes: 6, zeven: 7, acht: 8, negen: 9,
    };
    const tientallen = {
      twintig: 20, dertig: 30, veertig: 40, vijftig: 50,
      zestig: 60, zeventig: 70, tachtig: 80, negentig: 90,
    };
    for (const [eNaam, eVal] of Object.entries(eenheden)) {
      for (const [tNaam, tVal] of Object.entries(tientallen)) {
        t = t.replace(new RegExp(`\\b${eNaam}en${tNaam}\\b|\\b${eNaam}ën${tNaam}\\b`, "gi"), String(tVal + eVal));
      }
    }

    const getallenWoorden = {
      nul: 0, een: 1, twee: 2, drie: 3, vier: 4, vijf: 5, zes: 6, zeven: 7, acht: 8, negen: 9,
      tien: 10, elf: 11, twaalf: 12, dertien: 13, veertien: 14, vijftien: 15, zestien: 16,
      zeventien: 17, achttien: 18, negentien: 19, twintig: 20, dertig: 30, veertig: 40,
      vijftig: 50, zestig: 60, zeventig: 70, tachtig: 80, negentig: 90, honderd: 100, duizend: 1000,
    };

    for (const [w, n] of Object.entries(getallenWoorden)) {
      if (w === "een") {
        t = t.replace(/(?:(diameter|wanddikte|dikte|lasbreedte|opnames|ffd|sfd)\s+)een\b/gi, "$1 1");
        t = t.replace(/\b(?:een|één)(?=\s+(?:duims|duimer|duim|inch|mm|cm|meter|komma|\.)\b)/gi, "1");
        t = t.replace(/\b(?:om|op)\s+een\s+(?=duims|duimer|duim)/gi, "op 1 ");
      } else {
        t = t.replace(new RegExp(`\\b${w}\\b`, "gi"), String(n));
      }
    }

    // Voorkom spaties rondom punten in kommagetallen zoals "45 .8" of "6 . 5" -> "45.8"
    t = t.replace(/(\d+)\s*\.\s*(\d+)/g, "$1.$2");

    // 2. Fonetische transformaties
    const fonetisch = [
      // Naden
      [/\b(rond\s*na\s*het|rond\s*na\s*dat|rond\s*na\s*de|rond\s*na|rond\s*naad|rond\s*naat|rondnaat|rond\s*maat|rondmaat|rond\s*nat|rondnat|rond\s*net|rondnet|rond\s*naar|rondnaar|rond\s*naden|rondnaden|hond\s*naad|hond\s*naat|hondnaad|hondnaat|hond\s*na\s*het|hond\s*na|mond\s*naad|mondnaad|pond\s*naad|pondnaad|front\s*naad|frontnaad|kont\s*naad|kontnaad|rond\s*haad|rondhaad|rond\s*bad|rondbad|rond\s*pad|rondpad|rond\s*laat|rondlaat|rode\s*naad|ronde\s*naad|omtrek\s*naad|omtreknaad|cw|c\.w\.)\b/gi, "rondnaad"],
      [/\b(langs\s*na\s*het|langs\s*na\s*dat|langs\s*na\s*de|langs\s*na|langs\s*naad|langs\s*naat|langsnaat|langs\s*naar|langs\s*maat|langsmaat|langsnaden|lw|l\.w\.)\b/gi, "langsnaad"],
      [/\b(las\s*na\s*het|las\s*na\s*dat|las\s*na\s*de|las\s*naad|las\s*naat|lasnaat|las\s*maat|lasmaat|las\s*naam|lasnaam)\b/gi, "lasnaad"],
      // Diktes
      [/\b(door\s*straalde\s*dikte|door\s*straal\s*dikte|doorstraal\s*dikte|doorstraaldikte|doorstaande\s*dikte|door\s*staande\s*dikte|doorslaande\s*dikte|door\s*slaande\s*dikte|doorspraak\s*dikte|doorslag\s*dikte|doorgaande\s*dikte|doorstralings?\s*dikte|doorgestraalde\s*dikte|door\s*schijnende\s*dikte|totale\s*doorstraalde\s*dikte)\b/gi, "doorstraalde dikte"],
      [/\b(las\s*over\s*dikte|lasoverdikte|los\s*over\s*dikte|lasoverdekking|las\s*overdekking|overhoogte|over\s*hoogte|las\s*overdikte|las\s*overhoogte)\b/gi, "lasoverdikte"],
      [/\b(want\s*dikte|van\s*dikte|vandikte|wand\s*dikte|wamdikte|waterdikte|wat\s*dikte|wanddikten|handdikte|banddikte|zanddikte|randdikte|wanten\s*dikte|wante\s*dikte|wang\s*dikte|wangdikte|wan\s*dikte|warmte\s*dikte|wandsdikte|wand\s*dicht|want\s*dicht|wandicht|wanticht)\b/gi, "wanddikte"],
      [/\b(dia\s*meter|die\s*ja\s*meter|dieja\s*meter|dia\s*meeter|diameters|diamater)\b/gi, "diameter"],
      [/\b(las\s*breedte|last\s*breedte|los\s*breedte|lasbreete|las\s*breed|las\s*meet|lasbreedten)\b/gi, "lasbreedte"],
      // FFD / Afstanden (NL & EN volledig uitgesproken)
      [/\b(focus\s*afstand|fokkers\s*afstand|fokker\s*afstand|foto\s*afstand|vogels\s*afstand|vogel\s*afstand|focusafstand|fokus|fokusafstand|film\s*(?:tot\s*)?focus\s*(?:afstand|distance)|focus\s*(?:tot\s*|to\s*)?film\s*(?:afstand|distance)|film\s*focusafstand|bron\s*(?:tot\s*)?film\s*(?:afstand|distance)|source\s*(?:to\s*)?film\s*(?:distance|afstand))\b/gi, "FFD"],
      [/\b(effe\s+de|effe\s+dee|ef\s*ef\s*de|ef\s*ef\s*dee|ef\s*dee|f\s*f\s*d|effd|ff\s*d|f\s*f\s*t|f\s*v\s*d|fvd)\b/gi, "FFD"],
      [/\b(s\s*f\s*d|sf\s*d|es\s*ef\s*dee|es\s*ef\s*de|s\s*v\s*d|svd)\b/gi, "SFD"],
      [/\b(o\s*f\s*a|oo\s*ef\s*aa|o\s*v\s*a)\b/gi, "OFA"],
      // Focus & Filmtype Calculator / Kwadratenwet
      [/\b(focus\s*verandering|focusverandering|ffd\s*verandering|focus\s*wissel)\b/gi, "focusverandering"],
      [/\b(kwadraten\s*wet|kwadraat\s*wet|omgekeerde\s*kwadratenwet)\b/gi, "kwadratenwet"],
      [/\b(ci\s*wissel|curie\s*wissel|curies\s*wissel)\b/gi, "Ci wissel"],
      [/\b(?:mill?i[-\s]?(?:amp[eè]re|amp)|mamp|ma)\s*(?:[\*x\s]|per\s+)?(?:minuuten|minuten|minuut|min\b)\b/gi, "mA*min"],
      [/\bmA\*min(?:gebruik(?:en)?)\b/gi, "mA gebruiken"],
      [/\b(\d+(?:[.,]\d+)?)\s*(?:mill?i[-\s]?(?:amp[eè]re|amp))\b/gi, "$1 mA"],
      [/\b(?:mill?i[-\s]?(?:amp[eè]re|amp))\s*(\d+(?:[.,]\d+)?)\b/gi, "$1 mA"],
      [/\bmill?i[-\s]?(?:amp[eè]re|amp)\b/gi, "mA"],
      [/\b(buistabel|buistabellen|buis\s*tabel|buis\s*tabellen)\b/gi, "buistabel"],
      [/\b(materiaal\s*factor|materiaalfactor)\b/gi, "materiaalfactor"],
      // BKI / Draadjes
      [/\b(beke|beki|beekie|bekkie|bikkie|wiki|mickey|tikkie|b\s*k\s*ie|b\s*k\s*i)\b/gi, "BKI"],
      [/\b(i\s*q\s*i|iqi)\b/gi, "IQI"],
      [/\b(draatjes)\b/gi, "draadjes"],
      [/\b(draatje)\b/gi, "draadje"],
      [/\b(beeld\s+kwaliteit)\b/gi, "beeldkwaliteit"],
      // Brongrootte / Bronafmeting / Bronkeuze
      [/\b(bron\s*afmeting|bronafmeting|focus\s*afmeting|focusafmeting|brongrote|bron\s*grootte|brandvlek\s*grootte|brandvlekgrootte|brandvlek)\b/gi, "brongrootte"],
      [/\b(bronkhuyzen|bronkhuizen|bronkhuis|bronhuizen|bronhuis|bronkruis|bronbuis|bron\s*kruis|bron\s*buis|bron\s*keuzes?|bronkeuzes|bronkeuzen|bron\s*cursus|bron\s*keuring)\b/gi, "bronkeuze"],
      // (DWSI / SWSI / DWDI volledig uitgesproken varianten zijn al in corrigeerSpraakTekst genormaliseerd)
      [/\b(panoramisch|panoramische|panoraam|panoramis|panorama|in\s+het\s+midden|in\s+het\s+centrum)\b/gi, "centraal"],
      [/\b(ex\s*centrisch|ekscentrisch|accentrisch|excentriek|excentrische)\b/gi, "excentrisch"],
      // Onstream termen & Procedures (RT21021 / RT21022)
      [/\b(rt\s*21021|rt\s*21\s*0\s*21|rt\s*21-02-1|rt\s*2102-1|rt\s*21-021|procedure\s*21021|procedure\s*21\s*0\s*21|rt-21021)\b/gi, "RT21021"],
      [/\b(rt\s*21022|rt\s*21\s*0\s*22|rt\s*21-02-2|rt\s*2102-2|rt\s*21-022|procedure\s*21022|procedure\s*21\s*0\s*22|rt-21022)\b/gi, "RT21022"],
      [/\b(on\s*stream|onstream|onstreamer|on\s*streamer|(?:een|1|in|om|aan)\s*stream(?:er)?|instream|omstream|onder\s*bedrijf|warme\s*leiding|geisoleerde\s*leiding|profiel\s*opname)\b/gi, "onstream"],
      [/\b(tangentiaal|tangensiaal|tangensieël|tangentieel)\b/gi, "tangentiaal"],
      [/\b(isolatie\s*dikte|isolatie|isolatielaag)\b/gi, "isolatiedikte"],
      [/\b(klasse\s*tb|klasse\s*thee\s*bee|klasse\s*tee\s*bee|thee\s*bee|tee\s*bee)\b/gi, "klasse TB"],
      [/\b(klasse\s*ta|klasse\s*thee\s*aa|klasse\s*tee\s*aa|thee\s*aa|tee\s*aa)\b/gi, "klasse TA"],
      // Gevulde leiding / Medium / Staalequivalent
      [/\b(gefulde|gefuldt|gefuld|gevuldt)\b/gi, "gevuld"],
      [/\b(volle\s*leiding|volle\s*buis|gevulde\s*leiding|gevulde\s*buis|gevulde\s*pijp)\b/gi, "gevulde leiding"],
      [/\b(staal\s*equivalent|staalequivalent|staal\s*equivalentie|staalequivalentie|staal\s*equivelant|staal\s*vergelijking|staal\s*waarde|staalwaarde|staal\s*dikte\s*equivalent|equivalent\s*staal)\b/gi, "staalequivalent"],
      // Afzetting / Veiligheid
      [/\b(afzetting|afzettings\s*afstand|afzettingsafstand|afzettings\s*zone|gecontroleerde\s*zone|afzet\s*zone|veilige\s*afstand|veiligheids\s*afstand)\b/gi, "afzetting"],
      [/\b(dosis\s*tempo|dosistempo)\b/gi, "dosistempo"],
      // Procedures
      [/\b(as\s*me|as\s*mee|als\s*me|als\s*mee|als\s*mij|as\s*mij|asmi|azmi|esmee|esme|esmé|es\s*mee|esmy|esmi|hasmi|isme|astma|asma|acme|a\s*s\s*m\s*e|aas\s*mee|aasmee|aas\s*me|aasme)\b/gi, "ASME"],
      [/\b(en\s*klasse\s*b|en\s*klasse\s*bee|en\s*klasse\s*bea|en\s*klasse\s*be|en\s*b|en-b|klasse\s*b|klasse\s*bee|klasse\s*bea|klas\s*b|klas\s*bee|kassen\s*b|glazen\s*b|tassen\s*b|lassen\s*b|e\s*n\s*b|e\s+en\s+b|een\s+b|1\s*b|n\s+b|n\.b\.)\b/gi, "EN-B"],
      [/\b(en\s*klasse\s*a|en\s*klasse\s*aa|en\s*klasse\s*aah|en\s*a|en-a|klasse\s*a|klasse\s*aa|klas\s*a|klas\s*aa|kassen\s*a|glazen\s*a|tassen\s*a|lassen\s*a|e\s*n\s*a|e\s+en\s+a|een\s+a|1\s*a|n\s+a|n\.a\.)\b/gi, "EN-A"],
      [/\b(sabik|zaabik|saabik|sabit|sabine|sabic)\b/gi, "Sabic"],
      [/\b(sitek|sietech|sietek|zietech|scitech|ci[\s-]*tech|sitech)\b/gi, "Sitech"],
      [/\b(hafmans|hofmans|hofman|hafman|afmans|haffmans)\b/gi, "Haffmans"],
      // Bronnen & Isotoop
      [/\b(selenium\s*75|se\s*75|se75|se-75|c\s*75|c75|zeleen|seleniun|celien|celine|seline|selene|salenium|sylenium|zee\s*75|ze\s*75|see\s*75|ce\s*75|seth\s*75|serum\s*75|seleen\s*75|seleen)\b/gi, "Se-75"],
      [/\b(iridium\s*192|ir\s*192|ir192|ir-192|ier\s*192|hier\s*192|er\s*192|eer\s*192|ijzer\s*192|erik\s*192|uur\s*192|uridium\s*192|uridium|ieridium\s*192|ieridium|eridium\s*192|eridium|iridium|iridjum)\b/gi, "Ir-192"],
      [/\b(kobalt|cobalt|co\s*60|co60|co-60|koolstof\s*60|koopman\s*60|ko\s*60|koba\s*60|kobal\s*60)\b/gi, "Co-60"],
      [/\b(35598\s*p|35598\s*pee)\b/gi, "35598P"],
      [/\b(35041\s*p|35041\s*pee)\b/gi, "35041P"],
      [/\b(97969\s*m|97969\s*em)\b/gi, "97969M"],
      [/\b(rr\s*3508|er\s*er\s*3508|r\s*r\s*3508)\b/gi, "RR3508"],
      [/\b(rr\s*4083|er\s*er\s*4083|r\s*r\s*4083)\b/gi, "RR4083"],
      [/\b(rr\s*3999|er\s*er\s*3999|r\s*r\s*3999)\b/gi, "RR3999"],
      [/\b(gamma\s*bron|radioactieve\s*bron|radioactief\s*isotoop)\b/gi, "gamma bron"],
      [/\b(rontgenbuis|röntgenbuis|roentgenbuis|rontjenbuis|rondgenbuis|runtgenbuis|x[-\s]?ray\s*buis|xray\s*buis)\b/gi, "X-ray buis"],
      [/\b(rontgen|röntgen|roentgen|rontjen|ronchen|rondgen|runtgen|x\s*ray|x-ray|x\s*ree|xree|ik\s*sree|iksree)\b/gi, "X-ray"],
      // Buisspanning / kV fonetische spraakcorrecties (Cafe, café, kafe, kave, kavé, cave, k v, k.v., kilo volt, keverregel)
      [/\b(kever\s*regels?|kabel\s*regels?|keverregel|kabelregel|k\s*v\s*regel|kv\s*regel)\b/gi, "KV-regel"],
      [/\b(cafe|café|kafe|kaffie|kave|kavé|cave|kadee|kaffee|caffee|caffé|kavee|ka\s*vee|kvee|k\s*v|k\.v\.|k-v|kilo\s*volt|kilovolt|kilo\s*volts|kilo\s*vault|kilovault|kilo\s*valt|kilovalt|kilo\s*watt|kilowatt|kilo\s*veld|kiloveld)\b/gi, "kV"],
      [/\b(buis\s*spanning|buispanning|buis\s*paning|buis\s*spring|buis\s*panging|buis\s*stroom)\b/gi, "buisspanning"],
      // Curie & Activiteit
      [/\b(kirie|kiere|kiri|kierie|kuur|kuri|kuries|curies|cuypers|kuipers|kurie|kurië|curië|kuriën|kurius|curius|quri|qurie|kyrie|curi|curri|keuri|kewrie)\b/gi, "Curie"],
      [/\b(c\s*i|c\.i\.|see\s*ie|zee\s*ie|cee\s*ie)\b/gi, "Ci"],
      [/\b(\d+(?:[.,]\d+)?)\s*(?:juli|julie|jury|joelie)\s+(?=se[-\s]?75|selenium|seleen|ir[-\s]?192|iridium|co[-\s]?60|bron|isotoop)/gi, "$1 Curie "],
      [/\b(?:juli|julie|jury|joelie)\s+(?=se[-\s]?75|selenium|seleen|ir[-\s]?192|iridium|co[-\s]?60|bron|isotoop)/gi, "Curie "],
      [/\b(\d+(?:[.,]\d+)?)\s*(?:juli|julie|jury|joelie)\b(?!\s*20\d\d)/gi, "$1 Curie"],
      [/\b(activiteid|aktieviteit|activitijd|bronsterkte|bron\s*sterkte)\b/gi, "activiteit"],
      // Röntgenbuizen & Merken fonetisch
      [/\b(yxlon\s*smart(?:\s*evo)?|smart\s*evo|evo\s*300|smart\s*1\s*mm)\b(?!\s*\()/gi, "Smart EVO (1 mm)"],
      [/\b(yxlon\s*300|ikslon\s*300|ypsilon\s*300|smart\s*3\s*mm)\b(?!\s*\()/gi, "Yxlon 300 (3 mm)"],
      [/\b(ikslon|ixlon|x[\s-]*lon|xlon|epsilon|ypsilon|ijssel|ijslon|eikslon|ykslon|iks\s*lon|yks\s*lon|yxlon)\b(?!\s*300\b|\s*\()/gi, "Yxlon 300 (3 mm)"],
      [/\b((?:balteau|balto|baltoo|ball\s*toe|bal\s*toe|ball?\s*to|baltoe|baltho|baltau|bauto|bal\s*touw|baltouw)\s*)?(?:ceram|seram|keram|ceran)\s*35\s*p(?:\s*\(?rond\s*straler\)?)?\b(?!\s*\(rondstraler,\s*4\s*mm\))/gi, "Balteau Ceram35P (rondstraler, 4 mm)"],
      [/\b((?:balteau|balto|baltoo|ball\s*toe|bal\s*toe|ball?\s*to|baltoe|baltho|baltau|bauto|bal\s*touw|baltouw)\s*(?:rond\s*straler|panoramisch)|rond\s*straler|rondstralen)\b/gi, "Balteau Rondstraler (5 mm)"],
      [/\b((?:balteau|balto|baltoo|ball\s*toe|bal\s*toe|ball?\s*to|baltoe|baltho|baltau|bauto|bal\s*touw|baltouw)\s*(?:ceram(?!\s*35\s*p)|seram(?!\s*35\s*p)|keram(?!\s*35\s*p)|ceran(?!\s*35\s*p)|directional)|(?:ceram|seram|keram|ceran)\s*300)\b/gi, "Balteau Ceram (2.5 mm)"],
      [/\b(balteau|balto|baltoo|ball\s*toe|bal\s*toe|ball?\s*to|baltoe|baltho|baltau|bal\s*touw|baltouw|bauto)\b(?!\s*\(|\s*rond\s*straler|\s*ceram|\s*seram)/gi, "Balteau (2.5 mm)"],
      // Begrippen
      [/\b(straling\s*tijd|stralings\s*tijd|belichting\s*tijd|belichtings\s*tijd|betalingstijd|vertalingstijd|herhalingstijd|belastingstijd|bestralingstijd|belichtingstijd|schiettijd|schiet\s*tijd|schietteid)\b/gi, "stralingstijd"],
      [/\b(bron\s*verval|vervaltijd|verval\s*tijd)\b/gi, "bronverval"],
      [/\b(halfwaarde\s*tijd|halverings\s*tijd)\b/gi, "halfwaardetijd"],
      [/\b(schuifje|schuifkaart|schuif\s*kaart|rekenliniaal|reken\s*liniaal|nomogram)\b/gi, "schuifje"],
      [/\b(voorzet|verzetten|ontzet|verzetje|verzetjes)\b/gi, "verzet"],
      [/\b(ovaal|ovaaltje|ovaal\s*tje|of\s*haaltje|op\s*haaltje)\b/gi, "ovaaltje"],
      [/\b(optische\s+dichtheid|opties\s+dichtheid|optische\s+dikheid|optische\s+dikte|filmzwarting)\b/gi, "zwarting"],
      [/\b(bron\s*zijde|bron\s*kant|source\s*side|sourceside)\b/gi, "bronzijde"],
      [/\b(film\s*zijde|film\s*kant|film\s*side|filmside)\b/gi, "filmzijde"],
      [/\b(es\s+en\s+er|s\s+n\s+r|s\.n\.r\.?)\b/gi, "SNR"],
      // BKI, IQI, Opstelling-afkortingen en Draadjes fonetisch
      [/\b(b\s*k\s*i|bee\s*kaa\s*ie|beekaaie|bekaie|b\.k\.i\.|beka\s*ie|bkaie|bekai)\b/gi, "BKI"],
      [/\b(i\s*q\s*i|ie\s*kju\s*ie|iekjuie|iki|i\.q\.i\.)\b/gi, "IQI"],
      [/\b(d\s*w\s*s\s*i|d\.w\.s\.i\.|dee\s*wee\s*es\s*ie)\b/gi, "DWSI"],
      [/\b(d\s*w\s*d\s*i|d\.w\.d\.i\.|dee\s*wee\s*dee\s*ie)\b/gi, "DWDI"],
      [/\b(d\s*w\s*b\s*i|d\.w\.b\.i\.|dee\s*wee\s*bee\s*ie)\b/gi, "DWBI"],
      [/\b(s\s*w\s*s\s*i|s\.w\.s\.i\.|es\s*wee\s*es\s*ie)\b/gi, "SWSI"],
      [/\b(e\s*w\s*e\s*b|e\.w\.e\.b\.)\b/gi, "EWEB"],
      [/\b(d\s*w\s*e\s*b|d\.w\.e\.b\.)\b/gi, "DWEB"],
      [/\b(d\s*w\s*d\s*b|d\.w\.d\.b\.)\b/gi, "DWDB"],
      [/\b(u\s*g|u\.g\.)\b/gi, "Ug"],
      [/\b(draatjes|draaitjes|draatje|draaitje)\b/gi, "draadjes"],
      // Agfa Structurix & Filmklassen C1 t/m C6
      [/\b(akfa|achfa|agfa\s*film|struktuurix|structuriks|struchturix)\b/gi, "Agfa Structurix"],
      [/\b(c\s*1|cee\s*1|see\s*1|zee\s*1|c\s*een|cee\s*een|c-1)\b/gi, "C1"],
      [/\b(c\s*2|cee\s*2|see\s*2|zee\s*2|c\s*twee|cee\s*twee|c-2)\b/gi, "C2"],
      [/\b(c\s*3|cee\s*3|see\s*3|zee\s*3|c\s*drie|cee\s*drie|c-3)\b/gi, "C3"],
      [/\b(c\s*4|cee\s*4|see\s*4|zee\s*4|c\s*vier|cee\s*vier|c-4)\b/gi, "C4"],
      [/\b(c\s*5|cee\s*5|see\s*5|zee\s*5|c\s*vijf|cee\s*vijf|c-5)\b/gi, "C5"],
      [/\b(c\s*6|cee\s*6|see\s*6|zee\s*6|c\s*zes|cee\s*zes|c-6)\b/gi, "C6"],
      // FFD / SFD / OFA / OFD / SDD / SFF
      [/\b(ef\s*ef\s*dee|f\s*f\s*d|f\.f\.d\.|f-f-d|ff\s*dee|effeffdee)\b/gi, "FFD"],
      [/\b(es\s*ef\s*dee|s\s*f\s*d|s\.f\.d\.|s-f-d|sf\s*dee|esseffdee)\b/gi, "SFD"],
      [/\b(es\s*ef\s*ef|s\s*f\s*f|s\.f\.f\.|s-f-f)\b/gi, "SFF"],
      [/\b(es\s*dee\s*dee|s\s*d\s*d|s\.d\.d\.|s-d-d)\b/gi, "SDD"],
      [/\b(o\s*ef\s*dee|o\s*f\s*d|o\.f\.d\.|o-f-d)\b/gi, "OFD"],
      [/\b(o\s*ef\s*a|o\s*f\s*a|o\.f\.a\.|o-f-a)\b/gi, "OFA"],
      // Schedules
      [/\b(schetsjoel|schetjoel|skejoel|sketsjoel|sjedjoel|shedoel|skedjoel|skedule|schedul|shedoel|skedoel|skedool|scheduel)\b/gi, "schedule"],
      // Filmtypen & D-nummers
      [/\b(d\s*4|dee\s*vier|dee\s*4|d\s*vier|de\s*vier|de\s*4|d-4|b\s*4|t\s*4|t-4|tee\s*4|thee\s*4|t\s*vier|dier)\b/gi, "D4"],
      [/\b(d\s*5|dee\s*vijf|dee\s*5|d\s*vijf|de\s*vijf|de\s*5|d-5|b\s*5|t\s*5|t-5|tee\s*5|thee\s*5|t\s*vijf)\b/gi, "D5"],
      [/\b(d\s*7|dee\s*zeven|dee\s*7|d\s*zeven|de\s*zeven|de\s*7|d-7|b\s*7|t\s*7|t-7|tee\s*7|thee\s*7|t\s*zeven)\b/gi, "D7"],
      [/\b(d\s*2|dee\s*twee|dee\s*2|d\s*twee|de\s*2|d-2|b\s*2|t\s*2|t-2|tee\s*2|thee\s*2|t\s*twee)\b/gi, "D2"],
      [/\b(d\s*3|dee\s*drie|dee\s*3|d\s*drie|de\s*3|d-3|b\s*3|t\s*3|t-3|tee\s*3|thee\s*3|t\s*drie)\b/gi, "D3"],
      [/\b(d\s*8|dee\s*acht|dee\s*8|d\s*acht|de\s*8|d-8|b\s*8|t\s*8|t-8|tee\s*8|thee\s*8|t\s*acht)\b/gi, "D8"],
      [/\b(film\s*type|film\s*klasse|film\s*soort|film\s*kwaliteit)\b/gi, "filmkwaliteit"],
      // Lasfouten
      [/\b(undercut|rand\s*inkarteling|inkarteling)\b/gi, "randinkarteling"],
      [/\b(slak\s*insluitsel|slakinsluitsel)\b/gi, "slakinsluitsel"],
      [/\b(worm\s*gat|wormgat|gaskanaal)\b/gi, "wormgat"],
      [/\b(porie|porien|porositeit)\b/gi, "porositeit"],
      // Duimse maten & timer/tuin/dimmer spraakcorrecties
      [/\b(half|0\.5|1\/2|halve)\s*(?:timer|timers|duimse|duimer|duimers|duim|duimen|tuin|tuinen|dimmer|dimmers|dimme|dimma|duin|duinen|duivel|duvel|duvels|duwer|duwers)\b/gi, "0.5 duimer"],
      [/\b(driekwart|0\.75|3\/4)\s*(?:timer|timers|duimse|duimer|duimers|duim|duimen|tuin|tuinen|dimmer|dimmers|dimme|dimma|duin|duinen|duivel|duvel|duvels|duwer|duwers)\b/gi, "0.75 duimer"],
      [/\b(eerste|1ste|1e|een|1)\s*(?:timer|timers|duimse|duimer|duimers|duim|duimen|tuin|tuinen|dimmer|dimmers|dimme|dimma|duin|duinen|duivel|duvel|duvels|duwer|duwers)\b/gi, "1 duimer"],
      [/\b(anderhalf|1\.5|1\s*1\/2)\s*(?:timer|timers|duimse|duimer|duimers|duim|duimen|tuin|tuinen|dimmer|dimmers|dimme|dimma|duin|duinen|duivel|duvel|duvels|duwer|duwers)\b/gi, "1.5 duimer"],
      [/\b(tweede|2de|2e|twee|2)\s*(?:timer|timers|duimse|duimer|duimers|duim|duimen|tuin|tuinen|dimmer|dimmers|dimme|dimma|duin|duinen|duivel|duvel|duvels|duwer|duwers)\b/gi, "2 duimer"],
      [/\b(twee\s*en\s*een\s*half|2\.5|2\s*1\/2)\s*(?:timer|timers|duimse|duimer|duimers|duim|duimen|tuin|tuinen|dimmer|dimmers|dimme|dimma|duin|duinen|duivel|duvel|duvels|duwer|duwers)\b/gi, "2.5 duimer"],
      [/\b(derde|3de|3e|drie|3)\s*(?:timer|timers|duimse|duimer|duimers|duim|duimen|tuin|tuinen|dimmer|dimmers|dimme|dimma|duin|duinen|duivel|duvel|duvels|duwer|duwers)\b/gi, "3 duimer"],
      [/\b(drie\s*en\s*een\s*half|3\.5|3\s*1\/2)\s*(?:timer|timers|duimse|duimer|duimers|duim|duimen|tuin|tuinen|dimmer|dimmers|dimme|dimma|duin|duinen|duivel|duvel|duvels|duwer|duwers)\b/gi, "3.5 duimer"],
      [/\b(vierde|4de|4e|vier|4)\s*(?:timer|timers|duimse|duimer|duimers|duim|duimen|tuin|tuinen|dimmer|dimmers|dimme|dimma|duin|duinen|duivel|duvel|duvels|duwer|duwers)\b/gi, "4 duimer"],
      [/\b(vijfde|5de|5e|vijf|5)\s*(?:timer|timers|duimse|duimer|duimers|duim|duimen|tuin|tuinen|dimmer|dimmers|dimme|dimma|duin|duinen|duivel|duvel|duvels|duwer|duwers)\b/gi, "5 duimer"],
      [/\b(zesde|6de|6e|zes|6)\s*(?:timer|timers|duimse|duimer|duimers|duim|duimen|tuin|tuinen|dimmer|dimmers|dimme|dimma|duin|duinen|duivel|duvel|duvels|duwer|duwers)\b/gi, "6 duimer"],
      [/\b(achtste|8ste|8e|acht|8)\s*(?:timer|timers|duimse|duimer|duimers|duim|duimen|tuin|tuinen|dimmer|dimmers|dimme|dimma|duin|duinen|duivel|duvel|duvels|duwer|duwers)\b/gi, "8 duimer"],
      [/\b(tiende|10de|10e|tien|10)\s*(?:timer|timers|duimse|duimer|duimers|duim|duimen|tuin|tuinen|dimmer|dimmers|dimme|dimma|duin|duinen|duivel|duvel|duvels|duwer|duwers)\b/gi, "10 duimer"],
      [/\b(twaalfde|12de|12e|twaalf|12)\s*(?:timer|timers|duimse|duimer|duimers|duim|duimen|tuin|tuinen|dimmer|dimmers|dimme|dimma|duin|duinen|duivel|duvel|duvels|duwer|duwers)\b/gi, "12 duimer"],
      [/\b(veertiende|14de|14e|veertien|14)\s*(?:timer|timers|duimse|duimer|duimers|duim|duimen|tuin|tuinen|dimmer|dimmers|dimme|dimma|duin|duinen|duivel|duvel|duvels|duwer|duwers)\b/gi, "14 duimer"],
      [/\b(zestiende|16de|16e|zestien|16)\s*(?:timer|timers|duimse|duimer|duimers|duim|duimen|tuin|tuinen|dimmer|dimmers|dimme|dimma|duin|duinen|duivel|duvel|duvels|duwer|duwers)\b/gi, "16 duimer"],
      [/\b(achttiende|18de|18e|achttien|18)\s*(?:timer|timers|duimse|duimer|duimers|duim|duimen|tuin|tuinen|dimmer|dimmers|dimme|dimma|duin|duinen|duivel|duvel|duvels|duwer|duwers)\b/gi, "18 duimer"],
      [/\b(twintigste|20ste|20e|twintig|20)\s*(?:timer|timers|duimse|duimer|duimers|duim|duimen|tuin|tuinen|dimmer|dimmers|dimme|dimma|duin|duinen|duivel|duvel|duvels|duwer|duwers)\b/gi, "20 duimer"],
      [/\b(vierentwintigste|24ste|24e|vierentwintig|24)\s*(?:timer|timers|duimse|duimer|duimers|duim|duimen|tuin|tuinen|dimmer|dimmers|dimme|dimma|duin|duinen|duivel|duvel|duvels|duwer|duwers)\b/gi, "24 duimer"],
    ];

    for (const [p, r] of fonetisch) {
      t = t.replace(p, r);
    }

    // 3. Wanddikte & Buis context
    t = t.replace(/\b(?:schieten\s+)?(?:met|bij|door)\s+de\s+buis\b/gi, "met X-ray buis");
    t = t.replace(/\bde\s+buis\b(?!\s+(?:van\s+)?(?:\d+(?:\.\d+)?\s*(?:duim|inch|mm|cm|meter|m\b)|60|88|114|168|219|273|323|\b[1-9]\b))/gi, "X-ray buis");
    t = t.replace(/\b(\d+(?:\.\d+)?)\s*d\b/gi, "$1 dik");
    t = t.replace(/(\d+(?:\.\d+)?)[-\s]*(?:mm\s*)?\b(dek|deck|decks|dec|decs|dijk|dijken|deuk|deuken|dak|daken|dok|dokken|dikke|dicht|dichte|tag|tik|tip|dit|dip|deeg|stuk|doek|doop)\b/gi, "$1 dik");

    // Duimer & Leiding spraakcorrecties ("10 dik maar", "10 damer", "8 duimse" varianten)
    t = t.replace(/\b(\d+|een|twee|drie|vier|vijf|zes|acht|tien|twaalf)[-\s]*(?:damer|damers|dik\s*maar|dikmer|dik\s*nog|diknog)\b/gi, "$1 duimer");
    t = t.replace(/\b(zesdemig|zesdemik|zaas\s*duimel)\b/gi, "6 duimer");
    t = t.replace(/\b(orguinse|ochtendse|arduimse|arduimseleiding|achttuimse|achttruimse|achttuimseleiding|achttruimseleiding|ach\s*duimse|arduinse)(?:\s*leiding)?\b/gi, "8 duimse leiding");
    t = t.replace(/\bach\s+duim(?:se|er)?\b/gi, "8 duimer");

    // Wanddikte spraakcorrecties ("wandeling te", "wondikte", "wanddecte", "one dikte")
    t = t.replace(/\b(wandeling\s*te|wandelingte|wondikte|wanddecte|one\s*dikte|onedikte)\b/gi, "wanddikte");
    t = t.replace(/van\s+(\d+(?:[.,]\d+)?)\s*duimer\s+(?:een|met\s+een)\s+lasbreedte/gi, "van $1 dik met een lasbreedte");
    t = t.replace(/\blausbreedte\b/gi, "lasbreedte");

    // Ovaaltjes & excentrisch
    t = t.replace(/\b(?:laspreter|las\s*preter|lasbreter|las\s*breter)\b/gi, "lasbreedte");
    t = t.replace(/\b(?:overall|overal|of\s*af|ofaf)\s*schieten\b/gi, "ovaal schieten");
    t = t.replace(/\boverallschieten\b/gi, "ovaal schieten");
    t = t.replace(/\b(mag\s+ik\s+.+?)\s+hoeveel\s+schieten\b/gi, "$1 ovaal schieten");
    t = t.replace(/(\d+(?:[.,]\d+)?)\s*(?:hoeveel|hoefel|hoeffout)\s*schieten\b/gi, "$1 ovaal schieten");
    t = t.replace(/\b(hoefeltjes|hoefeltje|hoeffoutje|hoeffoutjes|hoef\s*foutje|hoef\s*foutjes)\b/gi, "ovaaltjes");
    t = t.replace(/\bm\s+aan\s+een\b/gi, "met een");
    t = t.replace(/\b(?:bruine\s*grote|bruine\s*grootte|bronnen\s*grote)\b/gi, "brongrootte");
    t = t.replace(/\bvoor\s+ons\s+klasse\b/gi, "volgens klasse");
    t = t.replace(/\bexcentrisch\s+(?:gieter|gieten)\b/gi, "excentrisch schieten");
    t = t.replace(/\bin\s+iridium\b/gi, "een iridium");
    t = t.replace(/\bonstreamopname\b/gi, "onstream opname");
    t = t.replace(/\bw[-]?max\b/gi, "Wmax");

    // Rondnaad lookalikes (bijv. "hond na het", "hond naad", "rond na te", "rond na het")
    t = t.replace(/\b(?:mijn|om\s+een|in\s+een|een)\s+(?:hond\s+na\s+het|hond\s*naad|rond\s*na\s*te|rond\s*na\s*het)\b/gi, "om een rondnaad");
    t = t.replace(/\b(?:hond\s*na\s*het|hond\s*naad|rond\s*na\s*te|rond\s*na\s*het)\b/gi, "rondnaad");

    // Centraal lookalikes ("Cent Raalte", "centraalte", "mcentraal")
    t = t.replace(/\b(?:cent\s*raalte|centraalte)\s*(?:te\s*)?schieten\b/gi, "centraal te schieten");
    t = t.replace(/\b(?:cent\s*raalte|centraalte)\b/gi, "centraal te");
    t = t.replace(/\b(\d+(?:[.,]\d+)?)\s*mcentraal\b/gi, "$1 meter centraal");
    t = t.replace(/\b(\d+)[.,](\d{1,2})\s*(?:centraal\s*te|centraal)\b/gi, "$1.$2 meter centraal");

    // (Wanddikte 'wonderte / one that'-patronen worden al afgehandeld in corrigeerSpraakTekst)

    // Selenium & Curie spraakcorrecties ("sileniumbron", "selenium in bron", "25-3")
    t = t.replace(/\b(?:selenium\s*in\s*bron|selenium\s*inbron|sileniumbron|silenium\s*bron)\b/gi, "selenium bron");
    t = t.replace(/\bsilenium\b/gi, "selenium");
    t = t.replace(/(\d+)-3(?=\s*$|\s+(?:bij|volgens|met|in))/gi, "$1 Curie");

    // Onstream & Brongrootte spraakcorrecties
    t = t.replace(/\b(schimmelname|scheem\s*opname|scheemopname|onstream\s*ontname|ons\s*schimmelname|ontstemont\s*name|ons\s*iemand\s*namen)\b/gi, "onstream opname");
    t = t.replace(/\b(?:bronnen\s*groter|brongerote)\s*(?:van)?\s*(\d+(?:[.,]\d+)?)\b/gi, "brongrootte $1");
    t = t.replace(/\bmaar\s+(\d+\s*(?:cm|centimeter|mm)\s*isolatie)/gi, "met $1");

    // Plaat context (herken spraakfouten zoals 'op een blad/praat/plaats/staat/straat van 8 dik', 'als ik een plaats schiet van 25 mm')
    t = t.replace(/\b(?:op|in|voor)\s+(?:een\s+)?(praat|plaats|blad|staat|straat|baat|plaad|blaad)\s+(?:van\s+)?(\d+(?:\.\d+)?)/gi, "plaat $2");
    t = t.replace(/\b(praat|plaats|blad|staat|straat|baat|plaad|blaad)\s+(?:van\s+)?(\d+(?:\.\d+)?\s*dik)/gi, "plaat van $2");
    t = t.replace(/\b(?:een\s+)?(plaats|praat|blad|staat|baat|plaad|blaad)\s+(schiet(?:en)?|las(?:sen)?)\b/gi, "plaat $2");
    t = t.replace(/\b(?:als\s+ik\s+)?(?:een\s+)?plaats\s+(?=schiet|las|van\s+\d+)/gi, "plaat ");
    t = t.replace(/\b(vlakke\s*plaat|open\s*plaat|op\s*een\s*blad|blad|platen|plaad)\b/gi, "plaat");

    t = t.replace(/\b(want|wanten|hand|band|zand|kant)\s+(?:van\s+|is\s+)?(\d+(?:\.\d+)?)/gi, "wanddikte $2");
    t = t.replace(/\b(muis|huis|ruis|luis|kluis|puis|bui|buizen|huizen|muizen)\s+(?:van\s+)?(\d+(?:\.\d+)?)/gi, "buis $2");
    t = t.replace(/\b(muis|huis|ruis|luis|kluis|puis|bui)\s+(?:van\s+)?(\d+(?:\.\d+)?\s*duimer)/gi, "buis $2");
    t = t.replace(/\b(lijding|leiden|lijden|lijdingen|leidinkje)\b/gi, "leiding");
    t = t.replace(/\b(peip|pijpen|pijpie|pijpje)\b/gi, "pijp");

    // Opstellingen vaktaal normalisaties
    t = t.replace(/\bop\s+(?:zijn|z['’]?n|zn)\s+(1[12345]|[1258]|[a-g])\b/gi, "opstelling $1");
    t = t.replace(/\bopstelling\s*5\s*[\/-]?\s*a\b/gi, "opstelling 5/A");
    t = t.replace(/\bopstelling\s*8\s*[\/-]?\s*b\b/gi, "opstelling 8/B");
    t = t.replace(/\bopstelling\s*11\s*[\/-]?\s*f\b/gi, "opstelling 11/F");
    t = t.replace(/\bopstelling\s*12\s*[\/-]?\s*g\b/gi, "opstelling 12/G");
    t = t.replace(/\bopstelling\s*2\s*[\/-]?\s*c\b/gi, "opstelling 2/C");
    t = t.replace(/\bopstelling\s*13\s*[\/-]?\s*e\b/gi, "opstelling 13/E");
    t = t.replace(/\bopstelling\s*14\s*[\/-]?\s*e\b/gi, "opstelling 14/E");
    t = t.replace(/\b(centrale\s+opstelling)\b/gi, "opstelling 5/A centraal");
    t = t.replace(/\b(excentrische\s+opstelling)\b/gi, "opstelling 8/B excentrisch");
    t = t.replace(/\b(opnames?\s+met\s+verzet)\b/gi, "opstelling 11/F ovaaltje");
    t = t.replace(/\b(loodrecht\s+door\s+de\s+las)\b/gi, "opstelling 12/G superpositie");

    t = herstelTriggerWoordenInTekst(t, true);

    // 5. D & N / DN & Duimse maten en eenheden normaliseren (nu inclusief alle herstelde triggerwoorden!)
    t = t.replace(/\b(?:d\s*(?:en|&|\.n\.|\s+n)|dia|thee\s*en|de\s*en|de\s*n)\s*(\d+)\b/gi, "DN $1");
    t = t.replace(
      /(\b(?:groter|kleiner|meer|minder|hoger|lager|dikker|dunner|breder|langer|korter|zwaarder|lichter|eerder|later|liever|beter|en|want|of|dat)\s+)?\b(den|dan)\s*(\d+)\b/gi,
      (m, prev, _w, num) => (!prev && DN_MATEN[num] !== undefined ? `DN ${num}` : m),
    );

    t = t.replace(/\bdn\s*[-]?\s*(\d+)\b/gi, (m, dnVal) => {
      const od = DN_MATEN[dnVal];
      return od !== undefined ? `diameter ${od}` : m;
    });

    t = t.replace(
      /\b(\d+(?:\.\d+)?)[-\s]*(?:duimertjes?|duimse|duims|duimer|duimers|duimen|duimpje|duim|duin|duins|duinen|timer|timers|tuin|tuinen|dimmer|dimmers|dimme|dimma|duivel|duvel|duvels|duwer|duwers|inch|inches|")\b/gi,
      (m, maatStr) => {
        const mm = DUIMSE_MATEN[maatStr];
        return mm !== undefined ? `diameter ${mm}` : m;
      },
    );

    t = t.replace(/\bmillimeter|milli\s*meter\b/gi, "mm");
    t = t.replace(/\bcentimeter|centi\s*meter\b/gi, "cm");

    // Spreektaal meter en centimeters (bijv. 2 meter 85 -> 2.85 meter, 2 meter en 85 -> 2.85 meter, 2m85 -> 2.85 meter)
    t = t.replace(/\b(\d+)\s*(?:meter|m)\s*(?:en\s*)?(\d{1,2})\b(?:\s*cm)?(?!\s*mm)/gi, (match, meters, cms) => {
      const paddedCms = cms.length === 1 ? `0${cms}` : cms;
      return `${meters}.${paddedCms} meter`;
    });

    // 6. Herstel hoofdletters voor bekende RT-afkortingen (één centrale stap na .toLowerCase())
    t = t
      .replace(/\b(swsi|dwsi|dwdi|dwbi|eweb|dweb|dwdb|ffd|sfd|ofa|ofd|sod|sdd|sff|hvl|bki|iqi|rvs|asme)\b/gi, (m) => m.toUpperCase())
      .replace(/\bug\b/gi, "Ug")
      .replace(/\bwmax\b/gi, "Wmax");

    return t.replace(/\s+/g, " ").trim();
  }

