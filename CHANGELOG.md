# Changelog

All notable changes to **kerf** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- **Package renamed from `kerf` to `kerfjs`** on the npm registry. The `kerf` name was rejected by npm's typo-squatting heuristic ("too similar to `keyv`"). The brand is still *kerf* — only the npm identifier changed. Update imports to `from 'kerfjs'`, `tsconfig.json` to `"jsxImportSource": "kerfjs"`, and the install command to `npm install kerfjs`. The GitHub repo and Pages URL (`brianwestphal.github.io/kerf/`) are unchanged.

### Added

- Live demo published to GitHub Pages at <https://brianwestphal.github.io/kerf/>. Builds `examples/reactivity-demo/` on every push to `main` via `.github/workflows/pages.yml`. New `docs/9-live-demo.md` covers the deploy, and `examples/reactivity-demo/vite.config.ts` now sets `base: '/kerf/'` for the subpath. New `npm run example:reactivity-demo:build` script.

## [0.1.0] - 2026-05-07

### Added

- Initial release.
- `signal`, `computed`, `effect`, `batch` (re-exported from `@preact/signals-core`).
- `defineStore({ initial, actions })` factory + `resetAllStores()` lifecycle hook.
- `mount(el, () => jsx)` — morphdom-driven render with focus / selection / `data-morph-skip` preservation.
- `delegate(el, type, selector, handler)` and `delegateCapture(...)` for Tier 1 / Tier 2 event delegation.
- `toElement(jsx)` — SVG-aware JSX → DOM helper (handles `<svg>` root and orphan SVG fragments).
- JSX runtime at `kerfjs/jsx-runtime` with `SafeHtml`, `raw`, attribute aliases for HTML + SVG.
- Numbered design docs under `docs/`.
- 7-section live demo under `examples/reactivity-demo/`.
