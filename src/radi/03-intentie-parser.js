  // --- Intentie Bepaling ---
  function bepaalVraagIntenties(tekst) {
    const lower = tekst.toLowerCase();
    const intenties = [];
    const heeftTijdSeenheid = /\b\d+(?:[.,]\d+)?\s*(?:minuut|minuten|min\b|sec\b|seconden)\b|\b\d+\s*m\s*\d{1,2}\s*s\b|\b\d+:\d{2}\b|\b\d+(?:[.,]\d+)?s\b/i.test(lower);
    const heeftVanNaar =
      /\b(?:van|vanuit)\s+\S+.*?\b(?:naar|tot)\b/i.test(lower) ||
      /\b(?:wissel|focusverandering|kwadratenwet|oude\s+(?:focus|ffd|tijd|ci|curie)|nieuwe\s+(?:focus|ffd|tijd|ci|curie)|vorig\s+jaar|vroeger|eerst)\b/i.test(lower) ||
      /\bd[234578]\b.*?\bd[234578]\b/i.test(lower) ||
      /\b\d+(?:[.,]\d+)?\s*(?:ci|curie)\b.*?\b\d+(?:[.,]\d+)?\s*(?:ci|curie)\b/i.test(lower);
    const isZwartingTijdSchatting =
      (/\b(zwarting\w*|optische\s+dichtheid|density)\b/i.test(lower) || /\bvan\s+\d+(?:[.,]\d+)?\s+naar\s+\d+(?:[.,]\d+)?\b/i.test(lower)) &&
      (heeftTijdSeenheid ||
        /\b(?:hoelang|hoe\s*lang|tijd|stralingstijd|belichtingstijd|straal|straalt|stralen|belicht|belichten|krijg|krijgt|krijgen|haal|haalt|halen|schiet|schieten)\b/i.test(lower) ||
        Boolean(typeof actiefGespreksGeheugen !== "undefined" && actiefGespreksGeheugen && (actiefGespreksGeheugen.focusBegintijdSec || actiefGespreksGeheugen.laatsteStralingstijdSec || actiefGespreksGeheugen.maminVal)));
    const isStralingstijdVraag =
      !isZwartingTijdSchatting &&
      !heeftVanNaar &&
      (/\b(stralingstijd|belichtingstijd|schiettijd|hoelang|hoe\s+lang)\b/i.test(lower) ||
        /\bhoeveel\s*(?:seconden|minuten|sec\b|min\b)\s*(?:moet|duurt|schieten|stralen|belichten|bron\s*eruit)\b/i.test(lower) ||
        /\b(tijd\s+om\s+te\s+stralen|duur\s+van\s+de\s+opname)\b/i.test(lower) ||
        (/\b(wat\s+wordt\s+(?:het|de\s+tijd)|wat\s+is\s+de\s+(?:stralings|belichtings)?tijd)\b/i.test(lower) &&
          !heeftTijdSeenheid &&
          !(typeof actiefGespreksGeheugen !== "undefined" && actiefGespreksGeheugen && actiefGespreksGeheugen.focusBegintijdSec)) ||
        (/\b(?:las)?compensatie\b/i.test(lower) &&
          typeof actiefGespreksGeheugen !== "undefined" &&
          actiefGespreksGeheugen &&
          (actiefGespreksGeheugen.laatsteIntentie === "stralingstijd" || (actiefGespreksGeheugen.diameter && actiefGespreksGeheugen.wanddikte) || actiefGespreksGeheugen.activiteit)));

    // Vraag over de lascompensatie zelf (uitleg / hoe aanpassen)
    const isCompensatieInfoVraag =
      !isStralingstijdVraag &&
      /\b(?:kan\s+(?:ik\s+)?(?:de\s+)?(?:las)?compensatie\s+(?:aanpassen|wijzigen|instellen)|hoeveel\s+(?:las)?compensatie|waarom\s+(?:las)?compensatie|wat\s+is\s+(?:de\s+)?(?:las)?compensatie|lascompensatie\s+uitleg)\b/i.test(lower);
    if (isCompensatieInfoVraag) {
      intenties.push("compensatie_info");
      return intenties;
    }

    // Voorbeelden van vragen
    const isVraagVoorbeelden = /\b(wat\s+kan\s+(?:ik\s+)?(?:allemaal\s+)?(?:aan\s+(?:jou|radi)\s+)?vragen|welke\s+vragen\s+(?:kan\s+ik|kan\s+je)|geef\s+(?:mij\s+)?(?:eens\s+)?voorbeelden|voorbeeldvragen|voorbeelden\s+van\s+vragen)\b/i.test(lower);
    if (isVraagVoorbeelden) {
      intenties.push("vraag_voorbeelden");
      return intenties;
    }

    // Begroeting / Smalltalk / Wie ben je / Wat kun je (als er geen specifieke leiding- of rekenparameters zijn)
    const isBegroeting = /\b(hallo|hoi|hey|dag\s+radi|goede(?:morgen|middag|avond)|goeie(?:morgen|middag|avond)|wie\s+ben\s+(?:je|jij)|wat\s+kun\s+(?:je|jij)|wat\s+doe\s+(?:je|jij)|help\s*me|kan\s+je\s+me\s+helpen)\b/i.test(lower);
    if (isBegroeting && !/\b(diameter|wanddikte|dikte|sch\b|schedule|curie|ci|ffd|sfd|focus|opnames|draad|afzetting|meter|lood|buis|onstream|wmax)\b/i.test(lower)) {
      intenties.push("begroeting");
      return intenties;
    }

    // Bedankje
    const isBedankje = /^(?:dank\s*je|dankjewel|bedankt|top\s*bedankt|super\s*bedankt|super|perfect|held|thanks|thx|top\s*dankje)[\s!.]*$/i.test(lower.trim());
    if (isBedankje) {
      intenties.push("bedankje");
      return intenties;
    }

    // RT Theorie & Kennisbank vragen (normregels, loodletter B, kwadratenwet theorie, isotopen eigenschappen, etc.)
    const isRTKennisVraag =
      /\b(loodletter\s*b|loden\s*letter\s*b|letter\s*b|backscatter|terugverstrooiing|terugstrooiing)\b/i.test(lower) ||
      (/\b(kwadratenwet|omgekeerde\s*kwadratenwet|inverse\s*square\s*law)\b/i.test(lower) && !/\b(naar|tijd|minuut|sec|van\s+\d+)\b/i.test(lower)) ||
      (/\b(geometrische\s*onscherpte|onscherpte|wat\s+is\s+ug|formule\s+(?:voor|van)\s+(?:de\s+)?(?:geometrische\s*)?(?:onscherpte|ug)|hoe\s+bereken\s+(?:je|ik|men)\s+(?:de\s+)?(?:geometrische\s*)?(?:onscherpte|ug)|ug\s+eisen|ug\s+norm|ug\s+grenzen)\b/i.test(lower) && !/\b\d+(?:[.,]\d+)?\s*(?:mm|cm|meter|m\b)\b/i.test(lower) && !/\b(?:ffd|sfd|ofa|focus|brongrootte)\s*(?:is|van|=)?\s*\d+/i.test(lower)) ||
      /\b(keverregel|waarom\s+(?:laag|lage)\s*kv|waarom\s+buisspanning\s+beperken|wat\s+is\s+(?:de\s+)?(?:keverregel|kv[-\s]?regel))\b/i.test(lower) ||
      (/\b(halfwaardetijd|halveringstijd|halveringtijd|eigenschappen\s*(?:van\s*)?(?:ir-?192|se-?75|co-?60|isotopen|isotoop|iridium|selenium|kobalt)|energie\s*(?:van\s*)?(?:ir-?192|se-?75|co-?60|iridium|selenium|kobalt))\b/i.test(lower) && !/\b(over\s+\d+|na\s+\d+|\d+\s*dagen|\d+\s*weken|\d+\s*maanden|geleden|op\s+\d{1,2}[-\/]\d{1,2})\b/i.test(lower)) ||
      (/\b(agfa|structurix)\b/i.test(lower) && /\b(film|klasse|c[1-6]|d[2-8]|type|overeen)\b/i.test(lower)) ||
      /\b(filmklasse\s*c[1-6]|film\s*c[1-6]|wat\s+is\s+film\s*c[1-6]|wat\s+is\s+c[1-6]|welke\s+film\s+is\s+c[1-6]|welk\s+type\s+agfa\s*(?:film)?\s*(?:komt\s+overeen\s+)?met\s+c[1-6])\b/i.test(lower) ||
      /\b(waarom\s+d4|verschil\s+tussen\s+d4\s+en\s+d7|verschil\s+tussen\s+d7\s+en\s+d4|d4\s+vs\s+d7|d7\s+vs\s+d4|filmklasse\s*c[1-5]|wanneer\s+d4|wanneer\s+d7|wanneer\s+d5)\b/i.test(lower) ||
      (/\b(hoeveel|aantal)\s+(?:draadjes?|draden|draadje(?:\s*bki)?)\b/i.test(lower) && /\b(en\s*bki|iso\s*bki|bki|iqi|houder|en\b|iso\b)/i.test(lower)) ||
      /\b(verschil\s+tussen\s+(?:een\s+)?(?:asme|astm)\s*(?:en\s+|vs\s*)?(?:en|iso)?\s*(?:bki|iqi)|(?:asme|astm)\s*(?:vs|tegenover)\s*(?:en|iso)\s*(?:bki|iqi)|verschil\s+tussen\s+(?:en\s+en\s+asme|asme\s+en\s+en)\s*(?:bki|iqi))\b/i.test(lower) ||
      (/\b(verschil|vergelijk)\b/i.test(lower) && /\b(asme|astm)\b/i.test(lower) && /\b(en|iso)\b/i.test(lower) && /\b(bki|iqi|draad|indicator)\b/i.test(lower)) ||
      /\b(verschil\s+tussen\s+(?:een\s+)?(?:draadje|draadjes|wire)(?:\s*bki)?\s+en\s+(?:een\s+)?(?:gaatje|gaatjes|gat|gaten|plaatje|plaatjes|hole)|draadje\s+vs\s+(?:gaatje|gat|plaatje)|wat\s+is\s+(?:een\s+)?2t[-\s]*gat|waarom\s+2t|hole\s*type\s*iqi\s*uitleg)\b/i.test(lower) ||
      /\b(waarom\s+10\s*(?:microsievert|usv|µsv|micro\s*sv)|waar\s+komt\s+(?:de\s+)?(?:grens\s+(?:van\s+)?)?10\s*(?:microsievert|usv|µsv|micro\s*sv)|grens\s+(?:van\s+)?10\s*(?:microsievert|usv|µsv|micro\s*sv)|10\s*(?:microsievert|usv|µsv|micro\s*sv)(?:\s*\/\s*(?:uur|h))?\s*(?:vandaan|grens|norm)|gecontroleerde\s*zone\s*(?:norm|grens)|grens\s*gecontroleerde\s*zone)\b/i.test(lower) ||
      /\b(hoeveel\s+straling\s+mag\s+(?:een\s+)?(?:medewerker|werknemer|persoon|radiograaf)|dosislimiet|dosislimieten|maximaal\s+toegestane\s+dosis\s+(?:per\s+jaar|jaarlijks)|hoeveel\s+(?:msv|millisievert)\s+(?:per\s+jaar|mag\s+een\s+medewerker)|dosislimiet\s+straling|wettelijke\s+dosislimiet)\b/i.test(lower) ||
      (/\b(hoe\s+bereken\s+(?:je|ik|men)\s+(?:de\s+)?(?:minimale\s+)?(?:ffd|focus|film\s*focus\s*afstand)|hoe\s+wordt\s+de\s+(?:minimale\s+)?ffd\s+berekend|formule\s+(?:voor|van)\s+(?:de\s+)?(?:minimale\s+)?ffd|hoe\s+bepaal\s+(?:je|ik|men)\s+(?:de\s+)?(?:minimale\s+)?ffd)\b/i.test(lower) && !/\b\d+(?:[.,]\d+)?\s*(?:mm|cm|meter|duim|inch|dik)\b/i.test(lower)) ||
      /\b(strooistraling|secundaire\s*straling|waarom\s+(?:een\s+)?collimator|werking\s+collimator|hoe\s+werkt\s+een\s+collimator|wat\s+doet\s+(?:een\s+)?collimator)\b/i.test(lower) ||
      /\b(welke\s+normen\s*(?:zijn\s*er|gelden)|overzicht\s+van\s+normen|rt\s+normen|radiografie\s+normen)\b/i.test(lower) ||
      /\b(verschil\s+tussen\s+iso\s*5817\s+en\s+iso\s*10675|iso\s*5817\s*vs\s*iso\s*10675|wat\s+is\s+iso\s*5817|wat\s+is\s+iso\s*10675)\b/i.test(lower) ||
      /\b(verschil\s+tussen\s+swsi\s+en\s+dwsi|swsi\s+vs\s+dwsi|verschil\s+tussen\s+dwsi\s+en\s+dwdi|verschil\s+tussen\s+swsi\s+en\s+dwdi)\b/i.test(lower) ||
      /\b(alara|drie\s+basisregels\s+stralingsbescherming|3\s+basisregels\s+stralingsbescherming|tijd\s+afstand\s+afscherming|basisregels\s+stralingsbescherming)\b/i.test(lower) ||
      (/\b(optische\s+dichtheid|wat\s+is\s+zwarting|formule\s+(?:voor|van)\s+(?:de\s+)?(?:zwarting|optische\s+dichtheid)|hoe\s+bereken\s+(?:je|ik|men)\s+(?:de\s+)?(?:zwarting|optische\s+dichtheid))\b/i.test(lower) && !/\b\d+(?:[.,]\d+)?\b/.test(lower)) ||
      (/\b(halveringsdikte|half\s*value\s*layer|\bhvl\b|tiendewaardelaag|tenth\s*value\s*layer|\btvl\b|formule\s+(?:voor|van)\s+(?:de\s+)?(?:afscherming|verzwakking))\b/i.test(lower) && !/\b\d+(?:[.,]\d+)?\s*(?:mm|cm|meter|m\b|ci|curie)\b/i.test(lower)) ||
      /\b(loodscherm|loodschermen|loodschermpje|loodschermpjes|versterkingsscherm|versterkingsschermen|versterkingsfolie|lood\s*folies?|lead\s*screens?|waarom\s+lood\s+in\s+(?:de\s+)?cassette)\b/i.test(lower) ||
      (/\b(formule\s+(?:voor|van)\s+(?:het\s+)?(?:radioactief\s+)?verval|hoe\s+bereken\s+(?:je|ik|men)\s+(?:het\s+)?(?:radioactief\s+)?verval|vervalformule|verval\s+formule)\b/i.test(lower) && !/\b\d+(?:[.,]\d+)?\s*(?:ci|curie|dagen|weken|maanden|jaar)\b/i.test(lower)) ||
      (/\b(wat\s+is\s+(?:een\s+)?equivalentiefactor|uitleg\s+equivalentiefactor|hoe\s+werkt\s+(?:een\s+)?equivalentiefactor|wat\s+is\s+staalequivalent)\b/i.test(lower)) ||
      /\b(donkere\s+kamer|film\s+ontwikkelen|stappen\s+(?:van\s+)?(?:film\s*)?ontwikkelen|ontwikkelproces|waarom\s+fixeren|functie\s+(?:van\s+)?(?:het\s+)?(?:stopbad|fixeerbad|ontwikkelbad))\b/i.test(lower);

    if (isRTKennisVraag) {
      intenties.push("rt_kennis");
      return intenties;
    }

    // Over R.A.D.I. / Info / Disclaimer / Contact / Fout melden
    if (/\b(wie\s+ben\s+(je|jij)|wat\s+is\s+r\.?a\.?d\.?i\.?|wat\s+betekent\s+r\.?a\.?d\.?i\.?|waar\s+staat\s+r\.?a\.?d\.?i\.?\s+voor|afkorting\s+(?:van\s+)?r\.?a\.?d\.?i\.?|hoe\s+werkt\s+(deze\s+app|r\.?a\.?d\.?i\.?|het)|over\s+r\.?a\.?d\.?i\.?|disclaimer|eigen\s+risico|fout\s+melden|contact|feedback|over\s+deze\s+app)\b/i.test(lower)) {
      intenties.push("app_info");
      return intenties;
    }

    // Schietkaart / Overzichtskaart vraag
    if (/\b(schietkaart|overzichtskaart|schiet\s*kaart|overzichts\s*kaart|volledig\s+overzicht|totaaloverzicht|werkkaart)\b/i.test(lower)) {
      intenties.push("schietkaart");
      return intenties;
    }

    // ASME Hole-Type IQI (Plaatjes / Shim IQI & Gatvergelijking)
    const isHoleTypeIqiVraag =
      /\b(hole[-\s]*type|shim[-\s]*iqi|plaatje[-\s]*iqi|plaatjes[-\s]*iqi|hole[-\s]*iqi|gat[-\s]*type|gaatjes[-\s]*iqi|shim[-\s]*type|plaat[-\s]*draadje[-\s]*bki)\b/i.test(lower) ||
      (/\b([124]t)\b/i.test(lower) && /\b(gat|gaatje|gaten|plaatje|shim|diameter|hetzelfde|overeen|gelijk|tabel)\b/i.test(lower)) ||
      (/\b(plaatje|shim)\b/i.test(lower) && /\b([124]t|asme|astm|iqi|bki)\b/i.test(lower)) ||
      (/\b(welk\s+gat|welk\s+gaatje|welke\s+gatdiameter)\b/i.test(lower));
    if (isHoleTypeIqiVraag) {
      intenties.push("hole_type_iqi");
      return intenties;
    }

    // ASME vs EN Draadjes Vergelijking & Toegestaanheid / Code Regels
    const isAsmeDraadVergelijk =
      (/\b(in\s+plaats\s+van|ipv|i\.p\.v\.|vergelijk|vergelijken|equivalent|alternatief)\b/i.test(lower) &&
        /\b(asme|astm)\b/i.test(lower) &&
        /\b(draad|draadje|draadjes|w\d+|w-?\d+)\b/i.test(lower)) ||
      (/\bmag\s+ik\b.*?\b(asme|astm|en|iso)\b.*?\b(draad|draadje|draadjes)\b.*?\b(gebruiken|toepassen)\b/i.test(lower)) ||
      (/\b(asme|astm)\b.*?\b(draad|draadje)\b.*?\b(mag\s+ik|toegestaan|toepassen|gebruiken)\b/i.test(lower)) ||
      (/\bwelk\s+draadje\b.*?\b(in\s+plaats\s+van|ipv|i\.p\.v\.|equivalent|alternatief)\b.*?\b(asme|astm)\b/i.test(lower));
    if (isAsmeDraadVergelijk) {
      intenties.push("asme_draad_vergelijk");
      return intenties;
    }

    // Onstream tak (RT21021 / RT21022)
    const isOnstreamGeheugen =
      typeof actiefGespreksGeheugen !== "undefined" &&
      actiefGespreksGeheugen &&
      (Boolean(actiefGespreksGeheugen.isOnstream) ||
        actiefGespreksGeheugen.laatsteIntentie === "onstream_ffd" ||
        actiefGespreksGeheugen.laatsteIntentie === "onstream_bron");

    const isOnstream =
      /\b(onstream|on\s*stream|onstreamopname|rt21021|rt21022|tangentiaal|tangenti[eë]le|restwanddikte|wmax|w\s*max|w-max|klasse\s*t[ab])\b/i.test(lower) ||
      (isOnstreamGeheugen &&
        (/\b(klasse\s*t[ab]|tb|ta|isolatie|tangentiaal|dubbelwand)\b/i.test(lower) ||
          (/\b(mag|kan|geschikt|toegestaan|mogelijk|welke\s*bron|bronkeuze)\b/i.test(lower) &&
            /\b(se[-\s]?75|se75|selenium|seleen|ir[-\s]?192|ir192|iridium|co[-\s]?60|co60|kobalt|bron|isotoop)\b/i.test(lower))));
    if (isOnstream) {
      const isFilmVraagInOnstream =
        (/\b(d[234578]|filmkwaliteit|filmklasse|filmtype|filmsoort)\b/i.test(lower) &&
          /\b(mag|toegestaan|gebruiken|kiezen|nemen|toepassen|advies|kan\s*ik|welke)\b/i.test(lower)) ||
        /\bmag\s+.*(d[234578])\b/i.test(lower);
      if (isFilmVraagInOnstream) {
        intenties.push("film_keuze");
        return intenties;
      }

      const vraagtOnstreamFFD = /\b(ffd|sfd|focus|afstand|focusafstand)\b/i.test(lower) && !/\b(stralingstijd|belichtingstijd|schiettijd|hoelang|hoe\s+lang)\b/i.test(lower);
      const vraagtPureOnstreamBron = !vraagtOnstreamFFD && /\b(welke\s+bron|bronkeuze|wat\s+is\s+de\s+wmax|bereken\s+wmax|mag\s+ik.*gebruiken|kan\s+ik.*gebruiken|is\s+.*geschikt)\b/i.test(lower);
      if (
        vraagtOnstreamFFD ||
        (typeof actiefGespreksGeheugen !== "undefined" &&
          actiefGespreksGeheugen &&
          actiefGespreksGeheugen.laatsteIntentie === "onstream_ffd" &&
          !vraagtPureOnstreamBron &&
          !/\b(stralingstijd|belichtingstijd|schiettijd|hoelang|hoe\s+lang)\b/i.test(lower))
      ) {
        intenties.push("onstream_ffd");
      } else if (/\b(bron|bronkeuze|geschikt|isotoop|se-75|se75|seleen|selenium|ir-192|ir192|iridium|co-60|co60|welke\s+bron|kobalt|kan\s+ik|mag\s+ik|mag\s+dit|gebruiken|wmax|w-max)\b/i.test(lower) && !/\b(stralingstijd|belichtingstijd|schiettijd|hoelang|hoe\s+lang|gevuld|water|olie)\b/i.test(lower)) {
        intenties.push("onstream_bron");
      }
      if (intenties.length === 0 && !/\b(stralingstijd|belichtingstijd|schiettijd|hoelang|hoe\s+lang|gevuld|water|olie|kv|verval)\b/i.test(lower)) {
        intenties.push("onstream_bron");
      }
      if (intenties.length > 0 && !/\b(stralingstijd|belichtingstijd|schiettijd|hoelang|hoe\s+lang|gevuld|water|olie|kv|verval)\b/i.test(lower)) {
        return intenties;
      }
    }

    // Langsnaad verdeler (LW_Verdeler.html)
    const isLangsnaadVraag =
      /\b(langsnaad|langs\s*naad|lw\s*verdeler|langsnaadverdeler)\b/i.test(lower) ||
      (/\b(verdeel|verdelen|verdeling)\b/i.test(lower) && /\b(meter|m\b|langsnaad|naad|lw)\b/i.test(lower));
    if (isLangsnaadVraag && !/\b(min\w*\s+ffd|minimale\s+focus|stralingstijd|belichtingstijd)\b/i.test(lower)) {
      intenties.push("langsnaad");
      return intenties;
    }

    // Materiaalfactor info vraag (conform stralingstijd.html en focusverandering.html)
    const isFilmFactorVraag = /\bd[234578]\b.*?\bd[234578]\b/i.test(lower);
    const isMateriaalInfoVraag =
      !isFilmFactorVraag &&
      ((/\b(materiaalfactor|materiaal\s*factor|stralingsfactor|omrekenfactor\s*materiaal)\b/i.test(lower) ||
        /\b(welke\s+factor|wat\s+is\s+de\s+factor|factor\s+voor|factor\s+van)\b/i.test(lower) ||
        /\b(?:hoe\s+reken\s+ik|omreken\w*)\b.*?\bvan\s+staal\s+naar\b/i.test(lower) ||
        /^(?:materiaal|legering)\s*(?:is|:|=)?\s*[a-z0-9\s\-\/\.]+/i.test(lower)) &&
        !isStralingstijdVraag &&
        !/\b(minuut|minuten|seconden|sec\b|begintijd|nieuwe\s+tijd|kwadratenwet|focusverandering)\b/i.test(lower));

    if (isMateriaalInfoVraag) {
      intenties.push("materiaalfactor");
      return intenties;
    }

    // Geometrische onscherpte (Ug) formule of directe Ug berekening
    const isUgVraag =
      /\b(geometrische\s+onscherpte|onscherpte|\bug\b)\b/i.test(lower) &&
      !/\b(min\w*\s+ffd|minimale\s+focus|wat\s+is\s+de\s+(?:min\w*\s+)?ffd|welke\s+ffd|fmin)\b/i.test(lower);
    if (isUgVraag) {
      intenties.push("ug_berekening");
      return intenties;
    }

    // Buistabel / mA*min omrekenen naar belichtingstijd (buistabel.html)
    const heeftHerinnerdeFocus = Boolean(
      typeof actiefGespreksGeheugen !== "undefined" &&
      actiefGespreksGeheugen &&
      (actiefGespreksGeheugen.sfd || (actiefGespreksGeheugen.oudeFocus && actiefGespreksGeheugen.nieuweFocus))
    );
    const heeftMaMinInTekst = /\b(ma\s*\*?\s*min|mamin|(?:mill?i[-\s]?(?:amp[eè]re|amp)|ma)\s*(?:[\*x\s]|per\s+)?(?:minuuten|minuten|minuut|min\b))\b/i.test(lower);
    const heeftFocusInTekst =
      /(?<![\d.,]|(?:se|ir|co)[-\s]?\d*)(?:op\s+|bij\s+|van\s+|naar\s+)?(\d+\s*(?:m|meter)\s*\d{1,2}|\d+(?:[.,]\d+)?\s*(?:cm|mm|meter|m\b)?)\s*(?:ffd|sfd|focus)\b/i.test(lower) ||
      /\b(?:ffd|sfd|focus)\s*(?:van|is|op|:)?\s*\d+/i.test(lower);
    const heeftFocusCombinatieMetGeheugen =
      (heeftMaMinInTekst || heeftTijdSeenheid) && heeftFocusInTekst && heeftHerinnerdeFocus;

    const isEchteFocusWissel =
      heeftFocusCombinatieMetGeheugen ||
      /\b(focusverandering|focus\s*verandering|ffd\s*verandering|kwadratenwet|ci\s*wissel|curie\s*wissel)\b/i.test(lower) ||
      /\b(van\s+\d+\s*(?:cm|mm)?\s*(?:naar|tot)\s+\d+\s*(?:cm|mm)?\s*(?:ffd|sfd|focus))\b/i.test(lower) ||
      /\b(?:oude\s+focus|oude\s+ffd|nieuwe\s+focus|nieuwe\s+ffd)\b/i.test(lower) ||
      /\b(van\s+d[234578]\s+naar\s+d[234578]|wissel\s+(?:van\s+)?d[234578]\s+naar\s+d[234578])\b/i.test(lower) ||
      (/\bd[234578]\b.*?\bd[234578]\b/i.test(lower) && /\b(stralen|belichten|tijd|minuut|minuten|min\b|sec|seconden|lang|wissel|gebruik)/i.test(lower)) ||
      (/\b\d+(?:[.,]\d+)?\s*(?:ci|curie)\b.*?\b\d+(?:[.,]\d+)?\s*(?:ci|curie)\b/i.test(lower) && /\b(stralen|belichten|tijd|minuut|minuten|min\b|sec|seconden|lang|wat\s+wordt|nieuwe\s+tijd|hoe\s*lang)\b/i.test(lower)) ||
      (/\b(?:op|bij|van)\s+\d+\s*cm\b.*?\b(?:op|bij|naar|tot)\s+\d+\s*cm\b/i.test(lower) && /\b(stralen|belichten|tijd|minuut|minuten|min\b|sec|seconden|lang|wat\s+wordt|nieuwe\s+tijd|hoe\s*lang)\b/i.test(lower)) ||
      (/\b\d+\s*(?:minuut|minuten|min\b|sec|seconden)\b/i.test(lower) &&
        /\b(hoe\s*lang|hoelang|wat\s+wordt|nieuwe\s+tijd|omrekenen|vergelijken)\b/i.test(lower) &&
        (/\b(?:op|van)\s+staal\b/i.test(lower) || /\b(titanium|titaan|inconel|hastelloy|monel|aluminium|koper|rvs|staal|nikkel)\b/i.test(lower))) ||
      (/\b(materiaalfactor|materiaal\s*factor|omrekenfactor\s*materiaal)\b/i.test(lower) && /\b(begintijd|nieuwe\s+tijd|tijd\s+omrekenen|sec|minut)\b/i.test(lower)) ||
      (/(?:op|bij|vanuit|van|met)\s+\d+.*?(?:cm|mm|m\b|meter)?\s*focus.*?(?:op|bij|naar|tot)\s+\d+.*?(?:cm|mm|m\b|meter)?\s*focus/i.test(lower)) ||
      (/(?:op|bij)\s+\d+.*?(?:cm|mm|m\b|meter)?\s*(?:ffd|sfd|focus)?\s*,?\s*(?:hoe\s*lang|hoelang).*?(?:op|bij|naar|tot)\s+\d+/i.test(lower)) ||
      (/\b(?:ma\*min|mamin|milliamp|miliamp)\b/i.test(lower) && /\b(focus|ffd|sfd)\b/i.test(lower) && /\b(naar|omrekenen|verandering|wissel)\b/i.test(lower)) ||
      (/\b\d+\s*(?:minuut|minuten|min\b|sec|seconden)\s*(?:stralen|belichten|belichtingstijd)?\b/i.test(lower) &&
        /\b(hoe\s*lang|hoelang|wat\s+wordt|nieuwe\s+tijd)\b/i.test(lower) &&
        /\b(focus|ffd|sfd|d[234578]|curie|ci)\b/i.test(lower));

    const isBuisTabelVraag =
      /\b(buistabel|buis-tabel|buistabellen)\b/i.test(lower) ||
      (heeftMaMinInTekst && !isEchteFocusWissel) ||
      (typeof actiefGespreksGeheugen !== "undefined" &&
        actiefGespreksGeheugen &&
        actiefGespreksGeheugen.laatsteIntentie === "buistabel" &&
        !isEchteFocusWissel &&
        (/\b\d+(?:[.,]\d+)?\s*(?:ma\*min|mamin|ma|milliamp|miliamp|minut(?:en|ie)?)\b/i.test(lower) || /\b\d+(?:[.,]\d+)?\b/.test(lower)));

    if (isBuisTabelVraag && !/\b(kv|kilovolt|buisspanning|keverregel)\b/i.test(lower)) {
      intenties.push("buistabel");
      return intenties;
    }

    // Focus & Filmtype Calculator / Focusverandering (focusverandering.html)
    const isFocusVeranderingVraag =
      heeftFocusCombinatieMetGeheugen ||
      /\b(focusverandering|focus\s*verandering|ffd\s*verandering|kwadratenwet|ci\s*wissel|curie\s*wissel)\b/i.test(lower) ||
      /\b(van\s+\d+\s*(?:cm|mm)?\s*(?:naar|tot)\s+\d+\s*(?:cm|mm)?\s*(?:ffd|sfd|focus))\b/i.test(lower) ||
      /\b(van\s+(?:de\s+)?(?:ffd|sfd|focus)\s+\d+\s*(?:naar|tot)\s+\d+)\b/i.test(lower) ||
      /\b(?:oude\s+focus|oude\s+ffd|nieuwe\s+focus|nieuwe\s+ffd)\b/i.test(lower) ||
      /\b(van\s+d[234578]\s+naar\s+d[234578]|wissel\s+(?:van\s+)?d[234578]\s+naar\s+d[234578]|omrekenen.*d[234578])\b/i.test(lower) ||
      /\b(wissel\s+van\s+\d+.*(?:ci|curie)\s+naar\s+\d+)\b/i.test(lower) ||
      (/\b\d+(?:[.,]\d+)?\s*(?:ci|curie)\b.*?\b\d+(?:[.,]\d+)?\s*(?:ci|curie)\b/i.test(lower) && /\b(stralen|belichten|tijd|minuut|minuten|min\b|sec|seconden|lang|wat\s+wordt|nieuwe\s+tijd|hoe\s*lang)\b/i.test(lower)) ||
      (/\b(?:op|bij|van)\s+\d+\s*cm\b.*?\b(?:op|bij|naar|tot)\s+\d+\s*cm\b/i.test(lower) && /\b(stralen|belichten|tijd|minuut|minuten|min\b|sec|seconden|lang|wat\s+wordt|nieuwe\s+tijd|hoe\s*lang)\b/i.test(lower)) ||
      (/\b\d+\s*(?:minuut|minuten|min\b|sec|seconden)\b/i.test(lower) &&
        /\b(hoe\s*lang|hoelang|wat\s+wordt|nieuwe\s+tijd|omrekenen|vergelijken)\b/i.test(lower) &&
        (/\b(?:op|van)\s+staal\b/i.test(lower) || /\b(titanium|titaan|inconel|hastelloy|monel|aluminium|koper|rvs|staal|nikkel)\b/i.test(lower))) ||
      (/\b(materiaalfactor|materiaal\s*factor|omrekenfactor\s*materiaal)\b/i.test(lower) && /\b(begintijd|nieuwe\s+tijd|tijd\s+omrekenen|sec|minut)\b/i.test(lower)) ||
      /\b(focusverandering\.html)\b/i.test(lower) ||
      // Twee focus afstanden genoemd (bijv: "op 80 cm focus ... op 56 cm focus" of "op 80 focus ... op 1 meter 20 focus")
      (/(?:op|bij|vanuit|van|met)\s+\d+.*?(?:cm|mm|m\b|meter)?\s*focus.*?(?:op|bij|naar|tot)\s+\d+.*?(?:cm|mm|m\b|meter)?\s*focus/i.test(lower)) ||
      (/(?:op|bij)\s+\d+.*?(?:cm|mm|m\b|meter)?\s*(?:ffd|sfd|focus)?\s*,?\s*(?:hoe\s*lang|hoelang).*?(?:op|bij|naar|tot)\s+\d+/i.test(lower)) ||
      (/\b(?:ma\*min|mamin|milliamp|miliamp)\b/i.test(lower) && /\b(focus|ffd|sfd)\b/i.test(lower) && /\b(naar|omrekenen|verandering|wissel)\b/i.test(lower)) ||
      // Begintijd + focus/film/ci + vraag naar nieuwe tijd ("ik moet 1 minuut stralen op 80 ... hoe lang moet ik dan stralen op 56")
      (/\b\d+\s*(?:minuut|minuten|min\b|sec|seconden)\s*(?:stralen|belichten|belichtingstijd)?\b/i.test(lower) &&
        /\b(hoe\s*lang|hoelang|wat\s+wordt|nieuwe\s+tijd)\b/i.test(lower) &&
        /\b(focus|ffd|sfd|d[234578]|curie|ci)\b/i.test(lower)) ||
      // Twee films genoemd in combinatie met tijd/stralen/factor
      (/\bd[234578]\b.*?\bd[234578]\b/i.test(lower) && /\b(stralen|belichten|tijd|minuut|minuten|min\b|sec|seconden|lang|wissel|factor|verandert)\b/i.test(lower)) ||
      (/\b(wat\s+wordt\s+(?:het|de\s+tijd)|hoe\s+lang\s+wordt\s+(?:het|de\s+tijd)|nieuwe\s+tijd|tijd\s+omrekenen)\b/i.test(lower) &&
        /\b(focus|ffd|sfd|d[234578]|curie|ci)\b/i.test(lower) &&
        (heeftTijdSeenheid || heeftVanNaar || Boolean(typeof actiefGespreksGeheugen !== "undefined" && actiefGespreksGeheugen && actiefGespreksGeheugen.focusBegintijdSec)));

    if (isFocusVeranderingVraag && !/\b(min\w*\s+ffd|minimale\s+focus|wat\s+is\s+de\s+(?:min\w*\s+)?ffd)\b/i.test(lower)) {
      intenties.push("focusverandering");
      return intenties;
    }

    // Afzetting Gamma / Veiligheid / Dosistempo / Looddikte / Halveringsdikte / Dosislimiet
    const isAfzettingDirect =
      /\b(afzetting|afzettingsafstand|afzetten|afzettingszone|gecontroleerde\s*zone|dosistempo|microsievert|usv|µsv|veiligheidsafstand|veilige\s*afstand|hoe\s+groot.*afzetting|hoe\s+ver.*afzetten|halveringsdikte|hvl|dosislimiet|jaarlijkse\s+dosis|loodafscherming|loden\s+afscherming)\b/i.test(lower) ||
      /\b(?:hoeveel|welke)\s+(?:mm\s+|millimeter\s+)?(?:lood|loden|pb|afscherming|staal)\b/i.test(lower) ||
      /\b(?:lood|afscherming)\s*(?:plakken|hangen|tussen|ervoor|nodig|toevoegen)\b/i.test(lower) ||
      /\b(afzetlint|lint\s*hangen|waar\s+(?:moet|kan)\s+(?:ik\s+)?(?:het\s+)?lint|veiligheidszone|stralingszone|iedereen\s+weg(?:blijven)?|wegwezen|veilige\s+zone)\b/i.test(lower) ||
      /\bkan\s+ik\s+(?:binnen|maximaal)\s+\d+.*?(?:afzetten|blijven)\b/i.test(lower) ||
      (/\b(afscherming|afschermen|lood|loden|pb|beton(?:nen)?|betonmuur|bakste(?:en|nen)|baksteenmuur|metselwerk|muur|tussenmuur|scheidingsmuur)\b/i.test(lower) && /\b(nodig|meter|m\b|afzetten|afzetting|dosistempo|microsievert|usv|µsv|iridium|selenium|se-?75|ir-?192|curie|ci|collimator)\b/i.test(lower));

    const isAfzettingVervolg =
      typeof actiefGespreksGeheugen !== "undefined" &&
      actiefGespreksGeheugen &&
      actiefGespreksGeheugen.laatsteIntentie === "afzetting" &&
      !isStralingstijdVraag &&
      !isFocusVeranderingVraag &&
      !/\b(opnames?|draadje|bki|iqi|ffd|sfd|focus|onstream|wmax|lasfout|schedule|langsnaad|verzet|bundel|kv|zwarting)\b/i.test(lower) &&
      (/\b(\d+(?:[.,]\d+)?\s*(?:meter|m\b|cm|mm|ci|curie)|lood|loden|pb|staal|fe|beton(?:nen)?|betonmuur|bakste(?:en|nen)|baksteenmuur|metselwerk|muur|afscherming|collimator|open\s+bundel|sterkste|zwakste|iridium|selenium|seleen|se-?75|ir-?192|zonder\s+(?:lood|afscherming|muur|beton|baksteen)|geen\s+(?:lood|afscherming|muur|beton|baksteen))\b/i.test(lower));

    if (isAfzettingDirect || isAfzettingVervolg) {
      intenties.push("afzetting");
      return intenties;
    }

    // Zwarting (inclusief praktijkschatting zwarting -> stralingstijd)
    if (/\b(zwarting\w*|optische\s+dichtheid|density)\b/i.test(lower) || /\bvan\s+\d+(?:[.,]\d+)?\s+naar\s+\d+(?:[.,]\d+)?\b/i.test(lower)) {
      intenties.push("zwarting");
      if (isZwartingTijdSchatting) {
        return intenties;
      }
    }

    // Schedule Wanddiktes & Buisafmetingen (ASME B36.10M / B36.19M)
    const isScheduleVraag =
      (/\b(schedule|schedules|sch\b|std|xs\b|xxs)\b/i.test(lower) &&
        /\b(wanddikte|dikte|dik|tabel|maten|afmetingen?|buitendiameter|binnendiameter|welke|wat\s+is|hoe\s+dik)\b/i.test(lower)) ||
      /\b(?:wat\s+is\s+de\s+)?(?:wand)?dikte\s+van\s+(?:een\s+)?\d+.*(?:schedule|sch\b)/i.test(lower) ||
      /\b(schedule\s*tabel|piping\s*schedule|pipe\s*schedule)\b/i.test(lower);
    if (isScheduleVraag && !isStralingstijdVraag && !intenties.includes("opnames")) {
      intenties.push("schedule");
    }

    // Filmkeuze (D2, D3, D4, D5, D7, D8)
    const isFilmKeuzeVraag =
      (/\b(d[234578]|filmkwaliteit|filmklasse|filmtype|filmsoort)\b/i.test(lower) &&
        /\b(mag|toegestaan|gebruiken|kiezen|nemen|toepassen|advies|kan\s*ik|welke)\b/i.test(lower)) ||
      /\bmag\s+.*(d[234578])\b/i.test(lower);
    if (isFilmKeuzeVraag) {
      intenties.push("film_keuze");
    }

    // Buiten bereik (zeer grote vaten/bundelbreedte)
    if (/\b(diameter\s+van\s+het\s+vat|vat.*belichten)\b/i.test(lower)) {
      intenties.push("buiten_bereik");
    }

    // Lasfouten & Acceptatiecriteria (lasfout.html) - vóór opstelling_info zodat "wat betekent een wormgat" niet als opstelling-synoniem wordt gezien
    const isLasfoutVraag =
      /\b(lasfout|lasfouten|lasfoutcode|gaspit|gaspitten|porie|porien|poriën|porositeit|nestporositeit|wormgat|wormgaten|slakinsluitsel|slaklijn|oxide[-\s]?insluitsel|wolfraaminsluitsel|bindingsfout|bindingsfouten|doorlassing|onvolkomen\s*doorlassing|geen\s*doorlassing|randinkarteling|inkarteling|doorbranden|doorbranding|eindkrater|kraterscheur|worteldoorzakking|teruggetrokken\s*wortel|wortelfout)\b/i.test(lower) ||
      (/\b(scheur|scheuren)\b/i.test(lower) && /\b(mag|toegestaan|toelaatbaar|acceptatie|norm|eis|eisen|level|asme|en|herken|foto|film)\b/i.test(lower)) ||
      (/\b(2011|2013|2014|2015|2016|301|303|304|401|402|5011|510|100|104)\b/.test(lower) && /\b(lasfout|fout|norm|level|asme|en|acceptatie|mag|toegestaan|groot|code)\b/i.test(lower)) ||
      (/\b(acceptatiecriteria|acceptatie|toegestaan|toelaatbaar|hoe\s*groot\s*mag)\b/i.test(lower) && /\b(level\s*[123]|en\s*level|iso\s*5817|iso\s*10675|asme|lasfout)\b/i.test(lower));

    if (isLasfoutVraag) {
      intenties.push("lasfout");
      return intenties;
    }

    // Opstelling info & Synoniemen / Groeperingen vraag
    const isDraadjeOfVerzetOfGradenVraag =
      /\b(draadje|draadjes|bki|iqi|verzet|hoeveel\s+graden|om\s+hoeveel\s+graden)\b/i.test(lower);
    const isOpstellingInfoVraag =
      !isDraadjeOfVerzetOfGradenVraag &&
      (/\b(groepering|groep|synoniem|synoniemen|betekent|betekenis)\b/i.test(lower) ||
        /\b(?:overzicht|lijst|alle)\s+(?:van\s+)?(?:de\s+)?opstellingen?\b/i.test(lower) ||
        /\b(verschil\s+tussen|wanneer\s+gebruik\s+(?:ik|je)|hoe\s+heet)\b.*?\b(opstelling|dwsi|swsi|dwdi|ovaaltje|superpositie|centraal|panoram|klasse\s*a|en-a|klasse\s*b|en-b)\b/i.test(lower) ||
        /\b(welke\s+(?:techniek|opstelling(?:en)?)|volgens\s+welke\s+(?:opstelling|techniek)|op\s+welke\s+manier\s+schiet\s+ik|hoe\s+(?:moet|kan)\s+ik.*schieten)\b/i.test(lower) ||
        (/\b(wat\s+(?:is|zijn|houdt)|welke\s+groep|vertel\s+(?:iets\s+)?over|uitleg\s+(?:over)?)\b/i.test(lower) &&
          /\b(opstelling\s*(?:[1258]|1[12345]|[a-g])|opstelling(?:en)?|dwsi|swsi|dwdi|dweb|eweb|dwdb|ovaaltje|superpositie|centraal|panoram\w*|cw|lw)\b/i.test(lower)));
    if (isOpstellingInfoVraag && !/\b(min\w*\s+ffd|fmin|stralingstijd|aantal\s+opnames|hoeveel\s+(?:opnames|films|foto|plaatjes))\b/i.test(lower)) {
      intenties.push("opstelling_info");
      return intenties;
    }

    // Verificatievragen "Mag ik ..." / "Kan ik ..." (uitsluitend voor opstelling/techniek/bron verificaties, niet voor buisspanning/kV of bron op de pijp FFD)
    const isBronOpDePijpVraag = /\bbron\s+op\s+de\s+(?:pijp|buis|leiding)\b/i.test(lower);
    const isMagIkBuisTechniek =
      !isBronOpDePijpVraag &&
      /\b(mag\s+ik|is\s+het\s+toegestaan|kan\s+ik\s+(?:.*?(?:schieten|stralen|gebruiken|toepassen|doen|maken)))\b/i.test(lower) &&
      !intenties.includes("film_keuze") &&
      !/\b(kv|buisspanning|spanning|kilovolt|cafe)\b/i.test(lower);
    if (isMagIkBuisTechniek) {
      intenties.push("mag_ik");
    }

    // Stralingstijd
    if (isStralingstijdVraag) {
      intenties.push("stralingstijd");
    }

    // Opnames / omtrek / hoekverdeling (graden draaien / aantal foto's / aantal shots)
    const lowerZonderFilm = lower.replace(/\b(d[234578]|d\s*[234578])\s+films?\b/gi, "").replace(/\bfilm(?:kwaliteit|type|klasse|soort)\b/gi, "");
    if (
      /\b(hoeveel|aantal)\s*(?:van\s+de\s+)?(films?|opname[ns]?|foto'?s?|shots?|platen|plaatjes)\b/i.test(lowerZonderFilm) ||
      /\b(hoe\s+vaak|hoeveel\s+keer|hoeveel\s+maal)\s*(?:moet\s+ik\s+)?(?:schieten|stralen|belichten|opnemen|verzetten)\b/i.test(lowerZonderFilm) ||
      /\b(films?|opname[ns]?|foto'?s?|shots?|platen|plaatjes)\s*(?:heb\s+ik\s+)?(?:nodig|moet\s+ik|maken|gebruiken|schieten|leggen|plakken)\b/i.test(lowerZonderFilm) ||
      /\bhoeveel\s+(?:foto'?s?|platen?|shots?|films?|opname[ns]?|plaatjes?)\b/i.test(lowerZonderFilm) ||
      /\b(?:om\s+)?hoeveel\s+graden\b.*?\b(?:draaien|verdraaien|verplaatsen|verschuiven|schieten|opname)\b/i.test(lowerZonderFilm) ||
      (/\b(omtrek|filmverdeling|opnameverdeling|aantal\s+posities|opnamelocaties?)\b/i.test(lowerZonderFilm) && !isStralingstijdVraag)
    ) {
      intenties.push("opnames");
    }

    // BKI Materiaaltabel / soorten / "bestaat ni bki"
    if (
      /\b(bki|draadje)\b/i.test(lower) &&
      (/\b(soorten|type|types|materiaal|tabel|norm)\b/i.test(lower) ||
        /\b(welk|welke)\b.*(inconel|hastelloy|monel|koper|aluminium|titanium|staal|nikkel)/i.test(lower) ||
        /\b(bestaat|is\s+er)\b.*\bni\b/i.test(lower) ||
        /\bni\s*(?:draadje|bki)\b/i.test(lower))
    ) {
      intenties.push("bki_materiaaltabel");
    } else if (
      !/\bverschil\s+tussen\s+(?:een\s+)?(?:draadje|draadjes)(?:\s*bki)?\s+en\s+(?:een\s+)?(?:gaatje|gat|plaatje)\b/i.test(lower) &&
      (/\b(draad|draadje|draadjes|bki|beeldkwaliteit|iq|iqi|gevoeligheid)\b/i.test(lower) ||
        /\b(welke\s+kwaliteit|welk[e]?\s+(?:beeld)?kwaliteit|kwaliteit\s+(?:moet|te|worden|behaald|behalen|zien))\b/i.test(lower) ||
        /\bwat\s+moet\s+(?:ik\s+)?(?:zien|zichtbaar\s+zijn)\s+op\s+de\s+film\b/i.test(lower) ||
        /\b(?:lastype\s*[abcd]|lascategorie\s*[abcd]|zonder\s+lasoverdikte|lasoverdikte)\b/i.test(lower) ||
        (/\bkwaliteit\b/i.test(lower) && !/\bfilm(?:kwaliteit)?\b/i.test(lower) && /\b(moet|zien|behalen|behaald|nodig|geëist|geeist)\b/i.test(lower)))
    ) {
      intenties.push("draadje");
    }

    // Bundel & Bundelbreedte (bundelbreedte.html)
    const isBundelBreedteVraag =
      /\b(bundel|bundelbreedte|bundelgrootte|stralingsbundel|openingshoek|volledig\s+te\s+belichten|volledig\s+belichten|volledig\s+uit\s*te\s*lichten|volledig\s+uitlichten|film\s+van\s+\d+\s*(?:cm|mm)\s+(?:belichten|uitlichten))\b/i.test(lower) ||
      (/\b(hoe\s+breed|breedte|dekking)\b/i.test(lower) && /\b(bundel|straling|stralingsbundel|focus)\b/i.test(lower)) ||
      (/\b(smalle\s*as|brede\s*as)\b/i.test(lower) && /\b(film|past|passen|dekking|belichten|uitlichten|focus|ffd)\b/i.test(lower)) ||
      (/\b(past|passen)\b/i.test(lower) && /\b(film|10x48|10x24|10x40|6x48|6x24)\b/i.test(lower) && /\b(focus|ffd|bundel|as)\b/i.test(lower)) ||
      (/\b(balteau|yxlon|smart\s*evo)\b/i.test(lower) && /\b(belichten|uitlichten|dekken|bundelbreedte|bundel)\b/i.test(lower)) ||
      (/\b(hoeveel|welke|minimale)\s*(?:focus|ffd|afstand)\b/i.test(lower) && /\b(belichten|uit\s*te\s*lichten|uitlichten|dekken|om\s+\d+.*?(?:cm|mm)|10x48|10x40|10x24|6x48|6x24)\b/i.test(lower));

    if (isBundelBreedteVraag) {
      if (!intenties.includes("buiten_bereik") && !intenties.includes("afzetting") && !isStralingstijdVraag && !isFocusVeranderingVraag) {
        intenties.push("bundel");
      }
    }

    // Minimale FFD & Afstand
    const isPuurFfdWaarde = /^(?:minimale\s+)?(?:ffd|sfd|focus)\s*(?:\(\s*\d+|\s*:\s*\d+|\s*=\s*\d+|\s+van\s+\d+|\s+is\s+\d+)/i.test(lower.trim());
    const wilMinFFDBijStraling =
      isStralingstijdVraag &&
      /\b(min\w*|kleinste)\s+(?:de\s+)?(ffd|sfd|focus|afstand|focusafstand)\b|\bals\s+ik.*(min|focus|ffd)\b/i.test(lower) &&
      !/\b(wat\s+is\s+de\s+(?:min\w*\s+)?(?:ffd|focus)\s+en\b)/i.test(lower);
    if (
      (/\b(min(?:imale|imum|\.)?\s*ffd|fmin|f-min|f\s+min|minimale\s+(?:focus|bron[-\s]*film|film[-\s]*focus)?\s*afstand|focus\s*afstand|bron\s*film|welke\s*ffd|wat\s+is\s+de\s+(?:min\s*)?ffd|gekozen\s*ffd|minimale\s+focus|hoeveel\s+focus|welke\s+focus|hoeveel\s+ffd|focus\s+aanhouden)\b/i.test(lower) ||
        /\b(?:heb ik|is er|is dit|is mijn|voldoe ik aan|hebben we)\s+(?:genoeg|voldoende)\s+(?:focus|ffd|sfd)\b/i.test(lower) ||
        /\b(?:genoeg|voldoende)\s+(?:focus|ffd|sfd)\b/i.test(lower) ||
        /\b(?:voldoe\s+ik\s+aan\s+(?:de\s+)?(?:minimale\s+)?(?:ffd|sfd|focus))\b/i.test(lower) ||
        /\b(?:hoe\s+ver|op\s+welke\s+afstand|welke\s+afstand|wat\s+is\s+de\s+afstand)\b.*?\b(?:bron|camera|focus|film|schieten|stralen|zetten|staan|aanhouden)\b/i.test(lower) ||
        /\bafstand\s+(?:van\s+de\s+)?(?:bron|focus|film)\b/i.test(lower) ||
        isBronOpDePijpVraag) &&
      !intenties.includes("mag_ik") &&
      !wilMinFFDBijStraling &&
      !isPuurFfdWaarde &&
      !isBundelBreedteVraag
    ) {
      intenties.push("min_ffd");
    }

    // Verzet
    if (/\b(verzet|hoeveel\s+verzet)\b/i.test(lower) || (/\b(ovaal|ovaaltje|opstelling\s*11)\b/i.test(lower) && intenties.length === 0)) {
      intenties.push("verzet");
    }

    // Gevulde leiding (gevuldeleiding.html)
    const isGevuldeLeidingVraag =
      /\b(gevulde?\s*(?:leiding|buis|pijp)|staalequivalent|staal\s*equivalent|extra\s+staaldikte|gevuld\s*met)\b/i.test(lower) ||
      (/\bgevuld\b/i.test(lower) && /\b(water|aardolie|olie|benzeen|benzine|aceton|chloorbenzeen|inhoud|vloeistof|medium)\b/i.test(lower)) ||
      (typeof actiefGespreksGeheugen !== "undefined" &&
        actiefGespreksGeheugen &&
        actiefGespreksGeheugen.laatsteIntentie === "gevulde_leiding" &&
        /\b(water|aardolie|olie|benzeen|benzine|aceton|chloorbenzeen|\d+\s*kg\/m)/i.test(lower));
    if (isGevuldeLeidingVraag) {
      intenties.push("gevulde_leiding");
      if (!isStralingstijdVraag && !/\b(kv|buisspanning)\b/i.test(lower)) {
        return ["gevulde_leiding"];
      }
    }

    // Bronverval op datum/periode (verval2.html)
    const isPuurTheorieHalfwaarde = /\b(wat\s+is\s+de\s+(?:halfwaardetijd|halveringstijd)|halfwaardetijd\s+van)\b/i.test(lower) && !/\b(over\s+\d+|na\s+\d+|\d+\s*dagen|\d+\s*weken|\d+\s*maanden|geleden|op\s+\d{1,2}[-\/]\d{1,2})\b/i.test(lower);
    const isBronVervalVraag =
      !isPuurTheorieHalfwaarde &&
      (/\b(bronverval|verval)\b/i.test(lower) ||
        (/\b(halfwaardetijd|halveringstijd)\b/i.test(lower) && /\b(over\s+\d+|na\s+\d+|\d+\s*dagen|\d+\s*weken|\d+\s*maanden|geleden|op\s+\d{1,2}[-\/]\d{1,2})\b/i.test(lower)) ||
        (/\b(activiteit|curie|ci)\b/i.test(lower) && /\b(over\s+\d+|na\s+\d+|\d+\s*dagen|\d+\s*weken|\d+\s*maanden|geleden|op\s+\d{1,2}[-\/]\d{1,2})\b/i.test(lower)) ||
        (/\b(over\s+\d+\s*(?:dagen|weken|maanden|jaar)|na\s+\d+\s*(?:dagen|weken|maanden|jaar)|\d+\s*(?:dagen|weken|maanden|jaar)\s+geleden)\b/i.test(lower) &&
          /\b(ci|curie|bron|se-75|ir-192|co-60|97969m|35598p|rr\d+)\b/i.test(lower)));
    if (isBronVervalVraag) {
      intenties.push("bron_verval");
    }

    // KV-regel & Max kV (kvregel.html)
    const isKVVraag =
      /\b(kv[-\s]?regel|buisspanning|kilovolt|max\s*kv|maximale\s*(?:buis)?spanning|hoeveel\s*kv|welke\s*kv|keverregel)\b/i.test(lower) ||
      (/\bkv\b/i.test(lower) && /\b(regel|buis|spanning|röntgen|rontgen|staal|aluminium|hdpe|kunststof|materiaal)\b/i.test(lower));
    if (isKVVraag) {
      intenties.push("kv_regel");
    }

    // Bronactiviteit (overzicht van bronnen of vraag naar de sterkte van bronnen)
    const isPuurActiviteitWaarde =
      /^(?:bron\s+)?[a-z0-9_-]+\s*(?:\(\s*\d+(?:[.,]\d+)?\s*(?:ci|curie)?\s*\))?$/i.test(lower.trim()) ||
      /^(?:\d+(?:[.,]\d+)?\s*(?:ci|curie)|(?:ci|curie)\s*\d+(?:[.,]\d+)?)$/i.test(lower.trim());

    const isActiviteitVraag =
      /\b(hoe\s+sterk|welke\s+(?:se-75|ir-192|selenium|iridium|gamma\s*)?bronnen|sterkste|sterkst|zwakste|zwakst|meeste\s*curie|minste\s*curie|overzicht\s+(?:van\s+)?bronnen|lijst\s+(?:van\s+)?bronnen|actuele\s+bronnen|wat\s+zijn\s+de\s+(?:se-75|ir-192|selenium|iridium\s*)?bronnen|wat\s+is\s+de\s+activiteit|hoeveel\s+(?:curie|ci)\s+(?:heeft|is|zijn|hebben))\b/i.test(lower) ||
      (/\bactiviteit\b/i.test(lower) && /\b(wat|welke|hoeveel|bekijk|toon|geef|lijst)\b/i.test(lower));

    if (isActiviteitVraag && !isStralingstijdVraag && !isBronVervalVraag && !isPuurActiviteitWaarde) {
      intenties.push("activiteit");
    }

    // Doorstraalde dikte
    if (/\b(doorstraalde\s*dikte|dubbele\s*wand|enkele\s*wand)\b/i.test(lower)) {
      intenties.push("doorstraalde_dikte");
    }

    // Centraal / panoramisch opstelling (of rondstraler)
    if (/\b(centraal|panoram|panoramisch|rondstraler|rondstralen)\b/i.test(lower)) {
      if (/\b(mag|toegestaan|kan\s*ik|geschikt|toelaatbaar)\b/i.test(lower)) {
        if (!intenties.includes("mag_ik")) intenties.push("mag_ik");
      } else if (!isStralingstijdVraag && !intenties.includes("draadje") && !intenties.includes("min_ffd") && !intenties.includes("opstelling_info")) {
        if (!intenties.includes("opnames")) intenties.push("opnames");
      }
    }

    if (intenties.length === 0) {
      intenties.push("overzicht");
    }

    return intenties;
  }

  // Helper om focus-afstanden om te rekenen naar centimeters (zoals gebruikt in focusverandering.html & bundelbreedte.html)
  function parseFocusAfstandCm(str) {
    if (!str) return null;
    const s = str.trim().toLowerCase();
    // "1 meter 20", "1 m 20", "1 meter 50"
    const m1 = s.match(/^(\d+)\s*(?:m|meter)\s*(\d{1,2})$/i);
    if (m1) {
      return parseInt(m1[1], 10) * 100 + parseInt(m1[2], 10);
    }
    // "1.2 meter", "1,2 m", "1 meter"
    const m2 = s.match(/^(\d+(?:[.,]\d+)?)\s*(?:m|meter)$/i);
    if (m2) {
      return Math.round(parseFloat(m2[1].replace(",", ".")) * 100);
    }
    // "80 cm", "56 cm"
    const m3 = s.match(/^(\d+(?:[.,]\d+)?)\s*cm$/i);
    if (m3) {
      return parseFloat(m3[1].replace(",", "."));
    }
    // "800 mm", "560 mm"
    const m4 = s.match(/^(\d+(?:[.,]\d+)?)\s*mm$/i);
    if (m4) {
      return parseFloat(m4[1].replace(",", ".")) / 10;
    }
    // Puur getal (bijv. "80", "56", "120", "800")
    const m5 = s.match(/^(\d+(?:[.,]\d+)?)$/);
    if (m5) {
      const val = parseFloat(m5[1].replace(",", "."));
      if (val >= 250) return val / 10; // mm -> cm (bijv. 800 mm -> 80 cm, 560 mm -> 56 cm)
      if (val <= 3) return val * 100; // meter -> cm (bijv. 1.2 m -> 120 cm)
      return val;
    }
    return null;
  }

  // --- Parameter Extractie ---
  function stripBronnamenUitTekst(txt) {
    let s = String(txt || "").replace(/\b(?:97969\s*m|35598\s*p|35041\s*p|rr\s*\d{3,5})\b/gi, " ");
    if (Array.isArray(bronnenData)) {
      for (const b of bronnenData) {
        if (!b || !b.name) continue;
        const esc = b.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        s = s.replace(new RegExp(`\\b${esc}\\b`, "gi"), " ");
        const mBron = b.name.match(/^(\d+)([a-z]+)$/i);
        if (mBron) {
          s = s.replace(new RegExp(`\\b${mBron[1]}\\s*${mBron[2]}\\b`, "gi"), " ");
        }
      }
    }
    return s;
  }

  function extractParametersDeterministisch(tekst) {
    const res = {
      diameter: null,
      wanddikte: null,
      sfd: null,
      ofa: null,
      procedure: null,
      asmeLastype: null,
      bronTekst: null,
      bronType: null,
      brongrootte: null,
      technique: null,
      optie: null,
      ovaaltje: null,
      opstelling: null,
      lasbreedte: null,
      activiteit: null,
      filmType: null,
      filmLengteMm: null,
      isPlaat: false,
      wilMinFFD: false,
      // Langsnaad parameters (LW_Verdeler.html)
      langsnaadLengte: null,
      langsnaadMaxDeel: null,
      langsnaadUiteinde: null,
      // Focus & Filmtype Calculator parameters (focusverandering.html)
      focusBegintijdSec: null,
      oudeFocus: null,
      nieuweFocus: null,
      oudeCi: null,
      nieuweCi: null,
      oudeFilmType: null,
      nieuweFilmType: null,
      maminVal: null,
      maVal: null,
      materiaalNaam: null,
      materiaalFactor: null,
      materiaalFactorHandmatig: null,
      materiaalObj: null,
      // Onstream & Afzetting parameters
      isOnstream: false,
      onstreamTechniek: null,
      onstreamKlasse: null,
      isolatieMm: null,
      pbMm: 0,
      aantalLoodplaten: null,
      feMm: 0,
      betonMm: 0,
      baksteenMm: 0,
      muurOnbekendMm: 0,
      dosisGrens: 10,
      // KV-regel, Gevulde leiding & Bronverval
      doorstraaldeDikte: null,
      isGevuldeLeiding: false,
      mediumNaam: null,
      mediumDichtheid: null,
      kv: null,
      vervalDagen: null,
      vervalDoelDatum: null,
      schedule: null,
      scheduleInfo: null,
      zwartingOud: null,
      zwartingNieuw: null,
    };
    const lower = tekst.toLowerCase();

    // Pipe Schedule herkenning (ASME B36.10M / B36.19M) - zowel "schedule 80" als "80 schedule"
    let matchSch = lower.match(/\b(?:schedule|sch|sched)[-\s]*([0-9]{1,3}[a-z]?|std|xs|xxs)\b/i);
    if (!matchSch) {
      matchSch = lower.match(/\b([0-9]{1,3}[a-z]?)\s*(?:schedule|sch|sched)\b/i);
    }
    if (!matchSch) {
      matchSch = lower.match(/\b(std|xs|xxs)\b/i);
    }
    if (matchSch) {
      res.schedule = normaliseerScheduleSleutel(matchSch[1]);
    }

    // Onstream herkenning
    if (/\b(onstream|on\s*stream|rt\s*[-]?\s*21021|rt\s*[-]?\s*21022|rt\s*[-]?\s*21-?02-?[12])\b/i.test(lower)) {
      res.isOnstream = true;
    }
    if (/\btangentiaal|rt\s*[-]?\s*21021|rt\s*[-]?\s*21-?02-?1\b/i.test(lower)) {
      res.onstreamTechniek = "tangentiaal";
    } else if (/\bdubbelwand|dubbel\s*wand|rt\s*[-]?\s*21022|rt\s*[-]?\s*21-?02-?2\b/i.test(lower)) {
      res.onstreamTechniek = "dubbelwand";
    }
    if (/\b(tb|klasse\s*tb|improved)\b/i.test(lower)) {
      res.onstreamKlasse = "tb";
    } else if (/\b(ta|klasse\s*ta|basic|basis)\b/i.test(lower)) {
      res.onstreamKlasse = "ta";
    }

    if (typeof actiefGespreksGeheugen !== "undefined" && actiefGespreksGeheugen && actiefGespreksGeheugen.verwachtParameter === "onstreamKlasse") {
      if (/^\s*(?:klasse\s*)?(?:tb|b|improved)\s*$/i.test(tekst.trim())) {
        res.onstreamKlasse = "tb";
      } else if (/^\s*(?:klasse\s*)?(?:ta|a|basic|basis)\s*$/i.test(tekst.trim())) {
        res.onstreamKlasse = "ta";
      }
    }

    if (/\b(geen\s*isolatie|geen\s*isolatiedikte|zonder\s*isolatie|zonder\s*isolatiedikte|onge[iï]soleerd|niet\s*ge[iï]soleerd|0\s*mm\s*isolatie|0\s*mm\s*isolatiedikte)\b/i.test(lower)) {
      res.isolatieMm = 0;
    } else {
      let matchIso = tekst.match(/(?:isolatie|isolatiedikte)\s*(?:van|is|op|:)?\s*(\d+(?:[.,]\d+)?)\s*(cm|centimeter|mm)?/i);
      if (!matchIso) {
        matchIso = tekst.match(/(\d+(?:[.,]\d+)?)\s*(cm|centimeter|mm)?\s*(?:isolatie|isolatiedikte)\b/i);
      }
      if (matchIso) {
        let isoVal = parseFloat(matchIso[1].replace(",", "."));
        const unit = (matchIso[2] || "").toLowerCase();
        if (unit.startsWith("c")) isoVal *= 10;
        res.isolatieMm = isoVal;
      }
    }

    if (typeof actiefGespreksGeheugen !== "undefined" && actiefGespreksGeheugen && actiefGespreksGeheugen.verwachtParameter === "isolatieMm") {
      if (/^\s*(?:geen|nee|zonder|0|0\s*mm|onge[iï]soleerd|niet|geen\s*isolatie|geen\s*isolatiedikte|ongeisoleerd)\b/i.test(tekst.trim())) {
        res.isolatieMm = 0;
      }
    }

    // Lascompensatie (standaard 5 mm, aanpasbaar door gebruiker, bijv. "met 3 mm compensatie", "lascompensatie 4 mm", "zonder compensatie")
    if (/\b(?:zonder|geen|0\s*mm)\s+(?:las)?compensatie\b/i.test(lower) || /\b(?:las)?compensatie\s*(?:op|is|=|naar)?\s*0(?:\s*mm)?\b/i.test(lower)) {
      res.lascompensatie = 0;
    } else {
      let matchComp = tekst.match(/(?:las)?compensatie\s*(?:van|is|op|naar|:|=)?\s*(\d+(?:[.,]\d+)?)\s*(?:mm)?/i);
      if (!matchComp) {
        matchComp = tekst.match(/(\d+(?:[.,]\d+)?)\s*(?:mm)?\s*(?:las)?compensatie\b/i);
      }
      if (!matchComp) {
        matchComp = tekst.match(/(?:lasoverhoogte|overdikte)\s*(?:van|is|op|naar|:|=)?\s*(\d+(?:[.,]\d+)?)\s*(?:mm)?/i);
      }
      if (matchComp) {
        res.lascompensatie = parseFloat(matchComp[1].replace(",", "."));
      }
    }

    // Aantal loodplaten (bedrijfsstandaard: 1 loodplaat = 6 mm Pb, 2 loodplaten = 12 mm Pb, etc.)
    const matchAantalPlaten =
      lower.match(/\b(\d+|een|één|twee|drie|vier|vijf|zes|dubbel|dubbele|drievoudig|drievoudige)\s+(?:stuks?\s+)?(?:loodplaten|loodplaat|loden\s*platen|loden\s*plaat|lood\s*platen|lood\s*plaat)\b/i) ||
      lower.match(/\b(?:loodplaten|loodplaat|loden\s*platen|loden\s*plaat|lood\s*platen|lood\s*plaat)\s*(?:van|x|\*|aantal|:\s*)?\s*(\d+)\b/i);

    let platenAantal = null;
    if (matchAantalPlaten) {
      const gStr = matchAantalPlaten[1].toLowerCase();
      const wMap = {
        een: 1, één: 1,
        twee: 2, dubbel: 2, dubbele: 2,
        drie: 3, drievoudig: 3, drievoudige: 3,
        vier: 4,
        vijf: 5,
        zes: 6,
      };
      platenAantal = wMap[gStr] !== undefined ? wMap[gStr] : parseInt(gStr, 10);
    } else if (/\b(?:loodplaat|loodplaten|loden\s*plaat|loden\s*platen|lood\s*plaat|lood\s*platen)\b/i.test(lower)) {
      platenAantal = 1;
    }

    // Afzetting parameters
    let matchPb = tekst.match(/(?:lood|pb)\s*(?:afscherming\s*)?(?:van|is|op|:)?\s*(\d+(?:[.,]\d+)?)\s*(?:mm)?/i);
    if (!matchPb) {
      matchPb = tekst.match(/(\d+(?:[.,]\d+)?)\s*(?:mm)?\s*(?:lood|pb)(?!\s*platen|\s*plaat)(?:\s*afscherming)?\b/i);
    }
    if (matchPb && !platenAantal) {
      res.pbMm = parseFloat(matchPb[1].replace(",", "."));
    } else if (platenAantal && platenAantal > 0) {
      res.aantalLoodplaten = platenAantal;
      res.pbMm = platenAantal * 6;
      matchPb = [`${platenAantal} loodplaten`, `${res.pbMm}`];
    }
    if (/\b(zonder\s+(?:lood|pb|afscherming)|geen\s+(?:lood|pb|afscherming)|0\s*mm\s*(?:lood|pb))\b/i.test(lower)) {
      res.pbMm = 0;
      res.feMm = 0;
      res.betonMm = 0;
      res.baksteenMm = 0;
      res.muurOnbekendMm = 0;
      res.verzetZonderAfscherming = true;
    }
    if (/\b(zonder|geen)\s+(?:beton(?:nen)?|betonmuur|muur)\b/i.test(lower)) {
      res.betonMm = 0;
      res.muurOnbekendMm = 0;
      res.verzetZonderAfscherming = true;
    }
    if (/\b(zonder|geen)\s+(?:bakste(?:en|nen)|baksteenmuur|metselwerk|muur)\b/i.test(lower)) {
      res.baksteenMm = 0;
      res.muurOnbekendMm = 0;
      res.verzetZonderAfscherming = true;
    }

    const isAfschermingContext =
      /\b(afzetting|afzettingsafstand|afzetten|afzettingszone|afscherming|afschermen|lood|loden|pb|beton(?:nen)?|betonmuur|bakste(?:en|nen)|baksteenmuur|metselwerk|muur|tussenmuur|scheidingsmuur|dosis|dosistempo|microsievert|usv|µsv|halveringsdikte|hvl)\b/i.test(lower) ||
      (typeof actiefGespreksGeheugen !== "undefined" && actiefGespreksGeheugen && (actiefGespreksGeheugen.laatsteIntentie === "afzetting" || actiefGespreksGeheugen.verwachtParameter === "muurMateriaal"));
    if (isAfschermingContext) {
      let matchFe = tekst.match(/(?:staal|fe|ijzer)\s*(?:afscherming\s*)?(?:van|is|op|:)?\s*(\d+(?:[.,]\d+)?)\s*(?:mm)?/i);
      if (!matchFe) {
        matchFe = tekst.match(/(\d+(?:[.,]\d+)?)\s*(?:mm)?\s*(?:staal|fe|ijzer)(?:\s*afscherming)?\b/i);
      }
      if (matchFe) res.feMm = parseFloat(matchFe[1].replace(",", "."));

      // Beton (betonnen muur / betonmuur / betonwand / beton in mm, cm of < 1 m)
      let matchBeton = tekst.match(/(?:beton(?:nen)?(?:\s*(?:muur|wand))?|betonmuur|betonwand)\s*(?:er\s*)?(?:tussen\s*)?(?:van|is|met|:)?\s*(\d+(?:[.,]\d+)?)\s*(mm|millimeter|cm|centimeter|m\b|meter)?/i);
      if (!matchBeton) {
        matchBeton = tekst.match(/(\d+(?:[.,]\d+)?)\s*(mm|millimeter|cm|centimeter|m\b|meter)?\s*(?:dikke?\s+)?(?:beton(?:nen)?(?:\s*(?:muur|wand))?|betonmuur|betonwand)\b/i);
      }
      if (matchBeton) {
        let bVal = parseFloat(matchBeton[1].replace(",", "."));
        const bUnit = (matchBeton[2] || "").toLowerCase();
        const isOnrealistischeMeter = (bUnit === "m" || bUnit === "meter") && bVal >= 1;
        if (!isOnrealistischeMeter) {
          if (bUnit === "cm" || bUnit === "centimeter") bVal *= 10;
          else if (bUnit === "m" || bUnit === "meter") bVal *= 1000;
          else if (!bUnit && bVal <= 40) bVal *= 10; // bijv. "betonnen muur van 20" = 20 cm = 200 mm
          if (bVal > 0 && bVal <= 1000) res.betonMm = Math.round(bVal);
        }
      }

      // Baksteen (bakstenen muur / baksteenmuur / stenen muur / metselwerk in mm, cm of < 1 m)
      let matchBaksteen = tekst.match(/(?:bakste(?:en|nen)(?:\s*(?:muur|wand))?|baksteenmuur|stenen\s*(?:muur|wand)|metselwerk(?:\s*muur)?)\s*(?:er\s*)?(?:tussen\s*)?(?:van|is|met|:)?\s*(\d+(?:[.,]\d+)?)\s*(mm|millimeter|cm|centimeter|m\b|meter)?/i);
      if (!matchBaksteen) {
        matchBaksteen = tekst.match(/(\d+(?:[.,]\d+)?)\s*(mm|millimeter|cm|centimeter|m\b|meter)?\s*(?:dikke?\s+)?(?:bakste(?:en|nen)(?:\s*(?:muur|wand))?|baksteenmuur|stenen\s*(?:muur|wand)|metselwerk)\b/i);
      }
      if (matchBaksteen) {
        let mVal = parseFloat(matchBaksteen[1].replace(",", "."));
        const mUnit = (matchBaksteen[2] || "").toLowerCase();
        const isOnrealistischeMeter = (mUnit === "m" || mUnit === "meter") && mVal >= 1;
        if (!isOnrealistischeMeter) {
          if (mUnit === "cm" || mUnit === "centimeter") mVal *= 10;
          else if (mUnit === "m" || mUnit === "meter") mVal *= 1000;
          else if (!mUnit && mVal <= 40) mVal *= 10;
          if (mVal > 0 && mVal <= 1000) res.baksteenMm = Math.round(mVal);
        }
      }

      // Antwoord op de vervolgvraag "Gaat het om beton of baksteen?"
      if (
        res.betonMm === 0 &&
        res.baksteenMm === 0 &&
        typeof actiefGespreksGeheugen !== "undefined" &&
        actiefGespreksGeheugen &&
        actiefGespreksGeheugen.muurOnbekendMm > 0
      ) {
        if (/\b(beton|betonnen)\b/i.test(lower)) {
          res.betonMm = actiefGespreksGeheugen.muurOnbekendMm;
          res.muurOnbekendMm = 0;
        } else if (/\b(baksteen|bakstenen|metselwerk|steen|stenen)\b/i.test(lower)) {
          res.baksteenMm = actiefGespreksGeheugen.muurOnbekendMm;
          res.muurOnbekendMm = 0;
        }
      }

      // Onbekend muurmateriaal ("er zit een muur van 10cm tussen") -> vraag beton of baksteen!
      // Let op: NOOIT "op X meter" (dat is de meet-/afzettingsafstand, geen muurdikte!)
      if (res.betonMm === 0 && res.baksteenMm === 0) {
        let matchMuur = tekst.match(/\b(?:muur|muren|tussenmuur|scheidingsmuur|tussenwand|scheidingswand)\s*(?:er\s*)?(?:tussen\s*)?(?:van|is|met|:)\s*(\d+(?:[.,]\d+)?)\s*(mm|millimeter|cm|centimeter|m\b|meter)?/i);
        if (!matchMuur) {
          matchMuur = tekst.match(/(\d+(?:[.,]\d+)?)\s*(mm|millimeter|cm|centimeter|m\b|meter)?\s*(?:dikke?\s+)?(?:muur|tussenmuur|scheidingsmuur|tussenwand|scheidingswand)\b/i);
        }
        if (matchMuur) {
          let uVal = parseFloat(matchMuur[1].replace(",", "."));
          const uUnit = (matchMuur[2] || "").toLowerCase();
          const isOnrealistischeMeter = (uUnit === "m" || uUnit === "meter") && uVal >= 1;
          if (!isOnrealistischeMeter) {
            if (uUnit === "cm" || uUnit === "centimeter") uVal *= 10;
            else if (uUnit === "m" || uUnit === "meter") uVal *= 1000;
            else if (!uUnit && uVal <= 40) uVal *= 10;
            if (uVal > 0 && uVal <= 1000) res.muurOnbekendMm = Math.round(uVal);
          }
        }
      }

      // Sub-modus detectie (lood_nodig, dosistempo_op_afstand, afzettingsafstand)
      const vraagtLoodNodig =
        /\b(?:hoeveel|welke)\s+(?:mm\s+|millimeter\s+)?(?:lood|loden|pb|afscherming|loodafscherming|extra\s+lood)\b/i.test(lower) ||
        /\b(?:lood|loden|pb|afscherming|loodafscherming)\b.*?\b(?:nodig|gebruiken|vereist|plaatsen|hebben|om\s+(?:op|binnen|onder|een\s+afzetting)|voor\s+\d+\s*(?:meter|m\b))\b/i.test(lower) ||
        /\b(?:nodig|gebruiken|hebben)\b.*?\b(?:lood|loden|pb|afscherming|loodafscherming)\b/i.test(lower) ||
        /\b(?:maximaal|max\.?|binnen|op)\s+\d+(?:[.,]\d+)?\s*(?:meter|m\b)\s*(?:kan\s+)?(?:afzetten|afzetting)\b.*?\b(?:lood|loden|pb|afscherming)\b/i.test(lower);

      const vraagtDosistempo =
        !vraagtLoodNodig &&
        /\b(wat\s+is\s+(?:het|de)\s+dosistempo|hoe\s+hoog\s+is\s+(?:het|de)\s+dosistempo|hoeveel\s+(?:microsievert|usv|µsv)|dosistempo\s+(?:op|bij|achter|daar))\b/i.test(lower);

      const isAlInDosistempoModus =
        typeof actiefGespreksGeheugen !== "undefined" &&
        actiefGespreksGeheugen &&
        actiefGespreksGeheugen.afzettingSubModus === "dosistempo_op_afstand";

      const vraagtAfzettingsAfstand =
        !vraagtLoodNodig &&
        !vraagtDosistempo &&
        (/\b(hoe\s+ver.*afzetten|hoe\s+groot.*afzetting|wat\s+(?:is|wordt)\s+de\s+afzetting(?:safstand)?|veilige\s+afzetting|afzetting\s+met\s+\d+\s*(?:mm\s*)?(?:lood|pb|staal))\b/i.test(lower) ||
          (!isAlInDosistempoModus && matchPb !== null && !/\b\d+(?:[.,]\d+)?\s*(?:meter|m\b)\b/i.test(lower)));

      if (vraagtLoodNodig) {
        res.afzettingSubModus = "lood_nodig";
      } else if (vraagtDosistempo) {
        res.afzettingSubModus = "dosistempo_op_afstand";
      } else if (vraagtAfzettingsAfstand) {
        res.afzettingSubModus = "afzettingsafstand";
      }

      // Doel-afstand in meter (bronnaam zoals "97969M" of "97969 M" nooit als meter interpreteren!)
      const tekstVoorMeter = stripBronnamenUitTekst(lower);

      const mDoelM =
        tekstVoorMeter.match(/(?:op|bij|binnen|naar|voor|van|maximaal|max\.?|tot)\s*(\d+(?:[.,]\d+)?)\s*(?:meter|m\b)/i) ||
        tekstVoorMeter.match(/(\d+(?:[.,]\d+)?)\s*(?:meter|m\b)\s*(?:afzetten|afzetting|afstand)/i) ||
        tekstVoorMeter.match(/\b(\d+(?:[.,]\d+)?)\s*(?:meter|m\b)\b/i);
      if (mDoelM) {
        res.afzettingDoelMeter = parseFloat(mDoelM[1].replace(",", "."));
      } else if (
        typeof actiefGespreksGeheugen !== "undefined" &&
        actiefGespreksGeheugen &&
        actiefGespreksGeheugen.verwachtParameter === "afzettingDoelMeter"
      ) {
        const mBareM = tekstVoorMeter.match(/^\s*(?:op\s+|bij\s+)?(\d+(?:[.,]\d+)?)\s*(?:meter|m)?\s*$/i);
        if (mBareM) {
          res.afzettingDoelMeter = parseFloat(mBareM[1].replace(",", "."));
        }
      }
    }

    const matchDosis = tekst.match(/(\d+(?:[.,]\d+)?)\s*(?:usv|µsv|microsievert)/i);
    if (matchDosis) res.dosisGrens = parseFloat(matchDosis[1].replace(",", "."));

    // Procedures
    if (/\b(en[-\s]?a|klasse\s*a)\b/i.test(lower)) res.procedure = "EN-A";
    else if (/\b(en[-\s]?b|klasse\s*b)\b/i.test(lower)) res.procedure = "EN-B";
    else if (/\basme\b/i.test(lower)) res.procedure = "ASME";

    // ASME Lastype (A/B/C/D) voor optionele lasoverdikte bij draadjesberekening
    const matchLastype = lower.match(/\b(?:lastype|lascategorie|type\s*las|categorie)\s*([abcd])\b/i);
    if (matchLastype) {
      res.asmeLastype = matchLastype[1].toUpperCase();
    } else if (/\bzonder\s+lasoverdikte\b/i.test(lower)) {
      res.asmeLastype = "GEEN";
    }

    // Opstelling herkenning & Groeperingen (EN ISO 17636-1 / ASME)
    // 1. DWDI: 11/F (ovaal), 12/G (superpositie)
    if (/\b(opstelling\s*(?:11\s*[\/-]?\s*f|11\b|f\b)|ovaal|ovaaltje|opnames?\s+met\s+verzet)\b/i.test(lower)) {
      res.technique = "DWDI";
      res.ovaaltje = "Ja";
      res.opstelling = "Opstelling 11/F (DWDI ovaal)";
    } else if (/\b(opstelling\s*(?:12\s*[\/-]?\s*g|12\b|g\b)|superpositie|loodrecht\s+door\s+de\s+las)\b/i.test(lower)) {
      res.technique = "DWDI";
      res.ovaaltje = "Nee";
      res.opstelling = "Opstelling 12/G (DWDI superpositie)";
    }
    // 2. SWSI: 5/A (centraal / rondstraler), 8/B (excentrisch), 2/C (buis contact), 1 (plaat)
    else if (/\b(opstelling\s*(?:5\s*[\/-]?\s*a|5\b|a\b)|centraal|centrale\s+opstelling|panoram|panoramisch|rondstraler|rondstralen|rondstralend)\b/i.test(lower)) {
      res.technique = "SWSI";
      res.optie = "1";
      res.opstelling = "Opstelling 5/A (SWSI centraal)";
    } else if (/\b(opstelling\s*(?:8\s*[\/-]?\s*b|8\b|b\b)|excentrisch|excentrische\s+opstelling)\b/i.test(lower)) {
      res.technique = "SWSI";
      res.optie = "2";
      res.opstelling = "Opstelling 8/B (SWSI excentrisch)";
    } else if (/\b(opstelling\s*1\b|vlakke\s+plaat|plaat)\b/i.test(lower) && !/\b(opstelling\s*1[12345])\b/i.test(lower)) {
      res.technique = "SWSI";
      res.isPlaat = true;
      res.optie = "3";
      res.opstelling = "Opstelling 1 (SWSI vlakke plaat)";
    } else if (/\b(opstelling\s*(?:2\s*[\/-]?\s*c|2\b|c\b))\b/i.test(lower)) {
      res.technique = "SWSI";
      res.optie = "";
      res.opstelling = "Opstelling 2/C (SWSI buis)";
    }
    // 3. DWSI: 13/E (X-ray), 14/E (gamma), E, 15
    else if (/\b(opstelling\s*(?:13\s*[\/-]?\s*e|13\b))\b/i.test(lower)) {
      res.technique = "DWSI";
      res.opstelling = "Opstelling 13/E (DWSI X-ray)";
      if (!res.bronTekst) res.bronTekst = "X-ray";
    } else if (/\b(opstelling\s*(?:14\s*[\/-]?\s*e|14\b))\b/i.test(lower)) {
      res.technique = "DWSI";
      res.opstelling = "Opstelling 14/E (DWSI gamma)";
      if (!res.bronTekst) res.bronTekst = "Gamma bron";
    } else if (/\b(opstelling\s*e\b|opstelling\s*13\s*[\/-]?\s*14)\b/i.test(lower)) {
      res.technique = "DWSI";
      res.opstelling = "Opstelling E (DWSI)";
    } else if (/\b(opstelling\s*15\b)\b/i.test(lower)) {
      res.technique = "DWSI";
      res.opstelling = "Opstelling 15 (DWSI)";
    }
    // Generieke technieken als er geen specifieke opstelling genoemd is
    else {
      if (/\bdwsi\b/i.test(lower)) res.technique = "DWSI";
      else if (/\bswsi\b/i.test(lower)) res.technique = "SWSI";
      else if (/\bdwdi\b/i.test(lower)) res.technique = "DWDI";
    }

    // Diameter
    let diaHeeftEenheid = false;
    const tZonderXrayBuis = tekst.replace(/\b(?:x[-\s]?ray\s*buis|xray\s*buis|röntgenbuis|rontgenbuis)\b/gi, "xraybron");

    // Directe DN check (bijv. DN50, DN 50, DN150 direct mappen naar buitendiameter De)
    const matchDn = tZonderXrayBuis.match(/\bdn\s*[-]?\s*(\d+)\b/i);
    if (matchDn && DN_MATEN[matchDn[1]]) {
      res.diameter = DN_MATEN[matchDn[1]];
      diaHeeftEenheid = true;
    }

    // Check "rond <getal> mm" (ambigu tussen diameter en omtrek)
    const matchRondDia = tZonderXrayBuis.match(/\brond\s+(\d+(?:[.,]\d+)?)\s*(mm|cm|meter|m\b)\b/i);
    if (matchRondDia && res.diameter === null && !res.isPlaat) {
      let rVal = parseFloat(matchRondDia[1].replace(",", "."));
      const rUnit = (matchRondDia[2] || "").toLowerCase();
      if (rUnit.startsWith("m") && rUnit !== "mm") rVal *= 1000;
      else if (rUnit === "cm") rVal *= 10;
      res.diameter = rVal;
      res.isRondAmbigu = true;
      diaHeeftEenheid = true;
    }

    let matchDia = tZonderXrayBuis.match(
      /(?:diameter|buis|pijp|leiding|rondnaad|cw|ketel|tank|\bde\b)\s*(?:van|is|op|:)?\s*(\d+(?:[.,]\d+)?)\b\s*(mm|cm|meter|m\b)?(?!\s*(?:(?:mm|cm|meter|m\b)\s*)?(?:dik\b|dek\b|dijk\b|(?:wanddikte|dikte)\b(?!\s*(?:van|is|op|:)?\s*\d)))/i,
    );
    if (!matchDia && res.diameter === null) {
      matchDia = tZonderXrayBuis.match(/(\d+(?:[.,]\d+)?)\b\s*(mm|cm|meter|m\b)?\s*(?:diameter|rondnaad|cw|buis|pijp|leiding)(?!\s*(?:(?:mm|cm|meter|m\b)\s*)?(?:dik\b|dek\b|dijk\b|(?:wanddikte|dikte)\b(?!\s*(?:van|is|op|:)?\s*\d)))/i);
    }
    if (matchDia && !res.isPlaat && res.diameter === null) {
      let dVal = parseFloat(matchDia[1].replace(",", "."));
      const unit = (matchDia[2] || "").toLowerCase();
      if (unit.startsWith("m") && unit !== "mm") {
        dVal *= 1000;
        diaHeeftEenheid = true;
      } else if (unit === "cm") {
        dVal *= 10;
        diaHeeftEenheid = true;
      } else if (unit === "mm") {
        diaHeeftEenheid = true;
      }
      res.diameter = dVal;
    }

    // Langsnaad parameters (LW_Verdeler.html)
    let matchLw = tekst.match(/(?:langsnaad|langs\s*naad|lw)\s*(?:lengte)?\s*(?:van|is|op|:)?\s*(\d+(?:[.,]\d+)?)\s*(meter|m\b|cm|mm)?/i);
    if (!matchLw) {
      matchLw = tekst.match(/(\d+(?:[.,]\d+)?)\s*(meter|m\b|cm|mm)?\s*(?:lange\s+)?(?:langsnaad|langs\s*naad)/i);
    }
    if (!matchLw && (/\b(langsnaad|langs\s*naad|lw\s*verdeler|verdeel|verdelen|verdeling)\b/i.test(lower) || (typeof actiefGespreksGeheugen !== "undefined" && actiefGespreksGeheugen && actiefGespreksGeheugen.laatsteIntentie === "langsnaad"))) {
      matchLw = tekst.match(/(?:lengte|verdel(?:en|ing)|totaal|totale\s*lengte)\s*(?:van|is|op|:)?\s*(\d+(?:[.,]\d+)?)\s*(meter|m\b|cm|mm)?/i);
      if (!matchLw) {
        matchLw = tekst.match(/\b(\d+(?:[.,]\d+)?)\s*(meter|m\b|cm|mm)\b/i);
      }
    }
    if (matchLw) {
      let val = parseFloat(matchLw[1].replace(",", "."));
      const unit = (matchLw[2] || "").toLowerCase();
      if (unit.startsWith("m") && unit !== "mm") {
        val *= 1000;
      } else if (unit === "cm") {
        val *= 10;
      } else if (!unit) {
        if (val < 20) {
          val *= 1000;
        }
      }
      res.langsnaadLengte = Math.round(val);
    }

    const matchUiteinde = tekst.match(/(?:uiteinde|uiteinden|eindes?)\s*(?:van|is|op|:)?\s*(\d+(?:[.,]\d+)?)\s*(?:mm)?/i);
    if (matchUiteinde) {
      res.langsnaadUiteinde = parseFloat(matchUiteinde[1].replace(",", "."));
    }
    const matchMaxDeel = tekst.match(/(?:max(?:imale)?\s*(?:lengte|deel|afstand)?|tussenafstand\s*max)\s*(?:van|is|op|:)?\s*(\d+(?:[.,]\d+)?)\s*(?:mm)?/i);
    if (matchMaxDeel) {
      res.langsnaadMaxDeel = parseFloat(matchMaxDeel[1].replace(",", "."));
    }

    // Wanddikte (tekstZonderDiaEnFfd voorkomt dat diameter- of FFD-getal matcht op woord wand/dikte dat er vlakbij staat)
    const tekstZonderDiaEnFfd = tekst
      .replace(/diameter\s*\d+(?:[.,]\d+)?\s*(?:mm)?/gi, "")
      .replace(/(?:ffd|sfd|focus\s*afstand)\s*(?:van|is|op|:)?\s*\d+(?:[.,]\d+)?\s*(?:mm|cm|meter|m\b)?/gi, "")
      .replace(/\b\d+(?:[.,]\d+)?\s*(?:mm|cm|meter|m\b)?\s*(?:ffd|sfd)\b/gi, "");
    const matchWtAchter = tekstZonderDiaEnFfd.match(/(\d+(?:[.,]\d+)?)[-\s]*(?:mm\s*)?(?:dik|dikte|wanddikte|dek|dijk)\b/i);
    const matchWtWand = tekstZonderDiaEnFfd.match(/(\d+(?:[.,]\d+)?)\s*(?:mm\s*)?wand\b/i);
    const matchWtVoor = tekstZonderDiaEnFfd.match(/(?:wanddikte|dikte|wand|\bt\b)\s*(?:van|is|op|:)?\s*(\d+(?:[.,]\d+)?)/i);
    if (matchWtAchter) res.wanddikte = parseFloat(matchWtAchter[1].replace(",", "."));
    else if (matchWtWand) res.wanddikte = parseFloat(matchWtWand[1].replace(",", "."));
    else if (matchWtVoor) res.wanddikte = parseFloat(matchWtVoor[1].replace(",", "."));
    else if (res.isPlaat) {
      const matchPlaatDikte = tekst.match(/(?:plaat\s*(?:schieten|lassen)?\s*(?:van)?\s*)(\d+(?:[.,]\d+)?)\s*(?:mm)?/i);
      if (matchPlaatDikte) res.wanddikte = parseFloat(matchPlaatDikte[1].replace(",", "."));
    }
    if (res.wanddikte === null) {
      const matchPlaatDikte = tekst.match(/(?:plaat|plaats)\s*(?:schiet(?:en)?|las(?:sen)?)?\s*(?:van)?\s*(\d+(?:[.,]\d+)?)\s*(?:mm)?/i);
      if (matchPlaatDikte) {
        res.wanddikte = parseFloat(matchPlaatDikte[1].replace(",", "."));
        res.isPlaat = true;
      }
    }
    if (res.wanddikte === null && /\b(draadje|bki)\b/i.test(lower)) {
      const tekstZonderDiaRondnaad = tekst
        .replace(/(?:rondnaad|buis|pijp|leiding|diameter|\bde\b)\s*(?:van|is|op|:)?\s*\d+(?:[.,]\d+)?\s*(?:mm|cm|meter|m\b)?/gi, "")
        .replace(/\b\d+(?:[.,]\d+)?\s*(?:meter|m\b|cm|duim|duimer|duims|inch)\b/gi, "");
      const matchDraadjeDikte = tekstZonderDiaRondnaad.match(/(?:van|op|bij)\s*(\d+(?:[.,]\d+)?)\s*(?:mm)?(?!\s*(?:meter|m\b|cm|duim|duimer|inch|kv|curie|ci))/i);
      if (matchDraadjeDikte) {
        res.wanddikte = parseFloat(matchDraadjeDikte[1].replace(",", "."));
      }
    }
    if (res.wanddikte === null) {
      const tZonderDiaEnSchVoorMat = tekst
        .replace(/(?:diameter|buis|pijp|leiding|\bde\b)\s*\d+(?:[.,]\d+)?\s*(?:mm)?/gi, "")
        .replace(/\b(?:schedule|sch)\s*[a-z0-9]+\b/gi, "")
        .replace(/(?:lasbreedte|naadbreedte|las\s*breedte|focus|brongrootte|bron|ffd|sfd|verzet|isolatie|isolatiedikte)\s*(?:van|is|op|:)?\s*\d+(?:[.,]\d+)?\s*(?:mm)?/gi, "");
      const matchWtMat = tZonderDiaEnSchVoorMat.match(/(?:op|bij|voor)?\s*(\d+(?:[.,]\d+)?)\s*(?:mm)?\s*(?:staal|aluminium|alu|hdpe|pe|kunststof)\b/i);
      if (matchWtMat) {
        res.wanddikte = parseFloat(matchWtMat[1].replace(",", "."));
      } else if (res.diameter !== null) {
        const matchVanMm = tZonderDiaEnSchVoorMat.match(/\b(?:van|met)\s+(\d+(?:[.,]\d+)?)\s*mm\b(?!\s*(?:isolatie|isolatiedikte|lood|pb|staal|fe|ffd|sfd|focus|focusgrootte|brongrootte|bron|lasbreedte|afstand))/i);
        if (matchVanMm) {
          const vMm = parseFloat(matchVanMm[1].replace(",", "."));
          if (vMm > 0 && vMm < 100) {
            res.wanddikte = vMm;
          }
        }
      }
    }

    // Doorstraalde dikte (eerste-klas parameter conform gebruikersinstructie)
    let matchDoorstr = tekst.match(/(?:doorstraalde\s*dikte|doorstraald(?:e)?|staalequivalent)\s*(?:van|is|op|:)?\s*(\d+(?:[.,]\d+)?)\s*(?:mm)?/i);
    if (!matchDoorstr) {
      matchDoorstr = tekst.match(/(\d+(?:[.,]\d+)?)\s*(?:mm)?\s*doorstraald(?:e)?(?:\s*dikte)?\b/i);
    }
    if (matchDoorstr) {
      res.doorstraaldeDikte = parseFloat(matchDoorstr[1].replace(",", "."));
    }

    // Gevulde leiding parameters (gevuldeleiding.html)
    const DICHTHEDEN = {
      water: { naam: "Water", rho: 997 },
      aardolie: { naam: "Aardolie", rho: 900 },
      olie: { naam: "Aardolie", rho: 900 },
      benzeen: { naam: "Benzeen", rho: 879 },
      benzine: { naam: "Benzine", rho: 720 },
      aceton: { naam: "Aceton", rho: 791 },
      chloorbenzeen: { naam: "Chloorbenzeen", rho: 1106 },
    };

    if (/\b(gevuld|gevulde|staalequivalent)\b/i.test(lower)) {
      res.isGevuldeLeiding = true;
    }

    for (const [kMed, objMed] of Object.entries(DICHTHEDEN)) {
      if (new RegExp(`\\b${kMed}\\b`, "i").test(lower)) {
        res.mediumNaam = objMed.naam;
        res.mediumDichtheid = objMed.rho;
        res.isGevuldeLeiding = true;
        break;
      }
    }

    const matchCustomRho = lower.match(/(?:dichtheid|rho|\b\u03c1\b)\s*(?:van|is|:)?\s*(\d+(?:[.,]\d+)?)\s*(?:kg\/m[3³])?/i) ||
                           lower.match(/\b(\d{3,4})\s*kg\/m[3³]/i);
    if (matchCustomRho) {
      res.mediumDichtheid = parseFloat(matchCustomRho[1].replace(",", "."));
      if (!res.mediumNaam) res.mediumNaam = "Vloeistof (maatwerk)";
      res.isGevuldeLeiding = true;
    }

    // Bronverval (dagen / periode / datum)
    const matchGeledenDagen = tekst.match(/(\d+(?:[.,]\d+)?)\s*dag(?:en)?\s*(?:geleden|terug)/i);
    const matchGeledenWeken = tekst.match(/(\d+(?:[.,]\d+)?)\s*we(?:ek|ken)\s*(?:geleden|terug)/i);
    const matchGeledenMaanden = tekst.match(/(\d+(?:[.,]\d+)?)\s*maand(?:en)?\s*(?:geleden|terug)/i);
    const matchGeledenJaar = tekst.match(/(\d+(?:[.,]\d+)?)\s*jaar\s*(?:geleden|terug)/i);
    const matchDagen = tekst.match(/(?:over|na|in)\s*(\d+(?:[.,]\d+)?)\s*dag(?:en)?/i) ||
                       tekst.match(/(\d+(?:[.,]\d+)?)\s*dag(?:en)?\s*(?:verval|later)/i);
    if (matchGeledenDagen) {
      res.vervalDagen = parseFloat(matchGeledenDagen[1].replace(",", "."));
      res.vervalInVerleden = true;
    } else if (matchGeledenWeken) {
      res.vervalDagen = parseFloat(matchGeledenWeken[1].replace(",", ".")) * 7;
      res.vervalInVerleden = true;
    } else if (matchGeledenMaanden) {
      res.vervalDagen = parseFloat(matchGeledenMaanden[1].replace(",", ".")) * 30.4375;
      res.vervalInVerleden = true;
    } else if (matchGeledenJaar) {
      res.vervalDagen = parseFloat(matchGeledenJaar[1].replace(",", ".")) * 365.25;
      res.vervalInVerleden = true;
    } else if (matchDagen) {
      res.vervalDagen = parseFloat(matchDagen[1].replace(",", "."));
    } else {
      const matchWeken = tekst.match(/(?:over|na|in)\s*(\d+(?:[.,]\d+)?)\s*we(?:ek|ken)/i);
      if (matchWeken) {
        res.vervalDagen = parseFloat(matchWeken[1].replace(",", ".")) * 7;
      } else {
        const matchMaanden = tekst.match(/(?:over|na|in)\s*(\d+(?:[.,]\d+)?)\s*maand(?:en)?/i);
        if (matchMaanden) {
          res.vervalDagen = parseFloat(matchMaanden[1].replace(",", ".")) * 30.4375;
        } else {
          const matchJaar = tekst.match(/(?:over|na|in)\s*(\d+(?:[.,]\d+)?)\s*jaar/i);
          if (matchJaar) {
            res.vervalDagen = parseFloat(matchJaar[1].replace(",", ".")) * 365.25;
          }
        }
      }
    }

    const matchDatum = tekst.match(/\b(\d{1,2})[-\/](\d{1,2})[-\/](\d{2,4})\b/);
    if (matchDatum) {
      let d = parseInt(matchDatum[1], 10);
      let m = parseInt(matchDatum[2], 10) - 1;
      let y = parseInt(matchDatum[3], 10);
      if (y < 100) y += 2000;
      res.vervalDoelDatum = new Date(y, m, d);
    }

    // Lasbreedte
    let matchLasbreedte = tekst.match(/(?:lasbreedte|naadbreedte|las\s*breedte)\s*(?:van|is|op|:)?\s*(\d+(?:[.,]\d+)?)\s*(?:mm)?/i);
    if (!matchLasbreedte) {
      matchLasbreedte = tekst.match(/(\d+(?:[.,]\d+)?)\s*mm\s*(?:lasbreedte|naadbreedte|las\s*breedte)/i);
    }
    if (matchLasbreedte) res.lasbreedte = parseFloat(matchLasbreedte[1].replace(",", "."));

    // Object-Film Afstand (OFA / OFD) expliciete extractie (bijv. "mijn ofa is 50", "ofa van 50 mm", "50 mm ofa")
    let matchOfa = tekst.match(/(?:ofa|ofd|object[-\s]*(?:tot[-\s]*)?film[-\s]*afstand)\s*(?:(?:heb|hebt|heeft|is|was|wordt)\s+)?(?:van|is|op|:|=)?\s*(\d+(?:[.,]\d+)?)\s*(cm|centimeter|mm)?/i);
    if (!matchOfa) {
      matchOfa = tekst.match(/(\d+(?:[.,]\d+)?)\s*(cm|centimeter|mm)?\s*(?:ofa|ofd|object[-\s]*(?:tot[-\s]*)?film[-\s]*afstand)\b/i);
    }
    if (matchOfa) {
      let ofaVal = parseFloat(matchOfa[1].replace(",", "."));
      const ofaUnit = (matchOfa[2] || "").toLowerCase();
      if (ofaUnit.startsWith("c")) ofaVal *= 10;
      if (ofaVal > 0 && ofaVal <= 2000) {
        res.ofa = ofaVal;
      }
    }

    // FFD / SFD
    const isBundelVraag = lower.includes("bundel") || lower.includes("collimator");
    let matchFfd = tekst.match(/(?:ffd|sfd|focus\s*afstand|film\s*focus\s*afstand|source\s*film\s*distance|bron\s*film)\s*(?:van|is|op|:|\()?\s*(\d+(?:[.,]\d+)?)\s*(mm|cm|meter|m\b)?/i);
    if (!matchFfd) matchFfd = tekst.match(/(?:op\s+)?(\d+(?:[.,]\d+)?)\s*(mm|cm|meter|m\b)?\s*(?:ffd|sfd|focus\s*afstand|film\s*focus\s*afstand|source\s*film\s*distance|\(?min\.?\s*ffd\)?|\(?voorgesteld(?:e)?(?:\s*ffd)?\)?)/i);
    if (!matchFfd) matchFfd = tekst.match(/(\d+(?:[.,]\d+)?)\s*(mm|cm)?\s*(?:\(min\.?\s*ffd\)|\bmin\.?\s*ffd\b|\(voorgesteld\))/i);
    if (!matchFfd && !isAfschermingContext) {
      const mAfst = tekst.match(/(?:op|bij)\s+(\d+(?:[.,]\d+)?)\s*(mm|cm|meter|m\b)?\s*afstand\b/i) ||
                    tekst.match(/\bafstand\s*(?:van|is|op|:)?\s*(\d+(?:[.,]\d+)?)\s*(mm|cm|meter|m\b)?\b/i);
      if (mAfst) {
        let vAf = parseFloat(mAfst[1].replace(",", "."));
        const uAf = (mAfst[2] || "").toLowerCase();
        if (uAf === "cm" || (!uAf && vAf < 100)) vAf *= 10;
        else if (uAf.startsWith("m") && uAf !== "mm") vAf *= 1000;
        if (vAf >= 50 && vAf <= 5000) {
          matchFfd = mAfst;
        }
      }
    }
    if (!matchFfd) {
      // "350mm focus" of "focus van 350mm" / "op 400 focus"
      // Alleen als focusafstand/focus >= 20 mm (om verwarring met 1-5 mm brongrootte / focus te voorkomen)
      const candidatesFoc = [
        ...tekst.matchAll(/(?<![\d.,]|(?:se|ir|co)[-\s]?\d*)(?:op\s+)?(\d+(?:[.,]\d+)?)\s*(mm|cm|meter|m\b)?\s*(?:focus)\b/gi),
        ...tekst.matchAll(/(?:focus)\s*(?:van|is|op|hebt\s*van|heb\s*van|heb\s*ik\s*van|heb\s*vandaag|hebt|heb|:|\()?\s*(\d+(?:[.,]\d+)?)\s*(mm|cm|meter|m\b)?/gi),
      ];
      for (const mFoc of candidatesFoc) {
        let v = parseFloat(mFoc[1].replace(",", "."));
        const u = (mFoc[2] || "").toLowerCase();
        if (u === "cm" || (!u && v < 100)) v *= 10;
        else if (u.startsWith("m") && u !== "mm") v *= 1000;
        if (v >= 20) {
          matchFfd = mFoc;
          break;
        }
      }
    }
    if (matchFfd) {
      let val = parseFloat(matchFfd[1].replace(",", "."));
      const unit = (matchFfd[2] || "").toLowerCase();
      if (unit === "cm" || (!unit && val < 100)) val *= 10;
      else if (unit.startsWith("m") && unit !== "mm") val *= 1000;
      res.sfd = val;
    } else if (!res.sfd && res.optie === "1" && res.diameter) {
      res.sfd = Math.round(res.diameter / 2);
    }
    res.wilMinFFD = res.sfd === null && /\b(wat\s+is\s+de\s+)?(min\w*|kleinste)\s+(?:de\s+)?(ffd|sfd|focus|afstand|focusafstand)\b/i.test(lower);

    // Curie
    const matchCi = tekst.match(/(?:(\d+(?:[.,]\d+)?)\s*(?:ci|curie)|(?:ci|curie)\s*(?:van|is|op|:)?\s*(\d+(?:[.,]\d+)?))\b/i);
    if (matchCi) res.activiteit = parseFloat((matchCi[1] || matchCi[2]).replace(",", "."));

    // Filmtype & formaat
    const matchFilm = tekst.match(/\b(d2|d3|d4|d5|d7|d8)\b/i);
    if (matchFilm) res.filmType = matchFilm[1].toUpperCase();

    // Filmlengte (bijv. 10x48, 10x24, 10x40, film van 48 cm)
    const matchFilmDim = tekst.match(/\b(?:\d+)\s*[xX*]\s*(\d{2,3})\s*(?:film|cm)?\b/i);
    if (matchFilmDim) {
      const flCm = parseFloat(matchFilmDim[1]);
      res.filmLengteMm = flCm > 100 ? flCm : flCm * 10;
    } else {
      const matchFilmL = tekst.match(/(?:film|lengte)\s*(?:van)?\s*(\d+(?:[.,]\d+)?)\s*(cm|mm)\b/i) ||
                         tekst.match(/(\d+(?:[.,]\d+)?)\s*(cm|mm)\s*(?:film|lengte)\b/i);
      if (matchFilmL) {
        let fl = parseFloat(matchFilmL[1].replace(",", "."));
        if (matchFilmL[2].toLowerCase() === "cm") fl *= 10;
        res.filmLengteMm = fl;
      }
    }

    // Focus & Filmtype Calculator parameters (focusverandering.html)
    // 1. Tijd extractie
    let matchTijd = tekst.match(/\b(\d+)\s*m\s*(\d{1,2})\s*s\b/i);
    if (!matchTijd) {
      matchTijd = tekst.match(/\b(\d{1,2}):(\d{2})\b/);
    }
    if (!matchTijd) {
      matchTijd = tekst.match(/(?:tijd|begintijd|oude\s*tijd|duurt|is\s+nu|nu\s+op)\s*(?:van|is|:)?\s*(\d+(?:[.,]\d+)?)\s*(?:minuut|minuten|min\b|m\b)\s*(?:en\s*)?(\d{1,2})?\s*(?:seconden?|sec\b|s\b)?/i);
    }
    if (!matchTijd) {
      matchTijd = tekst.match(/(\d+(?:[.,]\d+)?)\s*(?:minuut|minuten|min\b)\s*(?:en\s*)?(\d{1,2})\s*(?:seconden?|sec\b|s\b)/i);
    }
    if (!matchTijd) {
      // Shorthand in spreektaal: "1 minuut 20", "2 minuut 20" (zonder "seconden" erachter)
      const matchMinSecZonderEenheid = tekst.match(/(\d+(?:[.,]\d+)?)\s*(?:minuut|minuten|min\b)\s*(?:en\s+)?(\d{1,2})\b(?!\s*(?:mm|cm|meter|m\b|kv|ma|ci|curie|duim|inch|bar|dik|dikte|focus|ffd|sfd))/i);
      if (matchMinSecZonderEenheid) {
        const sVal = parseInt(matchMinSecZonderEenheid[2], 10);
        if (sVal < 60) {
          matchTijd = matchMinSecZonderEenheid;
        }
      }
    }
    if (!matchTijd) {
      matchTijd = tekst.match(/(\d+(?:[.,]\d+)?)\s*(?:minuut|minuten|min\b)(?!\s*(?:op|van|tot|naar|bij)\s*\d+\s*ma\b)/i);
    }
    if (matchTijd) {
      const mVal = parseFloat(matchTijd[1].replace(",", "."));
      const sVal = matchTijd[2] ? parseFloat(matchTijd[2].replace(",", ".")) : 0;
      res.focusBegintijdSec = (mVal * 60) + sVal;
    } else {
      const matchSec = tekst.match(/(?:tijd|begintijd|duurt|straal|belicht)?\s*(\d+(?:[.,]\d+)?)\s*(?:seconden?|sec\b|s\b)(?!\s*(?:schedule|sch))/i);
      if (matchSec) {
        res.focusBegintijdSec = parseFloat(matchSec[1].replace(",", "."));
      }
    }

    // 1b. mA*min en mA (buistabel.html & focusverandering.html) - vóór focusverandering zodat res.maminVal beschikbaar is!
    const reMaMinVal = /(?:ma\s*\*?\s*min|mamin|(?:mill?i[-\s]?(?:amp[eè]re|amp)|ma)\s*(?:[\*x\s]|per\s+)?(?:minuuten|minuten|minuut|min\b))/i;
    let matchMaMinVal = tekst.match(new RegExp(`(\\d+(?:[.,]\\d+)?)\\s*${reMaMinVal.source}\\b`, "i"));
    if (!matchMaMinVal) {
      matchMaMinVal = tekst.match(new RegExp(`${reMaMinVal.source}\\s*(?:van|is|op|:)?\\s*(\\d+(?:[.,]\\d+)?)\\b`, "i"));
    }
    if (matchMaMinVal) {
      res.maminVal = parseFloat(matchMaMinVal[1].replace(",", "."));
    }

    let tekstZonderMaMin = tekst.replace(new RegExp(`\\b\\d+(?:[.,]\\d+)?\\s*${reMaMinVal.source}\\b`, "gi"), "")
                                .replace(new RegExp(`\\b${reMaMinVal.source}\\s*(?:van|is|op|:)?\\s*\\d+(?:[.,]\\d+)?\\b`, "gi"), "");
    let matchMaOnly = tekstZonderMaMin.match(/(\d+(?:[.,]\d+)?)\s*(?:ma\b|mill?i[-\s]?(?:amp[eè]re|amp)\b)/i);
    if (!matchMaOnly) {
      matchMaOnly = tekstZonderMaMin.match(/(?:stroom|buisstroom|op|met|bij|kan)\s*(\d+(?:[.,]\d+)?)\s*(?:ma\b|mill?i[-\s]?(?:amp[eè]re|amp)\b)/i);
    }
    if (matchMaOnly) {
      res.maVal = parseFloat(matchMaOnly[1].replace(",", "."));
    }

    // 2. Focus verandering (Kwadratenwet F1 -> F2)
    // Specifiek spraakpatroon: "ik straal ... op [80], hoelang moet ik stralen op [1 meter 15 / 56 focus]"
    const matchOpHoeLangOp = tekst.match(/(?:op|bij)\s+(\d+\s*(?:m|meter)\s*\d{1,2}|\d+(?:[.,]\d+)?\s*(?:cm|mm|meter|m\b)?)\s*(?:ffd|sfd|focus)?\s*,?\s*(?:hoe\s*lang|hoelang)\s*(?:moet|kan|zal)?\s*(?:ik|men|we)?\s*(?:stralen|belichten)?\s*(?:op|bij|naar|tot)\s+(\d+\s*(?:m|meter)\s*\d{1,2}|\d+(?:[.,]\d+)?\s*(?:cm|mm|meter|m\b)?)\s*(?:ffd|sfd|focus)?/i);
    const matchVanNaar = !matchOpHoeLangOp ? tekst.match(/(?:van|vanuit|op|bij)\s*(\d+\s*(?:m|meter)\s*\d{1,2}|\d+(?:[.,]\d+)?\s*(?:cm|mm|meter|m\b)?)\s*(?:ffd|sfd|focus)?\s*(?:naar|tot|omhoog\s*naar)\s*(\d+\s*(?:m|meter)\s*\d{1,2}|\d+(?:[.,]\d+)?\s*(?:cm|mm|meter|m\b)?)\s*(?:ffd|sfd|focus)?/i) : null;
    if (matchOpHoeLangOp) {
      res.oudeFocus = parseFocusAfstandCm(matchOpHoeLangOp[1]);
      res.nieuweFocus = parseFocusAfstandCm(matchOpHoeLangOp[2]);
    } else if (matchVanNaar) {
      const hasDistanceUnit = /\b(ffd|sfd|focus|cm|mm|meter|m\b)\b/i.test(matchVanNaar[0]);
      const v1 = parseFloat(matchVanNaar[1].replace(",", "."));
      const v2 = parseFloat(matchVanNaar[2].replace(",", "."));
      const isZwartingMatch = !hasDistanceUnit && (/\bzwarting\b/i.test(tekst) || (v1 <= 5.0 && v2 <= 5.0));
      if (isZwartingMatch) {
        res.zwartingOud = v1;
        res.zwartingNieuw = v2;
      } else {
        res.oudeFocus = parseFocusAfstandCm(matchVanNaar[1]);
        res.nieuweFocus = parseFocusAfstandCm(matchVanNaar[2]);
      }
    } else {
      const reFocus = /(?<![\d.,]|(?:se|ir|co)[-\s]?\d*)(?:(?:op|bij|van|vanuit|naar|tot|omhoog\s*naar|oude|nieuwe|huidige)\s+)?(\d+\s*(?:m|meter)\s*\d{1,2}|\d+(?:[.,]\d+)?\s*(?:cm|mm|meter|m\b)?)\s*(?:ffd|sfd|focus)\b/gi;
      const focusHits = [...tekst.matchAll(reFocus)].map((m) => ({
        full: m[0],
        valStr: m[1],
        index: m.index || 0,
        cm: parseFocusAfstandCm(m[1])
      })).filter((h) => h.cm !== null && h.cm >= 5);

      if (focusHits.length >= 2) {
        res.oudeFocus = focusHits[0].cm;
        res.nieuweFocus = focusHits[1].cm;
      } else {
        const cmHits = [...tekst.matchAll(/(?:(?:op|bij|van|vanuit|naar|tot)\s+)?(\d+(?:[.,]\d+)?)\s*cm\b/gi)]
          .map((m) => parseFloat(m[1].replace(",", ".")))
          .filter((val) => val >= 20 && val <= 500);
        if (cmHits.length >= 2 && (res.focusBegintijdSec !== null || res.maminVal !== null || /\b(focus|ffd|film|d[234578]|ci|curie|stralen|tijd)\b/i.test(tekst))) {
          res.oudeFocus = cmHits[0];
          res.nieuweFocus = cmHits[1];
        } else if (focusHits.length === 1) {
          // Alleen als focusverandering / kwadratenwet relevant is (bijv. als er een begintijd of mA*min is of expliciet gevraagd wordt naar oude/nieuwe focus)
          const isEchteFocusWissel = res.focusBegintijdSec !== null || res.maminVal !== null ||
            /\b(focusverandering|filmwissel|omrekenen|oude\s+focus|huidige\s+focus|nieuwe\s+focus|vanuit|kwadratenwet)\b/i.test(tekst) ||
            /\b(?:naar|tot|omhoog\s*naar|nieuwe)\s+\d+/i.test(focusHits[0].full);

          if (isEchteFocusWissel) {
            const vraagWoordMatch = tekst.match(/\b(hoelang|hoe\s+lang|wat\s+wordt\s+(?:het|de\s+tijd))\b/i);
            const focusStaatNaVraagWoord = Boolean(vraagWoordMatch && focusHits[0].index > vraagWoordMatch.index);
            const isExplicietNieuw = /\b(?:naar|tot|omhoog\s*naar|nieuwe)\b/i.test(focusHits[0].full) || focusStaatNaVraagWoord;
            if (isExplicietNieuw) {
              res.nieuweFocus = focusHits[0].cm;
            } else {
              res.oudeFocus = focusHits[0].cm;
              // Als er al een gekozen FFD (sfd) in het gespreksgeheugen stond (bijv. 450 mm van eerdere opnames-vraag),
              // gebruik die dan als de doel-focus (nieuweFocus) en overschrijf het geheugen-sfd NIET met de buistabel-focus!
              const memSfdMm = (typeof actiefGespreksGeheugen !== "undefined" && actiefGespreksGeheugen && actiefGespreksGeheugen.sfd) ? actiefGespreksGeheugen.sfd : null;
              if (memSfdMm && Math.abs((memSfdMm / 10) - res.oudeFocus) > 0.5) {
                res.nieuweFocus = memSfdMm / 10;
              }
            }
          }
        } else {
          const matchOudeF = tekst.match(/(?:oude\s+focus|oude\s+ffd|huidige\s+focus|huidige\s+ffd)\s*(?:van|is|:)?\s*(\d+\s*(?:m|meter)\s*\d{1,2}|\d+(?:[.,]\d+)?\s*(?:cm|mm|meter|m\b)?)/i);
          if (matchOudeF) res.oudeFocus = parseFocusAfstandCm(matchOudeF[1]);
          const matchNieuweF = tekst.match(/(?:nieuwe\s+focus|nieuwe\s+ffd)\s*(?:van|is|:)?\s*(\d+\s*(?:m|meter)\s*\d{1,2}|\d+(?:[.,]\d+)?\s*(?:cm|mm|meter|m\b)?)/i);
          if (matchNieuweF) res.nieuweFocus = parseFocusAfstandCm(matchNieuweF[1]);
        }
      }
      if (res.oudeFocus === null && res.nieuweFocus === null) {
        const cmHits = [...tekst.matchAll(/(?:(?:op|bij|van|vanuit|naar|tot)\s+)?(\d+(?:[.,]\d+)?)\s*cm\b/gi)]
          .map((m) => parseFloat(m[1].replace(",", ".")))
          .filter((val) => val >= 20 && val <= 500);
        if (cmHits.length >= 2 && (res.focusBegintijdSec !== null || res.maminVal !== null || /\b(ci|curie|wissel|omrekenen|stralen|tijd)\b/i.test(tekst))) {
          res.oudeFocus = cmHits[0];
          res.nieuweFocus = cmHits[1];
        }
      }
    }
    if ((res.oudeFocus !== null && res.nieuweFocus !== null) || (res.oudeFocus !== null && (res.maminVal !== null || res.focusBegintijdSec !== null))) {
      // Voorkom dat de referentiefocus van een buistabel/begintijd (bijv. "10 mA*min op 80 focus") de eerder gekozen FFD (bijv. 450 mm) in het geheugen overschrijft
      if (typeof actiefGespreksGeheugen !== "undefined" && actiefGespreksGeheugen && actiefGespreksGeheugen.sfd) {
        res.sfd = null;
      }
    }

    // Zwarting (optische dichtheid) wissel extractie
    if (!res.zwartingOud || !res.zwartingNieuw) {
      const matchZwPattern =
        lower.match(/(?:van\s+)?(?:een\s+)?zwarting\s*(?:van|is|=|:)?\s*(\d+(?:[.,]\d+)?)\b[\s\S]*?(?:\b(?:om|naar|tot|op|voor)\s*(?:een\s*)?(?:zwarting\s*(?:van|is|=|:)?\s*)?|\b(?:hoe\s+)?(?:ga\s+ik\s+naar|krijg\s+ik|haal\s+ik|bereik\s+ik|kom\s+ik\s+op|wil\s+ik)\s*(?:een\s*)?(?:zwarting\s*(?:van|is|=|:)?\s*)?|\bzwarting\s*(?:van|is|=|:)?\s*)(\d+(?:[.,]\d+)?)(?![.,\d])(?!\s*(?:minuut|minuten|min\b|sec\b|seconden|s\b|mm|cm|meter|m\b|ci|curie|kv|ma\b))/i) ||
        lower.match(/(\d+(?:[.,]\d+)?)\s*zwarting\b[\s\S]*?(?:\b(?:om|naar|tot|op|voor|krijg\s+ik|haal\s+ik|ga\s+ik\s+naar|zwarting)\s*(?:een\s*)?(?:zwarting\s*(?:van|is|=|:)?\s*)?)(\d+(?:[.,]\d+)?)(?![.,\d])(?!\s*(?:minuut|minuten|min\b|sec\b|seconden|s\b|mm|cm|meter|m\b|ci|curie|kv|ma\b))/i);
      if (matchZwPattern) {
        const z1 = parseFloat(matchZwPattern[1].replace(",", "."));
        const z2 = parseFloat(matchZwPattern[2].replace(",", "."));
        if (z1 >= 0.5 && z1 <= 6.0 && z2 >= 0.5 && z2 <= 6.0) {
          res.zwartingOud = z1;
          res.zwartingNieuw = z2;
        }
      }
    }

    // 3. Filmwissel (D2, D3, D4, D5, D7, D8)
    const filmMatches = [...tekst.matchAll(/\b(d[234578])\b/gi)].map((m) => m[1].toUpperCase());
    if (filmMatches.length >= 2) {
      res.oudeFilmType = filmMatches[0];
      res.nieuweFilmType = filmMatches[1];
    } else if (filmMatches.length === 1) {
      if (/\b(?:naar|wissel\s+naar|nieuwe\s+film)\s*d[234578]\b/i.test(tekst) || /\b(?:wat\s+wordt\s+de\s+tijd|hoe\s+lang\s+moet)\b/i.test(tekst)) {
        res.nieuweFilmType = filmMatches[0];
      } else {
        res.oudeFilmType = filmMatches[0];
      }
    }

    // 4. Ci wissel
    const matchCiWissel = tekst.match(/(?:van|wissel\s+van)\s*(\d+(?:[.,]\d+)?)\s*(?:ci|curie)\s*(?:naar|tot)\s*(\d+(?:[.,]\d+)?)\s*(?:ci|curie)?/i);
    if (matchCiWissel) {
      res.oudeCi = parseFloat(matchCiWissel[1].replace(",", "."));
      res.nieuweCi = parseFloat(matchCiWissel[2].replace(",", "."));
    } else {
      const matchOudeCi = tekst.match(/(?:oude\s+ci|oude\s+curie|oude\s+bron)\s*(?:van|is|:)?\s*(\d+(?:[.,]\d+)?)\s*(?:ci|curie)?/i);
      if (matchOudeCi) res.oudeCi = parseFloat(matchOudeCi[1].replace(",", "."));
      const matchNieuweCi = tekst.match(/(?:nieuwe\s+ci|nieuwe\s+curie|nieuwe\s+bron)\s*(?:van|is|:)?\s*(\d+(?:[.,]\d+)?)\s*(?:ci|curie)?/i);
      if (matchNieuweCi) res.nieuweCi = parseFloat(matchNieuweCi[1].replace(",", "."));
      if (res.oudeCi === null && res.nieuweCi === null) {
        const ciHits = [...tekst.matchAll(/(\d+(?:[.,]\d+)?)\s*(?:ci|curie)\b/gi)].map((m) => parseFloat(m[1].replace(",", ".")));
        if (ciHits.length >= 2) {
          res.oudeCi = ciHits[0];
          res.nieuweCi = ciHits[1];
        }
      }
    }

    // 6. Materiaalfactor & Materiaalherkenning (conform stralingstijd.html en materiaalfactor.csv)
    const matchKv = tekst.match(/\b(\d{2,3})\s*(?:kv|kilovolt|cafe)\b/i);
    if (matchKv) {
      res.kv = parseFloat(matchKv[1]);
    }

    const matchMatFactor = tekst.match(/(?:materiaalfactor|factor)\s*(?:van|is|:)?\s*(\d+(?:[.,]\d+)?)/i);
    if (matchMatFactor) {
      res.materiaalFactorHandmatig = parseFloat(matchMatFactor[1].replace(",", "."));
      res.materiaalFactor = res.materiaalFactorHandmatig;
    }

    let matGevonden = zoekMateriaalInTekst(tekst);
    if (!matGevonden && typeof actiefGespreksGeheugen !== "undefined" && actiefGespreksGeheugen && actiefGespreksGeheugen.materiaalObj) {
      matGevonden = actiefGespreksGeheugen.materiaalObj;
    }
    if (matGevonden) {
      res.materiaalNaam = matGevonden.name;
      res.materiaalObj = matGevonden;
      if (!res.materiaalFactorHandmatig) {
        // Bepaal de actieve isotoop / context uit de vraag:
        const curIso =
          (res.bronType === "Se75" || /\bse[-\s]?75|selenium\b/i.test(lower))
            ? "Se75"
            : (res.bronType === "Ir192" || /\bir[-\s]?192|iridium\b/i.test(lower))
            ? "Ir192"
            : null;

        if (curIso === "Se75") {
          res.materiaalFactor = matGevonden.f_se75;
        } else if (curIso === "Ir192") {
          res.materiaalFactor = matGevonden.f_ir192;
        } else if (res.kv === 200 || /\b200\s*kv\b/i.test(lower)) {
          res.materiaalFactor = matGevonden.f200;
        } else if (res.kv === 150 || /\b150\s*kv\b/i.test(lower)) {
          res.materiaalFactor = matGevonden.f150;
        } else if (res.kv === 250 || /\b250\s*kv\b/i.test(lower)) {
          res.materiaalFactor = matGevonden.f250;
        } else if (res.kv === 300 || /\b300\s*kv\b/i.test(lower)) {
          res.materiaalFactor = matGevonden.f300;
        } else if (typeof res.kv === "number" && res.kv > 0) {
          const kvs = [150, 200, 250, 300];
          const closest = kvs.reduce((prev, curr) => Math.abs(curr - res.kv) < Math.abs(prev - res.kv) ? curr : prev);
          res.materiaalFactor = closest === 150 ? matGevonden.f150 : closest === 200 ? matGevonden.f200 : closest === 250 ? matGevonden.f250 : matGevonden.f300;
        } else {
          // Beginbron / kV niet bekend -> materiaalFactor blijft null zodat alle 6 opties berekend worden
          res.materiaalFactor = null;
        }
      }
    }

    // Bronnen
    if (Array.isArray(bronnenData)) {
      for (const b of bronnenData) {
        if (lower.includes(b.name.toLowerCase())) {
          const act = Number(berekenHuidigeActiviteit(b.initialActivity, b.type, b.date).toFixed(1));
          const typeLabel = b.type === "Se75" ? "Se-75" : b.type === "Ir192" ? "Ir-192" : b.type === "Co60" ? "Co-60" : b.type;
          res.bronTekst = `${b.name} (${typeLabel}, ${act} Ci, ${b.size} mm)`;
          res.bronType = b.type;
          res.brongrootte = b.size;
          res.activiteit = act;
          break;
        }
      }
      if (!res.bronTekst && /\b(sterkst|sterkste|meeste\s*curie|hoogste\s*(?:activiteit|curie))\b/i.test(lower)) {
        let type = null;
        if (/se[-\s]?75|selenium|seleen/i.test(lower)) type = "Se75";
        else if (/ir[-\s]?192|iridium/i.test(lower)) type = "Ir192";
        else if (/co[-\s]?60|kobalt/i.test(lower)) type = "Co60";
        if (type) {
          const matching = bronnenData
            .filter((b) => b.type === type)
            .map((b) => ({ ...b, act: berekenHuidigeActiviteit(b.initialActivity, b.type, b.date) }))
            .sort((a, b) => b.act - a.act);
          if (matching.length > 0) {
            const top = matching[0];
            const typeLabel = top.type === "Se75" ? "Se-75" : top.type === "Ir192" ? "Ir-192" : top.type === "Co60" ? "Co-60" : top.type;
            res.bronTekst = `${top.name} (${typeLabel}, ${top.act.toFixed(1)} Ci, ${top.size} mm)`;
            res.bronType = top.type;
            res.brongrootte = top.size;
            res.activiteit = Number(top.act.toFixed(1));
          }
        }
      }
    }
    if (res.materiaalObj && res.materiaalFactor === null) {
      if (res.bronType === "Se75") {
        res.materiaalFactor = res.materiaalObj.f_se75;
      } else if (res.bronType === "Ir192") {
        res.materiaalFactor = res.materiaalObj.f_ir192;
      }
    }
    if (!res.bronTekst) {
      let matchBg = tekst.match(/(?:brongrootte|bron\s*grootte|bron\s*groot|bronafmeting|bron\s*afmeting|focusgrootte|focus\s*grootte|focus\s*groot|focusafmeting|focus\s*afmeting)\s*(?:(?:heb|hebt|heeft|is|was|wordt)\s+)?(?:van|is|op|:|=)?\s*(\d+(?:[.,]\d+)?)\s*(?:mm)?/i);
      if (!matchBg) {
        matchBg = tekst.match(/(\d+(?:[.,]\d+)?)\s*(?:mm\s*)?(?:focusgrootte|focus\s*grootte|focus\s*groot|focusafmeting|focus\s*afmeting|bronafmeting|bron\s*afmeting|brongrootte|bron\s*grootte|bron\s*groot)\b/i);
      }
      if (!matchBg) {
        // "focus" of "bron" als het expliciet een kleine afmeting is (<= 10 mm) en niet al als FFD (res.sfd) is gematcht
        const mFocusKlein = tekst.match(/(?:focus|bron)\s*(?:van|is|op|:)?\s*(\d+(?:[.,]\d+)?)\s*(?:mm)?\b/i) ||
                            tekst.match(/(?<![\d.,]|(?:se|ir|co)[-\s]?\d*)(\d+(?:[.,]\d+)?)\s*(?:mm)?\s*(?:focus|bron)\b/i);
        if (mFocusKlein) {
          const valKlein = parseFloat(mFocusKlein[1].replace(",", "."));
          if (valKlein <= 10 && res.sfd !== valKlein) {
            matchBg = mFocusKlein;
          }
        }
      }
      if (!matchBg && typeof actiefGespreksGeheugen !== "undefined" && actiefGespreksGeheugen && actiefGespreksGeheugen.verwachtParameter === "brongrootte") {
        const mBare = tekst.match(/(\d+(?:[.,]\d+)?)\s*(?:mm)?/i);
        if (mBare) {
          const v = parseFloat(mBare[1].replace(",", "."));
          if (v <= 10) {
            matchBg = mBare;
          }
        }
      }
      if (matchBg) {
        const bgVal = parseFloat(matchBg[1].replace(",", "."));
        // Brongrootte is in de praktijk nooit >= 20 mm; groter is altijd FFD / afstand
        if (bgVal < 20) {
          res.brongrootte = bgVal;
        }
      } else {
        const matchIsoGrootte = tekst.match(/(?:se[-\s]?75|selenium|ir[-\s]?192|iridium|co[-\s]?60)\s*(?:van|met)?\s*(\d+(?:[.,]\d+)?)\s*mm\b(?!\s*(?:lood|pb|staal|fe|isolatie|isolatiedikte|dik|wand|wanddikte|lasbreedte|verzet|ffd|sfd))/i);
        if (matchIsoGrootte) {
          const isoBg = parseFloat(matchIsoGrootte[1].replace(",", "."));
          if (isoBg < 20) res.brongrootte = isoBg;
        }
      }

      if (/smart\s*evo|evo|smart.*1\s*mm/i.test(tekst)) {
        res.bronTekst = "Smart EVO (1 mm)";
        res.brongrootte = 1;
        res.bronType = "X-ray";
      } else if (/yxlon|smart.*3\s*mm/i.test(tekst)) {
        res.bronTekst = "Yxlon 300 (3 mm)";
        res.brongrootte = 3;
        res.bronType = "X-ray";
      } else if (/smart/i.test(tekst)) {
        res.bronTekst = "Smart EVO (1 mm)";
        res.brongrootte = 1;
        res.bronType = "X-ray";
      } else if (/\brondstraler\b/i.test(tekst) || /balteau\s*rondstraler/i.test(tekst)) {
        res.bronTekst = "Balteau Rondstraler (5 mm)";
        res.brongrootte = 5;
        res.bronType = "X-ray";
      } else if (/balteau/i.test(tekst)) {
        res.bronTekst = "Balteau (2.5 mm)";
        res.brongrootte = 2.5;
        res.bronType = "X-ray";
      } else if (/se[-\s]?75|selenium|seleen/i.test(tekst)) {
        res.bronTekst = res.brongrootte ? `Se-75 (${res.brongrootte} mm)` : "Se-75";
        res.bronType = "Se75";
      } else if (/ir[-\s]?192|iridium/i.test(tekst)) {
        res.bronTekst = res.brongrootte ? `Ir-192 (${res.brongrootte} mm)` : "Ir-192";
        res.bronType = "Ir192";
      } else if (/co[-\s]?60|kobalt/i.test(tekst)) {
        res.bronTekst = res.brongrootte ? `Co-60 (${res.brongrootte} mm)` : "Co-60";
        res.bronType = "Co60";
      } else if (/\b(x[-\s]?ray\s*buis|xray\s*buis|rontgenbuis|röntgenbuis|roentgenbuis|x[-\s]?ray|rontgen|röntgen|de\s+buis)\b/i.test(tekst) && !tekst.match(/\bde\s+buis\s+(?:van\s+)?(?:\d+(?:[.,]\d+)?\s*(?:duim|inch|mm|cm|meter|m\b)|60|88|114|168|219|273|323)/i)) {
        res.bronTekst = "X-ray";
        res.bronType = "X-ray";
      } else if (/\b(gamma\s*bron|radioactieve\s*bron)\b/i.test(tekst)) {
        res.bronTekst = "Gamma bron";
      } else if (matchBg) {
        res.bronTekst = `Bron (${res.brongrootte} mm)`;
      }
    }

    // Veilig getallenvangnet (bronkeuzes, OFA en zwartingswaarden isoleren zodat ze nooit als diameter/wanddikte worden gezien)
    if ((res.diameter === null || res.wanddikte === null) && !isBundelVraag && res.sfd === null && res.ofa === null && res.zwartingOud === null && res.zwartingNieuw === null && res.langsnaadLengte === null && res.oudeFocus === null && res.nieuweFocus === null && res.focusBegintijdSec === null && res.maminVal === null && res.maVal === null) {
      let tZonder = tekst
        .replace(/\b(?:schedule|sch|sched)[-\s]*([0-9]{1,3}[a-z]?|std|xs|xxs)\b/gi, "")
        .replace(/\b([0-9]{1,3}[a-z]?)\s*(?:schedule|sch|sched)\b/gi, "")
        .replace(/\b(se-75|se75|ir-192|ir192|co-60|selenium|iridium|balteau|yxlon|smart|rondstraler|rr\d+|\d{5}[a-z]?|d[234578])\b/gi, "")
        .replace(/\bdn\s*[-]?\s*\d+\b/gi, "")
        .replace(/\b\d+(?:[.,]\d+)?\s*(?:mm\s*|cm\s*)?(?:ci|curie|gbq|tbq|usv|µsv|microsievert|pb|fe|lood|staal|beton|baksteen|metselwerk|isolatie|ma\*min|mamin|ma|milliamp|miliamp)\b/gi, "")
        .replace(/(?:lood|pb|staal|fe|beton(?:nen)?(?:\s*muur)?|bakste(?:en|nen)(?:\s*muur)?|metselwerk|isolatie)\s*(?:tussen\s*)?(?:van|is|op|:)?\s*\d+(?:[.,]\d+)?\s*(?:mm|cm|m\b)?/gi, "");
      if (res.brongrootte !== null && res.brongrootte !== undefined) {
        tZonder = tZonder.replace(new RegExp(`\\b${String(res.brongrootte).replace(".", "[.,]")}\\s*(?:mm)?\\b`, "gi"), "");
      }
      const bevatDiaTerm = /\b(diameter|buis|pijp|leiding|rondnaad|duim|duims|duimer|\bde\b|\bdn\b|wanddikte|dikte|dik)\b/i.test(tekst);
      const isPuurBron = Boolean(res.bronTekst) && !bevatDiaTerm;
      const isAfscherming = (res.pbMm > 0 || res.feMm > 0 || res.betonMm > 0 || res.baksteenMm > 0 || res.muurOnbekendMm > 0 || res.isolatieMm > 0) && !bevatDiaTerm;

      const getallen = (isPuurBron || isAfscherming) ? [] : [...tZonder.matchAll(/\b(\d+(?:[.,]\d+)?)\b/g)].map((m) => parseFloat(m[1].replace(",", ".")));
      if (getallen.length === 2 && res.diameter === null && res.wanddikte === null) {
        let nA = getallen[0], nB = getallen[1];
        if (nA < 20 && DUIMSE_MATEN[String(nA)] !== undefined && nB < DUIMSE_MATEN[String(nA)] / 2) nA = DUIMSE_MATEN[String(nA)];
        const g1 = Math.max(nA, nB), g2 = Math.min(nA, nB);
        if (g1 >= 15 && g2 > 0 && g2 < g1 / 2) {
          res.diameter = g1;
          res.wanddikte = g2;
        }
      } else if (getallen.length === 1 && res.diameter === null && res.wanddikte === null && res.sfd === null) {
        const eg = getallen[0];
        // Uitsluitend toekennen als de AI zojuist specifiek om deze parameter heeft gevraagd!
        if (typeof actiefGespreksGeheugen !== "undefined" && actiefGespreksGeheugen && actiefGespreksGeheugen.verwachtParameter) {
          const vp = actiefGespreksGeheugen.verwachtParameter;
          if (vp === "wanddikte" && eg < 100) {
            res.wanddikte = eg;
          } else if (vp === "doorstraaldeDikte" && eg < 250) {
            res.doorstraaldeDikte = eg;
          } else if (vp === "mediumDichtheid" && eg > 100) {
            res.mediumDichtheid = eg;
          } else if (vp === "vervalDagen") {
            res.vervalDagen = eg;
          } else if (vp === "brongrootte" && eg <= 10) {
            res.brongrootte = eg;
          } else if (vp === "isolatieMm") {
            res.isolatieMm = eg;
          } else if (vp === "activiteit") {
            res.activiteit = eg;
          } else if (vp === "sfd") {
            res.sfd = eg < 100 ? eg * 10 : eg;
          } else if (vp === "diameter") {
            res.diameter = eg;
          } else if (vp === "lasbreedte") {
            res.lasbreedte = eg;
          } else if (vp === "langsnaadLengte") {
            res.langsnaadLengte = eg < 20 ? eg * 1000 : eg;
          } else if (vp === "focusBegintijdSec") {
            res.focusBegintijdSec = eg;
          } else if ((vp === "maVal" || vp === "ma") && eg <= 30) {
            res.maVal = eg;
          } else if ((vp === "maminVal" || vp === "mamin") && eg <= 1000) {
            res.maminVal = eg;
          }
        }
      }
    }

    if (res.diameter !== null && !diaHeeftEenheid) {
      res.diameter = converteerDuimIndienNodig(res.diameter);
    }

    // Schedule koppeling: als schedule & diameter bekend zijn (of in actiefGespreksGeheugen), zoek wanddikte op
    const effDiameterVoorSchedule = res.diameter || (typeof actiefGespreksGeheugen !== "undefined" && actiefGespreksGeheugen ? actiefGespreksGeheugen.diameter : null);
    if (res.schedule && effDiameterVoorSchedule) {
      const schInfo = zoekScheduleInfo(effDiameterVoorSchedule, res.schedule);
      if (schInfo && schInfo.gevonden) {
        res.scheduleInfo = schInfo;
        const schValNum = parseFloat(res.schedule);
        if (res.wanddikte === null || res.wanddikte === undefined || res.wanddikte === schValNum) {
          res.wanddikte = schInfo.wt;
        }
      }
    }

    return res;
  }

