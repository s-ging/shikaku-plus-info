# 2026-10-30 — Wiki set up

**Date:** October 30, 2026 (Asia/Manila)
**Agent or person:** Claude (claude.ai), with Krischan
**Approved by:** Krischan asked for the wiki and for it to be written to `s-ging/shikaku-plus-info`; read-only for the code repos

## Asked

A wiki for Shikaku+ like the `work-week/GSP` knowledge base, but about the game: how it works, how to play it, and how AI agents should navigate the game and its repositories. Read the app through a temporary public copy, `work-week/shikaku-plus-copy`.

## Done

- Read the app copy (124 Dart files, 48 migrations, the Cloudflare function, CI), the landing repo and the GSP knowledge base's conventions.
- Wrote the wiki: [AGENTS.md](../AGENTS.md), [PRINCIPLES.md](../PRINCIPLES.md) (including the performance manifesto), [game/](../game/), [versus/](../versus/), [codebase/](../codebase/), [llm/](../llm/), [project/](../project/), [decisions/](../decisions/) 0001 to 0005.
- Found that the design docs the code cites (`CLAUDE.md`, `DESIGN_SYSTEM.md`, `KEYBOARD_NAV.md`, `SHIP_CHECKLIST.md`, `docs/tag_editing_monetization.md`) are not in the repo; rebuilt what the comments quote in [codebase/design-and-performance.md](../codebase/design-and-performance.md) and listed them in [codebase/lost-docs.md](../codebase/lost-docs.md).
- Moved the VS Lab source here ([prototypes/vs-lab/](../prototypes/vs-lab/)) so it can't be lost again, and archived the earlier Versus specs and Krischan's design comps.
- Added [tools/board.mjs](../tools/board.mjs): prints, checks and solves Classic boards from seeds and Help Me! links. Checked against the landing repo's golden board for day 20623.

## Changed

- New repo content in `s-ging/shikaku-plus-info`.
- Nothing in the app or landing repos.

## Open items

- Make `work-week/shikaku-plus-copy` private or delete it (Krischan).
- Answer [open questions](../project/open-questions.md): offline mode scope, `/support` link, lost docs.
