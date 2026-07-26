# The curriculum — duration, cadence, and how it grows

Numbers computed from the quest data, not estimated. Regenerate with the snippet at the bottom.

## What exists today

| | Little Explorer | Young Builder | Both |
|---|---|---|---|
| Ages | 4–6 | 7–10 | |
| Quests | 36 | 36 | **72** |
| Session length | 30 min | 60 min | 90 min/week of parent time |
| Total session time | **18.0 h** | **36.0 h** | **54 h** |
| Of which off-screen | 6.9 h (38%) | 13.9 h (39%) | ~39% |
| Implied screen time | 11.1 h | 22.1 h | 33 h |
| At 1 quest/week | 36 weeks | 36 weeks | **~8.3 months** |
| Seasons | 6 × 6 quests | 6 × 6 quests | |

**Roughly two school terms.** Starting July 2026, both girls finish around **April 2027**, when they
will be 5 and 9.

The unplugged share is deliberate and roughly 40% of every session. Marina Bers' KIBO work is the
reason: the off-screen half is not filler, it is where the concept actually lands. A session that
skips it is half a session.

## You have more time than this uses

You said "a couple of hours a week with each" — call it 4 h/week. The curriculum asks for 1.5 h.
That is on purpose for the 4-year-old and optional for the 8-year-old:

- **Age 4: attention is the constraint, not the clock.** 30 minutes of structured activity is
  already at the edge. Do not stretch the quest. Spend the surplus on free play with the robot, a
  second run of the unplugged game, or letting her repeat a favourite quest — repetition at 4 is
  learning, not stalling.
- **Age 8: you can run two quests a week if she is hungry for it.** That halves the calendar to
  ~18 weeks (~4 months) and she finishes Builder around **December 2026**, aged 8.

That second option is the reason the progression below matters sooner than you might think. At two
quests a week, the cliff arrives in four months, not eight.

## The cliff, stated plainly

Today, `CURRICULUM.next()` returns `null` after quest 36 on each track:

- **Little Explorer** ends at *Show and Tell* → nothing after it.
- **Young Builder** ends at *Build and Ship Your Own App* → nothing after it.

Two separate gaps, and they are different problems:

1. **The bridge gap.** The 4-year-old finishes Explorer at ~5. She is then too young for Builder,
   which assumes fluent reading and arithmetic. Roughly two years with nowhere to go.
2. **The ceiling gap.** The 8-year-old finishes Builder at 8–9. Builder's last quest already has her
   writing real Python and shipping an app. What does 10, 12, 14 look like?

## How it grows — the tier × theme grid

The load-bearing idea: **six themes are permanent, tiers are depth.**

Every tier has the same six season themes — Hello Robot, Body & Motion, Senses, Sound & Speech,
Brains & Choices, Robots & Us. A child moves *up* a tier, never sideways into different subjects.

This is what makes the shared-weekend property survive for years. No matter which tier each girl is
in, they are both in **Senses** at the same time. The 5-year-old is playing peek-a-boo with the
camera; the 9-year-old is calibrating it; the 12-year-old is fine-tuning a vision model on it. Same
dinner-table conversation, three different depths. Under an age-banded design where tiers have
different subjects, that property breaks the moment they are in different tiers.

It is also a spiral, which is the pedagogically stronger shape: returning to the same idea with more
mathematical maturity beats marching through new topics once.

| Tier | Ages | Session | Quests | Duration | Arc |
|---|---|---|---|---|---|
| **1 · Little Explorer** | 4–6 | 30 min | 36 | ~8 months | Cause and effect. No reading. *(authored)* |
| **2 · Young Builder** | 7–10 | 60 min | 36 | ~8 months | Numbers, sequences, first Python. *(authored)* |
| **3 · Maker** | 10–13 | 90 min | 36 | ~9 months | Real projects, real ML, real users. *(outlined)* |
| **4 · Engineer** | 13+ | self-directed | project ladder | open-ended | She sets the goal; you are a reviewer. *(outlined)* |

Plus one bridge, which is a second lap rather than a new tier:

| **1.5 · Explorer II** | 6–7 | 40 min | 36 | ~8 months | The same six themes again, deeper, still low-reading. Numbers and early text creep in. |

Explorer II is what fills the bridge gap, and it is cheap to justify: a 6-year-old revisiting
"Senses" is not repeating herself, she is doing it with two more years of brain.

### Promotion

Not by age. By two signals together:

1. **Coverage** — all six seasons of the current tier finished.
2. **Readiness** — the tier's stated entry skill. Builder needs reading a short sentence unaided and
   counting past 100. Maker needs having debugged something without help. Engineer needs having
   shipped something a stranger used.

The app should offer promotion, not enforce it, and it should stay possible to drop back a tier for
a single quest. A 7-year-old who wants to redo an Explorer favourite should be allowed to.

### What has to change in the code

Small, and additive — the data model already nearly supports it:

- `CURRICULUM.TRACKS` gains a `tier` number and an `entrySkill` string per track, and Explorer II /
  Maker / Engineer become new entries.
- `progress.js` gains a current-tier field per kid, plus `promote()` / `demote()`.
- `CURRICULUM.sibling()` changes from *"same index, other track"* to **"same season, whatever tier
  the sister is in"** — this is the one real change, and it is what keeps the shared-theme link
  working once the girls are in different tiers.
- Each new track needs a page under `robot-lab/<track>/index.html`, which is 40 lines copied from
  `builder/index.html`.

### Authoring strategy: stay one season ahead

Do **not** author 144 quests now. Author the *structure* now so there is no cliff in the data model,
and author content just-in-time — one season ahead of whichever girl is closest to it. A season is
six quests; at one quest a week that is a six-week buffer, which is plenty of runway.

That also means later tiers get authored when you know these specific children better, which will
produce better quests than guessing today what a 12-year-old will care about.

## Risks worth naming

- **The 13-year-old problem.** A family robot project may stop being cool. The mitigation is in the
  Engineer tier's shape: she picks the goal, the artifact is public, and the audience is not you.
  "Ship a thing strangers use" survives adolescence better than "do a lesson with Dad."
- **Your 2 hours will not always survive the week.** The curriculum is week-indexed, not date-indexed
  — nothing expires, nothing is missed. The streak counter is deliberately weeks-with-any-activity,
  not consecutive days.
- **One robot, two children.** At 90 minutes total they do not overlap, but the moment they both want
  him at once you will need a rota. Worth pre-empting.
- **Hardware ceiling.** Reachy Mini has no arms, no grippers, no mobility. Anything in Maker or
  Engineer requiring manipulation needs additional hardware — a micro:bit, a Pi, LEGO, a servo kit.
  Season themes are chosen so this is never a hard blocker, but be honest with her about it.

## Regenerate these numbers

```bash
cd robot-lab && node -e "
global.window=global; global.localStorage={getItem:()=>null,setItem:()=>{}};
require('./assets/js/reachy.js');require('./assets/js/progress.js');
require('./assets/data/emotions.js');require('./assets/data/quests-explorer.js');
require('./assets/data/quests-builder.js');require('./assets/data/curriculum.js');
var C=global.CURRICULUM;
Object.keys(C.TRACKS).forEach(function(t){
  var qs=C.track(t), m=C.TRACKS[t];
  var un=qs.reduce(function(a,q){return a+q.unplugged.minutes;},0);
  console.log(m.label+': '+qs.length+' quests, '+(qs.length*m.minutes/60).toFixed(1)+'h total, '
    +(un/60).toFixed(1)+'h unplugged ('+Math.round(un/(qs.length*m.minutes)*100)+'%), '
    +qs.length+' weeks at 1/wk');
});"
```
