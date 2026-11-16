"use strict";

const fs = require("fs");
const path = require("path");

const rootDir = __dirname;
const srcDir = path.join(rootDir, "src", "radi");
const outFile = path.join(rootDir, "rt-assistant.js");

const moduleFiles = fs
  .readdirSync(srcDir)
  .filter((f) => f.endsWith(".js"))
  .sort();

if (moduleFiles.length === 0) {
  throw new Error("Geen .js modules gevonden in " + srcDir);
}

const header = `/**
 * AUTO-GENERATED door build-radi.js uit src/radi/*.js — bewerk de losse modules in src/radi/!
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
`;

const footer = `})(typeof window !== "undefined" ? window : global);\n`;

const parts = [];
const overzicht = [];
for (const file of moduleFiles) {
  const fullPath = path.join(srcDir, file);
  const content = fs.readFileSync(fullPath, "utf8").replace(/\s+$/, "");
  const lineCount = content.split("\n").length;
  overzicht.push({ module: `src/radi/${file}`, regels: lineCount });
  parts.push(`  // ==========================================================================\n  // MODULE: ${file} (${lineCount} regels)\n  // ==========================================================================\n${content}`);
}

const bundle = `${header}\n${parts.join("\n\n")}\n\n${footer}`;
fs.writeFileSync(outFile, bundle, "utf8");

const totalLines = bundle.split("\n").length;
console.log(`Gegenereerd: ${outFile} (${totalLines} regels totaal uit ${moduleFiles.length} modules)`);
console.table(overzicht);
