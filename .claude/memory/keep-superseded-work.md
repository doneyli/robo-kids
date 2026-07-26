---
name: keep-superseded-work
description: "A denied tool call is not a stated preference — ask, don't infer a policy from it"
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 285e4389-6020-4b16-ac32-89ead3597a67
  modified: 2026-07-26T16:44:03.506Z
---

I proposed deleting two superseded app directories (`roboquest/`, `robo-curriculum/`). The `git rm`
was denied, so I inferred a standing preference — "archive and relabel, never delete" — and wrote it
down as a rule. Don then asked for the deletion outright in his next message. The inferred rule was
wrong.

**Why:** a denial usually means *not like this, not right now* — bundled into an unrelated commit,
or without having been asked. It rarely means *never*. Generalising one blocked call into a policy
produced a rule that contradicted what he actually wanted, and would have kept contradicting it.

**How to apply:** when a call is denied, do the rest of the work, then ask the direct question in the
summary ("want me to delete these, or keep them archived?"). Report the denial as a fact — "removal
was declined, so they're archived in place" — rather than as a discovered preference. Only record a
preference in memory once he has actually stated one. See [[project_hardware]].
