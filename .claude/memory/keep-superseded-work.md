---
name: keep-superseded-work
description: Don declined deletion of superseded app directories — archive and relabel instead of removing
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 285e4389-6020-4b16-ac32-89ead3597a67
  modified: 2026-07-26T06:11:46.724Z
---

When consolidating this repo into `robot-lab/`, a `git rm -r roboquest robo-curriculum` was
declined even though the spec called for removal and the code was recoverable from git history.

**Why:** superseded explorations still have value to him as reference and as a record of what was
tried. Recoverability from git is not the same as being visible in the working tree.

**How to apply:** when work is superseded, leave the directory in place and relabel it — a
"superseded / unmaintained" row in the README, and a note in CLAUDE.md saying not to add features
to it. Propose deletion as a separate, explicit question rather than bundling it into a
consolidation change. See [[project_hardware]].
