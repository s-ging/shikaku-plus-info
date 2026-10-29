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
- Incoming mines and ice land when you move (Tetris-style), so a player who stops to think is never hit while thinking.
- A move resolves in order: your box goes down (defusing what it covers, thawing ice beside it); if that finished the board, your attack goes out and cancels mines still flying at you; then your board ticks.

## Mines

| Rule | Value |
| --- | --- |
| A board clear sends | 4 mines |
| Mines arrive after | 3 of the receiver's moves |
| Landing | Up to 4 per move, on empty non-clue cells |
| Live mines on a board | At most 6; the rest wait in a pool and drop in as room frees up |
| Fuse | 3 of your moves |
| Defuse | Cover the mine with a placed box. No reward beyond surviving. |
| Explosion | −1 heart, and every box touching the 3×3 blast is removed. Mines that go off on the same move cost **one heart in total** (anti-burst, 2026-10-30); each still blasts. |
| Your board clears | Its live mines and its waiting pool die with it; mines still in flight keep coming |

**Net-cancel:** your attack first cancels mines still in flight to you, oldest first. It never touches the pool or mines already on your board. Once trouble has landed, you dig out of it.

## Ice

| Rule | Value |
| --- | --- |
| Sources | A perfect clear (no erase or overwrite on that board) sends 1 ice. Ice your opponent thaws by building comes back to you. |
| On the way | At most **2** at once; extra is dropped (2026-10-30). No landing cell is marked: the whole board catches a chill (a blue frost and drifting snow, stronger as it gets close) and the footer counts down. Lands on a random empty non-clue cell after 3 of your moves. |
| Effect | Refuses boxes. A board cannot be finished while ice is on it. |
| Thaw points | 4, shown as a growing dark wedge |
| Passive thaw | −1 every 2 of your moves; sends nothing |
| Active thaw | Placing a box that shares an edge with it: −2. Thawing it out this way sends it to your opponent. |
| Icebreaker | If ice leaves you with no possible move, it breaks automatically, so you are never stuck. The broken ice is not destroyed: it **spills onto your next board**. |
| Explosions | Never touch ice (for now) |

## Rounds and the match

- 3 hearts per round.
- **KO:** out of hearts, or 3 ice on your board at once (**freeze-over**; was 4 until the ice cap, see below). Ice still on its way doesn't count until it lands, and several can land on one move.
- A KO ends the round and **fully resets both players**, winner included, so nobody snowballs. First to 7 rounds.
- **Heal:** 3 perfect boards in a row heals 1 heart, up to 3, **once per round**. A non-perfect clear resets the count; a mine going off doesn't spoil a perfect board.
- **Rush:** after 100 moves (average of both players; was 150), every mine attack is worth 5 times as much. It guarantees every round ends.
- Boards: 6×6 Classic, both players race the same seeded sequence at their own pace.

## What the bot-vs-bot simulations say

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
| Impossible | 1.1 | 1.1s | 5% | 2.5% / 3% | 92% |

Each preset beats the one below about 85% of the time. A strong player at about 2 seconds per move should win about 75% against Normal, split Hard, win about 22% against Expert, and steal the odd round from Impossible. The "reads a new board" pause matters: without it the bot never stops to read a fresh board the way people do.

## Play-testing notes from Krischan (2026-10-29)

- The rhythm works, and mines feel like a high-stakes event rather than "my boxes got removed".
- Defensive play against the Impossible bot felt good and fair: behind because of ice, but "ok, I have to look for another way" instead of a wall.
- Readability is the remaining problem, and the pitch matters most.

## Open questions

- **Sending ice:** Krischan isn't sold on ice being *sent* (from perfect clears and from thawing) yet, and nothing visibly travels from one board to the other: no projectiles. Parked as the last thing to worry about (2026-10-30).

- **Pool freezing:** Krischan's original rule had a backed-up mine pool slowly freeze cells. Not built; to discuss.
- **Round length:** about 5 minutes between even players since the ice cap. Levers: rush timing, freeze-over count, ice per perfect clear.
- **Spicy mines:** row, column or diagonal blasts as rare attacks. Version 2 content.
- **Spread landing** (one mine per unsolved region): built as a toggle; barely changes results in the simulations.
- **Server:** Cloudflare Durable Objects, one per match, instead of renting a Colyseus VM ([decision 0005](../decisions/0005-cloudflare-for-versus.md), proposed). The economy module is import-free so the same file can run there.

## Visual design

Krischan's design comps are in [design/](design/): the two-board layout with the score header ([versus-layout.png](design/versus-layout.png)), the mine fuse pies and ice thaw wedges ([hazard-tiles.png](design/hazard-tiles.png)), and a frame from the original build ([original-vs-build.png](design/original-vs-build.png)). The original build also had board shake on hits and a cooling color shift; the lab now has both.
