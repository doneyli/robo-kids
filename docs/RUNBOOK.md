# Runbook — when something is wrong five minutes before a session

Work top to bottom. Most of the time it is step 1 or step 2.

## Start a session

```bash
cd robot-lab && ./serve.sh
```

It prints the Mac URL, the iPad URL, and the robot's status. If the robot line says `found`, you
are done — open the iPad URL.

## "On screen only" — the app cannot see the robot

The app still works: every quest runs against the on-screen robot. So this is never session-ending.
To fix it:

**1. Is he powered on and booted?** Give him about a minute after power-on to join WiFi.

**2. Is he on the network?**
```bash
ping -c 2 reachy-mini.local
curl -s http://reachy-mini.local:8000/api/daemon/status | python3 -m json.tool
```
- `cannot resolve reachy-mini.local` → mDNS is failing. Find him by IP instead: check the router's
  client list, or `arp -a | grep -i b8:27` / scan with `nmap -sn 192.168.1.0/24`. Then in the app,
  the connection chip stores the last good host in `localStorage` under `robotlab.host`; you can set
  it from the browser console:
  ```js
  localStorage.setItem('robotlab.host', '192.168.1.15'); location.reload();
  ```
  `RobotLink` tries the saved host first, then `reachy-mini.local`, then the last known IP.
- `Request timeout` but it resolved → he is on a different subnet, or the iPad is on guest WiFi, or
  a 5 GHz/2.4 GHz split is isolating clients. Put both on the same SSID.

**3. Is the motor backend running?** `state` in the status JSON must be `running`. If it says
`stopped`, the HTTP layer is up but the motors are not being driven. The app starts it automatically
on load; to do it by hand:
```bash
curl -X POST 'http://reachy-mini.local:8000/api/daemon/start?wake_up=false'
```
The `wake_up` query parameter is **required** — omitting it returns 422, which reads misleadingly
like "not supported".

**4. Is the page on `https://`?** It must be `http://`. A secure page is forbidden from talking to
an insecure robot, and the daemon is HTTP-only. The failure is silent in the UI and shows as a mixed
content error in the browser console. This is also why the app cannot live on GitHub Pages.

**5. Is his own dashboard reachable?** Open `http://reachy-mini.local:8000` in a tab. If the
dashboard loads but the app says "on screen only", the robot is fine and something about the page is
not — check the browser console, and re-run the CORS check in
`docs/decisions/0001-browser-drives-the-robot-directly.md`.

**6. Has firmware tightened CORS?** The whole architecture rests on the daemon sending
`access-control-allow-origin: *`. If a firmware update removed it, everything breaks at once:
```bash
curl -s -i -X OPTIONS http://reachy-mini.local:8000/api/move/goto \
  -H 'Origin: http://localhost:4200' -H 'Access-Control-Request-Method: POST' | grep -i access-control
```
No `access-control-allow-origin` in the output means this is the cause. See ADR 0001 for the
fallback plan.

## He is connected but will not move

- **Motors disabled or floppy?** A quest may have left him in hand-guiding mode.
  ```bash
  curl -s http://reachy-mini.local:8000/api/motors/status
  curl -X POST http://reachy-mini.local:8000/api/motors/set_mode/enabled
  ```
  Or press **💪 Stiff** on the Dad page.
- **A long move still running?** `GET /api/move/running` returns a non-empty array.
  `POST /api/move/stop`, or press **⏹ Stop**.
- **Asked for something unreachable.** A pose can be inside every individual limit and still be
  outside the workspace — 40° pitch combined with 95° yaw is a real example. He will get as close as
  he can and stop short. That is not a bug; it is the Season 2 "Map His World" lesson.
- **He is asleep.** `POST /api/move/play/wake_up`, or **☀️ Wake**.

## Emotions do not play

```bash
curl -s "http://reachy-mini.local:8000/api/move/recorded-move-datasets/list/pollen-robotics%2Freachy-mini-emotions-library"
```
- Expect 81 names. The `/` in the dataset id **must** be URL-encoded as `%2F`.
- A 401 with "Repository Not Found" means the robot cannot reach Hugging Face, or its HF token
  expired. Check `GET /api/hf-auth/status`, and re-login from the dashboard's settings page.
- The first play of a given emotion downloads it, so it can take a couple of seconds. After that it
  is cached on the robot.

## No sound

```bash
curl -s http://reachy-mini.local:8000/api/volume/current
curl -X POST http://reachy-mini.local:8000/api/volume/set -H 'Content-Type: application/json' -d '{"volume":70}'
```
Note that `say:` actions speak from the **tablet**, not the robot — the SDK has no text-to-speech.
If the tablet is silent, that is a Web Speech problem: iOS needs a real tap before it will speak
(handled automatically, but the very first line of a session can be swallowed), and the Voice
toggle in the top bar may be off. Check the iPad is not on silent.

## Progress disappeared

Progress lives in `localStorage` under `robotlab.progress.v1`. It is erased by clearing Safari
website data, and it is **per browser and per origin** — progress made at `http://192.168.1.172:4200`
is not visible at `http://localhost:4200`.

- Export regularly from the Dad page and keep the file in iCloud.
- Import **merges**, so restoring an older backup will not wipe newer progress.
- Because it is origin-scoped, pick one URL and stick to it. Adding the iPad URL to the home screen
  helps.

## Tests

```bash
cd robot-lab && node --test
```

Zero dependencies — Node's built-in runner, Node 18+. Nothing here touches the network or the robot;
`fetch` is stubbed. If the data-integrity suite fails after you edited a quest, read
`docs/AUTHORING.md`.

An opt-in hardware smoke test lives in `tools/live-robot.mjs` and is **not** part of `node --test`,
because it moves a real robot:

```bash
cd robot-lab && node tools/live-robot.mjs
```

## Useful one-liners

```bash
# Everything at once
curl -s http://reachy-mini.local:8000/api/state/full | python3 -m json.tool

# Pose in degrees rather than radians
curl -s http://reachy-mini.local:8000/api/state/full | python3 -c "
import json,sys,math; d=json.load(sys.stdin); h=d['head_pose']
print('pitch %.1f yaw %.1f roll %.1f body %.1f' % (math.degrees(h['pitch']),
  math.degrees(h['yaw']), math.degrees(h['roll']), math.degrees(d['body_yaw'])))"

# Put him to bed
curl -X POST http://reachy-mini.local:8000/api/move/play/goto_sleep

# SSH in (default credentials: pollen / root; venv at /venvs/apps_venv)
ssh pollen@reachy-mini

# His own interactive API docs
open http://reachy-mini.local:8000/docs
```
