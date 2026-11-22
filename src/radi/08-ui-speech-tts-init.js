  let isPushing = false;
  let isFinishingPTT = false;
  let committedPhrases = [];
  let latestRawSpeechResults = null;
  let pttTailTimer = null;
  let pttFallbackTimer = null;
  let pttRestartTimer = null;
  let savedScrollY = 0;

  // Kiest uit de N-best alternatieven van SpeechRecognition het alternatief met de meeste RT-termen
  function kiesBesteSpraakAlternatief(resultItem) {
    if (!resultItem || resultItem.length === 0) return "";
    if (resultItem.length === 1) {
      return (resultItem[0] && resultItem[0].transcript) ? resultItem[0].transcript.trim() : "";
    }
    const rtExtraUnits = /\b(ir-192|se-75|co-60|mm|cm|ci|kv|ma|mamin|ffd|sfd|ofa|ofd|sod|sdd|sff|hvl|ug|bki|iqi|dwsi|swsi|dwdi|dwbi|eweb|dweb|dwdb|ndo|ndt|wmax|asme|en-[ab]|w\d+|d[2-8]|c[1-6]|dn\s*\d+|sch(?:edule)?\s*(?:\d+|xs|xxs|std)|xxs|xs|std)\b/gi;

    let bestText = (resultItem[0] && resultItem[0].transcript) ? resultItem[0].transcript.trim() : "";
    let bestScore = -1;

    for (let a = 0; a < resultItem.length; a++) {
      const cand = (resultItem[a] && resultItem[a].transcript) ? resultItem[a].transcript.trim() : "";
      if (!cand) continue;
      const gecorrigeerd = corrigeerSpraakTekst(cand);
      const hersteld = herstelVakjargon(gecorrigeerd);

      const telTriggers = (txt) => {
        let count = 0;
        const unitMatches = txt.match(rtExtraUnits);
        if (unitMatches) count += unitMatches.length;
        const words = txt.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").split(/\s+/);
        for (const w of words) {
          const clean = w.replace(/[^a-z-]/g, "");
          if (clean && NDO_TRIGGERS_SET.has(clean)) count++;
        }
        return count;
      };

      const rawScore = telTriggers(cand) * 14;
      const corrScore = telTriggers(gecorrigeerd) * 12;
      const hersteldScore = telTriggers(hersteld) * 8;
      const numMatches = hersteld.match(/\b\d+(?:[.,]\d+)?\b/g);
      const numScore = numMatches ? numMatches.length * 4 : 0;
      const confScore = typeof resultItem[a].confidence === "number" ? Math.round(resultItem[a].confidence * 5) : 0;
      const score = rawScore + corrScore + hersteldScore + numScore + confScore + (a === 0 ? 2 : 0);

      if (score > bestScore) {
        bestScore = score;
        bestText = cand;
      }
    }
    return bestText;
  }

  function extractCleanTranscript(results) {
    if (!results || results.length === 0) return "";
    let fullSentence = "";

    for (let i = 0; i < results.length; ++i) {
      const raw = kiesBesteSpraakAlternatief(results[i]);
      if (!raw) continue;

      if (!fullSentence) {
        fullSentence = raw;
        continue;
      }

      const normCurrent = fullSentence.toLowerCase().trim();
      const normNew = raw.toLowerCase().trim();

      // Android Chrome bug waar het nieuwe resultaat de hele accumulerende zin bevat
      if (normNew.startsWith(normCurrent)) {
        fullSentence = raw;
        continue;
      }

      if (normCurrent.startsWith(normNew)) {
        continue;
      }

      // Check overlap van de laatste woorden
      const currentWords = fullSentence.split(/\s+/);
      const newWords = raw.split(/\s+/);
      let overlapFound = 0;
      const maxCheck = Math.min(currentWords.length, newWords.length, 5);

      for (let k = maxCheck; k >= 1; k--) {
        let match = true;
        for (let j = 0; j < k; j++) {
          if (currentWords[currentWords.length - k + j].toLowerCase() !== newWords[j].toLowerCase()) {
            match = false;
            break;
          }
        }
        if (match) {
          overlapFound = k;
          break;
        }
      }

      if (overlapFound > 0) {
        const remainingNew = newWords.slice(overlapFound).join(" ");
        if (remainingNew) fullSentence += " " + remainingNew;
      } else {
        fullSentence += " " + raw;
      }
    }

    const words = fullSentence.split(/\s+/);
    const cleanWords = [];
    for (let i = 0; i < words.length; i++) {
      if (i === 0 || words[i].toLowerCase() !== words[i - 1].toLowerCase()) {
        cleanWords.push(words[i]);
      }
    }
    return corrigeerSpraakTekst(cleanWords.join(" ").trim());
  }

  function combinePhrases(phrases) {
    let finalSentence = "";
    for (const p of phrases) {
      if (!p) continue;
      if (!finalSentence) {
        finalSentence = p;
      } else if (p.toLowerCase().startsWith(finalSentence.toLowerCase())) {
        finalSentence = p;
      } else if (!finalSentence.toLowerCase().includes(p.toLowerCase())) {
        finalSentence += " " + p;
      }
    }

    const words = finalSentence.trim().split(/\s+/);
    const cleanWords = [];
    for (let i = 0; i < words.length; i++) {
      if (i === 0 || words[i].toLowerCase() !== words[i - 1].toLowerCase()) {
        cleanWords.push(words[i]);
      }
    }
    return corrigeerSpraakTekst(cleanWords.join(" ").trim());
  }

  function finalizeAndSend() {
    if (!isFinishingPTT) return;
    isFinishingPTT = false;

    if (pttFallbackTimer) {
      clearTimeout(pttFallbackTimer);
      pttFallbackTimer = null;
    }
    if (pttTailTimer) {
      clearTimeout(pttTailTimer);
      pttTailTimer = null;
    }

    const tr = document.getElementById("rt-ai-transcript");
    const allPhrases = [...committedPhrases];
    if (latestRawSpeechResults) {
      const lastPhrase = extractCleanTranscript(latestRawSpeechResults);
      if (lastPhrase) allPhrases.push(lastPhrase);
    }
    committedPhrases = [];
    latestRawSpeechResults = null;

    const q = combinePhrases(allPhrases);
    if (q) {
      verwerkVraagDirect(q);
    } else {
      if (tr) tr.textContent = "Geen spraak gehoord. Houd de PTT-knop ingedrukt tijdens het praten.";
    }
  }

  function onPushToTalkStart(e) {
    if (e && e.cancelable && e.type === "touchstart") {
      e.preventDefault();
    }
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    if (isPushing) return;
    isPushing = true;
    isFinishingPTT = false;
    committedPhrases = [];
    latestRawSpeechResults = null;

    if (pttTailTimer) {
      clearTimeout(pttTailTimer);
      pttTailTimer = null;
    }
    if (pttFallbackTimer) {
      clearTimeout(pttFallbackTimer);
      pttFallbackTimer = null;
    }
    if (pttRestartTimer) {
      clearTimeout(pttRestartTimer);
      pttRestartTimer = null;
    }

    const btn = document.getElementById("rt-ai-mic-toggle");
    if (btn) btn.classList.add("recording");
    const tr = document.getElementById("rt-ai-transcript");
    if (tr) tr.textContent = "🎙️ Aan het luisteren... (Laat los om te verzenden)";

    if (!recognition) recognition = initSpeech();
    if (recognition && !isRecording) {
      try {
        recognition.start();
      } catch (err) {}
    }
  }

  function onPushToTalkEnd(e) {
    if (e && e.cancelable && e.type === "touchend") {
      e.preventDefault();
    }
    if (!isPushing) return;
    isPushing = false;
    isFinishingPTT = true;

    if (pttRestartTimer) {
      clearTimeout(pttRestartTimer);
      pttRestartTimer = null;
    }

    const btn = document.getElementById("rt-ai-mic-toggle");
    if (btn) btn.classList.remove("recording");

    const tr = document.getElementById("rt-ai-transcript");
    if (tr) tr.textContent = "🎙️ Laatste woorden verwerken...";

    // 1. Houd de microfoon nog 350ms open (audio tail) zodat de laatste woorden nooit worden afgekapt
    pttTailTimer = setTimeout(() => {
      // 2. Stop nu de microfoon opname zodat het STT model afrondt
      try {
        if (recognition && isRecording) recognition.stop();
      } catch (err) {}

      // 3. Fallback timer: mocht onend niet binnen 750ms vuren, stuur dan alsnog door
      pttFallbackTimer = setTimeout(() => {
        finalizeAndSend();
      }, 750);
    }, 350);
  }

  function updateMobileViewport() {
    if (!assistantModal || assistantModal.style.display === "none") return;
    if (typeof window === "undefined") return;
    const modalBox = assistantModal.querySelector ? assistantModal.querySelector(".rt-ai-modal") : null;
    if (window.innerWidth > 768) {
      assistantModal.style.removeProperty("--rt-ai-vh");
      assistantModal.style.removeProperty("--rt-ai-vtop");
      assistantModal.style.height = "";
      assistantModal.style.maxHeight = "";
      assistantModal.style.top = "";
      assistantModal.classList.remove("rt-ai-kb-open");
      if (modalBox) {
        modalBox.style.height = "";
        modalBox.style.maxHeight = "";
        modalBox.style.minHeight = "";
      }
      return;
    }
    const vv = window.visualViewport;
    const height = vv ? Math.round(vv.height) : window.innerHeight;
    const top = vv ? Math.round(vv.offsetTop) : 0;

    assistantModal.style.setProperty("--rt-ai-vh", `${height}px`);
    assistantModal.style.setProperty("--rt-ai-vtop", `${top}px`);
    assistantModal.style.top = `${top}px`;
    assistantModal.style.height = `${height}px`;
    assistantModal.style.maxHeight = `${height}px`;

    if (modalBox) {
      modalBox.style.height = `${height}px`;
      modalBox.style.maxHeight = `${height}px`;
      modalBox.style.minHeight = "0px";
    }

    const activeEl = typeof document !== "undefined" ? document.activeElement : null;
    const isInputFocused = Boolean(activeEl && (activeEl.tagName === "INPUT" || activeEl.tagName === "TEXTAREA") && assistantModal.contains && assistantModal.contains(activeEl));
    const isKeyboardOpen = (window.screen && window.screen.height && height < window.screen.height * 0.72) || (isInputFocused && height < 580);
    if (assistantModal.classList) {
      assistantModal.classList.toggle("rt-ai-kb-open", Boolean(isKeyboardOpen));
    }
  }

  function openAssistant(startSpraak = false) {
    laadBronnenCsv(true);
    maakAssistantUI();
    updateTtsButtonUi();

    // Blokkeer achtergrond scrollen op body & html
    savedScrollY = window.scrollY || window.pageYOffset || (document.documentElement && document.documentElement.scrollTop) || 0;
    document.body.style.position = "fixed";
    document.body.style.top = `-${savedScrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.width = "100%";
    document.body.style.overflow = "hidden";
    if (document.documentElement) document.documentElement.style.overflow = "hidden";

    assistantModal.style.display = "flex";

    if (typeof window !== "undefined") {
      if (window.visualViewport) {
        window.visualViewport.addEventListener("resize", updateMobileViewport);
        window.visualViewport.addEventListener("scroll", updateMobileViewport);
      }
      window.addEventListener("resize", updateMobileViewport);
    }
    updateMobileViewport();

    const inp = document.getElementById("rt-ai-input");
    if (inp) {
      inp.value = "";
      // Nooit automatisch focussen op mobiel/touch om ongewenst openklappen van het toetsenbord te voorkomen
      const isTouch = window.innerWidth <= 768 || ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
      if (!isTouch && !startSpraak) {
        inp.focus();
      } else {
        inp.blur();
      }
    }
    if (startSpraak) {
      startSpraakherkenning();
    }
  }

  function sluitAssistant() {
    toggleInfoPanel(false);
    isExamplesOpen = false;
    const exBtn = document.getElementById("rt-ai-examples-toggle");
    if (exBtn) exBtn.classList.remove("active");
    stopSpraakherkenning();
    if (typeof window !== "undefined") {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", updateMobileViewport);
        window.visualViewport.removeEventListener("scroll", updateMobileViewport);
      }
      window.removeEventListener("resize", updateMobileViewport);
    }
    if (assistantModal) {
      assistantModal.style.removeProperty("--rt-ai-vh");
      assistantModal.style.removeProperty("--rt-ai-vtop");
      assistantModal.style.height = "";
      assistantModal.style.maxHeight = "";
      assistantModal.style.top = "";
      assistantModal.classList.remove("rt-ai-kb-open");
      const modalBox = assistantModal.querySelector ? assistantModal.querySelector(".rt-ai-modal") : null;
      if (modalBox) {
        modalBox.style.height = "";
        modalBox.style.maxHeight = "";
        modalBox.style.minHeight = "";
      }
      assistantModal.style.display = "none";
    }

    // Herstel scrollen op body & html
    document.body.style.position = "";
    document.body.style.top = "";
    document.body.style.left = "";
    document.body.style.right = "";
    document.body.style.width = "";
    document.body.style.overflow = "";
    if (document.documentElement) document.documentElement.style.overflow = "";
    window.scrollTo(0, savedScrollY);
  }

  // --- SpeechRecognition ---
  function initSpeech() {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) return null;
    const rec = new SpeechRec();
    rec.lang = "nl-NL";
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 5;

    // Voeg NDO Spraakgrammatica (Vocabulary Bias) toe indien ondersteund door de browser
    const SpeechGrammar = window.SpeechGrammarList || window.webkitSpeechGrammarList;
    if (SpeechGrammar) {
      try {
        const speechRecognitionList = new SpeechGrammar();
        const grammar = '#JSGF V1.0 UTF-8;\ngrammar ndo;\npublic <term> = ' + NDO_SPRAAK_WOORDENBOEK.join(' | ') + ';\n';
        speechRecognitionList.addFromString(grammar, 1.0);
        rec.grammars = speechRecognitionList;
      } catch (err) {
        // Stil negeren indien browser addFromString niet ondersteunt
      }
    }

    rec.onstart = () => {
      isRecording = true;
      const btn = document.getElementById("rt-ai-mic-toggle");
      if (btn && isPushing) btn.classList.add("recording");
      const triggerBtn = document.getElementById("btn-index-ai-trigger");
      if (triggerBtn) triggerBtn.classList.add("recording");
      const tr = document.getElementById("rt-ai-transcript");
      if (tr && isPushing) {
        tr.textContent = "🎙️ Aan het luisteren... (Laat los om te verzenden)";
      }
    };

    rec.onresult = (evt) => {
      // Sla de ruwe resultaten op, maar toon nog GEEN tussenwoorden op het scherm
      // De zin wordt pas netjes weergegeven zodra de PTT-knop wordt losgelaten!
      latestRawSpeechResults = evt.results;
      const tr = document.getElementById("rt-ai-transcript");
      if (tr && isPushing && evt.results && evt.results.length > 0) {
        tr.textContent = "🎙️ Spraak ontvangen... (Laat los om te verzenden)";
      }
    };

    rec.onerror = (e) => {
      if (e.error === "no-speech") return;
      isRecording = false;
      const btn = document.getElementById("rt-ai-mic-toggle");
      if (btn && !isPushing) btn.classList.remove("recording");
      const triggerBtn = document.getElementById("btn-index-ai-trigger");
      if (triggerBtn) triggerBtn.classList.remove("recording");
    };

    rec.onend = () => {
      isRecording = false;

      // Situatie 1: Gebruiker houdt knop nog steeds ingedrukt (korte pauze -> herstart)
      if (isPushing) {
        if (latestRawSpeechResults) {
          const phrase = extractCleanTranscript(latestRawSpeechResults);
          if (phrase) committedPhrases.push(phrase);
          latestRawSpeechResults = null;
        }
        clearTimeout(pttRestartTimer);
        pttRestartTimer = setTimeout(() => {
          if (isPushing && !isRecording) {
            try {
              rec.start();
            } catch (e) {}
          }
        }, 150);
        return;
      }

      // Situatie 2: Knop is losgelaten en STT heeft alle audio verwerkt!
      if (isFinishingPTT) {
        finalizeAndSend();
        return;
      }

      const btn = document.getElementById("rt-ai-mic-toggle");
      if (btn) btn.classList.remove("recording");
      const triggerBtn = document.getElementById("btn-index-ai-trigger");
      if (triggerBtn) triggerBtn.classList.remove("recording");
    };

    return rec;
  }

  function startSpraakherkenning() {
    if (!recognition) recognition = initSpeech();
    if (recognition && !isRecording) {
      try {
        recognition.start();
      } catch (e) {}
    }
  }

  function stopSpraakherkenning() {
    isPushing = false;
    isFinishingPTT = false;
    committedPhrases = [];
    latestRawSpeechResults = null;
    if (pttTailTimer) {
      clearTimeout(pttTailTimer);
      pttTailTimer = null;
    }
    if (pttFallbackTimer) {
      clearTimeout(pttFallbackTimer);
      pttFallbackTimer = null;
    }
    if (pttRestartTimer) {
      clearTimeout(pttRestartTimer);
      pttRestartTimer = null;
    }
    if (recognition && isRecording) {
      try {
        recognition.stop();
      } catch (e) {}
    }
    isRecording = false;
    const btn = document.getElementById("rt-ai-mic-toggle");
    if (btn) btn.classList.remove("recording");
    const triggerBtn = document.getElementById("btn-index-ai-trigger");
    if (triggerBtn) triggerBtn.classList.remove("recording");
  }

  function toggleSpraakherkenning() {
    if (isRecording) stopSpraakherkenning();
    else startSpraakherkenning();
  }

  // --- Text-to-Speech (TTS) Functionaliteit ---
  let ttsEnabled = false;
  try {
    if (typeof localStorage !== "undefined") {
      ttsEnabled = localStorage.getItem("radi_tts_enabled") === "true";
    }
  } catch (e) {}

  function isTtsEnabled() {
    return ttsEnabled;
  }

  function toggleTts() {
    ttsEnabled = !ttsEnabled;
    try {
      if (typeof localStorage !== "undefined") {
        localStorage.setItem("radi_tts_enabled", ttsEnabled ? "true" : "false");
      }
    } catch (e) {}
    updateTtsButtonUi();
    if (!ttsEnabled && typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }

  function updateTtsButtonUi() {
    if (typeof document === "undefined") return;
    const btn = document.getElementById("rt-ai-tts-toggle");
    if (!btn) return;
    if (ttsEnabled) {
      btn.innerHTML = '<i class="fas fa-volume-up"></i>';
      btn.style.color = '#F5DF4D';
      btn.title = "Spraakweergave (TTS) staat AAN (klik om te dempen)";
      btn.setAttribute("aria-label", "Spraakweergave AAN");
    } else {
      btn.innerHTML = '<i class="fas fa-volume-mute"></i>';
      btn.style.color = '#888';
      btn.title = "Spraakweergave (TTS) staat UIT (klik om in te schakelen)";
      btn.setAttribute("aria-label", "Spraakweergave UIT");
    }
  }

  function maakKorteSpraakTekst(htmlOrText) {
    const raw = String(htmlOrText || "");
    if (!raw.trim()) return "";

    const opschoonStuk = (frag) => {
      let t = String(frag || "");
      t = t.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
           .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
           .replace(/<br\s*[\/]?>/gi, ". ")
           .replace(/<\/(?:p|div|li)>/gi, ". ")
           .replace(/<\/?[^>]+(>|$)/g, " ");
      t = t.replace(/&nbsp;/g, " ")
           .replace(/&amp;/g, " en ")
           .replace(/&lt;/g, "kleiner dan ")
           .replace(/&gt;/g, "groter dan ")
           .replace(/&ge;/g, "minimaal ")
           .replace(/&le;/g, "maximaal ")
           .replace(/&times;/g, " bij ")
           .replace(/&bull;/g, "")
           .replace(/&rarr;/g, " naar ")
           .replace(/&ndash;|&mdash;/g, " ");
      t = t.replace(/✅\s*(?:Ja[,:]?\s*)?/gi, "Ja, ")
           .replace(/❌\s*(?:Nee[,:]?\s*)?/gi, "Nee, ")
           .replace(/⚠️\s*(?:Let op[,:]?\s*)?/gi, "Let op, ")
           .replace(/ℹ️/g, "")
           .replace(/📋/g, "")
           .replace(/🎯/g, "")
           .replace(/💡/g, "")
           .replace(/☢️?/g, "")
           .replace(/⚡/g, "");
      return t.replace(/\s+/g, " ").trim();
    };

    const spreekNatuurlijk = (str) => {
      let s = String(str || "");
      // Verwijder restjes zoals (conform ...html) of (Berekend volgens ...)
      s = s.replace(/\([^)]*(?:\.html|conform|berekend volgens|zie\s)[^)]*\)/gi, "");
      // W14 -> W 14 voor natuurlijke Nederlandse uitspraak
      s = s.replace(/\bW(\d+)\b/g, "W $1");
      // Isotopen & afkortingen uitspreken
      s = s.replace(/\bIr[-\s]?192\b/gi, "Iridium 192")
           .replace(/\bSe[-\s]?75\b/gi, "Seleen 75")
           .replace(/\bCo[-\s]?60\b/gi, "Kobalt 60");
      // Compacte tijden als "3m 55s (3 minuten en 55 seconden)" -> "3 minuten en 55 seconden"
      s = s.replace(/\b(\d+)m\s*(\d+)s\s*\(([^)]+)\)/gi, "$3");
      s = s.replace(/\b(\d+)m\s*(\d+)s\b/gi, "$1 minuten en $2 seconden");
      // min. voor getal = minimaal; min na getal = minuten
      s = s.replace(/\bmin\.?\s*(?=\d)/gi, "minimaal ");
      s = s.replace(/(\d+(?:[.,]\d+)?)\s*min\b\.?/gi, "$1 minuten");
      s = s.replace(/(\d+(?:[.,]\d+)?)\s*sec\b\.?/gi, "$1 seconden");
      // Eenheden
      s = s.replace(/(\d+(?:[.,]\d+)?)\s*°/g, "$1 graden");
      s = s.replace(/[μu]Sv\/(?:uur|h)\b/gi, "microsievert per uur");
      s = s.replace(/\bmSv\/(?:uur|h)\b/gi, "millisievert per uur");
      s = s.replace(/(\d+(?:[.,]\d+)?)\s*mSv\b/g, "$1 millisievert");
      s = s.replace(/(\d+(?:[.,]\d+)?)\s*cm\b/gi, "$1 centimeter");
      s = s.replace(/(\d+(?:[.,]\d+)?)\s*mm\b/gi, "$1 millimeter");
      s = s.replace(/(\d+(?:[.,]\d+)?)\s*m\b(?![a-zA-Z*\/])/g, "$1 meter");
      s = s.replace(/(\d+(?:[.,]\d+)?)\s*kV\b/gi, "$1 kilovolt");
      s = s.replace(/\bmA\*min\b/gi, "milliampère minuut");
      s = s.replace(/(\d+(?:[.,]\d+)?)\s*mA\b/g, "$1 milliampère");
      s = s.replace(/(\d+(?:[.,]\d+)?)\s*Ci\b/gi, "$1 Curie");
      // Decimale punt tussen cijfers naar komma (75.2 -> 75,2)
      s = s.replace(/(\d)\.(\d)/g, "$1,$2");
      return s.replace(/\s+([.,!?])/g, "$1").replace(/([?!])\./g, "$1").replace(/\.{2,}/g, ".").replace(/\s+/g, " ").trim();
    };

    // 1. Expliciete korte TTS-kern uit rekenmodule (bijv. MinFFD, Opnames, Stralingstijd, Draadje)
    const summaryMatch = raw.match(/<span[^>]*class=["'][^"']*rt-tts-summary[^"']*["'][^>]*>([\s\S]*?)<\/span>/i);
    if (summaryMatch && summaryMatch[1].trim()) {
      return spreekNatuurlijk(opschoonStuk(summaryMatch[1]));
    }

    // 2. Focusverandering eindresultaat (.rt-ai-final-time)
    const finalTimeMatch = raw.match(/<div[^>]*class=["'][^"']*rt-ai-final-time[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
    if (finalTimeMatch && finalTimeMatch[1].trim()) {
      return spreekNatuurlijk(opschoonStuk(finalTimeMatch[1]));
    }

    // 3. Verwijder <small> voetnoten en splits in regels/bullets
    const zonderSmall = raw.replace(/<small[^>]*>[\s\S]*?<\/small>/gi, "");
    const regels = zonderSmall
      .split(/<br\s*[\/]?>|<\/p>|<\/div>/i)
      .map((r) => r.trim())
      .filter(Boolean);

    const statusRegels = [];
    const bulletResultaten = [];
    for (const r of regels) {
      const hasStrong = /<(?:strong|b)\b[^>]*>/i.test(r);
      const isStatus = /^(?:✅|❌|⚠️)/.test(r.replace(/<[^>]+>/g, "").trim());
      const isBullet = /^[•–-]\s*/.test(r.replace(/<[^>]+>/g, "").trim());
      if (isStatus) {
        const eersteZin = opschoonStuk(r).split(/\.\s+/)[0];
        if (eersteZin) statusRegels.push(eersteZin);
      } else if (isBullet && hasStrong && !r.includes("?")) {
        // Strip technische haakjes in resultaat-bullets zodat alleen het directe antwoord + label wordt voorgelezen
        const schoongemaakt = opschoonStuk(r)
          .replace(/^[•–-]\s*/, "")
          .replace(/\s*\([^)]*\)/g, "")
          .replace(/\s+:/g, ":")
          .trim();
        if (schoongemaakt) bulletResultaten.push(schoongemaakt);
      }
    }

    if (bulletResultaten.length > 0) {
      const delen = [...statusRegels.slice(0, 1), ...bulletResultaten.slice(0, 3)];
      return spreekNatuurlijk(delen.join(". "));
    }

    // 4. Korte wedervraag of compact antwoord
    const schoonGeheel = opschoonStuk(zonderSmall);
    if (schoonGeheel.includes("?")) {
      const zinnen = schoonGeheel.split(/(?<=[.!?])\s+/).filter(Boolean);
      const vraagZin = zinnen.find((z) => z.includes("?"));
      if (vraagZin) return spreekNatuurlijk(vraagZin.replace(/^[•–-]\s*/, ""));
    }

    if (statusRegels.length > 0) {
      return spreekNatuurlijk(statusRegels[0]);
    }

    return spreekNatuurlijk(schoonGeheel);
  }

  function spreekTekst(htmlOrText) {
    if (!ttsEnabled) return;
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    try {
      window.speechSynthesis.cancel();

      const text = maakKorteSpraakTekst(htmlOrText);
      if (!text) return;

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "nl-NL";
      utterance.rate = 1.05;

      const voices = window.speechSynthesis.getVoices();
      const nlVoice = voices.find(v => v.lang && v.lang.toLowerCase().startsWith("nl"));
      if (nlVoice) {
        utterance.voice = nlVoice;
      }
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn("TTS fout:", e);
    }
  }

  async function verwerkVraagDirect(vraagTekst, context = {}) {
    stopSpraakherkenning();
    actieveVraagId++;
    const mijnVraagId = actieveVraagId;
    const weergaveTekst = corrigeerSpraakTekst(vraagTekst);
    const vraagHeaderHtml = `Jij: "<strong>${escapeHtmlTekst(weergaveTekst)}</strong>"`;
    const tr = document.getElementById("rt-ai-transcript");
    if (tr) tr.innerHTML = vraagHeaderHtml;
    voegOfUpdateGeschiedenis(mijnVraagId, vraagHeaderHtml, "<em>Bewerken en uitrekenen...</em>");

    try {
      const res = await verwerkUniverseleVraag(weergaveTekst, context);
      if (mijnVraagId !== actieveVraagId) return;

      let outputHtml = (res && res.text) ? res.text : (typeof res === "string" ? res : "Geen antwoord beschikbaar.");
      if (res && res.chips && res.chips.length > 0) {
        outputHtml += `<div class="rt-ai-chips-row">` +
          res.chips.map(c => {
            const trimmedChip = String(c || "").trim();
            if (/^[a-z0-9_.-]+\.html(?:[?#].*)?$/i.test(trimmedChip)) {
              return `<a href="${trimmedChip}" target="_blank" rel="noopener" class="rt-ai-chip-btn" style="text-decoration:none; display:inline-flex; align-items:center; gap:4px;">🔗 ${trimmedChip}</a>`;
            }
            const safeChip = trimmedChip.replace(/'/g, "\\'");
            return `<button type="button" class="rt-ai-chip-btn" onclick="window.RtAssistant && window.RtAssistant.verstuurSuggestie('${safeChip}')">${trimmedChip}</button>`;
          }).join("") +
          `</div>`;
      }
      voegOfUpdateGeschiedenis(mijnVraagId, vraagHeaderHtml, outputHtml);
      if (res && res.text) {
        spreekTekst(res.text);
      }
    } catch (err) {
      if (mijnVraagId !== actieveVraagId) return;
      console.error("Fout bij verwerken vraag:", err);
      voegOfUpdateGeschiedenis(
        mijnVraagId,
        vraagHeaderHtml,
        `<span style="color:#ffb4b4;">⚠️ Er trad een fout op bij het uitrekenen (${err && err.message ? err.message : "onbekende fout"}). Stel de vraag a.u.b. opnieuw of controleer de parameters.</span>`
      );
    }

    // Op PC/desktop direct de focus terug op het invoerveld zodat de gebruiker meteen kan doortypen
    const isTouch = (typeof window !== "undefined") && (window.innerWidth <= 768 || ('ontouchstart' in window) || (navigator && navigator.maxTouchPoints > 0));
    if (!isTouch) {
      const inp = document.getElementById("rt-ai-input");
      if (inp) {
        setTimeout(() => {
          inp.focus();
        }, 50);
      }
    }
  }

  function verstuurSuggestie(tekst) {
    const trimmedChip = String(tekst || "").trim();
    if (/^[a-z0-9_.-]+\.html(?:[?#].*)?$/i.test(trimmedChip)) {
      if (typeof window !== "undefined") {
        const opened = window.open(trimmedChip, "_blank", "noopener");
        if (!opened && window.location) window.location.href = trimmedChip;
      }
      return;
    }
    isExamplesOpen = false;
    const exBtn = document.getElementById("rt-ai-examples-toggle");
    if (exBtn) exBtn.classList.remove("active");
    const inp = document.getElementById("rt-ai-input");
    if (inp) {
      inp.value = "";
      inp.style.height = "auto";
      const isTouch = (typeof window !== "undefined") && (window.innerWidth <= 768 || ('ontouchstart' in window) || (navigator && navigator.maxTouchPoints > 0));
      if (isTouch) {
        inp.blur(); // Zorgt dat het mobiele toetsenbord NOOIT ongewenst openklapt bij klikken op een chip
      }
    }
    verwerkVraagDirect(tekst, { isChip: true });
  }

  function verstuurTekst() {
    isExamplesOpen = false;
    const exBtn = document.getElementById("rt-ai-examples-toggle");
    if (exBtn) exBtn.classList.remove("active");
    const inp = document.getElementById("rt-ai-input");
    if (!inp || !inp.value.trim()) return;
    const q = inp.value.trim();
    inp.value = "";
    inp.style.height = "auto";
    const isTouch = (typeof window !== "undefined") && (window.innerWidth <= 768 || ('ontouchstart' in window) || (navigator && navigator.maxTouchPoints > 0));
    if (isTouch) {
      inp.blur(); // Sluit mobiel toetsenbord na verzenden zodat antwoord direct goed leesbaar is
    }
    verwerkVraagDirect(q);
  }

  // Koppel de knop naast de zoekbalk op index.html
  const STANDAARD_VOORBEELDVRAGEN = [
    { categorie: "Focus & Zwarting", type: "Focusverandering (kwadratenwet)", voorbeeld: "Mijn tijd is 2 minuten op FFD 400 mm, wat wordt de nieuwe tijd op FFD 600 mm?", toelichting: "Berekent de nieuwe belichtingstijd bij het aanpassen van de FFD." },
    { categorie: "Focus & Zwarting", type: "Focusverandering incl. filmtypeverandering", voorbeeld: "Mijn tijd is 1 minuut 30 op FFD 500 met D7, wat wordt de tijd op FFD 700 met D4?", toelichting: "Combineert de kwadratenwet (FFD) direct met de filmfactor (D7, D5, D4)." },
    { categorie: "Focus & Zwarting", type: "Filmtypeverandering (D7 / D5 / D4)", voorbeeld: "Ik ga van Agfa D7 naar D5 en mijn tijd was 1 minuut 20, wat wordt de nieuwe tijd?", toelichting: "Rekent de belichtingstijd om bij wisselen tussen Agfa D7, D5 en D4." },
    { categorie: "Focus & Zwarting", type: "Curie-wissel / andere bronsterkte", voorbeeld: "Vorig jaar met 40 Ci was de tijd 1 minuut 30, wat is de tijd nu met 25 Ci?", toelichting: "Past de belichtingstijd aan op basis van de oude en nieuwe bronactiviteit." },
    { categorie: "Focus & Zwarting", type: "Zwarting aanpassen (bijv. van 1.5 naar 2.5)", voorbeeld: "Ik heb zwarting 1.5 op 1 minuut 30, hoe ga ik van 1.5 naar 2.5?", toelichting: "Geeft een praktijkschatting van de nieuwe belichtingstijd om de gewenste zwarting te halen." },
    { categorie: "Focus & Zwarting", type: "Vereiste zwarting volgens norm", voorbeeld: "Wat is de minimale zwarting volgens EN Klasse B?", toelichting: "Toont de minimale en maximale zwartingseisen voor EN Klasse A, Klasse B of ASME." },
    { categorie: "Focus & Zwarting", type: "Toegestane filmsoort per klasse", voorbeeld: "Mag ik een D7 film gebruiken voor Klasse B?", toelichting: "Controleert of D4, D5 of D7 is toegestaan volgens de gekozen kwaliteitsklasse." },
    { categorie: "Focus & Zwarting", type: "Materiaalfactor opzoeken (RVS, Duplex, etc.)", voorbeeld: "Hoe reken ik de belichtingstijd om van staal naar RVS of duplex?", toelichting: "Toont de materiaalcorrectiefactoren voor Se-75, Ir-192 en röntgen (150–300 kV)." },
    { categorie: "Stralingstijd", type: "Stralingstijd gammabron (voorgestelde FFD op buis)", voorbeeld: "Hoe lang moet ik stralen op een 6 duimer van 8 mm dik met 25 Curie Iridium op D7 film?", toelichting: "Berekent de stralingstijd direct met de voorgestelde FFD op de leiding." },
    { categorie: "Stralingstijd", type: "Stralingstijd op specifieke FFD (plaat / SWSI)", voorbeeld: "Hoe lang belichten op een plaat van 15 mm met 30 Ci Ir-192 op FFD 500 mm met D7?", toelichting: "Berekent de belichtingstijd voor enkelwandige opnames op een opgegeven FFD." },
    { categorie: "Stralingstijd", type: "Stralingstijd panoramisch / centraal", voorbeeld: "Bereken de stralingstijd voor DN 100, wanddikte 8 mm, 15 Ci Ir-192, panoramisch op D7", toelichting: "Berekent de SWSI stralingstijd met de bron in het midden (FFD = halve diameter)." },
    { categorie: "Stralingstijd", type: "Stralingstijd incl. materiaalfactor (bijv. RVS)", voorbeeld: "Wat wordt de tijd als ik RVS schiet, 4 duimer van 6 mm dik, 20 Ci Iridium, D7, FFD 200 mm?", toelichting: "Past automatisch de materiaalfactor toe op de berekende gammabelichtingstijd." },
    { categorie: "Stralingstijd", type: "Röntgenbuis (X-ray) tijd uit mA·min en mA", voorbeeld: "Hoe lang moet ik stralen bij 12 mA*min op 3.5 mA?", toelichting: "Rekent het aantal mA·min uit de buistabel om naar minuten en seconden." },
    { categorie: "Stralingstijd", type: "KV-regel & maximale buisspanning (X-ray)", voorbeeld: "Hoeveel kV moet ik gebruiken op een 4 duimer van 6 mm dik?", toelichting: "Berekent de aanbevolen kV (KV-regel) en het normatieve maximum volgens EN ISO 17636-1." },
    { categorie: "Opstelling & Opnames", type: "Aantal opnames rondnaad (DWSI)", voorbeeld: "Hoeveel opnames op een 6 duimer van 8 mm dik op FFD 250 mm volgens Klasse B?", toelichting: "Berekent het minimaal aantal opnames en de rotatiehoek volgens EN-A, EN-B of ASME." },
    { categorie: "Opstelling & Opnames", type: "Aantal opnames kleine diameter (DWDI <= 100 mm)", voorbeeld: "Hoeveel opnames op een 2 duimer van 12 mm dik?", toelichting: "Bepaalt of 2 opnames (ovaaltje, <= 8 mm) of 3 opnames (superpositie, > 8 mm) nodig zijn." },
    { categorie: "Opstelling & Opnames", type: "Aantal opnames & films bij panoramisch stralen", voorbeeld: "Hoeveel opnames moet ik maken op een 16 duimer van 12.7 mm dik met de bron in het midden?", toelichting: "Geeft de omtrek en het benodigde aantal 10x48 films voor 1 panoramische opname." },
    { categorie: "Opstelling & Opnames", type: "Aantal graden draaien tussen opnames", voorbeeld: "Om hoeveel graden moet ik draaien bij 4 opnames op een 6 duimer?", toelichting: "Berekent de hoekverdraaiing per opname (360° / aantal opnames) of bij een ovaaltje (90°)." },
    { categorie: "Opstelling & Opnames", type: "Voorgeschreven opstelling bepalen", voorbeeld: "Volgens welke opstelling moet ik een 3 duimer van 6 mm dik schieten?", toelichting: "Adviseert de juiste EN/ASME opstelling (DWDI 11/F, 12/G of DWSI 13/14/E) op basis van de diameter." },
    { categorie: "Opstelling & Opnames", type: "Controle of ovaaltje (Opstelling 11 / F) mag", voorbeeld: "Mag ik een 2 duimer van 4 mm dik met ovaaltje schieten?", toelichting: "Controleert diameter (<= 100 mm), wanddikte (<= 8 mm) en maximale lasbreedte (De / 4)." },
    { categorie: "Opstelling & Opnames", type: "Controle of panoramisch / centraal stralen mag", voorbeeld: "Mag ik panoramisch stralen op een 8 duimer van 8 mm dik met focus 2.5 mm volgens Klasse B?", toelichting: "Controleert of de halve buisdiameter voldoet aan de minimale FFD voor opstelling 5 / A." },
    { categorie: "Opstelling & Opnames", type: "Toepassingsgebied Ir-192 en Se-75 (diktegrenzen)", voorbeeld: "Mag ik met Se-75 een wanddikte van 25 mm dubbelwandig schieten?", toelichting: "Controleert de minimale en maximale doorstraalde dikte voor Se-75 en Ir-192." },
    { categorie: "Opstelling & Opnames", type: "Verschil tussen opstellingen of klassen", voorbeeld: "Wat is het verschil tussen klasse A en klasse B in EN ISO 17636-1?", toelichting: "Legt het verschil uit tussen bijv. opstelling 11 vs 12, 13 vs 14, of Klasse A vs B." },
    { categorie: "Opstelling & Opnames", type: "Langsnaad filmverdeling & overlap", voorbeeld: "Hoe verdeel ik een langsnaad van 180 cm met 10x48 films?", toelichting: "Berekent het aantal films, de effectieve lengte en de overlap per film." },
    { categorie: "FFD, Ug & Bundel", type: "Minimale FFD berekenen", voorbeeld: "Wat is de minimale FFD voor een 6 duimer van 8 mm dik met focus 2.5 mm volgens Klasse B?", toelichting: "Berekent de normatieve minimale film-focusafstand volgens EN-A, EN-B of ASME." },
    { categorie: "FFD, Ug & Bundel", type: "Controle contactopname (bron op de pijp)", voorbeeld: "Kan ik met de bron op de pijp zitten bij een 8 duimer van 8 mm dik en focus 2 mm (klasse B)?", toelichting: "Vergelijkt de voorgestelde FFD op de buis met de minimaal vereiste FFD." },
    { categorie: "FFD, Ug & Bundel", type: "Geometrische onscherpte (Ug) berekenen", voorbeeld: "Wat is de Ug bij FFD 400 mm, wanddikte 15 mm en focusgrootte 3 mm?", toelichting: "Berekent Ug = (F × d) / D en toetst aan de ASME/EN grenswaarde." },
    { categorie: "FFD, Ug & Bundel", type: "Verzet berekenen bij ovaaltje (Opstelling 11 / F)", voorbeeld: "Wat is het verzet voor een ovaaltje op een 2 duimer van 5 mm dik, lasbreedte 8 mm bij FFD 300 mm?", toelichting: "Berekent het minimale en ideale bundelverzet om de boven- en onderlas vrij te projecteren." },
    { categorie: "FFD, Ug & Bundel", type: "Stralingsbundelbreedte & film uitlichten", voorbeeld: "Hoe breed is mijn stralingsbundel op 500 mm afstand met een standaard collimator?", toelichting: "Berekent de uitgelichte bundelbreedte voor een standaard gammacollimator of Balteau Ceram 300." },
    { categorie: "Draadjes & 2T-gat", type: "Vereist BKI-draadje op plaat (SWSI)", voorbeeld: "Welk draadje moet ik zien volgens ASME op een wanddikte van 10 mm?", toelichting: "Bepaalt het vereiste EN/ASME draadje en de bijbehorende BKI-houder (standaard SWSI zonder diameter)." },
    { categorie: "Draadjes & 2T-gat", type: "Vereist BKI-draadje op leiding (DWSI / DWDI)", voorbeeld: "Welk draadje moet ik halen op een 6 duimer van 8 mm dik volgens Klasse B met Se-75?", toelichting: "Bepaalt het vereiste draadje op een buis inclusief eventuele gammavermindering (Se-75 / Ir-192)." },
    { categorie: "Draadjes & 2T-gat", type: "BKI-houder bij specifiek draadnummer", voorbeeld: "Welke BKI houder moet ik pakken voor draadje W13?", toelichting: "Geeft aan op welke ISO 19232-1 BKI-houders (bijv. 10 FE EN / 13 FE EN) het draadje zit." },
    { categorie: "Draadjes & 2T-gat", type: "ASME vs. EN draadjes vergelijken", voorbeeld: "Welk EN draadje kan ik gebruiken in plaats van ASME draadje 6?", toelichting: "Toont het equivalente draadje tussen ASTM E747 en ISO 19232-1 en de normregels." },
    { categorie: "Draadjes & 2T-gat", type: "Vereist 2T-gat (ASME Hole-Type IQI / plaatje)", voorbeeld: "Welk ASME hole-type IQI en welk gaatje hoort bij een wanddikte van 15 mm enkelwandig?", toelichting: "Geeft het vereiste ASME plaatje en 2T-gat voor zowel bronzijde als filmzijde." },
    { categorie: "Draadjes & 2T-gat", type: "2T-gat alternatief (ASME Tabel T-283)", voorbeeld: "Welk alternatief plaatje en gat mag ik gebruiken in plaats van 2T op plaatje 17?", toelichting: "Geeft de toegestane 1T- en 4T-alternatieven volgens ASME Section V Tabel T-283." },
    { categorie: "Draadjes & 2T-gat", type: "BKI materiaalgroep (Inconel, Monel, RVS, Cu, Al)", voorbeeld: "Welk materiaal BKI moet ik gebruiken voor Inconel en Monel?", toelichting: "Geeft de juiste BKI-materiaalgroep volgens ISO 19232-1 en ASTM E747." },
    { categorie: "Afzetting & Lood", type: "Grootte van de afzetting (10 μSv/u)", voorbeeld: "Wat is de afzettingsafstand voor 50 Ci Se-75 zonder collimator?", toelichting: "Berekent de afzettingsafstand in de open bundel, achter de collimator en achter de pijp." },
    { categorie: "Afzetting & Lood", type: "Afzetting met loodafscherming", voorbeeld: "Hoe ver moet ik afzetten met 25 Ci Ir-192, collimator en 6 mm lood?", toelichting: "Berekent de gereduceerde afzettingsafstand bij gebruik van lood- of staalafscherming." },
    { categorie: "Afzetting & Lood", type: "Afzetting leiding met loodplaat & schedule", voorbeeld: "hoe groot moet de afzetting zijn als ik een 6 duimer schedule 40 schiet met een loodplaat en mijn selenium is 30 curie", toelichting: "Berekent de afzettingsafstand in alle richtingen (open bundel, achter collimator en achter leiding) met en zonder loodplaat." },
    { categorie: "Afzetting & Lood", type: "Dosistempo op een bepaalde afstand", voorbeeld: "Wat is het dosistempo op 5 meter afstand bij 30 Ci Ir-192 zonder afscherming?", toelichting: "Berekent het actuele dosistempo (in μSv/u en mSv/u) op een specifieke afstand." },
    { categorie: "Afzetting & Lood", type: "Nodige afscherming (mm lood) voor 10 μSv/u op afstand", voorbeeld: "Hoeveel mm lood heb ik nodig om het dosistempo onder de 10 te krijgen op 8 meter met 40 Ci Ir-192?", toelichting: "Berekent (naar boven afgerond op hele mm) hoeveel lood nodig is om op de gewenste afstand uit te komen." },
    { categorie: "Afzetting & Lood", type: "Halveringsdikte (HVL) lood & staal", voorbeeld: "Welke halveringsdikte heeft lood voor Iridium-192 en voor Seleen-75?", toelichting: "Toont de halveringsdiktes van lood (Pb) en staal (Fe) voor Ir-192 en Se-75." },
    { categorie: "Bronnen & Verval", type: "Bronnenoverzicht & huidige activiteit", voorbeeld: "Welke bronnen hebben we en hoeveel Curie hebben ze vandaag?", toelichting: "Toont alle geregistreerde bronnen uit bronnen.csv met hun actuele sterkte en brongrootte." },
    { categorie: "Bronnen & Verval", type: "Sterkste of zwakste bron opvragen", voorbeeld: "Wat is op dit moment onze sterkste Se-75 bron?", toelichting: "Zoekt direct de sterkste of zwakste Se-75 of Ir-192 bron van vandaag." },
    { categorie: "Bronnen & Verval", type: "Bronverval in de toekomst (over X dagen / datum)", voorbeeld: "Hoeveel Curie heeft bron 35598P over 30 dagen?", toelichting: "Berekent de resterende activiteit na een aantal dagen, weken, maanden of op een specifieke datum." },
    { categorie: "Bronnen & Verval", type: "Bronverval uit het verleden (wat heeft hij nu nog?)", voorbeeld: "Mijn Iridium bron was 45 dagen geleden 50 Curie, hoeveel Curie heeft hij nu nog?", toelichting: "Rekent vanuit een vroegere activiteit uit hoeveel Curie er vandaag nog over is." },
    { categorie: "Bronnen & Verval", type: "Activiteit van een bron in het verleden", voorbeeld: "Hoeveel Curie had bron 35598P 2 weken geleden?", toelichting: "Rekent terug hoeveel Curie een bron in het verleden had." },
    { categorie: "Onstream & Schedule", type: "Onstream minimale FFD (tangentiaal / dubbelwand)", voorbeeld: "Wat is de minimale FFD voor onstream tangentiaal op een 4 duimer met 50 mm isolatie en focus 2 mm (Klasse TB)?", toelichting: "Berekent de minimale onstream FFD volgens RT21021 (tangentiaal) of RT21022 (dubbelwand)." },
    { categorie: "Onstream & Schedule", type: "Onstream bronkeuze & Wmax", voorbeeld: "Welke bron moet ik kiezen voor onstream op een 6 duimer van 7.1 mm dik?", toelichting: "Berekent de maximale doorstraalde wanddikte (Wmax) en adviseert Se-75, Ir-192 of Co-60." },
    { categorie: "Onstream & Schedule", type: "Gevulde leiding (extra staaldikte vloeistof)", voorbeeld: "Wat is de totale doorstraalde dikte van een 6 duimer van 7.1 mm dik gevuld met water?", toelichting: "Berekent het staalequivalent van de vloeistofkolom (water, olie, etc.) bij een onstream opname." },
    { categorie: "Onstream & Schedule", type: "Schedule wanddikte opzoeken (ASME B36.10M)", voorbeeld: "Wat is de wanddikte van een 6 duimer Schedule 80?", toelichting: "Zoekt de nominale wanddikte, binnendiameter en dubbele wand (2t) op voor elke NPS/Schedule maat." },
    { categorie: "Lasfouten & Schietkaart", type: "Overzicht van alle RT-lasfouten", voorbeeld: "Welke lasfouten ken je?", toelichting: "Toont alle 14 gestandaardiseerde RT-lasfouten met ISO 6520-1 codes." },
    { categorie: "Lasfouten & Schietkaart", type: "Lasfout herkennen op de foto + code", voorbeeld: "Wat betekent een wormgat op de foto en welke lasfoutcode hoort daarbij?", toelichting: "Legt uit hoe een lasfout (bijv. wormgat, bindingsfout, worteldoorzakking) op de film zichtbaar is." },
    { categorie: "Lasfouten & Schietkaart", type: "Acceptatiecriteria lasfout berekenen", voorbeeld: "Hoe groot mag een porie zijn bij een wanddikte van 12 mm volgens EN Level 2?", toelichting: "Berekent de exacte toelaatbare afmetingen volgens EN ISO 10675-1 (Level 1, 2, 3) en ASME." },
    { categorie: "Lasfouten & Schietkaart", type: "Complete schietkaart genereren", voorbeeld: "Maak een schietkaart voor een 6 duimer van 8 mm dik met 25 Ci Se-75 volgens Klasse B", toelichting: "Genereert in één overzicht opstelling, FFD, draadje, opnames, belichtingstijd en afzetting." },
    { categorie: "Theorie & Kennis", type: "Aantal draadjes op een EN BKI", voorbeeld: "Hoeveel draadjes heeft een EN BKI?", toelichting: "Legt uit dat een EN BKI conform ISO 19232-1 altijd 7 draden bevat en welke 4 houders (1, 6, 10 en 13 FE) er zijn." },
    { categorie: "Theorie & Kennis", type: "Verschil ASME BKI vs EN BKI", voorbeeld: "Wat is het verschil tussen een ASME BKI en een EN BKI?", toelichting: "Vergelijkt 7 vs 6 draden, nummering W1-W19 vs 1-21 en Hole-type plaatjes vs draadjes." },
    { categorie: "Theorie & Kennis", type: "Agfa filmklasse koppeling (C1 t/m C6)", voorbeeld: "Welk type Agfa film komt overeen met C3, C4 en C5?", toelichting: "Verklaart de indeling van Agfa Structurix films volgens ISO 11699-1 en ASTM E1815 (C1=D2, C2=D3, C3=D4, C4=D5, C5=D7)." },
    { categorie: "Theorie & Kennis", type: "Kwadratenwet in de radiografie", voorbeeld: "Wat is de kwadratenwet en hoe werkt deze?", toelichting: "Legt de omgekeerde kwadratenwet uit voor belichtingstijd en stralingsafzetting/dosistempo." },
    { categorie: "Theorie & Kennis", type: "Wettelijke dosislimiet stralingswerker", voorbeeld: "Wat is de wettelijke dosislimiet voor een radiograaf?", toelichting: "Geeft de limieten voor stralingswerkers (20 mSv/jaar) en toezichts-/gecontroleerde zones (10 μSv/u norm)." },
    { categorie: "Theorie & Kennis", type: "Loodletter B & Terugverstrooiing", voorbeeld: "Waarom leggen we een loodletter B achterop de cassette?", toelichting: "Verklaart de controle op secundaire achterwaartse straling (backscatter) volgens ASME en EN ISO 17636-1." },
    { categorie: "Theorie & Kennis", type: "kV-regel (Keverregel) & Buisspanning", voorbeeld: "Wat is de keverregel en waarom beperken we de buisspanning?", toelichting: "Verklaart het foto-elektrisch effect vs Compton-effect en de maximale kV formule uit EN ISO 17636-1." }
  ];

  let geladenVoorbeeldVragen = null;
  let actieveVoorbeeldCategorie = "Alle";
  let actieveVoorbeeldZoekterm = "";
  let isExamplesOpen = false;
  let opgeslagenResponseHtmlVoorVoorbeelden = "";
  let opgeslagenTranscriptHtmlVoorVoorbeelden = "";

  async function laadVoorbeeldVragen() {
    if (Array.isArray(geladenVoorbeeldVragen) && geladenVoorbeeldVragen.length > 0) {
      return geladenVoorbeeldVragen;
    }
    if (typeof fetch === "function") {
      try {
        const res = await fetch("radi-voorbeelden.json", { cache: "no-store" });
        if (res && res.ok && typeof res.json === "function") {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            geladenVoorbeeldVragen = data;
            return geladenVoorbeeldVragen;
          }
        }
      } catch (e) {
        // Gebruik ingebouwde lijst als fallback (offline / file://)
      }
    }
    geladenVoorbeeldVragen = STANDAARD_VOORBEELDVRAGEN;
    return geladenVoorbeeldVragen;
  }

  function vulVoorbeeldIn(vraagTekst) {
    isExamplesOpen = false;
    const exBtn = document.getElementById("rt-ai-examples-toggle");
    if (exBtn) exBtn.classList.remove("active");
    const respEl = document.getElementById("rt-ai-response");
    const transEl = document.getElementById("rt-ai-transcript");
    if (respEl && opgeslagenResponseHtmlVoorVoorbeelden) {
      respEl.innerHTML = opgeslagenResponseHtmlVoorVoorbeelden;
    }
    if (transEl && opgeslagenTranscriptHtmlVoorVoorbeelden) {
      transEl.innerHTML = opgeslagenTranscriptHtmlVoorVoorbeelden;
    }
    const inp = document.getElementById("rt-ai-input");
    if (inp) {
      inp.value = vraagTekst;
      inp.focus();
    }
  }

  function stelVoorbeeldDirect(vraagTekst) {
    isExamplesOpen = false;
    const exBtn = document.getElementById("rt-ai-examples-toggle");
    if (exBtn) exBtn.classList.remove("active");
    const inp = document.getElementById("rt-ai-input");
    if (inp) {
      inp.value = vraagTekst;
    }
    verstuurTekst();
  }

  async function toggleVoorbeeldVragen() {
    const respEl = document.getElementById("rt-ai-response");
    const transEl = document.getElementById("rt-ai-transcript");
    const exBtn = document.getElementById("rt-ai-examples-toggle");
    if (!respEl) return;

    if (isExamplesOpen) {
      isExamplesOpen = false;
      if (exBtn) exBtn.classList.remove("active");
      if (opgeslagenResponseHtmlVoorVoorbeelden) {
        respEl.innerHTML = opgeslagenResponseHtmlVoorVoorbeelden;
      }
      if (opgeslagenTranscriptHtmlVoorVoorbeelden && transEl) {
        transEl.innerHTML = opgeslagenTranscriptHtmlVoorVoorbeelden;
      }
      return;
    }

    opgeslagenResponseHtmlVoorVoorbeelden = respEl.innerHTML;
    opgeslagenTranscriptHtmlVoorVoorbeelden = transEl ? transEl.innerHTML : "";
    isExamplesOpen = true;
    if (exBtn) exBtn.classList.add("active");
    await toonVoorbeeldVragen();
  }

  async function toonVoorbeeldVragen() {
    const items = await laadVoorbeeldVragen();
    const respEl = document.getElementById("rt-ai-response");
    const transEl = document.getElementById("rt-ai-transcript");
    const exBtn = document.getElementById("rt-ai-examples-toggle");
    if (!respEl) return;

    isExamplesOpen = true;
    if (exBtn) exBtn.classList.add("active");

    if (transEl) {
      transEl.innerHTML = `<i class="fas fa-list-ul" style="color:#F5DF4D;"></i> Overzicht van alle ondersteunde vraagtypen &amp; voorbeeldvragen (${items.length} voorbeelden):`;
    }

    const categorieen = ["Alle", ...new Set(items.map((x) => x.categorie))];

    function renderInhoud() {
      const q = (actieveVoorbeeldZoekterm || "").trim().toLowerCase();
      const gefilterd = items.filter((item) => {
        const matchCat = actieveVoorbeeldCategorie === "Alle" || item.categorie === actieveVoorbeeldCategorie;
        if (!matchCat) return false;
        if (!q) return true;
        return (
          item.type.toLowerCase().includes(q) ||
          item.voorbeeld.toLowerCase().includes(q) ||
          item.categorie.toLowerCase().includes(q) ||
          (item.toelichting && item.toelichting.toLowerCase().includes(q))
        );
      });

      const listEl = document.getElementById("rt-ai-ex-list");
      const countEl = document.getElementById("rt-ai-ex-count");
      if (countEl) {
        countEl.textContent = `${gefilterd.length} van ${items.length} voorbeeldvragen`;
      }
      if (!listEl) return;

      if (gefilterd.length === 0) {
        listEl.innerHTML = `<div style="padding:14px; color:#aaa; text-align:center;">Geen voorbeeldvragen gevonden voor <em>"${actieveVoorbeeldZoekterm}"</em>.</div>`;
        return;
      }

      listEl.innerHTML = gefilterd
        .map((item, idx) => {
          const safeQ = item.voorbeeld.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
          return `
            <div class="rt-ai-ex-card" data-idx="${idx}">
              <div class="rt-ai-ex-card-top">
                <span style="color:#F5DF4D; font-weight:700; font-size:0.93rem;">${item.type}</span>
                <span class="rt-ai-ex-badge">${item.categorie}</span>
              </div>
              <div class="rt-ai-ex-question" data-action="fill" data-q="${safeQ}" title="Klik om in het tekstveld te plaatsen">
                &ldquo;${item.voorbeeld}&rdquo;
              </div>
              ${item.toelichting ? `<div style="font-size:0.8rem; color:#aaa;">${item.toelichting}</div>` : ""}
              <div class="rt-ai-ex-actions">
                <button type="button" class="rt-ai-ex-action-btn primary" data-action="ask" data-q="${safeQ}">
                  <i class="fas fa-play" style="font-size:0.7rem;"></i> Direct vragen
                </button>
                <button type="button" class="rt-ai-ex-action-btn" data-action="fill" data-q="${safeQ}">
                  <i class="fas fa-pen" style="font-size:0.7rem;"></i> Invullen &amp; aanpassen
                </button>
              </div>
            </div>
          `;
        })
        .join("");

      listEl.querySelectorAll("[data-action]").forEach((el) => {
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          const vraag = el.getAttribute("data-q");
          const act = el.getAttribute("data-action");
          if (act === "ask") {
            stelVoorbeeldDirect(vraag);
          } else {
            vulVoorbeeldIn(vraag);
          }
        });
      });
    }

    respEl.innerHTML = `
      <div class="rt-ai-ex-toolbar">
        <input type="text" id="rt-ai-ex-search" class="rt-ai-ex-search" placeholder="🔍 Zoek op type vraag of trefwoord (bijv. lood, 2T, zwarting, opnames, verzet)..." value="${actieveVoorbeeldZoekterm.replace(/"/g, "&quot;")}" autocomplete="off">
        <div class="rt-ai-ex-cats" id="rt-ai-ex-cats">
          ${categorieen
            .map(
              (cat) =>
                `<button type="button" class="rt-ai-ex-cat-pill ${cat === actieveVoorbeeldCategorie ? "active" : ""}" data-cat="${cat}">${cat}</button>`
            )
            .join("")}
        </div>
        <div id="rt-ai-ex-count" style="font-size:0.76rem; color:#999; margin-top:6px;"></div>
      </div>
      <div id="rt-ai-ex-list"></div>
    `;

    const searchInput = document.getElementById("rt-ai-ex-search");
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        actieveVoorbeeldZoekterm = e.target.value;
        renderInhoud();
      });
    }

    const catContainer = document.getElementById("rt-ai-ex-cats");
    if (catContainer) {
      catContainer.querySelectorAll(".rt-ai-ex-cat-pill").forEach((btn) => {
        btn.addEventListener("click", () => {
          actieveVoorbeeldCategorie = btn.getAttribute("data-cat") || "Alle";
          catContainer.querySelectorAll(".rt-ai-ex-cat-pill").forEach((b) => b.classList.remove("active"));
          btn.classList.add("active");
          renderInhoud();
        });
      });
    }

    renderInhoud();
  }

  function attachToIndexPage() {
    injectStyles();
    const micBtn = document.getElementById("btn-index-ai-trigger");
    if (micBtn) {
      if (!micBtn.dataset.bound && !micBtn.getAttribute("onclick")) {
        micBtn.dataset.bound = "true";
        micBtn.addEventListener("click", () => {
          openAssistant(false);
        });
      }
      return;
    }

    const searchBar = document.getElementById("searchBar");
    if (!searchBar) return;

    // Dynamische fallback voor het geval de knop niet statisch in de HTML staat
    const container = searchBar.parentElement;
    if (container && !document.getElementById("btn-index-ai-trigger")) {
      container.classList.add("search-ai-container");
      container.style.display = "flex";
      container.style.alignItems = "center";
      container.style.justifyContent = "center";
      container.style.flexWrap = "wrap";
      container.style.gap = "12px";
      container.style.maxWidth = "620px";
      container.style.margin = "0 auto 24px auto";
      container.style.padding = "0 10px";

      // Geef de zoekbalk een mooi passende flexibele breedte
      searchBar.style.maxWidth = "280px";
      searchBar.style.width = "auto";
      searchBar.style.flex = "1 1 200px";
      searchBar.style.margin = "0";

      const btn = document.createElement("button");
      btn.type = "button";
      btn.id = "btn-index-ai-trigger";
      btn.className = "rt-ai-trigger-btn";
      btn.title = "Stel een vraag met spraak of tekst aan R.A.D.I (Radiografie Assistent Deterministische Inferentie)";
      btn.innerHTML = '<i class="fas fa-robot"></i><span>R.A.D.I</span>';

      btn.addEventListener("click", () => {
        openAssistant(false);
      });

      container.appendChild(btn);
    }
  }

  if (typeof window !== "undefined") {
    if (document.readyState === "loading") {
      window.addEventListener("DOMContentLoaded", () => {
        injectStyles();
        attachToIndexPage();
      });
    } else {
      injectStyles();
      attachToIndexPage();
    }
  }

  let imgLightboxEl = null;

  function sluitAfbeeldingZoom() {
    if (imgLightboxEl && imgLightboxEl.parentNode) {
      imgLightboxEl.parentNode.removeChild(imgLightboxEl);
    }
    imgLightboxEl = null;
  }

  function openAfbeeldingZoom(src, alt = "Afbeelding") {
    if (typeof document === "undefined" || !document.body) return;
    sluitAfbeeldingZoom();

    const lb = document.createElement("div");
    lb.id = "rt-ai-img-lightbox";
    lb.className = "rt-ai-img-lightbox";
    lb.innerHTML =
      `<div class="rt-ai-img-lightbox-bar">` +
        `<span class="rt-ai-img-lightbox-title">${escapeHtmlTekst(alt)}</span>` +
        `<div class="rt-ai-img-lightbox-controls">` +
          `<button type="button" class="rt-ai-img-zoom-btn" id="rt-img-zoom-out" title="Uitzoomen">&minus;</button>` +
          `<button type="button" class="rt-ai-img-zoom-btn" id="rt-img-zoom-reset" title="Reset zoom">100%</button>` +
          `<button type="button" class="rt-ai-img-zoom-btn" id="rt-img-zoom-in" title="Inzoomen">+</button>` +
          `<button type="button" class="rt-ai-img-zoom-btn" id="rt-img-zoom-close" title="Sluiten" style="background:#5a2323;">&times;</button>` +
        `</div>` +
      `</div>` +
      `<div class="rt-ai-img-stage" id="rt-img-stage">` +
        `<img id="rt-img-zoom-target" src="${escapeHtmlTekst(src)}" alt="${escapeHtmlTekst(alt)}" draggable="false">` +
      `</div>` +
      `<div class="rt-ai-img-loupe" id="rt-img-loupe"></div>` +
      `<div class="rt-ai-img-lightbox-hint">🔍 Op 100%: houd 1 vinger vast voor vergrootglas • Ingezoomd (+ / knijpen / dubbeltik): sleep met 1 vinger om te verschuiven</div>`;

    document.body.appendChild(lb);
    imgLightboxEl = lb;

    const imgEl = document.getElementById("rt-img-zoom-target");
    const loupeEl = document.getElementById("rt-img-loupe");
    const resetBtn = document.getElementById("rt-img-zoom-reset");
    const stageEl = document.getElementById("rt-img-stage");

    let scale = 1;
    let panX = 0;
    let panY = 0;
    const loupeZoom = 2.6;
    const loupeSize = 156;
    let pinchStartDist = 0;
    let pinchStartScale = 1;
    let isLoupeActive = false;
    let isPanning = false;
    let panStartX = 0;
    let panStartY = 0;
    let panOriginX = 0;
    let panOriginY = 0;
    let lastTapTime = 0;

    const clampPan = () => {
      if (!imgEl || !stageEl || scale <= 1) {
        panX = 0;
        panY = 0;
        return;
      }
      const baseW = imgEl.offsetWidth || stageEl.clientWidth || 300;
      const baseH = imgEl.offsetHeight || stageEl.clientHeight || 300;
      const stageW = stageEl.clientWidth || baseW;
      const stageH = stageEl.clientHeight || baseH;
      const maxX = Math.max(0, (baseW * scale - stageW) / 2 + 40);
      const maxY = Math.max(0, (baseH * scale - stageH) / 2 + 40);
      panX = Math.max(-maxX, Math.min(maxX, panX));
      panY = Math.max(-maxY, Math.min(maxY, panY));
    };

    const applyTransform = (animate = false) => {
      if (!imgEl) return;
      if (scale <= 1) {
        scale = 1;
        panX = 0;
        panY = 0;
      } else {
        clampPan();
      }
      imgEl.style.transition = animate ? "transform 0.14s ease-out" : "none";
      imgEl.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
      imgEl.style.cursor = scale > 1 ? (isPanning ? "grabbing" : "grab") : "zoom-in";
      if (resetBtn) resetBtn.textContent = `${Math.round(scale * 100)}%`;
    };

    const updateLoupe = (clientX, clientY, isTouchEvent) => {
      if (!imgEl || !loupeEl) return;
      const rect = imgEl.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) {
        loupeEl.style.display = "none";
        return;
      }
      const relX = (clientX - rect.left) / rect.width;
      const relY = (clientY - rect.top) / rect.height;

      const bgW = rect.width * loupeZoom;
      const bgH = rect.height * loupeZoom;
      const bgPosX = -(relX * bgW - loupeSize / 2);
      const bgPosY = -(relY * bgH - loupeSize / 2);

      // Plaats het vergrootglas net BOVEN de vinger zodat de vinger het detail nooit bedekt
      const offsetY = isTouchEvent ? 112 : 96;
      const vw = typeof window !== "undefined" ? window.innerWidth : 800;
      const left = Math.max(8, Math.min(vw - loupeSize - 8, clientX - loupeSize / 2));
      let top = clientY - offsetY - loupeSize / 2;
      if (top < 54) top = clientY + 38;

      loupeEl.style.backgroundImage = `url("${src}")`;
      loupeEl.style.backgroundSize = `${bgW}px ${bgH}px`;
      loupeEl.style.backgroundPosition = `${bgPosX}px ${bgPosY}px`;
      loupeEl.style.left = `${left}px`;
      loupeEl.style.top = `${top}px`;
      loupeEl.style.display = "block";
    };

    const hideLoupe = () => {
      isLoupeActive = false;
      if (loupeEl) loupeEl.style.display = "none";
    };

    if (stageEl) {
      stageEl.addEventListener("touchstart", (e) => {
        if (e.touches && e.touches.length === 2) {
          hideLoupe();
          isPanning = false;
          const dx = e.touches[0].clientX - e.touches[1].clientX;
          const dy = e.touches[0].clientY - e.touches[1].clientY;
          pinchStartDist = Math.hypot(dx, dy);
          pinchStartScale = scale;
        } else if (e.touches && e.touches.length === 1) {
          const now = Date.now();
          const t0 = e.touches[0];
          if (now - lastTapTime < 280) {
            // Dubbeltik: snel wisselen tussen 100% en 250%
            hideLoupe();
            isPanning = false;
            scale = scale > 1.2 ? 1 : 2.5;
            applyTransform(true);
            lastTapTime = 0;
            return;
          }
          lastTapTime = now;

          if (scale > 1) {
            hideLoupe();
            isPanning = true;
            panStartX = t0.clientX;
            panStartY = t0.clientY;
            panOriginX = panX;
            panOriginY = panY;
          } else {
            isPanning = false;
            isLoupeActive = true;
            updateLoupe(t0.clientX, t0.clientY, true);
          }
        }
      }, { passive: true });

      stageEl.addEventListener("touchmove", (e) => {
        if (e.cancelable) e.preventDefault();
        if (e.touches && e.touches.length === 2 && pinchStartDist > 0) {
          const dx = e.touches[0].clientX - e.touches[1].clientX;
          const dy = e.touches[0].clientY - e.touches[1].clientY;
          const dist = Math.hypot(dx, dy);
          scale = Math.max(1, Math.min(4, pinchStartScale * (dist / pinchStartDist)));
          applyTransform(false);
        } else if (e.touches && e.touches.length === 1) {
          const t0 = e.touches[0];
          if (isPanning && scale > 1) {
            panX = panOriginX + (t0.clientX - panStartX);
            panY = panOriginY + (t0.clientY - panStartY);
            applyTransform(false);
          } else if (isLoupeActive) {
            updateLoupe(t0.clientX, t0.clientY, true);
          }
        }
      }, { passive: false });

      stageEl.addEventListener("touchend", (e) => {
        if (!e.touches || e.touches.length === 0) {
          pinchStartDist = 0;
          isPanning = false;
          hideLoupe();
        } else if (e.touches.length === 1 && scale > 1) {
          // Na loslaten van 1 vinger uit pinch: soepel verder slepen met 1 vinger
          pinchStartDist = 0;
          isPanning = true;
          panStartX = e.touches[0].clientX;
          panStartY = e.touches[0].clientY;
          panOriginX = panX;
          panOriginY = panY;
        }
      });

      stageEl.addEventListener("mousedown", (e) => {
        if (scale > 1) {
          hideLoupe();
          isPanning = true;
          panStartX = e.clientX;
          panStartY = e.clientY;
          panOriginX = panX;
          panOriginY = panY;
          applyTransform(false);
        } else {
          isLoupeActive = true;
          updateLoupe(e.clientX, e.clientY, false);
        }
      });
      stageEl.addEventListener("mousemove", (e) => {
        if (isPanning && scale > 1) {
          panX = panOriginX + (e.clientX - panStartX);
          panY = panOriginY + (e.clientY - panStartY);
          applyTransform(false);
        } else if (isLoupeActive) {
          updateLoupe(e.clientX, e.clientY, false);
        }
      });
      stageEl.addEventListener("mouseup", () => { isPanning = false; hideLoupe(); applyTransform(false); });
      stageEl.addEventListener("mouseleave", () => { isPanning = false; hideLoupe(); });
      stageEl.addEventListener("dblclick", () => {
        hideLoupe();
        scale = scale > 1.2 ? 1 : 2.5;
        applyTransform(true);
      });
    }

    const zoomInBtn = document.getElementById("rt-img-zoom-in");
    const zoomOutBtn = document.getElementById("rt-img-zoom-out");
    const closeBtn = document.getElementById("rt-img-zoom-close");
    if (zoomInBtn) zoomInBtn.addEventListener("click", () => { scale = Math.min(4, scale + 0.5); applyTransform(true); });
    if (zoomOutBtn) zoomOutBtn.addEventListener("click", () => { scale = Math.max(1, scale - 0.5); applyTransform(true); });
    if (resetBtn) resetBtn.addEventListener("click", () => { scale = 1; panX = 0; panY = 0; applyTransform(true); });
    if (closeBtn) closeBtn.addEventListener("click", sluitAfbeeldingZoom);
    lb.addEventListener("click", (e) => {
      if (e.target === lb) sluitAfbeeldingZoom();
    });
  }

  // Expose API
  const RtAssistant = {
    NDO_SPRAAK_WOORDENBOEK,
    corrigeerSpraakTekst,
    herstelVakjargon,
    bepaalVraagIntenties,
    extractParametersDeterministisch,
    berekenAfzetting,
    berekenOnstream,
    berekenFilmKeuze,
    berekenStralingstijd,
    calculateMinimumExposures,
    bepaalNumeriekeMinFFD,
    bepaalVoorgesteldeFFD,
    berekenAantalOpnames,
    berekenMinFFD,
    berekenLangsnaadVerdeling,
    berekenFocusVerandering,
    berekenBundelbreedte,
    berekenLasfoutAcceptatie,
    geefAppInfo,
    toggleInfo: (force) => toggleInfoPanel(force),
    toonVoorbeeldVragen,
    toggleVoorbeeldVragen,
    laadVoorbeeldVragen,
    STANDAARD_VOORBEELDVRAGEN,
    berekenKVRegel,
    berekenBuistabel,
    berekenGevuldeLeiding,
    berekenBronVerval,
    berekenBkiDraadje,
    geefOpstellingEnGroeperingInfo,
    geefRTKennisAntwoord,
    berekenSchedule,
    zoekScheduleInfo,
    ASME_PIPE_SCHEDULES,
    OPSTELLINGEN_NDO,
    resetGespreksGeheugen,
    kopieerGesprek,
    meldFoutViaMail,
    formatteerGesprekAlsTekst,
    wisGeheugenParameter,
    geefGeheugenItems,
    geefGeheugenBadgesHtml,
    geefGeheugenSamenvatting,
    actiefGespreksGeheugen,
    verwerkUniverseleVraag,
    openAssistant,
    sluitAssistant,
    openAfbeeldingZoom,
    sluitAfbeeldingZoom,
    verstuurTekst,
    verstuurSuggestie,
    laadBronnenCsv,
    geefBrongrootteSuggestieChips,
    bronnenData,
    materialenDatabase,
    zoekMateriaal,
    STANDAARD_MATERIAAL_CSV,
    geefMateriaalInfo,
    geefBkiMateriaalgroepInfo,
    geefBkiSetsVoorDraad,
    ASME_EN_WIRE_EQUIVALENTS,
    berekenAsmeIqiVergelijking,
    ASME_HOLE_TYPE_DATA,
    ASME_TABLE_2_SELECTION,
    ASME_TABLE_T283_EQUIVALENTS,
    berekenHoleTypeIqi,
    berekenSchietkaart,
    kopieerSchietkaart,
    toggleTts,
    isTtsEnabled,
    spreekTekst,
    maakKorteSpraakTekst,
    geefBronDropdownHtml,
    selecteerBronUitDropdown,
    geefNormDropdownHtml,
    selecteerNormUitDropdown,
    wijzigActiviteitViaPrompt,
  };

  global.RtAssistant = RtAssistant;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = RtAssistant;
  }
