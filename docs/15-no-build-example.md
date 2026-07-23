# 15 — The no-build example app (`live-poll`)

kerf's positioning is "the fastest framework that needs no build step beyond your existing one" — and with the `html` tagged template (`kerfjs/html`, doc 6 §6.11), *no build step at all* is literally true. This document specifies the example app that proves it on the site: a complete, served-as-source app with zero tooling.

## 15.1 Purpose and requirements

1. **Authentic no-build.** The app ships exactly the source the author wrote: plain JavaScript (`main.js`) plus an `index.html` whose importmap resolves `kerfjs` / `kerfjs/html` / `@preact/signals-core` to static files. No JSX, no TypeScript, no bundler, no transform — view-source on the running app must show the authored code. (An app authored with `html` but bundled by Vite would undercut the claim; the serving mechanism is part of the story.)
2. **Showcase the flagship semantics through `html`.** The app must exercise, via tagged templates only: fine-grained signal bindings in text holes and complete-attribute-value holes, `each()` keyed-list composition, `delegate()` event delegation, and `batch()`. It should also demonstrate the fully-bound-mount guarantee (doc 2 §2.9): the render reads no signal `.value`, so it runs exactly once — surfaced in the UI by a "renders" badge that stays at `1`.
3. **Deterministic.** No randomness or clock reads, so the browser smoke spec and the demo capture are stable across runs.

The shipped app is **`live-poll`** ("Tabs or spaces?"): four options, click to vote, bound per-option counts, bound bar widths (a `computed` serving a complete `style` value), a bound total, and a `batch()`-driven Reset.

## 15.2 Serving mechanism — the vendor copy contract

The app lives at `site/src/examples/complete/live-poll/` like every complete app, but the build pipelines **copy** it instead of bundling it. The shared helper `site/scripts/lib/copy-no-build-app.mjs` (`copyNoBuildApp()` + the `NO_BUILD_APPS` set) performs the copy:

- the app's own files, verbatim;
- the repo's built `dist/` → `<out>/vendor/kerfjs/` (dist's chunk imports are relative, so a plain copy keeps them working);
- `@preact/signals-core`'s ESM build → `<out>/vendor/signals-core.mjs` (dist keeps signals-core external, so the importmap must resolve it).

Every path in the app is relative, so the identical copied output serves under any base — `/kerf/run/live-poll/` (site), `/live-poll/` (capture server), and `./` (Playwright test server). All three build scripts route through the helper and must stay in sync:

| Script | Purpose |
| --- | --- |
| `site/scripts/build-examples.mjs` | site build → `public/run/live-poll/` |
| `site/scripts/build-demos-for-capture.mjs` | demo-capture serve root |
| `tests/dist/example-apps/build.mjs` | Playwright test build |

Consequences of "copied, not compiled":

- The app is **excluded from the examples typecheck gate** (`site/src/examples/complete/tsconfig.json` includes only `.ts`/`.tsx`); its correctness gate is the real-browser smoke spec.
- The doc/source import-drift check (`scripts/check-docs-examples.mjs` check 3) pairs docs with `main.tsx` and therefore skips this app.
- The vendored `dist/` tracks whatever `npm run build` last produced — the copy helper fails loudly if `dist/` is missing.

## 15.3 Testing and capture

- **Browser smoke spec** — `tests/browser/example-apps.spec.ts` › `live-poll`: loads the copied app through the importmap (a broken vendor copy or map fails the first assertion), votes, asserts bound counts / total / bar style, asserts the renders badge stays `1`, and asserts Reset zeroes everything without a re-render. Runs on Chromium, Firefox, and WebKit.
- **Demo capture** — `site/scripts/demo-captures/live-poll.json` drives five votes and a Reset; the committed SVG lives at `site/public/demos/live-poll.svg` and is embedded at the top of the app's docs page (`site/src/content/docs/examples/complete/live-poll.md`).

## 15.4 Boundaries

- One no-build app is enough; the other complete apps stay Vite-built `.tsx` on purpose (they demonstrate the with-a-bundler path most consumers use).
- The importmap pins nothing kerf doesn't control: it maps only `kerfjs`, `kerfjs/html`, and `@preact/signals-core` to files the build copies. No CDN dependency — the site serves everything it references.
