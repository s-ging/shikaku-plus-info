// build.mjs — bundle modules + UI into self-contained artifact pages.
// Modules stay untouched in src/; only import/export syntax is stripped here.
//   dist/shikaku-vs-lab.html     Fuse & Frost (current)
//   dist/temperature-lab.html    the original temperature economy (kept for reference)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const strip = (src) =>
	src
		.replace(/^import[\s\S]*?from\s+['"][^'"]+['"];?[ \t]*$/gm, '')
		.replace(/^export\s+(?=(const|function|class|let|async))/gm, '');
const mods = (list) => list.map((f) => `// ===== ${f} =====\n` + strip(readFileSync(`src/${f}`, 'utf8'))).join('\n');

function build(out, page, app, modules) {
	const html = `${readFileSync(`src/${page}`, 'utf8')}\n<script>\n${mods(modules)}\n</script>\n<script>\n${readFileSync(`src/${app}`, 'utf8')}\n</script>\n`;
	writeFileSync(`dist/${out}`, html);
	console.log(`built dist/${out}`, Math.round(html.length / 1024) + 'KB');
}

mkdirSync('dist', { recursive: true });
const base = ['puzzle.js', 'game.js', 'economy.js', 'match.js'];
build('shikaku-vs-lab.html', 'ffpage.html', 'ffapp.js', [...base, 'fusefrost.js', 'ffmatch.js']);
build('temperature-lab.html', 'page.html', 'app.js', base);
