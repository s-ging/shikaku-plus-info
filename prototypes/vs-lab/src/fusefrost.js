// fusefrost.js — Fuse & Frost: the stripped-down VS economy (2026-10-29).
//
//   Mines (active):  sent by clears, land when YOU move, fuse down on your moves,
//                    cover with a finished rect to defuse, explode = −1 heart.
//   Ice (passive):   sent by perfect clears and by ice your opponent thaws;
//                    refuses rects, so it stalls your board until it thaws.
//   KO:              hearts run out, or freezeOverAt ice on the board at once.
//
// Only dependency: the board solver from economy.js (for the force break).
// Every mutation returns events { kind, ...data }. Cells are i = y * N + x.
import { BoardCompletionSolver, EconRng } from './economy.js';

export const FF_RULES = {
	hearts: 3,
	freezeOverAt: 4,

	// Attack
	clearSend: 4,
	perfectSendsIce: 1,
	overflow: 'netCancel',
	// Counter-spike: a clear cancels up to counterCap mines from your orange bank
	// (never the red batch) and adds every cancelled mine to its own attack.
	counterSpike: true,
	counterCap: 12,
	counterRate: 1, // share of the cancelled mines added back to your attack // 'netCancel': your attack cancels your in-flight mines first | 'passthrough'

	// Mines
	incomingEta: 3, // your moves before a sent packet arrives
	batchSize: 6, // most that land in one move (was 4)
	mineCap: 6, // live mines on board; the rest wait in the pool
	mineFuse: 3,
	maxHeartsPerMove: 1, // mines going off on the same move cost at most this many hearts (anti-burst)
	spreadLanding: false, // land one per unsolved region (experiment)
	blastRadius: 1, // 3×3

	// Ice
	iceEta: 2, // was 3: two moves of warning is more threatening
	maxIceIncoming: 0, // 0 = no cap: ice stacks if the opponent is cracked
	telegraphIce: false, // false: no target cell shown; the board just catches a chill until it lands
	thawPoints: 4,
	passiveThawEvery: 2, // −1 every 2 moves (0.5 per move)
	activeThaw: 2, // a placed rect sharing an edge
	perPlacementThawCap: 2,
	thawSendsIce: true, // ice you thaw by building is sent back
	forceBreakSendsIce: false,
	icebreakAtBoxesLeft: 2, // the icebreaker only helps on your last N boxes
	icebreakPerMove: 1, // and breaks at most this many cells per move
	icebreakSpills: true, // broken ice isn't destroyed: it returns on your next board

	// Rush: once the round runs long, every mine attack is multiplied
	rushAfter: 100, // match moves (average of both players); 0 = off
	rushMultiplier: 5,

	// Heal: +1 heart after healPerfectBoards perfect clears in a row (0 = off).
	// A non-perfect clear resets the run; explosions don't count against perfect.
	healPerfectBoards: 4, // was 3
	maxHealsPerRound: 1, // 0 = unlimited; stops a low-heart player from chaining heals
	// Older idea, off: +1 heart every N placements in a row without a do-over.
	healEvery: 0,

	// On your board clear: mines that already arrived (the pool) die with the board.
	// Mines still in flight keep coming unless clearWipesIncoming is on.
	clearWipesPool: false, // the red batch is committed: it lands on your next board
	clearWipesIncoming: false,

	solverBudget: 20000
};

export class FFPlayer {
	constructor(rules = FF_RULES, seed = 1) {
		this.rules = rules;
		this.seed = seed;
		this.reset();
	}

	reset() {
		this.rng = new EconRng(this.seed);
		this.hearts = this.rules.hearts;
		this.ticks = 0;
		this.mines = []; // { cell, fuse }
		this.incoming = []; // packets in flight: { count, eta }
		this.pool = 0; // arrived, waiting for room
		this.ice = []; // { cell, thaw, seq, landedTick }
		this.iceIncoming = []; // { eta, target }
		this._seq = 0;
		this._thawAcc = 0;
		this.doOversThisBoard = 0;
		this.streak = 0;
		this.perfectRun = 0;
		this.heals = 0;
		this.outMines = 0;
		this.outIce = 0;
		this.spill = 0; // icebroken cells waiting for your next board
		this.stats = { defused: 0, exploded: 0, thawed: 0, sentIce: 0, forceBreaks: 0, clears: 0, perfects: 0 };
	}

	get incomingTotal() {
		return this.incoming.reduce((a, p) => a + p.count, 0);
	}
	/** Red: the batch that lands on your next move. Committed; can't be cancelled. */
	get nextBatch() {
		const arriving = this.pool + this.incoming.filter((p) => p.eta <= 1).reduce((a, p) => a + p.count, 0);
		const room = Math.max(0, this.rules.mineCap - this.mines.length);
		return Math.min(arriving, room, this.rules.batchSize);
	}
	/** Orange: everything else on its way or parked. A clear's counter-spike cancels from here. */
	get bank() {
		return this.pool + this.incomingTotal - this.nextBatch;
	}
	/** Moves until the next mine packet lands, or null. */
	get nextMinesIn() {
		if (this.pool > 0) return 1;
		return this.incoming.length ? Math.min(...this.incoming.map((p) => p.eta)) : null;
	}
	get isKO() {
		return this.hearts <= 0 || this.ice.length >= this.rules.freezeOverAt;
	}
	iceSet() {
		return new Set(this.ice.map((f) => f.cell));
	}

	_occupied() {
		const s = new Set();
		for (const m of this.mines) s.add(m.cell);
		for (const f of this.ice) s.add(f.cell);
		for (const w of this.iceIncoming) if (w.target >= 0) s.add(w.target);
		return s;
	}
	_pick(free, extraBlocked = new Set()) {
		const occ = this._occupied();
		const pool = free.filter((c) => !occ.has(c) && !extraBlocked.has(c));
		return pool.length ? pool[this.rng.nextInt(pool.length)] : -1;
	}

	// —— Receiving ——
	receiveMines(count) {
		if (count > 0) this.incoming.push({ count, eta: this.rules.incomingEta });
		return count > 0 ? [{ kind: 'minesIncoming', count, eta: this.rules.incomingEta }] : [];
	}
	/** Ice is telegraphed on a visible target cell. free = landable cells now. */
	receiveIce(count, free) {
		const r = this.rules;
		const ev = [];
		for (let i = 0; i < count; i++) {
			if (r.maxIceIncoming && this.iceIncoming.length >= r.maxIceIncoming) {
				ev.push({ kind: 'iceBlocked' });
				continue;
			}
			const target = r.telegraphIce ? this._pick(free) : -1;
			this.iceIncoming.push({ eta: r.iceEta, target });
			ev.push({ kind: 'iceIncoming', target, eta: r.iceEta });
		}
		return ev;
	}

	/** Net-cancel: only packets still in flight, oldest first. Never the pool or the board. */
	cancelIncoming(count) {
		// Only the orange bank: far packets first (oldest first), then whatever is
		// arriving next move beyond the red batch.
		let left = Math.min(count, this.bank);
		const start = left;
		for (const p of this.incoming) {
			if (left <= 0) break;
			if (p.eta <= 1) continue;
			const take = Math.min(left, p.count);
			p.count -= take;
			left -= take;
		}
		for (const p of this.incoming) {
			if (left <= 0) break;
			if (p.eta > 1) continue;
			const take = Math.min(left, p.count);
			p.count -= take;
			left -= take;
		}
		if (left > 0) {
			const take = Math.min(left, this.pool);
			this.pool -= take;
			left -= take;
		}
		this.incoming = this.incoming.filter((p) => p.count > 0);
		return start - left;
	}

	/** New board: re-aim telegraphed ice at cells that exist on it. */
	retargetIce(free) {
		for (const w of this.iceIncoming) w.target = -1;
		if (this.rules.telegraphIce) for (const w of this.iceIncoming) w.target = this._pick(free);
	}

	// —— Your moves ——
	onPlacement(rectCells, edgeCells, { doOver = false } = {}) {
		const r = this.rules;
		const ev = [];
		if (doOver) {
			this.doOversThisBoard++;
			this.streak = 0;
		} else {
			this.streak++;
			if (r.healEvery && this.streak % r.healEvery === 0) {
				const healed = this.hearts < r.hearts;
				if (healed) this.hearts++;
				ev.push({ kind: 'heal', streak: this.streak, healed, hearts: this.hearts });
			}
		}
		const covered = new Set(rectCells);
		for (let i = this.mines.length - 1; i >= 0; i--) {
			if (!covered.has(this.mines[i].cell)) continue;
			ev.push({ kind: 'defuse', cell: this.mines[i].cell });
			this.mines.splice(i, 1);
			this.stats.defused++;
		}
		const edge = new Set(edgeCells);
		for (const f of [...this.ice]) {
			if (!edge.has(f.cell)) continue;
			const amt = Math.min(r.activeThaw, r.perPlacementThawCap);
			f.thaw -= amt;
			if (f.thaw <= 0) {
				this.ice.splice(this.ice.indexOf(f), 1);
				this.stats.thawed++;
				const sends = r.thawSendsIce;
				if (sends) {
					this.outIce++;
					this.stats.sentIce++;
				}
				ev.push({ kind: 'thaw', cell: f.cell, source: 'active', sends });
			} else ev.push({ kind: 'thawPulse', cell: f.cell, thaw: f.thaw });
		}
		return ev;
	}

	onErase() {
		this.doOversThisBoard++;
		this.streak = 0;
		return [];
	}

	onBoardCleared() {
		const r = this.rules;
		const perfect = this.doOversThisBoard === 0;
		this.outMines += r.clearSend;
		if (perfect) {
			this.outIce += r.perfectSendsIce;
			this.stats.perfects++;
			this.stats.sentIce += r.perfectSendsIce;
		}
		this.stats.clears++;
		const ev = [];
		this.perfectRun = perfect ? this.perfectRun + 1 : 0;
		const healsLeft = !r.maxHealsPerRound || this.heals < r.maxHealsPerRound;
		if (r.healPerfectBoards && healsLeft && this.perfectRun >= r.healPerfectBoards) {
			this.perfectRun = 0;
			const healed = this.hearts < r.hearts;
			if (healed) {
				this.hearts++;
				this.heals++;
			}
			ev.push({ kind: 'heal', boards: r.healPerfectBoards, healed, hearts: this.hearts });
		}
		this.mines = []; // mines on the board die with it
		this.ice = []; // defensive: a cleared board can't hold ice
		this.doOversThisBoard = 0;
		const wiped = (r.clearWipesPool ? this.pool : 0) + (r.clearWipesIncoming ? this.incomingTotal : 0);
		if (r.clearWipesPool) this.pool = 0;
		if (r.clearWipesIncoming) this.incoming = [];
		return [{ kind: 'clear', wiped, perfect, perfectRun: this.perfectRun, sendMines: r.clearSend, sendIce: perfect ? r.perfectSendsIce : 0 }, ...ev];
	}

	drainOut() {
		const out = { mines: this.outMines, ice: this.outIce };
		this.outMines = 0;
		this.outIce = 0;
		return out;
	}

	/**
	 * One move's clock step. Runs AFTER your move resolved (so a clear's attack has
	 * already cancelled incoming). free = uncovered, non-clue cells.
	 * regionOf (optional): cell → solution-rect index, for spread landing.
	 */
	tick(free, regionOf = null) {
		const r = this.rules;
		const ev = [];
		this.ticks++;

		// 1) Fuses
		// Several mines going off on one move cost at most maxHeartsPerMove (anti-burst);
		// every one still blasts the board.
		const blown = [];
		for (const m of [...this.mines]) {
			m.fuse--;
			if (m.fuse <= 0) {
				this.mines.splice(this.mines.indexOf(m), 1);
				this.stats.exploded++;
				blown.push(m);
			}
		}
		if (blown.length) {
			const cap = r.maxHeartsPerMove || blown.length;
			this.hearts -= Math.min(blown.length, cap);
			for (const m of blown) ev.push({ kind: 'mineExplode', cell: m.cell, hearts: this.hearts, together: blown.length });
		}

		// 2) Passive thaw (sends nothing)
		if (++this._thawAcc >= r.passiveThawEvery) {
			this._thawAcc = 0;
			for (const f of [...this.ice]) {
				if (f.landedTick === this.ticks) continue;
				f.thaw--;
				if (f.thaw <= 0) {
					this.ice.splice(this.ice.indexOf(f), 1);
					this.stats.thawed++;
					ev.push({ kind: 'thaw', cell: f.cell, source: 'passive', sends: false });
				} else ev.push({ kind: 'thawPulse', cell: f.cell, thaw: f.thaw });
			}
		}

		// 3) Mines in flight → pool → board (Tetris: lands when you move)
		for (const p of this.incoming) p.eta--;
		for (const p of this.incoming.filter((q) => q.eta <= 0)) this.pool += p.count;
		this.incoming = this.incoming.filter((q) => q.eta > 0);
		if (this.pool > 0) {
			const room = Math.max(0, r.mineCap - this.mines.length);
			let n = Math.min(this.pool, room, r.batchSize);
			const usedRegions = new Set(this.mines.map((m) => regionOf?.[m.cell]));
			let landed = 0;
			while (landed < n) {
				let block = new Set();
				if (r.spreadLanding && regionOf) {
					block = new Set(free.filter((c) => usedRegions.has(regionOf[c])));
					if (free.every((c) => block.has(c))) block = new Set();
				}
				const cell = this._pick(free, block);
				if (cell < 0) break;
				this.mines.push({ cell, fuse: r.mineFuse });
				if (regionOf) usedRegions.add(regionOf[cell]);
				ev.push({ kind: 'mineLand', cell });
				landed++;
			}
			this.pool -= landed;
		}

		// 4) Ice in flight
		for (const w of this.iceIncoming) w.eta--;
		for (const w of [...this.iceIncoming]) {
			if (w.eta > 0) continue;
			const occ = new Set([...this.mines.map((m) => m.cell), ...this.ice.map((f) => f.cell)]);
			let cell = w.target;
			if (cell < 0 || !free.includes(cell) || occ.has(cell)) {
				w.target = -1;
				cell = this._pick(free);
			}
			if (cell < 0) {
				w.eta = 0; // no room: retry next move
				continue;
			}
			this.iceIncoming.splice(this.iceIncoming.indexOf(w), 1);
			this.ice.push({ cell, thaw: r.thawPoints, seq: this._seq++, landedTick: this.ticks });
			ev.push({ kind: 'frozen', cell });
		}

		if (this.hearts <= 0) ev.push({ kind: 'ko', by: 'mines' });
		else if (this.ice.length >= r.freezeOverAt) ev.push({ kind: 'ko', by: 'ice' });
		return ev;
	}

	// —— Icebreaker (anti-softlock), same proven logic as the original ——
	forceBreakAt(cell) {
		const f = this.ice.find((x) => x.cell === cell);
		if (!f) return [];
		this.ice.splice(this.ice.indexOf(f), 1);
		this.stats.forceBreaks++;
		if (this.rules.forceBreakSendsIce) this.outIce++;
		if (this.rules.icebreakSpills) this.spill++;
		return [{ kind: 'forceBreak', cell, spills: this.rules.icebreakSpills }];
	}
	_nearestToThaw(list) {
		if (!list.length) return null;
		const min = Math.min(...list.map((f) => f.thaw));
		const atMin = list.filter((f) => f.thaw === min);
		const oldest = Math.min(...atMin.map((f) => f.seq));
		const ties = atMin.filter((f) => f.seq === oldest);
		return ties[this.rng.nextInt(ties.length)];
	}
	/** True if some unplaced clue has at least one valid box that avoids ice. */
	hasIceFreeMove(board) {
		const cov = new Set();
		for (const rc of board.rects) for (let y = rc.y1; y <= rc.y2; y++) for (let x = rc.x1; x <= rc.x2; x++) cov.add(y * board.N + x);
		const ice = this.iceSet();
		for (let y = 0; y < board.N; y++)
			for (let x = 0; x < board.N; x++) {
				const v = board.nums[y][x];
				if (!v || cov.has(y * board.N + x)) continue;
				const cands = BoardCompletionSolver.candidates(board, { x, y, v }, cov);
				if (cands.some((c) => c.cells.every((cell) => !ice.has(cell)))) return true;
			}
		return false;
	}

	checkStuckAndForceBreak(board, unplacedCount) {
		const ev = [];
		const r = this.rules;
		if (!this.ice.length || unplacedCount > this.ice.length) return ev;
		// Normally the icebreaker only helps on your last N boxes. But if ice leaves you
		// with no legal placement at all, it steps in anyway: the board only ticks when
		// you move, so with nothing to place the ice would never melt (a true softlock).
		if (r.icebreakAtBoxesLeft && unplacedCount > r.icebreakAtBoxesLeft && this.hasIceFreeMove(board)) return ev;
		let budget = r.icebreakPerMove || Infinity;
		let guard = this.ice.length + 1;
		let passB = null;
		while (this.ice.length && guard-- > 0 && budget-- > 0) {
			const a = BoardCompletionSolver.analyze(board, this.iceSet(), this.rules.solverBudget);
			if (passB === null) passB = a.solvable;
			const softlock = !this.hasIceFreeMove(board);
			if (!softlock && (!passB || !a.blocked.length)) break;
			let pool = this.ice.filter((f) => a.blockingIce.has(f.cell));
			if (!pool.length && softlock) pool = this.ice; // nothing provably blocking: free the nearest-to-thaw
			const target = this._nearestToThaw(pool);
			if (!target) break;
			ev.push(...this.forceBreakAt(target.cell));
		}
		return ev;
	}
}
