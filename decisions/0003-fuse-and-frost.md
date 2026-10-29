# 0003 — Versus becomes Fuse & Frost

**Date:** 2026-10-29
**Decided by:** Krischan
**Status:** accepted. On 2026-10-30 Krischan dropped the name: the mode is just "Shikaku+ VS". Rule tweaks the same day: anti-burst, max 2 ice on the way, freeze-over at 3 ([rules](../versus/fuse-and-frost.md)).

## Context

The rebuilt temperature economy for Versus had nine things moving one number, needed a tutorial to read, and in bot-vs-bot simulations two equal players never lost: 100% of even rounds stalled.

## Decision

Strip the temperature system. Keep mines as the active hazard (an explosion costs a heart) and frozen cells as the passive one (ice stalls the board; thawing it sends it back). Hazards never land on finished boxes. Boards tick per move. A KO resets both players. The full rules are in [versus/fuse-and-frost.md](../versus/fuse-and-frost.md).

Krischan: "strip the chrome, keep the simple", and "I'm ready to let go of the old one."

## Why

- Readable in one sentence per hazard.
- Rounds end: even players finish in about 2 minutes with about 8 lead swings.
- Keeps the part Krischan found most compelling: active and passive hazards on the board you're playing, like Tetris garbage.

## Alternatives considered

- **Stock mode** (mines and hearts only): simplest to ship, but Krischan believes in the frozen-cell layer and wants to develop it; stock is effectively Fuse & Frost without ice.
- **Re-stamping** (mines landing on solved boxes): rejected as unfair.
- **Keeping temperature, adding a rush timer:** still stalled 18% of even rounds in simulation, and still unreadable.
