# Guide for AI agents

How to find your way around Shikaku+, what must never break, and how to play a board yourself. Read [AGENTS.md](../AGENTS.md) first; its absolute law wins over anything here.

## First five minutes

1. `git pull` this repo. Read [AGENTS.md](../AGENTS.md), then [project/status.md](../project/status.md).
2. Decide the mode: talking or drafting is **brainstorm mode**; touching the app, the landing page, Supabase, a store or players is **work mode** ([PRINCIPLES.md](../PRINCIPLES.md#two-modes)).
3. If code is involved, read the header comment of every file you will touch. In this codebase the header says why the file exists and what not to do with it.
4. Ask who is typing before you author anything as someone.

## Where to look

| Task | Read first | Then |
| --- | --- | --- |
| Explain or change a game rule | [game/](../game/) | The mode's screen file in [codebase/app-map.md](../codebase/app-map.md#modes) |
| Anything about seeds, the generator, share links, the daily puzzle | [codebase/puzzle-engine.md](../codebase/puzzle-engine.md) | `lib/puzzle_codec.dart`, landing `src/lib/puzzle.js` |
| Placement, solving, undo, keyboard | [codebase/app-map.md](../codebase/app-map.md#the-game-engine-one-widget-many-mixins) | `lib/game_state_core.dart` (the contract), then the right `game_*.dart` mixin |
| A new stat, or showing a stat | [game/progression.md](../game/progression.md#stats) | `lib/visible_stats.dart` (the only allowed list) |
| Badges | [game/progression.md](../game/progression.md#badges) | `lib/badge_catalog.dart`, migrations 19 to 24 and 47 |
| Accounts and sign-in | [codebase/backend.md](../codebase/backend.md#auth) | `lib/auth_service.dart` |
| Leaderboards, profiles | [codebase/backend.md](../codebase/backend.md#key-rpcs) | `lib/leaderboard_service.dart`, `lib/profile_service.dart` |
| Payments | [codebase/backend.md](../codebase/backend.md#payments) | `lib/iap_catalog.dart`, `supabase/functions/verify_iap_purchase` |
| UI, colors, animation, performance | [codebase/design-and-performance.md](../codebase/design-and-performance.md) | `lib/app_theme.dart`, the shared widgets |
| Releases, flags, dev slugs | [codebase/build-and-release.md](../codebase/build-and-release.md) | `lib/feature_flags.dart`, `pubspec.yaml` |
| Versus | [versus/fuse-and-frost.md](../versus/fuse-and-frost.md) | `prototypes/vs-lab/src/fusefrost.js`, `ffmatch.js`, the tests |
| Why something is the way it is | [decisions/](../decisions/), [logs/](../logs/) | `git log` in the app repo, the file's header comment |

## Invariants that must never break

Each of these looks safe to change and is not.

1. **The generator's random-number calls.** Their order and count are the board format. Changing one changes every board, breaks shared links and splits the daily puzzle from the landing page. New generator features call the RNG only behind a parameter that defaults to off ([puzzle-engine.md](../codebase/puzzle-engine.md#the-rule-that-protects-everything)).
2. **Dart and JavaScript generators stay identical.** `lib/puzzle_codec.dart` and the landing page's `src/lib/puzzle.js` must produce the same boards; the landing repo's golden test checks it.
3. **Seed strings become integers only through `PuzzleCodec.stableSeedHash`,** never `String.hashCode`.
4. **The seed format, CRC and move tokens** are in links people have already shared. Old links must keep opening the same position.
5. **Stored identifiers are permanent:** `BadgeId` strings, `StatMetricKey` values, IAP `storeId`s, `user_entitlements.product` values, `sp2_` preference keys, `GameMode` names in stats. Add new ones; never rename.
6. **The public stats contract.** Only what `visible_stats.dart` lists may be shown. `deep_analytics.dart` is never imported by UI. Exposing a stat is a product decision.
7. **The client never grants a paid perk.** Mobile purchases are verified by the `verify_iap_purchase` edge function; custom tags are gated by `set_player_tag` on the server.
8. **Boot never waits on the network.** Sign-in, sync and fetches are best-effort.
9. **The performance doctrine:** no `Opacity` layers, no `saveLayer`, no blur, no ripples, no color filters in paint paths, static widgets in `RepaintBoundary`, no idle animation loops ([design-and-performance.md](../codebase/design-and-performance.md#performance-doctrine)).
10. **The text-scale lock** stays on; `test/scaling_lock_test.dart` guards it.
11. **Dormant code is parked on purpose.** Mosaic, Tekazu, the resume prompt and the `custom_game_button.dart` demo are behind flags or marked; don't delete them.
12. **Migrations are append-only.** Never edit an applied migration.
13. **`master` deploys to production.** Never push it without explicit approval for that exact push.

## Safe ways to work

- **Read-only by default.** The app and landing repos are read-only for agents unless Krischan asks for a specific change ([decision 0002](../decisions/0002-read-only-codebases.md)).
- **New work goes somewhere you can push:** this repo's `prototypes/`, a branch, or a new repo. Push early; a drive failure has already cost one finished feature.
- **Checks before saying "done":**
  - generator or seeds touched → landing `npm run test`, plus `node tools/board.mjs daily 2026-06-19` unchanged;
  - app code touched → `flutter analyze` and `flutter test`;
  - Versus economy touched → `node --test prototypes/vs-lab/test/*.test.js`, and `node prototypes/vs-lab/test/ffsim.js` for balance;
  - this wiki touched → links resolve, facts point at a source.
- **When the wiki and the code disagree, the code wins.** Fix the wiki in the same session.

## Playing a board

[`tools/board.mjs`](../tools/board.mjs) shows exactly the board the app would, using the landing page's verified copy of the generator. Node 18 or later, no install.

```
node tools/board.mjs daily                       # today's daily puzzle
node tools/board.mjs daily 2026-06-19            # a given day
node tools/board.mjs c6ef2508f                   # a share seed
node tools/board.mjs "https://shikaku.plus/?seed=c6ef2508f&moves=00040504&from=Kris"
node tools/board.mjs c6ef2508f --moves 0004050400000103   # check a move list
node tools/board.mjs c6ef2508f --solution        # the generator's own answer
node tools/board.mjs --encode 8 m 1a2b           # build a share seed
```

Output for the 2026-06-19 daily (`x` across, `y` down, zero-based):

```
       0  1  2  3  4  5
  0    .  .  2  .  .  6
  1    .  .  2  .  .  .
  2    8  .  2  .  .  .
  3    .  .  4  .  .  .
  4    6  .  .  .  .  .
  5    .  .  .  .  6  .
```

### Writing moves

A box is 8 uppercase hex characters: `X1 Y1 X2 Y2`, two digits each. The 6 at (0,4) as a full row is `00040504`; the 8 at (0,2) as a 2×4 block covering (0,0) to (1,3) is `00000103`. Join tokens with nothing between them. Sending an identical token again erases that box. To hand a board to a person, build a Help Me! link: `https://shikaku.plus/?seed=<seed>&moves=<tokens>&from=<name>`.

### Solving like a person

Work by elimination, not search:

1. **List every candidate box for each clue:** each factor pair of the number (a 6 is 1×6, 2×3, 3×2, 6×1), at every offset that contains the clue, stays on the board, and contains no other clue.
2. **Place forced boxes.** A clue with only one candidate is solved. A 1×N or N×1 along an edge is often forced.
3. **Claim orphan cells.** If a cell can only be covered by one clue's candidates, that clue's box must cover it; drop that clue's candidates that don't.
4. **Prune overlaps.** Once a box is placed, remove every other candidate that overlaps it, then repeat from step 2.
5. **Start where choices are fewest.** On sparse Easy boards that is usually the big numbers, since few big shapes fit; on dense Hard and Brutal boards it is the 2s and 3s against an edge or another clue.

A board can have more than one valid answer; any answer that follows the rules is accepted. `--solution` shows one valid answer, not necessarily the only one.

## Gotchas

- Many app comments use box-drawing characters (`─`, `§`, `→`). Cutting lines by byte count in a shell breaks them; use character-aware tools.
- `deploy.yml` at the app repo root is a stale copy; the real workflow is `.github/workflows/deploy.yml`.
- `custom_game_button.dart` has a demo `main()` at the bottom marked "delete before shipping". Leave it unless asked.
- The leaderboard screen's header says its layout "has NOT been eyeballed in a running instance". Check visually before trusting it.
- Hokan Brutal's code doesn't match its comment ([game/rulesets.md](../game/rulesets.md#hokan)).
