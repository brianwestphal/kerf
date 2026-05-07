# kerf

## Project Overview

kerf is a tiny reactive UI framework: fine-grained signals + DOM morphing + a tiny JSX runtime. The whole runtime is roughly 5 KB minified + gzipped including its two runtime dependencies (`@preact/signals-core`, `morphdom`).

The name *kerf* is a woodworking term — the narrow strip a saw blade removes. The framework's job is the same: apply the smallest possible cut to update your DOM.

## Tech Stack

- **Runtime**: Browser (modern, ES2022+). Node 20+ for build/test.
- **Language**: TypeScript (strict mode, ESM-only).
- **Build**: tsup (esbuild + tsc-emit). Outputs ESM + types.
- **Tests**: vitest with `happy-dom` for DOM testing.
- **Lint**: eslint flat config + `simple-import-sort` + typescript-eslint.

## Architecture

The framework is a small set of independent modules that compose. Each one earns its keep on its own; together they're a complete UI runtime.

### Source layout

- `src/index.ts` — public entry point. Re-exports everything users need.
- `src/jsx-runtime.ts` — JSX → `SafeHtml` (HTML strings) + `SafeHtml.toString()`. Configured via `tsconfig.json` `"jsxImportSource": "kerf"` in user code.
- `src/reactive.ts` — re-export of `@preact/signals-core` (`signal`, `computed`, `effect`, `batch`). One-file abstraction layer so the underlying lib is swappable.
- `src/store.ts` — `defineStore({ initial, actions })` + global registry + `resetAllStores()`.
- `src/morphBind.ts` — `mount(el, render)`. Wraps `effect()` + `morphdom`. Conventions for diff keys, `data-morph-skip`, focus/selection preservation.
- `src/delegate.ts` — `delegate()` (Tier 1 bubble) + `delegateCapture()` (Tier 2 capture).
- `src/toElement.ts` — SVG-aware JSX → DOM helper. Routes SVG content through `DOMParser('image/svg+xml')`.
- `src/utils/escapeHtml.ts` — used by the JSX runtime.

### Public API surface

Everything users import lives at the top level of `kerf`:

```ts
import {
  signal, computed, effect, batch,
  defineStore, resetAllStores,
  mount,
  delegate, delegateCapture,
  toElement,
  SafeHtml, raw,
} from 'kerf';
```

The JSX runtime sits at `kerf/jsx-runtime` (subpath export). Users configure it via `tsconfig.json`'s `"jsxImportSource": "kerf"`.

### Design rules

1. **No virtual DOM.** Render JSX to HTML strings; let morphdom diff against the live tree.
2. **No compiler.** Plain JSX, plain TypeScript, plain esbuild. No special build step in the consumer's project beyond what they already use.
3. **Tier 1 / Tier 2 / Tier 3 listener model.** Bubble-phase delegation is the default; capture-phase for non-bubblers; `data-morph-skip` for library-owned subtrees.
4. **One primary export per file.** Each file has one main exported function/concept.
5. **No external state besides the global store registry.** That registry exists only to make `resetAllStores()` work; everything else flows through arguments.

### What kerf is NOT

- Not a component framework — there's no `<MyComponent />` notion. Components are plain functions returning JSX.
- Not a router. Not a state-management library beyond the bare store factory. Not an SSR framework (though `SafeHtml.toString()` works server-side).
- Not opinionated about styling. Bring your own CSS.

## Build

```bash
npm run build       # tsup → dist/index.js, dist/jsx-runtime.js, .d.ts files
npm run dev         # tsup --watch
```

## Testing

```bash
npm test              # vitest with coverage
npm run test:watch    # vitest watch mode
npm run test:unit     # tests/unit only
npm run test:integration   # tests/integration only
npm run typecheck     # tsc --noEmit
npm run lint          # eslint
```

Coverage thresholds (`vitest.config.ts`):
- 80% lines / functions / statements
- 75% branches

### Testing Philosophy

- **Unit tests** (`tests/unit/`): Test each module in isolation with `happy-dom`. Mock external state (timers, network) but exercise real logic.
- **Integration tests** (`tests/integration/`): Exercise the full pipeline — signals + stores + mount + delegate against a real DOM tree.
- **Coverage target**: Keep coverage above the thresholds. New code without tests fails CI.

## Code Quality Gates

- **Always fix lint and type errors before finishing work.** Run `npx tsc --noEmit` and `npm run lint` before handing work back. Both must pass with zero errors.
- **Prefer editing existing files** to creating new ones. The runtime is small on purpose.
- **One primary export per file.**
- **Files should not be excessively long.** The largest file in `src/` should stay under ~200 LOC.

## Git

- **NEVER create git commits unless the user explicitly asks.** Same rule as Hot Sheet.

## Hot Sheet integration

This project is managed via [Hot Sheet](https://github.com/brianwestphal/hotsheet). Tickets use the `KF-` prefix.

- Run `hotsheet` from the project root to launch the local UI.
- Worklists are auto-synced to `.hotsheet/worklist.md` and `.hotsheet/open-tickets.md`.
- Skill files live in `.claude/skills/kerf/` and reference the worklist for AI-driven work.

## Conventions

- ESM modules (`"type": "module"`).
- Import paths use `.js` extension (TypeScript convention for ESM resolution).
- No transitive deps beyond `@preact/signals-core` + `morphdom`.
- Public API is documented in `docs/8-api-reference.md`.

## Requirements Documentation

Numbered docs in `docs/` cover the design. Reading order:

1. `1-overview.md` — what kerf is, why it exists, when to use it.
2. `2-reactivity.md` — signals primitive.
3. `3-stores.md` — composable testable stores.
4. `4-render.md` — mount and morphdom.
5. `5-event-delegation.md` — Tier 1 / 2 / 3 listener model.
6. `6-jsx-runtime.md` — JSX → HTML strings, server use.
7. `7-svg.md` — namespace handling.
8. `8-api-reference.md` — every export.

**Keep these docs up to date.** When adding/removing/changing an API, update the matching doc + `docs/8-api-reference.md` + `CHANGELOG.md` in the same change.

### AI summaries (`docs/ai/`)

- `docs/ai/code-summary.md` — directory tree, public exports, where-to-find-X reverse index.
- `docs/ai/requirements-summary.md` — synthesised view of every numbered doc with status markers.
- `docs/ai/usage-guide.md` — consumer-facing cheat sheet for AI assistants writing apps *with* kerf (when to recommend it, public API at a glance, hard rules, common errors → fixes). Keep in sync with `docs/8-api-reference.md`.

Update all three whenever the corresponding source / design changes. The repo-root [`llms.txt`](../llms.txt) is the AI-discovery entry point and indexes the docs above — update it when the doc set changes.

## Releasing

```bash
npm run release        # interactive: bumps version, updates changelog, tags v{ver}, pushes
npm run release:beta   # tag-only: tags v{ver}-beta.{N}, publishes with --tag beta
```

The release scripts mirror Hot Sheet's flow. Beta releases skip the version-file bump and changelog write — CI bumps the version ephemerally at publish time.
