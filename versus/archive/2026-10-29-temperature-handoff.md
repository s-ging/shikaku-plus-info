> **Archived.** Consolidated temperature-economy handoff written in Claude on 2026-10-29, before the switch to Fuse & Frost the same day. Superseded by [Fuse & Frost](../fuse-and-frost.md); kept as the record of how Versus got here ([history](../history.md)). Do not build from this file.

# Shikaku+ VS Mode — Handoff for Claude Code (2026-10-29)

Self-contained. Everything decided so far lives here: the master spec, the surge definition, and the decisions made on 2026-10-29. If something conflicts with older handoff packages, this doc wins.

---

## 0. Ground rules (read first)

1. **Never alter `s-ging/shikaku-plus` or `s-ging/shikaku-plus-landing`.** Read only. No commits, branches, PRs, or pushes to either. Work happens in a separate repo.
2. **Push from day one.** VS mode was lost once to a dead drive with no remote. Commit and push every session.
3. **Chesterton's fence:** don't remove, rename, or "clean up" anything without knowing why it exists; ask first.
4. **Pareto:** highest-leverage ~20% first (economy + tests), no polish while the core path is open.
5. **Account is shared:** ask who is typing before authoring commits, logs, or "Authored by" lines.

## 1. Plan

1. **Prototype first, as a web artifact** (plain JS), not in Flutter.
   - `economy.js` — pure, import-free, every mutation returns events. Mirrors the future `vs_economy.dart`.
   - Edge-case tests derived from this doc (§9).
   - One playable page: your board (real engine), bot board, temp bars with promise layer, mine/freeze queues, event log, dev panel exposing every `VsRules` value as a slider.
2. **Server:** likely Cloudflare Durable Objects instead of Colyseus (one object per match, WebSockets, authoritative). The same `economy.js` runs there unchanged. Can verify the existing Supabase session for accounts.
3. **Flutter port last:** translate `economy.js` to `vs_economy.dart` and check it against test vectors emitted by the JS version, the same way `puzzle.js` was verified against `puzzle_codec.dart`.

## 2. What survives and where

- **`shikaku-plus-landing/src/lib/puzzle.js`** — byte-faithful JS port of `puzzle_codec.dart` (Park–Miller LCG, `makeLayout`). `puzzle.test.js` has golden vectors emitted by both. `generatePuzzle(sz, frac, seed)` returns `{ nums, layout }` — the layout is the solution, which the bot uses. Reuse unchanged (copy, don't edit in place).
- **`shikaku-plus-landing/src/lib/game.js`** — `verifyRect` (exactly one clue, clue == area), `commit` (tap = erase; drag places and removes overlapped rects; invalid rects refused), `isSolved`. Reuse unchanged.
- **`shikaku-plus` (Flutter app)** — alive, pre-VS. No VS code or engine seams exist. Engine is split across `game.dart`, `game_drag.dart`, `game_history.dart`, `game_state_core.dart`, etc. `puzzle_codec.dart` has Classic difficulties only (easy/medium/hard/brutal), `BoardSize` s6–s16. Backend is Supabase; Mosaic multiplayer rooms already exist there.
- **Lost:** all VS code, including the VS generator parameters and their odd-shape algorithm.

### Generator rule (why it exists)
Any new Rng call in the generator shifts every later board, breaking the golden vectors and the daily-puzzle parity between landing page and app. **All VS-only generator logic must sit behind `if (param > 0)` gates** so Classic output is byte-identical.

VS target params: `maxAreaFrac 0.32`, `maxGivens 10` (retry-reject above), `oddChance 0.05`, `oddDimLean 0.15`. Original odd-shape algorithm is lost; tune a reimplementation against the measured distribution (3000 boards): givens `{4:10, 5:61, 6:156, 7:409, 8:712, 9:867, 10:785}`, max 10.

---

## 3. Core definitions

- **Identity:** a versus puzzle. You send "cold" at the opponent; a round ends when one player's effective temp hits −100. Timed mines, hot/cold climate, telegraphed frozen cells, combo-driven recovery.
- **Turn = 1 tick.** Ticks on every committed placement **and** every erase that removes a rect. Tapping an empty cell (no change) does not tick. Both economies tick once per turn; the bot plays one move per your move.
- **Board:** 6×6 only for now.
- **Match:** FT7 (first to 7 round wins). Full reset between rounds.
- **Same sequence:** both players race the same seeded board sequence (match seed + board index) at their own pace. Board count shows who's ahead.

## 4. Temperature

| Property | Value |
|---|---|
| Range / start | +100 to −100 / 0 |
| Loss | effective temp ≤ −100 |
| Freeze threshold | −25 |
| Mine land | −7.5 |
| Mine defuse | +5 |
| Mine explosion | −10 |
| Passive thaw-out | +15 |
| Active / combo thaw-out | +25 |
| Force break | +30 |
| Board clear | +15 |
| Placement heat | 0 (removed) |
| Passive decay | −1 per 2 turns |

**Freeze floor:** `effectiveTemp = frozen.isEmpty ? temp : min(temp, -25 * frozen.length)`. 4 frozen = −100 = defeat.

**Raw vs effective:**
- Raw temp drives freeze spawning, the batch cap, and the abandon rule (prevents the death spiral).
- Effective temp drives loss detection, the promise bar, and board tint.

**Promise bar:** shows only when raw > floor (gap between raw and effective). Hidden with no frozen cells or raw ≤ floor. Promise opacity 0.30. Cold promise `#4E647A`, hot promise `#D0B878`, cold current `#8098B0`, hot current `#D08080`, white fader at effective temp.

## 5. Mines

| Property | Value |
|---|---|
| Fuse | 3 turns |
| Active cap | 4 on board |
| Stagger | 2 land per turn |
| Incoming ETA | 3 turns |
| Batch size | up to 4 |

**Lifecycle:** incoming mines bank in `_pendingMines` → when the queue is empty, up to 4 form a `MineBatch` with eta 3 → eta counts 3→2→1 → at 0, land on free (uncovered, not iced, not mined) cells → fuse 3→2→1 → at 0, explode.

**Defusal:** a committed rect covers the mine's cell (mid-drag overlap doesn't count). +5 temp. Every 2 defuses → +1 mine sent. Defusing never thaws ice.

**Explosion:** −10 temp. Every placed rect with any cell inside the 3×3 blast is removed whole. Explosions do **not** break the perfect or combo streak (you lose tempo, not streaks).

**Flash:** fuse 3 `#B04040` 300ms blink, fuse 2 `#D06060` 200ms, fuse 1 `#FF4040` 150ms, explosion white one-shot.

**Mine/ice overlap:** first arrival wins; the other skips and retries next tick.

### 5.1 Surge (overflow)
Mines that can't land (cap hit, no free cells, stagger exceeded) go to a hidden `bank` instead of vanishing. Each tick, up to `surgeAbsorptionCap` (3) discharge from the bank back through landing, emitting a board-level `'surge'` event first (no cell). Makes big attacks multi-turn and reactable.

**Open, exposed as dev toggles (decide by playtest):**
- Discharged mines pass through landing, which caps at 2/turn, so an absorption cap of 3 never bites. Either stagger applies only to batch landings, or one number is dead.
- §6 says spills carry over a clear; the surge definition says `bank` is zeroed on clear. Toggle: zero vs carry.

## 6. Frozen cells

| Property | Value |
|---|---|
| Trigger | raw temp ≤ −25 |
| Warning | queue-only, 3→2→1 |
| Landing cost | 0 temp |
| Thaw points | 4 |
| Passive thaw | −1 per 2 turns (+15 on thaw-out) |
| Active thaw | −2 per placement whose rect shares an edge with the cell (+25) |
| Combo thaw | −2 at every x6 (+25) |
| Per-placement cap | 2 per cell (`beginPlacementThaw`) |
| Warnings in flight | 1, or 2 when raw ≤ −50 |

- Warning banks when `_turnsSinceFreezeSpawn >= 2` and the queue isn't full.
- **Abandon:** raw temp climbs above −25 → freeze queue clears.
- **Stagger resets only on landing, never on queueing** (resetting on queue causes back-to-back freezes).
- A cell that landed this tick is skipped for passive thaw.

## 7. Force break

**Selection ("nearest-to-thaw"):** lowest remaining thaw points → oldest → random. Sequential, one cell at a time, never break-all.

**Reward per cell:** +30 temp, +2 mines sent.

**Anti-softlock (the real trigger):** after each turn, if `frozen.isNotEmpty && unplacedGivens <= frozen.length`:
- Pass A: solve with frozen cells excluded. Solvable → do nothing.
- Pass B (computed once): solve with frozen cells as normal. Unsolvable → bad routing, do nothing.
- Otherwise break the nearest-to-thaw cell that blocks a given, recompute, repeat (guard = frozen.length + 1).

**At clear:** ice can't exist when a board clears. Every placed rect holds exactly one clue equal to its area and clues sum to 36, so placing every clue covers every cell, and an iced cell can't be covered. Keep the on-clear break only as a defensive no-op; ice is ephemeral board state, temp is durable.

**Solver:** `BoardCompletionSolver.solve({boardN, givens, placedRects, excludedCells, mineCells, nodeBudget = 20000})`. DFS + MRV. Node budget, never wall-clock (deterministic, testable). Typical <1,000 nodes.

## 8. Attack, streaks, clears

| Action | Mines sent |
|---|---|
| Clear | 4 + perfectStreak (cap 8 total) |
| 2 defuses | +1 |
| Force break | +2 per cell |
| Combo x6 | +1 |

- **Perfect clear:** no do-overs and minimum placements (N rects for N clues). Perfect → streak++; otherwise streak = 0. Explosion-forced re-placements don't count against it.
- **Combo:** +1 per valid placement; reset by a do-over (erase/overwrite); persists across boards; not reset by explosions. Every x6: −2 thaw on the nearest-to-thaw cell, +1 mine, pause passive decay 2 turns. `breakCombo()` no longer sends mines.
- **Accumulators:** `_pendingMinesToSend` (clear sends) + `_pendingBonusMines` (defuse/force break/combo), combined at send time.
- **Overflow model:** `netCancel` (default) — sending while you have incoming cancels it, net passes; `cancelIncoming` removes from pending first, then queued batches from the back, never landed mines. `passthrough` as an alternative toggle.

**On clear, in order:** +15 temp → perfect streak update → send mines (clear + drained bonus) → surge bank per toggle → deal next board in the sequence. Temp, combo, perfect streak, incoming queue and freeze warnings carry over. Mines on board vanish with the board. Opponent's board is untouched.

## 9. Edge cases to test first

- Force break: 2 frozen/2 unplaced both blocked → 2; one blocked → 1; 2 frozen/1 unplaced both blocking → 2; 1/1 blocked → 1; 1/1 not blocked → 0; Pass B fails → 0.
- Freeze cadence: raw −25..−49 → 1 warning; ≤ −50 → 2; raw rises above −25 → queue clears; queueing doesn't reset stagger; landing does; a second warning during stagger is blocked.
- Thaw: active + combo same placement capped at 2; landed-this-tick skipped; last cell thawed releases the floor.
- Temp: no ice → effective = raw; ice with raw above floor → effective = floor; raw below floor → effective = raw.
- Mines: lands on occupied → banks; fuse 1 emits `mineFuseFinal`; fuse 0 emits `mineExplode` −10; 4 arriving with stagger 2 → 2 land, 2 bank.
- Attack: streak caps at 8; do-over resets streak; 2 defuses → +1; force break → +2; x6 → +1 and decay pause; net-cancel cancels incoming.

## 10. Events

`mineEnqueued`, `mineLand`, `mineFuseFinal`, `mineExplode`, `defuse`, `surge`, `freezeWarn`, `frozen`, `thaw`, `thawPulse`, `comboThaw`, `combo`, `comboAttack`, `forceBreak`, `clear`, `loss`.

## 11. Flutter rules (for the port later)

- Animations via `CustomPainter.repaint()`. Never `setState()` in a ticker, never wrap the engine board in `ValueListenableBuilder`/periodic rebuilds (breaks focus and gestures).
- `vs_economy.dart` stays import-free (no Flutter, no app imports); redeclare `Cell`, `VsBoardSize`, `SolverRect`, `SolveResult` locally.
- Engine seams to add to `game.dart`: `isRectBlocked` (refuse rects over ice), `isCellExempt`, `onSolved`, `onEraseHandleReady` (live rect list).
- Shatter only on your board: intensity 1.0 for force break, 0.25 for thaw.
- Stick with CustomPainter, not Flame.

## 12. Parked

Bot difficulty tuning, tutorial, server implementation, 8×8+/larger boards, all `VsRules` as in-game toggles (the dev panel is the first step), QQ/MegaRooms.

---

## 13. Prototype (VS Lab, 2026-10-29)

Built in chat: playable artifact "Shikaku+ VS Lab" plus source (`shikaku-vs-lab-src.zip`: `economy.js`, `match.js`, 24 edge-case tests, bot-vs-bot sim, build script). See its README for interpretations where this spec was silent (net-cancel cancels your own incoming first; ice/mines may land on clue cells; surge only discharges pre-tick bank; maxGivens via re-seed, odd shapes not reimplemented).

**Balance findings (bot-vs-bot):**
- Net-cancel: even players never lose (100% of even rounds stall); clears cancel each other and +15° per clear outpaces decay.
- Passthrough: even rounds end in ~50–56 ticks.
- Margin time (new, off by default; Tetris/TETR.IO-style attack multiplier) with net-cancel: 18% still stall, the rest take ~690 ticks.
- Per-move clock removes speed as a factor. The lab also offers a real-time clock (fixed tick + bot moves/sec).

Open decision: overflow model and clock mode, to be settled by playtesting in the lab.
