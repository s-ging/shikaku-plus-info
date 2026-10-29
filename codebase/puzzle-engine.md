# Puzzle engine: generator, seeds, moves and links

Every board in Shikaku+ is generated on the device from a seed. Nothing is downloaded. The same seed must always produce the same board on every platform (Android, web, desktop) and in both languages (Dart in the app, JavaScript on the landing page), or shared links and the daily puzzle break.

Source: `lib/puzzle_codec.dart` and `lib/daily_puzzle.dart` in the app; `src/lib/puzzle.js`, `src/lib/game.js`, `src/lib/daily.js` and the golden test `src/lib/puzzle.test.js` in the landing repo.

## The random-number generator

A Park–Miller multiplicative generator (`a = 48271`, `m = 2³¹ − 1`) computed with Schrage's method, so every intermediate value stays under 2³¹. That keeps it exact in JavaScript's 53-bit numbers, so `dart2js` on web and the Dart VM on native produce identical sequences.

- `nextInt(bound)` = next state `% bound` (0 if `bound ≤ 1`).
- `nextDouble()` = `(state − 1) / (m − 1)`.
- Seed mapping: `seed % m`, and anything ≤ 0 becomes 1.
- Non-hex seed strings go through djb2 (`h = h × 33 + char`, kept to 31 bits), never `String.hashCode`, which differs between runs and between platforms. This was a real latent bug; both seed-to-integer paths now call `PuzzleCodec.stableSeedHash`.

## How a board is generated

`_makeLayout(size, difficulty, rng)`:

1. `maxArea = max(2, size² × maxAreaFrac × (1 + boost))`, where `boost` grows from 0 at 10×10 to 0.2 at 16×16.
2. Until the board is full: pick a random free cell as the anchor, pick a random horizontal extent through free cells, then a random vertical extent capped so the area stays within `maxArea`. That rectangle becomes one box of the solution.
3. Merge away every 1×1 box into a same-row or same-column neighbour that is one cell thick. If one can't be merged, throw the attempt away.
4. Place each box's clue at a random cell inside it. **The row is drawn before the column.**
5. Up to 100 attempts; after that, a fallback board of full-width rows.

Hokan reuses this layout, then scores the boxes to choose targets (see [game/rulesets.md](../game/rulesets.md#hokan)). The Hokan scoring pass shares the same RNG stream as the layout pass.

### The rule that protects everything

**The exact order and count of random-number calls is the format.** Adding, removing or reordering a single `nextInt` call changes every board after it: old share links open the wrong puzzle, and the app's daily puzzle stops matching the landing page's. The JS port carries a `@ts-nocheck` and a "VERBATIM, do not clean up" warning for this reason. Any new generator feature (like Versus's planned odd-shape boards) must only make new RNG calls behind a parameter that defaults to off, so existing boards stay byte-identical.

The landing repo's `puzzle.test.js` holds golden boards produced by both implementations, for example day 20623. Run it after touching either side. This wiki's [`tools/board.mjs`](../tools/board.mjs) reproduces the same boards.

## Share seeds

A share seed rebuilds a board exactly: `{mode}{size}{difficulty}{checksum}{seed}`.

| Part | Values |
| --- | --- |
| mode | `c` Classic, `s` Hokan |
| size | `6`, `8`, `10`, `12`, `16` |
| difficulty | `e` Easy, `m` Medium, `h` Hard, `b` Brutal |
| checksum | 2 lowercase hex digits: CRC-8/SMBUS (polynomial 0x07, init 0, no reflection, no final XOR) of mode + size + difficulty + seed |
| seed | Usually lowercase hex. Hex is parsed as an integer; anything else goes through djb2 |

Example: the daily puzzle for 2026-06-19 is day 20623 = hex `508f`, a 6×6 Easy Classic board: `c6ef2508f`.

A seed with a wrong checksum is rejected with a clear error rather than silently opening a different board. Random games make a short random hex seed, so every game can be shared.

## Move tokens

One box = 8 uppercase hex characters, `X1 Y1 X2 Y2`, two digits each, zero-based, top-left origin. `00000103` is the box from (0,0) to (1,3). A move list is the tokens joined with nothing between them.

Replay rules (`PuzzleCodec._replayPure`, Classic):

- A token identical to a box already placed **erases** it (that's how an erase is logged).
- Otherwise the box must be valid (exactly one clue, equal to its area). If so, every box it overlaps is removed and it is placed. Invalid tokens are skipped silently.
- Hokan: a box must not overlap an anchor and needs a free target chip of its area.

## Help Me! links

Built in `lib/game_replay.dart`, parsed in `LaunchParams` (`lib/incoming_links.dart`):

```
https://shikaku.plus/?seed=c6ef2508f&moves=0004050400000103&baseCount=2&from=Kris&tag=K7MX2Q&badge=beta
```

| Param | Meaning |
| --- | --- |
| `seed` | Share seed |
| `moves` | Move tokens so far |
| `baseCount` | How many moves the sender had made, so a returned link can mark the hand-off |
| `from`, `tag`, `badge` | The requester's name, player tag and active badge at the time |
| `by`, `bytag`, `bybadge` | The helper's name, tag and badge, on a returned link |

- A clean link (no progress) has only `seed`, `from` and the identity params.
- Links are immutable snapshots: names and badges are what they were when the link was made.
- The receiving app never checks the host, only the query, so links made on the old origin `shikaku-plus.pages.dev` still work. Keep that origin redirecting.
- An older payload form, `seed|moves__user1->user2`, is still decoded by `PuzzleCodec.decode`.

## The daily puzzle

`dailySeedInt = whole days since 1970-01-01 of (now in UTC + 2 hours)`. Adding 2 hours moves the day boundary to 22:00 UTC, which is 06:00 Philippine Time. The board is always 6×6 Easy Classic, seeded with that day number. The landing page's `src/lib/daily.js` implements the same function, so both show the same board at the same moment. Day numbers won't collide until the year 5,882,581.

## Changing anything here

Work mode, with the confirmation gate ([AGENTS.md](../AGENTS.md#confirmation-gate)). Before and after, check: the landing repo's golden test passes; `node tools/board.mjs daily 2026-06-19` still prints the same board; an old Help Me! link still opens the same position.
