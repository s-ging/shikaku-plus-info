# Status

Last updated: 2026-10-30.

Newest items at the top of each list. Tick items off (`[x]`) with the date; never delete them.

## Right now

- **Players:** about to pass 100, with no promotion; 100+ downloads on Google Play (Krischan, 2026-10-30).
- **Install size:** about 9MB on Google Play, a point of pride.
- **Live:** the app at version 1.26.7.2 on web (`shikaku.plus`) and Android; landing page and blog at `go.shikaku.plus`.
- **Modes live:** Zen, Time Attack, Blitz, the daily puzzle, Help Me!. Tekazu is built but hidden; Mosaic is retired.
- **Lost to the 2026 drive failure:** the Flutter Versus mode (about 99% done), the offline-mode work, and the app's design docs (`CLAUDE.md`, `DESIGN_SYSTEM.md`, `KEYBOARD_NAV.md`, `SHIP_CHECKLIST.md`; see [codebase/lost-docs.md](../codebase/lost-docs.md)).
- **Versus (Shikaku+ VS):** rules settled and tweaked on 2026-10-30; playable prototype with bots in [prototypes/vs-lab/](../prototypes/vs-lab/).

## Checklist

### To do

- [ ] Ship offline mode again (Krischan: "I badly need to ship the offline mode"); first pin down what it covered ([open questions](open-questions.md))
- [ ] Versus readability: what each hazard means at a glance, first-match experience ([versus/fuse-and-frost.md](../versus/fuse-and-frost.md))
- [ ] Settle Versus open questions: counter-spike strength, ice threat
- [ ] Port the Versus economy to Dart, checked against vectors from the JS prototype ([versus/README.md](../versus/README.md#path-to-shipping))
- [ ] Decide the Versus server ([decision 0005](../decisions/0005-cloudflare-for-versus.md))
- [ ] Monetization: decide whether to register a business, pick a merchant of record, then build the payments that `kSupportUrl` and the IAP code expect ([open questions](open-questions.md#business))
- [ ] Rewrite or recover the lost design docs, or confirm this wiki replaces them
- [ ] Back up the Android release keystore somewhere other than one drive
- [ ] Real fix for the resume prompt: never save a solved board, then turn `kResumeGameEnabled` back on

### Done

- [x] 2026-10-30 VS: clustered mine landing, defuse-clear bonus, clutch callout, bank of 12, lockout fix; ideas in [PARKED.md](../prototypes/vs-lab/PARKED.md) ([log](../logs/2026-10-30-vs-clusters-and-clutch.md))
- [x] 2026-10-30 VS: rule C (a banked pool freezes you), 4-second idle tick, round log export, flatlining heal heart, poles spaced and rounded like cells, harder Impossible with counter timing, Mirror bot ([log](../logs/2026-10-30-vs-rule-c-idle-tick.md))
- [x] 2026-10-30 VS frame: hearts pole and hazard bar (orange bank, red batch, ice block), fire meter with projectiles, counter-spikes; ice lands in 2 moves and stacks, freeze-over back to 4, batch 6, heal after 4 perfect boards, icebreaker on the last 2 boxes ([log](../logs/2026-10-30-vs-frame-and-counter-spikes.md))
- [x] 2026-10-30 VS rule tweaks: anti-burst, max 2 ice on the way with a board-wide chill instead of a marked cell, freeze-over 3, rush at 100; name is now just "Shikaku+ VS" ([rules](../versus/fuse-and-frost.md))
- [x] 2026-10-30 `work-week/shikaku-plus-copy` made private (Krischan)
- [x] 2026-10-30 Wiki and knowledge base set up in `s-ging/shikaku-plus-info`, with the Versus prototype, archives and the board tool ([log](../logs/2026-10-30-knowledge-base-setup.md))
- [x] 2026-10-29 Versus redesigned as Fuse & Frost; playable lab with five bot presets, 40 tests and simulations ([log](../logs/2026-10-29-versus-rebuild.md))
- [x] 2026-07-05 Blitz went public
- [x] 2026-06 Mosaic soft-retired; domain moved from `shikaku-plus.pages.dev` to `shikaku.plus`

## Blocked on

- Nothing outside Krischan's own time. Versus online play needs a server decision first.

## Known issues

- Support / payments never shipped: `go.shikaku.plus/support` doesn't exist, because no merchant of record would take an unregistered business (Krischan, 2026-10-30).
- The leaderboard layout has never been checked by eye in a running build (its own header says so).
- Hokan Brutal's target scoring doesn't match its code comment.
