# 2026-10-30 — VS frame and counter-spikes

**Date:** October 30, 2026 (Asia/Manila)
**Agent or person:** Claude (claude.ai), with Krischan
**Approved by:** Krischan ("Yep sketch it out"); prototype only

## Asked

Correct the earlier misreading (ice warning is 2 moves, not a cap of 2; freeze-over stays 4), add counter-spikes, mine batches of 6, heal after 4 perfect boards, icebreaker only on the last 2 boxes one cell at a time, and build Krischan's frame: a hearts pole on the left with a heartbeat on the healing heart, a hazard bar on the right (orange bank, red batch, solid ice block in his colors), a fire meter by the name and a projectile.

## Done

- Rules in `prototypes/vs-lab/src/fusefrost.js` and `ffmatch.js`; 46 tests passing.
- Found and fixed a softlock: ice blocking every remaining box meant no legal move, so no tick, so no melting. The icebreaker now also steps in when there is no legal move.
- Bot builds next to ice to thaw it instead of waiting forever.
- Frame, fire meter and projectile in the lab; published.
- Simulated counter modes ([rules](../versus/fuse-and-frost.md#with-the-frames-rules-hard-vs-hard-2026-10-30)): full counter-spike gives 1:35 rounds with few lead swings; refund mode is the middle ground.

## Changed

- `prototypes/vs-lab/`, the private lab artifact, wiki pages. Nothing in the app or landing repos.

## Open items

- Counter-spike strength and ice threat, by feel (Krischan).
- Ice count on the ice block, if play-testing says it matters.
