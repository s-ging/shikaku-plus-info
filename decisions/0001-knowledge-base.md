# 0001 — A Git wiki as the single source of truth

**Date:** 2026-10-30
**Decided by:** Krischan
**Status:** accepted

## Context

A drive failure in 2026 erased the almost-finished Versus mode, the offline-mode work and the app's design docs. None of it had been pushed anywhere, because pushing the app's `master` branch deploys to production. A recovery service could not get the files back. What survived of Versus survived only in chat history and in Krischan's memory.

## Decision

Keep everything known about Shikaku+ (how the game works, how the code is laid out, Versus rules and history, decisions, logs) in this repository, `s-ging/shikaku-plus-info`, modelled on the `work-week/GSP` knowledge base. `AGENTS.md` holds the rules and the map; `CLAUDE.md` loads it for Claude Code. Prototypes that would otherwise live on one machine (the VS Lab) live here too.

## Why

- A new chat or agent reads the repo and is up to speed, on any model or tool.
- Work that is pushed survives a dead drive.
- Git history shows what changed, when and why.

## Alternatives considered

- Docs inside the app repo: pushing there deploys to production, and that repo is read-only for agents ([0002](0002-read-only-codebases.md)).
- Chat projects only: not readable by other tools, and not versioned.
