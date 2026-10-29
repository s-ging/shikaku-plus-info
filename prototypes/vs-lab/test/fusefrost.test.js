// fusefrost.test.js — Fuse & Frost rules. Run: node --test test/*.test.js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FF_RULES, FFPlayer } from '../src/fusefrost.js';
import { FFMatch } from '../src/ffmatch.js';

const p = (patch = {}) => new FFPlayer({ ...FF_RULES, ...patch }, 5);
const FREE = [...Array(36).keys()];
const kinds = (ev) => ev.map((e) => e.kind);

test('mines arrive after incomingEta of YOUR moves, then land in batches of 4', () => {
	const e = p();
	e.receiveMines(8);
	e.tick(FREE);
	e.tick(FREE);
	assert.equal(e.mines.length, 0);
	e.tick(FREE);
	assert.equal(e.mines.length, 4, 'first batch of 4');
	assert.equal(e.pool, 4);
	e.tick(FREE);
	assert.equal(e.mines.length, 6, 'cap 6 on board');
	assert.equal(e.pool, 2);
});

test('fuse: explodes on the 3rd move after landing, costs a heart', () => {
	const e = p();
	e.mines = [{ cell: 0, fuse: 3 }];
	e.tick(FREE);
	e.tick(FREE);
	const ev = e.tick(FREE);
	assert.ok(kinds(ev).includes('mineExplode'));
	assert.equal(e.hearts, 2);
});

test('defuse: covering with a placed rect, no reward', () => {
	const e = p();
	e.mines = [{ cell: 0, fuse: 2 }];
	const ev = e.onPlacement([0, 1], []);
	assert.deepEqual(kinds(ev), ['defuse']);
	assert.equal(e.outMines + e.outIce, 0);
});

test('net-cancel touches only packets in flight, oldest first, never the pool', () => {
	const e = p();
	e.incoming = [
		{ count: 3, eta: 1 },
		{ count: 4, eta: 3 }
	];
	e.pool = 5;
	assert.equal(e.cancelIncoming(5), 5);
	assert.deepEqual(e.incoming, [{ count: 2, eta: 3 }]);
	assert.equal(e.pool, 5);
});

test('ice: telegraphed target, lands after iceEta moves, never on clue cells', () => {
	const e = p();
	const free = [7, 8, 9]; // caller passes non-clue, uncovered cells only
	e.receiveIce(1, free);
	const target = e.iceIncoming[0].target;
	assert.ok(free.includes(target));
	e.tick(free);
	e.tick(free);
	assert.ok(kinds(e.tick(free)).includes('frozen'));
	assert.equal(e.ice[0].cell, target);
});

test('thaw: adjacent placement −2, thaw-out sends 1 ice back; passive −1 per 2 moves sends nothing', () => {
	const e = p();
	e.ice = [{ cell: 6, thaw: 2, seq: 0, landedTick: -1 }];
	const ev = e.onPlacement([0], [6, 1]);
	assert.ok(kinds(ev).includes('thaw'));
	assert.equal(e.outIce, 1);
	e.outIce = 0;
	e.ice = [{ cell: 6, thaw: 1, seq: 0, landedTick: -1 }];
	e.tick([]);
	assert.equal(e.ice.length, 1, 'first move: no passive thaw yet');
	e.tick([]);
	assert.equal(e.ice.length, 0);
	assert.equal(e.outIce, 0);
});

test('perfect clear sends 4 mines + 1 ice; a do-over makes it 4 mines only', () => {
	const e = p();
	e.onBoardCleared();
	assert.deepEqual(e.drainOut(), { mines: 4, ice: 1 });
	e.onErase();
	e.onBoardCleared();
	assert.deepEqual(e.drainOut(), { mines: 4, ice: 0 });
});

test('KO: hearts at 0, or 4 ice at once', () => {
	const a = p();
	a.hearts = 0;
	assert.ok(a.isKO);
	const b = p();
	b.ice = [0, 1, 2, 3].map((cell, seq) => ({ cell, thaw: 4, seq, landedTick: -1 }));
	assert.ok(b.isKO);
});

test('match: hazards never land on clue cells or solved rects', () => {
	const m = new FFMatch({ seed: 3 });
	const s = m.sides[0];
	m.sides[1].econ.outMines = 0;
	s.econ.receiveMines(6);
	s.econ.receiveIce(2, s.landable());
	const first = s.puzzle.layout[0];
	m.act(0, { type: 'place', ax: first.x1, ay: first.y1, bx: first.x2, by: first.y2 });
	for (let k = 0; k < 4; k++) m.act(0, { type: 'erase', x: first.x1, y: first.y1 }) || 0;
	const clue = (c) => s.puzzle.nums[Math.floor(c / s.N)][c % s.N] !== 0;
	for (const mine of s.econ.mines) assert.ok(!clue(mine.cell));
	for (const f of s.econ.ice) assert.ok(!clue(f.cell));
});

test('match: a round KO fully resets both players', () => {
	const m = new FFMatch({ seed: 4 });
	m.sides[1].econ.hearts = 1;
	m.sides[1].econ.mines = [{ cell: m.sides[1].landable()[0], fuse: 1 }];
	const r = m.sides[1].puzzle.layout.find((x) => !x.has(m.sides[1].econ.mines[0].cell % 6, Math.floor(m.sides[1].econ.mines[0].cell / 6)));
	m.act(1, { type: 'place', ax: r.x1, ay: r.y1, bx: r.x2, by: r.y2 });
	assert.equal(m.roundOver.winner, 0);
	m.newRound();
	assert.deepEqual(m.sides.map((s) => s.econ.hearts), [3, 3]);
	assert.equal(m.score[0], 1);
});

test('streak heal (off by default): +1 heart every 25 placements in a row, capped at max', () => {
	const e = p({ healEvery: 25 });
	e.hearts = 2;
	let healEv = [];
	for (let i = 0; i < 25; i++) healEv = e.onPlacement([i % 36], []);
	assert.ok(kinds(healEv).includes('heal'));
	assert.equal(e.hearts, 3);
	for (let i = 0; i < 25; i++) e.onPlacement([i % 36], []);
	assert.equal(e.hearts, 3, 'never above max');
});

test('heal: a do-over or erase resets the streak; an explosion does not', () => {
	const e = p();
	for (let i = 0; i < 10; i++) e.onPlacement([0], []);
	e.mines = [{ cell: 5, fuse: 1 }];
	e.tick(FREE);
	assert.equal(e.streak, 10, 'explosion keeps the streak');
	e.onPlacement([0], [], { doOver: true });
	assert.equal(e.streak, 0);
	e.onPlacement([0], []);
	e.onErase();
	assert.equal(e.streak, 0);
});

test('clear: pooled mines die with the board, in-flight mines keep coming (default)', () => {
	const e = p();
	e.pool = 3;
	e.incoming = [{ count: 4, eta: 2 }];
	const ev = e.onBoardCleared();
	assert.equal(e.pool, 0);
	assert.equal(e.incomingTotal, 4);
	assert.equal(ev[0].wiped, 3);
	const w = p({ clearWipesIncoming: true });
	w.pool = 1;
	w.incoming = [{ count: 4, eta: 2 }];
	w.onBoardCleared();
	assert.equal(w.incomingTotal, 0);
});

test('heal: 3 perfect boards in a row heals 1 heart; a sloppy clear resets the run', () => {
	const e = p();
	e.hearts = 1;
	e.onBoardCleared();
	e.onBoardCleared();
	e.onErase();
	e.onBoardCleared(); // not perfect: run resets
	assert.equal(e.hearts, 1);
	assert.equal(e.perfectRun, 0);
	e.onBoardCleared();
	e.onBoardCleared();
	const ev = e.onBoardCleared();
	assert.ok(kinds(ev).includes('heal'));
	assert.equal(e.hearts, 2);
	assert.equal(e.perfectRun, 0, 'run starts over after a heal');
});

test('heal: explosions do not spoil a perfect board', () => {
	const e = p();
	e.mines = [{ cell: 0, fuse: 1 }];
	e.tick(FREE); // explosion on board 1: 3 → 2 hearts
	assert.equal(e.hearts, 2);
	e.onBoardCleared();
	e.onBoardCleared();
	e.onBoardCleared();
	assert.equal(e.hearts, 3, 'the exploded board still counted as perfect');
});

test('heal: at most one heal per round by default', () => {
	const e = p();
	e.hearts = 1;
	for (let b = 0; b < 6; b++) e.onBoardCleared();
	assert.equal(e.hearts, 2, 'six perfect boards still heal only once');
	const u = p({ maxHealsPerRound: 0 });
	u.hearts = 1;
	for (let b = 0; b < 6; b++) u.onBoardCleared();
	assert.equal(u.hearts, 3);
});
