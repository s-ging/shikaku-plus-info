# 2026-10-30 — VS frost meter, grace, live attack

**Date:** October 30, 2026 (Asia/Manila)
**Agent or person:** Claude (claude.ai), with Krischan play-testing
**Approved by:** Krischan ("Let's?"); prototype only

## Asked

After a car play-test, Krischan raised:

- no breathing room after a clear
- ice that seems to come from nowhere
- no reward for early defusals
- no combos
- a heal that's very hard to earn
- no sense of how strong his own attacks are

We talked it through first; he approved the package with "Let's?".

## Done

- Grace after a clear: nothing lands on the clearing move or the first move on the new board.
- Frost meter, the only ice the opponent sends:
  - early defuse +1, active thaw +2
  - fires when full; holds on the last 4 boxes and fires with the clear, up to 3 ice
  - shown as a segmented pill on the right of the footer, with a blue projectile
- Clutch defuse cancels 1 incoming mine (orange, then red).
- Heal checkpoint at 2, drawn as a notch on the heart.
- Live `+N` attack preview by each name, bright when it would counter-spike.
- Perfect-clear ice and thaw-send-back turned off (frost replaces them).
- 56 tests pass. In simulation, ice now decides a third or more of rounds.
- Details and Krischan's quotes in [prototypes/vs-lab/PARKED.md](../prototypes/vs-lab/PARKED.md#6-frost-grace-clutch-checkpoint-live-attack-built-2026-10-30-afternoon). Rules updated in [versus/fuse-and-frost.md](../versus/fuse-and-frost.md). Lab republished (version 12).

Separately, Claude drew a desktop home-page mockup for the app as a design canvas. It's a design artifact only; nothing in the app changed.

## Changed

- `prototypes/vs-lab/` and the wiki pages above. Nothing outside this repository.

## Open items

- Frost meter size, 3 or 4 (Krischan).
- Combos: talked through, not built.
- Whether to show the opponent's `+N`.
- Impossible may need re-tuning now that players send frost.

---

Authored by Claude; who was typing on Krischan's side wasn't confirmed (shared account).
