# The code

Shikaku+ lives in two code repositories, plus this wiki. Both code repos are **read-only** for agents ([decision 0002](../decisions/0002-read-only-codebases.md)).

| Repo | What it is | Stack | Deploys to |
| --- | --- | --- | --- |
| `s-ging/shikaku-plus` (private) | The game: Android, web, iOS, Windows, macOS, Linux | Flutter (Dart SDK ^3.12), Supabase, Cloudflare Pages | `shikaku.plus` on every push to `master`; store builds are not automated in the repo |
| `s-ging/shikaku-plus-landing` | Landing page and blog: daily puzzle, roadmap, support, legal pages, `/admin` blog editor | SvelteKit (Svelte 5), Tiptap, Supabase | `go.shikaku.plus` |
| `s-ging/shikaku-plus-info` | This wiki, the Versus prototype, tools | Markdown, plain JavaScript | Nowhere; read on GitHub |

A public copy of the app, `work-week/shikaku-plus-copy`, was made on 2026-10-30 only so this wiki could be written. Its HEAD was `71ba81f` when read; it may lag the private repo, so don't treat it as current. It can be deleted or made private.

## Pages

| Page | Covers |
| --- | --- |
| [app-map.md](app-map.md) | Every file in the app's `lib/`, grouped by job |
| [puzzle-engine.md](puzzle-engine.md) | The generator, its random-number generator, seeds, move tokens, Help Me! links, the daily seed, and the parity with the landing page |
| [backend.md](backend.md) | Supabase (auth, tables, RPCs, edge functions), Cloudflare Pages and its function, Turnstile, payments |
| [build-and-release.md](build-and-release.md) | Versioning, the deploy pipeline, feature flags, dev URL slugs, Android setup |
| [design-and-performance.md](design-and-performance.md) | Theme tokens, palette, fonts, shared widgets, the performance doctrine |
| [lost-docs.md](lost-docs.md) | The design docs the code still cites but that were never committed |

## Shape of the app in one paragraph

`main.dart` reads launch parameters (a Help Me! link on web, App Links on Android) and shows `LoadingScreen`, which initialises Supabase, tries an anonymous sign-in without ever blocking on it, loads local preferences, stats, badges and posts, and opens the menu. The game itself is one widget, `ShikakuGame` (`game.dart`), whose state is split across mixins (`game_*.dart`) that all share one contract (`game_state_core.dart`). Puzzles are generated on the device from a seed (`puzzle_codec.dart`, pure Dart). Modes are thin screens around `ShikakuGame` (`blitz_screen.dart`, `time_attack_screen.dart`, `tekazu_screen.dart`). Data layers are offline-first: SharedPreferences is the immediate source of truth, and Supabase is synced in the background (`stats_service.dart`, `badge_service.dart`, `profile_service.dart`, `post_service.dart`).

## Conventions you'll see everywhere

- **Every file starts with a header comment** saying what it is for and why. Read it before changing the file.
- **Platform facades:** a feature that differs by platform has a facade file plus `_web`, `_native` and `_stub` implementations chosen by conditional import (`turnstile_token*.dart`, `pwa_install*.dart`, `daily_notifier*.dart`, `iap_service*.dart`, `country_geo*.dart`, `mosaic_pipeline*.dart`). This keeps web builds free of native plugins and the reverse.
- **Pure Dart where possible:** `puzzle_codec.dart`, `daily_puzzle.dart`, `mosaic_state.dart`, `mosaic_room.dart` and `iap_catalog.dart` import nothing from Flutter, so they can be tested and ported.
- **Local keys are prefixed `sp2_`** so sign-out can sweep them.
- **Supabase changes are numbered migrations** (`supabase/migrations/`), and code comments cite them by number ("migration 32").
- **"Single source of truth" widgets:** `ShikakuAppBar`, `ShikakuButton`, `ShikakuModal`, `ShikakuCaption`, `BadgeNameLabel`, `FocusRing`. Never style a raw Material button or dialog inline.
