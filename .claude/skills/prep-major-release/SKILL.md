---
name: prep-major-release
description: Prepare kerf for a major release — refresh the README so it stays compelling and current, and review the animated demo captures so the maintainer knows which screenshots to re-capture.
allowed-tools: Read, Grep, Glob, Bash, Edit, Write, Agent
---

# prep-major-release — get kerf ready to ship a major release

A lot changes between major releases. This skill does the two release-prep jobs
that are easy to forget and need human taste: **(1)** make the `README.md`
compelling and accurate again, and **(2)** review the animated demo captures and
hand the maintainer a precise list of which screenshots to re-capture.

Work both parts in order. Don't capture screenshots yourself — that's the
maintainer's step (see Part 2). When you finish, leave a clear handoff.

## Ground yourself first

Before touching anything, build an accurate picture of what actually changed:

1. **What shipped** — read `CHANGELOG.md` (the `[Unreleased]` section plus recent
   releases) for the user-visible changes since the last major.
2. **Current public API** — read `docs/8-api-reference.md` and the exports in
   `src/index.ts` (+ the subpath barrels: `kerfjs/array-signal`, `kerfjs/testing`,
   `kerfjs/jsx-runtime`). The README's "small API / N exports" claims must match.
3. **The pitch** — re-read `docs/1-overview.md` (what kerf is / when to use it)
   and the current `README.md` end to end so your edits stay in kerf's voice.
4. **The numbers** — bundle-size and perf claims. Perf numbers come **only from the
   official upstream krausest benchmark**, imported into `bench/results.json` /
   `bench/results.md` via `node bench/import-krausest.mjs` (kerf is a merged upstream
   entry). Never paste a number from an ad-hoc local run. To refresh before a major
   release, run the importer + commit; if the perf story changed but krausest hasn't
   re-run with the new kerf version yet, keep the qualitative framing ("same cluster
   as Vue / Lit / vanjs; Solid wins the compiler-driven benchmarks") rather than
   inventing figures. See the **Performance comparison numbers** rules in `CLAUDE.md`.

## Part 1 — README

Make `README.md` compelling, accurate, and current. The README is the single most
important marketing surface; treat it like a landing page, not a changelog.

Review and update as needed:

- **The hook** (logo block + "Introducing Kerf" pitch + first code sample). Is the
  one-liner still true (bundle size, "no virtual DOM / no compiler / no magic")?
  Is the opening example the clearest possible 10-line taste of kerf?
- **"Why Kerf"** — does it lead with the *most important and interesting* features?
  Promote anything that became a headline feature since the last major (e.g. a new
  reconcile fast path, `morph` as a public export, `arraySignal`, the ESLint
  plugin, AI-assistant configs). Demote or cut anything that's no longer a
  differentiator. Keep it punchy — a reader skims this list.
- **"When to use / When to reach for something else"** — still honest and current?
- **"Quick tour"** and the feature spotlights (`arraySignal`, `morph`, etc.) —
  do the code samples compile against today's API? Are the headline primitives all
  represented? Add a short spotlight for any new marquee primitive.
- **Install / config** — `tsconfig` snippet, package names, subpath imports correct?
- **Links section** — every link resolves, and the **Demo** bullet's description
  matches the demo's *actual* current sections/count (cross-check against the live
  demo + Part 2).
- **Numbers & counts** — export count, KB figures, "N sections" — all must match
  reality. Grep the source rather than trusting the old prose.

Keep kerf's established voice (confident, concrete, a little dry). American
English throughout (`behavior`, `optimize`, `gray`…). **Never put a `KF-NN`
ticket marker in the README** — it's a published surface; readers don't have Hot
Sheet. Write self-contained prose instead.

When the README change touches an API claim, make sure the corresponding
`docs/` page and `docs/ai/` summaries still agree — flag drift you can't fix
in scope as a follow-up Hot Sheet ticket rather than fixing it silently.

## Part 2 — Demo captures ("demo modes" / screenshots)

The animated demo captures are the marketing screenshots. Each complete example
app under `site/src/examples/complete/<name>/` has a capture config
`site/scripts/demo-captures/<name>.json` that drives the app through its headline
flow; `capture-demos.sh` renders each to `site/public/demos/<name>.svg`
(embedded at the top of the app's docs page). Read
`site/scripts/demo-captures/README.md` for the full mechanism.

Your job is to decide whether the **set** of demos and the **flow each one shows**
still tells the best story for this release — i.e. whether new / different / fewer
screenshots are needed — and to update the *configs* accordingly. You do **not**
run the capture.

### Step 0 — upgrade `domotion-svg` to the latest before anything captures

`domotion-svg` is the renderer that turns each app into its animated SVG, and it's
pinned as a root devDependency (`package.json` / lockfile; `npx domotion` resolves
the local install). A major release should capture with the **latest** domotion so
the committed SVGs reflect the current renderer — do this bump *before* the
maintainer re-captures.

1. **Compare versions.** Read the pinned range in `package.json` (`domotion-svg`)
   and check the latest published version:

   ```bash
   npm view domotion-svg version
   ```

   (If npm complains about a root-owned cache, retry with `--cache "$TMPDIR/npm-cache"`.)

2. **If it's out of date, upgrade it:**

   ```bash
   npm install --save-dev domotion-svg@latest
   ```

   Commit the resulting `package.json` + `package-lock.json` bump. This is a
   dependency change the skill *does* make — it's separate from running the
   capture, which stays the maintainer's step.

3. **Re-check the version-dependent capture machinery.** domotion's cut/optimize
   behavior has changed across versions, and the pipeline encodes assumptions about
   it. After a bump, read domotion's changelog/release notes for the span you
   crossed and re-verify:
   - `capture-demos.sh` — historically a `fix-cut-timing.mjs` post-pass was needed
     for domotion ≤ 0.17.x (SVGO clobbered the hard-cut `step-end` timing-function);
     ≥ 0.18.0 fixed it upstream and the workaround was removed. If a new version
     reintroduces a clobber (or needs a different post-pass), restore/adjust it here.
   - `tests/unit/demo-configs.test.ts` — asserts every committed SVG's `fv-N`
     opacity track keeps `step-end` (the fade-to-black tripwire) and that every
     frame carries an explicit `cut` transition. If the new domotion changes the
     emitted CSS shape, update this guard to match the new truth (don't loosen it
     to paper over a real regression).
   - `site/scripts/demo-captures/README.md` — update the "learned the hard way"
     notes that cite specific version thresholds so they stay accurate.

   If a domotion upgrade breaks the pipeline in a way you can't cleanly resolve in
   scope, stop and surface it (a Hot Sheet ticket + a note in the handoff) rather
   than shipping a degraded capture path.

### Review the demo set and configs

Review:

- **Coverage** — is there an example app with no capture config (needs a new
  screenshot), or a capture config whose app was removed/renamed (stale)? The app
  set lives in `site/src/examples/complete/`; the captured set lives in the `APPS=`
  array in `capture-demos.sh`, the `<name>.json` configs, the table in
  `site/scripts/demo-captures/README.md`, and the embeds in
  `site/src/content/docs/examples/complete/*.md`. Keep all of those in sync.
- **Flow quality** — does each config still drive the app's *most compelling*
  interaction? If an app gained a better headline feature since the last major,
  revise its frames to show it. If a flow is redundant or no longer the best
  pitch, simplify or drop it ("fewer screenshots").
- **Fidelity** — selectors/timings in the config still match the app's current
  markup (cross-check against `tests/browser/example-apps.spec.ts`, which exercises
  the same headline flow). A broken selector silently produces a dead demo.

Make the config edits. Then **do not capture** — hand off to the maintainer.

## Handoff (the maintainer captures screenshots)

When Parts 1 and 2 are done, finish with an explicit handoff that lists, precisely:

1. **README** — a one-paragraph summary of what you changed and why.
2. **domotion-svg** — whether you bumped it, and from/to which version (so the
   maintainer knows the re-capture will exercise a new renderer, and can eyeball
   the SVGs for any cut/optimize regression the version-check step flagged).
3. **Demos to (re)capture** — the exact list of `<name>` apps whose `.svg` needs
   regenerating (new flow, new app, fidelity fix), and the one command to do it:

   ```bash
   bash site/scripts/demo-captures/capture-demos.sh
   ```

   Note that the script re-renders **all** apps in its `APPS=` array; if only a
   subset changed, say so explicitly so the maintainer knows what to eyeball after.
4. **Anything you couldn't decide** — surface it as a question rather than guessing.

## Hard rules

- **Don't capture screenshots.** Editing capture *configs* is in scope; running
  `capture-demos.sh` is the maintainer's step. They said: "I'll capture new
  screenshots once you're ready." Get them ready; let them capture.
- **No `KF-NN` markers on any published surface** — `README.md`, anything under
  `site/src/content/docs/**`, or the synced source docs. Write self-contained prose.
- **Perf numbers only from official bench runs.** Don't paste a number from a local
  run; keep it qualitative if no official run produced fresh figures.
- **American English everywhere.**
- **Commit freely if it helps; never `git push` without the maintainer's explicit
  permission.**
- **Concerns outside this scope → a Hot Sheet ticket, not an ad-hoc fix.** If you
  spot a bug, doc drift, or refactor while prepping the release, file a follow-up
  ticket (`hs-bug` / `hs-task` / …) referencing "Surfaced by /prep-major-release"
  instead of fixing it inline.

## Reference

- README: `README.md` (repo root)
- Demo capture mechanism + per-app flow table: `site/scripts/demo-captures/README.md`
- Capture configs: `site/scripts/demo-captures/<name>.json`
- Capture script: `site/scripts/demo-captures/capture-demos.sh`
- domotion-svg pin (bump target): `package.json` / `package-lock.json`; version-dependent capture guard: `tests/unit/demo-configs.test.ts`
- Example apps: `site/src/examples/complete/<name>/`
- Public API: `docs/8-api-reference.md`, `src/index.ts`
- What changed: `CHANGELOG.md`
- Release conventions (perf-number gating, KF-NN rules): `CLAUDE.md`
