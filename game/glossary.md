# Glossary

Words used in the game, the code and this wiki. Player-facing copy uses the first word; code uses the word in brackets.

| Term | Meaning |
| --- | --- |
| Box (rect, block, `BoardRect`, `PlacedRectangle`) | A rectangle the player places. Player copy says "box". |
| Clue (given, number) | A number on the board. Its box must have exactly that area. "Givens" in code. |
| Anchor | Hokan only: a pre-filled, locked box that comes with the board. |
| Target, target chip, slot | Hokan only: an area value the player still has to place, shown as a chip under the board. |
| Ruleset (`GameMode`) | Classic or Hokan: what counts as a valid box. Not the same as a play mode. |
| Play mode (`CustomMode`) | Zen, Time Attack, Blitz or Tekazu: the goal and the clock around a board. |
| Zen | Untimed single board. The base game. |
| Time Attack | As many boards as possible before the clock ends. |
| Blitz | One board against a countdown. |
| Tekazu (手数) | "Number of moves": one board within a move budget. |
| Hokan (補完) | "Completion": the ruleset where you fill gaps from a tray of areas. |
| Shikaku (四角) | "Square". The puzzle type. |
| Seed | The string that rebuilds a board exactly. Share seeds look like `c6ef2508f`. See [codebase/puzzle-engine.md](../codebase/puzzle-engine.md). |
| Move token | 8 hex characters `X1Y1X2Y2` describing one box; a list of moves is the tokens joined together. |
| Help Me! | Sending a link of your unfinished board to a friend. |
| Let Me Help! | Pasting a friend's link to help them. |
| Rescue chain | The list of players a Help Me! board has passed through. |
| Daily puzzle | The shared 6×6 Easy board of the day; rolls over at 06:00 Philippine Time. |
| Perfect solve | A board solved in as many placements as it has clues, with no erases or overwrites. |
| Do-over | Erasing or overwriting a box; breaks a perfect solve. The app's analytics also count undos and resets separately. |
| Efficiency | Moves ÷ clues; 1.0 is flawless. "Most efficient clear" on the Account screen. |
| Games finished | Completed sessions (one Time Attack run = 1). Drives mode unlocks. |
| Boards finished | Every solved board (one Time Attack run of 8 boards = 8). |
| IGN | In-game name, the display name. |
| Player tag | A unique 6-character public handle for registered players. |
| Foundation | One-time donation tier; permanent perk and badge. |
| Supporter | Months-based support tier; timed perk and badge. |
| PreVS | Badge for players registered before Versus launches. |
| Mosaic | Retired weekly collaborative image mode. |
| Versus, VS | Head-to-head mode in development. |
| Shikaku+ VS | The head-to-head mode. Its rules were designed under the working name "Fuse & Frost", now dropped. |
| Mine | Versus: an active hazard with a fuse; cover it with a box to defuse it. |
| Ice, frozen cell | Versus: a passive hazard that blocks a cell until it thaws. |
| Icebreaker | Versus: the automatic break that stops ice from making a board unsolvable. |
| Rush | Versus: late-round mode where attacks hit five times as hard. |
| Temperature, temp | The original Versus economy, retired in October 2026. See [versus/history.md](../versus/history.md). |
| DAS, ARR, DCD | Keyboard auto-repeat settings borrowed from Tetris: delayed auto shift, auto repeat rate, DAS cut delay. |
| PHT | Philippine Time, UTC+8. The game's clock for daily rollover and launch dates. |
