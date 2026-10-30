// ffapp.js — Fuse & Frost lab UI. IIFE so names never collide with the bundled modules.
(() => {
	const RULES = { ...FF_RULES };
	let presetKey = 'normal';
	const BOT = { ...BOT_PRESETS.normal };
	let botBoard = 0; // board index the bot last moved on (for its read pause)
	const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
	const $ = (id) => document.getElementById(id);

	let match;
	let bot;
	let paused = false;
	let botTimer = 0;
	let roundStart = performance.now();
	let pausedAt = 0;
	const logItems = [];
	// Watch mode: a bot plays the left board too, and rounds roll on by themselves.
	let watching = false;
	let leftKey = 'hard';
	const LEFT = { ...BOT_PRESETS.hard };
	let leftBot = null;
	let leftTimer = 0;
	let leftBoard = 0;
	let speed = 1;
	// Round log (for "Copy round log"): every event with time, side and that side's move number.
	let roundLog = [];
	let lastRoundLog = null;
	const moveNo = [0, 0];
	let lastYouTick = performance.now();
	const youTimes = []; // your recent move timestamps, for the Mirror bot

	let C = {};
	function readColors() {
		const cs = getComputedStyle(document.documentElement);
		for (const v of ['cell', 'hatch', 'fg', 'mine', 'ice', 'ink', 'num-on-block', 'drag-fill', 'drag-stroke', 'invalid-fill', 'card'])
			C[v] = cs.getPropertyValue('--' + v).trim();
	}
	// Lavender from the box palette. game.js's rectColor stays untouched (copied from the landing repo).
	const VS_BOX = '#A090C0';
	const FONT = () => getComputedStyle(document.body).fontFamily;

	class BoardView {
		constructor(canvas, idx, interactive) {
			this.canvas = canvas;
			this.idx = idx;
			this.ctx = canvas.getContext('2d');
			this.flashes = [];
			this.drag = null;
			this.ghost = null;
			new ResizeObserver(() => this.resize()).observe(canvas);
			if (interactive) this.bind();
		}
		get side() {
			return match.sides[this.idx];
		}
		resize() {
			this.S = Math.max(80, Math.floor(this.canvas.clientWidth));
			this.dpr = Math.max(1, window.devicePixelRatio || 1);
			this.canvas.width = Math.round(this.S * this.dpr);
			this.canvas.height = Math.round(this.S * this.dpr);
			// Poles sit one cell-gap away from the cells and share their corner radius.
			const f = this.canvas.parentElement.style;
			f.setProperty('--fgap', `${this.gap / 2}px`);
			f.setProperty('--pinset', `${this.gap / 2}px`);
			f.setProperty('--prad', `${Math.max(4, this.k * 0.08)}px`);
		}
		get N() {
			return this.side.N;
		}
		get k() {
			return this.S / this.N;
		}
		get gap() {
			return Math.max(4, Math.round(this.S / 80));
		}
		cellAt(e) {
			const b = this.canvas.getBoundingClientRect();
			const cl = (v) => Math.min(this.N - 1, Math.max(0, v));
			return [cl(Math.floor(((e.clientX - b.left) / b.width) * this.N)), cl(Math.floor(((e.clientY - b.top) / b.height) * this.N))];
		}
		bind() {
			const c = this.canvas;
			c.addEventListener('pointerdown', (e) => {
				if (watching) return;
				if (match.roundOver) return;
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
			c.addEventListener('pointerup', () => {
				const d = this.drag;
				this.drag = null;
				if (!d) return;
				if (d.ax === d.bx && d.ay === d.by) youMove({ type: 'erase', x: d.ax, y: d.ay });
				else youMove({ type: 'place', ...d });
			});
			c.addEventListener('pointercancel', () => (this.drag = null));
		}
		span(r) {
			const g = this.gap / 2;
			const k = this.k;
			return [r.x1 * k + g, r.y1 * k + g, (r.x2 - r.x1 + 1) * k - this.gap, (r.y2 - r.y1 + 1) * k - this.gap];
		}
		rr(x, y, w, h, r) {
			const c = this.ctx;
			const q = Math.min(r ?? Math.max(4, this.k * 0.08), w / 2, h / 2);
			c.beginPath();
			c.moveTo(x + q, y);
			c.arcTo(x + w, y, x + w, y + h, q);
			c.arcTo(x + w, y + h, x, y + h, q);
			c.arcTo(x, y + h, x, y, q);
			c.arcTo(x, y, x + w, y, q);
			c.closePath();
		}
		cellBox(i) {
			const x = i % this.N;
			const y = Math.floor(i / this.N);
			return this.span({ x1: x, y1: y, x2: x, y2: y });
		}
		stripes(px, py, pw, ph, color, step) {
			const c = this.ctx;
			c.save();
			this.rr(px, py, pw, ph);
			c.clip();
			c.strokeStyle = color;
			c.lineWidth = step * 0.45;
			for (let t = -ph; t < pw + ph; t += step) {
				c.beginPath();
				c.moveTo(px + t, py + ph);
				c.lineTo(px + t + ph, py);
				c.stroke();
			}
			c.restore();
		}
		flash(kind, cell, intensity = 1) {
			const now = performance.now();
			const f = { kind, cell, start: now, dur: kind === 'shatter' ? 520 : 380 };
			if (kind === 'shatter') {
				f.shards = [];
				const n = Math.round(10 * intensity) + 3;
				for (let i = 0; i < n; i++)
					f.shards.push({ a: (i / n) * 6.283 + Math.random() * 0.6, v: 0.6 + Math.random() * 1.3 * intensity, s: 0.05 + Math.random() * 0.07, rot: Math.random() * 6 });
			}
			this.flashes.push(f);
		}

		drawMine(m, now) {
			const c = this.ctx;
			const [px, py, pw, ph] = this.cellBox(m.cell);
			const cx = px + pw / 2;
			const cy = py + ph / 2;
			const pulse = m.fuse <= 1 && !REDUCED ? 0.75 + 0.25 * Math.abs(Math.sin(now / 160)) : 1;
			c.globalAlpha = pulse;
			c.fillStyle = C.mine;
			this.rr(px, py, pw, ph);
			c.fill();
			c.globalAlpha = 1;
			const R = pw * 0.32;
			c.strokeStyle = C.ink;
			c.lineWidth = Math.max(2, pw * 0.065);
			c.beginPath();
			c.arc(cx, cy, R, 0, 6.283);
			c.stroke();
			c.fillStyle = C.ink;
			const total = RULES.mineFuse;
			if (m.fuse <= 1) {
				c.beginPath();
				c.arc(cx, cy, R * 0.68, 0, 6.283);
				c.fill();
			} else {
				const p = (total - m.fuse + 1) / total; // fuse 3 → 1/3, fuse 2 → 2/3
				c.beginPath();
				c.moveTo(cx, cy);
				c.arc(cx, cy, R * 0.72, -Math.PI / 2, -Math.PI / 2 + p * 6.283);
				c.closePath();
				c.fill();
			}
		}

		drawIce(f) {
			const c = this.ctx;
			const [px, py, pw, ph] = this.cellBox(f.cell);
			c.fillStyle = C.ice;
			this.rr(px, py, pw, ph);
			c.fill();
			this.stripes(px, py, pw, ph, C.ink, Math.max(5, pw / 7));
			const inset = pw * 0.17;
			const ix = px + inset;
			const iy = py + inset;
			const iw = pw - inset * 2;
			c.fillStyle = C.ink;
			this.rr(ix - 2, iy - 2, iw + 4, iw + 4, 3);
			c.fill();
			c.fillStyle = C.ice;
			this.rr(ix, iy, iw, iw, 3);
			c.fill();
			// Thaw wedge: solid at full thaw, hollow at the last point.
			const total = RULES.thawPoints;
			const p = Math.max(0, Math.min(1, (total - f.thaw) / Math.max(1, total - 1)));
			if (p > 0) {
				const b = iw * 0.16;
				c.save();
				c.beginPath();
				c.rect(ix + b, iy + b, iw - 2 * b, iw - 2 * b);
				c.clip();
				c.fillStyle = C.ink;
				const cx = ix + iw / 2;
				const cy = iy + iw / 2;
				c.beginPath();
				c.moveTo(cx, cy);
				c.arc(cx, cy, iw, -Math.PI / 2, -Math.PI / 2 - p * 6.283, true);
				c.closePath();
				c.fill();
				c.restore();
			}
		}

		draw(now) {
			if (!this.S || !match) return;
			const c = this.ctx;
			const side = this.side;
			const N = this.N;
			const k = this.k;
			const nums = side.puzzle.nums;
			const e = side.econ;
			c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
			c.clearRect(0, 0, this.S, this.S);

			// Empty cells, cooled by every ice cell on the board
			const chill = Math.min(0.1, e.ice.length * 0.025);
			for (let i = 0; i < N * N; i++) {
				const [px, py, pw, ph] = this.cellBox(i);
				c.fillStyle = C.cell;
				this.rr(px, py, pw, ph);
				c.fill();
				if (chill) {
					c.globalAlpha = chill;
					c.fillStyle = C.ice;
					c.fill();
					c.globalAlpha = 1;
				}
			}
			// Telegraphed ice targets
			for (const w of e.iceIncoming) {
				if (w.target < 0) continue;
				const [px, py, pw, ph] = this.cellBox(w.target);
				c.fillStyle = C.hatch;
				this.rr(px, py, pw, ph);
				c.fill();
				this.stripes(px, py, pw, ph, C.cell, Math.max(6, pw / 6));
				c.fillStyle = C.ice;
				c.font = `${Math.max(10, k * 0.2)}px ${FONT()}`;
				c.textAlign = 'right';
				c.textBaseline = 'top';
				c.fillText(String(Math.max(0, w.eta)), px + pw - 5, py + 4);
			}
			for (const r of side.rects) {
				c.fillStyle = VS_BOX; // one colour for every box in VS (Krischan, 2026-10-30): hazards are the only colours on the board
				this.rr(...this.span(r));
				c.fill();
			}
			for (const f of e.ice) this.drawIce(f);
			for (const m of e.mines) this.drawMine(m, now);

			// Clues
			c.font = `${Math.max(12, k * 0.42)}px ${FONT()}`;
			c.textAlign = 'center';
			c.textBaseline = 'middle';
			for (let y = 0; y < N; y++)
				for (let x = 0; x < N; x++) {
					const v = nums[y][x];
					if (!v) continue;
					c.fillStyle = cellUnderBlock(x, y, side.rects) ? C['num-on-block'] : C.fg;
					c.fillText(String(v), x * k + k / 2, y * k + k / 2 + 1);
				}

			// Ice on its way: the whole board catches a chill instead of a marked cell.
			if (e.iceIncoming.length) {
				const soon = Math.min(...e.iceIncoming.map((w) => w.eta));
				const near = Math.min(1, Math.max(0, 1 - Math.max(0, soon - 1) / Math.max(1, RULES.iceEta)));
				c.globalAlpha = 0.06 + 0.1 * near + 0.04 * (e.iceIncoming.length - 1);
				c.fillStyle = C.ice;
				c.fillRect(0, 0, this.S, this.S);
				c.globalAlpha = 0.35 + 0.35 * near;
				c.strokeStyle = C.ice;
				c.lineWidth = Math.max(2, this.S / 120);
				this.rr(1, 1, this.S - 2, this.S - 2, Math.max(4, k * 0.1));
				c.stroke();
				const flakes = 10 * e.iceIncoming.length;
				const t = REDUCED ? 0 : now / 1000;
				c.fillStyle = '#ffffff';
				for (let i = 0; i < flakes; i++) {
					const seedX = ((i * 7919) % 997) / 997;
					const seedY = ((i * 104729) % 991) / 991;
					const speed = 0.04 + (i % 5) * 0.012;
					const x = (seedX * this.S + Math.sin(t * 0.8 + i) * k * 0.15 + this.S) % this.S;
					const y = ((seedY + t * speed) % 1) * this.S;
					c.globalAlpha = 0.35 + 0.4 * near * ((i % 3) / 2);
					c.beginPath();
					c.arc(x, y, Math.max(1.2, k * (0.025 + (i % 3) * 0.01)), 0, 6.283);
					c.fill();
				}
				c.globalAlpha = 1;
			}

			if (this.drag) {
				const d = this.drag;
				const r = new Rect(d.ax, d.ay, d.bx, d.by);
				const blocked = side.isRectBlocked(r);
				const ok = !blocked && verifyRect(r, nums);
				c.fillStyle = blocked ? C.ice : ok ? C['drag-fill'] : C['invalid-fill'];
				c.globalAlpha = blocked ? 0.45 : 1;
				this.rr(...this.span(r));
				c.fill();
				c.globalAlpha = 1;
				c.strokeStyle = ok ? C['drag-stroke'] : blocked ? C.ice : C.mine;
				c.lineWidth = 2;
				c.stroke();
			}
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

			this.flashes = this.flashes.filter((f) => now - f.start < f.dur);
			for (const f of this.flashes) {
				const t = (now - f.start) / f.dur;
				const x = f.cell % N;
				const y = Math.floor(f.cell / N);
				c.globalAlpha = 1 - t;
				if (f.kind === 'blast') {
					c.fillStyle = '#ffffff';
					c.globalAlpha = (1 - t) * 0.85;
					c.fillRect((x - 1) * k, (y - 1) * k, 3 * k, 3 * k);
				} else if (f.kind === 'pulse' || f.kind === 'ring') {
					c.strokeStyle = f.kind === 'pulse' ? '#ffffff' : C.mine;
					c.lineWidth = 3;
					c.beginPath();
					c.arc(x * k + k / 2, y * k + k / 2, k * (0.3 + t * 0.45), 0, 6.283);
					c.stroke();
				} else if (f.kind === 'shatter') {
					const ease = 1 - Math.pow(1 - t, 3);
					c.fillStyle = C.ice;
					for (const s of f.shards) {
						c.save();
						c.translate(x * k + k / 2 + Math.cos(s.a) * s.v * k * ease, y * k + k / 2 + Math.sin(s.a) * s.v * k * ease + t * t * k * 0.5);
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
		renderTimer(now);
		if (match && !paused && !match.roundOver && now - lastYouTick >= RULES.idleTickSecs * 1000 && RULES.idleTickSecs) {
			lastYouTick = now;
			handle(match.idleTick(0).events);
		}
		if (now < iceFlashUntil[0] + 30 || now < iceFlashUntil[1] + 30) { renderPoles(0, 'you'); renderPoles(1, 'them'); }
		requestAnimationFrame(loop);
	}

	// —— Moves ——
	function youMove(action) {
		if (!match || match.roundOver) return;
		const r = match.act(0, action);
		if (r.moved) {
			const now = performance.now();
			lastYouTick = now;
			moveNo[0]++;
			youTimes.push(now);
			if (youTimes.length > 12) youTimes.shift();
			if (youTimes.length >= 2) BOT.measured = (youTimes[youTimes.length - 1] - youTimes[0]) / (youTimes.length - 1) / 1000;
			// Mirror moves in lockstep: one bot move for each of yours, a beat after it.
			if (BOT.mirror) botMove(0.2 + Math.random() * 0.25);
		}
		if (!r.moved && r.denied && action.type === 'place')
			views[0].ghost = { r: new Rect(action.ax, action.ay, action.bx, action.by), ice: r.denied === 'ice', start: performance.now() };
		handle(r.events);
	}
	function scheduleLeft() {
		clearTimeout(leftTimer);
		if (!watching || paused || !match || match.roundOver) return;
		const jitter = 0.6 + Math.random() * 0.8;
		const side = match.sides[0];
		const reading = side.boardIndex !== leftBoard ? LEFT.read : 0;
		leftBoard = side.boardIndex;
		leftTimer = setTimeout(() => {
			if (!watching || paused || match.roundOver) return;
			const r = match.act(0, leftBot.decide(match.sides[0]));
			if (r.moved) {
				moveNo[0]++;
				if (BOT.mirror) botMove(0.2 + Math.random() * 0.25);
			}
			handle(r.events);
			scheduleLeft();
		}, ((LEFT.secs * jitter + reading) * 1000) / speed);
	}
	function botMove(delay) {
		setTimeout(() => {
			if (paused || !match || match.roundOver) return;
			const r = match.act(1, bot.decide(match.sides[1]));
			if (r.moved) moveNo[1]++;
			handle(r.events);
		}, (delay * 1000) / speed);
	}
	function scheduleBot() {
		clearTimeout(botTimer);
		if (paused || !match || match.roundOver || BOT.mirror) return;
		const jitter = 0.6 + Math.random() * 0.8;
		const side = match.sides[1];
		const reading = side.boardIndex !== botBoard ? BOT.read : 0;
		botBoard = side.boardIndex;
		botTimer = setTimeout(() => {
			if (paused || match.roundOver) return;
			const r = match.act(1, bot.decide(match.sides[1]));
			if (r.moved) moveNo[1]++;
			else if (!bot._idleAt) bot._idleAt = performance.now();
			if (r.moved) bot._idleAt = 0;
			else if (RULES.idleTickSecs && performance.now() - bot._idleAt >= RULES.idleTickSecs * 1000) {
				bot._idleAt = performance.now();
				handle(match.idleTick(1).events);
			}
			handle(r.events);
			scheduleBot();
		}, ((BOT.secs * jitter + reading) * 1000) / speed);
	}

	// —— Events ——
	function describe(e) {
		switch (e.kind) {
			case 'minesIncoming': return `${e.count} mine${e.count > 1 ? 's' : ''} incoming, ${e.eta} moves`;
			case 'mineLand': return 'mine landed';
			case 'mineExplode': return e.together > 1 ? `mine exploded with ${e.together - 1} more (one heart lost for all), ${e.hearts} left` : `mine exploded, ${e.hearts} heart${e.hearts === 1 ? '' : 's'} left`;
			case 'iceBlocked': return 'ice dropped: two already on the way';
			case 'rectsBlown': return `blast removed ${e.count} rectangle${e.count > 1 ? 's' : ''}`;
			case 'defuse': return e.clutch ? 'CLUTCH: defused a mine on its last tick' : 'defused a mine';
			case 'iceIncoming': return `a chill sets in: ice lands in ${e.eta} moves`;
			case 'frozen': return 'a cell froze';
			case 'thaw': return e.source === 'active' ? 'thawed ice, sent it back' : 'ice melted';
			case 'forceBreak': return e.spills ? 'icebreaker: ice spills to next board' : 'icebreaker';
			case 'clear': return `board cleared${e.perfect ? ' perfect' : ''}${e.defuseBonus ? `, defuse clear +${e.defuseBonus}` : ''}: ${e.sendMines} mines${e.sendIce ? ` + ${e.sendIce} ice` : ''}${e.wiped ? `, ${e.wiped} waiting mines died with the board` : ''}`;
			case 'heal': return e.boards ? (e.healed ? `${e.boards} perfect boards in a row: healed a heart` : `${e.boards} perfect boards in a row (hearts already full)`) : e.healed ? `${e.streak}x streak: healed a heart` : `${e.streak}x streak (hearts already full)`;
			case 'send': return e.counter ? `counter-spike: cancelled ${e.cancelled}, sent ${e.pass}${e.rush ? ' (rush)' : ''}` : e.cancelled ? `attack ${e.count}${e.rush ? ' (rush)' : ''}: cancelled ${e.cancelled} incoming, ${e.pass} sent` : `sent ${e.count} mines${e.rush ? ' (rush)' : ''}`;
			case 'sendIce': return `sent ${e.count} ice`;
			case 'frostFire': return `frost fired: ${e.count} ice${e.withClear ? ', with the clear' : ''}`;
			case 'clutch': return e.cancelled ? `clutch: cancelled ${e.cancelled} incoming` : 'clutch (nothing incoming to cancel)';
			case 'bankFreeze': return `bank of ${e.bank} sat too long: ice on the way`;
			case 'ko': return e.by === 'ice' ? 'frozen over' : 'out of hearts';
			default: return null;
		}
	}
	function handle(events) {
		for (const e of events || []) {
			const si = e.side === 'you' ? 0 : e.side === 'them' ? 1 : -1;
			roundLog.push({ t: Math.round(performance.now() - roundStart), move: si >= 0 ? moveNo[si] : null, ...e });
			const v = views[e.side === 'you' ? 0 : e.side === 'them' ? 1 : -1];
			if (v) {
				if (e.kind === 'newBoard') v.flashes = [];
				else if (e.kind === 'mineExplode') {
					v.flash('blast', e.cell);
					shake(v.canvas.parentElement, 'big');
				} else if (e.kind === 'mineLand' || e.kind === 'frozen') shake(v.canvas.parentElement, 'small');
				else if (e.kind === 'frozen') v.flash('pulse', e.cell);
				else if (e.kind === 'defuse') {
					v.flash('ring', e.cell);
				}
				else if (e.kind === 'forceBreak') v.flash('shatter', e.cell, 1);
				else if (e.kind === 'thaw') v.flash('shatter', e.cell, 0.3);
			}
			if (e.kind === 'clear' && e.defuseBonus && v) callout(v, `DEFUSE CLEAR +${e.defuseBonus}`);
			if (e.kind === 'heal' && e.healed) pulseHearts(e.side);
			if (e.kind === 'send' && e.pass > 0) fire(e.side === 'you' ? 0 : 1, e.pass, !!e.counter);
			if (e.kind === 'frostFire') frostShot(e.side === 'you' ? 0 : 1, e.count);
			if (e.kind === 'clutch' && v) callout(v, e.cancelled ? `CLUTCH −${e.cancelled}` : 'CLUTCH');
			if (e.kind === 'frozen') iceFlashUntil[e.side === 'you' ? 0 : 1] = performance.now() + 260;
			if (e.kind === 'roundOver') showRoundOver(e);
			const text = describe(e);
			if (text) logItems.unshift({ side: e.side, text });
		}
		logItems.length = Math.min(logItems.length, 150);
		renderLog();
		renderHud();
	}

	// A word over the board for a moment: CLUTCH, DEFUSE CLEAR +N.
	function callout(view, text) {
		const host = view.canvas.parentElement;
		const el = Object.assign(document.createElement('div'), { className: 'callout', textContent: text });
		host.appendChild(el);
		setTimeout(() => el.remove(), REDUCED ? 700 : 1100);
	}
	function pulseHearts(side) {
		const el = $(side === 'you' ? 'you-lives' : 'them-lives');
		if (!el || REDUCED) return;
		el.classList.remove('healed');
		void el.offsetWidth;
		el.classList.add('healed');
	}

	function shake(el, size) {
		if (REDUCED) return;
		el.classList.remove('shake-big', 'shake-small');
		void el.offsetWidth; // restart the animation
		el.classList.add('shake-' + size);
	}

	function renderLog() {
		const ul = $('log');
		ul.innerHTML = '';
		for (const it of logItems.slice(0, 110)) {
			const li = document.createElement('li');
			li.className = it.side;
			const who = document.createElement('span');
			who.className = 'who';
			who.textContent = it.side === 'you' ? (watching ? 'Left' : 'You') : it.side === 'them' ? (watching ? 'Right' : 'Bot') : '';
			const msg = document.createElement('span');
			msg.textContent = it.text;
			li.append(who, document.createTextNode(' '), msg);
			ul.appendChild(li);
		}
	}

	function hearts(el, e) {
		el.innerHTML = '';
		for (let i = 0; i < RULES.hearts; i++) {
			const h = document.createElement('i');
			if (i >= e.hearts) h.className = 'lost';
			el.appendChild(h);
		}
	}
	function rightText(e) {
		const parts = [];
		const n = e.nextMinesIn;
		if (n !== null) parts.push(n === 0 ? `Mines landing (${e.pool})` : `Mines in ${n}`);
		const total = e.incomingTotal + e.pool;
		if (total) parts.push(`· ${total} queued`);
		return parts.join(' ');
	}
	// —— The two poles: hearts on the left, incoming hazards on the right ——
	const BANK_SLOTS = 12; // = counterCap: a full bank is exactly what one counter-spike eats
	const iceFlashUntil = [0, 0];
	function buildPoles(prefix) {
		const lives = $(prefix + '-lives');
		lives.innerHTML = '';
		for (let i = 0; i < RULES.hearts; i++) {
			const seg = document.createElement('i');
			seg.appendChild(Object.assign(document.createElement('span'), { className: 'fill' }));
			seg.appendChild(Object.assign(document.createElement('span'), { className: 'notch' }));
			lives.appendChild(seg);
		}
		const hz = $(prefix + '-hazards');
		hz.innerHTML = '';
		for (let i = 0; i < BANK_SLOTS; i++) hz.appendChild(Object.assign(document.createElement('i'), { className: 'bank' }));
		for (let i = 0; i < RULES.batchSize; i++) hz.appendChild(Object.assign(document.createElement('i'), { className: 'batch' }));
		hz.appendChild(Object.assign(document.createElement('i'), { className: 'ice' }));
		hz.dataset.batch = RULES.batchSize;
		lives.dataset.hearts = RULES.hearts;
	}
	function renderPoles(idx, prefix) {
		const e = match.sides[idx].econ;
		const lives = $(prefix + '-lives');
		const hz = $(prefix + '-hazards');
		if (Number(lives.dataset.hearts) !== RULES.hearts || Number(hz.dataset.batch) !== RULES.batchSize) buildPoles(prefix);
		// Hearts fill from the bottom. Only the first missing one can heal: it fills a
		// step per perfect board and beats like a heart while it's tentative.
		const canHeal = RULES.healPerfectBoards && (!RULES.maxHealsPerRound || e.heals < RULES.maxHealsPerRound);
		const segs = [...lives.children].reverse();
		segs.forEach((seg, i) => {
			const alive = i < e.hearts;
			seg.className = alive ? 'on' : '';
			const fill = seg.firstChild;
			// The beat stops (and the fill drains) the moment this board can't be perfect.
			// The healable heart: it beats while this board can still be perfect. A redo
			// flatlines it and the fill drops back to the checkpoint notch (or to empty).
			const healable = !alive && i === e.hearts && canHeal;
			const cp = RULES.healCheckpoint || 0;
			const shown = e.doOversThisBoard ? (cp && e.perfectRun >= cp ? cp : 0) : e.perfectRun;
			fill.style.height = healable ? `${(100 * shown) / RULES.healPerfectBoards}%` : '0';
			const notch = seg.children[1];
			notch.style.bottom = `${(100 * cp) / RULES.healPerfectBoards}%`;
			if (healable && cp) seg.classList.add('healable');
			if (healable && e.perfectRun > 0 && !e.doOversThisBoard) seg.classList.add('healing');
		});
		// Hazards, top to bottom: orange bank, red next batch, one ice block.
		const kids = [...hz.children];
		const bankSegs = kids.slice(0, BANK_SLOTS).reverse(); // fill from the bottom of the orange section
		const bank = e.bank;
		bankSegs.forEach((seg, i) => {
			seg.className = 'bank' + (i < bank ? ' on' : '') + (bank > BANK_SLOTS && i === BANK_SLOTS - 1 ? ' over' : '');
		});
		const batchSegs = kids.slice(BANK_SLOTS, BANK_SLOTS + RULES.batchSize).reverse();
		const next = e.nextBatch;
		batchSegs.forEach((seg, i) => (seg.className = 'batch' + (i < next ? ' on' : '')));
		const ice = kids[kids.length - 1];
		const soon = e.iceIncoming.length ? Math.min(...e.iceIncoming.map((w) => w.eta)) : null;
		let state = '';
		if (performance.now() < iceFlashUntil[idx]) state = ' now';
		else if (soon !== null) state = soon <= 1 ? ' eta1' : ' eta2';
		ice.className = 'ice' + state;
		ice.title = e.iceIncoming.length ? `${e.iceIncoming.length} ice on the way` : 'No ice on the way';
	}

	// —— Attacks: the number itself flies. A chip with the count arcs from the sender's
	// board to the receiver's hazard bar (mines: orange, counter-spike: big and white,
	// frost: blue). Transform and opacity only, per the low-end guardrails.
	function chip(fromRect, toRect, text, kind, delay = 0) {
		const el = Object.assign(document.createElement('div'), { className: 'chip ' + kind, textContent: text });
		document.body.appendChild(el);
		const x0 = fromRect.left + fromRect.width / 2, y0 = fromRect.top + fromRect.height / 2;
		const x1 = toRect.left + toRect.width / 2, y1 = toRect.top + toRect.height / 2;
		const lift = -Math.max(50, Math.abs(x1 - x0) * 0.28);
		const at = (x, y, sc, op) => ({ transform: `translate(${x}px, ${y}px) translate(-50%, -50%) scale(${sc})`, opacity: op });
		el.animate(
			[at(x0, y0, 0.8, 0), at(x0, y0 - 12, 1.1, 1), at((x0 + x1) / 2, (y0 + y1) / 2 + lift, 1, 1), at(x1, y1, 0.7, 1), at(x1, y1, 0.7, 0)],
			{ duration: REDUCED ? 1 : 760, delay, easing: 'cubic-bezier(.3,.6,.4,1)', fill: 'both' }
		).onfinish = () => el.remove();
	}
	function fire(idx, count, big) {
		if (REDUCED) return;
		const from = $((idx === 0 ? 'you' : 'them') + '-board').getBoundingClientRect();
		const hz = $((idx === 0 ? 'them' : 'you') + '-hazards').getBoundingClientRect();
		const to = { left: hz.left, width: hz.width, top: hz.top + hz.height * 0.25, height: 0 };
		chip(from, to, String(count), big ? 'mines big' : 'mines');
	}
	function frostShot(idx, count) {
		const prefix = idx === 0 ? 'you' : 'them';
		const pill = $(prefix + '-right');
		pill.classList.remove('fired');
		void pill.offsetWidth;
		pill.classList.add('fired');
		if (REDUCED) return;
		const to = $((idx === 0 ? 'them' : 'you') + '-hazards').lastElementChild.getBoundingClientRect();
		chip(pill.getBoundingClientRect(), to, `❄${count}`, 'frost', 120);
	}
	// Footer, what you're sending: the live clear value by your name, frost on the right.
	function renderSend(idx, prefix) {
		const s = match.sides[idx];
		// No live number by the name any more: the attack shows as the flying chip.
		const pill = $(prefix + '-right');
		const size = RULES.frostMeter || 0;
		pill.hidden = !size;
		if (!size) return;
		if (Number(pill.dataset.size) !== size) {
			pill.innerHTML = '';
			for (let k = 0; k < size; k++) pill.appendChild(document.createElement('i'));
			pill.appendChild(Object.assign(document.createElement('b'), { className: 'stack' }));
			pill.dataset.size = size;
		}
		const e = s.econ;
		const full = Math.floor(e.frost / size);
		const part = e.frost % size;
		const segs = [...pill.querySelectorAll('i')];
		segs.forEach((seg, k) => seg.classList.toggle('on', full > 0 || k < part));
		pill.querySelector('.stack').textContent = full > 1 ? `×${full}` : '';
		const left = s.puzzle.layout.length - s.rects.filter((r) => s.puzzle.layout.some((l) => l.x1 === r.x1 && l.y1 === r.y1 && l.x2 === r.x2 && l.y2 === r.y2)).length;
		pill.classList.toggle('held', e.frostHeld(left));
		pill.title = e.frostHeld(left) ? 'Frost is held: it fires with your clear' : `Frost ${e.frost % size}/${size}: fires when full`;
	}
	function renderHud() {
		if (!match) return;
		const [you, them] = match.sides;
		$('score-you').textContent = match.score[0];
		$('score-them').textContent = match.score[1];
		renderPoles(0, 'you');
		renderPoles(1, 'them');
		renderSend(0, 'you');
		renderSend(1, 'them');
		$('them-left').textContent = `Board ${them.boardIndex + 1}`;
		$('mode-line').textContent = `6×6 · Classic · FT${match.target}${match.rush ? ` · Rush ×${RULES.rushMultiplier}` : ''}`;
	}
	function renderTimer(now) {
		if (!match) return;
		const ms = Math.max(0, (paused || match.roundOver ? pausedAt : now) - roundStart);
		const m = Math.floor(ms / 60000);
		const s = Math.floor((ms % 60000) / 1000);
		$('you-left').textContent = `Board ${match.sides[0].boardIndex + 1} · ${m}:${String(s).padStart(2, '0')}:${String(Math.floor(ms % 1000)).padStart(3, '0')}`;
	}

	function showRoundOver(e) {
		pausedAt = performance.now();
		lastRoundLog = buildRoundLog(e);
		const youWon = e.winner === 0;
		$('ov-title').textContent = match.over ? (youWon ? 'Match won' : 'Match lost') : e.winner === null ? 'Double KO' : youWon ? 'Round won' : 'Round lost';
		const how = e.by === 'ice' ? 'froze over' : 'ran out of hearts';
		$('ov-sub').textContent = `${youWon ? (watching ? 'Right bot' : 'Bot') : watching ? 'Left bot' : 'You'} ${how}. ${match.score[0]} – ${match.score[1]}`;
		$('ov-next').textContent = match.over ? 'New match' : 'Next round';
		$('overlay').hidden = false;
		clearTimeout(botTimer);
		clearTimeout(leftTimer);
		if (watching) setTimeout(() => watching && !$('overlay').hidden && $('ov-next').click(), 2500 / speed);
	}
	$('ov-next').addEventListener('click', () => {
		$('overlay').hidden = true;
		if (match.over) return newMatch();
		match.newRound();
		startRound(`round ${match.round}: both boards reset`);
	});

	function buildRoundLog(end) {
		const diff = {};
		for (const k of Object.keys(RULES)) if (RULES[k] !== FF_RULES[k]) diff[k] = RULES[k];
		const { label, ...botStats } = BOT;
		return {
			lab: 'Shikaku+ VS lab',
			at: new Date().toISOString(),
			bot: { preset: presetKey, label, ...botStats },
			seed: match.seed,
			round: match.round,
			score: [...match.score],
			result: end ? { winner: end.winner === 0 ? 'you' : end.winner === 1 ? 'bot' : 'double KO', by: end.by } : 'in progress',
			ms: Math.round((end ? pausedAt : performance.now()) - roundStart),
			moves: { you: moveNo[0], bot: moveNo[1] },
			end: match.sides.map((s) => ({ side: s.name, board: s.boardIndex + 1, cleared: s.cleared, hearts: s.econ.hearts, ice: s.econ.ice.length, bank: s.econ.bank })),
			rulesChanged: diff,
			events: roundLog
		};
	}
	async function copyText(btn, json, idle) {
		try {
			await navigator.clipboard.writeText(json);
			btn.textContent = 'Copied';
		} catch {
			const ta = Object.assign(document.createElement('textarea'), { value: json });
			ta.style.cssText = 'width:100%;height:160px;margin-top:8px;font:12px monospace;background:var(--cell);color:var(--fg);border:0;border-radius:6px';
			btn.after(ta);
			ta.select();
			btn.textContent = 'Select and copy below';
		}
		setTimeout(() => (btn.textContent = idle), 2000);
	}
	$('ov-log').addEventListener('click', () => copyText($('ov-log'), JSON.stringify(lastRoundLog || buildRoundLog(null), null, 1), 'Copy round log'));
	$('t-log').addEventListener('click', () => copyText($('t-log'), JSON.stringify(match.roundOver ? lastRoundLog : buildRoundLog(null), null, 1), 'Copy round log'));

	function startRound(msg) {
		roundStart = performance.now();
		lastYouTick = roundStart;
		roundLog = [];
		moveNo[0] = moveNo[1] = 0;
		if (bot) bot._idleAt = 0;
		botBoard = 0;
		for (const v of views) v.flashes = [];
		logItems.unshift({ side: 'match', text: msg });
		renderLog();
		renderHud();
		scheduleBot();
		leftBoard = 0;
		scheduleLeft();
	}
	function newMatch() {
		const seed = Math.floor(Math.random() * 1e6) + 1;
		match = new FFMatch({ rules: RULES, seed });
		bot = new TiltBot({ ...BOT, seed: seed + 17 });
		leftBot = new TiltBot({ ...LEFT, seed: seed + 5 });
		logItems.length = 0;
		$('overlay').hidden = true;
		startRound('match starts, first to 7');
	}
	$('restart').addEventListener('click', newMatch);
	$('pause').addEventListener('click', () => {
		paused = !paused;
		$('pause').textContent = paused ? 'Resume' : 'Pause';
		if (paused) {
			pausedAt = performance.now();
			clearTimeout(botTimer);
			clearTimeout(leftTimer);
		} else {
			roundStart += performance.now() - pausedAt;
			lastYouTick = performance.now();
			scheduleBot();
			scheduleLeft();
		}
	});

	// —— Watch bots ——
	function setWho() {
		const label = (id, text) => {
			const el = document.querySelector(`#${id}-fire`).parentElement;
			el.firstChild.nodeValue = text;
		};
		label('you', watching ? `${LEFT.label} bot` : 'You');
		label('them', watching ? `${BOT.label} bot` : 'Bot');
	}
	$('watch').addEventListener('click', () => {
		watching = !watching;
		$('watch').setAttribute('aria-pressed', String(watching));
		$('watch').textContent = watching ? 'Stop watching' : 'Watch bots';
		$('watch-row').hidden = !watching;
		setWho();
		newMatch();
	});
	function setLeft(key) {
		leftKey = key;
		Object.assign(LEFT, BOT_PRESETS[key]);
		if (leftBot) Object.assign(leftBot, { baseMisplay: LEFT.misplay, tiltPerMine: LEFT.tiltPerMine, tiltPerHeart: LEFT.tiltPerHeart, defuseFirst: LEFT.defuseFirst, counterHold: LEFT.counterHold ?? 0 });
		for (const b of document.querySelectorAll('#left-presets button')) b.setAttribute('aria-pressed', String(b.dataset.key === key));
		setWho();
	}
	for (const [key, pr] of Object.entries(BOT_PRESETS)) {
		if (pr.mirror) continue; // Mirror copies a human; on the left there's nobody to copy
		const b = Object.assign(document.createElement('button'), { textContent: pr.label, type: 'button' });
		b.dataset.key = key;
		b.setAttribute('aria-pressed', String(key === leftKey));
		b.addEventListener('click', () => setLeft(key));
		$('left-presets').appendChild(b);
	}
	for (const x of [1, 2, 4]) {
		const b = Object.assign(document.createElement('button'), { textContent: `${x}×`, type: 'button' });
		b.setAttribute('aria-pressed', String(x === speed));
		b.addEventListener('click', () => {
			speed = x;
			for (const o of document.querySelectorAll('#speeds button')) o.setAttribute('aria-pressed', String(o === b));
		});
		$('speeds').appendChild(b);
	}

	// —— Bot presets ——
	function setPreset(key) {
		presetKey = key;
		Object.assign(BOT, BOT_PRESETS[key]);
		if (!BOT_PRESETS[key].mirror) delete BOT.mirror;
		if (bot) Object.assign(bot, { baseMisplay: BOT.misplay, tiltPerMine: BOT.tiltPerMine, tiltPerHeart: BOT.tiltPerHeart, defuseFirst: BOT.defuseFirst, counterHold: BOT.counterHold ?? 0 });
		for (const b of document.querySelectorAll('#presets button')) b.setAttribute('aria-pressed', String(b.dataset.key === key));
		if (watching) setWho();
		buildRules();
		scheduleBot();
	}
	for (const [key, p] of Object.entries(BOT_PRESETS)) {
		const b = Object.assign(document.createElement('button'), { textContent: p.label, type: 'button' });
		b.dataset.key = key;
		b.setAttribute('aria-pressed', String(key === presetKey));
		b.addEventListener('click', () => setPreset(key));
		$('presets').appendChild(b);
	}

	// —— Rules lab ——
	const pct = (v) => Math.round(v * 100) + '%';
	const GROUPS = [
		['Bot', [
			{ o: BOT, k: 'secs', label: 'Seconds per move', min: 0.6, max: 4, step: 0.1, fmt: (v) => v.toFixed(1) + 's' },
			{ o: BOT, k: 'read', label: 'Reads a new board', min: 0, max: 6, step: 0.1, fmt: (v) => v.toFixed(1) + 's' },
			{ o: BOT, k: 'misplay', label: 'Base misplays', min: 0, max: 0.6, step: 0.02, fmt: pct, bot: 'baseMisplay' },
			{ o: BOT, k: 'tiltPerMine', label: 'Tilt per live mine', min: 0, max: 0.15, step: 0.01, fmt: pct, bot: 'tiltPerMine' },
			{ o: BOT, k: 'tiltPerHeart', label: 'Tilt per lost heart', min: 0, max: 0.2, step: 0.01, fmt: pct, bot: 'tiltPerHeart' },
			{ o: BOT, k: 'defuseFirst', label: 'Defuses first', min: 0, max: 1, step: 0.05, fmt: pct, bot: 'defuseFirst' }
		]],
		['Match', [
			{ k: 'hearts', label: 'Hearts', min: 1, max: 6, step: 1 },
			{ k: 'freezeOverAt', label: 'Freeze-over at', min: 2, max: 8, step: 1, fmt: (v) => `${v} ice` },
			{ k: 'bankFreezeEvery', label: 'Bank freezes every (moves)', min: 0, max: 20, step: 1, fmt: (v) => (v ? String(v) : 'off') },
			{ k: 'bankFreezeMin', label: 'Bank freezes at', min: 1, max: 16, step: 1, fmt: (v) => `${v}+ mines` },
			{ k: 'idleTickSecs', label: 'Idle tick after', min: 0, max: 10, step: 0.5, fmt: (v) => (v ? `${v}s` : 'off') },
			{ k: 'icebreakAtBoxesLeft', label: 'Icebreaker on last N boxes', min: 0, max: 6, step: 1, fmt: (v) => (v ? String(v) : 'any time') },
			{ k: 'healPerfectBoards', label: 'Heal after perfect boards', min: 0, max: 8, step: 1, fmt: (v) => (v ? `${v} in a row` : 'off') },
			{ k: 'maxHealsPerRound', label: 'Max heals per round', min: 0, max: 5, step: 1, fmt: (v) => (v ? String(v) : 'no limit') },
			{ k: 'rushAfter', label: 'Rush after (moves)', min: 0, max: 300, step: 10, fmt: (v) => (v ? String(v) : 'off') },
			{ k: 'rushMultiplier', label: 'Rush multiplier', min: 2, max: 20, step: 1, fmt: (v) => `×${v}` },
			{ k: 'clearGrace', label: 'Grace after a clear', min: 0, max: 3, step: 1, fmt: (v) => (v ? `${v} move${v > 1 ? 's' : ''}` : 'off') },
			{ k: 'frostMeter', label: 'Frost meter size', min: 0, max: 8, step: 1, fmt: (v) => (v ? `${v} pts = 1 ice` : 'off') },
			{ k: 'frostHoldAtBoxesLeft', label: 'Frost holds on last N boxes', min: 0, max: 8, step: 1, fmt: (v) => (v ? String(v) : 'never') },
			{ k: 'healCheckpoint', label: 'Heal checkpoint', min: 0, max: 4, step: 1, fmt: (v) => (v ? `at ${v}` : 'off') },
			{ k: 'mineCluster', label: 'Mine landing', options: [['true', 'Clustered in the biggest open box'], ['false', 'Scattered']] },
			{ k: 'defuseClearBonus', label: 'Defuse clear bonus', min: 0, max: 3, step: 1, fmt: (v) => (v ? `+${v} per mine` : 'off') },
			{ k: 'counterSpike', label: 'Counter', options: [['true', 'Counter-spike (cancel bank, send it back)'], ['refund', 'Refund (attack cancels, half comes back)'], ['false', 'Plain net-cancel']] },
			{ k: 'counterRate', label: 'Counter adds back', min: 0, max: 1, step: 0.25, fmt: (v) => Math.round(v * 100) + '%' },
			{ k: 'overflow', label: 'Overflow (no counter)', options: [['netCancel', 'Net-cancel'], ['passthrough', 'Passthrough']] }
		]],
		['Mines', [
			{ k: 'clearSend', label: 'Clear sends', min: 1, max: 10, step: 1 },
			{ k: 'incomingEta', label: 'Moves until landing', min: 1, max: 6, step: 1 },
			{ k: 'batchSize', label: 'Batch size', min: 1, max: 6, step: 1 },
			{ k: 'mineCap', label: 'Max on board', min: 2, max: 10, step: 1 },
			{ k: 'mineFuse', label: 'Fuse (moves)', min: 2, max: 6, step: 1 },
			{ k: 'maxHeartsPerMove', label: 'Hearts lost per move, max', min: 1, max: 4, step: 1 },
			{ k: 'spreadLanding', label: 'Spread across regions', toggle: true },
			{ k: 'clearWipesPool', label: 'Clear kills waiting mines', toggle: true },
			{ k: 'clearWipesIncoming', label: 'Clear kills in-flight mines', toggle: true }
		]],
		['Ice', [
			{ k: 'perfectSendsIce', label: 'Perfect clear sends', min: 0, max: 3, step: 1 },
			{ k: 'iceEta', label: 'Moves until landing', min: 1, max: 6, step: 1 },
			{ k: 'maxIceIncoming', label: 'Max ice on the way', min: 1, max: 4, step: 1 },
			{ k: 'telegraphIce', label: 'Mark the landing cell', toggle: true },
			{ k: 'thawPoints', label: 'Thaw points', min: 2, max: 8, step: 1 },
			{ k: 'passiveThawEvery', label: 'Passive −1 every', min: 1, max: 6, step: 1, fmt: (v) => `${v} moves` },
			{ k: 'activeThaw', label: 'Adjacent thaw', min: 1, max: 4, step: 1 },
			{ k: 'thawSendsIce', label: 'Thawing sends it back', toggle: true },
			{ k: 'icebreakSpills', label: 'Icebreak spills to next board', toggle: true },
			{ k: 'forceBreakSendsIce', label: 'Icebreak sends ice', toggle: true }
		]]
	];
	function buildRules() {
		const root = $('groups');
		root.innerHTML = '';
		for (const [name, items] of GROUPS) {
			const fs = document.createElement('fieldset');
			const lg = document.createElement('legend');
			lg.textContent = name;
			fs.appendChild(lg);
			for (const it of items) {
				const o = it.o ?? RULES;
				const id = 'r-' + it.k;
				const row = document.createElement('div');
				const lab = document.createElement('label');
				lab.htmlFor = id;
				lab.textContent = it.label;
				row.appendChild(lab);
				if (it.toggle) {
					row.className = 'row toggle';
					const inp = Object.assign(document.createElement('input'), { type: 'checkbox', id, checked: !!o[it.k] });
					inp.addEventListener('change', () => (o[it.k] = inp.checked));
					row.appendChild(inp);
				} else if (it.options) {
					row.className = 'row toggle';
					const sel = Object.assign(document.createElement('select'), { id });
					for (const [v, t] of it.options) sel.appendChild(Object.assign(document.createElement('option'), { value: v, textContent: t }));
					sel.value = String(o[it.k]);
					sel.addEventListener('change', () => (o[it.k] = sel.value === 'true' ? true : sel.value === 'false' ? false : sel.value));
					row.appendChild(sel);
				} else {
					row.className = 'row';
					const inp = Object.assign(document.createElement('input'), { type: 'range', id, min: it.min, max: it.max, step: it.step });
					inp.value = o[it.k];
					const out = document.createElement('output');
					out.htmlFor = id;
					const fmt = it.fmt ?? String;
					out.textContent = fmt(Number(o[it.k]));
					inp.addEventListener('input', () => {
						const v = Number(inp.value);
						o[it.k] = v;
						if (it.bot && bot) bot[it.bot] = v;
						out.textContent = fmt(v);
						renderHud();
					});
					row.append(inp, out);
				}
				fs.appendChild(row);
			}
			root.appendChild(fs);
		}
	}

	$('t-mines').addEventListener('click', () => handle(match.sides[0].econ.receiveMines(4).map((e) => ({ side: 'you', ...e }))));
	$('t-ice').addEventListener('click', () => handle(match.sides[0].econ.receiveIce(2, match.sides[0].landable()).map((e) => ({ side: 'you', ...e }))));
	$('t-bot').addEventListener('click', () => handle(match.sides[1].econ.receiveMines(4).map((e) => ({ side: 'them', ...e }))));
	$('t-reset').addEventListener('click', () => {
		Object.assign(RULES, FF_RULES);
		buildRules();
		renderHud();
	});
	$('t-copy').addEventListener('click', () => copyText($('t-copy'), JSON.stringify({ rules: RULES, bot: BOT }, null, 2), 'Copy rules JSON'));

	window.vsLab = { get match() { return match; }, rules: RULES, bot: BOT };
	readColors();
	buildRules();
	newMatch();
	requestAnimationFrame(loop);
})();
