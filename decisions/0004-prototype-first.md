# 0004 — Prototype game rules in the browser before Flutter

**Date:** 2026-10-29
**Decided by:** Krischan
**Status:** accepted

## Context

Rebuilding Versus directly in Flutter would mean a long cycle of build, run and tune for every rule change, with the economy's correctness hard to test in isolation.

## Decision

Build rules first as a small browser prototype in plain JavaScript (the VS Lab, [prototypes/vs-lab/](../prototypes/vs-lab/)), reusing the landing page's verified generator. Keep the rules module import-free and event-based, with tests and bot-vs-bot simulations. Port to Dart only once the rules are settled, checking the port against vectors from the prototype.

Krischan: "make a working version as an artifact first before we ship this to Flutter. We save tokens, and we scaffold this quickly instead of scrambling with Flutter for a long time."

## Why

- Every rule is a slider; balance is measured, not guessed.
- The same import-free module can run on the Versus server (see [0005](0005-cloudflare-for-versus.md)) and be translated line by line to Dart.

## Alternatives considered

- Straight to Flutter: slower iteration, and the lost version shows the cost of having the only copy in the app.
