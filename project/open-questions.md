# Open questions

For Krischan. Move each answer into the page where it belongs, then delete the question here.

## Product

- **Offline mode:** what did the lost work cover? The current app already boots and plays without a network (sign-in is best-effort, puzzles are generated locally). Was it about accounts, sync queues, the Android build, something else?
- **Versus pool freezing:** should a backed-up mine pool slowly freeze cells, as in the original rulebook?
- **Versus balance:** ice decides about 75% of KOs in simulations. Is that the intended feel, or should mines matter more?
- **Versus launch shape:** bots first, friends-only rooms, or matchmaking?
- **Hokan Brutal:** should it prefer odd elongated shapes as its comment says? Changing it changes every Brutal Hokan board.

## Tech

- **`go.shikaku.plus/support`:** the app links there (`kSupportUrl`), but the landing repo has no `/support` route or redirect file. Is there a Cloudflare redirect, or does it 404?
- **Versus server:** Cloudflare Durable Objects or Colyseus? ([decision 0005](../decisions/0005-cloudflare-for-versus.md))
- **Lost docs:** rewrite `DESIGN_SYSTEM.md` and `KEYBOARD_NAV.md` in the app repo, or let this wiki stand in for them?
- **Release keystore:** is it backed up off-device?
- **Authorship:** who writes and signs entries in this wiki besides Krischan?
