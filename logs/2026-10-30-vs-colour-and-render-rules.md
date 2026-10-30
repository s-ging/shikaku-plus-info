# 2026-10-30 — VS box colour and rendering guardrails

**Date:** October 30, 2026 (Asia/Manila)
**Agent or person:** Claude (claude.ai), with Krischan
**Approved by:** Krischan ("Let's use the purple color for all boxes in VS mode"); prototype and wiki only

## Asked

Use one colour, lavender, for every box in VS, and keep the original rendering guardrails: CustomPainter for every cell, game event and piece of chrome; on low-end devices only transforms and opacity, no snow.

## Done

- The lab paints every VS box `#A090C0`. `src/game.js` (copied from the landing repo) is untouched.
- Guardrails and the VS colour rule written into [codebase/design-and-performance.md](../codebase/design-and-performance.md).
- Lab republished (version 14).

## Changed

- `prototypes/vs-lab/src/ffapp.js` and the wiki page above. Nothing outside this repository.

## Open items

These were proposed in the same conversation and are waiting on Krischan:

- counter-spike sends back half of what it cancels
- clears and clutches cancel the red batch first
- the endgame icebreaker gives +2 frost and a BREAK callout (the rescue break gives nothing)
- three defuse tiers
- a low-end preview toggle in the lab

---

Authored by Claude; who was typing on Krischan's side wasn't confirmed (shared account).
