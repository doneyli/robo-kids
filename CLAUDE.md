# robo-kids — Project Conventions

## Overview
Family robotics education project. Three parallel explorations of how to teach robotics to kids ages 4 and 8 using a Reachy Mini robot.

## Critical Constraints
- **Hardware available**: Reachy Mini is physically set up. Code uses try/except to connect to real hardware first, with mock/simulator fallback (useful when robot is charging or offline). All code must still work in simulator mode.
- **Age-appropriate content**: Two distinct tracks — age 4 (play-based, no reading required, big buttons, voice) and age 8 (structured learning, visual programming, light Python exposure).
- **Session length**: Activities designed for 30 min (age 4) or 60 min (age 8) sessions.

## Tech Guidelines
- Reachy Mini SDK: `pip install reachy-mini` — wrap all SDK calls behind an interface that can swap between real hardware and mock/simulator
- Web apps: Use responsive, tablet-friendly layouts (kids will use tablets)
- Accessibility: Large touch targets (min 48px), high contrast, minimal text for younger track
- No external API keys required for basic functionality

## Port Assignments
Check `~/.claude/ports.json` before assigning ports. Use Tier 4 (4000-4999) for dev.

## Branch Strategy
- Each exploration approach gets its own branch: `issue-{N}-{short-desc}`
- PRs back to main with full description of what was built
