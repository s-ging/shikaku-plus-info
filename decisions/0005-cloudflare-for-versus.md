# 0005 — Versus server on Cloudflare instead of Colyseus

**Date:** 2026-10-29
**Decided by:** Krischan
**Status:** proposed (Krischan: "I might drop the Colyseus server and simply go full Cloudflare instead of renting a VM and set everything up myself")

## Context

The original Versus plan used a Colyseus server, which means renting and running a VM. The web app already runs on Cloudflare Pages, with a Pages Function for country lookup.

## Decision (proposed)

Run each Versus match in a Cloudflare Durable Object: one object per match, holding both players' state, receiving moves over WebSockets and running the same import-free economy module as the prototype (`fusefrost.js`). Players authenticate with their existing Supabase session.

## Why

- No VM to rent, patch or scale.
- A Durable Object is single-threaded with its own state, which is exactly an authoritative match room.
- Same vendor as the web hosting; the economy module runs unchanged.

## Alternatives considered

- **Colyseus on a VM:** a mature room framework, but a server to run and pay for, and the economy would need a TypeScript port anyway.
- **Supabase Realtime:** relays messages between players but runs no game logic, so the clients would be trusted and cheating would be easy.
