# Build and release

## Pushing `master` is a production deploy

`.github/workflows/deploy.yml` in the app repo runs on every push to `master`:

1. Install Flutter (stable 3.x) and `flutter pub get`.
2. `flutter build web --release`.
3. Copy `functions/` into `build/web/functions` (the build wipes `build/web`, and Cloudflare Pages only picks up functions inside the published folder).
4. Publish `build/web` to the Cloudflare Pages project `shikaku-plus`, which serves `shikaku.plus`.

There is no staging environment. This is why the Versus work was never pushed, and why it was lost ([versus/history.md](../versus/history.md)). **Work on a branch.** Only branches merged into `master` deploy. A root-level `deploy.yml` is an older copy without step 3; GitHub only runs the one in `.github/workflows/`.

Android, iOS and desktop builds are made by hand; nothing in the repo uploads to a store. The Play Store build installs at about 9MB (Krischan).

## Versioning

Calendar-based: `<major>.<yy>.<month>.<patch>`, for example `1.26.7.2`.

- The full four-part version is `kAppVersion` in `lib/feature_flags.dart`; the About page shows it.
- `pubspec.yaml` can only hold three parts plus the store build counter: `version: 1.26.7+4`. The `+N` must only ever go up (Android `versionCode`).
- When the month changes, update both. Bump `<patch>` in `kAppVersion` for every release.

## Running locally

```
flutter pub get
flutter run -d chrome                     # web
flutter run                               # a connected Android device
flutter run --dart-define=ENABLE_BLITZ_TEKAZU=true   # with Tekazu unlocked
flutter test                              # text-scale lock and keyboard tests
```

The Google web OAuth client id is baked in as a default, so a plain `flutter run` works; override with `--dart-define=GOOGLE_WEB_CLIENT_ID=…` for another Supabase project.

## Feature flags

All in `lib/feature_flags.dart`. Plain `const` values, so the compiler removes disabled code from release builds.

| Flag | Value | What it does |
| --- | --- | --- |
| `kMosaicEnabled` | `false` | Hides the retired Mosaic mode. All its code and tables are kept; flipping this back is the only step to restore it. |
| `kResumeGameEnabled` | `false` | Hides the "Resume / Start fresh" prompt, because solved boards were being offered for resume. The save machinery still runs. The real fix is to never save a solved board. |
| `kBlitzTekazuEnabled` | `false` in production | Opens Tekazu (and Blitz early). True only with `--dart-define=ENABLE_BLITZ_TEKAZU=true`, or the dev slug below in a non-release build. |
| `kBlitzUnlocked` | `true` since 2026-07-04 22:00 UTC | Blitz's own public launch date (`kBlitzLaunchUtc`). |
| `kModeGatingCutoffUtc` | 2026-07-01 UTC | Accounts created before this skip the games-finished unlock ladder. |

## Dev URL slugs (web, non-release builds only)

All ignored in release builds, so they can't do anything on `shikaku.plus`.

| Slug | Effect |
| --- | --- |
| `?unlock=blitz-tekazu` | Unlocks Blitz and Tekazu |
| `?celebrate=timeattack` | Replays an unlock celebration (also `blitz`, `tekazu`, `zen`) |
| `?toast=foundation_2` | Shows a badge toast until tapped; comma-separate ids for the multi-badge toast |
| `?support` | Opens the Support sheet regardless of gating |
| `/debug/helpme` or `/#/debug/helpme` | Shows the Help Me! modal permanently, for design checks |

## Android

- Package and namespace: `plus.shikaku.app`.
- App Links (`autoVerify="true"`) for `https://shikaku.plus` and `https://shikaku-plus.pages.dev`, so Help Me! links open the app.
- OAuth callback scheme: `plus.shikaku.app://login-callback`.
- Release signing reads `android/key.properties` and a keystore, both git-ignored. Losing the keystore means the app can never be updated on Google Play again; back it up somewhere other than one drive.
- Launcher icons come from `flutter_launcher_icons` (adaptive background `#D0B878`).

## Tests

- `test/scaling_lock_test.dart`: the app locks text scaling to its designed size (a bug that once shipped to a Samsung A54). Fails if any widget re-introduces system text scaling.
- `test/keyboard_nav_test.dart`: arrow keys move focus through the menus and Enter activates the focused control, through `ShikakuFocusRing`.
- `test/widget_test.dart`: a basic smoke test.
- The puzzle generator's cross-language guard is the landing repo's `src/lib/puzzle.test.js` (`npm run test` there).
- The Versus economy's tests live in this repo: `prototypes/vs-lab/test/` (`node --test test/*.test.js`).
