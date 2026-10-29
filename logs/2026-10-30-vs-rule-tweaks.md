# 2026-10-30 — VS rule tweaks and the name

**Date:** October 30, 2026 (Asia/Manila)
**Agent or person:** Claude (claude.ai), with Krischan
**Approved by:** Krischan asked for the rule changes; prototype only

## Asked

Drop the "Fuse & Frost" name; mines going off together should cost one heart; at most 2 ice on the way, shown as the board catching a chill instead of a marked cell. Sending ice and the lack of projectiles are parked.

## Done

- Anti-burst (`maxHeartsPerMove: 1`), ice cap (`maxIceIncoming: 2`), no marked landing cell (`telegraphIce: false`) in `prototypes/vs-lab/src/fusefrost.js`, with tests (42 passing).
- Board-wide chill in the lab: blue frost, a frosted edge and drifting snow, stronger as the ice gets close.
- Simulations showed the ice cap stopped ice from ending rounds, so freeze-over went from 4 to 3 ice and rush from 150 to 100 moves. Mines and ice now split KOs about evenly; rounds run about 5 minutes ([rules](../versus/fuse-and-frost.md#what-the-bot-vs-bot-simulations-say)).
- Wiki renamed to Shikaku+ VS; recorded why payments never shipped and the lost-docs guess.

## Changed

- `prototypes/vs-lab/`, the private lab artifact, and wiki pages. Nothing in the app or landing repos.

## Open items

- Retune bot presets under the new rules.
- Whether ice should be sent at all, and projectiles between boards (Krischan, later).
