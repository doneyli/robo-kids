# Authoring quests

Everything a session does is **data**. Adding a quest means appending an object to
`robot-lab/assets/data/quests-explorer.js` (ages 4–6) or `quests-builder.js` (ages 7–10). Nothing
else has to change — seasons, badges, strand tallies, the "next up" card, the cross-track sibling
link and the parent dashboard all derive from the data.

Run `node --test` afterwards. The integrity suite will tell you if you got the shape wrong.

## The shape

```js
Q.push({
  id: 'e3-2',                    // <track-initial><season>-<n>, unique across ALL quests
  track: 'explorer',             // 'explorer' | 'builder'
  season: 3,                     // 1..6
  title: 'Peek-a-boo',
  emoji: '🫣',                   // also becomes the badge face

  bigIdea: 'He can find a face in what he sees, and follow it.',
  concepts: ['patterns', 'logic'],       // keys of CURRICULUM.CONCEPTS (Barefoot)
  beyondRobotics: 'Pattern recognition — why we see faces in cars and clouds.',

  sayThis: [                     // the highest-value field. Literal words, in order.
    'He is going to look for your face. Move slowly.',
    'Now hide. Where did he look?',
    'What makes a face look like a face?'
  ],

  activity: { /* see the eight kinds below */ },

  unplugged: {
    title: 'Face or not a face?',
    minutes: 10,
    how: 'Hunt the house for things that look like faces — plug sockets, car fronts, a colander...'
  },

  wonder: 'Would he think a drawing of a face is a real face?',

  milestone: {
    strand: 'senses',            // motion | senses | sequences | logic | making | kindness
    badge: 'peek-a-boo',         // unique across ALL quests
    title: 'Peek-a-boo'
  },

  dadNote: 'start_head_tracking() runs detection on the robot itself and aims at the nose...'
});
```

Every field is required and the integrity suite enforces it. Two rules that are easy to trip on:

- **`badge` must be globally unique**, not just unique within the track. Two quests sharing a badge
  id means earning one silently awards the other.
- **Each `(track, season)` pair must have exactly 6 quests**, because the cross-track sibling link
  pairs them positionally — quest 3 of Explorer Season 3 points at quest 3 of Builder Season 3.

## The action language

Actions are strings, parsed by `assets/js/actions.js`. Keeping them as strings is what lets the
curriculum stay pure data.

```
action  := segment ( "|" segment )*
segment := verb ":" payload | params
params  := key "=" value ( "&" key "=" value )*
```

A bare `params` segment attaches to the verb before it, which is how `say:` can contain punctuation
without the parser getting confused.

| Verb | Payload | Notes |
|---|---|---|
| `wake` | — | `POST /api/move/play/wake_up`, waits 1.4 s |
| `sleep` | — | waits 1.6 s |
| `stop` | — | cancels running moves |
| `center` | — | back to rest |
| `gesture:` | `nod` `shake` `wiggle` `spin` `lookLeft` `lookRight` `lookUp` `lookDown` `center` `curious` `happy` `laugh` `dance` `sad` `surprised` `proud` `sleepy` `yes` `no` | composed gestures from `RobotLink.gestures()` |
| `emotion:` | one of 81 names | e.g. `cheerful1`. Must exist on the robot. Waits 2.2 s. |
| `pose:` | `x y z roll pitch yaw bodyYaw antennas duration interpolation` | degrees and mm; `antennas=70,-70`; default interpolation `cartoon` |
| `motors:` | `enabled` `disabled` `gravity_compensation` | `gravity_compensation` is hand-guiding |
| `volume:` | `0`–`100` | |
| `say:` | any text | **tablet** speech, not the robot. Optional `\|pitch=1.4&rate=0.8` |
| `wait:` | milliseconds | |
| `burst:` | `yaw` or `antennas` | rapid `set_target` chain, to contrast with `goto` |
| `repeat:` | `n` | **must be followed by `\|` and something to repeat.** A bare `repeat:3` is skipped. Capped at 20. |

```js
do: 'gesture:spin'
do: 'emotion:cheerful1'
do: 'pose:pitch=-30&z=12&duration=0.9'
do: 'say:Hello there!|pitch=1.4'
do: 'volume:25|say:Quiet and low|pitch=0.5'      // chained
do: 'repeat:3|gesture:nod'                        // nod three times
```

**Emotion safety.** `emotions.js` bands every emotion as `gentle` or `strong`. The twenty `strong`
ones (`rage1`, `furious1`, `dying1`, `contempt1`, `disgusted1`, …) are for discussing emotion with
an 8-year-old, **not** for a preschooler's button grid. A test asserts no Explorer quest references
one; if you add a strong emotion to an Explorer quest, the suite fails. That is deliberate.

## The eight activity kinds

Each maps to a builder in `assets/js/quest-ui.js`.

### `buttons` — the age-4 workhorse
```js
activity: {
  kind: 'buttons', taps: 3, prompt: 'Press the sun to wake him up!',
  items: [ { emoji: '☀️', label: 'Wake up!', do: 'wake' }, /* ...max 6 */ ]
}
```
`taps` is how many presses complete it. Tiles render at ~168 px. Never more than six.

### `sequence` — build an ordered plan, then run it
```js
activity: {
  kind: 'sequence', minSteps: 3, prompt: 'Put bedtime in the right order!',
  broken: [ /* optional: pre-fill in the WRONG order, for debugging quests */ ],
  palette: [ { emoji: '🌙', label: 'Sleep', do: 'sleep' }, /* ... */ ]
}
```
Tap a palette tile to append; tap a step to remove it. `broken` is what makes a debugging quest.

### `dial` — sliders with real numbers (age 8)
```js
activity: {
  kind: 'dial', prompt: 'Move one number at a time.',
  axes: ['x','y','z','roll','pitch','yaw','bodyYaw'],
  showWire: true,        // live JSON of the outgoing request
  showClamp: true,       // highlight readouts the clamp had to change
  allowOverdrive: true,  // let her ASK for beyond-limit values, so the clamp is visible
  isolate: true,         // zero the other axes — one rotation at a time
  showRods: true,        // illustrative six-rod display (labelled as a sketch, not real IK)
  log: true,             // "record this edge" button, for workspace mapping
  emphasise: 'radians'
}
```

### `experiment` — guided steps plus an observation
```js
activity: {
  kind: 'experiment', prompt: 'Compare goto and set_target.',
  steps: [ { text: 'Smooth goto over 2 seconds', emoji: '🌊', do: 'pose:yaw=40&duration=2.0' } ],
  listen: true,          // adds speech recognition, where the browser supports it
  observe: 'Which one looked more alive, and why?'
}
```
A step with no `do` is a hands-on instruction — tapping it just marks it done.

### `telemetry` — read what the robot actually reports
```js
activity: {
  kind: 'telemetry', prompt: 'Command a pose, then read what he actually did.',
  watch: ['status','head','bodyYaw','antennas','controlMode','doa'],
  live: true,            // 500 ms polling toggle
  compare: true,         // show asked-vs-measured error
  probes: [ { label: 'Who are you?', endpoint: '/api/daemon/status', explain: '...' } ]
}
```
A probe has either an `endpoint` (GET, pretty-printed) or a `do` (runs an action).

### `code` — real Python
```js
activity: {
  kind: 'code', prompt: 'The same dance, twice as short.', lang: 'python',
  source: [ 'from reachy_mini import ReachyMini', /* ... */ ].join('\n'),
  explain: 'range(8) means do this eight times...',
  fixed: '...',          // optional: adds Broken/Fixed tabs for debugging quests
  buggy: true,
  editable: true,        // adds a copy button + run instructions
  setup: ['uv venv reachy_env --python 3.12', /* ... */ ],
  run: [ { label: 'Preview it here', do: 'repeat:3|pose:bodyYaw=30&duration=0.6' } ]
}
```
Write source as an array of lines joined with `\n` — it diffs far better than a template literal.

### `freeplay` — open palette, records what she did
```js
activity: { kind: 'freeplay', minutes: 12, prompt: 'Build your own dance!', palette: [ /* ... */ ] }
```
Everything tapped is remembered in order and can be replayed as a whole.

### `offline` — no robot, no screen
```js
activity: { kind: 'offline', prompt: 'Time to draw!', checklist: ['Give it a name', /* ... */ ] }
```

## Hard constraints on what an activity can do

The first two are not obvious and have already caught out design work:

- **No browser-side camera capture.** `getUserMedia` requires a secure context, and this app must be
  served over plain `http://` because the daemon has no HTTPS (see
  [ADR 0001](decisions/0001-browser-drives-the-robot-directly.md)). So a capture activity works only
  from `localhost` on the Mac, never from the iPad's LAN URL. Anything that needs frames has to move
  to Python. This is exactly why the Season 3 sensor quests reason *about* the camera through
  `/api/camera/specs` rather than showing its feed.
- **No robot video feed remotely either.** The daemon streams over WebRTC, which needs GStreamer on
  the client and is Linux-only for remote clients today.
- **No arms, no gripper, no mobility** — a standing prohibition at every tier. Any activity premised
  on the robot picking something up, navigating a room, or manipulating an object is out of scope.
  Sanctioned cheap additions: a printed checkerboard (free), a $30 webcam, a micro:bit, a Pi.
- **Speech comes out of the tablet, not the robot.** The SDK has no text-to-speech. `say:` uses the
  Web Speech API, and iOS will not speak until a real user gesture has happened.

## Adding a season or a tier

`CURRICULUM.SEASONS` in `assets/data/curriculum.js` defines the six themes. The six-season shape is
assumed by the season strip and the parent dashboard, but not hard-coded — both iterate the array.
Adding season 7 works; adding a *tier* (a third track) needs an entry in `CURRICULUM.TRACKS` plus a
page under `robot-lab/<track>/` modelled on `builder/index.html`. See
`docs/decisions/0002-tier-progression.md` for the intended long-horizon shape.

## Style notes that matter for this audience

- **Age 4 cannot read.** Labels are a crutch for the parent; the emoji and the spoken line carry
  the meaning. Keep `sayThis` lines short enough to say out loud without stumbling.
- **Age 8 likes real words.** Use `yaw`, `radian`, `interpolation`. Do not baby-talk the vocabulary.
- **The unplugged half is not filler.** It is the part they remember. If you cannot think of a good
  one, the quest is not ready.
- **`wonder` should not have a clean answer.** It is what she chews on until next week.
- **`dadNote` should teach the parent something he did not know.** That is the field that keeps him
  interested nine months in.
