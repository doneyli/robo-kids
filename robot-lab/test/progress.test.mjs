/* ============================================================================
 * progress.test.mjs — the ledger of nine months of Sunday mornings
 *
 * progress.js is the only part of this app that holds irreplaceable data. A
 * clamped joint angle can be re-tapped; a wiped completion date cannot be
 * re-earned. So these tests are pedantic on purpose: idempotency, merge
 * semantics, and the arithmetic of week streaks (including across a New Year,
 * which is where week-based code usually breaks).
 *
 * No network, no robot, no real localStorage. Everything runs in the vm sandbox
 * built by harness.mjs.
 * ==========================================================================*/

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadApp, SCRIPTS, readSource } from './harness.mjs';

const KEY = 'robotlab.progress.v1';

/** Sunday 26 July 2026. Local noon, so the local calendar date is unambiguous
 *  no matter which timezone the test machine is in. */
const NOW = '2026-07-26T12:00:00';
const TODAY = '2026-07-26';

/* Quest data is read-only for progress.js, so one shared sandbox is enough and
 * saves re-parsing 130 KB of curriculum for every test. */
const DATA = loadApp(SCRIPTS.data, { now: NOW });
const ALL = DATA.CURRICULUM.all();
const EXPLORER = ALL.filter((q) => q.track === 'explorer');
const BUILDER = ALL.filter((q) => q.track === 'builder');
const byId = (id) => {
  const q = ALL.find((x) => x.id === id);
  if (!q) throw new Error('fixture quest missing: ' + id);
  return q;
};

/**
 * Cross-realm deep compare.
 *
 * Objects built inside the vm sandbox have that realm's Object.prototype, so
 * deepStrictEqual rejects them against a plain literal on prototype identity
 * alone ("same structure but not reference-equal"). JSON-normalise first, which
 * also matches what actually gets persisted and exported.
 */
const plain = (v) => JSON.parse(JSON.stringify(v));

/**
 * Realm-agnostic "this threw a SyntaxError from JSON.parse". `instanceof Error`
 * is useless here for the same reason as above: the sandbox has its own Error.
 */
const isSyntaxError = (e) =>
  e.name === 'SyntaxError' && typeof e.message === 'string' && typeof e.stack === 'string';

/** A fresh sandbox + store. Returns both so tests can inspect warnings. */
function fresh(opts = {}) {
  const app = loadApp(SCRIPTS.progress, { now: NOW, ...opts });
  return { app, p: new app.Progress() };
}

/**
 * Move the sandbox's clock. progress.js calls `new Date()` through the sandbox
 * global on every today(), so replacing ctx.Date mid-test is enough to simulate
 * "next Sunday" without waiting for one.
 */
function repin(app, iso) {
  const fixed = new Date(iso).getTime();
  const Real = Date;
  function Frozen(...args) {
    if (!(this instanceof Frozen)) return new Real(...args).toString();
    return args.length === 0 ? new Real(fixed) : new Real(...args);
  }
  Frozen.prototype = Real.prototype;
  Frozen.now = () => fixed;
  Frozen.parse = Real.parse;
  Frozen.UTC = Real.UTC;
  app.Date = Frozen;
}

/** Seed a store whose completions sit on given dates, then read the streak. */
function streakFor(dates, nowIso) {
  const { app, p } = fresh({ now: nowIso });
  const k = p.kid('explorer');
  dates.forEach((d, i) => { k.completed['q' + i] = d; });
  return p._streak(k);
}

/* ── kid() ──────────────────────────────────────────────────────────────── */

test('kid() auto-creates a record with empty collections and today as created', () => {
  const { p } = fresh();
  const k = p.kid('explorer');
  assert.deepEqual(k.name, 'explorer');
  assert.deepEqual(k.track, 'explorer');
  assert.deepEqual(plain(k.completed), {});
  assert.deepEqual(plain(k.badges), {});
  assert.deepEqual(plain(k.notes), {});
  assert.deepEqual(plain(k.sessions), []);
  assert.deepEqual(k.created, TODAY);
  // The SAME object on the second call, not a fresh blank record: callers such
  // as quest-ui mutate what kid() hands back, so identity has to hold.
  assert.ok(p.kid('explorer') === k, 'kid() must return the live record, not a copy');
  p.kid('explorer').name = 'Lucia';
  assert.deepEqual(p.kid('explorer').name, 'Lucia');
});

// The track is derived from the id, and 'explorer' is the ONLY id that maps to
// the explorer track. Anything else — 'builder', a nickname, a typo — is a
// builder, because the builder track is the one with reading in it.
test('kid() derives explorer only for the id "explorer"; everything else is a builder', () => {
  const { p } = fresh();
  assert.deepEqual(p.kid('explorer').track, 'explorer');
  assert.deepEqual(p.kid('builder').track, 'builder');
  assert.deepEqual(p.kid('zoe').track, 'builder');
  assert.deepEqual(p.kid('Explorer').track, 'builder');
  assert.deepEqual(p.kid('').track, 'builder');
});

test('kid() persists the new record immediately', () => {
  const { app, p } = fresh();
  p.kid('builder');
  const raw = JSON.parse(app.localStorage.getItem(KEY));
  assert.deepEqual(Object.keys(raw.kids), ['builder']);
  assert.deepEqual(raw.kids.builder.track, 'builder');
  assert.deepEqual(raw.updated, TODAY);
});

// A half-written or hand-edited record must be normalised on read, not crash a
// renderer three call frames later.
test('kid() repairs a malformed existing record instead of returning it raw', () => {
  const seed = {
    [KEY]: JSON.stringify({
      version: 1,
      kids: {
        explorer: {
          completed: ['e1-1'],   // array where an object belongs
          badges: null,
          sessions: { nope: true },
          notes: 'oops'
        }
      },
      updated: '2026-01-01'
    })
  };
  const { p } = fresh({ localStorage: { seed } });
  const k = p.kid('explorer');
  assert.deepEqual(plain(k.completed), {});
  assert.deepEqual(plain(k.badges), {});
  assert.deepEqual(plain(k.notes), {});
  assert.deepEqual(plain(k.sessions), []);
  assert.deepEqual(k.track, 'explorer');
  assert.deepEqual(k.name, 'explorer');
  assert.deepEqual(k.created, TODAY);
});

test('setKidName trims to 24 characters', () => {
  const { p } = fresh();
  p.setKidName('explorer', 'Ludmila Alejandra de la Cruz');
  assert.deepEqual(p.kid('explorer').name, 'Ludmila Alejandra de la ');
  assert.deepEqual(p.kid('explorer').name.length, 24);
});

/* ── complete() / uncomplete() ──────────────────────────────────────────── */

test('complete() records the date and awards the quest badge', () => {
  const { p } = fresh();
  const q = byId('e1-1');
  assert.deepEqual(q.milestone.badge, 'first-hello');
  assert.deepEqual(p.complete('explorer', q), true);
  const k = p.kid('explorer');
  assert.deepEqual(k.completed['e1-1'], TODAY);
  assert.deepEqual(plain(k.badges['first-hello']), {
    title: 'First Hello',
    strand: 'motion',
    emoji: q.emoji,
    date: TODAY,
    questId: 'e1-1'
  });
  assert.deepEqual(p.isComplete('explorer', 'e1-1'), true);
});

// The whole point of the return value: a second tap must not award a second
// badge, must report "not first" so the caller does not log a second session,
// and must leave the ORIGINAL date alone. That date is the memory.
test('complete() is idempotent and preserves the original completion date weeks later', () => {
  const { app, p } = fresh();
  const q = byId('e1-1');
  assert.deepEqual(p.complete('explorer', q), true);

  repin(app, '2026-08-16T12:00:00');
  assert.deepEqual(p.complete('explorer', q), false);

  const k = p.kid('explorer');
  assert.deepEqual(k.completed['e1-1'], TODAY, 'completion date must not be rewritten');
  assert.deepEqual(k.badges['first-hello'].date, TODAY, 'badge date must not be rewritten');
  assert.deepEqual(Object.keys(k.badges).length, 1, 'exactly one badge');
  assert.deepEqual(Object.keys(k.completed).length, 1);
  // The store's own bookkeeping date does move, though.
  assert.deepEqual(p.data.updated, '2026-08-16');
});

test('complete() on a quest with no milestone records the completion and no badge', () => {
  const { p } = fresh();
  const q = { id: 'x1', track: 'explorer', season: 1 };
  assert.deepEqual(p.complete('explorer', q), true);
  assert.deepEqual(p.kid('explorer').completed.x1, TODAY);
  assert.deepEqual(plain(p.kid('explorer').badges), {});
  assert.deepEqual(p.complete('explorer', q), false);
});

test('uncomplete() removes both the completion and the badge', () => {
  const { p } = fresh();
  const a = byId('e1-1');
  const b = byId('e1-2');
  p.complete('explorer', a);
  p.complete('explorer', b);
  p.uncomplete('explorer', a);

  const k = p.kid('explorer');
  assert.deepEqual(k.completed['e1-1'], undefined);
  assert.deepEqual(k.badges['first-hello'], undefined);
  assert.deepEqual(p.isComplete('explorer', 'e1-1'), false);
  // The other quest is untouched.
  assert.deepEqual(k.completed['e1-2'], TODAY);
  assert.deepEqual(Object.keys(k.badges), ['parts-finder']);
  // And un-completing makes it "first" again.
  assert.deepEqual(p.complete('explorer', a), true);
});

test('uncomplete() of something never completed is a no-op, not a throw', () => {
  const { p } = fresh();
  p.uncomplete('explorer', byId('e1-1'));
  assert.deepEqual(plain(p.kid('explorer').completed), {});
  assert.deepEqual(plain(p.kid('explorer').badges), {});
});

/* ── notes and sessions ─────────────────────────────────────────────────── */

test('note() stores, truncates at 600 chars, and clears on empty text', () => {
  const { p } = fresh();
  p.note('explorer', 'e1-1', 'She told the robot it was shy.');
  assert.deepEqual(p.kid('explorer').notes['e1-1'], 'She told the robot it was shy.');

  p.note('explorer', 'e1-2', 'x'.repeat(900));
  assert.deepEqual(p.kid('explorer').notes['e1-2'].length, 600);

  // The delete branch is what makes a typo fixable.
  p.note('explorer', 'e1-1', '');
  assert.deepEqual('e1-1' in p.kid('explorer').notes, false);
});

test('logSession appends dated sessions and keeps only the last 400', () => {
  const { p } = fresh();
  p.logSession('explorer', ['e1-1'], 30);
  assert.deepEqual(plain(p.kid('explorer').sessions),
    [{ date: TODAY, questIds: ['e1-1'], minutes: 30 }]);

  for (let i = 0; i < 405; i++) p.logSession('explorer', ['q' + i], 10);
  const s = p.kid('explorer').sessions;
  assert.deepEqual(s.length, 400);
  // 406 pushed, oldest 6 dropped: the window keeps the tail.
  assert.deepEqual(plain(s[0].questIds), ['q5']);
  assert.deepEqual(plain(s[399].questIds), ['q404']);
});

/* ── strandTally ────────────────────────────────────────────────────────── */

// Hand-counted from the authored explorer curriculum. If someone adds a quest
// or re-tags a milestone, this fails on purpose — the six strand bars on the
// parent dashboard are only meaningful if their denominators are real.
test('strandTally totals match the authored explorer quest data', () => {
  const { p } = fresh();
  const tally = p.strandTally('explorer', EXPLORER);
  assert.deepEqual(plain(tally), {
    motion: { earned: 0, total: 8 },
    senses: { earned: 0, total: 9 },
    sequences: { earned: 0, total: 4 },
    logic: { earned: 0, total: 4 },
    making: { earned: 0, total: 5 },
    kindness: { earned: 0, total: 6 }
  });
  const sum = Object.keys(tally).reduce((n, s) => n + tally[s].total, 0);
  assert.deepEqual(sum, 36, 'every explorer quest carries exactly one milestone');
});

test('strandTally earns against the strand of the badge, not of the quest slot', () => {
  const { p } = fresh();
  // Fixture assumptions, asserted rather than assumed.
  assert.deepEqual(byId('e1-1').milestone.strand, 'motion');
  assert.deepEqual(byId('e1-3').milestone.strand, 'kindness');
  assert.deepEqual(byId('e1-6').milestone.strand, 'sequences');
  assert.deepEqual(byId('e1-2').milestone.strand, 'motion');

  ['e1-1', 'e1-2', 'e1-3', 'e1-6'].forEach((id) => p.complete('explorer', byId(id)));
  const tally = p.strandTally('explorer', EXPLORER);
  assert.deepEqual(tally.motion.earned, 2);
  assert.deepEqual(tally.kindness.earned, 1);
  assert.deepEqual(tally.sequences.earned, 1);
  assert.deepEqual(tally.senses.earned, 0);
  assert.deepEqual(tally.logic.earned, 0);
  assert.deepEqual(tally.making.earned, 0);
});

test('strandTally reports all six strands with zero quests, and ignores unknown strands', () => {
  const { p } = fresh();
  const tally = p.strandTally('explorer', []);
  assert.deepEqual(Object.keys(tally), ['motion', 'senses', 'sequences', 'logic', 'making', 'kindness']);
  Object.keys(tally).forEach((s) => assert.deepEqual(plain(tally[s]), { earned: 0, total: 0 }));

  // A badge from a future curriculum version must not crash the dashboard.
  p.kid('explorer').badges['from-the-future'] = { strand: 'astrophysics', title: 'x', date: TODAY };
  const t2 = p.strandTally('explorer', EXPLORER);
  assert.deepEqual(t2.motion.earned, 0);
  assert.deepEqual(Object.keys(t2).length, 6);
});

/* ── stats() ────────────────────────────────────────────────────────────── */

test('stats() counts completed and total for the kid own track only', () => {
  const { p } = fresh();
  ['e1-1', 'e1-2', 'e3-1'].forEach((id) => p.complete('explorer', byId(id)));
  const s = p.stats('explorer', ALL);   // the full 72, both tracks
  assert.deepEqual(s.total, 36, 'the other track is not part of her denominator');
  assert.deepEqual(s.completed, 3);
  assert.deepEqual(s.badges, 3);
});

// A stray cross-track completion (imported backup, shared device) must not
// inflate either side of "3 of 36".
test('stats() ignores a completion that belongs to the other track', () => {
  const { p } = fresh();
  p.kid('explorer').completed['b1-1'] = TODAY;
  p.complete('explorer', byId('e1-1'));
  const s = p.stats('explorer', ALL);
  assert.deepEqual(s.completed, 1);
  assert.deepEqual(s.total, 36);
});

test('stats() seasons breakdown is per-season and per-track', () => {
  const { p } = fresh();
  ['e1-1', 'e1-2', 'e3-1', 'e6-6'].forEach((id) => p.complete('explorer', byId(id)));
  const s = p.stats('explorer', ALL);
  assert.deepEqual(plain(s.seasons), {
    1: { total: 6, done: 2 },
    2: { total: 6, done: 0 },
    3: { total: 6, done: 1 },
    4: { total: 6, done: 0 },
    5: { total: 6, done: 0 },
    6: { total: 6, done: 1 }
  });
});

test('stats() for the builder track uses the builder quests', () => {
  const { p } = fresh();
  p.complete('builder', byId('b1-1'));
  const s = p.stats('builder', ALL);
  assert.deepEqual(s.total, 36);
  assert.deepEqual(s.completed, 1);
  assert.deepEqual(BUILDER.length, 36);
  assert.deepEqual(p.stats('builder', []).total, 0);
});

/* ── the streak ─────────────────────────────────────────────────────────── */

test('streak counts consecutive calendar weeks back from now', () => {
  // 26 Jul 2026 is a Sunday; the three Sundays before it are 19, 12, 5 July.
  assert.deepEqual(streakFor(['2026-07-26', '2026-07-19', '2026-07-12'], NOW), 3);
  assert.deepEqual(streakFor(['2026-07-26', '2026-07-19', '2026-07-12', '2026-07-05'], NOW), 4);
});

test('two completions in the same week count as one week', () => {
  // Sat 25th and Sun 26th share the week beginning Monday 20 July.
  assert.deepEqual(streakFor(['2026-07-25', '2026-07-26'], NOW), 1);
});

test('a skipped week breaks the streak', () => {
  // 12 July is present, 19 July is missing: the run stops there.
  assert.deepEqual(streakFor(['2026-07-26', '2026-07-12', '2026-07-05'], NOW), 1);
});

// One week of grace, because a Sunday gets eaten by a birthday party.
test('a streak stays alive for one missed week, then dies', () => {
  assert.deepEqual(streakFor(['2026-07-19', '2026-07-12'], NOW), 2, 'last week still counts');
  assert.deepEqual(streakFor(['2026-07-12', '2026-07-05'], NOW), 0, 'two weeks ago is stale');
  assert.deepEqual(streakFor(['2026-05-31', '2026-05-24', '2026-05-17'], NOW), 0,
    'four solid weeks last spring is not a live streak in July');
});

test('no completions means no streak', () => {
  assert.deepEqual(streakFor([], NOW), 0);
});

// An imported backup from a device with a wrong clock can carry a future date.
// That is a reason to be forgiving, not to zero a real streak.
test('a future-dated completion does not wipe the streak', () => {
  assert.deepEqual(streakFor(['2026-08-02', '2026-07-26'], NOW), 2);
});

/**
 * THE YEAR BOUNDARY. Monday 28 Dec 2026 and Monday 4 Jan 2027 are adjacent
 * weeks even though the year digit changes and ISO week numbers reset to 1.
 * Any implementation that compares week NUMBERS (52 -> 1) breaks here; this one
 * keys weeks by the date of their Monday, which is why it survives.
 */
test('a streak spans the New Year', () => {
  const NY = '2027-01-06T12:00:00';               // Wednesday of the week of 4 Jan
  assert.deepEqual(streakFor(['2027-01-04', '2026-12-28'], NY), 2);
  assert.deepEqual(streakFor(['2027-01-04', '2026-12-28', '2026-12-21'], NY), 3);
  // Sunday sessions, which is when these actually happen: 3 Jan 2027 belongs to
  // the week beginning 28 Dec 2026, and 27 Dec 2026 to the week before it.
  assert.deepEqual(streakFor(['2027-01-03', '2026-12-27'], NY), 2);
  // And a gap across the boundary still breaks: 28 Dec present, 4 Jan missing.
  assert.deepEqual(streakFor(['2026-12-28', '2026-12-21'], NY), 2, 'grace week');
  assert.deepEqual(streakFor(['2026-12-21', '2026-12-14'], NY), 0, 'too stale to be live');
});

// Weeks are keyed in UTC, so a spring-forward Sunday is still exactly 7 days
// from the one before it. A local-time subtraction would give 6d23h and break.
test('a streak survives a daylight-saving change', () => {
  // 8 Mar 2026 is the US/Canada spring-forward Sunday.
  assert.deepEqual(streakFor(['2026-03-08', '2026-03-01'], '2026-03-08T12:00:00'), 2);
  assert.deepEqual(streakFor(['2026-11-01', '2026-10-25'], '2026-11-01T12:00:00'), 2);
});

test('stats().streakWeeks reports the same number as the streak itself', () => {
  const { p } = fresh();
  const k = p.kid('explorer');
  k.completed['e1-1'] = '2026-07-26';
  k.completed['e1-2'] = '2026-07-19';
  assert.deepEqual(p.stats('explorer', ALL).streakWeeks, 2);
});

/* ── nextQuest ──────────────────────────────────────────────────────────── */

test('nextQuest walks curriculum order and never crosses tracks', () => {
  const { p } = fresh();
  assert.deepEqual(p.nextQuest('explorer', ALL).id, 'e1-1');
  assert.deepEqual(p.nextQuest('builder', ALL).id, 'b1-1');

  p.complete('explorer', byId('e1-1'));
  assert.deepEqual(p.nextQuest('explorer', ALL).id, 'e1-2');
  // Her sister's progress is hers alone.
  assert.deepEqual(p.nextQuest('builder', ALL).id, 'b1-1');

  ['e1-2', 'e1-3', 'e1-4', 'e1-5'].forEach((id) => p.complete('explorer', byId(id)));
  assert.deepEqual(p.nextQuest('explorer', ALL).id, 'e1-6');
});

// Out-of-order completions are normal — Dad skips one and comes back. "Next"
// means the first gap in curriculum order, not the successor of the last done.
test('nextQuest returns the earliest gap, not the quest after the last completed', () => {
  const { p } = fresh();
  ['e1-1', 'e1-3', 'e1-4'].forEach((id) => p.complete('explorer', byId(id)));
  assert.deepEqual(p.nextQuest('explorer', ALL).id, 'e1-2');
});

test('nextQuest returns null when the whole track is done', () => {
  const { p } = fresh();
  EXPLORER.forEach((q) => p.complete('explorer', q));
  assert.deepEqual(p.nextQuest('explorer', ALL), null);
  assert.deepEqual(p.nextQuest('explorer', []), null);
  // The builder is untouched by 36 explorer completions.
  assert.deepEqual(p.nextQuest('builder', ALL).id, 'b1-1');
});

/* ── export / import ────────────────────────────────────────────────────── */

test('exportJSON then importJSON on a fresh device restores everything', () => {
  const a = fresh();
  a.p.setKidName('explorer', 'Lucia');
  a.p.setKidName('builder', 'Mila');
  a.p.complete('explorer', byId('e1-1'));
  a.p.complete('explorer', byId('e1-2'));
  a.p.complete('builder', byId('b1-1'));
  a.p.note('explorer', 'e1-1', 'She said he was shy.');
  a.p.logSession('explorer', ['e1-1', 'e1-2'], 30);
  a.p.logSession('builder', ['b1-1'], 60);
  const text = a.p.exportJSON();
  assert.deepEqual(JSON.parse(text).version, 1);

  const b = fresh();                      // a different device, blank
  assert.deepEqual(b.p.importJSON(text), true);

  for (const id of ['explorer', 'builder']) {
    const src = a.p.kid(id);
    const dst = b.p.kid(id);
    assert.deepEqual(dst.name, src.name);
    assert.deepEqual(plain(dst.completed), plain(src.completed));
    assert.deepEqual(plain(dst.badges), plain(src.badges));
    assert.deepEqual(plain(dst.notes), plain(src.notes));
    assert.deepEqual(plain(dst.sessions), plain(src.sessions));
  }
  assert.deepEqual(b.p.stats('explorer', ALL).completed, 2);
  assert.deepEqual(b.p.kid('explorer').badges['first-hello'].date, TODAY);
  // And it landed in storage, not just in memory.
  assert.deepEqual(JSON.parse(b.app.localStorage.getItem(KEY)).kids.explorer.name, 'Lucia');
});

/**
 * MERGE, not replace. Restoring last month's backup from the Mac must not
 * delete what was earned on the iPad since — otherwise "import" is a data-loss
 * button dressed up as a safety feature.
 */
test('importing an OLDER backup never erases newer progress', () => {
  const old = fresh();
  old.p.complete('explorer', byId('e1-1'));
  old.p.note('explorer', 'e1-1', 'first draft note');
  old.p.logSession('explorer', ['e1-1'], 30);
  repin(old.app, '2026-06-07T12:00:00');
  const backup = old.p.exportJSON();

  // Meanwhile, on the iPad: more quests, and a better note.
  const live = fresh();
  live.p.complete('explorer', byId('e1-1'));
  live.p.complete('explorer', byId('e1-2'));
  live.p.complete('explorer', byId('e1-3'));
  live.p.note('explorer', 'e1-1', 'corrected note');
  live.p.logSession('explorer', ['e1-1'], 30);
  live.p.logSession('explorer', ['e1-2', 'e1-3'], 35);

  live.p.importJSON(backup);
  const k = live.p.kid('explorer');
  assert.deepEqual(Object.keys(k.completed).sort(), ['e1-1', 'e1-2', 'e1-3']);
  assert.deepEqual(Object.keys(k.badges).length, 3);
  assert.deepEqual(k.notes['e1-1'], 'corrected note', 'the newer note wins');
  assert.deepEqual(live.p.stats('explorer', ALL).completed, 3);
});

test('importing the same backup twice does not duplicate sessions or badges', () => {
  const a = fresh();
  a.p.complete('explorer', byId('e1-1'));
  a.p.logSession('explorer', ['e1-1'], 30);
  a.p.logSession('explorer', ['e1-2'], 30);
  const text = a.p.exportJSON();

  const b = fresh();
  b.p.importJSON(text);
  b.p.importJSON(text);
  b.p.importJSON(text);
  const k = b.p.kid('explorer');
  assert.deepEqual(k.sessions.length, 2);
  assert.deepEqual(plain(k.sessions).map((s) => s.questIds[0]), ['e1-1', 'e1-2']);
  assert.deepEqual(Object.keys(k.badges).length, 1);
  assert.deepEqual(Object.keys(k.completed).length, 1);
});

test('importJSON brings in a kid the local device has never seen', () => {
  const a = fresh();
  a.p.setKidName('builder', 'Mila');
  a.p.complete('builder', byId('b1-1'));
  const b = fresh();
  b.p.importJSON(a.p.exportJSON());
  assert.deepEqual(b.p.kid('builder').name, 'Mila');
  assert.deepEqual(b.p.kid('builder').track, 'builder');
  assert.deepEqual(b.p.isComplete('builder', 'b1-1'), true);
});

// kid() seeds `name` with the raw id, so a naive `dst.name || src.name` would
// never take the imported name. "Still the raw id" has to count as unset — but
// a name the parent actually typed must survive the import.
test('importJSON adopts the backed-up name over a placeholder, but not over a real one', () => {
  const a = fresh();
  a.p.setKidName('explorer', 'Lucia');
  const text = a.p.exportJSON();

  const placeholder = fresh();
  placeholder.p.kid('explorer');                        // name === 'explorer'
  placeholder.p.importJSON(text);
  assert.deepEqual(placeholder.p.kid('explorer').name, 'Lucia');

  const renamed = fresh();
  renamed.p.setKidName('explorer', 'Lu');
  renamed.p.importJSON(text);
  assert.deepEqual(renamed.p.kid('explorer').name, 'Lu');
});

test('importJSON rejects malformed input with an Error and changes nothing', () => {
  const { p } = fresh();
  p.complete('explorer', byId('e1-1'));
  const before = p.exportJSON();

  // Garbage: JSON.parse's own SyntaxError, which is still an Error the UI can show.
  assert.throws(() => p.importJSON('this is not json at all'), isSyntaxError);
  assert.throws(() => p.importJSON(''), isSyntaxError);
  assert.throws(() => p.importJSON(undefined), isSyntaxError);
  // Valid JSON, wrong shape: the explicit, human-readable message.
  assert.throws(() => p.importJSON('{"version":1,"updated":"2026-01-01"}'), {
    name: 'Error',
    message: 'That file is not a Robot Lab backup.'
  });
  assert.throws(() => p.importJSON('null'), /not a Robot Lab backup/);
  assert.throws(() => p.importJSON(null), /not a Robot Lab backup/);   // JSON.parse(null) -> null
  assert.throws(() => p.importJSON('[]'), /not a Robot Lab backup/);
  assert.throws(() => p.importJSON('"a string"'), /not a Robot Lab backup/);
  assert.throws(() => p.importJSON('42'), /not a Robot Lab backup/);

  assert.deepEqual(p.exportJSON(), before, 'a rejected import leaves the store untouched');
});

/* ── storage resilience ─────────────────────────────────────────────────── */

/**
 * Safari private browsing throws QuotaExceededError from setItem. The app is a
 * static page a kid may well open in a private tab; losing persistence is
 * acceptable, losing the session to a stack trace is not.
 */
test('a localStorage that throws on setItem does not crash the store', () => {
  const { app, p } = fresh({ localStorage: { throwOnSet: true } });
  p.setKidName('explorer', 'Lucia');
  assert.deepEqual(p.complete('explorer', byId('e1-1')), true);
  p.note('explorer', 'e1-1', 'still works');
  p.logSession('explorer', ['e1-1'], 30);

  // Everything still works in memory for the length of the session.
  assert.deepEqual(p.kid('explorer').name, 'Lucia');
  assert.deepEqual(p.stats('explorer', ALL).completed, 1);
  assert.deepEqual(p.nextQuest('explorer', ALL).id, 'e1-2');
  assert.deepEqual(p.exportJSON().includes('first-hello'), true, 'export is the escape hatch');
  assert.deepEqual(app.__warnings.some((w) => w.includes('could not save progress')), true);
  assert.deepEqual(app.__errors.length, 0);
});

test('a localStorage that throws on getItem still yields a usable blank store', () => {
  const { app, p } = fresh({ localStorage: { throwOnGet: true } });
  assert.deepEqual(plain(p.data.kids), {});
  assert.deepEqual(p.complete('explorer', byId('e1-1')), true);
  assert.deepEqual(app.__warnings.some((w) => w.includes('progress unreadable')), true);
});

test('no localStorage at all (a locked-down browser) still yields a working store', () => {
  const { p } = fresh({ localStorage: false });
  assert.deepEqual(plain(p.data.kids), {});
  assert.deepEqual(p.complete('explorer', byId('e1-1')), true);
  assert.deepEqual(p.stats('explorer', ALL).completed, 1);
});

test('corrupt stored data falls back to a blank store rather than throwing', () => {
  const cases = [
    'not json at all',
    '{"version":1,"kids":',            // truncated write
    'null',
    '{"version":1}',                   // no kids
    '[]',
    '""'
  ];
  for (const raw of cases) {
    const { p } = fresh({ localStorage: { seed: { [KEY]: raw } } });
    assert.deepEqual(plain(p.data.kids), {}, 'blank store for ' + JSON.stringify(raw));
    assert.deepEqual(p.data.version, 1);
    assert.deepEqual(p.data.updated, TODAY);
    // And it is immediately usable.
    assert.deepEqual(p.complete('explorer', byId('e1-1')), true);
  }
});

test('a well-formed store is read back, not discarded', () => {
  const a = fresh();
  a.p.complete('explorer', byId('e1-1'));
  const raw = a.app.localStorage.getItem(KEY);

  const b = fresh({ localStorage: { seed: { [KEY]: raw } } });
  assert.deepEqual(b.p.isComplete('explorer', 'e1-1'), true);
  assert.deepEqual(b.p.kid('explorer').badges['first-hello'].title, 'First Hello');
});

/* ── listeners and reset ───────────────────────────────────────────────── */

test('onChange listeners fire on every save, and one that throws does not stop the others', () => {
  const { p } = fresh();
  const seen = [];
  p.onChange(() => { throw new Error('a broken widget'); });
  p.onChange((d) => seen.push(Object.keys(d.kids).length));
  p.complete('explorer', byId('e1-1'));
  assert.deepEqual(seen, [1, 1], 'once for the kid() auto-create, once for the completion');
});

test('reset(kidId) clears one kid; reset() clears everything', () => {
  const { p } = fresh();
  p.complete('explorer', byId('e1-1'));
  p.complete('builder', byId('b1-1'));

  p.reset('explorer');
  assert.deepEqual(p.data.kids.explorer, undefined);
  assert.deepEqual(p.isComplete('builder', 'b1-1'), true);
  assert.deepEqual(p.kid('explorer').completed['e1-1'], undefined, 'and it comes back blank');

  p.reset();
  assert.deepEqual(plain(p.data.kids), {});
  assert.deepEqual(p.data.version, 1);
});

/* ── a whole season, end to end ─────────────────────────────────────────── */

// The realistic shape of the data after nine Sundays: this is the case the
// parent dashboard renders, so the numbers have to hang together.
test('nine consecutive Sundays produce coherent stats, badges and a live streak', () => {
  const sundays = [
    '2026-05-31', '2026-06-07', '2026-06-14', '2026-06-21', '2026-06-28',
    '2026-07-05', '2026-07-12', '2026-07-19', '2026-07-26'
  ];
  const { app, p } = fresh({ now: sundays[0] + 'T12:00:00' });
  sundays.forEach((day, i) => {
    repin(app, day + 'T12:00:00');
    p.complete('explorer', EXPLORER[i]);
    p.logSession('explorer', [EXPLORER[i].id], 30);
  });

  const s = p.stats('explorer', ALL);
  assert.deepEqual(s.completed, 9);
  assert.deepEqual(s.total, 36);
  assert.deepEqual(s.badges, 9);
  assert.deepEqual(s.streakWeeks, 9);
  assert.deepEqual(plain(s.seasons[1]), { total: 6, done: 6 });
  assert.deepEqual(plain(s.seasons[2]), { total: 6, done: 3 });
  assert.deepEqual(p.nextQuest('explorer', ALL).id, EXPLORER[9].id);
  assert.deepEqual(p.kid('explorer').completed[EXPLORER[0].id], '2026-05-31');
  assert.deepEqual(p.kid('explorer').sessions.length, 9);

  const tally = p.strandTally('explorer', EXPLORER);
  const earned = Object.keys(tally).reduce((n, k) => n + tally[k].earned, 0);
  assert.deepEqual(earned, 9, 'every badge lands in exactly one strand');
});

/* ── regression guards for two bugs already fixed ───────────────────────── */

/**
 * BUG 1 (reachy.js toWire): `Number(duration) || 1.0` treated an explicit 0 as
 * "no duration given" and silently turned an instant move into a one-second
 * one. An explicit 0 must clamp to the 0.1s floor; only a genuinely absent or
 * unparseable duration may default to 1.0.
 */
test('regression: duration 0 clamps to the 0.1s floor and does not become 1.0', () => {
  const { RobotLink } = loadApp(SCRIPTS.reachy, {});
  const zero = { head: { x: 0, y: 0, z: 0, roll: 0, pitch: 0, yaw: 0 }, antennas: [0, 0], bodyYaw: 0 };

  assert.deepEqual(RobotLink.toWire(zero, 0).duration, 0.1);
  assert.deepEqual(RobotLink.toWire(zero, '0').duration, 0.1);
  assert.deepEqual(RobotLink.toWire(zero, 0.05).duration, 0.1);

  assert.deepEqual(RobotLink.toWire(zero, undefined).duration, 1.0);
  assert.deepEqual(RobotLink.toWire(zero, null).duration, 1.0);
  assert.deepEqual(RobotLink.toWire(zero, NaN).duration, 1.0);
  assert.deepEqual(RobotLink.toWire(zero, '').duration, 1.0);
  assert.deepEqual(RobotLink.toWire(zero, 'quickly').duration, 1.0);

  assert.deepEqual(RobotLink.toWire(zero, 2.5).duration, 2.5);
  // While we are here: the wire is radians and metres, converted at the edge.
  const w = RobotLink.toWire(
    { head: { x: 10, y: 0, z: 0, roll: 0, pitch: 30, yaw: 0 }, antennas: [90, -90], bodyYaw: 0 },
    0.6
  );
  assert.deepEqual(w.head_pose.pitch, 0.5235987755982988);
  assert.deepEqual(w.head_pose.x, 0.01);
  assert.deepEqual(w.antennas[0], 1.5707963267948966);
});

/**
 * BUG 2 (quest-ui.js): the "activity reached its goal" callback referenced the
 * finish button before it existed, so an activity that signalled completion
 * synchronously during render threw a ReferenceError and the quest never drew.
 * The fix has two halves and both must stay: the signal null-guards the
 * callback, and the callback is installed AFTER `finish` exists, then replayed
 * for a goal already reached. Asserted on the source because the alternative is
 * a full DOM for a 44 KB render function.
 */
test('regression: the quest-ui completion callback is installed after the finish button', () => {
  const src = readSource('assets/js/quest-ui.js');
  const declared = src.indexOf('var reached = false, reachedFull = false, onReached = null;');
  const guarded = src.indexOf('if (onReached) onReached(reachedFull);');
  const finishBtn = src.indexOf("var finish = el('button'");
  const installed = src.indexOf('onReached = function (full)');
  const replayed = src.indexOf('if (reached) onReached(reachedFull);');

  assert.ok(declared >= 0, 'the reached/onReached state must be declared up front');
  assert.ok(guarded > declared, 'a synchronous signal must find onReached null-guarded');
  assert.ok(finishBtn > 0 && installed > finishBtn,
    'onReached must be assigned only after `finish` is created');
  assert.ok(replayed > installed,
    'a goal already reached must be replayed once the callback exists');
});
