> **Archived.** Master spec for the temperature economy, worked out with DeepSeek on 2026-10-29. Superseded by [Fuse & Frost](../fuse-and-frost.md); kept as the record of how Versus got here ([history](../history.md)). Do not build from this file.

# Shikaku+ VS Mode — Master Spec (2026-10-29)

**This is the final collated spec. All contradictions resolved. All gaps filled. Ship to Claude.**

---

## 0. Identity

> A versus puzzle system. You fire "cold" at your enemy. When their temp hits -100, they lose the round. Timed Mines, hot/cold board climate, telegraphed Frozen Cells, and combo-driven recovery create expressive pressure, tanking, thawing, and counterspikes.

**Turn = 1 committed placement.** `tick()` advances both economies once per placement. The "fixed economy clock" is the future server-layer aspiration, not the local implementation.

---

## 1. The Complete Definitions (Locked)

### 1.1 Promise Bar

| Property | Value |
|----------|-------|
| **Opacity** | 30% (`kVsTempPromiseOpacity = 0.30`) |
| **Shows when** | `rawTemp > floor` only (hidden when `rawTemp <= floor`) |
| **Hidden entirely when** | no frozen cells exist |
| **Cold promise** | `#4E647A` |
| **Hot promise** | `#D0B878` |
| **Cold current** | `#8098B0` |
| **Hot current** | `#D08080` |
| **Fader** | white indicator at effectiveTemp position |

**The formula:** `effectiveTemp = frozen.isEmpty ? temp : min(temp, freezeThreshold * frozen.length)`

The promise bar only shows the gap when `raw > floor`. If raw is below the floor, effective equals raw and there's no gap to show.

### 1.2 Freeze Trigger Reads Raw Temp

```dart
bool get isFreezing => temp <= rules.freezeThreshold;  // RAW temp
```

**This prevents the spiral bug.** Frozen cells do not cause more freezing.

| Uses raw temp | Uses effective temp |
|---------------|---------------------|
| Freeze spawning | Loss detection |
| Abandon rule (queue clears when raw climbs above -25) | Promise bar display |
| | Board tint |

### 1.3 Force Break Selection Rule

**Name:** "nearest-to-thaw"

| Priority | Rule |
|----------|------|
| Primary | Lowest thaw points (nearest to melting) |
| Tie-break | Oldest (first in `frozen` list) |
| Final tie | Random |

### 1.4 Turn Definition

- **1 turn = 1 committed placement**
- `tick()` runs once per placement
- Passive decay: -1 per 2 ticks (per 2 placements)
- Bot plays one placement per your placement (`localStep`)

### 1.5 Perfect Clear Definition

**Perfect clear = no do-overs AND minimum placements** (N rects for N givens).

| Event | perfectStreak |
|-------|---------------|
| Perfect clear | `++` (cap at 4 bonus) |
| Do-over (erase/overwrite) | Reset to 0 |
| Non-perfect clear | Reset to 0 |

**Mines sent on clear:** `4 + perfectStreak.clamp(0, 4)` (cap 8)

### 1.6 Win Condition Per Round

- Round ends when one player's `effectiveTemp <= -100`
- FT7 for the match (first to 7 round wins)
- Between rounds: full reset

### 1.7 Mines Do NOT Carry Over

Mines are independent per board. Clearing a board clears your mines. Physically impossible to carry over.

### 1.8 Explosion Behavior

- **Whole rectangle removed** if any cell is in the 3×3 blast
- If multiple rects overlap, all are removed
- Cells become uncovered, player must re-place
- -10 temp per explosion

### 1.9 Mine/Ice Overlap

- First arrival wins, other skips and retries next tick
- `occupied` set checked before any landing

### 1.10 VsBoardSize

- **6x6 only for now** (`s6`). 8x8/10x10 are future.

### 1.11 Bot

- **Parked.** Do not implement bot polish now.

### 1.12 Combo Streak

| Event | streak |
|-------|--------|
| Valid placement | `++` |
| Do-over | Reset to 0 |
| Board clear | **Persists** |
| Every x6 | -2 thaw on nearest cell, +1 mine sent, pause decay 2 turns |

---

## 2. Board Clearing — Complete Behavior

### 2.1 The Flow (In Order)

```
On board clear:

1. Force break ALL blocking frozen cells SEQUENTIALLY
   - One cell per remaining rect
   - Nearest-to-thaw selection
   - Each: +30 temp, +2 mines sent
   - Frozen cells NEVER carry over
   - See §3 for the full process

2. Award clear reward: +15 temp

3. Perfect streak:
   - If no do-overs AND minimum placements: perfectStreak++
   - Else: perfectStreak = 0

4. Send mines immediately:
   - 4 (base) + perfectStreak.clamp(0, 4) → _pendingMinesToSend
   - Plus drain _pendingBonusMines
   - Combine and send

5. Discharge surge bank (bank = 0)

6. Temp carries over (no reset)

7. Combo streak persists

8. Opponent's board untouched (independent)

9. Deal new board from SAME SEQUENCE (next index for you only)

10. Incoming queue: see §2.2
```

### 2.2 Incoming Queue Persistence

- Incoming mine queue **persists across boards**
- Net-cancel still applies (sending while opponent has incoming cancels the wave)
- Any spills (mines that couldn't land before the board swap) **carry over**
- Freeze queue: pending warnings also persist

### 2.3 What Carries Over vs. What Resets

| Item | Behavior |
|------|----------|
| Temp | **Carries over** |
| Frozen cells | **Never** (all force-broken during clear) |
| Mines (on board) | **Cleared** (board is gone) |
| Incoming mine queue | **Persists** (spills carry over) |
| Freeze queue (warnings) | **Persists** |
| Surge bank | **Discharges** on clear |
| Perfect streak | **Persists** |
| Combo streak | **Persists** |
| Opponent's board | **Untouched** |

### 2.4 Same Puzzle Sequence

Both players race the **same puzzle sequence** at independent paces. Being ahead = further along the sequence. The `BOARD COUNT` UI shows this.

---

## 3. The Force Break Process (Final)

This is the tanking/plonking reward. It's sequential, not mass-clear.

### 3.1 The Rule

> If there are N ≥ 1 frozen cells, and N rects remaining with correct placement but unplaced: the **nearest-to-thaw frozen cell** that is blocking a rect breaks, and then you place that rect. Repeat until the last frozen cell and last rect. Each break is a force break.

### 3.2 The Process

```
Given: N frozen cells, N remaining rects (all blocked by ice)

Loop:
  1. Find the nearest-to-thaw frozen cell blocking a remaining rect
  2. Force break it: +30 temp, +2 mines sent
  3. Now that rect is placeable — place it
  4. Repeat

Until: no more frozen cells blocking rects
Then: board clears with all bonuses applied
```

### 3.3 Two Trigger Points

**Trigger A — Solve-Time (`onBoardCleared`):**
- Fires when the board solves (all non-frozen cells covered)
- The sequential loop above runs
- Each frozen cell broken = +30 temp, +2 mines
- Then +15 clear reward
- No carryover

**Trigger B — Anti-Softlock (`checkStuckAndForceBreak`):**
- Fires after each placement when `unplacedGivens <= frozen.length`
- Two-pass solver determines if ice is the sole blocker
- Same sequential break process
- This is what prevents the softlock mid-board

### 3.4 The Two-Pass Solver (Trigger B)

**Pass A:** Solve with frozen cells excluded (real rule)
- Solvable → not stuck, do nothing

**Pass B:** Solve with frozen cells as normal cells
- Also unsolvable → bad routing, do NOT force break
- Solvable → frozen cells are the SOLE blocker → force break

**Break loop:**
```dart
var guard = frozen.length + 1;
bool? passBSolvable;  // computed once

while (frozen.isNotEmpty && guard-- > 0) {
  final passA = solve(excludedCells: frozen);
  if (passA.solvable) break;
  
  passBSolvable ??= solve(excludedCells: {}).solvable;
  if (passBSolvable == false) break;  // bad routing
  
  final target = findBlockingFrozenCell(blockedGivens);  // nearest-to-thaw
  if (target == null) break;
  forceBreakFrozenAt(target);  // +30 temp, +2 mines
  
  blockedGivens = findBlockedGivens(...);
  if (blockedGivens.isEmpty) break;
}
```

### 3.5 The Gate (Trigger B)

```dart
if (unplacedGivens <= frozen.length && frozen.isNotEmpty) {
  // run checkStuckAndForceBreak
}
```

**Why `<=`:** Handles the "2 frozen, 1 unplaced, both blocking" edge case.

### 3.6 BoardCompletionSolver

```dart
static SolveResult solve({
  required int boardN,
  required Map<Cell, int> givens,
  required List<SolverRect> placedRects,
  required Set<Cell> excludedCells,  // frozen in Pass A, empty in Pass B
  required Set<Cell> mineCells,
  int nodeBudget = 20000,
})
```

**DFS + MRV.** Node budget (not wall-clock). 20,000 for 6x6. Typical: <1,000 nodes, <2ms.

---

## 4. Temperature System

### 4.1 Values

| Property | Value |
|----------|-------|
| Range | +100 to -100 |
| Start | 0 |
| Loss | -100 |
| Freeze threshold | -25 |
| Mine land | **-7.5** |
| Mine defuse | +5 |
| Mine explosion | -10 |
| Passive defrost | +15 |
| Active defrost | +25 |
| Force break | +30 |
| Board clear | +15 |
| Placement heat | **0 (removed)** |
| Passive decay | -1 per 2 turns |

### 4.2 The Freeze Floor

```
effectiveTemp = frozen.isEmpty ? temp : min(temp, -25 * frozen.length)
```

| Frozen | Floor |
|--------|-------|
| 0 | raw |
| 1 | -25 |
| 2 | -50 |
| 3 | -75 |
| 4 | -100 = **DEFEAT** |

### 4.3 Loss

```dart
bool get isDefeated => effectiveTemp <= rules.tempMin;
```

---

## 5. Mines

### 5.1 Values

| Property | Value |
|----------|-------|
| Fuse | 3 turns |
| Active cap | 4 |
| Stagger | 2 per turn |
| Incoming turns | 3 |
| Batch size | 4 |
| Landing temp | -7.5 |
| Explosion temp | -10 |
| Explosion effect | Erases whole rects in 3×3 |

### 5.2 Defusal

**Definition:** A committed rectangle covers the mine's cell. Overlap mid-solve does NOT count.

**Reward:** +5 temp

**Attack:** Every 2 defuses → +1 mine sent

### 5.3 Flash

| State | Color | Duration |
|-------|-------|----------|
| Fuse 3 | `#B04040` | 300ms blink |
| Fuse 2 | `#D06060` | 200ms blink |
| Fuse 1 | `#FF4040` | 150ms blink |
| Explosion | White | One-shot |

---

## 6. Frozen Cells

### 6.1 Values

| Property | Value |
|----------|-------|
| Trigger | `temp <= -25` (RAW) |
| Warning steps | 3 → 2 → 1 |
| Landing temp cost | 0 |
| Thaw points | 4 |
| Passive thaw | -1 per 2 turns |
| Active thaw | -2 per placement |
| Combo thaw | -2 at x6 |
| Per-placement cap | 2 |
| Batch cap | 2 (only at `temp <= -50`) |
| Temp floor | Global, -25 × count |

### 6.2 Lifecycle

**Warning:**
- Banks when `_turnsSinceFreezeSpawn >= 2` AND queue not full
- `maxWarnings = (temp <= -50) ? 2 : 1`
- Counts down 3→2→1
- Abandon rule: raw temp > -25 → queue clears

**Landing:**
- At 0, lands on free cell
- **Stagger resets ONLY on landing** (not on queueing)
- Starts at thaw = 4
- White flash

**Thaw:**
| Source | Rate | Reward |
|--------|------|--------|
| Passive | -1 per 2 turns | +15 |
| Active | -2 per placement | +25 |
| Combo | -2 at x6 | +25 |
| Force break | All remaining | +30 |

Stacking capped at 2 per cell per placement via `beginPlacementThaw()`.

---

## 7. Attack System

### 7.1 Send Table

| Action | Mines Sent |
|--------|------------|
| Normal clear | 4 |
| Perfect clear | 4 + perfectStreak (cap 8) |
| 2 defuses | +1 |
| Force break | +2 per cell |
| Combo x6 | +1 |

### 7.2 Two Accumulators

| Accumulator | Purpose |
|-------------|---------|
| `_pendingMinesToSend` | Perfect clear sends |
| `_pendingBonusMines` | Defuse / force break / combo sends |

**Combined at send time:** `pendingMinesToSend + drainPendingBonusMines()`

### 7.3 Combo Decay Pause

Every x6 milestone pauses passive decay for 2 turns.

### 7.4 Net-Cancel

Default `OverflowModel.netCancel`:
- Sending while opponent has incoming cancels the wave
- Net difference passes
- `cancelIncoming(count)` removes from pending bank first, then queue from back
- Never touches landed mines

---

## 8. Board Generation

```dart
Difficulty.vs:
  maxAreaFrac: 0.32
  maxGivens: 10
  oddChance: 0.05
  oddDimLean: 0.15
```

Measured distribution (3000 boards): givens `{4:10, 5:61, 6:156, 7:409, 8:712, 9:867, 10:785}`, max 10.

---

## 9. Implementation Rules

### 9.1 Performance Doctrine

| Rule | Why |
|------|-----|
| `CustomPainter.repaint()` for animations | No widget rebuilds |
| NO `setState()` in tickers | Rebuilds everything |
| NO `ValueListenableBuilder` around engine board | Breaks focus/gestures |
| Node budget (20,000), not wall-clock | Deterministic |

### 9.2 Module Portability

`vs_economy.dart` must stay import-free:
- No Flutter imports
- No app imports
- Redeclare `Cell`, `VsBoardSize`, `SolverRect`, `SolveResult` locally

### 9.3 Event System

Every mutation returns `List<EconomyEvent>`:
- `'mineLand'`, `'mineExplode'`, `'mineFuseFinal'`, `'defuse'`
- `'freezeWarn'`, `'frozen'`, `'thaw'`, `'thawPulse'`
- `'comboThaw'`, `'combo'`, `'comboAttack'`
- `'forceBreak'`, `'clear'`, `'loss'`, `'surge'`, `'mineEnqueued'`

### 9.4 Anti-Patterns

| Don't | Why |
|-------|-----|
| `setState()` in ticker | Rebuilds engine |
| `ValueListenableBuilder` around board | Breaks input |
| Stagger reset on queueing | Chain freezing |
| Gate `==` for force break | Misses edge cases |
| Pass B before Pass A | Wastes compute |
| Flutter imports in `vs_economy.dart` | Breaks portability |
| Mine defuse thaws ice | Separate systems |
| Break-all-at-once force break | Sequential, one per rect |

---

## 10. Data Flow

```
Player places rect
  → game.dart commits
  → vs_screen._onYouRectCommitted
    → _match.localStep(youFree, themFree)
      → you.tick(freeCells)
      → them.tick(freeCells)
    → _match.localComboPlacement()
      → you.comboPlacement()
      → sends bonus mines
    → _match.localCheckStuckAndForceBreak(...)
      → two-pass solver
      → sequential force break
    → _pushYouHazards()
    → _match.onEvents fires
      → flash/shatter/blink
```

---

## 11. Open Items (Not Blocking)

| Item | Status |
|------|--------|
| Bot difficulty | Parked |
| Tutorial | Not built |
| Colyseus server | Not started |
| QQ / MegaRooms | Long-term |
| All `VsRules` as toggles | Future |
| Force break board spawns frozen if temp low | Future idea |
| 8x8 / 10x10 boards | Future |

---

## 12. The Verification Quiz (For Another LLM)

Before writing code, another LLM must answer these correctly:

1. What is `effectiveTemp`?
2. Does `isFreezing` read raw or effective?
3. What is the force break selection rule?
4. Is force break sequential or all-at-once?
5. What is the gate for anti-softlock?
6. What does Pass A vs Pass B mean?
7. Do frozen cells carry over on clear?
8. Does temp carry over on clear?
9. What is a perfect clear?
10. Does the perfect streak reset on board clear?
11. What is the mine landing temp cost?
12. What happens to incoming queue on clear?
13. Does the combo streak persist across boards?
14. What is the promise bar trigger?
15. Should animations use `setState()`?
16. Should `vs_economy.dart` import Flutter?
17. What is a "turn"?
18. What happens to placed rects in a 3×3 explosion?
19. Can a mine land on a frozen cell?
20. How many mines does force break send?

---

**End of master spec. 2026-10-29.**

**Ship this to Claude. All contradictions resolved. All gaps filled.**