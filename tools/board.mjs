#!/usr/bin/env node
// board.mjs — read, check and solve Shikaku+ Classic boards from the command line.
//
// Lets a person or an AI agent see exactly the board the app shows for a seed,
// replay a move list the way the app does, and get the generator's own solution.
// Uses the landing page's byte-faithful port of the Dart generator
// (prototypes/vs-lab/src/puzzle.js, verified against puzzle_codec.dart by golden
// vectors), plus the seed and move formats from lib/puzzle_codec.dart.
//
// Usage:
//   node tools/board.mjs daily [YYYY-MM-DD]        today's (or a date's) daily puzzle
//   node tools/board.mjs <share seed>             e.g. c6ee3508f  (from a ?seed= link)
//   node tools/board.mjs "<Help Me! URL>"         seed + moves from a shared link
//   node tools/board.mjs <seed> --moves <tokens>  replay 8-hex-char move tokens
//   node tools/board.mjs <seed> --solution        print the solution as move tokens
//   node tools/board.mjs --encode <size> <e|m|h|b> <hex>   build a share seed
//
// Classic ruleset only. Hokan seeds (starting with "s") are recognised but not
// generated here yet.

import { generatePuzzle, stableHash, Rect } from '../prototypes/vs-lab/src/puzzle.js';
import { verifyRect, isSolved } from '../prototypes/vs-lab/src/game.js';

const DIFF = { e: ['Easy', 0.25], m: ['Medium', 0.15], h: ['Hard', 0.09], b: ['Brutal', 0.05] };

// CRC-8/SMBUS: poly 0x07, init 0x00, no reflection, no final XOR (puzzle_codec.dart _crc8).
export function crc8(s) {
	let crc = 0;
	for (let i = 0; i < s.length; i++) {
		crc ^= s.charCodeAt(i);
		for (let b = 0; b < 8; b++) crc = crc & 0x80 ? ((crc << 1) ^ 0x07) & 0xff : (crc << 1) & 0xff;
	}
	return crc;
}

// Wire format {mode}{size}{diff}{cc}{seedStr} (PuzzleCodec.parseSeed).
export function parseSeed(input) {
	const m = /^([cs])(\d+)([emhb])([0-9a-f]{2})(.*)$/.exec(input.trim().toLowerCase());
	if (!m) return null;
	const [, mode, sz, diff, cc, seedStr] = m;
	if (crc8(mode + sz + diff + seedStr).toString(16).padStart(2, '0') !== cc) return null;
	return { mode: mode === 's' ? 'hokan' : 'classic', sz: Number(sz), diff, seedStr };
}

export function encodeSeed(sz, diff, seedStr, mode = 'c') {
	const body = `${mode}${sz}${diff}${seedStr}`;
	return `${mode}${sz}${diff}${crc8(body).toString(16).padStart(2, '0')}${seedStr}`;
}

// PuzzleCodec.stableSeedHash: hex first, djb2 fallback. Hex longer than 13 digits
// exceeds JS's exact-integer range and would diverge from the Dart VM.
export function seedInt(seedStr) {
	if (/^[+-]?[0-9a-f]+$/i.test(seedStr)) return parseInt(seedStr, 16);
	return stableHash(seedStr);
}

// dailySeedInt: whole UTC days of (instant + 2h) → rolls over at 06:00 PHT.
export function dailyDay(date = new Date()) {
	return Math.floor((date.getTime() + 2 * 3600 * 1000) / 86400000);
}

export function encodeMove(r) {
	const h = (n) => n.toString(16).padStart(2, '0').toUpperCase();
	return h(r.x1) + h(r.y1) + h(r.x2) + h(r.y2);
}

// PuzzleCodec._replayPure, Classic branch: a token equal to a placed rect erases
// it; otherwise a valid rect replaces anything it overlaps; invalid tokens skip.
export function replay(nums, tokens) {
	const placed = [];
	const log = [];
	for (let i = 0; i + 8 <= tokens.length; i += 8) {
		const t = tokens.slice(i, i + 8);
		const v = [0, 2, 4, 6].map((k) => parseInt(t.slice(k, k + 2), 16));
		if (v.some(Number.isNaN)) {
			log.push(`${t}  skipped: not hex`);
			continue;
		}
		const r = new Rect(v[0], v[1], v[2], v[3]);
		const same = placed.findIndex((e) => e.x1 === r.x1 && e.y1 === r.y1 && e.x2 === r.x2 && e.y2 === r.y2);
		if (same >= 0) {
			placed.splice(same, 1);
			log.push(`${t}  erase`);
			continue;
		}
		if (r.x2 >= nums.length || r.y2 >= nums.length || !verifyRect(r, nums)) {
			log.push(`${t}  skipped: must hold exactly one clue equal to its area (${r.w}x${r.h}=${r.area})`);
			continue;
		}
		for (let k = placed.length - 1; k >= 0; k--) if (placed[k].overlaps(r)) placed.splice(k, 1);
		r.valid = true;
		placed.push(r);
		log.push(`${t}  place ${r.w}x${r.h} at (${r.x1},${r.y1})`);
	}
	return { placed, log };
}

export function render(nums, rects = []) {
	const N = nums.length;
	const owner = Array.from({ length: N }, () => new Array(N).fill(-1));
	rects.forEach((r, i) => {
		for (let y = r.y1; y <= r.y2; y++) for (let x = r.x1; x <= r.x2; x++) owner[y][x] = i;
	});
	const letter = (i) => String.fromCharCode(97 + (i % 26));
	const head = '     ' + [...Array(N).keys()].map((x) => String(x).padStart(3)).join('');
	const rows = nums.map((row, y) =>
		String(y).padStart(3) + '  ' + row.map((v, x) => (v ? String(v) : owner[y][x] >= 0 ? letter(owner[y][x]) : '.').padStart(3)).join('')
	);
	return [head, ...rows].join('\n');
}

function main(argv) {
	if (!argv.length || argv[0] === '--help' || argv[0] === '-h') {
		console.log(readHelp());
		return 0;
	}
	if (argv[0] === '--encode') {
		const [, sz, diff, hex] = argv;
		console.log(encodeSeed(Number(sz), diff, hex));
		return 0;
	}

	let seed;
	let moves = '';
	let label;
	const flag = (name) => {
		const i = argv.indexOf(name);
		return i >= 0 ? argv[i + 1] ?? '' : null;
	};

	if (argv[0] === 'daily') {
		const when = argv[1] && !argv[1].startsWith('--') ? new Date(`${argv[1]}T06:00:00+08:00`) : new Date();
		const day = dailyDay(when);
		seed = encodeSeed(6, 'e', day.toString(16));
		label = `Daily puzzle, day ${day} (${day.toString(16)})`;
	} else if (/^https?:\/\//.test(argv[0])) {
		const u = new URL(argv[0]);
		seed = u.searchParams.get('seed') ?? '';
		moves = u.searchParams.get('moves') ?? '';
		const from = u.searchParams.get('from');
		label = from ? `Help Me! link from ${from}` : 'Shared link';
	} else {
		seed = argv[0];
	}
	moves = flag('--moves') ?? moves;

	const p = parseSeed(seed);
	if (!p) {
		console.error(`Not a valid share seed: "${seed}". Expected {c|s}{size}{e|m|h|b}{2-hex checksum}{seed}, e.g. ${encodeSeed(6, 'e', '508f')}`);
		return 2;
	}
	if (p.mode === 'hokan') {
		console.error('Hokan seeds are not supported by this tool yet (Classic only).');
		return 2;
	}
	const [diffName, frac] = DIFF[p.diff];
	const rng = seedInt(p.seedStr);
	const { nums, layout } = generatePuzzle(p.sz, frac, rng);

	console.log(`${label ? label + '\n' : ''}Seed ${seed} → Classic ${p.sz}x${p.sz} ${diffName}, generator seed ${rng}`);
	console.log(`Share link: https://shikaku.plus/?seed=${seed}`);
	console.log(`Clues: ${layout.length} (a perfect solve is ${layout.length} placements)\n`);

	if (argv.includes('--solution')) {
		console.log(render(nums, layout));
		console.log(`\nSolution tokens: ${layout.map(encodeMove).join('')}`);
		console.log('(The generator\'s own layout. Shikaku boards can have more than one valid solution.)');
		return 0;
	}
	if (moves) {
		const { placed, log } = replay(nums, moves);
		console.log(log.join('\n') + '\n');
		console.log(render(nums, placed));
		console.log(`\n${isSolved(placed, p.sz) ? 'SOLVED' : `Not solved yet: ${placed.length} of ${layout.length} boxes placed`}`);
		return 0;
	}
	console.log(render(nums));
	console.log('\nNumbers are clues; "." is an empty cell. Coordinates are (x, y), zero-based.');
	return 0;
}

function readHelp() {
	return `Shikaku+ board tool (Classic)

  node tools/board.mjs daily [YYYY-MM-DD]
  node tools/board.mjs <share seed> [--moves <tokens>] [--solution]
  node tools/board.mjs "<https://shikaku.plus/?seed=...&moves=...>"
  node tools/board.mjs --encode <size> <e|m|h|b> <hex>

A move token is 8 uppercase hex chars X1Y1X2Y2 (two digits each), e.g. 00000102
is the box from (0,0) to (1,2). Concatenate tokens with no separator.`;
}

if (import.meta.url === `file://${process.argv[1]}`) process.exit(main(process.argv.slice(2)));
