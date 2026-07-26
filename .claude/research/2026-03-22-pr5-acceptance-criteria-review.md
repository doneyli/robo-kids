# Research: PR #5 Acceptance Criteria Review
Date: 2026-03-22
Scope: Code review of PR #5 (RoboQuest gamified web app) against the 9 acceptance criteria in Issue #1

## Acceptance Criteria Findings

### AC1: "Next.js app runs locally with `npm run dev` — no errors"
- Status: **LIKELY MET** (structural evidence; not runtime-verified)
- `package.json` at `roboquest/package.json:6` defines `"dev": "next dev --port 4001"`
- All imports appear structurally valid; dynamic imports used for Blockly (SSR-safe)
- `asyncio` is listed as a pip package in `backend/requirements.txt` — this is a stdlib module, not pip-installable under Python 3.12+; may warn/fail on install but does not affect the frontend
- No `.env` file required; WS_URL falls back to `ws://localhost:4002` via `process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:4002'` (`src/lib/websocket.ts:3`)

### AC2: "Explorer Track (age 4): at least Week 1-2 missions playable with large touch targets, voice narration, no text dependency"
- Status: **PARTIALLY MET — text dependency concern**
- Week 1 (4 missions) and Week 2 (4 missions) are all defined (`src/lib/missions.ts:7–287`)
- Voice narration: Web Speech API called on page load, mission card click, button tap, and completion (`src/app/explorer/page.tsx:8–16`, `src/app/explorer/mission/[id]/page.tsx:11–19`)
- Touch targets: `.tap-btn` class sets `min-height: 120px` (`src/app/globals.css:70`); global CSS sets `min-height: 48px` on all `button, a, [role="button"]` (`globals.css:25–28`)
- **Issue**: Mission cards on the Explorer hub render `shortDescription` as visible text (`explorer/page.tsx:43`). Concept tags are also rendered as text strings (`explorer/page.tsx:46–49`). The intro screen shows `mission.description` as a text paragraph (`explorer/mission/[id]/page.tsx:311`). A 4-year-old who cannot read would rely entirely on voice narration triggering on load/click — the UI itself has significant readable text. The criterion says "no text dependency" but the layout is text-heavy.

### AC3: "Builder Track (age 8): at least Week 1-2 missions with Blockly visual programming generating Reachy Mini commands"
- Status: **MET**
- Week 1 (4 missions: blockly×3, debug×1) and Week 2 (4 missions: blockly×3, one combined) defined (`src/lib/missions.ts:292–549`)
- Blockly editor loads via dynamic import with SSR:false (`src/app/builder/mission/[id]/page.tsx:14`)
- `generateCommands()` in `BlocklyEditor.tsx:80–128` translates blocks to robot commands
- Commands sent via `sendCommand()` through WebSocket/mock layer

### AC4: "WebSocket bridge connects to a Python mock backend that simulates Reachy Mini responses"
- Status: **MET**
- `backend/server.py` is a full asyncio WebSocket server on port 4002 (`server.py:34`, `server.py:157`)
- Handles all robot actions: wave, look, speak, express, dance, blink, nod, shake_head, wake_up, sleep, get_state, run_sequence (`server.py:61–90`)
- `MockReachyMini` class in `backend/mock_reachy.py` simulates realistic timing and state transitions

### AC5: "Mock mode is the default — app starts without any hardware or external dependencies"
- Status: **MET**
- Frontend auto-falls back to mock on WebSocket error/close (`src/lib/websocket.ts:67–86`)
- Mock simulation in `RobotWebSocket.simulateMock()` (`websocket.ts:123–142`) handles all commands client-side
- `broadcastMockConnect()` announces mock mode to all subscribers (`websocket.ts:89–97`)
- App is fully functional with no backend running

### AC6: "Progress tracking persists across sessions (local storage or SQLite)"
- Status: **MET**
- `localStorage` used via `loadProgress()` / `saveProgress()` in `src/lib/progress.ts:5–30`
- `completeMission()`, `earnBadge()`, `addJournalEntry()` all write to localStorage (`progress.ts:32–63`)

### AC7: "Parent dashboard displays per-child concept mastery"
- Status: **PARTIALLY MET — single shared profile, no per-child separation**
- `src/app/parent/page.tsx` renders a `TrackReport` for each track (Explorer / Builder) showing completed missions, concepts mastered count, badges earned, and journal entries
- Concepts are derived from completed missions and shown as mastered/unmastered (`parent/page.tsx:67–68`)
- **Issue**: The progress model (`src/lib/types.ts:127–131`) is a single `Progress` object with `explorer` and `builder` keys — there is no concept of individual children. The issue states two children (age 4 and age 8); the parent dashboard shows one shared progress profile, not separate profiles per child. The criterion "per-child concept mastery" is not met.

### AC8: "Responsive layout works on tablet (min 48px touch targets, high contrast)"
- Status: **MET**
- Global CSS enforces `min-height: 48px; min-width: 48px` on all interactive elements (`globals.css:25–28`)
- `.tap-btn` class enforces `min-height: 120px` for primary action buttons (`globals.css:70`)
- Tailwind responsive classes used throughout; no fixed widths that would break tablet layout
- Color scheme uses high-contrast gradients (e.g., `from-yellow-300 to-orange-400`, white text on colored backgrounds)

### AC9: "All pages accessible without reading for age-4 track (icons + audio)"
- Status: **NOT MET**
- This is the most significant gap. The Explorer hub page renders visible text: mission titles (`explorer/page.tsx:43`), shortDescriptions (`page.tsx:43`), concept tag names (`page.tsx:46`), section headers "Week 1 — First Adventures!" (`page.tsx:89`), and stats labels "Done" / "Left" (`page.tsx:72, 75`)
- The mission intro screen shows `mission.description` as a text paragraph and lists concept names as readable text chips (`explorer/mission/[id]/page.tsx:311–316`)
- Voice narration reads `shortDescription` on card click and reads the description on page load, but the page does not hide or replace text with icon-only content for the age-4 track
- There is no mechanism to suppress text display for the Explorer track

## Patterns

- The PR conflates "Explorer Track" and "Builder Track" as navigation routes but uses a **single shared progress object** — no per-child profile separation
- Voice narration is present but supplemental, not a replacement for text; the layout still requires reading to fully navigate
- `controls_if` block is referenced in the toolbox builder (`BlocklyEditor.tsx:189–191`) but there is no corresponding custom block definition in `ROBOT_BLOCKS` and the block is never registered — Blockly's built-in `controls_if` may or may not render depending on the Blockly version loaded. Mission `builder-w2-2` uses `controls_if` in its `availableBlocks` array (`missions.ts:471`) — this block may silently fail to render in the toolbox.

## Recommendations

- AC2/AC9 (text dependency): Implement an icon-only mode for the Explorer track that hides text labels and relies on emojis + voice; or at minimum gate this behind a "reading level" toggle
- AC7 (per-child): Add a profile selector (Child 1 / Child 2) at the app root that namespaces progress under separate keys in localStorage
- `controls_if` gap: Register `controls_if` as a native Blockly block or remove it from the `availableBlocks` list for `builder-w2-2` until it can be validated

## Open Questions

- Is the "no text dependency" criterion meant as "text is never required to make progress" (achievable with voice narration) or "no readable text appears on screen" (requires icon-only mode)?
- Should per-child profiles be tracked separately or is a per-track split (Explorer = age 4, Builder = age 8) considered sufficient for the family use case?
