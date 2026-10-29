# Accounts, stats, badges, leaderboards and supporting

Everything around the puzzles: who you are, what you've done, and how you can back the game.

## Accounts

Every player starts as an **anonymous guest**: the app signs in to Supabase anonymously on first launch, protected by a Cloudflare Turnstile captcha (`lib/supabase_client.dart`). If that fails (offline, captcha, network), the player stays a local guest and the game still works fully; it retries on the next launch.

**Connecting an account upgrades the guest in place**: same user id, so every stat, save and badge stays put, with no data migration (`lib/auth_service.dart`). Sign-in options: a one-time email code (login and sign-up are the same flow), a password fallback, Google, and Discord.

- **Display name (IGN):** what friends see on Help Me! links. Filtered for profanity; changes have a cooldown (migration 34).
- **Player tag:** a unique 6-character handle drawn from `23456789ABCDEFGHJKMNPQRSTUVWXYZ` (no look-alike 0, 1, I, L or O), safe to put in links; the user id never goes in a URL. Registered accounts only; guests have none (`lib/player_tag_service.dart`, migration 23). Supporters can claim a custom tag, which may be shorter (migrations 27 and 29).
- **Country flag:** captured once, when an account first becomes registered, from Cloudflare's `CF-IPCountry` header on web and through `shikaku.plus/api/geo` on native ([codebase/backend.md](../codebase/backend.md#cloudflare)). A player who is genuinely from somewhere else files a change request, reviewed by hand.
- **Delete account:** permanent and immediate. Identity, sign-ins, profile, saves and the per-player event log are deleted; aggregate stats are kept with no user id so community totals stay right (landing repo `docs/LANDING_HANDOFF.md`).

## Stats

Two layers, kept apart on purpose (`lib/stats_service.dart`, `lib/visible_stats.dart`, `lib/deep_analytics.dart`):

- **Visible stats**, the only numbers the app shows. Account screen: games finished, boards finished, time played, favorite ruleset, favorite mode, favorite board size, blocks per minute, APM, fastest clear per size and difficulty, most efficient clear per size and difficulty, and best Time Attack run per size and difficulty. Solved screen: moves, time and APM for that board.
- **Deep analytics**, recorded but never shown: undos, redos, resets, invalid attempts, erases and more per solve, written to the append-only `game_events` log. Kept for possible future premium insights (efficiency, a "finesse" ratio of actions per clue, do-over rates).

Showing a new stat is a product decision, not a code tidy-up. See [llm/README.md](../llm/README.md#invariants-that-must-never-break).

**Games vs boards:** a game is a completed session (a solved Zen, Blitz or Tekazu board, or one whole Time Attack run). A board is any solved board, so a Time Attack run that clears 8 boards adds 1 game and 8 boards. Games unlock modes ([modes.md](modes.md#unlock-ladder)).

## Badges

Registered players earn badges and wear one as their active badge, shown next to their name everywhere, including inside Help Me! links. Players also pick up to three badges and three stats to feature on their public profile. Catalog: `lib/badge_catalog.dart`.

| Family | Badges | How you get it |
| --- | --- | --- |
| Special | New Player, Beta Tester, Contributor, PreVS | Registering, being early, giving feedback, registering before Versus launches |
| Foundation ★ to ★★★★ | foundation_1 to foundation_4 | One-time donation of $1+, $5+, $20+, $50+ during the fundraiser |
| Supporter I to IV | supporter_1 to supporter_4 | Supporter months (see below) |
| Classic | Initiate, Enthusiast, Veteran, Expert | 1, 50, 100, 200 Classic boards |
| Hokan | Initiate, Enthusiast, Veteran, Expert | 1, 50, 100, 200 Hokan boards |
| Time Attack | In A Rush, Time Attacked, Time Attacker, Time Expert, Time Attack Master | 1, 50, 100, 200, 500 |
| Blitz | Quickie, Blitzed, Speedster, Blitz Expert, Blitz Master | 1, 50, 100, 200, 500 |
| Tekazu | Lock In, Locked Out, Lockdown, Tekazu Expert, Tekazu Master | 1, 50, 100, 200, 500 |

The PreVS badge ("Run it back one more time") is the promise to players that Versus is coming. Badge ids are stored in the database and in URLs; never rename one.

## Leaderboards

Five boards, global or filtered to your own country (`lib/leaderboard_screen.dart`, migrations 35 to 45):

1. Most games finished
2. Most boards finished
3. Most achievements
4. Fastest clears, per board size, with a "Blitz runs only" toggle
5. Best Time Attack runs, per board size

Players can hide from the leaderboards or appear anonymized.

## Supporting the game

Backing Shikaku+ unlocks the **custom player tag** perk and a badge. Two product families (`lib/iap_catalog.dart`):

| Product | Type | Price points | Gives |
| --- | --- | --- | --- |
| Foundation | One-time donation, name your price | $1, $2, $5, $10, $20, $50 (₱50 to ₱2,500) | Permanent tag editing and the Foundation badge for that tier ($2 and $10 give the tier below) |
| Supporter | Buy months | 1, 2, 3, 4, 6, 12 months ($1.99 to $15.00) | Tag editing for that many months and a Supporter badge |

- **Web and desktop** pay through the external checkout: the app links to `https://go.shikaku.plus/support` (`kSupportUrl` in `lib/external_links.dart`; that page doesn't exist yet: payments never shipped, see [open questions](../project/open-questions.md#business)), and the landing page's Support button goes to `https://paymongo.page/l/shikaku-plus`. There, Foundation is truly free-form.
- **Android and iOS** use in-app purchase. Receipts are verified server-side by the `verify_iap_purchase` edge function; the app never grants a perk itself.
- The landing page shows a live donation total and a Foundation deadline, set to the end of August 2026 at last check.

## What's New

Announcements, patch notes and blog posts from the Supabase `posts` table, cached for offline reading. A bell on the home screen lights up for unseen posts, and the newest one shows as a toast on launch. Posts are written in the landing site's admin area (`/admin`).
