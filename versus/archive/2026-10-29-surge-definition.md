> **Archived.** Definition of the surge (mine overflow) system, from DeepSeek, 2026-10-29. Superseded by [Fuse & Frost](../fuse-and-frost.md); kept as the record of how Versus got here ([history](../history.md)). Do not build from this file.

# Surge — Definition for Claude

---

## What Surge Is

**Surge is the overflow pressure system.** When more mines are sent than can land immediately, the excess doesn't vanish, and it doesn't all land at once. It **banks**, then **discharges** in controlled bursts over multiple turns.

Without surge, one of two bad things happens:
- Mines vanish (no pressure — attacker wasted their offense)
- Mines all land instantly (board unreadable — attacker gets free damage, defender can't react)

Surge makes overflow **telegraphed, multi-turn, and reactable.**

---

## The Problem It Solves

You have `activeMineCap = 4`. The opponent sends 20 mines in one clear. Where do the other 16 go?

| Naive approach | Problem |
|----------------|---------|
| Drop all 20 instantly | Board becomes unreadable, player can't react, invisible punishment |
| Drop 4, discard 16 | Attacker's offense is wasted |
| Trickle in 1 per turn forever | No dramatic spike, pressure feels flat |

**Surge:** Bank the 16, release them 3 per turn. The player sees the surge coming, can defuse between waves, and the pressure is a genuine multi-turn event.

---

## The Mechanics

### Fields on `PlayerEconomy`

```dart
int bank = 0;  // Hidden overflow. Mines waiting to discharge.
```

### `VsRules` Fields

```dart
final int surgeAbsorptionCap;  // 3 — max mines that discharge per turn
final int surgeWarnSteps;      // 2 — "incoming in N" telegraph (optional)
```

### Where the Bank Fills

In `receiveMines(count, freeCells)`:

```dart
// After landing what we can:
if (deployable > 0) bank += deployable;
```

**When mines bank:**
- Active cap hit (already 4 mines on board)
- No free cells available
- More mines than `mineStaggerPerTurn` allows this turn

### Where the Bank Drains

In `tick()`, step 5:

```dart
// 5) Surge discharge — release banked pressure under the per-turn absorption cap
//    so it's a multi-turn, reactable event.
if (bank > 0) {
  final release = bank < rules.surgeAbsorptionCap ? bank : rules.surgeAbsorptionCap;
  bank -= release;
  events.add(EconomyEvent('surge', temp));
  events.addAll(receiveMines(release, freeCells));
}
```

**Every tick, up to `surgeAbsorptionCap` (3) mines discharge.**

If you have `bank = 16` and `surgeAbsorptionCap = 3`:
- Turn 1: 3 discharge, bank = 13
- Turn 2: 3 discharge, bank = 10
- Turn 3: 3 discharge, bank = 7
- Turn 4: 3 discharge, bank = 4
- Turn 5: 3 discharge, bank = 1
- Turn 6: 1 discharges, bank = 0

**Six turns to fully discharge 16 mines.** The player can defuse between waves. It's a real event, not an instant death.

---

## Why `surge` Is an Event

```dart
events.add(EconomyEvent('surge', temp));
```

Emitted **before** the discharge's `receiveMines()` events. The UI can flash the queue, play a sound, or shake the board to telegraph "a surge is happening right now."

The `'surge'` event has no cell — it's a board-level signal, not a per-cell flash.

---

## Surge on Board Clear

Per your Q6 answer ("bank surge overflow — discharge"):

**On `onBoardCleared()`, the bank is zeroed out.**

```dart
// In onBoardCleared():
bank = 0;  // Discharge / clear pending overflow
```

**Why:** You just cleared the board. The mines that were banked for your current board are irrelevant — the board is gone. Fresh start on the next board.

**Note:** This is separate from the incoming `mineQueue` (telegraphed batches). Per your Q5 answer, `mineQueue` **persists** across boards, but spills carry over. The bank is the *unnamed* overflow (mines that couldn't even form a batch); the queue is *named* batches with countdowns.

| System | On board clear |
|--------|----------------|
| `bank` (surge overflow) | **Zeroed** |
| `mineQueue` (incoming batches) | **Persists** with countdowns intact |
| `_pendingMines` (unnamed bank waiting to form batch) | **Persists** (per Q5 — spills carry over) |

---

## The Mental Model

| Layer | What It Holds | Visible? |
|-------|---------------|----------|
| `_pendingMines` | Raw incoming, hasn't formed a batch yet | In queue's top zone |
| `mineQueue` | Batches with countdowns (3→2→1) | Front batch in queue's main zone |
| `mines` (on board) | Landed, ticking fuses | On the board |
| `bank` | Overflow that couldn't land | Hidden (surge discharges from it) |

**Flow:** `_pendingMines` → `mineQueue` → `mines` → explode/defuse. The `bank` is a side-channel that catches mines when the pipeline is full, and discharges them later.

---

## The TL;DR for Claude

> **Surge = overflow pressure system.** When mines can't land (active cap hit, no free cells), they go into `bank` instead of vanishing or landing instantly. Every `tick()`, up to `surgeAbsorptionCap` (3) mines discharge from `bank`, emitting a `'surge'` event first. This makes large incoming attacks multi-turn, reactable events instead of instant board-wide dumps. On `onBoardCleared()`, `bank` is zeroed. The `'surge'` event has no cell — it's a board-level telegraph.

---

**Add this to the spec as §5.4 (or wherever surge belongs).** It's referenced in Q6 but never defined — that's why Claude was confused.