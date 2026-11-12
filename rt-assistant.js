/**
 * RT Assistant - Universele NDO & RT Assistent voor rt-tools
 * Draait 100% lokaal in de browser (0 MB download, geen API-sleutels, 0 latency).
 * Ondersteunt:
 *  - Standaard RT werk (EN ISO 17636-1, ASME Sec V, draadjes, opnames, FFD, verzet, kV)
 *  - Onstream RT (RT21021 / RT21022: Wmax, bronkeuze, minimale FFD tangentiaal & dubbelwand)
 *  - Stralingsveiligheid & Afzetting gamma (Se-75 / Ir-192 afstanden, collimator, Pb/Fe afscherming)
 *  - Filmkwaliteit (D4 / D5 / D7 keuzes volgens EN-B, EN-A, ASME, Sabic, Sitech, Haffmans)
 *  - Stralingstijden en bronverval uit bronnen.csv
 */

(function (global) {
  "use strict";

  // --- Standaard Bronnen Data ---
  const STANDAARD_BRONNEN_CSV = `Bron,type,Activiteit,datum,brongrootte
35598P,Ir192,67.9,25-09-2026,2.879
35041P,Ir192,56.4,31-07-2026,2.358
97969M,Se75,84.50,21-04-2026,3.524
RR3508,Se75,94.73,24-02-2026,3
RR4083,Se75,72.69,08-09-2026,3
RR3999,Se75,70.54,03-09-2026,3`;

  let bronnenData = [];

  function berekenHuidigeActiviteit(ci1, type, datum, refDatum = new Date()) {
    const parts = datum.split("-");
    const dObj = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
    const days = (refDatum - dObj) / (1000 * 3600 * 24);
    let ci2 = 0;
    if (type === "Se75" || type === "Se-75") {
      ci2 = ci1 / Math.pow(2, days / 120);
    } else if (type === "Ir192" || type === "Ir-192") {
      ci2 = ci1 / Math.pow(2, days / 74);
    } else if (type === "Co60" || type === "Co-60") {
      ci2 = ci1 / Math.pow(2, days / 1925);
    }
    return Math.max(0, ci2);
  }

  function bouwBronnenData(csvText) {
    const lines = (csvText || "").trim().split("\n");
    const today = new Date();
    const result = [];
    lines.forEach((line) => {
      const cols = line.split(",").map((c) => c.trim());
      if (cols.length >= 5 && cols[0] && cols[1] && cols[0].toLowerCase() !== "bron") {
        const initAct = parseFloat(cols[2].replace(",", "."));
        const size = parseFloat(cols[4].replace(",", "."));
        if (!isNaN(initAct) && !isNaN(size)) {
          const act = berekenHuidigeActiviteit(initAct, cols[1], cols[3], today);
          const typeLabel = cols[1] === "Ir192" ? "Ir-192" : cols[1] === "Se75" ? "Se-75" : cols[1];
          result.push({
            name: cols[0],
            type: cols[1],
            typeLabel: typeLabel,
            initialActivity: initAct,
            date: cols[3],
            size: size,
            label: `${cols[0]} (${typeLabel}, ${size} mm) [${act.toFixed(1)} Ci]`,
          });
        }
      }
    });
    return result;
  }

  // Laadt actuele bronnen.csv dynamisch met cache-busting
  async function laadBronnenCsv(force = true) {
    if (typeof fetch !== "function") return bronnenData;
    try {
      const url = force ? `bronnen.csv?t=${Date.now()}` : "bronnen.csv";
      const r = await fetch(url, { cache: "no-store" });
      if (r.ok) {
        const txt = await r.text();
        if (txt && txt.trim()) {
          bronnenData = bouwBronnenData(txt);
        }
      }
    } catch (e) {
      // Netwerk of file:// protocol fallback
    }
    return bronnenData;
  }

  // Dynamische suggesties voor brongroottes rechtstreeks uit bronnen.csv
  function geefBrongrootteSuggestieChips(bronHint = "") {
    const hint = (bronHint || "").toLowerCase();
    const isSe = hint.includes("se") || hint.includes("sel");
    const isIr = hint.includes("ir");
    const chips = [];

    if (Array.isArray(bronnenData) && bronnenData.length > 0) {
      let filtered = bronnenData;
      if (isSe) filtered = bronnenData.filter((b) => b.type === "Se75");
      else if (isIr) filtered = bronnenData.filter((b) => b.type === "Ir192");

      filtered.forEach((b) => {
        const typeStr = b.type === "Ir192" ? "Ir-192" : "Se-75";
        chips.push(`${b.name} (${typeStr}, ${b.size} mm)`);
      });
    }

    if (!isSe && !isIr) {
      chips.push("Röntgen Smart (1 mm)", "Balteau (2.5 mm)");
    }
    return chips;
  }

  bronnenData = bouwBronnenData(STANDAARD_BRONNEN_CSV);
  laadBronnenCsv(false);

  // --- Materiaal Database (89 soorten conform stralingstijd.html en materiaalfactor.csv) ---
  const STANDAARD_MATERIAAL_CSV = `materiaal,werkstoff,groep,factor_150kv,factor_200kv,factor_250kv,factor_300kv,dichtheid_g_cm3,opmerking,factor_se75,factor_ir192
Hastelloy C-276,2.4819 / UNS N10276,Hastelloy,8.26,3.79,2.65,2.17,8.89,Ni-Mo16-Cr16-W4-Fe5,3.40,1.79
Hastelloy C-22,2.4602 / UNS N06022,Hastelloy,5.39,2.91,2.19,1.87,8.69,Ni-Cr22-Mo13-W3-Fe3,2.67,1.62
Hastelloy C-4,2.4610 / UNS N06455,Hastelloy,3.22,2.12,1.75,1.57,8.64,Ni-Mo16-Cr16,1.99,1.43
Hastelloy C-2000,2.4675 / UNS N06200,Hastelloy,3.05,2.05,1.71,1.54,8.5,Ni-Cr23-Mo16-Cu1.6,1.93,1.40
Hastelloy B-2,2.4617 / UNS N10665,Hastelloy,6.86,3.4,2.47,2.07,9.22,Ni-Mo28-Fe2,3.08,1.75
Hastelloy B-3,2.4600 / UNS N10675,Hastelloy,9.06,3.98,2.75,2.23,9.22,Ni-Mo28.5-Cr1.5-W1.5,3.56,1.82
Hastelloy X,2.4665 / UNS N06002,Hastelloy,2.08,1.59,1.4,1.31,8.22,Ni-Cr22-Fe18-Mo9,1.53,1.24
Hastelloy G-30,2.4603 / UNS N06030,Hastelloy,2.78,1.92,1.61,1.46,8.22,Ni-Cr30-Fe15-Mo5.5-W2.5,1.81,1.34
Hastelloy G-35,2.4643 / UNS N06035,Hastelloy,1.82,1.47,1.33,1.26,8.18,Ni-Cr33-Mo8,1.42,1.20
Hastelloy N,2.4607 / UNS N10003,Hastelloy,3.51,2.24,1.82,1.62,8.86,Ni-Mo16-Cr7-Fe4,2.10,1.46
Hastelloy W,2.4612 / UNS N10004,Hastelloy,5.06,2.8,2.13,1.83,9.03,Ni-Mo24-Cr5-Fe5,2.57,1.59
Inconel 625 (Alloy 625),2.4856 / UNS N06625,Inconel,2.5,1.8,1.55,1.42,8.44,Ni-Cr21.5-Mo9-Nb3.6,1.72,1.32
Inconel 718 (Alloy 718),2.4668 / UNS N07718,Inconel,1.79,1.45,1.32,1.24,8.19,Ni-Cr19-Fe18-Nb5-Mo3,1.41,1.18
Inconel 600 (Alloy 600),2.4816 / UNS N06600,Inconel,1.47,1.29,1.22,1.18,8.47,Ni-Cr16-Fe8,1.27,1.15
Inconel 601 (Alloy 601),2.4851 / UNS N06601,Inconel,1.24,1.16,1.12,1.1,8.11,Ni-Cr23-Fe14-Al1.4,1.15,1.08
Inconel 617 (Alloy 617),2.4663 / UNS N06617,Inconel,2.04,1.59,1.41,1.32,8.36,Ni-Cr22-Co12.5-Mo9,1.53,1.25
Inconel 686 (Alloy 686),2.4606 / UNS N06686,Inconel,7.12,3.43,2.45,2.03,8.73,Ni-Cr21-Mo16-W4,3.10,1.70
Inconel 690 (Alloy 690),2.4642 / UNS N06690,Inconel,1.26,1.17,1.12,1.1,8.19,Ni-Cr29-Fe10,1.15,1.08
Inconel X-750,2.4669 / UNS N07750,Inconel,1.53,1.33,1.25,1.2,8.28,Ni-Cr15.5-Fe7-Ti2.5,1.30,1.16
Inconel 725 (Alloy 725),UNS N07725,Inconel,2.17,1.64,1.44,1.34,8.31,Ni-Cr21-Mo8-Nb3.5-Ti1.5,1.57,1.26
Incoloy 800 / 800H (Alloy 800),1.4876 / UNS N08800/N08810,Incoloy,1.11,1.07,1.06,1.05,7.94,Fe-Ni32-Cr21,1.07,1.04
Incoloy 825 (Alloy 825),2.4858 / UNS N08825,Incoloy,1.39,1.24,1.18,1.14,8.14,Ni-Fe30-Cr21.5-Mo3-Cu2,1.22,1.11
Incoloy 925 (Alloy 925),UNS N09925,Incoloy,1.39,1.24,1.18,1.14,8.08,Ni-Fe28-Cr21-Mo3-Cu2-Ti2,1.22,1.11
Incoloy A-286,1.4980 / UNS S66286,Incoloy,1.13,1.08,1.06,1.05,7.92,Fe-Ni26-Cr15-Ti2-Mo1.3,1.07,1.04
Incoloy 803,UNS S35045,Incoloy,1.1,1.07,1.06,1.05,7.97,Fe-Ni35-Cr27,1.07,1.04
Monel 400 (Alloy 400),2.4360 / UNS N04400,Monel,2.18,1.69,1.5,1.4,8.8,Ni67-Cu31,1.63,1.32
Monel K-500 (Alloy K-500),2.4375 / UNS N05500,Monel,1.8,1.48,1.35,1.28,8.44,Ni65-Cu30-Al3,1.44,1.22
Stellite 6 (CoCr-A),2.4994 / CoCr-A,Kobaltbasis,3.4,2.18,1.77,1.57,8.44,Co60-Cr28-W4.5,2.04,1.41
Stellite 21 (CoCr-E),CoCr-E,Kobaltbasis,1.46,1.28,1.2,1.16,8.33,Co62-Cr27-Mo5.5,1.25,1.13
Stellite 12 (CoCr-B),CoCr-B,Kobaltbasis,3.8,2.4,1.9,1.6,8.53,Co55-Cr29-W8.5,2.23,1.36
Haynes 25 (Alloy L-605),2.4964 / UNS R30605,Kobaltbasis,3.2,2.4,2.0,1.7,9.13,Co50-Cr20-W15-Ni10,2.26,1.46
Haynes 188,2.4683 / UNS R30188,Kobaltbasis,3.0,2.3,1.9,1.6,8.98,Co39-Ni22-Cr22-W14,2.16,1.36
MP35N,2.4999 / UNS R30035,Kobaltbasis,2.13,1.63,1.44,1.34,8.43,Co35-Ni35-Cr20-Mo10,1.57,1.26
Titanium Grade 1 & 2 (CP Ti),3.7035 / UNS R50400,Titanium,0.54,0.71,0.78,0.9,4.51,Zuiver Ti,0.71,0.90
Titanium Grade 5 (Ti-6Al-4V),3.7164 / UNS R56400,Titanium,0.54,0.71,0.78,0.9,4.43,Ti-6Al-4V,0.71,0.90
Titanium Grade 7 (Ti-Pd),3.7235 / UNS R52400,Titanium,0.54,0.71,0.78,0.9,4.51,Ti-0.15Pd,0.71,0.90
Titanium Grade 9 (Ti-3Al-2.5V),3.7194 / UNS R56320,Titanium,0.54,0.71,0.78,0.9,4.48,Ti-3Al-2.5V,0.71,0.90
Titanium Grade 12 (Ti-Mo-Ni),3.7105 / UNS R53400,Titanium,0.54,0.71,0.78,0.9,4.51,Ti-0.8Ni-0.3Mo,0.71,0.90
Koolstofstaal (Referentie),1.0460 / P250GH / C22,RVS & Duplex,1.0,1.0,1.0,1.0,7.85,Staal Referentie = 1.00,1.00,1.00
RVS 304 / 304L,1.4301 / 1.4307 / 304L,RVS & Duplex,0.99,1.0,1.0,1.0,7.93,CrNi 18/8,1.00,1.00
RVS 316 / 316L,1.4401 / 1.4404 / 316L,RVS & Duplex,1.14,1.09,1.07,1.06,8.0,CrNiMo 17/12/2,1.08,1.05
RVS 316Ti,1.4571 / AISI 316Ti,RVS & Duplex,1.11,1.07,1.05,1.04,8.0,Ti-gestabiliseerd 316,1.06,1.03
RVS 321,1.4541 / AISI 321,RVS & Duplex,0.96,0.98,0.98,0.98,7.92,Ti-gestabiliseerd 304,0.98,0.98
RVS 347,1.4550 / AISI 347,RVS & Duplex,1.03,1.02,1.01,1.01,7.96,Nb-gestabiliseerd 304,1.02,1.01
RVS 310S,1.4845 / AISI 310S,RVS & Duplex,0.98,0.99,0.99,0.99,7.9,Hittebestendig 25/20,0.99,0.99
RVS 309S,1.4828 / AISI 309S,RVS & Duplex,0.94,0.96,0.97,0.98,7.9,Hittebestendig 23/12,0.96,0.99
Duplex 2205,1.4462 / UNS S32205,RVS & Duplex,1.08,1.04,1.03,1.02,7.82,22Cr-5Ni-3Mo,1.04,1.01
Lean Duplex 2101,1.4162 / UNS S32101,RVS & Duplex,0.88,0.92,0.93,0.94,7.8,21Cr-1.5Ni-5Mn,0.92,0.95
Lean Duplex 2304,1.4362 / UNS S32304,RVS & Duplex,0.92,0.94,0.96,0.96,7.8,23Cr-4.5Ni,0.95,0.96
Super Duplex 2507,1.4410 / UNS S32750,RVS & Duplex,1.14,1.08,1.06,1.05,7.8,25Cr-7Ni-4Mo,1.07,1.04
Super Duplex Zeron 100,1.4501 / UNS S32760,RVS & Duplex,1.32,1.19,1.13,1.1,7.84,25Cr-7Ni-3.7Mo-W-Cu,1.17,1.08
254 SMO (6Mo),1.4547 / UNS S31254,RVS & Duplex,1.38,1.23,1.16,1.13,8.0,20Cr-18Ni-6Mo,1.21,1.11
904L,1.4539 / UNS N08904,RVS & Duplex,1.32,1.19,1.14,1.11,8.05,20Cr-25Ni-4.5Mo-Cu,1.17,1.09
Alloy 20 (Carpenter 20),2.4660 / UNS N08020,RVS & Duplex,1.38,1.23,1.17,1.13,8.05,Ni35-Fe38-Cr20-Cu3.5,1.21,1.10
Sanicro 28 (Alloy 28),1.4563 / UNS N08028,RVS & Duplex,1.18,1.1,1.07,1.05,8.0,31Ni-27Cr-3.5Mo,1.09,1.03
Alloy 31,1.4562 / UNS N08031,RVS & Duplex,1.41,1.24,1.17,1.13,8.05,31Ni-27Cr-6.5Mo,1.22,1.10
253 MA,1.4835 / UNS S30815,RVS & Duplex,0.94,0.96,0.97,0.97,7.8,21Cr-11Ni-Si-Ce,0.96,0.97
17-4 PH (AISI 630),1.4542 / UNS S17400,RVS & Duplex,0.93,0.94,0.95,0.96,7.75,Precipitation Hardening,0.94,0.97
16Mo3 (15Mo3),1.5415 / 16Mo3,Ketelstaal,1.0,1.0,1.0,1.0,7.85,Mo-gelegeerd ketelstaal,1.00,1.00
13CrMo4-5 (P11 / T11),1.7335 / A335 P11,Ketelstaal,1.01,1.0,1.0,1.0,7.85,1Cr-0.5Mo warmvast,1.00,1.00
10CrMo9-10 (P22 / T22),1.7380 / A335 P22,Ketelstaal,1.03,1.02,1.01,1.01,7.85,2.25Cr-1Mo ketelbuis,1.02,1.01
11CrMo9-10,1.7383,Ketelstaal,1.01,1.0,1.0,1.0,7.85,2.5Cr-1Mo ketelstaal,1.00,1.00
14MoV6-3,1.7715,Ketelstaal,1.0,1.0,1.0,1.0,7.85,CrMoV stoomleidingen,1.00,1.00
X10CrMoVNb9-1 (P91 / T91),1.4903 / A335 P91,Ketelstaal,0.97,0.97,0.98,0.98,7.8,9Cr-1Mo-V-Nb martensitisch,0.97,0.98
X10CrWMoVNb9-2 (P92 / T92),1.4901 / A335 P92,Ketelstaal,1.47,1.27,1.19,1.14,7.85,9Cr-0.5Mo-1.8W,1.24,1.10
VM12-SHC (12Cr),1.4915,Ketelstaal,1.36,1.21,1.14,1.11,7.82,12Cr superkritisch,1.19,1.09
Koper Zuiver (Cu-ETP / Cu-DHP),2.0060 / 2.0090 / CW004A,Koper & Brons,2.42,1.79,1.55,1.43,8.94,Roodkoper / Zuiver koper,1.71,1.33
Messing / Geelkoper (CuZn37),2.0321 / CW508L,Koper & Brons,2.21,1.66,1.45,1.34,8.44,Cu-Zn messing,1.59,1.25
Messing (CuZn39Pb3),2.0401 / CW614N,Koper & Brons,5.04,2.8,2.12,1.8,8.47,Verspaanbaar messing,2.57,1.55
Tinbrons (CuSn8),2.1030 / CW453K,Koper & Brons,3.99,2.4,1.9,1.66,8.8,Fosforbrons / Tinbrons,2.23,1.47
Tinbrons (CuSn6),2.1020 / CW452K,Koper & Brons,3.52,2.23,1.8,1.6,8.82,Fosforbrons / CuSn6,2.08,1.44
Roodbrons (Rg7 / CuSn7ZnPb),2.1090 / CC493K,Koper & Brons,8.45,3.82,2.65,2.15,8.8,Lagerbrons / Rg7,3.42,1.75
Aluminiumbrons (CuAl10Fe5Ni5),2.0966 / CW307G,Koper & Brons,1.25,1.13,1.08,1.05,7.6,Corrosievast brons,1.11,1.03
Cupro-nikkel 90/10,2.0872 / CW352H,Koper & Brons,2.36,1.76,1.54,1.42,8.9,Zeewaterbestendig 90/10,1.69,1.32
Cupro-nikkel 70/30,2.0882 / CW354H,Koper & Brons,2.4,1.79,1.56,1.45,8.95,Zeewaterbestendig 70/30,1.71,1.36
Nikkel 200 / 201 (Zuiver Nikkel),2.4066 / UNS N02200,Exotisch & Speciaal,2.19,1.71,1.52,1.42,8.89,Zuiver Ni,1.65,1.34
Zirkonium 702 (Zr 702),UNS R60702,Exotisch & Speciaal,2.8,2.1,1.8,1.5,6.51,Zuiver Zirkonium,2.00,1.26
Zirkonium 705 (Zr 705),UNS R60705,Exotisch & Speciaal,2.8,2.1,1.8,1.5,6.51,Zr-2.5Nb legering,2.00,1.26
Tantaal (Zuiver Ta),2.4560 / UNS R05200,Exotisch & Speciaal,11.0,5.5,4.2,3.5,16.65,Vuurvast chemisch bestendig,5.06,2.94
Niobium (Columbium),UNS R04200,Exotisch & Speciaal,2.5,2.0,1.7,1.5,8.57,Zuiver Niobium,1.90,1.34
Molybdeen (Puur Mo),UNS R03600,Exotisch & Speciaal,3.5,2.5,2.0,1.7,10.22,Vuurvast metaal,2.33,1.46
Wolfraam (Tungsten),W 99.95%,Exotisch & Speciaal,14.0,7.0,5.0,4.0,19.25,Zwaar / hittebestendig metaal,6.32,3.21
Lood (Pb),2.3020 / PB970R,Exotisch & Speciaal,12.0,5.0,4.0,3.2,11.34,Stralingsafscherming,4.66,2.56
Tin (Sn),Sn 99.9%,Exotisch & Speciaal,3.0,2.2,1.8,1.5,7.31,Zuiver tin,2.06,1.26
Zink (Zn),Zn 99.9%,Exotisch & Speciaal,1.4,1.3,1.2,1.1,7.14,Zuiver zink,1.27,1.02
Aluminium Zuiver (1050A),3.0255 / EN AW-1050A,Exotisch & Speciaal,0.12,0.18,0.25,0.30,2.7,Al 99.5%,0.20,0.35
Aluminium AlMg3,3.3535 / EN AW-5754,Exotisch & Speciaal,0.14,0.18,0.25,0.30,2.66,AlMg3 scheepsbouw,0.20,0.35
Aluminium AlMg4.5Mn,3.3547 / EN AW-5083,Exotisch & Speciaal,0.14,0.18,0.25,0.30,2.66,5083 zeewaterbestendig,0.20,0.35
Magnesium Zuiver,AZ31 / Zuiver Mg,Exotisch & Speciaal,0.05,0.08,0.10,0.12,1.74,Ultra lichtgewicht,0.08,0.08`;

  function bouwMaterialenData(csvText) {
    const lines = (csvText || "").trim().split("\n");
    const result = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      const cols = [];
      let inQuotes = false;
      let val = "";
      for (let j = 0; j < line.length; j++) {
        const c = line[j];
        if (c === '"') inQuotes = !inQuotes;
        else if (c === ',' && !inQuotes) {
          cols.push(val.trim());
          val = "";
        } else {
          val += c;
        }
      }
      cols.push(val.trim());
      if (cols.length < 5) continue;
      result.push({
        name: cols[0],
        werkstoff: cols[1] || "",
        groep: cols[2] || "Overig",
        f150: parseFloat((cols[3] || "1").replace(",", ".")) || 1.0,
        f200: parseFloat((cols[4] || "1").replace(",", ".")) || 1.0,
        f250: parseFloat((cols[5] || "1").replace(",", ".")) || 1.0,
        f300: parseFloat((cols[6] || "1").replace(",", ".")) || 1.0,
        density: cols[7] ? parseFloat(cols[7].replace(",", ".")) : null,
        notes: cols[8] || "",
        f_se75: cols[9] ? (parseFloat(cols[9].replace(",", ".")) || 1.0) : 1.0,
        f_ir192: cols[10] ? (parseFloat(cols[10].replace(",", ".")) || 1.0) : 1.0,
      });
    }
    return result;
  }

  const materialenDatabase = bouwMaterialenData(STANDAARD_MATERIAAL_CSV);

  // Synoniemen & Aliases voor veelvoorkomende termen
  const MATERIAAL_ALIASES = [
    { match: /\b(hastelloy\s*c[-\s]?276|c[-\s]?276)\b/i, name: "Hastelloy C-276" },
    { match: /\b(hastelloy\s*c[-\s]?22|c[-\s]?22)\b/i, name: "Hastelloy C-22" },
    { match: /\b(hastelloy\s*c[-\s]?4|c[-\s]?4)\b/i, name: "Hastelloy C-4" },
    { match: /\b(hastelloy\s*b[-\s]?2|b[-\s]?2)\b/i, name: "Hastelloy B-2" },
    { match: /\b(hastelloy|hasteloy|hasseloy|hasseler)\b/i, name: "Hastelloy C-276" },
    { match: /\b(inconel\s*625|alloy\s*625|2\.4856)\b/i, name: "Inconel 625 (Alloy 625)" },
    { match: /\b(inconel\s*718|alloy\s*718|2\.4668)\b/i, name: "Inconel 718 (Alloy 718)" },
    { match: /\b(inconel\s*600|alloy\s*600)\b/i, name: "Inconel 600 (Alloy 600)" },
    { match: /\b(inconel\s*686|alloy\s*686)\b/i, name: "Inconel 686 (Alloy 686)" },
    { match: /\binconel\b/i, name: "Inconel 625 (Alloy 625)" },
    { match: /\b(incoloy\s*825|alloy\s*825)\b/i, name: "Incoloy 825 (Alloy 825)" },
    { match: /\b(incoloy\s*800|alloy\s*800|incoloy)\b/i, name: "Incoloy 800 / 800H (Alloy 800)" },
    { match: /\b(monel\s*k[-\s]?500|k[-\s]?500)\b/i, name: "Monel K-500 (Alloy K-500)" },
    { match: /\b(monel\s*400|monel)\b/i, name: "Monel 400 (Alloy 400)" },
    { match: /\b(stellite\s*6)\b/i, name: "Stellite 6 (CoCr-A)" },
    { match: /\b(stellite\s*21)\b/i, name: "Stellite 21 (CoCr-E)" },
    { match: /\bstellite\b/i, name: "Stellite 6 (CoCr-A)" },
    { match: /\b(titanium\s*grade\s*5|ti[-\s]?6al[-\s]?4v)\b/i, name: "Titanium Grade 5 (Ti-6Al-4V)" },
    { match: /\b(titanium|titaan)\b/i, name: "Titanium Grade 1 & 2 (CP Ti)" },
    { match: /\b(rvs\s*316l?|316l?|1\.4404)\b/i, name: "RVS 316 / 316L" },
    { match: /\b(rvs\s*304l?|304l?|1\.4301)\b/i, name: "RVS 304 / 304L" },
    { match: /\b(rvs|roestvast\s*staal|roestvrij\s*staal)\b/i, name: "RVS 316 / 316L" },
    { match: /\b(super\s*duplex\s*2507|2507)\b/i, name: "Super Duplex 2507" },
    { match: /\b(duplex\s*2205|2205|duplex)\b/i, name: "Duplex 2205" },
    { match: /\b(roodkoper|koper\s*zuiver|koper)\b/i, name: "Koper Zuiver (Cu-ETP / Cu-DHP)" },
    { match: /\b(messing|geelkoper)\b/i, name: "Messing / Geelkoper (CuZn37)" },
    { match: /\b(tinbrons|brons)\b/i, name: "Tinbrons (CuSn8)" },
    { match: /\b(lood|pb)\b/i, name: "Lood (Pb)" },
    { match: /\b(aluminium|alu)\b/i, name: "Aluminium Zuiver (1050A)" },
    { match: /\b(koolstofstaal|staal)\b/i, name: "Koolstofstaal (Referentie)" },
  ];

  function zoekMateriaal(query) {
    if (!query) return null;
    const qRaw = String(query).toLowerCase().trim();
    if (!qRaw) return null;

    // 1. Directe alias check
    for (const a of MATERIAAL_ALIASES) {
      if (a.match.test(qRaw)) {
        const found = materialenDatabase.find((m) => m.name.toLowerCase() === a.name.toLowerCase());
        if (found) return found;
      }
    }

    // 2. Fuzzy / smart search (zoals in stralingstijd.html)
    const qClean = qRaw.replace(/[\s\-\/\.]/g, "");
    const qWords = qRaw.split(/\s+/).filter((w) => w.length > 0);
    const matches = [];

    materialenDatabase.forEach((mat) => {
      const nameLower = mat.name.toLowerCase();
      const werkstoffLower = mat.werkstoff.toLowerCase();
      const groupLower = mat.groep.toLowerCase();
      const notesLower = mat.notes.toLowerCase();
      const fullText = `${nameLower} ${werkstoffLower} ${groupLower} ${notesLower}`;
      const fullClean = fullText.replace(/[\s\-\/\.]/g, "");

      let score = 0;
      const nameClean = nameLower.replace(/[\s\-\/\.]/g, "");
      if (nameClean === qClean) score += 100;
      else if (nameClean.startsWith(qClean)) score += 60;
      else if (nameClean.includes(qClean)) score += 40;
      else if (werkstoffLower.includes(qRaw) || werkstoffLower.replace(/[\s\-\/\.]/g, "").includes(qClean)) score += 35;
      else if (qWords.every((w) => nameLower.includes(w))) score += 30;
      else if (fullClean.includes(qClean) || qWords.every((w) => fullText.includes(w))) {
        if (groupLower.includes(qRaw)) score += 15;
        else score += 10;
      }

      if (score > 0) matches.push({ item: mat, score });
    });

    matches.sort((a, b) => b.score - a.score);
    return matches.length > 0 ? matches[0].item : null;
  }

  function zoekMateriaalInTekst(tekst) {
    if (!tekst) return null;
    const lower = tekst.toLowerCase();
    for (const a of MATERIAAL_ALIASES) {
      if (a.match.test(lower)) {
        if (a.name === "Koolstofstaal (Referentie)") {
          // Alleen matchen als het expliciet over materiaal, omrekening of "op staal" / "koolstofstaal" gaat
          if (!/\b(koolstofstaal|op\s+staal|van\s+staal|materiaal\s*staal|staal\s*materiaal)\b/i.test(lower)) {
            continue;
          }
        }
        if (a.name === "Lood (Pb)") {
          // Lood is in RT stralingsafscherming (pbMm), niet het te onderzoeken werkstuk.
          // Alleen als materiaal matchen als er expliciet naar de materiaalfactor van lood wordt gevraagd.
          if (!/\b(materiaalfactor|stralingsfactor|factor|werkstof|materiaal\s*lood|lood\s*materiaal|lood\s*(?:door)?stralen|lood\s*lassen)\b/i.test(lower)) {
            continue;
          }
        }
        const found = materialenDatabase.find((m) => m.name.toLowerCase() === a.name.toLowerCase());
        if (found) return found;
      }
    }
    for (const m of materialenDatabase) {
      if (m.name.length > 4 && lower.includes(m.name.toLowerCase())) {
        if (m.name === "Koolstofstaal (Referentie)") {
          if (!/\b(koolstofstaal|op\s+staal|van\s+staal)\b/i.test(lower)) continue;
        }
        if (m.name === "Lood (Pb)") {
          if (!/\b(materiaalfactor|stralingsfactor|factor|werkstof|materiaal\s*lood|lood\s*materiaal|lood\s*(?:door)?stralen|lood\s*lassen)\b/i.test(lower)) continue;
        }
        return m;
      }
    }
    return null;
  }

  // --- Duimse & DN maten (ISO 4200 / EN 10220 / ASME B36.10M) ---
  const DUIMSE_MATEN = {
    "0.5": 21.3, "1/2": 21.3, "0.75": 26.9, "3/4": 26.9, "1": 33.4,
    "1.25": 42.4, "1 1/4": 42.4, "1.5": 48.3, "1 1/2": 48.3, "2": 60.3,
    "2.5": 76.1, "2 1/2": 76.1, "3": 88.9, "3.5": 101.6, "3 1/2": 101.6,
    "4": 114.3, "5": 141.3, "6": 168.3, "8": 219.1, "10": 273.0,
    "12": 323.9, "14": 355.6, "16": 406.4, "18": 457.0, "20": 508.0,
    "24": 610.0,
  };

  const DN_MATEN = {
    "10": 17.2,
    "15": 21.3,
    "20": 26.9,
    "25": 33.7,
    "32": 42.4,
    "40": 48.3,
    "50": 60.3,
    "65": 76.1,
    "80": 88.9,
    "90": 101.6,
    "100": 114.3,
    "125": 141.3,
    "150": 168.3,
    "200": 219.1,
    "250": 273.0,
    "300": 323.9,
    "350": 355.6,
    "400": 406.4,
    "450": 457.0,
    "500": 508.0,
    "600": 610.0,
    "700": 711.0,
    "800": 813.0,
    "900": 914.0,
    "1000": 1016.0,
  };

  function converteerDuimIndienNodig(diaWaarde) {
    if (diaWaarde === null || diaWaarde === undefined || isNaN(diaWaarde)) return diaWaarde;
    if (diaWaarde > 0 && diaWaarde < 20) {
      const key = String(diaWaarde);
      if (DUIMSE_MATEN[key] !== undefined) return DUIMSE_MATEN[key];
    }
    return diaWaarde;
  }

  function formatMmNaarDuimLabel(diaMm) {
    if (!diaMm) return "";
    for (const [duimStr, mmVal] of Object.entries(DUIMSE_MATEN)) {
      if (Math.abs(mmVal - diaMm) < 0.6) {
        const dnEntry = Object.entries(DN_MATEN).find(([dn, od]) => Math.abs(od - mmVal) < 2.0);
        const dnSuffix = dnEntry ? ` / DN ${dnEntry[0]}` : "";
        return `${duimStr} duimer${dnSuffix} (${diaMm} mm)`;
      }
    }
    for (const [dnStr, odVal] of Object.entries(DN_MATEN)) {
      if (Math.abs(odVal - diaMm) < 0.6) {
        return `DN ${dnStr} (${diaMm} mm)`;
      }
    }
    return `${diaMm} mm`;
  }

  // --- Pipe Schedules (ASME B36.10M / ASME B36.19M Roestvast Staal) ---
  const ASME_PIPE_SCHEDULES = {
    "1/8": { od: 10.3, dn: 6, wt: { "10": 1.24, "40": 1.73, "STD": 1.73, "80": 2.41, "XS": 2.41 } },
    "1/4": { od: 13.7, dn: 8, wt: { "10": 1.65, "40": 2.24, "STD": 2.24, "80": 3.02, "XS": 3.02 } },
    "3/8": { od: 17.1, dn: 10, wt: { "10": 1.65, "40": 2.31, "STD": 2.31, "80": 3.20, "XS": 3.20 } },
    "1/2": { od: 21.3, dn: 15, wt: { "5": 1.65, "5S": 1.65, "10": 2.11, "10S": 2.11, "40": 2.77, "40S": 2.77, "STD": 2.77, "80": 3.73, "80S": 3.73, "XS": 3.73, "160": 4.78, "XXS": 7.47 } },
    "3/4": { od: 26.9, dn: 20, wt: { "5": 1.65, "5S": 1.65, "10": 2.11, "10S": 2.11, "40": 2.87, "40S": 2.87, "STD": 2.87, "80": 3.91, "80S": 3.91, "XS": 3.91, "160": 5.56, "XXS": 7.82 } },
    "1": { od: 33.4, dn: 25, wt: { "5": 1.65, "5S": 1.65, "10": 2.77, "10S": 2.77, "40": 3.38, "40S": 3.38, "STD": 3.38, "80": 4.55, "80S": 4.55, "XS": 4.55, "160": 6.35, "XXS": 9.09 } },
    "1 1/4": { od: 42.4, dn: 32, wt: { "5": 1.65, "5S": 1.65, "10": 2.77, "10S": 2.77, "40": 3.56, "40S": 3.56, "STD": 3.56, "80": 4.85, "80S": 4.85, "XS": 4.85, "160": 6.35, "XXS": 9.70 } },
    "1 1/2": { od: 48.3, dn: 40, wt: { "5": 1.65, "5S": 1.65, "10": 2.77, "10S": 2.77, "40": 3.68, "40S": 3.68, "STD": 3.68, "80": 5.08, "80S": 5.08, "XS": 5.08, "160": 7.14, "XXS": 10.15 } },
    "2": { od: 60.3, dn: 50, wt: { "5": 1.65, "5S": 1.65, "10": 2.77, "10S": 2.77, "40": 3.91, "40S": 3.91, "STD": 3.91, "80": 5.54, "80S": 5.54, "XS": 5.54, "160": 8.74, "XXS": 11.07 } },
    "2 1/2": { od: 76.1, dn: 65, wt: { "5": 2.11, "5S": 2.11, "10": 3.05, "10S": 3.05, "40": 5.16, "40S": 5.16, "STD": 5.16, "80": 7.01, "80S": 7.01, "XS": 7.01, "160": 9.53, "XXS": 14.02 } },
    "3": { od: 88.9, dn: 80, wt: { "5": 2.11, "5S": 2.11, "10": 3.05, "10S": 3.05, "40": 5.49, "40S": 5.49, "STD": 5.49, "80": 7.62, "80S": 7.62, "XS": 7.62, "160": 11.13, "XXS": 15.24 } },
    "3 1/2": { od: 101.6, dn: 90, wt: { "5": 2.11, "5S": 2.11, "10": 3.05, "10S": 3.05, "40": 5.74, "40S": 5.74, "STD": 5.74, "80": 8.08, "80S": 8.08, "XS": 8.08 } },
    "4": { od: 114.3, dn: 100, wt: { "5": 2.11, "5S": 2.11, "10": 3.05, "10S": 3.05, "40": 6.02, "40S": 6.02, "STD": 6.02, "80": 8.56, "80S": 8.56, "XS": 8.56, "120": 11.13, "160": 13.49, "XXS": 17.12 } },
    "5": { od: 141.3, dn: 125, wt: { "5": 2.77, "5S": 2.77, "10": 3.40, "10S": 3.40, "40": 6.55, "40S": 6.55, "STD": 6.55, "80": 9.53, "80S": 9.53, "XS": 9.53, "120": 12.70, "160": 15.88, "XXS": 19.05 } },
    "6": { od: 168.3, dn: 150, wt: { "5": 2.77, "5S": 2.77, "10": 3.40, "10S": 3.40, "40": 7.11, "40S": 7.11, "STD": 7.11, "80": 10.97, "80S": 10.97, "XS": 10.97, "120": 14.27, "160": 18.26, "XXS": 21.95 } },
    "8": { od: 219.1, dn: 200, wt: { "5": 2.77, "5S": 2.77, "10": 3.76, "10S": 3.76, "20": 6.35, "30": 7.04, "40": 8.18, "40S": 8.18, "STD": 8.18, "60": 10.31, "80": 12.70, "80S": 12.70, "XS": 12.70, "100": 15.09, "120": 18.26, "140": 20.62, "160": 23.01, "XXS": 22.23 } },
    "10": { od: 273.0, dn: 250, wt: { "5": 3.40, "5S": 3.40, "10": 4.19, "10S": 4.19, "20": 6.35, "30": 7.80, "40": 9.27, "40S": 9.27, "STD": 9.27, "60": 12.70, "80": 15.09, "80S": 12.70, "XS": 12.70, "100": 18.26, "120": 21.44, "140": 25.40, "160": 28.58, "XXS": 25.40 } },
    "12": { od: 323.9, dn: 300, wt: { "5": 3.96, "5S": 3.96, "10": 4.57, "10S": 4.57, "20": 6.35, "30": 8.38, "STD": 9.53, "40": 10.31, "40S": 9.53, "60": 14.27, "XS": 12.70, "80": 17.48, "80S": 12.70, "100": 21.44, "120": 25.40, "140": 28.58, "160": 33.32, "XXS": 25.40 } },
    "14": { od: 355.6, dn: 350, wt: { "10": 6.35, "10S": 6.35, "20": 7.92, "30": 9.53, "STD": 9.53, "40": 11.13, "XS": 12.70, "60": 15.09, "80": 19.05, "100": 23.83, "120": 27.79, "140": 31.75, "160": 35.71 } },
    "16": { od: 406.4, dn: 400, wt: { "10": 6.35, "10S": 6.35, "20": 7.92, "30": 9.53, "STD": 9.53, "40": 12.70, "XS": 12.70, "60": 16.66, "80": 21.44, "100": 26.19, "120": 30.96, "140": 36.53, "160": 40.49 } },
    "18": { od: 457.0, dn: 450, wt: { "10": 6.35, "10S": 6.35, "20": 7.92, "30": 11.13, "STD": 9.53, "40": 14.27, "XS": 12.70, "60": 19.05, "80": 23.83, "100": 29.36, "120": 34.93, "140": 39.67, "160": 45.24 } },
    "20": { od: 508.0, dn: 500, wt: { "10": 6.35, "10S": 6.35, "20": 9.53, "30": 12.70, "STD": 9.53, "40": 15.09, "XS": 12.70, "60": 20.62, "80": 26.19, "100": 32.54, "120": 38.10, "140": 44.45, "160": 50.01 } },
    "24": { od: 610.0, dn: 600, wt: { "10": 6.35, "10S": 6.35, "20": 9.53, "30": 14.27, "STD": 9.53, "40": 17.48, "XS": 12.70, "60": 24.61, "80": 30.96, "100": 38.89, "120": 46.02, "140": 52.37, "160": 59.54 } }
  };

  function normaliseerScheduleSleutel(schStr) {
    if (!schStr) return null;
    const s = String(schStr).toUpperCase().replace(/SCHEDULE|SCH|SCHED/g, "").replace(/\s+/g, "").trim();
    if (s === "STANDARD") return "STD";
    if (s === "EXTRASTRONG") return "XS";
    if (s === "DOUBLEEXTRASTRONG") return "XXS";
    return s;
  }

  function zoekScheduleInfo(diameter, schInput) {
    if (!diameter) return null;
    let entry = null;
    let npsKey = null;

    const diaNum = typeof diameter === "number" ? diameter : parseFloat(String(diameter).replace(",", "."));

    // 1. Directe NPS match ("6", "6 duimer", "6\"", "1 1/2", etc.)
    const strTrim = String(diameter).replace(/(?:duimer|duims|duim|inch|")|\s+/gi, "").trim();
    if (ASME_PIPE_SCHEDULES[strTrim]) {
      npsKey = strTrim;
      entry = ASME_PIPE_SCHEDULES[strTrim];
    }

    // 2. Match op mm OD
    if (!entry && !isNaN(diaNum)) {
      for (const [k, v] of Object.entries(ASME_PIPE_SCHEDULES)) {
        if (Math.abs(v.od - diaNum) < 1.0) {
          npsKey = k;
          entry = v;
          break;
        }
      }
    }

    // 3. Match op kleine numerieke waarde als NPS (< 25)
    if (!entry && !isNaN(diaNum) && diaNum < 25) {
      const kCandidate = String(diaNum);
      if (ASME_PIPE_SCHEDULES[kCandidate]) {
        npsKey = kCandidate;
        entry = ASME_PIPE_SCHEDULES[kCandidate];
      }
    }

    if (!entry) return null;

    const schNorm = normaliseerScheduleSleutel(schInput);
    if (!schNorm) {
      return {
        nps: npsKey,
        od: entry.od,
        dn: entry.dn,
        alleSchedules: entry.wt
      };
    }

    let wt = entry.wt[schNorm];
    if (wt === undefined && entry.wt[schNorm + "S"]) {
      wt = entry.wt[schNorm + "S"];
    }

    if (wt === undefined) {
      return {
        nps: npsKey,
        od: entry.od,
        dn: entry.dn,
        gevraagdeSchedule: schNorm,
        gevonden: false,
        alleSchedules: entry.wt
      };
    }

    const id = Number((entry.od - (2 * wt)).toFixed(2));
    const doubleWall = Number((2 * wt).toFixed(2));

    return {
      nps: npsKey,
      od: entry.od,
      dn: entry.dn,
      schedule: schNorm,
      wt: wt,
      id: id,
      doubleWall: doubleWall,
      gevonden: true,
      alleSchedules: entry.wt
    };
  }

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
    "rondnaad", "langsnaad", "lasnaad", "ovaal", "ovaaltje", "verzet", "voorzet",
    "kruislas", "omtrek",

    // Buisopstellingen & Technieken
    "centraal", "panoramisch", "excentrisch", "dubbelwandig", "enkelwandig",
    "DWSI", "SWSI", "DWDI", "DWSD", "DWEB", "EWEB", "DWDB", "superpositie",
    "tangentiaal", "onstream", "RT-21021", "RT-21022", "isolatiedikte", "isolatie",
    "loodrecht", "openingshoek", "bundelbreedte", "bundel",
    "Single wall single image", "Double wall double image", "Double wall single image",
    "Enkel wand", "enkelwand", "dubbel wand", "dubbelwand",

    // Bronnen, Isotopen & Röntgen
    "Iridium", "Iridium-192", "Ir-192", "Selenium", "Selenium-75", "Se-75", "Kobalt", "Kobalt-60", "Co-60",
    "Balteau", "Balteau Ceram", "Balteau Ceram 300", "Balteau Rondstraler", "directional", "Ceram",
    "Yxlon", "Yxlon 300", "Smart EVO", "Smart EVO 300DS", "Smart 300",
    "röntgen", "röntgenbuis", "X-ray", "rondstraler", "collimator", "brongrootte", "focus",
    "focusafstand", "FFD", "SFD", "OFA", "MinFFD", "minimale FFD",

    // Eenheden & Radiologie
    "Curie", "Ci", "halfwaardetijd", "halveringstijd", "bronverval", "vervaltijd", "activiteit",
    "stralingstijd", "belichtingstijd", "schiettijd", "milliampère", "milliampère-minuten", "mA", "mA*min",
    "kV", "kilovolt", "buisspanning", "buistabel", "KV-regel", "kwadratenwet", "diktevermeerdering",
    "materiaalfactor", "staalequivalent", "afzetting", "dosistempo", "microsievert", "millisievert", "uSv", "mSv",

    // Films & Beeldkwaliteit
    "filmsoort", "filmtype", "filmklasse", "filmkwaliteit", "D2", "D3", "D4", "D5", "D7", "D8",
    "C1", "C2", "C3", "C4", "C5", "Agfa", "Structurix", "zwarting", "optische dichtheid",
    "BKI", "beeldkwaliteit", "beeldkwaliteitsindicator", "penetrameter", "draadje", "draadvereiste", "gevoeligheid",
    "W1", "W2", "W3", "W4", "W5", "W6", "W7", "W8", "W9", "W10", "W11", "W12", "W13", "W14", "W15", "W16", "W17", "W18", "W19",
    "1 FE EN", "6 FE EN", "10 FE EN", "13 FE EN", "Set A", "Set B", "Set C", "Set D", "Set 1A", "Set 2A",

    // Normen & Kwaliteitsklassen
    "ASME", "Section V", "Artikel 2", "EN", "ISO", "EN ISO", "ISO 17636", "ISO 17636-1", "ISO 17636-2",
    "ISO 19232", "ISO 19232-1", "ASTM", "ASTM E747", "Klasse A", "Klasse B", "EN-A", "EN-B",

    // Duimsmaten, Leidingmaten & Schedules
    "duims", "duimer", "halve duimer", "driekwart duims", "1 duimer", "2 duimer", "3 duimer", "4 duimer",
    "5 duimer", "6 duimer", "8 duimer", "10 duimer", "12 duimer", "14 duimer", "16 duimer", "18 duimer", "20 duimer", "24 duimer",
    "DN 15", "DN 20", "DN 25", "DN 50", "DN 80", "DN 90", "DN90", "dia9", "dl90", "DN 100", "DN 150", "DN 200", "DN 250", "DN 300", "DN 400", "DN 500", "DN 600",
    "schedule", "schedules", "schedule 10", "schedule 20", "schedule 30", "schedule 40", "schedule 60", "schedule 80",
    "schedule 100", "schedule 120", "schedule 140", "schedule 160", "Sch 40", "Sch 80", "Sch 160", "STD", "standard",
    "XS", "extra strong", "XXS", "ASME B36.10M", "ASME B36.19M", "wanddiktes",
    "haffmans", "sitech", "sabic", "lood", "staal", "aluminium", "inconel", "monel", "hastelloy"
  ];

  const NDO_FUZZY_WOORDENBOEK = NDO_SPRAAK_WOORDENBOEK;

  // Normale Nederlandse woorden die nooit door de fuzzy-matcher veranderd mogen worden
  const NORMALE_NL_STOPWOORDEN = new Set([
    "straal", "straalt", "stralen", "stalen", "minuten", "seconden", "bereken", "berekenen", "hoeveel", "wanneer",
    "waarom", "binnen", "buiten", "tussen", "zonder", "achter", "volgens", "eerste", "laatste",
    "grootste", "kleinste", "hoogste", "laagste", "kortste", "langste", "dikste", "dunste",
    "oudste", "nieuwste", "meeste", "minste", "zwaarste", "lichtste", "tweede", "derde", "vierde",
    "vijfde", "zesde", "achtste", "tiende", "twaalfde", "veertiende", "zestiende", "achttiende",
    "twintigste", "medium", "aluminium", "benzeen", "benzine", "aardolie", "aceton", "water",
    "leiding", "gebruiken", "aanhouden", "toegestaan", "geschikt", "nodig", "maken", "weten", "zien",
  ]);

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
      .replace(/ch/g, "g")
      .replace(/ph/g, "f")
      .replace(/th/g, "t")
      .replace(/qu/g, "kw")
      .replace(/c(?=[eiy])/g, "s")
      .replace(/c/g, "k")
      .replace(/z/g, "s")
      .replace(/v/g, "f")
      .replace(/dt$/g, "t")
      .replace(/d$/g, "t")
      .replace(/(.)\1+/g, "$1");
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
    // Voorbeeld: "zesdek" -> "zes dek", "4-duin" -> "4 duin", "driedek" -> "drie dek", "6-dik" -> "6 dik"
    s = s.replace(
      new RegExp(
        `\\b(${getalWoorden})[-\\s]*(dek|deck|dicht|dak|dok|dik|duin|duins|duinen|duim|duims|duimen|duimer|duimers|duif|duiven|duyven|tuin|tuinen|dimmer|dimmers|mm|cm|meter)\\b`,
        "gi",
      ),
      "$1 $2",
    );
    s = s.replace(
      /(\d+(?:[.,]\d+)?)[-\s]*(dek|deck|dicht|dak|dok|dik|duin|duins|duinen|duim|duims|duimen|duimer|duimers|duif|duiven|duyven|tuin|tuinen|dimmer|dimmers|inch|inches|mm|cm|meter|m\b|ci|curie|ma|kv|mill?i|mamin)/gi,
      "$1 $2",
    );

    // 1. mA*min varianten (minuten deel is VERPLICHT zodat pure milliampere stroom niet verward wordt!)
    s = s.replace(/\b(?:mill?i[-\s]?(?:amp[eè]re|amp)|mamp|ma)\s*(?:[\*x\s-]|per\s+)?(?:minuuten|minuten|minuut|min\b)\b/gi, "mA*min");

    // Herstel per ongeluk aaneengeplakt mA*mingebruiken / mA*mingebruik
    s = s.replace(/\bmA\*min(?:gebruik(?:en)?)\b/gi, "mA gebruiken");

    // 2. Pure mA (buisstroom in milliampere): strictly without minutes
    s = s.replace(/\b(\d+(?:[.,]\d+)?)\s*(?:mill?i[-\s]?(?:amp[eè]re|amp))\b/gi, "$1 mA");
    s = s.replace(/\b(?:mill?i[-\s]?(?:amp[eè]re|amp))\s*(\d+(?:[.,]\d+)?)\b/gi, "$1 mA");
    s = s.replace(/\bmill?i[-\s]?(?:amp[eè]re|amp)\b/gi, "mA");

    // 3. Film lookalikes in spraak (bijv. "op de 4" -> "op D4", "op de 5" -> "op D5", "en D5", "op de vier" -> "op D4")
    s = s.replace(/\b(?:op|naar|met|film|wissel\s+naar)\s+(?:de\s+|d\s+)?([234578])\b(?!\s*[.,]\d)(?!\s*(?:mm|cm|meter|m\b|inch|duim|dik|bar|sec|seconden|min|minuut|minuten|uur|opname|opnames|ma\b|kv\b|ci\b|curie\b))/gi, (match, d) => {
      const prefix = match.split(/\s+(?:de\s+|d\s+)?\d/i)[0];
      return `${prefix} D${d}`;
    });
    s = s.replace(/\b(?:op|naar|met|film)\s+de\s+(twee|drie|vier|vijf|zeven|acht)\b(?!\s*(?:ma\b|kv\b|ci\b|curie\b|mm|cm|meter))/gi, (match, w) => {
      const map = { twee: "2", drie: "3", vier: "4", vijf: "5", zeven: "7", acht: "8" };
      const prefix = match.split(/\s+de\s+/i)[0];
      return `${prefix} D${map[w.toLowerCase()] || w}`;
    });
    s = s.replace(/\b(?:en|als|of)\s+de\s*([234578])\b(?!\s*[.,]\d)(?!\s*(?:mm|cm|meter|m\b|inch|duim|dik|bar|sec|seconden|min|minuut|minuten|uur|opname|opnames|ma\b|kv\b|ci\b|curie\b))/gi, "en D$1");
    s = s.replace(/\b(?:en|als|of)\s+d\s*([234578])\b(?!\s*(?:ma\b|kv\b|ci\b|curie\b))/gi, "en D$1");

    // Dek / deck / dak / dijk na een getal of getalwoord -> dik
    s = s.replace(
      new RegExp(`\\b(${getalWoorden}|\\d+(?:[.,]\\d+)?)\\s+(dek|deck|dicht|dak|dok|dijk|dijken)\\b`, "gi"),
      "$1 dik",
    );

    // Duin / duins / tuin / dimmer / duiven na een getal of getalwoord -> duimer
    s = s.replace(
      new RegExp(
        `\\b(${getalWoorden}|\\d+(?:[.,]\\d+)?)\\s+(duin|duins|duinen|duif|duiven|duyven|tuin|tuinen|dimmer|dimmers|duivel|duvel|duwer|duiker|duitser|luier)\\b`,
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

    // Specifieke spraakvormen voor duimermaten uit praktijk (bijv. "zaalstein maar", "zesdemer", "zesdedag", "tweede helemaal", "tweede remmer", "tweede nummer")
    s = s.replace(/\b(orguinse|ochtendse|arduimse|arduimseleiding|achttuimse|achttruimse|achttuimseleiding|achttruimseleiding|ach\s*duimse|arduinse)(?:\s*leiding)?\b/gi, "8 duimse leiding");
    s = s.replace(/\b(zaalstein\s*maar|zaalstein|zesdemer|zesdem\s*maar|zesdem|zesdedag)\b/gi, "6 duimer");
    s = s.replace(/\b(tweede\s*helemaal|tweede\s*remmer|tweede\s*nummer|tweede\s*dimmer|tweede\s*luier)\b/gi, "2 duimer");
    s = s.replace(/\b(\d+|een|twee|drie|vier|vijf|zes|acht|tien|twaalf|veertien|zestien)[-\s]*(?:duimel|duimar|duima|demer|demmer|remmer|nummer|helemaal|duif|duiven)\b/gi, "$1 duimer");
    s = s.replace(/\b(\d+|een|twee|drie|vier|vijf|zes|acht|tien|twaalf)[-\s]*(?:damer|damers|dik\s*maar|dik\s*mag|dikmer|dikmag)\b/gi, "$1 duimer");
    s = s.replace(/\b(?:om|op)\s+een\s+duimer\b/gi, "op 1 duimer");

    // Wanddikte patronen: "10D" -> "10 dik", "4D" -> "4 dik", "vierdijk" -> "4 dik", "drie trek" -> "3 dik", "43 die gevuld" -> "4 dik die gevuld"
    s = s.replace(/\b(\d+)\s*[dD]\b/gi, "$1 dik");
    s = s.replace(/\b(vierdijk|vier\s*dijk)\b/gi, "4 dik");
    s = s.replace(/\b(drie\s*trek|drietrek)\b/gi, "3 dik");
    s = s.replace(/\bvan\s*43\s*(?=die\s*gevuld|gevuld|gevuldest)/gi, "van 4 dik ");
    s = s.replace(/\bgevuldest\b/gi, "gevuld is");
    s = s.replace(/(\d+(?:[.,]\d+)?)[-\s]*(?:mm\s*)?\b(dek|deck|decks|dec|decs|deken|dekens|dijk|dijken|deuk|deuken|deutjes|deukjes)\b/gi, "$1 dik");
    s = s.replace(/\b(woonde\s*ik\s*(?:de|te|er)?|wandde\s*ik\s*(?:de|te|er)|wonde\s*ik\s*(?:de|te|er)|woonde\s*ik)\b/gi, "wanddikte");

    // Zwarting & Verwachting fonetische spraakcorrecties
    s = s.replace(/\b(zwartings?\s*vrijste|zwartingsvrijste|zwartingvrijste|zwartings?\s*vrijsten|zwartings?\s*vereiste|zwartings?\s*vereisten)\b/gi, "zwartingseisen");
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

    // ASME fonetische lookalikes (bijv. "voor ons Esmee", "voor onze Esmee", "aas mee", "aasmee", "volgens Esmee", "volgens a s mee", "voor ons aalsmee")
    s = s.replace(
      /\b(?:voor\s+(?:ons|onze)\s+(?:esmee|aalsmee|alsmee|aas\s*mee|aasmee|aas\s*me)|volgens\s+(?:esmee|a\s*s\s*mee|aalsmee|alsmee|aas\s*mee|aasmee|aas\s*me)|a\s*s\s*mee|voorons\s+(?:aalsmee|alsmee))\b/gi,
      "volgens ASME",
    );
    s = s.replace(/\b(aalsmee|alsmee|aas\s*mee|aasmee|aas\s*me|aasme)\b/gi, "ASME");

    // Brongrootte lookalikes (bijv. "de bron groot is 3", "de volgende groot is 3", "de bruynegoot is 3", "bronnen grote virus")
    s = s.replace(/\b(?:de\s+)?(?:bron\s*groot|volgende\s*groot|bruyne\s*goot|bruynegoot|bruine\s*goot|bruinegoot)\s*(?:is|van|=|:)?\s*(\d+(?:[.,]\d+)?)\b/gi, "brongrootte $1");
    s = s.replace(/\b(?:bronnen\s*grote|brongrootte|bron\s*grootte)\s*(?:is\s*)?virus\b/gi, "brongrootte 4 is");

    // Iridium lookalikes (bijv. "die ridem", "ingrediën", "ingrediënt", "ingrediënten", "ridia", "ridium", "de stage iridium")
    s = s.replace(/\b(?:en\s+die\s+|die\s+|de\s+)?(?:ridem|ridium|ridia|ingredi[eë]n|ingredi[eë]nt|ingredi[eë]nten)\b/gi, "iridium");
    s = s.replace(/\b(?:de|die)?\s*(?:sterkste|stage|stagste|strakste|steekste)\s+(iridium|selenium|kobalt|bron|cilinder)\b/gi, "de sterkste $1");

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
      [/\b(staarste|stearste|starste|sterste|stèrste|sterksten|strakste|strikste|stekste|streekste|stiekste|steekste|sterfte|stelligste|stoutste)\b/gi, "sterkste"],
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

      // 2. Focus / FFD / Onstream / Isolatie
      [/\b(fokkers\s*afstand|fokker\s*afstand|foto\s*afstand|vogels\s*afstand|vogel\s*afstand|fokus\s*afstand|fokusafstand)\b/gi, "focusafstand"],
      [/\b(effe\s+de|effe\s+dee|ef\s*ef\s*de|ef\s*ef\s*dee|ef\s*dee|f\s*f\s*d|effd|ff\s*d|f\s*f\s*t|f\s*v\s*d|fvd)\b/gi, "FFD"],
      [/\b(fokkers|fokker|fokus|vokkes|fokkes|fokke|vokke|vogels|vogel|locus|crocus|krokus|hocus|pocus|pokus|circus|ficus|lotus|foetus|cactus|fakkel|fakkels)\b(?=\s+(?:afstand|op|voor|bij|van|moet|aanhouden|nodig|berekenen|wissel|verandering|is|\d+)|\s*$)/gi, "focus"],
      [/\b(hoeveel|welke|minimale|wat\s+is\s+de|kleinste|kortste|nieuwe|oude)\s+(fokkers|fokker|fokus|vokkes|fokkes|fokke|vokke|vogels|vogel|locus|crocus|krokus|hocus|pocus|pokus|circus|ficus|lotus|foetus|cactus|fakkel|fakkels)\b/gi, "$1 focus"],
      [/\b(optimale|normale|finale|ideale|militair|militaire|minima)\s+(?=ffd|sfd|focus|focusafstand)\b/gi, "minimale "],
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

      // 4. Stralingstijd / Belichtingstijd / Buistabel / KV-regel
      [/\b(betalingstijd|vertalingstijd|herhalingstijd|belastingstijd|bestralingstijd|verlichtingstijd|verrichtingstijd|inrichtingstijd|oprichtingstijd|toelichtingstijd|verplichtingstijd|stichtingstijd|richtingstijd|dalingstijd|bepalingstijd|schietteid|schijt\s*tijd)\b/gi, "stralingstijd"],
      [/\b(hoe\s*lang|hoelang)\s+(?:moet|mag|kan|wil|zal|ga)\s+(?:ik|je|men|we)\s+(?:betalen|vertalen|herhalen|balen|halen|dwalen|malen|palen|gieten|genieten|verlichten|stichten|inrichten|oprichten|verrichten|verplichten)\b/gi, "hoe lang moet ik stralen"],
      [/\b(moet|wil|kan|ga)\s+ik\s+(?:betalen|vertalen|herhalen|balen|malen)\s+(?=met|bij|op|voor)\b/gi, "$1 ik stralen "],
      [/\b(buitenspel|kruistabel|thuistabel|huistabel|muistabel|ruistabel|luistabel|kluistabel|pijptabel|stroomtabel)\b/gi, "buistabel"],
      [/\b(miljardair|miljonair|militair|militaire|militairen|ministerie|materie|bacterie|calorie|galerie|batterij|familie|milli|mili)\s*(?:amp[eè]re|amber|amper|empire|vampier|papier|manier)?\s*(?:minut(?:en|ie)?|minuut)\b/gi, "milliampère-minuten"],
      [/\b(\d+(?:[.,]\d+)?)\s*(?:miljardair|miljonair|militair|militaire|milli|mili)\s*(?:amp[eè]re|amber|amper|empire|vampier|papier|manier)\b(?!\s*[-]?\s*min)/gi, "$1 mA"],
      [/\b(kever\s*regels?|kabel\s*regels?|kavel\s*regels?|koffie\s*regels?|keverregel|kabelregel|kavelregel|koffieregel)\b/gi, "KV-regel"],
      [/\b(bijspanning|huisspanning|kruisspanning|uitspanning|inspanning|ontspanning|verspanning|overspanning|buispanning|buis\s*paning|buis\s*spring|buis\s*panging)\b/gi, "buisspanning"],

      // 5. Afzetting / Collimator / Langsnaad / Rondnaad / Draadje / Ovaaltje / Opnames
      [/\b(bezetting|omzetting|inzetting|uitzetting|voortzetting|overzetting|bijzetting|ontzetting|verzetting)\b/gi, "afzetting"],
      [/\b(colimator|kollimator|kolimator|combinator|coördinator|coordinator|alligator|navigator|ventilator|generator|simulator|isolator|transformator|incubator)\b/gi, "collimator"],
      [/\bachter\s+(?:de|een)\s+(radiator|calculator|indicator)\b/gi, "achter de collimator"],
      [/\b(langsnaat|langstraat|landstraat|zandstraat|kantstraat|handstraat|brandstraat|strandstraat)\b/gi, "langsnaad"],
      [/\b(langzaam|langzaamaan|langsgaan|langslaan)\s+(?=van\s+\d+|verdelen|verdeel|verdeling|lengte|opnames)\b/gi, "langsnaad "],
      [/\b(verdeel|verdelen|verdeling)\s+(?:van\s+)?(?:een\s+|de\s+)?(langzaam|langzaamaan|langstraat)\b/gi, "$1 langsnaad"],
      [/\b(rondnaat|rondmaat|rondlaat|rondgaat|rondstaat|rondpraat|rondvaart|rondaan|hondnaad|hondnaat|mondnaad|bondnaad|grondnaad|bontnaad|zondnaad|frontnaad|kontnaad|rodenaad|rondenaad)\b/gi, "rondnaad"],
      [/\b(welk|welke)\s+(praatje|straatje|gaatje|maatje|blaadje|zaadje|naadje|raadje|vaatje|kraantje|baantje|haantje|maantje|traantje|zwaantje|graantje)\b/gi, "$1 draadje"],
      [/\b(praatje|straatje|gaatje|maatje|blaadje|zaadje|naadje|raadje|vaatje|kraantje|baantje)\s+(?=bki|nodig|moet|gebruiken|zien|op\s+de\s+film|voor\s+\d+|bij\s+\d+)/gi, "draadje "],
      [/\b(ophaaltje|of\s*haaltje|verhaaltje|taaltje|paaltje|zaaltje|baaltje|schaaltje|kwaaltje|straaltje|kanaaltje|signaaltje|metaaltje|garnaaltje|journaaltje)\b/gi, "ovaaltje"],
      [/\b(hoeveel|aantal)\s+(aannames?|afnames?|innames?|deelnames?|toenames?|overnames?|uitnames?)\b/gi, "$1 opnames"],
      [/\bhoeveel\s+(voorzet|inzet|opzet|afzet|omzet|uitzet|bijzet|ontzet|bezet|gezet)\b/gi, "hoeveel verzet"],

      // 6. Technieken (DWSI / SWSI / DWDI)
      [/\b(de\s+wc|dw\s*zie|d\s*w\s*s\s*i|dwz\s*i|dw\s*si|dw-si|double\s*wall\s*single\s*image|dubbele\s+wand\s+enkel\s+beeld|dubbelwandig\s+enkel|dubbel\s*wand\s*enkel\s*beeld|dubbelwand\s*enkel\s*beeld|dweb|d\.w\.e\.b\.)\b/gi, "DWSI"],
      [/\b(single\s*wall\s*single\s*image|single\s*wall|souci|sw\s*zie|s\s*w\s*s\s*i|s\s*w\s*c|sw\s*si|sw-si|enkele\s+wand\s+enkel\s+beeld|enkeld?wandig\s+enkel\s+beeld|enkeld?wandig|enkeld?\s*wand\s*enkel\s*beeld|enkeld?wand\s*enkel\s*beeld|enkele?\s*wand|enkeld?wand|eweb|e\.w\.e\.b\.)\b/gi, "SWSI"],
      [/\b(double\s*wall\s*double\s*image|double\s*wall\s*double|dw\s*die|d\s*w\s*d\s*i|dw\s*di|dw-di|dubbele\s+wand\s+dubbel\s+beeld|dubbel\s+wand\s+dubbel|dubbelwandig\s+dubbel\s+beeld|dubbelwand\s+dubbel\s+beeld|dwdb|d\.w\.d\.b\.)\b/gi, "DWDI"],
    ];

    for (const [pat, rep] of spraakCorrecties) {
      s = s.replace(pat, rep);
    }

    return s.replace(/\s+/g, " ").trim();
  }

  // --- NDO Opstellingen & Groeperingen Kennisbank (EN ISO 17636-1 / ASME) ---
  const OPSTELLINGEN_NDO = {
    "1": {
      code: "1",
      groep: "SWSI",
      technique: "SWSI",
      optie: "3",
      isPlaat: true,
      synoniemen: ["opstelling 1", "swsi plaat", "vlakke plaat"],
      titel: "Opstelling 1 (SWSI vlakke plaat)",
      beschrijving: "Enkelwandige opstelling voor lassen in vlakke platen (Single Wall Single Image / EWEB). Bron aan voorzijde, film aan achterzijde.",
    },
    "2": {
      code: "2/C",
      groep: "SWSI",
      technique: "SWSI",
      optie: "",
      isPlaat: false,
      synoniemen: ["opstelling 2", "opstelling c", "opstelling 2/c", "opstelling 2 / c"],
      titel: "Opstelling 2 / C (SWSI buis)",
      beschrijving: "Enkelwandige doorstraling van buizen (Single Wall Single Image / EWEB). Bron aan buitenzijde, film aan binnenzijde (contact SWSI).",
    },
    "5": {
      code: "5/A",
      groep: "SWSI",
      technique: "SWSI",
      optie: "1",
      isPlaat: false,
      synoniemen: ["opstelling 5", "opstelling a", "opstelling 5/a", "opstelling 5 / a", "centraal", "centrale opstelling", "panoramisch"],
      titel: "Opstelling 5 / A (SWSI Centraal / Panoramisch)",
      beschrijving: "Centrale panoramische doorstraling (Single Wall Single Image / EWEB). Bron in de as van de pijp, film aan de buitenzijde rondom. 1 panoramische opname (360°).",
    },
    "8": {
      code: "8/B",
      groep: "SWSI",
      technique: "SWSI",
      optie: "2",
      isPlaat: false,
      synoniemen: ["opstelling 8", "opstelling b", "opstelling 8/b", "opstelling 8 / b", "excentrisch", "excentrische opstelling"],
      titel: "Opstelling 8 / B (SWSI Excentrisch)",
      beschrijving: "Excentrische enkelwandige doorstraling (Single Wall Single Image / EWEB). Bron binnenin excentrisch tegen de tegenoverliggende wand geplaatst, film aan buitenzijde van het te onderzoeken lassegment.",
    },
    "11": {
      code: "11/F",
      groep: "DWDI",
      technique: "DWDI",
      ovaaltje: "Ja",
      isPlaat: false,
      synoniemen: ["opstelling 11", "opstelling f", "opstelling 11/f", "opstelling 11 / f", "ovaal", "ovaaltje", "opnames met verzet", "elliptisch"],
      titel: "Opstelling 11 / F (DWDI Ovaaltje / met verzet)",
      beschrijving: "Dubbelwand dubbelbeeld met verzet / ovaalbeeld (Double Wall Double Image / DWDB). Bron en film buiten, bundel onder een hoek verzet. 2 opnames onder 90°.",
    },
    "12": {
      code: "12/G",
      groep: "DWDI",
      technique: "DWDI",
      ovaaltje: "Nee",
      isPlaat: false,
      synoniemen: ["opstelling 12", "opstelling g", "opstelling 12/g", "opstelling 12 / g", "superpositie", "loodrecht door de las"],
      titel: "Opstelling 12 / G (DWDI Superpositie)",
      beschrijving: "Dubbelwand dubbelbeeld superpositie (Double Wall Double Image / DWDB). Bron en film buiten, centrale straling loodrecht door het lasvlak. 3 opnames onder 60° of 120°.",
    },
    "13": {
      code: "13/E",
      groep: "DWSI",
      technique: "DWSI",
      optie: "",
      bronTekst: "X-ray",
      isPlaat: false,
      synoniemen: ["opstelling 13", "opstelling 13 (x-ray)", "opstelling 13/e", "opstelling 13 / e"],
      titel: "Opstelling 13 / E (DWSI Röntgenbuis)",
      beschrijving: "Dubbelwand enkelbeeld met röntgenbuis (Double Wall Single Image / DWEB). Bron buiten, film aan de overzijde buiten.",
    },
    "14": {
      code: "14/E",
      groep: "DWSI",
      technique: "DWSI",
      optie: "",
      bronTekst: "Gamma bron",
      isPlaat: false,
      synoniemen: ["opstelling 14", "opstelling 14 (gamma)", "opstelling 14/e", "opstelling 14 / e"],
      titel: "Opstelling 14 / E (DWSI Gammabron)",
      beschrijving: "Dubbelwand enkelbeeld met gammabron (Se-75 / Ir-192) (Double Wall Single Image / DWEB). Bron buiten, film aan de overzijde buiten.",
    },
    "E": {
      code: "E",
      groep: "DWSI",
      technique: "DWSI",
      optie: "",
      isPlaat: false,
      synoniemen: ["opstelling e", "opstelling 13/14"],
      titel: "Opstelling E (DWSI Algemeen)",
      beschrijving: "Dubbelwand enkelbeeld (Double Wall Single Image / DWEB). Bron buiten, film aan de overzijde buiten (overeenkomend met opstelling 13 voor X-ray en 14 voor gamma).",
    },
    "15": {
      code: "15",
      groep: "DWSI",
      technique: "DWSI",
      optie: "",
      isPlaat: false,
      synoniemen: ["opstelling 15"],
      titel: "Opstelling 15 (DWSI Meervoudige wanden)",
      beschrijving: "Dubbelwand enkelbeeld techniek (Double Wall Single Image / DWEB) voor dikwandige pijpen, buis-plaat lassen of tangentiële opstellingen.",
    },
  };

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
      [/\b(want\s*dikte|van\s*dikte|vandikte|wand\s*dikte|wamdikte|waterdikte|wat\s*dikte|wanddikten|handdikte|banddikte|zanddikte|randdikte|wanten\s*dikte|wante\s*dikte|wang\s*dikte|wangdikte|wan\s*dikte|warmte\s*dikte|wandsdikte|wand\s*dicht|want\s*dicht)\b/gi, "wanddikte"],
      [/\b(dia\s*meter|die\s*ja\s*meter|dieja\s*meter|dia\s*meeter|diameters|diamater)\b/gi, "diameter"],
      [/\b(las\s*breedte|last\s*breedte|los\s*breedte|lasbreete|las\s*breed|las\s*meet|lasbreedten)\b/gi, "lasbreedte"],
      // FFD / Afstanden
      [/\b(focus\s*afstand|fokkers\s*afstand|fokker\s*afstand|foto\s*afstand|vogels\s*afstand|vogel\s*afstand|focusafstand|fokus|fokusafstand|film\s*focus\s*afstand|film\s*focusafstand|bron\s*film\s*afstand|source\s*film\s*distance|source\s*film\s*afstand|source\s*to\s*film\s*distance)\b/gi, "FFD"],
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
      [/\b(b\s*k\s*i|beke|beki|beekie|bekkie|bikkie|wiki|mickey|tikkie|b\s*k\s*ie|beeldkwaliteit|beeld\s+kwaliteit|indicator|draadjes|draadje|draatje|draatjes|i\s*q\s*i|iqi)\b/gi, "draadje BKI"],
      // Brongrootte / Bronafmeting / Bronkeuze
      [/\b(bron\s*afmeting|bronafmeting|focus\s*afmeting|focusafmeting|brongrote|bron\s*grootte|brandvlek\s*grootte|brandvlekgrootte|brandvlek)\b/gi, "brongrootte"],
      [/\b(bronkhuyzen|bronkhuizen|bronkhuis|bronhuizen|bronhuis|bronkruis|bronbuis|bron\s*kruis|bron\s*buis|bron\s*keuzes?|bronkeuzes|bronkeuzen|bron\s*cursus|bron\s*keuring)\b/gi, "bronkeuze"],
      // Technieken
      [/\b(de\s+wc|dw\s*zie|d\s*w\s*s\s*i|dwz\s*i|dw\s*si|dw-si|double\s*wall\s*single\s*image|dubbele\s+wand\s+enkel\s+beeld|dubbelwandig\s+enkel|dubbel\s*wand\s*enkel\s*beeld|dubbelwand\s*enkel\s*beeld|dweb|d\.w\.e\.b\.)\b/gi, "DWSI"],
      [/\b(single\s*wall\s*single\s*image|single\s*wall|souci|sw\s*zie|s\s*w\s*s\s*i|s\s*w\s*c|sw\s*si|sw-si|enkele\s+wand\s+enkel\s+beeld|enkeld?wandig\s+enkel\s+beeld|enkeld?wandig|enkeld?\s*wand\s*enkel\s*beeld|enkeld?wand\s*enkel\s*beeld|enkele?\s*wand|enkeld?wand|eweb|e\.w\.e\.b\.)\b/gi, "SWSI"],
      [/\b(double\s*wall\s*double\s*image|double\s*wall\s*double|dw\s*die|d\s*w\s*d\s*i|dw\s*di|dw-di|dubbele\s+wand\s+dubbel\s+beeld|dubbel\s+wand\s+dubbel|dubbelwandig\s+dubbel\s+beeld|dubbelwand\s+dubbel\s+beeld|dwdb|d\.w\.d\.b\.)\b/gi, "DWDI"],
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
      [/\b(yxlon\s+smart|ikslon\s+smart|ypsilon\s+smart|smart\s*evo|evo\s*300)\b/gi, "Yxlon Smart (1 mm)"],
      [/\b(ikslon|ixlon|x[\s-]*lon|xlon|epsilon|ypsilon|ijssel|ijslon|eikslon|ykslon|iks\s*lon|yks\s*lon|yxlon)\b/gi, "Yxlon (3 mm)"],
      [/\b((?:balteau|balto|baltoo|ball\s*toe|bal\s*toe|ball?\s*to|baltoe|baltho|baltau|bauto|bal\s*touw|baltouw)\s*(?:rondstraler|panoramisch)|rondstraler|rondstralen)\b/gi, "Balteau Rondstraler (5 mm)"],
      [/\b((?:balteau|balto|baltoo|ball\s*toe|bal\s*toe|ball?\s*to|baltoe|baltho|baltau|bauto|bal\s*touw|baltouw)\s*(?:ceram|directional)|ceram\s*300|seram\s*300|ceran\s*300)\b/gi, "Balteau Ceram (2.5 mm)"],
      [/\b(balteau|balto|baltoo|ball\s*toe|bal\s*toe|ball?\s*to|baltoe|baltho|baltau|bal\s*touw|baltouw|bauto)\b(?!\s*\(|\s*rondstraler|\s*ceram)/gi, "Balteau (2.5 mm)"],
      // Begrippen
      [/\b(straling\s*tijd|stralings\s*tijd|belichting\s*tijd|belichtings\s*tijd|betalingstijd|vertalingstijd|herhalingstijd|belastingstijd|bestralingstijd|belichtingstijd|schiettijd|schiet\s*tijd|schietteid)\b/gi, "stralingstijd"],
      [/\b(bron\s*verval|bronverval|halfwaarde\s*tijd|halfwaardetijd|halveringstijd|halverings\s*tijd|vervaltijd|verval\s*tijd)\b/gi, "bronverval"],
      [/\b(schuifje|schuifkaart|schuif\s*kaart|rekenliniaal|reken\s*liniaal|nomogram)\b/gi, "schuifje"],
      [/\b(voorzet|verzetten|ontzet|verzetje|verzetjes)\b/gi, "verzet"],
      [/\b(ovaal|ovaaltje|ovaal\s*tje|of\s*haaltje|op\s*haaltje)\b/gi, "ovaaltje"],
      [/\b(optische\s+dichtheid|opties\s+dichtheid|optische\s+dikheid|optische\s+dikte|filmzwarting)\b/gi, "zwarting"],
      [/\b(bron\s*zijde|bron\s*kant|source\s*side|sourceside)\b/gi, "bronzijde"],
      [/\b(film\s*zijde|film\s*kant|film\s*side|filmside)\b/gi, "filmzijde"],
      // Filmtypen & D-nummers
      [/\b(d\s*4|dee\s*vier|dee\s*4|d\s*vier|de\s*vier|de\s*4|d-4|b\s*4|dier)\b/gi, "D4"],
      [/\b(d\s*5|dee\s*vijf|dee\s*5|d\s*vijf|de\s*vijf|de\s*5|d-5|b\s*5)\b/gi, "D5"],
      [/\b(d\s*7|dee\s*zeven|dee\s*7|d\s*zeven|de\s*zeven|de\s*7|d-7|b\s*7)\b/gi, "D7"],
      [/\b(d\s*2|dee\s*twee|dee\s*2|d\s*twee|de\s*2|d-2)\b/gi, "D2"],
      [/\b(d\s*3|dee\s*drie|dee\s*3|d\s*drie|de\s*3|d-3)\b/gi, "D3"],
      [/\b(d\s*8|dee\s*acht|dee\s*8|d\s*acht|de\s*8|d-8)\b/gi, "D8"],
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

    // Wanddikte lookalikes (bijv. "the wonderte", "wanddeegte", "wandelen", "the 100", "de 100", "de wandel ik de", "wandel ik de", "de wandeling te", "woonde ik de")
    t = t.replace(
      /\b(?:the|de)?\s*(?:wonderte|wonder\s*te|wonder\s*de|wandert|wondert|wonderten|wondertek|wondertec|wandd?eeg(?:te)?|wandd?eg(?:te)?|wandd?ek(?:te)?|wandtegte|wandtekte|wanddigte|wandel(?:en|ing|ingen|er|ers|aars?|de|t)?(?:\s*ik)?(?:\s*(?:de|te|er))?|wondikte|wanddecte|one\s*dikte|onedikte|woonde\s*ik\s*(?:de|te|er)?|wandde\s*ik\s*(?:de|te|er)?|wonde\s*ik\s*(?:de|te|er)?)\s*(?:is|van|=|:)?\s*(\d+(?:[.,]\d+)?)\b/gi,
      "de wanddikte is $1",
    );
    t = t.replace(
      /\b(?:the|de)\s*(?:100|hundred|one\s*hundred|honderd)\s*(?:is|van|=|:)?\s*(\d+(?:[.,]\d+)?)\b/gi,
      "de wanddikte is $1",
    );
    t = t.replace(
      /\b(?:the|de)\s*(?:wonderte|wonder\s*te|wonder\s*de|wandert|wondert|wonderten|wondertek|wondertec|wandd?eeg(?:te)?|wandd?eg(?:te)?|wandd?ek(?:te)?|wandtegte|wandtekte|wanddigte|wandel(?:en|ing|ingen|er|ers|aars?|de|t)?(?:\s*ik)?(?:\s*(?:de|te|er))?|wondikte|wanddecte|one\s*dikte|onedikte|woonde\s*ik\s*(?:de|te|er)?|wandde\s*ik\s*(?:de|te|er)?|wonde\s*ik\s*(?:de|te|er)?)\b/gi,
      "de wanddikte",
    );
    t = t.replace(
      /\b(?:wonderte|wonder\s*te|wonder\s*de|wandert|wondert|wonderten|wondertek|wondertec|wandd?eeg(?:te)?|wandd?eg(?:te)?|wandd?ek(?:te)?|wandtegte|wandtekte|wanddigte|wandel(?:en|ing|ingen|er|ers|aars?|de|t)?(?:\s*ik)?(?:\s*(?:de|te|er))?|wondikte|wanddecte|one\s*dikte|onedikte|woonde\s*ik\s*(?:de|te|er)?|wandde\s*ik\s*(?:de|te|er)?|wonde\s*ik\s*(?:de|te|er)?)\b/gi,
      "wanddikte",
    );
    t = t.replace(
      /\b(?:the|de)\s*(?:100|hundred|one\s*hundred|honderd)\b(?=\s+(?:is|van|=|\d+\s*dik|\d+\s*mm|welk|volgens|\d+\b))/gi,
      "de wanddikte",
    );
    t = t.replace(
      /\b(?:the|de)?\s*(?:one|1)\s*that(?:['’]?s|\s*is|\s*van|\s*was)?\s*(?:is|van|=|:)?\s*(\d+(?:[.,]\d+)?)\b/gi,
      "de wanddikte is $1",
    );
    t = t.replace(
      /\b(?:the|de)?\s*(?:one|1)\s*that\s*(\d+(?:[.,]\d+)?)\s*(?:is|dik)?\b/gi,
      "de wanddikte is $1",
    );
    t = t.replace(
      /\b(?:the|de)\s*(?:one|1)\s*that\s*(?:is|was)\b/gi,
      "de wanddikte is",
    );
    t = t.replace(
      /\b(?:the|de)\s*(?:one|1)\s*that\b(?=\s+(?:is|van|=|\d+\s*dik|\d+\s*mm|welk|volgens|\d+\b))/gi,
      "de wanddikte",
    );

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

    // D & N spraakcorrecties: "den 50", "d en 50", "d.n. 50", "d n 50", "d&n 50", "dm 50", "dr 50", "dl 50", "dia 50" -> "DN 50"
    t = t.replace(/\b(?:d\s*(?:en|&|\.n\.|\s+n)|den|dan|dm|dr|dl|dia|thee\s*en|de\s*en|de\s*n)\s*(\d+)\b/gi, "DN $1");

    // DN maten converteren naar buitendiameter De (in mm)
    t = t.replace(/\bdn\s*[-]?\s*(\d+)\b/gi, (m, dnVal) => {
      const od = DN_MATEN[dnVal];
      return od !== undefined ? `diameter ${od}` : m;
    });

    // 4. Duimse maten
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

    // 5. Fuzzy matching (Levenshtein + Nederlandse fonetische sleutel)
    t = t.split(/\s+/).map((w) => {
      const s = w.replace(/[^a-z]/gi, "").toLowerCase();
      if (s.length < 6 || NORMALE_NL_STOPWOORDEN.has(s) || NDO_FUZZY_WOORDENBOEK.includes(s)) return w;
      const sFon = nlFonetischeSleutel(s);
      for (const d of NDO_FUZZY_WOORDENBOEK) {
        if (Math.abs(s.length - d.length) > 2) continue;
        const dist = levenshteinAfstand(s, d);
        const zelfdeBeginOfEind =
          (s.length >= 6 && d.length >= 7 && (s.slice(0, 2) === d.slice(0, 2) || s.slice(-3) === d.slice(-3)));
        const fonDist = levenshteinAfstand(sFon, nlFonetischeSleutel(d));
        if (
          dist <= (d.length >= 9 ? 2 : 1) ||
          (dist <= 2 && zelfdeBeginOfEind) ||
          (sFon.length >= 5 && fonDist <= 1 && zelfdeBeginOfEind)
        ) {
          if (d === "iridium") return "Ir-192";
          if (d === "selenium") return "Se-75";
          return d;
        }
      }
      return w;
    }).join(" ");

    return t.replace(/\s+/g, " ").trim();
  }

  // --- Intentie Bepaling ---
  function bepaalVraagIntenties(tekst) {
    const lower = tekst.toLowerCase();
    const intenties = [];
    const heeftTijdSeenheid = /\b\d+(?:[.,]\d+)?\s*(?:minuut|minuten|min\b|sec\b|seconden)\b/i.test(lower);
    const heeftVanNaar =
      /\b(?:van|vanuit)\s+\S+.*?\b(?:naar|tot)\b/i.test(lower) ||
      /\b(?:wissel|focusverandering|kwadratenwet|oude\s+(?:focus|ffd|tijd|ci|curie)|nieuwe\s+(?:focus|ffd|tijd|ci|curie)|vorig\s+jaar|vroeger|eerst)\b/i.test(lower) ||
      /\bd[234578]\b.*?\bd[234578]\b/i.test(lower) ||
      /\b\d+(?:[.,]\d+)?\s*(?:ci|curie)\b.*?\b\d+(?:[.,]\d+)?\s*(?:ci|curie)\b/i.test(lower);
    const isZwartingTijdSchatting =
      /\b(zwarting\w*|optische\s+dichtheid|density)\b/i.test(lower) && heeftTijdSeenheid;
    const isStralingstijdVraag =
      !isZwartingTijdSchatting &&
      !heeftVanNaar &&
      (/\b(stralingstijd|belichtingstijd|schiettijd|hoelang|hoe\s+lang)\b/i.test(lower) ||
        (/\b(wat\s+wordt\s+(?:het|de\s+tijd)|wat\s+is\s+de\s+(?:stralings|belichtings)?tijd)\b/i.test(lower) &&
          !heeftTijdSeenheid &&
          !(typeof actiefGespreksGeheugen !== "undefined" && actiefGespreksGeheugen && actiefGespreksGeheugen.focusBegintijdSec)));

    // Over R.A.D.I. / Info / Disclaimer / Contact / Fout melden
    if (/\b(wie\s+ben\s+(je|jij)|wat\s+is\s+radi|hoe\s+werkt\s+(deze\s+app|radi|het)|over\s+radi|disclaimer|eigen\s+risico|fout\s+melden|contact|feedback|over\s+deze\s+app)\b/i.test(lower)) {
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
    const isOnstream =
      /\b(onstream|on\s*stream|onstreamopname|rt21021|rt21022|tangentiaal|tangenti[eë]le|restwanddikte|wmax|w\s*max|w-max|klasse\s*t[ab])\b/i.test(lower) ||
      (typeof actiefGespreksGeheugen !== "undefined" &&
        actiefGespreksGeheugen &&
        (actiefGespreksGeheugen.laatsteIntentie === "onstream_ffd" || actiefGespreksGeheugen.laatsteIntentie === "onstream_bron") &&
        /\b(klasse\s*t[ab]|tb|ta|isolatie|tangentiaal|dubbelwand)\b/i.test(lower));
    if (isOnstream) {
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
      } else if (/\b(bron|bronkeuze|geschikt|isotoop|se-75|ir-192|co-60|welke\s+bron|iridium|selenium|kobalt|kan\s+ik|mag\s+ik|gebruiken|wmax|w-max)\b/i.test(lower) && !/\b(stralingstijd|belichtingstijd|schiettijd|hoelang|hoe\s+lang|gevuld|water|olie)\b/i.test(lower)) {
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
      /\b(geometrische\s+onscherpte|\bug\b)\b/i.test(lower) &&
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
      (/\b(afscherming|afschermen|lood|loden|pb)\b/i.test(lower) && /\b(nodig|meter|m\b|afzetten|afzetting|dosistempo|microsievert|usv|µsv|iridium|selenium|se-?75|ir-?192|curie|ci|collimator)\b/i.test(lower));

    const isAfzettingVervolg =
      typeof actiefGespreksGeheugen !== "undefined" &&
      actiefGespreksGeheugen &&
      actiefGespreksGeheugen.laatsteIntentie === "afzetting" &&
      !isStralingstijdVraag &&
      !isFocusVeranderingVraag &&
      !/\b(opnames?|draadje|bki|iqi|ffd|sfd|focus|onstream|wmax|lasfout|schedule|langsnaad|verzet|bundel|kv|zwarting)\b/i.test(lower) &&
      (/\b(\d+(?:[.,]\d+)?\s*(?:meter|m\b|mm|ci|curie)|lood|loden|pb|staal|fe|afscherming|collimator|open\s+bundel|sterkste|zwakste|iridium|selenium|seleen|se-?75|ir-?192|zonder\s+(?:lood|afscherming)|geen\s+(?:lood|afscherming))\b/i.test(lower));

    if (isAfzettingDirect || isAfzettingVervolg) {
      intenties.push("afzetting");
      return intenties;
    }

    // Zwarting (inclusief praktijkschatting zwarting -> stralingstijd)
    if (/\b(zwarting\w*|optische\s+dichtheid|density)\b/i.test(lower)) {
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

    // Opnames / omtrek / hoekverdeling (graden draaien)
    const lowerZonderFilm = lower.replace(/\b(d[234578]|d\s*[234578])\s+films?\b/gi, "").replace(/\bfilm(?:kwaliteit|type|klasse|soort)\b/gi, "");
    if (
      /\b(hoeveel|aantal)\s*(?:van\s+de\s+)?(films?|opname[ns]?|foto'?s?|shots?|platen|plaatjes)\b/i.test(lowerZonderFilm) ||
      /\b(films?|opname[ns]?|foto'?s?|shots?|platen|plaatjes)\s*(?:heb\s+ik\s+)?(?:nodig|moet\s+ik|maken|gebruiken)\b/i.test(lowerZonderFilm) ||
      /\b(?:om\s+)?hoeveel\s+graden\b.*?\b(?:draaien|verdraaien|verplaatsen|verschuiven|schieten|opname)\b/i.test(lowerZonderFilm) ||
      (/\b(omtrek|filmverdeling|opnamelocaties?)\b/i.test(lowerZonderFilm) && !isStralingstijdVraag)
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
      /\b(draad|draadje|draadjes|bki|beeldkwaliteit|iq|iqi|gevoeligheid)\b/i.test(lower) ||
      /\b(welke\s+kwaliteit|welk[e]?\s+(?:beeld)?kwaliteit|kwaliteit\s+(?:moet|te|worden|behaald|behalen|zien))\b/i.test(lower) ||
      (/\bkwaliteit\b/i.test(lower) && !/\bfilm(?:kwaliteit)?\b/i.test(lower) && /\b(moet|zien|behalen|behaald|nodig|geëist|geeist)\b/i.test(lower))
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

    // Minimale FFD
    const isPuurFfdWaarde = /^(?:minimale\s+)?(?:ffd|sfd|focus)\s*(?:\(\s*\d+|\s*:\s*\d+|\s*=\s*\d+|\s+van\s+\d+|\s+is\s+\d+)/i.test(lower.trim());
    const wilMinFFDBijStraling =
      isStralingstijdVraag &&
      /\b(min\w*|kleinste)\s+(?:de\s+)?(ffd|sfd|focus|afstand|focusafstand)\b|\bals\s+ik.*(min|focus|ffd)\b/i.test(lower) &&
      !/\b(wat\s+is\s+de\s+(?:min\w*\s+)?(?:ffd|focus)\s+en\b)/i.test(lower);
    if (
      (/\b(min(?:imale|imum|\.)?\s*ffd|fmin|f-min|f\s+min|minimale\s+(?:focus|bron[-\s]*film|film[-\s]*focus)?\s*afstand|focus\s*afstand|bron\s*film|welke\s*ffd|wat\s+is\s+de\s+(?:min\s*)?ffd|gekozen\s*ffd|minimale\s+focus|hoeveel\s+focus|welke\s+focus|hoeveel\s+ffd|focus\s+aanhouden)\b/i.test(lower) ||
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
    const isBronVervalVraag =
      /\b(bronverval|verval|halfwaardetijd|halveringstijd)\b/i.test(lower) ||
      (/\b(activiteit|curie|ci)\b/i.test(lower) && /\b(over\s+\d+|na\s+\d+|\d+\s*dagen|\d+\s*weken|\d+\s*maanden|geleden|op\s+\d{1,2}[-\/]\d{1,2})\b/i.test(lower)) ||
      (/\b(over\s+\d+\s*(?:dagen|weken|maanden|jaar)|na\s+\d+\s*(?:dagen|weken|maanden|jaar)|\d+\s*(?:dagen|weken|maanden|jaar)\s+geleden)\b/i.test(lower) &&
        /\b(ci|curie|bron|se-75|ir-192|co-60|97969m|35598p|rr\d+)\b/i.test(lower));
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
  function extractParametersDeterministisch(tekst) {
    const res = {
      diameter: null,
      wanddikte: null,
      sfd: null,
      ofa: null,
      procedure: null,
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
      feMm: 0,
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
    };
    const lower = tekst.toLowerCase();

    // Pipe Schedule herkenning (ASME B36.10M / B36.19M)
    let matchSch = lower.match(/\b(?:schedule|sch|sched)[-\s]*([0-9]{1,3}[a-z]?|std|xs|xxs)\b/i);
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

    // Afzetting parameters
    let matchPb = tekst.match(/(?:lood|pb)\s*(?:afscherming\s*)?(?:van|is|op|:)?\s*(\d+(?:[.,]\d+)?)\s*(?:mm)?/i);
    if (!matchPb) {
      matchPb = tekst.match(/(\d+(?:[.,]\d+)?)\s*(?:mm)?\s*(?:lood|pb)(?:\s*afscherming)?\b/i);
    }
    if (matchPb) res.pbMm = parseFloat(matchPb[1].replace(",", "."));
    if (/\b(zonder\s+(?:lood|pb|afscherming)|geen\s+(?:lood|pb|afscherming)|0\s*mm\s*(?:lood|pb))\b/i.test(lower)) {
      res.pbMm = 0;
      res.feMm = 0;
      res.verzetZonderAfscherming = true;
    }

    const isAfschermingContext =
      /\b(afzetting|afzettingsafstand|afzetten|afzettingszone|afscherming|afschermen|lood|loden|pb|dosis|dosistempo|microsievert|usv|µsv|halveringsdikte|hvl)\b/i.test(lower) ||
      (typeof actiefGespreksGeheugen !== "undefined" && actiefGespreksGeheugen && actiefGespreksGeheugen.laatsteIntentie === "afzetting");
    if (isAfschermingContext) {
      let matchFe = tekst.match(/(?:staal|fe|ijzer)\s*(?:afscherming\s*)?(?:van|is|op|:)?\s*(\d+(?:[.,]\d+)?)\s*(?:mm)?/i);
      if (!matchFe) {
        matchFe = tekst.match(/(\d+(?:[.,]\d+)?)\s*(?:mm)?\s*(?:staal|fe|ijzer)(?:\s*afscherming)?\b/i);
      }
      if (matchFe) res.feMm = parseFloat(matchFe[1].replace(",", "."));

      // Sub-modus detectie (lood_nodig, dosistempo_op_afstand, afzettingsafstand)
      const vraagtLoodNodig =
        /\b(?:hoeveel|welke)\s+(?:mm\s+|millimeter\s+)?(?:lood|loden|pb|afscherming|loodafscherming|extra\s+lood)\b/i.test(lower) ||
        /\b(?:lood|loden|pb|afscherming|loodafscherming)\b.*?\b(?:nodig|gebruiken|vereist|plaatsen|hebben|om\s+(?:op|binnen|onder|een\s+afzetting)|voor\s+\d+\s*(?:meter|m\b))\b/i.test(lower) ||
        /\b(?:nodig|gebruiken|hebben)\b.*?\b(?:lood|loden|pb|afscherming|loodafscherming)\b/i.test(lower) ||
        /\b(?:maximaal|max\.?|binnen|op)\s+\d+(?:[.,]\d+)?\s*(?:meter|m\b)\s*(?:kan\s+)?(?:afzetten|afzetting)\b.*?\b(?:lood|loden|pb|afscherming)\b/i.test(lower);

      const vraagtDosistempo =
        !vraagtLoodNodig &&
        /\b(wat\s+is\s+(?:het|de)\s+dosistempo|hoe\s+hoog\s+is\s+(?:het|de)\s+dosistempo|hoeveel\s+(?:microsievert|usv|µsv)|dosistempo\s+(?:op|bij|achter|daar))\b/i.test(lower);

      const vraagtAfzettingsAfstand =
        !vraagtLoodNodig &&
        !vraagtDosistempo &&
        (/\b(hoe\s+ver.*afzetten|hoe\s+groot.*afzetting|wat\s+(?:is|wordt)\s+de\s+afzetting(?:safstand)?|veilige\s+afzetting|afzetting\s+met\s+\d+\s*(?:mm\s*)?(?:lood|pb|staal))\b/i.test(lower) ||
          (matchPb !== null && !/\b\d+(?:[.,]\d+)?\s*(?:meter|m\b)\b/i.test(lower)));

      if (vraagtLoodNodig) {
        res.afzettingSubModus = "lood_nodig";
      } else if (vraagtDosistempo) {
        res.afzettingSubModus = "dosistempo_op_afstand";
      } else if (vraagtAfzettingsAfstand) {
        res.afzettingSubModus = "afzettingsafstand";
      }

      // Doel-afstand in meter (bijv. "op 15 meter", "afzetting van 15 meter", "maximaal 15 meter afzetten", of los "10 meter" bij vervolgvraag)
      const mDoelM =
        lower.match(/(?:op|bij|binnen|naar|voor|van|maximaal|max\.?|tot)\s*(\d+(?:[.,]\d+)?)\s*(?:meter|m\b)/i) ||
        lower.match(/(\d+(?:[.,]\d+)?)\s*(?:meter|m\b)\s*(?:afzetten|afzetting|afstand)/i) ||
        lower.match(/\b(\d+(?:[.,]\d+)?)\s*(?:meter|m\b)\b/i);
      if (mDoelM) {
        res.afzettingDoelMeter = parseFloat(mDoelM[1].replace(",", "."));
      } else if (
        typeof actiefGespreksGeheugen !== "undefined" &&
        actiefGespreksGeheugen &&
        actiefGespreksGeheugen.verwachtParameter === "afzettingDoelMeter"
      ) {
        const mBareM = lower.match(/^\s*(?:op\s+|bij\s+)?(\d+(?:[.,]\d+)?)\s*(?:meter|m)?\s*$/i);
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

    // FFD / SFD
    const isBundelVraag = lower.includes("bundel") || lower.includes("collimator");
    let matchFfd = tekst.match(/(?:ffd|sfd|focus\s*afstand|film\s*focus\s*afstand|source\s*film\s*distance|bron\s*film)\s*(?:van|is|op|:|\()?\s*(\d+(?:[.,]\d+)?)\s*(mm|cm|meter|m\b)?/i);
    if (!matchFfd) matchFfd = tekst.match(/(?:op\s+)?(\d+(?:[.,]\d+)?)\s*(mm|cm|meter|m\b)?\s*(?:ffd|sfd|focus\s*afstand|film\s*focus\s*afstand|source\s*film\s*distance)\b/i);
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
    let matchTijd = tekst.match(/(?:tijd|begintijd|oude\s*tijd|duurt|is\s+nu|nu\s+op)\s*(?:van|is|:)?\s*(\d+(?:[.,]\d+)?)\s*(?:minuut|minuten|min\b|m\b)\s*(?:en\s*)?(\d{1,2})?\s*(?:seconden?|sec\b|s\b)?/i);
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
      const matchSec = tekst.match(/(?:tijd|begintijd|duurt)?\s*(\d+(?:[.,]\d+)?)\s*(?:seconden?|sec\b)/i);
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
    const matchVanNaar = !matchOpHoeLangOp ? tekst.match(/(?:van|vanuit)\s*(\d+\s*(?:m|meter)\s*\d{1,2}|\d+(?:[.,]\d+)?\s*(?:cm|mm|meter|m\b)?)\s*(?:ffd|sfd|focus)?\s*(?:naar|tot|omhoog\s*naar)\s*(\d+\s*(?:m|meter)\s*\d{1,2}|\d+(?:[.,]\d+)?\s*(?:cm|mm|meter|m\b)?)\s*(?:ffd|sfd|focus)?/i) : null;
    if (matchOpHoeLangOp) {
      res.oudeFocus = parseFocusAfstandCm(matchOpHoeLangOp[1]);
      res.nieuweFocus = parseFocusAfstandCm(matchOpHoeLangOp[2]);
    } else if (matchVanNaar && !(/\bzwarting\b/i.test(tekst) && !/\b(ffd|sfd|focus|cm|mm|meter|m\b)\b/i.test(matchVanNaar[0]))) {
      res.oudeFocus = parseFocusAfstandCm(matchVanNaar[1]);
      res.nieuweFocus = parseFocusAfstandCm(matchVanNaar[2]);
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
      let matchBg = tekst.match(/(?:brongrootte|bron\s*grootte|bron\s*groot|bronafmeting|bron\s*afmeting|focusgrootte|focus\s*grootte|focus\s*groot|focusafmeting|focus\s*afmeting)\s*(?:van|is|op|:)?\s*(\d+(?:[.,]\d+)?)\s*(?:mm)?/i);
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

      if (/smart/i.test(tekst)) {
        res.bronTekst = "Yxlon Smart (1 mm)";
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
      } else if (/yxlon/i.test(tekst)) {
        res.bronTekst = "Yxlon (3 mm)";
        res.brongrootte = 3;
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

    // Veilig getallenvangnet (bronkeuzes isoleren zodat bronmaten nooit als diameter worden gezien)
    if ((res.diameter === null || res.wanddikte === null) && !isBundelVraag && res.sfd === null && res.langsnaadLengte === null && res.oudeFocus === null && res.nieuweFocus === null && res.focusBegintijdSec === null && res.maminVal === null && res.maVal === null) {
      let tZonder = tekst
        .replace(/\b(se-75|se75|ir-192|ir192|co-60|selenium|iridium|balteau|yxlon|smart|rondstraler|rr\d+|\d{5}[a-z]?|d[234578])\b/gi, "")
        .replace(/\bdn\s*[-]?\s*\d+\b/gi, "")
        .replace(/\b\d+(?:[.,]\d+)?\s*(?:mm\s*)?(?:ci|curie|gbq|tbq|usv|µsv|microsievert|pb|fe|lood|staal|isolatie|ma\*min|mamin|ma|milliamp|miliamp)\b/gi, "")
        .replace(/(?:lood|pb|staal|fe|isolatie)\s*(?:van|is|op|:)?\s*\d+(?:[.,]\d+)?\s*(?:mm)?/gi, "");
      if (res.brongrootte !== null && res.brongrootte !== undefined) {
        tZonder = tZonder.replace(new RegExp(`\\b${String(res.brongrootte).replace(".", "[.,]")}\\s*(?:mm)?\\b`, "gi"), "");
      }
      const bevatDiaTerm = /\b(diameter|buis|pijp|leiding|rondnaad|duim|duims|duimer|\bde\b|\bdn\b|wanddikte|dikte|dik)\b/i.test(tekst);
      const isPuurBron = Boolean(res.bronTekst) && !bevatDiaTerm;
      const isAfscherming = (res.pbMm > 0 || res.feMm > 0 || res.isolatieMm > 0) && !bevatDiaTerm;

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

    // Schedule koppeling: als schedule & diameter bekend zijn, zoek wanddikte op
    if (res.schedule && res.diameter) {
      const schInfo = zoekScheduleInfo(res.diameter, res.schedule);
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

  // --- Rekenmodules ---

  // 1. Afzetting Gamma (afzettinggamma.html)
  function berekenAfzetting(params, vraagTekst, chips = []) {
    const lower = (vraagTekst || "").toLowerCase();

    // Specifieke vraag naar halveringsdikte (HVL) van lood / staal voor Ir-192 en Se-75
    if (/\b(halveringsdikte|halveringsdiktes|hvl)\b/i.test(lower)) {
      if (chips) chips.push("Afzetting Ir-192", "Afzetting Se-75", "6 mm lood");
      return (
        `<strong>Halveringsdiktes (HVL) voor afscherming (conform <a href="afzettinggamma.html" class="ai-link" target="_blank">afzettinggamma.html</a>):</strong><br>` +
        `• <strong>Iridium-192 (Ir-192):</strong> <strong>3 mm lood (Pb)</strong> (en <strong>13 mm staal (Fe)</strong>).<br>` +
        `• <strong>Seleen-75 (Se-75):</strong> <strong>2 mm lood (Pb)</strong> (en <strong>5 mm staal (Fe)</strong>).`
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
    const dosis = params.dosisGrens || 10;

    const k = isIr ? 0.13 : 0.054;
    const hvlPb = isIr ? 3 : 2;
    const hvlFe = isIr ? 13 : 5;
    const collimatorFactor = isIr ? 0.012 : 0.05; // Ir: 1/85, Se: 1/20

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

    const mAfstInline =
      lower.match(/(?:op|bij|binnen|naar|voor|van|maximaal|max\.?|tot)\s*(\d+(?:[.,]\d+)?)\s*(?:meter|m\b)/i) ||
      lower.match(/(\d+(?:[.,]\d+)?)\s*(?:meter|m\b)\s*(?:afzetten|afzetting|afstand)/i) ||
      lower.match(/\b(\d+(?:[.,]\d+)?)\s*(?:meter|m\b)\b/i);
    const doelM = mAfstInline
      ? parseFloat(mAfstInline[1].replace(",", "."))
      : (params.afzettingDoelMeter || (params.sfd && params.sfd >= 1000 ? params.sfd / 1000 : null));

    if (doelM && doelM > 0 && typeof actiefGespreksGeheugen !== "undefined" && actiefGespreksGeheugen) {
      actiefGespreksGeheugen.afzettingDoelMeter = doelM;
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
      const atten = Math.pow(0.5, pb / hvlPb) * Math.pow(0.5, fe / hvlFe);
      const dtOpen = (ci * 37000 * k * atten) / (doelM * doelM);
      const dtCollimator = dtOpen * collimatorFactor;
      const afschermTxt = pb > 0 || fe > 0
        ? ` met ${pb > 0 ? pb + " mm lood" : ""}${pb > 0 && fe > 0 ? " en " : ""}${fe > 0 ? fe + " mm staal" : ""}`
        : " zonder afscherming";
      if (chips && chips.length === 0) {
        chips.push(`Hoeveel lood nodig op ${doelM} meter`, "Op 10 meter", "Op 15 meter", isIr ? "Sterkste Se-75" : "Sterkste Ir-192");
      }
      return (
        `Dosistempo op <strong>${doelM} meter</strong> afstand bij <strong>${ci.toFixed(1)} Curie ${bronType}</strong>${bronNaam}${afschermTxt}:<br>` +
        `• In de open bundel: <strong>${dtOpen.toFixed(1)} μSv/uur</strong> (${(dtOpen / 1000).toFixed(2)} mSv/uur).<br>` +
        `• Achter een standaard collimator: <strong>${dtCollimator.toFixed(1)} μSv/uur</strong>.<br>` +
        `<small style="opacity:0.85;">(Berekend met de omgevormde formule uit <a href="afzettinggamma.html" class="ai-link" target="_blank">afzettinggamma.html</a>: <span class="rt-math-inline"><i>D</i> = <span class="rt-math-frac"><span class="rt-math-num">Ci &times; 37000 &times; <i>k</i></span><span class="rt-math-den"><i>R</i><sup>2</sup></span></span></span>).</small>`
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
      const onafgeschermdOpen = Math.sqrt((ci * 37000 * k) / dosis);
      const collimatorAfst = Math.sqrt((ci * 37000 * k * collimatorFactor) / dosis);
      const verhoudingOpen = (ci * 37000 * k) / (doelM * doelM * dosis);
      const benodigdPbOpen = verhoudingOpen > 1 ? hvlPb * Math.log2(verhoudingOpen) : 0;
      const verhoudingColl = (ci * 37000 * k * collimatorFactor) / (doelM * doelM * dosis);
      const benodigdPbColl = verhoudingColl > 1 ? hvlPb * Math.log2(verhoudingColl) : 0;

      const pbOpenCeil = benodigdPbOpen > 0 ? Math.ceil(benodigdPbOpen) : 0;
      const pbCollCeil = benodigdPbColl > 0 ? Math.ceil(benodigdPbColl) : 0;

      if (chips && chips.length === 0) {
        chips.push("Op 8 meter", "Op 10 meter", "Op 15 meter", isIr ? "Sterkste Se-75" : "Sterkste Ir-192", `Dosistempo op ${doelM} meter`);
      }

      let loodResp = `Om bij <strong>${ci.toFixed(1)} Curie ${bronType}</strong>${bronNaam} op een afzettingsafstand van <strong>${doelM} meter</strong> (bij ${dosis} μSv/h) uit te komen (halveringsdikte lood HVL = ${hvlPb} mm):<br>` +
        `• <strong>In de open bundel (richting van de bundel):</strong> <strong>${pbOpenCeil} mm lood</strong> nodig (reduceert de open bundel van ${onafgeschermdOpen.toFixed(1)} m naar &le; ${doelM} m).<br>`;
      if (pbCollCeil <= 0) {
        loodResp += `• <strong>Achter een standaard collimator:</strong> <strong>0 mm extra lood</strong> nodig (de afzettingsafstand achter de collimator is al <strong>${collimatorAfst.toFixed(1)} meter</strong> &le; ${doelM} m).<br>`;
      } else {
        loodResp += `• <strong>Achter een standaard collimator:</strong> nog <strong>${pbCollCeil} mm extra lood</strong> nodig (reduceert van ${collimatorAfst.toFixed(1)} m naar &le; ${doelM} m).<br>`;
      }
      loodResp += `<small style="opacity:0.85;">(Berekend met de omgevormde formule uit <a href="afzettinggamma.html" class="ai-link" target="_blank">afzettinggamma.html</a>).</small>`;
      return loodResp;
    }

    // 1. In de open bundel (zonder stalen leidingafscherming, tenzij expliciet Pb opgegeven)
    const attenOpen = Math.pow(0.5, pb / hvlPb) * Math.pow(0.5, fe / hvlFe);
    const afzettingOpen = Math.sqrt((ci * 37000 * k * attenOpen) / dosis);

    // 2. Achter een standaard collimator
    const collimatorAfstand = Math.sqrt((ci * 37000 * k * collimatorFactor) / dosis);

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

    let afzettingPijp = 0;
    if (doorstraaldStaal > 0) {
      const attenPijp = Math.pow(0.5, pb / hvlPb) * Math.pow(0.5, (fe + doorstraaldStaal) / hvlFe);
      afzettingPijp = Math.sqrt((ci * 37000 * k * attenPijp) / dosis);
    }

    const diaLabel = params.diameter ? formatMmNaarDuimLabel(params.diameter) : "";
    const afschermingInfo = pb > 0 || fe > 0
      ? ` met ${pb > 0 ? pb + " mm lood (Pb)" : ""}${pb > 0 && fe > 0 ? " en " : ""}${fe > 0 ? fe + " mm staal (Fe)" : ""}`
      : "";
    const openBundelAfschermHaakjes = pb > 0 || fe > 0
      ? ` (incl. ${pb > 0 ? pb + " mm lood" : ""}${pb > 0 && fe > 0 ? " en " : ""}${fe > 0 ? fe + " mm staal" : ""} afscherming)`
      : (/zonder\s+collimator/i.test(lower) ? " (zonder collimator)" : "");

    if (chips && chips.length === 0) {
      if (doorstraaldStaal === 0 && isLeidingContext) {
        chips.push("6 mm wand", "8 mm wand", "10 mm wand");
      }
      if (isSe) chips.push("Ir-192");
      else chips.push("Se-75");
      if (pb === 0) chips.push("5 mm lood");
    }

    let resp = `Voor een ${bronType} bron van ${ci.toFixed(1)} Curie${bronNaam}${afschermingInfo} bij norm ${dosis} μSv/h:<br>` +
               `• In de open bundel${openBundelAfschermHaakjes}: <strong>${afzettingOpen.toFixed(1)} meter</strong> afzetting.<br>` +
               `• Achter een standaard collimator: <strong>${collimatorAfstand.toFixed(1)} meter</strong>.<br>`;

    if (doorstraaldStaal > 0) {
      const detailLabel = diaLabel ? ` op ${diaLabel}` : (isDwsiTechniek ? " DWSI" : "");
      resp += `• In de bundel achter de pijp (doorstraalde dikte: ${doorstraaldStaal.toFixed(1)} mm staal${detailLabel}): <strong>${afzettingPijp.toFixed(1)} meter</strong> afzetting.<br>`;
    } else if (isLeidingContext && !params.wanddikte) {
      const detailLabel = diaLabel ? ` op ${diaLabel}` : " (DWSI)";
      resp += `• In de bundel achter de pijp${detailLabel}: geef de wanddikte op om ook direct de gereduceerde afzetting met de doorstraalde leidingdikte als afscherming te berekenen.<br>`;
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
                 `• <strong>Minimale FFD: ${ffdAfgerond} mm</strong> (${(ffdAfgerond / 10).toFixed(1)} cm).<br>` +
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
        const maxWmaxTabel = {
          ta: { "Se-75": 55, "Ir-192": 80, "Co-60": 120 },
          tb: { "Se-75": 40, "Ir-192": 60, "Co-60": 85 }
        };
        const isIrGekozen = /\b(iridium|ir-?192)\b/i.test(lower) || (params.bronTekst && params.bronTekst.includes("Ir-192")) || params.bronType === "Ir192";
        const isSeGekozen = /\b(selenium|se-?75)\b/i.test(lower) || (params.bronTekst && params.bronTekst.includes("Se-75")) || params.bronType === "Se75";
        const isCoGekozen = /\b(kobalt|co-?60)\b/i.test(lower) || (params.bronTekst && params.bronTekst.includes("Co-60")) || params.bronType === "Co60";

        let extraWaarschuwing = "";
        if (isIrGekozen && !bronnen.includes("Ir-192")) {
          const maxIr = maxWmaxTabel[wmaxKlasse]["Ir-192"];
          extraWaarschuwing = `<br>• ❌ <strong>Let op:</strong> <strong>Ir-192 (Iridium)</strong> is NIET geschikt/toegestaan voor deze wanddikte! De berekende doorstraalde wanddikte Wmax is <strong>${wmax.toFixed(1)} mm</strong> (maximaal toelaatbaar voor Ir-192 is <strong>${maxIr} mm</strong> voor Klasse ${wmaxKlasse.toUpperCase()} volgens Tabel 1 RT21021 / RT21022).`;
        } else if (isSeGekozen && !bronnen.includes("Se-75")) {
          const maxSe = maxWmaxTabel[wmaxKlasse]["Se-75"];
          extraWaarschuwing = `<br>• ❌ <strong>Let op:</strong> <strong>Se-75 (Selenium)</strong> is NIET geschikt/toegestaan voor deze wanddikte! De berekende doorstraalde wanddikte Wmax is <strong>${wmax.toFixed(1)} mm</strong> (maximaal toelaatbaar voor Se-75 is <strong>${maxSe} mm</strong> voor Klasse ${wmaxKlasse.toUpperCase()} volgens Tabel 1 RT21021 / RT21022).`;
        } else if (isCoGekozen && !bronnen.includes("Co-60")) {
          const maxCo = maxWmaxTabel[wmaxKlasse]["Co-60"];
          extraWaarschuwing = `<br>• ❌ <strong>Let op:</strong> <strong>Co-60 (Kobalt)</strong> is NIET geschikt voor deze wanddikte! De berekende doorstraalde wanddikte Wmax is <strong>${wmax.toFixed(1)} mm</strong> (max. <strong>${maxCo} mm</strong> voor Klasse ${wmaxKlasse.toUpperCase()}).`;
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
    const wilIridium = /\b(iridium|ir-?192)\b/i.test(lower) || (params.bronTekst && params.bronTekst.includes("Ir-192"));
    const wilSelenium = /\b(selenium|se-?75)\b/i.test(lower) || (params.bronTekst && params.bronTekst.includes("Se-75"));
    const wilKobalt = /\b(kobalt|co-?60)\b/i.test(lower) || (params.bronTekst && params.bronTekst.includes("Co-60"));
    const isWmaxVraag = /\b(wmax|w-max|wat\s+is\s+de\s+w)\b/i.test(lower);

    const maxWmaxTabel = {
      ta: { "Se-75": 55, "Ir-192": 80, "Co-60": 120 },
      tb: { "Se-75": 40, "Ir-192": 60, "Co-60": 85 }
    };
    const maxIr = maxWmaxTabel[effectiveKlasse]["Ir-192"];
    const maxSe = maxWmaxTabel[effectiveKlasse]["Se-75"];
    const maxCo = maxWmaxTabel[effectiveKlasse]["Co-60"];

    if (wilIridium) {
      if (bronnen.includes("Ir-192")) {
        regels.push(`✅ <strong>Ja, Ir-192 (Iridium) is toegestaan/geschikt!</strong> (Wmax = <strong>${wmax.toFixed(1)} mm</strong> &le; max toelaatbaar <strong>${maxIr} mm</strong> voor Klasse ${effectiveKlasse.toUpperCase()} conform Tabel 1 / <a href="bronkeuze2.html" class="ai-link" target="_blank">bronkeuze2.html</a>).`);
      } else {
        regels.push(`❌ <strong>Nee, Ir-192 (Iridium) is NIET geschikt/toegestaan voor deze onstream opname!</strong> De berekende doorstraalde wanddikte Wmax is <strong>${wmax.toFixed(1)} mm</strong> (maximaal toelaatbaar voor Ir-192 is <strong>${maxIr} mm</strong> voor Klasse ${effectiveKlasse.toUpperCase()} volgens Tabel 1 RT21021 / RT21022 / <a href="bronkeuze2.html" class="ai-link" target="_blank">bronkeuze2.html</a>).`);
      }
    } else if (wilSelenium) {
      if (bronnen.includes("Se-75")) {
        regels.push(`✅ <strong>Ja, Se-75 (Selenium) is toegestaan/geschikt!</strong> (Wmax = <strong>${wmax.toFixed(1)} mm</strong> &le; max toelaatbaar <strong>${maxSe} mm</strong> voor Klasse ${effectiveKlasse.toUpperCase()} conform Tabel 1 / <a href="bronkeuze2.html" class="ai-link" target="_blank">bronkeuze2.html</a>).`);
      } else {
        regels.push(`❌ <strong>Nee, Se-75 (Selenium) is NIET geschikt/toegestaan voor deze onstream opname!</strong> De berekende doorstraalde wanddikte Wmax is <strong>${wmax.toFixed(1)} mm</strong> (maximaal toelaatbaar voor Se-75 is <strong>${maxSe} mm</strong> voor Klasse ${effectiveKlasse.toUpperCase()} volgens Tabel 1 RT21021 / RT21022 / <a href="bronkeuze2.html" class="ai-link" target="_blank">bronkeuze2.html</a>).`);
      }
    } else if (wilKobalt) {
      if (bronnen.includes("Co-60")) {
        regels.push(`✅ <strong>Ja, Co-60 (Kobalt) is toegestaan/geschikt!</strong> (Wmax = <strong>${wmax.toFixed(1)} mm</strong> &le; max toelaatbaar <strong>${maxCo} mm</strong> voor Klasse ${effectiveKlasse.toUpperCase()} conform Tabel 1).`);
      } else {
        regels.push(`❌ <strong>Nee, Co-60 (Kobalt) is NIET geschikt voor deze onstream opname!</strong> De doorstraalde wanddikte Wmax is <strong>${wmax.toFixed(1)} mm</strong> (boven de maximale grenswaarde van <strong>${maxCo} mm</strong> voor Klasse ${effectiveKlasse.toUpperCase()} volgens Tabel 1).`);
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
          `• Minimale FFD tangentiaal (${effectiveKlasse.toUpperCase()} met brongrootte ${b} mm${Iso > 0 ? `, ${Iso} mm isolatie` : " (ongeïsoleerd)"}): <strong>${Math.round(minFFD)} mm</strong> (PDD: ${PDD.toFixed(1)} mm).`
        );
      } else if (isDWSI) {
        ffdOnscherpte = (b * OFD) / (effectiveKlasse === "tb" ? 0.3 : 0.6);
        ffdFysiek = De + 2 * Iso;
        minFFD = Math.max(ffdOnscherpte, ffdFysiek);
        regels.push(
          `• Minimale FFD dubbelwand DWSI (${effectiveKlasse.toUpperCase()} met brongrootte ${b} mm en wand ${t} mm): <strong>${Math.round(minFFD)} mm</strong> (OFD: ${OFD.toFixed(1)} mm vanaf binnenwand filmzijde).`
        );
      } else {
        minFFD = (b * OFD) / (effectiveKlasse === "tb" ? 0.3 : 0.6);
        regels.push(
          `• Minimale FFD dubbelwand DWDI (${effectiveKlasse.toUpperCase()} met brongrootte ${b} mm${Iso > 0 ? `, ${Iso} mm isolatie` : " (ongeïsoleerd)"}): <strong>${Math.round(minFFD)} mm</strong> (OFD: ${OFD.toFixed(1)} mm).`
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
    const isKlasseB = /\b(klasse\s*b|en[-\s]?b|rt21013|sabic|sitech)\b/i.test(lower) || params.procedure === "EN-B";
    const isKlasseA = /\b(klasse\s*a|en[-\s]?a)\b/i.test(lower) || params.procedure === "EN-A";
    const isAsme = /\basme\b/i.test(lower) || params.procedure === "ASME";

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

  // 3b. Minimale FFD Berekening (Numeriek)
  function bepaalNumeriekeMinFFD(params, vraagTekst = "") {
    const lower = (vraagTekst || "").toLowerCase();
    const De = params.diameter;
    const isCentraal = /\b(centraal|panoram|panoramisch|rondstraler|rondstralen)\b/i.test(lower) || params.optie === "1";
    const isExcentrisch = /\bexcentrisch/i.test(lower) || params.optie === "2";
    const isDWDI =
      (De && De < 100 && !isCentraal && !isExcentrisch) ||
      params.technique === "DWDI" ||
      /\b(dwdi|ovaal|ovaaltje|verzet)\b/i.test(lower);

    let ofa = 0;
    if (isDWDI && De) {
      ofa = De;
    } else {
      if (!params.wanddikte) return null;
      ofa = params.wanddikte;
    }

    if (!params.brongrootte || !params.procedure) return null;

    const b = params.brongrootte;
    const proc = params.procedure;
    let factor = proc === "EN-A" ? 7.5 : 15;
    let minFfd = 0;

    if (proc === "ASME") {
      if (ofa < 50) minFfd = (b * ofa) / 0.51 + ofa;
      else if (ofa < 75) minFfd = (b * ofa) / 0.76 + ofa;
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

  // 3b-2. Minimale FFD Waarschuwing voor Lasonderzoek (achtergrondcontrole)
  function geefMinFFDWaarschuwing(params, vraagTekst = "") {
    if (!params.sfd) return "";
    const minFfd = bepaalNumeriekeMinFFD(params, vraagTekst);
    if (!minFfd || params.sfd >= minFfd) return "";

    const sfdCm = (params.sfd / 10).toFixed(1);
    const minCm = (minFfd / 10).toFixed(1);
    const proc = params.procedure || "de norm";
    const bgStr = params.brongrootte ? `brongrootte ${params.brongrootte} mm` : "";
    const wtStr = params.wanddikte ? `wanddikte ${params.wanddikte} mm` : "";
    const details = [bgStr, wtStr].filter(Boolean).join(" en ");

    return (
      `<div class="rt-ai-warning-box" style="background: rgba(255, 75, 75, 0.15); border-left: 4px solid #ff4b4b; padding: 10px 14px; margin: 10px 0; border-radius: 6px; color: #ffcccc; font-size: 0.95rem; line-height: 1.5;">` +
      `⚠️ <strong>Waarschuwing: Minimale FFD onderschreden!</strong><br>` +
      `De gekozen focus van <strong>${params.sfd} mm (${sfdCm} cm)</strong> is <u>kleiner</u> dan de normatieve minimale FFD van <strong>${minFfd} mm (${minCm} cm)</strong> volgens <strong>${proc}</strong>${details ? ` (${details})` : ""}.<br>` +
      `<small style="opacity: 0.9; display: block; margin-top: 4px;">Hierdoor wordt de maximaal toelaatbare geometrische onscherpte (U<sub>g</sub>) overschreden en voldoet de opname <strong>niet</strong> aan de normatieve eisen van EN ISO 17636-1 / ASME.</small>` +
      `</div>`
    );
  }

  // 3c. Voorgestelde FFD Berekening (Conform getPrefilledFFD() in pruts.html)
  // Bij DWSI opstelling (bron buiten) stelt pruts.html een praktische FFD voor:
  // - Gammabron (Se-75 / Ir-192): diameter + 15 mm
  // - Röntgenbuis (X-ray): diameter + 150 mm
  // Altijd minimaal gelijk aan de normatieve minFFD
  function bepaalVoorgesteldeFFD(params, vraagTekst = "") {
    const De = params.diameter;
    if (!De || isNaN(De) || De <= 0) return null;

    const lower = (vraagTekst || "").toLowerCase();
    const isCentraal = /\b(centraal|panoram|panoramisch|rondstraler|rondstralen)\b/i.test(lower) || params.optie === "1";
    const isExcentrisch = /\bexcentrisch/i.test(lower) || params.optie === "2";
    if (isCentraal || isExcentrisch) return null;

    const isDWDI =
      (De < 100 && params.technique !== "DWSI" && !lower.includes("dwsi")) ||
      params.technique === "DWDI" ||
      /\b(dwdi|ovaal|ovaaltje|verzet)\b/i.test(lower);
    if (isDWDI) return null;

    // DWSI techniek (bron buiten)
    let candidate = 0;
    const isXray =
      (params.bronTekst && /x[-\s]?ray|rontgen|röntgen|buis/i.test(params.bronTekst)) ||
      params.bronType === "X-ray" ||
      /\b(x[-\s]?ray|rontgen|röntgen)\b/i.test(lower);

    if (isXray) {
      candidate = Math.round(De + 150);
    } else {
      // Standaard gammabron (Se-75 / Ir-192 / Co-60)
      candidate = Math.round(De + 15);
    }

    const minFfd = bepaalNumeriekeMinFFD(params, vraagTekst);
    if (minFfd) {
      return Math.max(minFfd, candidate);
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
      (/\b(x[-\s]?ray|rontgen|röntgen|röntgenbuis|rontgenbuis)\b/i.test(vraagTekst) ||
        params.bronType === "X-ray" ||
        (params.bronTekst && /x[-\s]?ray|rontgen|röntgen/i.test(params.bronTekst)));
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
      if (chips) chips.push("4 mm dik", "6 mm dik", "8 mm dik");
      return "Wat is de <strong>wanddikte</strong> (of doorstraalde dikte in mm) van het materiaal?";
    }
    const wt = params.wanddikte || (params.doorstraaldeDikte ? (params.technique === "SWSI" ? params.doorstraaldeDikte : params.doorstraaldeDikte / 2) : 0);

    const isCentraal = params.optie === "1" || /\b(centraal|panoram|panoramisch|rondstraler|rondstralen)\b/i.test(vraagTekst);
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
      const berekendeMin = bepaalNumeriekeMinFFD(params, vraagTekst);
      const voorgesteldeFFD = !params.isOnstream ? bepaalVoorgesteldeFFD(params, vraagTekst) : null;

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
          if (voorgesteldeFFD && (!berekendeMin || voorgesteldeFFD !== berekendeMin)) {
            chips.push(`Voorgestelde FFD (${voorgesteldeFFD} mm)`);
          }
          if (berekendeMin) chips.push(`Minimale FFD (${berekendeMin} mm)`);
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
    const tech = params.technique || (params.diameter && params.diameter < 100 ? "DWDI" : "DWSI");
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
    if (!doorstr) {
      doorstr = tech === "SWSI" ? wt : 2 * wt;
    }
    const comp = tech === "DWDI" ? 4 : 5;

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
      const m = Math.floor(minutenDecimaal);
      const s = Math.round((minutenDecimaal - m) * 60);
      if (m === 0) return `${s} seconden`;
      const mStr = m === 1 ? "1 minuut" : `${m} minuten`;
      if (s === 0) return mStr;
      return `${mStr} en ${s} seconden`;
    }

    const isKlasseB =
      params.procedure === "EN-B" ||
      (typeof params.procedure === "string" && /klasse\s*b/i.test(params.procedure)) ||
      params.onstreamKlasse === "tb" ||
      /\b(klasse\s*b|en[-\s]?b)\b/i.test(vraagTekst) ||
      (typeof actiefGespreksGeheugen !== "undefined" &&
        actiefGespreksGeheugen &&
        (actiefGespreksGeheugen.procedure === "EN-B" || actiefGespreksGeheugen.onstreamKlasse === "tb"));

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

    let resp = `Stralingstijd (doorstraalde dikte: ${doorstr.toFixed(1)} mm${gevuldExtra}${tech === "DWDI" ? " + 4 compensatie" : ""}, ${bronNaam} van ${ci.toFixed(1)} Curie, ${ffdLabel})${matExtra}:<br>`;

    if (explicieteFilm === "D4") {
      resp += `• D4: <strong>${formatTijd(time_d4)}</strong><br>`;
    } else if (explicieteFilm === "D5") {
      resp += `• D5: <strong>${formatTijd(time_d5)}</strong><br>`;
    } else if (explicieteFilm === "D7") {
      resp += `• D7: <strong>${formatTijd(time_d7)}</strong><br>`;
      if (isKlasseB) {
        resp += `<small style="color:#ffb4b4;">⚠️ Let op: D7 is niet toegestaan volgens EN ISO 17636-1 Klasse B (D4: ${formatTijd(time_d4)}, D5: ${formatTijd(time_d5)}).</small><br>`;
      }
    } else {
      resp += `• D4: <strong>${formatTijd(time_d4)}</strong><br>` +
              `• D5: <strong>${formatTijd(time_d5)}</strong><br>`;
      if (!isKlasseB) {
        resp += `• D7: <strong>${formatTijd(time_d7)}</strong><br>`;
      } else {
        resp += `<small style="opacity: 0.85;">(D7 is weggelaten: niet toegestaan volgens EN ISO 17636-1 Klasse B).</small><br>`;
      }
    }
    if (isVoorgesteldeFFDGebruikt) {
      resp += `<small style="color:#F5DF4D;">ℹ️ <em>Let op: berekend op basis van de <strong>voorgestelde FFD (${sfd} mm)</strong> voor een gammabron op de buis. Geef gerust een andere FFD op indien gewenst.</em></small><br>`;
    }

    if (heeftAfwijkendMateriaal) {
      resp += `<small style="opacity: 0.85;">(Tijd is gecorrigeerd met materiaalfactor <strong>${matFactor.toFixed(2)}</strong> voor ${matNaam || "afwijkend materiaal"} bij ${isoLabel} volgens <a href="stralingstijd.html" class="ai-link" target="_blank">stralingstijd.html</a>).</small><br>`;
    } else {
      resp += `<small style="opacity: 0.85;">(Berekend volgens <a href="stralingstijd.html" class="ai-link" target="_blank">stralingstijd.html</a>).</small>`;
    }

    const berekendeMinFFD = (params.brongrootte || params.bronTekst) ? bepaalNumeriekeMinFFD(params, vraagTekst) : null;
    if (berekendeMinFFD && sfd < berekendeMinFFD) {
      const factorMin = Math.pow(berekendeMinFFD / sfd, 2);
      const timeMinD4 = time_d4 * factorMin;
      const timeMinD5 = time_d5 * factorMin;
      resp += `<br><small style="color: #ffb4b4; display: block; margin-top: 6px;"><em>Ter vergelijking bij normatieve min. FFD van ${berekendeMinFFD} mm (${(berekendeMinFFD / 10).toFixed(1)} cm):</em> D4: <strong>${formatTijd(timeMinD4)}</strong>, D5: <strong>${formatTijd(timeMinD5)}</strong>.</small>`;
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

    // 1. Diameter < 100 mm (DWDI - Dubbelwand Dubbelbeeld)
    if (De < 100) {
      if (params.wanddikte && params.wanddikte > 8) {
        return `Voor ${diaLabel} met een wanddikte van <strong>${params.wanddikte} mm</strong> (&gt; 8 mm):<br>` +
               `• Ovaaltjes schieten (opstelling 11 / F) is <strong>niet toegestaan</strong> boven 8 mm wanddikte.<br>` +
               `• Vereist: <strong>3 opnames onder 60° of 120°</strong> recht door de las (<strong>Opstelling 12 / G, superpositie</strong>).`;
      }
      return `Voor ${diaLabel} (diameter &lt; 100 mm via DWDI):<br>` +
             `• <strong>2 opnames onder 90°</strong> als ovaaltjes worden geschoten (opstelling 11 / F, mits wanddikte &le; 8 mm en lasbreedte &le; ${(De / 4).toFixed(1)} mm).<br>` +
             `• <strong>3 opnames onder 60° of 120°</strong> als er recht door de las (opstelling 12 / G, superpositie) wordt geschoten.`;
    }

    // 2. Centrale / Panoramische opstelling (SWSI / rondstraler)
    const isCentraal = /\b(centraal|panoram|panoramisch|rondstraler|rondstralen)\b/i.test(lower) || params.optie === "1";
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
      return `Voor ${diaLabel} bij een <strong>centrale (panoramische) opstelling</strong>:<br>` +
             `• Omtrek: <strong>${omtrekCm} cm</strong>.<br>` +
             `• <strong>1 opname (360° panoramisch)</strong> met <strong>${f48} film(s) van 10x48 cm</strong>${film10x40Tekst}.`;
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
    let isVoorgesteldeFFDGebruikt = false;
    if (!params.sfd && params.technique === "DWSI" && params.wanddikte && params.procedure && voorgesteldeFFD) {
      params.sfd = voorgesteldeFFD;
      isVoorgesteldeFFDGebruikt = true;
    }

    const ontbrekend = [];
    if (!params.wanddikte) ontbrekend.push("wanddikte");
    if (!params.procedure) ontbrekend.push("procedure");
    if (!params.sfd) ontbrekend.push("sfd");

    if (ontbrekend.length > 0) {
      if (typeof actiefGespreksGeheugen !== "undefined" && actiefGespreksGeheugen) {
        actiefGespreksGeheugen.verwachtParameter = ontbrekend[0];
      }
      const berekendeMin = (params.wanddikte && params.procedure && (params.brongrootte || params.bronTekst))
        ? bepaalNumeriekeMinFFD(params, vraagTekst)
        : null;

      if (ontbrekend.length === 1 && ontbrekend[0] === "sfd") {
        if (chips) {
          if (voorgesteldeFFD && (!berekendeMin || voorgesteldeFFD !== berekendeMin)) {
            chips.push(`Voorgestelde FFD (${voorgesteldeFFD} mm)`);
          }
          if (berekendeMin) chips.push(`Minimale FFD (${berekendeMin} mm)`);
          chips.push("Centraal / panoramisch", "500 mm FFD", "600 mm FFD");
        }
        const hints = [];
        if (voorgesteldeFFD) hints.push(`voorgestelde FFD op basis van opstelling: <strong>${voorgesteldeFFD} mm</strong>`);
        if (berekendeMin) hints.push(`minimale FFD volgens de norm: <strong>${berekendeMin} mm</strong>`);
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
        if (!params.sfd && voorgesteldeFFD) chips.push(`Voorgestelde FFD (${voorgesteldeFFD} mm)`);
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

    const opstellingTekst = params.opstelling || (techniek === "SWSI" && params.optie === "2" ? "SWSI excentrisch (opstelling 8/B)" : (techniek === "SWSI" ? "SWSI (opstelling 2/C)" : "DWSI, bron buiten"));
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
    const isCentraal = /\b(centraal|panoram|panoramisch|rondstraler|rondstralen|opstelling\s*5)\b/i.test(lower) || params.optie === "1";
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
          if (!params.brongrootte) chips.push(...geefBrongrootteSuggestieChips(params.bronTekst));
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
        minFfd = ((b * t) / 0.51) + t;
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
          if (!params.brongrootte) chips.push(...geefBrongrootteSuggestieChips(params.bronTekst));
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
        minFfd = ((b * t) / 0.51) + t;
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
    const d = isDWDI && De ? De : params.wanddikte;

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
    const De = params.diameter;
    const diaLabel = De ? formatMmNaarDuimLabel(De) : "vlakke plaat";
    const isCentraal = /\b(centraal|panoram|panoramisch|rondstraler|rondstralen)\b/i.test(lower) || params.optie === "1";
    const isExcentrisch = /\bexcentrisch/i.test(lower) || params.optie === "2";
    const isDWDI = (De && De < 100 && !isCentraal && !isExcentrisch) || params.technique === "DWDI" || /\b(dwdi|ovaal|ovaaltje|verzet)\b/i.test(lower);

    let ofa = 0;
    if (isDWDI && De) {
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

    if (!params.brongrootte) {
      if (typeof actiefGespreksGeheugen !== "undefined" && actiefGespreksGeheugen) {
        actiefGespreksGeheugen.verwachtParameter = "brongrootte";
      }
      if (chips) chips.push(...geefBrongrootteSuggestieChips(params.bronTekst));
      return `Welke <strong>brongrootte</strong> (focusafmeting in mm) heeft de bron of buis?`;
    }
    const b = params.brongrootte;

    if (!params.procedure) {
      if (typeof actiefGespreksGeheugen !== "undefined" && actiefGespreksGeheugen) {
        actiefGespreksGeheugen.verwachtParameter = "procedure";
      }
      if (chips) chips.push("Klasse B", "Klasse A", "ASME");
      return `Volgens welke <strong>procedure of kwaliteitsklasse</strong> (EN Klasse A, EN Klasse B of ASME) moet de minimale FFD worden berekend?`;
    }
    const proc = params.procedure;

    let opstellingNaam = params.opstelling || (isDWDI ? "DWDI (dubbelwand dubbelbeeld, OFA = diameter)" : "DWSI (bron buiten)");
    if (proc === "ASME") {
      opstellingNaam = isDWDI ? "ASME Section V (DWDI, OFA = diameter)" : "ASME Section V";
    } else if (isCentraal) {
      opstellingNaam = "opstelling 5/A (centraal)";
    } else if (isExcentrisch) {
      opstellingNaam = "opstelling 8/B (excentrisch)";
    }
    const minFfd = bepaalNumeriekeMinFFD(params, vraagTekst);
    const voorgesteldeFFD = bepaalVoorgesteldeFFD(params, vraagTekst);
    const detailInfo = isDWDI ? `diameter ${De} mm (OFA)` : `wanddikte ${ofa} mm`;

    const vraagtBronOpPijp = /\bbron\s+op\s+de\s+(?:pijp|buis|leiding)\b/i.test(lower);
    let prefix = "";
    if (vraagtBronOpPijp && De) {
      const ffdOpPijp = voorgesteldeFFD || De;
      if (ffdOpPijp >= minFfd) {
        prefix = `✅ <strong>Ja, je kunt met de bron op de pijp zitten!</strong> De voorgestelde FFD op de pijp (<strong>${ffdOpPijp} mm</strong>) is namelijk ruimschoots groter dan de minimaal vereiste FFD (<strong>${minFfd} mm</strong>).<br><br>`;
      } else {
        prefix = `❌ <strong>Nee, je kunt NIET met de bron direct op de pijp zitten!</strong> De FFD op de pijp (<strong>${ffdOpPijp} mm</strong>) is kleiner dan de minimaal vereiste FFD (<strong>${minFfd} mm</strong>); je moet dus afstand houden.<br><br>`;
      }
    }

    let res = `${prefix}Minimale Film-Focus Afstand (FFD) volgens ${proc} (${opstellingNaam}) voor ${detailInfo} en brongrootte ${b} mm:<br>• <strong>min. ${minFfd} mm</strong> (${(minFfd / 10).toFixed(1)} cm).`;

    if (voorgesteldeFFD && voorgesteldeFFD > minFfd) {
      res += `<br>• Voorgestelde FFD voor opstelling: <strong>${voorgesteldeFFD} mm</strong> (conform <a href="pruts.html" class="ai-link" target="_blank">pruts.html</a>).`;
      if (chips) chips.push(`Voorgestelde FFD (${voorgesteldeFFD} mm)`);
    }

    if (isCentraal && De) {
      const werkelijk = Number((De / 2).toFixed(1));
      if (werkelijk >= minFfd) {
        res += `<br>✅ <em>Centraal is toegestaan! Beschikbare afstand is ${werkelijk} mm (&ge; ${minFfd} mm).</em>`;
      } else {
        res += `<br>❌ <em>Centraal is NIET toegestaan! Beschikbare afstand is slechts ${werkelijk} mm (&lt; ${minFfd} mm).</em>`;
      }
    }

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
    const m = Math.floor(totalSeconds / 60);
    const s = Math.round(totalSeconds % 60);
    const sStr = s < 10 ? "0" + s : s;
    if (m > 0) {
      return `${m}m ${sStr}s`;
    }
    return `${s}s`;
  }

  function formatSecondenVoluit(totalSeconds) {
    const m = Math.floor(totalSeconds / 60);
    const s = Math.round(totalSeconds % 60);
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

    // 1. Titanium (ISO 19232-1 TI, ASTM 01)
    if (nameLower.includes("tita") || nameLower.includes("ti")) {
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
    const m = Math.floor(totalMinutes);
    const s = Math.round((totalMinutes - m) * 60);
    let tijdTekst = "";
    if (m === 0) {
      tijdTekst = `${s} seconden`;
    } else if (s === 0) {
      tijdTekst = m === 1 ? "1 minuut" : `${m} minuten`;
    } else {
      tijdTekst = `${m === 1 ? "1 minuut" : `${m} minuten`} en ${s} seconden`;
    }

    if (actiefGespreksGeheugen) {
      actiefGespreksGeheugen.maminVal = mamin;
      actiefGespreksGeheugen.maVal = ma;
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
        const vraagtWatHijNuHeeft = /\b(nu|vandaag|heden|nog)\b/i.test(lower) || /\bwas\b/i.test(lower);
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

    } else if (proc === "ASME") {
      const bkiLocatie = (tech === "DWSI") ? "Filmside" : "Sourceside";
      let asmeWire = 5;
      let enEq = "W13";
      if (bkiLocatie === "Sourceside") {
        if (t <= 6.4) { asmeWire = 5; enEq = "W13"; }
        else if (t <= 9.5) { asmeWire = 6; enEq = "W12"; }
        else if (t <= 12.7) { asmeWire = 7; enEq = "W11"; }
        else if (t <= 19.0) { asmeWire = 8; enEq = "W10"; }
        else if (t <= 25.4) { asmeWire = 9; enEq = "W9"; }
        else if (t <= 38.1) { asmeWire = 10; enEq = "W8"; }
        else if (t <= 50.8) { asmeWire = 11; enEq = "W7"; }
        else if (t <= 63.5) { asmeWire = 12; enEq = "W6"; }
        else { asmeWire = 13; enEq = "W5"; }
      } else {
        if (t <= 6.4) { asmeWire = 4; enEq = "W14"; }
        else if (t <= 9.5) { asmeWire = 5; enEq = "W13"; }
        else if (t <= 12.7) { asmeWire = 6; enEq = "W12"; }
        else if (t <= 19.0) { asmeWire = 7; enEq = "W11"; }
        else if (t <= 25.4) { asmeWire = 8; enEq = "W10"; }
        else if (t <= 38.1) { asmeWire = 9; enEq = "W9"; }
        else if (t <= 50.8) { asmeWire = 10; enEq = "W8"; }
        else if (t <= 63.5) { asmeWire = 11; enEq = "W7"; }
        else { asmeWire = 12; enEq = "W6"; }
      }
      wire = `EN ${enEq} (ASME #${asmeWire})`;
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
    if (bkiInfo) {
      const bkiSets = geefBkiSetsVoorDraad(wireNum, bkiInfo.isoGroup);
      if (params.materiaalNaam) {
        bkiExtra = `<br><span style="color:#FFA726;">⚠️ <strong>BKI houder voor ${params.materiaalNaam}:</strong> Draad <strong>${wire}</strong> staat op houder <strong>${bkiSets}</strong> (${bkiInfo.omschrijving}).</span>`;
      } else {
        bkiExtra = `<br><small style="opacity:0.85;">Draad <strong>${wire}</strong> staat op ISO BKI houder: <strong>${bkiSets}</strong>.</small>`;
      }
    }
    if (proc === "ASME") {
      const asmeSetMatch = wire.match(/ASME\s*#?(\d+)/i);
      if (asmeSetMatch) {
        const asmeNr = parseInt(asmeSetMatch[1], 10);
        const asmeSets = [];
        if (asmeNr >= 1 && asmeNr <= 6) asmeSets.push("Set 1A");
        if (asmeNr >= 6 && asmeNr <= 11) asmeSets.push("Set 1B");
        if (asmeNr >= 11 && asmeNr <= 16) asmeSets.push("Set 1C");
        bkiExtra += `<br><small style="opacity:0.85;">ASME BKI houder: <strong>${asmeSets.join(" of ")}</strong>.</small>`;
      }
    }

    const bronMelding = bron !== "X-ray" ? ` met ${bronLabel}` : "";
    return `Vereist draadje: <strong>${wire}</strong> (${bkiPos}, doorstraalde dikte: ${doorstraaldeDikte.toFixed(1)} mm bij ${tech} volgens ${proc}${bronMelding}).${verminderingTekst}${altGammaInfo}${bkiExtra}<br><small style="opacity:0.85;">(Berekend volgens <a href="Draadjesv2.html" class="ai-link" target="_blank">Draadjesv2.html</a> conform EN ISO 17636-1 / ASME Sec V).</small>`;
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
    6: { iso: "W12", diaMm: 0.25, diaIn: 0.0100, setIso: ["10 FE EN", "13 FE EN"], setAsme: "Set 1A of Set 1B" },
    7: { iso: "W11", diaMm: 0.32, diaIn: 0.0125, setIso: ["10 FE EN", "13 FE EN"], setAsme: "Set 1B" },
    8: { iso: "W10", diaMm: 0.40, diaIn: 0.0160, setIso: ["10 FE EN", "13 FE EN"], setAsme: "Set 1B" },
    9: { iso: "W9",  diaMm: 0.50, diaIn: 0.0200, setIso: ["6 FE EN", "10 FE EN"],  setAsme: "Set 1B" },
    10: { iso: "W8", diaMm: 0.63, diaIn: 0.0250, setIso: ["6 FE EN"],             setAsme: "Set 1B" },
    11: { iso: "W7", diaMm: 0.80, diaIn: 0.0320, setIso: ["6 FE EN"],             setAsme: "Set 1B of Set 1C" },
    12: { iso: "W6", diaMm: 1.00, diaIn: 0.0400, setIso: ["6 FE EN"],             setAsme: "Set 1C" },
    13: { iso: "W5", diaMm: 1.25, diaIn: 0.0500, setIso: ["1 FE EN", "6 FE EN"],  setAsme: "Set 1C" },
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
           `• <strong>ASME 6</strong> (0.25 mm) &harr; <strong>EN W12</strong> (houder 10 FE EN / 13 FE EN)<br>` +
           `• <strong>ASME 7</strong> (0.32 mm) &harr; <strong>EN W11</strong> (houder 10 FE EN / 13 FE EN)<br>` +
           `• <strong>ASME 8</strong> (0.40 mm) &harr; <strong>EN W10</strong> (houder 10 FE EN / 13 FE EN)<br>` +
           `• <strong>ASME 9</strong> (0.50 mm) &harr; <strong>EN W9</strong> (houder 6 FE EN / 10 FE EN)<br>` +
           `• <strong>ASME 10</strong> (0.63 mm) &harr; <strong>EN W8</strong> (houder 6 FE EN)<br>` +
           `• <strong>ASME 11</strong> (0.80 mm) &harr; <strong>EN W7</strong> (houder 6 FE EN)<br>` +
           `• <strong>ASME 12</strong> (1.00 mm) &harr; <strong>EN W6</strong> (houder 6 FE EN)<br>` +
           `• <strong>ASME 13</strong> (1.25 mm) &harr; <strong>EN W5</strong> (houder 1 FE EN / 6 FE EN)<br><br>` +
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
    if (params.optie === "1") {
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
        opstellingNaam = "Opstelling 14 / E (DWSI gammabron, bron buitenzijde)";
      } else {
        opstellingNaam = "Opstelling 13 / E (DWSI röntgenbuis, bron buitenzijde)";
      }
    }
    params.technique = tech;
    if (actiefGespreksGeheugen) actiefGespreksGeheugen.technique = tech;

    // Minimale FFD & Voorgestelde FFD conform pruts.html
    const minFfd = bepaalNumeriekeMinFFD(params, vraagTekst) || 0;
    const voorgesteldeFfd = bepaalVoorgesteldeFFD(params, vraagTekst) || (minFfd > 0 ? minFfd : 0);

    // Gekozen FFD
    let gekozenFfd = params.sfd;
    if (!gekozenFfd || isNaN(gekozenFfd)) {
      gekozenFfd = voorgesteldeFfd;
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

  // Gespreksgeheugen voor vervolgvragen
  const actiefGespreksGeheugen = {
    laatsteIntentie: null,
    verwachtParameter: null,
    openVraag: null,
    diameter: null,
    wanddikte: null,
    schedule: null,
    sfd: null,
    procedure: null,
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
    feMm: null,
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
    oudeFilmType: null,
    nieuweFilmType: null,
    maminVal: null,
    maVal: null,
    materiaalNaam: null,
    materiaalFactor: null,
    materiaalFactorHandmatig: null,
    // KV-regel, Gevulde leiding & Bronverval
    doorstraaldeDikte: null,
    isGevuldeLeiding: false,
    mediumNaam: null,
    mediumDichtheid: null,
    kv: null,
    vervalDagen: null,
    vervalDoelDatum: null,
  };

  function resetGespreksGeheugen() {
    for (const k in actiefGespreksGeheugen) {
      if (typeof actiefGespreksGeheugen[k] === "boolean") actiefGespreksGeheugen[k] = false;
      else actiefGespreksGeheugen[k] = null;
    }
    if (typeof window !== "undefined" && typeof window.resetPrutsMaterial === "function") {
      window.resetPrutsMaterial();
    }
    synchroniseerDOMFormulier(actiefGespreksGeheugen);
    if (typeof document !== "undefined") {
      const container = document.getElementById("rt-ai-context-container");
      if (container) {
        container.outerHTML = `<div id="rt-ai-context-container" style="margin-top: 12px; font-size: 0.82rem; border-top: 1px solid rgba(255,255,255,0.18); padding-top: 8px; opacity:0.7;">🧠 <em>Geheugen is gewist.</em></div>`;
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
    if (actiefGespreksGeheugen.filmType) {
      items.push({
        key: "filmType",
        label: `Film ${actiefGespreksGeheugen.filmType}`,
        title: "Filmtype",
      });
    }
    if (actiefGespreksGeheugen.pbMm && actiefGespreksGeheugen.pbMm > 0) {
      items.push({
        key: "pbMm",
        label: `${actiefGespreksGeheugen.pbMm} mm Pb`,
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
    } else if (key === "isGevuldeLeiding" || key === "gevuld" || key === "medium") {
      actiefGespreksGeheugen.isGevuldeLeiding = false;
      actiefGespreksGeheugen.mediumNaam = null;
      actiefGespreksGeheugen.mediumDichtheid = null;
    } else if (key === "kv" || key === "buisspanning") {
      actiefGespreksGeheugen.kv = null;
    } else if (key === "sfd") {
      actiefGespreksGeheugen.sfd = null;
    } else if (key === "procedure") {
      actiefGespreksGeheugen.procedure = null;
      actiefGespreksGeheugen.subProcedure = null;
    } else if (key === "bron" || key === "bronTekst") {
      actiefGespreksGeheugen.bronTekst = null;
      actiefGespreksGeheugen.brongrootte = null;
      actiefGespreksGeheugen.bronType = null;
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

    if (typeof document !== "undefined") {
      const container = document.getElementById("rt-ai-context-container");
      if (container) {
        const html = geefGeheugenBadgesHtml();
        if (html) {
          container.outerHTML = html;
        } else {
          container.outerHTML = `<div id="rt-ai-context-container" style="margin-top: 12px; font-size: 0.82rem; border-top: 1px solid rgba(255,255,255,0.18); padding-top: 8px; opacity:0.7;">🧠 <em>Geheugen is leeg.</em></div>`;
        }
      }
    }
  }

  function geefGeheugenBadgesHtml() {
    const items = geefGeheugenItems();
    if (items.length === 0) return "";
    const badgesHtml = items
      .map(
        (it) =>
          `<span class="rt-ai-param-badge" title="${it.title || it.label}: klik op &times; om te wissen" style="display:inline-flex; align-items:center; background:#181818; border:1px solid rgba(245,223,77,0.45); border-radius:14px; padding:2px 9px; font-size:0.8rem; color:#f0f0f0; gap:6px; margin:2px 0; box-shadow:0 1px 3px rgba(0,0,0,0.3);"><span>${it.label}</span><button type="button" onclick="event.stopPropagation(); window.RtAssistant && window.RtAssistant.wisGeheugenParameter('${it.key}');" title="Wis ${it.label} uit geheugen" style="background:none; border:none; color:#ff6b6b; cursor:pointer; padding:0; margin:0; font-size:1.05rem; line-height:1; font-weight:bold; display:inline-flex; align-items:center;" onmouseover="this.style.color='#ff3333'" onmouseout="this.style.color='#ff6b6b'">&times;</button></span>`
      )
      .join(" ");

    return `<div id="rt-ai-context-container" style="margin-top: 12px; font-size: 0.82rem; border-top: 1px solid rgba(255,255,255,0.18); padding-top: 8px;">
      <div style="display:flex; align-items:center; flex-wrap:wrap; gap:6px;">
        <span style="opacity:0.85; font-size:0.82rem;">🧠 <em>Geheugen:</em></span>
        ${badgesHtml}
        <a href="#" onclick="window.RtAssistant && window.RtAssistant.resetGespreksGeheugen(); const r=document.getElementById('rt-ai-response'); if(r)r.innerHTML='Geheugen gewist. Stel een nieuwe vraag.'; return false;" style="color:#F5DF4D; margin-left:6px; font-size:0.78rem; text-decoration:underline; opacity:0.85; cursor:pointer;" title="Wis het volledige geheugen">(wis alles)</a>
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
    if (/\b(reset|wis\s*geheugen|nieuwe\s*vraag|nieuwe\s*berekening|begin\s*opnieuw)\b/i.test(ruweTekst.trim())) {
      resetGespreksGeheugen();
      return {
        text: "Gespreksgeheugen gewist. Waar kan ik je mee helpen? Stel gerust een nieuwe vraag.",
        chips: [],
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
      } else if (doel.includes("lood") || doel.includes("afscherming")) {
        wisGeheugenParameter("pbMm");
        wisGeheugenParameter("feMm");
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
      const badges = geefGeheugenBadgesHtml();
      return {
        text: `<strong>${gewistNaam}</strong> is gewist uit het geheugen.${badges ? "<br>" + badges : "<br><small style='opacity:0.7;'>Geheugen is nu leeg.</small>"}`,
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
        } else if (typeof nieuwParsed[k] === "number" && (k === "pbMm" || k === "feMm")) {
          if (nieuwParsed[k] > 0 || nieuwParsed.verzetZonderAfscherming || /\b(lood|pb|staal|fe|zonder|geen)\b/i.test(gefilterdeTekst)) {
            actiefGespreksGeheugen[k] = nieuwParsed[k];
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
      nieuwParsed.brongrootte !== null ||
      nieuwParsed.bronTekst !== null ||
      nieuwParsed.activiteit !== null ||
      nieuwParsed.sfd !== null ||
      nieuwParsed.diameter !== null ||
      nieuwParsed.filmType !== null ||
      nieuwParsed.langsnaadLengte !== null ||
      nieuwParsed.focusBegintijdSec !== null ||
      nieuwParsed.oudeFocus !== null ||
      nieuwParsed.nieuweFocus !== null ||
      nieuwParsed.oudeCi !== null ||
      nieuwParsed.nieuweCi !== null ||
      nieuwParsed.oudeFilmType !== null ||
      nieuwParsed.nieuweFilmType !== null ||
      nieuwParsed.maminVal !== null ||
      nieuwParsed.materiaalFactor !== null ||
      (typeof nieuwParsed.pbMm === "number" && nieuwParsed.pbMm > 0) ||
      (typeof nieuwParsed.feMm === "number" && nieuwParsed.feMm > 0) ||
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
      nieuwParsed.lasbreedte !== null;

    const isVraagZin = /\b(wat|hoe|hoelang|hoe\s+lang|hoeveel|kan|mag|moet|is\s+het|waarom|welk|welke|bereken|zoek|lijst|toon|overzicht)\b/i.test(gefilterdeTekst) || gefilterdeTekst.includes("?");

    const isAanvullendeData =
      Boolean(context.isChip) ||
      (heeftNieuweParameter &&
        Boolean(actiefGespreksGeheugen.laatsteIntentie) &&
        (intenties.length === 0 ||
          (intenties.length === 1 && (
            intenties[0] === "overzicht" ||
            (!isVraagZin && intenties[0] === "min_ffd" && nieuwParsed.sfd !== null && !/\b(wat|welk|welke|bereken|hoeveel)\b/i.test(gefilterdeTekst)) ||
            (!isVraagZin && intenties[0] === "activiteit" && (nieuwParsed.activiteit !== null || nieuwParsed.bronTekst !== null))
          ))));

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
        } else if ((typeof nieuwParsed.pbMm === "number" && nieuwParsed.pbMm > 0) || (typeof nieuwParsed.feMm === "number" && nieuwParsed.feMm > 0) || /\b(afscherming|loodafscherming|lood\s*afscherming)\b/i.test(gefilterdeTekst)) {
          intenties = ["afzetting"];
        } else if (!heeftNieuweParameter && !isVraagZin && !context.isChip) {
          const badges = geefGeheugenBadgesHtml();
          return {
            text: `Ik beantwoord graag je RT-vraag. Stel gerust een specifieke vraag over stralingstijd, opnames, FFD, afzetting of onstream.${badges ? "<br>" + badges : ""}`,
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

    // Prioriteit in uitvoering: schietkaart / vergelijkingen bovenaan, gevulde leiding vóór stralingstijd of kv_regel
    const volgordePrio = {
      schietkaart: 0.5,
      asme_draad_vergelijk: 0.8,
      hole_type_iqi: 0.9,
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
      if (intentie === "schietkaart") {
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
          const matchZwVanNaar = gefilterdeTekst.match(/\bvan\s+(?:een\s+)?(?:zwarting\s+(?:van\s+)?)?(\d+(?:[.,]\d+)?)\s+naar\s+(?:een\s+)?(?:zwarting\s+(?:van\s+)?)?(\d+(?:[.,]\d+)?)\b(?!\s*(?:minuut|minuten|min\b|sec|seconden|s\b|uur|mm|cm|meter|m\b|ci|curie|kv|ma\b|duim|inch))/i);
          const matchZwSchatting = matchZwVanNaar || gefilterdeTekst.match(/zwarting(?:\s*van|\s*is)?\s*(?:maar\s*)?(\d+(?:[.,]\d+)?)\b[\s\S]*?(?:naar|(?:op|voor)(?:\s+een)?(?:\s+zwarting(?:\s+van)?)?)\s*(\d+(?:[.,]\d+)?)\b(?!\s*(?:minuut|minuten|min\b|sec|seconden|s\b|uur|mm|cm|meter|m\b|ci|curie|kv|ma\b|duim|inch))/i);
          if (matchZwSchatting && params.focusBegintijdSec) {
            const dOud = parseFloat(matchZwSchatting[1].replace(",", "."));
            const dNieuw = parseFloat(matchZwSchatting[2].replace(",", "."));
            if (dOud > 0 && dNieuw > 0) {
              const tOudSec = params.focusBegintijdSec;
              const tNieuwSec = tOudSec * (dNieuw / dOud);
              const diffSec = Math.abs(tNieuwSec - tOudSec);
              const diffLabel = tNieuwSec >= tOudSec ? "langer" : "korter";
              antwoorden.push(
                `<strong>Praktijkschatting belichtingstijd voor zwarting van ${dOud} naar ${dNieuw}:</strong><br><br>` +
                `Op basis van de lineaire relatie tussen dosis/belichtingstijd en zwarting bij industriële röntgenfilm geldt als vuistregel:<br>` +
                `• Huidige belichtingstijd bij zwarting ${dOud}: <strong>${formatSecondenVoluit(tOudSec)}</strong><br>` +
                `• Geschatte nieuwe totale belichtingstijd voor zwarting ${dNieuw}: <span class="rt-math-inline"><span class="rt-math-frac"><span class="rt-math-num">${dNieuw}</span><span class="rt-math-den">${dOud}</span></span> &times; tijd =</span> ${formatSecondenVoluit(tNieuwSec)} (circa <strong>${formatSecondenKort(diffSec)} ${diffLabel}</strong> belichten).<br>` +
                `<small style="opacity:0.85;">⚠️ <em>Let op:</em> Dit is een <strong>praktijkschatting</strong> (er is ook rekening te houden met de sluier-zwarting <i>D</i><sub>0</sub> &approx; 0.20 van de film en het ontwikkelproces).</small>`
              );
              continue;
            }
          }
          if (/asme/i.test(gefilterdeTekst) || params.procedure === "ASME") {
            antwoorden.push("Volgens <strong>ASME Section V</strong>:<br>• <strong>Röntgenbuis (X-ray):</strong> minimale zwarting <strong>1.8</strong>.<br>• <strong>Gammabronnen (Se-75 / Ir-192 / Co-60):</strong> minimale zwarting <strong>2.0</strong>.<br>• <strong>Maximum:</strong> <strong>4.0</strong> (single-film).");
          } else if (/klasse\s*a/i.test(gefilterdeTekst) || params.procedure === "EN-A") {
            antwoorden.push("Volgens <strong>EN ISO 17636-1 Klasse A</strong>:<br>• <strong>Minimale zwarting:</strong> <strong>2.0</strong> (voor zowel röntgen als gammastraling).<br>• <strong>Maximum:</strong> <strong>4.0</strong>.");
          } else if (params.procedure === "EN-B" || /klasse\s*b/i.test(gefilterdeTekst)) {
            antwoorden.push("Volgens <strong>EN ISO 17636-1 Klasse B</strong>:<br>• <strong>Minimale zwarting:</strong> <strong>2.3</strong> (voor zowel röntgen als gammastraling).<br>• <strong>Maximum:</strong> <strong>4.0</strong>.<br><small style='display:block; margin-top:5px; opacity:0.9;'><em>Let op bij draadvereiste (Se-75):</em> D5 is toegestaan, maar D4 wordt aanbevolen. Wordt het vereiste draadje op D5 niet gehaald? Dan moet <strong>D4</strong> worden gebruikt met een minimale zwarting van <strong>&ge; 3.0</strong> om het contrast te verhogen.</small>");
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
            chips.push("4 mm dik", "6 mm dik", "8 mm dik");
            antwoorden.push(`Om de volledige inspectiegegevens voor ${formatMmNaarDuimLabel(params.diameter)} te berekenen heb ik de <strong>wanddikte</strong> (in mm) nodig. Wat is de wanddikte?`);
          } else if (!params.procedure) {
            chips.push("Klasse B", "Klasse A", "ASME");
            antwoorden.push(`Volgens welke <strong>kwaliteitsklasse of norm</strong> (EN Klasse A, EN Klasse B of ASME) moet ${formatMmNaarDuimLabel(params.diameter)} worden beoordeeld?`);
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
          antwoorden.push(geefAppInfo(chips));
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
            antwoorden.push(`Het benodigde verzet voor ovaaltje (${formatMmNaarDuimLabel(De)}, lasbreedte ${lb} mm op ${sfd} mm FFD conform Opstelling 11/F) is: <strong>${vz.toFixed(1)} mm</strong> (2 opnames onder 90°).`);
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
        if (minFfdVal && chips && !chips.includes(`Minimale FFD (${minFfdVal} mm)`)) {
          chips.unshift(`Minimale FFD (${minFfdVal} mm)`);
        }
      }
    }

    const contextHtml = geefGeheugenBadgesHtml();
    if (contextHtml) {
      antwoorden.push(contextHtml);
    }

    return {
      text: antwoorden.filter(Boolean).join("<br><br>"),
      raw: gefilterdeTekst,
      chips: chips,
    };
  }

  // 17. Over R.A.D.I. / Disclaimer & Contact
  function geefAppInfo(chips) {
    if (chips) {
      chips.push("Hoe werkt het?", "Disclaimer", "Fout melden", "vincepall@gmail.com");
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
      .rt-ai-input-bar {
        display: flex !important;
        gap: 8px !important;
        align-items: center !important;
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
        padding: 10px 14px !important;
        border-radius: 1.05em !important;
        border: 3px solid #F5DF4D !important;
        background-color: #ffffff !important;
        color: #000000 !important;
        font-size: 1.05rem !important;
        font-family: 'Roboto Condensed', sans-serif !important;
        text-align: left !important;
        max-width: none !important;
        box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.15) !important;
        box-sizing: border-box !important;
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
        .rt-ai-modal-overlay.rt-ai-kb-open .rt-ai-mic-btn {
          width: 44px !important;
          height: 44px !important;
          font-size: 20px !important;
        }
        .rt-ai-modal-header {
          margin-bottom: 6px !important;
          padding-bottom: 4px !important;
          flex-shrink: 0 !important;
          touch-action: none !important;
        }
        .rt-ai-modal-header h3 {
          font-size: 1.15rem !important;
        }
        .rt-ai-modal-subtitle {
          font-size: 0.65rem !important;
        }
        .rt-ai-transcript {
          font-size: 0.85rem !important;
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
          padding: 9px 12px !important;
          font-size: 0.98rem !important;
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
          <div style="display:flex; align-items:center; gap:8px;">
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
          Stel je vraag (bijv. <em>"hoe groot moet de afzetting zijn bij 25 Ci Se-75"</em> of <em>"hoeveel opnames op een 4 duimer van 6 dik"</em>).
        </div>
        <form id="rt-ai-form" class="rt-ai-input-bar" onsubmit="event.preventDefault(); window.RtAssistant.verstuurTekst();">
          <input type="text" id="rt-ai-input" class="rt-ai-text-input" placeholder="Typ je vraag..." autocomplete="off">
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
        toonVoorbeeldVragen();
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

    // Voorkom achtergrond scrollen op mobiel bij vegen buiten de response box
    overlay.addEventListener("touchmove", (e) => {
      const target = e.target;
      const isInsideResponse = target && target.closest && target.closest(".rt-ai-response-box");
      if (!isInsideResponse) {
        if (e.cancelable) e.preventDefault();
      }
    }, { passive: false });

    overlay.addEventListener("focusin", (e) => {
      if (e.target && e.target.tagName === "INPUT" && typeof window !== "undefined" && window.innerWidth <= 768) {
        window.scrollTo(0, 0);
        updateMobileViewport();
        setTimeout(updateMobileViewport, 60);
        setTimeout(updateMobileViewport, 180);
        setTimeout(updateMobileViewport, 350);
        setTimeout(updateMobileViewport, 550);
      }
    });
    overlay.addEventListener("focusout", (e) => {
      if (e.target && e.target.tagName === "INPUT" && typeof window !== "undefined" && window.innerWidth <= 768) {
        setTimeout(updateMobileViewport, 60);
        setTimeout(updateMobileViewport, 250);
        setTimeout(updateMobileViewport, 450);
      }
    });
  }

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
    const rtKernwoorden = /\b(iridium|ir[-\s]?192|selenium|se[-\s]?75|kobalt|co[-\s]?60|sterkste|zwakste|curie|ci|activiteit|wanddikte|diameter|duimer|duims|duim|duin|duins|dik|dek|onstream|afzetting|stralingstijd|belichtingstijd|schiettijd|focus|focusafstand|ffd|sfd|langsnaad|rondnaad|opnames|draadje|bki|buistabel|kilovolt|buisspanning|staalequivalent|bronverval|verval|ovaaltje|verzet|collimator|zwarting|lood|klasse|asme|tangentiaal|dubbelwand|isolatie|isolatiedikte|milliamp[eè]re|mamin|ma|brongrootte|bronkeuze|balteau|balto|ball\s*toe|bal\s*toe|baltoo|yxlon|ikslon|smart|evo|rondstraler|rondstralen|panoramisch|centraal|bundel|bundelbreedte|directional|ceram|d[2-8]|iso|swsi|dwsi|kwadratenwet|one\s*that\s*is|aas\s*mee|esmee|wandelen)\b/gi;

    let bestText = (resultItem[0] && resultItem[0].transcript) ? resultItem[0].transcript.trim() : "";
    let bestScore = -1;

    for (let a = 0; a < resultItem.length; a++) {
      const cand = (resultItem[a] && resultItem[a].transcript) ? resultItem[a].transcript.trim() : "";
      if (!cand) continue;
      const gecorrigeerd = corrigeerSpraakTekst(cand);
      const matches = gecorrigeerd.match(rtKernwoorden);
      const rawMatches = cand.match(rtKernwoorden);
      const numMatches = gecorrigeerd.match(/\b\d+(?:[.,]\d+)?\b/g);
      // Geef elk herkend RT-kernwoord +10 punten, elk getal +3 punten, en het eerste alternatief +2 tie-breaker bonus
      const totalTermMatches = (matches ? matches.length : 0) + (rawMatches ? rawMatches.length : 0);
      const score = (totalTermMatches * 10) + (numMatches ? numMatches.length * 3 : 0) + (a === 0 ? 2 : 0);
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
    const isInputFocused = Boolean(activeEl && activeEl.tagName === "INPUT" && assistantModal.contains && assistantModal.contains(activeEl));
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

  function spreekTekst(htmlOrText) {
    if (!ttsEnabled) return;
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    try {
      window.speechSynthesis.cancel();

      // Converteer HTML naar een natuurlijke, schone spreekbare tekst
      let text = String(htmlOrText || "");
      text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
      text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "");
      text = text.replace(/<br\s*[\/]?>/gi, ". ");
      text = text.replace(/<\/p>/gi, ". ");
      text = text.replace(/<\/?[^>]+(>|$)/g, " ");
      text = text.replace(/&nbsp;/g, " ")
                 .replace(/&amp;/g, " en ")
                 .replace(/&lt;/g, "kleiner dan ")
                 .replace(/&gt;/g, "groter dan ")
                 .replace(/&ge;/g, "minimaal ")
                 .replace(/&le;/g, "maximaal ")
                 .replace(/&times;/g, " bij ")
                 .replace(/&bull;/g, "")
                 .replace(/&rarr;/g, " naar ");
      text = text.replace(/✅/g, "Toegestaan. ")
                 .replace(/❌/g, "Niet toegestaan. ")
                 .replace(/⚠️/g, "Let op. ")
                 .replace(/ℹ️/g, "Informatie. ")
                 .replace(/📋/g, "Overzicht. ")
                 .replace(/☢️?/g, "")
                 .replace(/⚡/g, "");
      text = text.replace(/\s+/g, " ").trim();
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
    const weergaveTekst = corrigeerSpraakTekst(vraagTekst);
    const tr = document.getElementById("rt-ai-transcript");
    if (tr) tr.innerHTML = `Jij: "<strong>${weergaveTekst}</strong>"`;
    const respEl = document.getElementById("rt-ai-response");
    if (respEl) respEl.innerHTML = "Bewerken en uitrekenen...";

    const res = await verwerkUniverseleVraag(weergaveTekst, context);

    if (respEl) {
      let outputHtml = res.text;
      if (res.chips && res.chips.length > 0) {
        outputHtml += `<div class="rt-ai-chips-row" style="display:flex; flex-wrap:wrap; gap:6px; margin-top:12px;">` +
          res.chips.map(c => `<button type="button" class="rt-ai-chip-btn" style="background:#222; border:1px solid #f5df4d; color:#f5df4d; padding:4px 10px; border-radius:12px; font-size:0.85rem; cursor:pointer;" onclick="window.RtAssistant && window.RtAssistant.verstuurSuggestie('${c}')">${c}</button>`).join("") +
          `</div>`;
      }
      respEl.innerHTML = outputHtml;
      respEl.scrollTop = 0;
    }
    spreekTekst(res.text);

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
    const inp = document.getElementById("rt-ai-input");
    if (inp) {
      inp.value = "";
      const isTouch = (typeof window !== "undefined") && (window.innerWidth <= 768 || ('ontouchstart' in window) || (navigator && navigator.maxTouchPoints > 0));
      if (isTouch) {
        inp.blur(); // Zorgt dat het mobiele toetsenbord NOOIT ongewenst openklapt bij klikken op een chip
      }
    }
    verwerkVraagDirect(tekst, { isChip: true });
  }

  function verstuurTekst() {
    const inp = document.getElementById("rt-ai-input");
    if (!inp || !inp.value.trim()) return;
    const q = inp.value.trim();
    inp.value = "";
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
    { categorie: "Lasfouten & Schietkaart", type: "Complete schietkaart genereren", voorbeeld: "Maak een schietkaart voor een 6 duimer van 8 mm dik met 25 Ci Se-75 volgens Klasse B", toelichting: "Genereert in één overzicht opstelling, FFD, draadje, opnames, belichtingstijd en afzetting." }
  ];

  let geladenVoorbeeldVragen = null;
  let actieveVoorbeeldCategorie = "Alle";
  let actieveVoorbeeldZoekterm = "";

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
    const inp = document.getElementById("rt-ai-input");
    if (inp) {
      inp.value = vraagTekst;
      inp.focus();
    }
  }

  function stelVoorbeeldDirect(vraagTekst) {
    const inp = document.getElementById("rt-ai-input");
    if (inp) {
      inp.value = vraagTekst;
    }
    verstuurTekst();
  }

  async function toonVoorbeeldVragen() {
    const items = await laadVoorbeeldVragen();
    const respEl = document.getElementById("rt-ai-response");
    const transEl = document.getElementById("rt-ai-transcript");
    if (!respEl) return;

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
      if (!micBtn.dataset.bound) {
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

  // Expose API
  const RtAssistant = {
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
    laadVoorbeeldVragen,
    STANDAARD_VOORBEELDVRAGEN,
    berekenKVRegel,
    berekenBuistabel,
    berekenGevuldeLeiding,
    berekenBronVerval,
    berekenBkiDraadje,
    geefOpstellingEnGroeperingInfo,
    berekenSchedule,
    zoekScheduleInfo,
    ASME_PIPE_SCHEDULES,
    OPSTELLINGEN_NDO,
    resetGespreksGeheugen,
    wisGeheugenParameter,
    geefGeheugenItems,
    geefGeheugenBadgesHtml,
    geefGeheugenSamenvatting,
    actiefGespreksGeheugen,
    verwerkUniverseleVraag,
    openAssistant,
    sluitAssistant,
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
    corrigeerSpraakTekst,
  };

  global.RtAssistant = RtAssistant;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = RtAssistant;
  }
})(typeof window !== "undefined" ? window : global);
