# 9. Live demo (GitHub Pages)

The nine-section reactivity demo under [`examples/reactivity-demo/`](../examples/reactivity-demo) is published as a live site at <https://brianwestphal.github.io/kerf/demo/>. Anyone can play with kerf without cloning the repo or running a local dev server.

This doc covers what the deploy is, how it's wired up, and the constraints that shape it.

## 9.1 What gets published

A single GitHub Pages artifact contains two builds, served from one origin:

- `https://brianwestphal.github.io/kerf/` — the marketing + docs site, built from [`site/`](../site) (Astro + Starlight).
- `https://brianwestphal.github.io/kerf/demo/` — the nine-section reactivity demo, built from [`examples/reactivity-demo/`](../examples/reactivity-demo).

Both are static asset bundles. There is no server-side rendering, no API. The site has Pagefind search built in; the demo does not.

## 9.2 How it builds

`npm run site:build` runs `astro build`, whose `prebuild` npm hook chains four steps before Astro itself runs:

1. **`sync-docs`** — currently writes no files. The published Starlight pages are hand-owned consumer documentation; `site/scripts/sync-docs.mjs` retains a source-to-site map (all current targets are `null`) because the documentation-ticket coverage gate imports that inventory. The hook remains in the pipeline so a future verbatim mapping can be re-enabled in one place.
2. **`build-examples`** — runs in two passes:
   - Builds each complete app (`site/src/examples/complete/<name>/`) via Vite into `site/public/run/<name>/`. Each app's docs page links here as **Run live →**.
   - Builds the nine-section reactivity demo (`examples/reactivity-demo/`) via its own Vite config (base `/kerf/demo/`) and copies the result into `site/public/demo/`.
3. **`build-icons`** — generates the site's icon assets.
4. **`gen-llms-txt`** — regenerates the site's `llms.txt` AI-discovery index.

Astro then runs and copies `public/` into `dist/` as part of its normal static asset handling. The result: `site/dist/` contains the Starlight site at the root, the runnable complete apps under `dist/run/<name>/`, and the reactivity demo under `dist/demo/`. One artifact, one upload, no manual `cp` step.

Bases:

- Starlight `base: '/kerf'` is configured in [`site/astro.config.mjs`](../site/astro.config.mjs).
- Each complete-app build uses `base: '/kerf/run/<name>/'` (set per-app inside [`site/scripts/build-examples.mjs`](../site/scripts/build-examples.mjs)).
- Reactivity-demo `base: '/kerf/demo/'` lives in [`examples/reactivity-demo/vite.config.ts`](../examples/reactivity-demo/vite.config.ts).

Without those bases, root-relative URLs would 404 on Pages.

The basic single-concept examples (9 of them) are **not** built by this pipeline. They're inlined into their docs pages via per-example Astro wrapper components (`site/src/components/examples/basics/<n>-<name>.astro`), so Astro itself bundles their scripts as part of the normal `astro build`.

## 9.3 How it deploys

[`.github/workflows/pages.yml`](../.github/workflows/pages.yml) runs on every push to `main`:

1. `npm ci` → installs kerf's deps.
2. `npm run build` → emits `dist/` for the kerf package itself. This must happen before the site install/build: the site and examples consume local `file:` dependencies, while the site's install-script policy deliberately blocks the repository package's `prepare` script from building it implicitly.
3. `npm run site:build` → runs `npm install` in `site/`, then `prebuild` (the no-op sync-docs inventory pass + build-examples + build-icons + gen-llms-txt) and `astro build`, producing the combined `site/dist/`.
4. `actions/configure-pages@v5` → wires up Pages metadata.
5. `actions/upload-pages-artifact@v3` with `path: site/dist` → uploads the bundle.
6. A separate `deploy` job uses `actions/deploy-pages@v4` to publish.

The workflow uses least-privilege permissions — top-level `contents: read`, with `pages: write` / `id-token: write` granted only to the deploy job — and a single `pages` concurrency group with `cancel-in-progress: true`, so an overlapping push cancels the older in-flight run rather than queueing behind it.

### 9.3.1 Install-script policy

The site has a narrow npm install-script policy in `site/package.json`. It
allows the locked `esbuild` and optional `fsevents` installers that provide
required platform binaries / filesystem watching, and explicitly denies the
local `kerfjs: file:..` dependency's `prepare` script because Husky setup is a
repository concern, not a site dependency build step. `site/.npmrc` enables npm's
`strict-allow-scripts` mode, so npm 11.19.1 and newer fail on any unreviewed
installer instead of merely warning; older npm releases ignore that setting.

`site/scripts/check-install-script-policy.mjs` runs as `preinstall` on every
supported install. It pins the reviewed package/version set from
`site/package-lock.json` (`esbuild@0.28.2` and `fsevents@2.3.3`) and fails when
dependency churn introduces or upgrades an install script. Review the package
and its lifecycle command before updating
both the lockfile expectation and `allowScripts`; do not use npm's
`dangerously-allow-all-scripts` escape hatch.

### 9.3.2 Dependency audit policy

The read-only `site` CI job runs `npm run check:audit` from `site/` immediately
after its clean install. The command audits the complete site dependency tree,
including `devDependencies`, because Astro, Starlight, Vite, TypeScript, Sharp,
and their transitive packages execute as build tooling even though none becomes
a server dependency in the static Pages artifact. The gate uses
`--audit-level=high`: high and critical advisories fail CI, while low and
moderate development-tool findings remain visible in the audit report without
making the pipeline permanently red.

The audit needs registry access, so it belongs in the networked CI site job and
is not part of the repository's offline-capable `npm run check` command. Run it
locally with `cd site && npm run check:audit` when reviewing site dependency
changes.

## 9.4 One-time repo setup

GitHub Pages source must be set to **GitHub Actions** in repo settings (`Settings → Pages → Source: GitHub Actions`). The workflow cannot enable Pages itself — that toggle is configured manually once.

## 9.5 Constraints and non-goals

- **Two front-end bundles, one build pipeline and origin.** The site at `/kerf/` and the demo at `/kerf/demo/` use different frameworks and emit separate bundles, but they are build-coupled: both consume the root package's prebuilt `dist/`, and `site:build` builds the demo and complete apps before Astro assembles one artifact. A failure in any part stops the shared deployment.
- **No redirect from the old `/kerf/` root.** Before this layout, `/kerf/` _was_ the demo. After, `/kerf/` is the Starlight home and the demo continues to deploy at `/kerf/demo/`. The demo is **fully supported and the canonical "play with kerf" URL** — README.md links to it directly, and the build pipeline rebuilds it on every push to `main`. The Starlight site nav was deliberately reshaped (KF-49) to surface inline single-concept examples next to their docs, but the nine-section reactivity demo at `/kerf/demo/` remains the right link to send a colleague who wants to explore the framework outside the docs context. Anyone with a stale bookmark for the old `/kerf/` (root demo URL) lands on the marketing site instead — if preserving those inbound links matters, add a `site/public/_redirects` (or equivalent) in a follow-up.
- **No server-side rendering.** `SafeHtml.toString()` works server-side, but both deploys are pure client-side mounts.
- **Tied to the package homepage.** The `homepage` field in `package.json` points at the Pages site (`https://brianwestphal.github.io/kerf/`) — npm uses `homepage` as the package's project landing page, and the docs site is the front door; the GitHub repo remains the canonical source of truth.

## 9.6 Local preview

```bash
npm run build    # required first — site / demo / complete apps all consume kerfjs file:..
npm run site:dev # builds the site, then serves the production output at
# http://localhost:4321/kerf/ via `astro preview`
# — search and other build-only behavior work locally.
npm run site:dev:hmr # `astro dev` instead — fast HMR for editing content,
# but search and Pagefind index are disabled.
```

Both scripts run the no-op `sync-docs` inventory pass plus `build-examples`, `build-icons`, and `gen-llms-txt` (via `prebuild` for `site:dev`, `predev:hmr` for `site:dev:hmr`), so `/kerf/`, `/kerf/demo/`, and `/kerf/run/<name>/` all resolve from one local server.

The first run takes longer because that pre-step builds each complete app + copies the reactivity demo into `site/public/`. Subsequent runs reuse the build cache.

For a static preview without rebuilding:

```bash
npm run site:build
cd site && npx astro preview
```

## 9.7 Visual QA

Every site-facing visual change needs a real-browser review of the built output:

```bash
cd site
npm run test:visual
```

The command builds the complete site, discovers every emitted HTML surface
(directory indexes plus standalone pages such as `404.html`), and visits each
route in Chromium at desktop (1440×1000), tablet (834×1112), and mobile
(390×844) viewports. It saves a collision-safe full-page capture for every
route/viewport pair in Playwright's test-results directory and fails on a route
that does not load, document-level horizontal overflow, a broken or unsettled
image, or collapsed primary content. Inspect the captures as well as the
automated assertions; geometry checks do not replace visual judgment.

Filter to one built route while iterating, then finish with the unfiltered
matrix:

```bash
KERF_VISUAL_ROUTE=api/ npm run test:visual
KERF_VISUAL_ROUTE=run/chat/ npm run test:visual
```

The filter accepts a route relative to `/kerf/`, with or without leading and
trailing slashes, the root route (`/`, `/kerf`, or the deployed root URL), a
standalone HTML route such as `404.html`, or a full deployed URL. A non-matching
filter fails instead of silently running zero routes. The runner is configured by
`site/playwright.config.ts`; the audit lives in
`site/tests/full-visual-audit.spec.ts`.

## 9.8 Update triggers

Update this doc whenever:

- Either build's base path or output location changes.
- The Pages workflow is renamed, restructured, or replaced.
- A third build is added under the same Pages deploy.
- The repo moves to a new owner or name (the Pages URL changes accordingly).
- The site's audit severity or dependency-scope policy changes.
- The visual-QA route discovery, viewports, page-health checks, or command changes.
