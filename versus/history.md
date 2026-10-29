# How Versus got here

## The original: a temperature economy

The first Versus mode was built in Flutter and was about 99% done (Krischan). Each board had a temperature from +100 to −100; dropping to −100 lost the round.

- Mines landed with a fuse and cost temperature when they landed and when they exploded.
- Frozen cells appeared when a board got cold. Each one pinned a temperature floor (−25 per frozen cell), so four frozen cells meant −100 and a loss.
- A two-layer "promise" bar showed the temperature you would have once the ice was gone.
- An icebreaker solver (two passes, depth-first search with a node budget) broke ice only when it was provably the only thing blocking the board.
- Combos, perfect-clear streaks, defuse rewards and passive decay all moved the same bar, and a surge system metered out overflow mines.

A frame of the original build is in [design/original-vs-build.png](design/original-vs-build.png).

## The loss (2026, before mid-September)

The drive holding the Versus work failed while Krischan was using Claude Code. The work had never been pushed, because pushing the app's `master` branch deploys straight to production. A recovery service could not get the files back. The offline-mode work went with it.

What survived: the main app (pushed), the landing page with its byte-faithful port of the puzzle generator, and Krischan's memory of the design.

## The reconstruction (2026-09-16 to 2026-10-29)

The exact date of the loss is not recorded; the first reconstruction is dated 2026-09-16.

1. A chat model reconstructed the system from conversation memory ([archive/2026-09-16-reconstruction-handoff.md](archive/2026-09-16-reconstruction-handoff.md)). Useful, but its "confirmed" tags were not reliable, and it contradicted itself in places: for example, whether freezing read the raw or the floored temperature, which decides whether the game spirals.
2. Krischan and DeepSeek resolved those into a master spec ([archive/2026-10-29-master-spec.md](archive/2026-10-29-master-spec.md)) plus a surge definition ([archive/2026-10-29-surge-definition.md](archive/2026-10-29-surge-definition.md)).
3. Claude consolidated everything ([archive/2026-10-29-temperature-handoff.md](archive/2026-10-29-temperature-handoff.md)) and built the temperature economy as a browser prototype with 24 edge-case tests.

## Why it changed (2026-10-29)

Bot-vs-bot simulations of the temperature economy showed two problems:

- **Equal players never lost.** With net-cancel, their clears cancelled each other's mines, and each clear's +15° outpaced decay. 100% of even rounds stalled.
- **It wasn't readable.** Nine different things moved one number. Krischan compared it to needing a PDF to learn the Charge Blade in Monster Hunter.

Krischan's call: "strip the chrome, keep the simple." Keep mines as the active hazard and ice as the passive one, which was the part he found compelling, and drop the temperature math. Through the same session:

- Mines cost a **heart** when they explode, stock-style (Smash).
- Ice **stalls** instead of damaging, and thawing it sends it back: the Tetris "dig" as a comeback.
- **Solved is sacred:** a proposal to let mines land on finished boxes was rejected as unfair ("Puyo garbage over a T-spin setup").
- The board ticks **per move**, not on a wall clock, so players can always stop and plan.
- A KO **resets both players**, so the winner can't snowball.
- The icebreaker stays, but broken ice **spills** to the next board; the simulations showed ice didn't matter otherwise.
- Healing went from "every 30 clean placements" to **3 perfect boards in a row, once per round**, because 1-heart players could otherwise burst back.

The result is [Fuse & Frost](fuse-and-frost.md). Even players now finish rounds in about 2 minutes with constant lead swings.

## What was kept from the temperature era

- The icebreaker logic and its gate (`unplaced clues ≤ ice count`), the two-pass solver and the nearest-to-thaw, then oldest, then random selection rule.
- Mine cap, batching, fuse and blast.
- Ice telegraphing, thaw points and adjacency thaw.
- In-flight-only net-cancel.
- The Flutter implementation rules (repaint-only animation, import-free economy module, `CustomPainter` over Flame).
