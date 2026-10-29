# Play modes

What the player can start from the home screen (`lib/home_screen.dart`) and the game setup screen (`lib/start_game_screen.dart`). Every mode plays Classic or Hokan ([rulesets.md](rulesets.md)) at any size and difficulty, unless noted.

| Mode | Goal | Status (2026-10-30) | Unlocks after |
| --- | --- | --- | --- |
| Zen | Solve one board, no clock | Live | 0 games |
| Time Attack | Clear as many boards as you can before time runs out | Live | 10 games |
| Blitz | Clear one board before the countdown ends | Live since 2026-07-05 06:00 PHT | 50 games |
| Tekazu | Clear one board within a move budget | Built, hidden in production | 100 games |
| Daily puzzle | Everyone gets the same 6×6 Easy board each day | Live | Always |
| Help Me! / Let Me Help! | Pass a board between friends | Live | Always |
| Mosaic | Weekly shared image revealed by solving boards | Soft-retired 2026-06, code kept | n/a |
| Shikaku+ VS | Head-to-head | In development, see [versus/](../versus/) | n/a |

## Unlock ladder

"Games finished" counts completed sessions: a solved Zen, Blitz or Tekazu board is 1 game, and a whole Time Attack run is 1 game however many boards it clears (`lib/stats_service.dart`). Thresholds are in `unlockThreshold` in `lib/mode_unlock_celebration.dart`. A full-screen "UNLOCKED" moment plays once per mode, on the next solve after the threshold is crossed.

Accounts created before 2026-07-01 UTC are grandfathered into every mode with no game count (`kModeGatingCutoffUtc` in `lib/feature_flags.dart`). Grandfathering waives the count only; it cannot open a mode that is gated at build time.

## Zen

The base game: one board, untimed, any size, difficulty and ruleset. On the home screen, Quick game repeats your last setup (its caption shows it, e.g. "Zen · Classic · 8×8 · Medium"), and Custom game opens the setup screen.

## Time Attack

Clear boards back to back until the clock runs out. The clock depends only on difficulty, not board size (`_kTimeLimit` in `lib/time_attack_screen.dart`):

| Difficulty | Time |
| --- | --- |
| Easy | 2:30 |
| Medium | 2:00 |
| Hard | 1:30 |
| Brutal | 1:00 |

Every board cleared counts toward "boards finished"; the best run per size and difficulty shows on the Account screen and has its own leaderboard.

## Blitz

Solve one board before the countdown hits zero (`_kBlitzLimit` in `lib/blitz_screen.dart`). Seconds by size and difficulty:

| Size | Easy | Medium | Hard | Brutal |
| --- | --- | --- | --- | --- |
| 6×6 | 30 | 20 | 15 | 10 |
| 8×8 | 45 | 30 | 25 | 15 |
| 10×10 | 70 | 45 | 35 | 25 |
| 12×12 | 105 | 70 | 55 | 40 |
| 16×16 | 165 | 110 | 85 | 60 |

Blitz went public on its launch date (`kBlitzLaunchUtc`, 2026-07-04 22:00 UTC). Before that it showed a countdown on its card.

## Tekazu

*Tekazu* (手数) means "number of moves". Solve the board within a move budget (`lib/tekazu_screen.dart`):

> moves allowed = number of clues + difficulty bonus

| Difficulty | Bonus moves |
| --- | --- |
| Easy | 6 |
| Medium | 4 |
| Hard | 2 |
| Brutal | 1 |

Every placement and every erase spends a move. Run out before solving and the run fails.

Tekazu is finished but hidden in production: it only opens in a build made with `--dart-define=ENABLE_BLITZ_TEKAZU=true`, or in a dev build opened with `?unlock=blitz-tekazu` ([codebase/build-and-release.md](../codebase/build-and-release.md#feature-flags)).

## Daily puzzle

One 6×6 Easy Classic board per day, the same for every player in the app and on the landing page (go.shikaku.plus). It rolls over at **06:00 Philippine Time** (22:00 UTC). The seed is the day count since 1970-01-01 of the instant shifted by +2 hours (`lib/daily_puzzle.dart`); for example, the board for 2026-06-19 is day 20623, hex `508f`. After you solve it, the home button reads "Daily puzzle — done" until the next rollover.

On Android and iOS, players can opt in to a reminder at the rollover (Settings → Preferences). It is off by default and not available on web.

## Help Me! and Let Me Help!

The social core of the game.

1. Mid-solve, tap **Help Me!** under the board. The app builds a link holding the board's seed and every move so far, plus your name, and copies it to the clipboard (there is also a clean-board option with no progress).
2. Your friend opens the link (or pastes it into **Let Me Help!** on the home screen). Their app rebuilds the exact board, replays your moves, and lets them continue.
3. When they finish, they can send a link back. The link carries the chain of names (`from` and `by`), so the board shows who helped whom. A replay timeline lets anyone step through the recorded moves.

The link format is in [codebase/puzzle-engine.md](../codebase/puzzle-engine.md#help-me-links). Links are immutable snapshots: they carry each player's name, tag and active badge as they were when the link was made.

Because usernames travel inside links that other people see, names go through a profanity filter, and the **Report** flow sends abuse reports to the Supabase `reports` table (Google Play's user-generated-content policy).

## Mosaic (retired)

A weekly collaborative mode: a 4×4 grid of 12×12 Hard boards, each solved board revealing a piece of a picture. Hosts could create rooms with a custom image and invite codes. Soft-retired from the product in June 2026; the code, screens and Supabase tables remain, behind `kMosaicEnabled = false` in `lib/feature_flags.dart`. Flipping that flag back on is the only step needed to bring it back.
