# 9. Live demo (GitHub Pages)

The seven-section reactivity demo under [`examples/reactivity-demo/`](../examples/reactivity-demo) is published as a live site at <https://brianwestphal.github.io/kerf/>. Anyone can play with kerf without cloning the repo or running a local dev server.

This doc covers what the deploy is, how it's wired up, and the constraints that shape it.

## 9.1 What gets published

A static build of `examples/reactivity-demo/`:

- All JSX-rendered sections (counter, multi-consumer store, focus survival, keyed list, morph-skip, SVG, Tier 2 capture delegation).
- The kerf runtime, bundled into the example via Vite using the local `file:../..` workspace dependency.
- `src/styles.css` and `src/main.tsx` plus `src/sections/*.tsx`.

Nothing else is on the site. There is **no** docs renderer, no router, no API. The deploy is a single-page static asset bundle.

## 9.2 How it builds

`npm run example:reactivity-demo:build` runs `vite build` inside the example directory. That produces `examples/reactivity-demo/dist/` containing `index.html` plus hashed `assets/`.

Vite is configured with `base: '/kerf/'` (see [`examples/reactivity-demo/vite.config.ts`](../examples/reactivity-demo/vite.config.ts)) so emitted asset URLs are prefixed with the project subpath that GitHub Pages serves the site under (`brianwestphal.github.io/kerf/...`). Without `base`, root-relative URLs would 404 on Pages.

## 9.3 How it deploys

[`.github/workflows/pages.yml`](../.github/workflows/pages.yml) runs on every push to `main`:

1. `npm ci` at the repo root → installs kerf's deps.
2. `npm run build` → emits `dist/` for the kerf package itself, which the example's `file:../..` dependency consumes.
3. `npm run example:reactivity-demo:build` → emits `examples/reactivity-demo/dist/`.
4. `actions/configure-pages@v5` → wires up Pages metadata.
5. `actions/upload-pages-artifact@v3` with `path: examples/reactivity-demo/dist` → uploads the static bundle.
6. A separate `deploy` job uses `actions/deploy-pages@v4` to publish.

The workflow uses the standard Pages permissions (`pages: write`, `id-token: write`) and a single `pages` concurrency group so overlapping pushes serialise.

## 9.4 One-time repo setup

GitHub Pages source must be set to **GitHub Actions** in repo settings (`Settings → Pages → Source: GitHub Actions`). The workflow cannot enable Pages itself — that toggle is configured manually once.

## 9.5 Constraints and non-goals

- **Single demo, single URL.** The site root *is* the reactivity demo. Future demos would either replace it or sit at a sibling subpath; there is no index page or shell for multiple demos. Decide deliberately if a second demo is added.
- **No docs site.** Numbered docs in `docs/` are not rendered to HTML. KF-11 covers the docs-site question separately.
- **No server-side rendering.** `SafeHtml.toString()` works server-side, but the deploy is a pure client-side mount. The build emits a stub `index.html` that references the JS bundle.
- **Tied to the package homepage.** The `homepage` field in `package.json` still points at the GitHub repo, not the Pages URL. npm uses `homepage` as the package's project landing page; the repo is the canonical source of truth, the Pages site is a runnable demo of it.

## 9.6 Local preview

```bash
npm run build                         # required first — example consumes file:../..
npm run example:reactivity-demo:build
cd examples/reactivity-demo
npx vite preview --base /kerf/
```

`vite preview` serves `dist/` over a local HTTP server with the same `/kerf/` base path the production site uses, so asset paths can be sanity-checked before merging.

## 9.7 Update triggers

Update this doc whenever:

- The example's build, base path, or output location changes.
- The Pages workflow is renamed, restructured, or replaced.
- A second site is added under the same Pages deploy.
- The repo moves to a new owner or name (the Pages URL changes accordingly).
