  // 9. Focus & Filmtype Calculator / Kwadratenwet (focusverandering.html)
  function convertFilmTime(seconds, fromFilm, toFilm) {
    const fFrom = (fromFilm || "D7").toUpperCase();
    const fTo = (toFilm || "D7").toUpperCase();
    if (fFrom === fTo) return seconds;
    let d4Time = seconds;
    if (fFrom === "D5") d4Time = seconds * 1.6666;
    else if (fFrom === "D7") d4Time = seconds * 2.44;

    if (fTo === "D4") return d4Time;
    if (fTo === "D5") return d4Time / 1.6666;
    if (fTo === "D7") return d4Time / 2.44;
    return seconds;
  }

  function formatSecondenKort(totalSeconds) {
    let m = Math.floor(totalSeconds / 60);
    let s = Math.round(totalSeconds % 60);
    if (s === 60) { m++; s = 0; }
    const sStr = s < 10 ? "0" + s : s;
    if (m > 0) {
      return `${m}m ${sStr}s`;
    }
    return `${s}s`;
  }

  function formatSecondenVoluit(totalSeconds) {
    let m = Math.floor(totalSeconds / 60);
    let s = Math.round(totalSeconds % 60);
    if (s === 60) { m++; s = 0; }
    const minTxt = m === 1 ? "1 minuut" : `${m} minuten`;
    const secTxt = s === 1 ? "1 seconde" : `${s} seconden`;
    if (m > 0 && s > 0) {
      return `<strong>${m}m ${s < 10 ? "0" + s : s}s</strong> (${minTxt} en ${secTxt})`;
    } else if (m > 0) {
      return `<strong>${minTxt}</strong> (${m}m 00s)`;
    }
    return `<strong>${secTxt}</strong>`;
  }

  function berekenFocusVerandering(params, vraagTekst, chips = []) {
    let begintijdSec = params.focusBegintijdSec;
    const oorspronkelijkeBegintijdSec = begintijdSec;
    let maminMsg = "";
    let ciMsg = "";

    // 1. mA*min berekening
    if (params.maminVal && params.maVal && params.maVal > 0) {
      begintijdSec = (params.maminVal / params.maVal) * 60;
      maminMsg = `• Röntgen: ${params.maminVal} mA*min bij ${params.maVal} mA = <strong>${formatSecondenKort(begintijdSec)}</strong><br>`;
    }

    // 2. Ci wissel berekening
    if (params.oudeCi && params.nieuweCi && params.nieuweCi > 0) {
      if (begintijdSec) {
        const oudeTijdSec = begintijdSec;
        begintijdSec = oudeTijdSec * (params.oudeCi / params.nieuweCi);
        ciMsg = `• Ci wissel: van ${params.oudeCi} Ci naar ${params.nieuweCi} Ci (${formatSecondenKort(oudeTijdSec)} &rarr; <strong>${formatSecondenKort(begintijdSec)}</strong>)<br>`;
      } else {
        const ciFactor = params.oudeCi / params.nieuweCi;
        if (chips) chips.push("90 seconden", "2 minuten", "3 minuten");
        return `Bij een bronwissel van <strong>${params.oudeCi} Ci</strong> naar <strong>${params.nieuweCi} Ci</strong> is de omrekenfactor <strong>${ciFactor.toFixed(2)}x</strong> (de tijd wordt ${ciFactor >= 1 ? ((ciFactor - 1) * 100).toFixed(0) + "% langer" : ((1 - ciFactor) * 100).toFixed(0) + "% korter"}).<br><br>Wat is de <strong>oude stralingstijd</strong> (bijv. 2 minuten of 90 seconden)?<br><small style="opacity: 0.85;">(Berekend volgens <a href="focusverandering.html" class="ai-link" target="_blank">focusverandering.html</a> conform <span class="rt-math-inline"><i>t</i><sub>2</sub> = <i>t</i><sub>1</sub> &times; <span class="rt-math-frac"><span class="rt-math-num">Ci<sub>1</sub></span><span class="rt-math-den">Ci<sub>2</sub></span></span></span>).</small>`;
      }
    }

    // Oude focus defaulten op 80 cm indien alleen nieuwe focus genoemd is (zoals in focusverandering.html)
    let fOud = params.oudeFocus;
    let fNieuw = params.nieuweFocus;
    if (!fOud && fNieuw) {
      fOud = 80;
    }
    if (fOud && !fNieuw && params.sfd && Math.abs((params.sfd / 10) - fOud) > 0.5) {
      fNieuw = params.sfd / 10;
    }
    const heeftFocus = fOud && fNieuw && fOud > 0;
    if (maminMsg && fOud) {
      maminMsg = `• Röntgen buistabel (op ${fOud} cm FFD): ${params.maminVal} mA*min bij ${params.maVal} mA = <strong>${formatSecondenKort(begintijdSec)}</strong><br>`;
    }
    const heeftFilm = Boolean(params.oudeFilmType || params.nieuweFilmType);
    const heeftMateriaal = Boolean(
      (params.materiaalObj && params.materiaalObj.name !== "Koolstofstaal (Referentie)") ||
      (params.materiaalFactor && params.materiaalFactor !== 1.0)
    );
    const heeftExplicieteBronOfKv = Boolean(
      params.materiaalFactorHandmatig ||
      params.kv ||
      /\b(\d{2,3})\s*(?:kv|kilovolt|cafe)\b/i.test(vraagTekst) ||
      /\b(se[-\s]?75|selenium|ir[-\s]?192|iridium|co[-\s]?60|kobalt)\b/i.test(vraagTekst)
    );
    const toonAlleMateriaalOpties = heeftMateriaal && !heeftExplicieteBronOfKv && Boolean(params.materiaalObj && params.materiaalObj.name !== "Koolstofstaal (Referentie)");

    // Synchroniseer met focusverandering.html DOM indien geopend
    if (typeof document !== "undefined") {
      if (begintijdSec) {
        const elMin = document.getElementById("input_min");
        const elSec = document.getElementById("input_sec");
        if (elMin) elMin.value = Math.floor(begintijdSec / 60);
        if (elSec) elSec.value = Math.round(begintijdSec % 60);
      }
      if (fOud) {
        const elOud = document.getElementById("oude_focus");
        if (elOud) elOud.value = fOud;
      }
      if (fNieuw) {
        const elNieuw = document.getElementById("nieuwe_focus");
        if (elNieuw) elNieuw.value = fNieuw;
      }
      const chkFoc = document.getElementById("focus_veranderd");
      if (chkFoc) chkFoc.checked = Boolean(heeftFocus);
      const chkFilm = document.getElementById("filmtype_veranderd");
      if (chkFilm) chkFilm.checked = Boolean(heeftFilm);
      if (typeof window.bereken === "function") {
        window.bereken();
      }
    }

    // Als er nog geen begintijd bekend is
    if (!begintijdSec) {
      if (params.oudeFilmType && params.nieuweFilmType && !heeftFocus) {
        const fVan = params.oudeFilmType.toUpperCase();
        const fNaar = params.nieuweFilmType.toUpperCase();
        const factor = convertFilmTime(1000, fVan, fNaar) / 1000;
        const pct = ((factor - 1) * 100).toFixed(0);
        if (chips) chips.push("1 minuut", "2 minuten", "90 seconden");
        return `Bij een filmsoortwissel van <strong>Agfa ${fVan}</strong> naar <strong>Agfa ${fNaar}</strong> verandert de belichtingstijd met factor <strong>${factor.toFixed(2)}x</strong> (${factor >= 1 ? "+" + pct : pct}%).<br><br>Wat is de huidige <strong>begintijd</strong> (bijv. 2 minuten of 90 seconden) om de nieuwe stralingstijd direct uit te rekenen?<br><small style="opacity: 0.85;">(Berekend volgens <a href="focusverandering.html" class="ai-link" target="_blank">focusverandering.html</a>: D7 &rarr; D4 = &times;2.44, D5 &rarr; D4 = &times;1.67, D7 &rarr; D5 = &times;1.46).</small>`;
      }
      if (heeftFocus) {
        const factor = Math.pow(fNieuw / fOud, 2);
        const pct = ((factor - 1) * 100).toFixed(0);
        if (chips) chips.push("1 minuut", "2 minuten", "3 minuten", "90 seconden");
        return `Bij een focusverandering van <strong>${fOud}</strong> naar <strong>${fNieuw} cm FFD</strong> is de omrekenfactor volgens de kwadratenwet <strong>${factor.toFixed(2)}x</strong> (${factor >= 1 ? "+" + pct : pct}%).<br><br>Wat is de huidige <strong>begintijd</strong> (bijv. 2 minuten of 90 seconden) om de nieuwe tijd direct uit te rekenen?<br><small style="opacity: 0.85;">(Berekend volgens <a href="focusverandering.html" class="ai-link" target="_blank">focusverandering.html</a> conform <span class="rt-math-inline"><i>t</i><sub>2</sub> = <i>t</i><sub>1</sub> &times; (<span class="rt-math-frac"><span class="rt-math-num">FFD<sub>2</sub></span><span class="rt-math-den">FFD<sub>1</sub></span></span>)<sup>2</sup></span>).</small>`;
      }
      if (chips) chips.push("Van 80 naar 100 cm", "Van D7 naar D4", "Ci wissel", "8 mA*min op 3 mA");
      return `Om de berekening volgens <a href="focusverandering.html" class="ai-link" target="_blank">focusverandering.html</a> te maken heb ik de <strong>begintijd</strong> (in min/sec) nodig en de gewenste wijziging (FFD van &rarr; naar, filmsoort of Ci). Wat zijn je gegevens?`;
    }

    // Bereken focus factor
    let tijdNaFocus = begintijdSec;
    let focusTxt = "";
    if (heeftFocus) {
      const focusFactor = Math.pow(fNieuw / fOud, 2);
      tijdNaFocus = begintijdSec * focusFactor;
      const mmHint = params.sfd && Math.abs((params.sfd / 10) - fNieuw) < 0.5 ? ` (${params.sfd} mm uit geheugen)` : "";
      focusTxt = `• Focusverandering van <strong>${fOud} naar ${fNieuw} cm FFD${mmHint}</strong>: factor <strong>${focusFactor.toFixed(2)}x</strong> &rarr; <strong>${formatSecondenKort(tijdNaFocus)}</strong><br>`;
    }

    // Materiaalfactor
    let tijdNaMat = tijdNaFocus;
    let matTxt = "";
    let materiaalOpties = [];
    if (toonAlleMateriaalOpties) {
      const mat = params.materiaalObj;
      materiaalOpties = [
        { bron: "150 kV", factor: mat.f150 },
        { bron: "200 kV", factor: mat.f200 },
        { bron: "250 kV", factor: mat.f250 },
        { bron: "300 kV", factor: mat.f300 },
        { bron: "Se-75", factor: mat.f_se75 },
        { bron: "Ir-192", factor: mat.f_ir192 },
      ];
      matTxt = `• Materiaalomrekening naar <strong>${mat.name}</strong> (beginbron/kV niet opgegeven, zie alle 6 opties hieronder):<br>`;
    } else if (heeftMateriaal) {
      let factor = params.materiaalFactor || 1.0;
      if (params.materiaalObj && factor === 1.0) {
        if (params.bronType === "Se75" || /\bse[-\s]?75|selenium\b/i.test(vraagTekst)) factor = params.materiaalObj.f_se75;
        else if (params.bronType === "Ir192" || /\bir[-\s]?192|iridium\b/i.test(vraagTekst)) factor = params.materiaalObj.f_ir192;
        else if (params.kv === 150) factor = params.materiaalObj.f150;
        else if (params.kv === 200) factor = params.materiaalObj.f200;
        else if (params.kv === 250) factor = params.materiaalObj.f250;
        else if (params.kv === 300) factor = params.materiaalObj.f300;
      }
      tijdNaMat = tijdNaFocus * factor;
      const bronLabel = params.bronType
        ? (params.bronType === "Se75" ? "Se-75" : params.bronType === "Ir192" ? "Ir-192" : params.bronType)
        : (params.kv ? `${params.kv} kV` : "");
      matTxt = `• Materiaalfactor <strong>${factor}x</strong>${params.materiaalNaam ? ` (${params.materiaalNaam}${bronLabel ? ` bij ${bronLabel}` : ""})` : ""}: &rarr; <strong>${formatSecondenKort(tijdNaMat)}</strong><br>`;
      if (params.materiaalObj && !params.bronType && !params.kv && params.materiaalObj.f_se75 && params.materiaalObj.f_ir192 && params.materiaalObj.f_se75 !== params.materiaalObj.f_ir192) {
        const altIso = factor === params.materiaalObj.f_se75 ? "Ir-192" : "Se-75";
        const altFact = altIso === "Ir-192" ? params.materiaalObj.f_ir192 : params.materiaalObj.f_se75;
        const altTijd = tijdNaFocus * altFact;
        matTxt += `  &nbsp;&nbsp;<small style="opacity:0.8;">(Ter vergelijking bij ${altIso}: factor ${altFact}x &rarr; ≈ ${formatSecondenKort(altTijd)})</small><br>`;
      }
    }

    // Filmsoort wissel
    let filmTxt = "";
    let eindTijdSec = tijdNaMat;
    const baseFilm = (params.oudeFilmType || "D7").toUpperCase();
    let filmFactor = 1.0;

    if (params.nieuweFilmType && params.nieuweFilmType.toUpperCase() !== baseFilm) {
      const targetFilm = params.nieuweFilmType.toUpperCase();
      filmFactor = convertFilmTime(1000, baseFilm, targetFilm) / 1000;
      eindTijdSec = convertFilmTime(tijdNaMat, baseFilm, targetFilm);
      if (toonAlleMateriaalOpties) {
        filmTxt = `• Filmsoortwissel van <strong>${baseFilm} naar ${targetFilm}</strong>: factor <strong>${filmFactor.toFixed(2)}x</strong> (meegerekend in de opties hieronder)<br>`;
      } else {
        filmTxt = `• Filmsoortwissel van <strong>${baseFilm} naar ${targetFilm}</strong>: factor <strong>${filmFactor.toFixed(2)}x</strong> &rarr; <strong>${formatSecondenKort(eindTijdSec)}</strong><br>`;
      }
      const altFilm = ["D4", "D5", "D7"].find((f) => f !== baseFilm && f !== targetFilm);
      if (altFilm) {
        const altFact = convertFilmTime(1000, baseFilm, altFilm) / 1000;
        filmTxt += `  &nbsp;&nbsp;<small style="opacity:0.8;">(Ter vergelijking op ${altFilm}: factor ${altFact.toFixed(2)}x)</small><br>`;
      }
    } else if (!toonAlleMateriaalOpties && (params.oudeFilmType || /\b(filmsoort|filmtype|filmwissel)\b/i.test(vraagTekst))) {
      // Toon alternatieven voor alle andere films
      const tD4 = convertFilmTime(tijdNaMat, baseFilm, "D4");
      const tD5 = convertFilmTime(tijdNaMat, baseFilm, "D5");
      const tD7 = convertFilmTime(tijdNaMat, baseFilm, "D7");
      filmTxt = `• Tijden per filmsoort (vanaf ${baseFilm}):<br>`;
      if (baseFilm !== "D4") filmTxt += `  &nbsp;&nbsp;&bull; <strong>D4</strong>: <strong>${formatSecondenKort(tD4)}</strong><br>`;
      if (baseFilm !== "D5") filmTxt += `  &nbsp;&nbsp;&bull; <strong>D5</strong>: <strong>${formatSecondenKort(tD5)}</strong><br>`;
      if (baseFilm !== "D7") filmTxt += `  &nbsp;&nbsp;&bull; <strong>D7</strong>: <strong>${formatSecondenKort(tD7)}</strong><br>`;
    }

    if (chips) {
      if (toonAlleMateriaalOpties) {
        chips.push("Bij 200 kV", "Met Se-75", "Met Ir-192", "Naar D4", "Naar D5");
      } else {
        chips.push("Wis focusverandering", "Van 80 naar 100 cm", "Naar D4", "Naar D5");
      }
    }

    let out = `<div class="rt-ai-focus-calc" style="line-height:1.6;">`;
    if (maminMsg) out += maminMsg;
    out += `• Begintijd: <strong>${formatSecondenKort(oorspronkelijkeBegintijdSec || begintijdSec)}</strong><br>`;
    if (ciMsg) out += ciMsg;
    if (focusTxt) out += focusTxt;
    if (matTxt) out += matTxt;
    if (filmTxt) out += filmTxt;

    if (toonAlleMateriaalOpties) {
      const targetLabel = params.nieuweFilmType ? ` (op ${params.nieuweFilmType.toUpperCase()})` : "";
      out += `<div class="rt-ai-final-time" style="margin-top:10px; padding:10px 14px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.15); border-radius:8px;">`;
      out += `<div style="font-size:1.02rem; color:#F5DF4D; font-weight:800; margin-bottom:8px;">⏱️ Stralingstijd voor ${params.materiaalObj.name}${targetLabel} per bron / spanning:</div>`;
      out += `<table style="width:100%; border-collapse:collapse; font-size:0.95rem;"><tbody>`;
      for (const opt of materiaalOpties) {
        const optTijd = tijdNaFocus * opt.factor * filmFactor;
        const isGamma = opt.bron === "Se-75" || opt.bron === "Ir-192" || opt.bron === "Co-60";
        const icoon = isGamma ? "☢️" : "⚡";
        out += `<tr style="border-bottom:1px solid rgba(255,255,255,0.08);">`;
        out += `<td style="padding:5px 6px;">${icoon} <strong>${opt.bron}</strong> <span style="opacity:0.8; font-size:0.85rem;">(factor ${opt.factor.toFixed(2)}x)</span>:</td>`;
        out += `<td style="padding:5px 6px; text-align:right; font-weight:700; color:#F5DF4D;">${formatSecondenVoluit(optTijd)}</td>`;
        out += `</tr>`;
      }
      out += `</tbody></table>`;
      out += `</div>`;
    } else {
      out += `<div class="rt-ai-final-time" style="margin-top:8px; font-size:1.15rem; color:#F5DF4D; font-weight:800;">`;
      out += `Uiteindelijke stralingstijd: ${formatSecondenVoluit(eindTijdSec)}`;
      out += `</div>`;
    }

    if (typeof actiefGespreksGeheugen !== "undefined" && actiefGespreksGeheugen && !isNaN(eindTijdSec) && eindTijdSec > 0) {
      actiefGespreksGeheugen.focusBegintijdSec = Math.round(eindTijdSec);
      actiefGespreksGeheugen.laatsteStralingstijdSec = Math.round(eindTijdSec);
    }
    out += `<small style="opacity: 0.85; display:block; margin-top:6px;">(Berekend volgens <a href="focusverandering.html" class="ai-link" target="_blank">focusverandering.html</a> conform kwadratenwet & filmfactoren).</small>`;
    out += `</div>`;

    return out;
  }

  // 9b. Materiaalfactoren Info (conform stralingstijd.html en focusverandering.html)
  function geefMateriaalInfo(params, vraagTekst, chips) {
    const lowerVraag = (vraagTekst || "").toLowerCase();
    // Als er zowel naar RVS als Duplex gevraagd wordt in een omrekenvraag (Q66):
    if (/\brvs\b/i.test(lowerVraag) && /\bduplex\b/i.test(lowerVraag)) {
      const matRvs = zoekMateriaal("RVS 316") || zoekMateriaal("RVS 304");
      const matDup = zoekMateriaal("Duplex 2205");
      if (matRvs && matDup) {
        return `Om de belichtingstijd om te rekenen van <strong>koolstofstaal (referentie = 1.00x)</strong> naar <strong>RVS</strong> of <strong>Duplex</strong>, vermenigvuldig je de staaltijd met de <strong>materiaalfactor</strong> voor jouw bron of buisspanning:<br><br>` +
               `• <strong>${matRvs.name}:</strong> Se-75: <strong>${matRvs.f_se75.toFixed(2)}x</strong> | Ir-192: <strong>${matRvs.f_ir192.toFixed(2)}x</strong> | Röntgen (150&ndash;300 kV): <strong>${matRvs.f150.toFixed(2)}x &ndash; ${matRvs.f300.toFixed(2)}x</strong><br>` +
               `• <strong>${matDup.name}:</strong> Se-75: <strong>${matDup.f_se75.toFixed(2)}x</strong> | Ir-192: <strong>${matDup.f_ir192.toFixed(2)}x</strong> | Röntgen (150&ndash;300 kV): <strong>${matDup.f150.toFixed(2)}x &ndash; ${matDup.f300.toFixed(2)}x</strong><br><br>` +
               `<small style="opacity:0.85;">(Geef je begintijd op of gebruik <a href="focusverandering.html" class="ai-link" target="_blank">focusverandering.html</a> / <a href="stralingstijd.html" class="ai-link" target="_blank">stralingstijd.html</a>).</small>`;
      }
    }

    let matNaam = params.materiaalNaam || (typeof actiefGespreksGeheugen !== "undefined" && actiefGespreksGeheugen && actiefGespreksGeheugen.materiaalNaam);
    if (!matNaam) {
      const matGevonden = zoekMateriaalInTekst(vraagTekst);
      if (matGevonden) {
        matNaam = matGevonden.name;
        if (typeof actiefGespreksGeheugen !== "undefined" && actiefGespreksGeheugen) {
          actiefGespreksGeheugen.materiaalNaam = matGevonden.name;
        }
      }
    }

    if (!matNaam) {
      if (chips) {
        chips.push("Hastelloy C-276", "Inconel 625", "Titanium", "RVS 316", "Monel 400", "Koper");
      }
      return `Van welk <strong>materiaal</strong> wil je de factor weten? Je kunt kiezen uit alle 89 materialen volgens <a href="stralingstijd.html" class="ai-link" target="_blank">stralingstijd.html</a> en <a href="focusverandering.html" class="ai-link" target="_blank">focusverandering.html</a>.`;
    }

    const mat = zoekMateriaal(matNaam);
    if (!mat) {
      return `Materiaal <strong>${matNaam}</strong> staat niet in de standaard database (zie <a href="stralingstijd.html" class="ai-link" target="_blank">stralingstijd.html</a>).`;
    }

    if (chips) {
      chips.push(`Stralingstijd met ${mat.name}`, "Bereken met Se-75", "Bereken met Ir-192", "Wanddikte opgeven");
    }

    const werkStr = mat.werkstoff ? ` [${mat.werkstoff}]` : "";
    const noteStr = mat.notes ? `<br><small style="opacity:0.8;">Samenstelling / opmerking: ${mat.notes}</small>` : "";
    const densStr = mat.density ? ` &bull; Dichtheid: <strong>${mat.density} g/cm³</strong>` : "";
    const bkiInfo = geefBkiMateriaalgroepInfo(mat.name);
    const bkiStr = bkiInfo ? `<br>• <strong>Vereist BKI type:</strong> <strong>${bkiInfo.bkiType}</strong> <small style="opacity:0.85;">(${bkiInfo.omschrijving})</small>` : "";

    let specifiekeFocus = "";
    if (lowerVraag.includes("300 kv") || lowerVraag.includes("300kv") || lowerVraag.includes("300 cafe")) {
      specifiekeFocus = `<div style="font-size:1.1rem; color:#F5DF4D; margin-bottom:8px;">Factor voor ${mat.name} bij 300 kV: <strong>${mat.f300.toFixed(2)}x</strong></div>`;
    } else if (lowerVraag.includes("250 kv") || lowerVraag.includes("250kv")) {
      specifiekeFocus = `<div style="font-size:1.1rem; color:#F5DF4D; margin-bottom:8px;">Factor voor ${mat.name} bij 250 kV: <strong>${mat.f250.toFixed(2)}x</strong></div>`;
    } else if (lowerVraag.includes("200 kv") || lowerVraag.includes("200kv")) {
      specifiekeFocus = `<div style="font-size:1.1rem; color:#F5DF4D; margin-bottom:8px;">Factor voor ${mat.name} bij 200 kV: <strong>${mat.f200.toFixed(2)}x</strong></div>`;
    } else if (lowerVraag.includes("150 kv") || lowerVraag.includes("150kv")) {
      specifiekeFocus = `<div style="font-size:1.1rem; color:#F5DF4D; margin-bottom:8px;">Factor voor ${mat.name} bij 150 kV: <strong>${mat.f150.toFixed(2)}x</strong></div>`;
    } else if (lowerVraag.includes("se-75") || lowerVraag.includes("selenium")) {
      specifiekeFocus = `<div style="font-size:1.1rem; color:#F5DF4D; margin-bottom:8px;">Factor voor ${mat.name} bij Se-75: <strong>${mat.f_se75.toFixed(2)}x</strong></div>`;
    } else if (lowerVraag.includes("ir-192") || lowerVraag.includes("iridium")) {
      specifiekeFocus = `<div style="font-size:1.1rem; color:#F5DF4D; margin-bottom:8px;">Factor voor ${mat.name} bij Ir-192: <strong>${mat.f_ir192.toFixed(2)}x</strong></div>`;
    }

    return `${specifiekeFocus}Materiaalfactoren voor <strong>${mat.name}</strong>${werkStr} (${mat.groep})${densStr}:<br>` +
      `• <strong>Gamma Se-75:</strong> factor <strong>${mat.f_se75.toFixed(2)}x</strong><br>` +
      `• <strong>Gamma Ir-192:</strong> factor <strong>${mat.f_ir192.toFixed(2)}x</strong><br>` +
      `• <strong>Röntgen / X-ray:</strong> 150 kV: <strong>${mat.f150.toFixed(2)}x</strong> | 200 kV: <strong>${mat.f200.toFixed(2)}x</strong> | 250 kV: <strong>${mat.f250.toFixed(2)}x</strong> | 300 kV: <strong>${mat.f300.toFixed(2)}x</strong>${bkiStr}${noteStr}<br>` +
      `<small style="opacity:0.85;">(Exact conform <a href="stralingstijd.html" class="ai-link" target="_blank">stralingstijd.html</a> en <a href="focusverandering.html" class="ai-link" target="_blank">focusverandering.html</a>).</small>`;
  }

  // 9c. BKI Materiaalgroepen (conform ISO 19232-1 & ASTM E747)
  function geefBkiMateriaalgroepInfo(materiaalNaam) {
    if (!materiaalNaam) return null;
    const nameLower = (materiaalNaam || "").toLowerCase();

    // 1. Titanium (ISO 19232-1 TI, ASTM 01) — voorkom false positives op RVS 316Ti en Tinbrons!
    if (
      (nameLower.includes("tita") || /\bti(?:[-\s]?\d|6al4v)?\b/i.test(nameLower)) &&
      !nameLower.includes("316ti") &&
      !nameLower.includes("321") &&
      !nameLower.includes("brons") &&
      !nameLower.includes("rvs") &&
      !nameLower.includes("staal")
    ) {
      return {
        isoGroup: "TI",
        astmGroup: "01",
        bkiType: "TI EN",
        omschrijving: "Titanium en titaniumlegeringen (ISO 19232-1 groep TI, ASTM E747 groep 01)",
      };
    }

    // 2. Aluminium (ISO 19232-1 AL, ASTM 02)
    if (nameLower.includes("alum") && !nameLower.includes("brons")) {
      return {
        isoGroup: "AL",
        astmGroup: "02",
        bkiType: "AL EN",
        omschrijving: "Aluminium en aluminiumlegeringen (ISO 19232-1 groep AL, ASTM E747 groep 02)",
      };
    }

    // 3. Aluminiumbrons & Nikkel-Aluminiumbrons (ISO 19232-1 FE, ASTM 2)
    if (nameLower.includes("aluminiumbrons") || nameLower.includes("nikkel-aluminium")) {
      return {
        isoGroup: "FE",
        astmGroup: "2",
        bkiType: "FE EN",
        omschrijving: "Aluminiumbrons en Ni-Al-brons (ISO 19232-1 groep FE, ASTM E747 groep 2)",
      };
    }

    // 4. Inconel / Hastelloy / Ni-Cr-Fe & 18% Ni-maraging (ISO 19232-1 FE, ASTM 3)
    if (
      nameLower.includes("inconel") ||
      nameLower.includes("hastelloy") ||
      nameLower.includes("nimonic") ||
      nameLower.includes("maraging") ||
      nameLower.includes("ni-cr-fe")
    ) {
      return {
        isoGroup: "FE",
        astmGroup: "3",
        bkiType: "FE EN",
        omschrijving: "Ni-Cr-Fe legeringen (Inconel, Hastelloy) (ISO 19232-1 groep FE, ASTM E747 groep 3 — let op: ISO kent géén 'NI' BKI; deze legeringen vallen onder FE)",
      };
    }

    // 5. Monel (Ni-Cu), Zuiver Nikkel, Cu-Ni, Messing (ISO 19232-1 CU, ASTM 4)
    if (
      nameLower.includes("monel") ||
      nameLower.includes("cupro") ||
      nameLower.includes("koper") ||
      nameLower.includes("messing") ||
      nameLower.includes("geelkoper") ||
      nameLower.includes("nikkel 200") ||
      nameLower.includes("nikkel 201") ||
      nameLower.includes("zuiver nikkel") ||
      nameLower.includes("cu-ni")
    ) {
      return {
        isoGroup: "CU",
        astmGroup: "4",
        bkiType: "CU EN",
        omschrijving: "Koper, Monel (Ni-Cu), Messing en Zuiver Nikkel (ISO 19232-1 groep CU, ASTM E747 groep 4 — let op: ISO kent géén 'NI' BKI; Monel en Nikkel vallen onder CU)",
      };
    }

    // 6. Tinbrons, Roodbrons, Loodbrons (ISO 19232-1 CU, ASTM 5)
    if (
      nameLower.includes("tinbrons") ||
      nameLower.includes("fosforbrons") ||
      nameLower.includes("roodbrons") ||
      nameLower.includes("rg7") ||
      nameLower.includes("brons")
    ) {
      return {
        isoGroup: "CU",
        astmGroup: "5",
        bkiType: "CU EN",
        omschrijving: "Tinbrons en Roodbrons (ISO 19232-1 groep CU, ASTM E747 groep 5)",
      };
    }

    // 7. Koolstofstaal / RVS / Duplex / Ketelstaal (ISO 19232-1 FE, ASTM 1)
    return {
      isoGroup: "FE",
      astmGroup: "1",
      bkiType: "FE EN",
      omschrijving: "Koolstofstaal en RVS (ISO 19232-1 groep FE, ASTM E747 groep 1)",
    };
  }

  function geefBkiSetsVoorDraad(wireNum, matGroup = "FE") {
    const num = parseInt(wireNum, 10);
    if (isNaN(num)) return `10 ${matGroup} EN of 13 ${matGroup} EN`;
    const sets = [];
    if (num >= 1 && num <= 7) sets.push(`1 ${matGroup} EN`);
    if (num >= 6 && num <= 12) sets.push(`6 ${matGroup} EN`);
    if (num >= 10 && num <= 16) sets.push(`10 ${matGroup} EN`);
    if (num >= 13 && num <= 19) sets.push(`13 ${matGroup} EN`);
    return sets.length > 0 ? sets.join(" of ") : `10 ${matGroup} EN`;
  }

  function geefAsmeSetVoorDraad(asmeNum) {
    const num = parseInt(asmeNum, 10);
    if (isNaN(num)) return "";
    const sets = [];
    if (num >= 1 && num <= 6) sets.push("Set A");
    if (num >= 6 && num <= 11) sets.push("Set B");
    if (num >= 11 && num <= 16) sets.push("Set C");
    if (num >= 16 && num <= 21) sets.push("Set D");
    return sets.join(" of ");
  }

  // 10. Opstellingen, Synoniemen & Groeperingen Info
  function geefOpstellingEnGroeperingInfo(paramsOrText, vraagTekst, chips = []) {
    let params = null;
    let text = "";
    if (typeof paramsOrText === "string") {
      text = paramsOrText;
    } else {
      params = paramsOrText;
      text = vraagTekst || "";
    }
    const lower = (text || "").toLowerCase();
    const De = params ? params.diameter : null;
    const diaLabel = De ? formatMmNaarDuimLabel(De) : "";

    // 0a. Vergelijkingsvragen (bijv. Q7: opstelling 13 vs 14, Q8: opstelling 11 vs 12)
    if (/\bopstelling\s*13\b/i.test(lower) && /\b(opstelling\s*)?14\b/i.test(lower)) {
      return `<strong>Verschil tussen Opstelling 13 en Opstelling 14 (beide Groepering DWSI / ASME E):</strong><br><br>` +
             `• <strong>Opstelling 13 / E (X-ray):</strong> Gebruik je bij dubbelwandig enkelbeeld (DWSI) met een <strong>röntgenbuis</strong> (bron buiten de leiding, film aan de overzijde).<br>` +
             `• <strong>Opstelling 14 / E (Gamma):</strong> Gebruik je bij dubbelwandig enkelbeeld (DWSI) met een <strong>gammabron (Se-75 of Ir-192)</strong> (bron buiten de leiding, film aan de overzijde).`;
    }
    if (/\bopstelling\s*11\b/i.test(lower) && /\b(opstelling\s*)?12\b/i.test(lower)) {
      return `<strong>Verschil tussen Opstelling 11 (ASME F) en Opstelling 12 (ASME G) &ndash; Groepering DWDI:</strong><br><br>` +
             `• <strong>Opstelling 11 / F (Ovaaltje met verzet):</strong> De bron staat onder een hoek (met verzet) zodat boven- en onderlas als een ellips (ovaal) vrij van elkaar op de film komen. Vereist <strong>2 opnames onder 90°</strong>. Alleen toegestaan bij diameter <strong>&le; 100 mm</strong>, wanddikte <strong>&le; 8 mm</strong> en lasbreedte <strong>&le; De / 4</strong>.<br>` +
             `• <strong>Opstelling 12 / G (Superpositie):</strong> De bron staat loodrecht door het midden van de las (zonder verzet), waardoor boven- en onderlas over elkaar heen vallen. Vereist <strong>3 opnames onder 60° of 120°</strong>. Wordt gebruikt bij diameter &le; 100 mm als de wanddikte &gt; 8 mm is of als een ovaalbeeld geometrisch niet mogelijk is.`;
    }

    // 0b. Specifieke vragen over benaming opstelling 11 (Q11), panoramisch/centraal zonder diameter (Q9), of SWSI op pijp (Q10 & Q100)
    if (/\bhoe\s+heet\s+opstelling\s*11\b/i.test(lower)) {
      return `<strong>Opstelling 11</strong> (EN ISO 17636-1) heet in de praktijk ook wel <strong>ovaaltjes schieten</strong> (DWDI: dubbelwand dubbelbeeld met verzet) en heet volgens <strong>ASME: Opstelling F</strong>.<br>` +
             `• Aantal opnames: <strong>2 opnames onder 90°</strong> (toegestaan bij diameter &le; 100 mm, wanddikte &le; 8 mm en lasbreedte &le; De / 4).`;
    }
    if (/\b(panoram|panoramisch|centraal|centrale\s+opstelling|rondstraler|rondstralen)\b/i.test(lower) && !De) {
      return `<strong>Panoramisch / Centraal stralen &ndash; Opstelling 5 (ASME A, Groepering SWSI):</strong><br><br>` +
             `Bij panoramisch (centraal) stralen wordt de bron of rondstraler exact in het <strong>middelpunt aan de binnenzijde</strong> van de buis of cilinder geplaatst, met de films rondom aan de buitenzijde op de las.<br>` +
             `• <strong>Voordeel:</strong> De volledige 360° omtrekslas (CW) wordt in <strong>1 enkele opname</strong> enkelwandig (SWSI) belicht.<br>` +
             `• <strong>Focusafstand (FFD):</strong> Gelijk aan de halve buitendiameter (<span class="rt-math-inline"><i>D</i><sub>e</sub> / 2</span>). In EN ISO 17636-1 mag bij opstelling 5 een halveringsfactor van 0.5 op de minimale bron-objectafstand worden toegepast.`;
    }
    if (/\bverschil\b/i.test(lower) && /\b(klasse\s*a|en-a)\b/i.test(lower) && /\b(klasse\s*b|en-b)\b/i.test(lower)) {
      return `<strong>Verschil tussen EN ISO 17636-1 Klasse A en Klasse B:</strong><br><br>` +
             `• <strong>Klasse A (Standaard onderzoekstechniek):</strong><br>` +
             `&nbsp;&nbsp;&bull; Minimale zwarting: <strong>&ge; 2.0</strong><br>` +
             `&nbsp;&nbsp;&bull; Minimale FFD-factor: <span class="rt-math-inline"><i>f</i><sub>min</sub> = 7.5 &times; <i>b</i> &times; <i>d</i><sup>2/3</sup></span> (kortere FFD toegestaan)<br>` +
             `&nbsp;&nbsp;&bull; Filmkwaliteit: <strong>D7 (C5)</strong> of fijner toegestaan<br>` +
             `&nbsp;&nbsp;&bull; Diktetolerantie bij rondnaden (DWSI): max. <strong>20%</strong> (<span class="rt-math-inline"><i>L</i> / <i>L'</i> &le; 1.2</span>, dus minder opnames nodig)<br><br>` +
             `• <strong>Klasse B (Verbeterde / verhoogde gevoeligheid):</strong><br>` +
             `&nbsp;&nbsp;&bull; Minimale zwarting: <strong>&ge; 2.3</strong> (of &ge; 3.0 op D4 bij Se-75 compensatie)<br>` +
             `&nbsp;&nbsp;&bull; Minimale FFD-factor: <span class="rt-math-inline"><i>f</i><sub>min</sub> = 15 &times; <i>b</i> &times; <i>d</i><sup>2/3</sup></span> (strengere <i>U</i><sub>g</sub>-eis)<br>` +
             `&nbsp;&nbsp;&bull; Filmkwaliteit: minimaal <strong>D5 (C4) of D4 (C3)</strong> vereist (D7 niet toegestaan)<br>` +
             `&nbsp;&nbsp;&bull; Diktetolerantie bij rondnaden (DWSI): max. <strong>10%</strong> (<span class="rt-math-inline"><i>L</i> / <i>L'</i> &le; 1.1</span>, dus meer opnames nodig) en 1 draadje strengere BKI-eis.`;
    }
    if (/\bswsi\b/i.test(lower) && (/\b(pijp|buis|leiding|rondnaad)\b/i.test(lower) || De)) {
      const diaTekst = De ? ` op een <strong>${diaLabel}</strong>` : " op een pijp/buis";
      return `<strong>SWSI (Single Wall Single Image / Enkelwand Enkelbeeld)${diaTekst}:</strong><br><br>` +
             `Afhankelijk van waar de bron en de film worden geplaatst, kent EN ISO 17636-1 / ASME drie SWSI-opstellingen voor buizen:<br>` +
             `• <strong>Opstelling 2 / C:</strong> Bron aan de buitenzijde, film aan de binnenzijde op de las.<br>` +
             `• <strong>Opstelling 5 / A (Centraal / Panoramisch):</strong> Bron exact in het midden binnenin de buis, films buitenom (1 opname 360°).<br>` +
             `• <strong>Opstelling 8 / B (Excentrisch):</strong> Bron binnenin tegen de overliggende buiswand, film aan de buitenzijde.`;
    }

    // 0c. Concreet advies bij een specifieke diameter, leiding of plaat
    const vraagtSpecifiekeOpstelling =
      /\b(welke\s+(?:opstelling|techniek)|volgens\s+welke\s+opstelling|op\s+welke\s+manier\s+schiet\s+ik|hoe\s+(?:moet|kan|schiet)\s+ik.*(?:schieten|opnemen|stralen|pijp|buis|duimer|rond)|welke\s+opstelling\s+moet\s+ik|welke\s+opstelling\s+(?:voor|bij|gebruik|aanhouden))\b/i.test(lower) ||
      (De && /\b(welke\s+opstelling|opstelling|welke\s+techniek)\b/i.test(lower) && !/\b(wat\s+is|uitleg|synoniem|overzicht\s+van)\b/i.test(lower));

    if (De && vraagtSpecifiekeOpstelling) {
      // Ambiguïteit bij "rond X mm" (Q12): zowel diameter als omtrek toelichten en verduidelijking vragen!
      if (params && params.isRondAmbigu) {
        const diaAlsOmtrek = Number((De / Math.PI).toFixed(1));
        return `Met <strong>"rond ${De} mm"</strong> wordt in de praktijk meestal een <strong>buitendiameter van &empty; ${De} mm (${diaLabel})</strong> bedoeld, maar soms ook een <strong>omtrek van ${De} mm</strong>:<br><br>` +
               `1. <strong>Indien buitendiameter &empty; ${De} mm (${diaLabel}, &gt; 100 mm):</strong><br>` +
               `• Voorgeschreven techniek van buitenaf: <strong>DWSI (Opstelling 13 / E voor X-ray of Opstelling 14 / E voor gamma)</strong>.<br><br>` +
               `2. <strong>Indien omtrek ${De} mm (buitendiameter &empty; ${diaAlsOmtrek} mm, &le; 100 mm):</strong><br>` +
               `• Voorgeschreven techniek: <strong>DWDI (Opstelling 11 / F ovaaltje of Opstelling 12 / G superpositie)</strong>.<br><br>` +
               `Bedoel je met <em>rond ${De} mm</em> de <strong>diameter (&empty; ${De} mm)</strong> of de <strong>omtrek</strong>?`;
      }

      if (De <= 100) {
        if (typeof actiefGespreksGeheugen !== "undefined" && actiefGespreksGeheugen) {
          actiefGespreksGeheugen.technique = "DWDI";
          actiefGespreksGeheugen.openVraag = {
            type: "controleer_ovaaltjes",
            diameter: De,
            diaLabel: diaLabel
          };
        }
        if (chips) {
          chips.push("Controleer ovaaltjes", "2 opnames ovaal", "3 opnames superpositie", "Minimale FFD", "BKI draadje");
        }

        if (params.wanddikte) {
          const t = params.wanddikte;
          if (t <= 8) {
            return `Voor een <strong>${diaLabel}</strong> van <strong>${t} mm dik</strong> (diameter &le; 100 mm) moet volgens EN ISO 17636-1 / ASME de techniek <strong>DWDI</strong> (Double Wall Double Image / dubbelwand dubbelbeeld) worden toegepast:<br><br>` +
                   `• <strong>Opstelling 11 / F (ovaaltje met verzet):</strong> Toegestaan! Wanddikte is ${t} mm (&le; 8 mm). Vereist <strong>2 opnames onder 90°</strong> (mits lasbreedte &le; ${(De / 4).toFixed(1)} mm).<br>` +
                   `• <strong>Opstelling 12 / G (superpositie):</strong> Als alternatief: <strong>3 opnames onder 60° of 120°</strong> loodrecht door de las (zonder verzet).`;
          } else {
            return `Voor een <strong>${diaLabel}</strong> van <strong>${t} mm dik</strong> is een ovaalbeeld (opstelling 11 / F) <strong>niet toegestaan</strong> omdat de wanddikte meer dan 8 mm is.<br><br>` +
                   `• De voorgeschreven techniek is <strong>Opstelling 12 / G (DWDI superpositie)</strong>: <strong>3 opnames onder 60° of 120°</strong> loodrecht door de las (zonder verzet).`;
          }
        }

        return `Een <strong>${diaLabel}</strong> (buitendiameter &le; 100 mm) moet volgens EN ISO 17636-1 / ASME onderzocht worden volgens <strong>DWDI</strong> (Double Wall Double Image / dubbelwand dubbelbeeld):<br><br>` +
               `1. <strong>Opstelling 11 / F (DWDI ovaaltje met verzet):</strong><br>` +
               `• <strong>2 opnames onder 90°</strong> met bundelverzet.<br>` +
               `• <em>Normvoorwaarde:</em> Toegestaan mits wanddikte <strong>&le; 8 mm</strong> en lasbreedte <strong>&le; ${(De / 4).toFixed(1)} mm</strong> (De / 4).<br><br>` +
               `2. <strong>Opstelling 12 / G (DWDI superpositie):</strong><br>` +
               `• <strong>3 opnames onder 60° of 120°</strong> loodrecht door de las (zonder verzet).<br>` +
               `• Toe te passen als de wanddikte &gt; 8 mm is, de las te breed is, of als ovaalbeeld geometrisch niet mogelijk is.<br><br>` +
               `Moet ik controleren of ovaaltjes (opstelling 11 / F) mogelijk zijn voor jouw wanddikte?`;
      } else {
        // De > 100 mm
        if (typeof actiefGespreksGeheugen !== "undefined" && actiefGespreksGeheugen) {
          actiefGespreksGeheugen.technique = "DWSI";
          actiefGespreksGeheugen.openVraag = {
            type: "bevestig_dwsi_opnames",
            diameter: De,
            diaLabel: diaLabel
          };
        }
        if (chips) {
          chips.push("Reken DWSI opnames uit", "Minimale FFD", "BKI draadje", "Afzetting");
        }
        return `Een <strong>${diaLabel}</strong> (buitendiameter &gt; 100 mm) mag volgens EN ISO 17636-1 niet meer via DWDI worden onderzocht. De voorgeschreven techniek van buitenaf is <strong>DWSI</strong> (Double Wall Single Image / dubbelwand enkelbeeld):<br><br>` +
               `• <strong>Opstelling 13 / E:</strong> bij doorstraling met een <strong>röntgenbuis (X-ray)</strong> (bron buiten, film aan overzijde).<br>` +
               `• <strong>Opstelling 14 / E:</strong> bij doorstraling met een <strong>gammabron (Se-75 / Ir-192)</strong> (bron buiten, film aan overzijde).<br>` +
               `<em>(Optioneel bij toegang van binnenuit: <strong>Opstelling 5 / A</strong> panoramisch/centraal met 1 opname 360°, of <strong>Opstelling 8 / B</strong> excentrisch).</em><br><br>` +
               `Wil je dat ik het benodigd aantal opnames uitreken volgens DWSI?`;
      }
    }

    if (params && params.isPlaat && vraagtSpecifiekeOpstelling) {
      if (chips) chips.push("BKI draadje", "Minimale FFD", "Stralingstijd");
      return `Voor een <strong>vlakke plaat / plaatlas</strong> wordt volgens EN ISO 17636-1 / ASME <strong>Opstelling 1 (SWSI - Single Wall Single Image / EWEB)</strong> toegepast. De bron staat aan de voorzijde loodrecht op de las en de film aan de achterzijde.`;
    }

    // Als er gevraagd wordt naar welke opstelling, maar er is nog geen diameter bekend
    if (vraagtSpecifiekeOpstelling && !De && (!params || !params.isPlaat)) {
      if (chips) chips.push("2 duimer", "3 duimer", "4 duimer", "6 duimer", "Vlakke plaat");
      if (typeof actiefGespreksGeheugen !== "undefined" && actiefGespreksGeheugen) {
        actiefGespreksGeheugen.verwachtParameter = "diameter";
      }
      return `Om de juiste opstelling volgens de norm (EN ISO 17636-1 / ASME) aan te geven: wat is de <strong>diameter</strong> van de leiding (bijv. 2 duimer, 3 duimer, 4 duimer) of gaat het om een vlakke plaat?`;
    }

    // 1. Vraag over groepering DWDI
    if (
      /\b(groepering\s*dwdi|groep\s*dwdi|dwdi\s*groepering|dwdb)\b/i.test(lower) ||
      (/\b(opstellingen?|onder|valt|vallen|behoort|groep|groepering)\b/i.test(lower) && /\bdwdi\b/i.test(lower))
    ) {
      return (
        "<strong>Groepering DWDI (Dubbel Wand Dubbel Beeld / DWDB):</strong><br>" +
        "• <strong>Opstelling 11 / F:</strong> Ovaaltje (opnames met verzet). 2 opnames onder 90° (bij diameter &le; 100 mm).<br>" +
        "• <strong>Opstelling 12 / G:</strong> Superpositie (loodrecht door de las, zonder verzet). 3 opnames onder 60° of 120°.<br>" +
        "<small style='opacity:0.85;'>Synoniemen: DWDI, Dubbel Wand Dubbel Beeld, DWDB.</small>"
      );
    }

    // 2. Vraag over groepering SWSI
    if (
      /\b(groepering\s*swsi|groep\s*swsi|swsi\s*groepering|eweb)\b/i.test(lower) ||
      (/\b(opstellingen?|onder|valt|vallen|behoort|groep|groepering)\b/i.test(lower) && /\bswsi\b/i.test(lower))
    ) {
      return (
        "<strong>Groepering SWSI (Single Wall Single Image / EWEB):</strong><br>" +
        "• <strong>Opstelling 1:</strong> Vlakke plaat / plaatlassen.<br>" +
        "• <strong>Opstelling 2 / C:</strong> Buisverbindingen (contact SWSI: bron buiten, film binnenin).<br>" +
        "• <strong>Opstelling 5 / A:</strong> Centraal / Centrale opstelling (panoramisch, 1 opname 360° van binnenuit).<br>" +
        "• <strong>Opstelling 8 / B:</strong> Excentrisch / Excentrische opstelling (bron binnenin tegen de wand, film buiten).<br>" +
        "<small style='opacity:0.85;'>Synoniemen: SWSI, Single Wall Single Image, EWEB, Enkel Wand Enkel Beeld.</small>"
      );
    }

    // 3. Vraag over groepering DWSI
    if (
      /\b(groepering\s*dwsi|groep\s*dwsi|dwsi\s*groepering|dweb)\b/i.test(lower) ||
      (/\b(opstellingen?|onder|valt|vallen|behoort|groep|groepering)\b/i.test(lower) && /\bdwsi\b/i.test(lower))
    ) {
      return (
        "<strong>Groepering DWSI (Dubbel Wand Enkel Beeld / DWEB):</strong><br>" +
        "• <strong>Opstelling 13 / E (X-ray):</strong> Dubbelwand enkelbeeld met röntgenbuis (bron buiten, film aan overzijde).<br>" +
        "• <strong>Opstelling 14 / E (gamma):</strong> Dubbelwand enkelbeeld met radioactieve bron (Se-75 / Ir-192).<br>" +
        "• <strong>Opstelling 15:</strong> Dubbelwand enkelbeeld voor dikwandige pijpen of meervoudige wanden.<br>" +
        "<small style='opacity:0.85;'>Synoniemen: DWSI, Dubbel Wand Enkel Beeld, DWEB.</small>"
      );
    }

    // 4. Specifieke opstellingen
    if (/\b(opstelling\s*(?:11\s*[\/-]?\s*f|11\b|f\b)|ovaal|ovaaltje)\b/i.test(lower)) {
      const o = OPSTELLINGEN_NDO["11"];
      return `<strong>${o.titel}</strong> (Groepering: <strong>${o.groep}</strong>):<br>${o.beschrijving}<br>• Aantal opnames: <strong>2 opnames onder 90°</strong> met verzet.`;
    }
    if (/\b(opstelling\s*(?:12\s*[\/-]?\s*g|12\b|g\b)|superpositie)\b/i.test(lower)) {
      const o = OPSTELLINGEN_NDO["12"];
      return `<strong>${o.titel}</strong> (Groepering: <strong>${o.groep}</strong>):<br>${o.beschrijving}<br>• Aantal opnames: <strong>3 opnames onder 60° of 120°</strong> loodrecht door de las.`;
    }
    if (/\b(opstelling\s*(?:5\s*[\/-]?\s*a|5\b|a\b)|centraal|centrale\s+opstelling)\b/i.test(lower)) {
      const o = OPSTELLINGEN_NDO["5"];
      return `<strong>${o.titel}</strong> (Groepering: <strong>${o.groep}</strong>):<br>${o.beschrijving}<br>• Aantal opnames: <strong>1 opname (360° panoramisch)</strong>.`;
    }
    if (/\b(opstelling\s*(?:8\s*[\/-]?\s*b|8\b|b\b)|excentrisch|excentrische\s+opstelling)\b/i.test(lower)) {
      const o = OPSTELLINGEN_NDO["8"];
      return `<strong>${o.titel}</strong> (Groepering: <strong>${o.groep}</strong>):<br>${o.beschrijving}`;
    }
    if (/\b(opstelling\s*(?:2\s*[\/-]?\s*c|2\b|c\b))\b/i.test(lower)) {
      const o = OPSTELLINGEN_NDO["2"];
      return `<strong>${o.titel}</strong> (Groepering: <strong>${o.groep}</strong>):<br>${o.beschrijving}`;
    }
    if (/\b(opstelling\s*1\b)\b/i.test(lower)) {
      const o = OPSTELLINGEN_NDO["1"];
      return `<strong>${o.titel}</strong> (Groepering: <strong>${o.groep}</strong>):<br>${o.beschrijving}`;
    }
    if (/\b(opstelling\s*(?:13\s*[\/-]?\s*e|13\b))\b/i.test(lower)) {
      const o = OPSTELLINGEN_NDO["13"];
      return `<strong>${o.titel}</strong> (Groepering: <strong>${o.groep}</strong>):<br>${o.beschrijving}`;
    }
    if (/\b(opstelling\s*(?:14\s*[\/-]?\s*e|14\b))\b/i.test(lower)) {
      const o = OPSTELLINGEN_NDO["14"];
      return `<strong>${o.titel}</strong> (Groepering: <strong>${o.groep}</strong>):<br>${o.beschrijving}`;
    }
    if (/\b(opstelling\s*15)\b/i.test(lower)) {
      const o = OPSTELLINGEN_NDO["15"];
      return `<strong>${o.titel}</strong> (Groepering: <strong>${o.groep}</strong>):<br>${o.beschrijving}`;
    }

    // 5. Naden synoniemen (CW / LW)
    if (/\b(cw|rondnaad)\b/i.test(lower) && /\b(synoniem|beteken|wat\s+is)\b/i.test(lower)) {
      return "<strong>CW:</strong> Circumferential Weld = <strong>Rondnaad</strong> (omtrekslas van een leiding of ketel).";
    }
    if (/\b(lw|langsnaad)\b/i.test(lower) && /\b(synoniem|beteken|wat\s+is)\b/i.test(lower)) {
      return "<strong>LW:</strong> Longitudinal Weld = <strong>Langsnaad</strong> (lengtelas in de lengterichting van de pijp).";
    }

    // 6. Bronnen synoniemen
    if (/\b(de\s+buis|rontgenbuis|x-ray)\b/i.test(lower) && /\b(synoniem|beteken|wat\s+is)\b/i.test(lower)) {
      return "<strong>Röntgenbuis:</strong> Synoniemen zijn <em>X-ray buis</em>, <em>de buis</em> of het röntgenapparaat.";
    }
    if (/\b(gamma\s*bron|radioactieve\s*bron)\b/i.test(lower) && /\b(synoniem|beteken|wat\s+is)\b/i.test(lower)) {
      return "<strong>Gammabron / Radioactieve bron:</strong> Isotopen zoals <strong>Selenium-75 (Se-75)</strong>, <strong>Iridium-192 (Ir-192)</strong> of Kobalt-60 (Co-60).";
    }

    // 7. Algemeen overzicht
    return (
      "<strong>Overzicht NDO Groeperingen & Opstellingen (EN ISO 17636-1 / ASME):</strong><br>" +
      "• <strong>Groepering DWDI:</strong> Opstelling 11 / F (ovaaltje, verzet) en Opstelling 12 / G (superpositie).<br>" +
      "• <strong>Groepering SWSI:</strong> Opstelling 1 (plaat), Opstelling 2 / C (buis contact), Opstelling 5 / A (centraal), Opstelling 8 / B (excentrisch).<br>" +
      "• <strong>Groepering DWSI:</strong> Opstelling 13 / E (X-ray), Opstelling 14 / E (gamma), Opstelling 15 (meervoudig).<br><br>" +
      "<strong>Synoniemen:</strong> CW = Rondnaad, LW = Langsnaad, DWEB = DWSI, EWEB = SWSI, DWDB = DWDI."
    );
  }

  // 10b. RT Kennisbank & Theorie (Kwaliteitsnormen, Loodletter B, Kwadratenwet theorie, Ug theorie, etc.)
  function geefRTKennisAntwoord(params, vraagTekst, chips = []) {
    const lower = (vraagTekst || "").toLowerCase();

    // 0. Verschil tussen SWSI, DWSI en DWDI
    if (/\b(verschil\s+tussen\s+swsi\s+en\s+dwsi|swsi\s+vs\s+dwsi|verschil\s+tussen\s+dwsi\s+en\s+dwdi|verschil\s+tussen\s+swsi\s+en\s+dwdi)\b/i.test(lower)) {
      if (chips) chips.push("Opstelling 11 (Ovaal)", "Opstelling 13 (DWSI)", "Opstelling 5 (Centraal)");
      return (
        "<strong>Verschil tussen SWSI, DWSI en DWDI (EN ISO 17636-1 / ASME):</strong><br><br>" +
        "• <strong>SWSI (Single Wall Single Image / Enkelwand Enkelbeeld):</strong><br>" +
        "De stralingsbundel passeert <strong>slechts één wand</strong> en beeldt deze direct af op de film (bijv. vlakke plaat opstelling 1, of leiding van binnenuit met centrale panoramische bron opstelling 5 / A of contact opstelling 2 / C). Biedt de <em>hoogste beeldkwaliteit en scherpte</em>.<br><br>" +
        "• <strong>DWSI (Double Wall Single Image / Dubbelwand Enkelbeeld):</strong><br>" +
        "De straling gaat door <strong>twee wanden</strong> van de buis, maar alleen de <strong>wand aan de filmzijde</strong> wordt beoordeeld (bron buiten, film aan de overzijde, opstelling 13 / 14). Wordt standaard voorgeschreven voor leidingen met buitendiameter <strong>&gt; 100 mm</strong>.<br><br>" +
        "• <strong>DWDI (Double Wall Double Image / Dubbelwand Dubbelbeeld):</strong><br>" +
        "De straling passeert twee wanden en <strong>beide laswanden worden tegelijk op de film afgebeeld en beoordeeld</strong> (ovaaltje opstelling 11 / F of superpositie opstelling 12 / G). Uitsluitend toegestaan bij leidingen met buitendiameter <strong>&le; 100 mm</strong>."
      );
    }

    // 1. Loodletter B & Terugverstrooiing (Backscatter)
    if (/\b(loodletter\s*b|loden\s*letter\s*b|letter\s*b|backscatter|terugverstrooiing|terugstrooiing)\b/i.test(lower)) {
      if (chips) chips.push("Afzettingsafstand", "BKI draadje", "Minimale FFD", "Film D4");
      return (
        "<strong>Loodletter B &amp; Terugverstrooiing (Backscatter) &ndash; EN ISO 17636-1 &amp; ASME Sec. V Art. 2:</strong><br><br>" +
        "• <strong>Waarom een loden letter 'B'?</strong><br>" +
        "Tijdens de belichting botst straling niet alleen op het te onderzoeken werkstuk, maar ook op vloeren, wanden en constructies daarachter. Deze straling verstrooit alle kanten op en kan via de <em>achterzijde</em> van de cassette opnieuw de film binnendringen (terugverstrooiing of <em>backscatter</em>). Dit veroorzaakt een zware sluier en verlies van beeldcontrast.<br><br>" +
        "• <strong>Hoe werkt de controle?</strong><br>" +
        "Aan de <strong>achterzijde van de filmcassette</strong> wordt een loden letter <strong>'B'</strong> geplaatst (minimaal <strong>13 mm hoog en 1.5 mm dik</strong> volgens ASME / EN ISO 17636-1).<br><br>" +
        "• <strong>Beoordeling na ontwikkeling:</strong><br>" +
        "&nbsp;&nbsp;&bull; <strong>Film GOED:</strong> De letter 'B' is <u>niet</u> te zien, of verschijnt donkerder dan de omgeving (geen ontoelaatbare achterwaartse straling).<br>" +
        "&nbsp;&nbsp;&bull; <strong>Film AFKEUR:</strong> Verschijnt er een <strong>lichte afbeelding van de letter 'B'</strong> op de donkere filmachtergrond? Dan is er te veel secundaire straling via de achterzijde binnengedrongen. De opname is direct <strong>normatief ongeldig</strong> en moet worden overgedaan met extra loodafscherming achter de cassette."
      );
    }

    // 2. Kwadratenwet theorie
    if (/\b(kwadratenwet|omgekeerde\s*kwadratenwet|inverse\s*square\s*law)\b/i.test(lower)) {
      if (chips) chips.push("1m op 80 cm, hoe lang op 56 cm?", "Afzettingsafstand", "Minimale FFD");
      return (
        "<strong>De Omgekeerde Kwadratenwet (Inverse Square Law) in Radiografie:</strong><br><br>" +
        "Straling plant zich vanuit een puntbron bolvormig voort in de ruimte. De stralingsintensiteit (en het dosistempo) neemt daardoor af met het <strong>kwadraat van de afstand</strong>.<br><br>" +
        "<div style='background:#14171f; border:1px solid rgba(245,223,77,0.4); border-radius:8px; padding:12px 14px; margin:10px 0; box-shadow:inset 0 1px 4px rgba(0,0,0,0.5);'>" +
          "<div style='font-size:0.8rem; color:#F5DF4D; text-transform:uppercase; letter-spacing:0.8px; font-weight:700; margin-bottom:8px; text-align:center;'>⏱️ Formule voor Belichtingstijd (Focuswissel):</div>" +
          "<div style='display:flex; align-items:center; justify-content:center; gap:8px; font-family:monospace; font-size:1.15rem; color:#fff; flex-wrap:wrap;'>" +
            "<span style='font-weight:700; color:#F5DF4D;'>t₂</span>" +
            "<span>=</span>" +
            "<span style='font-weight:700; color:#F5DF4D;'>t₁</span>" +
            "<span>&times;</span>" +
            "<span style='display:inline-flex; align-items:center;'>" +
              "<span style='font-size:1.6rem; font-weight:300;'>&#40;</span>" +
              "<span style='display:inline-flex; flex-direction:column; vertical-align:middle; text-align:center; padding:0 4px; line-height:1.15;'>" +
                "<span style='border-bottom:1.5px solid #eee; padding-bottom:2px; font-weight:600;'>FFD₂</span>" +
                "<span style='padding-top:2px; font-weight:600;'>FFD₁</span>" +
              "</span>" +
              "<span style='font-size:1.6rem; font-weight:300;'>&#41;</span><sup style='font-size:0.85rem; color:#F5DF4D; font-weight:bold;'>2</sup>" +
            "</span>" +
          "</div>" +
          "<div style='font-size:0.82rem; color:#ccc; margin-top:8px; text-align:center;'>" +
            "<em>Nieuwe tijd (t₂) = Oude tijd (t₁) &times; (Nieuwe FFD / Oude FFD)²</em>" +
          "</div>" +
        "</div>" +
        "<div style='background:#14171f; border:1px solid rgba(91,192,222,0.4); border-radius:8px; padding:12px 14px; margin:10px 0; box-shadow:inset 0 1px 4px rgba(0,0,0,0.5);'>" +
          "<div style='font-size:0.8rem; color:#5bc0de; text-transform:uppercase; letter-spacing:0.8px; font-weight:700; margin-bottom:8px; text-align:center;'>☢️ Formule voor Dosistempo &amp; Afzetting:</div>" +
          "<div style='display:flex; align-items:center; justify-content:center; gap:8px; font-family:monospace; font-size:1.15rem; color:#fff; flex-wrap:wrap;'>" +
            "<span style='font-weight:700; color:#5bc0de;'>I₂</span>" +
            "<span>=</span>" +
            "<span style='font-weight:700; color:#5bc0de;'>I₁</span>" +
            "<span>&times;</span>" +
            "<span style='display:inline-flex; align-items:center;'>" +
              "<span style='font-size:1.6rem; font-weight:300;'>&#40;</span>" +
              "<span style='display:inline-flex; flex-direction:column; vertical-align:middle; text-align:center; padding:0 4px; line-height:1.15;'>" +
                "<span style='border-bottom:1.5px solid #eee; padding-bottom:2px; font-weight:600;'>D₁</span>" +
                "<span style='padding-top:2px; font-weight:600;'>D₂</span>" +
              "</span>" +
              "<span style='font-size:1.6rem; font-weight:300;'>&#41;</span><sup style='font-size:0.85rem; color:#5bc0de; font-weight:bold;'>2</sup>" +
            "</span>" +
          "</div>" +
          "<div style='font-size:0.82rem; color:#ccc; margin-top:8px; text-align:center;'>" +
            "<em>Nieuw dosistempo (I₂) = Oud dosistempo (I₁) &times; (Oude afstand / Nieuwe afstand)²</em>" +
          "</div>" +
        "</div><br>" +
        "• <strong>Praktijkgevolgen voor Belichtingstijd:</strong><br>" +
        "&nbsp;&nbsp;&bull; <strong>Afstand verdubbelen</strong> (bijv. van 50 naar 100 cm): factor (100 / 50)² = 2² = <strong>4&times; zo lang belichten</strong>!<br>" +
        "&nbsp;&nbsp;&bull; <strong>Afstand halveren</strong> (bijv. van 80 naar 40 cm): factor (40 / 80)² = 0.5² = <strong>0.25&times;</strong> (4&times; korter belichten).<br><br>" +
        "• <strong>Praktijkgevolgen voor Stralingsveiligheid (Afzetting):</strong><br>" +
        "&nbsp;&nbsp;&bull; Op <strong>2&times;</strong> de afstand is het dosistempo <strong>4&times; lager</strong>.<br>" +
        "&nbsp;&nbsp;&bull; Op <strong>10&times;</strong> de afstand is het dosistempo zelfs <strong>100&times; lager</strong> (10² = 100).<br><br>" +
        "<small style='opacity:0.85;'>Tip: Wil je een concrete wissel uitrekenen? Vraag bijv. <em>\"1 minuut op 80 cm, hoe lang op 56 cm?\"</em> of raadpleeg <a href='focusverandering.html' class='ai-link' target='_blank'>focusverandering.html</a>.</small>"
      );
    }

    // 2b. Minimale FFD theorie & berekeningswijze (EN ISO 17636-1 en ASME)
    if (/\b(hoe\s+bereken\s+(?:je|ik|men)\s+(?:de\s+)?(?:minimale\s+)?(?:ffd|focus|film\s*focus\s*afstand)|hoe\s+wordt\s+de\s+(?:minimale\s+)?ffd\s+berekend|formule\s+(?:voor|van)\s+(?:de\s+)?(?:minimale\s+)?ffd|hoe\s+bepaal\s+(?:je|ik|men)\s+(?:de\s+)?(?:minimale\s+)?ffd)\b/i.test(lower)) {
      if (chips) chips.push("Min FFD 4 duim Sch 40", "Min FFD SWSI", "Geometrische onscherpte Ug");
      return (
        "<strong>Hoe bereken je de minimale Film-Focus Afstand (FFD / f<sub>min</sub>)?</strong><br><br>" +
        "De minimale film-focus afstand (FFD) garandeert dat de <strong>geometrische onscherpte (U<sub>g</sub>)</strong> binnen de toelaatbare normgrenzen blijft en de lasfoto haarscherp is.<br><br>" +
        "<div style='background:#14171f; border:1px solid rgba(245,223,77,0.4); border-radius:8px; padding:12px 14px; margin:10px 0; box-shadow:inset 0 1px 4px rgba(0,0,0,0.5);'>" +
          "<div style='font-size:0.8rem; color:#F5DF4D; text-transform:uppercase; letter-spacing:0.8px; font-weight:700; margin-bottom:8px; text-align:center;'>📐 Formule Minimale FFD (EN ISO 17636-1):</div>" +
          "<div style='display:flex; align-items:center; justify-content:center; gap:8px; font-family:monospace; font-size:1.15rem; color:#fff; flex-wrap:wrap;'>" +
            "<span style='font-weight:700; color:#F5DF4D;'>f<sub>min</sub></span>" +
            "<span>=</span>" +
            "<span style='font-weight:700; color:#F5DF4D;'>c</span>" +
            "<span>&times;</span>" +
            "<span style='font-weight:700; color:#F5DF4D;'>d</span>" +
            "<span>&times;</span>" +
            "<span style='font-weight:700; color:#F5DF4D;'>b<sup>2/3</sup></span>" +
          "</div>" +
          "<div style='font-size:0.82rem; color:#ccc; margin-top:8px; text-align:center;'>" +
            "<em>c = kwaliteitsconstante &bull; d = brongrootte / brandvlek (mm) &bull; b = object-tot-film afstand OFA (mm)</em>" +
          "</div>" +
        "</div><br>" +
        "• <strong>Kwaliteitsfactor c volgens EN ISO 17636-1:</strong><br>" +
        "&nbsp;&nbsp;&bull; <strong>Klasse A (standaard):</strong> <strong>c = 7.5</strong><br>" +
        "&nbsp;&nbsp;&bull; <strong>Klasse B (streng):</strong> <strong>c = 15</strong> (resulteert in een 2&times; grotere FFD en dus scherpere opnames).<br><br>" +
        "• <strong>Wat is b (Object-to-Film Distance / OFA)?</strong><br>" +
        "&nbsp;&nbsp;&bull; <strong>Enkelwandig (SWSI, bijv. vlakke plaat of panoramisch):</strong> <em>b</em> = nominale wanddikte (<em>t</em>).<br>" +
        "&nbsp;&nbsp;&bull; <strong>Dubbelwandig (DWSI of DWDI, bijv. ovaaltje of superpositie):</strong> <em>b</em> = de <strong>buitendiameter van de buis (D<sub>e</sub>)</strong>, omdat de bronzijde van de las op buitendiameter-afstand van de film ligt.<br><br>" +
        "• <strong>Fundamentele formule via geometrische onscherpte (U<sub>g</sub> &amp; ASME):</strong><br>" +
        "Uit de geometrische stralingsdriehoek geldt:<br>" +
        "<span class='rt-math-inline'><i>f</i><sub>min</sub> = <i>b</i> &times; (1 + <span class='rt-math-frac'><span class='rt-math-num'><i>d</i></span><span class='rt-math-den'><i>U</i><sub>g,max</sub></span></span>)</span><br>" +
        "Volgens <strong>ASME Section V Art. 2 (T-274.2)</strong> geldt voor wanddikte &lt; 50 mm (2″): <strong>U<sub>g</sub> &le; 0.51 mm</strong> (0.020″).<br><br>" +
        "<small style='opacity:0.85;'>Wil je een concrete minimale FFD berekenen? Geef de buismaat, wanddikte en focus op (bijv. <em>\"Wat is de minimale FFD voor een 4 duimer 6 dik met focus 2 mm Klasse B?\"</em>).</small>"
      );
    }

    // 3. Geometrische onscherpte (Ug) theorie & normgrenzen (ASME & EN ISO 17636-1)
    if (/\b(geometrische\s*onscherpte|onscherpte|formule\s+(?:voor|van)\s+(?:de\s+)?(?:geometrische\s*)?(?:onscherpte|ug)|hoe\s+bereken\s+(?:je|ik|men)\s+(?:de\s+)?(?:geometrische\s*)?(?:onscherpte|ug)|wat\s+is\s+ug|ug\s*eisen|ug\s*norm|ug\s*grenzen)\b/i.test(lower)) {
      if (chips) chips.push("Minimale FFD", "Hoe bereken je minimale FFD?", "Kwadratenwet", "MinFFD.html");
      return (
        "<strong>Geometrische Onscherpte (U<sub>g</sub>) &ndash; Formule en Normgrenzen (ASME &amp; EN ISO 17636-1):</strong><br><br>" +
        "Omdat een industriële stralingsbron of röntgenbrandvlek geen oneindig klein punt is maar een bepaalde afmeting heeft (brandvlekgrootte <em>F</em>), ontstaat er aan de randen van het object altijd een halfschaduw. Dit is de <strong>geometrische onscherpte (U<sub>g</sub>)</strong>.<br><br>" +
        "<div style='background:#14171f; border:1px solid rgba(245,223,77,0.4); border-radius:8px; padding:12px 14px; margin:10px 0; box-shadow:inset 0 1px 4px rgba(0,0,0,0.5);'>" +
          "<div style='font-size:0.8rem; color:#F5DF4D; text-transform:uppercase; letter-spacing:0.8px; font-weight:700; margin-bottom:8px; text-align:center;'>📐 Formule Geometrische Onscherpte (ASME Sec. V Art. 2):</div>" +
          "<div style='display:flex; align-items:center; justify-content:center; gap:8px; font-family:monospace; font-size:1.15rem; color:#fff; flex-wrap:wrap;'>" +
            "<span style='font-weight:700; color:#F5DF4D;'>U<sub>g</sub></span>" +
            "<span>=</span>" +
            "<span style='display:inline-flex; flex-direction:column; vertical-align:middle; text-align:center; padding:0 4px; line-height:1.15;'>" +
              "<span style='border-bottom:1.5px solid #eee; padding-bottom:2px; font-weight:600;'>F &times; d</span>" +
              "<span style='padding-top:2px; font-weight:600;'>D</span>" +
            "</span>" +
            "<span>=</span>" +
            "<span style='display:inline-flex; flex-direction:column; vertical-align:middle; text-align:center; padding:0 4px; line-height:1.15;'>" +
              "<span style='border-bottom:1.5px solid #eee; padding-bottom:2px; font-weight:600;'>F &times; d</span>" +
              "<span style='padding-top:2px; font-weight:600;'>FFD &minus; d</span>" +
            "</span>" +
          "</div>" +
          "<div style='font-size:0.82rem; color:#ccc; margin-top:8px; text-align:center;'>" +
            "<em>F = brongrootte / focus (mm) &bull; d = OFA / object-tot-film (mm) &bull; D = BOA / bron-tot-object (FFD &minus; d, in mm)</em>" +
          "</div>" +
        "</div><br>" +
        "• <strong>Omgevormd naar Minimale FFD (ASME):</strong><br>" +
        "<span class='rt-math-inline'>FFD<sub>min</sub> = <span class='rt-math-frac'><span class='rt-math-num'><i>F</i> &times; <i>d</i></span><span class='rt-math-den'><i>U</i><sub>g,max</sub></span></span> + <i>d</i></span><br><br>" +
        "• <strong>Maximaal toegestane U<sub>g</sub> volgens ASME Sec. V Art. 2 (T-274.2 / T-285) op basis van wanddikte (<i>wt</i>):</strong><br>" +
        "&nbsp;&nbsp;&bull; <strong><i>wt</i> &lt; 50 mm (2″):</strong> <strong>U<sub>g</sub> &le; 0.51 mm</strong> (0.020″)<br>" +
        "&nbsp;&nbsp;&bull; <strong>50 mm &le; <i>wt</i> &lt; 75 mm (2″&ndash;3″):</strong> <strong>U<sub>g</sub> &le; 0.76 mm</strong> (0.030″)<br>" +
        "&nbsp;&nbsp;&bull; <strong>75 mm &le; <i>wt</i> &le; 100 mm (3″&ndash;4″):</strong> <strong>U<sub>g</sub> &le; 1.02 mm</strong> (0.040″)<br>" +
        "&nbsp;&nbsp;&bull; <strong><i>wt</i> &gt; 100 mm (&gt; 4″):</strong> <strong>U<sub>g</sub> &le; 1.78 mm</strong> (0.070″)<br><br>" +
        "• <strong>Ter vergelijking &ndash; EN ISO 17636-1 (&sect;7.4):</strong><br>" +
        "EN ISO 17636-1 werkt <strong>niet</strong> met vaste U<sub>g</sub>-drempels zoals ASME, maar schrijft de minimale bron-objectafstand (<i>f</i>) voor via een formule (met brongrootte <i>d</i> en OFA <i>b</i>; bij SWSI geldt <i>b</i> = wanddikte <i>t</i>):<br>" +
        "&nbsp;&nbsp;&bull; <strong>Klasse A:</strong> <span class='rt-math-inline'><i>f</i> / <i>d</i> &ge; 7.5 &middot; <i>b</i><sup>2/3</sup></span> &rarr; omgerekend <span class='rt-math-inline'><i>U</i><sub>g</sub> &le; <i>b</i><sup>1/3</sup> / 7.5</span> (bijv. <strong>0.31 mm</strong> bij <i>b</i> = 12 mm; <strong>0.46 mm</strong> bij <i>b</i> = 40 mm).<br>" +
        "&nbsp;&nbsp;&bull; <strong>Klasse B (streng):</strong> <span class='rt-math-inline'><i>f</i> / <i>d</i> &ge; 15 &middot; <i>b</i><sup>2/3</sup></span> &rarr; omgerekend <span class='rt-math-inline'><i>U</i><sub>g</sub> &le; <i>b</i><sup>1/3</sup> / 15</span> (bijv. <strong>0.15 mm</strong> bij <i>b</i> = 12 mm; <strong>0.23 mm</strong> bij <i>b</i> = 40 mm).<br>" +
        "&nbsp;&nbsp;&bull; <em>Let op:</em> voor het opsporen van vlakke fouten (scheuren/bindingsfouten) in Klasse A geldt toch de strengere <i>f</i><sub>min</sub> van Klasse B.<br><br>" +
        "<small style='opacity:0.85;'>Tip: Wil je direct U<sub>g</sub> of de minimale FFD uitrekenen? Zeg bijv. <em>\"Bereken Ug bij focus 3 mm, OFA 50 mm en FFD 500 mm\"</em> of open <a href='MinFFD.html' class='ai-link' target='_blank'>MinFFD.html</a>.</small>"
      );
    }

    // 4. Keverregel & Buisspanning
    if (/\b(keverregel|kv[-\s]?regel|maximale\s*buisspanning|max\s*kv|waarom\s*laag\s*kv|waarom\s*spanning\s*beperken)\b/i.test(lower)) {
      if (chips) chips.push("Max kV 10 mm staal", "Max kV aluminium", "Buisspanning berekenen");
      return (
        "<strong>De kV-Regel (Keverregel) &amp; Maximale Buisspanning &ndash; EN ISO 17636-1:</strong><br><br>" +
        "• <strong>Waarom een lage buisspanning?</strong><br>" +
        "Bij lagere fotonenenergieën domineert het <strong>foto-elektrisch effect</strong>. Dit zorgt voor maximale contrastverschillen tussen het basismateriaal en lasfouten (zoals poriën, slak en bindingsfouten). Bij een te hoge buisspanning treedt voornamelijk <strong>Compton-verstrooiing</strong> op, waardoor de foto grijs en flets wordt.<br><br>" +
        "• <strong>De normformule uit EN ISO 17636-1:</strong><br>" +
        "De norm begrenst de maximale buisspanning afhankelijk van de doorstraalde dikte <em>w</em> en het materiaal:<br>" +
        "&nbsp;&nbsp;&bull; <strong>Staal / RVS:</strong> Begrensd conform Figuur 1 van EN ISO 17636-1.<br>" +
        "&nbsp;&nbsp;&bull; <strong>Aluminium:</strong> <strong>U<sub>max</sub> &le; 20 kV + (4.5 &times; w)</strong> (waarbij <em>w</em> de doorstraalde dikte in mm is).<br>" +
        "&nbsp;&nbsp;&bull; <strong>Koperlegeringen:</strong> Max. toegestane kV ligt ca. 20-30% lager dan voor staal bij gelijke dikte.<br><br>" +
        "<small style='opacity:0.85;'>Tip: Bereken direct de exacte limiet via <a href='kvregel.html' class='ai-link' target='_blank'>kvregel.html</a> of vraag bijv. <em>\"Hoeveel kV mag ik op 12 mm staal?\"</em>.</small>"
      );
    }

    // 5. Isotopen eigenschappen & Halfwaardetijd
    if (/\b(halfwaardetijd|halveringstijd|halveringtijd|eigenschappen\s*(?:van\s*)?(?:ir-?192|se-?75|co-?60|isotoop|isotopen|iridium|selenium|kobalt)|energie\s*(?:van\s*)?(?:ir-?192|se-?75|co-?60|iridium|selenium|kobalt))\b/i.test(lower)) {
      if (chips) chips.push("Afzetting Ir-192", "Afzetting Se-75", "Bronnenoverzicht");
      return (
        "<strong>Belangrijkste Gammabronnen in de Industriële Radiografie:</strong><br><br>" +
        "1. <strong>Selenium-75 (Se-75):</strong><br>" +
        "• <strong>Halfwaardetijd (T<sub>&frac12;</sub>):</strong> <strong>119.78 dagen</strong> (~4 maanden)<br>" +
        "• <strong>Gamma-energie:</strong> 66 t/m 401 keV (gemiddeld ~217 keV)<br>" +
        "• <strong>Wanddiktebereik staal:</strong> 10 t/m 40 mm (klasse A) / 14 t/m 40 mm (klasse B) conform EN ISO 17636-1; onstream tot 45 mm<br>" +
        "• <strong>Halveringsdikte lood (HVL):</strong> <strong>2.0 mm Pb</strong> (en <strong>5 mm staal Fe</strong> conform <a href='afzettinggamma.html' class='ai-link' target='_blank'>afzettinggamma.html</a>)<br>" +
        "• <strong>Dosisconstante &Gamma;:</strong> ca. <strong>2.0 mSv&middot;m&sup2;/(h&middot;Ci)</strong><br><br>" +
        "2. <strong>Iridium-192 (Ir-192):</strong><br>" +
        "• <strong>Halfwaardetijd (T<sub>&frac12;</sub>):</strong> <strong>73.83 dagen</strong> (~2.5 maand)<br>" +
        "• <strong>Gamma-energie:</strong> 296 t/m 612 keV (gemiddeld ~380 keV)<br>" +
        "• <strong>Wanddiktebereik staal:</strong> 20 t/m 100 mm (klasse A) / 20 t/m 90 mm (klasse B); onstream tot 80 mm<br>" +
        "• <strong>Halveringsdikte lood (HVL):</strong> <strong>3.0 mm Pb</strong> (en <strong>13 mm staal Fe</strong> conform <a href='afzettinggamma.html' class='ai-link' target='_blank'>afzettinggamma.html</a>)<br>" +
        "• <strong>Dosisconstante &Gamma;:</strong> ca. <strong>4.8 mSv&middot;m&sup2;/(h&middot;Ci)</strong><br><br>" +
        "3. <strong>Cobalt-60 (Co-60):</strong><br>" +
        "• <strong>Halfwaardetijd (T<sub>&frac12;</sub>):</strong> <strong>5.27 jaar</strong><br>" +
        "• <strong>Gamma-energie:</strong> Zeer doordringend: 1.17 MeV en 1.33 MeV<br>" +
        "• <strong>Wanddiktebereik:</strong> Zeer dikke wanden (&gt; 40-60 mm t/m 200 mm staal)<br>" +
        "• <strong>Halveringsdikte lood (HVL):</strong> ca. <strong>12.5 mm Pb</strong>"
      );
    }

    // 6. Filmkeuze: Agfa Structurix (C1 t/m C6) & D4 vs D7
    if (
      /\b(agfa|structurix)\b/i.test(lower) ||
      /\b(filmklasse\s*c[1-6]|film\s*c[1-6]|wat\s+is\s+film\s*c[1-6]|wat\s+is\s+c[1-6]|welke\s+film\s+is\s+c[1-6]|welk\s+type\s+agfa\s*(?:film)?\s*(?:komt\s+overeen\s+)?met\s+c[1-6]|overeenkomst\s+c[1-6])\b/i.test(lower) ||
      /\b(waarom\s+d4|verschil\s+tussen\s+d4\s+en\s+d7|verschil\s+tussen\s+d7\s+en\s+d4|filmklasse\s*c[1-5]|wanneer\s+d4|wanneer\s+d7|wanneer\s+d5|filmkwaliteit\s*uitleg)\b/i.test(lower)
    ) {
      if (chips) chips.push("Film D4 advies", "Film D7 advies", "Klasse B zwarting");
      return (
        "<strong>Agfa Structurix Filmtypen &amp; Filmklassen (ISO 11699-1 / ASTM E1815):</strong><br><br>" +
        "De internationale normen delen industriële röntgenfilms in volgens korrelgrootte, contrast en gevoeligheid:<br><br>" +
        "• <strong>Klasse C1 (ASTM Special):</strong> <strong>Agfa Structurix D2</strong><br>" +
        "&nbsp;&nbsp;&bull; <em>Eigenschappen:</em> Ultrafijne korrel, maximaal contrast en extreem scherp. Vereist lange belichtingstijden (voor kritische luchtvaart- en nucleaire inspecties).<br><br>" +
        "• <strong>Klasse C2 (ASTM Klasse I):</strong> <strong>Agfa Structurix D3</strong><br>" +
        "&nbsp;&nbsp;&bull; <em>Eigenschappen:</em> Zeer fijnkorrelig met zeer hoog contrast.<br><br>" +
        "• <strong>Klasse C3 (ASTM Klasse I):</strong> <strong>Agfa Structurix D4</strong><br>" +
        "&nbsp;&nbsp;&bull; <em>Eigenschappen:</em> Fijnkorrelig, uitstekend contrast. <strong>Verplichte standaardkeuze voor EN Klasse B bij gammastraling (Se-75 &amp; Ir-192)</strong>.<br><br>" +
        "• <strong>Klasse C4 (ASTM Klasse I / II):</strong> <strong>Agfa Structurix D5</strong><br>" +
        "&nbsp;&nbsp;&bull; <em>Eigenschappen:</em> Goed compromis tussen korrelgrootte en belichtingstijd; veel gebruikt in de praktijk bij Se-75.<br><br>" +
        "• <strong>Klasse C5 (ASTM Klasse II):</strong> <strong>Agfa Structurix D7</strong><br>" +
        "&nbsp;&nbsp;&bull; <em>Eigenschappen:</em> Snelle, hooggevoelige film met een grovere korrel. <strong>Standaard toegestaan voor Klasse A en ASME</strong>, maar <strong>normatief verboden voor Klasse B gammastraling</strong>.<br><br>" +
        "• <strong>Klasse C6 (ASTM Klasse III):</strong> <strong>Agfa Structurix D8</strong><br>" +
        "&nbsp;&nbsp;&bull; <em>Eigenschappen:</em> Zeer grofkorrelig, ultrasnel; alleen voor grove overzichtsopnamen bij dikke objecten."
      );
    }

    // 7a. Aantal draadjes op een EN BKI (ISO 19232-1)
    if (/\b(hoeveel|aantal)\s+(?:draadjes?|draden|draadje(?:\s*bki)?)\b/i.test(lower) && /\b(en\s*bki|iso\s*bki|bki|iqi|houder|en\b|iso\b)/i.test(lower)) {
      if (chips) chips.push("Verschil ASME en EN BKI", "Welke BKI voor W10", "Draadjes vs 2T gat");
      return (
        "<strong>Aantal draden op een EN BKI (ISO 19232-1):</strong><br><br>" +
        "Een EN beeldkwaliteitsindicator (BKI conform <strong>EN ISO 19232-1</strong>) bevat altijd <strong>exact 7 parallelle draden</strong> van verschillende diktes in een transparante kunststof houder met loden identificatieletters.<br><br>" +
        "Er bestaan <strong>4 standaard EN BKI-houders</strong> (met onderlinge overlap):<br>" +
        "• <strong>1 EN (draden W1 t/m W7):</strong> Draaddiktes van <strong>3.20 mm aflopend naar 0.80 mm</strong> &mdash; voor zeer zware wanddiktes.<br>" +
        "• <strong>6 EN (draden W6 t/m W12):</strong> Draaddiktes van <strong>1.00 mm aflopend naar 0.25 mm</strong> &mdash; voor middelzware wanden.<br>" +
        "• <strong>10 EN (draden W10 t/m W16):</strong> Draaddiktes van <strong>0.40 mm aflopend naar 0.10 mm</strong> &mdash; de meest gebruikte BKI in het leidingwerk.<br>" +
        "• <strong>13 EN (draden W13 t/m W19):</strong> Draaddiktes van <strong>0.20 mm aflopend naar 0.050 mm</strong> &mdash; voor dunwandig werk en hoge beeldscherpte.<br><br>" +
        "💡 <em>De totale EN-reeks telt 19 draden (W1 t/m W19). Hoe hoger het W-nummer, hoe dunner de draad en hoe scherper de foto moet zijn om hem waar te nemen!</em>"
      );
    }

    // 7b. Verschil tussen ASME BKI en EN BKI
    if (
      /\b(verschil\s+tussen\s+(?:een\s+)?(?:asme|astm)\s*(?:en\s+|vs\s*)?(?:en|iso)?\s*(?:bki|iqi)|(?:asme|astm)\s*(?:vs|tegenover)\s*(?:en|iso)\s*(?:bki|iqi)|verschil\s+tussen\s+(?:en\s+en\s+asme|asme\s+en\s+en)\s*(?:bki|iqi))\b/i.test(lower) ||
      (/\b(verschil|vergelijk)\b/i.test(lower) && /\b(asme|astm)\b/i.test(lower) && /\b(en|iso)\b/i.test(lower) && /\b(bki|iqi|draad|indicator)\b/i.test(lower))
    ) {
      if (chips) chips.push("Hoeveel draadjes EN BKI", "Welk EN draadje ipv ASME", "2T gat alternatief");
      return (
        "<strong>Verschil tussen een ASME BKI (ASTM E747 / E1025) en een EN BKI (ISO 19232-1):</strong><br><br>" +
        "1. <strong>Aantal draden per indicator:</strong><br>" +
        "• <strong>EN BKI (ISO 19232-1):</strong> Bevat <strong>7 draden</strong> per houder (1 EN, 6 EN, 10 EN, 13 EN).<br>" +
        "• <strong>ASME Draad-BKI (ASTM E747):</strong> Bevat <strong>6 draden</strong> per houder (Set A, Set B, Set C, Set D).<br><br>" +
        "2. <strong>Nummering en draaddikterichting (Cruciaal verschil!):</strong><br>" +
        "• <strong>EN ISO:</strong> Loopt van <strong>W1 (dikste: 3.20 mm) tot W19 (dunste: 0.050 mm)</strong>. Een <em>hoger getal</em> betekent een <em>dunnere draad</em> (strenger).<br>" +
        "• <strong>ASME / ASTM:</strong> Loopt van <strong>Draad 1 (dunste: 0.08 mm) tot Draad 21 (dikste: 8.13 mm)</strong>. Een <em>lager getal</em> betekent een <em>dunnere draad</em> (omgekeerde volgorde!).<br><br>" +
        "3. <strong>Plaatjes-IQI (Hole-Type):</strong><br>" +
        "• <strong>ASME Section V:</strong> Gebruikt standaard rechthoekige <strong>plaatjes-IQIs (ASTM E1025)</strong> met een 1T, 2T en 4T gat (waarbij het 2T-gat zichtbaar moet zijn), naast draad-IQIs.<br>" +
        "• <strong>EN ISO 17636-1:</strong> Schrijft standaard draadjes voor (ISO 19232-1) of stap-gat indicators (ISO 19232-2).<br><br>" +
        "4. <strong>Equivalente vervanging:</strong><br>" +
        "Volgens ASME Sec. V Art. 2 Tabel T-283 mag een EN-draad worden gebruikt ter vervanging van een ASME-draad mits de draaddikte gelijk is of dunner."
      );
    }

    // 7c. Draadjes vs Plaatjes (Hole-type IQI / 2T-gat)
    if (/\b(verschil\s*tussen\s*(?:een\s*)?(?:draadje|draadjes|wire)(?:\s*bki)?\s*en\s*(?:een\s*)?(?:plaatje|plaatjes|hole|gaatje|gaatjes|gat|gaten)|draadje\s+vs\s+(?:gaatje|gat|plaatje)|wat\s*is\s*(?:een\s*)?2t[-\s]*gat|waarom\s*2t|hole\s*type\s*iqi\s*uitleg)\b/i.test(lower)) {
      if (chips) chips.push("2T gat alternatief", "BKI draadjes", "ASME Section V");
      return (
        "<strong>Beeldkwaliteit: Draadjes-BKI (ISO 19232-1) vs Plaatjes-IQI (ASME / ASTM E1025):</strong><br><br>" +
        "• <strong>Draadjes (Wire-type IQI, ISO 19232-1 & ASTM E747):</strong><br>" +
        "De Europese norm EN ISO 17636-1 schrijft standaard draadjes voor. Een houder bevat 7 draden van afnemende dikte (W1 t/m W19). Het dunste zichtbare draadje op de ontwikkelde film bepaalt de behaalde beeldkwaliteit.<br><br>" +
        "• <strong>Plaatjes / Shims (Hole-type IQI, ASTM E1025 / ASME Sec. V):</strong><br>" +
        "In Amerikaanse codes (ASME Boiler & Pressure Vessel Code) gebruikt men vaak een metalen plaatje met dikte <em>T</em> (ca. 2% van de wanddikte). In dit plaatje zitten drie geboorde gaten:<br>" +
        "&nbsp;&nbsp;&bull; <strong>1T-gat:</strong> diameter gelijk aan 1 &times; T<br>" +
        "&nbsp;&nbsp;&bull; <strong>2T-gat:</strong> diameter gelijk aan 2 &times; T (standaard vereiste!)<br>" +
        "&nbsp;&nbsp;&bull; <strong>4T-gat:</strong> diameter gelijk aan 4 &times; T<br><br>" +
        "• <strong>Wat betekent \"2T-gat moet zichtbaar zijn\"?</strong><br>" +
        "Bij niveau 2-2T moet het plaatje zelf én het <strong>2T-gaatje</strong> duidelijk rond herkenbaar zijn op de film. Het bewijst zowel voldoende <strong>contrast</strong> (het plaatje) als voldoende <strong>resolutie / scherpte</strong> (het 2T-gat)."
      );
    }

    // 8. Afzettingsnorm (10 µSv/h) & Oorsprong gecontroleerde zone
    if (/\b(waarom\s*10\s*(?:microsievert|usv|µsv|micro\s*sv)|waar\s+komt\s+(?:de\s+)?(?:grens\s+van\s+)?10\s*(?:microsievert|usv|µsv|micro\s*sv)|grens\s+van\s+10\s*(?:microsievert|usv|µsv|micro\s*sv)|10\s*(?:microsievert|usv|µsv|micro\s*sv)(?:\s*\/\s*(?:uur|h))?\s*(?:vandaan|grens|norm)|gecontroleerde\s*zone\s*(?:norm|grens)|grens\s*gecontroleerde\s*zone)\b/i.test(lower)) {
      if (chips) chips.push("Dosislimiet medewerker", "Collimator factor", "Afzettingsafstand berekenen");
      return (
        "<strong>Waar komt de grens van 10 &mu;Sv/uur vandaan? (Stralingsbescherming &amp; Afzettingen):</strong><br><br>" +
        "• <strong>Wettelijke oorsprong (Bbs &amp; Euratom):</strong><br>" +
        "De grens van <strong>10 &mu;Sv/h</strong> is wettelijk vastgelegd in het Nederlandse <em>Besluit basisveiligheidsnormen stralingsbescherming</em> (<strong>Bbs</strong>, gebaseerd op de Europese <strong>Euratom-richtlijn 2013/59</strong>). Het markeert de normatieve grens van de <strong>gecontroleerde zone</strong> (<em>controlled area</em>) bij mobiel industrieel radiografisch onderzoek.<br><br>" +
        "• <strong>Bescherming van niet-blootgesteld publiek:</strong><br>" +
        "Voor personen uit het publiek en niet-blootgestelde medewerkers geldt een maximale wettelijke jaardosis van <strong>1 mSv per kalenderjaar</strong> (1000 &mu;Sv). Omdat radiografie in het veld tijdelijk en mobiel is, is berekend dat iemand die toevallig langs het afzetlint loopt bij een dosistempo van &le; 10 &mu;Sv/h slechts een fractie van een microSievert oploopt &ndash; ver onder de publiekslimiet.<br><br>" +
        "• <strong>Betekenis van de gecontroleerde zone:</strong><br>" +
        "&nbsp;&nbsp;&bull; <strong>Binnen het afzetlint (&gt; 10 &mu;Sv/h):</strong> Dit is de gecontroleerde zone. Uitsluitend toegankelijk voor gecertificeerde radiografen (blootgestelde werknemers Categorie A) met actieve en passieve dosimeters (TLD/DIS-badge en EPD-pieper).<br>" +
        "&nbsp;&nbsp;&bull; <strong>Buiten het afzetlint (&le; 10 &mu;Sv/h):</strong> Vrij toegankelijk voor derden en publiek.<br><br>" +
        "• <strong>Praktijktip voor het veld:</strong><br>" +
        "Gebruik altijd een <strong>collimator</strong>! Een standaard wolfraam collimator reduceert de straling zijwaarts en achterwaarts met factor 85 tot 100, waardoor je afzettingsafstand met circa 90% krimpt."
      );
    }

    // 8b. Jaarlijkse dosislimieten voor medewerkers (Categorie A, B, publiek, zwanger)
    if (/\b(dosislimiet|dosislimieten|dosis\s*limiet|hoeveel\s+straling\s+mag\s+(?:een\s+)?(?:medewerker|werknemer|persoon|radiograaf)|maximaal\s+toegestane\s+dosis|hoeveel\s+(?:msv|millisievert)|wettelijke\s+dosislimiet)\b/i.test(lower)) {
      if (chips) chips.push("Grens 10 microSv/uur", "Afzettingsafstand", "ALARA principe");
      return (
        "<strong>Wettelijke Dosislimieten per Jaar (Bbs &amp; Richtlijn 2013/59/Euratom):</strong><br><br>" +
        "In het <em>Besluit basisveiligheidsnormen stralingsbescherming (Bbs)</em> zijn de maximale effectieve stralingsdoses per kalenderjaar strikt vastgelegd:<br><br>" +
        "• <strong>Beroepsmatig blootgestelde werknemers Categorie A (Radiografen):</strong><br>" +
        "&nbsp;&nbsp;&bull; Maximaal <strong>20 mSv per kalenderjaar</strong>.<br>" +
        "&nbsp;&nbsp;&bull; <em>(Wettelijk mag in een individueel jaar maximaal 50 mSv worden opgelopen, mits het gemiddelde over 5 opeenvolgende jaren niet meer dan 20 mSv/jaar bedraagt, oftewel max. 100 mSv in 5 jaar).</em><br>" +
        "&nbsp;&nbsp;&bull; Verplichte medische periodieke keuring en individuele dosimetrie (TLD / DIS-badge &amp; EPD).<br><br>" +
        "• <strong>Beroepsmatig blootgestelde werknemers Categorie B:</strong><br>" +
        "&nbsp;&nbsp;&bull; Maximaal <strong>6 mSv per kalenderjaar</strong>.<br><br>" +
        "• <strong>Niet-blootgestelde werknemers &amp; Leden van het Publiek:</strong><br>" +
        "&nbsp;&nbsp;&bull; Maximaal <strong>1 mSv per kalenderjaar</strong> (daarom wordt buiten het 10 &mu;Sv/h afzetlint gestuurd).<br><br>" +
        "• <strong>Zwangere medewerkers:</strong><br>" +
        "&nbsp;&nbsp;&bull; Zodra de zwangerschap officieel is gemeld, mag de equivalente dosis voor het ongeboren kind <strong>niet meer dan 1 mSv</strong> bedragen voor het restant van de zwangerschap (in de praktijk worden zwangere radiografen direct vrijgesteld van veldwerk met open bronnen/röntgen).<br><br>" +
        "• <strong>Orgaandosislimieten per kalenderjaar:</strong><br>" +
        "&nbsp;&nbsp;&bull; <strong>Ooglens:</strong> maximaal <strong>20 mSv per jaar</strong>.<br>" +
        "&nbsp;&nbsp;&bull; <strong>Huid en extremiteiten (handen, voeten):</strong> maximaal <strong>500 mSv per jaar</strong>.<br><br>" +
        "<em>💡 Let op het ALARA-principe (As Low As Reasonably Achievable): de limieten zijn absolute grenzen, geen streefwaarden! Stralingsbelasting moet altijd zo laag mogelijk worden gehouden.</em>"
      );
    }

    // 9. Strooistraling & Collimator
    if (/\b(strooistraling|secundaire\s*straling|waarom\s*(?:een\s*)?collimator|werking\s*collimator|hoe\s*werkt\s*een\s*collimator|wat\s+doet\s+(?:een\s+)?collimator)\b/i.test(lower)) {
      if (chips) chips.push("Loodletter B", "Afzetting collimator", "Afscherming lood");
      return (
        "<strong>Strooistraling (Compton Scatter) &amp; De Werking van een Collimator:</strong><br><br>" +
        "• <strong>Wat is strooistraling?</strong><br>" +
        "Wanneer straling botst met het werkstuk, de vloer of constructies, botsen fotonen tegen elektronen en veranderen van richting (Compton-verstrooiing). Deze secundaire straling valt kris-kras op de film en creëert een diffuse sluier, wat resulteert in <strong>drastisch contrastverlies</strong> op de film.<br><br>" +
        "• <strong>Wat doet een collimator?</strong><br>" +
        "Een collimator (wolfraam of lood) bundelt de straling tot enkel het noodzakelijke opnamevlak (bijv. 60° x 40°). Dit levert twee enorme voordelen op:<br>" +
        "&nbsp;&nbsp;&bull; <strong>1. Beeldkwaliteit:</strong> Onnodige strooistraling via de omgeving wordt voorkomen, resulterend in haarscherpe lascontouren.<br>" +
        "&nbsp;&nbsp;&bull; <strong>2. Veiligheid:</strong> De omgevingsdosis zakt met factor 85 tot 100, waardoor de veilige afzettingsstraal met circa 90% krimpt."
      );
    }

    // 10. Overzicht van RT Normen
    if (/\b(welke\s*normen\s*(?:zijn\s*er|gelden)|overzicht\s*van\s*normen|rt\s*normen|radiografie\s*normen)\b/i.test(lower)) {
      if (chips) chips.push("EN ISO 17636-1", "ASME Section V", "ISO 5817 Level B");
      return (
        "<strong>Belangrijkste Normen voor Industriële Radiografie (RT):</strong><br><br>" +
        "• <strong>Onderzoekstechniek &amp; Opstellingen:</strong><br>" +
        "&nbsp;&nbsp;&bull; <strong>EN ISO 17636-1:</strong> Niet-destructief onderzoek van lasverbindingen &ndash; Deel 1: Röntgen- en gammastralingstechnieken met film.<br>" +
        "&nbsp;&nbsp;&bull; <strong>EN ISO 17636-2:</strong> Deel 2: Digitale radiografie (CR fosforplaten &amp; DDA flat panels).<br>" +
        "&nbsp;&nbsp;&bull; <strong>ASME Section V Article 2:</strong> Radiographic Examination (Boiler and Pressure Vessel Code).<br>" +
        "&nbsp;&nbsp;&bull; <strong>RT21021 / RT21022:</strong> Onstream profiel- en wanddikte-radiografie.<br><br>" +
        "• <strong>Beeldkwaliteit &amp; Beoordeling:</strong><br>" +
        "&nbsp;&nbsp;&bull; <strong>EN ISO 19232-1:</strong> Beeldkwaliteitsindicatoren van het draadjestype (W1 t/m W19).<br>" +
        "&nbsp;&nbsp;&bull; <strong>ASTM E747 &amp; ASTM E1025:</strong> Wire-type en Hole-type IQI (plaatjes met 1T, 2T, 4T gaten).<br>" +
        "&nbsp;&nbsp;&bull; <strong>EN ISO 10675-1:</strong> Acceptatieniveaus voor radiografisch onderzoek van lassen in staal, nikkel en titaan.<br>" +
        "&nbsp;&nbsp;&bull; <strong>ISO 5817:</strong> Kwaliteitsniveaus voor onvolkomenheden in lasverbindingen (B, C, D).<br>" +
        "&nbsp;&nbsp;&bull; <strong>ASME Section VIII Div. 1:</strong> UW-51 (Full RT) &amp; UW-52 (Spot RT)."
      );
    }

    // 11. ISO 5817 vs ISO 10675-1
    if (/\b(verschil\s*tussen\s*iso\s*5817\s*en\s*iso\s*10675|iso\s*5817\s*vs\s*iso\s*10675|wat\s*is\s*iso\s*5817|wat\s*is\s*iso\s*10675)\b/i.test(lower)) {
      if (chips) chips.push("Lasfout porie", "Lasfout slak", "Acceptatiecriteria");
      return (
        "<strong>Verschil tussen ISO 5817 en ISO 10675-1:</strong><br><br>" +
        "• <strong>ISO 5817 (Algemene Laskwaliteit):</strong><br>" +
        "ISO 5817 definieert de <strong>metallurgische en geometrische kwaliteitsniveaus</strong> van een lasverbinding in drie niveaus: <strong>Niveau B</strong> (streng / hoogste kwaliteit), <strong>Niveau C</strong> (gemiddeld) en <strong>Niveau D</strong> (laag / constructiewerk). Dit geldt onafhankelijk van hoe je inspecteert (visueel, UT of RT).<br><br>" +
        "• <strong>ISO 10675-1 (Radiografische Acceptatie):</strong><br>" +
        "ISO 10675-1 vertaalt de eisen uit ISO 5817 naar <strong>wat je daadwerkelijk op een röntgenfilm ziet</strong>. Het kent drie acceptatieniveaus:<br>" +
        "&nbsp;&nbsp;&bull; <strong>Acceptatieniveau 1:</strong> Komt overeen met ISO 5817 <strong>Niveau B</strong><br>" +
        "&nbsp;&nbsp;&bull; <strong>Acceptatieniveau 2:</strong> Komt overeen met ISO 5817 <strong>Niveau C</strong><br>" +
        "&nbsp;&nbsp;&bull; <strong>Acceptatieniveau 3:</strong> Komt overeen met ISO 5817 <strong>Niveau D</strong><br><br>" +
        "<em>(Scheuren en bindingsfouten zijn op elk niveau verboden; voor poriën en slaklijnen geeft ISO 10675-1 exacte millimetergrenzen en oppervlaktepercentages per wanddiktebereik).</em>"
      );
    }

    // 12. ALARA-principe & de 3 basisregels van stralingsbescherming
    if (/\b(alara|drie\s+basisregels\s+stralingsbescherming|3\s+basisregels\s+stralingsbescherming|tijd\s+afstand\s+afscherming|basisregels\s+stralingsbescherming)\b/i.test(lower)) {
      if (chips) chips.push("Dosislimiet medewerker", "Grens 10 microSv/uur", "Halveringsdikte (HVL)", "Kwadratenwet");
      return (
        "<strong>Het ALARA-principe &amp; de 3 Basisregels van Stralingsbescherming:</strong><br><br>" +
        "<strong>ALARA</strong> staat voor <em>As Low As Reasonably Achievable</em>: elke blootstelling aan ioniserende straling moet zo laag als redelijkerwijs mogelijk worden gehouden, ruim onder de wettelijke dosislimieten.<br><br>" +
        "• <strong>De 3 gouden basisregels (Tijd, Afstand, Afscherming):</strong><br>" +
        "&nbsp;&nbsp;&bull; <strong>1. Tijd (zo kort mogelijk):</strong> Halveer je de verblijftijd bij de bron, dan halveert je dosis direct (<span class='rt-math-inline'>Dosis = Dosistempo &times; Tijd</span>). Bereid opstellingen altijd voor vóórdat de bron wordt uitgedraaid.<br>" +
        "&nbsp;&nbsp;&bull; <strong>2. Afstand (zo groot mogelijk):</strong> Via de <strong>omgekeerde kwadratenwet</strong> daalt het dosistempo met het kwadraat van de afstand (2&times; verder = 4&times; minder straling; 10&times; verder = 100&times; minder).<br>" +
        "&nbsp;&nbsp;&bull; <strong>3. Afscherming (effectief materiaal):</strong> Gebruik altijd een <strong>collimator</strong> (wolfraam/lood), loodschorten/loodplaten of bestaande betonnen/stalen wanden om de bundel te verzwakken via halveringsdiktes (HVL)."
      );
    }

    // 13. Optische dichtheid / Zwarting (D) & formule
    if (/\b(optische\s+dichtheid|wat\s+is\s+zwarting|formule\s+(?:voor|van)\s+(?:de\s+)?(?:zwarting|optische\s+dichtheid)|hoe\s+bereken\s+(?:je|ik|men)\s+(?:de\s+)?(?:zwarting|optische\s+dichtheid))\b/i.test(lower)) {
      if (chips) chips.push("Minimale zwarting Klasse B", "Minimale zwarting ASME", "Film D4 vs D7");
      return (
        "<strong>Zwarting / Optische Dichtheid (D) &ndash; Formule en Betekenis:</strong><br><br>" +
        "De zwarting (optische dichtheid <em>D</em>) geeft aan hoeveel licht een ontwikkelde röntgenfilm tegenhoudt op de filmkijkkast (densitometer).<br><br>" +
        "<div style='background:#14171f; border:1px solid rgba(245,223,77,0.4); border-radius:8px; padding:12px 14px; margin:10px 0; box-shadow:inset 0 1px 4px rgba(0,0,0,0.5);'>" +
          "<div style='font-size:0.8rem; color:#F5DF4D; text-transform:uppercase; letter-spacing:0.8px; font-weight:700; margin-bottom:8px; text-align:center;'>📐 Formule Optische Dichtheid (Zwarting):</div>" +
          "<div style='display:flex; align-items:center; justify-content:center; gap:8px; font-family:monospace; font-size:1.15rem; color:#fff; flex-wrap:wrap;'>" +
            "<span style='font-weight:700; color:#F5DF4D;'>D</span>" +
            "<span>=</span>" +
            "<span>log<sub>10</sub></span>" +
            "<span style='display:inline-flex; align-items:center;'>" +
              "<span style='font-size:1.5rem; font-weight:300;'>&#40;</span>" +
              "<span style='display:inline-flex; flex-direction:column; vertical-align:middle; text-align:center; padding:0 4px; line-height:1.15;'>" +
                "<span style='border-bottom:1.5px solid #eee; padding-bottom:2px; font-weight:600;'>I<sub>0</sub></span>" +
                "<span style='padding-top:2px; font-weight:600;'>I</span>" +
              "</span>" +
              "<span style='font-size:1.5rem; font-weight:300;'>&#41;</span>" +
            "</span>" +
          "</div>" +
          "<div style='font-size:0.82rem; color:#ccc; margin-top:8px; text-align:center;'>" +
            "<em>I₀ = invallende lichtintensiteit van de kijkkast &bull; I = doorgelaten licht door de film</em>" +
          "</div>" +
        "</div><br>" +
        "• <strong>Wat betekent de waarde in de praktijk?</strong><br>" +
        "&nbsp;&nbsp;&bull; <strong>D = 1.0:</strong> 10% van het licht komt door de film (1 op 10).<br>" +
        "&nbsp;&nbsp;&bull; <strong>D = 2.0:</strong> 1% van het licht komt door (1 op 100) &ndash; minimum voor EN Klasse A en ASME (X-ray: 1.8, gamma: 2.0).<br>" +
        "&nbsp;&nbsp;&bull; <strong>D = 2.3:</strong> ca. 0.5% lichtdoorlaat &ndash; minimum voor EN Klasse B.<br>" +
        "&nbsp;&nbsp;&bull; <strong>D = 3.0:</strong> 0.1% lichtdoorlaat (1 op 1000) &ndash; hoog contrast, vereist een sterke kijkkast.<br>" +
        "&nbsp;&nbsp;&bull; <strong>D = 4.0:</strong> 0.01% lichtdoorlaat (1 op 10.000) &ndash; bovengrens volgens ASME / EN."
      );
    }

    // 14. Halveringsdikte (HVL) & Tiendewaardelaag (TVL)
    if (/\b(halveringsdikte|half\s*value\s*layer|\bhvl\b|tiendewaardelaag|tenth\s*value\s*layer|\btvl\b|formule\s+(?:voor|van)\s+(?:de\s+)?(?:afscherming|verzwakking))\b/i.test(lower)) {
      if (chips) chips.push("Afzettingsafstand", "ALARA principe", "Eigenschappen Ir-192 en Se-75", "afzettinggamma.html");
      return (
        "<strong>Halveringsdikte (HVL) &amp; Tiendewaardelaag (TVL) &ndash; Afscherming:</strong><br><br>" +
        "• <strong>Halveringsdikte (HVL / Half Value Layer):</strong> De dikte van een afschermmateriaal die de stralingsintensiteit precies <strong>halveert</strong> (factor 2 reductie).<br>" +
        "• <strong>Tiendewaardelaag (TVL / Tenth Value Layer):</strong> De dikte die de straling met een <strong>factor 10</strong> vermindert (<span class='rt-math-inline'>TVL &approx; 3.32 &times; HVL</span>).<br><br>" +
        "<div style='background:#14171f; border:1px solid rgba(91,192,222,0.4); border-radius:8px; padding:12px 14px; margin:10px 0; box-shadow:inset 0 1px 4px rgba(0,0,0,0.5);'>" +
          "<div style='font-size:0.8rem; color:#5bc0de; text-transform:uppercase; letter-spacing:0.8px; font-weight:700; margin-bottom:8px; text-align:center;'>🛡️ Verzwakkingsformule met Halveringsdiktes:</div>" +
          "<div style='display:flex; align-items:center; justify-content:center; gap:8px; font-family:monospace; font-size:1.15rem; color:#fff; flex-wrap:wrap;'>" +
            "<span style='font-weight:700; color:#5bc0de;'>I</span>" +
            "<span>=</span>" +
            "<span style='font-weight:700; color:#5bc0de;'>I<sub>0</sub></span>" +
            "<span>&times;</span>" +
            "<span>(0.5)<sup>d / HVL</sup></span>" +
          "</div>" +
          "<div style='font-size:0.82rem; color:#ccc; margin-top:8px; text-align:center;'>" +
            "<em>I₀ = dosistempo zonder afscherming &bull; d = materiaaldikte (mm) &bull; n = d / HVL = aantal halveringsdiktes</em>" +
          "</div>" +
        "</div><br>" +
        "• <strong>Praktische HVL-waarden in RT (<a href='afzettinggamma.html' class='ai-link' target='_blank'>afzettinggamma.html</a>):</strong><br>" +
        "&nbsp;&nbsp;&bull; <strong>Se-75:</strong> Lood <strong>2.0 mm</strong> &bull; Staal <strong>5 mm</strong> &bull; Beton <strong>30 mm</strong> &bull; Baksteen <strong>40 mm</strong><br>" +
        "&nbsp;&nbsp;&bull; <strong>Ir-192:</strong> Lood <strong>3.0 mm</strong> &bull; Staal <strong>13 mm</strong> &bull; Beton <strong>45 mm</strong> &bull; Baksteen <strong>60 mm</strong><br>" +
        "&nbsp;&nbsp;&bull; <strong>Co-60:</strong> Lood <strong>12.5 mm</strong> &bull; Staal <strong>21 mm</strong> &bull; Beton ca. <strong>62 mm</strong>"
      );
    }

    // 15. Loodfolie / Loodschermen / Versterkingsschermen in de cassette
    if (/\b(loodscherm|loodschermen|loodschermpje|loodschermpjes|versterkingsscherm|versterkingsschermen|versterkingsfolie|lood\s*folies?|lead\s*screens?|waarom\s+lood\s+in\s+(?:de\s+)?cassette)\b/i.test(lower)) {
      if (chips) chips.push("Loodletter B", "Strooistraling & Collimator", "Film D4 vs D7");
      return (
        "<strong>Loodfolie / Versterkingsschermen (Loodschermen / Lead Screens) in de Filmcassette:</strong><br><br>" +
        "In een röntgencassette ligt de film strak ingeklemd tussen een voor- en achter-<strong>loodfolie (versterkingsscherm)</strong>. Deze dunne loodschermen hebben twee belangrijke functies:<br><br>" +
        "• <strong>1. Versterkende werking (foto-elektronen):</strong><br>" +
        "Wanneer röntgen- of gammastraling op het lood valt, maakt het <strong>secundaire elektronen</strong> vrij die de filmemulsie veel efficiënter belichten dan de fotonen zelf. Dit verkort de belichtingstijd met een factor 2 tot 5.<br><br>" +
        "• <strong>2. Filterwerking tegen strooistraling:</strong><br>" +
        "Het voorloodscherm absorbeert zachte, laag-energetische <strong>strooistraling</strong> (die alleen maar een grijze sluier geeft), terwijl de harde, beeldvormende straling er gewoon doorheen gaat. Het achterloodscherm houdt bovendien <em>backscatter</em> tegen.<br><br>" +
        "• <strong>Richtwaarden voor schermdiktes (EN ISO 17636-1):</strong><br>" +
        "&nbsp;&nbsp;&bull; <strong>X-ray &lt; 100 kV:</strong> meestal geen loodscherm (te veel absorptie) of zeer dun.<br>" +
        "&nbsp;&nbsp;&bull; <strong>X-ray 100&ndash;250 kV &amp; Se-75:</strong> <strong>0.02 &ndash; 0.15 mm</strong> lood (vaak 0.027 mm in vacuümverpakte film).<br>" +
        "&nbsp;&nbsp;&bull; <strong>Ir-192 &amp; X-ray &gt; 250 kV:</strong> <strong>0.10 &ndash; 0.25 mm</strong> lood (voor- en achterscherm).<br>" +
        "&nbsp;&nbsp;&bull; <strong>Co-60:</strong> <strong>0.25 &ndash; 0.50 mm</strong> lood of staal/koper."
      );
    }

    // 16. Radioactief verval formule
    if (/\b(formule\s+(?:voor|van)\s+(?:het\s+)?(?:radioactief\s+)?verval|hoe\s+bereken\s+(?:je|ik|men)\s+(?:het\s+)?(?:radioactief\s+)?verval|vervalformule|verval\s+formule)\b/i.test(lower)) {
      if (chips) chips.push("Halfwaardetijd Ir-192 en Se-75", "Bronnenoverzicht", "verval2.html");
      return (
        "<strong>Formule voor Radioactief Verval (Activiteit berekenen):</strong><br><br>" +
        "De activiteit van een gammabron neemt exponentieel af met de tijd. Na elke <strong>halfwaardetijd (T<sub>&frac12;</sub>)</strong> is precies de helft van de oorspronkelijke activiteit over.<br><br>" +
        "<div style='background:#14171f; border:1px solid rgba(245,223,77,0.4); border-radius:8px; padding:12px 14px; margin:10px 0; box-shadow:inset 0 1px 4px rgba(0,0,0,0.5);'>" +
          "<div style='font-size:0.8rem; color:#F5DF4D; text-transform:uppercase; letter-spacing:0.8px; font-weight:700; margin-bottom:8px; text-align:center;'>☢️ Vervalformule:</div>" +
          "<div style='display:flex; align-items:center; justify-content:center; gap:8px; font-family:monospace; font-size:1.15rem; color:#fff; flex-wrap:wrap;'>" +
            "<span style='font-weight:700; color:#F5DF4D;'>A(t)</span>" +
            "<span>=</span>" +
            "<span style='font-weight:700; color:#F5DF4D;'>A<sub>0</sub></span>" +
            "<span>&times;</span>" +
            "<span>(0.5)<sup>t / T<sub>&frac12;</sub></sup></span>" +
          "</div>" +
          "<div style='font-size:0.82rem; color:#ccc; margin-top:8px; text-align:center;'>" +
            "<em>A₀ = beginactiviteit (Ci of GBq) &bull; t = verstreken tijd (dagen) &bull; T½ = halfwaardetijd (dagen)</em>" +
          "</div>" +
        "</div><br>" +
        "• <strong>Halfwaardetijden in RT:</strong><br>" +
        "&nbsp;&nbsp;&bull; <strong>Ir-192:</strong> <strong>73.83 dagen</strong> (~1% verval per dag)<br>" +
        "&nbsp;&nbsp;&bull; <strong>Se-75:</strong> <strong>119.78 dagen</strong> (~0.58% verval per dag)<br>" +
        "&nbsp;&nbsp;&bull; <strong>Co-60:</strong> <strong>5.27 jaar</strong> (1925 dagen)<br><br>" +
        "<small style='opacity:0.85;'>Tip: Vraag bijv. <em>\"Hoe sterk is 35598P over 30 dagen?\"</em> of open <a href='verval2.html' class='ai-link' target='_blank'>verval2.html</a>.</small>"
      );
    }

    // 17. Equivalentiefactor / Staalequivalent
    if (/\b(wat\s+is\s+(?:een\s+)?equivalentiefactor|uitleg\s+equivalentiefactor|hoe\s+werkt\s+(?:een\s+)?equivalentiefactor|wat\s+is\s+staalequivalent)\b/i.test(lower)) {
      if (chips) chips.push("Equivalentiefactor aluminium", "Equivalentiefactor koper", "Materiaal opzoeken");
      return (
        "<strong>Wat is een Radiografische Equivalentiefactor (Staalequivalent)?</strong><br><br>" +
        "Belichtingstabellen en grafieken voor röntgen- en gammastraling zijn standaard opgesteld voor <strong>koolstofstaal (factor = 1.0)</strong>. Omdat andere materialen een andere dichtheid en atoomnummer hebben, absorberen ze meer of minder straling.<br><br>" +
        "• <strong>Formule:</strong> <span class='rt-math-inline'>Staalequivalent = Wanddikte &times; Equivalentiefactor</span><br><br>" +
        "• <strong>Voorbeelden in de praktijk:</strong><br>" +
        "&nbsp;&nbsp;&bull; <strong>Aluminium:</strong> factor ca. <strong>0.18 &ndash; 0.35</strong> (lichter materiaal &rarr; 10 mm alu straalt ongeveer zoals 2&ndash;3.5 mm staal).<br>" +
        "&nbsp;&nbsp;&bull; <strong>RVS / Koolstofstaal:</strong> factor <strong>1.0</strong>.<br>" +
        "&nbsp;&nbsp;&bull; <strong>Koper / Nikkel / Inconel / Monel:</strong> factor ca. <strong>1.1 &ndash; 1.4</strong> (zwaarder &rarr; vereist langere belichtingstijd dan staal).<br>" +
        "&nbsp;&nbsp;&bull; <strong>Lood:</strong> factor <strong>4.0 &ndash; 14.0</strong> (sterk afhankelijk van kV/isotoop).<br><br>" +
        "<small style='opacity:0.85;'>Let op: De factor hangt ook af van de stralingsenergie (kV of isotoop). Vraag gerust naar een specifiek materiaal (bijv. <em>\"equivalentiefactor Inconel\"</em>).</small>"
      );
    }

    // 18. Filmverwerking / Donkere kamer
    if (/\b(donkere\s+kamer|film\s+ontwikkelen|stappen\s+(?:van\s+)?(?:film\s*)?ontwikkelen|ontwikkelproces|waarom\s+fixeren|functie\s+(?:van\s+)?(?:het\s+)?(?:stopbad|fixeerbad|ontwikkelbad))\b/i.test(lower)) {
      if (chips) chips.push("Wat is zwarting?", "Loodschermen", "Film D4 vs D7");
      return (
        "<strong>Filmverwerking in de Donkere Kamer (5 Stappen):</strong><br><br>" +
        "1. <strong>Ontwikkelen (Developer):</strong> Zet de belichte zilverhalogenide-kristallen (het latente beeld) chemisch om in zichtbaar zwart metallisch zilver. <em>(Standaard handontwikkeling: ca. 5 min bij 20 °C).</em><br>" +
        "2. <strong>Stopbad (Stop bath):</strong> Een zwak zuur bad dat de alkalische ontwikkelaar direct neutraliseert. Zo stopt de zwarting meteen en raakt het fixeerbad niet vervuild.<br>" +
        "3. <strong>Fixeren (Fixer):</strong> Lost alle <strong>onbelichte</strong> zilverzouten op zodat de film lichtbestendig en blijvend transparant wordt op de niet-belichte delen. <em>(Vuistregel: 2&times; de ophelderingstijd).</em><br>" +
        "4. <strong>Spoelen (Washing):</strong> Spoelt alle achtergebleven fixeerchemicaliën weg met stromend water. Slecht spoelen veroorzaakt na verloop van tijd bruine/gele vlekken en aantasting van het archiefbeeld.<br>" +
        "5. <strong>Drogen (Drying):</strong> Droogt de film stofvrij in de droogkast zonder waterdruppels (vaak met een beetje netmiddel / wetting agent)."
      );
    }

    // Default / fallback
    return geefOpstellingEnGroeperingInfo(params, vraagTekst, chips);
  }

  // 11. KV-regel Calculator (kvregel.html)
  function berekenKVRegel(params, vraagTekst, chips = []) {
    const lower = vraagTekst.toLowerCase();

    // Materiaal bepalen (Staal, Aluminium, HDPE)
    let materiaal = "Staal";
    const matNaam = ((params && params.materiaalNaam) || "").toLowerCase();
    const isAluBrons =
      matNaam.includes("aluminiumbrons") ||
      matNaam.includes("alubrons") ||
      /\b(aluminiumbrons|alubrons)\b/i.test(lower);
    if (
      !isAluBrons &&
      (/\b(aluminium|alu)\b/i.test(lower) ||
        matNaam.includes("aluminium") ||
        matNaam.includes("alu"))
    ) {
      materiaal = "Aluminium";
    } else if (/\b(hdpe|pe|polyethyleen|kunststof)\b/i.test(lower) || matNaam.includes("hdpe") || matNaam.includes("pe")) {
      materiaal = "HDPE";
    }

    // Doorstraalde dikte bepalen
    let doorstr = null;
    let uitlegDikte = "";
    let isEnkelwand = false;

    if (params.doorstraaldeDikte) {
      doorstr = params.doorstraaldeDikte;
      uitlegDikte = `doorstraalde dikte van <strong>${doorstr.toFixed(1)} mm</strong>`;
    } else if (params.wanddikte) {
      const wt = params.wanddikte;
      isEnkelwand =
        params.isPlaat ||
        params.technique === "SWSI" ||
        /\b(enkelwand|enkelwandig|swsi|plaat|enkele\s*wand)\b/i.test(lower);
      if (isEnkelwand) {
        doorstr = wt;
        uitlegDikte = `enkelwandige dikte van <strong>${wt} mm</strong> (plaat / SWSI)`;
      } else {
        doorstr = 2 * wt;
        uitlegDikte = `dubbelwandig doorstraald <strong>${doorstr.toFixed(1)} mm</strong> (2 &times; ${wt} mm)`;
      }
    }

    if (!doorstr || doorstr <= 0) {
      if (typeof actiefGespreksGeheugen !== "undefined" && actiefGespreksGeheugen) {
        actiefGespreksGeheugen.verwachtParameter = "wanddikte";
      }
      if (chips) chips.push("4 mm dik", "6 mm dik", "8 mm dik", "10 mm dik", "Aluminium", "HDPE");
      return "Om de buisspanning volgens de <strong>KV-regel</strong> te berekenen heb ik de <strong>wanddikte</strong> of <strong>doorstraalde dikte</strong> (in mm) nodig. Wat is de dikte?";
    }

    let kv = 0;
    let extraMax = 0;
    if (materiaal === "Staal") {
      kv = Math.round(100 + 8 * doorstr);
      extraMax = 50;
    } else if (materiaal === "Aluminium") {
      kv = Math.round(50 + 2 * doorstr);
      extraMax = 30;
    } else if (materiaal === "HDPE") {
      kv = Math.round(20 + 0.2 * doorstr);
      extraMax = 0;
    }

    if (params) params.kv = kv;
    if (typeof actiefGespreksGeheugen !== "undefined" && actiefGespreksGeheugen) {
      actiefGespreksGeheugen.kv = kv;
    }

    let enkelwandAlt = "";
    if (!isEnkelwand && !params.diameter && params.wanddikte) {
      let kvEnkel = 0;
      let maxEnkel = 0;
      if (materiaal === "Staal") {
        kvEnkel = Math.round(100 + 8 * params.wanddikte);
        maxEnkel = kvEnkel + 50;
      } else if (materiaal === "Aluminium") {
        kvEnkel = Math.round(50 + 2 * params.wanddikte);
        maxEnkel = kvEnkel + 30;
      } else if (materiaal === "HDPE") {
        kvEnkel = Math.round(20 + 0.2 * params.wanddikte);
        maxEnkel = kvEnkel;
      }
      const maxEnkelTxt = maxEnkel > kvEnkel ? ` (max. <strong>${maxEnkel} kV</strong>)` : "";
      enkelwandAlt = `<br><small style="opacity:0.85;">Indien enkelwandig / plaat (${params.wanddikte} mm): <strong>${kvEnkel} kV</strong>${maxEnkelTxt}.</small>`;
      if (chips) chips.push("Plaat / enkelwandig", "Buis dubbelwandig");
    }

    let maminToelichting = "";
    if (/\b(mamin|ma[\*\-\s]*min|tijd|belichtingstijd)\b/i.test(lower)) {
      maminToelichting = `<br><small style="opacity:0.9;">💡 <em>Opmerking over mA&middot;minuten / belichtingstijd:</em> R.A.D.I. kan voor een röntgenbuis geen directe stralingstijd of mA&middot;min waarde geven omdat elke röntgenbuis een beetje anders is. Lees het vereiste aantal mA&middot;min af op de buistabel van de betreffende buis en reken deze via <a href="buistabel.html" class="ai-link" target="_blank">buistabel.html</a> om naar belichtingstijd.</small>`;
    }

    const maxTekst = extraMax > 0 ? `, maximaal <strong>${kv + extraMax} kV</strong> conform EN ISO 17636-1` : "";
    return `Voor <strong>${materiaal}</strong> bij ${uitlegDikte}: <strong>${kv} kV</strong> volgens de KV-regel${maxTekst}.${enkelwandAlt}${maminToelichting} <small style="opacity:0.85;">(zie <a href="kvregel.html" class="ai-link" target="_blank">kvregel.html</a>)</small>`;
  }

  // 11b. Buistabel / mA*min omrekenen naar belichtingstijd (buistabel.html)
  function berekenBuistabel(params, vraagTekst, chips = []) {
    let mamin = params.maminVal;
    let ma = params.maVal;

    // Check of gebruiker vraagt: "hoeveel mA*min is X minuten stralen met Y mA?"
    const matchReversed = vraagTekst.match(/(?:hoeveel|wat\s+is)\s*(?:de\s+)?(?:ma\s*\*?\s*min|mamin).*?(\d+(?:[.,]\d+)?)\s*(?:minuut|minuten|min\b).*?(\d+(?:[.,]\d+)?)\s*ma\b/i) ||
                          vraagTekst.match(/(\d+(?:[.,]\d+)?)\s*(?:minuut|minuten|min\b).*?(\d+(?:[.,]\d+)?)\s*ma\b.*?(?:hoeveel|wat\s+is)\s*(?:de\s+)?(?:ma\s*\*?\s*min|mamin)/i);
    if (matchReversed) {
      const minVal = parseFloat(matchReversed[1].replace(",", "."));
      const maV = parseFloat(matchReversed[2].replace(",", "."));
      if (!isNaN(minVal) && !isNaN(maV) && maV > 0) {
        const berekendMaMin = minVal * maV;
        if (actiefGespreksGeheugen) {
          actiefGespreksGeheugen.maminVal = berekendMaMin;
          actiefGespreksGeheugen.maVal = maV;
          actiefGespreksGeheugen.verwachtParameter = null;
        }
        return `Bij een belichtingstijd van ${minVal} minuten en ${maV} mA:<br>` +
               `• Berekende buiswaarde: <strong>${berekendMaMin.toFixed(1)} mA*min</strong>.<br>` +
               `<small style="opacity: 0.85;">(Berekend volgens <a href="buistabel.html" class="ai-link" target="_blank">buistabel.html</a>: ${minVal} min &times; ${maV} mA = ${berekendMaMin.toFixed(1)} mA*min).</small>`;
      }
    }

    if (!mamin && !ma) {
      if (typeof actiefGespreksGeheugen !== "undefined" && actiefGespreksGeheugen) {
        actiefGespreksGeheugen.verwachtParameter = "maminVal";
      }
      if (chips) {
        chips.push("20 mA*min bij 3 mA", "30 mA*min bij 4 mA", "32 mA*min bij 2.5 mA");
      }
      return "Met de buistabel bereken je direct de stralingstijd uit het aantal <strong>mA*min</strong> en de buisstroom in <strong>mA</strong> (tijd = mA*min &divide; mA).<br><br>Hoeveel <strong>mA*min</strong> heb je afgelezen en met hoeveel <strong>mA</strong> wil je stralen?";
    }

    if (!mamin) {
      if (typeof actiefGespreksGeheugen !== "undefined" && actiefGespreksGeheugen) {
        actiefGespreksGeheugen.verwachtParameter = "maminVal";
      }
      if (chips) {
        chips.push("10 mA*min", "20 mA*min", "30 mA*min", "32 mA*min", "40 mA*min");
      }
      return `Je hebt een buisstroom van ${ma} mA gekozen. Hoeveel <strong>mA*min</strong> heb je afgelezen uit de buistabel?`;
    }

    if (!ma || ma <= 0) {
      if (typeof actiefGespreksGeheugen !== "undefined" && actiefGespreksGeheugen) {
        actiefGespreksGeheugen.verwachtParameter = "maVal";
      }
      if (chips) {
        chips.push("2 mA", "2.5 mA", "3 mA", "3.5 mA", "4 mA", "5 mA");
      }
      return `Je hebt ${mamin} mA*min opgegeven. Met hoeveel <strong>mA</strong> (buisstroom) wil je stralen?`;
    }

    const totalMinutes = mamin / ma;
    let m = Math.floor(totalMinutes);
    let s = Math.round((totalMinutes - m) * 60);
    if (s === 60) { m++; s = 0; }
    let tijdTekst = "";
    if (m === 0) {
      tijdTekst = `${s} seconden`;
    } else if (s === 0) {
      tijdTekst = m === 1 ? "1 minuut" : `${m} minuten`;
    } else {
      tijdTekst = `${m === 1 ? "1 minuut" : `${m} minuten`} en ${s} seconden`;
    }

    const totalSec = Math.round(totalMinutes * 60);
    if (actiefGespreksGeheugen) {
      actiefGespreksGeheugen.maminVal = mamin;
      actiefGespreksGeheugen.maVal = ma;
      actiefGespreksGeheugen.focusBegintijdSec = totalSec;
      actiefGespreksGeheugen.laatsteStralingstijdSec = totalSec;
      actiefGespreksGeheugen.verwachtParameter = null;
    }

    // Synchroniseer velden op buistabel.html indien geopend
    if (typeof document !== "undefined") {
      const elMaMin = document.getElementById("maMinInput");
      const elMa = document.getElementById("maInput");
      if (elMaMin) elMaMin.value = mamin;
      if (elMa) elMa.value = ma;
      if (typeof window !== "undefined" && typeof window.calculateTime === "function") {
        window.calculateTime();
      }
    }

    if (chips) {
      const alternatives = [2, 2.5, 3, 3.5, 4, 5].filter((a) => a !== ma);
      alternatives.slice(0, 3).forEach((a) => chips.push(`${a} mA`));
    }

    return `Voor ${mamin} mA*min bij een buisstroom van ${ma} mA:<br>` +
           `• Belichtingstijd: <strong>${tijdTekst}</strong> (${totalMinutes.toFixed(2)} min).<br>` +
           `<small style="opacity: 0.85;">(Berekend volgens <a href="buistabel.html" class="ai-link" target="_blank">buistabel.html</a>: ${mamin} &divide; ${ma} = ${totalMinutes.toFixed(2)} minuten).</small>`;
  }

  // 12. Gevulde Leiding Calculator (gevuldeleiding.html)
  function berekenGevuldeLeiding(params, vraagTekst, chips = []) {
    const lower = vraagTekst.toLowerCase();

    // Medium en dichtheid
    const DICHTHEDEN = {
      water: { naam: "Water", rho: 997 },
      aardolie: { naam: "Aardolie", rho: 900 },
      olie: { naam: "Aardolie", rho: 900 },
      benzeen: { naam: "Benzeen", rho: 879 },
      benzine: { naam: "Benzine", rho: 720 },
      aceton: { naam: "Aceton", rho: 791 },
      chloorbenzeen: { naam: "Chloorbenzeen", rho: 1106 },
    };

    let mediumNaam = params.mediumNaam || null;
    let rho = params.mediumDichtheid || null;

    if (!rho) {
      for (const [kMed, objMed] of Object.entries(DICHTHEDEN)) {
        if (new RegExp(`\\b${kMed}\\b`, "i").test(lower)) {
          mediumNaam = objMed.naam;
          rho = objMed.rho;
          break;
        }
      }
    }

    const matchCustomRho = lower.match(/(?:dichtheid|rho|\b\u03c1\b)\s*(?:van|is|:)?\s*(\d+(?:[.,]\d+)?)\s*(?:kg\/m[3³])?/i) ||
                           lower.match(/\b(\d{3,4})\s*kg\/m[3³]/i);
    if (matchCustomRho) {
      rho = parseFloat(matchCustomRho[1].replace(",", "."));
      if (!mediumNaam) mediumNaam = "Vloeistof (maatwerk)";
    }

    if (!rho) {
      mediumNaam = "Water";
      rho = 997;
    }

    if (!params.diameter) {
      if (typeof actiefGespreksGeheugen !== "undefined" && actiefGespreksGeheugen) {
        actiefGespreksGeheugen.verwachtParameter = "diameter";
      }
      if (chips) chips.push("2 duimer", "3 duimer", "4 duimer", "6 duimer", "8 duimer");
      return "Voor de berekening van een gevulde leiding heb ik de <strong>diameter</strong> van de leiding nodig. Wat is de diameter?";
    }

    if (!params.wanddikte) {
      if (typeof actiefGespreksGeheugen !== "undefined" && actiefGespreksGeheugen) {
        actiefGespreksGeheugen.verwachtParameter = "wanddikte";
      }
      if (chips) chips.push("4 mm dik", "6 mm dik", "7.11 mm (Sch 40)", "8 mm dik", "10 mm dik");
      const schInfo = zoekScheduleInfo(params.diameter, "40");
      let voorbeeldTxt = "";
      if (schInfo && schInfo.gevonden) {
        const bDia = params.diameter - 2 * schInfo.wt;
        const stEq = (rho / 7800) * bDia;
        voorbeeldTxt = `<br><small style="opacity:0.9;">(Ter indicatie bij deze onstream opname: bij <strong>Schedule 40 (${schInfo.wt} mm wanddikte)</strong> gevuld met ${mediumNaam} is de inwendige kolom ${bDia.toFixed(1)} mm en bedraagt het staalequivalent van de vloeistof <strong>+${stEq.toFixed(2)} mm extra staaldikte</strong>, totaal doorstraald ${(2 * schInfo.wt + stEq).toFixed(1)} mm; zie <a href="gevuldeleiding.html" class="ai-link" target="_blank">gevuldeleiding.html</a>).</small>`;
      }
      return `Voor deze <strong>onstream opname van een gevulde ${formatMmNaarDuimLabel(params.diameter)} leiding</strong>: wat is de <strong>wanddikte</strong> van de leiding?${voorbeeldTxt}`;
    }

    const D = params.diameter;
    const t = params.wanddikte;
    const binnenDia = D - 2 * t;
    if (binnenDia <= 0) {
      return `Onmogelijke leidingafmeting: buitendiameter ${D} mm is kleiner dan 2 &times; wanddikte (${2 * t} mm).`;
    }

    const staalEquivalent = (rho / 7800) * binnenDia;
    const totaleDikte = 2 * t + staalEquivalent;
    const totDikteRond = Number(totaleDikte.toFixed(2));

    // Belangrijk: opslaan als doorstraalde dikte zodat vervolgberekeningen (zoals stralingstijd) dit direct gebruiken
    params.doorstraaldeDikte = totDikteRond;
    params.isGevuldeLeiding = true;
    params.mediumNaam = mediumNaam;
    params.mediumDichtheid = rho;

    if (typeof actiefGespreksGeheugen !== "undefined" && actiefGespreksGeheugen) {
      actiefGespreksGeheugen.doorstraaldeDikte = totDikteRond;
      actiefGespreksGeheugen.isGevuldeLeiding = true;
      actiefGespreksGeheugen.mediumNaam = mediumNaam;
      actiefGespreksGeheugen.mediumDichtheid = rho;
    }

    return (
      `Gevulde leiding <strong>${formatMmNaarDuimLabel(D)}</strong> (${t} mm wanddikte) gevuld met <strong>${mediumNaam}</strong> (&rho; = ${rho} kg/m³):<br>` +
      `• Vloeistofkolom inwendig: <strong>${binnenDia.toFixed(1)} mm</strong><br>` +
      `• Staalequivalent inhoud: <strong>${staalEquivalent.toFixed(2)} mm</strong> staal<br>` +
      `• <strong>Totale doorstraalde dikte: ${totDikteRond} mm</strong> (2t + staalequivalent).<br>` +
      `<small style="opacity: 0.85;">(zie <a href="gevuldeleiding.html" class="ai-link" target="_blank">gevuldeleiding.html</a>)</small>`
    );
  }

  // 13. Bronverval Calculator (verval2.html)
  function berekenBronVerval(params, vraagTekst, chips = []) {
    const lower = vraagTekst.toLowerCase();
    const today = new Date();

    // 1. Isotoop en bronspecificatie
    let bronNaam = "";
    let isotoop = "Se75";
    let halfwaardetijd = 120;
    let initAct = null;
    let initDatumStr = null;
    let initDateObj = null;

    // Check specifieke broncode uit bronnenData
    let specifiekeBron = null;
    if (Array.isArray(bronnenData)) {
      specifiekeBron = bronnenData.find((b) => lower.includes(b.name.toLowerCase()));
      if (!specifiekeBron && params.bronTekst) {
        specifiekeBron = bronnenData.find((b) => params.bronTekst.toLowerCase().includes(b.name.toLowerCase()));
      }
    }

    if (specifiekeBron) {
      bronNaam = specifiekeBron.name;
      isotoop = specifiekeBron.type;
      halfwaardetijd = isotoop === "Ir192" ? 74 : (isotoop === "Co60" ? 1925 : 120);
      initAct = specifiekeBron.initialActivity;
      initDatumStr = specifiekeBron.date;
      const p = initDatumStr.split("-");
      initDateObj = new Date(`${p[2]}-${p[1]}-${p[0]}`);
    } else {
      if (/ir[-\s]?192|iridium/i.test(lower) || params.bronType === "Ir192") {
        isotoop = "Ir192";
        halfwaardetijd = 74;
      } else if (/co[-\s]?60|kobalt/i.test(lower) || params.bronType === "Co60") {
        isotoop = "Co60";
        halfwaardetijd = 1925;
      } else {
        isotoop = "Se75";
        halfwaardetijd = 120;
      }

      if (params.activiteit) {
        initAct = params.activiteit;
        initDateObj = today;
      }
    }

    if (!initAct || initAct <= 0) {
      if (typeof actiefGespreksGeheugen !== "undefined" && actiefGespreksGeheugen) {
        actiefGespreksGeheugen.verwachtParameter = "activiteit";
      }
      if (chips) {
        if (Array.isArray(bronnenData)) {
          bronnenData.forEach((b) => {
            const act = berekenHuidigeActiviteit(b.initialActivity, b.type, b.date, today);
            chips.push(`${b.name} (${act.toFixed(1)} Ci)`);
          });
        }
        chips.push("50 Ci Se-75", "70 Ci Ir-192", "30 Ci Se-75");
      }
      return "Welke bron (bijv. 97969M) of hoeveel <strong>Curie</strong> wil je laten vervallen?";
    }

    // 2. Doeldatum of tijdsverschil bepalen
    let doelDateObj = params.vervalDoelDatum || null;
    let daysDiff = params.vervalDagen !== null && params.vervalDagen !== undefined ? params.vervalDagen : null;

    if (!doelDateObj && daysDiff === null) {
      const mDag = lower.match(/(?:over|na|in)\s*(\d+(?:[.,]\d+)?)\s*dag(?:en)?/i);
      if (mDag) daysDiff = parseFloat(mDag[1].replace(",", "."));
      const mWk = lower.match(/(?:over|na|in)\s*(\d+(?:[.,]\d+)?)\s*we(?:ek|ken)/i);
      if (mWk) daysDiff = parseFloat(mWk[1].replace(",", ".")) * 7;
      const mMnd = lower.match(/(?:over|na|in)\s*(\d+(?:[.,]\d+)?)\s*maand(?:en)?/i);
      if (mMnd) daysDiff = parseFloat(mMnd[1].replace(",", ".")) * 30.4375;
      const mJr = lower.match(/(?:over|na|in)\s*(\d+(?:[.,]\d+)?)\s*jaar/i);
      if (mJr) daysDiff = parseFloat(mJr[1].replace(",", ".")) * 365.25;

      const mDat = lower.match(/\b(\d{1,2})[-\/](\d{1,2})[-\/](\d{2,4})\b/);
      if (mDat) {
        let d = parseInt(mDat[1], 10);
        let m = parseInt(mDat[2], 10) - 1;
        let y = parseInt(mDat[3], 10);
        if (y < 100) y += 2000;
        doelDateObj = new Date(y, m, d);
      }
    }

    if (!doelDateObj && (daysDiff === null || isNaN(daysDiff))) {
      if (typeof actiefGespreksGeheugen !== "undefined" && actiefGespreksGeheugen) {
        actiefGespreksGeheugen.verwachtParameter = "vervalDagen";
      }
      if (chips) chips.push("Over 30 dagen", "Over 60 dagen", "Over 90 dagen", "Over 120 dagen");
      return `Over hoeveel dagen (of op welke datum) wil je de resterende activiteit van <strong>${bronNaam || isotoop}</strong> berekenen?`;
    }

    if (specifiekeBron) {
      const actVandaag = berekenHuidigeActiviteit(specifiekeBron.initialActivity, specifiekeBron.type, specifiekeBron.date, today);
      if (doelDateObj) {
        const ciDoel = berekenHuidigeActiviteit(specifiekeBron.initialActivity, specifiekeBron.type, specifiekeBron.date, doelDateObj);
        const dStr = `${String(doelDateObj.getDate()).padStart(2, "0")}-${String(doelDateObj.getMonth() + 1).padStart(2, "0")}-${doelDateObj.getFullYear()}`;
        return `Bron <strong>${specifiekeBron.name}</strong> (${specifiekeBron.typeLabel || specifiekeBron.type}, <i>T</i><sub>&frac12;</sub> = ${halfwaardetijd} d, nu ${actVandaag.toFixed(2)} Ci):<br>` +
               `• Activiteit op <strong>${dStr}</strong>: <strong>${ciDoel.toFixed(2)} Ci</strong>.<br>` +
               `<small style="opacity:0.85;">(zie <a href="verval2.html" class="ai-link" target="_blank">verval2.html</a>)</small>`;
      } else if (params.vervalInVerleden) {
        const verledenDatum = new Date(today.getTime() - daysDiff * 24 * 3600 * 1000);
        const ciVerleden = actVandaag * Math.pow(2, daysDiff / halfwaardetijd);
        const dStr = `${String(verledenDatum.getDate()).padStart(2, "0")}-${String(verledenDatum.getMonth() + 1).padStart(2, "0")}-${verledenDatum.getFullYear()}`;
        return `Bron <strong>${specifiekeBron.name}</strong> (${specifiekeBron.typeLabel || specifiekeBron.type}, nu ${actVandaag.toFixed(2)} Ci):<br>` +
               `• <strong>${Math.round(daysDiff)} dagen geleden</strong> (${dStr}): <strong>${ciVerleden.toFixed(2)} Ci</strong>.<br>` +
               `<small style="opacity:0.85;">(zie <a href="verval2.html" class="ai-link" target="_blank">verval2.html</a>)</small>`;
      } else {
        const doelDatum = new Date(today.getTime() + daysDiff * 24 * 3600 * 1000);
        const ciDoel = actVandaag / Math.pow(2, daysDiff / halfwaardetijd);
        const dStr = `${String(doelDatum.getDate()).padStart(2, "0")}-${String(doelDatum.getMonth() + 1).padStart(2, "0")}-${doelDatum.getFullYear()}`;
        return `Bron <strong>${specifiekeBron.name}</strong> (${specifiekeBron.typeLabel || specifiekeBron.type}, nu ${actVandaag.toFixed(2)} Ci):<br>` +
               `• Over <strong>${Math.round(daysDiff)} dagen</strong> (${dStr}): nog <strong>${ciDoel.toFixed(2)} Ci</strong> (vervalfactor ${(ciDoel / actVandaag * 100).toFixed(1)}%).<br>` +
               `<small style="opacity:0.85;">(zie <a href="verval2.html" class="ai-link" target="_blank">verval2.html</a>)</small>`;
      }
    } else {
      let ciDoel = 0;
      let dStr = "";
      let tijdUitleg = "";
      if (doelDateObj) {
        const diffDays = (doelDateObj - today) / (1000 * 3600 * 24);
        ciDoel = initAct / Math.pow(2, diffDays / halfwaardetijd);
        dStr = `${String(doelDateObj.getDate()).padStart(2, "0")}-${String(doelDateObj.getMonth() + 1).padStart(2, "0")}-${doelDateObj.getFullYear()}`;
        tijdUitleg = `op ${dStr}`;
      } else {
        const doelDatum = new Date(today.getTime() + daysDiff * 24 * 3600 * 1000);
        ciDoel = initAct / Math.pow(2, daysDiff / halfwaardetijd);
        dStr = `${String(doelDatum.getDate()).padStart(2, "0")}-${String(doelDatum.getMonth() + 1).padStart(2, "0")}-${doelDatum.getFullYear()}`;
        tijdUitleg = `over ${Math.round(daysDiff)} dagen (${dStr})`;
      }

      const isoLabel = isotoop === "Ir192" ? "Ir-192" : (isotoop === "Co60" ? "Co-60" : "Se-75");
      if (params.vervalInVerleden && !doelDateObj) {
        // "wat was een 50 Ci Ir-192 bron 30 dagen geleden?" -> terugrekenen (grotere activiteit!)
        // "30 dagen geleden was hij 50 Ci, hoeveel is hij nu?" -> vooruit vervallen naar nu!
        const vraagtWatHijNuHeeft =
          /\b(nu|vandaag|heden|nog|over\s+is|resterend)\b/i.test(lower) &&
          !/\bwat\s+was\b/i.test(lower);
        if (vraagtWatHijNuHeeft) {
          return `Bronverval <strong>${isoLabel}</strong> (<i>T</i><sub>&frac12;</sub> = ${halfwaardetijd} dagen):<br>` +
                 `• Activiteit <strong>${Math.round(daysDiff)} dagen geleden</strong>: ${initAct.toFixed(1)} Ci<br>` +
                 `• Huidige activiteit <strong>nu (na ${Math.round(daysDiff)} dagen verval)</strong>: <strong>${Math.max(0, ciDoel).toFixed(2)} Ci</strong> (resterend: ${(Math.max(0, ciDoel) / initAct * 100).toFixed(1)}%).<br>` +
                 `<small style="opacity:0.85;">(zie <a href="verval2.html" class="ai-link" target="_blank">verval2.html</a>)</small>`;
        } else {
          const verledenDatum = new Date(today.getTime() - daysDiff * 24 * 3600 * 1000);
          const ciVerleden = initAct * Math.pow(2, daysDiff / halfwaardetijd);
          const dStrVerleden = `${String(verledenDatum.getDate()).padStart(2, "0")}-${String(verledenDatum.getMonth() + 1).padStart(2, "0")}-${verledenDatum.getFullYear()}`;
          return `Bronverval <strong>${isoLabel}</strong> (<i>T</i><sub>&frac12;</sub> = ${halfwaardetijd} dagen, nu ${initAct.toFixed(1)} Ci):<br>` +
                 `• Activiteit <strong>${Math.round(daysDiff)} dagen geleden</strong> (${dStrVerleden}): <strong>${ciVerleden.toFixed(2)} Ci</strong>.<br>` +
                 `<small style="opacity:0.85;">(zie <a href="verval2.html" class="ai-link" target="_blank">verval2.html</a>)</small>`;
        }
      }
      return `Bronverval <strong>${isoLabel}</strong> (<i>T</i><sub>&frac12;</sub> = ${halfwaardetijd} dagen):<br>` +
             `• Beginactiviteit: ${initAct.toFixed(1)} Ci<br>` +
             `• Activiteit ${tijdUitleg}: <strong>${Math.max(0, ciDoel).toFixed(2)} Ci</strong> (resterend: ${(Math.max(0, ciDoel) / initAct * 100).toFixed(1)}%).<br>` +
             `<small style="opacity:0.85;">(zie <a href="verval2.html" class="ai-link" target="_blank">verval2.html</a>)</small>`;
    }
  }

  // 15. BKI Draadje Berekening (Draadjesv2.html)
  function berekenBkiDraadje(params, vraagTekst, chips = []) {
    const lower = (vraagTekst || "").toLowerCase();

    // 0a. Directe vraag: "Welke BKI houder moet ik pakken voor draadje W13?" (Q48)
    const matchSpecifiekDraadje = lower.match(/\bw\s*[-]?\s*(\d{1,2})\b/i);
    if (matchSpecifiekDraadje && /\b(houder|welke\s+bki|pakken|staat\s+op)\b/i.test(lower) && !params.wanddikte) {
      const wNum = parseInt(matchSpecifiekDraadje[1], 10);
      const bkiInfo = geefBkiMateriaalgroepInfo(params.materiaalNaam || "staal");
      const matGrp = params.materiaalNaam && bkiInfo ? bkiInfo.isoGroup : "XX";
      const sets = geefBkiSetsVoorDraad(wNum, matGrp);
      const setsFE = geefBkiSetsVoorDraad(wNum, "FE");
      return `Draadje <strong>W${wNum}</strong> staat op ISO 19232-1 BKI houder: <strong>${sets}</strong>${matGrp === "XX" ? ` (voor staal/RVS is dit <strong>${setsFE}</strong>, waarbij XX staat voor de materiaalgroep FE, CU, AL of TI)` : ""}.`;
    }

    // 0b. Directe vraag: "Waar moet ik de BKI plaatsen (bronzijde of filmzijde)?" (Q53) of "Hoeveel draadjes moeten er zichtbaar zijn?" (Q52)
    if (/\bhoeveel\s+draadjes\b.*?\b(?:zichtbaar|zien)\b/i.test(lower) && !params.wanddikte) {
      return `Volgens <strong>EN ISO 17636-1</strong> en <strong>ASME Section V</strong> moet op de opname het <strong>vereiste draadje (en alle dikkere draden t/m dat draadnummer)</strong> ononderbroken zichtbaar zijn over een lengte van ten minste <strong>10 mm</strong> in het uniforme zwartingsgebied van de las.`;
    }
    if (/\b(waar\s+moet|aan\s+welke\s+(?:zijde|kant)|waar\s+plaats|waar\s+leg|bronzijde\s+of\s+filmzijde)\b/i.test(lower) && !params.wanddikte) {
      if (/\b(panoram|panoramisch|centraal|opstelling\s*5|swsi)\b/i.test(lower) || params.optie === "1" || params.technique === "SWSI") {
        return `Bij een <strong>panoramische / centrale opname (Opstelling 5 / A, SWSI)</strong> en bij alle andere SWSI-opnames moet de BKI aan de <strong>bronzijde (binnenzijde van de leiding)</strong> worden geplaatst.<br>` +
               `<small style="opacity:0.85;">(Alleen als de bronzijde fysiek niet toegankelijk is en dit volgens de procedure is vastgelegd, mag de BKI aan de filmzijde worden geplaatst).</small>`;
      }
      if (/\b(dwsi|opstelling\s*(?:13|14|e\b))\b/i.test(lower) || params.technique === "DWSI") {
        return `Bij een <strong>DWSI opname (Opstelling 13 / 14 / E)</strong> wordt het filmgedeelte van de las beoordeeld en wordt de BKI standaard aan de <strong>filmzijde</strong> geplaatst.`;
      }
      return `<strong>BKI plaatsing volgens EN ISO 17636-1 &amp; ASME Section V:</strong><br>` +
             `• <strong>SWSI (Opstelling 1, 2/C, 5/A panoramisch, 8/B excentrisch):</strong> BKI aan de <strong>bronzijde</strong>.<br>` +
             `• <strong>DWDI (Opstelling 11/F ovaaltje, 12/G superpositie):</strong> BKI aan de <strong>bronzijde</strong> (bovenzijde buis).<br>` +
             `• <strong>DWSI (Opstelling 13/14/E):</strong> BKI aan de <strong>filmzijde</strong>.`;
    }

    if (!params.wanddikte) {
      if (typeof actiefGespreksGeheugen !== "undefined" && actiefGespreksGeheugen) {
        actiefGespreksGeheugen.verwachtParameter = "wanddikte";
      }
      if (chips) chips.push("4 mm dik", "6 mm dik", "8 mm dik", "10 mm dik");
      return "Om het vereiste BKI draadje te bepalen moet ik de <strong>wanddikte</strong> (in mm) weten. Wat is de wanddikte van het materiaal?";
    }
    if (!params.procedure) {
      if (typeof actiefGespreksGeheugen !== "undefined" && actiefGespreksGeheugen) {
        actiefGespreksGeheugen.verwachtParameter = "procedure";
      }
      if (/\b(iso|en)\b/i.test(lower)) {
        if (chips) chips.push("Klasse B", "Klasse A");
        return `Volgens welke ISO kwaliteitsklasse moet het draadje voor ${params.wanddikte} mm wanddikte worden bepaald: <strong>EN Klasse A</strong> of <strong>EN Klasse B</strong>?`;
      }
      if (chips) chips.push("Klasse B", "Klasse A", "ASME");
      return `Volgens welke norm of kwaliteitsklasse (EN Klasse A, EN Klasse B of ASME) moet het draadje voor ${params.wanddikte} mm wanddikte worden bepaald?`;
    }

    const t = params.wanddikte;
    const proc = params.procedure;
    const De = params.diameter;

    let tech = "SWSI"; // Standaard SWSI (enkelwandig) tenzij een buisdiameter of specifieke dubbelwandige techniek is opgegeven
    if (params.technique === "DWSI") {
      tech = "DWSI";
    } else if (params.technique === "DWDI" || params.ovaaltje === "Ja" || (De && De <= 100 && params.technique !== "SWSI")) {
      tech = "DWDI";
    } else if (De && De > 100 && params.technique !== "SWSI" && params.optie !== "1" && params.optie !== "2") {
      tech = "DWSI";
    } else if (params.isPlaat || params.technique === "SWSI" || params.optie === "1" || params.optie === "2" || !De) {
      tech = "SWSI";
    }

    const bronTekst = (params.bronTekst || "").toLowerCase();
    const bronType = params.bronType || "";
    let bron = "X-ray";
    let bronLabel = "X-ray";
    if (bronType === "Se75" || /se[-\s]?75|selenium|seleen/i.test(bronTekst)) {
      bron = "Se75";
      bronLabel = "Se-75";
    } else if (bronType === "Ir192" || /ir[-\s]?192|iridium/i.test(bronTekst)) {
      bron = "Ir192";
      bronLabel = "Ir-192";
    } else if (bronType === "Co60" || /co[-\s]?60|kobalt/i.test(bronTekst)) {
      bron = "Co60";
      bronLabel = "Co-60";
    } else if (/x[-\s]?ray|röntgen|rontgen|buis/i.test(bronTekst)) {
      bron = "X-ray";
      bronLabel = "X-ray";
    }

    let wire = "Onbekend";
    let heeftVermindering = false;
    let verminderingReden = "";
    let altGammaInfo = "";
    const doorstraaldeDikte = tech === "SWSI" ? t : 2 * t;

    if (proc === "EN-A") {
      const penetratedThickness = doorstraaldeDikte;
      if (tech === "SWSI") {
        if (penetratedThickness <= 1.2) wire = "W18";
        else if (penetratedThickness <= 2.0) wire = "W17";
        else if (penetratedThickness <= 3.5) wire = "W16";
        else if (penetratedThickness <= 5.0) wire = "W15";
        else if (penetratedThickness <= 7.0) wire = "W14";
        else if (penetratedThickness <= 10.0) wire = "W13";
        else if (penetratedThickness <= 15.0) wire = "W12";
        else if (penetratedThickness <= 25.0) wire = "W11";
        else if (penetratedThickness <= 32.0) wire = "W10";
        else if (penetratedThickness <= 40.0) wire = "W9";
        else if (penetratedThickness <= 55.0) wire = "W8";
        else if (penetratedThickness <= 85.0) wire = "W7";
        else wire = "W6";
      } else if (tech === "DWSI") {
        if (penetratedThickness <= 1.2) wire = "W18";
        else if (penetratedThickness <= 2.0) wire = "W17";
        else if (penetratedThickness <= 3.5) wire = "W16";
        else if (penetratedThickness <= 5.0) wire = "W15";
        else if (penetratedThickness <= 10.0) wire = "W14";
        else if (penetratedThickness <= 15.0) wire = "W13";
        else if (penetratedThickness <= 22.0) wire = "W12";
        else if (penetratedThickness <= 38.0) wire = "W11";
        else if (penetratedThickness <= 48.0) wire = "W10";
        else if (penetratedThickness <= 60.0) wire = "W9";
        else if (penetratedThickness <= 85.0) wire = "W8";
        else wire = "W7";
      } else if (tech === "DWDI") {
        if (penetratedThickness <= 1.2) wire = "W18";
        else if (penetratedThickness <= 2.0) wire = "W17";
        else if (penetratedThickness <= 3.5) wire = "W16";
        else if (penetratedThickness <= 5.0) wire = "W15";
        else if (penetratedThickness <= 7.0) wire = "W14";
        else if (penetratedThickness <= 12.0) wire = "W13";
        else if (penetratedThickness <= 18.0) wire = "W12";
        else if (penetratedThickness <= 30.0) wire = "W11";
        else if (penetratedThickness <= 40.0) wire = "W10";
        else if (penetratedThickness <= 50.0) wire = "W9";
        else if (penetratedThickness <= 60.0) wire = "W8";
        else if (penetratedThickness <= 85.0) wire = "W7";
        else wire = "W6";
      }

      const seGeldig = (tech === "DWDI" && penetratedThickness <= 12) || ((tech === "SWSI" || tech === "DWSI") && penetratedThickness <= 20);
      const irGeldig = (tech === "DWDI" && penetratedThickness > 10 && penetratedThickness <= 25) || ((tech === "SWSI" || tech === "DWSI") && penetratedThickness > 10 && penetratedThickness <= 40);

      if (bron === "Se75" && seGeldig) {
        heeftVermindering = true;
        verminderingReden = `Se-75 gamma (1 draadje vermindering conform EN ISO 17636-1)`;
      } else if (bron === "Ir192" && irGeldig) {
        heeftVermindering = true;
        verminderingReden = `Ir-192 gamma (1 draadje vermindering conform EN ISO 17636-1)`;
      }

      const basisWire = wire;
      if (heeftVermindering && wire.startsWith("W")) {
        const nr = parseInt(wire.substring(1), 10);
        wire = "W" + (nr - 1);
      } else if (bron === "X-ray" && (seGeldig || irGeldig)) {
        const nr = parseInt(basisWire.substring(1), 10);
        const gammaWire = "W" + (nr - 1);
        const bronnen = [];
        if (seGeldig) bronnen.push("Se-75");
        if (irGeldig) bronnen.push("Ir-192");
        altGammaInfo = `<br><small style="opacity:0.85;">(Bij gebruik van ${bronnen.join(" of ")}: <strong>${gammaWire}</strong> wegens 1 draadje vermindering conform EN ISO 17636-1).</small>`;
      }

    } else if (proc === "EN-B") {
      if (tech === "SWSI") {
        if (t <= 1.5) wire = "W19";
        else if (t <= 2.5) wire = "W18";
        else if (t <= 4.0) wire = "W17";
        else if (t <= 6.0) wire = "W16";
        else if (t <= 8.0) wire = "W15";
        else if (t <= 12.0) wire = "W14";
        else if (t <= 20.0) wire = "W13";
        else if (t <= 30.0) wire = "W12";
        else if (t <= 35.0) wire = "W11";
        else if (t <= 45.0) wire = "W10";
        else if (t <= 65.0) wire = "W9";
        else wire = "W8";
      } else if (tech === "DWDI") {
        if (doorstraaldeDikte <= 1.5) wire = "W19";
        else if (doorstraaldeDikte <= 2.5) wire = "W18";
        else if (doorstraaldeDikte <= 4.0) wire = "W17";
        else if (doorstraaldeDikte <= 6.0) wire = "W16";
        else if (doorstraaldeDikte <= 8.0) wire = "W15";
        else if (doorstraaldeDikte <= 15.0) wire = "W14";
        else if (doorstraaldeDikte <= 25.0) wire = "W13";
        else if (doorstraaldeDikte <= 38.0) wire = "W12";
        else if (doorstraaldeDikte <= 45.0) wire = "W11";
        else if (doorstraaldeDikte <= 55.0) wire = "W10";
        else if (doorstraaldeDikte <= 70.0) wire = "W9";
        else wire = "W8";
      } else if (tech === "DWSI") {
        if (doorstraaldeDikte <= 1.5) wire = "W19";
        else if (doorstraaldeDikte <= 2.5) wire = "W18";
        else if (doorstraaldeDikte <= 4.0) wire = "W17";
        else if (doorstraaldeDikte <= 6.0) wire = "W16";
        else if (doorstraaldeDikte <= 12.0) wire = "W15";
        else if (doorstraaldeDikte <= 18.0) wire = "W14";
        else if (doorstraaldeDikte <= 30.0) wire = "W13";
        else if (doorstraaldeDikte <= 45.0) wire = "W12";
        else if (doorstraaldeDikte <= 55.0) wire = "W11";
        else if (doorstraaldeDikte <= 70.0) wire = "W10";
        else wire = "W9";
      }

      const seGeldig = (tech === "SWSI" && t > 5 && t <= 20) ||
                       (tech === "DWDI" && doorstraaldeDikte > 5 && doorstraaldeDikte <= 12) ||
                       (tech === "DWSI" && doorstraaldeDikte > 5 && doorstraaldeDikte <= 20);
      const irGeldig = (tech === "SWSI" && t >= 10 && t <= 40) ||
                       (tech === "DWDI" && doorstraaldeDikte > 10 && doorstraaldeDikte <= 25) ||
                       (tech === "DWSI" && doorstraaldeDikte > 10 && doorstraaldeDikte <= 40);

      if (bron === "Se75" && seGeldig) {
        heeftVermindering = true;
        verminderingReden = `Se-75 gamma (1 draadje vermindering conform EN ISO 17636-1)`;
      } else if (bron === "Ir192" && irGeldig) {
        heeftVermindering = true;
        verminderingReden = `Ir-192 gamma (1 draadje vermindering conform EN ISO 17636-1)`;
      }

      const basisWire = wire;
      if (heeftVermindering && wire.startsWith("W")) {
        const nr = parseInt(wire.substring(1), 10);
        wire = "W" + (nr - 1);
      } else if (bron === "X-ray" && (seGeldig || irGeldig)) {
        const nr = parseInt(basisWire.substring(1), 10);
        const gammaWire = "W" + (nr - 1);
        const bronnen = [];
        if (seGeldig) bronnen.push("Se-75");
        if (irGeldig) bronnen.push("Ir-192");
        altGammaInfo = `<br><small style="opacity:0.85;">(Bij gebruik van ${bronnen.join(" of ")}: <strong>${gammaWire}</strong> wegens 1 draadje vermindering conform EN ISO 17636-1).</small>`;
      }

    }

    let asmeOverdikteInfo = "";
    let asmeOverdiktePrompt = "";
    if (proc === "ASME") {
      const getAsmeMaxOverdikte = (weldType, wtVal) => {
        if (weldType === "A" || weldType === "D") {
          if (wtVal <= 2.4) return 0.8;
          if (wtVal <= 4.8) return 1.5;
          if (wtVal <= 25) return 2.5;
          return 3.0;
        }
        if (weldType === "B" || weldType === "C") {
          if (wtVal <= 2.4) return 2.5;
          if (wtVal <= 4.8) return 3.0;
          if (wtVal <= 13) return 4.0;
          if (wtVal <= 25) return 5.0;
          return 6.0;
        }
        return 0;
      };

      const gekozenLastype = (params.asmeLastype && ["A", "B", "C", "D"].includes(params.asmeLastype))
        ? params.asmeLastype
        : null;
      const lasOverdikteMm = gekozenLastype ? getAsmeMaxOverdikte(gekozenLastype, t) : 0;
      const tAsme = t + lasOverdikteMm;

      const bkiLocatie = (tech === "DWSI") ? "Filmside" : "Sourceside";
      let asmeWire = 5;
      let enEq = "W13";
      if (bkiLocatie === "Sourceside") {
        if (tAsme <= 6.4) { asmeWire = 5; enEq = "W13"; }
        else if (tAsme <= 9.5) { asmeWire = 6; enEq = "W12"; }
        else if (tAsme <= 12.7) { asmeWire = 7; enEq = "W11"; }
        else if (tAsme <= 19.0) { asmeWire = 8; enEq = "W10"; }
        else if (tAsme <= 25.4) { asmeWire = 9; enEq = "W9"; }
        else if (tAsme <= 38.1) { asmeWire = 10; enEq = "W8"; }
        else if (tAsme <= 50.8) { asmeWire = 11; enEq = "W7"; }
        else if (tAsme <= 63.5) { asmeWire = 12; enEq = "W6"; }
        else { asmeWire = 13; enEq = "W5"; }
      } else {
        if (tAsme <= 6.4) { asmeWire = 4; enEq = "W14"; }
        else if (tAsme <= 9.5) { asmeWire = 5; enEq = "W13"; }
        else if (tAsme <= 12.7) { asmeWire = 6; enEq = "W12"; }
        else if (tAsme <= 19.0) { asmeWire = 7; enEq = "W11"; }
        else if (tAsme <= 25.4) { asmeWire = 8; enEq = "W10"; }
        else if (tAsme <= 38.1) { asmeWire = 9; enEq = "W9"; }
        else if (tAsme <= 50.8) { asmeWire = 10; enEq = "W8"; }
        else if (tAsme <= 63.5) { asmeWire = 11; enEq = "W7"; }
        else { asmeWire = 12; enEq = "W6"; }
      }
      wire = `ASTM #${asmeWire} (EN ${enEq})`;

      if (gekozenLastype) {
        asmeOverdikteInfo = `<br><small style="color:#F5DF4D;">ℹ️ <strong>ASME lasoverdikte (Lastype ${gekozenLastype}):</strong> ${t.toFixed(1)} mm + ${lasOverdikteMm.toFixed(1)} mm = <strong>${tAsme.toFixed(1)} mm</strong> (conform ASME Sec. V T-276.2 / <a href="Draadjesv2.html" class="ai-link" target="_blank">Draadjesv2.html</a>).</small>`;
        if (chips) chips.push("Zonder lasoverdikte", "Lastype A", "Lastype B", "Lastype C", "Lastype D");
      } else if (params.asmeLastype !== "GEEN") {
        if (chips) chips.push("Lastype A", "Lastype B", "Lastype C", "Lastype D");
        asmeOverdiktePrompt =
          `<div style="margin-top:10px; padding:8px 10px; background:rgba(245,223,77,0.08); border:1px solid rgba(245,223,77,0.35); border-radius:8px; font-size:0.88rem;">` +
          `💡 <strong>Wil je bij ASME extra lasoverdikte meerekenen?</strong> Kies hieronder het <strong>lastype (A, B, C of D)</strong> aan de hand van de afbeelding:` +
          `<div style="margin-top:8px; text-align:center;">` +
          `<img src="Lascategorie.png" alt="ASME Lascategorieën A, B, C en D" onclick="window.RtAssistant && window.RtAssistant.openAfbeeldingZoom('Lascategorie.png', 'ASME Lascategorieën A, B, C en D')" style="max-width:100%; max-height:220px; border-radius:6px; border:1px solid rgba(255,255,255,0.25); background:#fff; padding:4px; cursor:zoom-in;">` +
          `<div style="font-size:0.78rem; color:#F5DF4D; margin-top:4px; opacity:0.9;">🔍 Tik op de afbeelding voor vergrootglas &amp; inzoomen</div>` +
          `</div></div>`;
      }
    }

    const bkiPos = (tech === "DWSI") ? "BKI filmzijde" : "BKI bronzijde";
    let verminderingTekst = "";
    if (heeftVermindering) {
      verminderingTekst = `<br><small style="color:#F5DF4D;">ℹ️ <strong>Draadjesvermindering toegepast:</strong> 1 draadje minder zichtbaar vereist wegens ${verminderingReden}.</small>`;
    }

    let bkiExtra = "";
    const numMatch = wire.match(/W\s*(\d+)/i) || wire.match(/\b(\d+)\b/);
    const wireNum = numMatch ? parseInt(numMatch[1], 10) : 14;
    const bkiInfo = geefBkiMateriaalgroepInfo(params.materiaalNaam || "staal");
    if (proc === "ASME") {
      const asmeSetMatch = wire.match(/(?:ASTM|ASME)\s*#?(\d+)/i);
      if (asmeSetMatch) {
        const asmeNr = parseInt(asmeSetMatch[1], 10);
        const asmeSets = [];
        if (asmeNr >= 1 && asmeNr <= 6) asmeSets.push("Set 1A");
        if (asmeNr >= 6 && asmeNr <= 11) asmeSets.push("Set 1B");
        if (asmeNr >= 11 && asmeNr <= 16) asmeSets.push("Set 1C");
        bkiExtra += `<br><small style="opacity:0.85;">ASTM / ASME BKI houder: <strong>${asmeSets.join(" of ")}</strong>.</small>`;
      }
    }
    if (bkiInfo) {
      const bkiSets = geefBkiSetsVoorDraad(wireNum, bkiInfo.isoGroup);
      if (params.materiaalNaam) {
        bkiExtra += `<br><span style="color:#FFA726;">⚠️ <strong>BKI houder voor ${params.materiaalNaam}:</strong> Draad <strong>${wire}</strong> staat op houder <strong>${bkiSets}</strong> (${bkiInfo.omschrijving}).</span>`;
      } else if (proc === "ASME") {
        bkiExtra += `<br><small style="opacity:0.85;">Vergelijkbaar EN draadje <strong>W${wireNum}</strong> staat op ISO BKI houder: <strong>${bkiSets}</strong>.</small>`;
      } else {
        bkiExtra += `<br><small style="opacity:0.85;">Draad <strong>${wire}</strong> staat op ISO BKI houder: <strong>${bkiSets}</strong>.</small>`;
      }
    }

    const bronMelding = bron !== "X-ray" ? ` met ${bronLabel}` : "";
    const ttsDraad = params.materiaalNaam && bkiInfo ? `Vereist draadje: ${wire}, op houder ${geefBkiSetsVoorDraad(wireNum, bkiInfo.isoGroup)}` : `Vereist draadje: ${wire}`;
    return `Vereist draadje: <strong>${wire}</strong> (${bkiPos}, doorstraalde dikte: ${doorstraaldeDikte.toFixed(1)} mm bij ${tech} volgens ${proc}${bronMelding}).${asmeOverdikteInfo}${verminderingTekst}${altGammaInfo}${bkiExtra}${asmeOverdiktePrompt}<span class="rt-tts-summary" style="display:none">${ttsDraad}</span><br><small style="opacity:0.85;">(Berekend volgens <a href="Draadjesv2.html" class="ai-link" target="_blank">Draadjesv2.html</a> conform EN ISO 17636-1 / ASME Sec V).</small>`;
  }

  // 15. Pipe Schedule Wanddiktes (ASME B36.10M / ASME B36.19M)
  function berekenSchedule(params, vraagTekst, chips = []) {
    let dia = params.diameter;
    let sch = params.schedule;

    // Check of dia of sch direct uit de vraagtekst af te leiden is indien nog niet in params
    if (!dia) {
      const mDia = vraagTekst.match(/(\d+(?:[.,]\d+)?)\s*(?:duimer|duims|duim|inch|")\b/i) ||
                   vraagTekst.match(/\bdn\s*[-]?\s*(\d+)\b/i);
      if (mDia) {
        if (/dn/i.test(mDia[0])) {
          dia = DN_MATEN[mDia[1]];
        } else {
          dia = converteerDuimIndienNodig(parseFloat(mDia[1].replace(",", ".")));
        }
      }
    }
    if (!sch) {
      const mSch = vraagTekst.match(/\b(?:schedule|sch|sched)[-\s]*([0-9]{1,3}[a-z]?|std|xs|xxs)\b/i) ||
                   vraagTekst.match(/\b(std|xs|xxs)\b/i);
      if (mSch) {
        sch = normaliseerScheduleSleutel(mSch[1]);
      }
    }

    if (!dia && !sch) {
      chips.push("6 duimer Sch 80", "4 duimer Sch 40", "8 duimer Sch 80");
      return "Voor welke buisdiameter en welk schedule (bijv. <strong>6 duimer Schedule 80</strong> of <strong>Schedule 40</strong>) wil je de wanddikte weten?";
    }

    if (!dia && sch) {
      if (typeof actiefGespreksGeheugen !== "undefined" && actiefGespreksGeheugen) {
        actiefGespreksGeheugen.verwachtParameter = "diameter";
        actiefGespreksGeheugen.schedule = sch;
      }
      chips.push("2 duimer", "3 duimer", "4 duimer", "6 duimer", "8 duimer", "10 duimer");
      return `Voor welke diameter (bijv. <strong>2", 4", 6" of 8" duimer</strong>) wil je de wanddikte van <strong>Schedule ${sch}</strong> weten?`;
    }

    const info = zoekScheduleInfo(dia, sch);
    if (!info) {
      chips.push("4 duimer", "6 duimer", "8 duimer");
      return `Ik kon de schedule-tabel niet vinden voor diameter ${dia} mm. Geef een standaard NPS maat op (bijv. 2", 3", 4", 6", 8", 10", 12", 14", etc.).`;
    }

    if (!sch || !info.gevonden) {
      const uniekeSchedules = [];
      const gezien = new Set();
      for (const [sKey, wtVal] of Object.entries(info.alleSchedules)) {
        if (!gezien.has(sKey)) {
          gezien.add(sKey);
          const idVal = (info.od - (2 * wtVal)).toFixed(2);
          uniekeSchedules.push(`• <strong>Sch ${sKey}:</strong> ${wtVal} mm (ID: ${idVal} mm, 2t: ${(2 * wtVal).toFixed(2)} mm)`);
        }
      }
      chips.push("Sch 40", "Sch 80", "Sch 160");
      let msg = `ASME B36.10M / B36.19M schedules voor <strong>${info.nps}" duimer (OD ${info.od} mm / DN ${info.dn})</strong>:<br>${uniekeSchedules.join("<br>")}`;
      if (sch && !info.gevonden) {
        msg = `Schedule <strong>${sch}</strong> bestaat niet voor een ${info.nps}" leiding.<br>` + msg;
      }
      return msg;
    }

    // Schedule gevonden: sla ook op in params en geheugen voor evt. vervolgvragen
    params.wanddikte = info.wt;
    params.schedule = info.schedule;
    if (typeof actiefGespreksGeheugen !== "undefined" && actiefGespreksGeheugen) {
      actiefGespreksGeheugen.wanddikte = info.wt;
      actiefGespreksGeheugen.schedule = info.schedule;
    }

    if (chips) {
      chips.push(`${info.wt} mm`, "Min FFD", "Aantal opnames", "Stralingstijd");
    }

    return `Volgens <strong>ASME B36.10M / B36.19M</strong> voor <strong>${info.nps}" duimer (OD ${info.od} mm / DN ${info.dn})</strong>:<br>` +
           `• Schedule: <strong>Schedule ${info.schedule}</strong><br>` +
           `• Enkele wanddikte (t): <strong>${info.wt} mm</strong><br>` +
           `• Binnendiameter (ID): <strong>${info.id} mm</strong><br>` +
           `• Doorstraalde dubbele wand (2t): <strong>${info.doubleWall} mm</strong>`;
  }

  // 16. ASME (ASTM E747) vs EN (ISO 19232-1) IQI Draadjes Vergelijking & Toegestaanheid
  const ASME_EN_WIRE_EQUIVALENTS = {
    1: { iso: "W17", diaMm: 0.08, diaIn: 0.0032, setIso: ["13 FE EN"], setAsme: "Set 1A" },
    2: { iso: "W16", diaMm: 0.10, diaIn: 0.0040, setIso: ["13 FE EN"], setAsme: "Set 1A" },
    3: { iso: "W15", diaMm: 0.125, diaIn: 0.0050, setIso: ["13 FE EN"], setAsme: "Set 1A" },
    4: { iso: "W14", diaMm: 0.16, diaIn: 0.0063, setIso: ["10 FE EN", "13 FE EN"], setAsme: "Set 1A" },
    5: { iso: "W13", diaMm: 0.20, diaIn: 0.0080, setIso: ["10 FE EN", "13 FE EN"], setAsme: "Set 1A" },
    6: { iso: "W12", diaMm: 0.25, diaIn: 0.0100, setIso: ["6 FE EN", "10 FE EN"],   setAsme: "Set 1A of Set 1B" },
    7: { iso: "W11", diaMm: 0.32, diaIn: 0.0125, setIso: ["6 FE EN", "10 FE EN"],   setAsme: "Set 1B" },
    8: { iso: "W10", diaMm: 0.40, diaIn: 0.0160, setIso: ["6 FE EN", "10 FE EN"],   setAsme: "Set 1B" },
    9: { iso: "W9",  diaMm: 0.50, diaIn: 0.0200, setIso: ["6 FE EN"],               setAsme: "Set 1B" },
    10: { iso: "W8", diaMm: 0.63, diaIn: 0.0250, setIso: ["6 FE EN"],               setAsme: "Set 1B" },
    11: { iso: "W7", diaMm: 0.80, diaIn: 0.0320, setIso: ["1 FE EN", "6 FE EN"],    setAsme: "Set 1B of Set 1C" },
    12: { iso: "W6", diaMm: 1.00, diaIn: 0.0400, setIso: ["1 FE EN", "6 FE EN"],    setAsme: "Set 1C" },
    13: { iso: "W5", diaMm: 1.25, diaIn: 0.0500, setIso: ["1 FE EN"],               setAsme: "Set 1C" },
    14: { iso: "W4", diaMm: 1.60, diaIn: 0.0630, setIso: ["1 FE EN"],             setAsme: "Set 1C" },
    15: { iso: "W3", diaMm: 2.00, diaIn: 0.0800, setIso: ["1 FE EN"],             setAsme: "Set 1C" },
    16: { iso: "W2", diaMm: 2.50, diaIn: 0.1000, setIso: ["1 FE EN"],             setAsme: "Set 1C" },
  };

  function berekenAsmeIqiVergelijking(params, vraagTekst, chips = []) {
    const lower = vraagTekst.toLowerCase();

    // Vraag: mag ik ASME draadje gebruiken bij EN / Klasse B?
    const isMagAsmeBijEn =
      (/\bmag\s+ik\b/i.test(lower) && /\b(asme|astm)\b/i.test(lower) && /\b(en\b|en[-\s]?[ab]|klasse\s*[ab]|iso)\b/i.test(lower)) ||
      (/\b(asme|astm)\s*(?:draad|draadje|draadjes)?\b/i.test(lower) && /\b(toegestaan|mag\s+ik|toepassen|gebruiken)\b/i.test(lower) && /\b(en\b|en[-\s]?[ab]|klasse\s*[ab]|iso)\b/i.test(lower));

    if (isMagAsmeBijEn) {
      if (chips) chips.push("Mag EN bij ASME?", "ASME draadje 5", "Klasse B zwarting");
      return `❌ <strong>Nee, dat is NIET toegestaan!</strong><br><br>` +
             `Volgens <strong>EN ISO 17636-1</strong> (zowel Klasse A als Klasse B) mogen er <u>geen</u> ASME / ASTM E747 draadjes worden gebruikt; er moeten verplicht <strong>EN/ISO draadjes</strong> (ISO 19232-1) worden toegepast.<br><br>` +
             `✅ <strong>Andersom wél:</strong> Volgens <strong>ASME Section V (Artikel 2, Tabel T-276)</strong> is het uitdrukkelijk <u>wel toegestaan</u> om EN/ISO draadjes (ISO 19232-1) te gebruiken als gelijkwaardig alternatief voor ASTM draadjes.`;
    }

    // Vraag: mag ik EN draadje gebruiken bij ASME?
    const isMagEnBijAsme =
      (/\bmag\s+ik\b/i.test(lower) && /\b(en\b|iso|w\d+)\b/i.test(lower) && /\basme\b/i.test(lower)) ||
      (/\b(en\b|iso)\s*(?:draad|draadje|draadjes)?\b/i.test(lower) && /\b(toegestaan|mag\s+ik|toepassen|gebruiken)\b/i.test(lower) && /\basme\b/i.test(lower));

    if (isMagEnBijAsme) {
      if (chips) chips.push("ASME draadje 5", "Mag ASME bij EN?", "Hole type IQI");
      return `✅ <strong>Ja, dat is uitdrukkelijk toegestaan!</strong><br><br>` +
             `Volgens <strong>ASME Section V Artikel 2 (T-276 & T-283)</strong> mag je ISO 19232-1 (EN) draad-IQI's gebruiken in plaats van ASTM E747 draadjes (bijv. ISO W13 i.p.v. ASTM 5).<br><br>` +
             `⚠️ <em>Let op:</em> Andersom mag niet: bij EN procedures (EN ISO 17636-1) zijn ASME/ASTM draadjes <u>niet</u> toegestaan.`;
    }

    // Vraag naar specifiek draadje (bijv. "welk draadje kan ik gebruiken in plaats van asme draadje 5?" of "w13")
    const mAsme = lower.match(/\b(?:asme|astm)\s*(?:#|no\.?|nummer|draadje|draad|bki|\s)*?(\d{1,2})\b/i) ||
                  lower.match(/\b(?:draadje|draad|bki)\s*(?:#|no\.?|nummer|\s)*?(\d{1,2})\s*(?:van\s+)?(?:asme|astm)\b/i);
    const mIso = lower.match(/\b(?:en|iso)?\s*w\s*[-]?\s*(\d{1,2})\b/i);

    let asmeNum = mAsme ? parseInt(mAsme[1], 10) : null;
    let isoNum = mIso ? parseInt(mIso[1], 10) : null;

    if (!asmeNum && isoNum) {
      // Zoek ASME equivalent voor ISO draad
      for (const [k, v] of Object.entries(ASME_EN_WIRE_EQUIVALENTS)) {
        if (v.iso.toLowerCase() === `w${isoNum}`) {
          asmeNum = parseInt(k, 10);
          break;
        }
      }
    }

    if (asmeNum && ASME_EN_WIRE_EQUIVALENTS[asmeNum]) {
      const eq = ASME_EN_WIRE_EQUIVALENTS[asmeNum];
      if (chips) {
        chips.push("Mag ASME bij EN?", "Hole type IQI", "Klasse B zwarting");
      }
      return `In plaats van <strong>ASME draadje ${asmeNum}</strong> (draaddiameter ${eq.diaMm} mm / ${eq.diaIn}") kun je <strong>draadje ${eq.iso} van de EN BKI</strong> (ISO 19232-1) gebruiken.<br><br>` +
             `• <strong>ISO BKI houder:</strong> ${eq.iso} staat op houder <strong>${eq.setIso.join(" of ")}</strong>.<br>` +
             `• <strong>ASME houder:</strong> ASTM draad ${asmeNum} zit op <strong>${eq.setAsme}</strong>.<br><br>` +
             `⚠️ <strong>Regelgeving volgens ASME Sec V & EN ISO 17636-1:</strong><br>` +
             `• ✅ <strong>ASME procedures:</strong> Het is toegestaan om EN/ISO draadjes te gebruiken.<br>` +
             `• ❌ <strong>EN procedures:</strong> Het is <u>niet</u> toegestaan om ASME draadjes te gebruiken!`;
    }

    // Geen specifiek nummer genoemd: toon overzichtstabel en regels
    if (chips) {
      chips.push("ASME draadje 5", "ASME draadje 6", "Mag ASME bij EN?", "Hole type IQI");
    }
    return `<strong>Vergelijkingstabel ASME (ASTM E747) vs EN (ISO 19232-1) draadjes:</strong><br><br>` +
           `• <strong>ASME 4</strong> (0.16 mm) &harr; <strong>EN W14</strong> (houder 10 FE EN / 13 FE EN)<br>` +
           `• <strong>ASME 5</strong> (0.20 mm) &harr; <strong>EN W13</strong> (houder 10 FE EN / 13 FE EN)<br>` +
           `• <strong>ASME 6</strong> (0.25 mm) &harr; <strong>EN W12</strong> (houder 6 FE EN / 10 FE EN)<br>` +
           `• <strong>ASME 7</strong> (0.32 mm) &harr; <strong>EN W11</strong> (houder 6 FE EN / 10 FE EN)<br>` +
           `• <strong>ASME 8</strong> (0.40 mm) &harr; <strong>EN W10</strong> (houder 6 FE EN / 10 FE EN)<br>` +
           `• <strong>ASME 9</strong> (0.50 mm) &harr; <strong>EN W9</strong> (houder 6 FE EN)<br>` +
           `• <strong>ASME 10</strong> (0.63 mm) &harr; <strong>EN W8</strong> (houder 6 FE EN)<br>` +
           `• <strong>ASME 11</strong> (0.80 mm) &harr; <strong>EN W7</strong> (houder 1 FE EN / 6 FE EN)<br>` +
           `• <strong>ASME 12</strong> (1.00 mm) &harr; <strong>EN W6</strong> (houder 1 FE EN / 6 FE EN)<br>` +
           `• <strong>ASME 13</strong> (1.25 mm) &harr; <strong>EN W5</strong> (houder 1 FE EN)<br><br>` +
           `⚠️ <strong>Belangrijke normregel:</strong><br>` +
           `• ✅ <strong>ASME:</strong> Toegestaan om EN/ISO draadjes te gebruiken.<br>` +
           `• ❌ <strong>EN (ISO 17636-1):</strong> <u>Niet</u> toegestaan om ASME draadjes te gebruiken.`;
  }

  // 17. ASME Section V Hole-Type IQI (Plaatjes / Shim IQI & Gatvergelijking)
  const ASME_HOLE_TYPE_DATA = {
    5:  { tIn: 0.0050, tMm: 0.13, h1tIn: 0.0100, h1tMm: 0.25, h2tIn: 0.0200, h2tMm: 0.51, h4tIn: 0.0400, h4tMm: 1.02 },
    7:  { tIn: 0.0075, tMm: 0.19, h1tIn: 0.0100, h1tMm: 0.25, h2tIn: 0.0200, h2tMm: 0.51, h4tIn: 0.0400, h4tMm: 1.02 },
    10: { tIn: 0.0100, tMm: 0.25, h1tIn: 0.0100, h1tMm: 0.25, h2tIn: 0.0200, h2tMm: 0.51, h4tIn: 0.0400, h4tMm: 1.02 },
    12: { tIn: 0.0125, tMm: 0.32, h1tIn: 0.0125, h1tMm: 0.32, h2tIn: 0.0250, h2tMm: 0.64, h4tIn: 0.0500, h4tMm: 1.27 },
    15: { tIn: 0.0150, tMm: 0.38, h1tIn: 0.0150, h1tMm: 0.38, h2tIn: 0.0300, h2tMm: 0.76, h4tIn: 0.0600, h4tMm: 1.52 },
    17: { tIn: 0.0175, tMm: 0.44, h1tIn: 0.0175, h1tMm: 0.44, h2tIn: 0.0350, h2tMm: 0.89, h4tIn: 0.0700, h4tMm: 1.78 },
    20: { tIn: 0.0200, tMm: 0.51, h1tIn: 0.0200, h1tMm: 0.51, h2tIn: 0.0400, h2tMm: 1.02, h4tIn: 0.0800, h4tMm: 2.03 },
    25: { tIn: 0.0250, tMm: 0.64, h1tIn: 0.0250, h1tMm: 0.64, h2tIn: 0.0500, h2tMm: 1.27, h4tIn: 0.1000, h4tMm: 2.54 },
    30: { tIn: 0.0300, tMm: 0.76, h1tIn: 0.0300, h1tMm: 0.76, h2tIn: 0.0600, h2tMm: 1.52, h4tIn: 0.1200, h4tMm: 3.05 },
    35: { tIn: 0.0350, tMm: 0.89, h1tIn: 0.0350, h1tMm: 0.89, h2tIn: 0.0700, h2tMm: 1.78, h4tIn: 0.1400, h4tMm: 3.56 },
    40: { tIn: 0.0400, tMm: 1.02, h1tIn: 0.0400, h1tMm: 1.02, h2tIn: 0.0800, h2tMm: 2.03, h4tIn: 0.1600, h4tMm: 4.06 },
    45: { tIn: 0.0450, tMm: 1.14, h1tIn: 0.0450, h1tMm: 1.14, h2tIn: 0.0900, h2tMm: 2.29, h4tIn: 0.1800, h4tMm: 4.57 },
    50: { tIn: 0.0500, tMm: 1.27, h1tIn: 0.0500, h1tMm: 1.27, h2tIn: 0.1000, h2tMm: 2.54, h4tIn: 0.2000, h4tMm: 5.08 },
  };

  const ASME_TABLE_2_SELECTION = [
    { maxT: 6.4,   srcIso: 13, srcAstm: 5,  srcPlate: 12, filmIso: 14, filmAstm: 4,  filmPlate: 10 },
    { maxT: 9.5,   srcIso: 12, srcAstm: 6,  srcPlate: 15, filmIso: 13, filmAstm: 5,  filmPlate: 12 },
    { maxT: 12.7,  srcIso: 11, srcAstm: 7,  srcPlate: 17, filmIso: 12, filmAstm: 6,  filmPlate: 15 },
    { maxT: 19.0,  srcIso: 10, srcAstm: 8,  srcPlate: 20, filmIso: 11, filmAstm: 7,  filmPlate: 17 },
    { maxT: 25.4,  srcIso: 9,  srcAstm: 9,  srcPlate: 25, filmIso: 10, filmAstm: 8,  filmPlate: 20 },
    { maxT: 38.1,  srcIso: 8,  srcAstm: 10, srcPlate: 30, filmIso: 9,  filmAstm: 9,  filmPlate: 25 },
    { maxT: 50.8,  srcIso: 7,  srcAstm: 11, srcPlate: 35, filmIso: 8,  filmAstm: 10, filmPlate: 30 },
    { maxT: 63.5,  srcIso: 6,  srcAstm: 12, srcPlate: 40, filmIso: 7,  filmAstm: 11, filmPlate: 35 },
    { maxT: 101.6, srcIso: 5,  srcAstm: 13, srcPlate: 50, filmIso: 6,  filmAstm: 12, filmPlate: 40 },
  ];

  const ASME_TABLE_T283_EQUIVALENTS = {
    5:  { alt1t: 7,  alt4t: null },
    7:  { alt1t: 10, alt4t: 5 },
    10: { alt1t: 15, alt4t: 5 },
    12: { alt1t: 17, alt4t: 7 },
    15: { alt1t: 20, alt4t: 10 },
    17: { alt1t: 25, alt4t: 12 },
    20: { alt1t: 30, alt4t: 15 },
    25: { alt1t: 35, alt4t: 17 },
    30: { alt1t: 40, alt4t: 20 },
    35: { alt1t: 45, alt4t: 25 },
    40: { alt1t: 50, alt4t: 30 },
  };

  function berekenHoleTypeIqi(params, vraagTekst, chips = []) {
    const lower = vraagTekst.toLowerCase();

    // 1. Vraag naar alternatieve Hole-Type IQI / vervanging volgens Tabel T-283
    // Let op: als een getal direct gevolgd wordt door "mm", is het een wanddikte en géén plaatnummer!
    const mHoleComp = lower.match(/\b([124]t)\s*(?:van|op|in)?\s*(?:plaatje\s*|shim\s*|iqi\s*|no\.?\s*)?(\d{1,2})(?!\s*mm)\b/i) ||
                      lower.match(/(?:plaatje\s*|shim\s*|iqi\s*|no\.?\s*)(\d{1,2})\s*(?:met\s*)?([124]t)\b/i) ||
                      lower.match(/\b(?:plaatje|shim)\s*(\d{1,2})(?!\s*mm)\b/i);

    if (mHoleComp) {
      let holeType = (mHoleComp[1] && /^[124]t$/i.test(mHoleComp[1])) ? mHoleComp[1].toUpperCase() : "2T";
      let plateNum = parseInt(mHoleComp[2] || mHoleComp[1], 10);
      if (/^[0-9]+$/.test(mHoleComp[1]) && mHoleComp[2] && /^[124]t$/i.test(mHoleComp[2])) {
        plateNum = parseInt(mHoleComp[1], 10);
        holeType = mHoleComp[2].toUpperCase();
      }

      const pData = ASME_HOLE_TYPE_DATA[plateNum];
      if (!pData) {
        return `Plaatje ${plateNum} staat niet in de ASME Hole-Type IQI tabel (beschikbaar: 5, 7, 10, 12, 15, 17, 20, 25, 30, 35, 40, 45, 50).`;
      }

      let targetDiaMm = 0;
      let targetDiaIn = 0;
      if (holeType === "1T") {
        targetDiaMm = pData.h1tMm; targetDiaIn = pData.h1tIn;
      } else if (holeType === "2T") {
        targetDiaMm = pData.h2tMm; targetDiaIn = pData.h2tIn;
      } else if (holeType === "4T") {
        targetDiaMm = pData.h4tMm; targetDiaIn = pData.h4tIn;
      }

      let res = `<strong>ASME Hole-Type IQI Vervanging voor Plaatje ${plateNum} (${holeType} gat):</strong><br><br>` +
                `Standaard voorschrift: <strong>Plaatje No. ${plateNum}</strong> (dikte ${pData.tMm} mm / ${pData.tIn}") met vereist <strong>${holeType} gat</strong> (&empty; ${targetDiaMm} mm / ${targetDiaIn}").<br><br>`;

      // ASME Section V Tabel T-283 equivalente gevoeligheid
      if (ASME_TABLE_T283_EQUIVALENTS[plateNum]) {
        const t283 = ASME_TABLE_T283_EQUIVALENTS[plateNum];
        res += `📋 <strong>Toegestane alternatieve Hole-Type IQI's (ASME Sec V Artikel 2 Tabel T-283):</strong><br>` +
               `Als de onderzoeker Plaatje ${plateNum} niet beschikbaar heeft in het veld, mag volgens Tabel T-283 een gelijkwaardig 2-2T kwaliteitsniveau worden behaald met:<br>` +
               `• <strong>Plaatje ${t283.alt1t} met 1T gat</strong> (plaatdikte ${ASME_HOLE_TYPE_DATA[t283.alt1t].tMm} mm, gatdiameter <strong>${ASME_HOLE_TYPE_DATA[t283.alt1t].h1tMm} mm</strong>)<br>`;
        if (t283.alt4t && ASME_HOLE_TYPE_DATA[t283.alt4t]) {
          res += `• <strong>Plaatje ${t283.alt4t} met 4T gat</strong> (plaatdikte ${ASME_HOLE_TYPE_DATA[t283.alt4t].tMm} mm, gatdiameter <strong>${ASME_HOLE_TYPE_DATA[t283.alt4t].h4tMm} mm</strong>)<br>`;
        }
        res += `<br><small style="color:#F5DF4D;">ℹ️ Hiermee wordt voldaan aan hetzelfde equivalente kwaliteitsniveau conform ASME Section V (Equivalent Hole-Type IQI Sensitivity).</small>`;
      } else {
        res += `Volgens ASME Section V Tabel T-283 dient voor Plaatje ${plateNum} een gelijkwaardig IQI-niveau te worden gehanteerd.`;
      }

      if (chips) {
        chips.push("2T van 10", "2T van 15", "Tabel 2 selectie", "ASME draadjes");
      }
      return res;
    }

    // 2. Vraag naar Hole-Type IQI selectie voor een bepaalde wanddikte (Tabel T-276 / Tabel 2)
    const t = params.wanddikte;
    if (t && t > 0) {
      let matchRow = null;
      for (const row of ASME_TABLE_2_SELECTION) {
        if (t <= row.maxT) {
          matchRow = row;
          break;
        }
      }
      if (!matchRow) matchRow = ASME_TABLE_2_SELECTION[ASME_TABLE_2_SELECTION.length - 1];

      const srcP = ASME_HOLE_TYPE_DATA[matchRow.srcPlate];
      const filmP = ASME_HOLE_TYPE_DATA[matchRow.filmPlate];

      let res = `<strong>Vereist ASME Hole-Type IQI (Plaatje) en gat voor wanddikte ${t} mm (ASME Sec. V Art. 2 Tabel T-276):</strong><br><br>` +
                `• <strong>Bronzijde (Source Side):</strong> <strong>ASME plaatje No. ${matchRow.srcPlate}</strong> met zichtbaar <strong>2T gat</strong> (&empty; ${srcP.h2tMm} mm)<br>` +
                `• <strong>Filmzijde (Film Side):</strong> <strong>ASME plaatje No. ${matchRow.filmPlate}</strong> met zichtbaar <strong>2T gat</strong> (&empty; ${filmP.h2tMm} mm)<br>` +
                `<small style="opacity:0.85;">(Het vereiste gat bij ASME Hole-Type IQI's is standaard altijd het <strong>2T gat</strong>).</small>`;

      if (chips) {
        chips.push(`2T van ${matchRow.srcPlate}`, `2T van ${matchRow.filmPlate}`, "ASME draadje vergelijken");
      }
      return res;
    }

    // 3. Algemene toelichting Hole Type IQI
    if (chips) {
      chips.push("2T van 12", "Hole type bij 10 mm", "ASME draadje 5");
    }
    return `<strong>ASME Section V Hole-Type IQI's (Plaatjes / Shim IQI):</strong><br><br>` +
           `Hole-type IQI's (ASTM E1025) zijn rechthoekige plaatjes met drie gaten: <strong>1T</strong> (diameter = dikte T), <strong>2T</strong> (diameter = 2&times;T, standaard vereist), en <strong>4T</strong> (diameter = 4&times;T).<br><br>` +
           `📋 <strong>Alternatieve IQI's volgens ASME Tabel T-283 (Equivalente Gevoeligheid):</strong><br>` +
           `Heeft de onderzoeker het vereiste plaatje met 2T gat niet beschikbaar in het veld? Dan mag volgens Tabel T-283 een ander plaatje worden gebruikt:<br>` +
           `• Plaatje 10 (2T) &rarr; te vervangen door <strong>Plaatje 15 (1T)</strong> of <strong>Plaatje 5 (4T)</strong><br>` +
           `• Plaatje 12 (2T) &rarr; te vervangen door <strong>Plaatje 17 (1T)</strong> of <strong>Plaatje 7 (4T)</strong><br>` +
           `• Plaatje 15 (2T) &rarr; te vervangen door <strong>Plaatje 20 (1T)</strong> of <strong>Plaatje 10 (4T)</strong><br>` +
           `• Plaatje 17 (2T) &rarr; te vervangen door <strong>Plaatje 25 (1T)</strong> of <strong>Plaatje 12 (4T)</strong><br>` +
           `• Plaatje 20 (2T) &rarr; te vervangen door <strong>Plaatje 30 (1T)</strong> of <strong>Plaatje 15 (4T)</strong><br><br>` +
           `Stel gerust een vraag als <em>"welk gat is hetzelfde als 2T van 12?"</em> of geef een wanddikte op om het vereiste plaatje te bepalen.`;
  }

  // 18. Schietkaart / Overzichtskaart Generator & Clipboard Export
  let laatsteSchietkaartPlatteTekst = "";

  function fallbackKopieerTekst(tekst) {
    if (typeof document === "undefined" || !document.createElement || !document.body) return false;
    try {
      const ta = document.createElement("textarea");
      ta.value = tekst;
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      const gelukt = document.execCommand ? document.execCommand("copy") : false;
      document.body.removeChild(ta);
      if (gelukt && typeof alert !== "undefined") {
        alert("✅ Schietkaart succesvol gekopieerd naar het klembord!");
      }
      return gelukt;
    } catch (e) {
      console.warn("Fallback kopieerfout:", e);
      return false;
    }
  }

  function kopieerSchietkaart() {
    if (!laatsteSchietkaartPlatteTekst) {
      if (typeof alert !== "undefined") alert("Geen schietkaart beschikbaar om te kopiëren.");
      return Promise.resolve(false);
    }
    if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(laatsteSchietkaartPlatteTekst).then(() => {
        if (typeof alert !== "undefined") alert("✅ Schietkaart succesvol gekopieerd naar het klembord!");
        return true;
      }).catch(err => {
        console.warn("Klembord API fout, probeer fallback:", err);
        return fallbackKopieerTekst(laatsteSchietkaartPlatteTekst);
      });
    }
    return Promise.resolve(fallbackKopieerTekst(laatsteSchietkaartPlatteTekst));
  }

  function berekenSchietkaart(params, vraagTekst, chips = []) {
    // Zorg voor parameters
    if (!params.diameter) {
      if (typeof actiefGespreksGeheugen !== "undefined" && actiefGespreksGeheugen) {
        actiefGespreksGeheugen.verwachtParameter = "diameter";
      }
      if (chips) chips.push("4 duimer", "6 duimer", "8 duimer", "10 duimer");
      return "Voor welke <strong>diameter leiding</strong> (bijv. 4 duimer, 6 duimer of mm) wil je een schietkaart samenstellen?";
    }

    if (!params.wanddikte) {
      if (typeof actiefGespreksGeheugen !== "undefined" && actiefGespreksGeheugen) {
        actiefGespreksGeheugen.verwachtParameter = "wanddikte";
      }
      if (chips) chips.push("Schedule 40", "Schedule 80", "6 mm dik", "8 mm dik");
      return `Wat is de <strong>wanddikte of schedule</strong> voor de ${formatMmNaarDuimLabel(params.diameter)}?`;
    }

    // Default norm naar EN-B indien niet opgegeven
    if (!params.procedure) {
      params.procedure = "EN-B";
      if (actiefGespreksGeheugen) actiefGespreksGeheugen.procedure = "EN-B";
    }

    // Default bron naar Se-75 indien niet opgegeven
    if (!params.bronTekst && !params.bronType) {
      const seBron = (bronnenData || []).find(b => b.type === "Se75");
      if (seBron) {
        params.bronTekst = `${seBron.name} (${seBron.type}, ${seBron.size} mm)`;
        params.bronType = "Se75";
        params.brongrootte = seBron.size;
        if (actiefGespreksGeheugen) {
          actiefGespreksGeheugen.bronTekst = params.bronTekst;
          actiefGespreksGeheugen.bronType = "Se75";
          actiefGespreksGeheugen.brongrootte = seBron.size;
        }
      } else {
        params.bronTekst = "Se-75";
        params.bronType = "Se75";
        params.brongrootte = 3;
        if (actiefGespreksGeheugen) {
          actiefGespreksGeheugen.bronTekst = "Se-75";
          actiefGespreksGeheugen.bronType = "Se75";
          actiefGespreksGeheugen.brongrootte = 3;
        }
      }
    } else if (!params.brongrootte) {
      params.brongrootte = 3;
      if (actiefGespreksGeheugen) actiefGespreksGeheugen.brongrootte = 3;
    }

    const De = params.diameter;
    const t = params.wanddikte;
    const proc = params.procedure;
    const diaLabel = formatMmNaarDuimLabel(De);
    const schLabel = params.schedule ? ` (Schedule ${params.schedule})` : "";

    // Techniek
    let tech = params.technique;
    let opstellingNaam = "";
    const isRondstralerKaart = Boolean(params.bronTekst && /rondstraler/i.test(params.bronTekst)) || /\b(rondstraler|rondstralen)\b/i.test(vraagTekst || "");
    if (params.optie === "1" || isRondstralerKaart) {
      tech = "SWSI";
      opstellingNaam = "Opstelling 5 / A (SWSI Centraal / Panoramisch)";
    } else if (params.optie === "2") {
      tech = "SWSI";
      opstellingNaam = "Opstelling 8 / B (SWSI Excentrisch)";
    } else if (De < 100 && tech !== "SWSI") {
      tech = "DWDI";
      if (params.ovaaltje === "Nee") {
        opstellingNaam = "Opstelling 12 / G (DWDI superpositie loodrecht door de las)";
      } else {
        opstellingNaam = "Opstelling 11 / F (DWDI ovaaltje met verzet)";
      }
    } else {
      tech = "DWSI";
      const isGamma = params.bronType === "Se75" || params.bronType === "Ir192" || params.bronType === "Co60" || (params.bronTekst && /se|ir|co|gamma|isotoop/i.test(params.bronTekst));
      if (isGamma) {
        opstellingNaam = "Opstelling 14 / E (DWSI gammabron)";
      } else {
        opstellingNaam = "Opstelling 13 / E (DWSI röntgenbuis)";
      }
    }
    params.technique = tech;
    if (actiefGespreksGeheugen) actiefGespreksGeheugen.technique = tech;

    // Minimale FFD & Voorgestelde FFD conform pruts.html
    const minFfd = bepaalNumeriekeMinFFD(params, vraagTekst) || 0;
    const voorgesteldeFfd = bepaalVoorgesteldeFFD(params, vraagTekst) || 0;

    // Gekozen FFD
    let gekozenFfd = params.sfd;
    if (!gekozenFfd || isNaN(gekozenFfd)) {
      if (minFfd > 0 && voorgesteldeFfd > 0 && minFfd > voorgesteldeFfd) {
        if (typeof actiefGespreksGeheugen !== "undefined" && actiefGespreksGeheugen) {
          actiefGespreksGeheugen.verwachtParameter = "sfd";
        }
        if (chips) {
          chips.push(`${voorgesteldeFfd} mm FFD`, `${minFfd} mm FFD (min. ffd)`);
        }
        const isXrayKaart = params.bronType === "X-ray" || params.bronType === "Rontgen" || (params.bronTekst && /x[-\s]?ray|rontgen|röntgen|buis|balteau|ceram|yxlon|smart|evo/i.test(params.bronTekst));
        const ffdBasisKaart = (params.optie === "1" || isRondstralerKaart) ? "halve diameter, centraal" : (isXrayKaart ? "diameter + 150 mm, X-ray" : "diameter + 15 mm");
        return `Voor een complete schietkaart van <strong>${diaLabel} (${t} mm dik, ${proc})</strong> is de voorgestelde ${(params.optie === "1" || isRondstralerKaart) ? "centrale FFD" : "contact-FFD"} <strong>${voorgesteldeFfd} mm</strong> (${ffdBasisKaart}), maar de normatieve minimale FFD volgens ${proc} is <strong>${minFfd} mm</strong> (${(minFfd / 10).toFixed(1)} cm).<br><br>Met welke FFD wil je de schietkaart samenstellen?`;
      }
      gekozenFfd = voorgesteldeFfd > 0 ? voorgesteldeFfd : (minFfd > 0 ? minFfd : 0);
      params.sfd = gekozenFfd;
      if (actiefGespreksGeheugen) actiefGespreksGeheugen.sfd = gekozenFfd;
    }

    // Bereken aantal opnames
    const opnTekst = berekenAantalOpnames(params, vraagTekst);
    const mOpn = opnTekst.match(/<strong>(\d+)\s+opname[s]?<\/strong>/i) || opnTekst.match(/(\d+)\s+opname[s]?/i);
    const aantalOpnames = mOpn ? mOpn[1] : "6";

    // Bereken BKI draadje
    const draadTekst = berekenBkiDraadje(params, vraagTekst);
    const mDraad = draadTekst.match(/Vereist draadje:\s*<strong>([^<]+)<\/strong>/i);
    const vereistDraadje = mDraad ? mDraad[1] : "W11";
    const bkiPositie = (tech === "DWSI") ? "Filmzijde" : "Bronzijde";

    // Zwarting
    let zwartingEis = "2.3 - 4.0";
    if (proc === "EN-A") zwartingEis = "2.0 - 4.0";
    else if (proc === "ASME") zwartingEis = params.bronType === "X-ray" ? "1.8 - 4.0" : "2.0 - 4.0";

    // Filmkeuze in AGFA benaming (Agfa D4, D5, D7)
    let filmKlasse = params.filmType ? `Agfa ${params.filmType.toUpperCase()}` : "Agfa D4 (of D5)";
    if (!params.filmType) {
      if (proc === "EN-A") filmKlasse = "Agfa D5 (of D7)";
      else if (proc === "ASME") filmKlasse = "Agfa D4 (of D5)";
      else filmKlasse = "Agfa D4 (of D5)"; // EN-B
    }

    // Stralingstijd (indien activiteit bekend)
    let stralingstijdRegel = "";
    let stralingstijdPlat = "";
    if (params.activiteit) {
      const tijdTekst = berekenStralingstijd(params, vraagTekst);
      const mTijd = tijdTekst.match(/Stralingstijd:[^<]*<strong>([^<]+)<\/strong>/i);
      if (mTijd) {
        stralingstijdRegel = `<tr><td style="padding:4px 8px; font-weight:bold; color:#aaa;">Stralingstijd:</td><td style="padding:4px 8px; color:#F5DF4D; font-weight:bold;">${mTijd[1]}</td></tr>`;
        stralingstijdPlat = `Stralingstijd: ${mTijd[1]}\n`;
      }
    }

    // Synchroniseer direct met formulier op pruts.html indien geopend
    synchroniseerDOMFormulier(params);

    // Platte tekst voor klembord
    laatsteSchietkaartPlatteTekst =
`========================================
       📋 RADI SCHIETKAART
========================================
Onderdeel: ${diaLabel} (OD ${De} mm) x ${t} mm${schLabel}
Materiaal: ${params.materiaalNaam || "Staal"} (factor: ${(params.materiaalFactor || 1.0).toFixed(2)})
Kwaliteitsklasse: ${proc}
Opstelling: ${opstellingNaam}
Stralingsbron: ${params.bronTekst || params.bronType} (focus ${params.brongrootte} mm)
Minimale FFD: ${minFfd} mm (${(minFfd / 10).toFixed(1)} cm)
Gekozen FFD: ${gekozenFfd} mm
Aantal opnames: ${aantalOpnames} opnames
BKI Positie: ${bkiPositie}
Vereist BKI draad: ${vereistDraadje}
Optische dichtheid: ${zwartingEis}
Aanbevolen film: ${filmKlasse}
${stralingstijdPlat}========================================`;

    // Suggestie chips voor aanpassen
    if (chips) {
      chips.push("📋 Kopieer schietkaart", "+ FFD 700", "+ Klasse A", "+ ASME", "+ Ir-192", "Stralingstijd");
    }

    // HTML weergave
    return `
<div style="background:#1e1e1e; border:1px solid #444; border-radius:8px; padding:12px; margin-top:6px; font-family:sans-serif;">
  <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #333; padding-bottom:6px; margin-bottom:8px;">
    <h4 style="margin:0; color:#F5DF4D; font-size:1.05rem;"><i class="fas fa-clipboard-check"></i> RADI Overzichtskaart / Schietkaart</h4>
    <button type="button" onclick="window.RtAssistant && window.RtAssistant.kopieerSchietkaart()" style="background:#F5DF4D; color:#111; border:none; padding:4px 10px; border-radius:4px; font-weight:bold; font-size:0.75rem; cursor:pointer;" title="Kopieer gegevens naar klembord">
      <i class="fas fa-copy"></i> Kopieer
    </button>
  </div>
  <table style="width:100%; font-size:0.85rem; border-collapse:collapse; color:#eee;">
    <tr><td style="padding:3px 6px; font-weight:bold; color:#aaa; width:40%;">Leiding:</td><td style="padding:3px 6px;"><strong>${diaLabel}</strong> (OD ${De} mm) &times; <strong>${t} mm</strong>${schLabel}</td></tr>
    <tr><td style="padding:3px 6px; font-weight:bold; color:#aaa;">Norm / Klasse:</td><td style="padding:3px 6px;"><strong>${proc}</strong></td></tr>
    <tr><td style="padding:3px 6px; font-weight:bold; color:#aaa;">Techniek:</td><td style="padding:3px 6px;">${opstellingNaam}</td></tr>
    <tr><td style="padding:3px 6px; font-weight:bold; color:#aaa;">Bron & Focus:</td><td style="padding:3px 6px;">${params.bronTekst || params.bronType} (focus ${params.brongrootte} mm)</td></tr>
    <tr><td style="padding:3px 6px; font-weight:bold; color:#aaa;">Min. FFD:</td><td style="padding:3px 6px;"><strong>${minFfd} mm</strong> (gekozen: <strong>${gekozenFfd} mm</strong>)</td></tr>
    <tr><td style="padding:3px 6px; font-weight:bold; color:#aaa;">Aantal opnames:</td><td style="padding:3px 6px; color:#68D391; font-weight:bold;">${aantalOpnames} opname(s)</td></tr>
    <tr><td style="padding:3px 6px; font-weight:bold; color:#aaa;">BKI Vereiste:</td><td style="padding:3px 6px; color:#F5DF4D; font-weight:bold;">${vereistDraadje} <small style="color:#bbb;">(${bkiPositie})</small></td></tr>
    <tr><td style="padding:3px 6px; font-weight:bold; color:#aaa;">Zwartingseis:</td><td style="padding:3px 6px;">${zwartingEis}</td></tr>
    <tr><td style="padding:3px 6px; font-weight:bold; color:#aaa;">Aanbevolen film:</td><td style="padding:3px 6px;"><strong>${filmKlasse}</strong></td></tr>
    ${stralingstijdRegel}
  </table>
  <div style="margin-top:8px; font-size:0.75rem; color:#888; border-top:1px solid #333; padding-top:6px;">
    💡 <em>Gegevens zijn gesynchroniseerd met <a href="pruts.html" class="ai-link" target="_blank">pruts.html</a>. Pas waarden aan via de suggestiechips of typ een nieuwe FFD/bron.</em>
  </div>
</div>`;
  }

