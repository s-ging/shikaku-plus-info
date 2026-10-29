# Backend: Supabase, Cloudflare, payments

The game is playable with no backend at all. Every board is generated on the device, and every data layer writes to the device first. The backend adds accounts, cross-device sync, leaderboards, badges, posts and payments.

## Supabase

One Supabase project serves the app and the landing page. Its URL and anon key are in `lib/supabase_client.dart`; they are public by design. **Service-role keys never go in the app, the landing repo or this wiki.**

### Auth

- **Anonymous first.** `ensureAuth()` signs every new player in anonymously. Captcha is on in Supabase, so web gets a Cloudflare Turnstile token from `web/index.html`, and Android and iOS render the same Turnstile widget in an offscreen WebView (`turnstile_token_native.dart`). Desktop sends no token.
- **Never blocks boot.** If sign-in fails (offline, captcha, network), the player continues as a local guest and it retries on the next launch (`loading_screen.dart`).
- **Upgrade in place.** Connecting email, Google or Discord upgrades the anonymous user, so the user id and every row keyed to it stay the same. `merge_anonymous_account` folds a guest's progress into an existing account when a guest signs in to one.
- **OAuth return:** web uses the page URL; native uses `plus.shikaku.app://login-callback`, registered on desktop at runtime (`desktop_uri_scheme_native.dart`). The Google web client id is in `supabase_client.dart` and must also be listed in Supabase's Google provider.

### Tables

| Table | Holds |
| --- | --- |
| `user_profiles` | Display name, player tag, active badge, country, favorite badges and stats, leaderboard visibility |
| `user_stats` | Public summary stats per player (boards, games, time, per-mode counts, best clears, best runs) |
| `game_events` | Append-only log of every solve, including the hidden deep-analytics blob |
| `user_badges` | Earned badges |
| `user_settings` | Synced theme, preferences and key bindings |
| `puzzle_saves` | Saved boards |
| `user_entitlements`, `processed_iap_receipts` | Supporter and Foundation perks; receipts already redeemed |
| `posts` | What's New: announcements, patch notes, blog (written in the landing site's `/admin`) |
| `reports` | Abuse reports from the Report flow, triaged in the dashboard |
| `country_change_requests` | Manual country corrections, reviewed by hand |
| `retired_user_stats` | Stats snapshotted with no user id when an account is deleted, so global totals stay right |
| `account_migrations` | Short-lived (10-minute) tokens used to merge a guest into an existing account; clients never touch it directly |
| `mosaic_rooms`, `mosaic_room_members`, `mosaic_room_boards`, `mosaic_room_status_transitions`, `mosaic_assets` | Retired Mosaic mode |

Row-level security limits players to their own rows. Cross-player reads (leaderboards, public profiles, the landing page's global counter) go through `SECURITY DEFINER` functions that return only public fields.

### Key RPCs

| Function | Job |
| --- | --- |
| `record_board_solved`, `record_game_finished`, `record_time_attack_run` | The single write paths for stats and `game_events` |
| `reconcile_user_stats` | Repairs a player's summary from their event log |
| `global_boards_solved` | Total boards solved by everyone; the landing page shows it rounded down ("1,200+") |
| `set_display_name`, `ensure_player_tag`, `set_player_tag`, `resolve_player_tag` | Names and tags (custom tags are gated by entitlement, server-side) |
| `grant_badge_to_self`, `set_active_badge`, `get_public_badges`, `grant_temporal_badges`, `grant_foundation_badge` | Badges |
| `get_public_profile`, `set_profile_favorites`, `capture_country_code`, `set_show_country` | Profiles |
| `leaderboard_games_finished`, `leaderboard_boards_finished`, `leaderboard_achievements`, `leaderboard_fastest_clears`, `leaderboard_time_attack_runs`, `get_my_leaderboard_ranks`, `set_hide_from_leaderboards`, `set_anonymize_on_leaderboards` | Leaderboards |
| `grant_tag_entitlement`, `has_tag_editing`, `redeem_iap_purchase` | Payments and perks |
| `merge_anonymous_account`, `delete_my_account` | Account lifecycle |

### Migrations

48 files in `supabase/migrations/`, numbered 01 to 47 (plus an unprefixed `13_account_merge.sql`), from 2026-06-16 to 2026-07-11. Code comments refer to them by number ("migration 32"). `supabase/schemas/prod.sql` is a schema dump. Never edit an applied migration; add a new one.

### Edge functions (`supabase/functions/`)

| Function | Job |
| --- | --- |
| `verify_iap_purchase` | The trust boundary for mobile purchases. Resolves the user from their token, verifies the receipt with Google Play or Apple, then calls `redeem_iap_purchase`, which records the receipt once and grants the perk. The app never grants a perk itself. |
| `send-goodbye-email` | Best-effort courtesy email when an account is deleted, sent before deletion; any failure is ignored and deletion proceeds. |

## Cloudflare

- **Pages** hosts the web app at `shikaku.plus` (old origin `shikaku-plus.pages.dev`, which should keep redirecting so old share links work). The project is `shikaku-plus`.
- **Pages Function** `functions/api/geo.ts` (`GET /api/geo`) echoes the visitor's `CF-IPCountry` header, ignoring `XX` (unknown) and `T1` (Tor). It is the only server code on Cloudflare and touches no data. The app calls it once, when an account first becomes registered, and stores the result through `capture_country_code`, which can only be written once.
- **Turnstile** protects anonymous sign-in on web, Android and iOS.
- **Versus server (planned):** Durable Objects, one per match ([decision 0005](../decisions/0005-cloudflare-for-versus.md)).

## Payments

- **Web and desktop:** the app opens `https://go.shikaku.plus/support` (`kSupportUrl`). That page was never built: payments haven't shipped, because no merchant of record would take an unregistered business (Krischan, 2026-10-30; [open questions](../project/open-questions.md#business)). The landing page's own Support button goes straight to PayMongo (`https://paymongo.page/l/shikaku-plus`).
- **Android and iOS:** `in_app_purchase`, verified server-side as above. Product ids in `lib/iap_catalog.dart` must exist verbatim in Google Play Console and App Store Connect.
- Store policy: mobile builds may not link out to external payment, so the Support sheet only shows the external checkout on web and desktop (`canUseExternalSupportLink`).

Products and prices: [game/progression.md](../game/progression.md#supporting-the-game).

## Landing page (`go.shikaku.plus`)

SvelteKit. It reads the same Supabase project for the global counter and the blog, and owns the public pages Google Play requires (privacy policy, terms, data deletion). It carries its own copy of the generator for the daily puzzle; see [puzzle-engine.md](puzzle-engine.md). Its donation bar reads a published Google Sheet.
