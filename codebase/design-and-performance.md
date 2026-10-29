# Design system and performance

The app's own `DESIGN_SYSTEM.md`, `KEYBOARD_NAV.md` and `CLAUDE.md` are not in the repo ([lost-docs.md](lost-docs.md)). This page rebuilds what they said from `lib/app_theme.dart` and the code comments that cite them. Section numbers in brackets are the original docs' numbering, as the comments quote them.

## Look

- **Flat and quiet.** Solid fills, one corner radius everywhere (`kRadius = 4`), no elevation (`kAppBarElevation = 0`), no blur, no ink ripples. Board cells sit 5px apart (`kCellGap`), and the board grows to at most 550px (`kMaxBoardSize`). The landing page mirrors these in `src/lib/tokens.css`.
- **Dark by default**, with a full light theme. Theme tokens live in the `ShikakuTheme` extension in `lib/app_theme.dart`; widgets read tokens, never literal colors.
- **Fixed layout.** The app is designed in fixed sizes and locks text scaling so a phone's large-font setting can't break the layout (`main.dart`, covered by `test/scaling_lock_test.dart`) [DESIGN_SYSTEM §5.4].
- **Settings sheets** cap at 640dp wide on desktop, like Material's bottom sheets [§3.3].

### Core tokens

| Token | Dark | Light |
| --- | --- | --- |
| Background | `#1B1B1B` | `#F2EDE4` |
| Empty cell | `#37311F` | `#E0D8C8` |
| Primary / focus ring (amber) | `#D0B878` | `#B89050` |
| Unselected chip | `#2F2E2A` | `#DDD8CE` |
| Text | white, body at 70% | `#1A1605`, body at 70% |
| Drag preview | `#4488FF` at 33% | `#3366CC` at 20% |
| Invalid placement | `#FF5555` | `#CC3333` |
| Hokan anchor | `#4A6080` / stroke `#6A8AAA` | `#B8C8D8` / stroke `#6A8AAA` |

### Box palette

Placed boxes take one of eight colors, chosen from the box's coordinates so a box keeps its color across save, reload and replay: rose `#D08080`, teal `#80B8B0`, lavender `#A090C0`, slate blue `#8098B0`, sage `#88B098`, amber `#D0B878`, mauve `#B888A8`, sienna `#C5956B`.

### Mode colors

| Mode | Fill | Stroke |
| --- | --- | --- |
| Zen | `#D0B878` | `#655733` |
| Time Attack | `#D08080` | `#773535` |
| Blitz | `#8098B0` | `#364A5F` |
| Tekazu | `#88B098` | `#2A6341` |

Versus (from Krischan's comps, [versus/design/](../versus/design/)): mines in rose `#D08080` with an ink fuse pie, ice in blue `#80B3E6` with hatching and a thaw wedge.

### Type

All three faces ship as **subsets** to keep the install small (about 410KB of fonts in total), under the SIL Open Font License.

| Face | Role |
| --- | --- |
| Shippori Antique | Everything: headings, body, labels, numbers on the board |
| Shippori Mincho (400 to 800) | Brand and display titles (the app bar title is Mincho 22, weight 700) |
| Inconsolata Medium | Monospace, for player tags |

Body text dims to 70% by itself; captions must not dim again on top of it [§2.2].

### Shared widgets (always use these)

`ShikakuAppBar`, `ShikakuButton` (never a raw Material button with inline styles), `ShikakuModal`, `ShikakuCaption`, `ShikakuFocusRing`, `BadgeNameLabel` (name and badge sized by locked ratios [§7.11]), `CountryFlag` (bundled SVG flags, globe fallback [§7.15]), `showResultModal` (the one end-of-game modal).

### Keyboard

Every screen is playable by keyboard. Arrow keys move focus, Enter activates, Escape goes back, and an amber focus ring appears only in keyboard or mouse mode, drawn as a flat stroke with no extra layer [DESIGN_SYSTEM §11, KEYBOARD_NAV §3]. On the board: arrows, Shift to stretch, Ctrl to snap, Space to commit, with Tetris-style auto-repeat (DAS, ARR, DCD).

## Performance doctrine

The rules the code comments attribute to `CLAUDE.md`. They exist because the web build rasterizes on the browser's main thread, and because the game must run well on low-end phones ([PRINCIPLES.md](../PRINCIPLES.md#performance-and-purpose)).

1. **Static widgets go inside a `RepaintBoundary`** so they rasterize once (badge icons, flags, banners) [CLAUDE §1].
2. **No offscreen layers.** No `Opacity` widget, no group opacity: pre-multiply the alpha into the color instead [CLAUDE §2]. `saveLayer` is "the single most expensive primitive".
3. **No color filters or blend modes** in paint paths; SVGs carry their own colors [CLAUDE §4].
4. **No blur, no `BackdropFilter`.** Scrims are flat and near-opaque.
5. **No ink ripples.** The theme sets `NoSplash` app-wide; pressed and hover states are flat tints [KEYBOARD_NAV §8.1].
6. **`Clip.hardEdge`, not anti-aliased clips**, where clipping is needed.
7. **Animations are one-shot and transform-only.** Toasts slide in; nothing loops while idle. A held key must never keep a ticker running every frame (see `_updateKbPreview` in `game_keyboard.dart`).
8. **Timed modes use a faster board reveal** (250ms instead of 750ms) so the play loop isn't gated on animation.
9. **No external hosts.** Flags, badges and fonts are bundled. The game works fully offline.
10. **Versus hazards** animate through `CustomPainter.repaint()` only, never `setState` in a ticker, and the board is never wrapped in a widget that rebuilds on a timer ([versus/README.md](../versus/README.md)).

## Offline doctrine

- SharedPreferences is the immediate source of truth for stats, badges, tags, profile and posts. Supabase is synced fire-and-forget.
- Nothing at boot waits on the network; anonymous sign-in is best-effort.
- A failed fetch is not an error: show cached data and, at most, a small "offline" tint.
