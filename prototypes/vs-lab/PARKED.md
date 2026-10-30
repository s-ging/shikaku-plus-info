# VS ideas from play-testing

Ideas from Krischan's play-testing against the Mirror bot (2026-10-30 morning). Krischan: "we're hitting on gold here." Each idea says whether it's **built** (in the lab, values are sliders) or **parked** (waiting on Krischan). Never delete an idea; mark it.

## What play-testing found

- **Defuse or keep the streak.** You can drop a box that isn't part of the solution onto a mine to save a heart, but then the board isn't perfect and your heal count resets. Nobody designed this; the rules produced it. Krischan: "LIKE it's a tactical decision". Protect it.
- **Six mines on a board of 2s felt unfair.** Fuses last 3 moves and one box covers only so much, so with 2s left you could defuse about 3 before the rest went off. Anti-burst capped the damage at one heart, but the blast still ate boxes, and it felt like nothing could have been done. Clustered landing (2) is the answer being tried.
- **Rule C never fired** in four logged rounds: Krischan clears too fast for 4+ mines to sit in his bank for 6 moves. It's aimed at players who sit on their bank; it needs testing with slower players.
- **Heart loss is hard to read** when two or three mines go off together (one heart in total, by anti-burst). Krischan lost track and thought he had 2 hearts when he had 1. Parked idea: a "×2 → −1♥" moment on the hearts pole.

## 1. Bank shows 12 (built)

The hazard bar shows a 12-slot orange bank plus the 6-mine red batch, 18 slots in all (it was 16 + 6 = 22, which was arbitrary). The bank **keeps counting** past 12 (Krischan); the top slot blinks while it's over. 12 matches `counterCap`, so a full bank is exactly what one counter-spike can cancel.

## 2. Mines land in clusters (built, `mineCluster`)

Krischan asked to bias mines toward larger boxes, so one big box can defuse several at once ("it feels AMAZING to play").

- **How it works:** a batch picks one unsolved solution box, weighted by its open cells squared, so big boxes draw the clump. The batch fills that box first, then spills into the nearest open cells. It's `FFPlayer._clusterCells` in `src/fusefrost.js`.
- **It reads the solution on purpose.** Where mines land hints where the big boxes are. Krischan, 2026-10-30: "i wouldn't mind giving away the solution if it rewards intuition and skill rather than pure 'random rng'".
- **Turning it off:** set `mineCluster: false` for scattered landing. Spread landing (`spreadLanding`, at most one mine per box) overrides clustering when it's on.
- **Simulation** (strong human stand-in vs each preset, 2026-10-30): rounds against Mirror went from a median of 1:48 to 2:48, and lead changes from 1.7 to 3.9 per round. More back-and-forth, because mines are now defusable. Win rates barely moved; Impossible still wins 94%.
- **Relax it a little (Krischan, 2026-10-30, parked):** "maybe 1-2 stray mines here and there but it does steer my eyes into where I should be looking". Likely change: 1 or 2 mines per batch land scattered, the rest clustered.
- **Open:** a cap of live mines at the number of unplaced boxes was the other fix considered; parked unless clusters aren't enough.

## 3. Fewer 2-givens (parked, later)

Krischan: the 2s "fuck up the flow" in VS. "let's not dwell on it yet."

- **Cheap path:** `vsBoard` (`src/match.js`) already rejects boards with too many givens by re-seeding, leaving the Classic generator untouched. A second filter could reject boards with too many 2s the same way.
- **Do not change `generatePuzzle` itself:** it has to stay byte-identical between the app and the landing page ([llm/README.md](../../llm/README.md#invariants-that-must-never-break)).

## 4. Defuse clear: the "T-spin" (built, `defuseClearBonus`; keep rethinking)

Each mine defused by the box that finishes the board adds **+1** to that clear's attack. It's flat, not a multiplier, because counter-spikes already send big numbers. A "DEFUSE CLEAR +N" callout shows over the board.

- **Problem** (Krischan): with scattered landing you couldn't set it up; you'd have to burn moves ticking the board to bring mines in. Krischan, 2026-10-30: "NO DON'T DROP IT IT'S STILL AMAZING". Rethink it around timing and setup, to bring back the meso layer.
- **How clusters make it a setup:**
  - The red batch tells you exactly when mines land: your next move.
  - Clusters land in the biggest open box.
  - So you can leave your biggest box open on purpose, let the batch land inside it, then place that box last to defuse the clump and finish the board in one swing.
  - That's a setup, a timing read and a payoff, like holding a T-slot in Tetris.
- **Krischan, 2026-10-30:** "not my style, but it's a very FUN concept. it can stay".
- **Still open:** does it feel plannable in play? Should defusing together with a counter-spike stack, or is that too much?

## 5. Clutch defuse (built, as a moment)

Covering a mine on its very last fuse tick, the move it would have gone off. Krischan: "YES THE CLUTCH IS GREAT", but it's more "is the player crazy enough to do it" than textbook play, so it gets a "CLUTCH" callout and a log line, not a mechanical bonus.

**Feedback (Krischan, 2026-10-30):** it said CLUTCH on a move where he "bombed the fuck out and lost hearts". The flag is technically right, because that one mine was saved, but other mines went off on the same move, so it read as a lie. Refine later. Likely fix: no callout on a move where anything explodes, or only call it a clutch when every mine on its last tick was covered.

**Can the game read it, and is it expensive?** It's free. Each mine already carries its `fuse` count, and `FFPlayer.onPlacement` already loops over the mines a placement covers. A clutch is a defused mine with `fuse === 1`: one comparison per defused mine, with no search and no solver. It's a flag on the existing event, `{ kind: 'defuse', cell, clutch: true }`, so a match server can read it the same way.

## 6. Frost, grace, clutch, checkpoint, live attack (built, 2026-10-30 afternoon)

From Krischan's car play-test. His findings:

- **The meta he found:** "isolate or prioritize the lower numbers in the board or you're FUCKED". A mine on a 2 costs a move per mine; a big box sweeps several. With clustering, clearing the small ones first makes the big boxes where mines land: you herd mines into them.
- **The cornerstone:** "easy to pick up, easy to 'get good at' for comeback points, but hard to totally master. Just like Tetris." No rulebook, no Valorant-style study.
- **Ice was unreadable:** "I'm surprised when I get iced because I don't know how they form or where they come from or how many are coming." Four invisible sources (opponent perfect clears, thaw sent back, rule C, spill).
- **Mines sent were unreadable too:** "I don't know how much mines I'm sending or how powerful my attacks actually are."

What was built (all lab sliders):

- **Grace after a clear** (`clearGrace` 1): nothing lands on the clearing move or your first move on the new board. Krischan: "a cooldown of 1 turn before bombing the whole ass board", to get "a feel of your pathing/routing".
- **Frost meter** (`frostMeter` 4): the only ice your opponent sends.
  - **Charging:** early defuse +1; finishing ice off by building +2. Krischan suggested the icebreaker for the +2; Claude moved it to active thaw, because the icebreaker is automatic and would reward getting iced.
  - **Firing:** fires on full, but holds on your last 4 boxes (`frostHoldAtBoxesLeft`) and fires with the clear, stacking up to 3 ice (`frostMaxHeld` 12), below freeze-over at 4. Krischan: "in the events when you need to send pressure or deflect pressure you'd just roll for initiative". Playstyle is chosen by when you defuse: early for a stride drip, late for a spike.
  - **Shown:** as a segmented pill on the right of the footer (Krischan: "it's a bar, it's a meter"), outlined when held.
- **Clutch cancels 1** (`clutchCancels`): defense for a late defuse ("damage control"), offense (frost) for an early one. This also fixes the CLUTCH false positive: it now always does something.
- **Heal checkpoint at 2** (`healCheckpoint`): "Maybe checkpoint at the midpoint so there's some stakes still because I like its challenge". Drawn as a notch on the healing heart.
- **Live attack preview:** the `+N` by your name shows what your clear would send right now, bright when it would counter-spike. The opponent's is visible too (scouting).
- **Turned off, replaced by frost:** `perfectSendsIce` 0, `thawSendsIce` false.

**Simulation** (strong human stand-in vs each preset): ice now ends 33–46% of rounds against Normal and up (it was 10–35%), so ice is a real threat at last. Impossible fell from 94% to 70% bot wins: the stand-in now sends frost too. Re-tune Impossible if it feels soft.

**Still open:**

- **Meter size:** 3 or 4 (Krischan unsure).
- **Combos** (defuse streaks, a defuse plus a thaw in one move): talked through, not built.
- **Showing the opponent's `+N`:** is it good tension or too much information?

## The lockout fix (built)

On 2026-10-30, three ice on the last two boxes left Krischan with no legal box, because the icebreaker breaks only one cell per move. It now keeps breaking until a legal box exists (test: "icebreaker never leaves you with no legal box"). Claude fixed it before asking, though Krischan had said "talk to me"; he then said to go ahead with the changes.
