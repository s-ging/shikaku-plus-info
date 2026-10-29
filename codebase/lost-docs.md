# Docs the code cites that are not in any repo

The app's code comments refer to several design documents that are not in the `s-ging/shikaku-plus` snapshot. Whether they were ever committed isn't known; they may have lived only on the drive that failed. The comments quote enough of them to rebuild the important parts. This page lists each one, where it is cited, and where its content now lives.

| Document | Cited by | What it covered | Rebuilt in |
| --- | --- | --- | --- |
| `CLAUDE.md` (app repo) | 18 references in 13 files: "CLAUDE.md performance doctrine", "CLAUDE.md §1, §2, §4" | Agent rules and the performance doctrine | [design-and-performance.md](design-and-performance.md#performance-doctrine), [../llm/README.md](../llm/README.md) |
| `DESIGN_SYSTEM.md` (also `docs/DESIGN_SYSTEM.md`) | 48 references in 25 files, §2.1 to §11.3 | Tokens, type scale, sheets, badges (§7.11), flags (§7.15), text-scale lock (§5.4), focus ring (§11) | [design-and-performance.md](design-and-performance.md) |
| `KEYBOARD_NAV.md` | 13 references, including `focus_ring.dart`, `app_theme.dart` and `test/keyboard_nav_test.dart` (§1, §3 to §6, §8, §8.1) | Keyboard and focus model, no-ripple rule | [design-and-performance.md](design-and-performance.md#keyboard) |
| `SHIP_CHECKLIST.md` | `.gitignore` | Release checklist, keystore handling | Partly in [build-and-release.md](build-and-release.md#android); the checklist itself is lost |
| `LANDING_PAGE_SPEC.md` | `daily_puzzle.dart` (§6 "Daily Seed Algorithm") | Spec for the landing page's daily puzzle port | [puzzle-engine.md](puzzle-engine.md#the-daily-puzzle) |
| `docs/tag_editing_monetization.md` | `iap_catalog.dart`, `iap_service.dart`, `external_links.dart` | Store product setup, tag-editing perk, external checkout policy | [backend.md](backend.md#payments), [../game/progression.md](../game/progression.md#supporting-the-game) |
| `unlocks.dart` | `stats_service.dart` | An older name for the unlock logic | Now `mode_unlock_celebration.dart` |

Some section-level detail is gone for good (exact type scale, sheet heights, the full ship checklist). If Krischan rewrites one of these, put it in this wiki and update this table, or commit it to the app repo so the comments point at something real again.
