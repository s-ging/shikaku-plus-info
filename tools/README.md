# Tools

| Tool | What it does |
| --- | --- |
| [board.mjs](board.mjs) | Print a Classic board from a share seed, a Help Me! link or a date; replay and check a move list; print the generator's solution; build a share seed. Node 18+, no install. Usage and a solving guide: [llm/README.md](../llm/README.md#playing-a-board). |

`board.mjs` reuses `prototypes/vs-lab/src/puzzle.js` and `game.js`, which are unchanged copies of the landing page's generator and rules (verified against the Dart generator by the landing repo's golden test). If the generator ever changes in the app, update those copies from the landing repo, not by hand.

Known limits: Hokan seeds are rejected (not ported yet), and hex seeds longer than 13 digits exceed JavaScript's exact-integer range, so they would not match the app.
