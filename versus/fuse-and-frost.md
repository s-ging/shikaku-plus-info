# Shikaku+ VS: the rules

The mode is just called **Shikaku+ VS** (Krischan, 2026-10-30: not sold on "Fuse & Frost"; "Pro", "Ranked" or "EX" variants feel cheesy). "Fuse & Frost" survives only as the design-era name of this ruleset in older notes and file names.

The current ruleset for Shikaku+ VS, decided with Krischan on 2026-10-29 ([decision 0003](../decisions/0003-fuse-and-frost.md)). It replaces the temperature economy ([history.md](history.md)). The playable reference implementation is [prototypes/vs-lab/](../prototypes/vs-lab/) (`src/fusefrost.js`, `src/ffmatch.js`); when this page and that code disagree, check the tests in `test/fusefrost.test.js` and ask.

## The pitch

> "Every number on the grid needs its own box, exactly that many squares big. Every board you finish sends mines to your opponent. Mines have a fuse: cover one with a box to defuse it, miss it and you lose a heart. Finish a board without undoing anything and you also send ice, which blocks a square until you build next to it, and then it flies right back at them. Lose three hearts or get four ice stuck at once and the round's over; first to seven wins."

Two verbs (cover mines, build next to ice) and one thing to watch (hearts). One-liner from the DeepSeek pitch work: "Tetris pressure, Sudoku brain."

## Pillars

- **Solved is sacred.** Hazards only land on empty cells, never on a placed box or a clue. Finished work is only ever damaged by your own mistake: a mine you didn't defuse.
- **Mines are active, ice is passive.** Mines punish directly. Ice never hurts you; it stalls you while the mines keep coming, the way garbage in Tetris eats the room you need.
- **You can always stop and plan.** Your board only ticks when you move.
- **Strip the chrome.** No temperature math. The board just tints colder per ice cell.

## The clock

- There is no wall clock. Each player's board ticks once per move: a placement or an erase. Tapping an empty cell is not a move. Moves come roughly every 1.5 to 1.8 seconds in real play.
- Incoming mines and ice land when you move (Tetris-style), so a player who stops to think gets a short grace.
- **Idle tick: tried and dropped (2026-10-30).** A 4-second idle tick was built; Krischan didn't like it in play, so it's off (still a lab slider). Stalling only delays your own landings while the opponent keeps clearing; a real match still needs an AFK timeout on the server.
- **Grace after a clear (2026-10-30, Krischan):** nothing lands, mines or ice, on the clearing move or on your first move on the fresh board. The red batch drops on your second move, so you get one look to plan your route.
- A move resolves in order: your box goes down (defusing what it covers, thawing ice beside it); if that finished the board, your attack goes out and cancels mines still flying at you; then your board ticks.

## Mines

| Rule | Value |
| --- | --- |
| A board clear sends | 4 mines |
| Mines arrive after | 3 of the receiver's moves |
| Landing | Up to 6 per move (was 4), on empty non-clue cells, **clustered** (2026-10-30): the batch fills one unsolved box, picked weighted by its open cells squared, then the nearest open cells. It hints at the solution on purpose ([ideas](../prototypes/vs-lab/PARKED.md#2-mines-land-in-clusters-built-minecluster)). |
| Live mines on a board | At most 6; the rest wait in a pool and drop in as room frees up |
| Fuse | 3 of your moves |
| Defuse | Cover the mine with a placed box. **Early** (before its last tick): +1 frost. **Clutch** (on its last tick): cancels 1 of your own incoming mines, orange first, then red (2026-10-30). |
| Defuse clear | Each mine defused by the box that finishes the board adds +1 to that clear's attack (2026-10-30). |
| Explosion | −1 heart, and every box touching the 3×3 blast is removed. Mines that go off on the same move cost **one heart in total** (anti-burst, 2026-10-30); each still blasts. |
| Your board clears | Its live mines die with it. The red batch is committed and lands on your next board; the orange bank is what your counter-spike eats. |

**The queue.** The hazard bar shows 12 bank slots plus the 6-mine batch (2026-10-30; was 16); the bank keeps counting past 12 and its top slot blinks. Everything coming at you is split in two: the **red batch** (what lands on your next move, up to 6; committed, too late to stop) and the **orange bank** (everything after that).

**Counter-spikes (2026-10-30, Krischan: "that is the sauce").** When you clear a board, it cancels up to 12 mines from your orange bank and adds every cancelled mine to its own attack: cancel 11, send 15. You watch orange pile up, hold your last box, and clear right before it turns red. A gentler "refund" mode (your attack cancels first, half of what it cancels comes back) and plain net-cancel are both selectable in the lab.

## Ice

| Rule | Value |
| --- | --- |
| Sources | **Frost (2026-10-30) is the only ice your opponent sends.** Each player has a frost meter, a 4-segment blue pill at the right of the footer. Early defuses charge it +1 and finishing ice off by building next to it +2. When full it fires 1 ice at the opponent, as a blue shot. On your last 4 boxes it holds instead (outlined), stacking up to 3 ice, and fires with your clear. Perfect clears and thawing no longer send ice. Your own ice can still come from **rule C (2026-10-30, Krischan's original rule):** 4 or more mines sitting in your orange bank for 6 of your moves in a row queue 1 ice on your own board, and again every 6 moves after. It's the price of holding your last box for a bigger counter-spike. Icebreaker spill also returns on your next board. |
| On the way | Lands **2** of your moves after it's sent, on a random empty non-clue cell. No cap: ice stacks if the opponent is cracked. No landing cell is marked; the board catches a chill (blue frost, drifting snow) and the ice block on the hazard bar blinks. |
| Effect | Refuses boxes. A board cannot be finished while ice is on it. |
| Thaw points | 4, shown as a growing dark wedge |
| Passive thaw | −1 every 2 of your moves; sends nothing |
| Active thaw | Placing a box that shares an edge with it: −2. Thawing it out this way sends it to your opponent. |
| Icebreaker | Only on your **last 2 boxes**, one cell per move, nearest-to-thaw first. It also steps in any time ice leaves you with no legal move at all, because the board only ticks when you move, so stuck ice would never melt. Broken ice **spills onto your next board**. |
| Explosions | Never touch ice (for now) |

## Rounds and the match

- 3 hearts per round.
- **KO:** out of hearts, or 4 ice on your board at once (**freeze-over**). Ice still on its way doesn't count until it lands, and several can land on one move.
- A KO ends the round and **fully resets both players**, winner included, so nobody snowballs. First to 7 rounds.
- **Heal:** 4 perfect boards in a row (was 3) heals 1 heart, up to 3, **once per round**. **Checkpoint at 2** (2026-10-30): once you have 2, a non-perfect clear drops you back to 2, not 0 (a notch on the heart); before that it resets the count; a mine going off doesn't spoil a perfect board. On the hearts pole the healing heart beats while the current board can still be perfect, and flatlines and drains the moment you erase or overwrite a box.
- **Rush:** after 100 moves (average of both players; was 150), every mine attack is worth 5 times as much. It guarantees every round ends.
- Boards: 6×6 Classic, both players race the same seeded sequence at their own pace.

## The frame (2026-10-30)

**Footer, updated later that day:** time on the left; your name with a **live `+N`**, what your clear would send right now (base 4 plus whatever the counter-spike would cancel, with rush), bright when it would counter-spike; the **frost pill** on the right. The opponent's footer shows their `+N` too, so you can see when they're loaded. Left pole is you, right bar is what's coming at you, the footer is what you're sending.


Krischan's layout, TETR.IO-clean and symmetrical: **left pole = you, right pole = what's coming at you.**

- **Left pole:** 3 heart segments. Only the first missing one can come back: it fills a quarter per perfect board and beats like a heart (lub-dub, not an ease) while it's tentative.
- **Right pole, top to bottom:** 16 orange segments (mine bank; the top one blinks if there are more), 6 red (next batch), one solid ice block: dark = none, `#8098B0` = lands in 2 moves, `#7CB3EB` blinking = next move, `#FFFFFF` flash = landing. The block doesn't show *how many* ice are coming yet; a quarter-fill is the planned fallback if play-testing says the count matters.
- **Footer:** time, name, and the fire meter to the right of the name: `+N` pops and drifts up when you send, bigger and white for a counter-spike. A projectile flies from your board to the other player's hazard bar.

## What the bot-vs-bot simulations say

### With the frame's rules (Hard vs Hard, 2026-10-30)

| Counter mode | KO by mines / ice | Median round | Lead swings |
| --- | --- | --- | --- |
| **Counter-spike, full (default)** | 98% / 2% | 1:35 | 1.5 |
| Refund 50% | 93% / 7% | 2:57 | 3.7 |
| Plain net-cancel | 85% / 15% | 3:57 | 6.7 |

Full counter-spikes make rounds short and decisive: every clear always sends at least 4, so mines pile up and whoever falls behind gets buried. Ice rarely ends a round under any of these, because batches of 6 kill first. Worth feeling in play before tuning; the counter mode and every value are sliders in the lab.

Also fixed on the way: a board could lock forever when ice blocked every remaining box (no legal move, so no tick, so no melting), and the bot used to wait forever on ice; it now builds next to ice to thaw it, like a person would.

### Earlier rules (2026-10-30 morning)

### After the 2026-10-30 changes (Hard vs Hard)

| Rules | Rounds that never end | KO by mines / ice | Median round | Lead swings |
| --- | --- | --- | --- | --- |
| Before (freeze-over 4, rush 150, no caps) | 0% | 18% / 83% | 2:35 | 8 |
| Anti-burst only | 0% | 8% / 92% | 2:44 | 9 |
| Ice cap of 2 only | 12% | 88% / 0% | 5:48 | 16 |
| **Both, freeze-over 3, rush 100 (current)** | 3% | 47% / 50% | 4:53 | 16 |

The anti-burst rule barely changes balance. The ice cap is what matters: with at most 2 ice on the way, nobody reached 4 ice, so ice stopped ending rounds. Lowering freeze-over to 3 brings ice back, and the mines-vs-ice split is now about even (it used to be about 75% ice). Rounds are longer with twice the back-and-forth. The bot presets were calibrated under the old rules and may need retuning.

### Before the 2026-10-30 changes

From `prototypes/vs-lab/test/ffsim.js` (bots at about 1.6 seconds per move that make more mistakes under pressure):

- **Even players:** 52/48 split, no stalemates, median round about 2 minutes, about 8 lead swings per round, rush needed in about 7% of rounds. Ice decides about 75% of KOs and mines about 25%.
- **The icebreaker spill is load-bearing.** Without it ice never builds past 2 on a board (boards last about 10 moves and the icebreaker deleted ice for free), and rounds drag to over 4 minutes, mostly ended by rush.
- **Passthrough** (attacks never cancel): 45-second rounds decided almost entirely by mines, under 1 lead swing per round.
- **Wiping in-flight mines on clear** (a toggle, off): rounds of about 1:37, mines decide 77% of KOs, lead swings collapse to 2.3. A clear turns into a shield.
- **Heal** fires 2 to 2.5 times per round between strong bots but rarely restores a heart, because rounds mostly end by ice. The once-per-round cap stops a player on 1 heart from chaining heals back.
- **Skill still decides:** the sharper player wins about 75% against an even one.

## Bot presets (lab)

| Preset | Seconds per move | Reads a new board | Base mistakes | Extra mistakes per live mine / lost heart | Defuses first |
| --- | --- | --- | --- | --- | --- |
| Easy | 3.2 | 4s | 24% | 6% / 8% | 35% |
| Normal | 2.4 | 3s | 15% | 5% / 7% | 55% |
| Hard | 1.9 | 2.2s | 10% | 4% / 5% | 70% |
| Expert | 1.4 | 1.5s | 6% | 3% / 4% | 85% |
| Impossible | 1.0 | 0.9s | 3% | 1.5% / 2% | 97% |
| Mirror | lockstep: one move per yours, about 0.3s after | none | 5% | 3% / 3% | 90% |

Expert holds its last box for 1 turn and Impossible for 2 when its orange bank has 4 or more and nothing is about to land: counter-spike timing. **Mirror** moves once for every move you make, about 0.3s after you, so your pace is its pace by construction and only decisions separate you (Krischan's own lost bot worked this way: "if you're at 2pps, the bot is 2pps"). The first version measured your average pace over your last dozen moves instead; it swung with bursts (0.7s a move in one of Krischan's logs, against his real 1.35s) and he beat it, so it became lockstep.

Simulated against a strong human stand-in (2s a move, 2.5s to read a board), 2026-10-30 with rule C and the idle tick: Easy 15% bot wins, Normal 36%, Hard 39%, Expert 74%, **Impossible 89%**, Mirror 69%. Rounds against Impossible run under a minute; ice ends about a quarter of them now that rule C exists. Each preset beats the one below 65 to 78% of the time.

Lab extras: **Copy round log** (on the round-over card and in the rules lab) copies the round as JSON: bot preset and stats, seed, result and KO type, every event with its time, side and move number, and only the rules you changed. The "reads a new board" pause matters: without it the bot never stops to read a fresh board the way people do.

## Play-testing notes from Krischan (2026-10-29)

- The rhythm works, and mines feel like a high-stakes event rather than "my boxes got removed".
- Defensive play against the Impossible bot felt good and fair: behind because of ice, but "ok, I have to look for another way" instead of a wall.
- Readability is the remaining problem, and the pitch matters most.

## Open questions

- **Sending ice:** Krischan isn't sold on ice being *sent* (from perfect clears and from thawing) yet. Mines now have a projectile; ice doesn't.
- **Counter-spike strength:** full counter makes rounds short and snowbally in simulation; refund mode is the middle ground. Decide by feel.
- **Ice threat:** ice almost never ends a round with batches of 6. Fine if mines are meant to be the killer; otherwise lower freeze-over or raise ice per perfect clear.

- **Meso / timing:** counter-spikes are the first timing decision (when to clear). Holding an attack to fire later is the next candidate.
- **Spicy mines:** row, column or diagonal blasts as rare attacks. Version 2 content.
- **Spread landing** (one mine per unsolved region): built as a toggle; barely changes results in the simulations.
- **Server:** Cloudflare Durable Objects, one per match, instead of renting a Colyseus VM ([decision 0005](../decisions/0005-cloudflare-for-versus.md), proposed). The economy module is import-free so the same file can run there.

## Visual design

Krischan's design comps are in [design/](design/): the two-board layout with the score header ([versus-layout.png](design/versus-layout.png)), the mine fuse pies and ice thaw wedges ([hazard-tiles.png](design/hazard-tiles.png)), and a frame from the original build ([original-vs-build.png](design/original-vs-build.png)). The original build also had board shake on hits and a cooling color shift; the lab now has both.
