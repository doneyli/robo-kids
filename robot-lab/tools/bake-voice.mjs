#!/usr/bin/env node
/* ============================================================================
 * bake-voice.mjs — give the robot his own voice
 *
 *   cd robot-lab && node tools/bake-voice.mjs            # bake + upload
 *   cd robot-lab && node tools/bake-voice.mjs --list     # what would be baked
 *   cd robot-lab && node tools/bake-voice.mjs --voice Daniel
 *   cd robot-lab && node tools/bake-voice.mjs --clean     # delete them again
 *
 * WHY THIS EXISTS
 *
 * The Reachy Mini SDK has no text-to-speech, so every spoken line in the app has
 * been coming out of the TABLET. A robot whose voice comes from the device in
 * your hand is not really talking to you.
 *
 * But the daemon will play any sound file you upload, and both the upload and the
 * playback work cross-origin from a browser. The curriculum has only 24 distinct
 * spoken lines. So: render them once here with macOS `say`, upload them, and at
 * runtime the app just asks the daemon to play one. The robot speaks with his own
 * speaker and the app still has no backend.
 *
 * This is a PREPARATION step, not part of a session. Run it once, and again
 * whenever you add or edit a `say:` line.
 *
 * For genuinely dynamic speech — anything a child types, or an LLM reply — see
 * docs/decisions/0003-giving-the-robot-a-voice.md. That needs a small local
 * service; this does not.
 * ==========================================================================*/

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadApp, SCRIPTS } from '../test/harness.mjs';

const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const opt = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };

const VOICE = opt('--voice', 'Samantha');
const RATE = opt('--rate', '165');          // words per minute; kids need slower
const HOSTS = [opt('--host', null), 'reachy-mini.local', '192.168.1.15'].filter(Boolean);

// ── Collect every distinct spoken line from the curriculum ──────────────────

const g = loadApp(SCRIPTS.all, {});
const lines = new Map();     // text -> [questId, ...]

for (const q of g.CURRICULUM.all()) {
  const a = q.activity;
  for (const field of ['items', 'palette', 'broken', 'steps', 'probes', 'run']) {
    for (const entry of a[field] || []) {
      for (const seg of g.Actions.parse(entry && entry.do)) {
        if (seg.verb !== 'say') continue;
        // pitch/rate variants are deliberately left to tablet speech — a
        // pre-rendered file cannot be squeaky on demand (quest e4-2).
        if (seg.params.pitch || seg.params.rate) continue;
        const t = seg.payload.trim();
        if (!lines.has(t)) lines.set(t, []);
        lines.get(t).push(q.id);
      }
    }
  }
}

// The robot answering a probe about himself, from quest-ui's interpret().
// These are generated at runtime from live values, so they cannot be baked —
// noted here so the gap is visible rather than mysterious.
const RUNTIME_ONLY = 'probe answers (built from live telemetry)';

const entries = [...lines.entries()].map(([text, quests]) => ({
  text, quests, file: g.RobotLink.voiceFile(text),
}));

if (flag('--list')) {
  console.log(`\n${entries.length} bakeable lines (voice: ${VOICE}, ${RATE} wpm)\n`);
  for (const e of entries) {
    console.log(`  ${e.file}`);
    console.log(`    "${e.text}"`);
    console.log(`    used by: ${e.quests.join(', ')}\n`);
  }
  console.log(`Not bakeable: ${RUNTIME_ONLY}, and any say: with pitch=/rate=.\n`);
  process.exit(0);
}

// ── Find the robot ──────────────────────────────────────────────────────────

async function findRobot() {
  for (const h of HOSTS) {
    try {
      const r = await fetch(`http://${h}:8000/api/daemon/status`, { signal: AbortSignal.timeout(2500) });
      if (r.ok) return { host: h, status: await r.json() };
    } catch { /* next */ }
  }
  return null;
}

const found = await findRobot();
if (!found) {
  console.log(`\nNo robot answering on ${HOSTS.join(' or ')}:8000.`);
  console.log('Baking needs the robot, because the files are uploaded to it.');
  console.log('Power him on and try again — the app falls back to tablet speech meanwhile.\n');
  process.exit(1);
}
const BASE = `http://${found.host}:8000`;
console.log(`\n🔊  Baking ${entries.length} lines for ${found.status.robot_name} at ${found.host}`);
console.log(`    voice: ${VOICE} @ ${RATE} wpm\n`);

// ── Clean ───────────────────────────────────────────────────────────────────

if (flag('--clean')) {
  const list = await (await fetch(`${BASE}/api/media/sounds`)).json();
  let n = 0;
  for (const f of list.files || []) {
    if (!f.startsWith('v-')) continue;
    await fetch(`${BASE}/api/media/sounds/${encodeURIComponent(f)}`, { method: 'DELETE' });
    n++;
  }
  console.log(`  removed ${n} baked voice files\n`);
  process.exit(0);
}

// ── Bake and upload ─────────────────────────────────────────────────────────

if (process.platform !== 'darwin') {
  console.log('  This uses macOS `say`. On Linux, swap in piper or espeak-ng —');
  console.log('  anything that writes a WAV will do; only the two lines below change.\n');
  process.exit(1);
}

const existing = new Set(((await (await fetch(`${BASE}/api/media/sounds`)).json()).files) || []);
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'reachy-voice-'));
let baked = 0, skipped = 0, failed = 0;

for (const e of entries) {
  if (existing.has(e.file)) { skipped++; continue; }

  const wav = path.join(tmp, e.file);
  // No shell: the lines contain apostrophes and exclamation marks.
  const say = spawnSync('say', ['-v', VOICE, '-r', RATE, '-o', wav,
    '--data-format=LEI16@22050', e.text], { encoding: 'utf8' });
  if (say.status !== 0 || !fs.existsSync(wav)) {
    console.log(`  ✘ say failed: "${e.text.slice(0, 44)}…" ${(say.stderr || '').trim()}`);
    failed++;
    continue;
  }

  const fd = new FormData();
  fd.append('file', new Blob([fs.readFileSync(wav)], { type: 'audio/wav' }), e.file);
  try {
    const r = await fetch(`${BASE}/api/media/sounds/upload`, {
      method: 'POST', body: fd, signal: AbortSignal.timeout(20000),
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const kb = (fs.statSync(wav).size / 1024).toFixed(0);
    console.log(`  ✔ ${String(kb).padStart(4)} KB  "${e.text.slice(0, 52)}${e.text.length > 52 ? '…' : ''}"`);
    baked++;
  } catch (err) {
    console.log(`  ✘ upload failed for "${e.text.slice(0, 40)}…" — ${err.message}`);
    failed++;
  }
}

fs.rmSync(tmp, { recursive: true, force: true });

const after = ((await (await fetch(`${BASE}/api/media/sounds`)).json()).files || [])
  .filter((f) => f.startsWith('v-')).length;

console.log(`\n  ${baked} baked, ${skipped} already there, ${failed} failed`);
console.log(`  ${after} of ${entries.length} lines now have a voice on the robot\n`);

if (baked || skipped) {
  console.log('  Try it: open a quest with a talking tile — e4-3 "Make Him Talk" is');
  console.log('  the obvious one — and the words should come out of HIM, not the iPad.');
  console.log('  Anything not baked still falls back to tablet speech.\n');
}

// The daemon keeps these in /tmp, which a reboot clears.
console.log('  Note: /tmp/reachy_mini_sounds is cleared when he reboots. Re-run then.\n');
process.exit(failed ? 1 : 0);
