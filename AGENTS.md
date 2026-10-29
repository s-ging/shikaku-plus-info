# Shikaku+ info

This repository is the single source of truth for what we know about **Shikaku+**: the game, its code, its versus mode and its plans. Every AI agent (Claude Code or any other) and every collaborator reads this file first.

If you are a new session: read this file, then [README.md](README.md), then [project/status.md](project/status.md). That is enough to be up to speed. Go deeper through the [map](#where-to-look) only as the task needs. Working on code? Read [llm/README.md](llm/README.md) before touching anything.

**Sync both ways.** Other sessions and collaborators edit this repository too. At the start of every session, pull the latest version (`git pull`). At the end of any session that changed something, commit and push. Work that stays in a chat or on one drive and never reaches a remote is lost: that is how Versus mode was lost ([decision 0001](decisions/0001-knowledge-base.md)).

## Absolute law

Do not break these rules. If anything elsewhere in this repository disagrees with this section, this section wins. If unsure, stop and ask, and do not take the looser reading.

### The game's code is read-only

Never commit, push, branch, open a pull request on, or otherwise change **`s-ging/shikaku-plus`** (the app) or **`s-ging/shikaku-plus-landing`** (the landing page), unless Krischan explicitly asks for that exact change in the session. Read them freely. Build new work somewhere else (this repo's [prototypes/](prototypes/), or a new repo). See [decision 0002](decisions/0002-read-only-codebases.md).

Pushing the app's `master` branch deploys straight to production (`shikaku.plus`, see [codebase/build-and-release.md](codebase/build-and-release.md)). There is no staging.

### Confirmation gate

Before changing anything outside this repository (a codebase, the Play Store listing, Supabase, Cloudflare, a store console, a post players will see):

1. Restate the request in your own words: outcome, scope, constraints.
2. Say what you believe is out of scope.
3. Ask clarifying questions about anything vague.
4. Wait for explicit approval.

A restatement, silence, or an earlier conversation is not approval for a new change. Read-only work (reading, researching, drafting inside this repo) does not need the gate.

### Two modes

Full explanation in [PRINCIPLES.md](PRINCIPLES.md).

- **Brainstorm mode** (talking game design through, research, drafting inside this repo): start immediately; ask questions alongside the work, not before it.
- **Work mode** (code, anything players or stores see, anything hard to undo): run the confirmation gate with **at least three** clarifying questions and wait for an explicit yes before writing code.
- Switch to work mode the moment a session is about to change code or anything outside this repo, and say so. Krischan can switch explicitly ("work mode", "brainstorm mode"). When unsure, it is work mode.

### Chesterton's fence

Do not remove, rename, or clean something up until you know why it is there. In this codebase that is not a figure of speech: dormant code is often parked on purpose behind a flag ([codebase/build-and-release.md](codebase/build-and-release.md#feature-flags)), identifiers are stored in the database and in URLs, and the puzzle generator must stay byte-identical across two languages ([llm/README.md](llm/README.md#invariants-that-must-never-break)). Find out first ([decisions/](decisions/), [logs/](logs/), the code's own header comments). Then ask before you change it.

### Pareto principle

Start with the small part of the work that carries most of the result. When that high-leverage path is clear, do it first; no low-impact busywork while the useful path is still open.

### Performance is a feature

Shikaku+ installs at about 9MB and must run well on cheap phones and in a browser. No bloat: every dependency, asset and effect has to earn its place. See [PRINCIPLES.md](PRINCIPLES.md#performance-and-purpose) and [codebase/design-and-performance.md](codebase/design-and-performance.md).

### No AI-generated art

Krischan's standing rule is no AI-generated graphics or design work. Do not generate icons, badges, illustrations or other art for Shikaku+; propose a brief or a placeholder and let Krischan make or source the real asset.

### Ask who is typing

The account is sometimes shared. Before writing an "Authored by" line, a log, or a commit as someone, ask who is typing.

### Credentials

Do not write passwords, API keys, service-role keys, signing keystores, or card or bank details into this repository. The Supabase URL, the anon key and OAuth client IDs are public by design (they ship inside every build), but even those stay in the app's code, not here.

## Keeping this repository true

- **Facts carry a source.** Point to the file in the app or landing repo (`lib/puzzle_codec.dart`), a decision, or "Krischan said, date". Mark guesses as guesses.
- **Game rules** live in [game/](game/) and [versus/](versus/). Update them when the code or a design decision changes them.
- **Code facts** live in [codebase/](codebase/). If you read something in the app that contradicts this wiki, the code wins: fix the wiki.
- **Decisions** that someone might later want to undo go in [decisions/](decisions/).
- **Logs:** end every session that changed something with a log in [logs/](logs/). Use the `session-log` skill. Never rewrite an old log.
- **Status:** keep [project/status.md](project/status.md) current; it is the first thing a new session reads.
- Keep this file short. Put detail in linked files.

## Where to look

| Looking for | Go to |
| --- | --- |
| Where things stand right now | [project/status.md](project/status.md) |
| How we work: modes and principles | [PRINCIPLES.md](PRINCIPLES.md) |
| How to play, in plain words | [game/how-to-play.md](game/how-to-play.md) |
| Classic and Hokan rules | [game/rulesets.md](game/rulesets.md) |
| Zen, Time Attack, Blitz, Tekazu, Daily, Help Me! | [game/modes.md](game/modes.md) |
| Badges, stats, leaderboards, accounts, supporting | [game/progression.md](game/progression.md) |
| What a word means (given, anchor, do-over…) | [game/glossary.md](game/glossary.md) |
| Versus mode rules (Fuse & Frost) | [versus/fuse-and-frost.md](versus/fuse-and-frost.md) |
| Why Versus changed from the temperature design | [versus/history.md](versus/history.md) |
| Which repo holds what | [codebase/README.md](codebase/README.md) |
| Which file does what in the app | [codebase/app-map.md](codebase/app-map.md) |
| Seeds, the generator, move tokens, share links | [codebase/puzzle-engine.md](codebase/puzzle-engine.md) |
| Supabase, Cloudflare, auth, payments | [codebase/backend.md](codebase/backend.md) |
| Versioning, deploys, feature flags, dev URL slugs | [codebase/build-and-release.md](codebase/build-and-release.md) |
| Colors, fonts, performance rules | [codebase/design-and-performance.md](codebase/design-and-performance.md) |
| Docs the code cites but that no longer exist | [codebase/lost-docs.md](codebase/lost-docs.md) |
| How an AI agent should work in this codebase | [llm/README.md](llm/README.md) |
| Print or solve a board from a seed | [tools/board.mjs](tools/board.mjs), explained in [llm/README.md](llm/README.md#playing-a-board) |
| The long-term plan | [project/roadmap.md](project/roadmap.md) |
| Questions waiting on Krischan | [project/open-questions.md](project/open-questions.md) |
| Why things are the way they are | [decisions/](decisions/) |
| What already happened | [logs/](logs/) |
