# robo-kids

Teaching robotics to two sisters — ages 4 and 8 — with a [Reachy Mini](https://huggingface.co/docs/reachy_mini)
and a couple of hours a week.

## → Start here: [`robot-lab/`](robot-lab/)

```bash
cd robot-lab && ./serve.sh
```

Then open the printed LAN address on the iPad. No build step, no `npm install`, no backend.

**What it is.** A curriculum of **72 quests across 6 seasons and 2 age tracks**, in a static web
app that drives the real robot straight from the browser. Both girls work the same season theme at
different depths, so they are in the same world on the same weekend and can compare notes.

| | Little Explorer | Young Builder |
|---|---|---|
| Ages | 4–6 | 7–10 |
| Session | 30 min | 60 min |
| How | Emoji buttons, spoken instructions, no reading needed | Sliders with real numbers, sequence building, actual Python |
| Ends at | Designing her own robot | Shipping her own app |

Seasons: **Hello Robot → Body & Motion → Senses → Sound & Speech → Brains & Choices → Robots & Us.**
Roughly nine months at one quest per kid per week, deepening rather than repeating.

Every quest carries a literal script for the parent (`sayThis`), an off-screen half that works
when the robot is charging, a question to leave her wondering, and a note on what *Dad* learns.
Concepts are tagged against [Barefoot Computing](https://www.barefootcomputing.org/)'s framework,
and the shape follows Marina Bers' *Coding as Another Language* — coding as expressive literacy,
not vocational training.

## The finding that made this possible

The Reachy Mini Wireless daemon serves a REST API on port 8000 **and answers cross-origin requests
with `access-control-allow-origin: *`**.

That means a plain static HTML page is a first-class robot client. No Python on the tablet, no
WebSocket bridge on the Mac, no build tooling. Verified end-to-end from real Chrome at a LAN origin
against the physical robot: preflighted `POST /api/move/goto` returns 200, all **81 recorded
emotions** play, live telemetry reads back, and command latency is 27–100 ms over WiFi.

Endpoint list and the safety-limit table are in [`robot-lab/README.md`](robot-lab/README.md).
Design and acceptance criteria are in [`docs/specs/001-robot-lab.md`](docs/specs/001-robot-lab.md).

## Hardware

- Reachy Mini **Wireless**, on WiFi as `reachy-mini.local` (daemon v1.6.3)
- His own dashboard and interactive API docs: `http://reachy-mini.local:8000`
- Everything works without him — the on-screen robot mirrors every command, so a session with a
  4-year-old never dead-ends on a connection error

## Earlier explorations

Kept for reference; superseded by `robot-lab/` and no longer maintained.

| Folder | What it was | Why it was superseded |
|---|---|---|
| `robo-curriculum/` | 12-week Astro lesson-plan site | Good content, **no robot connection** — a website about robotics rather than a robotics session |
| `roboquest/` | Next.js app + Python FastAPI/WebSocket bridge | Needed two runtimes babysat before a kid could press a button, and shipped a `mock_reachy.py` — it never drove the real robot |

Their best ideas — a badge per mission, and pairing every screen activity with an unplugged one —
were carried into the quest data.
