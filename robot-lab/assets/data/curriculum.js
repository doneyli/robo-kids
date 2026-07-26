/* ============================================================================
 * curriculum.js — the spine
 *
 * Six seasons, two tracks, six quests each. The sisters work the SAME season at
 * the same time at different rungs, so on any given weekend they are both in
 * "Senses" and can argue about it at dinner. That shared theme is the point —
 * a 4-year-old and an 8-year-old on unrelated tracks don't bond, they take
 * turns being bored.
 *
 * Quests are data, not pages. Every field earns its place:
 *   bigIdea        one sentence Dad can hold in his head
 *   concepts       Barefoot Computing tags, so milestones mean something
 *   beyondRobotics the hook out into maths, physics, biology, art or ethics
 *   sayThis        literal script — the single highest-value field in here
 *   activity       what happens on screen
 *   unplugged      the version that works when the robot is charging
 *   wonder         the question you leave her with until next week
 *   dadNote        what Don learns; he asked to learn too
 * ==========================================================================*/

(function (global) {
  'use strict';

  var SEASONS = [
    {
      n: 1, id: 'hello', title: 'Hello, Robot', emoji: '👋',
      hue: 28,
      theme: 'A machine can listen to us, and we can listen back.',
      explorerFocus: 'Cause and effect. Press a thing, a thing happens.',
      builderFocus: 'There is a computer in there with an address, and you can talk to it.'
    },
    {
      n: 2, id: 'motion', title: 'Body & Motion', emoji: '🦿',
      hue: 265,
      theme: 'Moving is harder than it looks, and that is why it is interesting.',
      explorerFocus: 'Big and small, fast and slow, and the names of his parts.',
      builderFocus: 'Six numbers describe any pose. Six little legs make it happen.'
    },
    {
      n: 3, id: 'senses', title: 'Senses', emoji: '👁️',
      hue: 168,
      theme: 'A robot only knows what its sensors tell it.',
      explorerFocus: 'He has eyes and ears. What can he notice?',
      builderFocus: 'Pixels, samples, and the gap between measuring and knowing.'
    },
    {
      n: 4, id: 'sound', title: 'Sound & Speech', emoji: '🔊',
      hue: 336,
      theme: 'Sound is a wave, and a voice is a wave with meaning in it.',
      explorerFocus: 'Loud and quiet, high and low, and taking turns.',
      builderFocus: 'Frequency, sampling, and how two ears find a direction.'
    },
    {
      n: 5, id: 'brains', title: 'Brains & Choices', emoji: '🧠',
      hue: 212,
      theme: 'A program is a plan written down carefully enough for a machine.',
      explorerFocus: 'First this, then that. Do it again. If this, then that.',
      builderFocus: 'Algorithms, loops, branches, state — and real Python.'
    },
    {
      n: 6, id: 'us', title: 'Robots & Us', emoji: '💛',
      hue: 44,
      theme: 'The hard questions about robots are questions about people.',
      explorerFocus: 'Being kind, helping, and imagining a robot of your own.',
      builderFocus: 'Autonomy, data, bias, work, and designing for a real person.'
    }
  ];

  var TRACKS = {
    explorer: {
      id: 'explorer', label: 'Little Explorer', emoji: '🌟', ages: '4–6',
      minutes: 30, colour: '#ff8a3d',
      blurb: 'No reading needed. Big buttons, spoken instructions, instant robot.'
    },
    builder: {
      id: 'builder', label: 'Young Builder', emoji: '🛠️', ages: '7–10',
      minutes: 60, colour: '#4c7dff',
      blurb: 'Build sequences, read the numbers, peek at the real code.'
    }
  };

  // Barefoot Computing: 6 concepts, 5 approaches. Quests tag themselves so the
  // parent dashboard can show what is actually being exercised.
  var CONCEPTS = {
    logic: 'Logic — predicting and explaining',
    evaluation: 'Evaluation — is this good enough?',
    algorithms: 'Algorithms — steps in an order',
    patterns: 'Patterns — spotting what repeats',
    decomposition: 'Decomposition — breaking it up',
    abstraction: 'Abstraction — hiding the boring detail',
    tinkering: 'Tinkering — poking at it to see',
    creating: 'Creating — making something new',
    debugging: 'Debugging — finding the mistake',
    persevering: 'Persevering — sticking with it',
    collaborating: 'Collaborating — doing it together'
  };

  function build() {
    var all = []
      .concat(global.ROBOT_LAB_QUESTS_EXPLORER || [])
      .concat(global.ROBOT_LAB_QUESTS_BUILDER || []);

    // Stable curriculum order: season, then the order authored within it.
    all.forEach(function (q, i) { q._i = i; });
    all.sort(function (a, b) { return (a.season - b.season) || (a._i - b._i); });
    all.forEach(function (q) { delete q._i; });
    return all;
  }

  var API = {
    SEASONS: SEASONS,
    TRACKS: TRACKS,
    CONCEPTS: CONCEPTS,
    all: build,
    season: function (n) {
      return SEASONS.filter(function (s) { return s.n === Number(n); })[0] || null;
    },
    track: function (t) {
      return build().filter(function (q) { return q.track === t; });
    },
    inSeason: function (t, n) {
      return build().filter(function (q) { return q.track === t && q.season === Number(n); });
    },
    get: function (id) {
      return build().filter(function (q) { return q.id === id; })[0] || null;
    },
    /** Quest after this one, same track. */
    next: function (id) {
      var list = build();
      var q = API.get(id);
      if (!q) return null;
      var mine = list.filter(function (x) { return x.track === q.track; });
      var i = mine.findIndex(function (x) { return x.id === id; });
      return i >= 0 ? (mine[i + 1] || null) : null;
    },
    /** The matching quest on the other track — what her sister is doing. */
    sibling: function (id) {
      var q = API.get(id);
      if (!q) return null;
      var other = q.track === 'explorer' ? 'builder' : 'explorer';
      var mine = API.inSeason(q.track, q.season);
      var theirs = API.inSeason(other, q.season);
      var i = mine.findIndex(function (x) { return x.id === id; });
      return theirs[i] || null;
    }
  };

  global.CURRICULUM = API;
})(typeof window !== 'undefined' ? window : globalThis);
