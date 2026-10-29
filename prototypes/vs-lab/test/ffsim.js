// ffsim.js — Fuse & Frost bot-vs-bot. Each bot moves on its own clock
// (seconds per move with jitter); each move ticks only that bot's board.
// Run: node test/ffsim.js
import { FFMatch, TiltBot, BOT_PRESETS } from '../src/ffmatch.js';
import { FF_RULES } from '../src/fusefrost.js';
import { EconRng } from '../src/economy.js';

export function simulate({ rules = {}, you = {}, them = {}, rounds = 60, maxSeconds = 900, seed = 1 } = {}) {
	const st = { rounds: 0, wins: [0, 0, 0], ko: { mines: 0, ice: 0 }, secs: [], leads: [], rush: 0, stall: 0 };
	for (let m = 0; st.rounds < rounds; m++) {
		const match = new FFMatch({ rules: { ...FF_RULES, ...rules }, seed: seed * 7000 + m, target: 1 });
		const bots = [new TiltBot({ seed: 11 + m, ...you.bot }), new TiltBot({ seed: 77 + m, ...them.bot })];
		const pace = [you.secs ?? 1.6, them.secs ?? 1.6];
		const read = [you.read ?? 0, them.read ?? 0];
		const lastBoard = [0, 0];
		const lastTick = [0, 0];
		const idle = (rules.idleTickSecs ?? FF_RULES.idleTickSecs) || Infinity;
		const rng = new EconRng(seed * 31 + m);
		const jitter = () => 0.6 + (rng.nextInt(1000) / 1000) * 0.8; // ×0.6–1.4
		const next = [pace[0] * jitter(), pace[1] * jitter()];
		let t = 0;
		let sawRush = false;
		while (!match.roundOver && t < maxSeconds) {
			const i = next[0] <= next[1] ? 0 : 1;
			t = next[i];
			const r = match.act(i, bots[i].decide(match.sides[i]));
			if (r.moved) lastTick[i] = t;
			else if (t - lastTick[i] >= idle) { match.idleTick(i); lastTick[i] = t; }
			next[i] = t + pace[i] * jitter();
			if (match.sides[i].boardIndex !== lastBoard[i]) {
				lastBoard[i] = match.sides[i].boardIndex;
				next[i] += read[i];
			}
			if (match.rush) sawRush = true;
		}
		st.rounds++;
		if (!match.roundOver) {
			st.wins[2]++;
			st.stall++;
			continue;
		}
		const w = match.roundOver.winner;
		st.wins[w === null ? 2 : w]++;
		st.ko[match.roundOver.by]++;
		st.secs.push(t);
		st.leads.push(match.leadChanges);
		if (sawRush) st.rush++;
	}
	return st;
}

function report(label, st) {
	const n = st.rounds;
	const pc = (x) => `${Math.round((100 * x) / n)}%`.padStart(4);
	const s = [...st.secs].sort((a, b) => a - b);
	const med = s.length ? s[Math.floor(s.length / 2)] : 0;
	const mmss = (x) => `${Math.floor(x / 60)}:${String(Math.round(x % 60)).padStart(2, '0')}`;
	const avgLead = st.leads.length ? (st.leads.reduce((a, b) => a + b, 0) / st.leads.length).toFixed(2) : '-';
	const withLead = st.leads.length ? pc(st.leads.filter((x) => x > 0).length) : '-';
	console.log(
		`${label.padEnd(34)} you ${pc(st.wins[0])} them ${pc(st.wins[1])} stall ${pc(st.stall)} | KO mines ${pc(st.ko.mines)} ice ${pc(st.ko.ice)} | median ${mmss(med)} | rush ${pc(st.rush)} | lead changes avg ${avgLead}, rounds with any ${withLead}`
	);
}

if (import.meta.url === `file://${process.argv[1]}`) {
	// A strong human stand-in: ~2s per move, ~2.5s to read a new board, few mistakes.
	const human = { secs: 2.0, read: 2.5, bot: { misplay: 0.08, tiltPerMine: 0.03, tiltPerHeart: 0.04, defuseFirst: 0.8 } };
	// Mirror copies the human's pace (reads folded into the average, as the lab measures it).
	const P = (k) => (BOT_PRESETS[k].mirror ? { secs: human.secs + human.read / 6, read: 0, bot: BOT_PRESETS[k] } : { secs: BOT_PRESETS[k].secs, read: BOT_PRESETS[k].read, bot: BOT_PRESETS[k] });
	console.log('— Strong human stand-in (left) vs each preset (right) —');
	for (const k of Object.keys(BOT_PRESETS)) report(`human vs ${BOT_PRESETS[k].label}`, simulate({ you: human, them: P(k), rounds: 80 }));
	console.log('— Ladder: each preset vs the next one up —');
	const ks = Object.keys(BOT_PRESETS);
	for (let i = 0; i < ks.length - 1; i++) report(`${BOT_PRESETS[ks[i]].label} vs ${BOT_PRESETS[ks[i + 1]].label}`, simulate({ you: P(ks[i]), them: P(ks[i + 1]), rounds: 60 }));
}
