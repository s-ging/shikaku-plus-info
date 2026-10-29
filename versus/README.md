# Versus

Head-to-head Shikaku+: two players race the same boards, and finishing boards sends hazards to the other side.

## Status (2026-10-30)

- **Rules:** settled on [Fuse & Frost](fuse-and-frost.md) on 2026-10-29.
- **Prototype:** playable in the browser with five bot difficulties, every rule on a slider, 40 passing tests and bot-vs-bot simulations: [prototypes/vs-lab/](../prototypes/vs-lab/). Open `prototypes/vs-lab/dist/shikaku-vs-lab.html` in a browser to play.
- **App:** nothing in `s-ging/shikaku-plus` yet. The original Flutter Versus code (about 99% done) was lost to a drive failure in 2026 (before mid-September); it was never pushed, because pushing `master` deploys to production. See [history.md](history.md).
- **Server:** not started. Leaning Cloudflare Durable Objects ([decision 0005](../decisions/0005-cloudflare-for-versus.md)).
- **Players are waiting:** the PreVS badge is granted to everyone registered before Versus launches.

## Files

| File | What it is |
| --- | --- |
| [fuse-and-frost.md](fuse-and-frost.md) | The current rules, pitch, simulation results, bot presets, open questions |
| [history.md](history.md) | How Versus got here: the temperature economy, the loss, the redesign |
| [design/](design/) | Krischan's layout and hazard-tile comps |
| [archive/](archive/) | The superseded temperature-era specs, kept for reference only |

## Path to shipping

1. Play-test Fuse & Frost in the lab and settle the open questions (pool freezing, mines vs ice balance).
2. Fix readability: what each hazard means at a glance, the pitch, the first-match experience.
3. Port the economy to Dart as `vs_economy.dart`, translated line by line from `fusefrost.js` and checked against test vectors produced by the JS version (the same way the landing page's `puzzle.js` is checked against `puzzle_codec.dart`).
4. Add the engine seams to the game widget: refuse boxes over ice, report placements and clears to the match.
5. Build the match server and matchmaking.
6. Ship, starting with a bot opponent if online play needs more time.

Flutter rules carried over from the original build, still valid: animate hazards with `CustomPainter` repaints only (never `setState` in a ticker, never wrap the game board in a rebuilding widget), keep `vs_economy.dart` free of Flutter imports, and stay on `CustomPainter` rather than Flame. Details in the [archived temperature handoff](archive/2026-10-29-temperature-handoff.md#11-flutter-rules-for-the-port-later).
