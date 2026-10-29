# Prototypes

Game rules are proven here, in small browser builds with tests and simulations, before anything is ported to Flutter ([decision 0004](../decisions/0004-prototype-first.md)).

| Prototype | What it is |
| --- | --- |
| [vs-lab/](vs-lab/) | The Versus lab. `dist/shikaku-vs-lab.html` is Fuse & Frost against five bot presets, with every rule on a slider; `dist/temperature-lab.html` is the retired temperature economy. Open either file in a browser. Rebuild with `node build.mjs`; test with `npm test`; simulate with `node test/ffsim.js`. |

`vs-lab/src/puzzle.js` and `game.js` are unchanged copies of the landing page's generator and rules. Don't edit them here; copy them again from `s-ging/shikaku-plus-landing` if the generator ever changes.
