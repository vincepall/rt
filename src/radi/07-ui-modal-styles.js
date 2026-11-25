  // --- UI Controller (Universeel op elke pagina) ---
  let assistantModal = null;
  let recognition = null;
  let isRecording = null;
  let toggleInfoPanel = function() {};

  function injectStyles() {
    if (typeof document === "undefined" || document.getElementById("rt-ai-injected-styles")) return;
    if (document.querySelector) {
      const vpMeta = document.querySelector('meta[name="viewport"]');
      if (vpMeta) {
        const vpContent = vpMeta.getAttribute("content") || "";
        if (!vpContent.includes("interactive-widget")) {
          vpMeta.setAttribute("content", vpContent + ", interactive-widget=resizes-content");
        }
      }
    }
    const style = document.createElement("style");
    style.id = "rt-ai-injected-styles";
    style.textContent = `
      .rt-ai-mic-btn {
        background-color: #F5DF4D;
        color: #111;
        border: 2px solid #333;
        border-radius: 50%;
        width: 52px;
        height: 52px;
        font-size: 22px;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        transition: transform 0.15s, background-color 0.15s;
        vertical-align: middle;
        position: relative;
        flex-shrink: 0;
        user-select: none !important;
        -webkit-user-select: none !important;
        -webkit-touch-callout: none !important;
        touch-action: none !important;
      }
      .rt-ai-mic-btn:hover {
        transform: scale(1.06);
        background-color: #ffd700;
      }
      .rt-ai-mic-btn:active, .rt-ai-mic-btn.recording {
        background-color: #ff3b30 !important;
        color: #fff !important;
        border-color: #fff !important;
        transform: scale(0.96);
        animation: rtPulse 1.2s infinite;
      }
      .rt-ai-mic-btn .ai-badge {
        position: absolute;
        bottom: -2px;
        right: -3px;
        background: #111;
        color: #F5DF4D;
        font-size: 8px;
        font-weight: 800;
        padding: 1px 3px;
        border-radius: 4px;
        border: 1px solid #F5DF4D;
        letter-spacing: 0.5px;
        font-family: 'Roboto Condensed', sans-serif;
        pointer-events: none;
      }
      .rt-ai-trigger-btn {
        background-color: #F5DF4D;
        color: #000000;
        border: 4px solid #333333;
        border-radius: 1.05em;
        padding: 6px 18px;
        font-size: 1.1rem;
        font-weight: 700;
        font-family: 'Roboto Condensed', sans-serif;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        box-shadow: 3px 3px 7px rgba(0, 0, 0, 0.25);
        transition: transform 0.2s ease, background-color 0.2s ease, box-shadow 0.2s ease;
        flex-shrink: 0;
        height: 44px;
        box-sizing: border-box;
        text-shadow: none;
      }
      .rt-ai-trigger-btn:hover {
        transform: scale(1.04);
        background-color: #ffe600;
        border-color: #000000;
        box-shadow: 3px 5px 12px rgba(0, 0, 0, 0.35);
      }
      .rt-ai-trigger-btn i {
        font-size: 1.15rem;
        color: #000000;
      }
      .rt-ai-trigger-btn.recording {
        background-color: #ff3b30;
        color: #ffffff;
        border-color: #ffffff;
        animation: rtPulse 1.2s infinite;
      }
      .rt-ai-trigger-btn.recording i {
        color: #ffffff;
      }
      @keyframes rtPulse {
        0% { box-shadow: 0 0 0 0 rgba(255, 59, 48, 0.7); }
        70% { box-shadow: 0 0 0 14px rgba(255, 59, 48, 0); }
        100% { box-shadow: 0 0 0 0 rgba(255, 59, 48, 0); }
      }
      .rt-ai-modal-overlay {
        position: fixed;
        top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0, 0, 0, 0.78);
        z-index: 10000;
        display: none;
        align-items: center;
        justify-content: center;
        padding: 16px;
        box-sizing: border-box;
        overscroll-behavior: none !important;
        touch-action: none;
      }
      .rt-ai-modal {
        background: #2a2a2a;
        color: #f4f4f4;
        border: 3px solid #F5DF4D;
        border-radius: 20px;
        width: min(920px, 94vw);
        height: min(880px, 90vh);
        min-height: min(560px, 85vh);
        padding: 20px 24px;
        box-sizing: border-box;
        box-shadow: 0 18px 52px rgba(0,0,0,0.75), 0 0 0 1px rgba(245,223,77,0.25);
        font-family: 'Roboto Condensed', sans-serif;
        text-align: left;
        display: flex;
        flex-direction: column;
        overscroll-behavior: none !important;
        position: relative !important;
      }
      .rt-ai-modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 14px;
        border-bottom: 1px solid #444;
        padding-bottom: 8px;
        flex-shrink: 0;
        touch-action: none !important;
      }
      .rt-ai-modal-header h3 {
        margin: 0;
        color: #F5DF4D;
        font-size: 1.4rem;
        font-family: 'Roboto Condensed', sans-serif;
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .rt-ai-modal-title-group {
        display: flex;
        flex-direction: column;
        min-width: 0;
      }
      .rt-ai-modal-subtitle {
        font-size: 0.75rem;
        color: #bbb;
        margin-top: 2px;
        font-family: 'Roboto Condensed', sans-serif;
        line-height: 1.2;
        font-weight: normal;
      }
      .rt-ai-close-btn {
        background: none;
        border: none;
        color: #aaa;
        font-size: 28px;
        cursor: pointer;
        line-height: 1;
        padding: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .rt-ai-close-btn:hover { color: #fff; }
      .rt-ai-info-btn {
        background: none;
        border: none;
        color: #888;
        font-size: 19px;
        cursor: pointer;
        padding: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: color 0.2s;
      }
      .rt-ai-info-btn:hover { color: #F5DF4D !important; }
      .rt-ai-info-panel {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: #1f1f1f;
        border: 2px solid #F5DF4D;
        border-radius: 15px;
        z-index: 70;
        padding: 16px 18px;
        display: flex;
        flex-direction: column;
        box-sizing: border-box;
        box-shadow: 0 10px 32px rgba(0, 0, 0, 0.85);
      }
      .rt-ai-info-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid #444;
        padding-bottom: 8px;
        margin-bottom: 12px;
        flex-shrink: 0;
      }
      .rt-ai-info-header h4 {
        margin: 0;
        color: #F5DF4D;
        font-size: 1.15rem;
        display: flex;
        align-items: center;
        font-family: 'Roboto Condensed', sans-serif;
      }
      .rt-ai-info-close {
        background: none;
        border: none;
        color: #aaa;
        font-size: 26px;
        cursor: pointer;
        line-height: 1;
        padding: 2px 6px;
      }
      .rt-ai-info-close:hover { color: #fff; }
      .rt-ai-info-body {
        flex: 1 1 auto;
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
        font-size: 0.95rem;
        color: #ddd;
        line-height: 1.5;
        padding-right: 4px;
        font-family: 'Roboto Condensed', sans-serif;
      }
      .rt-ai-info-body p {
        margin: 0 0 8px 0;
      }
      .rt-ai-info-ok-btn {
        background: #F5DF4D;
        color: #000;
        font-weight: bold;
        border: none;
        border-radius: 8px;
        padding: 10px 16px;
        font-size: 1rem;
        cursor: pointer;
        margin-top: 12px;
        flex-shrink: 0;
        transition: background 0.15s, transform 0.15s;
        font-family: 'Roboto Condensed', sans-serif;
      }
      .rt-ai-info-ok-btn:hover {
        background: #ffe642;
        transform: scale(1.02);
      }
      .rt-ai-transcript {
        font-size: 0.95rem;
        color: #bbb;
        margin-bottom: 8px;
        font-family: 'Roboto Condensed', sans-serif;
        flex-shrink: 0;
        min-height: 20px;
        touch-action: none !important;
      }
      .rt-ai-response-box {
        position: relative;
        background: #1e1e1e;
        border-left: 4px solid #F5DF4D;
        padding: 14px;
        border-radius: 8px;
        margin-bottom: 14px;
        line-height: 1.6;
        font-size: 1.05rem;
        font-family: 'Roboto Condensed', sans-serif;
        flex: 1 1 auto;
        min-height: 0;
        overflow-y: auto;
        -webkit-overflow-scrolling: touch;
        overscroll-behavior: contain !important;
        touch-action: pan-y !important;
      }
      .rt-ai-start-welcome {
        color: #ddd;
        font-size: 0.96rem;
        line-height: 1.45;
      }
      .rt-ai-start-examples {
        list-style: none;
        margin: 10px 0 0 0;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .rt-ai-start-example-item {
        display: flex;
        align-items: flex-start;
        gap: 8px;
      }
      .rt-ai-start-example-icon {
        background: none;
        border: 1px solid rgba(245, 223, 77, 0.35);
        color: #F5DF4D;
        width: 22px;
        height: 22px;
        min-width: 22px;
        border-radius: 50%;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 0.62rem;
        padding: 0 0 0 1px;
        margin-top: 2px;
        cursor: pointer;
        opacity: 0.8;
        transition: opacity 0.15s, background 0.15s, transform 0.15s;
      }
      .rt-ai-start-example-icon:hover,
      .rt-ai-start-example-icon:active {
        opacity: 1;
        background: rgba(245, 223, 77, 0.2);
        transform: scale(1.08);
      }
      .rt-ai-start-example-text {
        color: #ccc;
        font-size: 0.92rem;
        line-height: 1.4;
      }
      .rt-ai-response-box strong,
      .rt-ai-response-box b {
        color: #F5DF4D !important;
        font-size: 1.18em !important;
        font-weight: 800 !important;
        letter-spacing: 0.2px !important;
      }
      .rt-ai-response-box .rt-ai-focus-calc strong,
      .rt-ai-response-box .rt-ai-focus-calc b {
        color: #f0f0f0 !important;
        font-size: 1em !important;
        font-weight: 700 !important;
        letter-spacing: normal !important;
      }
      .rt-ai-response-box .rt-ai-focus-calc .rt-ai-final-time,
      .rt-ai-response-box .rt-ai-focus-calc .rt-ai-final-time strong,
      .rt-ai-response-box .rt-ai-focus-calc .rt-ai-final-time b {
        color: #F5DF4D !important;
        font-size: 1.15em !important;
        font-weight: 800 !important;
        letter-spacing: 0.2px !important;
      }
      .rt-ai-history-entry {
        padding-bottom: 8px;
      }
      .rt-ai-history-entry + .rt-ai-history-entry {
        margin-top: 12px;
        padding-top: 12px;
        border-top: 1px dashed rgba(255, 255, 255, 0.16);
      }
      .rt-ai-history-entry:not(.is-latest) {
        opacity: 0.78;
      }
      .rt-ai-history-entry:last-child {
        padding-bottom: 2px;
      }
      .rt-ai-history-q {
        font-size: 0.85rem;
        color: #9fb3c8;
        margin-bottom: 5px;
        word-break: break-word;
      }
      .rt-ai-history-q strong {
        color: #e2e8f0 !important;
        font-size: 1em !important;
        font-weight: 700 !important;
      }
      .rt-ai-chips-row {
        display: grid !important;
        grid-template-columns: repeat(auto-fit, minmax(135px, 1fr)) !important;
        gap: 8px !important;
        margin-top: 12px !important;
        width: 100% !important;
      }
      .rt-ai-chip-btn {
        background: #222 !important;
        border: 1px solid #f5df4d !important;
        color: #f5df4d !important;
        padding: 7px 10px !important;
        border-radius: 10px !important;
        font-size: 0.85rem !important;
        font-family: 'Roboto Condensed', sans-serif !important;
        font-weight: 600 !important;
        cursor: pointer !important;
        width: 100% !important;
        min-height: 36px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        text-align: center !important;
        line-height: 1.25 !important;
        white-space: normal !important;
        word-break: break-word !important;
        box-sizing: border-box !important;
        transition: background 0.15s ease, transform 0.1s ease !important;
      }
      .rt-ai-chip-btn:hover {
        background: rgba(245, 223, 77, 0.15) !important;
      }
      .rt-ai-memory-bar {
        background: #161616 !important;
        border: 1px solid rgba(255, 255, 255, 0.14) !important;
        border-radius: 8px !important;
        padding: 6px 10px !important;
        margin-bottom: 10px !important;
        flex-shrink: 0 !important;
        max-height: 182px !important;
        overflow-y: auto !important;
        -webkit-overflow-scrolling: touch !important;
        overscroll-behavior: contain !important;
        touch-action: pan-y !important;
        box-sizing: border-box !important;
      }
      .rt-ai-context-container {
        font-size: 0.82rem;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .rt-ai-memory-empty {
        font-size: 0.8rem;
        opacity: 0.7;
      }
      .rt-ai-memory-items {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
        gap: 5px;
        width: 100%;
      }
      .rt-ai-param-badge {
        display: inline-flex;
        align-items: center;
        justify-content: space-between;
        background: #181818;
        border: 1px solid rgba(245, 223, 77, 0.45);
        border-radius: 10px;
        padding: 3px 8px;
        font-size: 0.78rem;
        color: #f0f0f0;
        gap: 4px;
        width: 100%;
        min-width: 0;
        box-sizing: border-box;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
      }
      .rt-ai-param-badge-edit {
        border-color: #f5df4d;
        color: #f5df4d;
        cursor: pointer;
      }
      .rt-ai-param-badge-edit .rt-ai-badge-text {
        text-decoration: underline dotted;
        text-underline-offset: 2px;
      }
      .rt-ai-badge-text {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        min-width: 0;
      }
      .rt-ai-badge-del {
        background: none;
        border: none;
        color: #ff6b6b;
        cursor: pointer;
        padding: 2px 3px;
        margin: 0;
        font-size: 1.1rem;
        line-height: 1;
        font-weight: bold;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 18px;
        min-height: 22px;
        flex-shrink: 0;
      }
      .rt-ai-badge-del:hover {
        color: #ff3333;
      }
      .rt-ai-memory-controls {
        display: flex;
        align-items: center;
        gap: 6px;
        width: 100%;
      }
      .rt-ai-memory-controls .rt-ai-bron-pill,
      .rt-ai-memory-controls .rt-ai-norm-pill {
        flex: 1 1 0 !important;
        min-width: 0 !important;
        justify-content: space-between !important;
        box-sizing: border-box !important;
      }
      .rt-ai-memory-controls .rt-ai-bron-select,
      .rt-ai-memory-controls .rt-ai-norm-select {
        flex: 1 1 0 !important;
        min-width: 0 !important;
        width: 100% !important;
        max-width: none !important;
      }
      .rt-ai-clear-mem-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 5px;
        background: rgba(255, 77, 77, 0.12);
        border: 1px solid rgba(255, 107, 107, 0.5);
        border-radius: 10px;
        padding: 3px 9px;
        font-size: 0.78rem;
        font-weight: 600;
        color: #ffb4b4;
        cursor: pointer;
        flex-shrink: 0;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
        transition: all 0.15s ease;
      }
      .rt-ai-clear-mem-btn:hover {
        background: rgba(255, 77, 77, 0.28);
        color: #ffffff;
        border-color: #ff4d4d;
      }
      .rt-ai-input-bar {
        display: flex !important;
        gap: 8px !important;
        align-items: flex-end !important;
        width: 100% !important;
        box-sizing: border-box !important;
        flex-shrink: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
        touch-action: none !important;
      }
      .rt-ai-text-input {
        flex: 1 1 0 !important;
        width: 0 !important;
        min-width: 0 !important;
        min-height: 42px !important;
        max-height: 112px !important;
        padding: 9px 14px !important;
        border-radius: 1.05em !important;
        border: 3px solid #F5DF4D !important;
        background-color: #ffffff !important;
        color: #000000 !important;
        font-size: 1.05rem !important;
        line-height: 1.35 !important;
        font-family: 'Roboto Condensed', sans-serif !important;
        text-align: left !important;
        max-width: none !important;
        box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.15) !important;
        box-sizing: border-box !important;
        resize: none !important;
        overflow-y: auto !important;
        touch-action: pan-y !important;
      }
      .rt-ai-text-input:focus {
        outline: none !important;
        border-color: #051aff !important;
        background-color: #ffffff !important;
        color: #000000 !important;
      }
      .rt-ai-text-input::placeholder {
        color: #666666 !important;
        font-family: 'Roboto Condensed', sans-serif !important;
      }
      .rt-ai-send-btn {
        background: #F5DF4D !important;
        color: #000000 !important;
        border: 2px solid #000000 !important;
        border-radius: 50% !important;
        width: 42px !important;
        height: 42px !important;
        padding: 0 !important;
        font-size: 1.1rem !important;
        cursor: pointer !important;
        transition: transform 0.15s, background-color 0.15s !important;
        flex-shrink: 0 !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
      }
      .rt-ai-send-btn:hover {
        background-color: #ffd700 !important;
        transform: scale(1.08) !important;
      }
      .rt-ai-link {
        color: #F5DF4D;
        text-decoration: underline;
      }
      .rt-math-box {
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(245, 223, 77, 0.35);
        border-left: 3px solid #F5DF4D;
        border-radius: 8px;
        padding: 10px 16px;
        margin: 8px 0;
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-size: 1.12rem;
        color: #fff;
        font-family: 'Cambria Math', 'Times New Roman', Georgia, serif;
        letter-spacing: 0.3px;
      }
      .rt-math-inline {
        font-family: 'Cambria Math', 'Times New Roman', Georgia, serif;
        font-size: 1.04em;
        white-space: nowrap;
      }
      .rt-math-frac {
        display: inline-flex;
        flex-direction: column;
        align-items: center;
        vertical-align: middle;
        margin: 0 4px;
        line-height: 1.15;
        font-size: 0.94em;
        font-family: 'Cambria Math', 'Times New Roman', Georgia, serif;
      }
      .rt-math-num {
        border-bottom: 1.5px solid #F5DF4D;
        padding: 0 5px 2px 5px;
        color: #fff;
        font-weight: 600;
      }
      .rt-math-den {
        padding: 2px 5px 0 5px;
        color: #fff;
        font-weight: 600;
      }
      .rt-ai-examples-btn {
        background: rgba(245, 223, 77, 0.12);
        border: 1px solid rgba(245, 223, 77, 0.35);
        border-radius: 6px;
        color: #F5DF4D;
        font-size: 13px;
        font-weight: bold;
        cursor: pointer;
        padding: 4px 9px;
        display: inline-flex;
        align-items: center;
        gap: 5px;
        transition: all 0.2s;
        font-family: 'Roboto Condensed', sans-serif;
      }
      .rt-ai-examples-btn:hover {
        background: rgba(245, 223, 77, 0.25);
        border-color: #F5DF4D;
      }
      .rt-ai-examples-btn.active {
        background: #F5DF4D;
        color: #111;
        border-color: #F5DF4D;
      }
      .rt-ai-ex-toolbar {
        position: sticky;
        top: -14px;
        background: #1e1e1e;
        padding: 10px 0 8px 0;
        margin-top: -6px;
        margin-bottom: 10px;
        border-bottom: 1px solid #333;
        z-index: 5;
      }
      .rt-ai-ex-search {
        width: 100%;
        box-sizing: border-box;
        padding: 8px 12px;
        border-radius: 8px;
        border: 1px solid #444;
        background: #141414;
        color: #fff;
        font-size: 0.92rem;
        font-family: 'Roboto Condensed', sans-serif;
        margin-bottom: 8px;
      }
      .rt-ai-ex-search:focus {
        outline: none;
        border-color: #F5DF4D;
      }
      .rt-ai-ex-cats {
        display: flex;
        flex-wrap: wrap;
        gap: 5px;
      }
      .rt-ai-ex-cat-pill {
        background: #2b2b2b;
        border: 1px solid #444;
        color: #ccc;
        border-radius: 14px;
        padding: 3px 9px;
        font-size: 0.78rem;
        cursor: pointer;
        font-family: 'Roboto Condensed', sans-serif;
        transition: all 0.15s;
      }
      .rt-ai-ex-cat-pill:hover {
        border-color: #F5DF4D;
        color: #fff;
      }
      .rt-ai-ex-cat-pill.active {
        background: #F5DF4D;
        border-color: #F5DF4D;
        color: #000;
        font-weight: bold;
      }
      .rt-ai-ex-card {
        background: #262626;
        border: 1px solid #383838;
        border-radius: 8px;
        padding: 9px 11px;
        margin-bottom: 8px;
        transition: border-color 0.15s, background 0.15s;
      }
      .rt-ai-ex-card:hover {
        border-color: rgba(245, 223, 77, 0.6);
        background: #2b2b2b;
      }
      .rt-ai-ex-card-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        flex-wrap: wrap;
        margin-bottom: 4px;
      }
      .rt-ai-ex-badge {
        background: rgba(245, 223, 77, 0.14);
        color: #F5DF4D;
        border: 1px solid rgba(245, 223, 77, 0.3);
        border-radius: 4px;
        padding: 1px 6px;
        font-size: 0.72rem;
        font-weight: bold;
      }
      .rt-ai-ex-question {
        color: #fff;
        font-size: 0.96rem;
        margin: 4px 0;
        cursor: pointer;
      }
      .rt-ai-ex-actions {
        display: flex;
        gap: 6px;
        margin-top: 6px;
      }
      .rt-ai-ex-action-btn {
        background: #333;
        border: 1px solid #555;
        color: #eee;
        border-radius: 5px;
        padding: 3px 8px;
        font-size: 0.78rem;
        cursor: pointer;
        font-family: 'Roboto Condensed', sans-serif;
      }
      .rt-ai-ex-action-btn.primary {
        background: rgba(245, 223, 77, 0.18);
        border-color: rgba(245, 223, 77, 0.5);
        color: #F5DF4D;
        font-weight: bold;
      }
      .rt-ai-ex-action-btn:hover {
        border-color: #F5DF4D;
        color: #fff;
      }
      /* Volledig scherm en geoptimaliseerd voor mobiel */
      @media (max-width: 768px) {
        .rt-ai-modal-overlay {
          padding: 0 !important;
          align-items: stretch !important;
          justify-content: stretch !important;
          background: #1e1e1e !important;
          overscroll-behavior: none !important;
          touch-action: none !important;
          position: fixed !important;
          top: var(--rt-ai-vtop, 0px) !important;
          left: 0 !important;
          right: 0 !important;
          bottom: auto !important;
          width: 100vw !important;
          height: var(--rt-ai-vh, 100vh) !important;
          max-height: var(--rt-ai-vh, 100vh) !important;
        }
        .rt-ai-modal {
          width: 100vw !important;
          max-width: 100vw !important;
          height: 100% !important;
          max-height: 100% !important;
          min-height: 0 !important;
          border-radius: 0 !important;
          border: none !important;
          border-top: 4px solid #F5DF4D !important;
          padding: 10px 12px !important;
          padding-top: max(8px, env(safe-area-inset-top)) !important;
          padding-bottom: max(8px, env(safe-area-inset-bottom)) !important;
          display: flex !important;
          flex-direction: column !important;
          box-sizing: border-box !important;
          margin: 0 !important;
          background: #252525 !important;
          overscroll-behavior: none !important;
        }
        .rt-ai-modal-overlay.rt-ai-kb-open .rt-ai-modal {
          padding-top: 6px !important;
          padding-bottom: 6px !important;
        }
        .rt-ai-modal-overlay.rt-ai-kb-open .rt-ai-modal-subtitle {
          display: none !important;
        }
        .rt-ai-modal-overlay.rt-ai-kb-open .rt-ai-modal-header {
          margin-bottom: 4px !important;
          padding-bottom: 3px !important;
        }
        .rt-ai-modal-overlay.rt-ai-kb-open .rt-ai-transcript {
          display: none !important;
        }
        .rt-ai-modal-overlay.rt-ai-kb-open .rt-ai-response-box {
          margin-bottom: 6px !important;
          padding: 8px 10px !important;
        }
        .rt-ai-modal-overlay.rt-ai-kb-open .rt-ai-memory-bar {
          max-height: 64px !important;
          margin-bottom: 5px !important;
          padding: 4px 6px !important;
        }
        .rt-ai-modal-overlay.rt-ai-kb-open .rt-ai-mic-btn {
          width: 44px !important;
          height: 44px !important;
          font-size: 20px !important;
        }
        .rt-ai-modal-header {
          margin-bottom: 4px !important;
          padding-bottom: 4px !important;
          min-height: 0 !important;
          flex-shrink: 0 !important;
          touch-action: none !important;
        }
        .rt-ai-modal-header h3 {
          font-size: 1.05rem !important;
          margin: 0 !important;
          line-height: 1.1 !important;
        }
        .rt-ai-modal-subtitle {
          display: none !important;
        }
        .rt-ai-reset-header-btn,
        .rt-ai-info-btn,
        .rt-ai-tts-btn {
          padding: 4px !important;
          font-size: 16px !important;
        }
        .rt-ai-close-btn {
          padding: 0 4px !important;
          font-size: 22px !important;
          line-height: 1 !important;
        }
        .rt-ai-examples-btn {
          padding: 3px 8px !important;
          font-size: 0.76rem !important;
        }
        .rt-ai-transcript {
          font-size: 0.8rem !important;
          min-height: 0 !important;
          margin-bottom: 4px !important;
          flex-shrink: 0 !important;
          touch-action: none !important;
        }
        .rt-ai-response-box {
          flex: 1 1 auto !important;
          min-height: 40px !important;
          max-height: none !important;
          overflow-y: auto !important;
          -webkit-overflow-scrolling: touch !important;
          overscroll-behavior: contain !important;
          touch-action: pan-y !important;
          padding: 10px 10px !important;
          font-size: 0.95rem !important;
          line-height: 1.5 !important;
          margin-bottom: 8px !important;
          border-radius: 8px !important;
        }
        .rt-ai-response-box strong,
        .rt-ai-response-box b {
          color: #F5DF4D !important;
          font-size: 1.15em !important;
          font-weight: 800 !important;
        }
        .rt-ai-chips-row {
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          gap: 6px !important;
          margin-top: 10px !important;
        }
        .rt-ai-chip-btn {
          padding: 6px 8px !important;
          font-size: 0.78rem !important;
          min-height: 34px !important;
          border-radius: 9px !important;
        }
        .rt-ai-memory-bar {
          padding: 6px !important;
          margin-bottom: 6px !important;
          max-height: 172px !important;
          border-radius: 8px !important;
        }
        .rt-ai-context-container {
          gap: 5px !important;
        }
        .rt-ai-memory-items {
          grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
          gap: 5px !important;
        }
        .rt-ai-param-badge {
          padding: 4px 7px !important;
          font-size: 0.78rem !important;
          border-radius: 9px !important;
          min-height: 32px !important;
          gap: 4px !important;
        }
        .rt-ai-badge-del {
          font-size: 1.15rem !important;
          min-width: 20px !important;
          min-height: 26px !important;
          padding: 2px 3px !important;
        }
        .rt-ai-memory-controls {
          gap: 5px !important;
        }
        .rt-ai-clear-mem-btn {
          padding: 4px 9px !important;
          font-size: 0.78rem !important;
          border-radius: 9px !important;
          min-width: 34px !important;
          min-height: 32px !important;
          height: 32px !important;
        }
        .rt-ai-clear-text {
          display: none !important;
        }
        .rt-ai-bron-pill,
        .rt-ai-norm-pill {
          padding: 2px 8px !important;
          font-size: 0.78rem !important;
          border-radius: 9px !important;
          min-height: 32px !important;
          height: 32px !important;
          margin: 0 !important;
          max-width: none !important;
        }
        .rt-ai-bron-pill i,
        .rt-ai-norm-pill i {
          font-size: 0.74rem !important;
          margin-right: 4px !important;
          flex-shrink: 0 !important;
        }
        .rt-ai-bron-select,
        .rt-ai-norm-select {
          font-size: 0.78rem !important;
          max-width: none !important;
          padding: 0 2px 0 0 !important;
          margin: 0 !important;
          height: 28px !important;
          min-height: 0 !important;
          line-height: 1.2 !important;
        }
        .rt-ai-input-bar {
          gap: 6px !important;
          width: 100% !important;
          touch-action: none !important;
          flex-shrink: 0 !important;
        }
        .rt-ai-mic-btn {
          width: 54px !important;
          height: 54px !important;
          font-size: 24px !important;
          flex-shrink: 0 !important;
        }
        .rt-ai-text-input {
          padding: 8px 12px !important;
          font-size: 0.98rem !important;
          line-height: 1.3 !important;
          min-height: 40px !important;
          max-height: 96px !important;
          flex: 1 1 0 !important;
          width: 0 !important;
          min-width: 0 !important;
          border-radius: 20px !important;
        }
        .rt-ai-send-btn {
          width: 40px !important;
          height: 40px !important;
          padding: 0 !important;
          font-size: 1.05rem !important;
          border-radius: 50% !important;
          flex-shrink: 0 !important;
        }
        .rt-ai-info-panel {
          border-radius: 0 !important;
          border: none !important;
          border-top: 4px solid #F5DF4D !important;
          padding: 14px 14px !important;
          padding-top: max(12px, env(safe-area-inset-top)) !important;
          padding-bottom: max(14px, env(safe-area-inset-bottom)) !important;
        }
      }
      .rt-ai-img-lightbox {
        position: fixed;
        inset: 0;
        z-index: 100005;
        background: rgba(10, 12, 16, 0.96);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: space-between;
        padding: max(10px, env(safe-area-inset-top)) 12px max(12px, env(safe-area-inset-bottom)) 12px;
        box-sizing: border-box;
        user-select: none;
        -webkit-user-select: none;
        touch-action: none;
      }
      .rt-ai-img-lightbox-bar {
        width: 100%;
        max-width: 900px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        color: #fff;
        font-family: 'Roboto Condensed', sans-serif;
      }
      .rt-ai-img-lightbox-title {
        font-size: 0.95rem;
        font-weight: 700;
        color: #F5DF4D;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .rt-ai-img-lightbox-controls {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-shrink: 0;
      }
      .rt-ai-img-zoom-btn {
        background: #2b2f3a;
        color: #fff;
        border: 1px solid rgba(255, 255, 255, 0.25);
        border-radius: 8px;
        padding: 6px 11px;
        font-size: 0.95rem;
        font-weight: 700;
        cursor: pointer;
        font-family: 'Roboto Condensed', sans-serif;
      }
      .rt-ai-img-zoom-btn:active {
        background: #F5DF4D;
        color: #000;
      }
      .rt-ai-img-stage {
        position: relative;
        flex: 1 1 auto;
        width: 100%;
        max-width: 960px;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        margin: 8px 0;
        touch-action: none;
      }
      .rt-ai-img-stage img {
        max-width: 100%;
        max-height: 100%;
        object-fit: contain;
        background: #fff;
        border-radius: 8px;
        padding: 6px;
        box-sizing: border-box;
        transform-origin: center center;
        transition: transform 0.08s ease-out;
        touch-action: none;
        -webkit-user-drag: none;
      }
      .rt-ai-img-loupe {
        position: fixed;
        width: 156px;
        height: 156px;
        border-radius: 50%;
        border: 3px solid #F5DF4D;
        box-shadow: 0 8px 28px rgba(0, 0, 0, 0.75), inset 0 0 0 1px rgba(0, 0, 0, 0.4);
        background-color: #fff;
        background-repeat: no-repeat;
        pointer-events: none;
        display: none;
        z-index: 100010;
      }
      .rt-ai-img-loupe::after {
        content: "";
        position: absolute;
        left: 50%;
        top: 50%;
        width: 8px;
        height: 8px;
        margin: -4px 0 0 -4px;
        border-radius: 50%;
        border: 1.5px solid rgba(255, 60, 60, 0.85);
        box-sizing: border-box;
      }
      .rt-ai-img-lightbox-hint {
        font-size: 0.82rem;
        color: #ccc;
        text-align: center;
        font-family: 'Roboto Condensed', sans-serif;
      }
    `;
    document.head.appendChild(style);
  }

  function maakAssistantUI() {
    if (document.getElementById("rt-global-assistant-container")) return;
    injectStyles();

    // Maak Modal HTML
    const overlay = document.createElement("div");
    overlay.id = "rt-global-assistant-container";
    overlay.className = "rt-ai-modal-overlay";
    overlay.innerHTML = `
      <div class="rt-ai-modal">
        <div class="rt-ai-modal-header">
          <div class="rt-ai-modal-title-group">
            <h3><i class="fas fa-robot"></i> R.A.D.I</h3>
            <small class="rt-ai-modal-subtitle">(Radiografie Assistent Deterministische Inferentie)</small>
          </div>
          <div style="display:flex; align-items:center; gap:6px;">
            <button type="button" class="rt-ai-copy-header-btn" id="rt-ai-copy-chat" onclick="window.RtAssistant && window.RtAssistant.kopieerGesprek();" title="Kopieer het gehele gesprek" aria-label="Gesprek kopiëren" style="background:none; border:none; color:#888; font-size:17px; cursor:pointer; padding:5px; display:flex; align-items:center; justify-content:center; transition:color 0.2s;" onmouseover="this.style.color='#F5DF4D'" onmouseout="this.style.color='#888'">
              <i class="fas fa-copy"></i>
            </button>
            <button type="button" class="rt-ai-bug-header-btn" id="rt-ai-report-bug" onclick="window.RtAssistant && window.RtAssistant.meldFoutViaMail();" title="Meld fout via e-mail (vult gesprek automatisch in)" aria-label="Meld fout" style="background:none; border:none; color:#888; font-size:17px; cursor:pointer; padding:5px; display:flex; align-items:center; justify-content:center; transition:color 0.2s;" onmouseover="this.style.color='#ffb74d'" onmouseout="this.style.color='#888'">
              <i class="fas fa-bug"></i>
            </button>
            <button type="button" class="rt-ai-reset-header-btn" id="rt-ai-reset-header" onclick="window.RtAssistant && window.RtAssistant.resetGespreksGeheugen();" title="Wis gespreksgeheugen (schone lei)" aria-label="Geheugen wissen" style="background:none; border:none; color:#888; font-size:17px; cursor:pointer; padding:5px; display:flex; align-items:center; justify-content:center; transition:color 0.2s;" onmouseover="this.style.color='#ff6b6b'" onmouseout="this.style.color='#888'">
              <i class="fas fa-trash-alt"></i>
            </button>
            <button type="button" class="rt-ai-examples-btn" id="rt-ai-examples-toggle" title="Bekijk alle mogelijke vragen &amp; voorbeelden (zoeken &amp; filteren)" aria-label="Voorbeeldvragen">
              <i class="fas fa-list-ul"></i><span>Voorbeelden</span>
            </button>
            <button type="button" class="rt-ai-info-btn" id="rt-ai-info-toggle" title="Over R.A.D.I. &amp; Disclaimer" aria-label="Informatie" style="background:none; border:none; color:#888; font-size:19px; cursor:pointer; padding:6px; display:flex; align-items:center; justify-content:center; transition:color 0.2s;">
              <i class="fas fa-info-circle"></i>
            </button>
            <button type="button" class="rt-ai-tts-btn" id="rt-ai-tts-toggle" title="Spraakweergave (TTS) aan/uit" style="background:none; border:none; color:#888; font-size:20px; cursor:pointer; padding:6px; display:flex; align-items:center; justify-content:center; transition:color 0.2s;">
              <i class="fas fa-volume-mute"></i>
            </button>
            <button type="button" class="rt-ai-close-btn" id="rt-ai-close" title="Sluiten">&times;</button>
          </div>
        </div>
        <div class="rt-ai-transcript" id="rt-ai-transcript">
          Houd 🎙️ ingedrukt om in te spreken (PTT), of typ je vraag...
        </div>
        <div class="rt-ai-response-box" id="rt-ai-response">
          ${genereerStartSchermHtml()}
        </div>
        <div id="rt-ai-memory-bar" class="rt-ai-memory-bar">
          ${geefGeheugenBadgesHtml()}
        </div>
        <form id="rt-ai-form" class="rt-ai-input-bar" onsubmit="event.preventDefault(); window.RtAssistant.verstuurTekst();">
          <textarea id="rt-ai-input" class="rt-ai-text-input" rows="1" placeholder="Typ je vraag..." autocomplete="off"></textarea>
          <button type="submit" class="rt-ai-send-btn" title="Vraag versturen"><i class="fas fa-paper-plane"></i></button>
          <button type="button" class="rt-ai-mic-btn" id="rt-ai-mic-toggle" title="Houd ingedrukt om in te spreken (Push-to-Talk)">
            <i class="fas fa-microphone"></i>
            <span class="ai-badge">PTT</span>
          </button>
        </form>
        <div id="rt-ai-info-panel" class="rt-ai-info-panel" style="display:none;">
          <div class="rt-ai-info-header">
            <h4><i class="fas fa-info-circle" style="color:#F5DF4D; margin-right:8px;"></i> Over R.A.D.I. &amp; Disclaimer</h4>
            <button type="button" class="rt-ai-info-close" id="rt-ai-info-close" title="Sluiten">&times;</button>
          </div>
          <div class="rt-ai-info-body">
            <p><strong>R.A.D.I.</strong> (<em>Radiografie Assistent Deterministische Inferentie</em>) is een offline rekenassistent voor radiografisch onderzoek en lasonderzoek binnen RT-Tools.</p>
            
            <h5 style="color:#F5DF4D; margin:14px 0 6px 0; font-size:1.02rem;"><i class="fas fa-cogs"></i> Hoe werkt het?</h5>
            <p>Typ je vraag in het invoerveld of houd de microfoonknop 🎙️ ingedrukt om in te spreken (Push-to-Talk). R.A.D.I. herkent technische parameters en voert direct de berekening uit conform de geldende normen en RT-Tools modules:</p>
            <ul style="margin:4px 0 10px 18px; padding:0; line-height:1.55; font-size:0.92rem;">
              <li><strong>Minimale FFD &amp; bundelbreedte:</strong> Kwadratische geometrie, Balteau Ceram en focusberekening.</li>
              <li><strong>Focusverandering &amp; kwadratenwet:</strong> Tijdscorrectie bij afstand- en filmveranderingen.</li>
              <li><strong>Bronkeuze &amp; wanddikte (W<sub>max</sub>):</strong> Conform Tabel 1 en procedure RT21021 / RT21022.</li>
              <li><strong>Draadjes (IQI):</strong> Bepaling volgens EN ISO 19232-1 &amp; ASME Sec. V.</li>
              <li><strong>Opnames &amp; geometrie:</strong> Aantal opnames (DWSI, DWDI, ellips) en afzetting.</li>
              <li><strong>Lasfout acceptatie:</strong> Criteria voor 14 fouttypes volgens EN Level 1, 2, 3 en ASME.</li>
            </ul>

            <h5 style="color:#ffb74d; margin:14px 0 6px 0; font-size:1.02rem;"><i class="fas fa-triangle-exclamation"></i> Eigen risico &amp; Disclaimer</h5>
            <p style="font-size:0.92rem; line-height:1.45;">
              Het gebruik van deze applicatie is geheel op <strong>eigen risico</strong>. Ondanks dat alle formules en tabellen met grote zorgvuldigheid zijn geïmplementeerd en gecontroleerd, kunnen er onverhoopt nog fouten of onvolkomenheden in staan. De radiograaf / lasonderzoeker blijft te allen tijde zelf verantwoordelijk voor de definitieve controle conform de geldende procedures, projecteisen en normen.
            </p>

            <h5 style="color:#F5DF4D; margin:14px 0 6px 0; font-size:1.02rem;"><i class="fas fa-envelope"></i> Fout gevonden of suggesties?</h5>
            <p style="font-size:0.92rem; line-height:1.45;">
              Ontdek je een afwijking, rekenfout of heb je een verbetersuggestie? Dat wordt enorm gewaardeerd! Stuur gerust een e-mail naar:<br>
              <a href="mailto:vincepall@gmail.com?subject=R.A.D.I.%20Feedback" style="display:inline-flex; align-items:center; gap:6px; margin-top:6px; color:#F5DF4D; text-decoration:underline; font-weight:bold; font-size:0.96rem;">
                <i class="fas fa-paper-plane"></i> vincepall@gmail.com
              </a>
            </p>
          </div>
          <button type="button" id="rt-ai-info-ok" class="rt-ai-info-ok-btn">Begrepen</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    assistantModal = overlay;

    toggleInfoPanel = function(force) {
      const panel = document.getElementById("rt-ai-info-panel");
      const infoBtn = document.getElementById("rt-ai-info-toggle");
      if (!panel) return;
      const isVisible = panel.style.display === "flex";
      const willShow = typeof force === "boolean" ? force : !isVisible;
      panel.style.display = willShow ? "flex" : "none";
      if (infoBtn) {
        infoBtn.style.color = willShow ? "#F5DF4D" : "#888";
      }
    };

    const infoToggle = document.getElementById("rt-ai-info-toggle");
    if (infoToggle) {
      infoToggle.addEventListener("click", () => {
        toggleInfoPanel();
      });
    }

    const examplesToggle = document.getElementById("rt-ai-examples-toggle");
    if (examplesToggle) {
      examplesToggle.addEventListener("click", () => {
        toggleInfoPanel(false);
        toggleVoorbeeldVragen();
      });
    }

    const infoClose = document.getElementById("rt-ai-info-close");
    if (infoClose) {
      infoClose.addEventListener("click", () => {
        toggleInfoPanel(false);
      });
    }

    const infoOk = document.getElementById("rt-ai-info-ok");
    if (infoOk) {
      infoOk.addEventListener("click", () => {
        toggleInfoPanel(false);
      });
    }

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && assistantModal && assistantModal.style.display !== "none") {
        const panel = document.getElementById("rt-ai-info-panel");
        if (panel && panel.style.display === "flex") {
          toggleInfoPanel(false);
          e.preventDefault();
          return;
        }
        sluitAssistant();
      }
    });

    document.getElementById("rt-ai-close").addEventListener("click", () => {
      sluitAssistant();
    });

    const ttsToggle = document.getElementById("rt-ai-tts-toggle");
    if (ttsToggle) {
      ttsToggle.addEventListener("click", () => {
        toggleTts();
      });
      updateTtsButtonUi();
    }

    const micToggle = document.getElementById("rt-ai-mic-toggle");
    if (micToggle) {
      micToggle.addEventListener("touchstart", onPushToTalkStart, { passive: false });
      micToggle.addEventListener("touchend", onPushToTalkEnd, { passive: false });
      micToggle.addEventListener("touchcancel", onPushToTalkEnd, { passive: false });
      micToggle.addEventListener("touchmove", (e) => {
        if (e.cancelable) e.preventDefault();
      }, { passive: false });
      micToggle.addEventListener("mousedown", onPushToTalkStart);
      micToggle.addEventListener("mouseup", onPushToTalkEnd);
      micToggle.addEventListener("mouseleave", () => {
        if (isPushing) onPushToTalkEnd();
      });
      micToggle.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        return false;
      });
      micToggle.addEventListener("click", (e) => {
        e.preventDefault();
      });
    }

    window.addEventListener("mouseup", () => {
      if (isPushing) onPushToTalkEnd();
    });
    window.addEventListener("touchend", (e) => {
      if (isPushing && (!e.touches || e.touches.length === 0)) {
        onPushToTalkEnd(e);
      }
    });

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) sluitAssistant();
    });

    // Voorkom achtergrond scrollen op mobiel bij vegen buiten de response/memory/input box
    overlay.addEventListener("touchmove", (e) => {
      const target = e.target;
      const isInsideScrollable = target && target.closest && (target.closest(".rt-ai-response-box") || target.closest(".rt-ai-memory-bar") || target.closest(".rt-ai-text-input"));
      if (!isInsideScrollable) {
        if (e.cancelable) e.preventDefault();
      }
    }, { passive: false });

    const txtInp = document.getElementById("rt-ai-input");
    if (txtInp) {
      const autoResizeInput = () => {
        txtInp.style.height = "auto";
        txtInp.style.height = `${Math.min(txtInp.scrollHeight, 112)}px`;
      };
      txtInp.addEventListener("input", autoResizeInput);
      txtInp.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          verstuurTekst();
        }
      });
    }

    overlay.addEventListener("focusin", (e) => {
      if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") && typeof window !== "undefined" && window.innerWidth <= 768) {
        window.scrollTo(0, 0);
        updateMobileViewport();
        setTimeout(updateMobileViewport, 60);
        setTimeout(updateMobileViewport, 180);
        setTimeout(updateMobileViewport, 350);
        setTimeout(updateMobileViewport, 550);
      }
    });
    overlay.addEventListener("focusout", (e) => {
      if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") && typeof window !== "undefined" && window.innerWidth <= 768) {
        setTimeout(updateMobileViewport, 60);
        setTimeout(updateMobileViewport, 250);
        setTimeout(updateMobileViewport, 450);
      }
    });
  }

