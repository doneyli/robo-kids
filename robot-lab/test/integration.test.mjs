/* ============================================================================
 * integration.test.mjs — the modules working together
 *
 * The per-module suites check units in isolation. This one checks the seams,
 * which is where the bugs found by audit actually lived: the action DSL driving
 * the robot layer, the robot layer degrading mid-session, and the curriculum
 * data being executable rather than merely well-shaped.
 *
 * The headline test is `every action string in all 72 quests executes`. That is
 * 240-odd strings run for real against a recording link. A malformed `do:` in a
 * quest is otherwise invisible until a child taps that exact tile.
 * ==========================================================================*/

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadApp, SCRIPTS, makeFetch, makeRecordingLink } from './harness.mjs';

const OK_STATUS = { state: 'running', version: '1.6.3', wlan_ip: '192.168.1.15' };

function appOnline(extraRoutes = {}, opts = {}) {
  const fetchStub = makeFetch(Object.assign({
    '/api/daemon/status': OK_STATUS,
    '/api/move/': { uuid: 'move-1' },
    '/api/motors/': { status: 'ok' },
    '/api/volume/': { volume: 60 },
    '/api/state/full': {
      control_mode: 'enabled',
      head_pose: { x: 0, y: 0, z: 0, roll: 0, pitch: 0.5, yaw: 0 },
      body_yaw: 0, antennas_position: [0, 0],
    },
  }, extraRoutes));
  const g = loadApp(SCRIPTS.all, Object.assign(
    { fetch: fetchStub, now: '2026-07-26T12:00:00Z' }, opts));
  return { g, fetchStub };
}

// ── The curriculum is executable, not just well-shaped ───────────────────────

test('every action string in all 72 quests executes without throwing', async () => {
  // fastTimers: the DSL waits out each move for real, which would make this
  // sweep of 240+ strings take minutes.
  const { g } = appOnline({}, { fastTimers: true });
  const gestureNames = Object.keys(new g.RobotLink().gestures());

  const strings = [];
  for (const q of g.CURRICULUM.all()) {
    const a = q.activity;
    for (const field of ['items', 'palette', 'broken', 'steps', 'probes', 'run']) {
      for (const entry of a[field] || []) {
        if (entry && entry.do) strings.push({ id: q.id, field, action: entry.do });
      }
    }
  }

  // If this count collapses, the extraction above has silently stopped finding
  // actions and the rest of this test would vacuously pass.
  assert.ok(strings.length > 200, `expected 200+ action strings, found ${strings.length}`);

  const failures = [];
  for (const { id, field, action } of strings) {
    const link = makeRecordingLink(gestureNames);
    // A speaker that records rather than speaks; `say:` must not need a real one.
    const spoken = [];
    const speaker = { say: (t) => { spoken.push(t); return Promise.resolve(true); } };
    try {
      await g.Actions.runAll([action], { link, speaker });
      // Every action must actually DO something — a typo'd verb resolves quietly,
      // which is exactly how the dead "Repeat all 3x" tile survived review.
      //
      // Two verbs are legitimately inert in isolation: `wait:` is a pause, and a
      // bare `repeat:N` is contextual — it replays what came BEFORE it, so alone
      // there is nothing to replay. That it works inside a plan is asserted by
      // the loop-quest test below, which is the case that actually matters.
      var contextual = /^\s*(wait|repeat):/.test(action);
      if (!link.calls.length && !spoken.length && !contextual) {
        failures.push(`${id}.${field}: "${action}" produced no robot call and no speech`);
      }
    } catch (e) {
      failures.push(`${id}.${field}: "${action}" threw ${e.message}`);
    }
  }
  assert.deepEqual(failures, [], failures.join('\n'));
});

test('the age-4 loop quest actually loops', async () => {
  // Quest e5-2 teaches loops. Its "Repeat all 3x" tile is a bare `repeat:3`,
  // which used to be silently discarded — so the one quest about repetition
  // repeated nothing, and still congratulated her.
  const { g } = appOnline({}, { fastTimers: true });
  const quest = g.CURRICULUM.get('e5-2');
  assert.ok(quest, 'quest e5-2 must exist');

  const repeatTile = quest.activity.palette.find((p) => /^repeat:/.test(p.do));
  assert.ok(repeatTile, 'e5-2 must still have a repeat tile');

  const gestureNames = Object.keys(new g.RobotLink().gestures());
  const link = makeRecordingLink(gestureNames);

  // Build what a child builds: two moves, then the repeat tile.
  const plan = [quest.activity.palette[0].do, quest.activity.palette[1].do, repeatTile.do];
  await g.Actions.runAll(plan, { link, speaker: null });

  const n = parseInt(repeatTile.do.split(':')[1], 10);
  assert.equal(link.calls.length, 2 * n,
    `two moves repeated ${n} times should be ${2 * n} calls, got ${link.calls.length}`);
});

test('no Explorer quest can reach a strong-intensity emotion', () => {
  // Child-safety invariant. rage1 / furious1 / dying1 / contempt1 / disgusted1
  // are real parts of the emotion library and fine to discuss with an 8-year-old,
  // but must never appear in a preschooler's button grid.
  const { g } = appOnline();
  const strong = new Set(g.ROBOT_LAB_EMOTIONS.strong().map((e) => e.name));
  assert.ok(strong.size >= 15, 'the strong band should not have quietly emptied');

  const violations = [];
  for (const q of g.CURRICULUM.track('explorer')) {
    const a = q.activity;
    for (const field of ['items', 'palette', 'broken', 'steps', 'probes', 'run']) {
      for (const entry of a[field] || []) {
        for (const seg of g.Actions.parse(entry && entry.do)) {
          if (seg.verb === 'emotion' && strong.has(seg.payload)) {
            violations.push(`${q.id}.${field}: ${seg.payload}`);
          }
        }
      }
    }
  }
  assert.deepEqual(violations, [], 'strong emotions in the age-4 track: ' + violations.join(', '));
});

// ── The seam between the DSL and the robot layer ─────────────────────────────

test('a pose action arrives at the wire clamped and in radians', async () => {
  const { g, fetchStub } = appOnline({}, { fastTimers: true });
  const link = new g.RobotLink();
  await link.connect();

  // Ask for an impossible pitch through the DSL, the way a quest would.
  await g.Actions.run('pose:pitch=90&yaw=200&duration=0.5', { link, speaker: null });

  const gotoCall = fetchStub.calls.find((c) => c.url.includes('/api/move/goto'));
  assert.ok(gotoCall, 'a goto request should have been sent');
  const body = JSON.parse(gotoCall.init.body);

  const deg = (r) => (r * 180) / Math.PI;
  assert.ok(Math.abs(deg(body.head_pose.pitch)) <= 40.001,
    `pitch reached the wire at ${deg(body.head_pose.pitch)}°`);
  assert.ok(Math.abs(deg(body.head_pose.yaw) - deg(body.body_yaw)) <= 65.001,
    'the coupled head/body yaw limit held');
  assert.equal(body.duration, 0.5);
});

test('actions run strictly in order, and a repeat preserves that order', async () => {
  const { g } = appOnline({}, { fastTimers: true });
  const gestureNames = Object.keys(new g.RobotLink().gestures());
  const link = makeRecordingLink(gestureNames);
  await g.Actions.runAll(['gesture:nod', 'repeat:2|gesture:wiggle', 'gesture:shake'],
    { link, speaker: null });
  assert.deepEqual(link.order(),
    ['gesture:nod', 'gesture:wiggle', 'gesture:wiggle', 'gesture:shake']);
});

test('onStep reports indices the caller can map back to its own array', async () => {
  const { g } = appOnline({}, { fastTimers: true });
  const gestureNames = Object.keys(new g.RobotLink().gestures());
  const link = makeRecordingLink(gestureNames);
  const seen = [];
  const plan = ['gesture:nod', 'gesture:wiggle', 'repeat:3'];
  await g.Actions.runAll(plan, { link, speaker: null },
    (i, total, action, origin) => seen.push(origin));

  // Every origin must index into `plan`, otherwise a sequence UI highlights a
  // tile that does not exist — which is what it used to do.
  assert.ok(seen.every((o) => o >= 0 && o < plan.length),
    `origins out of range: ${JSON.stringify(seen)}`);
  assert.deepEqual(seen, [0, 1, 0, 1, 0, 1]);
});

// ── Resilience across a whole session ───────────────────────────────────────

test('a mid-session dropout degrades, keeps working, then self-heals', async () => {
  let reachable = true;
  const fetchStub = (url, init) => {
    if (!reachable) return Promise.reject(new TypeError('Failed to fetch'));
    const body = String(url).includes('/api/move/') ? { uuid: 'm' } : OK_STATUS;
    return Promise.resolve({
      ok: true, status: 200,
      headers: { get: () => 'application/json' },
      json: () => Promise.resolve(body),
      text: () => Promise.resolve(JSON.stringify(body)),
    });
  };
  const g = loadApp(SCRIPTS.reachy, { fetch: fetchStub });
  const link = new g.RobotLink();

  assert.equal(await link.connect(), 'online');

  // The simulator must keep animating regardless of the network, so record the
  // events the drawing subscribes to.
  const poses = [];
  link.on('pose', (d) => poses.push(d));

  reachable = false;
  const r = await link.goto({ head: { pitch: 10 } });
  assert.equal(link.status, 'simulated', 'a transport failure degrades');
  assert.ok(r && r.simulated, 'the call still RESOLVES — never rejects at a child');
  assert.equal(poses.length, 1, 'the on-screen robot was still driven');

  // Commands keep resolving while degraded.
  await link.emotion('cheerful1');
  await link.wakeUp();
  assert.equal(link.status, 'simulated');

  // And a recheck is armed, so the session heals itself when WiFi returns.
  assert.ok(link._recheckTimer, 'a background re-probe should be scheduled');
  link.dispose();
});

test('an HTTP error is not treated as an unreachable robot', async () => {
  // 503 "Backend not running" means the robot IS there. Falling back to the
  // simulator and staying there was the bug; it should try to restart instead.
  let mode = 'ok';
  const seen = [];
  const fetchStub = (url, init) => {
    seen.push(String(url));
    if (mode === '503' && String(url).includes('/api/move/')) {
      return Promise.resolve({
        ok: false, status: 503,
        headers: { get: () => 'application/json' },
        text: () => Promise.resolve('{"detail":"Backend not running"}'),
      });
    }
    const body = String(url).includes('/api/move/') ? { uuid: 'm' } : OK_STATUS;
    return Promise.resolve({
      ok: true, status: 200,
      headers: { get: () => 'application/json' },
      json: () => Promise.resolve(body),
      text: () => Promise.resolve(JSON.stringify(body)),
    });
  };
  const g = loadApp(SCRIPTS.reachy, { fetch: fetchStub });
  const link = new g.RobotLink();
  await link.connect();

  mode = '503';
  await link.goto({ head: { pitch: 10 } });
  await new Promise((r) => setTimeout(r, 150));

  const restarted = seen.some((u) => u.includes('/api/daemon/start') && u.includes('wake_up=false'));
  assert.ok(restarted, 'a 503 should trigger a backend restart, with the required wake_up param');
  link.dispose();
});

test('taps during connect() reach the robot instead of the simulator', async () => {
  // A child taps the instant the page paints, which used to be mid-connect: status
  // was still 'unknown', so the command silently went to the drawing only.
  let release;
  const gate = new Promise((r) => { release = r; });
  const calls = [];
  const fetchStub = (url) => {
    calls.push(String(url));
    const body = String(url).includes('/api/move/') ? { uuid: 'm' } : OK_STATUS;
    const respond = () => ({
      ok: true, status: 200,
      headers: { get: () => 'application/json' },
      json: () => Promise.resolve(body),
      text: () => Promise.resolve(JSON.stringify(body)),
    });
    if (String(url).includes('/api/daemon/status')) return gate.then(respond);
    return Promise.resolve(respond());
  };
  const g = loadApp(SCRIPTS.reachy, { fetch: fetchStub });
  const link = new g.RobotLink();

  const connecting = link.connect();
  const early = link.goto({ head: { pitch: 5 } });   // tapped before connect resolved
  release();
  await connecting;
  const res = await early;

  assert.ok(!res || !res.simulated, 'the early command should have reached the robot');
  assert.ok(calls.some((u) => u.includes('/api/move/goto')), 'a goto was actually sent');
  link.dispose();
});

test('stop() abandons the rest of a composed gesture', async () => {
  const { g } = appOnline();
  const link = new g.RobotLink();
  await link.connect();

  let posts = 0;
  const realGoto = link.goto.bind(link);
  link.goto = (r) => { posts += 1; return realGoto(r); };

  const spinning = link.gestures().spin();     // four timed gotos, ~3.8s
  setTimeout(() => link.stop(), 250);
  await spinning;

  // Without the generation token the chain posted all four regardless, and the
  // robot resumed moving a moment after "stop".
  assert.ok(posts <= 2, `expected the chain to be abandoned, but it posted ${posts} gotos`);
  link.dispose();
});

// ── Progress across a realistic nine-month arc ──────────────────────────────

test('a season of weekly sessions produces sane stats and a live streak', () => {
  const { g } = appOnline();
  const P = new g.Progress();
  const all = g.CURRICULUM.all();
  const season1 = g.CURRICULUM.inSeason('explorer', 1);

  season1.forEach((q) => P.complete('explorer', q));

  const stats = P.stats('explorer', all);
  assert.equal(stats.completed, 6);
  assert.equal(stats.total, 36, 'only her own track counts');
  assert.equal(stats.badges, 6);
  assert.equal(stats.seasons[1].done, 6);
  assert.equal(stats.seasons[2].done, 0);

  // Next up must be the first quest of season 2, not a re-run of season 1.
  const next = P.nextQuest('explorer', all);
  assert.equal(next.season, 2);
  assert.equal(next.track, 'explorer');

  // The builder track is untouched by her progress.
  assert.equal(P.stats('builder', all).completed, 0);
});

test('export then import on a fresh device restores the year', () => {
  const { g } = appOnline();
  const P = new g.Progress();
  const all = g.CURRICULUM.all();
  g.CURRICULUM.inSeason('explorer', 1).forEach((q) => P.complete('explorer', q));
  P.setKidName('explorer', 'Ada');
  P.note('explorer', 'e1-1', 'She said he was pretending to be awake.');
  const backup = P.exportJSON();

  // A different browser: separate sandbox, empty localStorage.
  const { g: g2 } = appOnline();
  const P2 = new g2.Progress();
  assert.equal(P2.stats('explorer', all).completed, 0);

  P2.importJSON(backup);
  assert.equal(P2.stats('explorer', all).completed, 6);
  assert.equal(P2.stats('explorer', all).badges, 6);
  assert.equal(P2.kid('explorer').name, 'Ada', 'the name must survive the round trip');
  assert.match(P2.kid('explorer').notes['e1-1'], /pretending to be awake/);
});

test('importing an older backup does not erase newer progress', () => {
  const { g } = appOnline();
  const all = g.CURRICULUM.all();

  const P = new g.Progress();
  g.CURRICULUM.inSeason('explorer', 1).slice(0, 3).forEach((q) => P.complete('explorer', q));
  const oldBackup = P.exportJSON();

  // Time passes; three more quests get done on the iPad.
  g.CURRICULUM.inSeason('explorer', 1).slice(3, 6).forEach((q) => P.complete('explorer', q));
  assert.equal(P.stats('explorer', all).completed, 6);

  // Restoring the stale file from the Mac must be a union, not a replace.
  P.importJSON(oldBackup);
  assert.equal(P.stats('explorer', all).completed, 6,
    'a stale backup must not roll progress back');
});
