/* ============================================================================
 * curriculum.test.mjs — data integrity for the 72 quests
 *
 * The curriculum is data, which is its strength: a quest can be edited by
 * someone who will never read the renderer. That is also the risk. A typo in
 * `emotion:cheerfull1`, a `kind: 'buttonz'`, a duplicated badge id, or a
 * `gesture:` name that no longer exists all produce the same symptom — a quiet
 * no-op in front of a child on a Sunday morning, with the app still cheerfully
 * congratulating her.
 *
 * So this suite is deliberately paranoid. It does not test the renderer; it
 * tests that the DATA and the CODE still agree, and it derives the "allowed"
 * sets FROM THE SOURCE (BUILDERS keys, AXIS_META keys, the `case` labels in the
 * action interpreter) rather than restating them, so drift on either side fails
 * loudly instead of silently.
 *
 * Nothing here touches the network or the robot: the harness stubs fetch and
 * the only RobotLink used is asked for its gesture vocabulary.
 * ==========================================================================*/

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadApp, SCRIPTS, readSource, makeFetch } from './harness.mjs';

// One sandbox for the read-only data assertions. The quest objects are never
// mutated by these tests, so sharing is safe and keeps the suite fast.
const g = loadApp([...SCRIPTS.actions, ...SCRIPTS.progress, ...SCRIPTS.data]);

/**
 * Arrays built inside the vm sandbox belong to a different realm, so their
 * prototype is not this realm's Array.prototype and assert/strict rejects them
 * as "same structure but not reference-equal". Copy them across the boundary
 * once, here, rather than sprinkling Array.from through every assertion.
 */
const host = (a) => Array.from(a);

const ALL = host(g.CURRICULUM.all());
const TRACKS = ['explorer', 'builder'];
const SEASON_NUMBERS = [1, 2, 3, 4, 5, 6];

const EMOTIONS = g.ROBOT_LAB_EMOTIONS;
const EMOTION_NAMES = host(g.ROBOT_LAB_EMOTION_NAMES);

// ── Facts extracted from the source, not restated ──────────────────────────

const UI_SRC = readSource('assets/js/quest-ui.js');
const ACTIONS_SRC = readSource('assets/js/actions.js');

/** The activity kinds the renderer actually implements. */
function rendererKinds() {
  const block = /var BUILDERS = \{([\s\S]*?)\n  \};/.exec(UI_SRC);
  assert.ok(block, 'could not find the BUILDERS map in quest-ui.js');
  return [...block[1].matchAll(/(\w+)\s*:/g)].map((m) => m[1]);
}

/** The dial axes the renderer knows how to label, limit and unit. */
function rendererAxes() {
  const block = /var AXIS_META = \{([\s\S]*?)\n  \};/.exec(UI_SRC);
  assert.ok(block, 'could not find AXIS_META in quest-ui.js');
  return [...block[1].matchAll(/^\s{4}(\w+):/gm)].map((m) => m[1]);
}

/** Every verb the action interpreter has a branch for. */
function interpreterVerbs() {
  return [...new Set([...ACTIONS_SRC.matchAll(/case '([a-z]+)':/g)].map((m) => m[1]))];
}

const KINDS = rendererKinds();
const AXES = rendererAxes();
const VERBS = interpreterVerbs();

/** The gesture vocabulary the curriculum is written against. */
const GESTURES = Object.keys(new g.RobotLink({ hosts: ['unused.invalid'] }).gestures());

const STRAND_IDS = host(g.Progress.STRANDS).map((s) => s.id);
const CONCEPT_TAGS = Object.keys(g.CURRICULUM.CONCEPTS);

// ── Walking the action strings ─────────────────────────────────────────────

/**
 * Every action string an activity can hand to Actions.run, with a label saying
 * where it came from so a failure names the offending field, not just the quest.
 *
 * The field list is the union of every place the renderer reads `.do` from:
 * items (buttons), palette (sequence/freeplay), broken (pre-filled debugging
 * sequences), steps (experiment), probes (dial/telemetry/code) and run (code).
 */
const ACTION_FIELDS = ['items', 'palette', 'broken', 'steps', 'probes', 'run'];

function actionStrings(quest) {
  const out = [];
  for (const field of ACTION_FIELDS) {
    const list = quest.activity[field] || [];
    list.forEach((entry, i) => {
      if (entry && entry.do) out.push({ action: entry.do, where: `${quest.id} ${field}[${i}]` });
    });
  }
  return out;
}

function allSegments() {
  const out = [];
  for (const q of ALL) {
    for (const { action, where } of actionStrings(q)) {
      for (const seg of g.Actions.parse(action)) out.push({ seg, action, where, quest: q });
    }
  }
  return out;
}

const SEGMENTS = allSegments();

function fail(list, what) {
  assert.deepEqual(list.length, 0, `${list.length} ${what}:\n  ` + list.join('\n  '));
}

// ══ Census ════════════════════════════════════════════════════════════════

test('the curriculum is exactly 72 quests, 36 per track', () => {
  assert.deepEqual(ALL.length, 72);
  assert.deepEqual(ALL.filter((q) => q.track === 'explorer').length, 36);
  assert.deepEqual(ALL.filter((q) => q.track === 'builder').length, 36);
  // No third track has crept in via a typo'd `track:` field.
  assert.deepEqual([...new Set(ALL.map((q) => q.track))].sort(), ['builder', 'explorer']);
});

test('every (track, season) pair holds exactly 6 quests', () => {
  assert.deepEqual(g.CURRICULUM.SEASONS.length, 6);
  assert.deepEqual(host(g.CURRICULUM.SEASONS).map((s) => s.n), SEASON_NUMBERS);
  for (const t of TRACKS) {
    for (const n of SEASON_NUMBERS) {
      assert.deepEqual(host(g.CURRICULUM.inSeason(t, n)).length, 6,
        `track ${t} season ${n} should have 6 quests`);
    }
  }
});

/**
 * The sisters work the SAME season in the same week. If a quest is filed under
 * a season that contradicts its id, the two tracks silently desynchronise and
 * sibling() starts pairing unrelated quests.
 */
test('quest ids encode their own track and season, and match the fields', () => {
  const bad = [];
  for (const q of ALL) {
    const m = /^([eb])([1-6])-([1-6])$/.exec(q.id);
    if (!m) { bad.push(`${q.id} does not match /^[eb][1-6]-[1-6]$/`); continue; }
    const expectedTrack = m[1] === 'e' ? 'explorer' : 'builder';
    if (q.track !== expectedTrack) bad.push(`${q.id} says track ${q.track}`);
    if (q.season !== Number(m[2])) bad.push(`${q.id} says season ${q.season}`);
  }
  fail(bad, 'quests whose id disagrees with its fields');
});

test('quest ids are unique', () => {
  const seen = new Map();
  const dupes = [];
  for (const q of ALL) {
    if (seen.has(q.id)) dupes.push(`${q.id} appears twice`);
    seen.set(q.id, true);
  }
  fail(dupes, 'duplicate quest ids');
  assert.deepEqual(seen.size, 72);
});

/**
 * Badges are keyed by id in localStorage. Two quests sharing a badge id means
 * finishing one silently awards the other and the strand tally over-counts —
 * and a kid's earned badge can be deleted by un-completing a quest she never did.
 */
test('milestone badge ids are unique across all 72 quests', () => {
  const owner = new Map();
  const dupes = [];
  for (const q of ALL) {
    const b = q.milestone.badge;
    if (owner.has(b)) dupes.push(`badge "${b}" claimed by ${owner.get(b)} and ${q.id}`);
    else owner.set(b, q.id);
  }
  fail(dupes, 'duplicate badge ids');
  assert.deepEqual(owner.size, 72);
});

// ══ Required fields ═══════════════════════════════════════════════════════

const REQUIRED = ['id', 'track', 'season', 'title', 'emoji', 'bigIdea', 'concepts',
  'beyondRobotics', 'sayThis', 'activity', 'unplugged', 'wonder', 'milestone', 'dadNote'];

test('every quest has every required field, non-empty', () => {
  const bad = [];
  for (const q of ALL) {
    for (const f of REQUIRED) {
      const v = q[f];
      if (v === undefined || v === null) { bad.push(`${q.id}.${f} is ${String(v)}`); continue; }
      if (typeof v === 'string' && !v.trim()) bad.push(`${q.id}.${f} is blank`);
      if (Array.isArray(v) && v.length === 0) bad.push(`${q.id}.${f} is an empty array`);
      if (typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 0) {
        bad.push(`${q.id}.${f} is an empty object`);
      }
    }
    // These two are only useful as prose, so assert they are strings of prose.
    for (const f of ['title', 'emoji', 'bigIdea', 'beyondRobotics', 'wonder', 'dadNote']) {
      if (typeof q[f] !== 'string') bad.push(`${q.id}.${f} should be a string, got ${typeof q[f]}`);
    }
    if (!Array.isArray(q.sayThis) || q.sayThis.some((s) => typeof s !== 'string' || !s.trim())) {
      bad.push(`${q.id}.sayThis must be non-empty strings`);
    }
    if (!Array.isArray(q.concepts) || q.concepts.some((c) => typeof c !== 'string' || !c.trim())) {
      bad.push(`${q.id}.concepts must be non-empty strings`);
    }
  }
  fail(bad, 'required-field violations');
});

/**
 * The nested records the renderer dereferences without guarding:
 * `quest.unplugged.minutes` is printed into the header and passed to
 * logSession(), and `quest.milestone.title` is what the badge popup shows.
 */
test('unplugged, milestone and activity have their own required sub-fields', () => {
  const bad = [];
  for (const q of ALL) {
    const u = q.unplugged;
    if (typeof u.title !== 'string' || !u.title.trim()) bad.push(`${q.id}.unplugged.title`);
    if (typeof u.how !== 'string' || !u.how.trim()) bad.push(`${q.id}.unplugged.how`);
    if (typeof u.minutes !== 'number' || !(u.minutes > 0)) {
      bad.push(`${q.id}.unplugged.minutes is ${JSON.stringify(u.minutes)}`);
    }
    const m = q.milestone;
    for (const f of ['strand', 'badge', 'title']) {
      if (typeof m[f] !== 'string' || !m[f].trim()) bad.push(`${q.id}.milestone.${f}`);
    }
    if (typeof q.activity.kind !== 'string' || !q.activity.kind) bad.push(`${q.id}.activity.kind`);
  }
  fail(bad, 'missing sub-fields');
});

test('every concept tag exists in CURRICULUM.CONCEPTS', () => {
  assert.ok(CONCEPT_TAGS.length >= 6, 'CONCEPTS should not be empty');
  const bad = [];
  for (const q of ALL) {
    for (const c of q.concepts) {
      if (!CONCEPT_TAGS.includes(c)) bad.push(`${q.id} tags unknown concept "${c}"`);
    }
  }
  fail(bad, 'unknown concept tags');
});

/**
 * strandTally() buckets badges by strand and drops anything it does not
 * recognise, so a misspelled strand does not error — the badge just never
 * appears on the parent dashboard.
 */
test('every milestone.strand is one of the six Progress strands', () => {
  assert.deepEqual(STRAND_IDS,
    ['motion', 'senses', 'sequences', 'logic', 'making', 'kindness']);
  const bad = [];
  for (const q of ALL) {
    if (!STRAND_IDS.includes(q.milestone.strand)) {
      bad.push(`${q.id} milestone.strand = "${q.milestone.strand}"`);
    }
  }
  fail(bad, 'unknown strands');
  // Every strand must be earnable on both tracks, or a kid's dashboard shows a
  // permanently empty column.
  for (const t of TRACKS) {
    const strands = new Set(ALL.filter((q) => q.track === t).map((q) => q.milestone.strand));
    assert.deepEqual([...strands].sort(), [...STRAND_IDS].sort(),
      `track ${t} does not cover every strand`);
  }
});

// ══ Activity kinds and per-kind shape ═════════════════════════════════════

test('the renderer implements exactly the eight documented activity kinds', () => {
  assert.deepEqual([...KINDS].sort(),
    ['buttons', 'code', 'dial', 'experiment', 'freeplay', 'offline', 'sequence', 'telemetry']);
});

test('every activity.kind is one the renderer implements, and none is dead code', () => {
  const bad = [];
  for (const q of ALL) {
    if (!KINDS.includes(q.activity.kind)) {
      bad.push(`${q.id} activity.kind = "${q.activity.kind}" (renderer knows ${KINDS.join(', ')})`);
    }
  }
  fail(bad, 'unrenderable activity kinds');
  // The reverse direction: a builder no quest uses is either dead code or a
  // sign that a quest's `kind` was renamed and the data was not updated.
  const used = new Set(ALL.map((q) => q.activity.kind));
  assert.deepEqual([...used].sort(), [...KINDS].sort());
});

test('each activity kind carries the fields its builder requires', () => {
  const bad = [];
  const need = (q, cond, msg) => { if (!cond) bad.push(`${q.id} (${q.activity.kind}) ${msg}`); };
  const nonEmptyArray = (v) => Array.isArray(v) && v.length > 0;

  for (const q of ALL) {
    const a = q.activity;
    switch (a.kind) {
      case 'buttons':
        need(q, nonEmptyArray(a.items), 'needs items[]');
        // `taps` is the completion threshold; more taps than tiles is unreachable.
        if (a.taps !== undefined) {
          need(q, typeof a.taps === 'number' && a.taps > 0 && a.taps <= (a.items || []).length,
            `taps ${a.taps} is not reachable with ${(a.items || []).length} tiles`);
        }
        break;
      case 'sequence':
        need(q, nonEmptyArray(a.palette), 'needs palette[]');
        need(q, typeof a.minSteps === 'number', `needs a numeric minSteps (got ${JSON.stringify(a.minSteps)})`);
        need(q, a.minSteps >= 1 && a.minSteps <= (a.palette || []).length,
          `minSteps ${a.minSteps} cannot be met from a palette of ${(a.palette || []).length}`);
        break;
      case 'dial':
        need(q, nonEmptyArray(a.axes), 'needs axes[]');
        break;
      case 'code':
        need(q, typeof a.source === 'string' && a.source.trim().length > 0, 'needs source');
        need(q, typeof a.explain === 'string' && a.explain.trim().length > 0, 'needs explain');
        break;
      case 'offline':
        need(q, nonEmptyArray(a.checklist), 'needs checklist[]');
        break;
      case 'freeplay':
        need(q, nonEmptyArray(a.palette), 'needs palette[]');
        break;
      case 'experiment':
        need(q, nonEmptyArray(a.steps), 'needs steps[]');
        break;
      case 'telemetry':
        need(q, nonEmptyArray(a.watch), 'needs watch[]');
        break;
      default:
        bad.push(`${q.id} unhandled kind ${a.kind}`);
    }
  }
  fail(bad, 'per-kind shape violations');
});

/**
 * Tiles are emoji-first because the 4-year-old cannot read the label; the label
 * is what VoiceOver reads and what the tablet speaks. A tile missing either is
 * blank or silent on the track that needs it most.
 */
test('every tile and step carries the text the renderer displays', () => {
  const bad = [];
  for (const q of ALL) {
    const a = q.activity;
    for (const f of ['items', 'palette', 'broken']) {
      (a[f] || []).forEach((t, i) => {
        if (!t.emoji) bad.push(`${q.id} ${f}[${i}] has no emoji`);
        if (!t.label) bad.push(`${q.id} ${f}[${i}] has no label`);
        if (!t.do) bad.push(`${q.id} ${f}[${i}] has no action`);
      });
    }
    (a.steps || []).forEach((s, i) => {
      if (!s.text) bad.push(`${q.id} steps[${i}] has no text`);
    });
    (a.probes || []).forEach((p, i) => {
      if (!p.label) bad.push(`${q.id} probes[${i}] has no label`);
      // A probe with nothing to do, read or explain is a button that does nothing.
      if (!p.do && !p.endpoint && !p.explain) bad.push(`${q.id} probes[${i}] is inert`);
    });
    (a.run || []).forEach((r, i) => {
      if (!r.label) bad.push(`${q.id} run[${i}] has no label`);
    });
    (a.checklist || []).forEach((c, i) => {
      if (typeof c !== 'string' || !c.trim()) bad.push(`${q.id} checklist[${i}] is not text`);
    });
  }
  fail(bad, 'tiles/steps missing display text');
});

/**
 * An unrecognised axis still renders — buildDial falls back to a generic 40°/°
 * meta — so the slider silently gets the wrong limit and the wrong unit. For a
 * quest whose whole point is "the numbers are real", that is worse than a crash.
 */
test('every dial axis is one the renderer has metadata for', () => {
  assert.deepEqual([...AXES].sort(), ['bodyYaw', 'pitch', 'roll', 'x', 'y', 'yaw', 'z']);
  const bad = [];
  for (const q of ALL) {
    for (const ax of q.activity.axes || []) {
      if (!AXES.includes(ax)) bad.push(`${q.id} dial axis "${ax}"`);
    }
    // Duplicated axes would render two sliders bound to the same value.
    const seen = new Set(q.activity.axes || []);
    if (seen.size !== (q.activity.axes || []).length) bad.push(`${q.id} has duplicate dial axes`);
  }
  fail(bad, 'unknown dial axes');
});

/** buildTelemetry only fills a cell for a key it has a formatter for. */
test('every telemetry watch key is one the renderer formats', () => {
  const KNOWN = ['head', 'bodyYaw', 'antennas', 'controlMode', 'doa', 'status'];
  const bad = [];
  for (const q of ALL) {
    for (const w of q.activity.watch || []) {
      if (!KNOWN.includes(w)) bad.push(`${q.id} watch "${w}"`);
    }
  }
  fail(bad, 'telemetry keys with no formatter');
});

/** Probes hit the daemon by path; a typo shows a child "Could not read". */
test('every probe endpoint is an absolute daemon API path', () => {
  const bad = [];
  for (const q of ALL) {
    for (const p of q.activity.probes || []) {
      if (!p.endpoint) continue;
      if (!/^\/api\/[a-z0-9/_-]+$/.test(p.endpoint)) bad.push(`${q.id} endpoint "${p.endpoint}"`);
    }
  }
  fail(bad, 'malformed probe endpoints');
});

// ══ The action DSL ════════════════════════════════════════════════════════

test('the interpreter implements exactly the thirteen documented verbs', () => {
  assert.deepEqual([...VERBS].sort(),
    ['burst', 'center', 'emotion', 'gesture', 'motors', 'pose', 'repeat',
      'say', 'sleep', 'stop', 'volume', 'wait', 'wake']);
});

/**
 * The interpreter's default branch console.warns and resolves, so an unknown
 * verb is invisible in use: the tile lights up, the promise resolves, the tap
 * counter advances, and the robot never moves.
 */
test('every action string in every quest parses to known verbs only', () => {
  // Guard against the walk itself silently finding nothing.
  assert.ok(SEGMENTS.length >= 200, `expected 200+ action segments, walked ${SEGMENTS.length}`);
  const bad = [];
  for (const { seg, action, where } of SEGMENTS) {
    if (!VERBS.includes(seg.verb)) bad.push(`${where}: unknown verb "${seg.verb}" in "${action}"`);
  }
  fail(bad, 'unknown action verbs');
});

test('every emotion:NAME is one of the 81 emotions present on the robot', () => {
  const used = SEGMENTS.filter((s) => s.seg.verb === 'emotion');
  assert.ok(used.length >= 40, `expected the curriculum to use emotions, found ${used.length}`);
  const bad = [];
  for (const { seg, action, where } of used) {
    if (!seg.payload) bad.push(`${where}: empty emotion name in "${action}"`);
    else if (!EMOTION_NAMES.includes(seg.payload)) {
      bad.push(`${where}: emotion "${seg.payload}" is not on the robot`);
    }
  }
  fail(bad, 'emotions the robot does not have');
});

test('every gesture:NAME is a real key of RobotLink.gestures()', () => {
  assert.ok(GESTURES.includes('nod') && GESTURES.includes('center'),
    'gesture vocabulary looks wrong: ' + GESTURES.join(','));
  const bad = [];
  for (const { seg, action, where } of SEGMENTS) {
    if (seg.verb !== 'gesture') continue;
    if (!GESTURES.includes(seg.payload)) {
      bad.push(`${where}: gesture "${seg.payload}" is not in the vocabulary, in "${action}"`);
    }
  }
  fail(bad, 'unknown gestures');
});

/**
 * poseRequest() reads only the keys it knows. `pose:pich=25` therefore posts a
 * rest pose: the head moves to centre and nothing hints that a word was
 * misspelled. Same for a duration that is not a number.
 */
test('every pose action uses known parameters with numeric values', () => {
  const POSE_KEYS = ['x', 'y', 'z', 'roll', 'pitch', 'yaw', 'bodyYaw',
    'antennas', 'duration', 'interpolation'];
  const INTERPOLATIONS = ['linear', 'minjerk', 'cartoon', 'ease_in_out', 'instant'];
  const bad = [];
  let poses = 0;
  for (const { seg, action, where } of SEGMENTS) {
    if (seg.verb !== 'pose') continue;
    poses++;
    const params = Object.assign({}, seg.params);
    for (const pair of String(seg.payload).split('&')) {
      if (!pair) continue;
      const i = pair.indexOf('=');
      if (i < 0) { bad.push(`${where}: "${pair}" is not key=value in "${action}"`); continue; }
      params[pair.slice(0, i).trim()] = pair.slice(i + 1).trim();
    }
    if (Object.keys(params).length === 0) bad.push(`${where}: pose with no parameters in "${action}"`);
    for (const k of Object.keys(params)) {
      if (!POSE_KEYS.includes(k)) { bad.push(`${where}: unknown pose key "${k}" in "${action}"`); continue; }
      if (k === 'interpolation') {
        if (!INTERPOLATIONS.includes(params[k])) bad.push(`${where}: interpolation "${params[k]}"`);
      } else if (k === 'antennas') {
        const pair = String(params[k]).split(',');
        if (pair.length !== 2 || pair.some((v) => !Number.isFinite(parseFloat(v)))) {
          bad.push(`${where}: antennas "${params[k]}" is not two numbers`);
        }
      } else if (!Number.isFinite(parseFloat(params[k]))) {
        bad.push(`${where}: ${k}="${params[k]}" is not a number`);
      }
    }
    if (params.duration !== undefined && !(parseFloat(params.duration) > 0)) {
      bad.push(`${where}: duration "${params.duration}" must be positive`);
    }
  }
  assert.ok(poses >= 20, `expected the curriculum to use pose actions, found ${poses}`);
  fail(bad, 'malformed pose actions');
});

test('describe() produces a label for every action in the curriculum', () => {
  const bad = [];
  for (const q of ALL) {
    for (const { action, where } of actionStrings(q)) {
      const text = g.Actions.describe(action);
      if (typeof text !== 'string' || !text.trim()) bad.push(`${where}: "${action}" describes as ${JSON.stringify(text)}`);
    }
  }
  fail(bad, 'actions with no human-readable label');
  // Spot-check the units, since the parent view is where they must be trusted.
  assert.deepEqual(g.Actions.describe('pose:pitch=25&z=10&duration=0.6'),
    'move pitch 25°, z 10mm');
});

// ══ Emotions ══════════════════════════════════════════════════════════════

test('the robot emotion list is the 81 verified names, with no duplicates', () => {
  assert.deepEqual(EMOTION_NAMES.length, 81);
  assert.deepEqual(new Set(EMOTION_NAMES).size, 81);
});

/**
 * Both directions matter. A robot emotion with no catalogue entry has no kid
 * label and no emoji, so EMOTIONS.get() returns null and the grid renders a
 * blank tile. A catalogued emotion the robot does not have is a button that
 * 404s at the daemon.
 */
test('the catalogue and the robot list cover each other exactly', () => {
  const catalogued = host(EMOTIONS.ALL).map((e) => e.name);
  assert.deepEqual(catalogued.length, 81);
  assert.deepEqual(new Set(catalogued).size, 81, 'the catalogue has a duplicate entry');
  const missing = EMOTION_NAMES.filter((n) => !catalogued.includes(n));
  const invented = catalogued.filter((n) => !EMOTION_NAMES.includes(n));
  assert.deepEqual(missing, [], 'robot emotions with no catalogue entry');
  assert.deepEqual(invented, [], 'catalogued emotions the robot does not have');
  // get() must resolve every one of them.
  for (const n of EMOTION_NAMES) assert.ok(EMOTIONS.get(n), `EMOTIONS.get("${n}") is null`);
  assert.deepEqual(EMOTIONS.get('not_a_real_emotion1'), null);
});

test('every catalogue entry has a label, emoji, family and intensity', () => {
  const bad = [];
  for (const e of host(EMOTIONS.ALL)) {
    for (const f of ['label', 'emoji', 'family', 'intensity']) {
      if (typeof e[f] !== 'string' || !e[f].trim()) bad.push(`${e.name}.${f} is ${JSON.stringify(e[f])}`);
    }
    if (!['gentle', 'strong'].includes(e.intensity)) {
      bad.push(`${e.name}.intensity = "${e.intensity}" (must be gentle or strong)`);
    }
  }
  fail(bad, 'incomplete catalogue entries');
  // Every entry is in exactly one of the two bands, so the gate cannot be
  // bypassed by an entry that is neither.
  assert.deepEqual(EMOTIONS.gentle().length + EMOTIONS.strong().length, 81);
});

/**
 * `gentle()` is the gate that keeps rage, dying, contempt and disgust off a
 * preschooler's button grid. `sample()` is what actually feeds that grid, so it
 * is checked too — a family whose members were mis-banded would leak through
 * sample() even with gentle() correct.
 */
test('the age-4 gentle set excludes every strong emotion', () => {
  const gentle = host(EMOTIONS.gentle()).map((e) => e.name);
  const strong = host(EMOTIONS.strong()).map((e) => e.name);
  assert.ok(strong.length >= 20, `expected a real strong band, got ${strong.length}`);
  const leaked = strong.filter((n) => gentle.includes(n));
  assert.deepEqual(leaked, [], 'strong emotions reachable from gentle()');
  for (const n of ['rage1', 'furious1', 'dying1', 'contempt1', 'disgusted1']) {
    assert.ok(strong.includes(n), `${n} must be banded strong`);
    assert.ok(!gentle.includes(n), `${n} must not be reachable from gentle()`);
  }
  // sample() is the grid the 4-year-old actually sees.
  const sampled = host(EMOTIONS.sample(24));
  assert.ok(sampled.length > 0);
  assert.deepEqual(sampled.filter((e) => e.intensity === 'strong').map((e) => e.name), [],
    'sample() put a strong emotion on the age-4 grid');
});

/**
 * CHILD SAFETY. The Explorer track is the 4-year-old. Nothing she can tap may
 * play rage, dying, contempt, disgust or the rest of the strong band — not
 * directly via `emotion:`, and not indirectly via a `gesture:` that resolves to
 * a recorded emotion underneath.
 */
test('no Explorer quest can reach a strong-intensity emotion', () => {
  const strong = new Set(host(EMOTIONS.strong()).map((e) => e.name));

  // Which gestures are secretly emotions: `curious: function () { return self.emotion('curious1'); }`
  const gestureEmotion = {};
  for (const m of readSource('assets/js/reachy.js')
    .matchAll(/(\w+): function \(\) \{ return self\.emotion\('([a-z_0-9]+)'\); \}/g)) {
    gestureEmotion[m[1]] = m[2];
  }
  assert.ok(Object.keys(gestureEmotion).length >= 10,
    'expected to find the emotion-backed gestures: ' + JSON.stringify(gestureEmotion));

  const violations = [];
  for (const { seg, action, where, quest } of SEGMENTS) {
    if (quest.track !== 'explorer') continue;
    if (seg.verb === 'emotion' && strong.has(seg.payload)) {
      violations.push(`${where}: emotion:${seg.payload} in "${action}"`);
    }
    if (seg.verb === 'gesture' && strong.has(gestureEmotion[seg.payload])) {
      violations.push(`${where}: gesture:${seg.payload} plays ${gestureEmotion[seg.payload]} in "${action}"`);
    }
  }
  assert.deepEqual(violations, [], 'a 4-year-old can reach a strong emotion');

  // And no emotion-backed gesture anywhere in the vocabulary is strong, so a
  // future explorer quest cannot reach one by using an existing gesture name.
  for (const [gesture, emotion] of Object.entries(gestureEmotion)) {
    assert.ok(!strong.has(emotion), `gesture:${gesture} plays strong emotion ${emotion}`);
  }
});

// ══ The curriculum graph ══════════════════════════════════════════════════

test('next() chains exactly 36 deep on each track and then terminates', () => {
  for (const t of TRACKS) {
    const first = host(g.CURRICULUM.track(t))[0];
    assert.ok(first, `no quests on track ${t}`);
    const walked = [first.id];
    let cur = first;
    // Bounded so a cycle fails the length assertion instead of hanging.
    for (let i = 0; i < 100; i++) {
      const nxt = g.CURRICULUM.next(cur.id);
      if (!nxt) break;
      assert.deepEqual(nxt.track, t, `next() crossed tracks at ${cur.id}`);
      walked.push(nxt.id);
      cur = nxt;
    }
    assert.deepEqual(walked.length, 36, `track ${t} chain length`);
    assert.deepEqual(new Set(walked).size, 36, `track ${t} chain revisits a quest`);
    assert.deepEqual(g.CURRICULUM.next(cur.id), null, `track ${t} chain does not terminate`);
    // The chain is the curriculum order, so seasons must be non-decreasing.
    const seasons = walked.map((id) => g.CURRICULUM.get(id).season);
    assert.deepEqual(seasons, [...seasons].sort((a, b) => a - b),
      `track ${t} chain jumps back to an earlier season`);
  }
});

/**
 * sibling() is what the "her sister is doing" link uses. If it is not total,
 * that link disappears for some quests; if it is not symmetric, the two tracks
 * point at different weeks and the shared-season design quietly breaks.
 */
test('sibling() is total, cross-track, same-season and symmetric', () => {
  const bad = [];
  for (const q of ALL) {
    const s = g.CURRICULUM.sibling(q.id);
    if (!s) { bad.push(`${q.id} has no sibling`); continue; }
    if (s.track === q.track) bad.push(`${q.id} sibling ${s.id} is on the same track`);
    if (s.season !== q.season) bad.push(`${q.id} (season ${q.season}) paired with ${s.id} (season ${s.season})`);
    const back = g.CURRICULUM.sibling(s.id);
    if (!back || back.id !== q.id) {
      bad.push(`${q.id} -> ${s.id} -> ${back ? back.id : 'null'} is not symmetric`);
    }
  }
  fail(bad, 'sibling() violations');
  // A bijection: 72 quests, 72 distinct siblings.
  assert.deepEqual(new Set(ALL.map((q) => g.CURRICULUM.sibling(q.id).id)).size, 72);
});

test('lookups return null rather than throwing for ids that do not exist', () => {
  assert.deepEqual(g.CURRICULUM.get('e9-9'), null);
  assert.deepEqual(g.CURRICULUM.next('e9-9'), null);
  assert.deepEqual(g.CURRICULUM.sibling('e9-9'), null);
  assert.deepEqual(g.CURRICULUM.season(99), null);
  assert.deepEqual(host(g.CURRICULUM.inSeason('explorer', 99)), []);
  assert.deepEqual(host(g.CURRICULUM.track('nope')), []);
});

test('all() is stable and does not leak its sort scratch field', () => {
  const a = host(g.CURRICULUM.all()).map((q) => q.id);
  const b = host(g.CURRICULUM.all()).map((q) => q.id);
  assert.deepEqual(a, b);
  // build() tags each quest with `_i` to make the sort stable and must delete it.
  for (const q of host(g.CURRICULUM.all())) {
    assert.ok(!('_i' in q), `${q.id} still carries the _i sort scratch field`);
  }
});

// ══ Regressions ═══════════════════════════════════════════════════════════

/**
 * REGRESSION 1 — `Number(duration) || 1.0` treats an explicit 0 as absent.
 *
 * The curriculum writes durations as strings (`duration=0.6`). An author asking
 * for `duration=0` means "as fast as you can" and must get the 0.1s floor; a
 * quest that omits duration must get the 1.0s default. Coercing 0 to 1.0 turned
 * the fastest possible move into the slowest, which is exactly backwards for the
 * quests that exist to show the difference between fast and slow.
 */
test('duration 0 clamps to the 0.1s floor; only a missing duration defaults to 1.0', () => {
  const rest = g.RobotLink.clampPose({}).deg;

  // Explicit zero, in every form the DSL can produce it.
  assert.deepEqual(g.RobotLink.toWire(rest, 0).duration, 0.1);
  assert.deepEqual(g.RobotLink.toWire(rest, '0').duration, 0.1);
  assert.deepEqual(g.RobotLink.toWire(rest, -5).duration, 0.1, 'a negative duration must clamp up, not default');
  assert.deepEqual(g.RobotLink.toWire(rest, 0.05).duration, 0.1);

  // Absent, in every form.
  assert.deepEqual(g.RobotLink.toWire(rest, undefined).duration, 1.0);
  assert.deepEqual(g.RobotLink.toWire(rest, null).duration, 1.0);
  assert.deepEqual(g.RobotLink.toWire(rest, '').duration, 1.0);
  assert.deepEqual(g.RobotLink.toWire(rest, NaN).duration, 1.0);
  assert.deepEqual(g.RobotLink.toWire(rest, 'soon').duration, 1.0);

  // Real values pass through untouched.
  assert.deepEqual(g.RobotLink.toWire(rest, 0.6).duration, 0.6);
  assert.deepEqual(g.RobotLink.toWire(rest, '2.0').duration, 2);
});

/**
 * REGRESSION 1, at the wire — the same property observed through the DSL, which
 * is how the curriculum actually reaches it, and with the unit conversion the
 * boundary is responsible for: 30 degrees is exactly 0.5235987755982988 rad and
 * 10 mm is exactly 0.01 m.
 */
test('a pose action from the curriculum reaches the wire in radians and metres', async () => {
  const fetch = makeFetch({ '/api/daemon/status': { status: 'running' }, '/api/move/goto': { ok: true } });
  const sandbox = loadApp([...SCRIPTS.actions, ...SCRIPTS.data], { fetch, fastTimers: true });
  const link = new sandbox.RobotLink({ hosts: ['reachy-mini.local'] });
  link.status = 'online';
  link.host = 'reachy-mini.local';

  await sandbox.Actions.run('pose:pitch=30&z=10&duration=0', { link: link, speaker: null });

  const posts = fetch.calls.filter((c) => c.url.includes('/api/move/goto'));
  assert.deepEqual(posts.length, 1);
  const body = JSON.parse(posts[0].init.body);
  assert.deepEqual(body.head_pose.pitch, 0.5235987755982988);   // 30 deg
  assert.deepEqual(body.head_pose.z, 0.01);                     // 10 mm
  assert.deepEqual(body.duration, 0.1, 'duration=0 must arrive as the 0.1s floor');
  assert.deepEqual(body.interpolation, 'cartoon');

  // And omitting it entirely gives the 1.0s default over the same path.
  fetch.calls.length = 0;
  await sandbox.Actions.run('pose:pitch=30', { link: link, speaker: null });
  const second = JSON.parse(fetch.calls.filter((c) => c.url.includes('/api/move/goto'))[0].init.body);
  assert.deepEqual(second.duration, 1.0);
});

/**
 * REGRESSION 2 — the finish-button callback used to be captured before the
 * button existed.
 *
 * A builder may call its `done` callback synchronously while it is still being
 * constructed (a dial with a single axis reaches its own goal on the first
 * send; a checklist of one is one tap away). The nudge code lives ~350 lines
 * further down, after `finish` is created, so referencing `finish` or `nudge`
 * from the completion callback threw a TDZ/undefined error and took the whole
 * quest render down with it.
 *
 * The fix is a late-bound `onReached` hook plus a replay for the synchronous
 * case. This test pins that structure, because the failure only reproduces for
 * a builder that fires synchronously — none does today, and the next one added
 * must not be the one that discovers it.
 */
test('quest-ui defers the finish-button nudge instead of capturing it early', () => {
  const iDecl = UI_SRC.indexOf('var reached = false, reachedFull = false, onReached = null;');
  const iBuilderCall = UI_SRC.indexOf('builder(quest.activity, ctx, markReachable)');
  const iFinishCreated = UI_SRC.indexOf("var finish = el('button'");
  const iWire = UI_SRC.indexOf('onReached = function (full)');
  const iReplay = UI_SRC.indexOf('if (reached) onReached(reachedFull);');

  for (const [name, i] of Object.entries({ iDecl, iBuilderCall, iFinishCreated, iWire, iReplay })) {
    assert.notEqual(i, -1, `${name}: expected structure missing from quest-ui.js`);
  }

  // The hook and its flags must exist BEFORE the builder can call back into them.
  assert.ok(iDecl < iBuilderCall, 'onReached/reached must be declared before the builder runs');
  // The nudge is wired only once the button it sits next to exists...
  assert.ok(iFinishCreated < iWire, 'onReached must be wired after `finish` is created');
  // ...and a builder that already finished gets its notification replayed.
  assert.ok(iWire < iReplay, 'the synchronous-completion replay must follow the wiring');

  // The callback the builder receives must not touch the not-yet-created DOM.
  const body = /function markReachable\(full\) \{([\s\S]*?)\n {4}\}/.exec(UI_SRC);
  assert.ok(body, 'could not find markReachable in quest-ui.js');
  assert.match(body[1], /if \(onReached\) onReached\(/,
    'markReachable must call through the late-bound hook');
  for (const forbidden of ['finish', 'nudge']) {
    assert.ok(!new RegExp('\\b' + forbidden + '\\b').test(body[1]),
      `markReachable must not reference \`${forbidden}\`, which does not exist yet`);
  }
});
