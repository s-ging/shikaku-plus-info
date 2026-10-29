// economy.test.js — edge cases from vs_handoff.md §9. Run: node --test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
	DEFAULT_RULES,
	PlayerEconomy,
	BoardCompletionSolver,
	freeCellsOf,
	unplacedGivens
} from '../src/economy.js';
import { generatePuzzle } from '../src/puzzle.js';
import { verifyRect } from '../src/game.js';

const R = { ...DEFAULT_RULES };
const kinds = (ev) => ev.map((e) => e.kind);
const ALL = [...Array(36).keys()];
const eco = (patch = {}) => new PlayerEconomy({ ...R, ...patch }, 7);
const ice = (e, cells, thaws = []) => {
	e.frozen = cells.map((cell, i) => ({ cell, thaw: thaws[i] ?? 4, seq: i, landedTurn: -1 }));
};

// Six rows, each a single 6 clue at x=0 → unique solution: the rows.
const rowsNums = () => Array.from({ length: 6 }, () => [6, 0, 0, 0, 0, 0]);
const row = (y) => ({ x1: 0, y1: y, x2: 5, y2: y });
// 2×2 with two completions (rows or columns).
const twoWay = () => ({ N: 2, nums: [[2, 0], [0, 2]], rects: [] });

// —— Temperature / promise ——
test('effective temp: no ice → raw; ice + raw above floor → floor; raw below → raw', () => {
	const e = eco();
	e.temp = -10;
	assert.equal(e.effectiveTemp, -10);
	ice(e, [0]);
	assert.equal(e.effectiveTemp, -25);
	assert.equal(e.showPromise, true);
	e.temp = -40;
	assert.equal(e.effectiveTemp, -40);
	assert.equal(e.showPromise, false);
});

test('4 frozen cells = -100 = defeat', () => {
	const e = eco();
	ice(e, [0, 1, 2, 3]);
	assert.equal(e.isDefeated, true);
});

// —— Freeze cadence ——
test('freeze: warn → 3 ticks → land; stagger resets on landing, not queueing', () => {
	const e = eco({ decayAmount: 0 });
	e.temp = -30;
	assert.ok(kinds(e.tick(ALL)).includes('freezeWarn'));
	assert.deepEqual(e.freezeQueue, [3]);
	e.tick(ALL);
	e.tick(ALL);
	assert.equal(e.frozen.length, 0);
	assert.ok(kinds(e.tick(ALL)).includes('frozen'));
	assert.equal(e.frozen.length, 1);
	assert.equal(e.turnsSinceFreezeSpawn, 0);
	assert.ok(!kinds(e.tick(ALL)).includes('freezeWarn'), 'blocked during stagger');
	assert.ok(kinds(e.tick(ALL)).includes('freezeWarn'), 'queues once stagger elapses');
});

test('freeze: 1 warning at -25..-49, up to 2 at <= -50', () => {
	const mild = eco({ decayAmount: 0 });
	mild.temp = -40;
	mild.tick(ALL);
	mild.tick(ALL);
	assert.equal(mild.freezeQueue.length, 1);
	const deep = eco({ decayAmount: 0 });
	deep.temp = -60;
	deep.tick(ALL);
	deep.tick(ALL);
	assert.equal(deep.freezeQueue.length, 2);
});

test('freeze: raw temp above -25 abandons the queue', () => {
	const e = eco({ decayAmount: 0 });
	e.temp = -30;
	e.tick(ALL);
	e.temp = -10;
	assert.ok(kinds(e.tick(ALL)).includes('freezeAbandon'));
	assert.equal(e.freezeQueue.length, 0);
});

test('freeze trigger reads RAW temp: ice alone does not keep spawning more', () => {
	const e = eco({ decayAmount: 0 });
	e.temp = 0;
	ice(e, [0]);
	assert.equal(e.effectiveTemp, -25);
	assert.ok(!kinds(e.tick(ALL)).includes('freezeWarn'));
});

// —— Thaw ——
test('passive thaw skips a cell that landed this tick', () => {
	const e = eco({ decayAmount: 0, passiveThawEvery: 1 });
	e.temp = -30;
	e.tick(ALL); // warn
	e.tick(ALL);
	e.tick(ALL);
	e.tick(ALL); // lands
	assert.equal(e.frozen[0].thaw, 4);
	e.temp = -10;
	e.tick(ALL);
	assert.equal(e.frozen[0].thaw, 3);
});

test('active + combo thaw on one placement is capped at 2 per cell', () => {
	const e = eco();
	ice(e, [6]); // (0,1), directly below (0,0)
	e.combo = 5; // next placement hits x6
	const ev = e.onPlacement([0], [6, 1]);
	assert.equal(e.frozen[0].thaw, 2, 'only 2 thaw total, not 4');
	assert.ok(kinds(ev).includes('comboAttack'));
});

test('thawing the last cell releases the floor', () => {
	const e = eco();
	e.temp = 0;
	ice(e, [6], [2]);
	const ev = e.onPlacement([0], [6]);
	assert.ok(kinds(ev).includes('thaw'));
	assert.equal(e.frozen.length, 0);
	assert.equal(e.effectiveTemp, 25);
});

// —— Mines ——
test('mines: batch of 4 with stagger 2 → 2 land, 2 bank, surge lands the rest next tick', () => {
	const e = eco({ decayAmount: 0 });
	e.receiveMines(4);
	assert.ok(kinds(e.tick(ALL)).includes('mineEnqueued'));
	e.tick(ALL);
	e.tick(ALL);
	const ev = e.tick(ALL);
	assert.equal(kinds(ev).filter((k) => k === 'mineLand').length, 2);
	assert.equal(e.bank, 2);
	assert.equal(e.temp, -15);
	const ev2 = e.tick(ALL);
	assert.ok(kinds(ev2).includes('surge'));
	assert.equal(e.mines.length, 4);
	assert.equal(e.bank, 0);
});

test('mines: no free cells → everything banks', () => {
	const e = eco({ decayAmount: 0 });
	e.receiveMines(2);
	for (let i = 0; i < 4; i++) e.tick([]);
	assert.equal(e.mines.length, 0);
	assert.equal(e.bank, 2);
});

test('mines: fuse 1 emits mineFuseFinal, fuse 0 explodes for -10', () => {
	const e = eco({ decayAmount: 0 });
	e.mines = [{ cell: 0, fuse: 3 }];
	e.tick(ALL);
	assert.ok(kinds(e.tick(ALL)).includes('mineFuseFinal'));
	const ev = e.tick(ALL);
	assert.ok(kinds(ev).includes('mineExplode'));
	assert.equal(e.temp, -10);
	assert.equal(e.mines.length, 0);
});

test('defuse: +5 temp, every 2 defuses sends 1, never thaws ice', () => {
	const e = eco();
	e.mines = [
		{ cell: 0, fuse: 2 },
		{ cell: 1, fuse: 2 }
	];
	ice(e, [20]);
	e.onPlacement([0, 1], []);
	assert.equal(e.temp, 10);
	assert.equal(e.pendingBonusMines, 1);
	assert.equal(e.frozen[0].thaw, 4);
});

// —— Attack ——
test('clear sends 4 + perfect streak, capped at 8; do-over resets the streak', () => {
	const e = eco();
	const sends = [];
	for (let i = 0; i < 6; i++) {
		e.onBoardCleared();
		sends.push(e.drainOutgoing());
	}
	assert.deepEqual(sends, [5, 6, 7, 8, 8, 8]);
	e.onErase();
	e.onBoardCleared();
	assert.equal(e.drainOutgoing(), 4);
	assert.equal(e.perfectStreak, 0);
});

test('combo x6: +1 mine, pauses decay 2 turns; do-over resets combo', () => {
	const e = eco();
	for (let i = 0; i < 6; i++) e.onPlacement([i], []);
	assert.equal(e.pendingBonusMines, 1);
	e.tick([]);
	e.tick([]);
	assert.equal(e.temp, 0, 'decay paused');
	e.tick([]);
	e.tick([]);
	assert.equal(e.temp, -1);
	e.onPlacement([7], [], { doOver: true });
	assert.equal(e.combo, 0);
});

test('net-cancel: pending first, then batches from the back, never landed mines', () => {
	const e = eco();
	e.pendingMines = 2;
	e.mineQueue = [
		{ count: 4, eta: 1 },
		{ count: 3, eta: 3 }
	];
	e.mines = [{ cell: 0, fuse: 3 }];
	assert.equal(e.cancelIncoming(4), 4);
	assert.equal(e.pendingMines, 0);
	assert.deepEqual(e.mineQueue, [
		{ count: 4, eta: 1 },
		{ count: 1, eta: 3 }
	]);
	assert.equal(e.mines.length, 1);
});

// —— Force break ——
test('force break: 2 frozen, 2 unplaced, both blocked → break 2 (+60, +4 mines)', () => {
	const board = { N: 6, nums: rowsNums(), rects: [0, 1, 2, 3].map(row) };
	const e = eco();
	e.temp = -60;
	ice(e, [27, 33]); // (3,4) and (3,5)
	const ev = e.checkStuckAndForceBreak(board);
	assert.equal(kinds(ev).filter((k) => k === 'forceBreak').length, 2);
	assert.equal(e.temp, 0);
	assert.equal(e.pendingBonusMines, 4);
});

test('force break: 2 frozen, 1 unplaced, both inside its rect → break 2', () => {
	const board = { N: 6, nums: rowsNums(), rects: [0, 1, 2, 3, 4].map(row) };
	const e = eco();
	ice(e, [31, 33]);
	assert.equal(e.checkStuckAndForceBreak(board).length, 2);
});

test('force break: nearest-to-thaw breaks first', () => {
	const board = { N: 6, nums: rowsNums(), rects: [0, 1, 2, 3, 4].map(row) };
	const e = eco();
	ice(e, [31, 33], [4, 1]);
	const ev = e.checkStuckAndForceBreak(board);
	assert.equal(ev[0].cell, 33);
});

test('force break: alternate routes — break 1 can unblock both clues', () => {
	// 2×2, clues at (0,0) and (1,1): finish as rows or as columns.
	const e = eco();
	ice(e, [1, 2], [1, 4]);
	const ev = e.checkStuckAndForceBreak(twoWay());
	assert.deepEqual(kinds(ev), ['forceBreak']);
	assert.equal(ev[0].cell, 1);
});

test('force break: gate — 1 ice, 2 clues → no check (each clue still has a route)', () => {
	const e = eco();
	ice(e, [1]);
	assert.equal(e.checkStuckAndForceBreak(twoWay()).length, 0);
});

test('force break: gate — more unplaced clues than ice → no check', () => {
	const board = { N: 6, nums: rowsNums(), rects: [0, 1, 2].map(row) };
	const e = eco();
	ice(e, [27, 33]); // 3 unplaced > 2 frozen
	assert.equal(e.checkStuckAndForceBreak(board).length, 0);
});

test('force break: bad routing (no completion even ignoring ice) → break 0', () => {
	// Find a real VS board + a valid-but-wrong rect that leaves no completion.
	let found = null;
	for (let seed = 1; seed < 400 && !found; seed++) {
		const { nums, layout } = generatePuzzle(6, 0.32, seed);
		const sol = new Set(layout.map((r) => `${r.x1},${r.y1},${r.x2},${r.y2}`));
		for (let y1 = 0; y1 < 6 && !found; y1++)
			for (let x1 = 0; x1 < 6 && !found; x1++)
				for (let y2 = y1; y2 < 6 && !found; y2++)
					for (let x2 = x1; x2 < 6 && !found; x2++) {
						const rc = { x1, y1, x2, y2, area: (x2 - x1 + 1) * (y2 - y1 + 1) };
						if (sol.has(`${x1},${y1},${x2},${y2}`) || !verifyRect(rc, nums)) continue;
						const board = { N: 6, nums, rects: [rc] };
						if (!BoardCompletionSolver.solve(board).solvable) found = board;
					}
	}
	assert.ok(found, 'found a bad-routing board');
	const e = eco();
	const free = freeCellsOf(found);
	const n = unplacedGivens(found).length;
	ice(e, free.slice(0, n));
	assert.equal(e.checkStuckAndForceBreak(found).length, 0);
});

test('solver: node budget stays far below 20,000 on VS boards', () => {
	let max = 0;
	for (let seed = 1; seed <= 300; seed++) {
		const { nums } = generatePuzzle(6, 0.32, seed);
		const a = BoardCompletionSolver.solve({ N: 6, nums, rects: [] });
		assert.ok(a.solvable);
		max = Math.max(max, a.nodes);
	}
	assert.ok(max < 20000, `max nodes ${max}`);
});
