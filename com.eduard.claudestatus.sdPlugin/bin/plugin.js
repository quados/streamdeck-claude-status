import streamDeck from "@elgato/streamdeck";
import { execFile } from "node:child_process";
import { readFileSync, readdirSync, statSync, unlinkSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import http from "node:http";

const DIR   = `${homedir()}/.claude/agent-status.d`;   // per-session status files
const CLI   = "/Applications/Zed.app/Contents/MacOS/cli";
const PORT  = 37800;             // localhost push endpoint (hooks POST here)
const POLL  = 5000;              // backstop poll (ms)
const BLINK = 700;               // attention-blink period (ms)
const LONG  = 600;               // long-press threshold (ms) -> dismiss key
const STALE = 12 * 3600_000;     // dead-pid staleness backstop (ms)
const IDLE  = 24 * 3600_000;     // hide non-busy sessions idle longer than this (ms)
const STUCK = 20 * 60_000;       // hide "busy" with no tool activity longer than this (ms)

// state -> accent colour
const COLOR = {
  busy: "#e0b000",   // working / thinking
  perm: "#ff3b30",   // needs permission - blinks
  wait: "#3b82f6",   // waiting for your input (idle) - blinks
  done: "#20a020",   // turn finished
  idle: "#8a8a8a",   // session started, no activity yet
};
const ATTENTION = new Set(["perm", "wait"]);   // states that blink to grab attention

const FONT = "-apple-system, Helvetica Neue, Helvetica, Arial, sans-serif";
const esc  = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const fit  = (s, n) => (s.length > n ? s.slice(0, n - 1) + "…" : s);
const base = (p) => String(p || "").split("/").filter(Boolean).pop() || "";

function wrap(text, maxChars, maxLines) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let cur = "";
  for (const w of words) {
    const t = cur ? `${cur} ${w}` : w;
    if (t.length <= maxChars) { cur = t; continue; }
    if (cur) lines.push(cur);
    cur = w.length > maxChars ? w.slice(0, maxChars) : w;
    if (lines.length >= maxLines) break;
  }
  if (cur && lines.length < maxLines) lines.push(cur);
  const out = lines.slice(0, maxLines);
  if (words.join(" ").length > out.join(" ").length && out.length) {
    out[out.length - 1] = fit(out[out.length - 1] + "…", maxChars);
  }
  return out;
}

function elapsed(sec) {
  if (!sec) return "";
  const s = Math.max(0, Math.floor(Date.now() / 1000 - sec));
  if (s < 60)    return `${s}s`;
  if (s < 3600)  return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

function toUri(inner, tint, glow) {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="144" height="144" viewBox="0 0 72 72">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0.35" stop-color="${tint}" stop-opacity="0"/>` +
    `<stop offset="1" stop-color="${tint}" stop-opacity="${glow}"/>` +
    `</linearGradient></defs>${inner}</svg>`;
  return "data:image/svg+xml;base64," + Buffer.from(svg).toString("base64");
}

// on=false dims the accent (used for the blink "off" phase)
function renderKey(rec, on = true) {
  const color = COLOR[rec.state] ?? COLOR.idle;
  const a     = on ? 1 : 0.2;
  const repo  = fit(base(rec.cwd) || "session", 13);
  const name  = rec.title && rec.title.trim() ? rec.title.trim() : String(rec.sid || "").slice(0, 8);
  const ageOf = rec.state === "busy" ? (rec.started || rec.ts) : rec.ts;   // busy = turn time; else since last change
  const age   = elapsed(ageOf);
  const body  = wrap(name, 16, 3)
    .map((ln, i) => `<text x="8" y="${30 + i * 10}" font-size="7.5" fill="#9aa2a8" font-family="${FONT}">${esc(ln)}</text>`)
    .join("");
  return toUri(
    `<rect x="1" y="1" width="70" height="70" rx="13" fill="#17181b" stroke="${color}" stroke-opacity="${0.55 * a}" stroke-width="1"/>` +
    `<rect x="1" y="1" width="70" height="70" rx="13" fill="url(#g)"/>` +
    `<text x="8" y="16" font-size="9" font-weight="700" fill="#f6f7f8" font-family="${FONT}">${esc(repo)}</text>` +
    body +
    `<rect x="8" y="61" width="34" height="4" rx="2" fill="${color}" fill-opacity="${a}"/>` +
    `<circle cx="48" cy="63" r="3.3" fill="${color}" fill-opacity="${a}"/>` +
    (age ? `<text x="66" y="65.5" font-size="6.5" fill="#868b90" text-anchor="end" font-family="${FONT}">${age}</text>` : ""),
    color,
    0.22 * a
  );
}

function renderEmpty() {
  return toUri(`<rect x="1" y="1" width="70" height="70" rx="13" fill="#0f0f11" stroke="#26272b" stroke-width="1"/>`, "#0f0f11", 0);
}

function alive(rec, file) {
  if (rec.pid) { try { process.kill(rec.pid, 0); return true; } catch { /* dead */ } }
  try { return Date.now() - statSync(file).mtimeMs < STALE; } catch { return false; }
}

// shown only if the process is alive and it's actively working or recently touched
function visible(rec, file) {
  if (!alive(rec, file)) return false;
  const age = Date.now() - rec.ts * 1000;
  if (rec.state === "busy") return age < STUCK;   // stuck/crashed mid-turn -> hide (self-heals on next event)
  return age < IDLE;                              // done/wait/perm/idle -> 1-day window
}

function readSessions() {
  let files;
  try { files = readdirSync(DIR); } catch { return []; }
  const out = [];
  for (const f of files) {
    if (!f.endsWith(".json")) continue;
    const p = `${DIR}/${f}`;
    try {
      const rec = JSON.parse(readFileSync(p, "utf8"));
      if (rec.sid && visible(rec, p)) out.push(rec);
    } catch { /* skip malformed/partial write */ }
  }
  return out.sort(
    (a, b) => (a.cwd || "").localeCompare(b.cwd || "") || a.sid.localeCompare(b.sid)
  );
}

// action.id -> { action, col, row, cwd, sid, rec, timer, longFired }
const keys = new Map();
let blinkOn = true;

function paint(slot, rec) {
  slot.rec = rec || null;
  if (rec) {
    slot.cwd = rec.cwd; slot.sid = rec.sid;
    slot.action.setImage(renderKey(rec, ATTENTION.has(rec.state) ? blinkOn : true));
  } else {
    slot.cwd = null; slot.sid = null;
    slot.action.setImage(renderEmpty());
  }
  slot.action.setTitle("");
}

function refresh() {
  const sessions = readSessions();
  const slots = [...keys.values()].sort((a, b) => a.row - b.row || a.col - b.col);
  slots.forEach((slot, i) => paint(slot, sessions[i]));
}

function blinkTick() {
  blinkOn = !blinkOn;
  for (const slot of keys.values()) {
    if (slot.rec && ATTENTION.has(slot.rec.state)) slot.action.setImage(renderKey(slot.rec, blinkOn));
  }
}

streamDeck.actions.onWillAppear((ev) => {
  const c = ev.payload?.coordinates ?? { column: 0, row: 0 };
  keys.set(ev.action.id, { action: ev.action, col: c.column, row: c.row, cwd: null, sid: null, rec: null });
  refresh();
});

streamDeck.actions.onWillDisappear((ev) => {
  keys.delete(ev.action.id);
});

// open the project in Zed: prefer the Zed CLI, fall back to `open -a Zed` if it's not at CLI
function openInZed(cwd) {
  const viaApp = () => execFile("open", ["-a", "Zed", cwd], (e) => { if (e) streamDeck.logger.error(`open Zed failed: ${e}`); });
  if (existsSync(CLI)) execFile(CLI, [cwd], (e) => { if (e) viaApp(); });
  else viaApp();
}

// tap = open project in Zed; hold (>LONG ms) = dismiss this session's key
streamDeck.actions.onKeyDown((ev) => {
  const k = keys.get(ev.action.id);
  if (!k) return;
  k.longFired = false;
  k.timer = setTimeout(() => {
    k.longFired = true;
    if (k.sid) { try { unlinkSync(`${DIR}/${k.sid}.json`); } catch { /* already gone */ } }
    refresh();
  }, LONG);
});

streamDeck.actions.onKeyUp((ev) => {
  const k = keys.get(ev.action.id);
  if (!k) return;
  clearTimeout(k.timer);
  if (!k.longFired && k.cwd) openInZed(k.cwd);
});

// instant push: hooks POST here after writing state -> repaint immediately.
// exit on EADDRINUSE so a duplicate instance can't linger as a zombie.
http.createServer((req, res) => { refresh(); res.statusCode = 204; res.end(); })
  .on("error", (e) => {
    streamDeck.logger.error(`push server: ${e.message}`);
    if (e.code === "EADDRINUSE") process.exit(0);
  })
  .listen(PORT, "127.0.0.1", () => streamDeck.logger.info(`push server on 127.0.0.1:${PORT}`));

setInterval(refresh, POLL);       // backstop + elapsed tick
setInterval(blinkTick, BLINK);    // attention blink

streamDeck.connect();
