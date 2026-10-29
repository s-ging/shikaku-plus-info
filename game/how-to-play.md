# How to play

Shikaku+ is a Shikaku puzzle game. Its tagline (from the app's `pubspec.yaml` and web manifest): "A social grid-dissection puzzle game of squares." *Shikaku* (四角) means "square" in Japanese.

## The pitch

> Every number on the grid needs its own box, exactly that many squares big: a 6 gets six squares, a 2 gets two. Box them all with nothing left over and it's solved.

That framing is deliberate (Krischan, 2026-10-29): players don't feel like they are "splitting a grid into rectangles". They look at a number and ask where its box goes, and the board fills itself as a side effect. Use "box" in player-facing copy; the code says "rect" or "block".

## The rules

A board is a square grid (6×6 up to 16×16) with some numbers on it. Each number is a **clue** (the code calls it a *given*).

1. Every box must be a rectangle (a square counts).
2. Every box holds **exactly one** number.
3. That number equals the box's **area** in cells: a 6 can be 1×6, 2×3, 3×2 or 6×1.
4. Every cell ends up in exactly one box.

When every number has its box and no cell is left over, the board is solved. A board can have more than one valid answer; any answer that follows the rules counts.

## Controls

| Action | Touch or mouse | Keyboard (defaults) |
| --- | --- | --- |
| Move the cursor | | Arrow keys; hold Ctrl to snap to the next number or box |
| Place a box | Drag from one corner to the opposite corner | Hold Shift and use the arrows to stretch a box from the cursor, then Space |
| Erase a box | Tap it | Space on a single cell of a placed box |
| Replace a box | Drag a new box over it; everything it overlaps is removed | Same |
| Undo, redo | Buttons under the board | Ctrl+Z, Ctrl+Y |
| Reset the board | Settings → Reset puzzle | Hold R |

Defaults come from `defaultKeyBindings()` in `lib/game_prefs.dart`; every binding can be changed in Settings → Gameplay. Alt is bound to a third "translate" modifier.

- An **invalid box is refused**: if what you dragged doesn't hold exactly one number equal to its area, the board shakes and nothing changes (`_handleDrawClassic` in `lib/game_drag.dart`).
- While dragging, a label shows the box's size and area, e.g. `2×3  6`.
- Keyboard play has its own auto-repeat tuning (DAS, ARR, DCD, as in Tetris) on Settings → Gameplay → Handling, next to a live practice board.

## Board sizes and difficulty

Sizes: 6×6, 8×8, 10×10, 12×12, 16×16. Difficulty sets the largest box the generator may make, as a share of the board (`Difficulty` in `lib/puzzle_codec.dart`):

| Difficulty | Largest box (share of cells) | What it feels like |
| --- | --- | --- |
| Easy | 25% | Few, big boxes; quick to spot |
| Medium | 15% | More clues |
| Hard | 9% | Dense, many small boxes |
| Brutal | 5% | Very dense |

Larger boards (above 10×10) get up to a 20% boost to that cap so they don't become all slivers.

## A perfect solve

A board with N clues needs exactly N boxes. Solving it in N placements, with no erases or overwrites, is a **perfect** solve. The game tracks this as efficiency (moves ÷ clues, where 1.0 is flawless), and Versus mode rewards it ([versus/fuse-and-frost.md](../versus/fuse-and-frost.md)).

## Getting help from a friend

Stuck? **Help Me!** makes a link carrying your board and every move so far. Your friend opens it, finishes the board from where you left off, and can send it back. **Let Me Help!** on the home screen is where you paste a friend's link. Details in [modes.md](modes.md#help-me-and-let-me-help).

## Where to go next

- [rulesets.md](rulesets.md): Classic and Hokan.
- [modes.md](modes.md): Zen, Time Attack, Blitz, Tekazu, the daily puzzle.
- [../versus/fuse-and-frost.md](../versus/fuse-and-frost.md): head-to-head play (in development).
