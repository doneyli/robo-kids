# Robot Lab — a growing robotics curriculum with live Reachy control

**Issue:** [#7](https://github.com/doneyli/robo-kids/issues/7)
**Status:** shipped — `ca5fa84` (feature) and `f25b2e4` (audit fixes)
**Date:** 2026-07-26

> **Reconciled with what shipped.** Two things changed during implementation and are corrected
> below rather than left to rot: `blocks.js` never existed (the sequence builder is one of eight
> activity kinds inside `quest-ui.js`), and the quests live in `quests-explorer.js` /
> `quests-builder.js` rather than a single `curriculum.js`. Removal of the two superseded
> explorations was declined, so they are archived in place.
>
> Follow-on documents, written after the fact and now the better reference:
> [ADR 0001](../decisions/0001-browser-drives-the-robot-directly.md) (why there is no backend),
> [CURRICULUM.md](../CURRICULUM.md) (duration and the tier plan),
> [AUTHORING.md](../AUTHORING.md), [RUNBOOK.md](../RUNBOOK.md).

## Goal

One zero-build static app, openable on a Mac or an iPad, that drives the real Reachy Mini and
carries two sisters (4 and 8) through a robotics curriculum that keeps growing as they do.

## Why the existing explorations get retired

| Exploration | Why it doesn't survive |
|---|---|
| `robo-curriculum/` (Astro) | Good lesson content, but **zero robot connection**. It's a website about robotics, not a robotics session. |
| `roboquest/` (Next.js + FastAPI) | Needs `npm run dev` *and* a Python WebSocket bridge running on the Mac before a kid can press a button. Ships `mock_reachy.py` — it has never moved the real robot. Two runtimes to babysit on a Sunday morning is one too many. |
| `kids-commander/` (issue #3) | Never built. Superseded. |

Their *content* is worth keeping. Their *architecture* is not.

## The finding that changes the architecture

The Reachy Mini Wireless daemon already is the backend. Verified live against
`192.168.1.15:8000` (daemon v1.6.3, `wireless_version: true`):

```
access-control-allow-origin: *
access-control-allow-methods: DELETE, GET, HEAD, OPTIONS, PATCH, POST, PUT
```

A wide-open CORS policy on the robot means **the browser is a first-class client**. Measured
round-trips of 27–100 ms over WiFi for `POST /api/move/goto`.

Endpoints this app relies on, all confirmed working on the physical robot:

| Endpoint | Use in the curriculum |
|---|---|
| `POST /api/daemon/start` \| `GET /api/daemon/status` | Detect + boot the robot backend from the browser |
| `POST /api/move/play/wake_up` \| `.../goto_sleep` | Start and end every session |
| `POST /api/move/goto` | The workhorse: `head_pose{x,y,z,roll,pitch,yaw}`, `antennas[2]`, `body_yaw`, `duration`, `interpolation` |
| `POST /api/move/set_target` | Realtime/continuous control (joystick-style quests) |
| `POST /api/move/play/recorded-move-dataset/{ds}/{move}` | **81 expressive emotions** from `pollen-robotics/reachy-mini-emotions-library` |
| `GET /api/move/recorded-move-datasets/list/{ds}` | Enumerate those emotions at runtime |
| `GET /api/state/full`, `/present_head_pose`, `/present_body_yaw`, `/present_antenna_joint_positions` | Live telemetry — "look, the robot *knows* where it is" |
| `GET /api/state/doa` | Direction-of-arrival: which way a sound came from |
| `POST /api/motors/set_mode/{enabled\|disabled\|gravity_compensation}` | Hand-guiding for the puppet/record quests |
| `POST /api/media/play_sound`, `POST /api/volume/set` | Sound quests |
| `GET /api/camera/specs`, `/api/kinematics/urdf` | Sensor + kinematics quests |

Interpolation methods available: `linear`, `minjerk`, `ease_in_out`, `cartoon`.
`cartoon` is the one that makes kids laugh — it's the default for the age-4 track.

### Safety limits (clamped client-side before every send)

From the SDK's documented limits — the daemon clamps too, but we clamp first so the on-screen
simulator and the real robot agree, and so a kid dragging a slider can't ask for something silly:

| Axis | Range |
|---|---|
| Head pitch / roll | ±40° |
| Head yaw | ±180° |
| Body yaw | ±160° |
| Head yaw − body yaw | ≤65° |
| Head x / y / z | ±25 mm (conservative) |
| Antennas | ±150° |

## Pedagogical spine

Not invented here. Two established frameworks, so the milestones mean something:

1. **Barefoot Computing** — 6 concepts (logic, evaluation, algorithms, patterns, decomposition,
   abstraction) and 5 approaches (tinkering, creating, debugging, persevering, collaborating).
   Every quest tags the concepts it exercises.
2. **Bers / DevTech "Coding as Another Language"** — coding as expressive literacy rather than
   vocational skill, which is why the age-4 track is about *making the robot say something* and
   never about syntax. Her KIBO work is the reason the unplugged half of each quest is not
   optional filler.

Cross-domain by design, per the goal of "not only robotics." Each quest carries a
`beyondRobotics` hook into math, physics, biology, art, language, or ethics — a Stewart platform
is a genuinely good excuse to talk about triangles, and direction-of-arrival is a good excuse to
talk about why you have two ears.

## Structure

**6 seasons × 6 quests × 2 tracks = 72 quests.** One quest per kid per week ≈ 9 months, and the
seasons deepen rather than repeat, which is what "grows with them" has to mean.

| Season | Theme | Little Explorer (4) learns | Young Builder (8) learns |
|---|---|---|---|
| 1 | Hello, Robot | Cause and effect, robot body parts | Client/server, degrees of freedom, radians |
| 2 | Body & Motion | Big/small, fast/slow, mirroring | Coordinate frames, 6-DOF, interpolation curves |
| 3 | Senses | Eyes/ears, hot/cold, near/far | Cameras as arrays, sampling, sensor fusion |
| 4 | Sound & Speech | Loud/quiet, high/low, listening | Waves, frequency, direction-of-arrival, TTS |
| 5 | Brains & Choices | If-this-then-that, patterns | Loops, conditionals, state, first real Python |
| 6 | Robots & Us | Kindness, helping, imagining | Autonomy, bias, ethics, designing for a person |

Both tracks share the season theme so the sisters are in the same world on the same weekend.

Each quest is a data record, not a hand-written page:

```js
{
  id, season, track, title, emoji,
  bigIdea,          // one sentence, for Dad
  concepts[],       // Barefoot tags
  beyondRobotics,   // the cross-domain hook
  sayThis[],        // literal script — the thing that makes a parent able to teach
  activity,         // {kind: 'buttons'|'sequence'|'dial'|'experiment'|'freeplay', ...}
  unplugged,        // off-screen game for when the robot is charging
  wonder,           // the question you leave them with
  milestone,        // {strand, badge, title}
  dadNote           // what Don learns — he asked to learn too
}
```

## Milestones

Six strands that fill up rather than a linear bar, so progress is visible in more than one
dimension: **Motion, Senses, Sequences, Logic, Making, Kindness**. Badges persist to
`localStorage` per kid, with JSON export/import so nine months of progress isn't hostage to
Safari clearing site data.

## Changes

| File | What changes | Why |
|------|-------------|-----|
| `robot-lab/index.html` | New launcher — pick Explorer / Builder / Parent, shows live robot status | Single entry point |
| `robot-lab/explorer/index.html` | New age-4 track UI | No reading, huge targets, speech |
| `robot-lab/builder/index.html` | New age-8 track UI | Sequence programmer + code peek |
| `robot-lab/parent/index.html` | New parent guide + progress dashboard | Scripts, big ideas, badge management |
| `robot-lab/assets/js/reachy.js` | New `RobotLink` — REST client, safety clamps, sim fallback, autodiscovery | The whole robot layer |
| `robot-lab/assets/js/sim.js` | New on-screen SVG Reachy mirroring every command | Session survives an offline robot |
| `robot-lab/assets/js/speak.js` | New Web Speech wrapper | Age 4 can't read |
| `robot-lab/assets/js/progress.js` | New milestone store | Persistence + export |
| `robot-lab/assets/js/actions.js` | New action-string DSL interpreter | Keeps the 72 quests as pure data |
| `robot-lab/assets/js/quest-ui.js` | New renderer for all 8 activity kinds | One renderer, both tracks |
| `robot-lab/assets/js/track.js` | New shared track-page controller | Quests addressable by URL |
| `robot-lab/assets/js/lab.js` | New shared shell — top bar, toasts, badge modal | Common chrome |
| `robot-lab/assets/data/curriculum.js` | New — seasons, tracks, concept tags, helpers | Structure |
| `robot-lab/assets/data/quests-explorer.js` | New — 36 quests, ages 4–6 | Content as data |
| `robot-lab/assets/data/quests-builder.js` | New — 36 quests, ages 7–10 | Content as data |
| `robot-lab/assets/data/emotions.js` | New — 81 emotions curated + intensity-banded | Usable picker; gates the 20 "strong" ones away from age 4 |
| `robot-lab/test/harness.mjs` | New — loads classic scripts into a `node:vm` sandbox | Testing a no-build app |
| `robot-lab/tools/live-robot.mjs` | New — opt-in hardware smoke test | Outside `test/` so `node --test` never moves a robot |
| `robot-lab/assets/css/lab.css` | New shared styling | Tablet-first |
| `robot-lab/serve.sh` | New one-command LAN server on :4200 | Dad-proof launch |
| `robot-lab/README.md` | New setup + troubleshooting | Sunday-morning reference |
| `roboquest/`, `robo-curriculum/` | Left in place, marked superseded in the README | Removal was declined during implementation, so they are archived rather than deleted. Their best ideas were migrated into the quest data. |
| `README.md` | Rewritten around the one app | Repo no longer "three explorations" |
| `CLAUDE.md` | Updated conventions + verified robot facts | So future sessions don't re-derive the API |

## Acceptance Criteria

- [ ] `robot-lab/serve.sh` starts a static server on `:4200`, reachable from the iPad by LAN IP
- [ ] No build step, no `node_modules`, no Python dependency for the app itself
- [ ] `RobotLink` autodiscovers the robot (`reachy-mini.local`, then last-known IP), reports
      `online | offline | simulated`, and starts the daemon backend if it is `stopped`
- [ ] Every head/body command is clamped to the safety table above *before* the request
- [ ] With the robot unplugged, every quest still completes against the simulator with no error UI
- [ ] Age-4 track: no text required to complete a quest; all targets ≥48 px; instructions spoken
- [ ] Age-8 track: can compose a ≥5-step sequence, run it on the robot, and view the equivalent Python
- [ ] Badges persist across reload; export produces a re-importable JSON file
- [ ] All 72 quests present in `curriculum.js` with every field populated
- [ ] `README.md` points at Robot Lab; the earlier explorations are labelled superseded

## Test Strategy

1. **Robot layer, real hardware.** With Reachy on WiFi: launcher shows `online`; wake, emotion,
   head nod, body turn, sleep all move the physical robot. Confirm by reading
   `GET /api/state/full` back and asserting the pose changed.
2. **Clamping.** Ask for pitch 90° and body_yaw 400°; assert the outgoing payload is ±40° / ±160°
   and that head−body delta ≤65°.
3. **Offline path.** Point `RobotLink` at an unreachable host; assert status is `simulated`, the
   SVG robot still animates, and no quest blocks.
4. **iPad.** Load `http://<mac-ip>:4200` in Safari; verify touch targets, speech playback, and a
   real robot command from the tablet.
5. **Persistence.** Earn a badge, reload, confirm it survives; export, clear storage, re-import.

## Reference Implementations

- Emotion catalogue: live `GET /api/move/recorded-move-datasets/list/pollen-robotics%2Freachy-mini-emotions-library`
- Request shapes: `GET http://reachy-mini.local:8000/openapi.json` (`GotoModelRequest`, `FullBodyTarget`, `XYZRPYPose`)
- Interactive daemon docs: `http://reachy-mini.local:8000/docs`
- Content worth migrating: `roboquest/src/lib/missions.ts` (badge/unplugged pattern),
  `robo-curriculum/src/pages/{little-explorers,young-builders}/week-*.astro` (lesson structure)
