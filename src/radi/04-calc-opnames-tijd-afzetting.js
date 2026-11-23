  // --- Rekenmodules ---

  // 1. Afzetting Gamma (afzettinggamma.html)
  function berekenAfzetting(params, vraagTekst, chips = []) {
    const lower = (vraagTekst || "").toLowerCase();

    // Specifieke vraag naar halveringsdikte (HVL) van lood / staal / beton / baksteen voor Ir-192 en Se-75
    if (/\b(halveringsdikte|halveringsdiktes|hvl)\b/i.test(lower)) {
      if (chips) chips.push("Afzetting Ir-192", "Afzetting Se-75", "6 mm lood");
      return (
        `<strong>Halveringsdiktes (HVL) voor afscherming (conform <a href="afzettinggamma.html" class="ai-link" target="_blank">afzettinggamma.html</a>):</strong><br>` +
        `• <strong>Iridium-192 (Ir-192):</strong> <strong>3 mm lood (Pb)</strong>, <strong>13 mm staal (Fe)</strong>, <strong>45 mm beton</strong> en <strong>60 mm baksteen</strong>.<br>` +
        `• <strong>Seleen-75 (Se-75):</strong> <strong>2 mm lood (Pb)</strong>, <strong>5 mm staal (Fe)</strong>, <strong>30 mm beton</strong> en <strong>40 mm baksteen</strong>.`
      );
    }

    // Specifieke vraag naar wettelijke jaarlijkse dosislimieten voor werknemers (Cat. A, B, C)
    if (/\b(dosislimiet|dosislimieten|jaarlijkse\s+dosis\w*|blootgestelde\s+werknemer)\b/i.test(lower)) {
      return (
        `<strong>Wettelijke jaarlijkse dosislimieten (effectieve dosis):</strong><br>` +
        `• <strong>Categorie A werknemer (blootgestelde werknemer):</strong> maximaal <strong>20 mSv per jaar</strong>.<br>` +
        `• <strong>Categorie B werknemer:</strong> maximaal <strong>6 mSv per jaar</strong>.<br>` +
        `• <strong>Overige werknemers / publiek (Categorie C):</strong> maximaal <strong>1 mSv per jaar</strong>.`
      );
    }

    let isIr = /ir[-\s]?192|iridium/i.test(vraagTekst) || (params.bronTekst && /ir[-\s]?192|iridium/i.test(params.bronTekst)) || params.bronType === "Ir192";
    let isSe = /se[-\s]?75|selenium|seleen/i.test(vraagTekst) || (params.bronTekst && /se[-\s]?75|selenium|seleen/i.test(params.bronTekst)) || params.bronType === "Se75";
    if (!isIr && !isSe && params.bronTekst && Array.isArray(bronnenData)) {
      const bFound = bronnenData.find((b) => params.bronTekst.toLowerCase().includes(b.name.toLowerCase()));
      if (bFound) {
        if (bFound.type === "Ir192") isIr = true;
        else if (bFound.type === "Se75") isSe = true;
      }
    }
    if (!isIr && !isSe) {
      if (typeof actiefGespreksGeheugen !== "undefined" && actiefGespreksGeheugen) {
        actiefGespreksGeheugen.verwachtParameter = "bron";
      }
      if (chips) chips.push("Se-75", "Ir-192");
      return "Om de afzetting te berekenen moet ik weten welke bron je gebruikt (bijv. <strong>Se-75</strong> of <strong>Ir-192</strong>). Welke bron gebruik je?";
    }
    const bronType = isIr ? "Ir-192" : "Se-75";

    // Activiteit ophalen uit vraag of actuele bron
    let ci = params.activiteit;
    let bronNaam = "";

    // Alleen als de gebruiker een SPECIFIEKE broncode heeft genoemd (bijv. 97969M of RR3508)
    if (!ci && params.bronTekst && Array.isArray(bronnenData)) {
      const specifiekeBron = bronnenData.find((b) => params.bronTekst.toLowerCase().includes(b.name.toLowerCase()));
      if (specifiekeBron) {
        ci = berekenHuidigeActiviteit(specifiekeBron.initialActivity, specifiekeBron.type, specifiekeBron.date);
        bronNaam = ` (${specifiekeBron.name})`;
      }
    }

    if (!ci || ci <= 0) {
      if (typeof actiefGespreksGeheugen !== "undefined" && actiefGespreksGeheugen) {
        actiefGespreksGeheugen.verwachtParameter = "activiteit";
      }
      if (chips) {
        if (Array.isArray(bronnenData)) {
          const beschikbare = bronnenData.filter((b) => b.type === (isIr ? "Ir192" : "Se75"));
          beschikbare.forEach((b) => {
            const act = berekenHuidigeActiviteit(b.initialActivity, b.type, b.date);
            chips.push(`${b.name} (${act.toFixed(1)} Ci)`);
          });
        }
        chips.push("15 Curie", "25 Curie", "35 Curie");
      }
      return `Om de veilige afzetting voor <strong>${bronType}</strong> te berekenen heb ik de <strong>activiteit</strong> nodig. Hoeveel Curie (of welke bron) gebruik je?`;
    }

    const pb = params.pbMm || 0;
    const fe = params.feMm || 0;
    const beton = params.betonMm || 0;
    const baksteen = params.baksteenMm || 0;
    const dosis = params.dosisGrens || 10;

    const k = isIr ? 0.11 : 0.054;
    const hvlPb = isIr ? 3 : 2;
    const hvlFe = isIr ? 13 : 5;
    const hvlBeton = isIr ? 45 : 30;
    const hvlBaksteen = isIr ? 60 : 40;
    const collimatorFactor = isIr ? 0.012 : 0.05; // Ir: 1/85, Se: 1/20

    const maakAfschermDelen = (inclPb = true, loodSuffix = "") => {
      const delen = [];
      if (inclPb && pb > 0) delen.push(`${pb} mm lood (Pb)${loodSuffix}`);
      if (fe > 0) delen.push(`${fe} mm staal (Fe)`);
      if (beton > 0) delen.push(`${beton >= 10 && beton % 10 === 0 ? `${beton / 10} cm (${beton} mm)` : `${beton} mm`} beton`);
      if (baksteen > 0) delen.push(`${baksteen >= 10 && baksteen % 10 === 0 ? `${baksteen / 10} cm (${baksteen} mm)` : `${baksteen} mm`} baksteen`);
      return delen;
    };

    // Bepaal sub-modus (lood_nodig, dosistempo_op_afstand, of afzettingsafstand) met behoud voor vervolgvragen
    const isDosistempoExpliciet =
      /\b(wat\s+is\s+(?:het|de)\s+dosistempo|hoe\s+hoog\s+is\s+(?:het|de)\s+dosistempo|hoeveel\s+(?:microsievert|usv|µsv)|dosistempo\s+(?:op|bij|achter|daar))\b/i.test(lower) &&
      !/\b(?:hoeveel|welke)\s+(?:mm\s+|millimeter\s+)?(?:lood|loden|pb|afscherming)\b/i.test(lower);
    const isLoodNodigExpliciet =
      /\b(?:hoeveel|welke)\s+(?:mm\s+|millimeter\s+)?(?:lood|loden|pb|afscherming|loodafscherming|extra\s+lood)\b/i.test(lower) ||
      /\b(?:lood|loden|pb|afscherming|loodafscherming)\b.*?\b(?:nodig|gebruiken|vereist|plaatsen|hebben|om\s+(?:op|binnen|onder|een\s+afzetting)|voor\s+\d+\s*(?:meter|m\b))\b/i.test(lower) ||
      /\b(?:nodig|gebruiken|hebben)\b.*?\b(?:lood|loden|pb|afscherming|loodafscherming)\b/i.test(lower) ||
      /\b(?:maximaal|max\.?|binnen|op)\s+\d+(?:[.,]\d+)?\s*(?:meter|m\b)\s*(?:kan\s+)?(?:afzetten|afzetting)\b.*?\b(?:lood|loden|pb|afscherming)\b/i.test(lower);

    let subModus = params.afzettingSubModus || "afzettingsafstand";
    if (isLoodNodigExpliciet) subModus = "lood_nodig";
    else if (isDosistempoExpliciet) subModus = "dosistempo_op_afstand";
    if (typeof actiefGespreksGeheugen !== "undefined" && actiefGespreksGeheugen) {
      actiefGespreksGeheugen.afzettingSubModus = subModus;
    }

    const lowerVoorMeter = stripBronnamenUitTekst(lower);
    const mAfstInline =
      lowerVoorMeter.match(/(?:op|bij|binnen|naar|voor|van|maximaal|max\.?|tot)\s*(\d+(?:[.,]\d+)?)\s*(?:meter|m\b)/i) ||
      lowerVoorMeter.match(/(\d+(?:[.,]\d+)?)\s*(?:meter|m\b)\s*(?:afzetten|afzetting|afstand)/i) ||
      lowerVoorMeter.match(/\b(\d+(?:[.,]\d+)?)\s*(?:meter|m\b)\b/i);
    const doelM = mAfstInline
      ? parseFloat(mAfstInline[1].replace(",", "."))
      : (params.afzettingDoelMeter || (params.sfd && params.sfd >= 1000 ? params.sfd / 1000 : null));

    if (doelM && doelM > 0 && typeof actiefGespreksGeheugen !== "undefined" && actiefGespreksGeheugen) {
      actiefGespreksGeheugen.afzettingDoelMeter = doelM;
    }

    // Als de gebruiker alleen "een muur van X cm" noemt zonder beton/baksteen te specificeren: vraag eerst om het materiaal!
    if (params.muurOnbekendMm && params.muurOnbekendMm > 0 && beton === 0 && baksteen === 0) {
      if (typeof actiefGespreksGeheugen !== "undefined" && actiefGespreksGeheugen) {
        actiefGespreksGeheugen.verwachtParameter = "muurMateriaal";
        actiefGespreksGeheugen.muurOnbekendMm = params.muurOnbekendMm;
      }
      const muurLabel = params.muurOnbekendMm >= 10 && params.muurOnbekendMm % 10 === 0
        ? `${params.muurOnbekendMm / 10} cm (${params.muurOnbekendMm} mm)`
        : `${params.muurOnbekendMm} mm`;
      if (chips) chips.push("Beton", "Baksteen");
      return `Je noemt een <strong>muur van ${muurLabel}</strong>. Gaat het om <strong>beton</strong> (HVL ${hvlBeton} mm voor ${bronType}) of <strong>baksteen</strong> (HVL ${hvlBaksteen} mm voor ${bronType})?`;
    }

    // Als de gebruiker een muur noemt zónder dikte ("achter een muur op 5 meter" of "achter een betonnen muur op 5 meter"):
    const noemtMuurZonderDikte =
      beton === 0 &&
      baksteen === 0 &&
      !(params.muurOnbekendMm && params.muurOnbekendMm > 0) &&
      !/\b(zonder|geen)\s+(?:beton(?:nen)?|bakste(?:en|nen)|muur|tussenmuur|afscherming)\b/i.test(lower) &&
      /\b(muur|betonmuur|betonnen\s*muur|baksteenmuur|bakstenen\s*muur|tussenmuur|scheidingsmuur|metselwerk)\b/i.test(lower);
    if (noemtMuurZonderDikte) {
      const isBetonGenoemd = /\b(beton|betonnen|betonmuur)\b/i.test(lower);
      const isBaksteenGenoemd = /\b(baksteen|bakstenen|baksteenmuur|metselwerk)\b/i.test(lower);
      if (isBetonGenoemd) {
        if (chips) chips.push("10 cm beton", "15 cm beton", "20 cm beton", "30 cm beton");
        return `Hoe dik is de <strong>betonnen muur</strong> (in cm)?`;
      }
      if (isBaksteenGenoemd) {
        if (chips) chips.push("10 cm baksteen", "15 cm baksteen", "20 cm baksteen", "30 cm baksteen");
        return `Hoe dik is de <strong>bakstenen muur</strong> (in cm)?`;
      }
      if (chips) chips.push("10 cm beton", "20 cm beton", "10 cm baksteen", "20 cm baksteen");
      return `Je noemt een <strong>muur</strong>, maar de dikte en het materiaal zijn nog niet bekend. Hoe dik is de muur (in cm) en gaat het om <strong>beton</strong> of <strong>baksteen</strong>?`;
    }

    // Specifieke vraag 1: "Wat is het dosistempo op X meter afstand?" (omgevormde afzettingsformule)
    if (subModus === "dosistempo_op_afstand") {
      if (!doelM || doelM <= 0) {
        if (typeof actiefGespreksGeheugen !== "undefined" && actiefGespreksGeheugen) {
          actiefGespreksGeheugen.verwachtParameter = "afzettingDoelMeter";
        }
        if (chips) chips.push("5 meter", "8 meter", "10 meter", "15 meter", "20 meter");
        return `Op welke <strong>afstand (in meter)</strong> wil je het dosistempo voor <strong>${ci.toFixed(1)} Curie ${bronType}</strong> weten?`;
      }
      if (typeof actiefGespreksGeheugen !== "undefined" && actiefGespreksGeheugen && actiefGespreksGeheugen.verwachtParameter === "afzettingDoelMeter") {
        actiefGespreksGeheugen.verwachtParameter = null;
      }
      const atten =
        Math.pow(0.5, pb / hvlPb) *
        Math.pow(0.5, fe / hvlFe) *
        Math.pow(0.5, beton / hvlBeton) *
        Math.pow(0.5, baksteen / hvlBaksteen);
      const dtOpen = (ci * 37000 * k * atten) / (doelM * doelM);
      const dtCollimator = dtOpen * collimatorFactor;
      const afschermDelen = maakAfschermDelen(true);
      const afschermTxt = afschermDelen.length > 0
        ? ` met ${afschermDelen.join(" en ")}`
        : " zonder afscherming";
      const hvlHintDelen = [];
      if (beton > 0) hvlHintDelen.push(`HVL beton = ${hvlBeton} mm`);
      if (baksteen > 0) hvlHintDelen.push(`HVL baksteen = ${hvlBaksteen} mm`);
      const hvlHint = hvlHintDelen.length > 0 ? ` • ${hvlHintDelen.join(", ")}` : "";
      if (chips && chips.length === 0) {
        chips.push(`Hoeveel lood nodig op ${doelM} meter`, "Op 10 meter", "Op 15 meter", isIr ? "Sterkste Se-75" : "Sterkste Ir-192");
      }
      return (
        `Dosistempo op <strong>${doelM} meter</strong> afstand bij <strong>${ci.toFixed(1)} Curie ${bronType}</strong>${bronNaam}${afschermTxt}:<br>` +
        `• In de open bundel: <strong>${dtOpen.toFixed(1)} μSv/uur</strong> (${(dtOpen / 1000).toFixed(2)} mSv/uur).<br>` +
        `• Achter een standaard collimator: <strong>${dtCollimator.toFixed(1)} μSv/uur</strong>.<br>` +
        `<small style="opacity:0.85;">(Berekend met de omgevormde formule uit <a href="afzettinggamma.html" class="ai-link" target="_blank">afzettinggamma.html</a>: <span class="rt-math-inline"><i>D</i> = <span class="rt-math-frac"><span class="rt-math-num">Ci &times; 37000 &times; <i>k</i></span><span class="rt-math-den"><i>R</i><sup>2</sup></span></span></span>${hvlHint}).</small>`
      );
    }

    // Specifieke vraag 2: "Hoeveel mm lood / afscherming heb ik nodig om op X meter uit te komen?" (omgevormde afzettingsformule)
    if (subModus === "lood_nodig") {
      if (!doelM || doelM <= 0) {
        if (typeof actiefGespreksGeheugen !== "undefined" && actiefGespreksGeheugen) {
          actiefGespreksGeheugen.verwachtParameter = "afzettingDoelMeter";
        }
        if (chips) chips.push("5 meter", "8 meter", "10 meter", "15 meter", "20 meter");
        return `Op welke maximale <strong>afzettingsafstand (in meter)</strong> wil je uitkomen met <strong>${ci.toFixed(1)} Curie ${bronType}</strong>${bronNaam} (bij norm ${dosis} μSv/h)?`;
      }
      if (typeof actiefGespreksGeheugen !== "undefined" && actiefGespreksGeheugen && actiefGespreksGeheugen.verwachtParameter === "afzettingDoelMeter") {
        actiefGespreksGeheugen.verwachtParameter = null;
      }
      const attenBestaand =
        Math.pow(0.5, fe / hvlFe) *
        Math.pow(0.5, beton / hvlBeton) *
        Math.pow(0.5, baksteen / hvlBaksteen);
      const heeftBestaandeAfscherming = (fe > 0 || beton > 0 || baksteen > 0);
      const bestaandDelen = maakAfschermDelen(false);
      const bestaandLabel = heeftBestaandeAfscherming ? ` incl. ${bestaandDelen.join(" en ")}` : "";

      const openAfstVoorLood = Math.sqrt((ci * 37000 * k * attenBestaand) / dosis);
      const collAfstVoorLood = Math.sqrt((ci * 37000 * k * collimatorFactor * attenBestaand) / dosis);
      const verhoudingOpen = (ci * 37000 * k * attenBestaand) / (doelM * doelM * dosis);
      const benodigdPbOpen = verhoudingOpen > 1 ? hvlPb * Math.log2(verhoudingOpen) : 0;
      const verhoudingColl = (ci * 37000 * k * collimatorFactor * attenBestaand) / (doelM * doelM * dosis);
      const benodigdPbColl = verhoudingColl > 1 ? hvlPb * Math.log2(verhoudingColl) : 0;

      const pbOpenCeil = benodigdPbOpen > 0 ? Math.ceil(benodigdPbOpen) : 0;
      const pbCollCeil = benodigdPbColl > 0 ? Math.ceil(benodigdPbColl) : 0;

      if (chips && chips.length === 0) {
        chips.push("Op 8 meter", "Op 10 meter", "Op 15 meter", isIr ? "Sterkste Se-75" : "Sterkste Ir-192", `Dosistempo op ${doelM} meter`);
      }

      const hvlExtra = [];
      if (beton > 0) hvlExtra.push(`HVL beton = ${hvlBeton} mm`);
      if (baksteen > 0) hvlExtra.push(`HVL baksteen = ${hvlBaksteen} mm`);
      if (fe > 0) hvlExtra.push(`HVL staal = ${hvlFe} mm`);
      const hvlInfo = hvlExtra.length > 0 ? `, ${hvlExtra.join(", ")}` : "";

      let loodResp = `Om bij <strong>${ci.toFixed(1)} Curie ${bronType}</strong>${bronNaam}${bestaandLabel} op een afzettingsafstand van <strong>${doelM} meter</strong> (bij ${dosis} μSv/h) uit te komen (HVL lood = ${hvlPb} mm${hvlInfo}):<br>`;
      if (pbOpenCeil <= 0) {
        const redenOpen = bestaandDelen.length > 0 ? `met ${bestaandDelen.join(" en ")} ` : "";
        loodResp += `• <strong>In de open bundel:</strong> <strong>0 mm extra lood</strong> nodig (${redenOpen}is de afzettingsafstand al <strong>${openAfstVoorLood.toFixed(1)} meter</strong> &le; ${doelM} m).<br>`;
      } else {
        loodResp += `• <strong>In de open bundel (richting van de bundel):</strong> <strong>${pbOpenCeil} mm lood</strong> nodig (reduceert van ${openAfstVoorLood.toFixed(1)} m naar &le; ${doelM} m).<br>`;
      }
      if (pbCollCeil <= 0) {
        loodResp += `• <strong>Achter een standaard collimator:</strong> <strong>0 mm extra lood</strong> nodig (de afzettingsafstand achter de collimator is al <strong>${collAfstVoorLood.toFixed(1)} meter</strong> &le; ${doelM} m).<br>`;
      } else {
        loodResp += `• <strong>Achter een standaard collimator:</strong> nog <strong>${pbCollCeil} mm extra lood</strong> nodig (reduceert van ${collAfstVoorLood.toFixed(1)} m naar &le; ${doelM} m).<br>`;
      }
      loodResp += `<small style="opacity:0.85;">(Berekend met de omgevormde formule uit <a href="afzettinggamma.html" class="ai-link" target="_blank">afzettinggamma.html</a>).</small>`;
      return loodResp;
    }

    // Basis / puur (zonder externe lood/staal/muur afscherming)
    const afzettingOpenPuur = Math.sqrt((ci * 37000 * k) / dosis);
    const collimatorAfstandPuur = Math.sqrt((ci * 37000 * k * collimatorFactor) / dosis);

    // Met externe afscherming (loodplaat / pb / fe / beton / baksteen)
    const hasAfscherming = (pb > 0 || fe > 0 || beton > 0 || baksteen > 0);
    const attenAfscherming =
      Math.pow(0.5, pb / hvlPb) *
      Math.pow(0.5, fe / hvlFe) *
      Math.pow(0.5, beton / hvlBeton) *
      Math.pow(0.5, baksteen / hvlBaksteen);
    const afzettingOpenMetAfscherming = Math.sqrt((ci * 37000 * k * attenAfscherming) / dosis);
    const collimatorAfstandMetAfscherming = Math.sqrt((ci * 37000 * k * collimatorFactor * attenAfscherming) / dosis);

    // 3. Afzetting in de bundel achter de pijp (doorstraalde leidingdikte als afscherming)
    // Geldt wanneer in het geheugen of vraag een las / leiding bekend is (bijv. >100 mm DWSI)
    const isDwsiTechniek = params.technique === "DWSI" || (params.diameter && params.diameter > 100);
    const isLeidingContext = Boolean(
      params.diameter ||
      params.technique === "DWSI" ||
      params.technique === "DWDI" ||
      params.doorstraaldeDikte ||
      (params.wanddikte && !params.isPlaat)
    );

    let doorstraaldStaal = 0;
    if (params.doorstraaldeDikte && params.doorstraaldeDikte > 0) {
      doorstraaldStaal = params.doorstraaldeDikte;
    } else if (params.wanddikte && params.wanddikte > 0) {
      if (params.isPlaat || params.technique === "SWSI") {
        doorstraaldStaal = params.wanddikte;
      } else {
        // Bij leidingen (DWSI / DWDI) passeert de nuttige bundel beide wanden (2 * t)
        doorstraaldStaal = params.wanddikte * 2;
      }
    }

    let afzettingPijpPuur = 0;
    let afzettingPijpMetAfscherming = 0;
    if (doorstraaldStaal > 0) {
      const attenPijpPuur = Math.pow(0.5, doorstraaldStaal / hvlFe);
      afzettingPijpPuur = Math.sqrt((ci * 37000 * k * attenPijpPuur) / dosis);
      afzettingPijpMetAfscherming = Math.sqrt((ci * 37000 * k * attenPijpPuur * attenAfscherming) / dosis);
    }

    const diaLabel = params.diameter ? formatMmNaarDuimLabel(params.diameter) : "";
    const isLoodplaatGenoemd = /\b(?:loodplaat|loodplaten|loden\s*plaat|loden\s*platen|lood\s*plaat|lood\s*platen)\b/i.test(lower) || Boolean(params.aantalLoodplaten);
    let loodplaatSuffix = "";
    let afschermKortLabel = "";
    const kortDelen = [];
    if (isLoodplaatGenoemd && pb > 0) {
      const nPlaten = params.aantalLoodplaten || (pb % 6 === 0 ? pb / 6 : 1);
      loodplaatSuffix = nPlaten > 1
        ? ` [${nPlaten} loodplaten &times; 6 mm = ${pb} mm Pb]`
        : " [standaard loodplaat 6 mm Pb]";
      kortDelen.push(nPlaten > 1 ? `${nPlaten} loodplaten (${pb} mm Pb)` : `loodplaat (${pb} mm Pb)`);
    } else if (pb > 0) {
      kortDelen.push(`${pb} mm lood`);
    }
    if (fe > 0) kortDelen.push(`${fe} mm staal`);
    if (beton > 0) kortDelen.push(`${beton >= 10 && beton % 10 === 0 ? `${beton / 10} cm` : `${beton} mm`} beton`);
    if (baksteen > 0) kortDelen.push(`${baksteen >= 10 && baksteen % 10 === 0 ? `${baksteen / 10} cm` : `${baksteen} mm`} baksteen`);
    afschermKortLabel = kortDelen.join(" + ");

    const alleAfschermDelen = maakAfschermDelen(true, loodplaatSuffix);
    const afschermingInfo = hasAfscherming
      ? ` met ${alleAfschermDelen.join(" en ")}`
      : "";

    if (chips && chips.length === 0) {
      if (doorstraaldStaal === 0 && isLeidingContext) {
        chips.push("6 mm wand", "8 mm wand", "10 mm wand");
      }
      if (isSe) chips.push("Ir-192");
      else chips.push("Se-75");
      if (pb === 0) chips.push("6 mm lood (1 plaat)", "12 mm lood (2 platen)");
    }

    let resp = "";
    if (hasAfscherming) {
      const exclLabel = (beton > 0 || baksteen > 0 || fe > 0) && pb === 0 ? "afscherming" : "loodafscherming";
      resp = `Voor een ${bronType} bron van ${ci.toFixed(1)} Curie${bronNaam}${afschermingInfo} bij norm ${dosis} μSv/h:<br><br>` +
             `• <strong>In de open bundel:</strong><br>` +
             `&nbsp;&nbsp;– Excl. ${exclLabel}: <strong>${afzettingOpenPuur.toFixed(1)} meter</strong><br>` +
             `&nbsp;&nbsp;– Incl. ${afschermKortLabel}: <strong>${afzettingOpenMetAfscherming.toFixed(1)} meter</strong> afzetting.<br><br>` +
             `• <strong>Achter standaard collimator:</strong><br>` +
             `&nbsp;&nbsp;– Alleen collimator (excl. ${exclLabel}): <strong>${collimatorAfstandPuur.toFixed(1)} meter</strong><br>` +
             `&nbsp;&nbsp;– Collimator + ${afschermKortLabel}: <strong>${collimatorAfstandMetAfscherming.toFixed(1)} meter</strong> afzetting.<br>`;

      if (doorstraaldStaal > 0) {
        const detailLabel = diaLabel ? ` op ${diaLabel}` : (isDwsiTechniek ? " DWSI" : "");
        resp += `<br>• <strong>In de bundel achter de pijp (doorstraalde dikte: ${doorstraaldStaal.toFixed(1)} mm staal${detailLabel}):</strong><br>` +
                `&nbsp;&nbsp;– Zonder loodafscherming: <strong>${afzettingPijpPuur.toFixed(1)} meter</strong><br>` +
                `&nbsp;&nbsp;– Met ${afschermKortLabel}: <strong>${afzettingPijpMetAfscherming.toFixed(1)} meter</strong> afzetting.<br>`;
      } else if (isLeidingContext && !params.wanddikte) {
        const detailLabel = diaLabel ? ` op ${diaLabel}` : " (DWSI)";
        resp += `<br>• <strong>In de bundel achter de pijp${detailLabel}:</strong> geef de wanddikte op om ook direct de gereduceerde afzetting met de doorstraalde leidingdikte als afscherming te berekenen.<br>`;
      }
    } else {
      resp = `Voor een ${bronType} bron van ${ci.toFixed(1)} Curie${bronNaam} bij norm ${dosis} μSv/h:<br>` +
             `• In de open bundel (zonder collimator / afscherming): <strong>${afzettingOpenPuur.toFixed(1)} meter</strong> afzetting.<br>` +
             `• Achter een standaard collimator: <strong>${collimatorAfstandPuur.toFixed(1)} meter</strong>.<br>`;

      if (doorstraaldStaal > 0) {
        const detailLabel = diaLabel ? ` op ${diaLabel}` : (isDwsiTechniek ? " DWSI" : "");
        resp += `• In de bundel achter de pijp (doorstraalde dikte: ${doorstraaldStaal.toFixed(1)} mm staal${detailLabel}): <strong>${afzettingPijpPuur.toFixed(1)} meter</strong> afzetting.<br>`;
      } else if (isLeidingContext && !params.wanddikte) {
        const detailLabel = diaLabel ? ` op ${diaLabel}` : " (DWSI)";
        resp += `• In de bundel achter de pijp${detailLabel}: geef de wanddikte op om ook direct de gereduceerde afzetting met de doorstraalde leidingdikte als afscherming te berekenen.<br>`;
      }

      // Handige vergelijking met 1 standaard loodplaat (6 mm Pb)
      const attenTip6 = Math.pow(0.5, 6 / hvlPb);
      const tipOpen = Math.sqrt((ci * 37000 * k * attenTip6) / dosis);
      const tipColl = Math.sqrt((ci * 37000 * k * collimatorFactor * attenTip6) / dosis);
      let tipExtra = "";
      if (doorstraaldStaal > 0) {
        const tipPijp = Math.sqrt((ci * 37000 * k * Math.pow(0.5, doorstraaldStaal / hvlFe) * attenTip6) / dosis);
        tipExtra = `<br>• Achter de pijp: ${afzettingPijpPuur.toFixed(1)} m &rarr; <strong>${tipPijp.toFixed(1)} m</strong>`;
      }
      resp += `<div style="background:#14171f; border:1px solid rgba(245,223,77,0.3); border-radius:6px; padding:6px 10px; margin:8px 0 4px 0; font-size:0.83rem; color:#ccc;">` +
              `💡 <em>Ter vergelijking met 1 standaard loodplaat (6 mm Pb):</em><br>` +
              `• In de open bundel: ${afzettingOpenPuur.toFixed(1)} m &rarr; <strong>${tipOpen.toFixed(1)} m</strong><br>` +
              `• Achter de collimator: ${collimatorAfstandPuur.toFixed(1)} m &rarr; <strong>${tipColl.toFixed(1)} m</strong>${tipExtra}` +
              `</div>`;
    }

    resp += `<small style="opacity: 0.85;">(Berekend volgens <a href="afzettinggamma.html" class="ai-link" target="_blank">afzettinggamma.html</a> met collimatorfactor ${collimatorFactor === 0.05 ? "1/20" : "1/85"}).</small>`;

    return resp;
  }

  // Helper om alle toegestane onstream bronnen te bepalen (bronkeuze2.html / RT21021 / RT21022)
  function bepaalOnstreamBronnen(wmax, techniek, klasse) {
    let bronnen = [];
    const tech = (techniek || "tangentiaal").toLowerCase();
    const kl = (klasse || "ta").toLowerCase();
    if (tech === "tangentiaal") {
      if (kl === "ta") {
        if (wmax < 55.1) bronnen.push("Se-75");
        if (wmax > 9.9 && wmax < 80.1) bronnen.push("Ir-192");
        if (wmax > 39.1 && wmax < 120.1) bronnen.push("Co-60");
      } else {
        if (wmax < 40.1) bronnen.push("Se-75");
        if (wmax > 19.9 && wmax < 60.1) bronnen.push("Ir-192");
        if (wmax > 39.1 && wmax < 85.1) bronnen.push("Co-60");
      }
    } else {
      if (kl === "ta") {
        if (wmax > 4.9 && wmax < 55.1) bronnen.push("Se-75");
        if (wmax > 9.9 && wmax < 100.1) bronnen.push("Ir-192");
        if (wmax > 39.1 && wmax < 200.1) bronnen.push("Co-60");
      } else {
        if (wmax > 9.9 && wmax < 40.1) bronnen.push("Se-75");
        if (wmax > 19.9 && wmax < 90.1) bronnen.push("Ir-192");
        if (wmax > 39.1 && wmax < 200.1) bronnen.push("Co-60");
      }
    }
    return bronnen;
  }

  function formatteerOnstreamBronnenMetAdvies(bronnen, wmax) {
    const warningThresholds = { "Se-75": 41, "Ir-192": 64, "Co-60": 100 };
    if (!bronnen || bronnen.length === 0) {
      return {
        bronTekst: "<strong>Geen geschikte bron (Wmax &gt; toelaatbare grens)</strong>",
        adviesTekst: "",
      };
    }
    const items = bronnen.map((b) => {
      const over = warningThresholds[b] && wmax > warningThresholds[b];
      return over ? `<strong>${b}</strong> <span style="color:#ffb347;">(⚠️ zit tegen de grens)</span>` : `<strong>${b}</strong>`;
    });
    let advies = "";
    if (bronnen.includes("Se-75") && wmax > warningThresholds["Se-75"] && bronnen.includes("Ir-192")) {
      advies = `<br>• 💡 <em>Advies: <strong>Ir-192</strong> is hier een betere keus omdat <strong>Se-75</strong> (bij Wmax = ${wmax.toFixed(1)} mm) al bijna tegen de grens zit.</em>`;
    } else if (bronnen.includes("Ir-192") && wmax > warningThresholds["Ir-192"] && bronnen.includes("Co-60")) {
      advies = `<br>• 💡 <em>Advies: <strong>Co-60</strong> is hier een ruimere keus omdat <strong>Ir-192</strong> (bij Wmax = ${wmax.toFixed(1)} mm) al bijna tegen de grens zit.</em>`;
    } else if (bronnen.some((b) => warningThresholds[b] && wmax > warningThresholds[b])) {
      advies = ` ⚠️ <em>Opletten: bron kan gebruikt worden maar zit tegen de grens!</em>`;
    }
    return {
      bronTekst: items.join(", "),
      adviesTekst: advies,
    };
  }

  // 2. Onstream RT (onstreamffd.html & bronkeuze2.html)
  function berekenOnstream(params, vraagTekst, chips = []) {
    const lower = (vraagTekst || "").toLowerCase();
    const De = params.diameter;
    const t = params.wanddikte;
    const techniek = params.onstreamTechniek || "tangentiaal";
    const klasse = (params.onstreamKlasse || "").toLowerCase();
    const b = params.brongrootte;
    const hasIso = params.isolatieMm !== null && params.isolatieMm !== undefined;
    const Iso = hasIso ? params.isolatieMm : null;

    // Vraag over het bepalen van de restwanddikte uit een tangentiële opname op film (Q80)
    if (/\b(restwanddikte|schijnbare\s*wanddikte|vergrotingsfactor)\b/i.test(lower)) {
      return `<strong>Restwanddikte bepalen bij een tangentiële onstream opname (RT21021 / EN 16407-1):</strong><br><br>` +
             `Door de projectie vanaf het middelpunt van de buis naar de film (object-tot-filmafstand <span class="rt-math-inline"><i>d</i> = <i>D</i><sub>e</sub> / 2 + isolatie</span>) wordt de wand op de film vergroot afgebeeld:<br>` +
             `• <strong>Via geometrische correctie:</strong><br>` +
             `<div class="rt-math-box"><i>t</i><sub>werkelijk</sub> = <i>t</i><sub>gemeten op film</sub> &times; <span class="rt-math-frac"><span class="rt-math-num">FFD &minus; <i>d</i></span><span class="rt-math-den">FFD</span></span></div><br>` +
             `• <strong>Via kalibratiekogel / vergrotingsindicator:</strong> Plaats een stalen referentiekogel (of strip met bekende maat <i>K</i><sub>echt</sub>) ter hoogte van de hartlijn van de pijp en corrigeer via:<br>` +
             `<div class="rt-math-box"><i>t</i><sub>werkelijk</sub> = <i>t</i><sub>film</sub> &times; <span class="rt-math-frac"><span class="rt-math-num"><i>K</i><sub>echt</sub></span><span class="rt-math-den"><i>K</i><sub>film</sub></span></span></div>`;
    }

    // Vraag naar de Wmax tabel / grenswaarden TA en TB (Tabel 1 RT21021 / RT21022)
    const isWmaxTabelVraag =
      /\b(tabel\s*1|wmax\s*waardes|wmax\s*grenzen|toelaatbare\s*wmax|max\w*\s*wmax|grenswaarden\s*wmax|limieten\s*wmax)\b/i.test(lower) ||
      (/\b(ta\s*(?:en|&)\s*tb|tb\s*(?:en|&)\s*ta|klasse\s*ta|klasse\s*tb)\b/i.test(lower) && /\b(wmax|toelaatbaar|toegestaan|grens|limiet|waardes|tabel|verschil|hetzelfde|zelfde)\b/i.test(lower)) ||
      (/\b(hoe\s+komt\s+radi|waarom\s+(?:zijn|zie\s+ik)|zelfde\s+waarde)\b/i.test(lower) && /\b(wmax|ta|tb)\b/i.test(lower));

    if (isWmaxTabelVraag) {
      let resp = `<strong>Tabel 1: Keuze stralingsbron vs wanddikte (Limieten op maximale doorstraalde dikte Wmax):</strong><br><br>`;
      resp += `<table style="width:100%; border-collapse:collapse; font-size:0.92rem; margin-bottom:12px;">` +
        `<thead><tr style="border-bottom:1px solid rgba(245,223,77,0.4); text-align:left; color:#F5DF4D;">` +
        `<th style="padding:6px;">Stralingsbron</th><th style="padding:6px; text-align:center;">Klasse TA [mm]</th><th style="padding:6px; text-align:center;">Klasse TB [mm]</th></tr></thead><tbody>` +
        `<tr style="border-bottom:1px solid rgba(255,255,255,0.08);"><td style="padding:5px 6px;">⚡ X-ray (100 kV)</td><td style="padding:5px 6px; text-align:center;">&le; 10 mm</td><td style="padding:5px 6px; text-align:center;">&le; 7 mm</td></tr>` +
        `<tr style="border-bottom:1px solid rgba(255,255,255,0.08);"><td style="padding:5px 6px;">⚡ X-ray (200 kV)</td><td style="padding:5px 6px; text-align:center;">&le; 30 mm</td><td style="padding:5px 6px; text-align:center;">&le; 20 mm</td></tr>` +
        `<tr style="border-bottom:1px solid rgba(255,255,255,0.08);"><td style="padding:5px 6px;">⚡ X-ray (300 kV)</td><td style="padding:5px 6px; text-align:center;">&le; 40 mm</td><td style="padding:5px 6px; text-align:center;">&le; 30 mm</td></tr>` +
        `<tr style="border-bottom:1px solid rgba(255,255,255,0.08);"><td style="padding:5px 6px;">⚡ X-ray (400 kV)</td><td style="padding:5px 6px; text-align:center;">&le; 50 mm</td><td style="padding:5px 6px; text-align:center;">&le; 35 mm</td></tr>` +
        `<tr style="border-bottom:1px solid rgba(255,255,255,0.08);"><td style="padding:5px 6px;">☢️ Se-75</td><td style="padding:5px 6px; text-align:center; font-weight:700; color:#F5DF4D;">&le; 55 mm</td><td style="padding:5px 6px; text-align:center; font-weight:700; color:#F5DF4D;">&le; 40 mm</td></tr>` +
        `<tr style="border-bottom:1px solid rgba(255,255,255,0.08);"><td style="padding:5px 6px;">☢️ Ir-192</td><td style="padding:5px 6px; text-align:center; font-weight:700; color:#F5DF4D;">&le; 80 mm</td><td style="padding:5px 6px; text-align:center; font-weight:700; color:#F5DF4D;">&le; 60 mm</td></tr>` +
        `<tr style="border-bottom:1px solid rgba(255,255,255,0.08);"><td style="padding:5px 6px;">☢️ Co-60</td><td style="padding:5px 6px; text-align:center; font-weight:700; color:#F5DF4D;">&le; 120 mm</td><td style="padding:5px 6px; text-align:center; font-weight:700; color:#F5DF4D;">&le; 85 mm</td></tr>` +
        `</tbody></table>`;
      resp += `💡 <em>Toelichting grenswaarden:</em><br>` +
        `• <strong>Klasse TA</strong> (standaard): Wmax limieten zijn <strong>&le; 55 mm</strong> (Se-75), <strong>&le; 80 mm</strong> (Ir-192) en <strong>&le; 120 mm</strong> (Co-60).<br>` +
        `• <strong>Klasse TB</strong> (improved): Wmax limieten zijn strenger: <strong>&le; 40 mm</strong> (Se-75), <strong>&le; 60 mm</strong> (Ir-192) en <strong>&le; 85 mm</strong> (Co-60).<br>` +
        `• De waarden <strong>41 mm</strong> (Se-75) en <strong>64 mm</strong> (Ir-192) zijn interne waarschuwingsdrempels in de software (<em>"bron zit tegen de grens"</em>), maar <strong>niet</strong> de normatieve Wmax-limieten uit Tabel 1.<br>` +
        `<small style="opacity:0.85;">(Conform Tabel 1: Choice of radiation source versus wall thickness, RT21021 / RT21022 & <a href="bronkeuze2.html" class="ai-link" target="_blank">bronkeuze2.html</a>).</small>`;
      if (chips) chips.push("Klasse TA", "Klasse TB", "Ir-192", "Se-75");
      return resp;
    }

    if (!De) {
      if (typeof actiefGespreksGeheugen !== "undefined" && actiefGespreksGeheugen) {
        actiefGespreksGeheugen.verwachtParameter = "diameter";
      }
      return "Voor een onstream berekening heb ik minimaal de <strong>uitwendige diameter (De)</strong> in mm of duim nodig. Wat is de diameter?";
    }

    const diaLabel = formatMmNaarDuimLabel(De);
    const vraagtExplicietOmFFD = /\b(ffd|sfd|focus|afstand|focusafstand)\b/i.test(lower);
    const isPuurBronVraag =
      !vraagtExplicietOmFFD &&
      /\b(bronkeuze|wmax|w-max|welke\s+bron|kan\s+ik.*gebruiken|mag\s+ik.*gebruiken|is\s+.*geschikt)\b/i.test(lower);
    const isOnstreamFFDFlow =
      vraagtExplicietOmFFD ||
      (typeof actiefGespreksGeheugen !== "undefined" &&
        actiefGespreksGeheugen &&
        actiefGespreksGeheugen.laatsteIntentie === "onstream_ffd" &&
        !isPuurBronVraag) ||
      (!t && !/\b(bron|bronkeuze|geschikt|isotoop|welke\s+bron|wmax|w-max|iridium|selenium|kobalt|kan\s+ik|mag\s+ik)\b/i.test(lower));

    // 1. Specifiek FFD gevraagd (onstreamffd.html) of lopende onstream_ffd dialoog
    // Voor minimale onstream FFD wordt eerst de minimale focus berekend, met Wmax / bronkeuze als extra info daaronder!
    if (isOnstreamFFDFlow) {
      if (!b) {
        if (typeof actiefGespreksGeheugen !== "undefined" && actiefGespreksGeheugen) {
          actiefGespreksGeheugen.verwachtParameter = "brongrootte";
        }
        if (chips) {
          chips.push(...geefBrongrootteSuggestieChips(params.bronTekst));
          if (!hasIso) chips.push("Geen isolatie", "50 mm isolatie");
          if (!klasse) chips.push("Klasse TA", "Klasse TB");
        }
        return `Voor de minimale onstream FFD op <strong>${diaLabel}</strong> (conform <a href="onstreamffd.html" class="ai-link" target="_blank">onstreamffd.html</a>) is de wanddikte niet van toepassing.<br>` +
               `Welke <strong>brongrootte</strong> (focusafmeting in mm) of welke bron gebruik je?`;
      }

      // Alleen doorvragen naar isolatiedikte als de gebruiker zelf aangaf dat er isolatie is zonder dikte te noemen
      const noemtIsolatieZonderWaarde = !hasIso && /\b(met\s+isolatie|ge[iï]soleerd|geisoleerd|isolatiedikte)\b/i.test(lower);
      if (noemtIsolatieZonderWaarde) {
        if (typeof actiefGespreksGeheugen !== "undefined" && actiefGespreksGeheugen) {
          actiefGespreksGeheugen.verwachtParameter = "isolatieMm";
        }
        if (chips) {
          chips.push("Geen isolatie", "25 mm isolatie", "40 mm isolatie", "50 mm isolatie", "60 mm isolatie", "80 mm isolatie");
          if (!klasse) chips.push("Klasse TA", "Klasse TB");
        }
        return `Wat is de <strong>isolatiedikte</strong> (in mm) op de leiding van <strong>${diaLabel}</strong>?`;
      }
      const effIso = hasIso ? Iso : 0;

      // Bereken FFD conform onstreamffd.html (als klasse niet gespecificeerd is, default naar TB en toon TA ter vergelijking)
      const effKlasse = klasse || "tb";
      const isDWSI = techniek !== "tangentiaal" && De >= 150;
      let OFD = De + effIso;
      let ofdInfo = "";

      if (isDWSI) {
        if (!t) {
          if (typeof actiefGespreksGeheugen !== "undefined" && actiefGespreksGeheugen) {
            actiefGespreksGeheugen.verwachtParameter = "wanddikte";
          }
          if (chips) chips.push("4 mm dik", "6.5 mm dik", "7.1 mm dik", "8 mm dik", "11 mm dik");
          return `Voor ${diaLabel} bij RT21022 (dubbelwand) is de diameter &ge; 150 mm (6 duimer en groter). Hierbij wordt de <strong>DWSI onstream techniek</strong> gebruikt (alleen de filmzijde wand wordt beoordeeld).<br>De object-film afstand (OFD) is de afstand vanaf de binnenwand van de pijp tot aan de film (${effIso > 0 ? `wanddikte + ${effIso} mm isolatie` : "wanddikte t"}). Wat is de <strong>wanddikte</strong> (in mm)?`;
        }
        OFD = t + effIso;
        ofdInfo = `${OFD.toFixed(1)} mm (afstand binnenwand filmzijde tot film conform DWSI &ge; 150 mm)`;
      } else {
        ofdInfo = `${OFD.toFixed(1)} mm (${techniek === "tangentiaal" ? "" : "buitendiameter conform DWDI &lt; 150 mm"})`;
      }

      const PDD = De / 2 + effIso;
      let minFFD = 0;
      let ffd1 = 0;
      let ffd2 = 0;
      let ffdOnscherpte = 0;
      let ffdFysiek = 0;

      if (techniek === "tangentiaal") {
        ffd1 = PDD + 3.5 * De;
        ffd2 = (b * PDD) / (effKlasse === "tb" ? 0.3 : 0.6);
        minFFD = Math.max(ffd1, ffd2);
      } else if (isDWSI) {
        ffdOnscherpte = (b * OFD) / (effKlasse === "tb" ? 0.3 : 0.6);
        ffdFysiek = De + 2 * effIso;
        minFFD = Math.max(ffdOnscherpte, ffdFysiek);
      } else {
        minFFD = (b * OFD) / (effKlasse === "tb" ? 0.3 : 0.6);
      }

      const ffdAfgerond = Math.round(minFFD);
      params.sfd = ffdAfgerond;
      if (typeof actiefGespreksGeheugen !== "undefined" && actiefGespreksGeheugen) {
        actiefGespreksGeheugen.sfd = ffdAfgerond;
        actiefGespreksGeheugen.verwachtParameter = null;
      }

      const altKlasse = effKlasse === "ta" ? "tb" : "ta";
      let altFFD = 0;
      if (techniek === "tangentiaal") {
        const altFfd2 = (b * PDD) / (altKlasse === "tb" ? 0.3 : 0.6);
        altFFD = Math.round(Math.max(ffd1, altFfd2));
      } else if (isDWSI) {
        const altOnscherpte = (b * OFD) / (altKlasse === "tb" ? 0.3 : 0.6);
        altFFD = Math.round(Math.max(altOnscherpte, ffdFysiek));
      } else {
        altFFD = Math.round((b * OFD) / (altKlasse === "tb" ? 0.3 : 0.6));
      }

      let resp = `Voor ${diaLabel} bij een onstream opname conform ${techniek === "tangentiaal" ? "Tangentiaal (RT21021)" : `Dubbelwand (${isDWSI ? "DWSI" : "DWDI"} RT21022)`}, Klasse ${effKlasse.toUpperCase()} met focus ${b} mm${effIso > 0 ? ` en ${effIso} mm isolatie` : " (ongeïsoleerd)"}:<br>` +
                 `• <strong>Minimale FFD: ${(ffdAfgerond / 10).toFixed(1)} cm</strong> (${ffdAfgerond} mm).<br>` +
                 `<span class="rt-tts-summary" style="display:none">Minimaal ${(ffdAfgerond / 10).toFixed(1)} cm</span>` +
                 `• ${techniek === "tangentiaal" ? `PDD: ${PDD.toFixed(1)} mm (geometrische bundeleis ffd₁ = ${Math.round(ffd1)} mm, toelaatbare onscherpte ffd₂ = ${Math.round(ffd2)} mm bij Ug ${effKlasse === "tb" ? "0.3" : "0.6"} mm).` : `OFD: ${ofdInfo}${isDWSI ? ` (Ug ${effKlasse === "tb" ? "0.3" : "0.6"} mm vereist min. ${Math.round(ffdOnscherpte)} mm FFD, fysieke contact-FFD buitenkant buis is ${Math.round(ffdFysiek)} mm)` : ` (toelaatbare onscherpte bij Ug ${effKlasse === "tb" ? "0.3" : "0.6"} mm)`}.`}<br>` +
                 `<small style="opacity: 0.85;">(Ter vergelijking bij Klasse ${altKlasse.toUpperCase()}: minimale FFD ${altFFD} mm; zie <a href="onstreamffd.html" class="ai-link" target="_blank">onstreamffd.html</a>).</small>`;

      if (chips) {
        chips.push(effKlasse === "ta" ? "Klasse TB" : "Klasse TA");
        if (effIso === 0) chips.push("25 mm isolatie", "50 mm isolatie");
        else chips.push("Geen isolatie");
        chips.push(techniek === "tangentiaal" ? "Dubbelwand" : "Tangentiaal");
      }

      // Als wanddikte bekend is (bijv. via schedule of directe invoer), geef Wmax en bronkeuze-check als extra info onder het FFD-antwoord!
      if (t) {
        const wmaxKlasse = klasse || "ta";
        const wmax = 2 * Math.sqrt(t * (De - t));
        const bronnen = bepaalOnstreamBronnen(wmax, techniek, wmaxKlasse);
        const { bronTekst, adviesTekst } = formatteerOnstreamBronnenMetAdvies(bronnen, wmax);
        const onstreamGrenzen = techniek === "dubbelwand"
          ? {
              ta: { "Se-75": [0, 40], "Ir-192": [10, 100], "Co-60": [40, 200] },
              tb: { "Se-75": [0, 40], "Ir-192": [20, 90], "Co-60": [60, 200] }
            }
          : {
              ta: { "Se-75": [0, 55], "Ir-192": [10, 80], "Co-60": [40, 120] },
              tb: { "Se-75": [0, 40], "Ir-192": [15, 60], "Co-60": [50, 85] }
            };
        const bereikTekst = (bronKey, kl) => {
          const [mn, mx] = onstreamGrenzen[kl][bronKey];
          return mn > 0 ? `${mn}&ndash;${mx} mm` : `max. ${mx} mm`;
        };
        const isIrGekozen = /\b(iridium|ir[-\s]?192|ir192)\b/i.test(lower) || (params.bronTekst && /ir[-\s]?192|iridium/i.test(params.bronTekst)) || params.bronType === "Ir192";
        const isSeGekozen = /\b(selenium|seleen|se[-\s]?75|se75)\b/i.test(lower) || (params.bronTekst && /se[-\s]?75|selenium|seleen/i.test(params.bronTekst)) || params.bronType === "Se75";
        const isCoGekozen = /\b(kobalt|co[-\s]?60|co60)\b/i.test(lower) || (params.bronTekst && /co[-\s]?60|kobalt/i.test(params.bronTekst)) || params.bronType === "Co60";

        let extraWaarschuwing = "";
        if (isIrGekozen && !bronnen.includes("Ir-192")) {
          extraWaarschuwing = `<br>• ❌ <strong>Let op:</strong> <strong>Ir-192 (Iridium)</strong> is NIET geschikt/toegestaan voor deze wanddikte! De berekende doorstraalde wanddikte Wmax is <strong>${wmax.toFixed(1)} mm</strong> (toelaatbaar bereik voor Ir-192 bij ${techniek} Klasse ${wmaxKlasse.toUpperCase()} is <strong>${bereikTekst("Ir-192", wmaxKlasse)}</strong> volgens Tabel 1 RT21021 / RT21022).`;
        } else if (isSeGekozen && !bronnen.includes("Se-75")) {
          extraWaarschuwing = `<br>• ❌ <strong>Let op:</strong> <strong>Se-75 (Selenium)</strong> is NIET geschikt/toegestaan voor deze wanddikte! De berekende doorstraalde wanddikte Wmax is <strong>${wmax.toFixed(1)} mm</strong> (toelaatbaar bereik voor Se-75 bij ${techniek} Klasse ${wmaxKlasse.toUpperCase()} is <strong>${bereikTekst("Se-75", wmaxKlasse)}</strong> volgens Tabel 1 RT21021 / RT21022).`;
        } else if (isCoGekozen && !bronnen.includes("Co-60")) {
          extraWaarschuwing = `<br>• ❌ <strong>Let op:</strong> <strong>Co-60 (Kobalt)</strong> is NIET geschikt voor deze wanddikte! De berekende doorstraalde wanddikte Wmax is <strong>${wmax.toFixed(1)} mm</strong> (toelaatbaar bereik bij ${techniek} Klasse ${wmaxKlasse.toUpperCase()} is <strong>${bereikTekst("Co-60", wmaxKlasse)}</strong>).`;
        }

        resp += `<br><br><div style="padding:8px 10px; background:rgba(255,255,255,0.05); border-left:3px solid ${extraWaarschuwing ? "#ff6b6b" : "#F5DF4D"}; border-radius:4px; font-size:0.92rem;">` +
                `ℹ️ <strong>Extra info bronkeuze bij wanddikte ${t} mm (<a href="bronkeuze2.html" class="ai-link" target="_blank">bronkeuze2.html</a>):</strong>` +
                `${extraWaarschuwing}` +
                `<br>• Doorstraalde dikte (Klasse ${wmaxKlasse.toUpperCase()}): <strong>Wmax = ${wmax.toFixed(1)} mm</strong>.` +
                `<br>• Toegestane bron(nen): ${bronTekst}.${adviesTekst}` +
                `</div>`;
      }

      return resp;
    }

    // 2. Bronkeuze via Wmax (bronkeuze2.html)
    if (!t) {
      if (typeof actiefGespreksGeheugen !== "undefined" && actiefGespreksGeheugen) {
        actiefGespreksGeheugen.verwachtParameter = "wanddikte";
      }
      if (chips) chips.push("4 mm dik", "6.3 mm dik", "8 mm dik", "10 mm dik");
      return `Voor de onstream bronkeuze (Wmax conform <a href="bronkeuze2.html" class="ai-link" target="_blank">bronkeuze2.html</a>) op ${diaLabel} heb ik de nominale <strong>wanddikte</strong> (in mm) nodig. Wat is de wanddikte?`;
    }

    const effectiveKlasse = klasse || "ta";
    const wmax = 2 * Math.sqrt(t * (De - t));
    const bronnen = bepaalOnstreamBronnen(wmax, techniek, effectiveKlasse);
    const { bronTekst: geformatteerdeBronnen, adviesTekst: waarschuwing } = formatteerOnstreamBronnenMetAdvies(bronnen, wmax);

    const regels = [];

    // Specifiek gevraagd of een bepaalde bron toegestaan is (bijv. iridium, selenium, kobalt)
    const wilIridium = /\b(iridium|ir[-\s]?192|ir192)\b/i.test(lower) || (params.bronTekst && /ir[-\s]?192|iridium/i.test(params.bronTekst)) || params.bronType === "Ir192";
    const wilSelenium = /\b(selenium|seleen|se[-\s]?75|se75)\b/i.test(lower) || (params.bronTekst && /se[-\s]?75|selenium|seleen/i.test(params.bronTekst)) || params.bronType === "Se75";
    const wilKobalt = /\b(kobalt|co[-\s]?60|co60)\b/i.test(lower) || (params.bronTekst && /co[-\s]?60|kobalt/i.test(params.bronTekst)) || params.bronType === "Co60";
    const isWmaxVraag = /\b(wmax|w-max|wat\s+is\s+de\s+w)\b/i.test(lower);

    const onstreamGrenzen2 = techniek === "dubbelwand"
      ? {
          ta: { "Se-75": [0, 40], "Ir-192": [10, 100], "Co-60": [40, 200] },
          tb: { "Se-75": [0, 40], "Ir-192": [20, 90], "Co-60": [60, 200] }
        }
      : {
          ta: { "Se-75": [0, 55], "Ir-192": [10, 80], "Co-60": [40, 120] },
          tb: { "Se-75": [0, 40], "Ir-192": [15, 60], "Co-60": [50, 85] }
        };
    const bereikLabel = (bronKey) => {
      const [mn, mx] = onstreamGrenzen2[effectiveKlasse][bronKey];
      return mn > 0 ? `${mn}&ndash;${mx} mm` : `max. ${mx} mm`;
    };

    if (wilIridium) {
      if (bronnen.includes("Ir-192")) {
        regels.push(`✅ <strong>Ja, Ir-192 (Iridium) is toegestaan/geschikt!</strong> (Wmax = <strong>${wmax.toFixed(1)} mm</strong> binnen toelaatbaar bereik <strong>${bereikLabel("Ir-192")}</strong> voor ${techniek} Klasse ${effectiveKlasse.toUpperCase()} conform Tabel 1 / <a href="bronkeuze2.html" class="ai-link" target="_blank">bronkeuze2.html</a>).`);
      } else {
        regels.push(`❌ <strong>Nee, Ir-192 (Iridium) is NIET geschikt/toegestaan voor deze onstream opname!</strong> De berekende doorstraalde wanddikte Wmax is <strong>${wmax.toFixed(1)} mm</strong> (toelaatbaar bereik voor Ir-192 bij ${techniek} Klasse ${effectiveKlasse.toUpperCase()} is <strong>${bereikLabel("Ir-192")}</strong> volgens Tabel 1 RT21021 / RT21022 / <a href="bronkeuze2.html" class="ai-link" target="_blank">bronkeuze2.html</a>).`);
      }
    } else if (wilSelenium) {
      if (bronnen.includes("Se-75")) {
        regels.push(`✅ <strong>Ja, Se-75 (Selenium) is toegestaan/geschikt!</strong> (Wmax = <strong>${wmax.toFixed(1)} mm</strong> binnen toelaatbaar bereik <strong>${bereikLabel("Se-75")}</strong> voor ${techniek} Klasse ${effectiveKlasse.toUpperCase()} conform Tabel 1 / <a href="bronkeuze2.html" class="ai-link" target="_blank">bronkeuze2.html</a>).`);
      } else {
        regels.push(`❌ <strong>Nee, Se-75 (Selenium) is NIET geschikt/toegestaan voor deze onstream opname!</strong> De berekende doorstraalde wanddikte Wmax is <strong>${wmax.toFixed(1)} mm</strong> (toelaatbaar bereik voor Se-75 bij ${techniek} Klasse ${effectiveKlasse.toUpperCase()} is <strong>${bereikLabel("Se-75")}</strong> volgens Tabel 1 RT21021 / RT21022 / <a href="bronkeuze2.html" class="ai-link" target="_blank">bronkeuze2.html</a>).`);
      }
    } else if (wilKobalt) {
      if (bronnen.includes("Co-60")) {
        regels.push(`✅ <strong>Ja, Co-60 (Kobalt) is toegestaan/geschikt!</strong> (Wmax = <strong>${wmax.toFixed(1)} mm</strong> binnen toelaatbaar bereik <strong>${bereikLabel("Co-60")}</strong> voor ${techniek} Klasse ${effectiveKlasse.toUpperCase()} conform Tabel 1).`);
      } else {
        regels.push(`❌ <strong>Nee, Co-60 (Kobalt) is NIET geschikt voor deze onstream opname!</strong> De doorstraalde wanddikte Wmax is <strong>${wmax.toFixed(1)} mm</strong> (toelaatbaar bereik bij ${techniek} Klasse ${effectiveKlasse.toUpperCase()} is <strong>${bereikLabel("Co-60")}</strong> volgens Tabel 1).`);
      }
    }

    if (isWmaxVraag) {
      regels.push(
        `Voor ${diaLabel} van ${t} mm dik is de doorstraalde wanddikte:<br>` +
        `• <strong>Wmax = ${wmax.toFixed(1)} mm</strong> (berekend conform <a href="bronkeuze2.html" class="ai-link" target="_blank">bronkeuze2.html</a>).<br>` +
        `• Toegestane bron(nen) (${techniek === "tangentiaal" ? "Tangentiaal RT21021" : "Dubbelwand RT21022"}, klasse ${effectiveKlasse.toUpperCase()}): ${geformatteerdeBronnen}.${waarschuwing}`
      );
    } else {
      regels.push(
        `Onstream ${techniek.toUpperCase()} (${techniek === "tangentiaal" ? "RT21021" : "RT21022"}, klasse ${effectiveKlasse.toUpperCase()}) voor ${diaLabel} van ${t} mm dik:<br>` +
        `• Doorstraalde dikte Wmax = <strong>${wmax.toFixed(1)} mm</strong>.<br>` +
        `• Toegestane bron(nen): ${geformatteerdeBronnen}.${waarschuwing}`
      );
    }

    // Alleen doorvragen naar FFD als de vraag ook echt over FFD/focus ging
    const vroegOmFFD = /\b(ffd|sfd|focus|afstand)\b/i.test(lower);
    if (vroegOmFFD) {
      if (!b) {
        if (typeof actiefGespreksGeheugen !== "undefined" && actiefGespreksGeheugen) {
          actiefGespreksGeheugen.verwachtParameter = "brongrootte";
        }
        if (chips) chips.push(...geefBrongrootteSuggestieChips(params.bronTekst));
        regels.push(`<em>Om ook de minimale onstream FFD te berekenen: welke <strong>brongrootte</strong> (in mm) gebruik je?</em>`);
      } else if (!hasIso) {
        if (typeof actiefGespreksGeheugen !== "undefined" && actiefGespreksGeheugen) {
          actiefGespreksGeheugen.verwachtParameter = "isolatieMm";
        }
        if (chips) chips.push("Geen isolatie", "25 mm isolatie", "40 mm isolatie", "50 mm isolatie", "60 mm isolatie", "80 mm isolatie");
        regels.push(`<em>Is de leiding voorzien van isolatie, en zo ja wat is de <strong>isolatiedikte</strong> (in mm)?</em>`);
      } else if (!klasse) {
        if (typeof actiefGespreksGeheugen !== "undefined" && actiefGespreksGeheugen) {
          actiefGespreksGeheugen.verwachtParameter = "onstreamKlasse";
        }
        if (chips) chips.push("Klasse TA (basis)", "Klasse TB (improved)");
        regels.push(`<em>Volgens welke kwaliteitsklasse: <strong>Klasse TA</strong> of <strong>Klasse TB</strong>?</em>`);
      } else {
      const PDD = De / 2 + Iso;
      const isDWSI = techniek !== "tangentiaal" && De >= 150;
      let OFD = De + Iso;
      if (isDWSI && t) {
        OFD = t + Iso;
      }
      let minFFD = 0;
      let ffdOnscherpte = 0;
      let ffdFysiek = 0;

      if (techniek === "tangentiaal") {
        const ffd1 = PDD + 3.5 * De;
        const ffd2 = (b * PDD) / (effectiveKlasse === "tb" ? 0.3 : 0.6);
        minFFD = Math.max(ffd1, ffd2);
        regels.push(
          `• Minimale FFD tangentiaal (${effectiveKlasse.toUpperCase()} met brongrootte ${b} mm${Iso > 0 ? `, ${Iso} mm isolatie` : " (ongeïsoleerd)"}): <strong>${(minFFD / 10).toFixed(1)} cm</strong> (${Math.round(minFFD)} mm, PDD: ${PDD.toFixed(1)} mm).`
        );
      } else if (isDWSI) {
        ffdOnscherpte = (b * OFD) / (effectiveKlasse === "tb" ? 0.3 : 0.6);
        ffdFysiek = De + 2 * Iso;
        minFFD = Math.max(ffdOnscherpte, ffdFysiek);
        regels.push(
          `• Minimale FFD dubbelwand DWSI (${effectiveKlasse.toUpperCase()} met brongrootte ${b} mm en wand ${t} mm): <strong>${(minFFD / 10).toFixed(1)} cm</strong> (${Math.round(minFFD)} mm, OFD: ${OFD.toFixed(1)} mm vanaf binnenwand filmzijde).`
        );
      } else {
        minFFD = (b * OFD) / (effectiveKlasse === "tb" ? 0.3 : 0.6);
        regels.push(
          `• Minimale FFD dubbelwand DWDI (${effectiveKlasse.toUpperCase()} met brongrootte ${b} mm${Iso > 0 ? `, ${Iso} mm isolatie` : " (ongeïsoleerd)"}): <strong>${(minFFD / 10).toFixed(1)} cm</strong> (${Math.round(minFFD)} mm, OFD: ${OFD.toFixed(1)} mm).`
        );
      }
      params.sfd = Math.round(minFFD);
      if (typeof actiefGespreksGeheugen !== "undefined" && actiefGespreksGeheugen) {
        actiefGespreksGeheugen.sfd = Math.round(minFFD);
        actiefGespreksGeheugen.verwachtParameter = null;
      }
    }
  }

    regels.push(`<small style="opacity: 0.85;">(Zie ook <a href="onstreamffd.html" class="ai-link" target="_blank">onstreamffd.html</a> en <a href="bronkeuze2.html" class="ai-link" target="_blank">bronkeuze2.html</a>).</small>`);
    return regels.join("<br>");
  }

  // 3. Filmkeuze (filmkwaliteit.html)
  function berekenFilmKeuze(params, vraagTekst, chips = []) {
    const lower = vraagTekst.toLowerCase();
    const isD7 = /\bd7\b/i.test(lower);
    const isD5 = /\bd5\b/i.test(lower);
    const isD4 = /\bd4\b/i.test(lower);
    const isOnstream = Boolean(
      params.isOnstream ||
      params.onstreamKlasse ||
      (params.procedure && /onstream|tb|ta/i.test(params.procedure)) ||
      /\b(onstream|on\s*stream|rt\s*[-]?\s*21021|rt\s*[-]?\s*21022)\b/i.test(lower)
    );
    const isKlasseB = !isOnstream && (/\b(klasse\s*b|en[-\s]?b|rt21013|sabic|sitech)\b/i.test(lower) || params.procedure === "EN-B");
    const isKlasseA = /\b(klasse\s*a|en[-\s]?a)\b/i.test(lower) || params.procedure === "EN-A";
    const isAsme = /\basme\b/i.test(lower) || params.procedure === "ASME";

    if (isOnstream) {
      if (isD7) {
        return "Ja, volgens de onstream procedures (RT21021 / RT21022) is filmtype D7 <strong>toegestaan</strong> (voor zowel Klasse TA als Klasse TB).";
      }
      if (isD5) {
        return "Ja, filmtype D5 is toegestaan voor onstream opnames (RT21021 / RT21022).";
      }
      if (isD4) {
        return "Ja, filmtype D4 is altijd toegestaan voor onstream opnames en biedt de hoogste scherpte en beeldkwaliteit.";
      }
      if (chips) chips.push("D7", "D5", "D4");
      return "Voor onstream inspecties (RT21021 / RT21022) zijn de filmtypen D4, D5 en D7 toegestaan. Welk filmtype wil je controleren?";
    }

    if (isD7) {
      if (isKlasseB) {
        return "Nee, filmtype D7 is volgens EN ISO 17636-1 Klasse B standaard <strong>niet toegestaan</strong> (minimaal filmklasse T2 zoals D4 of D5 vereist). Uitzondering: alleen bij een doorstraalde dikte van meer dan 50 mm met een röntgenbuis (>150 kV) mag D7 worden gebruikt. Bij gammabronnen (Se-75 / Ir-192) is D7 voor Klasse B nooit toegestaan.";
      }
      if (isAsme) return "Ja, volgens ASME Section V (RT21002) is filmtype D7 standaard toegestaan.";
      if (isKlasseA) return "Ja, volgens EN ISO 17636-1 Klasse A is D7 voor de meeste diktes en bronnen toegestaan (behalve bij röntgen <150 kV waar minimaal D4 vereist is).";
      if (chips) chips.push("Klasse B", "Klasse A", "ASME");
      return "Volgens Klasse B is D7 standaard <strong>niet toegestaan</strong> (minimaal D4 of D5 vereist, tenzij röntgen >150 kV en dikte >50 mm). Volgens ASME en Klasse A mag D7 wel gebruikt worden. Volgens welke kwaliteitsklasse werk je?";
    }

    if (isD5) {
      if (isKlasseB) return "D5 is toegestaan maar D4 is recommended! Als het vereiste draadje niet zichtbaar is op D5 dan moet D4 gebruikt worden en wordt de minimale zwarting 3.0.";
      return "Ja, filmtype D5 is toegestaan volgens EN-A, EN-B en ASME.";
    }

    if (isD4) {
      return "Ja, filmtype D4 (filmklasse T2 / ASTM Klasse I) is altijd toegestaan voor alle procedures (EN-A, EN-B, ASME, Sabic, Sitech) en levert de hoogste beeldkwaliteit.";
    }

    if (chips) chips.push("D4", "D5", "D7");
    return "Minimaal filmtype: voor Klasse B is D4 of D5 vereist (D4 recommended). Voor ASME en Klasse A mag ook D7 worden gebruikt (zie <a href='filmkwaliteit.html' class='ai-link' target='_blank'>filmkwaliteit.html</a>). Welk filmtype wil je controleren?";
  }

  function isRondstralerBron(params, vraagTekst = "") {
    const lower = (vraagTekst || "").toLowerCase();
    return Boolean(
      (params && params.bronTekst && /rondstraler/i.test(params.bronTekst)) ||
      /\b(rondstraler|rondstralen)\b/i.test(lower)
    );
  }

  // 3b. Minimale FFD Berekening (Numeriek)
  function bepaalNumeriekeMinFFD(params, vraagTekst = "") {
    const lower = (vraagTekst || "").toLowerCase();
    const De = params.diameter;
    const heeftDirectOfaOfWt = Boolean((params.ofa && params.ofa > 0) || (params.wanddikte && params.wanddikte > 0));
    if ((!De || isNaN(De) || De <= 0) && !heeftDirectOfaOfWt) return null;

    const isOnstream = Boolean(
      params.isOnstream ||
      params.onstreamKlasse ||
      (params.procedure && /onstream|tb|ta/i.test(params.procedure)) ||
      /\b(onstream|on\s*stream|rt\s*[-]?\s*21021|rt\s*[-]?\s*21022|rt\s*[-]?\s*21-?02-?[12])\b/i.test(lower)
    );

    let b = params.brongrootte;
    if (!b) {
      if (params.bronType === "Se75" || (params.bronTekst && /se[-\s]?75|selenium|seleen/i.test(params.bronTekst))) {
        b = 3.0;
      } else if (params.bronType === "Ir192" || (params.bronTekst && /ir[-\s]?192|iridium/i.test(params.bronTekst))) {
        b = 2.8;
      } else if (params.bronType === "Co60" || (params.bronTekst && /co[-\s]?60|kobalt/i.test(params.bronTekst))) {
        b = 3.5;
      } else if (params.bronType === "X-ray" || (params.bronTekst && /x[-\s]?ray|rontgen|röntgen|buis/i.test(params.bronTekst))) {
        b = 1.0;
      } else {
        b = 3.0;
      }
    }

    // --- ONSTREAM MINIMALE FFD CONFORM onstreamffd.html (RT21021 / RT21022) ---
    if (isOnstream) {
      if (!De || isNaN(De) || De <= 0) return null;
      const klasse = (
        params.onstreamKlasse ||
        (params.procedure && /tb/i.test(params.procedure) ? "tb" : (params.procedure && /ta/i.test(params.procedure) ? "ta" : "")) ||
        (/\btb\b/i.test(lower) ? "tb" : (/\bta\b/i.test(lower) ? "ta" : "tb"))
      ).toLowerCase();

      const techniek =
        params.onstreamTechniek ||
        (/\bdubbelwand|rt\s*[-]?\s*21022\b/i.test(lower) ? "dubbelwand" : "tangentiaal");

      const Iso = (params.isolatieMm !== null && params.isolatieMm !== undefined) ? params.isolatieMm : 0;
      const t = params.wanddikte;

      let minFFD = 0;
      if (techniek === "tangentiaal") {
        const PDD = (De / 2) + Iso;
        const ffd1 = PDD + 3.5 * De;
        const ug = klasse === "tb" ? 0.3 : 0.6;
        const ffd2 = (b * PDD) / ug;
        minFFD = Math.max(ffd1, ffd2);
      } else {
        // dubbelwand RT21022
        const isDWSI = De >= 150;
        let OFD = De + Iso;
        if (isDWSI && t && !isNaN(t) && t > 0) {
          OFD = t + Iso;
        }
        const ug = klasse === "tb" ? 0.3 : 0.6;
        const ffdOnscherpte = (b * OFD) / ug;
        const ffdFysiek = De + 2 * Iso;
        minFFD = isDWSI ? Math.max(ffdOnscherpte, ffdFysiek) : ffdOnscherpte;
      }
      return Math.round(minFFD);
    }

    const isCentraal = /\b(centraal|panoram|panoramisch|rondstraler|rondstralen)\b/i.test(lower) || params.optie === "1" || isRondstralerBron(params, lower);
    const isExcentrisch = /\bexcentrisch/i.test(lower) || params.optie === "2";
    const isDWDI =
      (De && De <= 100 && !isCentraal && !isExcentrisch) ||
      params.technique === "DWDI" ||
      /\b(dwdi|ovaal|ovaaltje|verzet)\b/i.test(lower);

    let ofa = 0;
    if (params.ofa && params.ofa > 0) {
      ofa = params.ofa;
    } else if (isDWDI && De) {
      ofa = De;
    } else {
      if (!params.wanddikte) return null;
      ofa = params.wanddikte;
    }

    if (!params.procedure) return null;

    const proc = params.procedure;
    let factor = proc === "EN-A" ? 7.5 : 15;
    let minFfd = 0;

    if (proc === "ASME") {
      // Conform MinFFD.html & ASME Sec. V Art. 2 T-285 bepaalt de wanddikte (wt) de max. toegestane Ug:
      // wt < 50 mm -> 0.51 mm | 50 <= wt < 75 mm -> 0.76 mm | 75 <= wt <= 100 mm -> 1.02 mm
      const wtVoorUg = (params.wanddikte && params.wanddikte > 0)
        ? params.wanddikte
        : ((isDWDI && De && De < 100) ? 10 : null);
      if (wtVoorUg === null) return null;
      if (wtVoorUg < 50) minFfd = (b * ofa) / 0.51 + ofa;
      else if (wtVoorUg < 75) minFfd = (b * ofa) / 0.76 + ofa;
      else minFfd = (b * ofa) / 1.02 + ofa;
    } else {
      let basis = b * factor * Math.pow(ofa, 2 / 3);
      if (isCentraal) {
        basis *= 0.5;
      } else if (isExcentrisch) {
        basis *= 0.8;
      }
      minFfd = basis + ofa;
    }
    return Math.round(minFfd);
  }

  // 3b-2. Minimale FFD Waarschuwing voor Lasonderzoek & Onstream (achtergrondcontrole)
  function geefMinFFDWaarschuwing(params, vraagTekst = "") {
    if (!params.sfd) return "";
    const minFfd = bepaalNumeriekeMinFFD(params, vraagTekst);
    if (!minFfd || params.sfd >= minFfd) return "";

    const sfdCm = (params.sfd / 10).toFixed(1);
    const minCm = (minFfd / 10).toFixed(1);
    const isOnstream = Boolean(
      params.isOnstream ||
      params.onstreamKlasse ||
      (params.procedure && /onstream|tb|ta/i.test(params.procedure))
    );
    const proc = isOnstream ? `Onstream Klasse ${(params.onstreamKlasse || "TB").toUpperCase()} (<a href="onstreamffd.html" class="ai-link" target="_blank">onstreamffd.html</a>)` : (params.procedure || "de norm");
    const bgStr = params.brongrootte ? `brongrootte ${params.brongrootte} mm` : "";
    const wtStr = params.wanddikte ? `wanddikte ${params.wanddikte} mm` : "";
    const details = [bgStr, wtStr].filter(Boolean).join(" en ");

    return (
      `<div class="rt-ai-warning-box" style="background: rgba(255, 75, 75, 0.15); border-left: 4px solid #ff4b4b; padding: 10px 14px; margin: 10px 0; border-radius: 6px; color: #ffcccc; font-size: 0.95rem; line-height: 1.5;">` +
      `⚠️ <strong>Waarschuwing: Minimale FFD onderschreden!</strong><br>` +
      `De gekozen focus van <strong>${params.sfd} mm (${sfdCm} cm)</strong> is <u>kleiner</u> dan de normatieve minimale FFD van <strong>${minFfd} mm (${minCm} cm)</strong> volgens <strong>${proc}</strong>${details ? ` (${details})` : ""}.<br>` +
      `<small style="opacity: 0.9; display: block; margin-top: 4px;">Hierdoor wordt de maximaal toelaatbare geometrische onscherpte (U<sub>g</sub>) overschreden en voldoet de opname <strong>niet</strong> aan de normatieve eisen${isOnstream ? " van RT21021 / RT21022" : " van EN ISO 17636-1 / ASME"}.</small>` +
      `</div>`
    );
  }

  // 3c. Voorgestelde FFD Berekening (Conform getPrefilledFFD() in pruts.html / onstreamffd.html)
  // Bij DWSI opstelling (bron buiten) stelt pruts.html een praktische FFD voor:
  // - Gammabron (Se-75 / Ir-192 / Co-60): diameter + 15 mm
  // - Röntgenbuis (X-ray directioneel): diameter + 150 mm
  // - Onstream (RT21021 / RT21022): minimale FFD volgens onstreamffd.html
  function bepaalVoorgesteldeFFD(params, vraagTekst = "") {
    const De = params.diameter;
    if (!De || isNaN(De) || De <= 0) return null;

    const lower = (vraagTekst || "").toLowerCase();
    const isOnstream = Boolean(
      params.isOnstream ||
      params.onstreamKlasse ||
      (params.procedure && /onstream|tb|ta/i.test(params.procedure)) ||
      /\b(onstream|on\s*stream|rt\s*[-]?\s*21021|rt\s*[-]?\s*21022)\b/i.test(lower)
    );

    if (isOnstream) {
      // Voor onstream is de voorgestelde FFD gelijk aan de minimale FFD volgens onstreamffd.html
      return bepaalNumeriekeMinFFD(params, vraagTekst);
    }

    const isCentraal = /\b(centraal|panoram|panoramisch|rondstraler|rondstralen)\b/i.test(lower) || params.optie === "1" || isRondstralerBron(params, lower);
    const isExcentrisch = /\bexcentrisch/i.test(lower) || params.optie === "2";
    if (isCentraal) return Math.round(De / 2);
    if (isExcentrisch) return null;

    const isDWDI =
      (De <= 100 && params.technique !== "DWSI" && !lower.includes("dwsi")) ||
      params.technique === "DWDI" ||
      /\b(dwdi|ovaal|ovaaltje|verzet)\b/i.test(lower);
    if (isDWDI) return null;

    // DWSI techniek (bron buiten)
    let candidate = 0;
    const isXray =
      (params.bronTekst && /x[-\s]?ray|rontgen|röntgen|buis|balteau|ceram|yxlon|smart|evo|rondstraler/i.test(params.bronTekst)) ||
      params.bronType === "X-ray" ||
      params.bronType === "Rontgen" ||
      /\b(x[-\s]?ray|rontgen|röntgen|balteau|ceram|yxlon|smart\s*evo)\b/i.test(lower);

    if (isXray) {
      candidate = Math.round(De + 150);
    } else {
      // Standaard gammabron (Se-75 / Ir-192 / Co-60)
      candidate = Math.round(De + 15);
    }

    return candidate;
  }

  // 4. Stralingstijd (stralingstijd.html)
  function berekenStralingstijd(params, vraagTekst, chips = []) {
    let isIr = /ir[-\s]?192|iridium/i.test(vraagTekst) || (params.bronTekst && /ir[-\s]?192|iridium/i.test(params.bronTekst)) || params.bronType === "Ir192";
    let isSe = /se[-\s]?75|selenium|seleen/i.test(vraagTekst) || (params.bronTekst && /se[-\s]?75|selenium|seleen/i.test(params.bronTekst)) || params.bronType === "Se75";
    const isXray =
      !isIr &&
      !isSe &&
      (/\b(x[-\s]?ray|rontgen|röntgen|röntgenbuis|rontgenbuis|balteau|ceram|yxlon|smart\s*evo)\b/i.test(vraagTekst) ||
        params.bronType === "X-ray" ||
        params.bronType === "Rontgen" ||
        (params.bronTekst && /x[-\s]?ray|rontgen|röntgen|balteau|ceram|yxlon|smart|evo|rondstraler/i.test(params.bronTekst)));
    if (isXray) {
      if (chips) chips.push("20 mA*min bij 4 mA", "KV-regel", "Focusverandering");
      return (
        `R.A.D.I. kan voor een <strong>röntgenbuis (X-ray)</strong> geen directe stralingstijd berekenen uit alleen de diameter en wanddikte, omdat elke röntgenbuis net anders is en een eigen buistabel heeft.<br><br>` +
        `💡 <strong>Wat R.A.D.I. wél voor je kan berekenen bij X-ray:</strong><br>` +
        `• Geef het aantal <strong>mA*min</strong> (uit de buistabel) en de ingestelde <strong>mA</strong> op, dan berekent R.A.D.I. direct de belichtingstijd (zie <a href="buistabel.html" class="ai-link" target="_blank">buistabel.html</a>).<br>` +
        `• Daarnaast kan R.A.D.I. assisteren bij een <strong>focusverandering</strong> of <strong>filmtypeverandering</strong> (<a href="focusverandering.html" class="ai-link" target="_blank">focusverandering.html</a>) en de buisspanning via de <strong>KV-regel</strong> (<a href="kvregel.html" class="ai-link" target="_blank">kvregel.html</a>).`
      );
    }
    if (!isIr && !isSe && params.bronTekst && Array.isArray(bronnenData)) {
      const bFound = bronnenData.find((b) => params.bronTekst.toLowerCase().includes(b.name.toLowerCase()));
      if (bFound) {
        if (bFound.type === "Ir192") isIr = true;
        else if (bFound.type === "Se75") isSe = true;
      }
    }
    if (!isIr && !isSe) {
      if (typeof actiefGespreksGeheugen !== "undefined" && actiefGespreksGeheugen) {
        actiefGespreksGeheugen.verwachtParameter = "bron";
      }
      if (chips) chips.push("Se-75", "Ir-192");
      return "Om de stralingstijd te berekenen moet ik weten welke bron je gebruikt (<strong>Se-75</strong> of <strong>Ir-192</strong>).";
    }
    const bronType = isIr ? "Ir192" : "Se75";

    let ci = params.activiteit;
    let bronNaam = bronType;

    // Alleen als de gebruiker een SPECIFIEKE broncode heeft genoemd (bijv. 97969M of RR3508)
    if (!ci && params.bronTekst && Array.isArray(bronnenData)) {
      const specifiekeBron = bronnenData.find((b) => params.bronTekst.toLowerCase().includes(b.name.toLowerCase()));
      if (specifiekeBron) {
        ci = Number(berekenHuidigeActiviteit(specifiekeBron.initialActivity, specifiekeBron.type, specifiekeBron.date).toFixed(1));
        bronNaam = specifiekeBron.name;
        params.activiteit = ci;
        if (!params.brongrootte) params.brongrootte = specifiekeBron.size;
      }
    }

    // Of als de gebruiker vraagt naar "de sterkste selenium / iridium"
    const wilSterkste = /\b(sterkst|sterkste|meeste\s*curie|hoogste\s*(?:activiteit|curie))\b/i.test(vraagTekst);
    if (!ci && wilSterkste && Array.isArray(bronnenData)) {
      const matching = bronnenData
        .filter((b) => b.type === bronType)
        .map((b) => ({ ...b, act: berekenHuidigeActiviteit(b.initialActivity, b.type, b.date) }))
        .sort((a, b) => b.act - a.act);
      if (matching.length > 0) {
        const top = matching[0];
        ci = Number(top.act.toFixed(1));
        bronNaam = top.name;
        params.activiteit = ci;
        params.bronTekst = `${top.name} (${ci} Ci, ${top.size} mm)`;
        if (!params.brongrootte) params.brongrootte = top.size;
        if (actiefGespreksGeheugen) {
          actiefGespreksGeheugen.activiteit = ci;
          actiefGespreksGeheugen.bronTekst = params.bronTekst;
          actiefGespreksGeheugen.brongrootte = params.brongrootte;
        }
      }
    }

    if (!ci || ci <= 0) {
      if (typeof actiefGespreksGeheugen !== "undefined" && actiefGespreksGeheugen) {
        actiefGespreksGeheugen.verwachtParameter = "activiteit";
      }
      if (chips) {
        if (Array.isArray(bronnenData)) {
          const beschikbare = bronnenData.filter((b) => b.type === bronType);
          beschikbare.forEach((b) => {
            const act = berekenHuidigeActiviteit(b.initialActivity, b.type, b.date);
            chips.push(`${b.name} (${act.toFixed(1)} Ci)`);
          });
        }
        chips.push("15 Curie", "25 Curie", "35 Curie");
      }
      return `Hoeveel <strong>Curie</strong> (activiteit of welke bron) heeft de ${bronType} bron?`;
    }

    if (!params.wanddikte && !params.doorstraaldeDikte) {
      if (typeof actiefGespreksGeheugen !== "undefined" && actiefGespreksGeheugen) {
        actiefGespreksGeheugen.verwachtParameter = "wanddikte";
      }
      const isPlaatCheck = Boolean(
        params.isPlaat ||
        params.optie === "3" ||
        (typeof actiefGespreksGeheugen !== "undefined" && actiefGespreksGeheugen && actiefGespreksGeheugen.isPlaat) ||
        /\b(plaat|vlakke\s+plaat)\b/i.test(vraagTekst)
      );
      if (isPlaatCheck) {
        if (chips) chips.push("6 mm dik", "8 mm dik", "10 mm dik", "12 mm dik", "15 mm dik");
        return "Wat is de <strong>dikte</strong> van de vlakke plaat (in mm)?";
      }
      if (params.diameter) {
        const diaLabel = formatMmNaarDuimLabel(params.diameter);
        if (chips) chips.push("Schedule 40", "Schedule 80", "4 mm dik", "6 mm dik", "8 mm dik");
        return `Om de stralingstijd voor <strong>${diaLabel}</strong> te berekenen heb ik nog de <strong>wanddikte</strong> of het <strong>schedule</strong> nodig.<br><br>Wat is de <strong>wanddikte</strong> (in mm) of het <strong>schedule</strong>?`;
      }
      if (chips) chips.push("6 duimer Sch 40", "4 duimer Sch 40", "Plaat (enkelwandig)", "6 mm dik", "8 mm dik");
      return "Om de stralingstijd te berekenen heb ik de gegevens van het werkstuk nodig.<br><br>Wat is de <strong>leidingmaat</strong> (diameter en wanddikte/schedule) of de dikte van de <strong>vlakke plaat</strong>?";
    }
    const wt = params.wanddikte || (params.doorstraaldeDikte ? (params.technique === "SWSI" ? params.doorstraaldeDikte : params.doorstraaldeDikte / 2) : 0);

    const isPlaat = Boolean(
      params.isPlaat ||
      params.optie === "3" ||
      (typeof actiefGespreksGeheugen !== "undefined" && actiefGespreksGeheugen && actiefGespreksGeheugen.isPlaat) ||
      /\b(plaat|vlakke\s+plaat)\b/i.test(vraagTekst)
    );

    // Als wel de wanddikte bekend is, maar noch diameter, noch plaat, noch opstelling/techniek/doorstraald:
    // vraag dan specifiek of het om een buis (welke diameter) of een vlakke plaat (SWSI) gaat!
    if (!params.diameter && !isPlaat && !params.doorstraaldeDikte && !params.technique) {
      if (typeof actiefGespreksGeheugen !== "undefined" && actiefGespreksGeheugen) {
        actiefGespreksGeheugen.verwachtParameter = "diameter";
      }
      if (chips) {
        chips.push("Plaat (enkelwandig)", "2 duimer", "3 duimer", "4 duimer", "6 duimer", "8 duimer");
      }
      return `Voor een wanddikte van <strong>${wt} mm</strong>: gaat het om een <strong>vlakke plaat / enkelwandig (SWSI)</strong> of om een <strong>leiding / buis</strong> (welke diameter / duimsmaat)?`;
    }

    const isCentraal = params.optie === "1" || /\b(centraal|panoram|panoramisch|rondstraler|rondstralen)\b/i.test(vraagTekst) || isRondstralerBron(params, vraagTekst);
    const isExcentrisch = params.optie === "2" || /\b(excentrisch|excentrische)\b/i.test(vraagTekst);

    // Geometrisch bepaalde FFD (Centraal: FFD = diameter / 2; Excentrisch: FFD = diameter - wanddikte - offset)
    if (!params.sfd && isCentraal && params.diameter) {
      params.sfd = Math.round(params.diameter / 2);
      if (actiefGespreksGeheugen) actiefGespreksGeheugen.sfd = params.sfd;
    } else if (!params.sfd && isExcentrisch && params.diameter && wt) {
      const offset = (params.bronTekst && params.bronTekst.includes("X-ray")) ? 170 : 10;
      params.sfd = Math.round(params.diameter - wt - offset);
      if (actiefGespreksGeheugen) actiefGespreksGeheugen.sfd = params.sfd;
    }

    const wilMinFFD =
      !params.sfd && (
        Boolean(params.wilMinFFD) ||
        /\b(wat\s+is\s+de\s+)?(min\w*|kleinste)\s+(?:de\s+)?(ffd|sfd|focus|afstand|focusafstand)\b/i.test(vraagTekst)
      );

    if (!params.sfd && wilMinFFD) {
      if (!params.brongrootte) {
        if (typeof actiefGespreksGeheugen !== "undefined" && actiefGespreksGeheugen) {
          actiefGespreksGeheugen.verwachtParameter = "brongrootte";
        }
        if (chips) chips.push(...geefBrongrootteSuggestieChips(params.bronTekst));
        return `Om de minimale FFD voor de stralingstijd te berekenen heb ik de <strong>brongrootte</strong> (in mm) nodig. Welke brongrootte gebruik je?`;
      }
      if (!params.procedure) {
        if (typeof actiefGespreksGeheugen !== "undefined" && actiefGespreksGeheugen) {
          actiefGespreksGeheugen.verwachtParameter = "procedure";
        }
        if (chips) chips.push("Klasse B", "Klasse A", "ASME");
        return `Volgens welke <strong>kwaliteitsklasse</strong> (EN Klasse A, EN Klasse B of ASME) moet de minimale FFD worden berekend?`;
      }
      const berekendeMin = bepaalNumeriekeMinFFD(params, vraagTekst);
      if (berekendeMin) {
        params.sfd = berekendeMin;
        if (actiefGespreksGeheugen) actiefGespreksGeheugen.sfd = berekendeMin;
      }
    }

    let isVoorgesteldeFFDGebruikt = false;
    if (!params.sfd) {
      const isOnstream = Boolean(
        params.isOnstream ||
        params.onstreamKlasse ||
        (params.procedure && /onstream|tb|ta/i.test(params.procedure)) ||
        /\b(onstream|on\s*stream|rt\s*[-]?\s*21021|rt\s*[-]?\s*21022)\b/i.test(vraagTekst)
      );

      const berekendeMin = bepaalNumeriekeMinFFD(params, vraagTekst);
      const voorgesteldeFFD = bepaalVoorgesteldeFFD(params, vraagTekst);

      // Bij Onstream: vraag ALTIJD specifiek naar de FFD (met onstream minFFD als voorstel)!
      if (isOnstream) {
        if (typeof actiefGespreksGeheugen !== "undefined" && actiefGespreksGeheugen) {
          actiefGespreksGeheugen.verwachtParameter = "sfd";
        }
        const diaLabel = formatMmNaarDuimLabel(params.diameter);
        const klStr = (params.onstreamKlasse || (params.procedure && /tb/i.test(params.procedure) ? "TB" : "TA")).toUpperCase();
        const techStr = params.onstreamTechniek === "dubbelwand" ? "Dubbelwand (RT21022)" : "Tangentiaal (RT21021)";
        if (chips) {
          if (berekendeMin) {
            chips.push(`${berekendeMin} mm FFD (min. ffd)`);
            const afgerond50 = Math.ceil(berekendeMin / 50) * 50;
            if (afgerond50 !== berekendeMin) chips.push(`${afgerond50} mm FFD`);
            chips.push(`${afgerond50 + 100} mm FFD`);
          } else {
            chips.push("600 mm FFD", "700 mm FFD", "800 mm FFD");
          }
        }
        const ffdHint = berekendeMin ? ` (minimale FFD volgens <a href="onstreamffd.html" class="ai-link" target="_blank">onstreamffd.html</a>: <strong>${berekendeMin} mm</strong>)` : "";
        return `Voor een <strong>onstream ${techStr}</strong> opname op <strong>${diaLabel}</strong> (Klasse ${klStr}) is de FFD afhankelijk van de opstelling en minimale geometrische eisen${ffdHint}.<br><br>Wat is de gekozen <strong>FFD</strong> (in mm of cm) waarmee je de stralingstijd wilt berekenen?`;
      }

      // Als de normatieve minimale FFD groter is dan de voorgestelde FFD: vraag specifiek met welke waarde gerekend moet worden!
      if (berekendeMin && voorgesteldeFFD && berekendeMin > voorgesteldeFFD) {
        if (typeof actiefGespreksGeheugen !== "undefined" && actiefGespreksGeheugen) {
          actiefGespreksGeheugen.verwachtParameter = "sfd";
        }
        if (chips) {
          chips.push(`${voorgesteldeFFD} mm FFD`, `${berekendeMin} mm FFD (min. ffd)`);
        }
        const diaLabel = formatMmNaarDuimLabel(params.diameter);
        return `Voor <strong>${diaLabel}</strong> is de voorgestelde FFD bij contactopname <strong>${voorgesteldeFFD} mm</strong> (diameter + 15 mm), maar de normatieve minimale FFD volgens <strong>${params.procedure || "de norm"}</strong> is <strong>${berekendeMin} mm</strong> (${(berekendeMin / 10).toFixed(1)} cm).<br><br>Met welke FFD wil je de stralingstijd berekenen?`;
      }

      // Als er een gammabron (Ir-192 / Se-75) en een leidingdiameter met voorgestelde FFD (DWSI) zijn opgegeven,
      // bereken dan direct de stralingstijd voor de voorgestelde FFD en vermeld dit duidelijk!
      if ((isIr || isSe) && voorgesteldeFFD) {
        params.sfd = voorgesteldeFFD;
        isVoorgesteldeFFDGebruikt = true;
        if (chips) {
          chips.push("400 mm FFD", "500 mm FFD", "600 mm FFD");
        }
      } else {
        if (typeof actiefGespreksGeheugen !== "undefined" && actiefGespreksGeheugen) {
          actiefGespreksGeheugen.verwachtParameter = "sfd";
        }
        if (chips) {
          if (voorgesteldeFFD) {
            chips.push(`${voorgesteldeFFD} mm FFD`);
          }
          if (berekendeMin) chips.push(`${berekendeMin} mm FFD (min. ffd)`);
          chips.push("400 mm FFD", "500 mm FFD", "650 mm FFD", "700 mm FFD");
        }
        let ffdPrompt = `Wat is de gekozen <strong>FFD</strong> (film-focusafstand in mm of cm)`;
        const hints = [];
        if (voorgesteldeFFD) hints.push(`voorgesteld op basis van opstelling: ${voorgesteldeFFD} mm`);
        if (berekendeMin) hints.push(`normatieve minimale FFD: ${berekendeMin} mm`);
        if (hints.length > 0) {
          ffdPrompt += ` (${hints.join(", ")})`;
        }
        ffdPrompt += `?`;
        return ffdPrompt;
      }
    }
    const sfd = params.sfd;
    const tech = isPlaat || params.technique === "SWSI" || isCentraal || isExcentrisch
      ? "SWSI"
      : (params.technique || (params.diameter && params.diameter < 100 ? "DWDI" : (params.diameter ? "DWSI" : "SWSI")));
    let doorstr = params.doorstraaldeDikte;
    if (params.isGevuldeLeiding && params.diameter && wt) {
      const binnenDia = params.diameter - 2 * wt;
      if (binnenDia > 0) {
        const rho = params.mediumDichtheid || 997;
        const staalEquiv = (rho / 7800) * binnenDia;
        doorstr = Number((2 * wt + staalEquiv).toFixed(2));
        params.doorstraaldeDikte = doorstr;
        if (typeof actiefGespreksGeheugen !== "undefined" && actiefGespreksGeheugen) {
          actiefGespreksGeheugen.doorstraaldeDikte = doorstr;
        }
      }
    }
    const isOnstream = Boolean(
      params.isOnstream ||
      params.onstreamKlasse ||
      (params.procedure && /onstream|tb|ta/i.test(params.procedure)) ||
      /\b(onstream|on\s*stream|rt\s*[-]?\s*21021|rt\s*[-]?\s*21022)\b/i.test(vraagTekst)
    );

    if (!doorstr) {
      doorstr = tech === "SWSI" ? wt : 2 * wt;
    }
    let comp = 5; // Standaard 5 mm lascompensatie (lasoverdikte & inbranding conform formule)
    if (isOnstream) {
      comp = 0; // Geen lascompensatie bij onstream (geen lasnaad / profielopname; belichting op nominale wanddikte, niet op Wmax)
    }
    if (params.lascompensatie !== undefined && params.lascompensatie !== null) {
      comp = params.lascompensatie;
    } else if (typeof actiefGespreksGeheugen !== "undefined" && actiefGespreksGeheugen && actiefGespreksGeheugen.lascompensatie !== undefined && actiefGespreksGeheugen.lascompensatie !== null) {
      comp = actiefGespreksGeheugen.lascompensatie;
    }

    const CONFIG = {
      Ir192: { k: 0.13, hvl: 13.68, ff: 17.1 },
      Se75: { k: 0.054, hvl: 10.33, ff: 13.26 },
    };
    const c = CONFIG[bronType];
    const ffd_m = sfd / 1000.0;
    const base_exp = (c.ff * (ffd_m * ffd_m)) / (ci * c.k);
    const attenuation = Math.pow(2, (doorstr + comp) / c.hvl);
    let time_d7 = base_exp * attenuation;
    if (bronType === "Se75") time_d7 *= 1.05;

    let time_d4 = time_d7 * 2.44;
    let time_d5 = time_d4 / 1.6666;

    // Materiaalfactor correctie conform stralingstijd.html en materiaalfactor.csv
    let matNaam = params.materiaalNaam || (typeof actiefGespreksGeheugen !== "undefined" && actiefGespreksGeheugen && actiefGespreksGeheugen.materiaalNaam) || null;
    let matObj = matNaam ? zoekMateriaal(matNaam) : null;
    let matFactor = 1.0;

    if (params.materiaalFactorHandmatig) {
      matFactor = params.materiaalFactorHandmatig;
    } else if (matObj) {
      // Gamma factor: Se-75 of Ir-192 exact volgens stralingstijd.html!
      matFactor = (bronType === "Se75") ? matObj.f_se75 : matObj.f_ir192;
      if (typeof actiefGespreksGeheugen !== "undefined" && actiefGespreksGeheugen) {
        actiefGespreksGeheugen.materiaalFactor = matFactor;
        actiefGespreksGeheugen.materiaalNaam = matObj.name;
      }
    } else if (params.materiaalFactor && params.materiaalFactor !== 1.0) {
      matFactor = params.materiaalFactor;
    } else if (typeof actiefGespreksGeheugen !== "undefined" && actiefGespreksGeheugen && actiefGespreksGeheugen.materiaalFactor && actiefGespreksGeheugen.materiaalFactor !== 1.0) {
      matFactor = actiefGespreksGeheugen.materiaalFactor;
    }

    const heeftAfwijkendMateriaal = Boolean(matFactor && matFactor !== 1.0);
    if (heeftAfwijkendMateriaal) {
      time_d4 *= matFactor;
      time_d5 *= matFactor;
      time_d7 *= matFactor;
    }

    function formatTijd(minutenDecimaal) {
      let m = Math.floor(minutenDecimaal);
      let s = Math.round((minutenDecimaal - m) * 60);
      if (s === 60) { m++; s = 0; }
      if (m === 0) return `${s} seconden`;
      const mStr = m === 1 ? "1 minuut" : `${m} minuten`;
      if (s === 0) return mStr;
      return `${mStr} en ${s} seconden`;
    }

    // D7 is volgens de onstream procedures (RT21021 / RT21022) wél toegestaan (voor zowel Klasse TA als TB).
    // isKlasseB geldt uitsluitend voor EN ISO 17636-1 lasonderzoek (waarbij D7 standaard niet is toegestaan).
    const isKlasseB =
      !isOnstream &&
      (params.procedure === "EN-B" ||
        (typeof params.procedure === "string" && /klasse\s*b/i.test(params.procedure)) ||
        /\b(klasse\s*b|en[-\s]?b)\b/i.test(vraagTekst) ||
        (typeof actiefGespreksGeheugen !== "undefined" &&
          actiefGespreksGeheugen &&
          actiefGespreksGeheugen.procedure === "EN-B"));

    const ffdCmStr = (sfd / 10).toFixed(1).replace(/\.0$/, "");

    const ffdLabel = isCentraal
      ? `centraal bij FFD van ${sfd} mm (${ffdCmStr} cm = diameter / 2)`
      : isExcentrisch
      ? `excentrisch bij FFD van ${sfd} mm (${ffdCmStr} cm)`
      : wilMinFFD
      ? `minimale FFD van ${sfd} mm (${ffdCmStr} cm)`
      : isVoorgesteldeFFDGebruikt
      ? `<strong>voorgestelde FFD van ${sfd} mm</strong> (${ffdCmStr} cm = diameter + 15 mm)`
      : `FFD van ${sfd} mm (${ffdCmStr} cm)`;

    const gevuldExtra = params.isGevuldeLeiding
      ? ` (gevulde leiding incl. staalequivalent medium)`
      : params.doorstraaldeDikte
      ? ` (doorstraalde dikte)`
      : "";

    const isoLabel = bronType === "Se75" ? "Se-75" : "Ir-192";
    const matExtra = heeftAfwijkendMateriaal
      ? (matNaam
          ? ` [Materiaalfactor <strong>${matFactor.toFixed(2)}x</strong> (${matNaam}, ${isoLabel})]`
          : ` [Materiaalfactor <strong>${matFactor.toFixed(2)}x</strong>]`)
      : "";

    const explicieteFilmMatch = vraagTekst.match(/\b(d4|d5|d7)\b/i);
    const explicieteFilm = explicieteFilmMatch ? explicieteFilmMatch[1].toUpperCase() : null;

    const compLabel = comp > 0 ? ` + ${comp} mm lascompensatie` : " (zonder lascompensatie)";
    const opstellingUitleg = isPlaat
      ? `plaat (enkelwandig SWSI: ${doorstr.toFixed(1)} mm${compLabel})`
      : isCentraal
      ? `${formatMmNaarDuimLabel(params.diameter)} panoramisch / centraal (SWSI 1×t: ${doorstr.toFixed(1)} mm${compLabel})`
      : isExcentrisch
      ? `${formatMmNaarDuimLabel(params.diameter)} excentrisch (SWSI 1×t: ${doorstr.toFixed(1)} mm${compLabel})`
      : params.diameter
      ? `${formatMmNaarDuimLabel(params.diameter)} (${tech === "DWDI" ? "dubbelwand DWDI 2×t" : "dubbelwand DWSI 2×t"}: ${doorstr.toFixed(1)} mm${compLabel})`
      : `doorstraalde dikte: ${doorstr.toFixed(1)} mm${compLabel}`;

    let resp = `Stralingstijd voor <strong>${opstellingUitleg}</strong> (${bronNaam} van ${ci.toFixed(1)} Curie, ${ffdLabel})${gevuldExtra}${matExtra}:<br>`;

    let ttsTijden = [];
    if (explicieteFilm === "D4") {
      resp += `• D4: <strong>${formatTijd(time_d4)}</strong><br>`;
      ttsTijden.push(`D4: ${formatTijd(time_d4)}`);
    } else if (explicieteFilm === "D5") {
      resp += `• D5: <strong>${formatTijd(time_d5)}</strong><br>`;
      ttsTijden.push(`D5: ${formatTijd(time_d5)}`);
    } else if (explicieteFilm === "D7") {
      resp += `• D7: <strong>${formatTijd(time_d7)}</strong><br>`;
      ttsTijden.push(`D7: ${formatTijd(time_d7)}`);
      if (isKlasseB) {
        resp += `<small style="color:#ffb4b4;">⚠️ Let op: D7 is niet toegestaan volgens EN ISO 17636-1 Klasse B (D4: ${formatTijd(time_d4)}, D5: ${formatTijd(time_d5)}).</small><br>`;
      }
    } else {
      resp += `• D4: <strong>${formatTijd(time_d4)}</strong><br>` +
              `• D5: <strong>${formatTijd(time_d5)}</strong><br>`;
      ttsTijden.push(`D4: ${formatTijd(time_d4)}`, `D5: ${formatTijd(time_d5)}`);
      if (!isKlasseB) {
        resp += `• D7: <strong>${formatTijd(time_d7)}</strong><br>`;
        ttsTijden.push(`D7: ${formatTijd(time_d7)}`);
      } else {
        resp += `<small style="opacity: 0.85;">(D7 is weggelaten: niet toegestaan volgens EN ISO 17636-1 Klasse B).</small><br>`;
      }
    }
    resp += `<span class="rt-tts-summary" style="display:none">${ttsTijden.join(". ")}</span>`;
    if (isVoorgesteldeFFDGebruikt) {
      resp += `<small style="color:#F5DF4D;">ℹ️ <em>Let op: berekend op basis van de <strong>voorgestelde FFD (${sfd} mm)</strong> voor een gammabron op de buis. Geef gerust een andere FFD op indien gewenst.</em></small><br>`;
    }

    if (heeftAfwijkendMateriaal) {
      resp += `<small style="opacity: 0.85;">(Tijd is gecorrigeerd met materiaalfactor <strong>${matFactor.toFixed(2)}</strong> voor ${matNaam || "afwijkend materiaal"} bij ${isoLabel} volgens <a href="stralingstijd.html" class="ai-link" target="_blank">stralingstijd.html</a>).</small><br>`;
    } else {
      resp += `<small style="opacity: 0.85;">(Berekend volgens <a href="stralingstijd.html" class="ai-link" target="_blank">stralingstijd.html</a>).</small>`;
    }

    if (typeof actiefGespreksGeheugen !== "undefined" && actiefGespreksGeheugen) {
      const gekozenTijdMin = explicieteFilm === "D4" ? time_d4 : explicieteFilm === "D5" ? time_d5 : (explicieteFilm === "D7" ? time_d7 : (isKlasseB ? time_d4 : time_d7));
      const secBerekend = Math.round(gekozenTijdMin * 60);
      actiefGespreksGeheugen.focusBegintijdSec = secBerekend;
      actiefGespreksGeheugen.laatsteStralingstijdSec = secBerekend;
    }

    const berekendeMinFFD = (params.brongrootte || params.bronTekst) ? bepaalNumeriekeMinFFD(params, vraagTekst) : null;
    if (berekendeMinFFD && sfd < berekendeMinFFD) {
      const factorMin = Math.pow(berekendeMinFFD / sfd, 2);
      const timeMinD4 = time_d4 * factorMin;
      const timeMinD5 = time_d5 * factorMin;
      resp += `<br><small style="color: #ffb4b4; display: block; margin-top: 6px;"><em>Ter vergelijking bij normatieve min. FFD van ${berekendeMinFFD} mm (${(berekendeMinFFD / 10).toFixed(1)} cm):</em> D4: <strong>${formatTijd(timeMinD4)}</strong>, D5: <strong>${formatTijd(timeMinD5)}</strong>.</small>`;
    }

    if (chips) {
      if (comp !== 5 && !chips.includes("5 mm compensatie")) {
        chips.push("5 mm compensatie");
      }
      if (comp !== 3 && !chips.includes("3 mm compensatie")) {
        chips.push("3 mm compensatie");
      }
      if (comp !== 0 && !chips.includes("Zonder compensatie (0 mm)")) {
        chips.push("Zonder compensatie (0 mm)");
      }
    }

    return resp;
  }

  // 5. Geometrisch Aantal Opnames (EN ISO 17636-1 / ASME Section V)
  function calculateMinimumExposures(
    diameter,
    wanddikte,
    sfd,
    technique,
    procedure,
    optie = ""
  ) {
    if (isNaN(diameter) || isNaN(wanddikte) || isNaN(sfd) || sfd <= 0) return 4;
    let ratioLimit = procedure === "EN-B" ? 1.1 : 1.2;
    const R = diameter / 2.0;
    const r = R - wanddikte;
    const isContactSWSI = technique === "SWSI" && optie === "";

    if (isContactSWSI) {
      const sourceY = r + sfd;
      for (let n = 3; n <= 30; n++) {
        const targetLen = (diameter * Math.PI) / n;
        const alpha = (targetLen / 2) / r;
        const Px = r * Math.sin(alpha);
        const Py = r * Math.cos(alpha);
        const Vx = Px;
        const Vy = Py - sourceY;
        const A = Vx * Vx + Vy * Vy;
        const B = 2 * sourceY * Vy;
        const C_outer = sourceY * sourceY - R * R;
        const delta_outer = B * B - 4 * A * C_outer;
        if (delta_outer < 0) continue;
        const u_out = (-B - Math.sqrt(delta_outer)) / (2 * A);
        const u_in = 1.0;
        const pathLength = (u_in - u_out) * Math.sqrt(A);
        if (pathLength / wanddikte <= ratioLimit) return n;
      }
      return 30;
    } else {
      const sourceY = -R + sfd;
      const isDoubleWall = technique === "DWSI" || technique === "DWDI";

      for (let n = 3; n <= 30; n++) {
        const alpha = Math.PI / n;
        const Px = R * Math.sin(alpha);
        const Py = -R * Math.cos(alpha);
        const Vx = Px;
        const Vy = Py - sourceY;
        const A = Vx * Vx + Vy * Vy;
        const B = 2 * (-sourceY * Vy);
        const C_outer = sourceY * sourceY - R * R;
        const C_inner = sourceY * sourceY - r * r;

        const delta_outer = B * B - 4 * A * C_outer;
        if (delta_outer < 0) continue;

        const sqrt_outer = Math.sqrt(delta_outer);
        const u_out1 = (-B - sqrt_outer) / (2 * A);
        const u_out2 = (-B + sqrt_outer) / (2 * A);

        const delta_inner = B * B - 4 * A * C_inner;
        let pathLength = 0;

        if (isDoubleWall) {
          if (delta_inner < 0) {
            pathLength = (u_out2 - u_out1) * Math.sqrt(A);
          } else {
            const sqrt_inner = Math.sqrt(delta_inner);
            const u_in1 = (-B - sqrt_inner) / (2 * A);
            const u_in2 = (-B + sqrt_inner) / (2 * A);
            const chordOuter = (u_out2 - u_out1) * Math.sqrt(A);
            const chordInner = (u_in2 - u_in1) * Math.sqrt(A);
            pathLength = chordOuter - chordInner;
          }
          if (pathLength / (2 * wanddikte) <= ratioLimit) return n;
        } else {
          if (delta_inner < 0) continue;
          const sqrt_inner = Math.sqrt(delta_inner);
          const u_in2 = (-B + sqrt_inner) / (2 * A);
          pathLength = (u_out2 - u_in2) * Math.sqrt(A);
          if (pathLength / wanddikte <= ratioLimit) return n;
        }
      }
      return 30;
    }
  }

  function berekenAantalOpnames(params, vraagTekst, chips = []) {
    const lower = vraagTekst.toLowerCase();

    // 0. Directe vraag: "Om hoeveel graden moet ik de pijp/bron draaien bij X opnames of bij een ovaaltje?" (Q31 & Q32)
    if (/\b(om\s+hoeveel\s+graden|hoeveel\s+graden\s+.*?(?:draaien|verdraaien|verplaatsen|verschuiven))\b/i.test(lower)) {
      if (/\b(ovaal|ovaaltje|ovaaltjes|opstelling\s*11|11\s*\/?\s*f)\b/i.test(lower)) {
        return `Bij een <strong>ovaaltje (opstelling 11 / F)</strong> worden er altijd 2 opnames gemaakt die <strong>90°</strong> ten opzichte van elkaar gedraaid zijn.`;
      }
      const matchAantalOpn = lower.match(/\bbij\s+(\d+)\s*(?:opnames|platen|films|plaatjes)\b/i) || lower.match(/\b(\d+)\s*(?:opnames|platen|films|plaatjes)\b/i);
      if (matchAantalOpn) {
        const nOpn = parseInt(matchAantalOpn[1], 10);
        if (nOpn > 0) {
          const gr = Number((360 / nOpn).toFixed(1));
          return `Bij <strong>${nOpn} opnames</strong> op een rondnaad draai je de bron of leiding telkens <strong>${gr}°</strong> (${360} / ${nOpn} = ${gr}°).`;
        }
      }
    }

    const De = params.diameter;
    if (!De) {
      return "Om het benodigd aantal opnames te bepalen heb ik de <strong>diameter</strong> van de buis of rondnaad nodig. Wat is de diameter?";
    }
    const diaLabel = formatMmNaarDuimLabel(De);
    const omtrek = De * Math.PI;
    const omtrekCm = (omtrek / 10).toFixed(1);

    // 1. Diameter <= 100 mm (DWDI - Dubbelwand Dubbelbeeld)
    if (De <= 100) {
      if (params.wanddikte && params.wanddikte > 8) {
        return `Voor ${diaLabel} met een wanddikte van <strong>${params.wanddikte} mm</strong> (&gt; 8 mm):<br>` +
               `• Ovaaltjes schieten (opstelling 11 / F) is <strong>niet toegestaan</strong> boven 8 mm wanddikte.<br>` +
               `• Vereist: <strong>3 opnames onder 60° of 120°</strong> recht door de las (<strong>Opstelling 12 / G, superpositie</strong>).`;
      }
      return `Voor ${diaLabel} (diameter &le; 100 mm via DWDI):<br>` +
             `• <strong>2 opnames onder 90°</strong> als ovaaltjes worden geschoten (opstelling 11 / F, mits wanddikte &le; 8 mm en lasbreedte &le; ${(De / 4).toFixed(1)} mm).<br>` +
             `• <strong>3 opnames onder 60° of 120°</strong> als er recht door de las (opstelling 12 / G, superpositie) wordt geschoten.`;
    }

    // 2. Centrale / Panoramische opstelling (SWSI / rondstraler)
    const isCentraal = /\b(centraal|panoram|panoramisch|rondstraler|rondstralen)\b/i.test(lower) || params.optie === "1" || isRondstralerBron(params, lower);
    if (isCentraal) {
      if (!params.sfd && De) {
        params.sfd = Math.round(De / 2);
        if (typeof actiefGespreksGeheugen !== "undefined" && actiefGespreksGeheugen) {
          actiefGespreksGeheugen.sfd = params.sfd;
        }
      }
      const f48 = Math.ceil(omtrek / 400);
      const f40 = Math.ceil(omtrek / 320);
      const film10x40Tekst = De <= 273.1 ? ` (of ${f40} films van 10x40 cm)` : "";
      const ffdCentraalTekst = params.sfd ? `<br>• FFD (centraal, halve diameter): <strong>${params.sfd} mm</strong> (${(params.sfd / 10).toFixed(1)} cm).` : "";
      return `Voor ${diaLabel} bij een <strong>centrale (panoramische) opstelling</strong>:<br>` +
             `• Omtrek: <strong>${omtrekCm} cm</strong>.${ffdCentraalTekst}<br>` +
             `• <strong>1 opname (360° panoramisch)</strong> met <strong>${f48} film(s) van 10x48 cm</strong>${film10x40Tekst}.`;
    }

    // Als de opgegeven focus/FFD groter is dan de buitendiameter (en er geen SWSI/centraal is gevraagd),
    // staat de bron fysiek buiten de leiding en kan het bij De >= 100 mm alleen DWSI van buitenaf zijn.
    if (!params.technique && !isCentraal && params.sfd && params.sfd > De) {
      params.technique = "DWSI";
      if (typeof actiefGespreksGeheugen !== "undefined" && actiefGespreksGeheugen) {
        actiefGespreksGeheugen.technique = "DWSI";
        if (!actiefGespreksGeheugen.opstelling) {
          actiefGespreksGeheugen.opstelling = "Opstelling 13/14 E (DWSI)";
        }
      }
    }

    const isSWSI = params.technique === "SWSI" || /\bswsi\b/i.test(lower);
    const techniek = isSWSI ? "SWSI" : "DWSI";

    // Controleer of gebruiker om minimale FFD vraagt
    const wilMinFFD =
      !params.sfd && (
        Boolean(params.wilMinFFD) ||
        /\b(wat\s+is\s+de\s+)?(min\w*|kleinste)\s+(?:de\s+)?(ffd|sfd|focus|afstand|focusafstand)\b/i.test(vraagTekst)
      );

    if (!params.sfd && wilMinFFD && params.wanddikte && params.procedure) {
      if (!params.brongrootte) {
        if (typeof actiefGespreksGeheugen !== "undefined" && actiefGespreksGeheugen) {
          actiefGespreksGeheugen.verwachtParameter = "brongrootte";
        }
        if (chips) chips.push(...geefBrongrootteSuggestieChips(params.bronTekst));
        return `Om het aantal opnames bij de minimale FFD te berekenen heb ik de <strong>brongrootte</strong> (in mm) nodig. Welke brongrootte heeft de bron?`;
      }
      const berekendeMin = bepaalNumeriekeMinFFD(params, vraagTekst);
      if (berekendeMin) {
        params.sfd = berekendeMin;
        if (actiefGespreksGeheugen) actiefGespreksGeheugen.sfd = berekendeMin;
      }
    }

    // 3. Standaard situatie: combineer eventueel ontbrekende gegevens in 1 gerichte vraag (Q29 & Gesprek 1)
    const voorgesteldeFFD = bepaalVoorgesteldeFFD(params, vraagTekst);
    const berekendeMin = (params.wanddikte && params.procedure && (params.brongrootte || params.bronTekst))
      ? bepaalNumeriekeMinFFD(params, vraagTekst)
      : null;

    let isVoorgesteldeFFDGebruikt = false;
    if (!params.sfd && params.technique === "DWSI" && params.wanddikte && params.procedure && voorgesteldeFFD) {
      if (berekendeMin && berekendeMin > voorgesteldeFFD) {
        // Minimale FFD is groter dan voorgestelde FFD: niet automatisch invullen, RADI vraagt specifiek welke FFD gewenst is!
      } else {
        params.sfd = voorgesteldeFFD;
        isVoorgesteldeFFDGebruikt = true;
      }
    }

    const ontbrekend = [];
    if (!params.wanddikte) ontbrekend.push("wanddikte");
    if (!params.procedure) ontbrekend.push("procedure");
    if (!params.sfd) ontbrekend.push("sfd");

    if (ontbrekend.length > 0) {
      if (typeof actiefGespreksGeheugen !== "undefined" && actiefGespreksGeheugen) {
        actiefGespreksGeheugen.verwachtParameter = ontbrekend[0];
      }

      if (ontbrekend.length === 1 && ontbrekend[0] === "sfd") {
        if (berekendeMin && voorgesteldeFFD && berekendeMin > voorgesteldeFFD) {
          if (chips) {
            chips.push(`${voorgesteldeFFD} mm FFD`, `${berekendeMin} mm FFD (min. ffd)`);
          }
          const isXrayLabel =
            (params.bronTekst && /x[-\s]?ray|rontgen|röntgen|buis|balteau|ceram|yxlon|smart|evo|rondstraler/i.test(params.bronTekst)) ||
            params.bronType === "X-ray" ||
            params.bronType === "Rontgen" ||
            /\b(x[-\s]?ray|rontgen|röntgen|balteau|ceram|yxlon|smart\s*evo)\b/i.test(lower);
          const ffdBasisTekst = isXrayLabel ? "diameter + 150 mm (X-ray)" : "diameter + 15 mm";
          return `Voor <strong>${diaLabel} (${params.wanddikte} mm dik, ${params.procedure})</strong> is de voorgestelde FFD bij contactopname <strong>${voorgesteldeFFD} mm</strong> (${ffdBasisTekst}), maar de normatieve minimale FFD volgens ${params.procedure} is <strong>${berekendeMin} mm</strong> (${(berekendeMin / 10).toFixed(1)} cm).<br><br>` +
                 `Met welke FFD wil je dat het aantal opnames wordt berekend?`;
        }
        if (chips) {
          if (voorgesteldeFFD) {
            chips.push(`${voorgesteldeFFD} mm FFD`);
          }
          if (berekendeMin) chips.push(`${berekendeMin} mm FFD (min. ffd)`);
          chips.push("Centraal / panoramisch", "500 mm FFD", "600 mm FFD");
        }
        const hints = [];
        if (voorgesteldeFFD) hints.push(`voorgestelde FFD op basis van opstelling: <strong>${voorgesteldeFFD} mm</strong>`);
        if (berekendeMin) hints.push(`normatieve minimale FFD: <strong>${berekendeMin} mm</strong>`);
        return `Voor <strong>${diaLabel} (${params.wanddikte} mm dik, ${params.procedure})</strong> is het aantal opnames afhankelijk van de opstelling en gekozen <strong>FFD</strong>:<br>` +
               `• Gaat het om een <strong>DWSI opname van buitenaf (opstelling 13/14)</strong> of <strong>centraal/panoramisch (opstelling 5/A)</strong>?<br>` +
               `• Wat is bij DWSI de gekozen <strong>FFD</strong> (in mm of cm)${hints.length ? ` (${hints.join(", ")})` : ""}?`;
      }

      if (ontbrekend.length === 1 && ontbrekend[0] === "procedure") {
        if (chips) chips.push("Klasse B", "Klasse A", "ASME");
        return `Volgens welke <strong>kwaliteitsklasse of norm</strong> moet ${diaLabel} van ${params.wanddikte} mm dik (FFD ${params.sfd} mm) worden opgenomen: <strong>EN Klasse A</strong>, <strong>EN Klasse B</strong> of <strong>ASME</strong>?`;
      }

      // Meerdere gegevens ontbreken: stel 1 gecombineerde vraag zodat de gebruiker alles in één keer kan invullen!
      if (chips) {
        if (!params.wanddikte) chips.push("6 mm dik", "8 mm dik", "10 mm dik");
        if (!params.procedure) chips.push("Klasse B", "Klasse A", "ASME");
        if (!params.sfd && voorgesteldeFFD) {
          chips.push(`${voorgesteldeFFD} mm FFD`);
          if (berekendeMin && berekendeMin > voorgesteldeFFD) {
            chips.push(`${berekendeMin} mm FFD (min. ffd)`);
          }
        }
        if (params.technique !== "DWSI") chips.push("Centraal / panoramisch");
      }
      const vragenLijst = [];
      if (params.technique !== "DWSI") {
        vragenLijst.push(`• Welke <strong>opstelling</strong> gebruik je: <strong>DWSI van buitenaf (opstelling 13/14)</strong> of <strong>centraal/panoramisch (opstelling 5/A)</strong>?`);
      }
      if (!params.wanddikte) vragenLijst.push(`• Wat is de <strong>wanddikte</strong> (in mm)?`);
      if (!params.sfd) {
        vragenLijst.push(`• Wat is de gekozen <strong>FFD</strong> (film-focusafstand in mm)${voorgesteldeFFD ? ` (voorgestelde FFD voor DWSI: <strong>${voorgesteldeFFD} mm</strong>)` : ""}?`);
      }
      if (!params.procedure) vragenLijst.push(`• Volgens welke <strong>norm / kwaliteitsklasse</strong> (EN Klasse A, EN Klasse B of ASME)?`);

      return `Om het aantal opnames voor <strong>${diaLabel}${params.wanddikte ? ` (${params.wanddikte} mm dik)` : ""}${params.technique === "DWSI" ? " volgens DWSI (opstelling 13/14 E)" : ""}</strong> te berekenen heb ik nog de volgende gegevens nodig:<br>${vragenLijst.join("<br>")}`;
    }

    const t = params.wanddikte;
    const proc = params.procedure;
    const sfd = params.sfd;
    const sfdInfo = isVoorgesteldeFFDGebruikt ? `bij voorgestelde FFD van ${sfd} mm` : `bij FFD van ${sfd} mm`;

    const expB = calculateMinimumExposures(De, t, sfd, techniek, "EN-B", params.optie || "");
    const expA = calculateMinimumExposures(De, t, sfd, techniek, "EN-A", params.optie || "");

    const gekozenExp = proc === "EN-B" ? expB : expA;
    const graden = Math.round(360 / gekozenExp);
    const effFilm = (omtrek / gekozenExp).toFixed(1);

    const opstellingTekst = params.opstelling || (techniek === "SWSI" && params.optie === "2" ? "SWSI excentrisch (opstelling 8/B)" : (techniek === "SWSI" ? "SWSI (opstelling 2/C)" : "DWSI"));
    let resp = `Voor ${diaLabel} van ${t} mm dik volgens ${proc} (${opstellingTekst}, ${sfdInfo}):<br>` +
               `• Minimaal aantal opnames: <strong>${gekozenExp} opnames</strong> (om de ${graden}°).<br>` +
               `• Omtrek: ${omtrekCm} cm (effectieve lengte per opname: ${effFilm} mm).`;

    if (proc === "EN-B" && expA !== expB) {
      const gradenA = Math.round(360 / expA);
      resp += `<br><small style="opacity: 0.85;">(Volgens Klasse A of ASME: minimaal ${expA} opnames om de ${gradenA}° vanwege ruimere 20% diktetolerantie t.o.v. 10% bij Klasse B).</small>`;
    }

    const berekendeMinFFD = (params.brongrootte || params.bronTekst) ? bepaalNumeriekeMinFFD(params, vraagTekst) : null;
    if (berekendeMinFFD && sfd < berekendeMinFFD) {
      const expMin = calculateMinimumExposures(De, t, berekendeMinFFD, techniek, proc, params.optie || "");
      const gradenMin = Math.round(360 / expMin);
      resp += `<br><small style="color: #ffb4b4; display: block; margin-top: 6px;"><em>Ter vergelijking bij normatieve min. FFD van ${berekendeMinFFD} mm (${(berekendeMinFFD/10).toFixed(1)} cm):</em> minimaal <strong>${expMin} opnames</strong> (om de ${gradenMin}°).</small>`;
    }

    let ttsOpnames = `Minimaal ${gekozenExp} ${gekozenExp === 1 ? "opname" : "opnames"}, om de ${graden} graden`;
    if (berekendeMinFFD && sfd < berekendeMinFFD) {
      ttsOpnames = `Let op, minimale FFD onderschreden. ${ttsOpnames}`;
    }
    resp += `<span class="rt-tts-summary" style="display:none">${ttsOpnames}</span>`;
    resp += `<br><small style="opacity: 0.85;">(Berekend volgens <a href="opnamesklasseb.html" class="ai-link" target="_blank">opnamesklasseb.html</a> conform EN ISO 17636-1 / ASME). Opmerking: 1 opname rondom is alleen mogelijk bij een <em>centrale/panoramische</em> opstelling van binnenuit.</small>`;

    return resp;
  }

  // 6. "Mag ik..." verificatievragen (bijv. Voorbeeld 7: centraal schieten, ovaaltjes, excentrisch)
  function berekenMagIk(params, vraagTekst, chips = []) {
    const lower = vraagTekst.toLowerCase();
    const De = params.diameter;

    // 0. Controle op brondiktegrenzen (Ir-192 / Se-75) conform pruts.html / EN ISO 17636-1 (Q21 & Q22)
    const vraagtIr = /\b(ir[-\s]?192|iridium)\b/i.test(lower) || params.bronType === "Ir192";
    const vraagtSe = /\b(se[-\s]?75|selenium|seleen)\b/i.test(lower) || params.bronType === "Se75";
    if ((vraagtIr || vraagtSe) && (params.wanddikte || params.doorstraaldeDikte) && !/\b(centraal|excentrisch|ovaal|ovaaltje|opstelling)\b/i.test(lower)) {
      const isDubbel = params.technique !== "SWSI" && (params.technique === "DWSI" || params.technique === "DWDI" || /\b(dubbelwand|dubbelwandig|dwsi|dwdi|pijp|buis|duimer|duims)\b/i.test(lower) || Boolean(De && !params.isPlaat));
      const doorstr = params.doorstraaldeDikte || (isDubbel ? 2 * params.wanddikte : params.wanddikte);
      if (vraagtIr && doorstr < 10) {
        return `❌ <strong>Nee, dat is volgens de norm (EN ISO 17636-1 / <a href="pruts.html" class="ai-link" target="_blank">pruts.html</a>) NIET toegestaan!</strong><br>` +
               `Voor <strong>Iridium-192 (Ir-192)</strong> geldt een minimale doorstraalde dikte van <strong>10 mm</strong> (standaard toepassingsgebied 20&ndash;90 mm, of 10&ndash;90 mm met 1 draadje vermindering). Een doorstraalde dikte van <strong>${doorstr} mm</strong> is te dun voor Ir-192; gebruik hiervoor <strong>Selenium-75 (Se-75)</strong> of een <strong>röntgenbuis (X-ray)</strong>.`;
      }
      if (vraagtSe && doorstr > 40) {
        return `❌ <strong>Nee, dat is volgens EN ISO 17636-1 / ASME (<a href="pruts.html" class="ai-link" target="_blank">pruts.html</a>) NIET toegestaan!</strong><br>` +
               `Voor <strong>Selenium-75 (Se-75)</strong> geldt voor zowel EN Klasse A, EN Klasse B als ASME een maximale doorstraalde dikte van <strong>40 mm</strong>. Bij ${params.wanddikte ? `${params.wanddikte} mm ${isDubbel ? "dubbelwandig " : ""}` : ""}is de doorstraalde dikte <strong>${doorstr} mm</strong> (&gt; 40 mm). Gebruik hiervoor <strong>Iridium-192 (Ir-192)</strong>.`;
      }
    }

    if (!De) {
      return "Om te controleren of een opstelling volgens de norm is toegestaan, wat is de <strong>diameter</strong> van de buis?";
    }
    const diaLabel = formatMmNaarDuimLabel(De);
    const isCentraal = /\b(centraal|panoram|panoramisch|rondstraler|rondstralen|opstelling\s*5)\b/i.test(lower) || params.optie === "1" || isRondstralerBron(params, lower);
    const isOvaal = /\b(ovaal|ovaaltje|ovaaltjes|elliptisch|opstelling\s*(?:11|f\b))\b/i.test(lower) || params.ovaaltje === "Ja";
    const isSuperpositie = /\b(opstelling\s*(?:12|g\b)|superpositie)\b/i.test(lower);
    const isExcentrisch = /\b(excentrisch|excentrische|opstelling\s*(?:8|b\b))\b/i.test(lower) || params.optie === "2";
    const isSWSI = /\b(swsi|single\s*wall|enkel\s*wand|enkelwandig)\b/i.test(lower) && !isCentraal && !isExcentrisch;

    if (isCentraal) {
      const ontbrekend = [];
      if (!params.wanddikte) ontbrekend.push("wanddikte");
      if (!params.brongrootte) ontbrekend.push("brongrootte");
      if (!params.procedure) ontbrekend.push("procedure");

      if (ontbrekend.length > 0) {
        if (typeof actiefGespreksGeheugen !== "undefined" && actiefGespreksGeheugen) {
          actiefGespreksGeheugen.verwachtParameter = ontbrekend[0];
        }
        if (chips) {
          if (!params.wanddikte) chips.push("6 mm dik", "8 mm dik", "10 mm dik");
          if (!params.brongrootte) chips.push(...geefBrongrootteSuggestieChips(params.bronTekst, params.opstelling || "centraal"));
          if (!params.procedure) chips.push("Klasse B", "Klasse A", "ASME");
        }
        if (ontbrekend.length === 1 && ontbrekend[0] === "wanddikte") {
          return `Om te berekenen of een centrale opstelling (opstelling 5 / A) op ${diaLabel} volgens de norm is toegestaan, wat is de <strong>wanddikte</strong> (in mm)?`;
        }
        if (ontbrekend.length === 1 && ontbrekend[0] === "brongrootte") {
          return `Welke <strong>brongrootte</strong> (focusafmeting in mm) heeft de bron of röntgenbuis?`;
        }
        if (ontbrekend.length === 1 && ontbrekend[0] === "procedure") {
          return `Volgens welke <strong>kwaliteitsklasse of norm</strong> (EN Klasse A, EN Klasse B of ASME)?`;
        }
        const vragen = [];
        if (!params.wanddikte) vragen.push("• Wat is de <strong>wanddikte</strong> (in mm)?");
        if (!params.brongrootte) vragen.push("• Wat is de <strong>brongrootte</strong> (focusafmeting in mm)?");
        if (!params.procedure) vragen.push("• Volgens welke <strong>norm / kwaliteitsklasse</strong> (EN Klasse A, EN Klasse B of ASME)?");
        return `Om te controleren of een centrale (panoramische) opstelling op <strong>${diaLabel}</strong> is toegestaan, heb ik de volgende gegevens nodig:<br>${vragen.join("<br>")}`;
      }

      const t = params.wanddikte;
      const b = params.brongrootte;
      const proc = params.procedure;
      const werkelijkeFfd = De / 2;
      let minFfd = 0;
      if (proc === "ASME") {
        const ugMax = t < 50 ? 0.51 : (t < 75 ? 0.76 : (t <= 100 ? 1.02 : 1.78));
        minFfd = ((b * t) / ugMax) + t;
      } else {
        const factor = proc === "EN-A" ? 7.5 : 15;
        minFfd = (b * factor * Math.pow(t, 2 / 3) * 0.5) + t;
      }
      minFfd = Math.round(minFfd);
      const werkelijkAfgerond = Number(werkelijkeFfd.toFixed(1));

      if (werkelijkeFfd >= minFfd) {
        return `✅ <strong>Ja, dat is toegestaan!</strong> De minimale film-focusafstand voor opstelling 5 (centraal) volgens ${proc} is <strong>${minFfd} mm</strong>, en een ${diaLabel} centraal geeft je <strong>${werkelijkAfgerond} mm</strong> film-focusafstand.`;
      } else {
        return `❌ <strong>Nee, dat is volgens ${proc} helaas niet toegestaan!</strong> De minimale film-focusafstand voor opstelling 5 (centraal) is <strong>${minFfd} mm</strong>, maar een ${diaLabel} centraal geeft slechts <strong>${werkelijkAfgerond} mm</strong> film-focusafstand (te kort).`;
      }
    }

    if (isOvaal) {
      // Controleer EERST of De > 100 mm: dan is een ovaaltje sowieso niet toegestaan, ongeacht de wanddikte (Q24)
      if (De > 100) {
        return `❌ <strong>Nee, ovaaltjes schieten (opstelling 11 / F) is NIET toegestaan op ${diaLabel} (${De} mm)!</strong><br>` +
               `Volgens de norm (EN ISO 17636-1) geldt een maximale buitendiameter van <strong>100 mm</strong> (DN 80 / 3 duimer en kleiner) voor DWDI met verzet.<br>` +
               `<em>Advies:</em> Gebruik voor deze diameter <strong>DWSI (opstelling 13 / 14 / E)</strong>.`;
      }
      if (!params.wanddikte) {
        if (typeof actiefGespreksGeheugen !== "undefined" && actiefGespreksGeheugen) {
          actiefGespreksGeheugen.verwachtParameter = "wanddikte";
        }
        if (chips) chips.push("3 mm dik", "4 mm dik", "6 mm dik", "8 mm dik", "10 mm dik");
        return `Om te beoordelen of ovaaltjes schieten (opstelling 11 / F) op ${diaLabel} is toegestaan, wat is de <strong>wanddikte</strong> (in mm)?`;
      }
      const t = params.wanddikte;
      const lb = params.lasbreedte;

      if (t > 8) {
        return `❌ <strong>Nee, ovaaltjes schieten (opstelling 11 / F) is op ${diaLabel} van ${t} mm dik NIET toegestaan!</strong><br>` +
               `De maximale wanddikte voor een ovaalbeeld is volgens de norm (EN ISO 17636-1 / <a href="verzet.html" class="ai-link" target="_blank">verzet.html</a>) namelijk <strong>8 mm</strong> (hier is t = ${t} mm).<br>` +
               `<em>Advies:</em> Pas <strong>opstelling 12 / G (superpositie)</strong> toe (3 opnames onder 60° of 120° loodrecht door de las).`;
      }
      if (lb !== null && lb !== undefined && lb > (De / 4)) {
        return `❌ <strong>Nee, ovaaltjes schieten (opstelling 11 / F) is NIET toegestaan op ${diaLabel}!</strong><br>` +
               `De lasbreedte (${lb} mm) is breder dan de maximaal toegestane grens van De / 4 (<strong>${(De / 4).toFixed(1)} mm</strong>).<br>` +
               `<em>Advies:</em> Gebruik <strong>opstelling 12 / G (superpositie)</strong>.`;
      }

      let resp = `✅ <strong>Ja, ovaaltjes schieten (opstelling 11 / F) is toegestaan op ${diaLabel} van ${t} mm dik!</strong><br>` +
                 `• Techniek: DWDI met verzet (<strong>2 opnames onder 90°</strong>).<br>` +
                 `• Normvoorwaarden: buitendiameter &le; 100 mm (${De} mm), wanddikte &le; 8 mm (${t} mm) en de <strong>lasbreedte mag maximaal De / 4 (${(De / 4).toFixed(1)} mm)</strong> zijn${lb ? ` (opgegeven lasbreedte: ${lb} mm)` : ""}.`;
      if (lb && params.sfd) {
        const A = params.sfd - De;
        const verzet = 1.5 * lb * (A / De);
        resp += `<br>• Benodigd verzet bij FFD ${params.sfd} mm: <strong>${verzet.toFixed(1)} mm</strong> (<a href="verzet.html" class="ai-link" target="_blank">verzet.html</a>).`;
      }
      return resp;
    }

    if (isSuperpositie) {
      if (De <= 100) {
        const dikteOpmerking = params.wanddikte && params.wanddikte > 8
          ? `<br>• Omdat de wanddikte <strong>${params.wanddikte} mm (&gt; 8 mm)</strong> is, zijn ovaaltjes (opstelling 11 / F) niet toegestaan en is opstelling 12 / G zelfs verplicht.`
          : "";
        return `✅ <strong>Ja, Opstelling 12 / G (DWDI superpositie) is toegestaan op ${diaLabel}${params.wanddikte ? ` van ${params.wanddikte} mm dik` : ""}!</strong><br>` +
               `• Techniek: <strong>3 opnames onder 60° of 120°</strong> loodrecht door de las (zonder verzet).${dikteOpmerking}`;
      } else {
        return `❌ <strong>Nee, Opstelling 12 / G (DWDI superpositie) is niet toegestaan op ${diaLabel} (${De} mm &gt; 100 mm).</strong><br>` +
               `Voor een diameter groter dan 100 mm moet <strong>DWSI (Opstelling 13 / 14 / E)</strong> worden toegepast.`;
      }
    }

    if (isSWSI) {
      if (De <= 100) {
        return `Voor een <strong>${diaLabel}</strong> (buitendiameter &le; 100 mm) wordt gebruikelijk <strong>DWDI (Opstelling 11 / F ovaaltje of Opstelling 12 / G superpositie)</strong> toegepast, omdat de bron of film bij deze kleine diameter in de praktijk niet van binnenuit geplaatst kan worden.`;
      } else {
        return `Op een <strong>${diaLabel}</strong> is <strong>SWSI</strong> toegestaan als de binnenkant toegankelijk is: via <strong>Opstelling 2 / C</strong> (bron buiten, film binnen), <strong>Opstelling 5 / A</strong> (centraal/panoramisch) of <strong>Opstelling 8 / B</strong> (excentrisch). Als de leiding alleen van buitenaf toegankelijk is, gebruik je <strong>DWSI (Opstelling 13 / 14 / E)</strong>.`;
      }
    }

    if (isExcentrisch) {
      const ontbrekend = [];
      if (!params.wanddikte) ontbrekend.push("wanddikte");
      if (!params.brongrootte) ontbrekend.push("brongrootte");
      if (!params.procedure) ontbrekend.push("procedure");

      if (ontbrekend.length > 0) {
        if (typeof actiefGespreksGeheugen !== "undefined" && actiefGespreksGeheugen) {
          actiefGespreksGeheugen.verwachtParameter = ontbrekend[0];
        }
        if (chips) {
          if (!params.wanddikte) chips.push("3.6 mm dik", "4.5 mm dik", "6 mm dik", "8 mm dik");
          if (!params.brongrootte) chips.push(...geefBrongrootteSuggestieChips(params.bronTekst, params.opstelling));
          if (!params.procedure) chips.push("Klasse B", "Klasse A", "ASME");
        }
        if (ontbrekend.length === 1 && ontbrekend[0] === "wanddikte") {
          return `Om te berekenen of een excentrische opstelling (8 / B) op ${diaLabel} volgens de norm is toegestaan, wat is de <strong>wanddikte</strong> (in mm)?`;
        }
        if (ontbrekend.length === 1 && ontbrekend[0] === "brongrootte") {
          return `Welke <strong>brongrootte</strong> (focusafmeting in mm) heeft de bron of röntgenbuis?`;
        }
        if (ontbrekend.length === 1 && ontbrekend[0] === "procedure") {
          return `Volgens welke <strong>kwaliteitsklasse of norm</strong> (EN Klasse A, EN Klasse B of ASME)?`;
        }
        const vragen = [];
        if (!params.wanddikte) vragen.push("• Wat is de <strong>wanddikte</strong> (in mm)?");
        if (!params.brongrootte) vragen.push("• Wat is de <strong>brongrootte</strong> (focusafmeting in mm)?");
        if (!params.procedure) vragen.push("• Volgens welke <strong>norm / kwaliteitsklasse</strong> (EN Klasse A, EN Klasse B of ASME)?");
        return `Om te berekenen of een excentrische opstelling (opstelling 8 / B) op <strong>${diaLabel}</strong> is toegestaan, heb ik de volgende gegevens nodig:<br>${vragen.join("<br>")}`;
      }

      const t = params.wanddikte;
      const b = params.brongrootte;
      const proc = params.procedure;
      const isXray = params.source === "X-ray" || params.bronType === "X-ray" || (params.bronTekst && params.bronTekst.toLowerCase().includes("x-ray"));
      const offset = isXray ? 170 : 10;
      const maxExcentrischFFDAllowed = De - (t + offset);

      let minFfd = 0;
      if (proc === "ASME") {
        const ugMax = t < 50 ? 0.51 : (t < 75 ? 0.76 : (t <= 100 ? 1.02 : 1.78));
        minFfd = ((b * t) / ugMax) + t;
      } else {
        const factor = proc === "EN-A" ? 7.5 : 15;
        minFfd = (b * factor * Math.pow(t, 2 / 3) * 0.8) + t;
      }
      const minFfdAfgerond = Math.round(minFfd);
      const maxFfdAfgerond = Number(maxExcentrischFFDAllowed.toFixed(1));

      if (minFfd < maxExcentrischFFDAllowed) {
        return `✅ <strong>Ja, ${diaLabel} excentrisch schieten met ${params.bronTekst || "bron"} (focus ${b} mm) volgens ${proc} is toegestaan!</strong><br>` +
               `• Minimale vereiste FFD: <strong>${minFfdAfgerond} mm</strong> (factor 0.8 voor opstelling 8/B).<br>` +
               `• Maximaal beschikbare afstand in de buis: <strong>${maxFfdAfgerond} mm</strong> (De - (t + offset ${offset} mm)).<br>` +
               `Doordat de minimale FFD (${minFfdAfgerond} mm) ruimschoots past binnen de beschikbare buisruimte (${maxFfdAfgerond} mm), voldoet de opstelling aan de norm (<a href="MinFFD.html" class="ai-link" target="_blank">MinFFD.html</a> / <a href="pruts.html" class="ai-link" target="_blank">pruts.html</a>).`;
      } else {
        return `❌ <strong>Nee, een excentrische opstelling (opstelling 8 / B) is volgens ${proc} NIET toegestaan!</strong><br>` +
               `Voor ${diaLabel} van ${t} mm dik met focus ${b} mm is de minimaal vereiste FFD <strong>${minFfdAfgerond} mm</strong>, maar de maximaal haalbare FFD binnen de buis is slechts <strong>${maxFfdAfgerond} mm</strong> (De - (t + offset ${offset} mm)). De buis is te klein voor deze brandvlek / kwaliteitsklasse.`;
      }
    }

    const isDWDI = /\b(dwdi|dwdb|double\s*wall\s*double\s*image|dubbel\s*wand\s*dubbel|dubbelwandig\s*dubbel|opstelling\s*(?:11|12))\b/i.test(lower) || params.technique === "DWDI";
    const isDWSI = /\b(dwsi|dweb|double\s*wall\s*single\s*image|dubbel\s*wand\s*enkel|dubbelwandig\s*enkel|opstelling\s*(?:13|14|e\b))\b/i.test(lower) || params.technique === "DWSI";

    if (isDWDI) {
      if (De > 100) {
        if (typeof actiefGespreksGeheugen !== "undefined" && actiefGespreksGeheugen) {
          actiefGespreksGeheugen.openVraag = {
            type: "bevestig_dwsi_opnames",
            diameter: De,
            diaLabel: diaLabel
          };
        }
        if (chips) chips.push("Ja, reken DWSI opnames uit", "Nee");
        return `Nee, voor een diameter > 100mm is DWDI (double wall double image) niet toegestaan. Wil je dat ik het aantal opnames uitrekenen volgens DWSI (double wall single image / opstelling 13,14 E)?`;
      } else {
        if (typeof actiefGespreksGeheugen !== "undefined" && actiefGespreksGeheugen) {
          actiefGespreksGeheugen.openVraag = {
            type: "controleer_ovaaltjes",
            diameter: De,
            diaLabel: diaLabel
          };
        }
        if (chips) chips.push("Ja, controleer ovaaltjes", "Nee");
        return `Ja, voor ${diaLabel} (diameter &le; 100 mm) moet DWDI (double wall double image / opstelling 11 F of 12 G) worden toegepast. Moet ik controleren of ovaaltjes mogelijk zijn?`;
      }
    }

    if (isDWSI) {
      if (De <= 100) {
        if (typeof actiefGespreksGeheugen !== "undefined" && actiefGespreksGeheugen) {
          actiefGespreksGeheugen.openVraag = {
            type: "controleer_ovaaltjes",
            diameter: De,
            diaLabel: diaLabel
          };
        }
        if (chips) chips.push("Ja, controleer ovaaltjes", "Nee");
        return `Een ${diaLabel} moet volgens opstelling DWDI (double wall double image / opstelling 11 F of 12 G) onderzocht worden. Moet ik controleren of ovaaltjes mogelijk zijn?`;
      } else {
        return `Ja, voor ${diaLabel} (${De} mm > 100 mm) is DWSI (opstelling 13 / 14 E) de voorgeschreven techniek van buitenaf conform EN ISO 17636-1.`;
      }
    }

    return `Voor ${diaLabel}: controleer de gewenste opstelling en norm.`;
  }

  // 7. Minimale FFD (MinFFD.html) & Geometrische Onscherpte (Ug)
  function berekenUg(params, vraagTekst, chips = []) {
    const lower = (vraagTekst || "").toLowerCase();
    const isFormuleVraag = /\b(hoe\s+bereken\s+(?:je|ik)|wat\s+is\s+de\s+formule|formule\s+voor)\b/i.test(lower) && !params.sfd;

    const F = params.brongrootte;
    const sfd = params.sfd;
    const De = params.diameter;
    const isDWDI = (De && De < 100) || params.technique === "DWDI" || /\b(dwdi|ovaal|ovaaltje)\b/i.test(lower);
    const d = params.ofa && params.ofa > 0 ? params.ofa : (isDWDI && De ? De : params.wanddikte);

    if (isFormuleVraag || (!F && !sfd && !d)) {
      if (chips) chips.push("Focus 3 mm, 15 mm dik, FFD 400 mm", "Minimale FFD berekenen");
      return `<strong>Formule voor Geometrische Onscherpte (<i>U</i><sub>g</sub>):</strong><br>` +
             `<div class="rt-math-box"><i>U</i><sub>g</sub> = <span class="rt-math-frac"><span class="rt-math-num"><i>F</i> &times; <i>d</i></span><span class="rt-math-den"><i>D</i></span></span></div><br>` +
             `Waarbij:<br>` +
             `• <strong><i>U</i><sub>g</sub></strong> = Geometrische onscherpte (in mm)<br>` +
             `• <strong><i>F</i></strong> = Brongrootte / focusafmeting van de stralingsbron of röntgenbuis (in mm)<br>` +
             `• <strong><i>d</i></strong> = Object-tot-filmafstand (OFA): de afstand van de bronzijde van het te onderzoeken object (de las) tot de film (in mm; bij SWSI/DWSI is dit de wanddikte <i>t</i>, bij DWDI de buitendiameter <i>D</i><sub>e</sub>)<br>` +
             `• <strong><i>D</i></strong> = Bron-tot-objectafstand: de afstand van de stralingsbron tot de bronzijde van het object (in mm, dus <span class="rt-math-inline"><i>D</i> = FFD &minus; <i>d</i></span>)<br><br>` +
             `<small style="opacity:0.85;">(Zie ook <a href="MinFFD.html" class="ai-link" target="_blank">MinFFD.html</a> voor de normatieve FFD- en <i>U</i><sub>g</sub>-eisen volgens EN ISO 17636-1 en ASME Section V).</small>`;
    }

    if (!F || !d || !sfd) {
      const ontbrekend = [];
      if (!F) ontbrekend.push("<strong>brongrootte <i>F</i></strong> (in mm)");
      if (!d) ontbrekend.push("<strong>wanddikte / object-tot-filmafstand <i>d</i></strong> (in mm)");
      if (!sfd) ontbrekend.push("<strong>FFD</strong> (film-focusafstand in mm)");
      return `Om de geometrische onscherpte (<span class="rt-math-inline"><i>U</i><sub>g</sub> = <span class="rt-math-frac"><span class="rt-math-num"><i>F</i> &times; <i>d</i></span><span class="rt-math-den"><i>D</i></span></span></span>) uit te rekenen mis ik nog: ${ontbrekend.join(", ")}.`;
    }

    const D = sfd - d;
    if (D <= 0) {
      return `De opgegeven FFD (${sfd} mm) moet groter zijn dan de object-tot-filmafstand <i>d</i> (${d} mm).`;
    }
    const ug = (F * d) / D;
    return `<strong>Geometrische onscherpte (<i>U</i><sub>g</sub>) bij focus <i>F</i> = ${F} mm, <i>d</i> = ${d} mm en FFD = ${sfd} mm:</strong><br>` +
           `• Bron-tot-objectafstand <span class="rt-math-inline"><i>D</i> = FFD &minus; <i>d</i> = ${sfd} &minus; ${d} = <strong>${D} mm</strong></span><br>` +
           `• <span class="rt-math-inline"><i>U</i><sub>g</sub> = <span class="rt-math-frac"><span class="rt-math-num"><i>F</i> &times; <i>d</i></span><span class="rt-math-den"><i>D</i></span></span> = <span class="rt-math-frac"><span class="rt-math-num">${F} &times; ${d}</span><span class="rt-math-den">${D}</span></span> = <strong>${ug.toFixed(3)} mm</strong></span> (circa <strong>${ug.toFixed(2)} mm</strong>).<br>` +
           `<small style="opacity:0.85;">(Volgens ASME Sec. V Art. 2 T-285 is voor <i>t</i> &lt; 50 mm maximaal <i>U</i><sub>g</sub> = 0.51 mm toegestaan; zie <a href="MinFFD.html" class="ai-link" target="_blank">MinFFD.html</a>).</small>`;
  }

  function berekenMinFFD(params, vraagTekst, chips = []) {
    const lower = vraagTekst.toLowerCase();
    const isOnstream = Boolean(
      params.isOnstream ||
      params.onstreamKlasse ||
      (params.procedure && /onstream|tb|ta/i.test(params.procedure)) ||
      /\b(onstream|on\s*stream|rt\s*[-]?\s*21021|rt\s*[-]?\s*21022)\b/i.test(lower)
    );
    if (isOnstream) {
      return berekenOnstream(params, vraagTekst, chips);
    }

    const De = params.diameter;
    const diaLabel = De ? formatMmNaarDuimLabel(De) : "vlakke plaat";
    const isCentraal = /\b(centraal|panoram|panoramisch|rondstraler|rondstralen)\b/i.test(lower) || params.optie === "1" || isRondstralerBron(params, lower);
    const isExcentrisch = /\bexcentrisch/i.test(lower) || params.optie === "2";
    const isDWDI = (De && De <= 100 && !isCentraal && !isExcentrisch) || params.technique === "DWDI" || /\b(dwdi|ovaal|ovaaltje|verzet)\b/i.test(lower);

    let ofa = 0;
    if (params.ofa && params.ofa > 0) {
      ofa = params.ofa;
    } else if (isDWDI && De) {
      // Bij DWDI (diameter < 100 mm) is de object-tot-filmafstand gelijk aan de buitendiameter De (zie pruts.html hardRuleDWDI)
      // Wanddikte is hierbij NIET nodig om de minimale FFD te berekenen!
      ofa = De;
    } else {
      // Bij DWSI / SWSI is OFA gelijk aan de wanddikte
      if (!params.wanddikte) {
        if (typeof actiefGespreksGeheugen !== "undefined" && actiefGespreksGeheugen) {
          actiefGespreksGeheugen.verwachtParameter = "wanddikte";
        }
        if (chips) chips.push("4 mm dik", "6 mm dik", "8 mm dik", "10 mm dik");
        return `Om de minimale film-focusafstand (FFD) voor ${diaLabel} te berekenen heb ik de <strong>wanddikte</strong> (in mm) nodig. Wat is de wanddikte?`;
      }
      ofa = params.wanddikte;
    }

    let b = params.brongrootte;
    let fallbackFocusLabel = "";
    if (!b) {
      if (params.bronType === "Se75" || (params.bronTekst && /se[-\s]?75|selenium|seleen/i.test(params.bronTekst))) {
        b = 3.0;
        fallbackFocusLabel = " (standaard 3.0 mm focus voor Se-75)";
      } else if (params.bronType === "Ir192" || (params.bronTekst && /ir[-\s]?192|iridium/i.test(params.bronTekst))) {
        b = 2.8;
        fallbackFocusLabel = " (standaard 2.8 mm focus voor Ir-192)";
      } else {
        if (typeof actiefGespreksGeheugen !== "undefined" && actiefGespreksGeheugen) {
          actiefGespreksGeheugen.verwachtParameter = "brongrootte";
        }
        if (chips) chips.push(...geefBrongrootteSuggestieChips(params.bronTekst, params.opstelling));
        return `Welke <strong>brongrootte</strong> (focusafmeting in mm) heeft de bron of buis?`;
      }
    }

    if (!params.procedure) {
      if (typeof actiefGespreksGeheugen !== "undefined" && actiefGespreksGeheugen) {
        actiefGespreksGeheugen.verwachtParameter = "procedure";
      }
      if (chips) chips.push("Klasse B", "Klasse A", "ASME");
      return `Volgens welke <strong>procedure of kwaliteitsklasse</strong> (EN Klasse A, EN Klasse B of ASME) moet de minimale FFD worden berekend?`;
    }
    const proc = params.procedure;
    if (proc === "ASME" && !(params.wanddikte && params.wanddikte > 0) && !(isDWDI && De && De < 100)) {
      if (typeof actiefGespreksGeheugen !== "undefined" && actiefGespreksGeheugen) {
        actiefGespreksGeheugen.verwachtParameter = "wanddikte";
      }
      if (chips) chips.push("6 mm dik", "10 mm dik", "20 mm dik", "50 mm dik");
      return `Voor de minimale FFD volgens <strong>ASME</strong> heb ik naast OFA (${ofa} mm) en brongrootte (${b} mm) ook de <strong>wanddikte (wt)</strong> nodig om de maximaal toegestane onscherpte <i>U</i><sub>g</sub> te bepalen (&lt; 50 mm: 0.51 mm, 50&ndash;75 mm: 0.76 mm, 75&ndash;100 mm: 1.02 mm; zie <a href="MinFFD.html" class="ai-link" target="_blank">MinFFD.html</a>).<br><br>Wat is de <strong>wanddikte</strong> (in mm)?`;
    }

    let opstellingNaam = params.opstelling || (isDWDI ? "DWDI (dubbelwand dubbelbeeld, OFA = diameter)" : "DWSI");
    if (proc === "ASME") {
      opstellingNaam = isCentraal ? "ASME Section V (centraal / rondstraler)" : (isDWDI ? "ASME Section V (DWDI, OFA = diameter)" : "ASME Section V");
    } else if (isCentraal) {
      opstellingNaam = "opstelling 5/A (centraal)";
    } else if (isExcentrisch) {
      opstellingNaam = "opstelling 8/B (excentrisch)";
    }
    const minFfd = bepaalNumeriekeMinFFD({ ...params, brongrootte: b }, vraagTekst);
    const voorgesteldeFFD = bepaalVoorgesteldeFFD({ ...params, brongrootte: b }, vraagTekst);
    const detailInfo = params.ofa && params.ofa > 0
      ? `OFA ${ofa} mm${params.wanddikte ? ` (wanddikte ${params.wanddikte} mm)` : ""}`
      : (isDWDI ? `diameter ${De} mm (OFA${params.wanddikte ? `, wanddikte ${params.wanddikte} mm` : ""})` : `wanddikte ${ofa} mm`);

    const vraagtBronOpPijp = /\bbron\s+op\s+de\s+(?:pijp|buis|leiding)\b/i.test(lower);
    const vraagtGenoegFocus =
      /\b(?:heb ik|is er|is dit|is mijn|voldoe ik aan|hebben we)\s+(?:genoeg|voldoende)\s+(?:focus|ffd|sfd)\b/i.test(lower) ||
      /\b(?:genoeg|voldoende)\s+(?:focus|ffd|sfd)\b/i.test(lower) ||
      /\b(?:voldoe\s+ik\s+aan\s+(?:de\s+)?(?:minimale\s+)?(?:ffd|sfd|focus))\b/i.test(lower);

    let prefix = "";
    if (vraagtBronOpPijp && De) {
      const ffdOpPijp = voorgesteldeFFD || De;
      if (ffdOpPijp >= minFfd) {
        prefix = `✅ <strong>Ja, je kunt met de bron op de pijp zitten!</strong> De voorgestelde FFD op de pijp (<strong>${ffdOpPijp} mm</strong>) is namelijk ruimschoots groter dan de minimaal vereiste FFD (<strong>${minFfd} mm</strong>).<br><br>`;
      } else {
        prefix = `❌ <strong>Nee, je kunt NIET met de bron direct op de pijp zitten!</strong> De FFD op de pijp (<strong>${ffdOpPijp} mm</strong>) is kleiner dan de minimaal vereiste FFD (<strong>${minFfd} mm</strong>); je moet dus afstand houden.<br><br>`;
      }
    } else if (params.sfd) {
      const gekozen = params.sfd;
      if (gekozen >= minFfd) {
        prefix = `✅ <strong>Ja, je hebt voldoende focus!</strong> Je ingestelde FFD (<strong>${gekozen} mm</strong>) is groter dan of gelijk aan de minimaal vereiste FFD (<strong>${minFfd} mm</strong>) volgens ${proc}. (Marge: <strong>+${gekozen - minFfd} mm</strong> reserve).<br><br>`;
      } else {
        prefix = `❌ <strong>Nee, je hebt ONVOLDOENDE focus!</strong> Je ingestelde FFD (<strong>${gekozen} mm</strong>) is kleiner dan de minimaal vereiste FFD (<strong>${minFfd} mm</strong>) volgens ${proc}. Je komt <strong>${minFfd - gekozen} mm tekort</strong> om te voldoen aan de onscherpte-eis.<br><br>`;
      }
    } else if (vraagtGenoegFocus) {
      prefix = `Om te controleren of je voldoende focus hebt, moet ik weten welke FFD (film-focusafstand) je wilt aanhouden. De minimaal vereiste FFD volgens ${proc} is <strong>${minFfd} mm</strong>.<br><br>`;
      if (chips) chips.push(`FFD ${minFfd} mm`, `FFD ${minFfd + 50} mm`, `FFD ${minFfd + 100} mm`);
    }

    const minFfdCm = (minFfd / 10).toFixed(1);
    let res = `${prefix}Minimale Film-Focus Afstand (FFD) volgens ${proc} (${opstellingNaam}) voor ${detailInfo} en brongrootte ${b} mm${fallbackFocusLabel}:<br>• <strong>Minimaal ${minFfdCm} cm</strong> (${minFfd} mm).`;

    if (voorgesteldeFFD) {
      if (voorgesteldeFFD > minFfd) {
        res += `<br>• Voorgestelde FFD voor opstelling: <strong>${(voorgesteldeFFD / 10).toFixed(1)} cm</strong> (${voorgesteldeFFD} mm, conform <a href="pruts.html" class="ai-link" target="_blank">pruts.html</a>).`;
        if (chips) chips.push(`${voorgesteldeFFD} mm FFD`);
      } else if (voorgesteldeFFD < minFfd) {
        const isXrayBron = params.bronType === "X-ray" || params.bronType === "Rontgen" || (params.bronTekst && /x[-\s]?ray|rontgen|röntgen|buis|balteau|ceram|yxlon|smart|evo|rondstraler/i.test(params.bronTekst));
        const contactLabel = isCentraal ? "halve diameter, centraal" : (isXrayBron ? "diameter + 150 mm, X-ray" : "diameter + 15 mm");
        const ffdSoort = isCentraal ? "centrale FFD" : "contact-FFD";
        res += `<br>• Voorgestelde ${ffdSoort}: <strong>${(voorgesteldeFFD / 10).toFixed(1)} cm</strong> (${voorgesteldeFFD} mm, ${contactLabel}, let op: &lt; min. FFD).`;
        if (chips) chips.push(`${voorgesteldeFFD} mm FFD`, `${minFfd} mm FFD (min. ffd)`);
      }
    }

    let ttsKern = `Minimaal ${minFfdCm} cm`;
    if (vraagtBronOpPijp && De) {
      const ffdOpPijp = voorgesteldeFFD || De;
      ttsKern = ffdOpPijp >= minFfd ? `Ja, toegestaan. Minimaal ${minFfdCm} cm` : `Nee, niet toegestaan. Minimaal ${minFfdCm} cm`;
    } else if (params.sfd) {
      ttsKern = params.sfd >= minFfd ? `Ja, voldoende focus. Minimaal ${minFfdCm} cm` : `Nee, onvoldoende focus. Minimaal ${minFfdCm} cm`;
    } else if (isCentraal && De) {
      const werkelijk = Number((De / 2).toFixed(1));
      ttsKern = werkelijk >= minFfd ? `Centraal is toegestaan. Minimaal ${minFfdCm} cm` : `Centraal is niet toegestaan. Minimaal ${minFfdCm} cm`;
    }

    if (isCentraal && De) {
      const werkelijk = Number((De / 2).toFixed(1));
      if (werkelijk >= minFfd) {
        res += `<br>✅ <em>Centraal is toegestaan! Beschikbare afstand is ${werkelijk} mm (&ge; ${minFfd} mm).</em>`;
      } else {
        res += `<br>❌ <em>Centraal is NIET toegestaan! Beschikbare afstand is slechts ${werkelijk} mm (&lt; ${minFfd} mm).</em>`;
      }
    }

    res += `<span class="rt-tts-summary" style="display:none">${ttsKern}</span>`;
    res += `<br><small style="opacity: 0.85;">(Berekend volgens <a href="MinFFD.html" class="ai-link" target="_blank">MinFFD.html</a>).</small>`;
    return res;
  }

  // 8. Langsnaad verdeler (LW_Verdeler.html)
  function berekenLangsnaadVerdeling(params, vraagTekst, chips = []) {
    const totaleLengte = params.langsnaadLengte;
    if (!totaleLengte || isNaN(totaleLengte)) {
      if (chips) chips.push("2850 mm (2.85 m)", "1500 mm", "2000 mm", "3000 mm");
      return "Om de filmverdeling volgens <a href=\"LW_Verdeler.html\" class=\"ai-link\" target=\"_blank\">LW_Verdeler.html</a> te berekenen heb ik de <strong>totale lengte</strong> van de langsnaad nodig. Wat is de lengte (bijv. in mm of meters)?";
    }

    let maxLengte = params.langsnaadMaxDeel || 400;
    let uiteindeLengte = params.langsnaadUiteinde !== undefined && params.langsnaadUiteinde !== null ? params.langsnaadUiteinde : 200;

    if (uiteindeLengte > 220) {
      uiteindeLengte = 220;
    } else if (uiteindeLengte < 0) {
      uiteindeLengte = 200;
    }

    // Synchroniseer indien geopend op LW_Verdeler.html
    if (typeof document !== "undefined") {
      const elTot = document.getElementById("totaleLengte");
      const elMax = document.getElementById("maxLengte");
      const elUit = document.getElementById("uiteindeLengte");
      if (elTot) elTot.value = totaleLengte;
      if (elMax) elMax.value = maxLengte;
      if (elUit) elUit.value = uiteindeLengte;
      if (typeof window.verdeelLengte === "function") {
        window.verdeelLengte();
      }
    }

    if (totaleLengte <= maxLengte) {
      if (chips) chips.push("Wis langsnaad", "2850 mm", "3000 mm");
      return `Voor een langsnaad van <strong>${totaleLengte} mm</strong> volstaat <strong>1 x 10/48 film</strong> (dekt tot ${maxLengte} mm naadlengte inclusief overlap).<br><small style="opacity: 0.85;">(Berekend volgens <a href="LW_Verdeler.html" class="ai-link" target="_blank">LW_Verdeler.html</a> met 10x48 cm films).</small>`;
    }

    const resterendeLengte = totaleLengte - (uiteindeLengte * 2);
    if (resterendeLengte <= 0) {
      return `De totale lengte van <strong>${totaleLengte} mm</strong> is te kort voor een verdeling met 2 x ${uiteindeLengte} mm uiteinden.`;
    }

    const aantalStukken = Math.ceil(resterendeLengte / maxLengte);
    const stukLengte = resterendeLengte / aantalStukken;
    const totaalAantalFilms = aantalStukken + 1;
    const stukLengteStr = Number.isInteger(stukLengte) ? String(stukLengte) : stukLengte.toFixed(1);
    const meterStr = (totaleLengte / 1000).toFixed(2).replace(/\.?0+$/, "");

    if (chips) chips.push("Wis langsnaad", "2000 mm", "3000 mm");

    let out = `Voor een langsnaad van <strong>${totaleLengte} mm</strong> (${meterStr} m):<br>`;
    out += `• <strong>${totaalAantalFilms} x 10/48 films</strong><br>`;
    out += `• <strong>${uiteindeLengte} mm</strong> aan het begin en einde (2 x ${uiteindeLengte} mm)<br>`;
    out += `• Tussenafstand tussen de verdeelstrepen: <strong>${stukLengteStr} mm</strong> (${aantalStukken} stukken van ${stukLengteStr} mm).<br>`;
    out += `<small style="opacity: 0.85;">(Berekend volgens <a href="LW_Verdeler.html" class="ai-link" target="_blank">LW_Verdeler.html</a> met 10x48 films, max. ${maxLengte} mm effectieve filmlengte en ${uiteindeLengte} mm uiteindes).</small>`;

    return out;
  }

  // 8b. Bundelbreedte & Dikte Calculator (bundelbreedte.html)
  const TUBE_BUNDEL_DB = {
    balteauCeram300: {
      id: "balteauCeram300",
      name: "Balteau Ceram 300 (Directional)",
      axes: { small: 40, large: 50 },
      term: "bundel"
    },
    balteauRondstraler: {
      id: "balteauRondstraler",
      name: "Balteau Rondstraler (5 mm)",
      axes: { small: 40, large: 360 },
      term: "bundel"
    },
    smartEvo300: {
      id: "smartEvo300",
      name: "Smart EVO 300DS",
      axes: { small: 30, large: 60 },
      term: "bundel"
    },
    yxlon300: {
      id: "yxlon300",
      name: "Yxlon 300 (3mm)",
      axes: { small: 40, large: 55 },
      term: "bundel"
    },
    Se75: {
      id: "Se75",
      name: "Selenium-75",
      axes: { small: 60, large: 90 },
      term: "collimator"
    }
  };

  function berekenBundelbreedte(params, vraagTekst, chips = []) {
    const lower = (vraagTekst || "").toLowerCase();

    // 1. Bron / Buis detectie
    let tube = null;
    if (/\b(balteau\s*rondstraler|rondstraler|rondstralen)\b/i.test(lower)) {
      tube = TUBE_BUNDEL_DB.balteauRondstraler;
    } else if (/\b(smart\s*evo|evo\s*300|smart|yxlon\s*smart)\b/i.test(lower)) {
      tube = TUBE_BUNDEL_DB.smartEvo300;
    } else if (/\b(yxlon|yxlon\s*300)\b/i.test(lower)) {
      tube = TUBE_BUNDEL_DB.yxlon300;
    } else if (/\b(se-75|se75|selenium|seleen|ir-192|ir192|iridium)\b/i.test(lower) || params.bronType === "Se75" || params.bronType === "Ir192") {
      tube = TUBE_BUNDEL_DB.Se75;
    } else if (/\b(balteau\s*(?:ceram|directional)|ceram\s*300|directional)\b/i.test(lower) || /balteau/i.test(lower)) {
      tube = TUBE_BUNDEL_DB.balteauCeram300;
    }

    // Custom angle check
    let customAngle = null;
    const matchAngle = lower.match(/(?:openingshoek|hoek|bundelhoek|bundel)\s*(?:van)?\s*(\d+(?:[.,]\d+)?)\s*(?:graden|°|deg)/i);
    if (matchAngle) {
      customAngle = parseFloat(matchAngle[1].replace(",", "."));
    }

    // 2. Focusafstand (in mm)
    let ffd = params.sfd;
    if (!ffd) {
      const matchF = lower.match(/(?:op|bij|van|naar)?\s*(\d+\s*(?:m|meter)\s*\d{1,2}|\d+(?:[.,]\d+)?\s*(?:cm|mm|meter|m\b)?)\s*(?:ffd|sfd|focus)\b/i);
      if (matchF) {
        ffd = parseFocusAfstandCm(matchF[1]);
        if (ffd) ffd *= 10;
      }
    }
    if (!ffd) {
      const match2m = lower.match(/(?:op|bij|afstand(?: van)?|focus(?: van)?)\s*(\d+(?:[.,]\d+)?)\s*(meter|m\b|cm|mm)\b/i);
      if (match2m) {
        let val = parseFloat(match2m[1].replace(",", "."));
        const unit = match2m[2].toLowerCase();
        if (unit === "meter" || unit === "m") val *= 1000;
        else if (unit === "cm") val *= 10;
        ffd = val;
      }
    }

    // Filmlengte / te dekken lengte check (bijv. "film van 48 cm", "480 mm film", "film van 40 cm", "om 65 cm te belichten")
    let targetFilm = params.filmLengteMm;
    const matchFilmLengte =
      lower.match(/(?:film|lengte)\s*(?:van)?\s*(\d+(?:[.,]\d+)?)\s*(cm|mm|meter|m\b)\b/i) ||
      lower.match(/(\d+(?:[.,]\d+)?)\s*(cm|mm|meter|m\b)\s*(?:film|lengte)\b/i) ||
      lower.match(/(?:om\s+)?(\d+(?:[.,]\d+)?)\s*(cm|mm|meter|m\b)\s*(?:te\s*)?(?:belichten|dekken)/i) ||
      lower.match(/(?:belichten|dekken)\s+(?:van\s+)?(\d+(?:[.,]\d+)?)\s*(cm|mm|meter|m\b)/i);
    if (matchFilmLengte) {
      let fl = parseFloat(matchFilmLengte[1].replace(",", "."));
      const unit = matchFilmLengte[2].toLowerCase();
      if (unit === "cm") fl *= 10;
      else if (unit === "meter" || unit === "m") fl *= 1000;
      targetFilm = fl;
    }

    if (chips) {
      chips.push("Balteau Directional", "Smart EVO 300", "Yxlon 300", "Se-75 / Collimator", "2 meter focus", "Film 48 cm");
    }

    // Vraag: "hoeveel focus minimaal nodig om een film van X te belichten"
    const wilMinFocus =
      (/\b(welke|hoeveel|minimale|wat\s+voor)\s*(?:focus|ffd|afstand)\b/i.test(lower) && /\b(belichten|nodig|dekken|passen)\b/i.test(lower)) ||
      (/\b(om\s+)?\d+.*?(?:cm|mm|meter|m\b)\s*(?:te\s*)?(?:belichten|dekken)\b/i.test(lower) && /\b(focus|ffd|afstand)\b/i.test(lower));

    // Als er geen specifieke röntgenbuis of bron/collimator is opgegeven én geen custom hoek (Q83):
    if (!tube && !customAngle) {
      if (wilMinFocus && targetFilm) {
        const flStr = targetFilm >= 100 ? (targetFilm / 10) + " cm" : targetFilm + " mm";
        const minCol60 = Math.ceil((targetFilm / 2) / Math.tan(30 * Math.PI / 180));
        const minCol90 = Math.ceil((targetFilm / 2) / Math.tan(45 * Math.PI / 180));
        const minBalt40 = Math.ceil((targetFilm / 2) / Math.tan(20 * Math.PI / 180));
        const minBalt50 = Math.ceil((targetFilm / 2) / Math.tan(25 * Math.PI / 180));
        return `Welke <strong>röntgenbuis of gammabron (collimator)</strong> gebruik je om de film van <strong>${flStr} (${targetFilm} mm)</strong> te belichten? De benodigde FFD hangt namelijk af van de stralingsbundelhoek:<br><br>` +
               `• <strong>Gamma collimator (60° &times; 90°):</strong> min. <strong>${minCol90} mm</strong> (brede as 90°) of <strong>${minCol60} mm</strong> (smalle as 60°)<br>` +
               `• <strong>Balteau Ceram 300 (40° &times; 50°):</strong> min. <strong>${minBalt50} mm</strong> (brede as 50°) of <strong>${minBalt40} mm</strong> (smalle as 40°)<br>` +
               `<small style="opacity: 0.85;">(Geef de gebruikte buis of bron op, of raadpleeg <a href="bundelbreedte.html" class="ai-link" target="_blank">bundelbreedte.html</a>).</small>`;
      }
      if (ffd) {
        const wCol60 = Math.round(2 * ffd * Math.tan(30 * Math.PI / 180));
        const wCol90 = Math.round(2 * ffd * Math.tan(45 * Math.PI / 180));
        const wBalt40 = Math.round(2 * ffd * Math.tan(20 * Math.PI / 180));
        const wBalt50 = Math.round(2 * ffd * Math.tan(25 * Math.PI / 180));
        return `Welke <strong>bron (collimator) of röntgenbuis</strong> gebruik je op <strong>${ffd} mm</strong> (${(ffd / 1000).toFixed(2)} m) focusafstand?<br><br>` +
               `• <strong>Standaard gamma collimator (Se-75 / Ir-192, 60° &times; 90°):</strong> Smalle as (60°): <strong>${wCol60} mm</strong> (${(wCol60 / 1000).toFixed(2)} m) | Brede as (90°): <strong>${wCol90} mm</strong> (${(wCol90 / 1000).toFixed(2)} m)<br>` +
               `• <strong>Balteau Ceram 300 (40° &times; 50°):</strong> Smalle as (40°): <strong>${wBalt40} mm</strong> (${(wBalt40 / 1000).toFixed(2)} m) | Brede as (50°): <strong>${wBalt50} mm</strong> (${(wBalt50 / 1000).toFixed(2)} m)<br>` +
               `<small style="opacity: 0.85;">(Berekend volgens <a href="bundelbreedte.html" class="ai-link" target="_blank">bundelbreedte.html</a> conform <span class="rt-math-inline"><i>L</i> = 2 &times; FFD &times; tan(<span class="rt-math-frac"><span class="rt-math-num">&theta;</span><span class="rt-math-den">2</span></span>)</span>).</small>`;
      }
      tube = TUBE_BUNDEL_DB.balteauCeram300;
    } else if (!tube) {
      tube = TUBE_BUNDEL_DB.balteauCeram300;
    }

    if (wilMinFocus && targetFilm) {
      if (customAngle && customAngle > 0 && customAngle < 180) {
        const customRad = (customAngle / 2) * (Math.PI / 180);
        const minFfdCustom = Math.ceil((targetFilm / 2) / Math.tan(customRad));
        const flStr = targetFilm >= 100 ? (targetFilm / 10) + " cm" : targetFilm + " mm";
        return `Om <strong>${flStr}</strong> (${targetFilm} mm) te belichten bij een openingshoek van <strong>${customAngle}°</strong>:<br>` +
               `• Minimaal vereiste focusafstand: <strong>${minFfdCustom} mm</strong> (${(minFfdCustom / 10).toFixed(1)} cm &approx; ${Math.round(minFfdCustom / 10)} cm).<br>` +
               `<small style="opacity: 0.85;">(Berekend volgens <a href="bundelbreedte.html" class="ai-link" target="_blank">bundelbreedte.html</a> conform <span class="rt-math-inline">FFD = <span class="rt-math-frac"><span class="rt-math-num"><i>L</i> / 2</span><span class="rt-math-den">tan(&alpha; / 2)</span></span></span>).</small>`;
      }
      const angleSmallRad = (tube.axes.small / 2) * (Math.PI / 180);
      const angleLargeVal = tube.axes.large === 360 ? 40 : tube.axes.large;
      const angleLargeRad = (angleLargeVal / 2) * (Math.PI / 180);
      const minFfdLarge = Math.ceil((targetFilm / 2) / Math.tan(angleLargeRad));
      const minFfdSmall = Math.ceil((targetFilm / 2) / Math.tan(angleSmallRad));

      let resp = `Om <strong>${targetFilm >= 100 ? (targetFilm / 10) + " cm" : targetFilm + " mm"}</strong> (${targetFilm} mm) te belichten met de <strong>${tube.name}</strong>:<br>`;
      if (tube.axes.large === 360) {
        resp += `• Brede as (360° panoramisch): <strong>Rondom panoramisch</strong> (dekt 360° van de buisomtrek).<br>`;
        resp += `• Smalle as (${tube.axes.small}°): minimaal <strong>${minFfdSmall} mm</strong> (${(minFfdSmall / 10).toFixed(1)} cm &approx; ${Math.round(minFfdSmall / 10)} cm) focus.<br>`;
      } else {
        resp += `• Brede bundel (${tube.axes.large}°): minimaal <strong>${minFfdLarge} mm</strong> (${(minFfdLarge / 10).toFixed(1)} cm &approx; ${Math.round(minFfdLarge / 10)} cm) focus.<br>`;
        resp += `• Smalle bundel (${tube.axes.small}°): minimaal <strong>${minFfdSmall} mm</strong> (${(minFfdSmall / 10).toFixed(1)} cm &approx; ${Math.round(minFfdSmall / 10)} cm) focus.<br>`;
      }
      resp += `<small style="opacity: 0.85;">(Berekend volgens <a href="bundelbreedte.html" class="ai-link" target="_blank">bundelbreedte.html</a> conform <span class="rt-math-inline">FFD = <span class="rt-math-frac"><span class="rt-math-num"><i>L</i> / 2</span><span class="rt-math-den">tan(&alpha; / 2)</span></span></span>).</small>`;
      return resp;
    }

    if (!ffd) {
      if (typeof actiefGespreksGeheugen !== "undefined" && actiefGespreksGeheugen) {
        actiefGespreksGeheugen.verwachtParameter = "sfd";
      }
      return `Voor de <strong>${tube.name}</strong> (openingshoek ${tube.axes.small}° &times; ${tube.axes.large === 360 ? "360°" : tube.axes.large + "°"}): op welke <strong>focusafstand</strong> (bijv. 80 cm, 1 meter of 2 meter) wil je de bundelbreedte berekenen?`;
    }

    // Bereken bundelbreedte op vlakke plaat (standaard)
    const angleSmallRad = (tube.axes.small / 2) * (Math.PI / 180);
    const wSmall = Math.round(2 * ffd * Math.tan(angleSmallRad));

    let wLarge = 0;
    let largeTxt = "";
    if (tube.axes.large === 360) {
      wLarge = 360;
      largeTxt = `• <strong>Brede as (360°):</strong> <strong>360° panoramisch</strong> (volledig rondom).<br>`;
    } else {
      const angleLargeRad = (tube.axes.large / 2) * (Math.PI / 180);
      wLarge = Math.round(2 * ffd * Math.tan(angleLargeRad));
      largeTxt = `• <strong>Brede as (${tube.axes.large}°):</strong> <strong>${wLarge} mm</strong> (${(wLarge / 1000).toFixed(2)} m).<br>`;
    }

    let customTxt = "";
    if (customAngle) {
      const cRad = (customAngle / 2) * (Math.PI / 180);
      const wC = Math.round(2 * ffd * Math.tan(cRad));
      customTxt = `• <strong>Openingshoek ${customAngle}°:</strong> <strong>${wC} mm</strong> (${(wC / 1000).toFixed(2)} m).<br>`;
    }

    let filmVergelijking = "";
    let passHeader = "";
    if (targetFilm) {
      const pastSmall = wSmall >= targetFilm;
      const pastLarge = tube.axes.large === 360 ? true : wLarge >= targetFilm;
      filmVergelijking = `<br><strong>Controle film ${targetFilm} mm (${targetFilm / 10} cm):</strong><br>`;
      filmVergelijking += `• Brede as: ${pastLarge ? `✅ <strong>Past</strong> (${wLarge === 360 ? "panoramisch" : `+${wLarge - targetFilm} mm speling`})` : `❌ <strong>Te klein</strong> (${targetFilm - wLarge} mm te kort)`}.<br>`;
      filmVergelijking += `• Smalle as: ${pastSmall ? `✅ <strong>Past</strong> (+${wSmall - targetFilm} mm speling)` : `❌ <strong>Te klein</strong> (${targetFilm - wSmall} mm te kort)`}.<br>`;

      if (/\b(?:past|passen)\b/i.test(lower)) {
        const isSmalleVraag = /\bsmalle\s*as\b/i.test(lower);
        const isBredeVraag = /\bbrede\s*as\b/i.test(lower);
        if (isSmalleVraag) {
          passHeader = pastSmall
            ? `<div style="font-weight:bold; font-size:1.02rem; margin-bottom:8px; color:#4ade80;">✅ Ja, de film van ${targetFilm / 10} cm past op de smalle as bij ${ffd} mm FFD (+${wSmall - targetFilm} mm speling).</div>`
            : `<div style="font-weight:bold; font-size:1.02rem; margin-bottom:8px; color:#f87171;">❌ Nee, de film van ${targetFilm / 10} cm past niet op de smalle as bij ${ffd} mm FFD (${targetFilm - wSmall} mm te kort).</div>`;
        } else if (isBredeVraag) {
          passHeader = pastLarge
            ? `<div style="font-weight:bold; font-size:1.02rem; margin-bottom:8px; color:#4ade80;">✅ Ja, de film van ${targetFilm / 10} cm past op de brede as bij ${ffd} mm FFD.</div>`
            : `<div style="font-weight:bold; font-size:1.02rem; margin-bottom:8px; color:#f87171;">❌ Nee, de film van ${targetFilm / 10} cm past niet op de brede as bij ${ffd} mm FFD.</div>`;
        } else {
          passHeader = (pastSmall || pastLarge)
            ? `<div style="font-weight:bold; font-size:1.02rem; margin-bottom:8px; color:#4ade80;">✅ Ja, de film van ${targetFilm / 10} cm past ${pastSmall ? "op beide assen" : "op de brede as"} bij ${ffd} mm FFD.</div>`
            : `<div style="font-weight:bold; font-size:1.02rem; margin-bottom:8px; color:#f87171;">❌ Nee, de film van ${targetFilm / 10} cm past niet bij ${ffd} mm FFD (FFD moet groter zijn).</div>`;
        }
      }
    }

    let out = passHeader;
    out += `Voor de <strong>${tube.name}</strong> bij een focus van <strong>${ffd} mm</strong> (${(ffd / 1000).toFixed(2)} meter):<br>`;
    out += `• <strong>Smalle as (${tube.axes.small}°):</strong> <strong>${wSmall} mm</strong> (${(wSmall / 1000).toFixed(2)} m).<br>`;
    out += largeTxt;
    if (customTxt) out += customTxt;
    if (filmVergelijking) out += filmVergelijking;
    out += `<small style="opacity: 0.85; display:block; margin-top:6px;">(Berekend volgens <a href="bundelbreedte.html" class="ai-link" target="_blank">bundelbreedte.html</a> conform <span class="rt-math-inline"><i>L</i> = 2 &times; FFD &times; tan(<span class="rt-math-frac"><span class="rt-math-num">&theta;</span><span class="rt-math-den">2</span></span>)</span>).</small>`;
    return out;
  }

  // --- Lasfouten & Acceptatiecriteria (lasfout.html) ---
  const LASFOUT_DATA = [
    { code: "100", nl: "Scheur", en: "Crack", aliases: ["scheur", "scheuren", "crack", "cracks"] },
    { code: "104", nl: "Eindkrater scheur", en: "Crater crack", aliases: ["eindkrater", "kraterscheur", "krater scheur", "eindkraterscheur", "crater crack"] },
    { code: "2011", nl: "Gasinsluitsel (Porie / Gaspit)", en: "Gas pore", aliases: ["gaspit", "gaspitten", "porie", "porien", "poriën", "gasinsluitsel", "gasinsluitsels", "gas pore", "pore", "enkele gaspit", "enkel gaspit", "gas pit"] },
    { code: "2013", nl: "Nestvormige porositeit", en: "Clustered porosity", aliases: ["nestporositeit", "nestvormige porositeit", "nestvormig", "cluster", "clustered porosity", "nest", "nestvormige"] },
    { code: "2014", nl: "Lineaire porositeit", en: "Linear porosity", aliases: ["lineaire porositeit", "lineaire porositeiten", "linear porosity", "lineaire porie"] },
    { code: "2015", nl: "Gaskanaal", en: "Elongated cavity", aliases: ["gaskanaal", "gaskanelen", "elongated cavity"] },
    { code: "2016", nl: "Wormgat", en: "Wormhole", aliases: ["wormgat", "wormgaten", "wormhole", "wormholes"] },
    { code: "301", nl: "Slakinsluitsel", en: "Slag inclusion", aliases: ["slakinsluitsel", "slakinsluitsels", "slaklijn", "slaklijnen", "slak", "slag inclusion"] },
    { code: "303", nl: "Oxide-insluitsel", en: "Oxide inclusion", aliases: ["oxide-insluitsel", "oxide insluitsel", "oxide", "oxide inclusion"] },
    { code: "304", nl: "Wolfraaminsluitsel", en: "Tungsten inclusion", aliases: ["wolfraaminsluitsel", "wolfraam insluitsel", "wolfraam", "tungsten", "tungsten inclusion"] },
    { code: "401", nl: "Bindingsfout", en: "Lack of fusion", aliases: ["bindingsfout", "bindingsfouten", "lack of fusion", "plakfout", "plakfouten"] },
    { code: "402", nl: "Onvolkomen doorlassing", en: "Lack of penetration", aliases: ["onvolkomen doorlassing", "doorlassing", "geen doorlassing", "lack of penetration", "gebrek aan doorlassing", "onvolledige doorlassing"] },
    { code: "5011", nl: "Randinkarteling", en: "Undercut", aliases: ["randinkarteling", "randinkartelingen", "inkarteling", "inkartelingen", "undercut"] },
    { code: "510", nl: "Doorbranden", en: "Burn through", aliases: ["doorbranden", "doorbranding", "burn through"] }
  ];

  function berekenLasfoutAcceptatie(params, vraagTekst, chips = []) {
    const lower = (vraagTekst || "").toLowerCase();

    // 0. Vraag naar overzicht van alle bekende lasfouten (bijv. "welke lasfouten ken je?")
    const isOverzichtsVraag =
      /\b(welke\s+(?:las)?fouten\s*(?:ken|weet|heb|zijn)|wat\s+voor\s+(?:las)?fouten|overzicht\s*(?:van\s*)?(?:alle\s*)?(?:las)?fouten|lijst\s*(?:van\s*)?(?:alle\s*)?(?:las)?fouten|alle\s*lasfouten|welke\s*defecten|bekende\s*lasfouten)\b/i.test(lower) ||
      (/\b(welke\s+fouten|welke\s+lasfout|lasfout|lasfouten)\b/i.test(lower) && /\b(ken\s+je|weet\s+je|kan\s+je|kun\s+je|ondersteun\s+je|beoordeel\s+je)\b/i.test(lower));

    if (isOverzichtsVraag) {
      if (chips) {
        chips.push("Gaspit (2011)", "Slakinsluitsel (301)", "Bindingsfout (401)", "Nestporositeit (2013)", "Scheur (100)", "lasfout.html");
      }
      return `R.A.D.I. kent alle <strong>14 gestandaardiseerde lasfouten</strong> volgens <strong>ISO 6520-1</strong> en kan hiervoor direct de toelaatbare grenzen berekenen volgens <strong>EN Level 1, 2, 3</strong> (EN ISO 10675-1) en <strong>ASME Sec. VIII Div. 1 (UW-51/UW-52)</strong>:<br><br>` +
        `• <strong>Groep 1: Scheuren</strong><br>` +
        `&nbsp;&nbsp;&bull; <strong>Code 100:</strong> Scheur <em>(Crack)</em> &ndash; ❌ Nooit toegestaan (0 mm)<br>` +
        `&nbsp;&nbsp;&bull; <strong>Code 104:</strong> Eindkraterscheur <em>(Crater crack)</em> &ndash; ❌ Nooit toegestaan (0 mm)<br><br>` +
        `• <strong>Groep 2: Holten &amp; Porositeit</strong><br>` +
        `&nbsp;&nbsp;&bull; <strong>Code 2011:</strong> Gasinsluitsel / Porie / Gaspit <em>(Gas pore)</em><br>` +
        `&nbsp;&nbsp;&bull; <strong>Code 2013:</strong> Nestvormige porositeit <em>(Clustered porosity)</em><br>` +
        `&nbsp;&nbsp;&bull; <strong>Code 2014:</strong> Lineaire porositeit <em>(Linear porosity)</em><br>` +
        `&nbsp;&nbsp;&bull; <strong>Code 2015:</strong> Gaskanaal <em>(Elongated cavity)</em><br>` +
        `&nbsp;&nbsp;&bull; <strong>Code 2016:</strong> Wormgat <em>(Wormhole)</em><br><br>` +
        `• <strong>Groep 3: Vaste insluitsels</strong><br>` +
        `&nbsp;&nbsp;&bull; <strong>Code 301:</strong> Slakinsluitsel / Slaklijn <em>(Slag inclusion)</em><br>` +
        `&nbsp;&nbsp;&bull; <strong>Code 303:</strong> Oxide-insluitsel <em>(Oxide inclusion)</em><br>` +
        `&nbsp;&nbsp;&bull; <strong>Code 304:</strong> Wolfraaminsluitsel <em>(Tungsten inclusion)</em><br><br>` +
        `• <strong>Groep 4: Bindings- &amp; doorlasfouten</strong><br>` +
        `&nbsp;&nbsp;&bull; <strong>Code 401:</strong> Bindingsfout / Plakfout <em>(Lack of fusion)</em><br>` +
        `&nbsp;&nbsp;&bull; <strong>Code 402:</strong> Onvolkomen doorlassing <em>(Lack of penetration)</em><br><br>` +
        `• <strong>Groep 5: Vormafwijkingen</strong><br>` +
        `&nbsp;&nbsp;&bull; <strong>Code 5011:</strong> Randinkarteling <em>(Undercut)</em><br>` +
        `&nbsp;&nbsp;&bull; <strong>Code 510:</strong> Brandvlek / Doorbranden <em>(Burn through)</em><br><br>` +
        `<small style="opacity:0.9;">💡 <em>Stel gerust een specifieke vraag met wanddikte, bijv.:</em><br>` +
        `• <em>"Hoe groot mag een enkele gaspit zijn volgens EN Level 1 bij 3.2 mm dik?"</em><br>` +
        `• <em>"Wat is de eis voor een slakinsluitsel bij 10 mm wanddikte?"</em><br>` +
        `• <em>"Mag een bindingsfout bij EN Level 3?"</em><br>` +
        `(Bekijk ook de complete interactieve tabel op <a href="lasfout.html" class="ai-link" target="_blank">lasfout.html</a> voor schetsen en lasprocessen).</small>`;
    }

    // 0b. Specifieke herkennings- en uitlegvragen over lasfouten op de film (Q92, Q93, Q97)
    if (/\b(worteldoorzakking|teruggetrokken\s*wortel|wortelfout|502|515)\b/i.test(lower)) {
      return `<strong>Verschil tussen Worteldoorzakking (504 / 502) en Teruggetrokken wortel / Wortelholte (515) op de film:</strong><br><br>` +
             `• <strong>Worteldoorzakking (Excess penetration, code 504):</strong> Extra materiaal onderin de wortel (meer wanddikte), waardoor minder straling de film bereikt. Dit zie je op de film als een <strong>lichtere (wittere) band</strong> in het midden van de las.<br>` +
             `• <strong>Teruggetrokken wortel / Wortelholte (Root concavity, code 515):</strong> Materiaaltekort onderin de wortel (minder wanddikte), waardoor meer straling de film bereikt. Dit zie je op de film als een <strong>donkerdere (zwartere) band</strong> in het midden van de las.<br><br>` +
             `<small style="opacity:0.9;">Raadpleeg <a href="lasfout.html" class="ai-link" target="_blank">lasfout.html</a> voor alle 14 gestandaardiseerde RT-lasfouten, filmschetsen en acceptatiecriteria.</small>`;
    }

    const isHerkenVraag = /\b(hoe\s+herken\s+(?:ik|je)|herkennen\s+op|wat\s+betekent|wat\s+is\s+(?:een\s+)?(?:lasfout(?:code)?|wormgat|bindingsfout)|hoe\s+ziet\s+.*?\s+eruit)\b/i.test(lower);

    // 1. Defect identificeren
    let gekozenDefect = null;

    // Check op nummerieke code
    for (const d of LASFOUT_DATA) {
      const codeRegex = new RegExp(`\\b${d.code}\\b`);
      if (codeRegex.test(lower)) {
        gekozenDefect = d;
        break;
      }
    }

    // Check op aliassen / benamingen
    if (!gekozenDefect) {
      for (const d of LASFOUT_DATA) {
        if (d.aliases.some((al) => lower.includes(al))) {
          gekozenDefect = d;
          break;
        }
      }
    }

    if (isHerkenVraag && gekozenDefect) {
      const UITLEG_OP_FILM = {
        "100": "Een fijne, grillige of vertakte donkere lijn met scherpe uiteinden.",
        "104": "Een stervormige of vertakte fijne donkere scheur in de eindkrater van een laspas.",
        "2011": "Een scherp begrensd, rond donker (zwart) stipje op de film.",
        "2013": "Een groepje (cluster) van meerdere kleine ronde donkere poriën dicht bij elkaar.",
        "2014": "Meerdere ronde donkere poriën op één rechte lijn (vaak langs de smeltlijn of in de wortel).",
        "2015": "Een langwerpige, glad begrensde donkere holte in de lengterichting van de las.",
        "2016": "Een langwerpige of visgraat-/kommavormige donkere holte met een karakteristieke uitloper (staartje), ontstaan door opgesloten gas tijdens het stollen.",
        "301": "Een onregelmatig gevormde, vaak langwerpige donkere indicatie (minder scherp en grilliger van vorm dan een porie, vaak evenwijdig aan de lasnaad).",
        "303": "Onregelmatige donkere vlekjes of slierten in de laszone.",
        "304": "Een zeer scherp begrensd, helder wit (licht) puntje op de film, omdat wolfraam een veel hogere dichtheid heeft dan staal/aluminium en de straling sterk absorbeert.",
        "401": "Een strakke, rechte en scherp begrensde donkere lijn (op de lasflank loopt deze iets uit het midden van de las, evenwijdig aan de lasnaad).",
        "402": "Een doorlopende of onderbroken strakke, rechte donkere lijn exact in het midden van de las (in de wortel).",
        "5011": "Een donkere schaduwlijn direct langs de rand (teen) van de lasrups.",
        "510": "Een scherp begrensde, zeer donkere (zwarte) vlek in het midden van de wortel, vaak omgeven door een lichtere rand."
      };
      const kenmerk = UITLEG_OP_FILM[gekozenDefect.code] || "Zie het filmbeeld en de schets op lasfout.html.";
      return `<strong>${gekozenDefect.nl} &ndash; ISO 6520-1 code ${gekozenDefect.code}</strong> <em>(${gekozenDefect.en})</em>:<br><br>` +
             `• <strong>Herkenning op de röntgenfilm:</strong> ${kenmerk}<br>` +
             `• <strong>Acceptatiecriteria &amp; schetsen:</strong> Bekijk de visuele filmweergave en de exacte toelaatbare grenzen (EN Level 1, 2, 3 en ASME) op <a href="lasfout.html" class="ai-link" target="_blank">lasfout.html</a> (of geef een wanddikte op om de grenzen direct te berekenen).`;
    }

    // Fallback als defect niet herkend is
    if (!gekozenDefect) {
      if (params.wanddikte) {
        gekozenDefect = LASFOUT_DATA.find((d) => d.code === "2011");
      } else {
        if (chips) {
          chips.push("Gaspit (2011)", "Slakinsluitsel (301)", "Bindingsfout (401)", "Nestporositeit (2013)", "lasfout.html");
        }
        return `Over welke <strong>lasfout</strong> wil je de acceptatiecriteria weten? R.A.D.I. kent o.a. <strong>Gaspit (2011)</strong>, <strong>Nestporositeit (2013)</strong>, <strong>Slakinsluitsel (301)</strong>, <strong>Bindingsfout (401)</strong> en <strong>Scheur (100)</strong>.<br><br>` +
          `Vraag gerust: <em>'welke lasfouten ken je?'</em> voor het complete overzicht van alle 14 fouten, of raadpleeg <a href="lasfout.html" class="ai-link" target="_blank">lasfout.html</a>.`;
      }
    }

    // 2. Wanddikte (s / t in mm)
    let t = params.wanddikte;
    if (!t) {
      const matchT = lower.match(/(?:wanddikte|dikte|bij|op|van|voor)\s*(\d+(?:[.,]\d+)?)\s*(?:mm)?\b/i) ||
                     lower.match(/(\d+(?:[.,]\d+)?)\s*(?:mm)?\s*(?:dik|wanddikte)/i);
      if (matchT) {
        t = parseFloat(matchT[1].replace(",", "."));
      }
    }

    // Lasbreedte (Wp in mm)
    let wp = params.lasbreedte;
    const matchWp = lower.match(/(?:lasbreedte|breedte|wp)\s*(?:is|van|=|:)?\s*(\d+(?:[.,]\d+)?)\s*(?:mm)?/i);
    if (matchWp) {
      wp = parseFloat(matchWp[1].replace(",", "."));
    }

    // 3. Norm / Level bepalen
    let norm = null;
    if (/\b(level\s*1|niveau\s*1|klasse\s*b|en\s*1|iso\s*level\s*1)\b/i.test(lower)) {
      norm = "en1";
    } else if (/\b(level\s*2|niveau\s*2|klasse\s*c|en\s*2|iso\s*level\s*2)\b/i.test(lower)) {
      norm = "en2";
    } else if (/\b(level\s*3|niveau\s*3|klasse\s*d|en\s*3|iso\s*level\s*3)\b/i.test(lower)) {
      norm = "en3";
    } else if (/\b(asme|sec\s*viii|uw-51|uw-52)\b/i.test(lower)) {
      norm = "asme";
    }

    if (chips) {
      chips.push("EN Level 1", "EN Level 2", "EN Level 3", "ASME", "Nestporositeit (2013)", "lasfout.html");
    }

    if (!t) {
      if (typeof actiefGespreksGeheugen !== "undefined" && actiefGespreksGeheugen) {
        actiefGespreksGeheugen.verwachtParameter = "wanddikte";
      }
      return `Voor de acceptatiecriteria van <strong>${gekozenDefect.nl} (code ${gekozenDefect.code})</strong> volgens ${norm ? (norm === 'en1' ? 'EN Level 1' : norm === 'en2' ? 'EN Level 2' : norm === 'en3' ? 'EN Level 3' : 'ASME') : "EN Level 1, 2, 3 of ASME"} heb ik de <strong>wanddikte</strong> (in mm) nodig. Wat is de wanddikte? (Zie ook <a href="lasfout.html" class="ai-link" target="_blank">lasfout.html</a>).`;
    }

    // 4. Criteria berekenen per norm
    const getCriteriaVoorNorm = (n, valT, valWp) => {
      const code = gekozenDefect.code;
      if (code === "100" || code === "104") {
        return { eis: "❌ Niet toegestaan", detail: "0 mm (scheuren zijn nooit toegestaan)" };
      }
      if (code === "2011") {
        if (n === "en1") {
          const lim = Math.min(valT * 0.2, 3.0);
          return {
            eis: `<strong>d &le; ${lim.toFixed(2)} mm</strong> (afgerond ${lim.toFixed(1)} mm)`,
            detail: `d &le; 0.2s (max 3.0 mm), porieoppervlak A &le; 1%`
          };
        }
        if (n === "en2") {
          const lim = Math.min(valT * 0.3, 4.0);
          return {
            eis: `<strong>d &le; ${lim.toFixed(2)} mm</strong> (afgerond ${lim.toFixed(1)} mm)`,
            detail: `d &le; 0.3s (max 4.0 mm), porieoppervlak A &le; 1.5%`
          };
        }
        if (n === "en3") {
          const lim = Math.min(valT * 0.4, 5.0);
          return {
            eis: `<strong>d &le; ${lim.toFixed(2)} mm</strong> (afgerond ${lim.toFixed(1)} mm)`,
            detail: `d &le; 0.4s (max 5.0 mm), porieoppervlak A &le; 2.5%`
          };
        }
        if (n === "asme") {
          if (valT > 50) return { eis: `<strong>d &le; 10.0 mm</strong>`, detail: `t > 50 mm (max 10 mm)` };
          const std = Math.min(valT / 4, 4.0);
          const iso = Math.min(valT / 3, 6.0);
          const extra = valT < 3.0 ? ` (Let op: max 12 indicaties / 150 mm)` : "";
          return {
            eis: `<strong>d &le; ${std.toFixed(1)} mm</strong> (geïsoleerd: &le; ${iso.toFixed(1)} mm)`,
            detail: `Standaard 1/4t (max 4 mm) | Geïsoleerd (>25mm) 1/3t (max 6 mm)${extra}`
          };
        }
      }
      if (code === "2013") {
        if (n === "en1") {
          const maxCluster = valWp ? Math.min(valWp * 0.5, 15).toFixed(1) : "Wp/2 (max 15 mm)";
          return {
            eis: `<strong>dA &le; ${valWp ? maxCluster + " mm" : "Wp / 2 (max 15 mm)"}</strong>`,
            detail: `Oppervlakte cluster dA &le; Wp/2 (max 15 mm)`
          };
        }
        if (n === "en2") {
          const maxCluster = valWp ? Math.min(valWp, 20).toFixed(1) : "Wp (max 20 mm)";
          return {
            eis: `<strong>dA &le; ${valWp ? maxCluster + " mm" : "Wp (max 20 mm)"}</strong>`,
            detail: `Oppervlakte cluster dA &le; Wp (max 20 mm)`
          };
        }
        if (n === "en3") {
          const maxCluster = valWp ? Math.min(valWp, 25).toFixed(1) : "Wp (max 25 mm)";
          return {
            eis: `<strong>dA &le; ${valWp ? maxCluster + " mm" : "Wp (max 25 mm)"}</strong>`,
            detail: `Oppervlakte cluster dA &le; Wp (max 25 mm)`
          };
        }
        if (n === "asme") {
          const l = Math.min(valT * 2, 25).toFixed(1);
          return {
            eis: `<strong>Lengte &le; ${l} mm</strong>, &Sigma;L &le; 25 mm`,
            detail: `Lengte &le; 2t (max 25 mm), &Sigma;L clusters &le; 25 mm per 150 mm las`
          };
        }
      }
      if (code === "2014") {
        if (n === "en1") {
          const l = Math.min(valT, 25).toFixed(1);
          const d = Math.min(valT * 0.2, 2.0).toFixed(1);
          return { eis: `<strong>l &le; ${l} mm, d &le; ${d} mm</strong>`, detail: `l &le; s (max 25 mm), d &le; 0.2s (max 2 mm)` };
        }
        if (n === "en2") {
          const l = Math.min(valT, 50).toFixed(1);
          const d = Math.min(valT * 0.3, 3.0).toFixed(1);
          return { eis: `<strong>l &le; ${l} mm, d &le; ${d} mm</strong>`, detail: `l &le; s (max 50 mm), d &le; 0.3s (max 3 mm)` };
        }
        if (n === "en3") {
          const l = Math.min(valT, 75).toFixed(1);
          const d = Math.min(valT * 0.4, 4.0).toFixed(1);
          return { eis: `<strong>l &le; ${l} mm, d &le; ${d} mm</strong>`, detail: `l &le; s (max 75 mm), d &le; 0.4s (max 4 mm)` };
        }
        if (n === "asme") {
          return { eis: `<strong>Conform ASME porositeitsregels</strong>`, detail: `Standaard 1/4t (max 4 mm)` };
        }
      }
      if (code === "2015" || code === "2016" || code === "301" || code === "303") {
        if (n === "en1") {
          const h = Math.min(valT * 0.2, 2.0).toFixed(1);
          const sumL = Math.min(valT, 25).toFixed(1);
          return { eis: `<strong>h &le; ${h} mm, &Sigma;l &le; ${sumL} mm</strong>`, detail: `h &le; 0.2s (max 2 mm), &Sigma;l &le; s (max 25 mm)` };
        }
        if (n === "en2") {
          const h = Math.min(valT * 0.3, 3.0).toFixed(1);
          const sumL = Math.min(valT, 50).toFixed(1);
          return { eis: `<strong>h &le; ${h} mm, &Sigma;l &le; ${sumL} mm</strong>`, detail: `h &le; 0.3s (max 3 mm), &Sigma;l &le; s (max 50 mm)` };
        }
        if (n === "en3") {
          const h = Math.min(valT * 0.4, 4.0).toFixed(1);
          const sumL = Math.min(valT, 75).toFixed(1);
          return { eis: `<strong>h &le; ${h} mm, &Sigma;l &le; ${sumL} mm</strong>`, detail: `h &le; 0.4s (max 4 mm), &Sigma;l &le; s (max 75 mm)` };
        }
        if (n === "asme") {
          if (valT <= 19) return { eis: `<strong>6.0 mm</strong>`, detail: `t &le; 19 mm` };
          if (valT <= 57) return { eis: `<strong>${(valT / 3).toFixed(1)} mm</strong>`, detail: `1/3t (19 < t &le; 57 mm)` };
          return { eis: `<strong>19.0 mm</strong>`, detail: `t > 57 mm (max 19 mm)` };
        }
      }
      if (code === "304") {
        if (n === "en1") return { eis: `<strong>l &le; ${Math.min(valT * 0.2, 2.0).toFixed(1)} mm</strong>`, detail: `l &le; 0.2s (max 2 mm)` };
        if (n === "en2") return { eis: `<strong>l &le; ${Math.min(valT * 0.3, 3.0).toFixed(1)} mm</strong>`, detail: `l &le; 0.3s (max 3 mm)` };
        if (n === "en3") return { eis: `<strong>l &le; ${Math.min(valT * 0.4, 4.0).toFixed(1)} mm</strong>`, detail: `l &le; 0.4s (max 4 mm)` };
        if (n === "asme") return { eis: `<strong>Conform ASME porositeitsregels</strong>`, detail: `1/4t (max 4 mm)` };
      }
      if (code === "401") {
        if (n === "en1" || n === "en2" || n === "asme") return { eis: `❌ Niet toegestaan`, detail: `0 mm (geen bindingsfouten toegestaan)` };
        if (n === "en3") {
          const h = Math.min(valT * 0.4, 4.0).toFixed(1);
          return { eis: `<strong>h &le; ${h} mm, &Sigma;l &le; 25 mm</strong>`, detail: `Mits niet aan opp., h &le; 0.4s (max 4 mm), &Sigma;l &le; 25 mm` };
        }
      }
      if (code === "402") {
        if (n === "en1" || n === "en2" || n === "asme") return { eis: `❌ Niet toegestaan`, detail: `0 mm (onvolkomen doorlassing niet toegestaan)` };
        if (n === "en3") return { eis: `<strong>&Sigma;l &le; 25 mm</strong>`, detail: `Toegestaan tot &Sigma;l &le; 25 mm per 100 mm las` };
      }
      if (code === "5011" || code === "510") {
        return { eis: `🔍 Visueel onderzoeken`, detail: `Conform ISO 5817 / ASME visuele inspectie` };
      }
      return { eis: `-`, detail: `-` };
    };

    const cEN1 = getCriteriaVoorNorm("en1", t, wp);
    const cEN2 = getCriteriaVoorNorm("en2", t, wp);
    const cEN3 = getCriteriaVoorNorm("en3", t, wp);
    const cASME = getCriteriaVoorNorm("asme", t, wp);

    let antwoord = "";
    if (norm === "en1") {
      antwoord = `Volgens <strong>EN Level 1</strong> bij een wanddikte van <strong>${t} mm</strong> is voor <strong>${gekozenDefect.nl} (code ${gekozenDefect.code})</strong> toelaatbaar:<br>` +
                 `• Maximaal toelaatbaar: ${cEN1.eis}<br>` +
                 `• Formule / eis: <em>${cEN1.detail}</em><br><br>`;
    } else if (norm === "en2") {
      antwoord = `Volgens <strong>EN Level 2</strong> bij een wanddikte van <strong>${t} mm</strong> is voor <strong>${gekozenDefect.nl} (code ${gekozenDefect.code})</strong> toelaatbaar:<br>` +
                 `• Maximaal toelaatbaar: ${cEN2.eis}<br>` +
                 `• Formule / eis: <em>${cEN2.detail}</em><br><br>`;
    } else if (norm === "en3") {
      antwoord = `Volgens <strong>EN Level 3</strong> bij een wanddikte van <strong>${t} mm</strong> is voor <strong>${gekozenDefect.nl} (code ${gekozenDefect.code})</strong> toelaatbaar:<br>` +
                 `• Maximaal toelaatbaar: ${cEN3.eis}<br>` +
                 `• Formule / eis: <em>${cEN3.detail}</em><br><br>`;
    } else if (norm === "asme") {
      antwoord = `Volgens <strong>ASME Sec VIII Div 1 (UW-51/UW-52)</strong> bij een wanddikte van <strong>${t} mm</strong> is voor <strong>${gekozenDefect.nl} (code ${gekozenDefect.code})</strong> toelaatbaar:<br>` +
                 `• Maximaal toelaatbaar: ${cASME.eis}<br>` +
                 `• Formule / eis: <em>${cASME.detail}</em><br><br>`;
    } else {
      antwoord = `Acceptatiecriteria voor <strong>${gekozenDefect.nl} (code ${gekozenDefect.code})</strong> bij wanddikte <strong>${t} mm</strong>:<br><br>`;
    }

    // Overzichtstabel per norm
    antwoord += `<div style="margin-top:8px; border:1px solid rgba(255,255,255,0.15); border-radius:8px; overflow:hidden;">` +
      `<table style="width:100%; border-collapse:collapse; font-size:0.9rem;">` +
      `<thead><tr style="background:rgba(245,223,77,0.15); color:#F5DF4D; border-bottom:1px solid rgba(245,223,77,0.3); text-align:left;">` +
      `<th style="padding:6px 10px;">Norm / Level</th><th style="padding:6px 10px;">Max. toelaatbaar (t = ${t} mm)</th><th style="padding:6px 10px;">Algemene normformule</th></tr></thead><tbody>` +
      `<tr style="border-bottom:1px solid rgba(255,255,255,0.06); ${norm === 'en1' ? 'background:rgba(245,223,77,0.08); font-weight:bold;' : ''}"><td style="padding:6px 10px;">🎯 EN Level 1</td><td style="padding:6px 10px; color:#F5DF4D;">${cEN1.eis}</td><td style="padding:6px 10px; opacity:0.8; font-size:0.82rem;">${cEN1.detail}</td></tr>` +
      `<tr style="border-bottom:1px solid rgba(255,255,255,0.06); ${norm === 'en2' ? 'background:rgba(245,223,77,0.08); font-weight:bold;' : ''}"><td style="padding:6px 10px;">EN Level 2</td><td style="padding:6px 10px; color:#F5DF4D;">${cEN2.eis}</td><td style="padding:6px 10px; opacity:0.8; font-size:0.82rem;">${cEN2.detail}</td></tr>` +
      `<tr style="border-bottom:1px solid rgba(255,255,255,0.06); ${norm === 'en3' ? 'background:rgba(245,223,77,0.08); font-weight:bold;' : ''}"><td style="padding:6px 10px;">EN Level 3</td><td style="padding:6px 10px; color:#F5DF4D;">${cEN3.eis}</td><td style="padding:6px 10px; opacity:0.8; font-size:0.82rem;">${cEN3.detail}</td></tr>` +
      `<tr style="${norm === 'asme' ? 'background:rgba(245,223,77,0.08); font-weight:bold;' : ''}"><td style="padding:6px 10px;">ASME Sec VIII Div 1</td><td style="padding:6px 10px; color:#F5DF4D;">${cASME.eis}</td><td style="padding:6px 10px; opacity:0.8; font-size:0.82rem;">${cASME.detail}</td></tr>` +
      `</tbody></table></div>` +
      `<small style="opacity: 0.85; display:block; margin-top:8px;">(Raadpleeg de complete interactieve tabel op <a href="lasfout.html" class="ai-link" target="_blank">lasfout.html</a> voor schetsen, lasprocessen en samengestelde nestberekeningen).</small>`;

    return antwoord;
  }

