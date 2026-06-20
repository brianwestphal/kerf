# Code summary — kerf

A directory map + reverse index ("where do I look for X?") for Claude Code sessions and other AI assistants. Keep this in sync with `src/` whenever a file is added, removed, or renamed.

## Directory tree

```
kerf/
├── src/
│   ├── index.ts                  ← public entry — re-exports everything users import
│   ├── jsx-runtime.ts            ← JSX → SafeHtml string emitter
│   ├── jsx-types.ts              ← typed IntrinsicElements (KF-75) — per-tag attribute contracts, catches JSX typos at compile time
│   ├── reactive.ts               ← signal/computed/effect/batch (re-export) — `signal()` is dev-gated through `dev-signal.ts` when KF-176's opt-in env var is set; `effect()` is dev-gated through `dev-delegate-warn.ts` (KF-238) when its opt-in env var is set (wraps the body in enter/exit calls so `delegate()` can detect inside-effect callsites)
│   ├── dev-signal.ts             ← KF-176 — `DevSignal<T> extends Signal<T>` subclass that warns once on writes to signals with no subscribers (Rule 7 helper). Opt-in via `KERF_DEV_WARN_UNTRACKED_SIGNALS=1` in dev; production unchanged.
│   ├── dev-listener-warn.ts      ← KF-174 — opt-in dev `MutationObserver` + `addEventListener` prototype patch that warns when a node carrying an imperative listener is removed/rebuilt by the morph (Rule 4 helper). Opt-in via `KERF_DEV_WARN_REBUILT_LISTENERS=1` in dev; production unchanged.
│   ├── dev-store-warn.ts         ← KF-212 — opt-in dev warn when `defineStore.set(next)` has any key from the current state missing in `next` (Rule 8 partial-set helper). Per-store one-shot dedup; opt-in via `KERF_DEV_WARN_NARROW_SET=1` in dev; production unchanged.
│   ├── array-signal.ts           ← arraySignal (KF-92) — granular collection signal; lives at the kerfjs/array-signal subpath (KF-95) so non-users shed ~1 KB
│   ├── store.ts                  ← defineStore + resetAllStores + REGISTRY
│   ├── mount.ts                  ← mount() — segment-aware render bound to effect(); adopts an inert-document rootEl (defaultView === null) into the live document before first render (KF-243 defense-in-depth for the KF-240 WebKit inert-doc parse bug)
│   ├── morph.ts                  ← native general-purpose DOM reconciler (replaces morphdom); exported publicly as morph() (KF-150)
│   ├── segment.ts                ← Segment types (static/list/mixed) + flatten helpers
│   ├── each.ts                   ← each() — keyed list iteration with per-item memo
│   ├── list-reconcile.ts         ← top-level dispatcher (KF-112) — re-exports BoundItem / ListBinding / endAnchor and defines reconcileList
│   ├── list-binding.ts           ← BoundItem / ListBinding shape + endAnchor() (KF-116) — extracted to break the circular import between list-reconcile.ts and its sibling reconcilers
│   ├── list-reconcile-snapshot.ts ← snapshot reconcile path (classify / bulk-parse / LIS / move)
│   ├── list-reconcile-granular.ts ← granular reconcile path (KF-92 patch-driven, KF-93/94 bulk parse)
│   ├── list-reconcile-fast-paths.ts ← KF-198 attribute-only + KF-206 text-content-only fast paths for the granular update path
│   ├── list-reconcile-focus.ts   ← focus snapshot/restore around the move pass (engine-quirk fix)
│   ├── attrSelector.ts           ← attr / AttrSpec<N,V> — two overloads: static attr(name,value)→AttrSpec (with .attrs spreadable JSX object), dynamic attr(name)→factory; cssEscapeIdent + escapeCSSString internals
│   ├── delegate.ts               ← delegate<T> + delegateCapture<T> (generic element type for handler arg); calls warnIfInsideEffect() at the top of both helpers when KF-238's gate is on
│   ├── dev-delegate-warn.ts      ← KF-238 — opt-in dev warn when `delegate()` / `delegateCapture()` is called inside an `effect()` body (each effect re-run installs a fresh listener; effect disposer cleans only the subscription). `reactive.ts`'s `effect()` wrap increments/decrements a depth counter when the gate is on; `delegate.ts` checks it. Opt-in via `KERF_DEV_WARN_DELEGATE_IN_EFFECT=1` in dev; production unchanged.
│   ├── dev-each-warn.ts          ← KERF_DEV_WARN_DUPLICATE_EACH_KEYS + KERF_DEV_WARN_EACH_IN_MORPH_SKIP opt-in warnings
│   ├── toElement.ts              ← SVG-aware JSX-to-DOM; adopts the result into the live `document` (KF-240) so inert-template/DOMParser-document nodes aren't returned (WebKit mis-parses innerHTML on inert-doc elements under bursts)
│   └── utils/
│       ├── escapeHtml.ts         ← used by jsx-runtime
│       ├── jsx-attr-aliases.ts   ← camelCase → HTML/SVG attribute name table (KF-21)
│       └── rowContract.ts        ← KF-103 row-contract helpers — ROW_HTML_SNIPPET_MAX, parseRowTemplate, rowContractError, truncateRowHtml
├── tests/
│   ├── unit/
│   │   ├── array-signal.test.ts
│   │   ├── audit-gap-coverage.test.tsx     ← regression-net for v8-only branches found via coverage gaps
│   │   ├── delegate.test.ts
│   │   ├── attr.test.ts
│   │   ├── dev-delegate-warn.internal.test.ts ← KF-238 — opt-in `KERF_DEV_WARN_DELEGATE_IN_EFFECT=1` dev-mode warning when `delegate()` / `delegateCapture()` is called inside an `effect()` body; covers depth tracking, throw-still-decrements, env-var gate off, production-mode short-circuit, nested effects, one-shot dedup. `.internal.test.ts` so dist-full excludes it.
│   │   ├── dev-each-warn.internal.test.ts ← opt-in `KERF_DEV_WARN_EACH_IN_MORPH_SKIP=1` (each() inside data-morph-skip) and `KERF_DEV_WARN_DUPLICATE_EACH_KEYS=1` (duplicate cacheKey values) warnings; covers env-var gates, dedup, production-mode short-circuit.
│   │   ├── dev-listener-warn.internal.test.ts ← KF-174 — opt-in `KERF_DEV_WARN_REBUILT_LISTENERS=1` dev-mode MutationObserver-based warning when a node carrying an imperative `addEventListener` listener is removed/rebuilt by the morph; covers the env-var gates, the descendant walk, and the helper-level rowContract `maybeWarnMissingRowKey` branches. `*.internal.test.ts` so dist-full excludes it (the test imports the `_resetWarnedForTests` helper which is not in the public dist barrel).
│   │   ├── dev-store-warn.internal.test.ts ← KF-212 — opt-in `KERF_DEV_WARN_NARROW_SET=1` dev-mode warning when `defineStore.set(next)` has any key from the current state missing in `next`; covers opt-out (env var unset / =0 / production), opt-in (warns once, names missing keys), per-store dedup, same-count-different-keys, array-skip, null-skip, primitive-skip, and the `_resetWarnContext` test helper. `*.internal.test.ts` so dist-full excludes it.
│   │   ├── diagnostic-error-audit.test.tsx ← KF-169 — one test per Hard Rule pinning the runtime behavior callers see on violation (introduced when the `/ai-evidence/diagnostics/` page existed; that page was removed in KF-211 but the runtime contract these tests pin still matters as a UX gate)
│   │   ├── morph.internal.test.ts
│   │   ├── doc-contract-coverage.test.tsx  ← KF-104 — comprehensive contract suite covering every doc-asserted behavior
│   │   ├── each.test.ts
│   │   ├── edge-case-coverage.test.tsx     ← adversarial probes for mount-lifecycle / shape-transitions / focus-on-granular-path / fast-path corners / 1000-row stress
│   │   ├── jsx-runtime.test.ts
│   │   ├── jsx-types.test.tsx
│   │   ├── kf102-each-after-transition.test.tsx ← KF-102 round 2 — each() reconcile after sibling-introduction transitions
│   │   ├── list-reconcile-fast-paths.test.ts ← KF-198 + KF-206 — attribute-only + text-content-only fast paths in the granular update path; firing/bailing cases and parse-count assertions (public-API tests via mount/arraySignal)
│   │   ├── list-reconcile-fast-paths.internal.test.ts ← direct-function bail-branch coverage for the same fast paths; calls the non-public helpers with crafted HTML; `.internal.test.ts` so dist-full excludes it
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
│   │   ├── example-apps.spec.ts        ← KF-165 — one smoke spec per `site/src/examples/complete/<name>/` app (kanban / markdown-editor / chat / todomvc / dashboard). Kanban drag spec is the regression gate for KF-163 (no visual feedback during drag) and KF-165 (delegateCapture matches() vs. delegate() closest() — pointerdown on `.card-text` missed `.card` until the example switched to `delegate()`).
│   │   ├── global-setup.mjs            ← rebuilds `tests/dist/consumer-app/dist/main.js` AND `tests/dist/example-apps/<name>/` before the suite (skipped per-build via `KERF_SKIP_CONSUMER_BUILD=1` / `KERF_SKIP_EXAMPLE_APPS_BUILD=1`)
│   │   ├── ime-composition.spec.ts     ← IME composition survives a re-render
│   │   ├── mutation-count.spec.ts      ← LIS-based reorder produces the minimum insertBefore count
│   │   ├── perf-1k.spec.ts             ← 1k-row stress (real-browser sanity check on the bench app)
│   │   ├── stateful-attrs.spec.ts      ← `<details open>` / `<dialog open>` user-agent-owned attribute survival
│   │   ├── svg-mathml.spec.ts          ← KF-83 — SVG/MathML namespacing across real browsers
│   │   └── toelement-adopt.spec.ts     ← KF-240 — toElement() returns live-document nodes (ownerDocument === document, every shape) + mount-before-insert burst across Chromium/Firefox/WebKit
│   └── dist/                     ← run via `npm run test:dist`, against the built bundles
│       ├── barrel-completeness.test.ts    ← KF-24 — pins the public-API list
│       ├── consumer-app/                  ← KF-123 — esbuild-bundled downstream-style app; main.tsx exercises every public primitive (counter/store/each/arraySignal/delegateCapture/focus/morph-skip/SVG/Fragment/declaration-merged custom element). Driven by `tests/browser/consumer-app.spec.ts`
│       ├── example-apps/                  ← KF-165 — Vite-bundled `site/src/examples/complete/<name>/` apps re-emitted with `base: './'` so the Playwright webServer can serve them at `/tests/dist/example-apps/<name>/`. Driven by `tests/browser/example-apps.spec.ts`
│       │   └── build.mjs                  ← one Vite build per app; called from `tests/browser/global-setup.mjs`
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
│   ├── results.sh                ← aggregates results into the viewer (CHANGELOG perf numbers come from here)
│   ├── aggregate-results.mjs     ← KF-138 — writes both `results.md` (stdout) and `results.json` (structured snapshot the homepage `PerfTable.astro` imports at build time)
│   ├── results.json              ← KF-138 — in-repo snapshot tracked in git; the Pages build has no bench-cache so this IS the source of truth at site-build time
│   ├── results.md                ← markdown tables consumed by docs
│   └── results-table.mjs         ← helper for the perf-comparison renderer
├── site/                         ← Astro + Starlight marketing/docs site, deployed to /kerf/ on GitHub Pages
├── docs/
│   ├── orientation.md            ← KF-179 — hard-capped 500-word one-pager for humans new to the codebase. Maintained by the `/check-requirements-against-code` skill.
│   ├── diagrams/
│   │   └── render-pipeline.svg   ← embedded in orientation.md
│   ├── 1-overview.md
│   ├── 2-reactivity.md
│   ├── 3-stores.md
│   ├── 4-render.md
│   ├── 5-event-delegation.md
│   ├── 6-jsx-runtime.md
│   ├── 7-svg.md
│   ├── 8-api-reference.md
│   ├── 9-live-demo.md
│   ├── 10-migrating.md           ← KF-132 — design doc for the /kerf/migrating/ hub (rendered pages live under site/src/content/docs/migrating/)
│   ├── 11-dev-warnings.md        ← KF-174 / KF-176 / KF-212 — design doc for the opt-in dev-warn family (KERF_DEV_WARN_* env-gated runtime warnings)
│   ├── 12-ai-assistant-configs.md ← KF-215 + KF-216 + KF-217 — Claude Code skill + Cursor rules bundled in the kerfjs npm package, canonical-file contract (version + KERF-APP-CANONICAL-END marker), and the `kerfjs/ai-assistant-configs` ESLint rule with versioned-section preservation
│   └── ai/
│       ├── code-summary.md       ← THIS FILE
│       ├── requirements-summary.md
│       └── usage-guide.md        ← consumer-facing cheat sheet for AI assistants writing apps with kerf
├── ai/                           ← KF-215 — generated mirror of the repo-root drop-in AI configs, shipped inside the npm package at `kerfjs/ai/`. Regenerate with `npm run ai-bundle:sync` after editing root files; kept honest by `check:ai-bundle-in-sync`.
│   ├── skill.md                  ← copy of kerf.claude-skill.md, canonical section only
│   ├── cursorrules               ← copy of kerf.cursorrules, canonical section only
│   └── manifest.json             ← { kerfjsVersion, files: [{ name, source, bundle, dest, version, sha256 }] } — the upcoming eslint rule's entry point
├── scripts/
│   ├── lib/
│   │   └── ai-bundle.mjs         ← KF-215 — shared logic for sync + check scripts; deterministic `computeBundle()` produces the three `ai/` files in memory from the root source-of-truth files
│   ├── sync-ai-bundle.mjs        ← KF-215 — regenerates `ai/` from `kerf.claude-skill.md` + `kerf.cursorrules`; run after editing either source
│   ├── check-ai-bundle.mjs       ← KF-215 — in-sync gate; fails when `ai/` drifts from the root sources or the manifest's `kerfjsVersion` is stale. Wired into `npm run check`
│   └── release.sh                ← interactive release flow w/ --beta support; drafts release notes via gitgist (`gitgist <last-tag>..HEAD`; gitgist is a devDependency)
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
├── kerf.cursorrules              ← KF-128 — drop-in Cursor rules; copy into a project as `.cursorrules`
├── kerf.claude-skill.md          ← KF-128 — drop-in Claude Code skill; copy into `~/.claude/skills/kerf-app/SKILL.md`
├── eslint-plugin/                ← KF-214 — `eslint-plugin-kerfjs` sub-package (own package.json + node_modules, published separately). Four AST-only rules — `no-inline-jsx-event-handlers` / `require-data-key-in-each` / `no-nested-mount` / `prefer-module-jsx-augmentation` — paired with the dev-warn family in `src/dev-*.ts` to enforce Hard Rules 2/5/9/11 at edit time. Tests via `npm test` in that directory (`node --test` + ESLint `RuleTester` + `@typescript-eslint/parser`). Ignored by the root `eslint.config.js`.
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
| `MountResult` | `mount.ts` | Type — what `mount()`'s render function can return (`SafeHtml \| string \| number \| boolean \| null \| undefined`, KF-119) |
| `morph` | `morph.ts` | KF-150 — one-shot in-place DOM reconciliation; same algorithm `mount()` uses, but doesn't subscribe to signals |
| `each` | `each.ts` | Keyed list iteration; per-item HTML memo by object identity (+ optional key) |
| `attr`, `AttrSpec<N,V>` | `attrSelector.ts` | Two overloads. **Static** `attr(name, value)` → `AttrSpec<N,V>` with `.name`, `.value`, `.selector`, `.attrs` (`{ readonly [name]: value }` — spreadable into JSX). **Dynamic** `attr<N,V=string>(name)` → factory `(value: V) => { readonly [name]: V }` for per-row data attributes; `V` defaults to `string`, specify both generics to constrain the value set. Both CSS-escape at creation time. |
| `delegate<T>` | `delegate.ts` | Event delegation; auto-promotes known non-bubblers (focus/blur/scroll/load/error/mouseenter/mouseleave) to capture, keeps `closest()` matching; generic `T extends Element` narrows the `target` arg |
| `delegateCapture<T>` | `delegate.ts` | Explicit-capture escape hatch; `target.matches()`-style direct matching; same `T` generic |
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
| `ARRAY_SIGNAL_BRAND` | `array-signal.ts` | The `Symbol.for('kerfjs.ArraySignal')` brand symbol — exported so consumers that build their own collection types can opt into the brand and have `each()` recognize them |

The class is detected via `Symbol.for('kerfjs.ArraySignal')` (KF-95), not `instanceof`, so multiple bundle copies still interoperate. The `each()` runtime in the main barrel uses the brand to detect `arraySignal` arguments without importing the class.

Plus, on the `kerfjs/testing` subpath:

| Export | From | Purpose |
| --- | --- | --- |
| `clearStoreRegistry` | `store.ts` (re-exported via `testing.ts`) | Drop every registered store. Test-only — lets a unit-test file reset `defineStore`'s module-level `REGISTRY` between cases without re-importing the store modules. |

Plus, on the `kerfjs/jsx-runtime` subpath (re-exported types for declaration merging — KF-100):

| Export | From | Purpose |
| --- | --- | --- |
| `KerfBaseAttrs` | `jsx-types.ts` | Shared attribute base for every typed element |
| `KerfCustomElement` | `jsx-types.ts` | Loose attribute set for custom elements / web components |
| `AttrLike<T>` / `AttrValue` / `DataAriaAttrs` | `jsx-types.ts` | Building blocks for project-specific intrinsic-element types |

The JSX runtime is a separate subpath export at `kerfjs/jsx-runtime`. It's referenced by tsconfig (`"jsxImportSource": "kerfjs"`); users do not import from it directly *unless* they're declaration-merging custom-element types into `JSX.IntrinsicElements` (see `docs/8-api-reference.md` §8.5).

## Build outputs

`npm run build` → `tsup` → `dist/`:

- `dist/index.js` (ESM bundle, ~11 KB min+gz including `@preact/signals-core`; ~12 KB if a consumer also imports `arraySignal` from `kerfjs/array-signal`. See `bench/results.md` for the per-shape numbers.)
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
| morph conventions | `src/morph.ts` (public `morph()` (KF-150), key matching, `data-morph-skip`, `data-morph-skip-children` (KF-152), `data-morph-preserve` (KF-151), focus preservation), `src/mount.ts` (segment dispatch) |
| SVG namespace handling | `src/toElement.ts` (`SVG_FRAGMENT_TAGS`) |
| Store reset semantics | `src/store.ts` (`REGISTRY`, `resetAllStores`) |
| Delegation tier docs | `docs/5-event-delegation.md` |
| Test coverage thresholds | `vitest.config.ts` |
| Release flow / version bumping | `scripts/release.sh` (release notes drafted via gitgist) |
| Commit-message drafting | `npm run commit:msg` → `gitgist --staged --commit-message` (gitgist is a devDependency) |
| GitHub Pages live-demo deploy | `.github/workflows/pages.yml` + `examples/reactivity-demo/vite.config.ts` (`base: '/kerf/demo/'`) + `site/astro.config.mjs` (`base: '/kerf'`) + `docs/9-live-demo.md` |
| Benchmark harness / perf numbers | `bench/` (`bench/README.md` + `setup.sh` / `run.sh` / `results.sh` / `aggregate-results.mjs`); CHANGELOG perf entries come from runs here. Homepage's `site/src/components/PerfTable.astro` imports `bench/results.json` (KF-138) — refresh it by re-running `aggregate-results.mjs` and committing the regenerated file. |
| Migrating hub (`/kerf/migrating/`) | `docs/10-migrating.md` (design doc) + `site/src/content/docs/migrating/{index.mdx,react.md,alpine.md,lit.md,vanjs.md}` (rendered pages) — KF-132 + KF-156/157/158/159 |
| Drop-in AI-tool config | `kerf.cursorrules` + `kerf.claude-skill.md` at repo root (source of truth) — both regenerate from `docs/ai/usage-guide.md`. KF-215 ships generated mirrors inside the npm package at `ai/skill.md` / `ai/cursorrules` / `ai/manifest.json`; regenerate via `npm run ai-bundle:sync`; design + canonical-file contract in `docs/12-ai-assistant-configs.md` |

## Update triggers

Update this doc whenever you:

1. Add or rename a file under `src/`.
2. Add a new public export to `src/index.ts`.
3. Change the build output shape (`tsup.config.ts`).
4. Add a new conventional `data-*` attribute that `mount()` recognizes.
5. Add a new test directory or convention.
6. Add a new `scripts/` entry or a new gate wired into `npm run check`.
