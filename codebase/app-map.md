# App file map (`s-ging/shikaku-plus`)

Read from the copy (HEAD `71ba81f`, app version 1.26.7.2) on 2026-10-30: 124 Dart files, about 34,000 lines, all flat in `lib/`. Grouped by job. Line counts are rounded.

## Entry and shell

| File | Job |
| --- | --- |
| `main.dart` | Entry point. Reads launch params from the URL (web) or App Links (native), dev slugs, theme, text-scale lock, app-wide keyboard shortcuts |
| `loading_screen.dart` | Boot: Supabase init, best-effort anonymous sign-in, loads prefs, stats, badges, tag, posts, IAP listener |
| `game_app.dart` | App root after boot: menu, game routing, link import |
| `home_screen.dart`, `menu_screen.dart` | Home: Daily puzzle, Quick game, Custom game, Let Me Help!, Profile, Ranks, Settings |
| `app_navigator.dart` | Global navigator key, so code without a context can reach the overlay |
| `incoming_links.dart` | `LaunchParams` (all share-link query params, one parse site) and the native incoming-link notifier |
| `share_links.dart` | `kShareOrigin = https://shikaku.plus`, the one place the share domain lives |
| `external_links.dart` | Landing, legal and support URLs, and `openExternalUrl` |
| `feature_flags.dart` | Version string, build-time flags, dev-only slug flags, launch and cutoff dates |

## The game engine (one widget, many mixins)

| File | Job |
| --- | --- |
| `game.dart` (≈890) | `ShikakuGame` widget and its state class; all `game_*.dart` files are `part of` it |
| `game_state_core.dart` | The shared contract: every field and cross-mixin method signature |
| `game_drag.dart` | Pointer drag and the single placement path (`_handleDrawClassic`, `_handleDrawHokan`) |
| `game_keyboard.dart` (≈800) | Cursor, snap navigation, selection, auto-repeat (DAS/ARR/DCD) |
| `game_history.dart` | Undo, redo, reset, solve checks |
| `game_persistence.dart` | Saving the board after every move; resume prompt (currently off) |
| `game_lifecycle.dart` | Generating puzzles, starting games, recording solve stats, Solved / Yay! modals, unlock celebration |
| `game_replay.dart` | Move tokens, replaying links, building Help Me! URLs |
| `game_timeline.dart` | Spectator and review step-through |
| `game_ui.dart` | Action bar (Help Me!, undo, redo), Hokan target chips, timeline bars |
| `game_models.dart` | Cell classification for snapping, Hokan target slots, undo snapshots, solved flavor text |
| `game_prefs.dart` | Snap preferences, key bindings and their defaults, handling values |
| `board_painter.dart` (≈720) | `CustomPainter` for the board, plus the mutable `BoardRect` |
| `puzzle_codec.dart` (≈760) | Pure Dart: enums, generator, RNG, seeds, move tokens, payload decode. See [puzzle-engine.md](puzzle-engine.md) |
| `daily_puzzle.dart` | Pure Dart: daily seed |
| `puzzle_save.dart` | Saved puzzles and the player name notifier |
| `game_timer_banner.dart` | Big clock banner for timed modes |

## Modes

| File | Job |
| --- | --- |
| `start_game_screen.dart` (≈800) | Setup screen: mode cards (`CustomMode`), ruleset, size, difficulty |
| `time_attack_screen.dart`, `blitz_screen.dart`, `tekazu_screen.dart` | Run screens with their limits tables |
| `result_modal.dart` | The one end-of-game modal every mode uses |
| `mode_unlock_celebration.dart`, `mode_unlock_overlay.dart` | Unlock thresholds and the "UNLOCKED" takeover |
| `custom_game_screen.dart` | Route wrapper used by Mosaic boards |
| `custom_game_button.dart` | Mode card widget (contains a throwaway demo `main` at the bottom) |
| `mosaic_*.dart` (8 files) | Retired Mosaic mode, kept dormant |
| `help_me_modal.dart` | Help Me! and Let Me Help! modals |
| `handling_page.dart` (≈900) | Keyboard handling settings with a live sandbox board |

## Accounts, profile, stats

| File | Job |
| --- | --- |
| `supabase_client.dart` | Supabase singleton, `ensureAuth()` (anonymous sign-in with captcha) |
| `auth_service.dart` (≈1,340) | Guest-to-account upgrade in place, email code, password, Google, Discord, merge, sign-out, delete |
| `auth_modal.dart`, `awaiting_verification_overlay.dart`, `account_connect_banner.dart`, `account_settings_page.dart`, `player_name_modal.dart` | Account UI |
| `player_tag_service.dart`, `change_tag_modal.dart` | 6-character player tags and the supporter tag change |
| `profanity_filter.dart`, `report_modal.dart` | Name filter and the abuse report flow |
| `stats_service.dart` | Raw stats, offline cache, Supabase sync, gameplay badge grants |
| `visible_stats.dart` | The public stats contract: the only metrics the UI may show |
| `deep_analytics.dart` | Hidden per-solve analytics; never imported by UI |
| `stats_screen.dart` (≈1,240) | Account screen |
| `public_profile_screen.dart`, `profile_flyout.dart`, `profile_header.dart`, `profile_service.dart`, `profile_favorites_picker.dart`, `public_stat_tables.dart` | Profiles, own and others' |
| `leaderboard_screen.dart`, `leaderboard_service.dart`, `leaderboard_rank_hint.dart` | Leaderboards |
| `badge_catalog.dart`, `badge_service.dart`, `badge_icon.dart`, `badge_name_label.dart`, `badge_screen.dart`, `badge_toast.dart` | Badges |
| `country_flag.dart`, `country_geo*.dart`, `country_change_request_modal.dart` | Country flag capture and display |

## Money

| File | Job |
| --- | --- |
| `iap_catalog.dart` | Pure Dart: every product and price |
| `iap_service*.dart` | In-app purchase (native) and no-op stub (web, desktop) |
| `support_sheet.dart` | The "Support Shikaku+" purchase sheet |

## Content, settings, platform

| File | Job |
| --- | --- |
| `post.dart`, `post_service.dart`, `whats_new_screen.dart` | What's New posts |
| `settings_sheet.dart`, `gameplay_settings_sheet.dart`, `keyboard_settings_page.dart`, `key_bindings_page.dart`, `preferences_page.dart`, `about_page.dart`, `licenses_page.dart`, `licenses.dart` | Settings |
| `theme_controller.dart`, `app_theme.dart` (≈690) | Theme mode and every design token. See [design-and-performance.md](design-and-performance.md) |
| `app_bar.dart`, `shikaku_button.dart`, `shikaku_modal.dart`, `shikaku_caption.dart`, `focus_ring.dart`, `app_toast.dart`, `coming_soon.dart` | Shared widgets |
| `daily_notifier*.dart` | Daily reminder (native only) |
| `pwa_install*.dart` | "Add to Home Screen" on web |
| `turnstile_token*.dart` | Captcha token: JS on web, offscreen WebView on Android/iOS |
| `oauth_redirect_url*.dart`, `desktop_uri_scheme*.dart` | OAuth return handling, `plus.shikaku.app://` registration on desktop |
| `debug_page.dart` | Debug tools (difficulty sliders) |

## Outside `lib/`

| Path | What it is |
| --- | --- |
| `test/` | `scaling_lock_test.dart` (text-scale lock), `keyboard_nav_test.dart`, `widget_test.dart` |
| `supabase/migrations/` | 48 numbered migrations, 2026-06-16 to 2026-07-11 |
| `supabase/functions/` | Edge functions: `verify_iap_purchase`, `send-goodbye-email` |
| `supabase/schemas/prod.sql` | Schema dump |
| `functions/api/geo.ts` | Cloudflare Pages Function that echoes `CF-IPCountry` |
| `.github/workflows/deploy.yml` | Build web and publish to Cloudflare Pages on push to `master` |
| `deploy.yml` (root) | An older copy of the workflow without the functions step; not the one GitHub runs |
| `web/index.html` | Turnstile and PWA install hooks |
| `assets/` | Subset fonts (≈410KB) and SVG images: badges, mode icons, leaderboard icons, social icons, flags (≈510KB) |
| `android/` | Package `plus.shikaku.app`, App Links for `shikaku.plus` and `shikaku-plus.pages.dev`, release signing from `key.properties` (never committed) |
