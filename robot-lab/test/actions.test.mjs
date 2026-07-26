/* ============================================================================
 * actions.test.mjs — the action-string DSL (assets/js/actions.js) and the
 * tablet voice (assets/js/speak.js).
 *
 * The 72 quests are DATA: every tap in the app is a string like
 * `pose:pitch=25&duration=0.6`. That makes actions.js the single point where a
 * typo in curriculum data turns into a wrong command on a real robot in front
 * of a child. These tests pin the grammar, the repeat expansion, the ordering
 * guarantee, and the exact numbers that reach the wire.
 *
 * Nothing here touches the network or the robot: `fetch` is stubbed by the
 * harness and rejects unless a test routes it explicitly.
 * ==========================================================================*/

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  loadApp, SCRIPTS, makeFetch, makeRecordingLink, readSource,
} from './harness.mjs';

/* The gesture vocabulary actions.js is written against (see reachy.js
 * gestures()). Only names listed here exist on a recording link, so an
 * unknown-gesture test stays meaningful. */
const GESTURES = [
  'nod', 'shake', 'wiggle', 'spin', 'center',
  'lookLeft', 'lookRight', 'lookUp', 'lookDown',
  'curious', 'happy', 'laugh', 'dance',
];

/**
 * Objects built inside the vm sandbox carry the SANDBOX's Object.prototype, and
 * assert/strict's deep comparison checks prototypes. Round-tripping through
 * JSON gives us a host-realm copy so deepEqual compares values, not realms.
 */
const plain = (x) => JSON.parse(JSON.stringify(x));

/** Fresh sandbox with reachy.js + actions.js. fastTimers collapses the DSL's
 *  deliberate inter-move pauses (a recorded emotion blocks 2.2s) to one turn. */
function env(opts = {}) {
  return loadApp(SCRIPTS.actions, Object.assign({ fastTimers: true }, opts));
}

/** ctx for Actions.run/runAll: a recording link plus a recording speaker. */
function ctx(gestures = GESTURES) {
  const link = makeRecordingLink(gestures);
  const said = [];
  return {
    link,
    speaker: { say: (text, o) => { said.push({ text, opts: o || {} }); return Promise.resolve(true); } },
    said,
  };
}

// ── parse(): the grammar ────────────────────────────────────────────────────

test('parse: every verb yields the right verb and payload', () => {
  const { Actions } = env();
  const cases = [
    ['wake', 'wake', ''],
    ['sleep', 'sleep', ''],
    ['stop', 'stop', ''],
    ['center', 'center', ''],
    ['gesture:nod', 'gesture', 'nod'],
    ['emotion:laughing1', 'emotion', 'laughing1'],
    ['pose:pitch=25&duration=0.6', 'pose', 'pitch=25&duration=0.6'],
    ['motors:gravity_compensation', 'motors', 'gravity_compensation'],
    ['volume:85', 'volume', '85'],
    ['say:Hello there', 'say', 'Hello there'],
    ['wait:400', 'wait', '400'],
    ['burst:antennas', 'burst', 'antennas'],
    ['repeat:3', 'repeat', '3'],
  ];
  for (const [input, verb, payload] of cases) {
    const steps = Actions.parse(input);
    assert.deepEqual(steps.length, 1, input);
    assert.deepEqual(steps[0].verb, verb, input);
    assert.deepEqual(steps[0].payload, payload, input);
    assert.deepEqual(plain(steps[0].params), {}, input);
  }
});

test('parse: pipe-separated segments become one step each, in order', () => {
  const { Actions } = env();
  const steps = Actions.parse('wake|gesture:nod|pose:yaw=35&duration=0.6|say:Hi|sleep');
  assert.deepEqual(plain(steps).map((s) => s.verb), ['wake', 'gesture', 'pose', 'say', 'sleep']);
  assert.deepEqual(steps[2].payload, 'yaw=35&duration=0.6');
});

/* A bare `key=value` segment attaches to the verb BEFORE it. This is what lets
 * spoken text carry its own punctuation: the pitch rides in a separate segment
 * instead of being crammed into the say payload. Real curriculum data:
 *   'volume:25|say:Quiet and low|pitch=0.5' */
test('parse: a bare params segment attaches to the preceding verb', () => {
  const { Actions } = env();
  const steps = Actions.parse('volume:25|say:Quiet and low|pitch=0.5');
  assert.deepEqual(steps.length, 3 - 1, 'the params segment must NOT become its own step');
  assert.deepEqual(plain(steps).map((s) => s.verb), ['volume', 'say']);
  assert.deepEqual(steps[1].payload, 'Quiet and low');
  assert.deepEqual(plain(steps[1].params), { pitch: '0.5' });
});

test('parse: several params in one segment all attach, and later segments merge', () => {
  const { Actions } = env();
  const steps = Actions.parse('say:La la laaa|pitch=1.9&rate=0.7|lang=en-GB');
  assert.deepEqual(steps.length, 1);
  assert.deepEqual(plain(steps[0].params), { pitch: '1.9', rate: '0.7', lang: 'en-GB' });
});

/* A params segment with nothing in front of it has no verb to attach to. It
 * must fall through to "unknown verb" rather than reading out[-1].params. */
test('parse: a leading params segment with no preceding verb does not crash', () => {
  const { Actions } = env();
  const steps = Actions.parse('pitch=0.5|gesture:nod');
  assert.deepEqual(steps.length, 2);
  assert.deepEqual(steps[0].verb, 'pitch=0.5');
  assert.deepEqual(steps[0].payload, '');
  assert.deepEqual(steps[1].verb, 'gesture');
});

test('parse: empty, null and undefined all yield no steps', () => {
  const { Actions } = env();
  for (const input of ['', null, undefined]) {
    assert.deepEqual(plain(Actions.parse(input)), [], String(input));
  }
});

test('parse: whitespace-only segments are dropped, real segments are trimmed', () => {
  const { Actions } = env();
  assert.deepEqual(plain(Actions.parse('   ')), []);
  assert.deepEqual(plain(Actions.parse('  |  |  ')), []);
  const steps = Actions.parse('  wake  |   gesture:nod   |  ');
  assert.deepEqual(plain(steps).map((s) => s.verb), ['wake', 'gesture']);
  assert.deepEqual(steps[1].payload, 'nod');
});

/* Spoken text is prose: it contains colons, equals signs and commas. The
 * grammar splits on the FIRST colon only and never re-splits the payload, so
 * none of that punctuation may leak into the verb or be mistaken for params. */
test('parse: a say payload keeps its colons, equals signs and commas verbatim', () => {
  const { Actions } = env();
  const steps = Actions.parse('say:Ready? 3:2:1 — x=5, y=6, go!|rate=0.9');
  assert.deepEqual(steps.length, 1);
  assert.deepEqual(steps[0].verb, 'say');
  assert.deepEqual(steps[0].payload, 'Ready? 3:2:1 — x=5, y=6, go!');
  assert.deepEqual(plain(steps[0].params), { rate: '0.9' });
});

test('parse: a say payload that looks like params is still a say', () => {
  const { Actions } = env();
  const steps = Actions.parse('say:pitch=high');
  assert.deepEqual(steps.length, 1);
  assert.deepEqual(steps[0].verb, 'say');
  assert.deepEqual(steps[0].payload, 'pitch=high');
});

// ── pose payload -> the request that reaches link.goto ──────────────────────

test('pose: the full payload arrives at link.goto in degrees and millimetres', async () => {
  const e = env();
  const c = ctx();
  await e.Actions.run('pose:pitch=25&yaw=-10&antennas=70,-70&duration=0.6&interpolation=cartoon', c);

  const gotos = c.link.calls.filter((x) => x.kind === 'goto');
  assert.deepEqual(gotos.length, 1);
  assert.deepEqual(plain(gotos[0].arg), {
    head: { pitch: 25, yaw: -10 },      // degrees, NOT radians — reachy.js converts
    antennas: [70, -70],                // degrees, left then right
    duration: 0.6,                      // seconds
    interpolation: 'cartoon',
  });
});

/* Every quest that does not name an interpolation should still look like a
 * cartoon character rather than a CNC machine, so `cartoon` is the DSL default
 * even though the daemon's own default is minjerk. */
test('pose: a bare pose defaults to cartoon interpolation and no duration', async () => {
  const e = env();
  const c = ctx();
  await e.Actions.run('pose:pitch=10', c);
  const arg = plain(c.link.calls[0].arg);
  assert.deepEqual(arg, { head: { pitch: 10 }, interpolation: 'cartoon' });
  assert.deepEqual(Object.prototype.hasOwnProperty.call(arg, 'duration'), false,
    'an omitted duration must stay absent so toWire() applies its own default');
});

test('pose: unknown axes are ignored instead of being forwarded', async () => {
  const e = env();
  const c = ctx();
  await e.Actions.run('pose:wibble=5&pitch=10&BodyYaw=3&=7', c);
  assert.deepEqual(plain(c.link.calls[0].arg), { head: { pitch: 10 }, interpolation: 'cartoon' });
});

test('pose: bodyYaw and the x/y/z millimetre axes are all forwarded', async () => {
  const e = env();
  const c = ctx();
  await e.Actions.run('pose:x=10&y=-5&z=12&roll=-30&bodyYaw=60&duration=0.8', c);
  assert.deepEqual(plain(c.link.calls[0].arg), {
    head: { x: 10, y: -5, z: 12, roll: -30 },
    bodyYaw: 60,
    duration: 0.8,
    interpolation: 'cartoon',
  });
});

/* A single antenna value is a legal-looking payload that produces a one-element
 * array; the clamp in reachy.js has to cope with the missing right antenna. */
test('pose: a single antenna value yields a one-element array, and clamps to 0', async () => {
  const e = env();
  const c = ctx();
  await e.Actions.run('pose:antennas=110', c);
  assert.deepEqual(plain(c.link.calls[0].arg).antennas, [110]);
  const deg = e.RobotLink.clampPose({ antennas: [110] }).deg;
  assert.deepEqual(plain(deg.antennas), [110, 0]);
});

// ── pose -> the actual wire, through a real RobotLink ───────────────────────

async function onlineLink(e, fetchStub) {
  const link = new e.RobotLink({ hosts: ['192.168.1.15'] });
  const status = await link.connect();
  assert.deepEqual(status, 'online');
  assert.deepEqual(fetchStub.calls.length, 1);
  return link;
}

const DAEMON_OK = { '/api/daemon/status': { state: 'running', version: '1.6.3' } };

/* Degrees on the sliders, radians on the wire. 30° is exactly π/6. */
test('pose: degrees become radians and millimetres become metres on the wire', async () => {
  const f = makeFetch(Object.assign({ '/api/move/goto': { ok: true } }, DAEMON_OK));
  const e = env({ fetch: f, fastTimers: true });
  const link = await onlineLink(e, f);

  await e.Actions.run('pose:pitch=30&x=10&antennas=70,-70&duration=0.6', { link: link });

  const posts = f.calls.filter((x) => x.url.indexOf('/api/move/goto') >= 0);
  assert.deepEqual(posts.length, 1);
  const body = JSON.parse(posts[0].init.body);
  assert.deepEqual(body.head_pose.pitch, 0.5235987755982988);   // 30°
  assert.deepEqual(body.head_pose.x, 0.01);                     // 10 mm
  assert.deepEqual(body.antennas[0], 1.2217304763960306);       // 70°
  assert.deepEqual(body.antennas[1], -1.2217304763960306);
  assert.deepEqual(body.duration, 0.6);
  assert.deepEqual(body.interpolation, 'cartoon');
});

/* REGRESSION (bug 1). `Number(0) || 1.0` treats an explicit "as fast as you
 * can" 0 as "no duration given" and silently stretches the move to a full
 * second. An explicit 0 must clamp to the 0.1s floor; only an ABSENT, null or
 * unparseable duration may default to 1.0. Driven here through the DSL, which
 * is how quest data reaches toWire(). */
test('pose: duration=0 clamps to the 0.1s floor and does not become 1.0s', async () => {
  const f = makeFetch(Object.assign({ '/api/move/goto': { ok: true } }, DAEMON_OK));
  const e = env({ fetch: f, fastTimers: true });
  const link = await onlineLink(e, f);

  await e.Actions.run('pose:pitch=30&duration=0', { link: link });
  const body = JSON.parse(f.calls[f.calls.length - 1].init.body);
  assert.deepEqual(body.duration, 0.1);
});

test('pose: an omitted duration defaults to 1.0s on the wire', async () => {
  const f = makeFetch(Object.assign({ '/api/move/goto': { ok: true } }, DAEMON_OK));
  const e = env({ fetch: f, fastTimers: true });
  const link = await onlineLink(e, f);

  await e.Actions.run('pose:pitch=30', { link: link });
  const body = JSON.parse(f.calls[f.calls.length - 1].init.body);
  assert.deepEqual(body.duration, 1.0);
});

test('pose: an unparseable duration defaults to 1.0s rather than sending NaN', async () => {
  const f = makeFetch(Object.assign({ '/api/move/goto': { ok: true } }, DAEMON_OK));
  const e = env({ fetch: f, fastTimers: true });
  const link = await onlineLink(e, f);

  await e.Actions.run('pose:pitch=30&duration=soon', { link: link });
  const body = JSON.parse(f.calls[f.calls.length - 1].init.body);
  assert.deepEqual(body.duration, 1.0);
  assert.deepEqual(Number.isNaN(body.duration), false);
});

/* REGRESSION (bug 1), stated as a table directly against the unit under test,
 * so the boundary is pinned independently of the DSL. */
test('toWire: the duration table — 0 floors, absent/null/NaN default', () => {
  const e = env();
  const deg = e.RobotLink.clampPose({}).deg;
  const dur = (d) => e.RobotLink.toWire(deg, d, 'cartoon').duration;

  assert.deepEqual(dur(0), 0.1, 'explicit 0 must clamp to the floor, not fall through to 1.0');
  assert.deepEqual(dur(0.05), 0.1);
  assert.deepEqual(dur(-5), 0.1);
  assert.deepEqual(dur(0.6), 0.6);
  assert.deepEqual(dur(undefined), 1.0);
  assert.deepEqual(dur(null), 1.0);
  assert.deepEqual(dur(''), 1.0);
  assert.deepEqual(dur(NaN), 1.0);
  assert.deepEqual(dur('not a number'), 1.0);
  assert.deepEqual(dur('0'), 0.1, 'a string zero is still an explicit zero');
});

// ── run(): dispatch, warnings, ordering ─────────────────────────────────────

test('run: an empty action does nothing and still resolves', async () => {
  const e = env();
  const c = ctx();
  await e.Actions.run('', c);
  assert.deepEqual(c.link.calls, []);
});

test('run: every verb reaches the matching link call', async () => {
  const e = env();
  const c = ctx();
  await e.Actions.run(
    'wake|gesture:nod|pose:pitch=10|say:Hi|emotion:cheerful1|motors:disabled|volume:50|center|stop|sleep',
    c
  );
  assert.deepEqual(c.link.order(), [
    'wake', 'gesture:nod', 'goto', 'emotion:cheerful1',
    'motors:disabled', 'volume', 'gesture:center', 'stop', 'sleep',
  ]);
  assert.deepEqual(c.said.map((s) => s.text), ['Hi']);
});

test('run: volume and wait payloads are parsed as numbers', async () => {
  const e = env();
  const c = ctx();
  await e.Actions.run('volume:85|wait:250', c);
  const vol = c.link.calls.find((x) => x.kind === 'volume');
  assert.deepEqual(vol.arg, 85);
  assert.deepEqual(typeof vol.arg, 'number');
});

/* An unknown verb is a typo in curriculum data. It must be reported to the
 * console and then skipped — throwing here would abort the rest of the action
 * and strand a child mid-quest. */
test('run: an unknown verb warns and resolves instead of throwing', async () => {
  const e = env();
  const c = ctx();
  await e.Actions.run('gesture:nod|flibbertigibbet:5|gesture:shake', c);
  assert.deepEqual(c.link.order(), ['gesture:nod', 'gesture:shake'],
    'the steps after the bad verb must still run');
  assert.deepEqual(e.__warnings.some((w) => w.indexOf('unknown action verb: flibbertigibbet') >= 0), true,
    e.__warnings.join(' / '));
});

test('run: a params segment with no preceding verb warns and resolves', async () => {
  const e = env();
  const c = ctx();
  await e.Actions.run('pitch=0.5|gesture:nod', c);
  assert.deepEqual(c.link.order(), ['gesture:nod']);
  assert.deepEqual(e.__warnings.some((w) => w.indexOf('unknown action verb: pitch=0.5') >= 0), true,
    e.__warnings.join(' / '));
});

test('run: an unknown gesture name warns and resolves', async () => {
  const e = env();
  const c = ctx();
  await e.Actions.run('gesture:moonwalk', c);
  assert.deepEqual(c.link.calls, []);
  assert.deepEqual(e.__warnings.some((w) => w.indexOf('unknown gesture: moonwalk') >= 0), true,
    e.__warnings.join(' / '));
});

test('run: say is a no-op when no speaker is present', async () => {
  const e = env();
  const c = ctx();
  await e.Actions.run('say:Nobody is listening|gesture:nod', { link: c.link });
  assert.deepEqual(c.link.order(), ['gesture:nod']);
});

test('run: say forwards pitch and rate params, and omits the ones not given', async () => {
  const e = env();
  const c = ctx();
  await e.Actions.run('say:Quiet and low|pitch=0.5', c);
  assert.deepEqual(c.said[0].text, 'Quiet and low');
  assert.deepEqual(c.said[0].opts.pitch, 0.5);
  assert.deepEqual(c.said[0].opts.rate, undefined);

  await e.Actions.run('say:Slowly now|rate=0.6&pitch=1.4', c);
  assert.deepEqual(c.said[1].opts.rate, 0.6);
  assert.deepEqual(c.said[1].opts.pitch, 1.4);
});

/* `repeat:` is expanded by runAll(), so run() must treat it as a no-op. If it
 * ever started looping here, a repeat inside a nested action would multiply. */
test('run: a repeat verb is inert (expansion is runAll\'s job)', async () => {
  const e = env();
  const c = ctx();
  await e.Actions.run('repeat:3|gesture:nod', c);
  assert.deepEqual(c.link.order(), ['gesture:nod'], 'run() must not expand repeat');
  assert.deepEqual(e.__warnings.length, 0, 'and must not warn about it either');
});

/**
 * Strict sequencing, proven by call ORDER rather than call count.
 *
 * The robot has one body. Two overlapping command chains do not blend, they
 * fight, and the visible result is a robot that twitches and drops moves. Each
 * step here logs start and end around a real macrotask, so any concurrency
 * shows up as an interleaved start:B before end:A.
 */
test('run: steps are strictly sequential — never interleaved', async () => {
  const e = env();
  const log = [];
  const step = (name) => () => {
    log.push('start:' + name);
    return new Promise((res) => setTimeout(() => { log.push('end:' + name); res({ ok: true }); }, 0));
  };
  const link = {
    wakeUp: step('wake'),
    sleep: step('sleep'),
    stop: step('stop'),
    goto: step('goto'),
    setTarget: step('setTarget'),
    emotion: step('emotion'),
    setMotorMode: step('motors'),
    setVolume: step('volume'),
    gestures: () => ({ nod: step('nod') }),
  };
  const speaker = { say: step('say') };

  await e.Actions.run('wake|gesture:nod|pose:pitch=10|say:Hi|emotion:cheerful1|sleep', { link, speaker });

  assert.deepEqual(log, [
    'start:wake', 'end:wake',
    'start:nod', 'end:nod',
    'start:goto', 'end:goto',
    'start:say', 'end:say',
    'start:emotion', 'end:emotion',
    'start:sleep', 'end:sleep',
  ]);
});

// ── burst(): realtime control ───────────────────────────────────────────────

/* burst is deliberately NOT a goto: quest b1-4 exists to let a child feel the
 * difference between interpolated moves and a stream of set_target frames. If
 * this collapsed into a goto the lesson would have nothing to compare. */
test('burst: 25 set_target frames then one settling goto', async () => {
  const e = env();
  const c = ctx();
  await e.Actions.run('burst:yaw', c);

  const kinds = c.link.calls.map((x) => x.kind);
  assert.deepEqual(kinds.filter((k) => k === 'setTarget').length, 25);
  assert.deepEqual(kinds[kinds.length - 1], 'goto');
  assert.deepEqual(plain(c.link.calls[kinds.length - 1].arg), { duration: 0.5 });
  // Quarter of the way through the sine, the head is at full amplitude.
  assert.deepEqual(plain(c.link.calls[6].arg).head.yaw, 32);
  assert.deepEqual(plain(c.link.calls[0].arg).head.yaw, 0);
});

test('burst: antennas mode drives the antennas as a mirrored pair', async () => {
  const e = env();
  const c = ctx();
  await e.Actions.run('burst:antennas', c);
  assert.deepEqual(plain(c.link.calls[6].arg), { antennas: [110, -110] });
  assert.deepEqual(Object.prototype.hasOwnProperty.call(plain(c.link.calls[6].arg), 'head'), false);
});

test('burst: a bare burst defaults to yaw', async () => {
  const e = env();
  const c = ctx();
  await e.Actions.run('burst', c);
  assert.deepEqual(c.link.calls.filter((x) => x.kind === 'setTarget').length, 25);
  assert.deepEqual(Object.prototype.hasOwnProperty.call(plain(c.link.calls[6].arg), 'head'), true);
});

// ── runAll(): repeat expansion ──────────────────────────────────────────────

test('runAll: null and empty lists resolve without doing anything', async () => {
  const e = env();
  const c = ctx();
  const steps = [];
  await e.Actions.runAll(null, c, () => steps.push(1));
  await e.Actions.runAll([], c, () => steps.push(1));
  assert.deepEqual(c.link.calls, []);
  assert.deepEqual(steps, []);
});

test('runAll: a plain list runs each action once, in order', async () => {
  const e = env();
  const c = ctx();
  await e.Actions.runAll(['gesture:nod', 'gesture:shake', 'gesture:wiggle'], c);
  assert.deepEqual(c.link.order(), ['gesture:nod', 'gesture:shake', 'gesture:wiggle']);
});

/* The headline case: `repeat:3|gesture:nod` must nod three times. Exactly
 * three — not once (dropped repeat) and not four (off-by-one). */
test('runAll: repeat:3|gesture:nod runs nod exactly 3 times', async () => {
  const e = env();
  const c = ctx();
  await e.Actions.runAll(['repeat:3|gesture:nod'], c);
  assert.deepEqual(c.link.order(), ['gesture:nod', 'gesture:nod', 'gesture:nod']);
});

/* Everything after the FIRST pipe is the repeated body, pipes included. Real
 * curriculum data: 'repeat:2|pose:bodyYaw=30&duration=0.5|pose:bodyYaw=-30&duration=0.5'
 * is a two-pose wiggle done twice, i.e. four gotos. */
test('runAll: repeat carries a multi-segment body through each pass', async () => {
  const e = env();
  const c = ctx();
  await e.Actions.runAll(
    ['repeat:2|pose:bodyYaw=30&duration=0.5|pose:bodyYaw=-30&duration=0.5'], c
  );
  const yaws = c.link.calls.filter((x) => x.kind === 'goto').map((x) => plain(x.arg).bodyYaw);
  assert.deepEqual(yaws, [30, -30, 30, -30]);
});

/* A bare `repeat:3` — the "Repeat all 3x" tile — means "replay what came
 * before, three passes in total". With nothing before it there is nothing to
 * replay, and it must be skipped ENTIRELY rather than looping something else
 * or spinning on an empty list. */
test('runAll: a bare repeat:3 with nothing before it is skipped entirely', async () => {
  const e = env();
  const c = ctx();
  const steps = [];
  await e.Actions.runAll(['repeat:3'], c, (i, total) => steps.push([i, total]));
  assert.deepEqual(c.link.calls, [], 'nothing may run');
  assert.deepEqual(steps, [], 'and onStep must never fire');
  assert.deepEqual(e.__warnings.length, 0);
});

test('runAll: a bare repeat:3 after two actions gives three passes in total', async () => {
  const e = env();
  const c = ctx();
  await e.Actions.runAll(['gesture:nod', 'gesture:shake', 'repeat:3'], c);
  assert.deepEqual(c.link.order(), [
    'gesture:nod', 'gesture:shake',
    'gesture:nod', 'gesture:shake',
    'gesture:nod', 'gesture:shake',
  ], 'three passes total, not three EXTRA passes');
});

/* A stray count in quest data must not turn into a hundred moves on a real
 * robot in front of a four-year-old. REPEAT_MAX is 20. */
test('runAll: the repeat count is clamped to a sane maximum', async () => {
  const e = env();
  const c = ctx();
  await e.Actions.runAll(['repeat:999|gesture:nod'], c);
  assert.deepEqual(c.link.calls.length, 20);
});

test('runAll: a bare repeat is clamped by the same maximum', async () => {
  const e = env();
  const c = ctx();
  await e.Actions.runAll(['gesture:nod', 'repeat:999'], c);
  assert.deepEqual(c.link.calls.length, 20);
});

test('runAll: degenerate repeat counts fall back to a single pass', async () => {
  for (const count of ['0', '1', '-5', 'abc', '']) {
    const e = env();
    const c = ctx();
    await e.Actions.runAll(['repeat:' + count + '|gesture:nod'], c);
    assert.deepEqual(c.link.order(), ['gesture:nod'], 'repeat:' + count);
  }
});

test('runAll: a fractional repeat count truncates rather than looping oddly', async () => {
  const e = env();
  const c = ctx();
  await e.Actions.runAll(['repeat:2.9|gesture:nod'], c);
  assert.deepEqual(c.link.calls.length, 2);
});

/* repeat only counts as a repeat when it LEADS the action. Anywhere else it is
 * an inert verb, so 'gesture:nod|repeat:3' nods once. */
test('runAll: repeat is only special in the first segment', async () => {
  const e = env();
  const c = ctx();
  await e.Actions.runAll(['gesture:nod|repeat:3'], c);
  assert.deepEqual(c.link.order(), ['gesture:nod']);
});

/**
 * onStep drives the sequence UI's highlight. It must report the EXPANDED index
 * and the EXPANDED total — a progress readout of "step 3 of 1" is worse than
 * none — while `origin` still points back at the caller's own array so the UI
 * highlights the tile the child actually placed.
 */
test('runAll: onStep receives expanded indices and totals, with origin preserved', async () => {
  const e = env();
  const c = ctx();
  const seen = [];
  await e.Actions.runAll(
    ['gesture:nod', 'repeat:3|gesture:shake', 'gesture:wiggle'],
    c,
    (i, total, action, origin) => seen.push([i, total, action, origin])
  );
  assert.deepEqual(seen, [
    [0, 5, 'gesture:nod', 0],
    [1, 5, 'gesture:shake', 1],
    [2, 5, 'gesture:shake', 1],
    [3, 5, 'gesture:shake', 1],
    [4, 5, 'gesture:wiggle', 2],
  ]);
  assert.deepEqual(c.link.calls.length, 5);
});

test('runAll: onStep fires before its action runs, never after', async () => {
  const e = env();
  const c = ctx();
  const log = [];
  const link = {
    gestures: () => ({
      nod: () => { log.push('ran:nod'); return Promise.resolve(); },
      shake: () => { log.push('ran:shake'); return Promise.resolve(); },
    }),
  };
  await e.Actions.runAll(['gesture:nod', 'gesture:shake'], { link },
    (i, total, action) => log.push('step:' + action));
  assert.deepEqual(log, ['step:gesture:nod', 'ran:nod', 'step:gesture:shake', 'ran:shake']);
  assert.deepEqual(c.link.calls, []);
});

test('runAll: works without an onStep callback', async () => {
  const e = env();
  const c = ctx();
  await e.Actions.runAll(['repeat:2|gesture:nod'], c);
  assert.deepEqual(c.link.calls.length, 2);
});

// ── describe(): the parent-facing label ─────────────────────────────────────

test('describe: a readable label for every verb, without throwing', () => {
  const { Actions } = env();
  const cases = [
    ['wake', 'wake'],
    ['sleep', 'sleep'],
    ['stop', 'stop'],
    ['center', 'center'],
    ['gesture:nod', 'nod'],
    ['emotion:laughing1', 'play emotion "laughing1"'],
    ['motors:gravity_compensation', 'motors gravity_compensation'],
    ['volume:85', 'volume 85'],
    ['say:Hello there', 'speak: "Hello there"'],
    ['wait:400', 'wait 400ms'],
    ['burst:antennas', 'realtime burst'],
    ['repeat:3', 'repeat'],
  ];
  for (const [input, expected] of cases) {
    assert.deepEqual(Actions.describe(input), expected, input);
  }
});

/* The parent view is the one place the units have to be trustworthy: x/y/z are
 * millimetres and the rotations are degrees. Labelling all of them '°' was
 * wrong, and wrong in the exact place someone would go to check. */
test('describe: pose labels millimetre axes as mm and rotations as degrees', () => {
  const { Actions } = env();
  assert.deepEqual(
    Actions.describe('pose:pitch=25&x=10&z=-12&antennas=70,-70&duration=0.6&interpolation=cartoon'),
    'move pitch 25°, x 10mm, z -12mm, antennas 70° / -70°'
  );
});

test('describe: pose omits duration and interpolation from the label', () => {
  const { Actions } = env();
  assert.deepEqual(Actions.describe('pose:yaw=-40&duration=1.5&interpolation=minjerk'), 'move yaw -40°');
});

test('describe: multiple segments are joined with an arrow', () => {
  const { Actions } = env();
  assert.deepEqual(
    Actions.describe('volume:25|say:Quiet and low|pitch=0.5'),
    'volume 25 → speak: "Quiet and low"'
  );
});

test('describe: a long say payload is truncated to 40 characters', () => {
  const { Actions } = env();
  const long = 'A'.repeat(60);
  const out = Actions.describe('say:' + long);
  assert.deepEqual(out, 'speak: "' + 'A'.repeat(40) + '"');
});

test('describe: empty input and a stray params segment do not throw', () => {
  const { Actions } = env();
  assert.deepEqual(Actions.describe(''), '');
  assert.deepEqual(Actions.describe(null), '');
  assert.deepEqual(Actions.describe('pitch=0.5'), 'pitch=0.5');
});

test('describe: every action string in the curriculum data describes cleanly', () => {
  const e = loadApp(SCRIPTS.all, { fastTimers: true });
  const strings = [];
  const walk = (node) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { node.forEach(walk); return; }
    Object.keys(node).forEach((k) => {
      if (k === 'do' && typeof node[k] === 'string') strings.push(node[k]);
      else walk(node[k]);
    });
  };
  walk(e.ROBOT_LAB_QUESTS_EXPLORER);
  walk(e.ROBOT_LAB_QUESTS_BUILDER);
  assert.ok(strings.length > 100, 'expected the curriculum to carry many action strings, got ' + strings.length);
  for (const s of strings) {
    const label = e.Actions.describe(s);
    assert.deepEqual(typeof label, 'string', s);
    assert.notEqual(label, '', s);
    assert.deepEqual(/undefined|NaN|\[object/.test(label), false, s + ' -> ' + label);
  }
});

// ── speak.js ────────────────────────────────────────────────────────────────

function speakEnv(opts = {}) {
  return loadApp(SCRIPTS.speak, Object.assign({ fastTimers: true }, opts));
}

test('speak: a fresh Speaker takes preschooler-friendly defaults', () => {
  const e = speakEnv();
  const sp = new e.Speaker();
  assert.deepEqual(sp.supported, true);
  assert.deepEqual(sp.enabled, true);
  assert.deepEqual(sp.rate, 0.92);
  assert.deepEqual(sp.pitch, 1.08);
  assert.deepEqual(sp.lang, 'en-US');
});

/* iPad Safari refuses to speak until it has seen a real user gesture. Anything
 * requested before the first tap must be QUEUED, not dropped and not spoken —
 * and the caller must get a resolved promise so an action chain keeps moving. */
test('speak: say() before unlock() queues instead of speaking, and resolves false', async () => {
  const e = speakEnv();
  const sp = new e.Speaker();
  const spoke = await sp.say('Hello little one');
  assert.deepEqual(spoke, false);
  assert.deepEqual(e.speechSynthesis.spoken, [], 'nothing may reach the synthesiser yet');
});

/* On the first tap, flushing the WHOLE backlog would make the robot monologue
 * through instructions the child has already moved past. Only the newest line
 * is still relevant. */
test('speak: unlock() flushes only the newest queued line, not the backlog', async () => {
  const e = speakEnv();
  const sp = new e.Speaker();
  await sp.say('first');
  await sp.say('second');
  await sp.say('third');
  assert.deepEqual(e.speechSynthesis.spoken, []);

  sp.unlock();
  // The empty utterance is Safari's priming trick; the only real line is the newest.
  assert.deepEqual(e.speechSynthesis.spoken.map((u) => u.text), ['', 'third']);
});

test('speak: unlock() is idempotent and does not re-flush', () => {
  const e = speakEnv();
  const sp = new e.Speaker();
  sp.say('queued');
  sp.unlock();
  const after = e.speechSynthesis.spoken.length;
  sp.unlock();
  sp.unlock();
  assert.deepEqual(e.speechSynthesis.spoken.length, after);
});

test('speak: unlock() with an empty queue speaks nothing but the primer', () => {
  const e = speakEnv();
  const sp = new e.Speaker();
  sp.unlock();
  assert.deepEqual(e.speechSynthesis.spoken.map((u) => u.text), ['']);
});

test('speak: after unlock, say() speaks and resolves true', async () => {
  const e = speakEnv();
  const sp = new e.Speaker();
  sp.unlock();
  const spoke = await sp.say('Look at me');
  assert.deepEqual(spoke, true);
  const u = e.speechSynthesis.spoken[e.speechSynthesis.spoken.length - 1];
  assert.deepEqual(u.text, 'Look at me');
  assert.deepEqual(u.rate, 0.92);
  assert.deepEqual(u.pitch, 1.08);
});

test('speak: per-call pitch and rate override the defaults', async () => {
  const e = speakEnv();
  const sp = new e.Speaker();
  sp.unlock();
  await sp.say('I am a tiny squeaky robot!', { pitch: 1.8, rate: 0.7 });
  const u = e.speechSynthesis.spoken[e.speechSynthesis.spoken.length - 1];
  assert.deepEqual(u.pitch, 1.8);
  assert.deepEqual(u.rate, 0.7);
});

/* A new line cancels the one in flight. Without this, tapping two tiles makes
 * the robot talk over itself. */
test('speak: each new line cancels whatever is mid-utterance', async () => {
  const e = speakEnv();
  const sp = new e.Speaker();
  sp.unlock();
  const before = e.speechSynthesis.cancels.length;
  await sp.say('one');
  await sp.say('two');
  assert.deepEqual(e.speechSynthesis.cancels.length, before + 2);
});

test('speak: a named high-quality voice is preferred over the first available', async () => {
  const e = speakEnv();
  const sp = new e.Speaker();
  assert.deepEqual(sp._voice.name, 'Samantha');
  sp.unlock();
  await sp.say('hello');
  const u = e.speechSynthesis.spoken[e.speechSynthesis.spoken.length - 1];
  assert.deepEqual(u.voice.name, 'Samantha');
});

test('speak: empty text is never spoken', async () => {
  const e = speakEnv();
  const sp = new e.Speaker();
  sp.unlock();
  const n = e.speechSynthesis.spoken.length;
  assert.deepEqual(await sp.say(''), false);
  assert.deepEqual(await sp.say(null), false);
  assert.deepEqual(await sp.say(undefined), false);
  assert.deepEqual(e.speechSynthesis.spoken.length, n);
});

/* Safari intermittently never fires onend. The fallback timer means an action
 * chain that awaits say() cannot hang forever with a child watching. */
test('speak: say() still resolves when onend never fires', async () => {
  const never = { spoken: [], onvoiceschanged: null, getVoices: () => [], speak(u) { this.spoken.push(u); }, cancel() {} };
  const e = speakEnv({ extras: { speechSynthesis: never } });
  const sp = new e.Speaker();
  sp.unlock();
  assert.deepEqual(await sp.say('are you still there'), true);
  assert.deepEqual(never.spoken.length, 2);   // primer + the line
});

test('speak: setEnabled(false) stops speech, persists the preference, and mutes say()', async () => {
  const e = speakEnv();
  const sp = new e.Speaker();
  sp.unlock();
  const cancels = e.speechSynthesis.cancels.length;

  sp.setEnabled(false);
  assert.deepEqual(sp.enabled, false);
  assert.deepEqual(e.speechSynthesis.cancels.length, cancels + 1, 'must stop what is already speaking');
  assert.deepEqual(e.localStorage.getItem('robotlab.speech'), '0');

  const n = e.speechSynthesis.spoken.length;
  assert.deepEqual(await sp.say('should stay quiet'), false);
  assert.deepEqual(e.speechSynthesis.spoken.length, n);
});

test('speak: setEnabled(true) persists the opposite preference', () => {
  const e = speakEnv();
  const sp = new e.Speaker();
  sp.setEnabled(false);
  sp.setEnabled(true);
  assert.deepEqual(sp.enabled, true);
  assert.deepEqual(e.localStorage.getItem('robotlab.speech'), '1');
});

test('speak: loadPreference defaults to on, and only "0" turns it off', () => {
  assert.deepEqual(speakEnv().Speaker.loadPreference(), true);
  assert.deepEqual(speakEnv({ localStorage: { seed: { 'robotlab.speech': '0' } } }).Speaker.loadPreference(), false);
  assert.deepEqual(speakEnv({ localStorage: { seed: { 'robotlab.speech': '1' } } }).Speaker.loadPreference(), true);
});

/* Safari private browsing throws on both reads and writes to localStorage.
 * Losing the speech preference is acceptable; a thrown exception is not. */
test('speak: a hostile localStorage never propagates an exception', () => {
  const write = speakEnv({ localStorage: { throwOnSet: true } });
  const sp = new write.Speaker();
  sp.setEnabled(false);
  assert.deepEqual(sp.enabled, false);

  const read = speakEnv({ localStorage: { throwOnGet: true } });
  assert.deepEqual(read.Speaker.loadPreference(), true);

  const none = speakEnv({ localStorage: false });
  const sp2 = new none.Speaker();
  sp2.setEnabled(false);
  assert.deepEqual(sp2.enabled, false);
  assert.deepEqual(none.Speaker.loadPreference(), true);
});

/* A browser with no Web Speech API at all must degrade to silence, not to a
 * TypeError on the first instruction of a non-reader's quest. */
test('speak: a missing speechSynthesis degrades to silence without throwing', async () => {
  const e = speakEnv({ speech: false });
  const sp = new e.Speaker();
  assert.deepEqual(sp.supported, false);
  assert.deepEqual(await sp.say('anything'), false);
  sp.unlock();                       // must be a no-op, not a crash
  sp.stop();
  assert.deepEqual(await sp.say('still nothing'), false);
  sp.setEnabled(false);
  assert.deepEqual(e.localStorage.getItem('robotlab.speech'), '0',
    'the preference is still worth persisting on a silent browser');
});

test('speak: speechSynthesis without SpeechSynthesisUtterance counts as unsupported', () => {
  const e = speakEnv({ extras: { SpeechSynthesisUtterance: undefined } });
  const sp = new e.Speaker();
  assert.deepEqual(sp.supported, false);
  assert.doesNotThrow(() => sp.stop());
});

test('speak: stop() on a supported browser cancels', () => {
  const e = speakEnv();
  const sp = new e.Speaker();
  sp.stop();
  assert.deepEqual(e.speechSynthesis.cancels.length, 1);
});

// ── the DSL and the speaker together ────────────────────────────────────────

/* End to end through the two modules this file owns: a quest line that sets the
 * volume and then speaks, with the pitch riding in a trailing params segment. */
test('integration: volume + say + pitch drives both the link and a real Speaker', async () => {
  const e = loadApp(['assets/js/reachy.js', 'assets/js/actions.js', 'assets/js/speak.js'],
    { fastTimers: true });
  const link = makeRecordingLink(GESTURES);
  const speaker = new e.Speaker();
  speaker.unlock();

  await e.Actions.run('volume:25|say:Quiet and low|pitch=0.5', { link, speaker });

  assert.deepEqual(link.order(), ['volume']);
  assert.deepEqual(link.calls[0].arg, 25);
  const u = e.speechSynthesis.spoken[e.speechSynthesis.spoken.length - 1];
  assert.deepEqual(u.text, 'Quiet and low');
  assert.deepEqual(u.pitch, 0.5);
});

// ── regression: quest-ui.js completion callback ordering ────────────────────

/**
 * REGRESSION (bug 2). A builder may call its `done` callback SYNCHRONOUSLY,
 * while render() is still assembling the page — before the finish button and
 * its nudge label exist. The original code captured those elements directly in
 * the callback, so a synchronous completion threw a ReferenceError and took the
 * whole quest page down with it.
 *
 * The fix is structural, so this guards the structure: the callback goes through
 * a null-checked `onReached` indirection that is assigned only after the footer
 * is built, and the assignment is followed by a replay for the case where the
 * activity already finished. Asserted on the source because exercising it needs
 * a full DOM; the behavioural counterpart belongs with the quest-ui suite.
 */
test('quest-ui: a synchronous activity completion cannot reference the finish button early', () => {
  const src = readSource('assets/js/quest-ui.js');

  const decl = src.indexOf('var reached = false, reachedFull = false, onReached = null;');
  const builderCall = src.indexOf('builder(quest.activity, ctx, markReachable)');
  const finishCreated = src.indexOf("var finish = el('button'");
  const nudgeCreated = src.indexOf("var nudge = el('span', 'small muted')");
  const assign = src.indexOf('onReached = function (full)');
  const replay = src.indexOf('if (reached) onReached(reachedFull);');

  for (const [name, at] of Object.entries({ decl, builderCall, finishCreated, nudgeCreated, assign, replay })) {
    assert.notEqual(at, -1, 'expected to find ' + name + ' in quest-ui.js');
  }
  assert.deepEqual(src.includes('if (onReached) onReached(reachedFull);'), true,
    'markReachable must call the callback through a null-checked indirection');

  assert.ok(decl < builderCall, 'onReached must be declared before the builder can call back');
  assert.ok(builderCall < finishCreated, 'the builder runs before the finish button exists');
  assert.ok(finishCreated < assign, 'onReached must only be wired once finish exists');
  assert.ok(nudgeCreated < assign, 'onReached must only be wired once the nudge label exists');
  assert.ok(assign < replay, 'and an already-finished activity must be replayed after wiring');
});

// ── the module surface ──────────────────────────────────────────────────────

test('Actions exposes exactly parse, run, runAll and describe', () => {
  const { Actions } = env();
  assert.deepEqual(Object.keys(Actions).sort(), ['describe', 'parse', 'run', 'runAll']);
  for (const k of Object.keys(Actions)) assert.deepEqual(typeof Actions[k], 'function', k);
});
