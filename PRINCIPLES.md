# How we work

Krischan's working principles, written down so every session and agent works the same way. [AGENTS.md](AGENTS.md) holds the short, binding version; this file explains them.

## Performance and purpose

Krischan, 2026-10-30: "I am very aggressive when it comes to performance, usability, and the 'purpose' of an item, object, or software. If it's a game, it doesn't have to have bloat. I want to play in the constraints my predecessors in coding had to navigate. I don't want to be comfortable in a 3060 Ti and let people with worse specs than my items suffer because they don't have the means to do so."

What that means in practice:

- **Size is a feature.** The Play Store install is about 9MB, and that number is something to protect. Fonts ship as subsets, flags and badges are bundled SVGs, and a new package has to justify every kilobyte.
- **Cheap phones and browsers come first.** The web build runs Flutter's rasterizer on the browser's main thread, so the app avoids offscreen layers, blur, group opacity and ink ripples entirely. The full rule list is in [codebase/design-and-performance.md](codebase/design-and-performance.md#performance-doctrine).
- **Offline first.** The game generates every puzzle on the device and saves locally first. The network is a bonus, never a gate.
- **Every piece has a purpose.** If a screen, setting or effect doesn't serve the player, it goes, or it never ships.

## Two modes

Not every conversation needs the full rulebook. Pick the mode from what the session is about to touch.

### Brainstorm mode (the default for conversation)

For game design talk, research, analysis, drafting, and writing inside this repository.

- **Start immediately.** No restating, no three questions, no waiting for a yes. Ask questions alongside the first results, not before them.
- Pareto still applies: lead with what matters most.
- Nothing outside this repository changes in this mode. Prototypes in [prototypes/](prototypes/) count as inside.

### Work mode (trial by fire)

For anything that touches **code** in the app or landing repos, anything **players or stores see** (a release, a post, a listing, Supabase data), or anything **hard to undo**.

- Run the [confirmation gate](AGENTS.md#confirmation-gate): restate the ask, say what you understood and what is out of scope, ask **at least three** clarifying questions (which repo, which platform, what "done" means, what must stay as it is), and wait for an explicit yes before writing code.
- Chesterton's fence is front and center.
- Pareto decides the order of the work.

### Switching

- Moving from brainstorm to work mode happens the moment a session is about to change code or anything outside this repository. Say so in one line and run the gate.
- Krischan can switch explicitly: "work mode" or "brainstorm mode".
- When unsure which mode applies, it is work mode.

## Chesterton's fence

Do not remove, rename, or clean something up until you know why it is there.

That includes code, config, copy, a migration, a flag and a step in a process. If you cannot say what it is for, leave it. Find out first. Then ask before you change it.

In Shikaku+ this matters a lot. Some examples of fences that look removable and are not:

- `kMosaicEnabled = false` hides a whole finished mode. It was soft-retired on purpose, not abandoned.
- A badge id like `prevs` looks like a typo. It is stored in the database and in share URLs, so renaming it breaks every earned badge.
- The generator in `lib/puzzle_codec.dart` looks like it could be tidied up. Reordering a single random-number call changes every puzzle, breaks the daily puzzle's match with the landing page, and breaks every shared link.

## Pareto principle

Start with the small part of the work that carries most of the result. About 20% of the effort usually drives about 80% of the outcome. When that high-leverage path is clear, do it first.

## Jakob's law

Players spend most of their time in other games and apps, so they expect ours to work the same way. Use familiar patterns, labelled controls, and the main action where people expect it. Utilitarian by choice.

## Build in the cheap medium first

Krischan, 2026-10-29: prototype as a web artifact before porting to Flutter, "we save tokens, and we scaffold this quickly instead of scrambling with Flutter for a long time." Game rules get proven in a small, fast, testable prototype ([prototypes/vs-lab/](prototypes/vs-lab/)), then ported. See [decision 0004](decisions/0004-prototype-first.md).
