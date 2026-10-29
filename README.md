# Shikaku+ info

The wiki for **Shikaku+**, Krischan's puzzle game: how the game works, how its code is laid out, where the versus mode stands, and how an AI agent should find its way around all of it.

**The short version:** Shikaku+ is a Shikaku puzzle game (every number on the grid needs its own box, exactly that many squares big) built in Flutter for Android, web and desktop. It runs offline-first, installs at about 9MB on the Play Store, and has close to 100 players with no promotion. Its social layer lets you send a half-solved board to a friend with a "Help Me!" link. A head-to-head **Versus** mode was about 99% done when a drive failure in 2026 erased it; it is being rebuilt as **Fuse & Frost**, with a playable prototype in [prototypes/vs-lab/](prototypes/vs-lab/).

**Start with [AGENTS.md](AGENTS.md)**, then [project/status.md](project/status.md).

| Folder | What it is |
| --- | --- |
| [game/](game/) | How to play: rules, rulesets, modes, progression, glossary |
| [versus/](versus/) | Versus mode: the current Fuse & Frost rules, its history, the archived temperature design |
| [codebase/](codebase/) | The app and landing repos: file map, puzzle engine, backend, build and release, design system |
| [llm/](llm/) | Guide for AI agents: where to look for each task, rules that must never break, how to play a board |
| [project/](project/) | Where things stand, the roadmap, open questions |
| [decisions/](decisions/) | Why things are the way they are |
| [logs/](logs/) | What already happened |
| [prototypes/](prototypes/) | The VS Lab: playable versus prototype, tests and simulations |
| [tools/](tools/) | `board.mjs`: print, check and solve a board from a seed or a Help Me! link |
| [templates/](templates/) | Log and decision templates |

## Starting a new session

- **Claude (claude.ai or the Claude app):** start the chat with: "We're working on Shikaku+. Pull `s-ging/shikaku-plus-info` and read AGENTS.md before anything else."
- **Claude Code on your computer:** clone this repo, open a terminal in it and run `claude`. `CLAUDE.md` loads automatically.
- **Other AI tools (Cursor, Codex and similar):** open the repo; they read `AGENTS.md`.
- **Chatbots without repo access:** paste `AGENTS.md` and `project/status.md` at the start.

Every session ends by committing and pushing its changes. The reason is in [decision 0001](decisions/0001-knowledge-base.md): Versus mode was lost because it only ever lived on one drive.

No plain-text passwords or keys in this repo; see [AGENTS.md](AGENTS.md#credentials).
