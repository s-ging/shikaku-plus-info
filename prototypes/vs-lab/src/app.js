// app.js — VS Lab UI. Wrapped in an IIFE so its names never collide with the
// bundled modules (puzzle.js, game.js, economy.js, match.js) above it.
(() => {
	const RULES = { ...DEFAULT_RULES };
	const BOT = { misplay: 0.2, idle: 0.25, defuseFirst: 0.6, movesPerSec: 0.7 };
	const CLOCK = { mode: 'move', tickMs: 2000 };
	const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
	const $ = (id) => document.getElementById(id);

	let match;
	let bot;
	let paused = false;
	let tickTimer = 0;
	let botTimer = 0;
	const logItems = [];

	// —— Theme colors for the canvas ——
	let C = {};
	const COLOR_VARS = [
		'cell', 'num', 'num-on-block', 'drag-fill', 'drag-stroke', 'invalid-fill', 'invalid-stroke',
		'ice', 'ice-ink', 'mine-3', 'mine-2', 'mine-1', 'good', 'fg', 'bg', 'accent', 'cold'
	];
	function readColors() {
		const cs = getComputedStyle(document.documentElement);
		C = {};
		for (const v of COLOR_VARS) C[v] = cs.getPropertyValue('--' + v).trim();
	}
	matchMedia('(prefers-color-scheme: dark)').addEventListener('change', readColors);
	new MutationObserver(readColors).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

	// —— Board view (canvas) ——
	class BoardView {
		constructor(canvas, sideIdx, interactive) {
			this.canvas = canvas;
			this.sideIdx = sideIdx;
			this.interactive = interactive;
			this.flashes = [];
			this.ghost = null;
			this.drag = null;
			this.ctx = canvas.getContext('2d');
			new ResizeObserver(() => this.resize()).observe(canvas);
			if (interactive) this.bindPointer();
		}
		get side() {
			return match.sides[this.sideIdx];
		}
		resize() {
			const w = Math.max(80, Math.floor(this.canvas.clientWidth));
			this.dpr = Math.max(1, window.devicePixelRatio || 1);
			this.S = w;
			this.canvas.width = Math.round(w * this.dpr);
			this.canvas.height = Math.round(w * this.dpr);
		}
		get N() {
			return this.side.N;
		}
		get cell() {
			return this.S / this.N;
		}
		get gap() {
			return this.S < 240 ? 3 : 5;
		}
		cellAt(e) {
			const b = this.canvas.getBoundingClientRect();
			const x = Math.floor(((e.clientX - b.left) / b.width) * this.N);
			const y = Math.floor(((e.clientY - b.top) / b.height) * this.N);
			return [Math.min(this.N - 1, Math.max(0, x)), Math.min(this.N - 1, Math.max(0, y))];
		}
		bindPointer() {
			const c = this.canvas;
			c.addEventListener('pointerdown', (e) => {
				if (match.roundOver || paused) return;
				c.setPointerCapture(e.pointerId);
				const [x, y] = this.cellAt(e);
				this.drag = { ax: x, ay: y, bx: x, by: y };
			});
			c.addEventListener('pointermove', (e) => {
				if (!this.drag) return;
				const [x, y] = this.cellAt(e);
				this.drag.bx = x;
				this.drag.by = y;
			});
			const end = () => {
				const d = this.drag;
				this.drag = null;
				if (!d) return;
				if (d.ax === d.bx && d.ay === d.by) doAction({ type: 'erase', x: d.ax, y: d.ay });
				else doAction({ type: 'place', ...d });
			};
			c.addEventListener('pointerup', end);
			c.addEventListener('pointercancel', () => (this.drag = null));
		}
		span(r) {
			const g = this.gap / 2;
			const k = this.cell;
			return [r.x1 * k + g, r.y1 * k + g, (r.x2 - r.x1 + 1) * k - this.gap, (r.y2 - r.y1 + 1) * k - this.gap];
		}
		rr(x, y, w, h, r = 4) {
			const c = this.ctx;
			const q = Math.min(r, w / 2, h / 2);
			c.beginPath();
			c.moveTo(x + q, y);
			c.arcTo(x + w, y, x + w, y + h, q);
			c.arcTo(x + w, y + h, x, y + h, q);
			c.arcTo(x, y + h, x, y, q);
			c.arcTo(x, y, x + w, y, q);
			c.closePath();
		}
		flash(kind, cell, extra = {}) {
			const now = performance.now();
			if (kind === 'shatter') {
				const shards = [];
				const n = Math.round(10 * (extra.intensity ?? 1)) + 3;
				for (let i = 0; i < n; i++) {
					const a = (i / n) * Math.PI * 2 + Math.random() * 0.6;
					const v = 0.6 + Math.random() * 1.4 * (extra.intensity ?? 1);
					shards.push({ a, v, s: 0.06 + Math.random() * 0.08, rot: Math.random() * 6 });
				}
				this.flashes.push({ kind, cell, start: now, dur: 520, shards });
			} else this.flashes.push({ kind, cell, start: now, dur: extra.dur ?? 380 });
		}
		draw(now) {
			if (!this.S) return;
			const c = this.ctx;
			const side = this.side;
			const N = this.N;
			const k = this.cell;
			const nums = side.puzzle.nums;
			c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
			c.clearRect(0, 0, this.S, this.S);

			// Empty cells
			c.fillStyle = C.cell;
			for (let y = 0; y < N; y++)
				for (let x = 0; x < N; x++) {
					this.rr(...this.span({ x1: x, y1: y, x2: x, y2: y }));
					c.fill();
				}

			// Ice
			const fs = Math.max(10, k * 0.42);
			for (const f of side.econ.frozen) {
				const x = f.cell % N;
				const y = Math.floor(f.cell / N);
				const [px, py, pw, ph] = this.span({ x1: x, y1: y, x2: x, y2: y });
				c.fillStyle = C.ice;
				this.rr(px, py, pw, ph);
				c.fill();
				c.save();
				this.rr(px, py, pw, ph);
				c.clip();
				c.strokeStyle = C['ice-ink'];
				c.globalAlpha = 0.18;
				c.lineWidth = 1;
				for (let t = -pw; t < pw * 2; t += Math.max(5, pw / 5)) {
					c.beginPath();
					c.moveTo(px + t, py);
					c.lineTo(px + t - ph, py + ph);
					c.stroke();
				}
				c.restore();
				// thaw pips
				const total = RULES.thawPoints;
				const pr = Math.max(1.5, k * 0.045);
				for (let i = 0; i < total; i++) {
					c.beginPath();
					c.arc(px + pw / 2 + (i - (total - 1) / 2) * pr * 3, py + ph - pr * 3, pr, 0, Math.PI * 2);
					c.fillStyle = C['ice-ink'];
					c.globalAlpha = i < f.thaw ? 0.85 : 0.2;
					c.fill();
				}
				c.globalAlpha = 1;
			}

			// Rects
			for (const r of side.rects) {
				c.fillStyle = rectColor(r);
				this.rr(...this.span(r));
				c.fill();
			}

			// Mines
			for (const m of side.econ.mines) {
				const x = m.cell % N;
				const y = Math.floor(m.cell / N);
				const cx = x * k + k / 2;
				const cy = y * k + k / 2;
				const col = m.fuse >= 3 ? C['mine-3'] : m.fuse === 2 ? C['mine-2'] : C['mine-1'];
				const period = m.fuse >= 3 ? 300 : m.fuse === 2 ? 200 : 150;
				const on = REDUCED || Math.floor(now / period) % 2 === 0;
				c.beginPath();
				c.arc(cx, cy, k * 0.3, 0, Math.PI * 2);
				c.fillStyle = col;
				c.globalAlpha = on ? 1 : 0.45;
				c.fill();
				c.globalAlpha = 1;
				c.fillStyle = '#ffffff';
				c.font = `600 ${Math.max(9, k * 0.26)}px ${getComputedStyle(document.body).fontFamily}`;
				c.textAlign = 'center';
				c.textBaseline = 'middle';
				c.fillText(String(m.fuse), cx, cy + 1);
			}

			// Clue numbers (drawn above mines' rings but below drag)
			c.font = `${fs}px ${getComputedStyle(document.body).fontFamily}`;
			c.textAlign = 'center';
			c.textBaseline = 'middle';
			const ice = side.iceCells();
			const mineCells = new Set(side.econ.mines.map((m) => m.cell));
			for (let y = 0; y < N; y++)
				for (let x = 0; x < N; x++) {
					const v = nums[y][x];
					if (!v) continue;
					const i = y * N + x;
					if (mineCells.has(i)) continue;
					c.fillStyle = ice.has(i) ? C['ice-ink'] : cellUnderBlock(x, y, side.rects) ? C['num-on-block'] : C.num;
					c.fillText(String(v), x * k + k / 2, y * k + k / 2 + 1);
				}

			// Drag preview
			if (this.drag) {
				const d = this.drag;
				const r = new Rect(d.ax, d.ay, d.bx, d.by);
				const blocked = side.isRectBlocked(r);
				const ok = !blocked && verifyRect(r, nums);
				c.fillStyle = blocked ? C.ice : ok ? C['drag-fill'] : C['invalid-fill'];
				c.globalAlpha = blocked ? 0.55 : 1;
				this.rr(...this.span(r));
				c.fill();
				c.globalAlpha = 1;
				c.strokeStyle = blocked ? C['ice-ink'] : ok ? C['drag-stroke'] : C['invalid-stroke'];
				c.lineWidth = 2;
				c.stroke();
				const [px, py, pw, ph] = this.span(r);
				c.fillStyle = C.fg;
				c.font = `600 ${Math.max(11, k * 0.24)}px ${getComputedStyle(document.body).fontFamily}`;
				if (r.area > 1) c.fillText(`${r.w}×${r.h}`, px + pw / 2, py + ph - Math.max(8, k * 0.16));
			}

			// Denied ghost
			if (this.ghost) {
				const t = (now - this.ghost.start) / 320;
				if (t >= 1) this.ghost = null;
				else {
					c.globalAlpha = 1 - t;
					c.fillStyle = this.ghost.ice ? C.ice : C['invalid-fill'];
					this.rr(...this.span(this.ghost.r));
					c.fill();
					c.globalAlpha = 1;
				}
			}

			// Flashes
			this.flashes = this.flashes.filter((f) => now - f.start < f.dur);
			for (const f of this.flashes) {
				const t = (now - f.start) / f.dur;
				const x = f.cell % N;
				const y = Math.floor(f.cell / N);
				if (f.kind === 'blast') {
					c.globalAlpha = (1 - t) * 0.85;
					c.fillStyle = '#ffffff';
					c.fillRect((x - 1) * k, (y - 1) * k, 3 * k, 3 * k);
				} else if (f.kind === 'pulse' || f.kind === 'ring') {
					c.globalAlpha = 1 - t;
					c.strokeStyle = f.kind === 'pulse' ? '#ffffff' : C.good;
					c.lineWidth = 3;
					c.beginPath();
					c.arc(x * k + k / 2, y * k + k / 2, k * (0.3 + t * 0.45), 0, Math.PI * 2);
					c.stroke();
				} else if (f.kind === 'land') {
					c.globalAlpha = 1 - t;
					c.strokeStyle = C['mine-1'];
					c.lineWidth = 2;
					c.beginPath();
					c.arc(x * k + k / 2, y * k + k / 2, k * (0.75 - t * 0.4), 0, Math.PI * 2);
					c.stroke();
				} else if (f.kind === 'shatter') {
					const e = 1 - Math.pow(1 - t, 3);
					c.fillStyle = C.ice;
					for (const s of f.shards) {
						c.globalAlpha = 1 - t;
						const sx = x * k + k / 2 + Math.cos(s.a) * s.v * k * e;
						const sy = y * k + k / 2 + Math.sin(s.a) * s.v * k * e + t * t * k * 0.5;
						c.save();
						c.translate(sx, sy);
						c.rotate(s.rot + t * 4);
						c.fillRect(-s.s * k, -s.s * k * 0.6, s.s * k * 2, s.s * k * 1.2);
						c.restore();
					}
				}
				c.globalAlpha = 1;
			}
		}
	}

	const views = [new BoardView($('you-board'), 0, true), new BoardView($('them-board'), 1, false)];

	function loop(now) {
		for (const v of views) v.draw(now);
		requestAnimationFrame(loop);
	}

	// —— Actions & clock ——
	function doAction(action) {
		if (match.roundOver || paused) return;
		let r;
		if (CLOCK.mode === 'move') r = match.step(action, (m) => bot.decide(m.sides[1]));
		else {
			r = match.act(0, action);
			r.ticked = r.ticks;
		}
		if (!r.ticked && r.denied && action.type === 'place') {
			views[0].ghost = {
				r: new Rect(action.ax, action.ay, action.bx, action.by),
				ice: r.denied === 'ice',
				start: performance.now()
			};
		}
		handle(r.events);
	}

	function startRealtime() {
		stopRealtime();
		if (CLOCK.mode !== 'real' || paused) return;
		tickTimer = setInterval(() => handle(match.tick().events), CLOCK.tickMs);
		botTimer = setInterval(() => handle(match.act(1, bot.decide(match.sides[1])).events), 1000 / BOT.movesPerSec);
	}
	function stopRealtime() {
		clearInterval(tickTimer);
		clearInterval(botTimer);
	}

	// —— Events → effects, log, HUD ——
	const deg = (v) => `${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(Math.round(v * 10) / 10)}°`;
	function describe(e) {
		const R = RULES;
		switch (e.kind) {
			case 'mineEnqueued': return `${e.count} mine${e.count > 1 ? 's' : ''} incoming in ${e.eta}`;
			case 'mineLand': return `mine landed (${deg(R.mineLandTemp)})`;
			case 'mineExplode': return `mine exploded (${deg(R.mineExplodeTemp)})`;
			case 'rectsBlown': return `blast removed ${e.count} rectangle${e.count > 1 ? 's' : ''}`;
			case 'defuse': return `defused a mine (${deg(R.mineDefuseTemp)})${e.sends ? ', sends 1' : ''}`;
			case 'surge': return `surge: ${e.count} banked mine${e.count > 1 ? 's' : ''} landed`;
			case 'freezeWarn': return `frost warning, lands in ${e.steps}`;
			case 'freezeAbandon': return 'warmed up, frost called off';
			case 'frozen': return 'a cell froze';
			case 'thaw': return `ice thawed (${deg(e.source === 'passive' ? R.passiveThawReward : R.activeThawReward)})`;
			case 'comboAttack': return `combo ×${e.combo}: sends ${R.comboSend}, decay paused`;
			case 'comboReset': return `combo ×${e.combo} broken`;
			case 'forceBreak': return `force break (${deg(R.forceBreakReward)}, sends ${R.forceBreakSend})`;
			case 'clear': return `board cleared${e.perfect ? `, perfect ×${e.perfectStreak}` : ''} (${deg(R.clearReward)}, sends ${e.send})`;
			case 'send': return e.cancelled ? `sent ${e.count}: ${e.cancelled} cancelled own incoming, ${e.pass} passed` : `sent ${e.count} mines`;
			case 'loss': return 'hit −100°';
			default: return null;
		}
	}
	function handle(events) {
		if (!events || !events.length) {
			renderHud();
			return;
		}
		for (const e of events) {
			const idx = e.side === 'you' ? 0 : e.side === 'them' ? 1 : -1;
			const v = views[idx];
			if (v) {
				if (e.kind === 'newBoard') v.flashes = [];
				else if (e.kind === 'mineExplode') v.flash('blast', e.cell);
				else if (e.kind === 'mineLand') v.flash('land', e.cell);
				else if (e.kind === 'frozen') v.flash('pulse', e.cell);
				else if (e.kind === 'defuse') v.flash('ring', e.cell);
				else if (e.kind === 'forceBreak') v.flash('shatter', e.cell, { intensity: 1 });
				else if (e.kind === 'thaw') v.flash('shatter', e.cell, { intensity: 0.25 });
			}
			if (e.kind === 'roundOver') showRoundOver(e);
			const text = describe(e);
			if (text) logItems.unshift({ turn: match.turn, side: e.side, text });
		}
		logItems.length = Math.min(logItems.length, 160);
		renderLog();
		renderHud();
	}

	function renderLog() {
		const ul = $('log');
		ul.innerHTML = '';
		for (const it of logItems.slice(0, 120)) {
			const li = document.createElement('li');
			li.className = it.side;
			const who = it.side === 'you' ? 'You' : it.side === 'them' ? 'Bot' : '';
			li.innerHTML = `<span class="t num">${it.turn}</span><span class="who"></span><span class="msg"></span>`;
			li.children[1].textContent = who;
			li.children[2].textContent = it.text;
			ul.appendChild(li);
		}
	}

	const pctX = (v) => ((v + 100) / 200) * 100;
	function renderBar(el, econ) {
		if (!el.dataset.built) {
			el.innerHTML = '<div class="promise" title="Raw temperature held down by frozen cells"></div><div class="fill"></div>' +
				[-75, -50, -25].map((t) => `<div class="tick" style="left:${pctX(t)}%"></div>`).join('') +
				'<div class="zero"></div><div class="fader"></div>';
			el.dataset.built = '1';
		}
		const eff = econ.effectiveTemp;
		const raw = econ.temp;
		const [promise, fill] = el.children;
		const fader = el.lastElementChild;
		const a = pctX(0);
		const b = pctX(eff);
		fill.style.left = Math.min(a, b) + '%';
		fill.style.width = Math.abs(b - a) + '%';
		fill.style.background = eff < 0 ? 'var(--cold)' : 'var(--hot)';
		fader.style.left = b + '%';
		if (econ.showPromise) {
			promise.hidden = false;
			const p = pctX(raw);
			promise.style.left = Math.min(b, p) + '%';
			promise.style.width = Math.abs(p - b) + '%';
			const pc = raw > 0 ? 'var(--hot-promise)' : 'var(--cold-promise)';
			promise.style.background = `repeating-linear-gradient(135deg, ${pc} 0 3px, transparent 3px 6px)`;
		} else promise.hidden = true;
	}

	function chip(text, cls = '') {
		return `<span class="chip ${cls}">${text}</span>`;
	}
	function renderChips(el, side) {
		const e = side.econ;
		const out = [];
		out.push(chip(`Board <b class="num">${side.boardIndex + 1}</b>`));
		out.push(chip(`Combo <b class="num">×${e.combo}</b>`, e.combo ? '' : 'dim'));
		out.push(chip(`Perfect <b class="num">${e.perfectStreak}</b>`, e.perfectStreak ? '' : 'dim'));
		for (const b of e.mineQueue) out.push(chip(`<b class="num">${b.count}</b> mines in <b class="num">${b.eta}</b>`, 'warn'));
		if (e.pendingMines) out.push(chip(`<b class="num">${e.pendingMines}</b> queued`, 'warn'));
		if (e.bank) out.push(chip(`Surge bank <b class="num">${e.bank}</b>`, 'warn'));
		for (const w of e.freezeQueue) out.push(chip(`Frost in <b class="num">${Math.max(w, 0)}</b>`, 'frost'));
		if (e.frozen.length) out.push(chip(`<b class="num">${e.frozen.length}</b> frozen, floor <b class="num">${e.floor}°</b>`, 'frost'));
		el.innerHTML = out.join('');
	}

	function renderTemp(prefix, econ) {
		const t = $(prefix + '-temp');
		const eff = econ.effectiveTemp;
		t.textContent = deg(eff);
		t.className = 'temp-read num ' + (eff < 0 ? 'cold' : eff > 0 ? 'hot' : '');
		$(prefix + '-raw').textContent = econ.showPromise ? `raw ${deg(econ.temp)}` : '';
	}

	function renderHud() {
		const [you, them] = match.sides;
		renderTemp('you', you.econ);
		renderTemp('them', them.econ);
		renderBar($('you-bar'), you.econ);
		renderBar($('them-bar'), them.econ);
		renderChips($('you-chips'), you);
		renderChips($('them-chips'), them);
		$('score').textContent = `${match.score[0]} – ${match.score[1]}`;
		const m = match.marginMultiplier;
		$('round-label').textContent =
			`Round ${match.round} · first to ${match.target} · tick ${match.turn}` + (m > 1 ? ` · attack ×${m.toFixed(2)}` : '');
	}

	function showRoundOver(e) {
		const youWon = e.winner === 0;
		const title = match.over ? (youWon ? 'Match won' : 'Match lost') : e.winner === null ? 'Round drawn' : youWon ? 'Round won' : 'Round lost';
		$('ov-title').textContent = title;
		$('ov-sub').textContent = `${match.score[0]} – ${match.score[1]} after ${match.turn} ticks`;
		$('ov-next').textContent = match.over ? 'New match' : 'Next round';
		$('overlay').hidden = false;
		stopRealtime();
	}

	$('ov-next').addEventListener('click', () => {
		$('overlay').hidden = true;
		if (match.over) newMatch();
		else {
			match.newRound();
			logItems.unshift({ turn: 0, side: 'match', text: `round ${match.round} starts` });
			renderLog();
			for (const v of views) v.flashes = [];
			renderHud();
			startRealtime();
		}
	});

	function newMatch() {
		const seed = Math.floor(Math.random() * 1e6) + 1;
		match = new VsMatch({ rules: RULES, seed });
		bot = new ReplayBot({ ...BOT, seed: seed + 17 });
		logItems.length = 0;
		logItems.unshift({ turn: 0, side: 'match', text: 'match starts, first to 7' });
		$('overlay').hidden = true;
		for (const v of views) v.flashes = [];
		renderLog();
		renderHud();
		startRealtime();
	}

	// —— Clock controls ——
	function setClock(mode) {
		CLOCK.mode = mode;
		$('clock-move').setAttribute('aria-pressed', String(mode === 'move'));
		$('clock-real').setAttribute('aria-pressed', String(mode === 'real'));
		$('pause').hidden = mode !== 'real';
		paused = false;
		$('pause').textContent = 'Pause';
		if (mode === 'real') startRealtime();
		else stopRealtime();
	}
	$('clock-move').addEventListener('click', () => setClock('move'));
	$('clock-real').addEventListener('click', () => setClock('real'));
	$('pause').addEventListener('click', () => {
		paused = !paused;
		$('pause').textContent = paused ? 'Resume' : 'Pause';
		if (paused) stopRealtime();
		else startRealtime();
	});
	$('restart').addEventListener('click', newMatch);

	// —— Rules lab ——
	const pct = (v) => Math.round(v * 100) + '%';
	const GROUPS = [
		['Clock & opponent', [
			{ o: CLOCK, k: 'tickMs', label: 'Tick length (real time)', min: 500, max: 5000, step: 250, fmt: (v) => (v / 1000).toFixed(2) + 's', live: startRealtime },
			{ o: BOT, k: 'movesPerSec', label: 'Bot moves / sec (real time)', min: 0.1, max: 2.5, step: 0.1, fmt: (v) => v.toFixed(1), live: startRealtime },
			{ o: BOT, k: 'misplay', label: 'Bot misplays', min: 0, max: 0.8, step: 0.05, fmt: pct, bot: true },
			{ o: BOT, k: 'idle', label: 'Bot hesitates', min: 0, max: 0.8, step: 0.05, fmt: pct, bot: true },
			{ o: BOT, k: 'defuseFirst', label: 'Bot defuses first', min: 0, max: 1, step: 0.05, fmt: pct, bot: true }
		]],
		['Overflow', [
			{ k: 'overflow', label: 'Overflow model', options: [['netCancel', 'Net-cancel'], ['passthrough', 'Passthrough']] },
			{ k: 'surgeAbsorptionCap', label: 'Surge per tick', min: 1, max: 6, step: 1 },
			{ k: 'surgeUsesStagger', label: 'Surge obeys stagger', toggle: true },
			{ k: 'zeroBankOnClear', label: 'Clear wipes surge bank', toggle: true },
			{ k: 'marginStart', label: 'Margin time from tick', min: 0, max: 300, step: 10, fmt: (v) => (v ? String(v) : 'off') },
			{ k: 'marginStep', label: 'Margin +attack per step', min: 0.05, max: 1, step: 0.05, fmt: pct }
		]],
		['Temperature', [
			{ k: 'clearReward', label: 'Board clear', min: 0, max: 30, step: 1, fmt: deg },
			{ k: 'decayEvery', label: 'Decay −1 every N ticks', min: 1, max: 6, step: 1 },
			{ k: 'mineLandTemp', label: 'Mine lands', min: -20, max: 0, step: 0.5, fmt: deg },
			{ k: 'mineDefuseTemp', label: 'Mine defused', min: 0, max: 15, step: 0.5, fmt: deg },
			{ k: 'mineExplodeTemp', label: 'Mine explodes', min: -30, max: 0, step: 1, fmt: deg },
			{ k: 'forceBreakReward', label: 'Force break', min: 0, max: 50, step: 1, fmt: deg },
			{ k: 'activeThawReward', label: 'Active thaw-out', min: 0, max: 40, step: 1, fmt: deg },
			{ k: 'passiveThawReward', label: 'Passive thaw-out', min: 0, max: 40, step: 1, fmt: deg }
		]],
		['Mines', [
			{ k: 'mineFuse', label: 'Fuse (ticks)', min: 1, max: 6, step: 1 },
			{ k: 'activeMineCap', label: 'Max on board', min: 1, max: 8, step: 1 },
			{ k: 'mineStagger', label: 'Land per tick', min: 1, max: 6, step: 1 },
			{ k: 'mineEta', label: 'Incoming delay', min: 1, max: 6, step: 1 },
			{ k: 'mineBatch', label: 'Batch size', min: 1, max: 8, step: 1 }
		]],
		['Frost', [
			{ k: 'freezeThreshold', label: 'Freeze below', min: -60, max: -5, step: 5, fmt: deg },
			{ k: 'thawPoints', label: 'Thaw points', min: 1, max: 8, step: 1 },
			{ k: 'activeThaw', label: 'Adjacent thaw', min: 1, max: 4, step: 1 },
			{ k: 'warnSteps', label: 'Warning ticks', min: 1, max: 6, step: 1 },
			{ k: 'freezeStagger', label: 'Gap after landing', min: 0, max: 6, step: 1 }
		]],
		['Attack', [
			{ k: 'clearSendBase', label: 'Clear sends', min: 0, max: 10, step: 1 },
			{ k: 'perfectBonusCap', label: 'Perfect bonus cap', min: 0, max: 8, step: 1 },
			{ k: 'defusesPerSend', label: 'Defuses per send', min: 1, max: 6, step: 1 },
			{ k: 'forceBreakSend', label: 'Force break sends', min: 0, max: 6, step: 1 },
			{ k: 'comboMilestone', label: 'Combo milestone', min: 2, max: 12, step: 1 },
			{ k: 'comboSend', label: 'Combo sends', min: 0, max: 4, step: 1 }
		]]
	];

	function buildRules() {
		const root = $('groups');
		root.innerHTML = '';
		for (const [name, items] of GROUPS) {
			const fs = document.createElement('fieldset');
			fs.innerHTML = `<legend>${name}</legend>`;
			for (const it of items) {
				const o = it.o ?? RULES;
				const id = 'r-' + it.k;
				const row = document.createElement('div');
				row.className = 'row' + (it.toggle || it.options ? ' toggle' : '');
				if (it.toggle) {
					row.innerHTML = `<label for="${id}"></label><input type="checkbox" id="${id}">`;
					const inp = row.querySelector('input');
					inp.checked = !!o[it.k];
					inp.addEventListener('change', () => (o[it.k] = inp.checked));
				} else if (it.options) {
					row.innerHTML = `<label for="${id}"></label><select id="${id}">${it.options.map(([v, t]) => `<option value="${v}">${t}</option>`).join('')}</select>`;
					const sel = row.querySelector('select');
					sel.value = o[it.k];
					sel.addEventListener('change', () => (o[it.k] = sel.value));
				} else {
					row.innerHTML = `<label for="${id}"></label><input type="range" id="${id}" min="${it.min}" max="${it.max}" step="${it.step}"><output for="${id}"></output>`;
					const inp = row.querySelector('input');
					const outEl = row.querySelector('output');
					const fmt = it.fmt ?? ((v) => String(v));
					inp.value = o[it.k];
					outEl.textContent = fmt(Number(o[it.k]));
					inp.addEventListener('input', () => {
						const v = Number(inp.value);
						o[it.k] = v;
						if (it.bot && bot) bot[it.k] = v;
						outEl.textContent = fmt(v);
						renderHud();
					});
					if (it.live) inp.addEventListener('change', it.live);
				}
				row.querySelector('label').textContent = it.label;
				fs.appendChild(row);
			}
			root.appendChild(fs);
		}
	}

	// —— Test tools ——
	$('t-mines-me').addEventListener('click', () => {
		match.sides[0].econ.receiveMines(4);
		handle([{ side: 'them', kind: 'send', count: 4, cancelled: 0, pass: 4 }]);
	});
	$('t-mines-bot').addEventListener('click', () => {
		match.sides[1].econ.receiveMines(4);
		handle([{ side: 'you', kind: 'send', count: 4, cancelled: 0, pass: 4 }]);
	});
	$('t-cold').addEventListener('click', () => {
		match.sides[0].econ.temp = -40;
		renderHud();
	});
	$('t-reset').addEventListener('click', () => {
		Object.assign(RULES, DEFAULT_RULES);
		buildRules();
		renderHud();
	});
	$('t-copy').addEventListener('click', async () => {
		const btn = $('t-copy');
		const json = JSON.stringify(RULES, null, 2);
		try {
			await navigator.clipboard.writeText(json);
			btn.textContent = 'Copied';
		} catch {
			const ta = document.createElement('textarea');
			ta.value = json;
			ta.style.cssText = 'width:100%;height:160px;margin-top:8px;font:12px monospace;background:var(--chip);color:var(--fg);border:0;border-radius:4px';
			btn.parentElement.after(ta);
			ta.select();
			btn.textContent = 'Select and copy below';
		}
		setTimeout(() => (btn.textContent = 'Copy rules JSON'), 2000);
	});

	// Debug handle for the browser console: vsLab.match.sides[0].econ, etc.
	window.vsLab = { get match() { return match; }, rules: RULES, bot: BOT };

	readColors();
	buildRules();
	newMatch();
	requestAnimationFrame(loop);
})();
