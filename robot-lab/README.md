# Robot Lab

A robotics curriculum for two sisters (4 and 8) and one Reachy Mini. Zero build step —
it is HTML, CSS and vanilla JavaScript that talks straight to the robot.

## Start a session

```bash
./serve.sh
```

That prints two URLs and the robot's status:

```
  On this Mac:   http://localhost:4200
  On the iPad:   http://192.168.1.172:4200
  Robot:         found at 192.168.1.15 (daemon 1.6.3, backend: running)
```

Open the iPad URL in Safari. Add it to the home screen and it launches like an app.

There is no `npm install`, no `pip install`, no backend to start. `serve.sh` is just
`python3 -m http.server` — any static server works.

## Why it must be `http://`

The robot's API is HTTP-only. A page served over `https://` is forbidden by the browser from
making requests to an insecure origin, so Robot Lab is served over plain `http://` on the LAN.
This is also why it cannot be hosted on GitHub Pages and still drive the robot.

## How it talks to the robot

The Reachy Mini Wireless runs its own daemon on port 8000, and it answers cross-origin requests
with `access-control-allow-origin: *`. That single header is why this app has no backend: the
browser is a first-class robot client.

```
POST /api/move/goto                      head pose, antennas, body yaw, duration, interpolation
POST /api/move/set_target                instant target, for realtime control
POST /api/move/play/wake_up | goto_sleep
POST /api/move/play/recorded-move-dataset/{dataset}/{move}    81 recorded emotions
POST /api/motors/set_mode/{enabled|disabled|gravity_compensation}
POST /api/volume/set
GET  /api/state/full                     live pose, antennas, control mode, direction of arrival
GET  /api/daemon/status                  is the motor backend running?
```

Full interactive docs are on the robot itself at `http://reachy-mini.local:8000/docs`.

**Units.** The wire uses radians and metres. The app works in degrees and millimetres and
converts at the last possible moment, in `assets/js/reachy.js`.

**Safety.** Every command is clamped before it is sent:

| Axis | Limit |
|---|---|
| Head pitch / roll | ±40° |
| Head yaw | ±180° |
| Body yaw | ±160° |
| Head yaw − body yaw | ≤65° |
| Head x / y / z | ±25 mm |
| Antennas | ±150° |

That last one is a *coupled* limit — each axis can be individually legal while the pair is not,
because of cable routing. Clamping happens client-side so the on-screen robot and the real one
always agree; the daemon clamps again on arrival.

## No robot? Still works.

If he is charging, asleep, or on another network, `RobotLink` reports `simulated` and every
command drives the on-screen robot instead. Nothing errors and no quest blocks. A session with a
4-year-old must never dead-end on a connection problem.

Tap the chip in the top right to retry the connection at any time.

## The curriculum

**6 seasons × 6 quests × 2 tracks = 72 quests.** One quest per kid per week is about nine
months. Both girls work the *same season* at different depths, so they are in the same world on
the same weekend and can compare notes.

| Season | Theme |
|---|---|
| 1 | Hello, Robot — cause and effect; a computer with an address |
| 2 | Body & Motion — degrees of freedom, the Stewart platform, motion curves |
| 3 | Senses — camera, microphones, IMU, sensor fusion |
| 4 | Sound & Speech — waves, sampling, direction of arrival, TTS |
| 5 | Brains & Choices — algorithms, loops, branches, state, real Python |
| 6 | Robots & Us — autonomy, data, bias, work, human-centred design |

Concepts are tagged against [Barefoot Computing](https://www.barefootcomputing.org/)'s six
concepts and five approaches, and the structure follows Marina Bers' *Coding as Another Language*
idea that coding is expressive literacy rather than vocational training — which is why the age-4
track is about making the robot *say something* and never about syntax.

Every quest carries:

- `bigIdea` — one sentence for Dad
- `sayThis` — a literal script. The highest-value field in the whole dataset.
- `activity` — what happens on screen
- `unplugged` — the off-screen half, which is the part they remember
- `wonder` — the question you leave her with
- `dadNote` — what *you* learn from it

## Progress

Badges land in six strands — Motion, Senses, Sequences, Logic, Making, Kindness — so progress is
visible in more than one dimension.

Progress lives in `localStorage`, which means **clearing Safari's website data erases it.**
Export from the Dad page every few weeks. Import merges rather than replaces, so a backup taken
on the Mac will not wipe progress earned on the iPad.

## Layout

```
robot-lab/
├── index.html              launcher — pick a track, see this week
├── explorer/index.html     Little Explorer (4–6)
├── builder/index.html      Young Builder (7–10)
├── parent/index.html       scripts, progress, badges, direct robot control, backup
├── serve.sh                one-command LAN server on :4200
└── assets/
    ├── css/lab.css
    ├── js/
    │   ├── reachy.js       RobotLink — REST client, safety clamps, sim fallback
    │   ├── sim.js          on-screen SVG robot, mirrors every command
    │   ├── speak.js        Web Speech, for the pre-reader
    │   ├── progress.js     milestones, strands, export/import
    │   ├── actions.js      the tiny action language the quests are written in
    │   ├── quest-ui.js     renders all eight activity kinds
    │   ├── track.js        the page both kids use
    │   └── lab.js          shared shell, top bar, toasts
    └── data/
        ├── curriculum.js       seasons, tracks, concept tags
        ├── quests-explorer.js  36 quests, ages 4–6
        ├── quests-builder.js   36 quests, ages 7–10
        └── emotions.js         all 81 recorded moves, labelled and intensity-banded
```

## Adding a quest

Append an object to `quests-explorer.js` or `quests-builder.js`. Nothing else needs to change —
seasons, badges, strand tallies and the "next up" card all derive from the data.

Actions are strings, interpreted by `actions.js`:

```js
{ emoji: '🌀', label: 'Spin', do: 'gesture:spin' }
{ emoji: '😊', label: 'Happy', do: 'emotion:cheerful1' }
{ emoji: '⬆️', label: 'Look up', do: 'pose:pitch=-30&z=12&duration=0.9' }
{ emoji: '💬', label: 'Talk', do: 'say:Hello there!|pitch=1.4' }
```

Verbs: `wake` `sleep` `stop` `center` `gesture:` `emotion:` `pose:` `motors:` `volume:` `say:`
`wait:` `burst:` `repeat:`. Pipe-separate to chain them.

## Tests

**227 tests, zero dependencies, ~2 seconds.** Node's built-in runner; nothing touches the network
or the robot.

```bash
node --test
```

| Suite | Covers |
|---|---|
| `test/reachy.test.mjs` | The safety envelope — every limit at, inside and beyond, both signs, plus the coupled head/body-yaw constraint and unit conversion |
| `test/actions.test.mjs` | The action DSL: parsing, ordering, `repeat:` expansion, and speech |
| `test/progress.test.mjs` | Idempotent completion, streak/cadence maths, export/import merge, a `localStorage` that throws |
| `test/curriculum.test.mjs` | Data integrity — fails loudly if a malformed quest is added |
| `test/integration.test.mjs` | The seams, including a sweep of **every action string in all 72 quests** |

The suite is mutation-tested: widening the pitch limit fails 6 tests, dropping the coupled yaw
constraint fails 8, and putting a strong-intensity emotion in an age-4 quest fails 2.

`test/harness.mjs` loads the app's classic `<script>` files into a `node:vm` sandbox with a stubbed
`fetch`, a stubbed `localStorage`, and a pinnable `Date` — that is how a no-build app gets tested
without inventing a build.

**The hardware smoke test is separate and opt-in**, because it moves a real robot:

```bash
node tools/live-robot.mjs
```

18 checks, including asserting the CORS headers *directly* — Node's `fetch` does not enforce CORS,
so a test that merely succeeded would pass even if every browser client were broken.

`docs/specs/001-robot-lab.md` in the repo root holds the design and the acceptance criteria.
