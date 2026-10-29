---
name: session-log
description: Write the end-of-session log and update project status in the Shikaku+ wiki. Use at the end of any session that changed something, or when asked to log what happened.
---

# Session log

1. Ask who is typing if you don't know yet (the account is shared). Use that name for "Agent or person", "Approved by" and the "Authored by" line.
2. Copy `templates/log.md` to `logs/YYYY-MM-DD-short-topic.md` (today's date, a few lowercase hyphenated words). Fill in every section; write "nothing" under Changed if read-only.
3. Add a row at the top of the table in `logs/README.md`.
4. Update `project/status.md` and its "Last updated" date: newest items at the top; add new work to the top of "To do"; when an item is finished, move it to the top of "Done" as `- [x] YYYY-MM-DD ...` with a link. Never delete checklist items.
5. If a game rule changed, update `game/` or `versus/`. If you learned something about the code, update `codebase/`. The code wins over the wiki.
6. If Krischan made a choice someone might later undo, add a decision in `decisions/` and list it in `decisions/README.md`.
7. Move answered questions out of `project/open-questions.md` into the page where the answer belongs.
8. Commit and push this repo. Never push `master` of the app or landing repos.

Never write plain-text passwords or keys. Never rewrite an old log.
