#!/usr/bin/env node
// Fails if AI-style typographic characters creep into tracked text files.
// Keeps the writing looking hand-typed (plain ASCII). Run locally or in CI.
// The plugin's functional ellipsis (used for key-width truncation) is allowed.
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";

// codepoint -> human name (names are ASCII so this file passes its own check)
const BAD = {
  0x2014: "em-dash", 0x2013: "en-dash", 0x2026: "ellipsis",
  0x201c: "left double quote", 0x201d: "right double quote",
  0x2018: "left single quote", 0x2019: "right single quote",
  0x00a0: "no-break space", 0x2192: "rightwards arrow", 0x2248: "almost-equal",
  0x2502: "box vertical", 0x2500: "box horizontal",
  0x25bc: "down triangle", 0x25b6: "right triangle", 0x25b8: "small right triangle",
  0x00b7: "middot", 0x2022: "bullet",
};

// path -> codepoints allowed in that file because they are functional, not stylistic
const ALLOW = {
  "com.eduard.claudestatus.sdPlugin/bin/plugin.js": new Set([0x2026]),
};

const files = execSync("git ls-files", { encoding: "utf8" })
  .trim().split("\n")
  .filter((f) => f && !/\.(png|ico|icns|woff2?|ttf)$/.test(f) && f !== "package-lock.json");

let violations = 0;
for (const f of files) {
  let text;
  try { text = readFileSync(f, "utf8"); } catch { continue; }
  const allow = ALLOW[f] ?? new Set();
  text.split("\n").forEach((line, i) => {
    for (const ch of line) {
      const cp = ch.codePointAt(0);
      if (BAD[cp] && !allow.has(cp)) {
        console.error(`${f}:${i + 1}: U+${cp.toString(16).toUpperCase().padStart(4, "0")} ${BAD[cp]}`);
        violations++;
      }
    }
  });
}

if (violations) {
  console.error(`\n${violations} typographic artifact(s) found. Replace with plain ASCII.`);
  process.exit(1);
}
console.log("No AI-style typographic artifacts. OK");
