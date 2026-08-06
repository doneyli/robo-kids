#!/usr/bin/env node
/* ============================================================================
 * live-robot.mjs — opt-in hardware smoke test
 *
 *   cd robot-lab && node test/live-robot.mjs
 *   cd robot-lab && node test/live-robot.mjs 192.168.1.15
 *
 * Deliberately NOT a *.test.mjs file, so `node --test test/` never picks it up.
 * It moves a real robot; that should always be something you chose to do.
 *
 * What it proves, in order of importance:
 *   1. The CORS headers the entire architecture depends on are still there.
 *      (Node's fetch does not enforce CORS, so we assert on the HEADERS, not
 *      on whether the request succeeded — otherwise this test would pass even
 *      if a firmware update had broken every browser client.)
 *   2. The daemon's endpoints still have the shapes reachy.js expects.
 *   3. Commands actually move the hardware, confirmed by reading state back.
 *   4. The safety clamp holds against a deliberately dangerous request.
 * ==========================================================================*/

import { loadApp, SCRIPTS } from '../test/harness.mjs';

const HOSTS = process.argv[2] ? [process.argv[2]] : ['reachy-mini.local', '192.168.1.15'];
const PORT = 8000;
const DATASET = 'pollen-robotics/reachy-mini-emotions-library';

let pass = 0, fail = 0, skip = 0;
const failures = [];

function ok(name, detail) { pass++; console.log(`  \x1b[32m✔\x1b[0m ${name}${detail ? '  — ' + detail : ''}`); }
function no(name, detail) { fail++; failures.push(name + ' — ' + detail); console.log(`  \x1b[31m✘\x1b[0m ${name}  — ${detail}`); }
function meh(name, detail) { skip++; console.log(`  \x1b[33m∼\x1b[0m ${name}  — ${detail}`); }
function head(t) { console.log(`\n\x1b[1m${t}\x1b[0m`); }

const rad2deg = (r) => (r * 180) / Math.PI;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function jget(base, path, ms = 6000) {
  const r = await fetch(base + path, { signal: AbortSignal.timeout(ms) });
  if (!r.ok) throw new Error(`HTTP ${r.status} on ${path}`);
  return r.json();
}
async function jpost(base, path, body, ms = 12000) {
  const r = await fetch(base + path, {
    method: 'POST',
    signal: AbortSignal.timeout(ms),
    ...(body ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status} on ${path}: ${(await r.text()).slice(0, 120)}`);
  const ct = r.headers.get('content-type') || '';
  return ct.includes('json') ? r.json() : r.text();
}

async function findRobot() {
  for (const h of HOSTS) {
    const base = `http://${h}:${PORT}`;
    try {
      const s = await jget(base, '/api/daemon/status', 2500);
      return { base, host: h, status: s };
    } catch { /* try the next one */ }
  }
  return null;
}

const found = await findRobot();

if (!found) {
  console.log(`\n\x1b[33mNo robot answering on ${HOSTS.join(' or ')}:${PORT}.\x1b[0m`);
  console.log('This test needs the real hardware. See docs/RUNBOOK.md.');
  console.log('The rest of the suite (node --test test/) does not — it never touches the network.\n');
  process.exit(0);
}

const { base, host, status } = found;
console.log(`\n\x1b[1mLive robot smoke test\x1b[0m  →  ${host}:${PORT}`);
console.log(`daemon v${status.version}  wireless=${status.wireless_version}  state=${status.state}  ip=${status.wlan_ip}`);

// ── 1. The load-bearing CORS contract ───────────────────────────────────────
head('1. CORS — the header the whole architecture rests on');
try {
  const r = await fetch(base + '/api/move/goto', {
    method: 'OPTIONS',
    headers: { Origin: 'http://localhost:4200', 'Access-Control-Request-Method': 'POST' },
    signal: AbortSignal.timeout(6000),
  });
  const acao = r.headers.get('access-control-allow-origin');
  const acam = r.headers.get('access-control-allow-methods') || '';
  if (acao === '*' || acao === 'http://localhost:4200') ok('preflight allows this origin', `access-control-allow-origin: ${acao}`);
  else no('preflight allows this origin', `access-control-allow-origin: ${acao || '(absent)'} — browsers will BLOCK the app. See ADR 0001.`);

  if (/POST/i.test(acam)) ok('preflight allows POST', acam);
  else no('preflight allows POST', `access-control-allow-methods: ${acam || '(absent)'}`);
} catch (e) {
  no('preflight reachable', e.message);
}

// ── 2. Endpoint shapes reachy.js relies on ──────────────────────────────────
head('2. Endpoint contracts');

if (status.state !== 'running') {
  try {
    await jpost(base, '/api/daemon/start?wake_up=false', null, 25000);
    for (let i = 0; i < 15; i++) {
      await sleep(1000);
      const s = await jget(base, '/api/daemon/status');
      if (s.state === 'running') break;
    }
    ok('daemon/start?wake_up=false booted the backend');
  } catch (e) {
    no('daemon/start?wake_up=false', e.message);
  }
} else {
  ok('motor backend already running');
}

// The wake_up param really is mandatory — assert the 422, so a future firmware
// that makes it optional shows up here rather than as a mystery in the app.
try {
  const r = await fetch(base + '/api/daemon/start', { method: 'POST', signal: AbortSignal.timeout(6000) });
  if (r.status === 422) ok('daemon/start without wake_up still 422s', 'documented quirk holds');
  else meh('daemon/start without wake_up', `now returns ${r.status} — the quirk may have been fixed; CLAUDE.md can be simplified`);
} catch (e) {
  meh('daemon/start without wake_up', e.message);
}

let state0;
try {
  state0 = await jget(base, '/api/state/full');
  const h = state0.head_pose || {};
  const shaped = ['x', 'y', 'z', 'roll', 'pitch', 'yaw'].every((k) => typeof h[k] === 'number');
  if (shaped && Array.isArray(state0.antennas_position) && typeof state0.body_yaw === 'number') {
    ok('state/full shape', `pitch ${rad2deg(h.pitch).toFixed(1)}° yaw ${rad2deg(h.yaw).toFixed(1)}° body ${rad2deg(state0.body_yaw).toFixed(1)}°`);
  } else {
    no('state/full shape', 'missing head_pose/antennas_position/body_yaw — reachy.js readState() will break');
  }
} catch (e) {
  no('state/full', e.message);
}

try {
  const cam = await jget(base, '/api/camera/specs');
  ok('camera/specs', `${cam.name}, ${cam.available_resolutions.length} resolutions, K matrix ${cam.K ? 'present' : 'MISSING'}`);
} catch (e) {
  no('camera/specs', e.message);
}

try {
  const emo = await jget(base, `/api/move/recorded-move-datasets/list/${encodeURIComponent(DATASET)}`, 15000);
  if (Array.isArray(emo) && emo.length === 81) ok('81 emotions present', 'dataset slash correctly encoded as %2F');
  else if (Array.isArray(emo)) meh('emotion count', `${emo.length}, expected 81 — update assets/data/emotions.js NAMES`);
  else no('emotion list', JSON.stringify(emo).slice(0, 140));

  // The catalogue must not reference an emotion the robot does not have.
  const g = loadApp(SCRIPTS.data, {});
  const missing = (g.ROBOT_LAB_EMOTIONS.ALL || []).map((e) => e.name).filter((n) => !emo.includes(n));
  if (!missing.length) ok('catalogue matches the robot', 'no phantom emotions');
  else no('catalogue matches the robot', `not on robot: ${missing.join(', ')}`);
} catch (e) {
  no('emotion list', e.message);
}

// ── 3. Does it actually move? ───────────────────────────────────────────────
head('3. Real movement, confirmed by reading state back');

async function commandAndMeasure(label, body, settleMs, read) {
  await jpost(base, '/api/move/goto', body);
  await sleep(settleMs);
  const s = await jget(base, '/api/state/full');
  return read(s);
}

try {
  // Assert the DELTA, not the absolute angle.
  //
  // The reported pose comes from forward kinematics on the motor encoders, and at
  // mechanical rest this robot reports several degrees of pitch rather than zero.
  // An absolute assertion therefore measures the calibration offset rather than
  // whether the command worked. (The gap between commanded and measured is itself
  // the subject of quest b1-6 — it is a lesson, not a defect.)
  await jpost(base, '/api/move/goto', {
    head_pose: { x: 0, y: 0, z: 0, roll: 0, pitch: 0, yaw: 0 }, duration: 0.8, interpolation: 'minjerk',
  });
  await sleep(1400);
  const rest = rad2deg((await jget(base, '/api/state/full')).head_pose.pitch);

  const after = await commandAndMeasure(
    'pitch', { head_pose: { pitch: 0.3490658503988659 }, duration: 0.8, interpolation: 'minjerk' },
    1800, (s) => rad2deg(s.head_pose.pitch)
  );
  const delta = after - rest;
  if (delta > 12 && delta < 28) {
    ok('commanded pitch +20° → moved', `${rest.toFixed(1)}° → ${after.toFixed(1)}° (Δ ${delta.toFixed(1)}°)`);
  } else {
    no('commanded pitch +20°', `${rest.toFixed(1)}° → ${after.toFixed(1)}° (Δ ${delta.toFixed(1)}°, expected ~20°)`);
  }
} catch (e) {
  no('pitch move', e.message);
}

try {
  const measured = await commandAndMeasure(
    'antennas', { antennas: [1.2217304763960306, -1.2217304763960306], duration: 0.4, interpolation: 'cartoon' },
    900, (s) => rad2deg(s.antennas_position[0])
  );
  if (Math.abs(measured - 70) < 20) ok('commanded antennas ±70° → moved', `measured ${measured.toFixed(1)}°`);
  else no('antenna move', `measured ${measured.toFixed(1)}°, expected near 70°`);
} catch (e) {
  no('antenna move', e.message);
}

try {
  const t0 = Date.now();
  const res = await jpost(base, `/api/move/play/recorded-move-dataset/${encodeURIComponent(DATASET)}/cheerful1`);
  if (res && res.uuid) ok('recorded emotion plays', `uuid returned in ${Date.now() - t0}ms`);
  else no('recorded emotion', JSON.stringify(res).slice(0, 120));
  await sleep(2800);
} catch (e) {
  no('recorded emotion', e.message);
}

// ── 4. The safety clamp, on real hardware ───────────────────────────────────
head('4. Safety clamp against a deliberately dangerous request');
try {
  const g = loadApp(SCRIPTS.reachy, {});
  const RL = g.RobotLink;

  // What the app WOULD send if a child dragged every slider to its limit.
  const clamped = RL.clampPose({ head: { pitch: 90, roll: 90 }, bodyYaw: 400, antennas: [900, -900] }).deg;
  const wire = RL.toWire(clamped, 1.0, 'minjerk');

  const checks = [
    ['pitch ≤ 40°', Math.abs(rad2deg(wire.head_pose.pitch)) <= 40.001, `${rad2deg(wire.head_pose.pitch).toFixed(1)}°`],
    ['roll ≤ 40°', Math.abs(rad2deg(wire.head_pose.roll)) <= 40.001, `${rad2deg(wire.head_pose.roll).toFixed(1)}°`],
    ['body yaw ≤ 160°', Math.abs(rad2deg(wire.body_yaw)) <= 160.001, `${rad2deg(wire.body_yaw).toFixed(1)}°`],
    ['head−body yaw ≤ 65°', Math.abs(rad2deg(wire.head_pose.yaw) - rad2deg(wire.body_yaw)) <= 65.001,
      `${(rad2deg(wire.head_pose.yaw) - rad2deg(wire.body_yaw)).toFixed(1)}°`],
    ['antennas ≤ 150°', Math.abs(rad2deg(wire.antennas[0])) <= 150.001, `${rad2deg(wire.antennas[0]).toFixed(1)}°`],
  ];
  for (const [name, good, detail] of checks) {
    if (good) ok('clamp: ' + name, detail);
    else no('clamp: ' + name, detail);
  }

  // Send the clamped payload for real; the robot must accept it without complaint.
  await jpost(base, '/api/move/goto', wire);
  await sleep(2200);
  const s = await jget(base, '/api/state/full');
  const p = Math.abs(rad2deg(s.head_pose.pitch)), b = Math.abs(rad2deg(s.body_yaw));
  if (p <= 42 && b <= 162) ok('hardware stayed inside limits', `pitch ${p.toFixed(1)}° body ${b.toFixed(1)}°`);
  else no('hardware stayed inside limits', `pitch ${p.toFixed(1)}° body ${b.toFixed(1)}°`);
} catch (e) {
  no('clamp on hardware', e.message);
}

// ── Leave him tidy ──────────────────────────────────────────────────────────
head('Tidying up');
try {
  await jpost(base, '/api/motors/set_mode/enabled');
  await jpost(base, '/api/move/goto', {
    head_pose: { x: 0, y: 0, z: 0, roll: 0, pitch: 0, yaw: 0 },
    antennas: [0, 0], body_yaw: 0, duration: 1.2, interpolation: 'minjerk',
  });
  await sleep(1500);
  ok('returned to rest, motors enabled');
} catch (e) {
  meh('tidy up', e.message);
}

console.log(`\n\x1b[1m${pass} passed, ${fail} failed, ${skip} noted\x1b[0m`);
if (fail) {
  console.log('\nFailures:');
  for (const f of failures) console.log('  • ' + f);
  console.log('\nSee docs/RUNBOOK.md and docs/decisions/0001-browser-drives-the-robot-directly.md');
}
console.log('');
process.exit(fail ? 1 : 0);
