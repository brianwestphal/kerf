# Code summary — kerf

A directory map + reverse index ("where do I look for X?") for Claude Code sessions and other AI assistants. Keep this in sync with `src/` whenever a file is added, removed, or renamed.

## Directory tree

```
kerf/
├── src/
│   ├── index.ts                  ← public entry — re-exports everything users import
│   ├── jsx-runtime.ts            ← JSX → SafeHtml string emitter
│   ├── reactive.ts               ← signal/computed/effect/batch (re-export)
│   ├── store.ts                  ← defineStore + resetAllStores + REGISTRY
│   ├── mount.ts                  ← mount() — segment-aware render bound to effect()
│   ├── diff.ts                   ← native general-purpose DOM reconciler (replaces morphdom)
│   ├── segment.ts                ← Segment types (static/list/mixed) + flatten helpers
│   ├── each.ts                   ← each() — keyed list iteration with per-item memo
│   ├── delegate.ts               ← delegate + delegateCapture
│   ├── toElement.ts              ← SVG-aware JSX-to-DOM
│   └── utils/
│       ├── escapeHtml.ts         ← used by jsx-runtime
│       └── jsx-attr-aliases.ts   ← camelCase → HTML/SVG attribute name table (KF-21)
├── tests/
│   ├── unit/
│   │   ├── jsx-runtime.test.ts
│   │   ├── reactive.test.ts
│   │   ├── store.test.ts
│   │   ├── mount.test.ts
│   │   ├── delegate.test.ts
│   │   └── toElement.test.ts
│   ├── integration/
│   │   └── full-pipeline.test.ts ← end-to-end cart UI exercising every primitive
│   └── dist/                     ← run via `npm run test:dist`, against the built bundles
│       ├── safe-html-cross-bundle.test.ts ← KF-14 regression
│       └── store-registry-shared.test.ts  ← KF-15 regression
├── examples/
│   └── reactivity-demo/          ← 7-section live demo (port of Hot Sheet's /_demo/reactivity)
├── docs/
│   ├── 1-overview.md
│   ├── 2-reactivity.md
│   ├── 3-stores.md
│   ├── 4-render.md
│   ├── 5-event-delegation.md
│   ├── 6-jsx-runtime.md
│   ├── 7-svg.md
│   ├── 8-api-reference.md
│   ├── 9-live-demo.md
│   └── ai/
│       ├── code-summary.md       ← THIS FILE
│       ├── requirements-summary.md
│       └── usage-guide.md        ← consumer-facing cheat sheet for AI assistants writing apps with kerf
├── scripts/
│   └── release.sh                ← interactive release flow w/ --beta support
├── .github/workflows/
│   ├── ci.yml                    ← test + lint + typecheck on push/PR
│   ├── pages.yml                 ← build + deploy reactivity-demo to GitHub Pages on push to main
│   └── release.yml               ← publish on v*.*.* (stable) and v*-beta.* (beta) — single workflow because npm allows only one trusted publisher per package
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── vitest.config.ts            ← default suite: tests/unit + tests/integration vs `src/`
├── vitest.config.dist.ts       ← targeted dist regressions: tests/dist vs `dist/`
├── vitest.config.dist-full.ts  ← full unit + integration suite remapped onto `dist/` (KF-16)
├── eslint.config.js
├── CLAUDE.md                     ← project instructions for AI assistants
├── CHANGELOG.md
├── LICENSE                       ← MIT
└── README.md
```

## Public exports

Every export reachable via `import { ... } from 'kerfjs'`:

| Export | From | Purpose |
| --- | --- | --- |
| `signal` | `reactive.ts` | Create a reactive value |
| `computed` | `reactive.ts` | Derive a read-only signal |
| `effect` | `reactive.ts` | Run on signal change |
| `batch` | `reactive.ts` | Coalesce multiple writes |
| `Signal<T>` | `reactive.ts` | Type |
| `ReadonlySignal<T>` | `reactive.ts` | Type |
| `defineStore` | `store.ts` | Composable store factory |
| `resetAllStores` | `store.ts` | Reset every registered store |
| `Store<TState, TActions>` | `store.ts` | Type |
| `mount` | `mount.ts` | Render JSX into a DOM element via kerf's segment-aware diff |
| `each` | `each.ts` | Keyed list iteration; per-item HTML memo by object identity (+ optional key) |
| `delegate` | `delegate.ts` | Tier 1 bubbling delegation |
| `delegateCapture` | `delegate.ts` | Tier 2 capture-phase delegation |
| `toElement` | `toElement.ts` | JSX → DOM (SVG-aware) |
| `SafeHtml` | `jsx-runtime.ts` | The JSX result type |
| `isSafeHtml` | `jsx-runtime.ts` | Cross-bundle type guard for `SafeHtml` (preferred over `instanceof`) |
| `raw` | `jsx-runtime.ts` | Wrap a pre-escaped HTML string |
| `Fragment` | `jsx-runtime.ts` | JSX `<>...</>` tag; also re-exported from the barrel for manual composition |

The JSX runtime is a separate subpath export at `kerfjs/jsx-runtime`. It's referenced by tsconfig (`"jsxImportSource": "kerfjs"`); users do not import from it directly.

## Build outputs

`npm run build` → `tsup` → `dist/`:

- `dist/index.js` (ESM bundle, ~5 KB min+gz including external deps' contribution)
- `dist/index.d.ts` (types)
- `dist/jsx-runtime.js`
- `dist/jsx-runtime.d.ts`
- `dist/testing.js` (`kerfjs/testing` subpath)
- `dist/testing.d.ts`
- `dist/chunk-*.js` — shared chunks emitted by tsup's code splitting. Both entries import their shared modules (`SafeHtml`, the store registry, etc.) from these chunks so each module-level value exists exactly once at runtime. Do not import directly; consumers always go through the named entry points.
- Source maps for everything

`tsup.config.ts` runs with `splitting: true` (KF-14 / KF-15) — without it, esbuild bundles each entry independently, which both duplicates shared classes (breaking `instanceof` checks across entries) and tree-shakes shared module-level state into broken stubs.

Runtime dep (`@preact/signals-core`) is external — consumers' bundlers pick it up from their own `node_modules`.

## Where to look for X

| If you're touching... | look in |
| --- | --- |
| Adding a new public export | `src/index.ts` + the relevant module + `docs/8-api-reference.md` |
| JSX attribute alias | `src/utils/jsx-attr-aliases.ts` (the `ATTR_ALIASES` map) |
| diff conventions | `src/diff.ts` (key matching, `data-morph-skip`, focus preservation), `src/mount.ts` (segment dispatch) |
| SVG namespace handling | `src/toElement.ts` (`SVG_FRAGMENT_TAGS`) |
| Store reset semantics | `src/store.ts` (`REGISTRY`, `resetAllStores`) |
| Delegation tier docs | `docs/5-event-delegation.md` |
| Test coverage thresholds | `vitest.config.ts` |
| Release flow / version bumping | `scripts/release.sh` |
| GitHub Pages live-demo deploy | `.github/workflows/pages.yml` + `examples/reactivity-demo/vite.config.ts` (`base: '/kerf/'`) + `docs/9-live-demo.md` |

## Update triggers

Update this doc whenever you:

1. Add or rename a file under `src/`.
2. Add a new public export to `src/index.ts`.
3. Change the build output shape (`tsup.config.ts`).
4. Add a new conventional `data-*` attribute that `mount()` recognises.
5. Add a new test directory or convention.
