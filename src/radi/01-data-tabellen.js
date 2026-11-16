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
            currentActivity: Math.round(act * 10) / 10,
            date: cols[3],
            size: size,
            label: `${cols[0]} (${typeLabel}, ${size} mm) [${act.toFixed(1)} Ci]`,
          });
        }
      }
    });
    return result;
  }

  bronnenData = bouwBronnenData(STANDAARD_BRONNEN_CSV);

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
  function geefBrongrootteSuggestieChips(bronHint = "", opstelling = "") {
    const hint = (bronHint || "").toLowerCase();
    const isSe = hint.includes("se") || hint.includes("sel");
    const isIr = hint.includes("ir");
    const isCentraal =
      /centraal|panoram|rondstral|opstelling\s*(?:5|a\b)/i.test(opstelling) ||
      (typeof actiefGespreksGeheugen !== "undefined" &&
        actiefGespreksGeheugen &&
        /centraal|panoram|rondstral|opstelling\s*(?:5|a\b)/i.test(actiefGespreksGeheugen.opstelling || ""));
    const chips = [];

    // Bij een centrale / panoramische opstelling altijd Rondstraler als eerste suggestie
    if (isCentraal) {
      chips.push("Balteau Rondstraler (5 mm)");
    }

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
      chips.push("Smart EVO (1 mm)", "Yxlon 300 (3 mm)", "Balteau (2.5 mm)");
      if (!isCentraal) {
        chips.push("Balteau Rondstraler (5 mm)");
      }
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
        if (a.name === "RVS 316 / 316L") {
          // Voorkom dat losse getallen zoals "FFD 316 mm" of "316" onterecht als RVS 316 worden herkend
          if (!/\b(rvs|roestvast|roestvrij|316\s*l|1\.4404|aisi\s*316|ss\s*316|materiaal\s*316|werkstof\s*316)\b/i.test(lower)) {
            continue;
          }
        }
        if (a.name === "RVS 304 / 304L") {
          // Voorkom dat losse getallen zoals "304 mm" onterecht als RVS 304 worden herkend
          if (!/\b(rvs|roestvast|roestvrij|304\s*l|1\.4301|aisi\s*304|ss\s*304|materiaal\s*304|werkstof\s*304)\b/i.test(lower)) {
            continue;
          }
        }
        if (a.name === "Super Duplex 2507") {
          if (!/\b(duplex|super\s*duplex|materiaal\s*2507|werkstof\s*2507)\b/i.test(lower)) {
            continue;
          }
        }
        if (a.name === "Duplex 2205") {
          if (!/\b(duplex|materiaal\s*2205|werkstof\s*2205)\b/i.test(lower)) {
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

