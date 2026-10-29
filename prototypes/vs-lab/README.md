# Shikaku+ VS Lab

Playable prototype of Shikaku+ VS mode. The current ruleset is **Shikaku+ VS** (design name Fuse & Frost, hence the `ff` file names) ([versus/fuse-and-frost.md](../../versus/fuse-and-frost.md)): `src/fusefrost.js` + `src/ffmatch.js`, UI in `src/ffpage.html` + `src/ffapp.js`, tests in `test/fusefrost.test.js`, sim in `test/ffsim.js`. `node build.mjs` produces `dist/shikaku-vs-lab.html` (Fuse & Frost) and `dist/temperature-lab.html` (the original temperature economy, kept for reference).

**Ideas from play-testing**, built and parked: [PARKED.md](PARKED.md).

The rest of this README describes the original temperature prototype, built from the [temperature handoff](../../versus/archive/2026-10-29-temperature-handoff.md). It is a separate codebase; it never touches `shikaku-plus` or `shikaku-plus-landing`.

## Files

| File | What it is |
|---|---|
| `src/puzzle.js`, `src/game.js` | Copied unchanged from `shikaku-plus-landing/src/lib`. Generator + Shikaku rules. |
| `src/economy.js` | The VS economy. Import-free, returns events. Meant to run as-is in a Cloudflare Durable Object and be translated line-for-line to `vs_economy.dart`. |
| `src/match.js` | Turn loop, mine routing, explosions, clears, FT7 rounds, and the replay bot. |
| `src/page.html`, `src/app.js` | The lab UI. |
| `test/economy.test.js` | 24 edge-case tests from handoff §9. |
| `test/sim.js` | Headless bot-vs-bot matches for balance readouts. |
| `build.mjs` | Bundles everything into `dist/shikaku-vs-lab.html` (one self-contained page). |

## Run

```
node --test test/*.test.js   # edge cases
node test/sim.js             # balance readout, both clocks (temperature economy)
node test/ffsim.js           # Shikaku+ VS balance readout
node build.mjs               # rebuild the artifact page
```

Node 18+; no dependencies. In the page's browser console, `vsLab.match` exposes live state.

## Interpretations where the spec was silent

- **Net-cancel:** your sends cancel mines incoming to *you* first; the rest passes to the opponent (Tetris-style).
- **Force break:** a clue is blocked when every rect that could still finish the board for it contains ice. The gate `unplaced <= frozen` is provably safe: k fully blocked clues need at least k distinct ice cells, since their rects are disjoint.
- **Ice at clear** can't happen (clue areas sum to 36), so the on-clear break is a defensive no-op.
- **Ice and mines may land on clue cells.**
- **Explosion re-placements** don't count against the perfect streak; a perfect clear is simply a board with no do-overs.
- **Surge** only discharges what was banked before the current tick, so a 4-mine batch still lands as 2 + 2.
- **Promise bar** is drawn as a hatched band over the current fill so it stays visible when raw temp sits between the floor and 0.
- **VS generator:** `maxGivens` is enforced by re-seeding (Classic generator untouched). `oddChance` / `oddDimLean` are not reimplemented; the original algorithm was lost.

## Additions not in the spec (all off by default or lab-only)

- Real-time clock mode (fixed tick + bot moves/sec), beside the spec's per-move clock.
- Margin time: attack multiplier after N ticks.
- Lab sliders for every `VsRules` value.

## Balance findings (test/sim.js)

- With **net-cancel**, two equally good players never lose: 100% of even rounds stall. Clears cancel each other's mines and each clear adds +15°.
- **Passthrough** ends even rounds in ~50–56 ticks.
- **Margin time** (from tick 60, +25% per 10 ticks) with net-cancel still stalls 18% of even rounds; the rest take a median of ~690 ticks.
- Per-move clock removes speed as a factor; only efficiency matters. Skill gaps resolve quickly (strong vs weak: ~51 ticks).
