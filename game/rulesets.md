# Rulesets: Classic and Hokan

A **ruleset** decides what the board looks like and what counts as a valid box. Every play mode (Zen, Time Attack, Blitz, Tekazu) can run on either ruleset; the player picks it on the game setup screen (`lib/start_game_screen.dart`). In code a ruleset is a `GameMode` value (`classic` or `hokan`), which is a different thing from the play mode (`CustomMode`).

## Classic

Standard Shikaku, as described in [how-to-play.md](how-to-play.md): the board shows clue numbers, and each box must hold exactly one clue equal to its area.

- Solved when every placed box is valid and every cell is covered (`_isSolvedClassic` in `lib/game_history.dart`).
- Seeds start with `c` (see [codebase/puzzle-engine.md](../codebase/puzzle-engine.md#share-seeds)).

## Hokan

*Hokan* (補完) means "completion" or "filling in". Part of the solution is already on the board, and you complete it from a tray of pieces.

How a Hokan board is built (`_makeHokan` in `lib/puzzle_codec.dart`):

1. The generator makes a normal Classic solution.
2. Some of its boxes become **targets**: they are removed from the board, and only their areas are shown, as chips in a tray under the board.
3. The rest stay on the board as locked, pre-filled **anchors**. Only anchors carry clue numbers.
4. Every box smaller than 3 cells is always an anchor.

How you play it:

- Place a box anywhere in the gaps. It must not overlap an anchor, and its area must match a target chip that is still free. There is no clue to match: the empty space is the puzzle.
- Placing a box uses up a matching chip (the chip takes the box's color). Erasing or overwriting the box gives the chip back.
- Solved when every chip is used and every cell is covered by an anchor or a placed box (`_isSolvedHokan`).

How difficulty changes Hokan (`hokanTargetFrac` and `_hokanTargetScore`):

| Difficulty | Share of boxes that become targets | Which boxes become targets |
| --- | --- | --- |
| Easy | 25% | The biggest boxes, easiest to place by eye |
| Medium | 45% | A mix of big and elongated |
| Hard | 65% | Prefers odd-area boxes |
| Brutal | 85% | Biggest boxes again, but most of the board is open |

The comment above `Difficulty` in `puzzle_codec.dart` says Brutal should "strongly prefer odd-dimension elongated shapes", but the scoring code falls back to plain area for Brutal. The table above is what the code does. Changing it would change every Brutal Hokan board, so ask first.

Target count is capped: at most 10 (Hard: 8 below 12×12, 12 from 12×12; Brutal: 10 below 12×12, 15 from 12×12).

- Seeds start with `s`.
- Hokan has its own badge track (Hokan Initiate to Hokan Expert) and its own count on the Account screen ("favorite ruleset").

## Versus

Versus (Fuse & Frost) currently uses Classic boards only. See [versus/fuse-and-frost.md](../versus/fuse-and-frost.md).
