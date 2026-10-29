# Roadmap

What Krischan has said he wants, roughly in order. Not a schedule.

## Near term

1. **Offline mode back.** Lost with the drive; Krischan's top practical need as of 2026-10-30.
2. **Versus: Fuse & Frost.** Play-test the lab, fix readability, port to Dart, ship. Start with a bot opponent if online play needs longer. The PreVS badge already promises it to registered players. See [versus/README.md](../versus/README.md#path-to-shipping).
3. **Versus server on Cloudflare** rather than a rented Colyseus VM ([decision 0005](../decisions/0005-cloudflare-for-versus.md), proposed).

## Later, as stated

- **Every Versus rule as an in-game toggle** (custom lobbies), as the lab already does with sliders.
- **Spicy mines:** row, column and diagonal blasts as rare attacks.
- **Bigger Versus boards:** 8×8 and 10×10, with the odd-shape generator (`maxGivens 10`, `oddChance 0.05`, `oddDimLean 0.15`) rebuilt behind parameters that leave Classic boards unchanged.
- **Queue modes and large rooms** ("QQ", "MegaRooms"), long term.
- **Tekazu launch:** built and badged, waiting on its gate.
- **Deep analytics as a premium feature:** the hidden per-solve data is collected for this.

## Parked

- **Mosaic:** retired June 2026, fully preserved; one flag brings it back.
- **The temperature Versus economy:** replaced; archived in [versus/archive/](../versus/archive/).
