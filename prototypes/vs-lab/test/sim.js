// sim.js — headless bot-vs-bot matches. Sanity + balance readout.
// Run: node test/sim.js
//   placement clock: one tick per your action, opponent moves once per tick
//   fixed clock: ticks on time; each side makes `rate` moves per tick on average
import { VsMatch, ReplayBot } from '../src/match.js';
import { DEFAULT_RULES } from '../src/economy.js';

function run({ label, mode, you, them, rounds = 60, rules = {} }) {
	const st = { rounds: 0, turns: [], wins: [0, 0, 0], stuck: 0, kinds: {} };
	for (let m = 0; st.rounds < rounds; m++) {
		const match = new VsMatch({ rules: { ...DEFAULT_RULES, ...rules }, seed: 1000 + m, target: 1 });
		const a = new ReplayBot({ seed: 11 + m, ...you.bot });
		const b = new ReplayBot({ seed: 77 + m, ...them.bot });
		let guard = 0;
		while (!match.roundOver && guard++ < 3000) {
			let r;
			if (mode === 'placement') {
				r = match.step(a.decide(match.sides[0]), (mm) => b.decide(mm.sides[1]));
				if (!r.ticked) {
					// You are waiting (e.g. on ice): a real player would just wait; use a no-op tick.
					st.stuck++;
					r = match.tick();
				}
			} else {
				const evs = [];
				for (const [i, side, bot] of [
					[0, you, a],
					[1, them, b]
				]) {
					const n = Math.floor(side.rate) + (bot.rng.nextDouble() < side.rate % 1 ? 1 : 0);
					for (let k = 0; k < n; k++) evs.push(...match.act(i, bot.decide(match.sides[i])).events);
				}
				r = { events: [...evs, ...match.tick().events] };
			}
			for (const e of r.events) st.kinds[e.kind] = (st.kinds[e.kind] ?? 0) + 1;
		}
		st.rounds++;
		st.turns.push(match.turn);
		const w = match.roundOver ? match.roundOver.winner : null;
		st.wins[w === null ? 2 : w]++;
	}
	const sorted = [...st.turns].sort((p, c) => p - c);
	const med = sorted[Math.floor(sorted.length / 2)];
	const pc = (n) => ((100 * n) / st.rounds).toFixed(0) + '%';
	console.log(
		`${label.padEnd(44)} you ${pc(st.wins[0]).padStart(4)}  them ${pc(st.wins[1]).padStart(4)}  unfinished ${pc(st.wins[2]).padStart(4)}  median ticks ${med}`
	);
	return st;
}

const strong = { misplay: 0.1, idle: 0, defuseFirst: 0.9 };
const avg = { misplay: 0.2, idle: 0.2, defuseFirst: 0.6 };
const weak = { misplay: 0.35, idle: 0.4, defuseFirst: 0.3 };

console.log('— Per-placement clock (current spec) —');
run({ label: 'equal (avg vs avg)', mode: 'placement', you: { bot: avg }, them: { bot: avg } });
run({ label: 'strong vs weak', mode: 'placement', you: { bot: strong }, them: { bot: weak } });

console.log('— Fixed clock (rate = moves per tick) —');
run({ label: 'equal speed 1.0 vs 1.0', mode: 'clock', you: { bot: avg, rate: 1 }, them: { bot: avg, rate: 1 } });
run({ label: 'equal speed 0.7 vs 0.7', mode: 'clock', you: { bot: avg, rate: 0.7 }, them: { bot: avg, rate: 0.7 } });
run({ label: 'faster 1.2 vs 0.8', mode: 'clock', you: { bot: avg, rate: 1.2 }, them: { bot: avg, rate: 0.8 } });
run({ label: 'faster 1.0 vs 0.6', mode: 'clock', you: { bot: avg, rate: 1.0 }, them: { bot: avg, rate: 0.6 } });
