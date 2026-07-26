# ADR 0003 — Giving the robot his own eyes and voice

**Status:** stage 1 shipped; stages 2–3 designed, not built · **Date:** 2026-07-26

## The question

*"When is it that Reachy will actually use his eyes (camera) and voice (speaker) to interact? Is it
too hard to have a local LLM on the mac-studio-server serving as text-to-speech with Whisper?"*

Fair question, because the honest answer up to now was **never**. Season 3 quests reason *about* the
camera through `/api/camera/specs` without ever showing a frame, and every spoken line came out of
the **tablet**, not the robot. A robot whose voice comes from the device in your hand is not really
talking to you.

One correction that changes the plan: **Whisper is speech-to-*text*.** It is how he would *hear*
her, not how he would speak. Speaking needs a separate text-to-speech model. Three different jobs
get bundled together as "voice", and they have very different costs here:

| Job | Direction | What it needs |
|---|---|---|
| **Speaking** (TTS) | text → audio out of his speaker | Already solved. See stage 1. |
| **Hearing** (STT, Whisper) | his mic → text | Python **on the robot** |
| **Deciding** (LLM) | text → text | Ollama, already running |

## The constraint that shapes everything

The daemon's REST API has **no camera-frame endpoint and no audio-in endpoint** — verified against
the captured spec in `docs/reference/`: the only media routes are `play_sound`, `stop_sound`,
`sounds`, `sounds/upload`, `acquire`, `release`, `status`, and `camera/specs`.

Camera frames and microphone audio are only available through the SDK's media manager, which for a
*remote* client means WebRTC — and per the SDK docs, **macOS is not yet supported as a remote WebRTC
media client** (only Linux; see pollen-robotics/reachy_mini issue #572).

So the Mac cannot pull his camera or microphone, today, at all. That is the whole difficulty — not
the LLM, which is the easy part.

**Therefore anything touching the camera or microphone must run ON the robot**, where the media
backend is local and needs no WebRTC. The CM4 then talks to the Mac over plain HTTP for the heavy
models. That inverts the intuition in the question: the Mac Studio is not the host, it is the
*service* the robot calls.

## Stage 1 — his own voice, no backend at all. **Shipped.**

The daemon *will* play any sound file you upload, and both the upload and the playback work
cross-origin from a browser. Verified end-to-end:

```
say -o line.wav → POST /api/media/sounds/upload  → {"path":"/tmp/reachy_mini_sounds/line.wav"}
                → POST /api/media/play_sound     → {"status":"ok"}   ← he speaks
```

The curriculum has only **16 bakeable spoken lines**, so they are pre-rendered once and uploaded:

```bash
cd robot-lab && node tools/bake-voice.mjs          # bake + upload
cd robot-lab && node tools/bake-voice.mjs --list   # see what would be baked
```

At runtime `say:` calls `RobotLink.speakOnRobot()`, which plays the baked file if it exists and
falls back to tablet speech otherwise. Confirmed on hardware: quest e4-3's joke played from his
speaker with the tablet silent, while quest e4-2's squeaky-voice line correctly fell back to the
tablet, since a pre-rendered file cannot change pitch on demand.

`RobotLink.voiceFile(text)` — a djb2 hash plus a slug — is the contract between the baker and the
player, so it lives in `reachy.js` and both use the one implementation.

**Cost:** zero new dependencies, zero runtime backend, ~2 MB on the robot.
**Caveat:** `/tmp/reachy_mini_sounds` is cleared on reboot, so re-run the baker after one.

## Stage 2 — dynamic speech. Small, worth doing next.

Pre-baking cannot say anything a child types, or anything an LLM replies. That needs TTS at runtime,
which means the WAV bytes must come from somewhere the browser can reach.

A ~40-line local service on the Mac: `POST /speak {text}` → render → upload to the robot → play.
Because the browser already talks cross-origin to the robot, it can talk to this too.

This is the first thing in the project that reintroduces a backend, and it is worth being explicit
that it is **optional** — every existing quest still works without it. Keep it that way: the service
is an enhancement, never a dependency, or Sunday mornings start requiring a server again.

For better voices than macOS `say`: **Piper** is small, fast, fully local and genuinely good, and
**Kokoro** is better still if the Studio has the headroom.

## Stage 3 — hearing and seeing. The real project.

This is where the architecture inverts, and it is a genuinely good Season 5–6 build for a 9-year-old
rather than something to hand her finished.

```
     ON THE ROBOT (CM4, Python, local media backend — no WebRTC)
     mini.media.get_audio_sample()   16 kHz float32 stereo
     mini.media.get_frame()          numpy (h, w, 3) uint8
     mini.media.get_DoA()            angle + speech_detected  ← free VAD, use it
                    │  HTTP POST over the LAN
                    ▼
     ON THE MAC (already has Ollama: qwen2.5:7b, llama3.1, gpt-oss)
     faster-whisper  → text
     ollama          → reply
     piper           → WAV
                    │  upload + play_sound
                    ▼
     robot speaks, and can look at her while he does it
```

Latency budget, honestly: Whisper-small on Apple Silicon is a few hundred ms, a 7B model a second or
two, TTS a few hundred ms more. **Two to four seconds per turn.** That is fine for "ask Reachy a
question", and far too slow for anything resembling conversation. Design the quest around the pause
rather than pretending it is not there — have him *look thoughtful* while he thinks, which the
emotion library already does well (`thoughtful1`).

**What still has to be proved:** SSH into the robot needs a password (`pollen` / `root`), so the
on-robot service has to be installed by hand once. The CM4 is weak — camera capture plus JPEG
encoding on it is the part most likely to disappoint, and it should be measured before anything is
designed around it.

## Vision, specifically

Two things are worth separating:

- **`start_head_tracking()` already exists in the SDK and runs entirely on the robot.** He can find
  and follow a face with no Mac involved and no frames leaving him. This is the cheapest possible
  "he sees me" moment and it is not wired up yet — it should be, before any of stage 3. It is a
  handful of lines and it is the single biggest engagement win available.
- **Frames reaching the Mac** for anything else — object recognition, a VLM, "what am I holding?" —
  requires the on-robot service above.

## Decision

1. **Stage 1 now** (done). He has a voice today, for free.
2. **Wire up `start_head_tracking()` next** — biggest engagement per line of code, no new
   infrastructure, and it makes "Peek-a-boo" (e3-2) a real quest instead of a simulated one.
3. **Stage 2 when a quest needs dynamic speech**, kept strictly optional.
4. **Stage 3 as a Season 5–6 project she builds**, not a feature that is handed to her. Per
   [ADR 0002](0002-tier-progression.md) the upper tiers are things she ships; "teach the robot to
   listen" is close to the perfect project brief — it has a real user, a real deadline, and a
   failure mode she can measure.

## Rejected

| Alternative | Why not |
|---|---|
| Run the whole media pipeline on the Mac Studio | Blocked. macOS is not supported as a remote WebRTC media client (issue #572). This is the specific thing the question assumed was possible. |
| A cloud API for STT/TTS/LLM | Sends a 4-year-old's voice and a camera feed off the premises. Not for this. Local-only is a hard line here, and it is also a good thing to be able to explain to her. |
| Whisper as the text-to-speech engine | Whisper only does speech→text. Named because the question asked for it. |
| Browser-side TTS producing WAV bytes | The Web Speech API speaks but will not hand you an audio buffer, so the browser cannot make the file the robot needs to play. |
| Make the local service mandatory | Would undo ADR 0001. Every existing quest must keep working with nothing but a static server. |
