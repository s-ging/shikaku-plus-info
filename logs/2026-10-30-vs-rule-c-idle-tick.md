# 2026-10-30 — VS rule C, idle tick, round log

**Date:** October 30, 2026 (Asia/Manila)
**Agent or person:** Claude (claude.ai), working while Krischan slept
**Approved by:** Krischan ("i think the last round of changes is necessary for this to work"); prototype only

## Asked

Build the agreed last round: rule C as the everyday ice source, an idle tick against stalling, a round log Krischan can copy as JSON, a heal heart that flatlines when the board can no longer be perfect, poles spaced and rounded like the cells, and an Impossible bot that actually wins, plus a bot that mirrors the player's pace.

## Done

- **Rule C** (`bankFreezeEvery` 6, `bankFreezeMin` 4 in `fusefrost.js`): 4+ mines left in your orange bank for 6 moves queue an ice on your board, repeating every 6 moves. Perfect-clear ice stays.
- **Idle tick** (`idleTickSecs` 4): `FFMatch.idleTick(i)` shares a new `_tickSide` with `act()`. The lab runs it for you and for a bot that's holding; Pause stops it. The simulator models it too.
- **Bots:** Impossible is faster and cleaner (1.0s a move, 3% mistakes, 97% defuse-first) and holds its last box 2 turns to grow a counter-spike; Expert holds 1. New **Mirror** preset plays at your measured pace.
- **Lab:** Copy round log (round-over card and rules lab), flatlining heart with a draining fill, poles one cell-gap from the board with the cells' corner radius at the bar ends, sliders for the new rules, updated help text.
- 48 tests pass. Simulations against a strong human stand-in: Impossible wins 89%, Mirror 69%, Expert 74%. Numbers in [the rules](../versus/fuse-and-frost.md#bot-presets-lab).
- Lab republished (version 8).

## Changed

- `prototypes/vs-lab/` (source, tests, simulator, built lab).
- [versus/fuse-and-frost.md](../versus/fuse-and-frost.md), [project/status.md](../project/status.md), [project/open-questions.md](../project/open-questions.md) (pool freezing answered).
- Nothing outside this repository.

## Open items

- Rule C values (6 moves, 4 mines) are first guesses; feel them out in play.
- Bot "deliberate thawing" is still the old behavior (builds next to ice only when ice blocks its solution).
- The round log only records events, not the boxes placed; add moves if a replay is wanted.

---

Authored by Claude; who was typing on Krischan's side wasn't confirmed (shared account).

## Follow-up, same morning

Krischan played Mirror twice and won both rounds (logs shared as JSON). He didn't like the idle tick, so it's now off by default (`idleTickSecs` 0, slider kept). Mirror now moves in lockstep, once per move of his, instead of at a measured average pace. Rule C never fired in either log: his bank never held 4+ mines for 6 moves.
