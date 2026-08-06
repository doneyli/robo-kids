# ADR 0002 — How the curriculum grows: six themes, six rungs, ages 4 to 16

**Status:** accepted (shape); tiers 3–6 outlined, not authored · **Date:** 2026-07-26

## Context

The 72 authored quests cover roughly the next **14–21 months** (see
[CURRICULUM.md](../CURRICULUM.md) for why that is not the 8 months a naive
sessions-to-weeks conversion suggests). After that, `CURRICULUM.next()` returns `null` on both
tracks. Two different cliffs:

1. **The bridge.** The 4-year-old finishes Explorer around 5½–6 and cannot enter Builder, which
   assumes fluent reading and arithmetic.
2. **The ceiling.** The 8-year-old finishes Builder around 9½–10. Builder's last quest already has
   her writing real Python and shipping an app. What is 12? What is 15?

Three independent designs were produced and scored against seven criteria (eight-year survival,
the 2-hour budget, the shared-weekend property, implementability in the existing data model, the
pre-reader gap, the uncool teenager, and hardware realism with one armless robot). Scores 61 / 56 /
50 out of 70.

## Decision

### 1. Six permanent themes. Tiers are depth, never new subjects.

All three designs converged here independently, which is the strongest evidence available that it
is right. **Hello Robot → Body & Motion → Senses → Sound & Speech → Brains & Choices → Robots & Us**
are not a syllabus to finish; they are the six things a Reachy Mini can teach, and each is deep
enough to hold a 4-year-old and a 15-year-old.

"Senses" at 5 is peek-a-boo with the camera. At 9 it is resolution-versus-frame-rate. At 12 it is
calibrating `K` and `D` from a printed checkerboard and reporting how far your own numbers differ
from `/api/camera/specs`. At 15 it is a perception system that runs for 28 days and produces a
dataset nobody had.

### 2. **Tiers, not skill strands.** This one was decided by measurement, not argument.

The losing design proposed retiring age tracks in favour of six independent skill strands with
belt-style ranks — which sounds better, and which the app already half-implements. The data says no:

```
                motion  senses  sequences  logic  making  kindness
Little Explorer      8       9          4      4       5         6
Young Builder        7      10          1      8       5         5     ← before rebalancing
```

`milestone.strand` turns out to be **nearly a relabelling of `season`** — Season 3 is 100% `senses`
on both tracks, Season 2 is 67–83% `motion`, Season 5 is 67% `logic`. And the distribution was 10:1
lopsided. A belt of four quests per strand is unbuildable from this content: Builder's `sequences`
strand yielded **zero** complete rungs.

Strands stay as a *coverage* instrument — the six bars on the parent dashboard — but they are not
the ladder.

> Acted on immediately: two Builder quests were retagged (`b5-2` Loops Save Work → `sequences`,
> since a loop *is* iteration; `b4-6` Move and Sound Together → `sequences`, since choreographing a
> timed five-step scene *is* ordering). Builder's minimum strand is now 3 rather than 1. This was
> only free to do because no badge has been earned yet — `milestone.strand` is baked into
> `localStorage` the moment one is, so any future retag is a migration.

### 3. **A slot stops being a quest at the upper tiers.** This is the load-bearing decision.

The parent's time is the binding constraint, and it is already fully spent at 30 + 60 minutes. A
curriculum that keeps *teaching* upward makes that load grow exactly as the children get more
expensive to teach. A curriculum that starts *shipping* upward makes it shrink, because the teacher
becomes a deadline and a real user instead of Dad.

| Tier | Ages | Dad-minutes/week | Unit of work |
|---|---|---|---|
| 1 · Little Explorer | 4–6 | 30 | quest *(authored)* |
| 2 · Apprentice | 6–7 | 40 | quest *(the bridge — not authored)* |
| 3 · Young Builder | 7–10 | 60 | quest *(authored)* |
| 4 · Inventor | 10–11 | 45 | 8–10 week project, real artifact, named user |
| 5 · Engineer | 12–13 | 30 | 12–14 week project, public accountability, real ML |
| 6 · Resident | 14–16 | 20 | 16-week engagement with a stakeholder who is not family |

It also collapses the authoring bill from ~78 new quests to **36 quests plus 18 project briefs**. A
quest in this repo carries `sayThis`, `unplugged`, `wonder`, `beyondRobotics`, `dadNote` and
`milestone`; a project brief is roughly a tenth of that. That is the difference between a plan that
stalls in 2029 and one that reaches 2034.

### 4. Promotion: **you are promoted when you can teach the tier you just finished.**

Three conditions, no assessment apparatus:

- **Coverage** — ≥5 of 6 quests in each of the six themes. One skippable per theme is deliberate: a
  child who loathes one activity kind must not be dammed behind it, which today's strictly linear
  `nextQuest()` would do.
- **Capability** — the tier's stated exit skill, demonstrated once, unprompted.
- **Consent** — she writes what she wants to build next. Renewed at every rung rather than assumed.

From tier 4 the demo gate varies one condition the child did not set up. A rehearsed demo passes a
soft gate; it does not pass that one. It is the only defence against the grade inflation a father
who wants to say yes will otherwise cause.

### 5. Alignment moves from the ladder to the calendar.

**Today's shared-weekend property is a coincidence, not an invariant.** `CURRICULUM.sibling()` pairs
quests by array index within the same season number across a hardcoded `explorer ↔ builder` pair,
and `index.html` literally tests `nE.season === nB.season`. That works only because both cadences
are one quest per week. It breaks the moment one child is on 1/week and the other on 1/10-weeks.

The fix: a **family Term clock** — the theme becomes a pure function of the date from one start
constant, so there is no scheduling state to desync. Six terms a year means September is always
Hello and June is always Us: a ritual you can feel rather than a field in a spec. Cross-tier pairing
uses `slot_other = ceil(slot_mine * n_other / n_mine)` — slightly lossy, always resolves.

And the stronger form of the property, once the tiers diverge: **the younger sister becomes the
elder's required test user.** Inventor project I2 does not pass until her little sister can trigger
the dance unaided. That is a sharper invariant than shared depth.

Ship `term.mode: 'locked' | 'free'` from day one. At 15 and 11 they may not want to share a theme,
and the app must not enforce a ritual the family has outgrown.

## What this changes in the code

Deliberately surgical. **Zero edits to the 2,441 lines of authored quest data.**

- `tier` and `theme` are **derived at load time** in `CURRICULUM.build()` from the existing `track`
  and `season` fields. Nothing in `quests-*.js` is renamed.
- The one real structural blocker: a child is currently *identified by her track* —
  `blankKid(id, id === 'explorer' ? 'explorer' : 'builder')` in `progress.js`. Kid identity must be
  separated from tier identity before any child can move up.
- Projects get a sibling `project-ui.js` dispatched on `record.kind`, **not** a ninth entry in the
  `BUILDERS` map — `quest-ui.js` is already 1,100 lines against the 500-line guidance in
  `CLAUDE.md`.
- A per-quest `literacy: 'none' | 'labels' | 'sentences' | 'numbers'` floor, derived at load time.
  This is the cheapest idea in any of the three designs and it de-risks the hardest deadline: if
  Apprentice is not written in time, a 5½-year-old can be served literacy-filtered Builder quests
  instead of hitting a wall. The gate dissolves rather than needing a bridge.
- Lazy per-tier script loading. Every page currently loads **both** quest files, so each navigation
  parses 2,441 lines of quest data on an iPad. Do this before authoring a fourth tier.
- One shared unplugged activity per theme with `roles: {junior, senior}`. Straws-and-a-lid becomes:
  the little one pushes the straws, the elder measures the tilt with a protractor and records it.
  Off-screen is ~39% of all session time, so this is the single largest available saving in
  parent-minutes — and per Bers it is the half that actually lands.

### Already implemented from this ADR

- **Strand rebalance** (above), while it was still free.
- **`cadence()` and `yearsActive()` replace the streak as the headline metric.** A streak only ever
  punishes: over eight years every December, every bout of flu and every deliberately fallow term
  resets it to zero and puts that on the dashboard. "5 active weeks of the last 8" is truer, kinder,
  and recovers on its own. `_streak()` is retained but demoted.

## Authoring strategy: stay one tier ahead, never more

Do **not** author 144 quests now. The structure removes the cliff from the data model; content is
written just-in-time, one tier ahead of whichever child is closest to it. A season is six quests —
at one a week that is a six-week buffer.

The pressure valve, if a tier slips: a `deeper: {prompt, activity}` field on existing quests. Six
harder re-parameterisations of a tier buys a full term of runway for a sixth of the authoring cost
of a new tier. Use it deliberately rather than in a panic.

Later tiers also get authored when these specific children are better known, which will produce
better quests than guessing today what a 12-year-old will care about.

## Risks, stated rather than wished away

- **The teenager problem, which no mechanism fully solves.** By 2031 the elder is 13 and "quests",
  "badges" and a modal that says "Yay!" are actively embarrassing. The structural mitigation is that
  from tier 4 every audience is *outside the family* — a merged PR with her handle, a paid client, a
  workshop she runs, a 15-minute talk at the Montreal AI meetup that already exists. The honest
  fallback: she may quit at 12, and none of this helps. Judge the design on what the 10-year-old
  shipped, not on what the 16-year-old might.
- **The squeeze is 2026–30, not 2032–34** — i.e. in the years the plan is least in doubt. Both
  children are in quest tiers simultaneously and Dad teaches both. It gets easier later, not harder.
- **Authoring debt is Dad's, not the children's.** 36 Apprentice quests at the quality of the
  existing 72 is the binding constraint, and the whole ladder queues behind it.
- **Hardware ceiling, stated as a standing prohibition:** no arms, no gripper, no mobility. Any
  project premised on the robot picking something up, navigating a room, or manipulating an object
  is out of scope **at every tier**. Cheap sanctioned additions: a printed checkerboard (free), a
  $30 webcam, a micro:bit, a Raspberry Pi.
- **A hard technical constraint nobody had recorded:** `getUserMedia` requires a secure context, and
  this app must stay on plain `http://` because the daemon has no HTTPS (ADR 0001). **There can be
  no browser-side camera capture** except from `localhost` on the Mac. Any capture activity moves to
  Python. This belongs in `AUTHORING.md` before the first Inventor brief, not after.
- **Eight years is four or five daemon majors.** A boot-time probe of `/openapi.json` should disable
  any activity whose endpoint has vanished, so a 2030 firmware update degrades one quest rather than
  blanking a Sunday. `POST /api/daemon/start` already 422s without `wake_up` — that kind of drift is
  the normal case, not the exception.
- **The most likely way this loses four years of progress is not a bored teenager, it is a phone
  upgrade.** Export/import exists and its union merge is correct (asserted in
  `integration.test.mjs`), but it depends on remembering to press a button. Commit a dated JSON
  export into the repo at every term rollover: six files a year, ~48 over the horizon.
- **Every design assumes the four-year competence gap holds for eight years.** It may not. The
  design survives that only because alignment is on *theme* and never on tier — which is exactly why
  the Term clock must be family state and the tier must be private per child.

## Rejected

- **Skill strands as the ladder.** Measured as unbuildable from the existing content (above), and
  its migration would invalidate earned badges. Its best ideas were grafted: the literacy floor, the
  shared two-role unplugged block, and cadence-over-streak.
- **"Six strands lit at this tier" as a promotion gate.** Redundant — because strand is nearly
  collinear with season, "5 of 6 quests in each theme" already guarantees strand coverage. One fewer
  gate to compute and explain.
- **New subjects per tier** (electronics tier, AI tier, mechanics tier). Breaks the shared-weekend
  property the moment the sisters are in different tiers, which is the whole point of the design.
