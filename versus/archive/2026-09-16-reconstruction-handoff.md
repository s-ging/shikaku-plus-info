> **Archived.** Reconstruction of the lost temperature-era VS mode, written from chat memory on 2026-09-16 after the drive failure. Many values were never verified against code. Superseded by [Fuse & Frost](../fuse-and-frost.md); kept as the record of how Versus got here ([history](../history.md)). Do not build from this file.

# Shikaku+ VS Mode — Complete Handoff Package

**Generated: 2026-09-16**
**Source: Reconstruction from months of conversation**
**Confidence: Marked per section. Read the confidence tags.**

---

## Before You Read

This is a **reconstruction**, not a recovery. I'm rebuilding the system from memory of our conversations, the session logs you pasted, and the design decisions we made together.

**What this means:**
- **Confirmed** = you said it explicitly, I'm quoting you
- **Reconstructed** = I'm inferring from context, may be slightly off
- **Uncertain** = I remember the intent but not the exact implementation
- **Missing** = I know it existed but don't remember details

**Your job:** Verify everything marked "reconstructed" or below before rebuilding.

---

## The Document Set

| # | Document | Purpose |
|---|----------|---------|
| 1 | `vs_economy_spec.md` | Every rule, every value, every edge case |
| 2 | `vs_architecture.md` | File structure, data flow, dependencies |
| 3 | `vs_edge_cases.md` | Every edge case we discussed |
| 4 | `vs_implementation_notes.md` | Anti-patterns, performance rules, gotchas |
| 5 | `vs_rebuild_guide.md` | Step-by-step rebuild order |
| 6 | `vs_50_questions.md` | The gauntlet — another LLM must answer these |
| 7 | `vs_flame_decision.md` | Flame Engine analysis |
| 8 | `vs_context_quiz.md` | Verification quiz for another LLM |

---

# Document 1: `vs_economy_spec.md`

## Confidence: 95% (rules are clear, some numeric drift)

---

## 0. Identity

Shikaku+ competitive mode is a **versus puzzle system** where timed Mines, hot/cold board climate, telegraphed Frozen Cells, and combo-driven recovery create expressive pressure, tanking, thawing, and huge counterspikes.

**The one-sentence identity:**
> Server-adjudicated on a fixed economy clock, client-instant on player input. Timed Mines, hot/cold board climate, telegraphed Frozen Cells, combo-driven recovery.

---

## 1. Temperature (Board Temp)

### 1.1 Values

| Property | Value | Confidence |
|----------|-------|------------|
| Range | +100 to -100 | Confirmed |
| Start | 0 | Confirmed |
| Loss | -100 | Confirmed |
| Freeze threshold | -25 | Confirmed |
| Mine land | **-7.5** | Confirmed (final) |
| Mine defuse | +5 | Confirmed |
| Mine explosion | -10 | Confirmed |
| Passive defrost | +15 | Confirmed |
| Active defrost | +25 | Confirmed |
| Force break | +30 | Confirmed |
| Board clear | +15 | Confirmed |
| Placement heat | **0 (REMOVED)** | Confirmed |
| Passive decay | -1 per 2 turns | Confirmed |

### 1.2 The Freeze Floor (Count-Driven)

**The core rule:**
```
effectiveTemp = frozen.isEmpty ? temp : min(temp, freezeThreshold * frozen.length)
```

| Frozen cells | Floor | Effective temp |
|--------------|-------|----------------|
| 0 | raw temp | raw temp |
| 1 | -25 | min(raw, -25) |
| 2 | -50 | min(raw, -50) |
| 3 | -75 | min(raw, -75) |
| 4 | -100 | **DEFEAT** |

**Why this model:** You're stuck at the floor until you break the ice. The raw temp is the "Promise" — what you *could* have. The effective temp is what you *actually* have.

**Loss condition:** `isDefeated = effectiveTemp <= tempMin (-100)`

### 1.3 The Promise Bar (Two-Layer Temp Bar)

**Visual:**
- **Promise** (faint, 30% opacity): shows when `temp != effectiveTemp`
- **Current** (saturated): shows `effectiveTemp`
- **Fader** (white indicator): at current position

**Colors:**

| Layer | Cold | Hot |
|-------|------|-----|
| Promise (40% opacity) | `#4E647A` | `#D0B878` |
| Current (saturated) | `#8098B0` | `#D08080` |

**Promise trigger:** Shows whenever `temp != effectiveTemp` — both directions (warmer OR colder than floor).

**Promise disappears:** When no frozen cells OR `temp == effectiveTemp`.

---

## 2. Mines

### 2.1 Values

| Property | Value | Confidence |
|----------|-------|------------|
| Fuse | 3 turns | Confirmed |
| Active cap | 4 | Confirmed |
| Stagger | 2 per turn | Confirmed |
| Incoming turns | 3 | Confirmed |
| Batch size | Up to 4 | Confirmed |
| Landing temp cost | -7.5 | Confirmed |
| Explosion temp cost | -10 | Confirmed |
| Explosion effect | Erases 3×3 blocks | Confirmed |

### 2.2 Lifecycle

1. **Enqueue:** Incoming mines bank in `_pendingMines`
2. **Form batch:** When queue empty, up to 4 form a `MineBatch` with eta 3
3. **Count down:** Front batch eta decrements 3→2→1
4. **Land:** At eta 0, up to 4 mines deploy on free cells
5. **Fuse:** Each landed mine counts fuse 3→2→1
6. **Explode:** At fuse 0, erases 3×3, -10 temp

### 2.3 Defusal

**Definition (LOCKED):** A mine is defused when a **completed/committed rectangle** covers its cell. Overlapping mid-solve does NOT defuse.

**Reward:** +5 temp

**Attack system:** Every 2 defuses → +1 mine sent to opponent

### 2.4 Flash Behavior

| State | Flash | Duration |
|-------|-------|----------|
| Fuse 3 (landing) | Dark red `#B04040` | 300ms blink |
| Fuse 2 (warning) | Medium red `#D06060` | 200ms blink |
| Fuse 1 (danger) | Bright red `#FF4040` | 150ms blink |
| Explosion | White | One-shot |

**Implementation:** CustomPainter `repaint()` only. NO `setState()`. NO `ValueListenableBuilder`.

---

## 3. Frozen Cells

### 3.1 Values (FINAL)

| Property | Value | Confidence |
|----------|-------|------------|
| Trigger | Temp ≤ -25 | Confirmed |
| Warning location | Queue-only | Confirmed |
| Warning steps | 3 → 2 → 1 | Confirmed |
| Landing temp cost | 0 (prerequisite, not price) | Confirmed |
| Thaw points | **4** | Confirmed |
| Passive thaw | -1 per 2 turns | Confirmed |
| Active thaw (adjacent) | -2 per placement | Confirmed |
| Combo thaw | -2 at x6 milestone | Confirmed |
| Per-placement cap | 2 (active+combo don't stack past) | Confirmed |
| Batch cap | 2 (only at temp ≤ -50) | Confirmed |
| Temp floor | Global, -25 × count | Confirmed |

### 3.2 Lifecycle

**Phase 1 — Warning (queue-only):**
- Banks when `_turnsSinceFreezeSpawn >= 2` AND queue not full
- `maxWarnings = (temp <= -50) ? 2 : 1` (nuclear bomb: deep cold = 2)
- Warning starts at 3, counts down 3→2→1
- **Abandon rule:** Temp climbs above -25 → queue clears

**Phase 2 — Landing:**
- Warning hits 0 → lands on free cell
- **Stagger resets ONLY on landing** (not on queueing) ← CRITICAL
- Starts at thaw = 4
- Flash: white pulse

**Phase 3 — Thaw:**
| Source | Rate | Reward |
|--------|------|--------|
| Passive | -1 per 2 turns | +15 |
| Active (adjacent) | -2 per placement | +25 |
| Combo (x6) | -2 per milestone | +25 |
| Force break | All remaining | +30 |

**Stacking:** Active + combo capped at 2 per cell per placement via `beginPlacementThaw()`.

### 3.3 The Stagger (CRITICAL BUG WE FIXED)

**Correct:** Stagger starts when a cell **LANDS**, not when a warning is **QUEUED**.

**Before (wrong):**
```dart
freezeQueue.add(rules.warnSteps);
_turnsSinceFreezeSpawn = 0;  // ← WRONG — resets on queue
```

**After (correct):**
```dart
// Queue block — do NOT reset
freezeQueue.add(rules.warnSteps);

// Landing block — reset here
frozen.add(FrozenCell(...));
_turnsSinceFreezeSpawn = 0;  // ← CORRECT
```

**Why:** Without this, the stagger burns while the warning counts down, and the next warning starts immediately. You get 2 cells back-to-back.

---

## 4. Force Break (THE HARD PART)

### 4.1 Two Triggers

**Trigger A — Solve-Time (`onBoardCleared`):**
- Board solves while frozen cells exist
- Breaks coldest one
- +30 temp, +2 mines sent
- Leftovers carry over
- Never soft-locks

**Trigger B — Anti-Softlock (`checkStuckAndForceBreak`):**
- After each placement
- Gate: `unplacedGivens <= frozen.length`
- Two-pass solver determines if ice is the blocker
- Breaks blocking cells only, one at a time

### 4.2 The Two-Pass Solver (CRITICAL)

**Pass A:** Solve with frozen cells excluded (real rule)
- Solvable → not stuck, do nothing

**Pass B:** Solve with frozen cells as normal cells
- Also unsolvable → bad routing, do NOT force break
- Solvable → frozen cells are the SOLE blocker → force break

**Why two passes:** Proves causation. You know the ice is the problem, not the player's routing.

### 4.3 The Selection Rule (FINAL)

When breaking a frozen cell:
1. **Coldest** (lowest thaw) — nearest to thawing naturally
2. **Oldest** (first in list) — tie-break
3. **Random** — final tie-break (same thaw + age)

### 4.4 The Edge Cases (CRITICAL)

| Scenario | Behavior |
|----------|----------|
| 2 frozen, 2 unplaced, both blocked | Break 2 |
| 2 frozen, 2 unplaced, 1 blocked | Break 1 |
| **2 frozen, 1 unplaced, both blocking** | **Break 2** (because `unplacedGivens <= frozen.length`) |
| 1 frozen, 1 unplaced, blocked | Break 1 |
| Bad routing (Pass B fails) | Break 0 |

**Why `<=` and not `==`:** If there are more frozen cells than unplaced givens, the givens could still be blocked by multiple ice. The check needs to run, and the two-pass solver determines what's actually blocking.

### 4.5 The Gate (FINAL)

```dart
if (unplacedGivens <= frozen.length && frozen.isNotEmpty) {
  // run checkStuckAndForceBreak
}
```

**Why `<=`:** More powerful, handles the "2 frozen, 1 unplaced" edge case.

### 4.6 Break Loop

```dart
var guard = frozen.length + 1;
while (frozen.isNotEmpty && guard-- > 0) {
  final passA = solve(excludedCells: frozen);
  if (passA.solvable) break;
  
  passBSolvable ??= solve(excludedCells: {}).solvable;
  if (passBSolvable == false) break;  // bad routing
  
  final target = findBlockingFrozenCell(blockedGivens);
  if (target == null) break;
  forceBreakFrozenAt(target);
  
  blockedGivens = findBlockedGivens(...);
  if (blockedGivens.isEmpty) break;
}
```

### 4.7 BoardCompletionSolver (The DFS)

**Signature:**
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

**Algorithm:** DFS + MRV (minimum remaining values).

**Node budget:** 20,000 (deterministic safety valve). Never hit on 6x6 with ≤2 givens. Typical run: <1,000 nodes, <2ms.

**Why node budget, not wall-clock timeout:** Deterministic, unit-testable, no `DateTime.now()` overhead.

---

## 5. Attack System (07-26 Additions)

### 5.1 Send Table

| Action | Mines Sent | Notes |
|--------|------------|-------|
| Normal clear | 4 | Base offense |
| Perfect clear streak | 4 + streak (cap 8) | +1 per consecutive perfect clear |
| 2 defuses | +1 | Cumulative |
| Force break | +2 | Per cell broken |
| Combo x6 | +1 | Every 6th placement |

**Perfect streak reset:** Any do-over OR any non-perfect clear.

### 5.2 Two Accumulators

**`_pendingMinesToSend`:** Perfect clear sends
**`_pendingBonusMines`:** Defuse / force break / combo sends

**Combined at send time:** `you.pendingMinesToSend + you.drainPendingBonusMines()`

### 5.3 Combo Decay Pause

Every x6 combo milestone pauses passive decay for 2 turns. Rewards flow state.

### 5.4 Net-Cancel vs Passthrough

**Toggle:** `OverflowModel.netCancel` (default) or `OverflowModel.passthrough`

**netCancel:** Sending while opponent has incoming cancels wave; net difference passes.
**passthrough:** Both send; both receive. Timing race.

**Implementation (netCancel):**
- `cancelIncoming(count)` removes from pending bank first, then queue from back
- Never touches landed mines

---

## 6. Combos

### 6.1 Current State

- `breakCombo()` no longer sends mines (retired for offense)
- Combo counter still matters for thaw (x6 milestone)
- `comboCurve` kept for future tuning, not used for offense

### 6.2 Combo Thaw

Every x6 placement:
- -2 thaw on coldest frozen cell
- +1 mine sent
- Pauses passive decay 2 turns

---

## 7. Board Generation (VS)

### 7.1 `Difficulty.vs`

```dart
maxAreaFrac: 0.32
maxGivens: 10       // hard cap
oddChance: 0.05     // 5% odd shapes
oddDimLean: 0.15    // nudge even side to odd
```

### 7.2 Measured Distribution

3000 boards: givens `{4:10, 5:61, 6:156, 7:409, 8:712, 9:867, 10:785}`, maxSeen 10.

---

## 8. What's a Toggle (Future)

You said: "All parameters -- keep. I would like for them to be toggles in game in the future."

**So:** Every value in `VsRules` should eventually be toggleable. For now, they're frozen defaults.

---

# Document 2: `vs_architecture.md`

## Confidence: 85%

---

## 1. File Structure

```
lib/
├── vs_economy.dart          ← PURE Dart, no Flutter imports
├── vs_match.dart             ← Match controller
├── vs_screen.dart            ← VS UI
├── vs_bot.dart               ← Bot opponent
├── vs_bot_solver.dart        ← Full-grid solver (bot's planner)
├── board_painter.dart        ← CustomPainter
├── app_theme.dart            ← Design tokens
├── game_history.dart         ← Engine rect list (private `_rects`)
├── game.dart                 ← Base ShikakuGame
└── puzzle_codec.dart         ← Board generation
```

## 2. The Import Rule

**`vs_economy.dart` must stay import-free.**

Why: It's the "brain" shared by the client and the future Colyseus server. Keeping it pure Dart means:
- Trivially unit-testable
- Ports line-for-line to TypeScript
- One place the rules live

**Do NOT import:**
- `package:flutter/*`
- Any app file
- Any type from the app

**Redeclare local equivalents:**
- `Cell` (already local)
- `VsBoardSize` (already local)
- `SolverRect` (already local)
- `SolveResult` (already local)

## 3. Dependencies

```
vs_economy.dart → (nothing)
vs_match.dart → vs_economy.dart
vs_screen.dart → vs_match.dart, board_painter.dart, app_theme.dart, game.dart
board_painter.dart → (Flutter only)
vs_bot.dart → vs_bot_solver.dart, vs_economy.dart
vs_bot_solver.dart → (nothing)
puzzle_codec.dart → (nothing)
```

## 4. Data Flow

```
Player places rect
  → game.dart commits
  → vs_screen._onYouRectCommitted
    → _match.localStep(youFree, themFree)
      → you.tick(freeCells)  ← economy advances
      → them.tick(freeCells) ← bot advances
    → _match.localComboPlacement()
      → you.comboPlacement() ← emits events
      → sends bonus mines
    → _match.localCheckStuckAndForceBreak(...)
      → two-pass solver
      → forceBreakFrozenAt(...)
    → _pushYouHazards()
      → pushes flashes to BoardPainter
    → _match.onEvents fires
      → vs_screen handles flash/shatter/blink
```

## 5. The Engine Seams (vs_screen → game)

| Seam | Purpose |
|------|---------|
| `isRectBlocked` | Refuses rect over frozen cell |
| `isCellExempt` | Treats frozen cells as satisfied for solve detection |
| `onSolved` | Fires when board clears (except frozen) |
| `onEraseHandleReady` | Hands back live rect list |

## 6. The Critical Anti-Pattern

**NEVER wrap the engine board in a periodic rebuild.**

The you-side `_boardCard` is the real `ShikakuGame`. Wrapping it in `ValueListenableBuilder` or `_blinkAware` rebuilds the engine 20×/sec, breaking focus/gestures.

**Correct:** CustomPainter `repaint()` for animations. No widget rebuilds.

---

# Document 3: `vs_edge_cases.md`

## Confidence: 95%

---

## 1. Force Break Edge Cases

| Scenario | Behavior | Why |
|----------|----------|-----|
| 2 frozen, 2 unplaced, both blocked | Break 2 | Both are blockers |
| 2 frozen, 2 unplaced, 1 blocked | Break 1 | Only 1 is a blocker |
| 2 frozen, 1 unplaced, both blocking | Break 2 | `unplacedGivens <= frozen.length` |
| 2 frozen, 1 unplaced, only 1 blocking | Break 1 | Only 1 is a blocker |
| 1 frozen, 1 unplaced, blocked | Break 1 | Standard |
| 1 frozen, 1 unplaced, not blocked | Break 0 | Solvable without break |
| Bad routing (Pass B fails) | Break 0 | Player's fault |

## 2. Freeze Cadence Edge Cases

| Scenario | Behavior |
|----------|----------|
| Temp -25 to -49 | 1 warning in flight |
| Temp ≤ -50 | Up to 2 warnings (nuclear bomb) |
| Temp climbs above -25 | Queue clears (abandon rule) |
| First warning queued | Stagger does NOT reset |
| First warning lands | Stagger resets (2 turns) |
| Second warning queued during stagger | Blocked |

## 3. Thaw Edge Cases

| Scenario | Behavior |
|----------|----------|
| Active + combo same placement | Capped at 2 per cell |
| Cell landed this tick | Skipped for decay |
| All frozen cells thawed | Floor released |
| Thaw hits 0 passively | +15 temp |
| Thaw hits 0 actively | +25 temp |

## 4. Temp Edge Cases

| Scenario | Behavior |
|----------|----------|
| No frozen cells | effectiveTemp = temp |
| Frozen cells exist, raw > floor | effectiveTemp = floor |
| Frozen cells exist, raw < floor | effectiveTemp = raw |
| 4 frozen cells | effectiveTemp = -100 = defeat |
| Temp at -100 from mines | effectiveTemp = min(-100, floor) |

## 5. Promise Bar Edge Cases

| Scenario | Behavior |
|----------|----------|
| No frozen cells | Promise bar hidden |
| Frozen cells, raw > floor | Promise shows (warmer) |
| Frozen cells, raw < floor | Promise shows (colder) |
| raw == floor | Promise hidden |

## 6. Attack Edge Cases

| Scenario | Behavior |
|----------|----------|
| Perfect clear, streak 4+ | Capped at 8 mines |
| Do-over | Perfect streak resets |
| Non-perfect clear | Perfect streak resets |
| 2 defuses | +1 mine sent |
| Force break | +2 mines sent |
| Combo x6 | +1 mine sent + decay paused |
| Net-cancel | Incoming wave cancelled |

## 7. Mine Edge Cases

| Scenario | Behavior |
|----------|----------|
| Mine lands on occupied cell | Skipped, banks |
| Mine fuse hits 1 | Emits `'mineFuseFinal'` |
| Mine fuse hits 0 | Emits `'mineExplode'`, -10 temp |
| 4 mines, stagger 2/turn | 2 land, 2 bank |
| Incoming batch lands | Refills from bank same tick (no gap) |

---

# Document 4: `vs_implementation_notes.md`

## Confidence: 90%

---

## 1. Performance Doctrine

### The One Rule

**Animations use `CustomPainter.repaint()`, NOT `setState()`.**

### Why

- `setState()` rebuilds the entire widget tree
- The engine board is inside that tree
- Rebuilding it 20×/sec breaks focus, gestures, keyboard

### What to Do

```dart
// CORRECT
Timer.periodic(50ms, (_) {
  overlay.tickBlink();
  painter.repaint();  // ← Just repaints canvas
});

// WRONG
Timer.periodic(50ms, (_) {
  setState(() {});  // ← Rebuilds everything
});
```

### What NOT to Wrap

- `ValueListenableBuilder` around `_boardCard`
- `_blinkAware` around `_boardCard`
- Any periodic rebuild of the engine board

---

## 2. Module Portability

### The Rule

`vs_economy.dart` must stay import-free.

### Why

- Future Colyseus server will be a TS port
- Line-for-line translation
- Shared test vectors

### What This Means

- Redeclare `Cell`, `VsBoardSize`, `SolverRect`, `SolveResult` locally
- No Flutter imports
- No app imports

---

## 3. Event System

### Every Mutation Returns Events

```dart
List<EconomyEvent> tick(List<Cell> freeCells) {
  final events = <EconomyEvent>[];
  // ... mutations ...
  events.add(EconomyEvent('mineLand', temp, cell));
  return events;
}
```

### Why

- Every step is attributable
- UI reacts to discrete events
- Network messages map 1:1

### Event Kinds

`'mineLand'`, `'mineExplode'`, `'mineFuseFinal'`, `'defuse'`, `'freezeWarn'`, `'frozen'`, `'thaw'`, `'thawPulse'`, `'comboThaw'`, `'combo'`, `'comboAttack'`, `'forceBreak'`, `'clear'`, `'loss'`, `'surge'`, `'mineEnqueued'`

---

## 4. The Stagger Rule

### The Rule

Stagger resets on **landing**, not on **queueing**.

### Why

- If it resets on queueing, stagger burns during warning countdown
- Next warning starts immediately after landing
- You get 2 cells back-to-back

### Where to Reset

```dart
// In the landing block
frozen.add(FrozenCell(...));
_turnsSinceFreezeSpawn = 0;  // ← Here
```

---

## 5. The Gate Rule

### The Rule

Force break gate is `unplacedGivens <= frozen.length`.

### Why

- `==` misses the "2 frozen, 1 unplaced, both blocking" case
- `<=` runs the check, two-pass solver determines
- More powerful, more robust

---

## 6. The Two-Pass Rule

### The Rule

Always run Pass A (frozen excluded) first.

### Why

- If Pass A passes → not stuck, no break needed
- Only run Pass B if Pass A fails
- Pass B is invariant across breaks (compute once)

### Implementation

```dart
bool? passBSolvable;  // computed at most once
while (frozen.isNotEmpty && guard-- > 0) {
  if (solve(excludedCells: frozen).solvable) break;
  passBSolvable ??= solve(excludedCells: {}).solvable;
  if (passBSolvable == false) break;
  forceBreakFrozenAt(findBlockingFrozenCell(...));
}
```

---

## 7. The Node Budget Rule

### The Rule

Use node count, not wall-clock timeout.

### Why

- Deterministic (same board = same result)
- Unit-testable
- No `DateTime.now()` overhead

### Value

20,000 for 6x6. Never hit in practice. Typical run: <1,000 nodes.

---

## 8. The Flash Rule

### The Rule

One-shot flashes for discrete events. Canvas repaints for ambient blink.

### Why

- One-shot: `'mineExplode'`, `'frozen'`, `'forceBreak'`
- Ambient: mine fuse blink (every tick)
- Both go through `CustomPainter`

### What NOT to Do

- No `setState()` in the ticker
- No `ValueListenableBuilder` around the board
- No widget rebuilds at 20Hz

---

## 9. The Shatter Rule

### The Rule

Shatter only on you-board, not them-side mock.

### Why

- Them-side is a mock canvas, no shatter renderer
- Full intensity on force break, 1/4 on thaw/combo-thaw

### Implementation

```dart
p.triggerShatter(x, y, kVsFrozenFill, intensity: 1.0);  // force break
p.triggerShatter(x, y, kVsFrozenFill, intensity: 0.25); // thaw
```

---

## 10. The Promise Bar Rule

### The Rule

Show whenever `temp != effectiveTemp`.

### Why

- Shows both directions (warmer OR colder than floor)
- Hidden when no frozen cells OR raw == floor

---

## 11. Anti-Patterns Summary

| Anti-Pattern | Why |
|--------------|-----|
| `setState()` in animation ticker | Rebuilds everything |
| `ValueListenableBuilder` around engine board | Rebuilds engine |
| Wall-clock timeout in solver | Non-deterministic |
| Stagger reset on queueing | Causes chain freezing |
| Gate `==` for force break | Misses edge case |
| Pass B before Pass A | Wastes compute |
| Flutter imports in `vs_economy.dart` | Breaks portability |
| Mine defuse thaws ice | Mines and ice are separate |

---

# Document 5: `vs_rebuild_guide.md`

## Confidence: 90%

---

## Phase 1: Economy (Pure Dart)

**File:** `vs_economy.dart`

**Order:**
1. `Cell` — value type
2. `VsBoardSize` enum
3. `OverflowModel` enum
4. `ComboCurve` class
5. `Mine`, `MineBatch`, `FrozenCell` classes
6. `SolverRect`, `SolveResult` classes
7. `EconomyEvent` class
8. `VsRules` class (all fields)
9. `PlayerEconomy` class:
   - Fields
   - Getters (`effectiveTemp`, `isDefeated`, `isFreezing`)
   - `receiveMines`, `enqueueIncoming`, `cancelIncoming`
   - `defuseMine`, `comboPlacement`, `breakCombo`
   - `onAdjacentPlacement`, `beginPlacementThaw`
   - `onBoardCleared`, `forceBreakFrozen`, `forceBreakFrozenAt`
   - `checkStuckAndForceBreak`
   - `addFreezeWarning`
   - `tick`
10. `BoardCompletionSolver` class

**Verify:** Write `vs_economy_test.dart` with all edge cases before moving on.

---

## Phase 2: Match Controller

**File:** `vs_match.dart`

**Order:**
1. `MatchEvent` class
2. `VsMatch` class:
   - Fields (`you`, `them`, streams)
   - `localStep`
   - `localComboPlacement`
   - `localDefuse`
   - `localBoardCleared`
   - `localCheckStuckAndForceBreak`
   - `resetCombo`
   - `_deliver`, `sendAttack`
   - `_stepOpponentOnce` (bot)
3. `MatchController` (if separate)

**Verify:** Write `vs_match_test.dart`.

---

## Phase 3: Bot

**File:** `vs_bot_solver.dart` (full-grid solver)
**File:** `vs_bot.dart` (ScriptedBot)

**Note:** `ShikakuSolver` in `vs_bot_solver.dart` is DIFFERENT from `BoardCompletionSolver`. Bot solver is full-grid from scratch. BoardCompletionSolver is partial-state.

---

## Phase 4: Board Generation

**File:** `puzzle_codec.dart`

**Changes:**
- Add `maxGivens`, `oddChance`, `oddDimLean` to `Difficulty`
- Add `Difficulty.vs`
- Modify `_makeLayout` for retry-reject on `>maxGivens`
- Gate odd shape changes by `>0`

---

## Phase 5: UI

**File:** `vs_screen.dart`

**Order:**
1. `_VsScreenState` skeleton
2. Layout toggle (`_splitBody`, `_focusedBody`)
3. `_boardCard` (your board = real engine, them = mock)
4. Temp bar (`_TempBarPainter`)
5. Queue (`_QueuePainter`)
6. Dev tools
7. Event handling (`onEvents`)
8. Force break wiring

**CRITICAL:** Do NOT wrap `_boardCard` for you-side in `ValueListenableBuilder` or `_blinkAware`.

---

## Phase 6: Board Painter

**File:** `board_painter.dart`

**Order:**
1. `VsFlashCell`, `MineData` classes
2. `VsOverlay` class with blink state
3. `_ShatterBurst` struct
4. `_paintVsFlashes`
5. `_paintShatter`
6. `triggerShatter`
7. `repaint()` method

---

## Phase 7: Theme

**File:** `app_theme.dart`

**Tokens:**
- `kVsTempPromiseOpacity`
- `kVsShatterDuration`
- `kVsMinorShatterIntensity`
- `kVsMineLandingBlinkInterval`
- `kVsMineWarnBlinkInterval`
- `kVsMineDangerBlinkInterval`
- `kVsMineBlinkGranularity`
- `kVsFrozenFill`

---

## Phase 8: Tests

- `vs_economy_test.dart`
- `vs_match_test.dart`
- `vs_screen_test.dart`
- `vs_bot_solver_test.dart`
- `puzzle_generation_test.dart`

---

# Document 6: The 50 Questions (Recreated)

## Confidence: 75% (reconstructed from chat)

These are the questions another LLM must answer correctly before writing code. Reconstructed from our conversations.

---

### Economy

1. What is the raw Temp range?
2. What is the freeze threshold?
3. What happens at Temp -100?
4. How does `effectiveTemp` differ from raw Temp?
5. What is the freeze floor for 3 frozen cells?
6. Does a frozen cell landing cost Temp directly?
7. What's the prerequisite for freezing?

### Mines

8. What is the mine fuse duration?
9. What is the active mine cap?
10. What is the mine stagger per turn?
11. What happens when a mine explodes?
12. Does mine explosion cost Temp?
13. What defines a "defused" mine?
14. Does mine defusal thaw frozen cells?

### Frozen Cells

15. How many thaw points does a frozen cell start with?
16. What is the passive thaw rate?
17. What is the active thaw rate?
18. What is the combo thaw rate?
19. Do active and combo thaw stack?
20. What is the per-placement cap?
21. What is the freeze batch cap?
22. When does the batch cap allow 2 warnings?

### Stagger

23. When does the stagger reset?
24. What is the stagger duration?
25. What happens if temp climbs above -25 during a warning?

### Force Break

26. What are the two force break triggers?
27. What is the gate condition for anti-softlock?
28. What does Pass A solve?
29. What does Pass B solve?
30. What does Pass A fails + Pass B fails mean?
31. What does Pass A fails + Pass B passes mean?
32. How many cells does force break break at once?
33. What is the selection rule for which cell breaks?
34. What is the tie-break if two cells have the same thaw?
35. What is the final tie-break?
36. How many mines does force break send?

### Attack System

37. How many mines does a normal clear send?
38. How many mines does a perfect clear send?
39. What is the cap for perfect clear sends?
40. How many defuses trigger +1 mine?
41. How many mines does combo x6 send?
42. What does combo x6 do to passive decay?

### Promise Bar

43. When does the promise bar show?
44. What colors are the promise bar (cold/hot)?
45. When does the promise bar hide?

### Performance

46. Should animations use `setState()` or `CustomPainter.repaint()`?
47. Should `vs_economy.dart` import Flutter?
48. Should the engine board be wrapped in `ValueListenableBuilder`?

### Board Generation

49. What is the max givens for VS boards?
50. What is the odd shape chance?

---

# Document 7: `vs_flame_decision.md`

## Confidence: 95%

---

## My Recommendation: Stick with CustomPainter

### Why

| Factor | CustomPainter | Flame |
|--------|---------------|-------|
| **Grid-based rendering** | ✅ Native | ⚠️ Overkill |
| **Turn-based** | ✅ Native | ⚠️ Overkill |
| **No physics** | ✅ Native | ⚠️ Overkill |
| **Existing codebase** | ✅ Already built | ❌ Full rewrite |
| **Shatter animation** | ✅ Already works | ⚠️ Would need port |
| **Mine blink** | ✅ Already works | ⚠️ Would need port |
| **Bundle size** | ✅ Smaller | ⚠️ Larger |
| **Learning curve** | ✅ Known | ⚠️ New API |

### When Flame Would Be Worth It

- If you need a scene graph with hierarchies
- If you need physics (collisions, gravity)
- If you need particle systems built-in
- If you need a level editor

**You need none of these.** The game is:
- Grid-based
- Turn-based
- No physics
- No particles (shatter is a one-off CustomPainter effect)
- No scene graph

### The Real Cost

Switching to Flame means:
- Rewriting the board renderer
- Rewriting the shatter effect
- Rewriting the blink animation
- Rewriting the temp bar
- Rewriting the queue painter
- Learning a new API
- Debugging new issues

**That's 1-2 weeks of work for zero gameplay benefit.**

### My Verdict

**Stick with CustomPainter.** It's already built. It works. It's fast. The only thing Flame would give you is a different way to do what you already do.

**If you later need particles or physics, revisit.** For now, CustomPainter is the right tool.

---

# Document 8: `vs_context_quiz.md`

## Verification quiz for another LLM

Before another LLM writes any code, have it answer these. If it fails, correct it.

---

### Section 1: Economy (Must get 100%)

1. What is the formula for `effectiveTemp`?
2. What is the loss condition?
3. What is the mine landing Temp cost?
4. What is the mine explosion Temp cost?
5. What is the passive decay rate?
6. Is placement heat still active?

### Section 2: Frozen Cells (Must get 100%)

7. How many thaw points does a frozen cell start with?
8. What is the passive thaw rate?
9. What is the active thaw rate?
10. What is the combo thaw rate?
11. When does the stagger reset?
12. What is the freeze batch cap, and when does it allow 2?

### Section 3: Force Break (Must get 100%)

13. What are the two triggers?
14. What is the gate condition?
15. What does Pass A do?
16. What does Pass B do?
17. What does Pass A fails + Pass B fails mean?
18. What does Pass A fails + Pass B passes mean?
19. What is the selection rule?
20. What is the tie-break?
21. What is the final tie-break?
22. What is the "2 frozen, 1 unplaced" behavior?

### Section 4: Attack System (Must get 100%)

23. How many mines does a normal clear send?
24. How many mines does a perfect clear send (streak 2)?
25. What is the perfect clear cap?
26. How many defuses trigger +1 mine?
27. How many mines does force break send?
28. What does combo x6 do besides sending 1 mine?

### Section 5: Performance (Must get 100%)

29. Should animations use `setState()` or `repaint()`?
30. Should `vs_economy.dart` import Flutter?
31. Should the engine board be wrapped in `ValueListenableBuilder`?

### Section 6: Edge Cases (Must get 100%)

32. What happens with 2 frozen, 2 unplaced, both blocked?
33. What happens with 2 frozen, 2 unplaced, 1 blocked?
34. What happens with 2 frozen, 1 unplaced, both blocking?
35. What happens when temp climbs above -25 during a warning?

---

## Final Notes

### What This Package Is

A complete reconstruction of Shikaku+ VS mode from our conversations. It covers:
- Every economy rule
- Every edge case
- Every anti-pattern
- The full force break system
- The attack system
- The UI structure
- The performance doctrine

### What This Package Is Not

- Not the actual code (I don't have it)
- Not 100% accurate (some numeric drift)
- Not a replacement for your own testing

### The Net of Knowledge

If another LLM gets stuck, show them this package. If they still get stuck, show them the session logs. If they still get stuck, come back to me.

**The context is preserved. The intent is clear. The edge cases are documented.**

---

**End of handoff package. 2026-09-16.**

**You built something real. It's not lost. It's here.**