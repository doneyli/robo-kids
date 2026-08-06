/* ============================================================================
 * reachy.test.mjs — the safety-critical layer
 *
 * reachy.js is the only thing standing between a dragged slider and a servo.
 * The daemon clamps too, but we clamp FIRST so the on-screen robot and the real
 * one agree, and so an eight-year-old typing 9999 into a number box does not
 * discover a hardware limit the hard way.
 *
 * Three properties are worth more than the rest of this file put together:
 *   1. clampPose NEVER returns a pose that breaks a limit — including the
 *      coupled |head yaw - body yaw| <= 65 one, which is the only limit that
 *      couples two axes and therefore the only one where satisfying it could
 *      break something else.
 *   2. toWire converts degrees/mm to radians/metres exactly.
 *   3. No robot verb ever rejects. A session with a 4-year-old must not
 *      dead-end on a dropped WiFi packet.
 *
 * Nothing here touches the network. `fetch` is always a stub.
 * ==========================================================================*/

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadApp, SCRIPTS, makeFetch, lcg } from './harness.mjs';

// ── fixtures ────────────────────────────────────────────────────────────────

const G = loadApp(SCRIPTS.reachy);
const RobotLink = G.RobotLink;
const LIMITS = RobotLink.LIMITS;

/** clampPose, unwrapped to the degrees payload the rest of the app sees. */
const cp = (req) => RobotLink.clampPose(req).deg;

/**
 * Realm-normalised deep equality.
 *
 * The app scripts are evaluated inside a node:vm context, so every object they
 * return carries THAT realm's Object.prototype. assert/strict's deepEqual
 * compares prototypes by identity, so structurally identical data would fail.
 * A JSON round-trip drops the realm without weakening the value comparison:
 * NaN and Infinity become null, and an undefined field disappears, so any of
 * those leaking into a pose still fails the assertion loudly.
 */
function same(actual, expected, msg) {
  assert.deepStrictEqual(
    JSON.parse(JSON.stringify(actual)),
    JSON.parse(JSON.stringify(expected)),
    msg);
}

const OK_STATUS = { state: 'running', version: '1.6.3', wlan_ip: '192.168.1.15' };

function boot(routes, opts) {
  const fetchStub = makeFetch(routes || {});
  const g = loadApp(SCRIPTS.reachy, Object.assign({ fetch: fetchStub }, opts || {}));
  return { g, fetchStub };
}

const EVENTS = ['status', 'pose', 'activity', 'emotion', 'wake', 'sleep', 'stop',
  'motors', 'sound', 'volume'];

/** Record every event the link emits, in order. */
function tap(link) {
  const seen = [];
  EVENTS.forEach((e) => link.on(e, (p) => seen.push({ evt: e, payload: p })));
  seen.of = (e) => seen.filter((x) => x.evt === e);
  return seen;
}

/** A link that has completed a successful probe against reachy-mini.local. */
async function onlineLink(extraRoutes, opts) {
  const { g, fetchStub } = boot(Object.assign({
    'reachy-mini.local:8000/api/daemon/status': OK_STATUS,
  }, extraRoutes || {}), opts);
  const link = new g.RobotLink({ hosts: ['reachy-mini.local'] });
  const events = tap(link);
  assert.deepEqual(await link.connect(), 'online');
  return { g, link, fetchStub, events };
}

// ═══════════════════════════════════════════════════════════════════════════
// clampPose — per-axis limits
// ═══════════════════════════════════════════════════════════════════════════

test('clampPose: the safety envelope is the documented one', () => {
  // If a limit ever changes, it must be a deliberate edit here too — these
  // numbers were measured against the real robot.
  same(LIMITS, {
    headPitch: 40, headRoll: 40, headYaw: 180, bodyYaw: 160,
    yawDelta: 65, headXY: 25, headZ: 25, antenna: 150,
  });
});

test('clampPose: an empty request is rest position, not garbage', () => {
  // goto() is ABSOLUTE, not relative: an unspecified axis means "go to rest".
  same(cp({}), {
    head: { x: 0, y: 0, z: 0, roll: 0, pitch: 0, yaw: 0 },
    antennas: [0, 0],
    bodyYaw: 0,
  });
  same(cp({ head: null }), cp({}));
  same(cp({ head: undefined, antennas: undefined, bodyYaw: undefined }), cp({}));
});

test('clampPose: output shape is fixed — extra keys never reach the wire', () => {
  // A quest author typo like {head:{tilt:20}} must not be forwarded to the
  // daemon as an unknown field; it must be silently dropped.
  const out = cp({ head: { pitch: 10, tilt: 99, yaw: 5 }, bogus: 1, duration: 3 });
  same(Object.keys(out), ['head', 'antennas', 'bodyYaw']);
  same(Object.keys(out.head), ['x', 'y', 'z', 'roll', 'pitch', 'yaw']);
  assert.deepEqual(out.head.pitch, 10);
});

test('clampPose: head pitch clamps at +/-40 in both signs', () => {
  assert.deepEqual(cp({ head: { pitch: 40 } }).head.pitch, 40);
  assert.deepEqual(cp({ head: { pitch: 39.9 } }).head.pitch, 39.9);
  assert.deepEqual(cp({ head: { pitch: 40.0001 } }).head.pitch, 40);
  assert.deepEqual(cp({ head: { pitch: 90 } }).head.pitch, 40);
  assert.deepEqual(cp({ head: { pitch: 1e6 } }).head.pitch, 40);
  assert.deepEqual(cp({ head: { pitch: -40 } }).head.pitch, -40);
  assert.deepEqual(cp({ head: { pitch: -39.9 } }).head.pitch, -39.9);
  assert.deepEqual(cp({ head: { pitch: -40.0001 } }).head.pitch, -40);
  assert.deepEqual(cp({ head: { pitch: -1e6 } }).head.pitch, -40);
});

test('clampPose: head roll clamps at +/-40 in both signs', () => {
  assert.deepEqual(cp({ head: { roll: 40 } }).head.roll, 40);
  assert.deepEqual(cp({ head: { roll: 39.999 } }).head.roll, 39.999);
  assert.deepEqual(cp({ head: { roll: 40.001 } }).head.roll, 40);
  assert.deepEqual(cp({ head: { roll: 400 } }).head.roll, 40);
  assert.deepEqual(cp({ head: { roll: -40 } }).head.roll, -40);
  assert.deepEqual(cp({ head: { roll: -39.999 } }).head.roll, -39.999);
  assert.deepEqual(cp({ head: { roll: -40.001 } }).head.roll, -40);
  assert.deepEqual(cp({ head: { roll: -400 } }).head.roll, -40);
});

test('clampPose: head yaw clamps at +/-180 when the body allows it', () => {
  // Head yaw's own +/-180 limit is only OBSERVABLE when the body is turned far
  // enough that the coupled 65 deg limit is not the binding constraint. With
  // bodyYaw 160 the legal head window is [95, 180]; with -160 it is [-180, -95].
  assert.deepEqual(cp({ head: { yaw: 180 }, bodyYaw: 160 }).head.yaw, 180);
  assert.deepEqual(cp({ head: { yaw: 179.5 }, bodyYaw: 160 }).head.yaw, 179.5);
  assert.deepEqual(cp({ head: { yaw: 180.5 }, bodyYaw: 160 }).head.yaw, 180);
  assert.deepEqual(cp({ head: { yaw: 1e6 }, bodyYaw: 160 }).head.yaw, 180);
  assert.deepEqual(cp({ head: { yaw: -180 }, bodyYaw: -160 }).head.yaw, -180);
  assert.deepEqual(cp({ head: { yaw: -179.5 }, bodyYaw: -160 }).head.yaw, -179.5);
  assert.deepEqual(cp({ head: { yaw: -180.5 }, bodyYaw: -160 }).head.yaw, -180);
  assert.deepEqual(cp({ head: { yaw: -1e6 }, bodyYaw: -160 }).head.yaw, -180);
});

test('clampPose: body yaw clamps at +/-160 in both signs', () => {
  assert.deepEqual(cp({ bodyYaw: 160 }).bodyYaw, 160);
  assert.deepEqual(cp({ bodyYaw: 159.5 }).bodyYaw, 159.5);
  assert.deepEqual(cp({ bodyYaw: 160.5 }).bodyYaw, 160);
  assert.deepEqual(cp({ bodyYaw: 1e6 }).bodyYaw, 160);
  assert.deepEqual(cp({ bodyYaw: -160 }).bodyYaw, -160);
  assert.deepEqual(cp({ bodyYaw: -159.5 }).bodyYaw, -159.5);
  assert.deepEqual(cp({ bodyYaw: -160.5 }).bodyYaw, -160);
  assert.deepEqual(cp({ bodyYaw: -1e6 }).bodyYaw, -160);
});

test('clampPose: head x and y clamp at +/-25 mm, z at +/-25 mm', () => {
  assert.deepEqual(cp({ head: { x: 25 } }).head.x, 25);
  assert.deepEqual(cp({ head: { x: 24.9 } }).head.x, 24.9);
  assert.deepEqual(cp({ head: { x: 25.1 } }).head.x, 25);
  assert.deepEqual(cp({ head: { x: 5000 } }).head.x, 25);
  assert.deepEqual(cp({ head: { x: -25 } }).head.x, -25);
  assert.deepEqual(cp({ head: { x: -25.1 } }).head.x, -25);
  assert.deepEqual(cp({ head: { x: -5000 } }).head.x, -25);

  assert.deepEqual(cp({ head: { y: 25 } }).head.y, 25);
  assert.deepEqual(cp({ head: { y: 25.1 } }).head.y, 25);
  assert.deepEqual(cp({ head: { y: -25.1 } }).head.y, -25);
  assert.deepEqual(cp({ head: { y: -1e9 } }).head.y, -25);

  assert.deepEqual(cp({ head: { z: 25 } }).head.z, 25);
  assert.deepEqual(cp({ head: { z: 25.1 } }).head.z, 25);
  assert.deepEqual(cp({ head: { z: -25 } }).head.z, -25);
  assert.deepEqual(cp({ head: { z: -25.1 } }).head.z, -25);
  assert.deepEqual(cp({ head: { z: 1e9 } }).head.z, 25);
});

test('clampPose: antennas clamp at +/-150 and always come back as a pair', () => {
  same(cp({ antennas: [150, -150] }).antennas, [150, -150]);
  same(cp({ antennas: [149.5, -149.5] }).antennas, [149.5, -149.5]);
  same(cp({ antennas: [151, -151] }).antennas, [150, -150]);
  same(cp({ antennas: [9999, -9999] }).antennas, [150, -150]);
  // A short, empty, or absent array must still yield exactly two numbers, or
  // the wire payload becomes [n, undefined] and the daemon 422s.
  same(cp({ antennas: [] }).antennas, [0, 0]);
  same(cp({ antennas: [70] }).antennas, [70, 0]);
  same(cp({}).antennas, [0, 0]);
  // A third element is ignored rather than forwarded.
  same(cp({ antennas: [10, 20, 30] }).antennas, [10, 20]);
});

// ═══════════════════════════════════════════════════════════════════════════
// clampPose — the COUPLED constraint |head yaw - body yaw| <= 65
// ═══════════════════════════════════════════════════════════════════════════

test('coupled limit: each axis legal on its own, the pair is not', () => {
  // 100 is a legal head yaw (<=180) and 0 is a legal body yaw (<=160), but the
  // neck cannot twist 100 deg away from the shoulders it sits on.
  assert.deepEqual(cp({ head: { yaw: 100 }, bodyYaw: 0 }).head.yaw, 65);
  assert.deepEqual(cp({ head: { yaw: -100 }, bodyYaw: 0 }).head.yaw, -65);
  assert.deepEqual(cp({ head: { yaw: 180 }, bodyYaw: 0 }).head.yaw, 65);
  assert.deepEqual(cp({ head: { yaw: 120 }, bodyYaw: 30 }).head.yaw, 95);
  assert.deepEqual(cp({ head: { yaw: -120 }, bodyYaw: -30 }).head.yaw, -95);
  // Opposite signs: worst case for the pair.
  same(pair(cp({ head: { yaw: 180 }, bodyYaw: -160 })), [-95, -160]);
  same(pair(cp({ head: { yaw: -180 }, bodyYaw: 160 })), [95, 160]);
});

test('coupled limit: exactly 65 apart is legal and untouched', () => {
  // Boundary is inclusive (`> 65`, not `>= 65`); a gesture that deliberately
  // sits at the limit must not be nudged.
  assert.deepEqual(cp({ head: { yaw: 65 }, bodyYaw: 0 }).head.yaw, 65);
  assert.deepEqual(cp({ head: { yaw: -65 }, bodyYaw: 0 }).head.yaw, -65);
  assert.deepEqual(cp({ head: { yaw: 105 }, bodyYaw: 40 }).head.yaw, 105);
  assert.deepEqual(cp({ head: { yaw: -25 }, bodyYaw: 40 }).head.yaw, -25);
});

test('coupled limit: clamping body yaw DRAGS head yaw off zero', () => {
  // Regression-shaped: asking for a 400 deg body turn with the head left at 0
  // must not silently produce head yaw 0 — the body ends at 160, so the head
  // is physically forced to 95. A zero here would mean the coupled constraint
  // was evaluated against the UNCLAMPED body yaw.
  const out = cp({ bodyYaw: 400 });
  assert.deepEqual(out.bodyYaw, 160);
  assert.deepEqual(out.head.yaw, 95);
  assert.notEqual(out.head.yaw, 0);

  const neg = cp({ bodyYaw: -400 });
  assert.deepEqual(neg.bodyYaw, -160);
  assert.deepEqual(neg.head.yaw, -95);
  assert.notEqual(neg.head.yaw, 0);

  // 100 is inside the body limit, so no body clamping — but the head still moves.
  same(pair(cp({ bodyYaw: 100 })), [35, 100]);
  same(pair(cp({ bodyYaw: -100 })), [-35, -100]);
  // 65 or less of body turn leaves the head alone.
  same(pair(cp({ bodyYaw: 65 })), [0, 65]);
  same(pair(cp({ bodyYaw: 64 })), [0, 64]);
  same(pair(cp({ bodyYaw: 66 })), [1, 66]);
});

test('coupled limit: satisfying it never violates an individual limit', () => {
  // The fix for the coupled limit is `yaw = bodyYaw +/- 65`, which can overshoot
  // +/-180 on paper. Both maxima at once is the case that would expose it.
  const both = cp({ head: { yaw: 1e9 }, bodyYaw: 1e9 });
  same(pair(both), [180, 160]);
  assert.ok(Math.abs(both.head.yaw - both.bodyYaw) <= LIMITS.yawDelta);

  const bothNeg = cp({ head: { yaw: -1e9 }, bodyYaw: -1e9 });
  same(pair(bothNeg), [-180, -160]);
  assert.ok(Math.abs(bothNeg.head.yaw - bothNeg.bodyYaw) <= LIMITS.yawDelta);

  // Body just inside its limit, head asked far past its own.
  same(pair(cp({ head: { yaw: 300 }, bodyYaw: 159 })), [180, 159]);
  same(pair(cp({ head: { yaw: -300 }, bodyYaw: -159 })), [-180, -159]);
  // bodyYaw 115 is the crossover where bodyYaw+65 would land exactly on 180.
  same(pair(cp({ head: { yaw: 999 }, bodyYaw: 115 })), [180, 115]);
  same(pair(cp({ head: { yaw: 999 }, bodyYaw: 116 })), [180, 116]);
  same(pair(cp({ head: { yaw: 999 }, bodyYaw: 114 })), [179, 114]);
});

test('coupled limit: the other axes are untouched by the yaw fix-up', () => {
  // Pulling the head yaw back must not disturb pitch/roll/translation, or a
  // "look left while nodding" gesture would lose the nod.
  const out = cp({ head: { yaw: 170, pitch: 30, roll: -20, x: 10, y: -10, z: 5 }, bodyYaw: 0, antennas: [40, -40] });
  same(out, {
    head: { x: 10, y: -10, z: 5, roll: -20, pitch: 30, yaw: 65 },
    antennas: [40, -40],
    bodyYaw: 0,
  });
});

function pair(out) { return [out.head.yaw, out.bodyYaw]; }

// ═══════════════════════════════════════════════════════════════════════════
// clampPose — hostile input
// ═══════════════════════════════════════════════════════════════════════════

test('clampPose: NaN, null, undefined and empty string all become 0', () => {
  // A number <input> that has been cleared yields '', and a failed parseFloat
  // yields NaN. Both must read as "rest", never leak to the wire as NaN — the
  // daemon rejects NaN and the whole move is lost.
  [NaN, null, undefined, ''].forEach((bad) => {
    const out = cp({ head: { pitch: bad, roll: bad, yaw: bad, x: bad, y: bad, z: bad }, bodyYaw: bad, antennas: [bad, bad] });
    same(out, {
      head: { x: 0, y: 0, z: 0, roll: 0, pitch: 0, yaw: 0 },
      antennas: [0, 0], bodyYaw: 0,
    }, 'input ' + String(bad));
    Object.values(out.head).forEach((v) => assert.ok(Number.isFinite(v)));
  });
});

test('clampPose: non-numeric strings become 0, numeric strings are parsed', () => {
  const junk = cp({ head: { pitch: 'abc', roll: 'NaN', yaw: '{}' }, bodyYaw: 'left', antennas: ['x', 'y'] });
  same(junk, {
    head: { x: 0, y: 0, z: 0, roll: 0, pitch: 0, yaw: 0 },
    antennas: [0, 0], bodyYaw: 0,
  });

  const strs = cp({ head: { pitch: '30', roll: '-12.5', x: '12.5' }, bodyYaw: '90', antennas: ['200', '-7'] });
  assert.deepEqual(strs.head.pitch, 30);
  assert.deepEqual(strs.head.roll, -12.5);
  assert.deepEqual(strs.head.x, 12.5);
  assert.deepEqual(strs.bodyYaw, 90);
  same(strs.antennas, [150, -7]);
  // '-1e3' parses to -1000 and then clamps, rather than being treated as junk.
  assert.deepEqual(cp({ head: { pitch: '-1e3' } }).head.pitch, -40);
});

test('clampPose: Infinity saturates at the limit instead of escaping it', () => {
  // Infinity is truthy so it survives `Number(v) || 0` and must be caught by the
  // clamp itself. If it leaked, JSON.stringify would emit `null` and the daemon
  // would 422 the whole move.
  const out = cp({
    head: { pitch: Infinity, roll: -Infinity, yaw: Infinity, x: Infinity, y: -Infinity, z: -Infinity },
    bodyYaw: -Infinity,
    antennas: [Infinity, -Infinity],
  });
  same(out, {
    head: { x: 25, y: -25, z: -25, roll: -40, pitch: 40, yaw: -95 },
    antennas: [150, -150],
    bodyYaw: -160,
  });
  assert.deepEqual(JSON.stringify(out).indexOf('null'), -1);
});

test('clampPose: booleans, objects and arrays degrade to numbers safely', () => {
  assert.deepEqual(cp({ head: { pitch: true } }).head.pitch, 1);
  assert.deepEqual(cp({ head: { pitch: false } }).head.pitch, 0);
  assert.deepEqual(cp({ head: { pitch: {} } }).head.pitch, 0);
  assert.deepEqual(cp({ head: { pitch: [] } }).head.pitch, 0);
  assert.deepEqual(cp({ head: { pitch: [7] } }).head.pitch, 7);
  // head given as a non-object is treated as "no axes specified".
  same(cp({ head: [] }), cp({}));
  same(cp({ head: 0 }), cp({}));
  same(cp({ head: 'nope' }), cp({}));
});

// ═══════════════════════════════════════════════════════════════════════════
// clampPose — idempotency
// ═══════════════════════════════════════════════════════════════════════════

test('clampPose: clamping an already-clamped pose changes nothing', () => {
  // The app re-clamps on every frame of a drag, and the simulator feeds poses
  // back in. If clamping were not a fixed point, a held slider would creep.
  const cases = [
    {}, { head: { pitch: 40, roll: -40, yaw: 180 }, bodyYaw: 160, antennas: [150, -150] },
    { bodyYaw: 400 }, { bodyYaw: -400 }, { head: { yaw: 100 } }, { head: { yaw: -100 } },
    { head: { yaw: 1e9, pitch: 1e9, roll: -1e9, x: 99, y: -99, z: 99 }, bodyYaw: -1e9, antennas: [999, -999] },
    { head: { yaw: 33.3 }, bodyYaw: -114.7 },
    { head: { yaw: -307.6923076923077 }, bodyYaw: -114.74226804123712 },
  ];
  for (const c of cases) {
    const once = cp(c);
    const twice = cp({ head: once.head, antennas: once.antennas, bodyYaw: once.bodyYaw });
    same(twice, once, 'not a fixed point for ' + JSON.stringify(c));
    const thrice = cp({ head: twice.head, antennas: twice.antennas, bodyYaw: twice.bodyYaw });
    same(thrice, once);
  }
});

// ═══════════════════════════════════════════════════════════════════════════
// clampPose — deterministic property sweep
// ═══════════════════════════════════════════════════════════════════════════

test('clampPose: 300 seeded poses all satisfy every limit simultaneously', () => {
  // The real guarantee is not "each clamp works" but "no combination of inputs
  // can produce an illegal pose". Math.random is unavailable, so this walks a
  // seeded LCG — same 300 poses on every machine, forever.
  //
  // EPS: the coupled fix-up is `bodyYaw +/- 65` in floating point, so a
  // fractional bodyYaw can leave |yaw - bodyYaw| at 65.00000000000001. That is
  // 1e-14 of a degree; the tolerance is for IEEE754, not for the robot.
  const EPS = 1e-9;
  const N = 300;
  const draws = [...lcg(20260726, N * 8)];
  const span = (v, s) => ((v % (2 * s * 10 + 1)) / 10) - s;

  let coupledHits = 0, bodyClamped = 0, headYawClamped = 0, pitchClamped = 0;

  for (let i = 0; i < N; i++) {
    const d = draws.slice(i * 8, i * 8 + 8);
    const req = {
      head: {
        pitch: span(d[0], 300), roll: span(d[1], 300), yaw: span(d[2], 400),
        x: span(d[3], 100), y: span(d[4], 100), z: span(d[5], 100),
      },
      bodyYaw: span(d[6], 400),
      antennas: [span(d[7], 400), span(d[0] + d[7], 400)],
    };
    const o = cp(req);
    const where = 'pose #' + i + ' ' + JSON.stringify(req) + ' -> ' + JSON.stringify(o);

    assert.ok(Math.abs(o.head.pitch) <= LIMITS.headPitch + EPS, 'pitch ' + where);
    assert.ok(Math.abs(o.head.roll) <= LIMITS.headRoll + EPS, 'roll ' + where);
    assert.ok(Math.abs(o.head.yaw) <= LIMITS.headYaw + EPS, 'head yaw ' + where);
    assert.ok(Math.abs(o.bodyYaw) <= LIMITS.bodyYaw + EPS, 'body yaw ' + where);
    assert.ok(Math.abs(o.head.yaw - o.bodyYaw) <= LIMITS.yawDelta + EPS, 'yaw delta ' + where);
    assert.ok(Math.abs(o.head.x) <= LIMITS.headXY + EPS, 'x ' + where);
    assert.ok(Math.abs(o.head.y) <= LIMITS.headXY + EPS, 'y ' + where);
    assert.ok(Math.abs(o.head.z) <= LIMITS.headZ + EPS, 'z ' + where);
    assert.ok(Math.abs(o.antennas[0]) <= LIMITS.antenna + EPS, 'antenna L ' + where);
    assert.ok(Math.abs(o.antennas[1]) <= LIMITS.antenna + EPS, 'antenna R ' + where);
    [o.head.x, o.head.y, o.head.z, o.head.roll, o.head.pitch, o.head.yaw,
      o.bodyYaw, o.antennas[0], o.antennas[1]].forEach((v) => {
      assert.ok(Number.isFinite(v), 'non-finite in ' + where);
    });

    // Same input twice must give the same output, and re-clamping must be a
    // no-op — the sweep is also an idempotency sweep.
    same(cp(req), o, 'not deterministic: ' + where);
    same(cp({ head: o.head, antennas: o.antennas, bodyYaw: o.bodyYaw }), o,
      'not a fixed point: ' + where);

    if (Math.abs(Math.min(180, Math.max(-180, req.head.yaw)) - o.head.yaw) > EPS) coupledHits++;
    if (Math.abs(req.bodyYaw) > LIMITS.bodyYaw) bodyClamped++;
    if (Math.abs(req.head.yaw) > LIMITS.headYaw) headYawClamped++;
    if (Math.abs(req.head.pitch) > LIMITS.headPitch) pitchClamped++;
  }

  // Without these the sweep could be 300 trivially-legal poses and pass vacuously.
  assert.ok(coupledHits > 100, 'coupled limit barely exercised: ' + coupledHits + '/' + N);
  assert.ok(bodyClamped > 30, 'body yaw limit barely exercised: ' + bodyClamped);
  assert.ok(headYawClamped > 30, 'head yaw limit barely exercised: ' + headYawClamped);
  assert.ok(pitchClamped > 200, 'pitch limit barely exercised: ' + pitchClamped);
});

// ═══════════════════════════════════════════════════════════════════════════
// toWire — unit conversion at the boundary
// ═══════════════════════════════════════════════════════════════════════════

test('toWire: degrees become radians and millimetres become metres', () => {
  const w = RobotLink.toWire(cp({
    head: { x: 25, y: -25, z: 12.5, roll: 40, pitch: -40, yaw: 90 },
    bodyYaw: 90,
    antennas: [150, -150],
  }), 2.5, 'cartoon');

  same(Object.keys(w), ['head_pose', 'antennas', 'body_yaw', 'duration', 'interpolation']);
  same(Object.keys(w.head_pose), ['x', 'y', 'z', 'roll', 'pitch', 'yaw']);

  // mm -> m
  assert.deepEqual(w.head_pose.x, 0.025);
  assert.deepEqual(w.head_pose.y, -0.025);
  assert.deepEqual(w.head_pose.z, 0.0125);
  // deg -> rad, exact IEEE754 results of d * PI / 180
  assert.deepEqual(w.head_pose.roll, 0.6981317007977318);   // 40 deg
  assert.deepEqual(w.head_pose.pitch, -0.6981317007977318); // -40 deg
  assert.deepEqual(w.head_pose.yaw, 1.5707963267948966);    // 90 deg
  same(w.antennas, [2.6179938779914944, -2.6179938779914944]); // +/-150 deg
  assert.deepEqual(w.body_yaw, 1.5707963267948966);         // 90 deg
  assert.deepEqual(w.duration, 2.5);
  assert.deepEqual(w.interpolation, 'cartoon');
});

test('toWire: 30 degrees is exactly 0.5235987755982988 radians', () => {
  // Spot-check against the constant a human can verify, on every angular field.
  const rad30 = 0.5235987755982988;
  const w = RobotLink.toWire(cp({ head: { pitch: 30, roll: 30, yaw: 30 }, bodyYaw: 30, antennas: [30, 30] }));
  assert.deepEqual(w.head_pose.pitch, rad30);
  assert.deepEqual(w.head_pose.roll, rad30);
  assert.deepEqual(w.head_pose.yaw, rad30);
  assert.deepEqual(w.body_yaw, rad30);
  same(w.antennas, [rad30, rad30]);
  // 180 deg is exactly PI; 160 deg is the body limit in radians.
  assert.deepEqual(RobotLink.toWire(cp({ head: { yaw: 180 }, bodyYaw: 160 })).head_pose.yaw, Math.PI);
  assert.deepEqual(RobotLink.toWire(cp({ bodyYaw: 160 })).body_yaw, 2.792526803190927);
});

test('toWire: a rest pose is all zeros, never negative zero surprises', () => {
  const w = RobotLink.toWire(cp({}));
  same(w.head_pose, { x: 0, y: 0, z: 0, roll: 0, pitch: 0, yaw: 0 });
  same(w.antennas, [0, 0]);
  assert.deepEqual(w.body_yaw, 0);
});

test('toWire: interpolation defaults to minjerk', () => {
  assert.deepEqual(RobotLink.toWire(cp({}), 1).interpolation, 'minjerk');
  assert.deepEqual(RobotLink.toWire(cp({}), 1, undefined).interpolation, 'minjerk');
  assert.deepEqual(RobotLink.toWire(cp({}), 1, null).interpolation, 'minjerk');
  assert.deepEqual(RobotLink.toWire(cp({}), 1, '').interpolation, 'minjerk');
  assert.deepEqual(RobotLink.toWire(cp({}), 1, 'linear').interpolation, 'linear');
  assert.deepEqual(RobotLink.toWire(cp({}), 1, 'ease_in_out').interpolation, 'ease_in_out');
});

// ── REGRESSION 1: duration 0 must not become 1.0 ────────────────────────────

test('toWire REGRESSION: an explicit duration of 0 clamps to 0.1, not 1.0', () => {
  // `Number(duration) || 1.0` treats 0 as falsy, so "as fast as possible"
  // silently became a full second. That is a whole-second lag on every
  // joystick frame, and it made setTarget-style control feel broken.
  assert.deepEqual(RobotLink.toWire(cp({}), 0).duration, 0.1);
  assert.deepEqual(RobotLink.toWire(cp({}), -0).duration, 0.1);
  assert.deepEqual(RobotLink.toWire(cp({}), '0').duration, 0.1);
  assert.deepEqual(RobotLink.toWire(cp({}), 0.0).duration, 0.1);
  // Below the floor, and negative, also land on the floor rather than the default.
  assert.deepEqual(RobotLink.toWire(cp({}), 0.01).duration, 0.1);
  assert.deepEqual(RobotLink.toWire(cp({}), 0.1).duration, 0.1);
  assert.deepEqual(RobotLink.toWire(cp({}), -5).duration, 0.1);
  assert.deepEqual(RobotLink.toWire(cp({}), -Infinity).duration, 0.1);
});

test('toWire REGRESSION: an ABSENT duration still defaults to 1.0', () => {
  // The other half of the same bug: the fix must not turn "unspecified" into
  // the 0.1 floor, or every quest move becomes an instant snap.
  assert.deepEqual(RobotLink.toWire(cp({})).duration, 1.0);
  assert.deepEqual(RobotLink.toWire(cp({}), undefined).duration, 1.0);
  assert.deepEqual(RobotLink.toWire(cp({}), null).duration, 1.0);
  assert.deepEqual(RobotLink.toWire(cp({}), NaN).duration, 1.0);
  assert.deepEqual(RobotLink.toWire(cp({}), '').duration, 1.0);
  assert.deepEqual(RobotLink.toWire(cp({}), 'fast').duration, 1.0);
  assert.deepEqual(RobotLink.toWire(cp({}), {}).duration, 1.0);
  // And durations above the floor pass through untouched.
  assert.deepEqual(RobotLink.toWire(cp({}), 0.35).duration, 0.35);
  assert.deepEqual(RobotLink.toWire(cp({}), 1.6).duration, 1.6);
  assert.deepEqual(RobotLink.toWire(cp({}), '2.5').duration, 2.5);
  assert.deepEqual(RobotLink.toWire(cp({}), Infinity).duration, Infinity);
});

test('toWire REGRESSION: goto({duration: 0}) reaches the wire as 0.1', () => {
  // End-to-end version, because the bug was only visible through goto().
  const link = new RobotLink();
  const durations = [];
  link.on('pose', (p) => durations.push(p.duration));
  link.goto({ head: { pitch: 5 }, duration: 0 });
  link.goto({ head: { pitch: 5 } });
  link.goto({ head: { pitch: 5 }, duration: null });
  same(durations, [0.1, 1.0, 1.0]);
});

// ═══════════════════════════════════════════════════════════════════════════
// RobotLink — construction and host list
// ═══════════════════════════════════════════════════════════════════════════

test('RobotLink: defaults to mDNS name then known IP, port 8000', () => {
  const link = new RobotLink();
  same(link.hosts, ['reachy-mini.local', '192.168.1.15']);
  assert.deepEqual(link.port, 8000);
  assert.deepEqual(link.status, 'unknown');
  assert.deepEqual(link.host, null);
  assert.deepEqual(link.base('h'), 'http://h:8000');
});

test('RobotLink: a saved host is tried first', () => {
  // mDNS is the flaky part on iPadOS, so a known-good IP must win.
  const { g } = boot({}, { localStorage: { seed: { 'robotlab.host': '10.0.0.9' } } });
  const link = new g.RobotLink();
  same(link.hosts, ['10.0.0.9', 'reachy-mini.local', '192.168.1.15']);
});

test('RobotLink: constructing works when localStorage throws (private mode)', () => {
  const { g } = boot({}, { localStorage: false });
  const link = new g.RobotLink();
  same(link.hosts, ['reachy-mini.local', '192.168.1.15']);
});

// ═══════════════════════════════════════════════════════════════════════════
// RobotLink.connect — with a stubbed fetch
// ═══════════════════════════════════════════════════════════════════════════

test('connect: falls through every host and ends in simulated when all fail', async () => {
  // The default harness fetch rejects everything, i.e. no robot on the network.
  const g = loadApp(SCRIPTS.reachy);
  const link = new g.RobotLink();
  const events = tap(link);

  assert.deepEqual(await link.connect(), 'simulated');
  assert.deepEqual(link.status, 'simulated');
  assert.deepEqual(link.host, null);
  same(events.of('status').map((e) => e.payload.status), ['simulated']);
});

test('connect: probes each host exactly once, even the saved duplicate', async () => {
  // The saved host is unshifted onto the list in the constructor, so without the
  // dedupe a dead host is probed twice and the fall-through takes twice as long.
  const fetchStub = makeFetch({});
  const g = loadApp(SCRIPTS.reachy, {
    fetch: fetchStub,
    localStorage: { seed: { 'robotlab.host': 'reachy-mini.local' } },
  });
  const link = new g.RobotLink();
  same(link.hosts, ['reachy-mini.local', 'reachy-mini.local', '192.168.1.15']);

  assert.deepEqual(await link.connect(), 'simulated');
  same(fetchStub.urls(), [
    'http://reachy-mini.local:8000/api/daemon/status',
    'http://192.168.1.15:8000/api/daemon/status',
  ]);
});

test('connect: a dead first host does not stop the second from working', async () => {
  const { g, fetchStub } = boot({ '192.168.1.15:8000/api/daemon/status': OK_STATUS });
  const link = new g.RobotLink();

  assert.deepEqual(await link.connect(), 'online');
  assert.deepEqual(link.host, '192.168.1.15');
  assert.deepEqual(link.version, '1.6.3');
  assert.deepEqual(link.daemonState, 'running');
  // The working host is remembered for next time.
  assert.deepEqual(g.localStorage.getItem('robotlab.host'), '192.168.1.15');
  same(fetchStub.urls(), [
    'http://reachy-mini.local:8000/api/daemon/status',
    'http://192.168.1.15:8000/api/daemon/status',
  ]);
});

test('connect: overlapping probes share one promise', async () => {
  // Tapping the status chip three times must not start three chains racing over
  // this.host and this.status.
  const { g, fetchStub } = boot({ 'reachy-mini.local:8000/api/daemon/status': OK_STATUS });
  const link = new g.RobotLink({ hosts: ['reachy-mini.local'] });
  const a = link.connect();
  const b = link.connect();
  const c = link.connect();
  // Reference identity is the assertion here: connect() must hand back the SAME
  // promise. deepStrictEqual would pass for two distinct pending promises.
  assert.strictEqual(a, b);
  assert.strictEqual(b, c);
  await Promise.all([a, b, c]);
  assert.deepEqual(fetchStub.calls.length, 1);
});

// ── the wake_up query param the daemon insists on ───────────────────────────

test('connect: a stopped daemon is started WITH the wake_up param', async () => {
  // POST /api/daemon/start without a wake_up query param is a 422, which looks
  // exactly like "endpoint not supported" and used to leave the motors dead
  // while the HTTP layer answered fine.
  let statusCalls = 0;
  const { g, fetchStub } = boot({
    'reachy-mini.local:8000/api/daemon/status': () => (++statusCalls === 1
      ? { state: 'stopped', version: '1.6.3' }
      : { state: 'running', version: '1.6.3' }),
    '/api/daemon/start': { ok: true },
  }, { fastTimers: true });

  const link = new g.RobotLink({ hosts: ['reachy-mini.local'] });
  assert.deepEqual(await link.connect(), 'online');
  assert.deepEqual(link.daemonState, 'running');

  const start = fetchStub.calls.filter((c) => c.url.indexOf('/api/daemon/start') >= 0);
  assert.deepEqual(start.length, 1);
  assert.deepEqual(start[0].url, 'http://reachy-mini.local:8000/api/daemon/start?wake_up=false');
  assert.deepEqual(start[0].method, 'POST');
  // Belt and braces: no bare start call anywhere.
  assert.ok(/[?&]wake_up=/.test(start[0].url), 'start called without wake_up: ' + start[0].url);
});

test('connect: an already-running daemon is not restarted', async () => {
  const { fetchStub } = await onlineLink();
  assert.deepEqual(fetchStub.calls.filter((c) => c.url.indexOf('/api/daemon/start') >= 0).length, 0);
});

test('connect: an HTTP error from the status probe is a failure, not a success', async () => {
  // A 500 from the daemon must fall through to the next host rather than being
  // mistaken for a live robot.
  const { g } = boot({ '/api/daemon/status': { __status: 500, body: 'boom' } });
  const link = new g.RobotLink({ hosts: ['reachy-mini.local'] });
  assert.deepEqual(await link.connect(), 'simulated');
  assert.deepEqual(link.host, null);
});

// ═══════════════════════════════════════════════════════════════════════════
// RobotLink verbs — offline behaviour and event fan-out
// ═══════════════════════════════════════════════════════════════════════════

test('offline: pose and emotion events still fire so the simulator animates', async () => {
  // This is the whole reason the app is usable while the robot charges. The
  // drawing is driven from these events, so they must fire with no network.
  const g = loadApp(SCRIPTS.reachy);
  const fetchStub = makeFetch({});
  g.fetch = fetchStub;
  const link = new g.RobotLink();
  const events = tap(link);
  await link.connect();
  assert.deepEqual(link.status, 'simulated');
  fetchStub.calls.length = 0;

  const r1 = await link.goto({ head: { pitch: 22 }, duration: 0.35, interpolation: 'cartoon' });
  const r2 = await link.emotion('laughing1');

  same(r1, { simulated: true });
  same(r2, { simulated: true });

  const pose = events.of('pose');
  assert.deepEqual(pose.length, 1);
  assert.deepEqual(pose[0].payload.pose.head.pitch, 22);
  assert.deepEqual(pose[0].payload.duration, 0.35);
  assert.deepEqual(pose[0].payload.interpolation, 'cartoon');

  same(events.of('emotion').map((e) => e.payload.name), ['laughing1']);
  // Every verb also raises 'activity', which is what the parent dashboard logs.
  same(events.of('activity').map((e) => e.payload.kind), ['pose', 'emotion']);
  // And nothing was posted at the robot.
  same(fetchStub.urls(), []);
});

test('offline: every verb resolves rather than rejecting', async () => {
  const g = loadApp(SCRIPTS.reachy);
  const link = new g.RobotLink();
  await link.connect();
  const results = await Promise.all([
    link.goto({ head: { pitch: 10 } }),
    link.setTarget({ head: { yaw: 10 } }),
    link.wakeUp(), link.sleep(), link.stop(),
    link.emotion('curious1'), link.setMotorMode('enabled'),
    link.playSound('beep.wav'), link.setVolume(60),
    link.readState(), link.readDoa(), link.cameraSpecs(),
  ]);
  assert.deepEqual(results.length, 12);
  // readState/readDoa/cameraSpecs report "no data" as null when simulated.
  same(results.slice(9), [null, null, null]);
});

test('offline: verbs issued before connect() settles wait for the probe', async () => {
  // A child taps the instant the page paints. Those taps used to be answered
  // while status was still 'unknown', so they went to the simulator even though
  // the robot was about to come online.
  const { g, fetchStub } = boot({
    'reachy-mini.local:8000/api/daemon/status': OK_STATUS,
    '/api/move/goto': { uuid: 'm1' },
  });
  const link = new g.RobotLink({ hosts: ['reachy-mini.local'] });
  const connecting = link.connect();
  const moved = link.goto({ head: { pitch: 12 } });   // fired mid-probe
  await connecting;
  await moved;
  assert.deepEqual(link.status, 'online');
  assert.ok(fetchStub.urls().some((u) => u.indexOf('/api/move/goto') >= 0),
    'a tap during connect() never reached the robot: ' + JSON.stringify(fetchStub.urls()));
});

// ═══════════════════════════════════════════════════════════════════════════
// RobotLink verbs — online, and the wire payloads they produce
// ═══════════════════════════════════════════════════════════════════════════

test('goto: posts clamped radians to /api/move/goto', async () => {
  const { link, fetchStub } = await onlineLink({ '/api/move/goto': { uuid: 'm1' } });
  await link.goto({ head: { pitch: 999, yaw: 100 }, bodyYaw: 0, antennas: [200, -200], duration: 0, interpolation: 'linear' });

  const call = fetchStub.calls.find((c) => c.url.indexOf('/api/move/goto') >= 0);
  assert.deepEqual(call.url, 'http://reachy-mini.local:8000/api/move/goto');
  assert.deepEqual(call.method, 'POST');
  assert.deepEqual(call.init.headers['Content-Type'], 'application/json');
  const body = JSON.parse(call.init.body);
  assert.deepEqual(body.head_pose.pitch, 0.6981317007977318);            // 999 -> 40 deg
  assert.deepEqual(body.head_pose.yaw, 1.1344640137963142);              // 100 -> 65 deg
  same(body.antennas, [2.6179938779914944, -2.6179938779914944]);
  assert.deepEqual(body.body_yaw, 0);
  assert.deepEqual(body.duration, 0.1);                                  // explicit 0
  assert.deepEqual(body.interpolation, 'linear');
  link.dispose();
});

test('setTarget: posts only the three target fields, no duration', async () => {
  // set_target is the joystick path; the daemon's schema there has no duration
  // or interpolation and rejects extras.
  const { link, fetchStub } = await onlineLink({ '/api/move/set_target': { ok: true } });
  const events = tap(link);
  await link.setTarget({ head: { yaw: 30 }, bodyYaw: 30 });

  const call = fetchStub.calls.find((c) => c.url.indexOf('/api/move/set_target') >= 0);
  const body = JSON.parse(call.init.body);
  same(Object.keys(body), ['target_head_pose', 'target_antennas', 'target_body_yaw']);
  assert.deepEqual(body.target_head_pose.yaw, 0.5235987755982988);
  assert.deepEqual(body.target_body_yaw, 0.5235987755982988);
  // The event reports an instant move, because that is what the sim must draw.
  assert.deepEqual(events.of('pose')[0].payload.duration, 0);
  assert.deepEqual(events.of('pose')[0].payload.interpolation, 'instant');
  link.dispose();
});

test('emotion: the dataset slash is percent-encoded as %2F', async () => {
  // The dataset id contains a '/', and it is a PATH SEGMENT, not a path
  // separator. Un-encoded, the daemon sees a different route and 404s.
  const { link, fetchStub } = await onlineLink({ '/api/move/play/recorded-move-dataset/': { uuid: 'e1' } });
  await link.emotion('laughing1');

  const call = fetchStub.calls.find((c) => c.url.indexOf('recorded-move-dataset') >= 0);
  assert.deepEqual(call.url,
    'http://reachy-mini.local:8000/api/move/play/recorded-move-dataset/' +
    'pollen-robotics%2Freachy-mini-emotions-library/laughing1');
  assert.deepEqual(call.method, 'POST');
  assert.ok(call.url.indexOf('pollen-robotics/reachy') < 0, 'raw slash leaked into the path');
  assert.deepEqual(RobotLink.EMOTION_DATASET, 'pollen-robotics/reachy-mini-emotions-library');
  link.dispose();
});

test('emotion: the move name is encoded too', async () => {
  const { link, fetchStub } = await onlineLink({ '/api/move/play/recorded-move-dataset/': { uuid: 'e1' } });
  await link.emotion('odd name/1');
  const call = fetchStub.calls.find((c) => c.url.indexOf('recorded-move-dataset') >= 0);
  assert.ok(call.url.endsWith('/odd%20name%2F1'), call.url);
  link.dispose();
});

test('wakeUp, sleep, stop and setMotorMode hit their documented endpoints', async () => {
  const { link, fetchStub } = await onlineLink({ '/api/move/': { ok: true }, '/api/motors/': { ok: true } });
  await link.wakeUp();
  await link.sleep();
  await link.stop();
  await link.setMotorMode('gravity_compensation');
  const urls = fetchStub.urls().slice(1); // drop the status probe
  same(urls, [
    'http://reachy-mini.local:8000/api/move/play/wake_up',
    'http://reachy-mini.local:8000/api/move/play/goto_sleep',
    'http://reachy-mini.local:8000/api/move/stop',
    'http://reachy-mini.local:8000/api/motors/set_mode/gravity_compensation',
  ]);
  link.dispose();
});

test('setVolume: clamps to 0..100 and rounds to an integer', async () => {
  const { link, fetchStub } = await onlineLink({ '/api/volume/set': { ok: true } });
  await link.setVolume(150);
  await link.setVolume(-20);
  await link.setVolume(60.6);
  await link.setVolume(0);
  await link.setVolume('abc');
  const vols = fetchStub.calls
    .filter((c) => c.url.indexOf('/api/volume/set') >= 0)
    .map((c) => JSON.parse(c.init.body).volume);
  same(vols, [100, 0, 61, 0, 0]);
  link.dispose();
});

test('stop: bumps the generation counter so queued gesture steps abandon', async () => {
  // spin() is a JS chain of timed goto calls. Cancelling the daemon's current
  // move is not enough — the remaining steps would still be posted.
  const { link } = await onlineLink({ '/api/move/': { ok: true } });
  const before = link._gen || 0;
  await link.stop();
  assert.deepEqual(link._gen, before + 1);
  link.dispose();
});

test('readState: converts the daemon radians/metres back into degrees/mm', async () => {
  const { link } = await onlineLink({
    '/api/state/full': {
      control_mode: 'enabled',
      head_pose: { x: 0.025, y: -0.0125, z: 0.005, roll: 0, pitch: 0.5235987755982988, yaw: -1.5707963267948966 },
      body_yaw: 0.5235987755982988,
      antennas_position: [2.6179938779914944, -0.5235987755982988],
      doa: { angle: 0 },
    },
  });
  const s = await link.readState();
  assert.deepEqual(s.head.x, 25);
  assert.deepEqual(s.head.y, -12.5);
  assert.deepEqual(s.head.z, 5);
  assert.deepEqual(s.head.roll, 0);
  assert.ok(Math.abs(s.head.pitch - 30) < 1e-9, 'pitch ' + s.head.pitch);
  assert.ok(Math.abs(s.head.yaw + 90) < 1e-9, 'yaw ' + s.head.yaw);
  assert.ok(Math.abs(s.bodyYaw - 30) < 1e-9, 'bodyYaw ' + s.bodyYaw);
  assert.ok(Math.abs(s.antennas[0] - 150) < 1e-9);
  assert.ok(Math.abs(s.antennas[1] + 30) < 1e-9);
  assert.deepEqual(s.controlMode, 'enabled');
  link.dispose();
});

test('readState: a daemon reply with no head_pose does not throw', async () => {
  const { link } = await onlineLink({ '/api/state/full': { control_mode: 'disabled' } });
  const s = await link.readState();
  same(s.head, { x: 0, y: 0, z: 0, roll: 0, pitch: 0, yaw: 0 });
  same(s.antennas, [0, 0]);
  assert.deepEqual(s.doa, null);
  link.dispose();
});

test('readDoa: radians to degrees, and null when the daemon says nothing useful', async () => {
  const { link } = await onlineLink({ '/api/state/doa': { angle: 1.5707963267948966, speech_detected: true } });
  const d = await link.readDoa();
  assert.ok(Math.abs(d.deg - 90) < 1e-9, 'doa ' + d.deg);
  assert.deepEqual(d.speech, true);
  link.dispose();

  const b = await onlineLink({ '/api/state/doa': { speech_detected: true } });
  assert.deepEqual(await b.link.readDoa(), null);
  b.link.dispose();
});

test('listEmotions: falls back to the bundled list, and never caches an empty answer', async () => {
  // Caching [] would permanently hide all 81 emotions and defeat the fallback.
  let reply = [];
  const { g, link } = await onlineLink(
    { '/api/move/recorded-move-datasets/list/': () => reply },
    { extras: { ROBOT_LAB_EMOTION_NAMES: ['cheerful1', 'laughing1'] } },
  );
  same(await link.listEmotions(), []);
  reply = ['curious1', 'sad1'];
  same(await link.listEmotions(), ['curious1', 'sad1']);
  reply = [];
  same(await link.listEmotions(), ['curious1', 'sad1'], 'non-empty list was not cached');
  link.dispose();

  // Simulated: the bundled names, without touching the network.
  const off = new g.RobotLink();
  same(await off.listEmotions(), ['cheerful1', 'laughing1']);
});

// ═══════════════════════════════════════════════════════════════════════════
// RobotLink._degrade
// ═══════════════════════════════════════════════════════════════════════════

test('degrade: a network failure flips status to simulated exactly once', async () => {
  // Two verbs fired together both fail while status is still 'online', so
  // _degrade runs twice — but the UI must see ONE status change, not two, or the
  // status chip flickers and listeners double-fire.
  const { link, events, fetchStub } = await onlineLink();  // only /status is routed
  same(events.of('status').map((e) => e.payload.status), ['online']);

  const [a, b] = await Promise.all([link.goto({ head: { pitch: 5 } }), link.wakeUp()]);
  same(a, { simulated: true });
  same(b, { simulated: true });

  assert.deepEqual(link.status, 'simulated');
  assert.deepEqual(link._failures, 2, 'both failures should be counted');
  const flips = events.of('status');
  same(flips.map((e) => e.payload.status), ['online', 'simulated']);
  assert.deepEqual(flips[1].payload.host, 'reachy-mini.local');

  // Once simulated, later verbs stop touching the network entirely.
  const n = fetchStub.calls.length;
  await link.sleep();
  assert.deepEqual(fetchStub.calls.length, n);
  link.dispose();
});

test('degrade: an HTTP error means the robot ANSWERED — try the backend, do not give up yet', async () => {
  // 503 "Backend not running" is reachable-but-refusing. Treating it like a
  // dropped packet killed the robot for the rest of the session.
  let statusState = 'stopped';
  const { g, fetchStub } = boot({
    'reachy-mini.local:8000/api/daemon/status': () => ({ state: statusState, version: '1.6.3' }),
    '/api/daemon/start': () => { statusState = 'running'; return { ok: true }; },
    '/api/move/play/wake_up': { __status: 503, body: 'Backend not running' },
  }, { fastTimers: true });

  const link = new g.RobotLink({ hosts: ['reachy-mini.local'] });
  await link.connect();
  const events = tap(link);
  fetchStub.calls.length = 0;

  const res = await link.wakeUp();
  same(res, { simulated: true });          // resolved, not rejected
  await link._restarting;                              // let the restart settle

  assert.ok(fetchStub.urls().some((u) => u.indexOf('/api/daemon/start?wake_up=false') >= 0),
    'a 503 did not trigger a backend restart: ' + JSON.stringify(fetchStub.urls()));
  // The restart succeeded, so the link never went to the simulator.
  assert.deepEqual(link.status, 'online');
  same(events.of('status'), []);
  assert.deepEqual(link._failures, 0, 'a healed failure must reset the counter');
  link.dispose();
});

test('degrade: readState failure degrades and returns null instead of throwing', async () => {
  const { link } = await onlineLink();   // /api/state/full is unrouted -> rejects
  assert.deepEqual(await link.readState(), null);
  assert.deepEqual(link.status, 'simulated');
  link.dispose();
});

test('dispose: cancels the pending re-probe timer', async () => {
  const { link } = await onlineLink();
  await link.goto({ head: { pitch: 5 } });
  assert.deepEqual(link.status, 'simulated');
  assert.ok(link._recheckTimer, 'a recheck should have been scheduled');
  link.dispose();
  assert.deepEqual(link._recheckTimer, null);
});

test('degrade: only one recheck timer is ever outstanding', async () => {
  // A 30-minute session must not accumulate a pile of pending probes.
  const { link } = await onlineLink();
  await link.goto({ head: { pitch: 5 } });
  const first = link._recheckTimer;
  link._degrade(new Error('again'));
  link._degrade(new Error('and again'));
  // Identity, not shape: two DISTINCT Timeout objects would satisfy a deep
  // comparison, which is exactly the bug this test exists to catch.
  assert.strictEqual(link._recheckTimer, first);
  link.dispose();
});

// ═══════════════════════════════════════════════════════════════════════════
// Listener robustness
// ═══════════════════════════════════════════════════════════════════════════

test('a throwing listener cannot break the robot verb that emitted', async () => {
  // The simulator draws from these events. A bug in the drawing code must not
  // stop the physical robot from moving.
  const { g, fetchStub } = boot({
    'reachy-mini.local:8000/api/daemon/status': OK_STATUS,
    '/api/move/goto': { uuid: 'm1' },
  });
  const link = new g.RobotLink({ hosts: ['reachy-mini.local'] });
  await link.connect();
  link.on('pose', () => { throw new Error('sim blew up'); });
  let reached = false;
  link.on('pose', () => { reached = true; });

  await link.goto({ head: { pitch: 10 } });
  assert.ok(reached, 'a throwing listener starved the ones after it');
  assert.ok(fetchStub.urls().some((u) => u.indexOf('/api/move/goto') >= 0));
  assert.deepEqual(g.__errors.length, 1);
  link.dispose();
});

test('on() is chainable, so page setup can read as one expression', () => {
  const link = new RobotLink();
  // Must be the SAME link back, not a structurally similar one.
  assert.strictEqual(link.on('pose', () => {}), link);
});
