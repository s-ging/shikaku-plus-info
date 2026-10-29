# 0002 — The game's code repos are read-only for agents

**Date:** 2026-10-29 (stated), recorded 2026-10-30
**Decided by:** Krischan
**Status:** accepted

## Context

`s-ging/shikaku-plus` (the app) and `s-ging/shikaku-plus-landing` (the landing page) are live: pushing the app's `master` deploys to `shikaku.plus` with no staging step. Agents were given access to read them while rebuilding Versus.

## Decision

Agents never commit, push, branch, open pull requests on, or otherwise change either repo. Krischan, 2026-10-29: "DO not alter the codebases I shared with you. Never ever ever do that." Reading is fine. New work happens in this wiki's `prototypes/` or a separate repo. A change to either repo happens only when Krischan asks for that exact change in the session.

## Why

One wrong push is a production deploy to real players, and the repos encode invariants (generator parity, stored identifiers) that are easy to break by tidying.

## Alternatives considered

- Pull requests only: still risks an accidental merge to `master`, and the review burden falls on one person.
