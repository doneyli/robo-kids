# ADR 0001 — The browser drives the robot directly

**Status:** accepted · **Date:** 2026-07-26 · **Supersedes:** the `roboquest/` bridge architecture

## Context

The goal is interactive robotics experiences a 4-year-old and an 8-year-old can open on an iPad,
driving a real Reachy Mini Wireless, with a parent who has about two hours a week and no appetite
for babysitting build tooling on a Sunday morning.

The obvious architecture — and the one `roboquest/` used — is a web UI plus a local Python process
that holds the `reachy_mini` SDK and relays commands over WebSocket:

```
iPad (Safari) ──ws──▶ Mac (FastAPI + reachy_mini SDK) ──▶ Reachy Mini
```

That is two runtimes to start (`npm run dev` and `uvicorn`) before a child can press a button, and
it puts the Mac on the critical path for every command.

## The finding

**The robot's own daemon is already the backend, and it permits cross-origin browser access.**

The Reachy Mini Wireless runs a FastAPI daemon on port 8000 which serves both a dashboard and a
complete REST control API. Crucially, it answers with:

```
access-control-allow-origin: *
access-control-allow-methods: DELETE, GET, HEAD, OPTIONS, PATCH, POST, PUT
access-control-max-age: 600
```

A wildcard ACAO on the preflight means a browser will let arbitrary origins both *send* requests
and *read* the responses. So:

```
iPad (Safari) ──http/fetch──▶ Reachy Mini :8000
```

No relay. No SDK on the client. No Node, no Python, no build step, no `node_modules`.

## Decision

Robot Lab is a **static site**. `assets/js/reachy.js` (`RobotLink`) is a plain `fetch` client
against the daemon's REST API. `serve.sh` is `python3 -m http.server` and is interchangeable with
any static file server.

## How to re-verify this (do this before assuming it broke)

```bash
# 1. Is he on the network, and is the motor backend up?
curl -s http://reachy-mini.local:8000/api/daemon/status | python3 -m json.tool

# 2. THE load-bearing check — does the preflight permit a cross-origin POST?
curl -s -i -X OPTIONS http://reachy-mini.local:8000/api/move/goto \
  -H 'Origin: http://localhost:4200' \
  -H 'Access-Control-Request-Method: POST' | grep -i access-control
#    Expect: access-control-allow-origin: *
#            access-control-allow-methods: ... POST ...

# 3. Does a real move land?
curl -s -X POST http://reachy-mini.local:8000/api/move/goto \
  -H 'Content-Type: application/json' \
  -d '{"antennas":[1.2,-1.2],"duration":0.35,"interpolation":"cartoon"}'
#    Expect: {"uuid":"..."} and visible antenna movement
```

`curl` does not enforce CORS, so step 2 checks the *headers* and step 3 checks the *endpoint*.
To prove a real browser honours them, serve the app and run the browser at a LAN origin:

```bash
cd robot-lab && ./serve.sh          # note the printed LAN URL
# then, from a real browser at http://<mac-lan-ip>:4200, in the console:
#   await (await fetch('http://reachy-mini.local:8000/api/daemon/status')).json()
```

**Evidence on record (2026-07-26).** Verified from headless Google Chrome, page origin
`http://192.168.1.172:4200`, robot at `192.168.1.15`, daemon v1.6.3:

```
GET_status=200 state=running v1.6.3 ip=192.168.1.15
POST_goto_preflighted=200                          ← preflighted cross-origin POST
RobotLink=online host=192.168.1.15 daemon=running
after_pitch22=measured_pitch=23.50
emotion_cheerful1=sent
asked_pitch90_bodyyaw400=pitch=25.7 bodyYaw=91.5   ← clamp held
VERDICT=BROWSER_DRIVES_REAL_ROBOT
```

Command round-trip measured at 27–100 ms over WiFi.

## Consequences

### Good

- One command to start a session; nothing to install; nothing to keep running on the Mac.
- The Mac is not on the command path — the iPad talks to the robot directly.
- No dependency tree, therefore no dependency rot. This should still run in five years.
- The whole app is inspectable by a child who gets curious, with no build artifacts in the way.

### Accepted costs

- **Must be served over `http://`, not `https://`.** The daemon is HTTP-only, and a secure page is
  forbidden from making insecure subresource requests. This is why the app **cannot be hosted on
  GitHub Pages or any HTTPS host and still drive the robot.** It is a LAN app by construction.
- **Anything on the LAN can command the robot.** The wildcard ACAO is the daemon's choice, not
  ours; any page any family member opens could move him. Acceptable on a home network with a
  desktop robot that has no arms. It would not be acceptable for a robot that can reach or move.
- **No camera video in-browser.** The daemon streams video over WebRTC, which needs GStreamer on
  the client and is Linux-only for remote clients today. The Season 3 sensor quests therefore
  reason *about* the camera (via `/api/camera/specs`, resolution/FPS trade-offs) rather than
  displaying its feed. Revisit if Pollen ships cross-platform WebRTC clients
  (see pollen-robotics/reachy_mini issue #572).
- **No text-to-speech on the robot.** The SDK has none. Speech comes from the tablet's Web Speech
  API instead, which is instant and controllable but comes out of the *tablet*, not the robot.
- If a future firmware tightens CORS, the whole architecture fails at once. Step 2 above is the
  canary. The fallback would be a minimal local proxy — reintroducing the `roboquest/` shape for
  transport only, keeping all curriculum and UI unchanged.

## Alternatives rejected

| Alternative | Why not |
|---|---|
| Python + FastAPI/WebSocket bridge on the Mac (`roboquest/`) | Two runtimes to start before a child can press a button; Mac on the command path; and it turned out to be solving a problem that does not exist. |
| Run the SDK on the robot over SSH | Works (`ssh pollen@reachy-mini`, venv at `/venvs/apps_venv`) and is the right tool for autonomous behaviours, but there is no GUI and the CM4 is weak. Not a path to an iPad UI. |
| Publish as a Hugging Face Space with the official JS SDK (`@pollen-robotics/reachy-mini-sdk`) | The recommended path for shareable apps, and genuinely good — WebRTC media, OAuth, a robot picker. But it needs a bundler, a dependency tree, and internet access, and routes through a signalling server. Wrong trade for a weekly family session on a LAN. Worth revisiting for the Season 6 capstone, where "send Grandma a link" is the point. |
| Native iPad app | Xcode, a developer account, and a rebuild for every curriculum tweak. Absurd for editing a lesson plan. |
| Static site with no robot at all (`robo-curriculum/`) | This is what it was. It is a website *about* robotics, not a robotics session. |

## Related

- Safety-limit table and the coupled head/body yaw constraint: `CLAUDE.md`, enforced in
  `robot-lab/assets/js/reachy.js` (`clampPose`), tested in `robot-lab/test/reachy.test.mjs`
- Full design and acceptance criteria: `docs/specs/001-robot-lab.md`
- Live interactive API docs, whenever the robot is on: `http://reachy-mini.local:8000/docs`
