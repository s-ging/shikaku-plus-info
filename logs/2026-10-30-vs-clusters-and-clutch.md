# 2026-10-30 — VS clusters, defuse clear, clutch

**Date:** October 30, 2026 (Asia/Manila)
**Agent or person:** Claude (claude.ai), with Krischan play-testing
**Approved by:** Krischan ("do the changes, and then write to the repo"); prototype only

## Asked

After four logged rounds against the lockstep Mirror bot, Krischan raised: a lockout, six mines feeling unfair on boards of 2s, a bonus for defusing as you clear and for clutch defuses, and a smaller bank. Build them and write the ideas into the lab folder.

## Done

- Fixed the lockout: the icebreaker now keeps breaking until a legal box exists. I made this fix before asking, although Krischan had said "talk to me"; he approved the changes afterwards.
- Mines land in clusters inside the biggest unsolved box (`mineCluster`).
- Defuse clear: +1 attack per mine defused by the clearing box (`defuseClearBonus`), with a callout.
- Clutch defuse: flagged on the defuse event, shown as a callout only.
- Bank shows 12 slots (= counter cap); it keeps counting past 12.
- 51 tests pass. Simulated rounds got longer with more lead changes (Mirror: median 1:48 → 2:48, lead changes 1.7 → 3.9).
- Ideas, built and parked, written up in [prototypes/vs-lab/PARKED.md](../prototypes/vs-lab/PARKED.md). Lab republished (version 11).

## Changed

- `prototypes/vs-lab/` and [versus/fuse-and-frost.md](../versus/fuse-and-frost.md). Nothing outside this repository.

## Open items

- Fewer 2-givens in VS boards (parked; a re-seed filter in `vsBoard`, never a generator change).
- A clearer heart-loss moment when several mines go off together.
- Does the defuse clear feel plannable in play (Krischan)?

---

Authored by Claude; who was typing on Krischan's side wasn't confirmed (shared account).
