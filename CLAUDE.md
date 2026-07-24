# kerf

## Project Overview

kerf is a tiny reactive UI framework: fine-grained signals + a custom DOM diff specialized for keyed lists + a tiny JSX runtime. The whole runtime is roughly 11 KB minified + gzipped without `arraySignal`, 12 KB with it, including its sole runtime dependency (`@preact/signals-core`).

The name *kerf* is a woodworking term — the narrow strip a saw blade removes. The framework's job is the same: apply the smallest possible cut to update your DOM.

**New to this codebase?** Read [`docs/orientation.md`](docs/orientation.md) first — a hard-capped 500-word one-pager with the module map, render-pipeline diagram, and the unusual-things checklist. It's maintained by the `/check-requirements-against-code` skill alongside the AI summaries.

## Tech Stack

- **Runtime**: Browser (modern, ES2022+). Node 22.12+ for build/test (Astro requirement).
- **Language**: TypeScript (strict mode, ESM-only). Dual-track toolchain: the **native TypeScript 7** compiler (installed as the `typescript7` npm alias; invoked as `node node_modules/typescript7/bin/tsc`) runs every typecheck gate (`npm run typecheck`, the three `-p` dist-typing gates, the docs-examples compile), while **`typescript@6`** (the JS-API bridge release — the native 7 package ships no JS API) stays the resolvable `typescript` package for API consumers: tsup's `.d.ts` build and typescript-eslint. Don't collapse the two — `@typescript-eslint` caps its peer at `<6.1.0` and rollup-plugin-dts needs `lib/typescript.js`.
- **Build**: tsup (esbuild + dts emit via typescript@6; `ignoreDeprecations: '6.0'` is set in `tsup.config.ts`'s `dts.compilerOptions` because tsup hardcodes the TS-7-removed `baseUrl` into the dts build — keep that waiver out of tsconfig.json so the native 7 gates stay strict). Outputs ESM + types.
- **Tests**: vitest with `happy-dom` as the default environment. `tests/unit/toElement.test.ts` overrides to `jsdom` (via `@vitest-environment jsdom`) because happy-dom's `DOMParser('image/svg+xml')` returns a document with `null` `documentElement` for SVG input — jsdom gets it right, and so do real browsers. Both `jsdom` and `@types/jsdom` are devDeps for that one file; do not remove them.
- **Lint**: eslint flat config + `simple-import-sort` + typescript-eslint.

## Architecture

The framework is a small set of independent modules that compose. Each one earns its keep on its own; together they're a complete UI runtime.

### Source layout

- `src/index.ts` — public entry point. Re-exports everything users need.
- `src/jsx-runtime.ts` — JSX → `SafeHtml` (HTML strings) + `SafeHtml.toString()`. Configured via `tsconfig.json` `"jsxImportSource": "kerfjs"` in user code. Imports the typed intrinsic-element table from `src/jsx-types.ts`.
- `src/jsx-types.ts` — typed JSX intrinsic-element interfaces (`KerfBaseAttrs`, per-element attribute types, the `IntrinsicElements` mapping). Catches typos on tag names + attribute names at compile time. Custom elements / web components extend this via `declare global { namespace JSX { interface IntrinsicElements { 'my-tag': KerfCustomElement & {...} } } }`.
- `src/html.ts` — `html` tagged template at the `kerfjs/html` subpath: the no-build authoring path (CDN / importmap consumers write `` html`<div>${sig}</div>` `` with no JSX transform). Thin front-end over the exact JSX machinery — text holes via `_toSegment`, attribute holes via the JSX attribute branch (signal → fine-grained binding, statics rendered verbatim with real HTML names, no camelCase aliasing). Parses each template's static parts once (cached per template-strings-array identity).
- `src/reactive.ts` — re-export of `@preact/signals-core` (`signal`, `computed`, `effect`, `batch`). One-file abstraction layer so the underlying lib is swappable. `signal()`/`effect()` are dev-gated through `dev-signal.ts` / `dev-delegate-warn.ts` when the corresponding opt-in env vars are set.
- `src/bindings.ts` — fine-grained signal bindings: a `Signal` interpolated straight into a JSX/html attribute (`class={sig}`) or text hole (`{sig}`) inside `mount()` emits a marker instead of stringifying; a wiring pass attaches one effect per hole so later signal writes update the node without re-running the render. Two disjoint marker namespaces: GLOBAL holes (`data-kfb` / `<!--kfb:id-->`, wired over the mount root) and ROW holes inside `each()` (`data-kfbrow` / `<!--kfbr:id-->`, wired/disposed by both reconcile paths at row create/remove/in-place update). The marker namespace is a reserved consumer contract. Module-level `context`/`rowSink` here are the third sanctioned mutable location (see Design rule 5).
- `src/store.ts` — `defineStore({ initial, actions })` + global registry + `resetAllStores()`.
- `src/array-signal.ts` — `arraySignal(initial)` granular collection signal at the `kerfjs/array-signal` subpath (KF-92 / KF-95). Brand-detected by `each()` so the class only ships when the consumer actually imports it.
- `src/mount.ts` — `mount(el, render)`. Wraps `effect()` + the segment-aware morph. Bulk-renders on first paint, then on subsequent renders runs `morph()` over the static surrounds (skipping any list parents) and dispatches each list to its native keyed reconciler. Conventions for morph keys, `data-morph-skip`, focus/selection preservation.
- `src/each.ts` — `each(items, render, key?)`. Keyed list iteration. Returns a structured list segment (not a flat HTML string) so `mount()` can run a native reconciler per list — no parse-the-whole-table round trip on partial updates. Per-item memoization by object identity (+ optional `key`) skips the JSX work for unchanged rows.
- `src/list-render-state.ts` — the reconciler's dispatch state machine, reified (previously implicit sentinel checks scattered across `each.ts`): `ListRenderState` (`unbound`/`empty`/`bound`), `deriveListRenderState()`, and `decideListPath()` with the documented transition table. Pure and directly unit-tested. Internal.
- `src/list-reconcile.ts` — top-level dispatcher for the keyed list reconciler (KF-112 split). Re-exports `BoundItem` / `ListBinding` / `endAnchor()` from `list-binding.ts` and defines `reconcileList()`; the latter routes to one of the two sibling reconciler files based on whether an `arraySignal` patch queue is applicable — the DOM-side restatement of `list-render-state.ts`'s `bound` precondition.
- `src/list-binding.ts` — `BoundItem` / `ListBinding` interface + `endAnchor(binding)` helper (KF-116 split). Lives in its own file so the snapshot + granular reconciler files can import the binding shape without creating a circular dependency back to `list-reconcile.ts`. Internal.
- `src/list-reconcile-snapshot.ts` — snapshot reconcile path. Calls `tryInPlaceContentUpdate` first; otherwise classify (stable/replaced/new) → bulk-parse fresh row HTML in one `innerHTML` → remove orphans/replaced → LIS pass to compute the minimum `insertBefore` set → reverse-pass move. Used for plain-array `each()` and for arraySignal-backed `each()` when the patch path can't apply (first render, post-`replace()`, post-drift). Internal.
- `src/list-reconcile-inplace.ts` — snapshot fast path (KF-260): when the new segment has the same item refs in the same order (no insert/remove/move), morph each changed row in place — reusing the granular surgical/morph ladder with a `replaceChild` fallback on a top-level tag change — instead of node-replacing it. Avoids the table-relayout cost of node replacement for external-state-driven row changes (single `selectedId` + `each()` `cacheKey`) and preserves DOM identity/focus. Subsumes (and replaced) the prior no-op snapshot fast path. Internal.
- `src/list-reconcile-granular.ts` — KF-92 patch-driven path. Applies an `arraySignal`'s update/insert/remove/move patches directly to the live DOM in O(patches). KF-93 bulk-parses contiguous insert runs; KF-94 bulk-parses consecutive update runs at any indices. Internal.
- `src/list-reconcile-fast-paths.ts` — two heuristics ahead of the granular update path's parse+morph (KF-198 / KF-206): attribute-only diffs call `setAttribute`/`removeAttribute` on the live row, text-content-only diffs patch one text node's `nodeValue`. Targets the krausest select-row / partial-update shapes. Internal.
- `src/list-reconcile-focus.ts` — focus snapshot/restore around the keyed list reconciler's move pass. Some engines (older Safari, happy-dom) blur a focused descendant on `insertBefore` even when it survives the move; this module captures and re-applies focus + selection range so the user's caret survives a row reorder uniformly. Internal.
- `src/segment.ts` — `Segment` types (`static` / `list` / `mixed`) + flatten helpers. The JSX runtime emits these from `_jsx`; `mount()` consumes them.
- `src/morph.ts` — kerf's general-purpose DOM reconciler, exported publicly as `morph(liveRoot, template)` (KF-150) and used internally by `mount()`. Accepts an `Element`, a `SafeHtml`, or a raw HTML string for the template; the optional third `ownedItems` parameter is an internal coordination channel for `mount()`'s list reconciler that public callers should omit. Replaces the prior `morphdom` dependency. Specialized: knows about `data-morph-skip`, `data-morph-skip-children` (KF-152), `data-morph-preserve` (KF-151), the focused-input/contenteditable rules, the `id`/`data-key` matching scheme, and an `ownedItems` set whose elements are owned by the keyed list reconciler (KF-102 round 2 — the morph skips owned list rows individually but still walks every parent's children so non-list siblings around an `each()` reconcile correctly). Algorithm derived from [morphdom](https://github.com/patrick-steele-idem/morphdom) (MIT, attribution in `LICENSE`).
- `src/attrSelector.ts` — `attr()` public helper, two overloads: static `attr(name, value)` → a pre-computed `AttrSpec` (`.name`/`.value`/`.selector`/`.attrs` spreadable into JSX; escapes once at creation); dynamic `attr(name)` → a per-value factory for per-row data attributes. Keeps attribute names/selectors rename-safe between JSX and `delegate()` call sites.
- `src/delegate.ts` — `delegate()` (Tier 1; auto-promotes known non-bubblers to capture) + `delegateCapture()` (Tier 2 explicit-capture escape hatch). Both default to `closest()`-style walk-up matching (`{ match: 'direct' }` opts into exact-element matching) and share `DelegateOptions`.
- `src/dev-signal.ts` — dev-mode `DevSignal` subclass: one-shot warn on a `.value` write to a signal that never had a subscriber (`KERF_DEV_WARN_UNTRACKED_SIGNALS=1`). Internal.
- `src/dev-binding-warn.ts` / `src/dev-delegate-warn.ts` / `src/dev-each-warn.ts` / `src/dev-list-key-warn.ts` / `src/dev-list-rebind-warn.ts` / `src/dev-listener-warn.ts` / `src/dev-rerender-warn.ts` / `src/dev-store-warn.ts` — the opt-in `KERF_DEV_WARN_*` warning family (design rules in `docs/11-dev-warnings.md`): stale fine-grained binding on the byte-equal fast path (`…_STALE_BINDING`), `delegate()` inside an `effect()` body (`…_DELEGATE_IN_EFFECT`), `each()` under `data-morph-skip` + duplicate `cacheKey`s (`…_EACH_IN_MORPH_SKIP` / `…_DUPLICATE_EACH_KEYS`), morph-rebuilt nodes carrying imperative listeners (`…_REBUILT_LISTENERS`), value-only re-renders that could have been bindings (`…_VALUE_ONLY_RERENDER`), narrow `store.set()` calls (`…_NARROW_SET`), and a rebuilt `each()` container self-healed with row-state loss (`…_LIST_REBIND`). `dev-list-key-warn.ts` is **always-on in dev** (no env var, like the missing-row-key warning): an `each()` list's call-order identity was taken over by a different list, so its rows were rebuilt — the fix it names is `each(…, { key })`. All dev-only, gated through `utils/devMode.ts`; production behavior unchanged. Internal.
- `src/toElement.ts` — SVG-aware JSX → DOM helper. Routes SVG content through `DOMParser('image/svg+xml')`.
- `src/testing.ts` — `kerfjs/testing` subpath. Re-exports `clearStoreRegistry` for unit-test isolation.
- `src/utils/devMode.ts` — the shared dev-mode gate `isDevMode()`. Precedence: `globalThis.KERF_DEV` boolean override (read lazily, wins both ways) → else `process.env.NODE_ENV !== 'production'`. Every dev-only behavior routes through here.
- `src/utils/devReadonly.ts` — dev-only deep read-only `Proxy` for `defineStore`'s `get()` snapshot (`devReadonlyProxy` throws on any write, lazily wraps nested objects) + `toRaw()` unwrap so `set({ ...get() })` stores plain objects. Never freezes the live state.
- `src/utils/escapeHtml.ts` — HTML / attribute escaping helpers used by the JSX runtime.
- `src/utils/syncFormProp.ts` — form-state property sync: `checked`/`value`/`selected` live properties follow an attribute the reconciler actually MUTATES (browsers detach property from attribute once a control is dirty). Called by the morph's attribute writer and the binding writer only at real attribute mutation, so uncontrolled usage is never touched.
- `src/utils/templateParse.ts` — static-parts state machine for the `html` tagged template: classifies each `${…}` hole as text or complete-attribute-value; holes in unprovable positions (tag names, attr names, partial values, comments) throw with actionable messages.
- `src/utils/urlScreen.ts` — shared URL-attribute screening for `href`/`src`/`formaction`/etc.: drops `javascript:`/`vbscript:` + script-executing `data:` subtypes, normalizing control-char/whitespace scheme obfuscation first; `raw()` is the documented opt-out. Throws in dev, warns + drops in prod. Used by both the static attribute renderer and the live binding writer.
- `src/utils/jsx-attr-aliases.ts` — `ATTR_ALIASES` table mapping camelCase JSX attributes to their HTML / SVG equivalents (extracted from `jsx-runtime.ts` so the alias data is a separable concern from the runtime logic).
- `src/utils/rowContract.ts` — shared "exactly one top-level element per row" helpers (KF-103). `ROW_HTML_SNIPPET_MAX`, `truncateRowHtml`, `parseRowTemplate`, `rowContractError`. Used by both reconcile paths and by `mount.ts`'s first-render `validateInlinedRowMatch`.
- `bench/` — performance tooling for [`krausest/js-framework-benchmark`](https://github.com/krausest/js-framework-benchmark). `bench/kerfjs-impl/` is the kerf entry, **merged upstream** at `frameworks/keyed/kerfjs/` — keep it in sync and open a follow-up upstream PR to bump the pinned kerfjs version on release. `bench/import-krausest.mjs` imports the official upstream numbers into the published `bench/results.{json,md}` (the site's source of truth). `bench/setup.sh`, `run.sh`, `aggregate-results.mjs` are the LOCAL dev-only harness (profiling on your own machine; writes the gitignored `bench/results.local.*`). See "Performance comparison numbers" below.

### Public API surface

Everything users import lives at the top level of `kerfjs`:

```ts
import {
  signal, computed, effect, batch,
  type Signal, type ReadonlySignal,
  defineStore, resetAllStores, type Store,
  mount, type MountResult, morph, each,
  attr, type AttrSpec,
  delegate, delegateCapture, type DelegateOptions,
  toElement,
  SafeHtml, isSafeHtml, raw, Fragment,
} from 'kerfjs';

// Optional, separate subpath — apps that don't use granular collection signals
// shed ~1 KB from the main barrel.
import { arraySignal, type ArraySignal, type ArrayPatch } from 'kerfjs/array-signal';

// Optional no-build authoring path — tagged template with identical runtime
// semantics to JSX, for CDN / importmap consumers with no JSX transform.
import { html, type HtmlValue } from 'kerfjs/html';
```

The JSX runtime sits at `kerfjs/jsx-runtime` (subpath export). Users configure it via `tsconfig.json`'s `"jsxImportSource": "kerfjs"`. `kerfjs/jsx-runtime` also re-exports the typed JSX building blocks (`KerfBaseAttrs`, `KerfCustomElement`, `AttrLike`, `AttrValue`, `DataAriaAttrs`) for declaration-merging custom-element types into `JSX.IntrinsicElements` (KF-100). The `kerfjs/testing` subpath exposes `clearStoreRegistry` for test isolation.

### Design rules

1. **No virtual DOM.** Render JSX to HTML strings (with structured "list" and "mixed" segments where lists appear); let `morph()` reconcile the static surrounds and the list reconciler own its rows.
2. **No compiler — not required, not optional.** Plain JSX, plain TypeScript, plain esbuild. No special build step in the consumer's project beyond what they already use. This is a hard rule, not a "no required compiler" rule: kerf will not ship an opt-in codegen package either. Anyone who wants compile-time fine-grained reactivity should pick Solid — that's Solid's whole value prop and Solid does it better than a kerf-compiler ever could. Kerf's positioning is "the fastest framework that needs no build step beyond your existing one," which means the architectural ceiling vs Solid (~6.5ms select-row, ~19ms partial-update on krausest) is the ceiling kerf accepts. Closing the runtime-vs-compiled gap on the remaining update-path benchmarks is the goal; matching Solid specifically is not.
3. **Tier 1 / Tier 2 / Tier 3 listener model.** `delegate()` covers bubbling events and auto-promotes the well-known non-bubblers (focus, blur, scroll, load, error, mouseenter, mouseleave) to capture phase under the hood; `delegateCapture()` is the explicit-capture escape hatch — same `closest()`-style walk-up matching as `delegate()` by default, with `{ match: 'direct' }` as the exact-element opt-in; `data-morph-skip` for library-owned subtrees.
4. **One primary export per file.** Each file has one main exported function/concept.
5. **Module-level mutable state is restricted to three documented places.** (a) `store.ts:REGISTRY` — exists only to make `resetAllStores()` work. (b) `each.ts:context` — a single mutable reference to the current render context (`{ counter, caches }`) that `mount()` sets at the start of each effect run via `_setRenderContext` and clears afterwards. The cache map itself is owned by each `mount()`'s closure (not module-level), so per-mount caches are separate, per-callsite caches within a mount are separate (different list ids), and the KF-87 inline-render-fn regression that came from the previous KF-73 per-render-fn keying is gone. (c) `bindings.ts:context` / `rowSink` (+ its `rowCounter`) — the fine-grained-binding collection context, set/cleared the same render-scoped way. Not counted against the rule: pure caches with GC-tied lifetimes (`bindings.ts:insertedTextNodes`, `html.ts:PARSE_CACHE`), the observability-only `html.ts:parseCount` test-hook counter, and the one-shot dev-warn dedup flags in the `dev-*` modules (dev-only, observable only as warning suppression). Everything else flows through arguments.

### What kerf is NOT

- Not a component framework. `<MyComponent props />` works as JSX sugar — the runtime calls `MyComponent(props)` and uses the returned JSX — but there are no hooks, no lifecycle, and no per-instance state. Components are plain functions; state lives in module-scope signals or stores.
- Not a router. Not a state-management library beyond the bare store factory. Not an SSR framework (though `SafeHtml.toString()` works server-side).
- Not opinionated about styling. Bring your own CSS.

## Build

```bash
npm run build       # tsup → dist/{index,jsx-runtime,testing,array-signal}.js + dist/chunk-*.js + .d.ts
npm run dev         # tsup --watch
```

`tsup.config.ts` runs with `splitting: true` so shared modules (`SafeHtml`, the store `REGISTRY`) live in a single chunk imported by every entry. See `docs/ai/code-summary.md` for the rationale (KF-14 / KF-15).

## Testing

```bash
npm test                  # vitest vs src/, with coverage
npm run test:watch        # vitest watch mode
npm run test:unit         # tests/unit only
npm run test:integration  # tests/integration only
npm run test:dist         # build, then targeted dist regression suite (tests/dist) vs dist/
npm run test:dist:full    # build, then full unit + integration suite remapped onto dist/
npm run test:dist:jsx-typing  # KF-123: build, then `tsc -p tests/dist/jsx-typing/tsconfig.json` — typechecks consumer .tsx against dist/jsx-runtime.d.ts
npm run test:dist:examples    # build, then typechecks the complete example apps (site/src/examples/complete/) against dist/
npm run test:dist:scaffold-typing  # build, then typechecks the create-kerf-component template's src/ against dist/ (the living-proof gate for the scaffold)
npm run test:browser      # build, then Playwright across chromium/firefox/webkit (tests/browser/) — globalSetup also rebuilds tests/dist/consumer-app/ AND tests/dist/example-apps/ (KF-165)
npm run typecheck         # tsc --noEmit
npm run lint              # eslint
npm run check:docs:test-inventory  # KF-109: ensures docs/ai/code-summary.md mentions every test file in tests/
npm run check:docs:api-coverage  # KF-162: ensures docs/8-api-reference.md mentions every public export from src/index.ts and its subpaths
npm run check:docs:api-signatures  # KF-343: builds, then verifies each public function export's signature in docs/8-api-reference.md matches the emitted dist/*.d.ts (param names + arity + return type per overload). In the check chain it runs right after the build step (no rebuild)
npm run check:features    # KF-284/286/289: ensures every behavior in the docs/14-feature-coverage.md index maps to a live guarding test, AND every public value export is represented by an index row (a behavior/transition axis orthogonal to line coverage)
npm run check:docs:examples  # ensures /kerf/run/ doc links resolve to built+tested examples, doc/source example pairs match, and self-contained kerf code blocks compile
KERF_FUZZ_RUNS=20000 npx vitest run tests/unit/reconciler-fuzz.test.ts  # opt-in fuzz soak (see below)
npm run check             # local pre-commit gate: lint + typecheck + doc inventory + api/feature coverage + ai-bundle sync + test + build + both dist:* suites + jsx-typing/examples/scaffold typing gates + docs-examples check
npm run check:full        # KF-118: pre-push gate — `check` plus the Playwright browser suite (chromium/firefox/webkit), which exercises tests/dist/consumer-app/ end-to-end
```

`npm run check` is what the husky pre-commit hook runs — the canonical "is everything green" command for fast local turnaround. `npm run check:full` is the heavier opt-in gate: run it before `git push` to also exercise the Playwright tests (SVG/MathML namespacing, IME composition, mutation counts, stateful attributes — anything the happy-dom unit tests can't model truthfully). CI runs both on every push/PR (see `.github/workflows/ci.yml`); locally the split keeps the inner loop fast and lets you opt into the full gate when you want push-day confidence.

Coverage thresholds (`vitest.config.ts`): **100% lines / functions / statements, 99% branches** on `src/`. The branches threshold was lowered from 100% to 99% in KF-103 to accommodate a small number of documented-unreachable defensive returns (annotated with `c8 ignore`) whose loop-completion branches v8 tracks but cannot be exercised by construction. The lines / statements / functions thresholds at 100% still catch any actual unexercised code.

### Testing Philosophy

- **Unit tests** (`tests/unit/`): Test each module in isolation with `happy-dom`. Mock external state (timers, network) but exercise real logic.
- **Integration tests** (`tests/integration/`): Exercise the full pipeline — signals + stores + mount + delegate against a real DOM tree.
- **Browser tests** (`tests/browser/`): Real-browser tests via Playwright (Chromium / Firefox / WebKit) for scenarios `happy-dom` can't model truthfully — SVG/MathML namespacing, IME composition, MutationObserver counts. Run with `npm run test:browser` (builds dist first; the fixture page imports from `dist/` via importmap). Browser binaries are downloaded once via `npx playwright install`. **`tests/browser/consumer-app.spec.ts`** (KF-123) drives a real downstream-style app at `tests/dist/consumer-app/` that's bundled by esbuild against `dist/` (Playwright's `globalSetup` rebuilds it before every run); each zone exercises a public primitive end-to-end through all three engines, so a `dist/` regression that only manifests in a real-consumer bundle (KF-14 SafeHtml duplication, KF-123 IntrinsicElements self-shadow, etc.) trips the gate. **`tests/browser/example-apps.spec.ts`** (KF-165) drives the nine complete example apps under `site/src/examples/complete/<name>/` (re-bundled by `tests/dist/example-apps/build.mjs` with `base: './'` so the test webServer can serve them; the no-build `live-poll` app is copied verbatim with a vendored dist instead of bundled). Each app gets a smoke spec that exercises its headline interaction (kanban drag, markdown caret survival, chat streaming, todomvc add/toggle/clear, dashboard tick, counter-store inc/fetch, cart-htmx swap, row-selector fine-grained select, live-poll no-build voting). Surfaced and gated the `delegateCapture` vs. `delegate` regression in kanban (pointerdown on `.card-text` missed `.card` because `delegateCapture` uses `target.matches()` not `closest()`).
- **Dist `.d.ts` typing gate** (`tests/dist/jsx-typing/`, KF-123): `tsc -p tests/dist/jsx-typing/tsconfig.json` typechecks `consumer.tsx` + `consumer-merge.tsx` against `dist/jsx-runtime.d.ts` with `jsxImportSource: "kerfjs"`. Catches IntrinsicElements self-shadow regressions (where `dist/jsx-runtime.d.ts` emits `interface IntrinsicElements extends IntrinsicElements {}`) and declaration-merge breakage that the in-source typing tests can't see because they never look at the emitted .d.ts.
- **Coverage target**: Keep coverage above the thresholds. New code without tests fails CI.
- **Coverage is a floor, not a ceiling.** 100% line/branch/function/statement coverage is necessary but **not sufficient** — it proves every line *executed*, not that every *behavior* or every *sequence* of behaviors is *asserted*. Line coverage is structurally blind to a **missing state transition**: if the test that would walk a transition doesn't exist, that path combination never runs, yet every individual line still gets hit by the isolated single-operation tests and the report stays green. Two basic, critical bugs (KF-125: select-after-delete lost the `cacheKey` dependency; append-after-clear rendered nothing) shipped under 100% coverage for exactly this reason. Treat a green coverage report as the *trigger* for the behavioral audit below, never as proof of correctness.
- **Adversarial / state-transition testing for stateful modules.** Any module with multiple code paths keyed on an internal mode/phase — the `each()` / list-reconcile state machine (`first-render ↔ granular ↔ snapshot ↔ empty-binding ↔ drift-recovery`), `morph.ts`, `store.ts` — must be tested across its **transition matrix**, not just each operation from a clean initial state. When adding or altering a stateful path, do an explicit adversarial pass: **enumerate the states, enumerate the transitions between them, then write a probe that walks realistic multi-step user sequences that cross state boundaries** (e.g. `create → select → delete → select`; `clear → append → select`; `empty-via-remove → insert`). Deliberately try out-of-order / interleaved / repeated / empty-then-refill sequences, and pin the ones that would have failed as permanent regression tests. The template is `tests/unit/array-signal.test.ts` › **"reconciler transition matrix (adversarial)"**. See also KF-284 (the feature/requirements coverage report that asserts every documented behavior — including transitions — is tested).
- **Property-based (fuzz) testing is the instrument hand-written cases can't replace.** Three adversarial sweeps over the reconciler found nine defects, and every one was an unexpected *combination* of shapes rather than a wrong line of code — which is the ceiling of enumerating cases by hand, because the enumeration is steered by the same priors that wrote the code. `tests/unit/reconciler-fuzz.test.ts` (helpers in `tests/unit/fuzz/`) searches the shape space instead: it generates random-but-valid trees plus random mutation sequences, checks invariants after **every step**, and shrinks a failure to a minimal paste-ready case. Its strongest invariant is differential — *incremental reconcile must equal a from-scratch render of the same state* — which subsumes most hand-written assertions and needs no prediction about which shapes matter. It runs a small deterministic budget in `npm run check`; soak it with `KERF_FUZZ_RUNS`. If it finds a defect you aren't fixing in the same change, **hold it in a quarantine scoped by the SHAPE of the case** (not the text of the failure), pin a reproduction that must keep failing so an entry cannot outlive its bug, and budget the excused fraction so the debt can shrink but never quietly grow. The three defects it found on day one were carried that way and retired within hours; the harness currently runs with an empty quarantine, and every generated case is expected to hold.

## Code Quality Gates

- **Always fix lint and type errors before finishing work.** Run `npx tsc --noEmit` and `npm run lint` before handing work back. Both must pass with zero errors.
- **Prefer editing existing files** to creating new ones. The runtime is small on purpose.
- **One coherent concern per file.** Split a file when it holds two genuinely separable concerns — never to satisfy a line count. Prefer a ~400-line file that houses one coherent state machine or algorithm to three fragments that each hold a slice of it (the keyed list reconciler is deliberately one algorithm even though it spans several hundred lines across its dispatcher and path files). A file growing past ~500 LOC is a *smell* worth a second look for a hidden second concern, not a gate that fails the build. (One primary export per file — Design rule 4.)

### Code search (prefer ast-grep for structure)

For **structural / syntax-aware** searches over source (`.ts` / `.tsx`), use **ast-grep** (the `ast-grep` skill, or the CLI: `ast-grep run --lang <ts|tsx> -p '<pattern>' <path>`) rather than text grep — it matches the AST, so it skips comments/strings and catches multi-line/nested shapes. kerf is TypeScript-only (no Rust), so `--lang` is always `ts` or `tsx`. Good fits in this codebase: `$A as $B` / `$A as const` casts, `$X.innerHTML = $Y` assignments, `document.createElement($T)`, `DOMParser(...)` usage, `signal($X)` / `computed(...)` / `effect(...)` call shapes, JSX shapes like `<$TAG data-morph-skip />`, `c8 ignore` defensive returns, the `each(...)` / `mount(...)` / `morph(...)` call sites, and codemod-style rewrites when changing an API signature across the runtime + tests + examples. **`--lang` matters: `tsx` ≠ `ts`** — pick per file extension (`.tsx` for JSX-bearing files like the examples and `tests/dist/**/*.tsx`, `.ts` for everything in `src/`).

Keep **text search** (ripgrep / the editor's grep / the Explore agent) for what it's best at: literal strings (e.g. `FEEDBACK NEEDED`, `KERF-APP-CANONICAL-END`, `KF-` ticket markers), identifier/symbol lookups, **filenames**, and **non-code files** (the numbered `docs/*.md`, `CHANGELOG.md`, JSON, the `site/` content) — there AST has nothing to match and text is simpler + faster.

## Git

- **Commit as needed.** You may create git commits without asking when it helps the work (e.g. checkpointing completed, verified changes).
- **NEVER `git push` without explicit user permission.** Committing locally is fine; publishing to the remote requires the user to ask.

## Hot Sheet integration

This project is managed via [Hot Sheet](https://github.com/brianwestphal/hotsheet) — a **local-only** ticket tracker. Tickets use the `KF-` prefix and exist only on the maintainer's machine. Run `hotsheet` from the project root to launch the local UI; the skill files under `.claude/skills/kerf/` reference the worklist for AI-driven work.

### Referencing tickets in code and docs

Hot Sheet is local-only, so a bare `KF-NN` reference can't be looked up by anyone but the maintainer. The rules differ by surface:

**Never mention KF-NN anywhere on the published site.** That includes prose in `site/src/content/docs/**`, the source docs that sync into it (`docs/1-overview.md` … `docs/8-api-reference.md`), any HTML comment inside a published markdown file, and any code-block excerpt the site renders. Site readers don't have Hot Sheet, so the number is dead weight at best and noisy at worst. When you'd normally write `(KF-103)` for provenance, drop the marker and keep only the self-contained summary.

**For everything else (code comments in `src/`, commit messages, source docs that are NOT site-synced):** when you mention a ticket number, **always include a short self-contained summary** in the same sentence or parenthetical so the reference stands alone without the reader resolving the ticket.

- ✅ `data-morph-skip-children (attrs on the host morph, subtree preserved)` — self-contained; no ticket number needed.
- ✅ `// KF-103 row contract: exactly one top-level element per each() row` — code comment with self-contained summary; the number is provenance.
- ❌ `(KF-103)` — bare blame marker, unlookable; drop it or expand it.
- ❌ Any `KF-NN` anywhere under `site/src/content/docs/**` or in the synced source docs (`docs/1-overview.md`, `docs/2-reactivity.md`, `docs/4-render.md`, `docs/8-api-reference.md`).
- ❌ "See `.hotsheet/worklist.md`" — `.hotsheet/` is local-only; never link to it in user-facing docs.

The same rule applies to commit messages — `git log` is a public-facing surface for any open-source consumer. Use `KF-NN: <short title>` shape so the title makes the commit understandable without a ticket lookup.

**Exception: ticket-to-ticket references inside Hot Sheet itself are fine.** Anyone reading a ticket already has Hot Sheet open, so bare `KF-NN` cross-references in ticket titles, details, and notes resolve trivially. The self-contained-summary rule is only about surfaces *outside* Hot Sheet where readers may not have it.

### Comparison tables on the site

Any Markdown table that compares kerf against other frameworks must follow two conventions so the table reads cleanly across the docs:

- **Wrap the table in `<div class="kerf-compare"> … </div>`.** The kerf-compare stylesheet (`site/src/styles/kerf-compare.css`, registered in `site/astro.config.mjs`'s `customCss`) gives the kerf row a slight accent-tinted background so a reader scanning the table can spot it without re-reading the labels. The detector is `tr:has(td:first-child > strong:only-child)` — i.e. the first cell renders as a single `<strong>` element — so the kerf row's first cell must be exactly `**kerf**` in the Markdown source.
- **Bold the best value in each numeric column.** Use Markdown `**…**` on whichever framework's value wins the column on the lower-is-better (or higher-is-better, depending on the metric) ordering. This is an author decision per column, not computed by CSS. The kerf row's first cell being bold (`**kerf**`) is what triggers the row highlight; bold values inside the row's data cells are independent and indicate "best in column."

If the table has no numeric columns to rank, skip the bold-best step and just wrap for the row highlight.

### Performance comparison numbers — official source is upstream krausest

Cross-framework benchmark numbers (kerf vs Lit, kerf vs React, etc.) published on the site come from the **official upstream [krausest/js-framework-benchmark](https://krausest.github.io/js-framework-benchmark/current.html)**. kerf is a merged upstream entry (`frameworks/keyed/kerfjs`), so krausest measures kerf alongside every competitor on **one reference machine in one run** — the canonical, independently-reproducible, apples-to-apples comparison. Those are the numbers we publish; do NOT paste ad-hoc local-machine numbers into the site or docs.

**Refreshing the published numbers.** Run `node bench/import-krausest.mjs`, which fetches krausest's published results, extracts the tracked frameworks' medians, and writes the git-tracked `bench/results.json` (the homepage `PerfTable.astro` imports it at build time) + `bench/results.md`. Commit both. Re-run whenever krausest republishes — most importantly after a kerf release, once krausest re-runs with the bumped `frameworks/keyed/kerfjs` version (their entry pins a published kerfjs version; a fresh kerf release warrants a follow-up upstream PR bumping that pin so the next krausest run measures current kerf). Also re-import on a reference-framework bump or ~6-month sanity check. Edit `TRACKED_DIRS` in the importer to change which frameworks appear.

**The local harness (`bench/run.sh` + `bench/aggregate-results.mjs`) is now dev-only.** Use it for "did my change move the needle?" profiling on your own machine (`bash bench/run.sh keyed/kerfjs --count=10`, then `node bench/aggregate-results.mjs > bench/results.local.md`). It reads the local M1-Pro `bench/.bench-cache/` and writes the **gitignored** `bench/results.local.{json,md}` — deliberately NOT the published `bench/results.json`, so a local run can't clobber the krausest snapshot. `bench/preflight.sh` still gates local runs for clean-machine measurement. These local numbers are for iteration signal only and must not be published.

What this means for the site:
- The homepage `PerfTable.astro` (wired to `bench/results.json`) shows the most recent committed krausest import. Re-commit only from `bench/import-krausest.mjs`.
- Per-framework migration pages (`/kerf/migrating/{react,lit,vanjs,…}/`) may cite the krausest numbers for framework pairs that krausest measures. For a pair krausest doesn't cover (e.g. Alpine), keep the §5 "Perf numbers" section a one-paragraph qualitative note ("Both frameworks are in the same performance cluster on the krausest benchmark").
- The bench-ai design doc (`docs/ai-codegen-bench-design.md`) is the separate *AI-codegen* benchmark; its leaderboard cadence is defined there and is independent of this krausest-import convention.

### Concerns → tickets, not ad-hoc fixes

When a review, hygiene scan, audit, or any in-flight investigation surfaces a concern that isn't part of the current ticket's scope, **always file a follow-up Hot Sheet ticket immediately rather than acting on it directly.** This applies to bugs, refactors, doc drift, design questions, and anything else that "I noticed while working on X." The current ticket stays focused on what was asked; everything else gets its own ticket so it can be prioritized, scheduled, and reviewed alongside the rest of the queue.

The only edits to make in-flight under another ticket are ones explicitly within that ticket's scope (e.g., the doc-summary fixes that the `/check-requirements-against-code` skill is itself defined to perform). Anything else — even a one-line README fix — gets a ticket.

Use the `hs-bug` / `hs-task` / `hs-issue` / `hs-feature` / `hs-investigation` / `hs-requirement-change` skills (or POST to the Hot Sheet API directly) to file. Reference the surfacing context in the ticket title so the link back is obvious (e.g. "Surfaced by /check-code-hygiene on YYYY-MM-DD").

### Tag a ticket `Fable` when Fable is the right model for it

When **you** create a ticket, decide which model should work it and **tag it `Fable`** whenever Fable is the better fit. The tag is the signal for dispatching the work to a Fable subagent; untagged tickets are worked normally.

Tag `Fable` when the ticket is **wide, exploratory, and search-shaped** — the work is mostly *finding* something whose location isn't known up front:

- Adversarial sweeps and audits over a large surface (the KF-380 / KF-387 interaction-matrix and seam sweeps).
- "Where else does this pattern occur?" / "what else is broken like this?" investigations.
- Cross-cutting analyses that must hold many files in view at once to draw a conclusion.
- Large mechanical migrations where the hard part is exhaustively locating every call site.

Do **not** tag `Fable` for work that is narrow and already-located: a specific bug with a known repro, a targeted fix, a doc edit, a release chore. Those are ordinary tickets — the fix is the work, not the search.

Rule of thumb: if the ticket's value is in **coverage and recall**, tag it `Fable`; if it's in **a precise change to a known place**, don't. When a sweep-style ticket files follow-up bug tickets, those follow-ups are usually *not* Fable work — the sweep already did the finding.

## Conventions

- ESM modules (`"type": "module"`).
- Import paths use `.js` extension (TypeScript convention for ESM resolution).
- No transitive deps beyond `@preact/signals-core`.
- Public API is documented in `docs/8-api-reference.md`.
- **File naming**: kebab-case / lowercase by default (`jsx-runtime.ts`, `mount.ts`). camelCase is allowed when the filename matches the primary export (`toElement.ts` → `toElement`, `utils/escapeHtml.ts` → `escapeHtml`). The principle is "filename = primary export"; do not file tickets to rename files that already match this rule.
- **American English everywhere.** Prose, code comments, JSDoc, identifiers, test names, CHANGELOG entries, and docs all use American spelling (`behavior`, `optimize`, `recognize`, `memoize`, `sanitize`, `serialize`, `normalize`, `initialize`, `color`, `gray`, `analyze`, etc. — not `behaviour` / `optimise` / `colour` / `grey` / `analyse`). When in doubt, default to the form Merriam-Webster uses. Existing public-URL slugs (e.g. example directory names) are grandfathered in — don't rename them without a dedicated ticket because they change permalinks.

## Requirements Documentation

Numbered docs in `docs/` cover the design. Reading order:

1. `1-overview.md` — what kerf is, why it exists, when to use it.
2. `2-reactivity.md` — signals primitive.
3. `3-stores.md` — composable testable stores.
4. `4-render.md` — mount, segments, the native diff, and the list reconciler.
5. `5-event-delegation.md` — Tier 1 / 2 / 3 listener model.
6. `6-jsx-runtime.md` — JSX → HTML strings, server use.
7. `7-svg.md` — namespace handling.
8. `8-api-reference.md` — every export.
9. `9-live-demo.md` — the GitHub Pages deploy of `examples/reactivity-demo`.
10. `10-migrating.md` — the `/kerf/migrating/` comparison hub (coming-from-React/Alpine/Lit/vanjs pages).
11. `11-dev-warnings.md` — the opt-in `KERF_DEV_WARN_*` env-gated dev-warn family (rebuilt listeners, untracked signals, narrow store sets, delegate-in-effect, each-in-morph-skip, duplicate keys, value-only re-renders, stale bindings, list rebinds) and the rules each new warning must follow.
12. `12-ai-assistant-configs.md` — how the drop-in Claude Code skill + Cursor rules ship inside the npm package, the canonical-file version + marker contract, and the `kerfjs/ai-assistant-configs` ESLint rule.
13. `13-component-packages.md` — building and publishing reusable kerf components as npm packages (no-instance model, per-instance state via factories, event/cleanup patterns, `kerfjs`-as-peer-dependency packaging).
14. `14-feature-coverage.md` — the feature/behavior coverage axis (orthogonal to line coverage): a per-behavior index mapping each behavior — especially reconciler *state transitions* — to the test that guards it, enforced by `scripts/check-feature-coverage.mjs` (`npm run check:features`).
15. `15-no-build-example.md` — the no-build example app (`live-poll`): served-as-source (importmap + `html` tagged template, zero tooling), the vendor-copy contract shared by all three example build scripts (`site/scripts/lib/copy-no-build-app.mjs`), and its test/capture surfaces.
16. `16-list-identity.md` — **shipped**: why an `each()` list's identity (its call-order index) is not stable, what the source guard already fixes vs. what it doesn't, the five verified constraints any scheme must survive, and the explicit-key + diagnostic recommendation.

**Keep every surface up to date — proactively, without being asked.** Any change to source, API, behavior, or examples must be reflected across all affected surfaces in the same diff. Do not wait for a follow-up prompt. The full checklist:

| Surface | What triggers an update |
| --- | --- |
| `tests/unit/` or `tests/integration/` | Any new behavior, overload, edge case, or option added to `src/` |
| `site/src/examples/complete/*/main.tsx` | Any new idiomatic pattern or API shape that the examples should demonstrate |
| `docs/5-*.md` … `docs/8-api-reference.md` | Any API addition, removal, signature change, or behavioral change |
| `CHANGELOG.md` (Unreleased section) | Every user-visible change |
| `docs/ai/code-summary.md` | Any new/renamed/removed file, export, or architectural fact |
| `docs/ai/usage-guide.md` | Any API addition, signature change, or new pattern |
| `kerf.cursorrules` + `kerf.claude-skill.md` | Any API addition, signature change, canonical pattern update, or new common-error row — then run `npm run ai-bundle:sync` and bump `kerf-skill-version` per the rubric in §12.3.2 |
| `eslint-plugin/docs/rules/*.md` | Any change that affects what the lint rules flag or how users fix violations |
| Run `node site/scripts/sync-docs.mjs` | After editing any `docs/*.md` that the site syncs |

### AI summaries (`docs/ai/`)

- `docs/ai/code-summary.md` — directory tree, public exports, where-to-find-X reverse index.
- `docs/ai/requirements-summary.md` — synthesized view of every numbered doc with status markers.
- `docs/ai/usage-guide.md` — consumer-facing cheat sheet for AI assistants writing apps *with* kerf (when to recommend it, public API at a glance, hard rules, common errors → fixes). Keep in sync with `docs/8-api-reference.md`.

Update all three whenever the corresponding source / design changes. The repo-root [`llms.txt`](../llms.txt) is the AI-discovery entry point and indexes the docs above — update it when the doc set changes.

### Drop-in AI-tool config

Two pre-baked config files at the repo root that condense `docs/ai/usage-guide.md` into the format each tool expects:

- `kerf.cursorrules` — copy into a project as `.cursorrules`; Cursor picks it up automatically.
- `kerf.claude-skill.md` — copy into `~/.claude/skills/kerf-app/SKILL.md` (or `your-project/.claude/skills/kerf-app/SKILL.md`); Claude Code activates the skill whenever it spots a `kerfjs` import.

Both mirror the hard rules + canonical patterns + common errors from the AI usage guide.

These root files are the **source of truth**. A `npm install kerfjs` lands generated mirrors at `node_modules/kerfjs/ai/skill.md` and `node_modules/kerfjs/ai/cursorrules` (plus an `ai/manifest.json` with per-file `kerf-skill-version` + sha256 — the version that the upcoming `kerfjs/ai-assistant-configs` ESLint rule reads to detect drift). The bundling, the canonical-file contract (version line + `KERF-APP-CANONICAL-END` marker), and the eslint rule are all designed together in [`docs/12-ai-assistant-configs.md`](docs/12-ai-assistant-configs.md).

**Editing workflow.** Only edit the root files. After any change, run `npm run ai-bundle:sync` to regenerate `ai/skill.md` / `ai/cursorrules` / `ai/manifest.json`, then commit the regenerated mirror alongside your edit. `npm run check` runs `check:ai-bundle-in-sync` (`scripts/check-ai-bundle.mjs`) which fails the pre-commit gate if you forgot.

**Versioning the canonical content.** Each root file has a `kerf-skill-version: <semver>` line — inside the YAML frontmatter for `kerf.claude-skill.md`, inside a top-of-file HTML comment for `kerf.cursorrules`. Bump this version whenever the canonical content changes in a way a consumer would benefit from re-syncing (hard-rule additions/renumberings, new canonical patterns, API-surface changes, new common-error rows). Skip bumps for typos, grammar, and comment-only changes. See §12.3.2 of the doc for the full rubric.

**The marker.** The last line of each root file's canonical content is `<!-- KERF-APP-CANONICAL-END · your customizations below -->`. Don't restyle or rephrase it — the eslint rule's parser is a strict-text match. Add or remove content above the marker; the consumer's append zone lives below it in *their* installed copy.

## Releasing

```bash
npm run release        # interactive: bumps version, updates changelog, tags v{ver}, pushes
npm run release:beta   # tag-only: tags v{ver}-beta.{N}, publishes with --tag beta
```

The release scripts mirror Hot Sheet's flow. Beta releases skip the version-file bump and changelog write — CI bumps the version ephemerally at publish time.

<!-- hotsheet:begin section=ticket-driven-work v=1 -->
## Ticket-Driven Work

When the user gives you work directly (not via the Hot Sheet channel or events), create Hot Sheet tickets before starting implementation — especially for substantial or multi-step work.

- **Do create tickets** for: features, bug fixes, refactoring, multi-step tasks, anything changing code. **Don't** for: simple questions, git commits, quick lookups, trivial one-liners. **When in doubt, create them.**
- Create via the Hot Sheet API (prefer the `hotsheet_*` MCP tools), mark Up Next, then work through them: set status `started` → implement → set `completed` with notes.
- **Always create follow-up tickets** for incomplete work (unfinished steps, open design questions, known gaps, designed-but-unbuilt features). If it's not in a ticket, it's forgotten.
- **Incomplete-work checklist** — before marking a ticket `completed`, file follow-ups for any: (1) UI placeholder text ("coming soon"), (2) TODO/FIXME comments, (3) documented-but-unimplemented requirements, (4) empty/stub functions returning mock data.
- **Use FEEDBACK NEEDED before deferring or asking about follow-ups.** When about to (a) defer a ticket needing more work, (b) ask whether to file follow-ups, or (c) close with a question buried in notes — DON'T. Leave the ticket `started`, add a `FEEDBACK NEEDED:` note (per `.hotsheet/worklist.md`), signal channel done, and wait. It's the only reliable way to surface a question.
<!-- hotsheet:end section=ticket-driven-work -->

<!-- hotsheet:begin section=testing-philosophy v=2 -->
## Testing Philosophy

- **Double coverage**: every feature covered by both unit tests AND E2E tests. Unit = logic in isolation; E2E = real user flows through the running app with minimal mocking.
- **Unit tests**: Mock external deps (filesystem, network), test real logic.
- **E2E tests**: As much as possible, use test automation tools to run realistic, user-facing flows. Minimize mocks.
- **Coverage**: Merge all test coverage (e.g. unit, E2E server, E2E browser) into one report. Low-coverage files should get more of both test types. Aim for 100% coverage of code lines, 100% coverage of branches, and 100% of features described in the requirements documentation.
- **Coverage is a floor, not a ceiling**: 100% line/branch coverage shows every line *ran*, not that every *behavior* — or every *sequence* of behaviors — is *asserted*. It is structurally blind to a **missing state transition**: a bug living in an untested interaction sails through a green 100% report because the individual lines still get hit by isolated, single-operation tests.
- **Transition-matrix testing for stateful modules**: for anything with modes / multiple code paths / a cache / a state machine, enumerate the states AND the transitions between them, then write tests that walk realistic multi-step sequences crossing state boundaries — not just each operation from a clean initial state.
- **Adversarial pass on stateful changes**: when adding or altering a stateful code path, deliberately try to break it with out-of-order / interleaved / repeated / empty-then-refill sequences; pin any that would have failed as permanent regression tests.
- **Manual test plan**: keep a manual test plan doc (e.g. `docs/manual-test-plan.md`) for features that can't be reliably automated. **Keep it up to date** — add such features there; when you add automated coverage for a previously-manual item, remove it and note it in an "Automated Coverage Summary".
- **Always fix lint and type errors before finishing**: Fix as you go, don't batch.

<!-- hotsheet:begin specifics=testing-philosophy v=1 -->
### This project's test setup

Fully documented in the **Testing** section above; in brief:

- **Unit** (`tests/unit/`): vitest + `happy-dom`. Use `clearStoreRegistry` from `kerfjs/testing` for store isolation.
- **Integration** (`tests/integration/`): vitest, full pipeline (signals + stores + mount + delegate) against a real DOM.
- **Browser / E2E** (`tests/browser/`): Playwright across Chromium / Firefox / WebKit; builds `dist/` first. Covers the consumer-app and example-apps specs.
- **Dist regression** (`tests/dist/`): targeted suite + the `.d.ts` typing gate against built `dist/`.
- **Commands**: `npm run check` (pre-commit gate) and `npm run check:full` (pre-push, adds Playwright) run everything; see the **Testing** section for the granular `test:*` scripts and the coverage thresholds.
<!-- hotsheet:end specifics=testing-philosophy -->
<!-- hotsheet:end section=testing-philosophy -->

<!-- hotsheet:begin section=requirements-documentation v=1 -->
## Requirements Documentation

Keep human-readable requirements documents as the source of truth for what the project does, and **keep them up to date in the same change as the code** (add/remove/modify a requirement → update its doc). Create new docs for major new functional areas. Cross-reference related docs with relative links.

### AI Summaries

Maintain two synthesis docs an AI assistant reads at the start of a fresh session — keep them in sync with reality (source doc/code wins on conflict), and prefer small targeted edits over rewrites:

- A **codebase map** — directory tree, entry points, data schema, build, tests, settings, and a "where do I look for X" index. Update it in the same change when you add a file or directory, add a route/endpoint, change the schema, add a client module, or add a setting key.
- A **requirements summary** — a synthesized view of every requirements doc with status markers (e.g. Shipped / Partial / Design only / Deferred). Update it in the same change when you add a requirements doc, ship a design-only feature, or defer/regress a shipped one.

<!-- hotsheet:begin specifics=requirements-documentation v=1 -->
### This project's docs layout

Fully documented in the **Requirements Documentation** section above; in brief:

- **Requirements docs**: numbered, kebab-case, in `docs/` (`docs/1-overview.md` … `docs/11-dev-warnings.md`). New contributors start with `docs/orientation.md`.
- **Codebase map**: `docs/ai/code-summary.md`.
- **Requirements summary**: `docs/ai/requirements-summary.md`.
- **Consumer-facing AI cheat sheet**: `docs/ai/usage-guide.md`.

Keep all three `docs/ai/` summaries in sync whenever source or design changes — see the surface checklist above.
<!-- hotsheet:end specifics=requirements-documentation -->
<!-- hotsheet:end section=requirements-documentation -->
