# robo-kids — Project Conventions

## Overview
Family robotics education project: teaching two sisters (ages 4 and 8) robotics with a Reachy Mini.

**`robot-lab/` is the app.** Zero-build static site — 72 quests, 6 seasons, 2 age tracks, driving
the real robot from the browser. `roboquest/` and `robo-curriculum/` are earlier explorations,
superseded and unmaintained; do not add features to them.

## Verified robot facts — do not re-derive these

Reachy Mini **Wireless**, daemon **v1.6.3**, on WiFi as `reachy-mini.local` (was `192.168.1.15`).
All of the below was confirmed against the physical robot.

**The daemon is the backend.** It serves a FastAPI REST API on port 8000 and answers cross-origin
requests with `access-control-allow-origin: *`. A static HTML page can therefore drive the robot
directly — **no bridge process, no Python on the client, no build step.** Do not reintroduce a
proxy server; it is not needed.

```
GET  /api/daemon/status      state is "stopped" until the motor backend is started
POST /api/daemon/start?wake_up=false     the wake_up query param is REQUIRED (omitting it 422s)
POST /api/move/goto          GotoModelRequest: head_pose{x,y,z,roll,pitch,yaw}, antennas[2],
                             body_yaw, duration, interpolation
POST /api/move/set_target    FullBodyTarget — realtime, no interpolation
POST /api/move/play/wake_up | /api/move/play/goto_sleep
POST /api/move/play/recorded-move-dataset/{dataset}/{move}
GET  /api/move/recorded-move-datasets/list/{dataset}
POST /api/motors/set_mode/{enabled|disabled|gravity_compensation}
POST /api/media/play_sound | /api/volume/set
GET  /api/state/full | /present_head_pose | /present_body_yaw | /api/state/doa
GET  /api/camera/specs | /api/kinematics/info | /api/kinematics/urdf
```

Interactive docs live on the robot: `http://reachy-mini.local:8000/docs`.

- **Units on the wire: radians and metres.** The app works in degrees and millimetres and converts
  at the last moment, in `robot-lab/assets/js/reachy.js`.
- **Emotions:** 81 recorded moves in the HF dataset `pollen-robotics/reachy-mini-emotions-library`.
  The dataset name must be URL-encoded in the path (the `/` becomes `%2F`).
- **Interpolation:** `linear`, `minjerk` (default), `ease_in_out`, `cartoon`. Use `cartoon` for
  kids — it overshoots and reads as alive.
- **Latency:** 27–100 ms per command over WiFi. Control loop runs at ~50 Hz, so `set_target`
  faster than that gains nothing.
- Camera is **mono** (no stereo depth), up to 3840×2592. Mic array gives azimuth only — front/back
  is ambiguous, and elevation is not available.

### Safety limits — clamp before sending

| Axis | Limit |
|---|---|
| Head pitch / roll | ±40° |
| Head yaw | ±180° |
| Body yaw | ±160° |
| **Head yaw − body yaw** | **≤65°** (coupled — each axis can be legal while the pair is not) |
| Head x / y / z | ±25 mm (conservative) |
| Antennas | ±150° |

`RobotLink.clampPose()` enforces all of these client-side so the simulator and the real robot
agree. The daemon clamps again on arrival. Never send unclamped user input.

## Critical constraints
- **Never dead-end on a missing robot.** If he is charging or offline, `RobotLink` reports
  `simulated` and drives the on-screen robot. Every quest must still complete. A session with a
  4-year-old cannot end in an error state.
- **Age-appropriate:** age 4 needs no reading (emoji + speech synthesis, ≥48px targets — the tiles
  are 168px); age 8 gets real numbers, real vocabulary, and real Python.
- **Session length:** 30 min (age 4), 60 min (age 8), and roughly half of each is off-screen.
- **Shared seasons.** Both tracks work the same season theme at the same time, at different rungs.
  Keep it that way — it is what makes the two girls able to talk to each other about it.

## Tech guidelines
- `robot-lab/` is **vanilla JS, no build step, no dependencies.** Keep it that way; a Sunday
  morning should not require `npm install`. Classic `<script>` tags, not ES modules.
- Quests are **data** (`assets/data/quests-*.js`), written in the action-string DSL interpreted by
  `assets/js/actions.js`. Adding a quest should not require touching rendering code.
- `innerHTML` is only used for the static SVG in `sim.js`. All data-driven text uses `textContent`.
- Serve over plain **`http://`** — the robot is HTTP-only, and an `https://` page is blocked from
  talking to it. This is why the app cannot be hosted on GitHub Pages and still drive the robot.
- Speech: tablet Web Speech API, not the robot. The SDK has no TTS. Safari needs a real user
  gesture before it will speak, which `speak.js` handles by queueing.
- Progress lives in `localStorage`; export/import is a first-class feature, not a nicety.

## Port assignments
Check `~/.claude/ports.json` first. Robot Lab uses **4200** (Tier 4). The robot's own daemon owns
8000 on its host.

## Branch strategy
- `issue-{N}-{short-desc}`, PR back to `master`, squash merge.
- Every commit references its issue: `(refs #N)` or `(fixes #N)`.
