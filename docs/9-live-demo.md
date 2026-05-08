# 9. Live demo (GitHub Pages)

The seven-section reactivity demo under [`examples/reactivity-demo/`](../examples/reactivity-demo) is published as a live site at <https://brianwestphal.github.io/kerf/demo/>. Anyone can play with kerf without cloning the repo or running a local dev server.

This doc covers what the deploy is, how it's wired up, and the constraints that shape it.

## 9.1 What gets published

A single GitHub Pages artifact contains two builds, served from one origin:

- `https://brianwestphal.github.io/kerf/` — the marketing + docs site, built from [`site/`](../site) (Astro + Starlight).
- `https://brianwestphal.github.io/kerf/demo/` — the seven-section reactivity demo, built from [`examples/reactivity-demo/`](../examples/reactivity-demo).

Both are static asset bundles. There is no server-side rendering, no API. The site has Pagefind search built in; the demo does not.

## 9.2 How it builds

`npm run site:build` runs `astro build`, whose `prebuild` npm hook chains two steps before Astro itself runs:

1. **`sync-docs`** — generates `site/src/content/docs/docs/*.md` and `api.md` from `docs/N-*.md` and the AI usage guide. Single source of truth = `docs/`.
2. **`build-examples`** — runs in two passes:
   - Builds each of the five complete apps (`site/src/examples/complete/<name>/`) via Vite into `site/public/run/<name>/`. Each app's docs page links here as **Run live →**.
   - Builds the seven-section reactivity demo (`examples/reactivity-demo/`) via its own Vite config (base `/kerf/demo/`) and copies the result into `site/public/demo/`.

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
2. `npm run build` → emits `dist/` for the kerf package itself, which the demo and the complete apps consume via `kerfjs: file:..` (in `site/`) and `kerfjs: file:../..` (in `examples/reactivity-demo/`).
3. `npm run site:build` → runs `prebuild` (sync-docs + build-examples) then `astro build`, producing the combined `site/dist/`.
4. `actions/configure-pages@v5` → wires up Pages metadata.
5. `actions/upload-pages-artifact@v3` with `path: site/dist` → uploads the bundle.
6. A separate `deploy` job uses `actions/deploy-pages@v4` to publish.

The workflow uses the standard Pages permissions (`pages: write`, `id-token: write`) and a single `pages` concurrency group so overlapping pushes serialise.

## 9.4 One-time repo setup

GitHub Pages source must be set to **GitHub Actions** in repo settings (`Settings → Pages → Source: GitHub Actions`). The workflow cannot enable Pages itself — that toggle is configured manually once.

## 9.5 Constraints and non-goals

- **Two builds, one origin.** The site at `/kerf/` and the demo at `/kerf/demo/` are independent — different framework, different toolchain, different bundles. They share only the artifact upload step. A change in one cannot break the other at build time.
- **No redirect from the old `/kerf/` root.** Before this layout, `/kerf/` *was* the demo. After, `/kerf/` is the Starlight home and `/kerf/demo/` continues to deploy at the same path. Anyone with a stale bookmark lands on the marketing site (the demo is no longer linked from public nav — see KF-49 — but the URL still resolves for direct access and maintainer testing). If external inbound links to `/kerf/` need preserving, add a `site/public/_redirects` (or equivalent) in a follow-up.
- **No server-side rendering.** `SafeHtml.toString()` works server-side, but both deploys are pure client-side mounts.
- **Tied to the package homepage.** The `homepage` field in `package.json` still points at the GitHub repo, not the Pages URL. npm uses `homepage` as the package's project landing page; the repo is the canonical source of truth, the Pages site is the runnable demo of it.

## 9.6 Local preview

```bash
npm run build           # required first — site / demo / complete apps all consume kerfjs file:..
npm run site:dev        # builds the site, then serves the production output at
                        # http://localhost:4321/kerf/ via `astro preview`
                        # — search and other build-only behavior work locally.
npm run site:dev:hmr    # `astro dev` instead — fast HMR for editing content,
                        # but search and Pagefind index are disabled.
```

Both scripts run the `sync-docs` + `build-examples` pre-step (via `prebuild` for `site:dev`, `predev:hmr` for `site:dev:hmr`), so `/kerf/`, `/kerf/demo/`, and `/kerf/run/<name>/` all resolve from one local server.

The first run takes longer because that pre-step builds the five complete apps + copies the reactivity demo into `site/public/`. Subsequent runs reuse the build cache.

For a static preview without rebuilding:

```bash
npm run site:build
cd site && npx astro preview
```

## 9.7 Update triggers

Update this doc whenever:

- Either build's base path or output location changes.
- The Pages workflow is renamed, restructured, or replaced.
- A third build is added under the same Pages deploy.
- The repo moves to a new owner or name (the Pages URL changes accordingly).
