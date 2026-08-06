# Reference snapshots — Reachy Mini daemon v1.6.3

Captured 2026-07-26 from the physical robot (`reachy-mini.local` / `192.168.1.15`).

Every authoritative reference for this robot's API is a live URL **on the robot itself**. That is
fine until the robot is off, on another network, sold, bricked, or updated to a firmware that
changed something. These files exist so the contract this app is written against can be recovered
without the hardware in the room.

| File | What it is | Why it matters |
|---|---|---|
| `reachy-daemon-1.6.3-openapi.json` | The complete OpenAPI spec — **77 paths, 37 schemas** | The exact request/response shapes `reachy.js` targets, including `GotoModelRequest`, `FullBodyTarget`, `XYZRPYPose` and the `InterpolationTechnique` enum |
| `cors-preflight-evidence.txt` | Raw `OPTIONS` response with an `Origin` header | **The load-bearing evidence.** `access-control-allow-origin: *` is the single fact that makes a backend-free static app possible. See ADR 0001. |
| `reachy-emotions-library.json` | All 81 recorded move names | The source of truth for `assets/data/emotions.js`; a test asserts the catalogue matches |
| `reachy-camera-specs.json` | Resolutions plus the `K` intrinsic matrix and `D` distortion coefficients | Used by the Season 3 sensor quests |
| `reachy-daemon-status.json` | Daemon identity and control-loop statistics | Documents the `state` enum and `wireless_version` flag |

## Regenerate

```bash
cd docs/reference
R=http://reachy-mini.local:8000
curl -s $R/openapi.json | python3 -m json.tool > reachy-daemon-1.6.3-openapi.json
curl -s "$R/api/move/recorded-move-datasets/list/pollen-robotics%2Freachy-mini-emotions-library" \
  | python3 -m json.tool > reachy-emotions-library.json
curl -s $R/api/camera/specs   | python3 -m json.tool > reachy-camera-specs.json
curl -s $R/api/daemon/status  | python3 -m json.tool > reachy-daemon-status.json
curl -s -i -X OPTIONS $R/api/move/goto \
  -H 'Origin: http://localhost:4200' -H 'Access-Control-Request-Method: POST' \
  > cors-preflight-evidence.txt
```

Rename the OpenAPI file if the daemon version has moved on, and keep the old one — a diff between
two versions is the fastest way to find out what a firmware update broke.

## Browsing the spec

```bash
# Every endpoint, one per line
python3 -c "
import json
d=json.load(open('reachy-daemon-1.6.3-openapi.json'))
for p,ops in sorted(d['paths'].items()):
    for m,o in ops.items():
        print(f'{m.upper():6} {p:52} {o.get(\"summary\",\"\")}')"

# One request schema
python3 -c "
import json
d=json.load(open('reachy-daemon-1.6.3-openapi.json'))
print(json.dumps(d['components']['schemas']['GotoModelRequest'], indent=2))"
```

When the robot is powered on, the interactive version is at
`http://reachy-mini.local:8000/docs` and is always the more current of the two.
