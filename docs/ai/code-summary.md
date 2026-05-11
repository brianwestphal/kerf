# Code summary — kerf

A directory map + reverse index ("where do I look for X?") for Claude Code sessions and other AI assistants. Keep this in sync with `src/` whenever a file is added, removed, or renamed.

## Directory tree

```
kerf/
├── src/
│   ├── index.ts                  ← public entry — re-exports everything users import
│   ├── jsx-runtime.ts            ← JSX → SafeHtml string emitter
│   ├── jsx-types.ts              ← typed IntrinsicElements (KF-75) — per-tag attribute contracts, catches JSX typos at compile time
│   ├── reactive.ts               ← signal/computed/effect/batch (re-export)
│   ├── array-signal.ts           ← arraySignal (KF-92) — granular collection signal; lives at the kerfjs/array-signal subpath (KF-95) so non-users shed ~1 KB
│   ├── store.ts                  ← defineStore + resetAllStores + REGISTRY
│   ├── mount.ts                  ← mount() — segment-aware render bound to effect()
│   ├── diff.ts                   ← native general-purpose DOM reconciler (replaces morphdom)
│   ├── segment.ts                ← Segment types (static/list/mixed) + flatten helpers
│   ├── each.ts                   ← each() — keyed list iteration with per-item memo
│   ├── list-reconcile.ts         ← top-level dispatcher (KF-112) — re-exports BoundItem / ListBinding / endAnchor and defines reconcileList
│   ├── list-binding.ts           ← BoundItem / ListBinding shape + endAnchor() (KF-116) — extracted to break the circular import between list-reconcile.ts and its sibling reconcilers
│   ├── list-reconcile-snapshot.ts ← snapshot reconcile path (classify / bulk-parse / LIS / move)
│   ├── list-reconcile-granular.ts ← granular reconcile path (KF-92 patch-driven, KF-93/94 bulk parse)
│   ├── list-reconcile-focus.ts   ← focus snapshot/restore around the move pass (engine-quirk fix)
│   ├── delegate.ts               ← delegate + delegateCapture
│   ├── toElement.ts              ← SVG-aware JSX-to-DOM
│   └── utils/
│       ├── escapeHtml.ts         ← used by jsx-runtime
│       ├── jsx-attr-aliases.ts   ← camelCase → HTML/SVG attribute name table (KF-21)
│       └── rowContract.ts        ← KF-103 row-contract helpers — ROW_HTML_SNIPPET_MAX, parseRowTemplate, rowContractError, truncateRowHtml
├── tests/
│   ├── unit/
│   │   ├── array-signal.test.ts
│   │   ├── audit-gap-coverage.test.tsx     ← regression-net for v8-only branches found via coverage gaps
│   │   ├── delegate.test.ts
│   │   ├── diff.internal.test.ts
│   │   ├── doc-contract-coverage.test.tsx  ← KF-104 — comprehensive contract suite covering every doc-asserted behaviour
│   │   ├── each.test.ts
│   │   ├── edge-case-coverage.test.tsx     ← adversarial probes for mount-lifecycle / shape-transitions / focus-on-granular-path / fast-path corners / 1000-row stress
│   │   ├── jsx-runtime.test.ts
│   │   ├── jsx-types.test.tsx
│   │   ├── kf102-each-after-transition.test.tsx ← KF-102 round 2 — each() reconcile after sibling-introduction transitions
│   │   ├── mount.test.ts
│   │   ├── no-stale-deps.test.ts            ← guards against accidentally re-introducing morphdom or removed deps
│   │   ├── reactive.test.ts
│   │   ├── segment.internal.test.ts
│   │   ├── store.test.ts
│   │   └── toElement.test.ts
│   ├── integration/
│   │   └── full-pipeline.test.ts ← end-to-end cart UI exercising every primitive
│   ├── browser/                  ← Playwright real-browser tests (chromium/firefox/webkit) — run via `npm run test:browser`
│   │   ├── fixtures/index.html         ← importmap-based page that loads kerf from dist/
│   │   ├── consumer-app.spec.ts        ← KF-123 — drives `tests/dist/consumer-app/` (real esbuild-bundled app against dist/) across Chromium / Firefox / WebKit
│   │   ├── global-setup.mjs            ← rebuilds `tests/dist/consumer-app/dist/main.js` before the suite
│   │   ├── ime-composition.spec.ts     ← IME composition survives a re-render
│   │   ├── mutation-count.spec.ts      ← LIS-based reorder produces the minimum insertBefore count
│   │   ├── perf-1k.spec.ts             ← 1k-row stress (real-browser sanity check on the bench app)
│   │   ├── stateful-attrs.spec.ts      ← `<details open>` / `<dialog open>` user-agent-owned attribute survival
│   │   └── svg-mathml.spec.ts          ← KF-83 — SVG/MathML namespacing across real browsers
│   └── dist/                     ← run via `npm run test:dist`, against the built bundles
│       ├── barrel-completeness.test.ts    ← KF-24 — pins the public-API list
│       ├── consumer-app/                  ← KF-123 — esbuild-bundled downstream-style app; main.tsx exercises every public primitive (counter/store/each/arraySignal/delegateCapture/focus/morph-skip/SVG/Fragment/declaration-merged custom element). Driven by `tests/browser/consumer-app.spec.ts`
│       ├── jsx-typing/                    ← KF-123 — `tsc -p tests/dist/jsx-typing/tsconfig.json` typechecks consumer .tsx against `dist/jsx-runtime.d.ts` to catch IntrinsicElements self-shadow / declaration-merging regressions; gated by `npm run check`
│       ├── safe-html-cross-bundle.test.ts ← KF-14 regression
│       └── store-registry-shared.test.ts  ← KF-15 regression
├── examples/
│   └── reactivity-demo/          ← 7-section live demo (port of Hot Sheet's /_demo/reactivity)
├── bench/
│   ├── kerfjs-impl/              ← PR-ready entry for krausest/js-framework-benchmark
│   ├── setup.sh                  ← clones the upstream harness into .bench-cache/
│   ├── preflight.sh              ← KF-139 — system-busy pre-check (sourced by run.sh; `--force` / `KERF_BENCH_FORCE=1` to skip)
│   ├── run.sh                    ← runs the benchmark against kerfjs + reference frameworks
│   └── results.sh                ← aggregates results into the viewer (CHANGELOG perf numbers come from here)
├── site/                         ← Astro + Starlight marketing/docs site, deployed to /kerf/ on GitHub Pages
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
├── llms.txt                      ← AI-discovery entry point indexing the docs
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
| `delegate` | `delegate.ts` | Event delegation; auto-promotes known non-bubblers (focus/blur/scroll/load/error/mouseenter/mouseleave) to capture, keeps `closest()` matching |
| `delegateCapture` | `delegate.ts` | Explicit-capture escape hatch; `target.matches()`-style direct matching |
| `toElement` | `toElement.ts` | JSX → DOM (SVG-aware) |
| `SafeHtml` | `jsx-runtime.ts` | The JSX result type |
| `isSafeHtml` | `jsx-runtime.ts` | Cross-bundle type guard for `SafeHtml` (preferred over `instanceof`) |
| `raw` | `jsx-runtime.ts` | Wrap a pre-escaped HTML string |
| `Fragment` | `jsx-runtime.ts` | JSX `<>...</>` tag; also re-exported from the barrel for manual composition |

Plus, on the `kerfjs/array-signal` subpath:

| Export | From | Purpose |
| --- | --- | --- |
| `arraySignal` | `array-signal.ts` | Factory for `ArraySignal<T>` — granular collection signal emitting typed patches |
| `ArraySignal<T>` | `array-signal.ts` | Class (and type) — `update`/`insert`/`push`/`remove`/`move`/`replace` mutators + `value` snapshot read |
| `ArrayPatch<T>` | `array-signal.ts` | Type — patch event shape (`update`/`insert`/`remove`/`move`/`replace`) |

The class is detected via `Symbol.for('kerfjs.ArraySignal')` (KF-95), not `instanceof`, so multiple bundle copies still interoperate. The `each()` runtime in the main barrel uses the brand to detect `arraySignal` arguments without importing the class.

Plus, on the `kerfjs/jsx-runtime` subpath (re-exported types for declaration merging — KF-100):

| Export | From | Purpose |
| --- | --- | --- |
| `KerfBaseAttrs` | `jsx-types.ts` | Shared attribute base for every typed element |
| `KerfCustomElement` | `jsx-types.ts` | Loose attribute set for custom elements / web components |
| `AttrLike<T>` / `AttrValue` / `DataAriaAttrs` | `jsx-types.ts` | Building blocks for project-specific intrinsic-element types |

The JSX runtime is a separate subpath export at `kerfjs/jsx-runtime`. It's referenced by tsconfig (`"jsxImportSource": "kerfjs"`); users do not import from it directly *unless* they're declaration-merging custom-element types into `JSX.IntrinsicElements` (see `docs/8-api-reference.md` §8.5).

## Build outputs

`npm run build` → `tsup` → `dist/`:

- `dist/index.js` (ESM bundle, ~6.1 KB min+gz including `@preact/signals-core`; ~6.5 KB if a consumer also imports `arraySignal` from `kerfjs/array-signal`. See `bench/results.md` for the per-shape numbers.)
- `dist/index.d.ts` (types)
- `dist/jsx-runtime.js`
- `dist/jsx-runtime.d.ts`
- `dist/array-signal.js` (`kerfjs/array-signal` subpath, KF-95)
- `dist/array-signal.d.ts`
- `dist/testing.js` (`kerfjs/testing` subpath)
- `dist/testing.d.ts`
- `dist/chunk-*.js` — shared chunks emitted by tsup's code splitting. Both entries import their shared modules (`SafeHtml`, the store registry, etc.) from these chunks so each module-level value exists exactly once at runtime. Do not import directly; consumers always go through the named entry points.
- Source maps for everything

`tsup.config.ts` runs with `splitting: true` (KF-14 / KF-15) — without it, esbuild bundles each entry independently, which both duplicates shared classes (breaking `instanceof` checks across entries) and tree-shakes shared module-level state into broken stubs.

The four entries (`index`, `jsx-runtime`, `testing`, `array-signal`) each emit a tiny shim that re-exports from one of the shared chunks; the bulk of the runtime lives in those chunks. That keeps the cross-bundle brand symbols (`Symbol.for('kerfjs.SafeHtml')`, `Symbol.for('kerfjs.ArraySignal')`) addressing exactly one class identity per kerf copy.

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
| GitHub Pages live-demo deploy | `.github/workflows/pages.yml` + `examples/reactivity-demo/vite.config.ts` (`base: '/kerf/demo/'`) + `site/astro.config.mjs` (`base: '/kerf'`) + `docs/9-live-demo.md` |
| Benchmark harness / perf numbers | `bench/` (`bench/README.md` + `setup.sh` / `run.sh` / `results.sh`); CHANGELOG perf entries come from runs here |

## Update triggers

Update this doc whenever you:

1. Add or rename a file under `src/`.
2. Add a new public export to `src/index.ts`.
3. Change the build output shape (`tsup.config.ts`).
4. Add a new conventional `data-*` attribute that `mount()` recognises.
5. Add a new test directory or convention.
