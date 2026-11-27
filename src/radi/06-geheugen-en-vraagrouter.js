  // Gespreksgeheugen voor vervolgvragen
  const actiefGespreksGeheugen = {
    laatsteIntentie: null,
    verwachtParameter: null,
    openVraag: null,
    diameter: null,
    wanddikte: null,
    schedule: null,
    sfd: null,
    ofa: null,
    procedure: null,
    asmeLastype: null,
    subProcedure: null,
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
    isOnstream: false,
    onstreamTechniek: null,
    onstreamKlasse: null,
    isolatieMm: null,
    pbMm: null,
    aantalLoodplaten: null,
    feMm: null,
    betonMm: null,
    baksteenMm: null,
    muurOnbekendMm: null,
    dosisGrens: null,
    langsnaadLengte: null,
    langsnaadMaxDeel: 400,
    langsnaadUiteinde: 200,
    // Focus & Filmtype Calculator parameters (focusverandering.html)
    focusBegintijdSec: null,
    oudeFocus: null,
    nieuweFocus: null,
    oudeCi: null,
    nieuweCi: null,
    oudeMa: null,
    nieuweMa: null,
    oudeFilmType: null,
    nieuweFilmType: null,
    maminVal: null,
    maVal: null,
    materiaalNaam: null,
    materiaalFactor: null,
    materiaalFactorHandmatig: null,
    // KV-regel, Gevulde leiding & Bronverval
    doorstraaldeDikte: null,
    lascompensatie: null,
    isGevuldeLeiding: false,
    mediumNaam: null,
    mediumDichtheid: null,
    kv: null,
    vervalDagen: null,
    vervalDoelDatum: null,
    laatsteAantalOpnames: null,
  };

  let actieveVraagId = 0;
  let gespreksGeschiedenis = [];

  function escapeHtmlTekst(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function htmlNaarPlatteTekst(html) {
    return String(html || "")
      .replace(/<div class="rt-ai-chips-row">[\s\S]*?<\/div>/gi, "")
      .replace(/<div class="rt-ai-timer-row">[\s\S]*?<\/div>/gi, "")
      .replace(/<span class="rt-tts-summary"[^>]*>[\s\S]*?<\/span>/gi, "")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|li|tr|h[1-6])>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/gi, " ")
      .replace(/&times;/gi, "×")
      .replace(/&minus;/gi, "−")
      .replace(/&le;/gi, "≤")
      .replace(/&ge;/gi, "≥")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&amp;/gi, "&")
      .replace(/&quot;/gi, '"')
      .replace(/&ndash;/gi, "–")
      .replace(/&mdash;/gi, "—")
      .replace(/&bull;/gi, "•")
      .replace(/&middot;/gi, "·")
      .replace(/&rarr;/gi, "→")
      .replace(/&mu;/gi, "μ")
      .replace(/&approx;/gi, "≈")
      .replace(/&frac12;/gi, "½")
      .replace(/&#40;/g, "(")
      .replace(/&#41;/g, ")")
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function formatteerGesprekAlsTekst(maxChars = 0) {
    const memItems = geefGeheugenItems();
    const memSamenvatting = memItems.length ? memItems.map((it) => it.label).join(" | ") : "Geen";

    const blokken = gespreksGeschiedenis.map((item) => {
      const q = htmlNaarPlatteTekst(item.vraagHtml);
      const a = htmlNaarPlatteTekst(item.antwoordHtml);
      return (q ? `${q}\n` : "") + `R.A.D.I.: ${a}`;
    });

    let gesprekTekst = blokken.length ? blokken.join("\n\n---\n\n") : "(Nog geen berichten in dit gesprek)";
    if (maxChars > 0 && gesprekTekst.length > maxChars) {
      // Houd altijd de meest recente berichten volledig leesbaar zodat mailto nooit over de limiet gaat
      let geselecteerd = [];
      let lengte = 0;
      for (let i = blokken.length - 1; i >= 0; i--) {
        const b = blokken[i];
        if (geselecteerd.length > 0 && lengte + b.length + 7 > maxChars) break;
        geselecteerd.unshift(b);
        lengte += b.length + 7;
      }
      gesprekTekst = (geselecteerd.length < blokken.length ? "(... eerdere berichten ingekort ...)\n\n" : "") + geselecteerd.join("\n\n---\n\n");
      if (gesprekTekst.length > maxChars) {
        gesprekTekst = gesprekTekst.slice(-maxChars);
      }
    }

    return `R.A.D.I. Gesprek\nActief geheugen: ${memSamenvatting}\n\n${gesprekTekst}`;
  }

  function kopieerTekstNaarKlembord(tekst) {
    if (typeof navigator !== "undefined" && navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      return navigator.clipboard.writeText(tekst).then(() => true).catch(() => false);
    }
    if (typeof document !== "undefined" && document.body) {
      try {
        const ta = document.createElement("textarea");
        ta.value = tekst;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        const ok = typeof document.execCommand === "function" ? document.execCommand("copy") : false;
        if (typeof document.body.removeChild === "function") document.body.removeChild(ta);
        return Promise.resolve(Boolean(ok));
      } catch (e) {
        return Promise.resolve(false);
      }
    }
    return Promise.resolve(false);
  }

  function kopieerGesprek() {
    const transEl = typeof document !== "undefined" ? document.getElementById("rt-ai-transcript") : null;
    if (!gespreksGeschiedenis.length) {
      if (transEl) transEl.innerHTML = "ℹ️ Nog geen gesprek om te kopiëren.";
      return "";
    }
    const tekst = formatteerGesprekAlsTekst(0);
    kopieerTekstNaarKlembord(tekst).then((ok) => {
      const btn = typeof document !== "undefined" ? document.getElementById("rt-ai-copy-chat") : null;
      if (btn) {
        const origHtml = btn.innerHTML;
        btn.innerHTML = `<i class="fas fa-check" style="color:#5cb85c;"></i>`;
        setTimeout(() => { btn.innerHTML = origHtml; }, 1800);
      }
      if (transEl) {
        transEl.innerHTML = ok
          ? "✅ Gehele gesprek gekopieerd naar het klembord!"
          : "ℹ️ Kopiëren gelukt of selecteer tekst handmatig.";
      }
    });
    return tekst;
  }

  function meldFoutViaMail() {
    const pagina = (typeof window !== "undefined" && window.location && window.location.pathname)
      ? window.location.pathname
      : "rt-tools";
    const gesprekVolledig = formatteerGesprekAlsTekst(0);
    const gesprekVoorMail = formatteerGesprekAlsTekst(1400);

    // Kopieer stilzwijgend ook het volledige gesprek als backup (gebruiker hoeft niet te plakken)
    kopieerTekstNaarKlembord(gesprekVolledig);

    const body =
      `Wat ging er mis / wat verwachtte je?\n` +
      `(Typ hier kort je toelichting of druk direct op Verzenden)\n\n` +
      `==============================\n` +
      `Pagina: ${pagina}\n` +
      `${gesprekVoorMail}`;

    const mailtoUrl = `mailto:vincepall@gmail.com?subject=${encodeURIComponent("R.A.D.I. Foutmelding")}&body=${encodeURIComponent(body)}`;

    if (typeof document !== "undefined" && document.body) {
      const a = document.createElement("a");
      a.href = mailtoUrl;
      a.style.display = "none";
      document.body.appendChild(a);
      if (typeof a.click === "function") a.click();
      if (typeof document.body.removeChild === "function") document.body.removeChild(a);
      const transEl = document.getElementById("rt-ai-transcript");
      if (transEl) {
        transEl.innerHTML = "🐞 Mail met foutmelding en gesprek wordt geopend (vincepall@gmail.com)...";
      }
    }
    return mailtoUrl;
  }

  function voegOfUpdateGeschiedenis(entryId, vraagHtml, antwoordHtml) {
    const idx = entryId !== null ? gespreksGeschiedenis.findIndex((x) => x.id === entryId) : -1;
    if (idx !== -1) {
      if (vraagHtml !== undefined) gespreksGeschiedenis[idx].vraagHtml = vraagHtml;
      gespreksGeschiedenis[idx].antwoordHtml = antwoordHtml;
    } else {
      gespreksGeschiedenis.push({ id: entryId, vraagHtml: vraagHtml || "", antwoordHtml });
      if (gespreksGeschiedenis.length > 40) {
        gespreksGeschiedenis = gespreksGeschiedenis.slice(-40);
      }
    }
    renderGespreksGeschiedenis(true);
  }

  const STARTSCHERM_VOORBEELDVRAGEN = [
    "Hoe groot moet de afzetting zijn bij 25 Ci Se-75 als ik een 6 duimer schedule 40 schiet en er een muur van 10cm baksteen tussen zit?",
    "Hoeveel opnames op een 4 duimer van 6 dik volgens klasse B met 40cm focus?",
    "Wat is de wanddikte van een 8 duimer schedule XS?",
    "Welk draadje moet ik zien op een proefplaat van 20 dik volgens ASME?",
    "Hoeveel lood heb ik nodig om een afzetting van 10 meter te krijgen als ik 20 Curie Iridium gebruik?",
    "Hoe bereken ik de onscherpte?",
    "Hoeveel verzet heb ik nodig op een DN50 van 4.5mm dik met een focus van 700 en een lasbreedte van 8?",
    "Ik heb zwarting 1.8 en straal 30 seconden, hoe krijg ik zwarting 2.6?",
    "Wat is het dosistempo achter een loodplaat op 15 meter met 35 curie selenium?",
    "Welk gat is vergelijkbaar met 2T van plaatje 20?",
    "Welk gaatje moet ik zien op een plaat van 30 dik?",
    "Welk draadje moet ik zien als ik een 6 duimer sch40 schiet met selenium volgens klasse B?",
    "Hoeveel films heb ik nodig om een rondnaad van 2 meter 15 centraal te schieten?",
    "Hoelang moet ik stralen met een selenium van 30 curie op een 10 duimer van 8 dik?",
    "Wat is de stralingstijd als ik een 12 duimer van 12 dik centraal schiet met 20 curie selenium?",
    "Hoe kan ik een langsnaad van 2 meter 55 het beste verdelen?",
    "Welk type Agfa film is C3?",
    "Wat is het ALARA principe?",
    "Wat is de halveringsdikte van lood?",
    "Wat is de halfwaardetijd van selenium?",
    "Hoe groot mag een gaspit zijn volgens level 1 bij wanddikte 3.2?",
    "Wat is mijn doorstraalde dikte als ik een 4 duimer van 6 dik gevuld met water heb?",
    "Mag ik een iridium gebruiken om een onstream opname te maken van een 3 duimer sch XXS volgens onstream klasse TA?",
    "Wat is mijn stralingstijd als ik een 40 curie iridium heb en een 6 duimer van 4 dik gevuld met olie doe schieten op 800 focus?",
    "Ik straal 2 minuten op 80 op D4, hoelang is dat op 56 focus op D5?",
    "Ik heb 25 mili ampere minuten, hoelang is het stralen met 3 mili ampere?",
    "Wat betekent R.A.D.I?",
    "Wat is de minimale focus voor een 3 duimer volgens klasse B?",
    "Ik heb 20 mA*min op 80 op D4, hoelang moet ik stralen op 56 op D5 met 4 mA?",
    "Verdeel een 6 duimer in 6 opnames."
  ];

  let geladenStartschermVragen = null;

  async function laadStartschermVragen() {
    if (Array.isArray(geladenStartschermVragen) && geladenStartschermVragen.length > 0) {
      return geladenStartschermVragen;
    }
    if (typeof fetch === "function") {
      try {
        const res = await fetch("radi-startvragen.json", { cache: "no-store" });
        if (res && res.ok && typeof res.json === "function") {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            const schoon = data.map((v) => String(v || "").trim()).filter(Boolean);
            if (schoon.length > 0) {
              geladenStartschermVragen = schoon;
              if (!gespreksGeschiedenis.length) {
                renderGespreksGeschiedenis(false);
              }
              return geladenStartschermVragen;
            }
          }
        }
      } catch (e) {}
    }
    geladenStartschermVragen = STARTSCHERM_VOORBEELDVRAGEN;
    return geladenStartschermVragen;
  }

  function genereerStartSchermHtml() {
    const isMobiel = typeof window !== "undefined" && typeof window.innerWidth === "number" && window.innerWidth <= 768;
    const aantal = isMobiel ? 2 : 5;
    const bronLijst = (Array.isArray(geladenStartschermVragen) && geladenStartschermVragen.length > 0)
      ? geladenStartschermVragen
      : STARTSCHERM_VOORBEELDVRAGEN;
    const kopie = bronLijst.slice();
    for (let i = kopie.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [kopie[i], kopie[j]] = [kopie[j], kopie[i]];
    }
    const gekozen = kopie.slice(0, aantal);
    const itemsHtml = gekozen
      .map((vraag) => {
        const safeJs = vraag.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/"/g, "&quot;");
        return (
          `<li class="rt-ai-start-example-item">` +
          `<button type="button" class="rt-ai-start-example-icon" onclick="window.RtAssistant && window.RtAssistant.vulVoorbeeldIn('${safeJs}')" title="Zet in invoerveld om aan te passen" aria-label="Zet voorbeeldvraag in invoerveld">` +
          `<i class="fas fa-arrow-down"></i>` +
          `</button>` +
          `<span class="rt-ai-start-example-text" style="cursor:pointer;" onclick="window.RtAssistant && window.RtAssistant.vulVoorbeeldIn('${safeJs}')" title="Zet in invoerveld om aan te passen"><em>&ldquo;${escapeHtmlTekst(vraag)}&rdquo;</em></span>` +
          `</li>`
        );
      })
      .join("");
    return `<div class="rt-ai-start-welcome">Stel je vraag, bijvoorbeeld:<ul class="rt-ai-start-examples">${itemsHtml}</ul></div>`;
  }

  function renderGespreksGeschiedenis(scrollNaarLaatste = true) {
    if (typeof document === "undefined") return;
    const respEl = document.getElementById("rt-ai-response");
    if (!respEl) return;

    if (!gespreksGeschiedenis.length) {
      respEl.innerHTML = genereerStartSchermHtml();
      respEl.scrollTop = 0;
      return;
    }

    respEl.innerHTML = gespreksGeschiedenis
      .map((item, idx) => {
        const isLast = idx === gespreksGeschiedenis.length - 1;
        return (
          `<div class="rt-ai-history-entry${isLast ? " is-latest" : ""}">` +
          (item.vraagHtml ? `<div class="rt-ai-history-q">${item.vraagHtml}</div>` : "") +
          `<div class="rt-ai-history-a">${item.antwoordHtml}</div>` +
          `</div>`
        );
      })
      .join("");

    if (scrollNaarLaatste) {
      const scrollFn = () => {
        const entries = respEl.querySelectorAll(".rt-ai-history-entry");
        const lastEl = entries.length ? entries[entries.length - 1] : null;
        if (!lastEl) {
          respEl.scrollTop = 0;
          return;
        }
        // Spring altijd naar het BEGIN van het nieuwste antwoord (zodat je bovenaan kunt beginnen met lezen)
        respEl.scrollTop = Math.max(0, lastEl.offsetTop - 8);
      };
      scrollFn();
      if (typeof requestAnimationFrame === "function") requestAnimationFrame(scrollFn);
      setTimeout(scrollFn, 40);
    }
  }

  function resetGespreksGeheugen() {
    actieveVraagId++;
    gespreksGeschiedenis = [];
    if (typeof stopSpraakherkenning === "function") {
      try { stopSpraakherkenning(); } catch (e) {}
    }
    if (typeof window !== "undefined" && window.speechSynthesis) {
      try { window.speechSynthesis.cancel(); } catch (e) {}
    }
    for (const k in actiefGespreksGeheugen) {
      if (typeof actiefGespreksGeheugen[k] === "boolean") actiefGespreksGeheugen[k] = false;
      else actiefGespreksGeheugen[k] = null;
    }
    if (typeof window !== "undefined" && typeof window.resetPrutsMaterial === "function") {
      window.resetPrutsMaterial();
    }
    synchroniseerDOMFormulier(actiefGespreksGeheugen);
    if (typeof document !== "undefined") {
      renderGespreksGeschiedenis(false);
      renderGeheugenBalk();
      const transEl = document.getElementById("rt-ai-transcript");
      if (transEl) {
        transEl.textContent = "Houd 🎙️ ingedrukt om in te spreken (PTT), of typ je vraag...";
      }
      const inp = document.getElementById("rt-ai-input");
      if (inp) {
        inp.value = "";
        inp.style.height = "auto";
      }
      isExamplesOpen = false;
      opgeslagenResponseHtmlVoorVoorbeelden = "";
      opgeslagenTranscriptHtmlVoorVoorbeelden = "";
      const exBtn = document.getElementById("rt-ai-examples-toggle");
      if (exBtn) {
        exBtn.classList.remove("active");
        exBtn.style.color = "";
      }
    }
  }

  function geefGeheugenItems() {
    const items = [];
    if (actiefGespreksGeheugen.diameter) {
      items.push({
        key: "diameter",
        label: formatMmNaarDuimLabel(actiefGespreksGeheugen.diameter),
        title: "Diameter",
      });
    }
    if (actiefGespreksGeheugen.wanddikte) {
      const schSuffix = actiefGespreksGeheugen.schedule ? ` (Sch ${actiefGespreksGeheugen.schedule})` : "";
      items.push({
        key: "wanddikte",
        label: `${actiefGespreksGeheugen.wanddikte} mm dik${schSuffix}`,
        title: "Wanddikte",
      });
    }
    if (actiefGespreksGeheugen.procedure) {
      items.push({
        key: "procedure",
        label: `${actiefGespreksGeheugen.procedure}`,
        title: "Kwaliteitsklasse / norm",
      });
    }
    if (actiefGespreksGeheugen.bronTekst) {
      items.push({
        key: "bron",
        label: actiefGespreksGeheugen.bronTekst,
        title: "Bron / focus",
      });
    } else if (actiefGespreksGeheugen.brongrootte) {
      items.push({
        key: "brongrootte",
        label: `focus ${actiefGespreksGeheugen.brongrootte} mm`,
        title: "Brongrootte",
      });
    }
    if (actiefGespreksGeheugen.activiteit) {
      items.push({
        key: "activiteit",
        label: `${actiefGespreksGeheugen.activiteit} Ci`,
        title: "Activiteit",
      });
    }
    if (actiefGespreksGeheugen.sfd) {
      items.push({
        key: "sfd",
        label: `FFD ${actiefGespreksGeheugen.sfd} mm`,
        title: "Film-focusafstand",
      });
    }
    if (actiefGespreksGeheugen.ofa) {
      items.push({
        key: "ofa",
        label: `OFA ${actiefGespreksGeheugen.ofa} mm`,
        title: "Object-tot-filmafstand",
      });
    }
    if (actiefGespreksGeheugen.filmType) {
      items.push({
        key: "filmType",
        label: `Film ${actiefGespreksGeheugen.filmType}`,
        title: "Filmtype",
      });
    }
    if (actiefGespreksGeheugen.pbMm && actiefGespreksGeheugen.pbMm > 0) {
      const platenHint = (actiefGespreksGeheugen.aantalLoodplaten && actiefGespreksGeheugen.aantalLoodplaten > 1)
        ? ` (${actiefGespreksGeheugen.aantalLoodplaten} platen)`
        : (actiefGespreksGeheugen.aantalLoodplaten === 1 ? " (1 plaat)" : "");
      items.push({
        key: "pbMm",
        label: `${actiefGespreksGeheugen.pbMm} mm Pb${platenHint}`,
        title: "Loodafscherming",
      });
    }
    if (actiefGespreksGeheugen.feMm && actiefGespreksGeheugen.feMm > 0) {
      items.push({
        key: "feMm",
        label: `${actiefGespreksGeheugen.feMm} mm Fe`,
        title: "Staalafscherming",
      });
    }
    if (actiefGespreksGeheugen.betonMm && actiefGespreksGeheugen.betonMm > 0) {
      const bVal = actiefGespreksGeheugen.betonMm;
      items.push({
        key: "betonMm",
        label: bVal >= 10 && bVal % 10 === 0 ? `${bVal / 10} cm beton` : `${bVal} mm beton`,
        title: "Betonafscherming",
      });
    }
    if (actiefGespreksGeheugen.baksteenMm && actiefGespreksGeheugen.baksteenMm > 0) {
      const mVal = actiefGespreksGeheugen.baksteenMm;
      items.push({
        key: "baksteenMm",
        label: mVal >= 10 && mVal % 10 === 0 ? `${mVal / 10} cm baksteen` : `${mVal} mm baksteen`,
        title: "Baksteenafscherming",
      });
    }
    if (actiefGespreksGeheugen.lascompensatie !== null && actiefGespreksGeheugen.lascompensatie !== undefined) {
      items.push({
        key: "lascompensatie",
        label: actiefGespreksGeheugen.lascompensatie === 0 ? "0 mm compensatie" : `${actiefGespreksGeheugen.lascompensatie} mm compensatie`,
        title: "Aangepaste lascompensatie (stralingstijd)",
      });
    }
    if (actiefGespreksGeheugen.isolatieMm !== null && actiefGespreksGeheugen.isolatieMm !== undefined) {
      items.push({
        key: "isolatieMm",
        label: actiefGespreksGeheugen.isolatieMm === 0 ? "Geen isolatie" : `${actiefGespreksGeheugen.isolatieMm} mm iso`,
        title: "Isolatiedikte",
      });
    }
    if (actiefGespreksGeheugen.onstreamKlasse) {
      items.push({
        key: "onstreamKlasse",
        label: `Klasse ${actiefGespreksGeheugen.onstreamKlasse.toUpperCase()}`,
        title: "Onstream Kwaliteitsklasse",
      });
    }
    if (actiefGespreksGeheugen.onstreamTechniek && actiefGespreksGeheugen.onstreamTechniek !== "tangentiaal") {
      items.push({
        key: "onstreamTechniek",
        label: "Dubbelwand",
        title: "Onstream Techniek",
      });
    }
    if (actiefGespreksGeheugen.lasbreedte) {
      items.push({
        key: "lasbreedte",
        label: `las ${actiefGespreksGeheugen.lasbreedte} mm`,
        title: "Lasbreedte",
      });
    }
    if (actiefGespreksGeheugen.langsnaadLengte) {
      items.push({
        key: "langsnaadLengte",
        label: `langsnaad ${actiefGespreksGeheugen.langsnaadLengte} mm`,
        title: "Langsnaad lengte",
      });
    }
    if (actiefGespreksGeheugen.oudeFocus && actiefGespreksGeheugen.nieuweFocus) {
      items.push({
        key: "focusVerandering",
        label: `FFD ${actiefGespreksGeheugen.oudeFocus} &rarr; ${actiefGespreksGeheugen.nieuweFocus}`,
        title: "Focusverandering",
      });
    }
    if (actiefGespreksGeheugen.focusBegintijdSec) {
      items.push({
        key: "focusBegintijdSec",
        label: `tijd ${formatSecondenKort(actiefGespreksGeheugen.focusBegintijdSec)}`,
        title: "Begintijd",
      });
    }
    if (actiefGespreksGeheugen.oudeFilmType && actiefGespreksGeheugen.nieuweFilmType) {
      items.push({
        key: "filmWissel",
        label: `${actiefGespreksGeheugen.oudeFilmType} &rarr; ${actiefGespreksGeheugen.nieuweFilmType}`,
        title: "Filmsoort wissel",
      });
    }
    if (actiefGespreksGeheugen.oudeCi && actiefGespreksGeheugen.nieuweCi) {
      items.push({
        key: "ciWissel",
        label: `Ci ${actiefGespreksGeheugen.oudeCi} &rarr; ${actiefGespreksGeheugen.nieuweCi}`,
        title: "Ci wissel",
      });
    }
    if (actiefGespreksGeheugen.maminVal && actiefGespreksGeheugen.maVal) {
      items.push({
        key: "mamin",
        label: `${actiefGespreksGeheugen.maminVal} mA*min @ ${actiefGespreksGeheugen.maVal} mA`,
        title: "mA*min",
      });
    } else if (actiefGespreksGeheugen.maminVal) {
      items.push({
        key: "mamin",
        label: `${actiefGespreksGeheugen.maminVal} mA*min`,
        title: "mA*min",
      });
    }
    if (actiefGespreksGeheugen.materiaalNaam) {
      const matObj = zoekMateriaal(actiefGespreksGeheugen.materiaalNaam);
      let factorLabel = "";
      if (matObj) {
        const curIso = actiefGespreksGeheugen.bronType === "Se75" ? "Se-75" : (actiefGespreksGeheugen.bronType === "Ir192" ? "Ir-192" : null);
        if (curIso === "Se-75") {
          factorLabel = ` (${matObj.f_se75.toFixed(2)}x @ Se-75)`;
        } else if (curIso === "Ir-192") {
          factorLabel = ` (${matObj.f_ir192.toFixed(2)}x @ Ir-192)`;
        } else {
          factorLabel = ` (Se: ${matObj.f_se75.toFixed(2)}x / Ir: ${matObj.f_ir192.toFixed(2)}x)`;
        }
      } else if (actiefGespreksGeheugen.materiaalFactor && actiefGespreksGeheugen.materiaalFactor !== 1.0) {
        factorLabel = ` (factor ${actiefGespreksGeheugen.materiaalFactor}x)`;
      }
      items.push({
        key: "materiaalFactor",
        label: `${actiefGespreksGeheugen.materiaalNaam}${factorLabel}`,
        title: "Materiaalfactor: klik op × om te wissen",
      });
    } else if (actiefGespreksGeheugen.materiaalFactor && actiefGespreksGeheugen.materiaalFactor !== 1.0) {
      items.push({
        key: "materiaalFactor",
        label: `factor ${actiefGespreksGeheugen.materiaalFactor}x`,
        title: "Materiaalfactor: klik op × om te wissen",
      });
    }
    if (actiefGespreksGeheugen.opstelling) {
      items.push({
        key: "opstelling",
        label: actiefGespreksGeheugen.opstelling,
        title: "Opstelling",
      });
    } else if (actiefGespreksGeheugen.optie === "1") {
      items.push({
        key: "optie",
        label: "centraal",
        title: "Opstelling centraal",
      });
    } else if (actiefGespreksGeheugen.optie === "2") {
      items.push({
        key: "optie",
        label: "excentrisch",
        title: "Opstelling excentrisch",
      });
    } else if (actiefGespreksGeheugen.technique) {
      items.push({
        key: "technique",
        label: actiefGespreksGeheugen.technique,
        title: "Techniek",
      });
    }
    if (actiefGespreksGeheugen.doorstraaldeDikte) {
      items.push({
        key: "doorstraaldeDikte",
        label: `doorstr. ${actiefGespreksGeheugen.doorstraaldeDikte} mm`,
        title: "Totale doorstraalde dikte",
      });
    }
    if (actiefGespreksGeheugen.isGevuldeLeiding) {
      items.push({
        key: "isGevuldeLeiding",
        label: `gevuld (${actiefGespreksGeheugen.mediumNaam || "medium"})`,
        title: "Gevulde leiding",
      });
    }
    if (actiefGespreksGeheugen.kv) {
      items.push({
        key: "kv",
        label: `${actiefGespreksGeheugen.kv} kV`,
        title: "Buisspanning",
      });
    }
    return items;
  }

  function wisGeheugenParameter(key) {
    if (!actiefGespreksGeheugen) return;
    if (key === "diameter") {
      actiefGespreksGeheugen.diameter = null;
      actiefGespreksGeheugen.isPlaat = false;
    } else if (key === "wanddikte" || key === "schedule") {
      actiefGespreksGeheugen.wanddikte = null;
      actiefGespreksGeheugen.schedule = null;
    } else if (key === "doorstraaldeDikte" || key === "doorstraald") {
      actiefGespreksGeheugen.doorstraaldeDikte = null;
    } else if (key === "lascompensatie" || key === "compensatie") {
      actiefGespreksGeheugen.lascompensatie = null;
    } else if (key === "isGevuldeLeiding" || key === "gevuld" || key === "medium") {
      actiefGespreksGeheugen.isGevuldeLeiding = false;
      actiefGespreksGeheugen.mediumNaam = null;
      actiefGespreksGeheugen.mediumDichtheid = null;
    } else if (key === "kv" || key === "buisspanning") {
      actiefGespreksGeheugen.kv = null;
    } else if (key === "sfd") {
      actiefGespreksGeheugen.sfd = null;
    } else if (key === "ofa") {
      actiefGespreksGeheugen.ofa = null;
    } else if (key === "procedure" || key === "norm") {
      actiefGespreksGeheugen.procedure = null;
      actiefGespreksGeheugen.subProcedure = null;
      actiefGespreksGeheugen.onstreamKlasse = null;
      actiefGespreksGeheugen.isOnstream = false;
    } else if (key === "bron" || key === "bronTekst") {
      actiefGespreksGeheugen.bronTekst = null;
      actiefGespreksGeheugen.brongrootte = null;
      actiefGespreksGeheugen.bronType = null;
      actiefGespreksGeheugen.activiteit = null;
    } else if (key === "brongrootte") {
      actiefGespreksGeheugen.brongrootte = null;
    } else if (key === "activiteit") {
      actiefGespreksGeheugen.activiteit = null;
    } else if (key === "filmType") {
      actiefGespreksGeheugen.filmType = null;
    } else if (key === "pbMm") {
      actiefGespreksGeheugen.pbMm = 0;
    } else if (key === "feMm") {
      actiefGespreksGeheugen.feMm = 0;
    } else if (key === "betonMm") {
      actiefGespreksGeheugen.betonMm = 0;
    } else if (key === "baksteenMm") {
      actiefGespreksGeheugen.baksteenMm = 0;
    } else if (key === "isolatieMm" || key === "isolatie") {
      actiefGespreksGeheugen.isolatieMm = null;
    } else if (key === "onstreamKlasse" || key === "klasse") {
      actiefGespreksGeheugen.onstreamKlasse = null;
    } else if (key === "onstreamTechniek") {
      actiefGespreksGeheugen.onstreamTechniek = null;
    } else if (key === "lasbreedte") {
      actiefGespreksGeheugen.lasbreedte = null;
    } else if (key === "langsnaadLengte" || key === "langsnaad" || key === "lengte") {
      actiefGespreksGeheugen.langsnaadLengte = null;
    } else if (key === "focusVerandering" || key === "focus" || key === "ffd") {
      actiefGespreksGeheugen.oudeFocus = null;
      actiefGespreksGeheugen.nieuweFocus = null;
    } else if (key === "focusBegintijdSec" || key === "tijd") {
      actiefGespreksGeheugen.focusBegintijdSec = null;
    } else if (key === "filmWissel") {
      actiefGespreksGeheugen.oudeFilmType = null;
      actiefGespreksGeheugen.nieuweFilmType = null;
    } else if (key === "ciWissel") {
      actiefGespreksGeheugen.oudeCi = null;
      actiefGespreksGeheugen.nieuweCi = null;
    } else if (key === "mamin") {
      actiefGespreksGeheugen.maminVal = null;
      actiefGespreksGeheugen.maVal = null;
    } else if (key === "materiaalFactor" || key === "factor" || key === "materiaal" || key === "materiaalNaam") {
      actiefGespreksGeheugen.materiaalFactor = null;
      actiefGespreksGeheugen.materiaalNaam = null;
      actiefGespreksGeheugen.materiaalFactorHandmatig = null;
    } else if (key === "optie" || key === "opstelling" || key === "technique") {
      actiefGespreksGeheugen.opstelling = null;
      actiefGespreksGeheugen.optie = null;
      actiefGespreksGeheugen.technique = null;
      actiefGespreksGeheugen.ovaaltje = null;
    } else if (actiefGespreksGeheugen[key] !== undefined) {
      if (typeof actiefGespreksGeheugen[key] === "boolean") actiefGespreksGeheugen[key] = false;
      else if (typeof actiefGespreksGeheugen[key] === "number") actiefGespreksGeheugen[key] = 0;
      else actiefGespreksGeheugen[key] = null;
    }

    synchroniseerDOMFormulier(actiefGespreksGeheugen);

    renderGeheugenBalk();
  }

  function renderGeheugenBalk() {
    if (typeof document === "undefined") return;
    const bar = document.getElementById("rt-ai-memory-bar");
    if (bar) {
      const html = geefGeheugenBadgesHtml();
      bar.innerHTML = html || `<div id="rt-ai-context-container" class="rt-ai-memory-empty">🧠 <em>Geheugen is leeg.</em></div>`;
      return;
    }
    const container = document.getElementById("rt-ai-context-container");
    if (container) {
      const html = geefGeheugenBadgesHtml();
      if (html) {
        container.outerHTML = html;
      } else {
        container.outerHTML = `<div id="rt-ai-context-container" class="rt-ai-memory-empty">🧠 <em>Geheugen is leeg.</em></div>`;
      }
    }
  }

  function geefBronDropdownHtml() {
    const curTekst = (actiefGespreksGeheugen.bronTekst || "").toLowerCase();
    const curType = (actiefGespreksGeheugen.bronType || "").toLowerCase();
    const curSize = actiefGespreksGeheugen.brongrootte;

    let bronnenOptions = "";
    if (Array.isArray(bronnenData) && bronnenData.length > 0) {
      bronnenOptions = bronnenData
        .map((b) => {
          const act = b.currentActivity || b.initialActivity || 0;
          const isSelected = curTekst === b.name.toLowerCase() || curTekst.startsWith(b.name.toLowerCase() + " ");
          return `<option value="bron_${b.name}" ${isSelected ? "selected" : ""} style="background:#222; color:#fff;">${b.name} (${b.typeLabel}, ${b.size} mm) [${act.toFixed(1)} Ci]</option>`;
        })
        .join("");
    }

    const isSmart = (curTekst.includes("smart evo") || curTekst === "smart") && curSize === 1;
    const isYxlon = curTekst.includes("yxlon") || (curTekst.includes("300") && curSize === 3);
    const isCeram = curTekst.includes("ceram") || (curTekst.includes("balteau") && curSize === 2.5);
    const isRondstraler = curTekst.includes("rondstraler") || (curTekst.includes("balteau") && curSize === 5);
    const hasKnownName = (bronnenData || []).some(
      (b) => curTekst === b.name.toLowerCase() || curTekst.startsWith(b.name.toLowerCase() + " ")
    );
    const isGenSe = !isSmart && !isYxlon && !isCeram && !isRondstraler && !hasKnownName && (curType === "se75" || curTekst.includes("se-75") || curTekst.includes("selenium"));
    const isGenIr = !isSmart && !isYxlon && !isCeram && !isRondstraler && !hasKnownName && (curType === "ir192" || curTekst.includes("ir-192") || curTekst.includes("iridium"));
    const isGenCo = !isSmart && !isYxlon && !isCeram && !isRondstraler && !hasKnownName && (curType === "co60" || curTekst.includes("co-60") || curTekst.includes("kobalt"));

    const isAnySelected = Boolean(
      actiefGespreksGeheugen.bronTekst ||
      (actiefGespreksGeheugen.bronType && actiefGespreksGeheugen.bronType !== "") ||
      actiefGespreksGeheugen.brongrootte
    );

    return `<span class="rt-ai-bron-pill ${isAnySelected ? 'active' : ''}" style="display:inline-flex; align-items:center; background:#181818; border:1px solid ${isAnySelected ? '#f5df4d' : 'rgba(245,223,77,0.45)'}; border-radius:14px; padding:2px 8px; font-size:0.8rem; margin:2px 0; box-shadow:0 1px 3px rgba(0,0,0,0.3); vertical-align:middle; transition:border-color 0.2s;">
      <i class="fas fa-crosshairs" style="color:#f5df4d; font-size:0.75rem; margin-right:4px;"></i>
      <select class="rt-ai-bron-select" onchange="window.RtAssistant && window.RtAssistant.selecteerBronUitDropdown(this.value);" title="Snelkeuze bron of focusafmeting" style="background:transparent; border:none; color:${isAnySelected ? '#f5df4d' : '#f0f0f0'}; font-family:'Roboto Condensed', sans-serif; font-size:0.8rem; font-weight:600; cursor:pointer; outline:none; padding-right:2px; max-width:240px; text-overflow:ellipsis;">
        <option value="" ${!isAnySelected ? "selected" : ""} style="background:#222; color:#f5df4d;">Bron / focus ▾</option>
        <optgroup label="Actuele Gammabronnen (bronnen.csv)" style="background:#222; color:#f5df4d;">
          ${bronnenOptions}
        </optgroup>
        <optgroup label="Röntgenbuizen" style="background:#222; color:#38bdf8;">
          <option value="smart" ${isSmart ? "selected" : ""} style="background:#222; color:#fff;">Smart EVO (1.0 mm focus)</option>
          <option value="yxlon_300" ${isYxlon ? "selected" : ""} style="background:#222; color:#fff;">Yxlon 300 (3.0 mm focus)</option>
          <option value="balteau_ceram" ${isCeram ? "selected" : ""} style="background:#222; color:#fff;">Balteau Ceram (2.5 mm focus)</option>
          <option value="balteau_rondstraler" ${isRondstraler ? "selected" : ""} style="background:#222; color:#fff;">Balteau Rondstraler (5.0 mm focus)</option>
        </optgroup>
        <optgroup label="Generieke Isotopen" style="background:#222; color:#ccc;">
          <option value="gen_se75" ${isGenSe ? "selected" : ""} style="background:#222; color:#fff;">Standaard Se-75 (3.0 mm)${isGenSe && actiefGespreksGeheugen.activiteit ? ` [${actiefGespreksGeheugen.activiteit} Ci]` : ""}</option>
          <option value="gen_ir192" ${isGenIr ? "selected" : ""} style="background:#222; color:#fff;">Standaard Ir-192 (2.8 mm)${isGenIr && actiefGespreksGeheugen.activiteit ? ` [${actiefGespreksGeheugen.activiteit} Ci]` : ""}</option>
          <option value="gen_co60" ${isGenCo ? "selected" : ""} style="background:#222; color:#fff;">Standaard Co-60 (3.5 mm)${isGenCo && actiefGespreksGeheugen.activiteit ? ` [${actiefGespreksGeheugen.activiteit} Ci]` : ""}</option>
        </optgroup>
        ${isAnySelected ? '<option value="wis" style="background:#222; color:#ff6b6b;">❌ Wis bronkeuze</option>' : ''}
      </select>
      ${isAnySelected ? `<button type="button" onclick="event.stopPropagation(); window.RtAssistant && window.RtAssistant.wisGeheugenParameter('bron');" title="Wis bronkeuze uit geheugen" style="background:none; border:none; color:#ff6b6b; cursor:pointer; padding:0 0 0 5px; margin:0; font-size:1.05rem; line-height:1; font-weight:bold; display:inline-flex; align-items:center;" onmouseover="this.style.color='#ff3333'" onmouseout="this.style.color='#ff6b6b'">&times;</button>` : ''}
    </span>`;
  }

  function selecteerBronUitDropdown(val) {
    if (!val || val === "wis") {
      wisGeheugenParameter("bron");
      return;
    }
    const wasRondstraler = Boolean(actiefGespreksGeheugen.bronTekst && /rondstraler/i.test(actiefGespreksGeheugen.bronTekst));
    if (wasRondstraler && val !== "balteau_rondstraler") {
      if (actiefGespreksGeheugen.optie === "1") actiefGespreksGeheugen.optie = null;
      if (actiefGespreksGeheugen.opstelling === "Opstelling 5/A (centraal)") actiefGespreksGeheugen.opstelling = null;
      if (actiefGespreksGeheugen.technique === "SWSI") actiefGespreksGeheugen.technique = null;
      if (actiefGespreksGeheugen.diameter && actiefGespreksGeheugen.sfd === Math.round(actiefGespreksGeheugen.diameter / 2)) {
        actiefGespreksGeheugen.sfd = null;
      }
    }
    const isGenericGamma = val === "gen_se75" || val === "gen_ir192" || val === "gen_co60";

    if (val.startsWith("bron_")) {
      const bName = val.replace("bron_", "").trim();
      const b = (bronnenData || []).find((x) => x.name.toLowerCase() === bName.toLowerCase());
      if (b) {
        actiefGespreksGeheugen.bronTekst = b.name;
        actiefGespreksGeheugen.bronType = b.type;
        actiefGespreksGeheugen.brongrootte = b.size;
        actiefGespreksGeheugen.activiteit = b.currentActivity || null;
      }
    } else if (val === "smart") {
      actiefGespreksGeheugen.bronTekst = "Smart EVO (1.0 mm)";
      actiefGespreksGeheugen.bronType = "Rontgen";
      actiefGespreksGeheugen.brongrootte = 1.0;
      actiefGespreksGeheugen.activiteit = null;
    } else if (val === "yxlon_300" || val === "yxlon_smart") {
      actiefGespreksGeheugen.bronTekst = "Yxlon 300 (3.0 mm)";
      actiefGespreksGeheugen.bronType = "Rontgen";
      actiefGespreksGeheugen.brongrootte = 3.0;
      actiefGespreksGeheugen.activiteit = null;
    } else if (val === "balteau_ceram") {
      actiefGespreksGeheugen.bronTekst = "Balteau Ceram (2.5 mm)";
      actiefGespreksGeheugen.bronType = "Rontgen";
      actiefGespreksGeheugen.brongrootte = 2.5;
      actiefGespreksGeheugen.activiteit = null;
    } else if (val === "balteau_rondstraler") {
      actiefGespreksGeheugen.bronTekst = "Balteau Rondstraler (5.0 mm)";
      actiefGespreksGeheugen.bronType = "Rontgen";
      actiefGespreksGeheugen.brongrootte = 5.0;
      actiefGespreksGeheugen.activiteit = null;
      actiefGespreksGeheugen.optie = "1";
      actiefGespreksGeheugen.technique = "SWSI";
      actiefGespreksGeheugen.opstelling = "Opstelling 5/A (centraal)";
      if (actiefGespreksGeheugen.diameter && actiefGespreksGeheugen.diameter > 0) {
        actiefGespreksGeheugen.sfd = Math.round(actiefGespreksGeheugen.diameter / 2);
      }
    } else if (val === "gen_se75") {
      if (actiefGespreksGeheugen.bronType !== "Se75") actiefGespreksGeheugen.activiteit = null;
      actiefGespreksGeheugen.bronTekst = "Se-75 (3.0 mm)";
      actiefGespreksGeheugen.bronType = "Se75";
      actiefGespreksGeheugen.brongrootte = 3.0;
    } else if (val === "gen_ir192") {
      if (actiefGespreksGeheugen.bronType !== "Ir192") actiefGespreksGeheugen.activiteit = null;
      actiefGespreksGeheugen.bronTekst = "Ir-192 (2.8 mm)";
      actiefGespreksGeheugen.bronType = "Ir192";
      actiefGespreksGeheugen.brongrootte = 2.8;
    } else if (val === "gen_co60") {
      if (actiefGespreksGeheugen.bronType !== "Co60") actiefGespreksGeheugen.activiteit = null;
      actiefGespreksGeheugen.bronTekst = "Co-60 (3.5 mm)";
      actiefGespreksGeheugen.bronType = "Co60";
      actiefGespreksGeheugen.brongrootte = 3.5;
    }

    // Directe activiteit (Curie) invoer voor generieke isotopen
    if (isGenericGamma) {
      const isSe = val === "gen_se75";
      const isIr = val === "gen_ir192";
      const bronLabel = isSe ? "Se-75 (3.0 mm)" : (isIr ? "Ir-192 (2.8 mm)" : "Co-60 (3.5 mm)");
      const targetType = isSe ? "Se75" : (isIr ? "Ir192" : "Co60");
      const defaultCi = (actiefGespreksGeheugen.bronType === targetType && actiefGespreksGeheugen.activiteit)
        ? String(actiefGespreksGeheugen.activiteit)
        : "";

      if (typeof window !== "undefined" && typeof window.prompt === "function") {
        const invoer = window.prompt(`Voer de activiteit in Curie (Ci) in voor ${bronLabel}:`, defaultCi);
        if (invoer !== null && invoer.trim() !== "") {
          const parsed = parseFloat(invoer.replace(",", ".").trim());
          if (!isNaN(parsed) && parsed > 0) {
            actiefGespreksGeheugen.activiteit = Math.round(parsed * 10) / 10;
          }
        }
      }
    }

    synchroniseerDOMFormulier(actiefGespreksGeheugen);

    renderGeheugenBalk();

    if (
      actiefGespreksGeheugen.verwachtParameter === "brongrootte" ||
      actiefGespreksGeheugen.verwachtParameter === "focus" ||
      actiefGespreksGeheugen.verwachtParameter === "bron" ||
      actiefGespreksGeheugen.verwachtParameter === "activiteit"
    ) {
      if (isGenericGamma && !actiefGespreksGeheugen.activiteit) {
        vraagActiviteitInvoer(val);
        return;
      }
      const q = actiefGespreksGeheugen.activiteit
        ? `${actiefGespreksGeheugen.activiteit} Curie`
        : (actiefGespreksGeheugen.bronTekst || `${actiefGespreksGeheugen.brongrootte} mm`);
      actiefGespreksGeheugen.verwachtParameter = null;
      verwerkVraagDirect(q, { isChip: true });
      return;
    }

    if (isGenericGamma && !actiefGespreksGeheugen.activiteit) {
      vraagActiviteitInvoer(val);
      return;
    }

    if (actiefGespreksGeheugen.laatsteIntentie) {
      herberekenLaatsteVraag();
      return;
    }

    if (isGenericGamma) {
      toonBronBevestiging(val);
    }
  }

  function herberekenLaatsteVraag() {
    if (typeof actiefGespreksGeheugen === "undefined" || !actiefGespreksGeheugen || !actiefGespreksGeheugen.laatsteIntentie) {
      return false;
    }
    const intentMap = {
      opnames: "Hoeveel opnames?",
      omtrek: "Wat is de omtrek?",
      opname_verdeling: "Verdelen van de opnames",
      stralingstijd: "Wat is de stralingstijd?",
      min_ffd: "Wat is de minimale FFD?",
      draadjes: "Welk draadje moet ik zien?",
      bki: "Welk draadje moet ik zien?",
      afzetting: "Wat is de veilige afzetting?",
      onstream_ffd: "Wat is de onstream FFD?",
      onstream_bron: "Welke onstream bron?",
      onstream_tijd: "Wat is de onstream stralingstijd?",
      buistabel: "Buistabel berekenen",
      focusverandering: "Focusverandering berekenen",
      gevulde_leiding: "Gevulde leiding berekenen",
      materiaalfactor: "Wat is de materiaalfactor?",
      langsnaad: "Langsnaad verdelen",
      bron_verval: "Bronverval berekenen",
      schedule: "Wat is de wanddikte van het schedule?",
      mag_ik: "Mag ik deze opstelling gebruiken?",
      lasoverdikte: "Wat is de lasoverdikte?",
    };
    const intent = actiefGespreksGeheugen.laatsteIntentie;
    const vraag = intentMap[intent] || intent.replace(/_/g, " ");
    actiefGespreksGeheugen.verwachtParameter = null;
    verwerkVraagDirect(vraag, { isChip: true });
    return true;
  }

  function vraagActiviteitInvoer(val) {
    if (typeof actiefGespreksGeheugen === "undefined" || !actiefGespreksGeheugen) return;
    actiefGespreksGeheugen.verwachtParameter = "activiteit";
    const isSe = val === "gen_se75" || (actiefGespreksGeheugen.bronType === "Se75");
    const isIr = val === "gen_ir192" || (actiefGespreksGeheugen.bronType === "Ir192");
    const bronNaam = isSe ? "Standaard Se-75 (3.0 mm)" : (isIr ? "Standaard Ir-192 (2.8 mm)" : "Standaard Co-60 (3.5 mm)");
    const chips = (!isSe && !isIr)
      ? ["15 Curie", "25 Curie", "50 Curie"]
      : isIr
      ? ["15 Curie", "25 Curie", "35 Curie", "50 Curie", "60 Curie"]
      : ["15 Curie", "25 Curie", "35 Curie", "45 Curie", "50 Curie"];

    if (typeof document !== "undefined") {
      const chipsHtml = `<div class="rt-ai-chips-row">` +
        chips.map((c) => `<button type="button" class="rt-ai-chip-btn" onclick="window.RtAssistant && window.RtAssistant.verstuurSuggestie('${c}')">${c}</button>`).join("") +
        `</div>`;
      voegOfUpdateGeschiedenis(
        null,
        `Bronkeuze: <strong>${bronNaam}</strong>`,
        `🎯 <strong>${bronNaam}</strong> geselecteerd.<br><br>Hoeveel <strong>Curie</strong> (activiteit) heeft deze bron?${chipsHtml}`
      );
      renderGeheugenBalk();
      const transEl = document.getElementById("rt-ai-transcript");
      if (transEl) {
        transEl.innerHTML = `Bronkeuze: <strong>${bronNaam}</strong> (wacht op activiteit...)`;
      }
      const inp = document.getElementById("rt-ai-input");
      if (inp) {
        inp.placeholder = "Vul aantal Curie in (bijv. 30 Ci)...";
        inp.focus();
      }
    }
  }

  function toonBronBevestiging(val) {
    if (typeof actiefGespreksGeheugen === "undefined" || !actiefGespreksGeheugen) return;
    const isSe = val === "gen_se75" || (actiefGespreksGeheugen.bronType === "Se75");
    const isIr = val === "gen_ir192" || (actiefGespreksGeheugen.bronType === "Ir192");
    const bronNaam = isSe ? "Standaard Se-75 (3.0 mm)" : (isIr ? "Standaard Ir-192 (2.8 mm)" : "Standaard Co-60 (3.5 mm)");
    const ci = actiefGespreksGeheugen.activiteit;

    if (typeof document !== "undefined") {
      const suggestieChips = [];
      suggestieChips.push("Afzetting berekenen");
      if (actiefGespreksGeheugen.diameter) {
        const diaLabel = formatMmNaarDuimLabel(actiefGespreksGeheugen.diameter);
        suggestieChips.push(`Stralingstijd voor ${diaLabel}`);
      } else if (actiefGespreksGeheugen.isPlaat) {
        suggestieChips.push("Stralingstijd plaat");
      } else {
        suggestieChips.push("Stralingstijd 6 duimer Sch 40", "Stralingstijd 4 duimer Sch 40", "Stralingstijd plaat");
      }
      const chipsHtml = `<div class="rt-ai-chips-row">` +
        suggestieChips.map((c) => `<button type="button" class="rt-ai-chip-btn" onclick="window.RtAssistant && window.RtAssistant.verstuurSuggestie('${c}')">${c}</button>`).join("") +
        `</div>`;
      voegOfUpdateGeschiedenis(
        null,
        `Bronkeuze: <strong>${bronNaam}</strong> [${ci} Ci]`,
        `🎯 <strong>${bronNaam}</strong> ingesteld met <strong>${ci} Curie</strong>.<br><br>Waarmee wil je verder rekenen?${chipsHtml}`
      );
      renderGeheugenBalk();
      const transEl = document.getElementById("rt-ai-transcript");
      if (transEl) {
        transEl.innerHTML = `Bronkeuze: <strong>${bronNaam}</strong> [${ci} Ci]`;
      }
    }
  }

  function wijzigActiviteitViaPrompt() {
    if (typeof window === "undefined" || typeof window.prompt !== "function") return;
    const bronNaam = actiefGespreksGeheugen.bronTekst || actiefGespreksGeheugen.bronType || "bron";
    const defaultVal = actiefGespreksGeheugen.activiteit ? String(actiefGespreksGeheugen.activiteit) : "";
    const antw = window.prompt(`Voer de activiteit in Curie (Ci) in voor ${bronNaam}:`, defaultVal);
    if (antw !== null && antw.trim() !== "") {
      const parsed = parseFloat(antw.replace(",", ".").trim());
      if (!isNaN(parsed) && parsed > 0) {
        actiefGespreksGeheugen.activiteit = Math.round(parsed * 10) / 10;
        synchroniseerDOMFormulier(actiefGespreksGeheugen);
        renderGeheugenBalk();
        if (!herberekenLaatsteVraag()) {
          toonBronBevestiging();
        }
      }
    }
  }

  function geefNormDropdownHtml() {
    const curProc = (actiefGespreksGeheugen.procedure || "").toLowerCase();
    const curKl = (actiefGespreksGeheugen.onstreamKlasse || "").toLowerCase();
    const isOnstream = Boolean(actiefGespreksGeheugen.isOnstream || curKl || curProc.includes("onstream"));

    const isEnB = !isOnstream && (curProc === "en-b" || curProc === "klasse b" || curProc === "b");
    const isEnA = !isOnstream && (curProc === "en-a" || curProc === "klasse a" || curProc === "a");
    const isAsme = !isOnstream && (curProc.includes("asme") || curProc.includes("section v") || curProc.includes("artikel 2"));

    const isOnstreamTb = isOnstream && (curKl === "tb" || curProc.includes("tb"));
    const isOnstreamTa = isOnstream && (curKl === "ta" || curProc.includes("ta"));

    const isAnySelected = isEnB || isEnA || isAsme || isOnstreamTb || isOnstreamTa;

    return `<span class="rt-ai-norm-pill ${isAnySelected ? 'active' : ''}" style="display:inline-flex; align-items:center; background:#181818; border:1px solid ${isAnySelected ? '#f5df4d' : 'rgba(245,223,77,0.45)'}; border-radius:14px; padding:2px 8px; font-size:0.8rem; margin:2px 0; box-shadow:0 1px 3px rgba(0,0,0,0.3); vertical-align:middle; transition:border-color 0.2s;">
      <i class="fas fa-file-contract" style="color:#f5df4d; font-size:0.75rem; margin-right:4px;"></i>
      <select class="rt-ai-norm-select" onchange="window.RtAssistant && window.RtAssistant.selecteerNormUitDropdown(this.value);" title="Snelkeuze kwaliteitsklasse / norm of onstream" style="background:transparent; border:none; color:${isAnySelected ? '#f5df4d' : '#f0f0f0'}; font-family:'Roboto Condensed', sans-serif; font-size:0.8rem; font-weight:600; cursor:pointer; outline:none; padding-right:2px; max-width:200px; text-overflow:ellipsis;">
        <option value="" ${!isAnySelected ? "selected" : ""} style="background:#222; color:#f5df4d;">Norm ▾</option>
        <optgroup label="Lasonderzoek (EN ISO 17636 / ASME)" style="background:#222; color:#f5df4d;">
          <option value="EN-B" ${isEnB ? "selected" : ""} style="background:#222; color:#fff;">EN Klasse B (streng)</option>
          <option value="EN-A" ${isEnA ? "selected" : ""} style="background:#222; color:#fff;">EN Klasse A</option>
          <option value="ASME" ${isAsme ? "selected" : ""} style="background:#222; color:#fff;">ASME Section V</option>
        </optgroup>
        <optgroup label="Onstream Inspectie (RT-21021 / RT-21022)" style="background:#222; color:#38bdf8;">
          <option value="onstream_tb" ${isOnstreamTb ? "selected" : ""} style="background:#222; color:#fff;">Onstream Klasse TB (improved)</option>
          <option value="onstream_ta" ${isOnstreamTa ? "selected" : ""} style="background:#222; color:#fff;">Onstream Klasse TA (basic)</option>
        </optgroup>
        ${isAnySelected ? '<option value="wis" style="background:#222; color:#ff6b6b;">❌ Wis normkeuze</option>' : ''}
      </select>
      ${isAnySelected ? `<button type="button" onclick="event.stopPropagation(); window.RtAssistant && window.RtAssistant.wisGeheugenParameter('procedure');" title="Wis normkeuze uit geheugen" style="background:none; border:none; color:#ff6b6b; cursor:pointer; padding:0 0 0 5px; margin:0; font-size:1.05rem; line-height:1; font-weight:bold; display:inline-flex; align-items:center;" onmouseover="this.style.color='#ff3333'" onmouseout="this.style.color='#ff6b6b'">&times;</button>` : ''}
    </span>`;
  }

  function selecteerNormUitDropdown(val) {
    if (!val || val === "wis") {
      wisGeheugenParameter("procedure");
      synchroniseerDOMFormulier(actiefGespreksGeheugen);
      renderGeheugenBalk();
      return;
    }

    if (val === "onstream_tb") {
      actiefGespreksGeheugen.isOnstream = true;
      actiefGespreksGeheugen.onstreamKlasse = "tb";
      actiefGespreksGeheugen.procedure = "Onstream TB";
    } else if (val === "onstream_ta") {
      actiefGespreksGeheugen.isOnstream = true;
      actiefGespreksGeheugen.onstreamKlasse = "ta";
      actiefGespreksGeheugen.procedure = "Onstream TA";
    } else {
      // EN-B, EN-A, ASME
      actiefGespreksGeheugen.procedure = val;
      actiefGespreksGeheugen.isOnstream = false;
      actiefGespreksGeheugen.onstreamKlasse = null;
    }

    synchroniseerDOMFormulier(actiefGespreksGeheugen);

    renderGeheugenBalk();

    // Als RADI wachtte op procedure of onstreamKlasse, direct doorgaan!
    if (
      actiefGespreksGeheugen.verwachtParameter === "procedure" ||
      actiefGespreksGeheugen.verwachtParameter === "norm" ||
      actiefGespreksGeheugen.verwachtParameter === "onstreamKlasse" ||
      actiefGespreksGeheugen.verwachtParameter === "klasse"
    ) {
      const q = val === "onstream_tb" ? "klasse tb" : (val === "onstream_ta" ? "klasse ta" : val);
      actiefGespreksGeheugen.verwachtParameter = null;
      verwerkVraagDirect(q, { isChip: true });
      return;
    }

    if (actiefGespreksGeheugen.laatsteIntentie) {
      herberekenLaatsteVraag();
    }
  }

  function geefGeheugenBadgesHtml() {
    const items = geefGeheugenItems();
    const hasSourceSelected = Boolean(
      actiefGespreksGeheugen.bronTekst ||
      (actiefGespreksGeheugen.bronType && actiefGespreksGeheugen.bronType !== "") ||
      actiefGespreksGeheugen.brongrootte
    );
    const hasNormSelected = Boolean(
      actiefGespreksGeheugen.procedure ||
      actiefGespreksGeheugen.onstreamKlasse
    );

    const curTekst = (actiefGespreksGeheugen.bronTekst || "").toLowerCase();
    const hasCsvSource = (bronnenData || []).some(
      (b) => curTekst === b.name.toLowerCase() || curTekst.startsWith(b.name.toLowerCase() + " ")
    );

    // Filter bron en norm gerelateerde items uit normale badges omdat ze in de bron- en norm-dropdown pills staan
    const nonDropdownItems = items.filter(
      (it) =>
        it.key !== "bron" &&
        it.key !== "brongrootte" &&
        it.key !== "procedure" &&
        it.key !== "onstreamKlasse" &&
        (it.key !== "activiteit" || !hasCsvSource)
    );

    function geefKortBadgeLabel(it) {
      if (it.key === "diameter" && actiefGespreksGeheugen.diameter) {
        return `Dia ${actiefGespreksGeheugen.diameter}`;
      }
      if (it.key === "wanddikte" && actiefGespreksGeheugen.wanddikte) {
        return actiefGespreksGeheugen.schedule
          ? `WD ${actiefGespreksGeheugen.wanddikte} (${actiefGespreksGeheugen.schedule})`
          : `WD ${actiefGespreksGeheugen.wanddikte}`;
      }
      if (it.key === "sfd" && actiefGespreksGeheugen.sfd) {
        return `FFD ${actiefGespreksGeheugen.sfd}`;
      }
      if (it.key === "ofa" && actiefGespreksGeheugen.ofa) {
        return `OFA ${actiefGespreksGeheugen.ofa}`;
      }
      if (it.key === "filmType" && actiefGespreksGeheugen.filmType) {
        return `Film ${actiefGespreksGeheugen.filmType}`;
      }
      if (it.key === "activiteit" && actiefGespreksGeheugen.activiteit) {
        return `${actiefGespreksGeheugen.activiteit} Ci`;
      }
      if (it.key === "materiaalFactor") {
        if (actiefGespreksGeheugen.materiaalNaam) {
          return actiefGespreksGeheugen.materiaalNaam
            .replace(/\s*\(.*?\)\s*/g, "")
            .replace(/\s*\/\s*316L/i, "")
            .replace(/\s*\/\s*304L/i, "")
            .trim();
        }
        if (actiefGespreksGeheugen.materiaalFactor) {
          return `Factor ${actiefGespreksGeheugen.materiaalFactor}x`;
        }
      }
      if (it.key === "pbMm" && actiefGespreksGeheugen.pbMm) {
        return `Pb ${actiefGespreksGeheugen.pbMm} mm`;
      }
      if (it.key === "feMm" && actiefGespreksGeheugen.feMm) {
        return `Fe ${actiefGespreksGeheugen.feMm} mm`;
      }
      if (it.key === "betonMm" && actiefGespreksGeheugen.betonMm) {
        const bVal = actiefGespreksGeheugen.betonMm;
        return bVal >= 10 && bVal % 10 === 0 ? `Beton ${bVal / 10} cm` : `Beton ${bVal} mm`;
      }
      if (it.key === "baksteenMm" && actiefGespreksGeheugen.baksteenMm) {
        const mVal = actiefGespreksGeheugen.baksteenMm;
        return mVal >= 10 && mVal % 10 === 0 ? `Baksteen ${mVal / 10} cm` : `Baksteen ${mVal} mm`;
      }
      if (it.key === "lascompensatie") {
        return `Las ${actiefGespreksGeheugen.lascompensatie} mm`;
      }
      if (it.key === "isolatieMm") {
        return actiefGespreksGeheugen.isolatieMm === 0 ? "Geen iso" : `Iso ${actiefGespreksGeheugen.isolatieMm} mm`;
      }
      if (it.key === "focusBegintijdSec" && actiefGespreksGeheugen.focusBegintijdSec) {
        return `Tijd ${formatSecondenKort(actiefGespreksGeheugen.focusBegintijdSec)}`;
      }
      return it.label;
    }

    const badgesHtml = nonDropdownItems
      .map((it) => {
        const kortLabel = geefKortBadgeLabel(it);
        if (it.key === "activiteit") {
          return `<span class="rt-ai-param-badge rt-ai-param-badge-edit" onclick="window.RtAssistant && window.RtAssistant.wijzigActiviteitViaPrompt();" title="Activiteit: ${it.label} — klik om te wijzigen, of × om te wissen"><span class="rt-ai-badge-text">${kortLabel} ✏️</span><button type="button" class="rt-ai-badge-del" onclick="event.stopPropagation(); window.RtAssistant && window.RtAssistant.wisGeheugenParameter('${it.key}');" title="Wis ${it.label} uit geheugen">&times;</button></span>`;
        }
        return `<span class="rt-ai-param-badge" title="${it.title || it.label}: ${it.label} — klik op × om te wissen"><span class="rt-ai-badge-text">${kortLabel}</span><button type="button" class="rt-ai-badge-del" onclick="event.stopPropagation(); window.RtAssistant && window.RtAssistant.wisGeheugenParameter('${it.key}');" title="Wis ${it.label} uit geheugen">&times;</button></span>`;
      })
      .join("");

    const bronPill = geefBronDropdownHtml();
    const normPill = geefNormDropdownHtml();
    const hasAny = nonDropdownItems.length > 0 || hasSourceSelected || hasNormSelected;

    const clearBtnHtml = hasAny
      ? `<button type="button" class="rt-ai-clear-mem-btn" onclick="event.stopPropagation(); window.RtAssistant && window.RtAssistant.resetGespreksGeheugen();" title="Wis alle parameters uit het geheugen (schone lei)"><i class="fas fa-trash-alt"></i><span class="rt-ai-clear-text">Wis</span></button>`
      : "";

    return `<div id="rt-ai-context-container" class="rt-ai-context-container">
      ${nonDropdownItems.length > 0 ? `<div class="rt-ai-memory-items">${badgesHtml}</div>` : ""}
      <div class="rt-ai-memory-controls">
        ${bronPill}
        ${normPill}
        ${clearBtnHtml}
      </div>
    </div>`;
  }

  function geefGeheugenSamenvatting() {
    return geefGeheugenItems().map((it) => it.label).join(" | ");
  }

  // Synchroniseert parameters met het grafische formulier van pruts.html indien geopend op die pagina
  function synchroniseerDOMFormulier(params) {
    if (typeof document === "undefined") return false;
    const procEl = document.getElementById("procedure");
    const diaEl = document.getElementById("diameter");
    const wdEl = document.getElementById("wanddikte");
    if (!procEl || !diaEl) return false;

    let gewijzigd = false;
    if (params.procedure && procEl) {
      procEl.value = params.procedure;
      procEl.dispatchEvent(new Event("change"));
      gewijzigd = true;
    }
    if (params.subProcedure) {
      const cb = document.getElementById("klantprocedureCheckbox");
      const subEl = document.getElementById("enBSubProcedure");
      if (cb && !cb.checked) {
        cb.checked = true;
        cb.dispatchEvent(new Event("change"));
      }
      if (subEl) {
        subEl.value = params.subProcedure;
        subEl.dispatchEvent(new Event("change"));
      }
      gewijzigd = true;
    }
    if (params.diameter !== null && !isNaN(params.diameter)) {
      diaEl.value = params.diameter;
      if (typeof window.resetManualEditFlags === "function") window.resetManualEditFlags();
      gewijzigd = true;
    }
    if (params.wanddikte !== null && !isNaN(params.wanddikte) && wdEl) {
      wdEl.value = params.wanddikte;
      if (typeof window.resetManualEditFlags === "function") window.resetManualEditFlags();
      gewijzigd = true;
    }
    if (params.technique) {
      const techEl = document.getElementById("technique");
      if (techEl) {
        techEl.value = params.technique;
        techEl.dispatchEvent(new Event("change"));
        gewijzigd = true;
      }
    }
    if (params.optie !== null && params.optie !== undefined) {
      const optEl = document.getElementById("optie");
      if (optEl) {
        optEl.value = params.optie;
        optEl.dispatchEvent(new Event("change"));
        gewijzigd = true;
      }
    }
    if (params.ovaaltje) {
      const ovEl = document.getElementById("ovaaltje");
      if (ovEl) {
        ovEl.value = params.ovaaltje;
        ovEl.dispatchEvent(new Event("change"));
        gewijzigd = true;
      }
    }
    if (params.lasbreedte !== null && !isNaN(params.lasbreedte)) {
      const lbEl = document.getElementById("lasbreedte");
      if (lbEl) {
        lbEl.value = params.lasbreedte;
        gewijzigd = true;
      }
    }
    if (params.bronTekst) {
      const srcEl = document.getElementById("source");
      if (srcEl) {
        if (/ir[-\s]?192/i.test(params.bronTekst) && srcEl.value !== "Ir192") {
          srcEl.value = "Ir192";
          srcEl.dispatchEvent(new Event("change"));
          gewijzigd = true;
        } else if (/se[-\s]?75/i.test(params.bronTekst) && srcEl.value !== "Se75") {
          srcEl.value = "Se75";
          srcEl.dispatchEvent(new Event("change"));
          gewijzigd = true;
        } else if (/x[-\s]?ray|buis|smart|balteau|yxlon/i.test(params.bronTekst) && srcEl.value !== "X-ray") {
          srcEl.value = "X-ray";
          srcEl.dispatchEvent(new Event("change"));
          gewijzigd = true;
        }
      }
    }
    if (typeof window.updateVisibility === "function") window.updateVisibility();
    if (typeof window.handleOptieAutoFill === "function") window.handleOptieAutoFill();
    if (typeof window.handleDiameterTechniqueRestriction === "function") window.handleDiameterTechniqueRestriction();
    if (typeof window.autoCalculate === "function") window.autoCalculate(!params.sfd);

    // Synchronisatie met pruts.html materiaalkeuze
    if (params.materiaalNaam && typeof window !== "undefined" && typeof window.setPrutsMaterial === "function") {
      window.setPrutsMaterial(params.materiaalNaam);
      gewijzigd = true;
    }

    // Synchronisatie met stralingstijd.html
    const matChk = document.getElementById("material_veranderd");
    const matFactorInput = document.getElementById("material_factor");
    if (matChk && matFactorInput && params.materiaalNaam) {
      const mat = zoekMateriaal(params.materiaalNaam);
      if (mat) {
        matChk.checked = true;
        const keuzeDiv = document.getElementById("material_keuze");
        if (keuzeDiv) keuzeDiv.style.display = "block";
        const isoEl = document.getElementById("isotope");
        const curIso = (isoEl && isoEl.value === "Se75") ? "Se75" : "Ir192";
        const fact = curIso === "Se75" ? mat.f_se75 : mat.f_ir192;
        matFactorInput.value = fact.toFixed(2);
        const searchInput = document.getElementById("material_search_input");
        if (searchInput) searchInput.value = mat.name;
        const badge = document.getElementById("selected_mat_badge");
        const badgeText = document.getElementById("selected_mat_text");
        if (badge && badgeText) {
          const werkStr = mat.werkstoff ? ` [${mat.werkstoff}]` : "";
          badgeText.innerHTML = `<strong>${mat.name}</strong>${werkStr} &bull; Factor <strong>${fact.toFixed(2)}</strong> (${curIso})`;
          badge.style.display = "flex";
        }
        if (typeof window.calculate === "function") window.calculate();
        gewijzigd = true;
      }
    }

    return gewijzigd;
  }

  // --- Centrale Vraagverwerker ---
  async function verwerkUniverseleVraag(ruweTekst, context = {}) {
    if (!ruweTekst || !ruweTekst.trim()) return { text: "Geen vraag ontvangen.", chips: [] };

    // Altijd actuele bronnen.csv ophalen (voor het geval de tabel gewijzigd is)
    await laadBronnenCsv(true);

    // Reset commando
    if (/\b(reset|wis\s*geheugen|nieuwe\s*vraag|nieuwe\s*berekening|begin\s*opnieuw|wis\s*alles|geheugen\s*leeg|schone\s*lei|nieuwe\s*klus|nieuwe\s*pijp|nieuwe\s*leiding)\b/i.test(ruweTekst.trim())) {
      resetGespreksGeheugen();
      return {
        text: "Gespreksgeheugen gewist. Waar kan ik je mee helpen? Stel gerust een nieuwe vraag.",
        chips: ["4 duimer sch 40 klasse B", "Hoeveel meter afzetten?", "Stralingstijd omrekenen", "Wat is het verschil tussen klasse A en B?"],
      };
    }

    // Direct bedankje (ongeacht eventueel eerder actief geheugen)
    if (
      /\b(dank\s*je|dankjewel|bedankt|top\s*bedankt|super\s*bedankt|super\s*dank|thanks|thx)\b/i.test(ruweTekst) &&
      !/\b(wat|hoe|hoeveel|bereken|welk|welke|zoek|wanneer)\b/i.test(ruweTekst) &&
      !ruweTekst.includes("?")
    ) {
      return {
        text: "Graag gedaan! Heel veel succes met de opname ☢️. Als je straks nog een andere berekening wilt doen of een FFD wilt controleren, vraag het gerust!",
        chips: ["Nieuwe berekening", "Geheugen wissen", "Afzettingsafstand", "Bronnenoverzicht"],
      };
    }

    // Direct kopiëren van de schietkaart via chip of commando
    if (/^(?:📋\s*)?(?:kopieer|copy)\s*(?:schietkaart|overzichtskaart)?$/i.test(ruweTekst.trim())) {
      kopieerSchietkaart();
      return {
        text: "📋 <strong>Schietkaart is gekopieerd naar je klembord!</strong><br><small style='opacity:0.85;'>Je kunt de gegevens nu direct plakken in een werkbon, rapport of notitie.</small>",
        chips: ["+ FFD 700", "+ Klasse A", "+ ASME", "Reset"],
      };
    }

    // Losse parameter wissen via chat (bijv. "wis diameter", "wis ffd", "verwijder wanddikte")
    const matchWis = ruweTekst.trim().match(/^(?:wis|verwijder|clear|delete)\s+(diameter|buis|wanddikte|dikte|schedule|sch|doorstraald|doorstraalde\s*dikte|gevuld|medium|kv|buisspanning|ffd|sfd|focus|bron|brongrootte|curie|activiteit|procedure|klasse|norm|film|filmtype|lood|afscherming|langsnaad|lengte|tijd|focusverandering|factor|materiaal|materiaalfactor|alles)$/i);
    if (matchWis) {
      const doel = matchWis[1].toLowerCase();
      if (doel === "alles") {
        resetGespreksGeheugen();
        return {
          text: "Volledig gespreksgeheugen gewist. Waar kan ik je mee helpen?",
          chips: [],
        };
      }
      let gewistNaam = "";
      if (doel.includes("dia") || doel === "buis") {
        wisGeheugenParameter("diameter");
        gewistNaam = "Diameter";
      } else if (doel.includes("doorstraald")) {
        wisGeheugenParameter("doorstraaldeDikte");
        gewistNaam = "Doorstraalde dikte";
      } else if (doel.includes("gevuld") || doel === "medium") {
        wisGeheugenParameter("isGevuldeLeiding");
        gewistNaam = "Gevulde leiding / medium";
      } else if (doel.includes("kv") || doel.includes("spanning")) {
        wisGeheugenParameter("kv");
        gewistNaam = "Buisspanning (kV)";
      } else if (doel.includes("wand") || doel === "dikte" || doel.includes("sch")) {
        wisGeheugenParameter("wanddikte");
        gewistNaam = "Wanddikte / Schedule";
      } else if (doel.includes("ffd") || doel.includes("sfd") || doel.includes("focus")) {
        wisGeheugenParameter("sfd");
        wisGeheugenParameter("focusVerandering");
        gewistNaam = "FFD / Focus";
      } else if (doel.includes("bron")) {
        wisGeheugenParameter("bron");
        gewistNaam = "Bron";
      } else if (doel.includes("curie") || doel.includes("activiteit")) {
        wisGeheugenParameter("activiteit");
        wisGeheugenParameter("ciWissel");
        gewistNaam = "Activiteit (Curie)";
      } else if (doel.includes("procedure") || doel.includes("klasse") || doel.includes("norm")) {
        wisGeheugenParameter("procedure");
        gewistNaam = "Kwaliteitsklasse";
      } else if (doel.includes("film")) {
        wisGeheugenParameter("filmType");
        wisGeheugenParameter("filmWissel");
        gewistNaam = "Filmtype";
      } else if (doel.includes("lood") || doel.includes("afscherming") || doel.includes("beton") || doel.includes("baksteen") || doel.includes("muur")) {
        wisGeheugenParameter("pbMm");
        wisGeheugenParameter("feMm");
        wisGeheugenParameter("betonMm");
        wisGeheugenParameter("baksteenMm");
        actiefGespreksGeheugen.muurOnbekendMm = null;
        gewistNaam = "Afscherming";
      } else if (doel.includes("langsnaad") || doel === "lengte") {
        wisGeheugenParameter("langsnaadLengte");
        gewistNaam = "Langsnaad lengte";
      } else if (doel.includes("focusverandering")) {
        wisGeheugenParameter("focusVerandering");
        gewistNaam = "Focusverandering";
      } else if (doel === "tijd") {
        wisGeheugenParameter("focusBegintijdSec");
        gewistNaam = "Begintijd";
      } else if (doel === "factor" || doel.includes("materiaal")) {
        wisGeheugenParameter("materiaalFactor");
        gewistNaam = "Materiaalfactor";
      }
      renderGeheugenBalk();
      return {
        text: `<strong>${gewistNaam}</strong> is gewist uit het geheugen.`,
        chips: [],
      };
    }

    const gefilterdeTekst = herstelVakjargon(ruweTekst);
    let intenties = bepaalVraagIntenties(gefilterdeTekst);
    const nieuwParsed = extractParametersDeterministisch(gefilterdeTekst);

    // Per-beurt flags resetten zodat ze alleen gelden wanneer ze in de huidige vraag zijn gebruikt
    actiefGespreksGeheugen.isRondAmbigu = Boolean(nieuwParsed.isRondAmbigu);
    actiefGespreksGeheugen.vervalInVerleden = Boolean(nieuwParsed.vervalInVerleden);

    // Merge met actiefGespreksGeheugen
    for (const k in nieuwParsed) {
      if (nieuwParsed[k] !== null && nieuwParsed[k] !== undefined) {
        if (k === "isolatieMm") {
          actiefGespreksGeheugen.isolatieMm = nieuwParsed.isolatieMm;
          if (actiefGespreksGeheugen.verwachtParameter === "isolatieMm") {
            actiefGespreksGeheugen.verwachtParameter = null;
          }
        } else if (typeof nieuwParsed[k] === "number" && (k === "pbMm" || k === "feMm" || k === "betonMm" || k === "baksteenMm" || k === "muurOnbekendMm")) {
          if (nieuwParsed[k] > 0 || nieuwParsed.verzetZonderAfscherming || /\b(lood|pb|staal|fe|beton|baksteen|metselwerk|muur|zonder|geen)\b/i.test(gefilterdeTekst)) {
            actiefGespreksGeheugen[k] = nieuwParsed[k];
            if ((k === "betonMm" || k === "baksteenMm") && nieuwParsed[k] > 0) {
              actiefGespreksGeheugen.muurOnbekendMm = null;
              if (actiefGespreksGeheugen.verwachtParameter === "muurMateriaal") {
                actiefGespreksGeheugen.verwachtParameter = null;
              }
            }
          }
        } else if (k === "onstreamTechniek" || k === "onstreamKlasse" || k === "afzettingDoelMeter" || k === "afzettingSubModus") {
          actiefGespreksGeheugen[k] = nieuwParsed[k];
          if (actiefGespreksGeheugen.verwachtParameter === k) {
            actiefGespreksGeheugen.verwachtParameter = null;
          }
        } else {
          actiefGespreksGeheugen[k] = nieuwParsed[k];
          if (actiefGespreksGeheugen.verwachtParameter === k) {
            actiefGespreksGeheugen.verwachtParameter = null;
          }
        }
      }
    }

    // Schedule koppeling synchroniseren met actiefGespreksGeheugen
    if (actiefGespreksGeheugen.schedule && actiefGespreksGeheugen.diameter) {
      const schInfo = zoekScheduleInfo(actiefGespreksGeheugen.diameter, actiefGespreksGeheugen.schedule);
      if (schInfo && schInfo.gevonden) {
        actiefGespreksGeheugen.scheduleInfo = schInfo;
        const schValNum = parseFloat(actiefGespreksGeheugen.schedule);
        if (actiefGespreksGeheugen.wanddikte === null || actiefGespreksGeheugen.wanddikte === undefined || actiefGespreksGeheugen.wanddikte === schValNum || nieuwParsed.schedule) {
          actiefGespreksGeheugen.wanddikte = schInfo.wt;
          if (actiefGespreksGeheugen.verwachtParameter === "wanddikte") {
            actiefGespreksGeheugen.verwachtParameter = null;
          }
        }
      }
    }

    // Als de gebruiker vraagt: "En wat als ik het centraal / met de rondstraler doe?"
    if (/\b(centraal|panoram|panoramisch|rondstraler|rondstralen)\b/i.test(gefilterdeTekst)) {
      actiefGespreksGeheugen.optie = "1";
      actiefGespreksGeheugen.technique = "SWSI";
      actiefGespreksGeheugen.opstelling = "Opstelling 5/A (SWSI centraal)";
    }

    if (actiefGespreksGeheugen.optie === "1" && actiefGespreksGeheugen.diameter && (!actiefGespreksGeheugen.sfd || nieuwParsed.diameter !== null)) {
      actiefGespreksGeheugen.sfd = Math.round(actiefGespreksGeheugen.diameter / 2);
    }

    // Automatisch totale doorstraalde dikte herberekenen bij een gevulde leiding als diameter en wanddikte bekend zijn
    if (actiefGespreksGeheugen.isGevuldeLeiding && actiefGespreksGeheugen.diameter && actiefGespreksGeheugen.wanddikte) {
      const D = actiefGespreksGeheugen.diameter;
      const t = actiefGespreksGeheugen.wanddikte;
      const binnenDia = D - 2 * t;
      if (binnenDia > 0) {
        const rho = actiefGespreksGeheugen.mediumDichtheid || 997;
        const staalEquiv = (rho / 7800) * binnenDia;
        actiefGespreksGeheugen.doorstraaldeDikte = Number((2 * t + staalEquiv).toFixed(2));
      }
    }

    // Afhandeling van openstaande vervolgvragen (bijv. "Wil je dat ik DWSI uitreken?" of "Moet ik controleren of ovaaltjes mogelijk zijn?")
    if (actiefGespreksGeheugen.openVraag) {
      const chips = [];
      const trimmed = gefilterdeTekst.trim().toLowerCase();
      const isBevestiging = /^(ja|ja\s*graag|graag|doe\s*maar|reken\s*maar\s*uit|bereken\s*maar|controleer\s*maar|is\s*goed|prima|yes|zeker|top|klopt)\b/i.test(trimmed) || Boolean(context.isChip && /ja/i.test(trimmed));
      const isAfwijzing = /^(nee|nee\s*bedankt|hoeft\s*niet|laat\s*maar|no|niet\s*nodig)\b/i.test(trimmed) || Boolean(context.isChip && /nee/i.test(trimmed));
      const isDirecteParameter = nieuwParsed.wanddikte !== null;

      if (isBevestiging || isDirecteParameter) {
        const vraagType = actiefGespreksGeheugen.openVraag.type;
        const opgeslagenDia = actiefGespreksGeheugen.openVraag.diameter;
        if (opgeslagenDia && !actiefGespreksGeheugen.diameter) {
          actiefGespreksGeheugen.diameter = opgeslagenDia;
        }
        delete actiefGespreksGeheugen.openVraag;

        if (vraagType === "bevestig_dwsi_opnames") {
          actiefGespreksGeheugen.technique = "DWSI";
          actiefGespreksGeheugen.laatsteIntentie = "opnames";
          const resText = berekenAantalOpnames(actiefGespreksGeheugen, "dwsi opnames", chips);
          return {
            text: resText,
            chips: chips
          };
        } else if (vraagType === "controleer_ovaaltjes") {
          actiefGespreksGeheugen.technique = "DWDI";
          actiefGespreksGeheugen.ovaaltje = "Ja";
          actiefGespreksGeheugen.laatsteIntentie = "mag_ik";
          const resText = berekenMagIk(actiefGespreksGeheugen, "ovaal ovaaltjes opstelling 11", chips);
          return {
            text: resText,
            chips: chips
          };
        }
      } else if (isAfwijzing) {
        const vraagType = actiefGespreksGeheugen.openVraag.type;
        const dia = (actiefGespreksGeheugen.openVraag && actiefGespreksGeheugen.openVraag.diameter) || actiefGespreksGeheugen.diameter;
        const diaLabel = dia ? formatMmNaarDuimLabel(dia) : "deze leiding";
        delete actiefGespreksGeheugen.openVraag;

        if (vraagType === "controleer_ovaaltjes") {
          return {
            text: `Prima, dan kun je voor ${diaLabel} opstelling 12 / G (DWDI superpositie, 3 opnames loodrecht door de las) aanhouden. Waar kan ik je nog meer mee helpen?`,
            chips: ["Aantal opnames", "Minimale FFD", "BKI draadje", "Veilige afzetting"]
          };
        } else {
          return {
            text: "Prima, dan rekenen we geen DWSI opnames uit. Waar kan ik je nog meer mee helpen?",
            chips: ["Aantal opnames", "Minimale FFD", "BKI draadje", "Veilige afzetting"]
          };
        }
      } else {
        if (intenties.length > 0 && !intenties.includes("overzicht")) {
          delete actiefGespreksGeheugen.openVraag;
        }
      }
    }

    // Indien op pruts.html, synchroniseer de formuliervelden en crosshairs
    synchroniseerDOMFormulier(actiefGespreksGeheugen);

    const params = { ...actiefGespreksGeheugen };

    // 1. Chips en parameterinvoer zijn altijd aanvullende gegevens voor de actieve intentie
    const heeftNieuweParameter =
      nieuwParsed.wanddikte !== null ||
      nieuwParsed.procedure !== null ||
      nieuwParsed.asmeLastype !== null ||
      nieuwParsed.brongrootte !== null ||
      nieuwParsed.bronTekst !== null ||
      nieuwParsed.activiteit !== null ||
      nieuwParsed.sfd !== null ||
      nieuwParsed.ofa !== null ||
      nieuwParsed.diameter !== null ||
      nieuwParsed.filmType !== null ||
      nieuwParsed.langsnaadLengte !== null ||
      nieuwParsed.focusBegintijdSec !== null ||
      nieuwParsed.oudeFocus !== null ||
      nieuwParsed.nieuweFocus !== null ||
      nieuwParsed.oudeCi !== null ||
      nieuwParsed.nieuweCi !== null ||
      nieuwParsed.oudeMa !== null ||
      nieuwParsed.nieuweMa !== null ||
      nieuwParsed.oudeFilmType !== null ||
      nieuwParsed.nieuweFilmType !== null ||
      nieuwParsed.maminVal !== null ||
      nieuwParsed.materiaalFactor !== null ||
      (typeof nieuwParsed.pbMm === "number" && nieuwParsed.pbMm > 0) ||
      (typeof nieuwParsed.feMm === "number" && nieuwParsed.feMm > 0) ||
      (typeof nieuwParsed.betonMm === "number" && nieuwParsed.betonMm > 0) ||
      (typeof nieuwParsed.baksteenMm === "number" && nieuwParsed.baksteenMm > 0) ||
      (typeof nieuwParsed.muurOnbekendMm === "number" && nieuwParsed.muurOnbekendMm > 0) ||
      Boolean(nieuwParsed.verzetZonderAfscherming) ||
      nieuwParsed.afzettingDoelMeter !== null ||
      (typeof nieuwParsed.isolatieMm === "number") ||
      nieuwParsed.onstreamKlasse !== null ||
      nieuwParsed.onstreamTechniek !== null ||
      nieuwParsed.doorstraaldeDikte !== null ||
      nieuwParsed.mediumDichtheid !== null ||
      nieuwParsed.mediumNaam !== null ||
      nieuwParsed.vervalDagen !== null ||
      nieuwParsed.vervalDoelDatum !== null ||
      nieuwParsed.schedule !== null ||
      nieuwParsed.lasbreedte !== null ||
      nieuwParsed.zwartingOud !== null ||
      nieuwParsed.zwartingNieuw !== null;

    const isVraagZin = /\b(wat|hoe|hoelang|hoe\s+lang|hoeveel|kan|mag|moet|is\s+het|waarom|welk|welke|bereken|zoek|lijst|toon|overzicht)\b/i.test(gefilterdeTekst) || gefilterdeTekst.includes("?");

    const isParameterZonderNieuweIntentie =
      intenties.length === 0 ||
      (intenties.length === 1 && (
        intenties[0] === "overzicht" ||
        (!isVraagZin && intenties[0] === "min_ffd" && nieuwParsed.sfd !== null && !/\b(wat|welk|welke|bereken|hoeveel)\b/i.test(gefilterdeTekst)) ||
        (!isVraagZin && intenties[0] === "activiteit" && (nieuwParsed.activiteit !== null || nieuwParsed.bronTekst !== null))
      ));

    const isAanvullendeData =
      Boolean(actiefGespreksGeheugen.laatsteIntentie) &&
      (heeftNieuweParameter || Boolean(context.isChip)) &&
      isParameterZonderNieuweIntentie;

    if (isAanvullendeData && actiefGespreksGeheugen.laatsteIntentie) {
      if (intenties.includes("gevulde_leiding") || intenties.includes("bron_verval") || intenties.includes("kv_regel") || intenties.includes("buistabel")) {
        if (!intenties.includes(actiefGespreksGeheugen.laatsteIntentie)) {
          intenties.push(actiefGespreksGeheugen.laatsteIntentie);
        }
      } else {
        intenties = [actiefGespreksGeheugen.laatsteIntentie];
      }
    } else {
      // Automatische intentieherkenning voor korte standalone vervolgvragen (alleen als het geen parameter-antwoord is)
      const isAlleenOverzicht = intenties.length === 0 || (intenties.length === 1 && intenties[0] === "overzicht");
      if (isAlleenOverzicht) {
        if (/\b(d2|d3|d4|d5|d7|d8)\b/i.test(gefilterdeTekst)) {
          intenties = ["film_keuze"];
        } else if (/\b(buistabel|mamin|ma\s*\*?\s*min)\b/i.test(gefilterdeTekst)) {
          intenties = ["buistabel"];
        } else if (/\b(draad|draadje|bki)\b/i.test(gefilterdeTekst)) {
          intenties = ["draadje"];
        } else if (/\b(opname|opnames|films)\b/i.test(gefilterdeTekst)) {
          intenties = ["opnames"];
        } else if (/\b(centraal|panoram)\b/i.test(gefilterdeTekst)) {
          intenties = ["opnames"];
        } else if (/\b(ffd|focus)\b/i.test(gefilterdeTekst)) {
          intenties = ["min_ffd"];
        } else if (/\b(tijd|stralen|minuten|seconden)\b/i.test(gefilterdeTekst)) {
          intenties = ["stralingstijd"];
        } else if (/\b(kv|kilovolt|buisspanning)\b/i.test(gefilterdeTekst)) {
          intenties = ["kv_regel"];
        } else if (/\b(gevuld|water|aardolie|benzeen|benzine|staalequivalent)\b/i.test(gefilterdeTekst)) {
          intenties = ["gevulde_leiding"];
        } else if (/\b(verval|halfwaardetijd|over\s+\d+\s*dag)\b/i.test(gefilterdeTekst)) {
          intenties = ["bron_verval"];
        } else if (/\b(schedule|schedules|sch\b)\b/i.test(gefilterdeTekst)) {
          intenties = ["schedule"];
        } else if (nieuwParsed.diameter !== null) {
          intenties = ["opnames"];
        } else if (nieuwParsed.materiaalNaam !== null) {
          intenties = ["materiaalfactor"];
        } else if ((typeof nieuwParsed.pbMm === "number" && nieuwParsed.pbMm > 0) || (typeof nieuwParsed.feMm === "number" && nieuwParsed.feMm > 0) || (typeof nieuwParsed.betonMm === "number" && nieuwParsed.betonMm > 0) || (typeof nieuwParsed.baksteenMm === "number" && nieuwParsed.baksteenMm > 0) || (typeof nieuwParsed.muurOnbekendMm === "number" && nieuwParsed.muurOnbekendMm > 0) || /\b(afscherming|loodafscherming|lood\s*afscherming)\b/i.test(gefilterdeTekst)) {
          intenties = ["afzetting"];
        } else if (!heeftNieuweParameter && !isVraagZin && !context.isChip) {
          renderGeheugenBalk();
          return {
            text: `Ik beantwoord graag je RT-vraag. Stel gerust een specifieke vraag over stralingstijd, opnames, FFD, afzetting of onstream.`,
            chips: [
              "Stralingstijd berekenen",
              "Aantal opnames",
              "Minimale FFD",
              "Veilige afzetting",
              "Onstream opname",
            ],
          };
        }
      }

      const specifieke = intenties.filter((i) => i !== "overzicht");
      if (specifieke.length > 0) {
        actiefGespreksGeheugen.laatsteIntentie = specifieke[0];
      }
    }

    // Koppel aanwezige DOM-elementen van pruts.html indien geopend op pruts.html
    const hasPrutsDOM = typeof document !== "undefined" && Boolean(document.getElementById("procedure"));

    // Prioriteit in uitvoering: begroeting/bedankje/kennis bovenaan, schietkaart / vergelijkingen, gevulde leiding vóór stralingstijd of kv_regel
    const volgordePrio = {
      begroeting: 0.1,
      bedankje: 0.2,
      vraag_voorbeelden: 0.3,
      schietkaart: 0.5,
      asme_draad_vergelijk: 0.8,
      hole_type_iqi: 0.9,
      rt_kennis: 0.95,
      gevulde_leiding: 1,
      schedule: 1.5,
      bron_verval: 2,
      buistabel: 2.5,
      bki_materiaaltabel: 2.7,
      onstream: 3,
      onstream_ffd: 3,
      onstream_bron: 3,
      kv_regel: 4,
      max_kv: 4,
      stralingstijd: 5,
      materiaalfactor: 5.5,
      min_ffd: 6,
      ug_berekening: 6.2,
      bundel: 6.5,
      omtrek: 6.8,
      opname_verdeling: 6.9,
      opnames: 7,
      draadje: 8,
      zwarting: 9,
      afzetting: 10,
    };
    intenties.sort((a, b) => (volgordePrio[a] || 50) - (volgordePrio[b] || 50));

    const antwoorden = [];
    const chips = [];
    const uitgevoerdeHandlers = new Set();

    for (const intentie of intenties) {
      if (intentie === "begroeting") {
        if (!uitgevoerdeHandlers.has("begroeting")) {
          uitgevoerdeHandlers.add("begroeting");
          chips.push(
            "4 duimer sch 40 klasse B",
            "Hoeveel meter afzetten?",
            "Stralingstijd omrekenen",
            "Wat is het verschil tussen klasse A en B?",
            "Bronnenoverzicht"
          );
          antwoorden.push(
            `Hallo! 👋 Ik ben <strong>R.A.D.I.</strong>, jouw AI-assistent voor <strong>radiografisch onderzoek (RT)</strong>.<br><br>` +
            `Je kunt mij in gewone spreektaal van alles vragen over RT berekeningen, normen en werkkaarten, bijvoorbeeld:<br>` +
            `• <strong>Opstellingen &amp; FFD:</strong> Minimale focusafstanden en aantal opnames (SWSI, DWSI, DWDI ovaal/superpositie)<br>` +
            `• <strong>Draadjes &amp; Beeldkwaliteit:</strong> Vereist BKI draadje (ISO / ASME) of 2T-gat<br>` +
            `• <strong>Veiligheid &amp; Afzetting:</strong> Afzettingsafstanden (open bundel / collimator) en benodigde loodafscherming<br>` +
            `• <strong>Belichtingstijd &amp; Omrekenen:</strong> Kwadratenwet bij focuswissel, filmwissel (D4 &harr; D7) of mA&middot;min<br>` +
            `• <strong>Onstream &amp; Wanddiktes:</strong> Restwanddikte $W_{\\text{max}}$, toegestane isotopen en pipe schedules<br>` +
            `• <strong>Lasfout acceptatie:</strong> Toelaatbaarheid van poriën, slaklijnen en bindingsfouten (ISO 5817 Level B/C/D &amp; ASME)<br><br>` +
            `Waarmee kan ik je vandaag helpen? Typ je vraag of klik op een van de suggesties hieronder:`
          );
        }
      } else if (intentie === "bedankje") {
        if (!uitgevoerdeHandlers.has("bedankje")) {
          uitgevoerdeHandlers.add("bedankje");
          chips.push("Nieuwe berekening", "Geheugen wissen", "Afzettingsafstand", "Bronnenoverzicht");
          antwoorden.push("Graag gedaan! Heel veel succes met de opname ☢️. Als je straks nog een andere berekening wilt doen of een FFD wilt controleren, vraag het gerust!");
        }
      } else if (intentie === "vraag_voorbeelden") {
        if (!uitgevoerdeHandlers.has("vraag_voorbeelden")) {
          uitgevoerdeHandlers.add("vraag_voorbeelden");
          chips.push(
            "4 duimer sch 40 klasse B",
            "1 minuut op 80 cm, hoe lang op 56 cm?",
            "Hoeveel meter afzetten met 30 Ci Ir-192?",
            "Welk draadje op 12 mm staal?",
            "Wat is de wanddikte van 6 duim sch 80?"
          );
          antwoorden.push(
            `<strong>💡 Voorbeelden van vragen die je aan R.A.D.I. kunt stellen:</strong><br><br>` +
            `• <strong>Opnames &amp; FFD:</strong><br>` +
            `&nbsp;&nbsp;&bull; <em>\"Hoeveel foto's moet ik schieten op een 4 duimer sch 40 klasse B?\"</em><br>` +
            `&nbsp;&nbsp;&bull; <em>\"Hoe ver moet ik de bron zetten voor een 6 duim sch 80?\"</em><br>` +
            `&nbsp;&nbsp;&bull; <em>\"Mag ik een 2 duimer ovaal schieten met 10 mm wand?\"</em><br><br>` +
            `• <strong>Belichtingstijd &amp; Kwadratenwet:</strong><br>` +
            `&nbsp;&nbsp;&bull; <em>\"1 minuut op 80 cm focus, hoe lang op 56 cm?\"</em><br>` +
            `&nbsp;&nbsp;&bull; <em>\"Ik heb 10 mA*min op 80 focus en gebruik 5 mA, wat wordt de tijd op 45 focus?\"</em><br>` +
            `&nbsp;&nbsp;&bull; <em>\"Ik heb zwarting 1.5 op 1m30, hoe ga ik naar 2.5?\"</em><br><br>` +
            `• <strong>Stralingsveiligheid &amp; Afzetting:</strong><br>` +
            `&nbsp;&nbsp;&bull; <em>\"Hoeveel meter moet ik afzetten met de sterkste Iridium?\"</em><br>` +
            `&nbsp;&nbsp;&bull; <em>\"Ik kan maximaal 15 meter afzetten, hoeveel lood heb ik nodig met Se-75?\"</em><br>` +
            `&nbsp;&nbsp;&bull; <em>\"Wat is het dosistempo op 20 meter achter de collimator?\"</em><br><br>` +
            `• <strong>Beeldkwaliteit &amp; IQI:</strong><br>` +
            `&nbsp;&nbsp;&bull; <em>\"Welk draadje moet zichtbaar zijn op 12 mm staal klasse B?\"</em><br>` +
            `&nbsp;&nbsp;&bull; <em>\"Welk gat moet zichtbaar zijn bij een hole-type IQI?\"</em><br><br>` +
            `• <strong>Pipe Schedules &amp; Onstream:</strong><br>` +
            `&nbsp;&nbsp;&bull; <em>\"Hoe dik is een 6 duimer schedule 80?\"</em><br>` +
            `&nbsp;&nbsp;&bull; <em>\"Welke bron kan ik gebruiken voor een onstream opname op 2 duim 10 dik?\"</em><br><br>` +
            `• <strong>Theorie &amp; RT Kennis:</strong><br>` +
            `&nbsp;&nbsp;&bull; <em>\"Wat is het verschil tussen Klasse A en Klasse B?\"</em><br>` +
            `&nbsp;&nbsp;&bull; <em>\"Waarom leggen we een loodletter B achterop de cassette?\"</em><br>` +
            `&nbsp;&nbsp;&bull; <em>\"Wat is de keverregel?\"</em>`
          );
        }
      } else if (intentie === "rt_kennis") {
        if (!uitgevoerdeHandlers.has("rt_kennis")) {
          uitgevoerdeHandlers.add("rt_kennis");
          antwoorden.push(geefRTKennisAntwoord(params, gefilterdeTekst, chips));
        }
      } else if (intentie === "compensatie_info") {
        if (!uitgevoerdeHandlers.has("compensatie_info")) {
          uitgevoerdeHandlers.add("compensatie_info");
          chips.push("Met 3 mm compensatie", "Met 4 mm compensatie", "Zonder compensatie (0 mm)");
          const actComp = (typeof actiefGespreksGeheugen !== "undefined" && actiefGespreksGeheugen && actiefGespreksGeheugen.lascompensatie !== null && actiefGespreksGeheugen.lascompensatie !== undefined)
            ? actiefGespreksGeheugen.lascompensatie
            : 5;
          antwoorden.push(
            `<strong>Lascompensatie bij Gammastralingstijd:</strong><br><br>` +
            `• <strong>Wat is het?</strong> Bovenop de kale doorstraalde wanddikte wordt standaard <strong>+5 mm lascompensatie</strong> meegerekend voor de lasoverhoogte, grondlas en strooistraling in de laszone (conform de rekenformule van <a href="stralingstijd.html" class="ai-link" target="_blank">stralingstijd.html</a> en <a href="pruts.html" class="ai-link" target="_blank">pruts.html</a>).<br>` +
            `• <strong>Huidige instelling:</strong> <strong>${actComp} mm</strong>.<br>` +
            `• <strong>Kun je dit aanpassen?</strong> <strong>Ja, zeker!</strong> Je kunt op elk moment een eigen compensatiewaarde opgeven door bijvoorbeeld te vragen of typen:<br>` +
            `&nbsp;&nbsp;&bull; <em>\"Hoe lang stralen met 3 mm compensatie?\"</em><br>` +
            `&nbsp;&nbsp;&bull; <em>\"Reken eens met 4 mm lascompensatie\"</em><br>` +
            `&nbsp;&nbsp;&bull; <em>\"Wat is de tijd zonder compensatie?\"</em> (of <em>\"0 mm compensatie\"</em>)<br><br>` +
            `RADI onthoudt jouw gekozen waarde en past deze direct toe op de berekende belichtingstijd.`
          );
        }
      } else if (intentie === "schietkaart") {
        if (!uitgevoerdeHandlers.has("schietkaart")) {
          uitgevoerdeHandlers.add("schietkaart");
          antwoorden.push(berekenSchietkaart(params, gefilterdeTekst, chips));
        }
      } else if (intentie === "asme_draad_vergelijk") {
        if (!uitgevoerdeHandlers.has("asme_draad_vergelijk")) {
          uitgevoerdeHandlers.add("asme_draad_vergelijk");
          antwoorden.push(berekenAsmeIqiVergelijking(params, gefilterdeTekst, chips));
        }
      } else if (intentie === "hole_type_iqi") {
        if (!uitgevoerdeHandlers.has("hole_type_iqi")) {
          uitgevoerdeHandlers.add("hole_type_iqi");
          antwoorden.push(berekenHoleTypeIqi(params, gefilterdeTekst, chips));
        }
      } else if (intentie === "gevulde_leiding") {
        if (!uitgevoerdeHandlers.has("gevulde_leiding")) {
          uitgevoerdeHandlers.add("gevulde_leiding");
          antwoorden.push(berekenGevuldeLeiding(params, gefilterdeTekst, chips));
        }
      } else if (intentie === "schedule") {
        if (!uitgevoerdeHandlers.has("schedule")) {
          uitgevoerdeHandlers.add("schedule");
          antwoorden.push(berekenSchedule(params, gefilterdeTekst, chips));
        }
      } else if (intentie === "bron_verval") {
        if (!uitgevoerdeHandlers.has("bron_verval")) {
          uitgevoerdeHandlers.add("bron_verval");
          antwoorden.push(berekenBronVerval(params, gefilterdeTekst, chips));
        }
      } else if (intentie === "buistabel") {
        if (!uitgevoerdeHandlers.has("buistabel")) {
          uitgevoerdeHandlers.add("buistabel");
          antwoorden.push(berekenBuistabel(params, gefilterdeTekst, chips));
        }
      } else if (intentie === "kv_regel" || intentie === "max_kv") {
        if (!uitgevoerdeHandlers.has("kv_regel")) {
          uitgevoerdeHandlers.add("kv_regel");
          antwoorden.push(berekenKVRegel(params, gefilterdeTekst, chips));
        }
      } else if (intentie === "onstream_bron" || intentie === "onstream_ffd") {
        if (!uitgevoerdeHandlers.has("onstream")) {
          uitgevoerdeHandlers.add("onstream");
          antwoorden.push(berekenOnstream(params, gefilterdeTekst, chips));
        }
      } else if (intentie === "afzetting") {
        if (!uitgevoerdeHandlers.has("afzetting")) {
          uitgevoerdeHandlers.add("afzetting");
          antwoorden.push(berekenAfzetting(params, gefilterdeTekst, chips));
        }
      } else if (intentie === "opstelling_info") {
        if (!uitgevoerdeHandlers.has("opstelling_info")) {
          uitgevoerdeHandlers.add("opstelling_info");
          antwoorden.push(geefOpstellingEnGroeperingInfo(params, gefilterdeTekst, chips));
        }
      } else if (intentie === "langsnaad") {
        if (!uitgevoerdeHandlers.has("langsnaad")) {
          uitgevoerdeHandlers.add("langsnaad");
          antwoorden.push(berekenLangsnaadVerdeling(params, gefilterdeTekst, chips));
        }
      } else if (intentie === "focusverandering") {
        if (!uitgevoerdeHandlers.has("focusverandering")) {
          uitgevoerdeHandlers.add("focusverandering");
          antwoorden.push(berekenFocusVerandering(params, gefilterdeTekst, chips));
        }
      } else if (intentie === "materiaalfactor") {
        if (!uitgevoerdeHandlers.has("materiaalfactor")) {
          uitgevoerdeHandlers.add("materiaalfactor");
          antwoorden.push(geefMateriaalInfo(params, gefilterdeTekst, chips));
        }
      } else if (intentie === "film_keuze") {
        if (!uitgevoerdeHandlers.has("film_keuze")) {
          uitgevoerdeHandlers.add("film_keuze");
          antwoorden.push(berekenFilmKeuze(params, gefilterdeTekst, chips));
        }
      } else if (intentie === "min_ffd") {
        if (!uitgevoerdeHandlers.has("min_ffd")) {
          uitgevoerdeHandlers.add("min_ffd");
          antwoorden.push(berekenMinFFD(params, gefilterdeTekst, chips));
        }
      } else if (intentie === "ug_berekening") {
        if (!uitgevoerdeHandlers.has("ug_berekening")) {
          uitgevoerdeHandlers.add("ug_berekening");
          antwoorden.push(berekenUg(params, gefilterdeTekst, chips));
        }
      } else if (intentie === "zwarting") {
        if (!uitgevoerdeHandlers.has("zwarting")) {
          uitgevoerdeHandlers.add("zwarting");

          let dOud = params.zwartingOud || null;
          let dNieuw = params.zwartingNieuw || null;

          if (!dOud || !dNieuw) {
            const matchZw =
              gefilterdeTekst.match(/(?:van\s+)?(?:een\s+)?zwarting\s*(?:van|is|=|:)?\s*(\d+(?:[.,]\d+)?)\b[\s\S]*?(?:\b(?:om|naar|tot|op|voor)\s*(?:een\s*)?(?:zwarting\s*(?:van|is|=|:)?\s*)?|\b(?:hoe\s+)?(?:ga\s+ik\s+naar|krijg\s+ik|haal\s+ik|bereik\s+ik|kom\s+ik\s+op|wil\s+ik)\s*(?:een\s*)?(?:zwarting\s*(?:van|is|=|:)?\s*)?|\bzwarting\s*(?:van|is|=|:)?\s*)(\d+(?:[.,]\d+)?)(?![.,\d])(?!\s*(?:minuut|minuten|min\b|sec\b|seconden|s\b|mm|cm|meter|m\b|ci|curie|kv|ma\b))/i) ||
              gefilterdeTekst.match(/\bvan\s+(?:een\s+)?(?:zwarting\s+(?:van\s+)?)?(\d+(?:[.,]\d+)?)\s+(?:naar|tot)\s+(?:een\s+)?(?:zwarting\s+(?:van\s+)?)?(\d+(?:[.,]\d+)?)(?![.,\d])(?!\s*(?:mm|cm|meter|m\b|ci|curie|kv|ma\b|duim|inch))/i) ||
              gefilterdeTekst.match(/(\d+(?:[.,]\d+)?)\s*zwarting\b[\s\S]*?(?:\b(?:om|naar|tot|op|voor|krijg\s+ik|haal\s+ik|ga\s+ik\s+naar|zwarting)\s*(?:een\s*)?(?:zwarting\s*(?:van|is|=|:)?\s*)?)(\d+(?:[.,]\d+)?)(?![.,\d])(?!\s*(?:minuut|minuten|min\b|sec\b|seconden|s\b|mm|cm|meter|m\b|ci|curie|kv|ma\b))/i);
            if (matchZw) {
              const v1 = parseFloat(matchZw[1].replace(",", "."));
              const v2 = parseFloat(matchZw[2].replace(",", "."));
              if (v1 > 0 && v2 > 0 && v1 <= 6.0 && v2 <= 6.0) {
                dOud = v1;
                dNieuw = v2;
              }
            }
          }

          if (dOud && dNieuw && dOud > 0 && dNieuw > 0) {
            let tOudSec = params.focusBegintijdSec;
            if (!tOudSec && params.maminVal && params.maVal && params.maVal > 0) {
              tOudSec = Math.round((params.maminVal / params.maVal) * 60);
            }
            if (!tOudSec && typeof actiefGespreksGeheugen !== "undefined" && actiefGespreksGeheugen) {
              tOudSec = actiefGespreksGeheugen.focusBegintijdSec ||
                        actiefGespreksGeheugen.laatsteStralingstijdSec ||
                        (actiefGespreksGeheugen.maminVal && actiefGespreksGeheugen.maVal ? Math.round((actiefGespreksGeheugen.maminVal / actiefGespreksGeheugen.maVal) * 60) : null);
            }

            const factor = dNieuw / dOud;
            const pct = Math.round(Math.abs(factor - 1) * 100);
            const diffLabel = factor >= 1 ? `+${pct}% langer` : `-${pct}% korter`;

            if (tOudSec && tOudSec > 0) {
              const tNieuwSec = Math.round(tOudSec * factor);
              const diffSec = Math.abs(tNieuwSec - tOudSec);

              if (typeof actiefGespreksGeheugen !== "undefined" && actiefGespreksGeheugen) {
                actiefGespreksGeheugen.focusBegintijdSec = tNieuwSec;
                actiefGespreksGeheugen.laatsteStralingstijdSec = tNieuwSec;
                actiefGespreksGeheugen.zwartingOud = dNieuw;
                actiefGespreksGeheugen.zwartingNieuw = null;
              }

              if (chips) chips.push("Naar zwarting 2.0", "Naar zwarting 2.5", "Naar zwarting 3.0");

              antwoorden.push(
                `<div style="font-size:1.05rem; font-weight:700; color:#F5DF4D; margin-bottom:8px;">⏱️ Praktijkschatting stralingstijd voor zwarting van ${dOud} naar ${dNieuw}:</div>` +
                `Op basis van de lineaire verhouding tussen stralingsdosis en optische zwarting geldt de omrekenfactor <span class="rt-math-inline"><span class="rt-math-frac"><span class="rt-math-num">${dNieuw}</span><span class="rt-math-den">${dOud}</span></span> = <strong>${factor.toFixed(2)}x</strong> (${diffLabel})</span>:<br><br>` +
                `• <strong>Begintijd bij zwarting ${dOud}:</strong> <strong>${formatSecondenKort(tOudSec)}</strong> (${formatSecondenVoluit(tOudSec)})<br>` +
                `• <strong>Nieuwe stralingstijd voor zwarting ${dNieuw}:</strong> <span class="rt-ai-result">${formatSecondenVoluit(tNieuwSec)}</span> (circa <strong>${formatSecondenKort(diffSec)} ${factor >= 1 ? "langer" : "korter"}</strong> stralen).` +
                maakTimerKnopHtml(tNieuwSec, `Zwarting ${dNieuw}`) +
                `<br>` +
                `<div style="background:#14171f; border:1px solid rgba(245,223,77,0.3); border-radius:6px; padding:8px 12px; margin:6px 0; font-size:0.85rem; color:#ccc;">` +
                `📐 <em>Formule:</em> <span class="rt-math-inline"><i>t</i><sub>2</sub> = <i>t</i><sub>1</sub> &times; (<span class="rt-math-frac"><span class="rt-math-num"><i>D</i><sub>2</sub></span><span class="rt-math-den"><i>D</i><sub>1</sub></span></span>) = ${tOudSec}s &times; (${dNieuw} / ${dOud}) = <strong>${tNieuwSec}s</strong></span><br>` +
                `⚠️ <em>Let op:</em> Dit is een betrouwbare praktijkschatting (in werkelijkheid speelt ook de sluierzwarting <i>D</i><sub>0</sub> &approx; 0.20 en het ontwikkelproces mee).` +
                `</div>`
              );
              continue;
            } else {
              if (chips) chips.push("30 seconden", "45 seconden", "1 minuut", "90 seconden", "2 minuten");
              antwoorden.push(
                `Voor een verandering van zwarting <strong>${dOud}</strong> naar <strong>${dNieuw}</strong> is de omrekenfactor lineair <strong>${factor.toFixed(2)}x</strong> (${diffLabel} belichten).<br><br>` +
                `Wat was je huidige <strong>stralingstijd</strong> (bijv. 45 seconden of 1 minuut 30) bij zwarting ${dOud}? Dan reken ik de nieuwe tijd direct voor je uit!`
              );
              continue;
            }
          }

          if (/asme/i.test(gefilterdeTekst) || params.procedure === "ASME") {
            antwoorden.push("Volgens <strong>ASME Section V</strong>:<br>• <strong>Röntgenbuis (X-ray):</strong> minimale zwarting <span class=\"rt-ai-result\">1.8</span>.<br>• <strong>Gammabronnen (Se-75 / Ir-192 / Co-60):</strong> minimale zwarting <span class=\"rt-ai-result\">2.0</span>.<br>• <strong>Maximum:</strong> <span class=\"rt-ai-result\">4.0</span> (single-film).");
          } else if (/klasse\s*a/i.test(gefilterdeTekst) || params.procedure === "EN-A") {
            antwoorden.push("Volgens <strong>EN ISO 17636-1 Klasse A</strong>:<br>• <strong>Minimale zwarting:</strong> <span class=\"rt-ai-result\">2.0</span> (voor zowel röntgen als gammastraling).<br>• <strong>Maximum:</strong> <span class=\"rt-ai-result\">4.0</span>.");
          } else if (params.procedure === "EN-B" || /klasse\s*b/i.test(gefilterdeTekst)) {
            antwoorden.push("Volgens <strong>EN ISO 17636-1 Klasse B</strong>:<br>• <strong>Minimale zwarting:</strong> <span class=\"rt-ai-result\">2.3</span> (voor zowel röntgen als gammastraling).<br>• <strong>Maximum:</strong> <span class=\"rt-ai-result\">4.0</span>.<br><small style='display:block; margin-top:5px; opacity:0.9;'><em>Let op bij draadvereiste (Se-75):</em> D5 is toegestaan, maar D4 wordt aanbevolen. Wordt het vereiste draadje op D5 niet gehaald? Dan moet <strong>D4</strong> worden gebruikt met een minimale zwarting van <strong>&ge; 3.0</strong> om het contrast te verhogen.</small>");
          } else {
            chips.push("Klasse B", "Klasse A", "ASME");
            antwoorden.push("Volgens welke norm (EN Klasse A, EN Klasse B of ASME) wil je de vereiste zwarting weten?");
          }
        }
      } else if (intentie === "stralingstijd") {
        if (!uitgevoerdeHandlers.has("stralingstijd")) {
          uitgevoerdeHandlers.add("stralingstijd");
          antwoorden.push(berekenStralingstijd(params, gefilterdeTekst, chips));
        }
      } else if (intentie === "activiteit") {
        if (!uitgevoerdeHandlers.has("activiteit")) {
          uitgevoerdeHandlers.add("activiteit");
          const isSterkst = /\b(sterkst|sterkste|meeste\s*curie)\b/i.test(gefilterdeTekst);
          const isZwakst = /\b(zwakst|zwakste|minste\s*curie)\b/i.test(gefilterdeTekst);
          const vraagtSe = /\b(se-75|se75|seleen|selenium)\b/i.test(gefilterdeTekst);
          const vraagtIr = /\b(ir-192|ir192|iridium)\b/i.test(gefilterdeTekst);
          const today = new Date();
          let lijst = (bronnenData || []).map((b) => ({
            ...b,
            act: berekenHuidigeActiviteit(b.initialActivity, b.type, b.date, today),
          }));
          if (vraagtSe) lijst = lijst.filter((b) => b.type === "Se75");
          else if (vraagtIr) lijst = lijst.filter((b) => b.type === "Ir192");

          if (isZwakst && lijst.length > 0) {
            lijst.sort((a, b) => a.act - b.act);
            const zwak = lijst[0];
            const rest = lijst.slice(1).map((b) => `${b.name} met ${b.act.toFixed(1)} Ci`).join(", ");
            antwoorden.push(`De zwakste ${vraagtSe ? "Se-75" : vraagtIr ? "Ir-192" : "isotopen"} bron is op dit moment <strong>${zwak.name} (${zwak.act.toFixed(1)} Ci)</strong> (${zwak.size} mm)${rest ? ` (gevolgd door ${rest})` : ""}.`);
          } else if (isSterkst && lijst.length > 0) {
            lijst.sort((a, b) => b.act - a.act);
            const top = lijst[0];
            const rest = lijst.slice(1).map((b) => `${b.name} met ${b.act.toFixed(1)} Ci`).join(", ");
            antwoorden.push(`De sterkste ${vraagtSe ? "Se-75" : vraagtIr ? "Ir-192" : "isotopen"} bron is op dit moment <strong>${top.name}</strong> met <strong>${top.act.toFixed(1)} Ci</strong> (${top.size} mm)${rest ? ` (gevolgd door ${rest})` : ""}.`);
          } else if (lijst.length > 0) {
            lijst.sort((a, b) => b.act - a.act);
            const irLijst = lijst.filter((b) => b.type === "Ir192");
            const seLijst = lijst.filter((b) => b.type === "Se75");
            const overigeLijst = lijst.filter((b) => b.type !== "Ir192" && b.type !== "Se75");

            const blokken = [];
            if (irLijst.length > 0) {
              const irOv = irLijst.map((b) => `• <strong>${b.name}</strong> (${b.size} mm): <strong>${b.act.toFixed(1)} Ci</strong>`).join("<br>");
              blokken.push(`☢️ <strong>Iridium-192 (Ir-192):</strong><br>${irOv}`);
            }
            if (seLijst.length > 0) {
              const seOv = seLijst.map((b) => `• <strong>${b.name}</strong> (${b.size} mm): <strong>${b.act.toFixed(1)} Ci</strong>`).join("<br>");
              blokken.push(`☢️ <strong>Selenium-75 (Se-75):</strong><br>${seOv}`);
            }
            if (overigeLijst.length > 0) {
              const ovOv = overigeLijst.map((b) => `• <strong>${b.name}</strong> (${b.type}, ${b.size} mm): <strong>${b.act.toFixed(1)} Ci</strong>`).join("<br>");
              blokken.push(`☢️ <strong>Overige bronnen:</strong><br>${ovOv}`);
            }
            antwoorden.push(`<strong>Actuele bronnen uit bronnen.csv (gesorteerd op sterkte):</strong><br><br>${blokken.join("<br><br>")}`);
          }
        }
      } else if (intentie === "omtrek") {
        if (!uitgevoerdeHandlers.has("omtrek")) {
          uitgevoerdeHandlers.add("omtrek");
          antwoorden.push(berekenOmtrek(params, gefilterdeTekst, chips));
        }
      } else if (intentie === "opname_verdeling") {
        if (!uitgevoerdeHandlers.has("opname_verdeling")) {
          uitgevoerdeHandlers.add("opname_verdeling");
          antwoorden.push(berekenOpnameVerdeling(params, gefilterdeTekst, chips));
        }
      } else if (intentie === "opnames") {
        if (!uitgevoerdeHandlers.has("opnames")) {
          uitgevoerdeHandlers.add("opnames");
          antwoorden.push(berekenAantalOpnames(params, gefilterdeTekst, chips));
        }
      } else if (intentie === "bki_materiaaltabel") {
        if (!uitgevoerdeHandlers.has("bki_materiaaltabel")) {
          uitgevoerdeHandlers.add("bki_materiaaltabel");
          let antwoord = `<strong>BKI Materiaalgroepen volgens ISO 19232-1 & ASTM E747:</strong><br><br>`;
          antwoord += `⚠️ <strong>Let op:</strong> In <strong>ISO 19232-1</strong> bestaan er uitsluitend 4 materiaalgroepen voor BKI draadjes: <strong>TI, AL, FE en CU</strong>. Er bestaat <u>géén</u> "NI BKI"!<br><br>`;
          antwoord += `Elke ISO 19232-1 BKI houder bevat 7 draden en heeft een vaste aanduiding:<br>`;
          antwoord += `• <strong>1 EN:</strong> draden W1 t/m W7 (3.20 mm t/m 0.80 mm)<br>`;
          antwoord += `• <strong>6 EN:</strong> draden W6 t/m W12 (1.00 mm t/m 0.25 mm)<br>`;
          antwoord += `• <strong>10 EN:</strong> draden W10 t/m W16 (0.40 mm t/m 0.10 mm)<br>`;
          antwoord += `• <strong>13 EN:</strong> draden W13 t/m W19 (0.20 mm t/m 0.05 mm)<br><br>`;
          antwoord += `<em>(Bijvoorbeeld: als draad W14 zichtbaar moet zijn, staat deze op houder <strong>10 FE EN</strong> en op <strong>13 FE EN</strong>).</em><br><br>`;
          antwoord += `<strong>Toewijzing van materialen:</strong><br>`;
          antwoord += `• <strong>TI (Titanium):</strong> Titanium en titaniumlegeringen (ASTM Set 01)<br>`;
          antwoord += `• <strong>AL (Aluminium):</strong> Aluminium en aluminiumlegeringen (ASTM Set 02)<br>`;
          antwoord += `• <strong>FE (Staal / RVS / Inconel / Al-Brons):</strong><br>`;
          antwoord += `&nbsp;&nbsp;&bull; Koolstofstaal, laaggelegeerd staal, RVS, duplex (ASTM Set 1)<br>`;
          antwoord += `&nbsp;&nbsp;&bull; Aluminiumbrons en Nikkel-Aluminiumbrons (ASTM Set 2)<br>`;
          antwoord += `&nbsp;&nbsp;&bull; <strong>Inconel / Hastelloy</strong> (Ni-Cr-Fe legeringen, UNS N06600) & 18% Ni-maraging staal (ASTM Set 3)<br>`;
          antwoord += `• <strong>CU (Koper / Monel / Messing / Nikkel / Tinbrons):</strong><br>`;
          antwoord += `&nbsp;&nbsp;&bull; Zuiver Nikkel (Ni 200/201), Koper, <strong>Monel</strong> (Ni-Cu), Cu-Ni legeringen en Messing (ASTM Set 4)<br>`;
          antwoord += `&nbsp;&nbsp;&bull; Tinbrons, lagerbrons / roodbrons Rg7 en gun-metal (ASTM Set 5)<br><br>`;
          antwoord += `<div style="margin:10px 0;"><pre style="background:#111; color:#f5df4d; border:1px solid #555; border-radius:6px; padding:10px 12px; font-family:'Consolas','Courier New',monospace; font-size:0.72rem; line-height:1.42; overflow-x:auto; white-space:pre; margin:0; box-shadow:inset 0 2px 6px rgba(0,0,0,0.6);">====================================================================================================
               ISO 19232-1 & ASTM E747 BKI MATERIAALGROEPEN (WIRE-TYPE IQI)                         
====================================================================================================
┌─────┬──────────────────┬────┬────────────────────────────┬───────────────────────────────────────┐
│ ISO │ ASTM E747 Groep  │Set │ BKI Materiaal (IQI)        │ Te onderzoeken materiaal              │
├─────┼──────────────────┼────┼────────────────────────────┼───────────────────────────────────────┤
│ TI  │ Light materials  │ 01 │ Titanium                   │ Titanium en Ti-legeringen             │
│ AL  │ (Licht metaal)   │ 02 │ Aluminium                  │ Aluminium en Al-legeringen            │
├─────┼──────────────────┼────┼────────────────────────────┼───────────────────────────────────────┤
│ FE  │ Heavy materials  │ 1  │ Koolstofstaal / RVS 300    │ C-staal, laag-gelegeerd, RVS, duplex  │
│ FE  │ (Zwaar metaal)   │ 2  │ Aluminiumbrons (623 / 630) │ Aluminiumbrons en Ni-Al bronzen       │
│ FE  │                  │ 3  │ Inconel 600 (Ni-Cr-Fe)     │ Inconel, Hastelloy, 18% Ni-maraging   │
├─────┼──────────────────┼────┼────────────────────────────┼───────────────────────────────────────┤
│ CU  │ Heavy materials  │ 4  │ 70-30 Ni-Cu (Monel/Cu-Ni)  │ Zuiver Nikkel, koper, Monel, messing  │
│ CU  │ (Zwaar metaal)   │ 5  │ Tinbrons (Alloy D B139)    │ Tinbrons, lagerbrons/Rg7, gun-metal   │
└─────┴──────────────────┴────┴────────────────────────────┴───────────────────────────────────────┘
====================================================================================================</pre></div>`;
          antwoord += `<small style="opacity:0.9;">In <a href="pruts.html" class="ai-link" target="_blank">pruts.html</a> kun je via de knop <em>'BKI Tabel'</em> deze normtabel ook altijd direct raadplegen.</small>`;
          antwoorden.push(antwoord);
        }
      } else if (intentie === "draadje") {
        if (!uitgevoerdeHandlers.has("draadje")) {
          uitgevoerdeHandlers.add("draadje");
          antwoorden.push(berekenBkiDraadje(params, gefilterdeTekst, chips));
        }
      } else if (intentie === "mag_ik") {
        if (!uitgevoerdeHandlers.has("mag_ik")) {
          uitgevoerdeHandlers.add("mag_ik");
          antwoorden.push(berekenMagIk(params, gefilterdeTekst, chips));
        }
      } else if (intentie === "overzicht") {
        if (!uitgevoerdeHandlers.has("overzicht")) {
          uitgevoerdeHandlers.add("overzicht");
          if (!params.diameter) {
            antwoorden.push("Stel gerust een specifieke vraag over afzetting (bijv. 25 Ci Se-75), onstream (bijv. 6 duim 6 dik), draadjes, opnames of FFD.");
          } else if (!params.wanddikte && !(params.diameter < 100)) {
            chips.push("4 mm dik", "6 mm dik", "8 mm dik", "Schedule 40", "Schedule 80");
            antwoorden.push(`Om de volledige inspectiegegevens voor ${formatMmNaarDuimLabel(params.diameter)} te berekenen heb ik de <strong>wanddikte</strong> of het <strong>schedule</strong> nodig. Wat is de wanddikte?`);
          } else if (!params.procedure) {
            chips.push("Aantal opnames", "Minimale FFD", "BKI draadje", "Klasse B", "Klasse A", "ASME");
            const diaLabel = formatMmNaarDuimLabel(params.diameter);
            const schLabel = params.schedule ? ` schedule ${params.schedule}` : "";
            const wtLabel = params.wanddikte ? ` (${params.wanddikte} mm dik)` : "";
            antwoorden.push(`Gezien: <strong>${diaLabel}</strong>${schLabel}${wtLabel}.<br><br>Wat wil je voor deze leiding bepalen? Bijvoorbeeld het aantal opnames, minimale FFD of vereist BKI draadje, of kies direct een norm (Klasse B, Klasse A of ASME):`);
          } else {
            const ffd = berekenMinFFD(params, gefilterdeTekst, chips);
            const opn = berekenAantalOpnames(params, gefilterdeTekst, chips);
            antwoorden.push(`<strong>Gegevens voor ${formatMmNaarDuimLabel(params.diameter)} (${params.wanddikte} mm dik, ${params.procedure}):</strong><br>${ffd}<br><br>${opn}`);
          }
        }
      } else if (intentie === "bundel") {
        if (!uitgevoerdeHandlers.has("bundel")) {
          uitgevoerdeHandlers.add("bundel");
          antwoorden.push(berekenBundelbreedte(params, gefilterdeTekst, chips));
        }
      } else if (intentie === "lasfout") {
        if (!uitgevoerdeHandlers.has("lasfout")) {
          uitgevoerdeHandlers.add("lasfout");
          antwoorden.push(berekenLasfoutAcceptatie(params, gefilterdeTekst, chips));
        }
      } else if (intentie === "app_info") {
        if (!uitgevoerdeHandlers.has("app_info")) {
          uitgevoerdeHandlers.add("app_info");
          antwoorden.push(geefAppInfo(chips, gefilterdeTekst));
        }
      } else if (intentie === "doorstraalde_dikte") {
        if (!uitgevoerdeHandlers.has("doorstraalde_dikte") && !uitgevoerdeHandlers.has("gevulde_leiding")) {
          uitgevoerdeHandlers.add("doorstraalde_dikte");
          if (params.doorstraaldeDikte) {
            antwoorden.push(`De totale doorstraalde dikte is <strong>${params.doorstraaldeDikte} mm</strong>.`);
          } else if (params.wanddikte) {
            const wt = params.wanddikte;
            const tech = params.isPlaat || params.technique === "SWSI" || !params.diameter ? "SWSI" : (params.diameter < 100 ? "DWDI" : "DWSI");
            const dDikte = tech === "SWSI" ? wt : 2 * wt;
            antwoorden.push(`Bij een wanddikte van ${wt} mm is de doorstraalde dikte <strong>${dDikte} mm</strong> (${tech === "SWSI" ? "enkelwandig 1t" : "dubbelwandig 2t"}).`);
          } else {
            chips.push("4 mm dik", "6 mm dik", "8 mm dik");
            antwoorden.push("Wat is de <strong>wanddikte</strong> om de doorstraalde dikte te bepalen?");
          }
        }
      } else if (intentie === "buiten_bereik") {
        if (!uitgevoerdeHandlers.has("buiten_bereik")) {
          uitgevoerdeHandlers.add("buiten_bereik");
          antwoorden.push('Dit valt buiten het standaard bereik, wellicht kun je beter <a href="bundelbreedte.html" class="ai-link" target="_blank">bundelbreedte.html</a> raadplegen.');
        }
      } else {
        // Standalone berekening voor standaard RT vragen buiten pruts.html
        if (intentie === "verzet") {
          if (!params.diameter) {
            if (typeof actiefGespreksGeheugen !== "undefined" && actiefGespreksGeheugen) {
              actiefGespreksGeheugen.verwachtParameter = "diameter";
            }
            chips.push("1 duimer", "2 duimer", "3 duimer");
            antwoorden.push("Voor de verzetberekening van een ovaaltje heb ik de <strong>diameter</strong> van de leiding nodig. Wat is de diameter?");
          } else if (!params.lasbreedte) {
            if (typeof actiefGespreksGeheugen !== "undefined" && actiefGespreksGeheugen) {
              actiefGespreksGeheugen.verwachtParameter = "lasbreedte";
            }
            chips.push("8 mm", "10 mm", "12 mm", "15 mm");
            antwoorden.push(`Wat is de <strong>lasbreedte</strong> (in mm) om het benodigde verzet voor ${formatMmNaarDuimLabel(params.diameter)} uit te rekenen?`);
          } else if (!params.sfd) {
            if (typeof actiefGespreksGeheugen !== "undefined" && actiefGespreksGeheugen) {
              actiefGespreksGeheugen.verwachtParameter = "sfd";
            }
            chips.push("400 mm FFD", "500 mm FFD", "600 mm FFD", "700 mm FFD");
            antwoorden.push(`Wat is de gekozen <strong>FFD</strong> (film-focusafstand in mm) voor de verzetberekening van ${formatMmNaarDuimLabel(params.diameter)}?`);
          } else {
            const De = params.diameter;
            const lb = params.lasbreedte;
            const sfd = params.sfd;
            const A = sfd - De;
            const vz = 1.5 * lb * (A / De);
            antwoorden.push(`Het benodigde verzet voor ovaaltje (${formatMmNaarDuimLabel(De)}, lasbreedte ${lb} mm op ${sfd} mm FFD conform Opstelling 11/F) is: <span class="rt-ai-result">${vz.toFixed(1)} mm</span> (2 opnames onder 90°).`);
          }
        } else if (antwoorden.length === 0) {
          antwoorden.push(`Vraag ontvangen over RT. Stel gerust een specifieke vraag over afzetting (bijv. 25 Ci Se-75), onstream (bijv. 6 duim 6 dik), draadjes, opnames of FFD.`);
        }
      }
    }

    // Achtergrondcontrole: Minimale FFD waarschuwing bij lasonderzoek
    if (params.sfd && (uitgevoerdeHandlers.has("opnames") || uitgevoerdeHandlers.has("stralingstijd") || uitgevoerdeHandlers.has("verzet"))) {
      const waarschuwing = geefMinFFDWaarschuwing(params, gefilterdeTekst);
      if (waarschuwing) {
        antwoorden.unshift(waarschuwing);
        const minFfdVal = bepaalNumeriekeMinFFD(params, gefilterdeTekst);
        if (minFfdVal && chips && !chips.includes(`${minFfdVal} mm FFD (min. ffd)`)) {
          chips.unshift(`${minFfdVal} mm FFD (min. ffd)`);
        }
      }
    }

    // Slimme workflow-chips zodra een leiding/las (diameter + wanddikte of plaat + wanddikte) bekend is
    // en er geen openstaande vervolgvraag meer staat
    const workflowIntenties = new Set([
      "opnames", "opname_verdeling", "omtrek", "min_ffd", "draadje",
      "stralingstijd", "afzetting", "schedule", "verzet", "gevulde_leiding",
      "kv_regel", "onstream_bron", "onstream_ffd"
    ]);
    const isWorkflowHandler = [...uitgevoerdeHandlers].some((h) => workflowIntenties.has(h));
    const heeftLeidingBasis = Boolean(
      actiefGespreksGeheugen &&
      ((actiefGespreksGeheugen.diameter && actiefGespreksGeheugen.wanddikte) ||
        (actiefGespreksGeheugen.isPlaat && actiefGespreksGeheugen.wanddikte))
    );
    if (
      isWorkflowHandler &&
      heeftLeidingBasis &&
      !actiefGespreksGeheugen.verwachtParameter &&
      !actiefGespreksGeheugen.openVraag
    ) {
      const heeftChipGelijkaardig = (regex) => chips.some((c) => regex.test(String(c || "")));
      const voegWorkflowChipToe = (label, checkRegex) => {
        if (chips.length >= 7) return;
        if (!heeftChipGelijkaardig(checkRegex)) {
          chips.push(label);
        }
      };

      if (actiefGespreksGeheugen.diameter && actiefGespreksGeheugen.diameter > 100 && actiefGespreksGeheugen.laatsteAantalOpnames > 0 && !uitgevoerdeHandlers.has("opname_verdeling")) {
        voegWorkflowChipToe("Verdelen van de opnames", /verdelen/i);
      }
      if (actiefGespreksGeheugen.diameter && !uitgevoerdeHandlers.has("opnames")) {
        voegWorkflowChipToe("Aantal opnames", /opnames/i);
      }
      if (!uitgevoerdeHandlers.has("min_ffd") && !uitgevoerdeHandlers.has("onstream_ffd")) {
        voegWorkflowChipToe("Minimale FFD", /min.*ffd/i);
      }
      if (!uitgevoerdeHandlers.has("draadje")) {
        voegWorkflowChipToe("BKI draadje", /draadje|bki/i);
      }
      if (!uitgevoerdeHandlers.has("stralingstijd")) {
        voegWorkflowChipToe("Stralingstijd", /stralingstijd/i);
      }
      if (!uitgevoerdeHandlers.has("afzetting")) {
        voegWorkflowChipToe("Veilige afzetting", /afzetting/i);
      }
    }

    renderGeheugenBalk();

    return {
      text: antwoorden.filter(Boolean).join("<br><br>"),
      raw: gefilterdeTekst,
      chips: chips,
    };
  }

  // 17. Over R.A.D.I. / Disclaimer & Contact
  function geefAppInfo(chips, vraagTekst = "") {
    const lower = (vraagTekst || "").toLowerCase();
    if (/\b(wat\s+betekent|waar\s+staat.*voor|afkorting)\b/i.test(lower)) {
      if (chips) {
        chips.push("Over R.A.D.I.", "Voorbeelden", "Disclaimer");
      }
      return (
        `<strong>Waar staat R.A.D.I. voor?</strong><br><br>` +
        `<strong>R.A.D.I.</strong> is de afkorting van <strong>Radiografie Assistent Deterministische Inferentie</strong>:<br><br>` +
        `• <strong>R &mdash; Radiografie:</strong> Ontworpen specifiek voor industrieel radiografisch onderzoek (RT), met directe ondersteuning voor EN ISO 17636-1, ASME Section V, RT21021/RT21022, stralingstijden, BKI-draadjes, afzetting en lasfouten.<br><br>` +
        `• <strong>A &mdash; Assistent:</strong> Helpt je snel via spraak of tekst in het veld &mdash; onthoudt je gekozen bron, norm en buismaten in het gespreksgeheugen en denkt mee bij vervolgvragen.<br><br>` +
        `• <strong>D &mdash; Deterministische:</strong> Geen gokkende of hallucinerende AI, maar <strong>100% vaste, controleerbare formules en normtabellen</strong>. Dezelfde invoer geeft altijd exact dezelfde, reproduceerbare uitkomst &mdash; ook volledig offline.<br><br>` +
        `• <strong>I &mdash; Inferentie:</strong> Het stap-voor-stap logisch afleiden van de juiste berekening uit jouw gewone spreektaal (bijv. een <em>6-duimer Sch 40</em> automatisch herleiden naar <em>168.3 mm &times; 7.11 mm</em>, de juiste opstelling kiezen en gericht doorvragen als er nog een gegeven mist).`
      );
    }
    if (chips) {
      chips.push("Wat betekent R.A.D.I?", "Hoe werkt het?", "Disclaimer");
    }
    return `ℹ️ <strong>Over R.A.D.I. (Radiografie Assistent Deterministische Inferentie)</strong><br><br>` +
           `• <strong>Hoe werkt de app?</strong><br>` +
           `R.A.D.I. is jouw offline assistent voor radiografisch onderzoek en lasonderzoek binnen RT-Tools. Vragen over minimale FFD, bundelbreedte, focusverandering, wanddiktegrenzen (W<sub>max</sub>), draadjes (IQI), opnames en lasfoutacceptatie worden direct en deterministisch berekend conform de normen (EN ISO 17636, EN ISO 19232, EN ISO 10675-1, ASME Sec. V &amp; VIII en procedure RT21021 / RT21022).<br><br>` +
           `⚠️ <strong>Eigen risico &amp; Disclaimer:</strong><br>` +
           `Het gebruik van deze applicatie is geheel op <strong>eigen risico</strong>. Hoewel alle berekeningen met grote zorgvuldigheid zijn geprogrammeerd en gecontroleerd, kunnen er onverhoopt nog fouten of onvolkomenheden in staan. De radiograaf / lasonderzoeker blijft altijd zelf verantwoordelijk voor de definitieve controle conform de geldende projectvoorschriften en normen.<br><br>` +
           `✉️ <strong>Fout gevonden of suggesties?</strong><br>` +
           `Wordt er een fout of verbeterpunt ontdekt? Dat wordt enorm gewaardeerd! Stuur gerust een mail naar: <a href="mailto:vincepall@gmail.com?subject=R.A.D.I.%20Feedback" class="ai-link" style="color:#F5DF4D; font-weight:bold;">vincepall@gmail.com</a>.<br><br>` +
           `<small style="opacity:0.9;">Tip: Klik op de <strong><i class="fas fa-info-circle"></i> info-knop</strong> in de titelbalk van R.A.D.I. om dit overzicht altijd direct te openen.</small>`;
  }

