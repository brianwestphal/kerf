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
│   ├── store.ts                  ← defineStore + resetAllStores + REGISTRY. Dev-only: `get()` returns a deep read-only Proxy (via `utils/devReadonly.ts`, gated by `utils/devMode.ts`); `set()` unwraps any get()-derived proxies with `toRaw` so the signal stores plain objects. Prod returns the bare reference.
│   ├── mount.ts                  ← mount() — segment-aware render bound to effect(); adopts an inert-document rootEl (defaultView === null) into the live document before first render (KF-243 defense-in-depth for the KF-240 WebKit inert-doc parse bug)
│   ├── morph.ts                  ← native general-purpose DOM reconciler (replaces morphdom); exported publicly as morph() (KF-150). Binding-marker aware: its child pairing steps past the wiring-inserted text node a `kfb:`/`kfbr:` marker owns (via bindings.ts `boundTextNodeOf`), so a bound hole mixed with static text siblings survives a morph (KF-374 — the static sibling used to be dropped)
│   ├── segment.ts                ← Segment types (static/list/mixed) + flatten helpers
│   ├── each.ts                   ← each() — keyed list iteration with per-item memo
│   ├── html.ts                   ← KF-333 — `html` tagged template at the kerfjs/html subpath (no-build authoring path for CDN/importmap consumers). Thin front-end over the exact JSX machinery: text holes via jsx-runtime's `_toSegment` (escaping, SafeHtml/each() list-segment passthrough, signal → bindText), attr holes via `_assertEmittableAttrName` + `bindAttr` (signals, grouped into one marker attr per element at the tag-close `>`) or `_renderAttrVerbatim` (statics — NO camelCase aliasing; authors write real HTML names). Parse-once-per-callsite via a WeakMap keyed on the template strings array; `_parseCount()` test hook. mount/morph/reconcilers unchanged.
│   ├── bindings.ts               ← KF-294 — fine-grained signal bindings. A `Signal` handed straight into a JSX attr (`class={sig}`) or text hole (`{sig}`) inside a mount() emits a marker instead of stringifying; a wiring pass attaches one effect per hole after parse so the node updates without a render re-run. TWO scopes with disjoint marker namespaces: GLOBAL holes (`data-kfb` / `<!--kfb:id-->`) wired by wireBindings() over the mount root; ROW holes inside each() (`data-kfbrow` / `<!--kfbr:id-->`, row-local ids) captured by captureRowBindings(), wired/disposed by BOTH reconcile paths at each row node's create/remove (snapshot: buildFreshNodes/removeOldNodes; granular: applyInsert/remove/update) — so select-row updates fire only the ~2 changed effects (no render, no reconcile). SSR/toString snapshots the value. Optimized wiring: root-attr holes resolved allocation-free (no querySelectorAll/Map for the common `<tr class={sig}>` row). KF-347: `carryOrRewireRowBindings` — the carry-vs-rewire decision for rows whose node survives an in-place update (granular reuseBound + inplace updateRowInPlace, incl. the html-identical no-op arms): same signal instances per hole → carry for free; any changed instance → dispose + re-wire against the surviving node, so self-reading holes update after arraySignal.update(); text-hole wiring reuses the marker's inserted text node (WeakMap) so a rewire never stacks a duplicate. RESERVED NAMESPACE (KF-314): the wiring pass matches markers by id across the subtree with no ownership check, so `data-kfb`/`data-kfbrow` + comments beginning `kfb:`/`kfbr:`/`kf-list:` are a reserved consumer contract — a consumer that emits one can collide with a real binding's id and steal its effect; documented in docs/2-reactivity.md and pinned by a marker-constant test. SECURITY (KF-322 completes KF-306): the bound path's attr NAME is trusted at write time — `on*` and malformed attribute names are rejected at binding registration in jsx-runtime's `jsx()` signal branch via the shared `assertEmittableAttrName` (the same helper renderAttr uses for static attrs), so a signal bound to `onclick` can never reach `setBoundAttr`→`setAttribute('onclick', …)` and install a live inline handler.
│   ├── list-render-state.ts      ← KF-336 reified dispatch state machine — ListRenderState (unbound/empty/bound), deriveListRenderState(count), decideListPath() with the documented transition table (first-render/empty-binding/no-patches/replace/count-drift → snapshot; else granular; cachekey-drift + render-threw layered on in each.ts). Pure + directly unit-tested, incl. the previously-c8-ignored count-drift arm
│   ├── list-reconcile.ts         ← top-level dispatcher (KF-112) — re-exports BoundItem / ListBinding / endAnchor and defines reconcileList; its non-empty-binding granular precondition is the DOM-side restatement of list-render-state's `bound` state
│   ├── list-binding.ts           ← BoundItem / ListBinding shape + endAnchor() (KF-116) — extracted to break the circular import between list-reconcile.ts and its sibling reconcilers
│   ├── list-reconcile-snapshot.ts ← snapshot reconcile path (classify / bulk-parse / LIS / move)
│   ├── list-reconcile-inplace.ts ← snapshot fast path: when refs are unchanged in order, morph changed rows in place (reusing the granular surgical/morph ladder) instead of node-replacing them — avoids table relayout for external-state-driven row changes
│   ├── list-reconcile-granular.ts ← granular reconcile path (KF-92 patch-driven, KF-93/94 bulk parse)
│   ├── list-reconcile-fast-paths.ts ← KF-198 attribute-only + KF-206 text-content-only fast paths for the granular update path
│   ├── list-reconcile-focus.ts   ← focus snapshot/restore around the move pass (engine-quirk fix)
│   ├── attrSelector.ts           ← attr / AttrSpec<N,V> — two overloads: static attr(name,value)→AttrSpec (with .attrs spreadable JSX object), dynamic attr(name)→factory; cssEscapeIdent + escapeCSSString internals
│   ├── delegate.ts               ← delegate<T> + delegateCapture<T> (generic element type for handler arg) + DelegateOptions; BOTH helpers default to closest()-style walk-up matching and pass the matched ancestor — delegateCapture unified onto closest() (BREAKING; opt into old direct-match via { match: 'direct' }); shared makeListener() applies match mode + rootEl.contains() guard; calls warnIfInsideEffect() at the top of both helpers when KF-238's gate is on
│   ├── dev-delegate-warn.ts      ← KF-238 — opt-in dev warn when `delegate()` / `delegateCapture()` is called inside an `effect()` body (each effect re-run installs a fresh listener; effect disposer cleans only the subscription). `reactive.ts`'s `effect()` wrap increments/decrements a depth counter when the gate is on; `delegate.ts` checks it. Opt-in via `KERF_DEV_WARN_DELEGATE_IN_EFFECT=1` in dev; production unchanged.
│   ├── dev-each-warn.ts          ← KERF_DEV_WARN_DUPLICATE_EACH_KEYS + KERF_DEV_WARN_EACH_IN_MORPH_SKIP opt-in warnings
│   ├── dev-rerender-warn.ts      ← KF-345 — opt-in dev warn (`KERF_DEV_WARN_VALUE_ONLY_RERENDER=1`) when a surrounds-CHANGED re-render's diff is confined to text/attr values (lockstep template-parse tree compare; conservative — any shape/comment change bails structural): every changed hole could be a fine-grained binding. One-shot per mount (per-mount ctx from `mount()`); parse runs only when opted in, on the already-slow changed path.
│   ├── dev-binding-warn.ts       ← KF-338 — opt-in dev warn when a fine-grained GLOBAL binding switches signal instance on `mount()`'s byte-equal-surrounds fast path (`class={cond ? sigA : sigB}`): the effect isn't re-wired so the hole silently goes stale. `mount()` retains the wired binding list (gated on the opt-in) and calls `maybeWarnStaleBinding` on the fast path; per-hole one-shot dedup. Opt-in via `KERF_DEV_WARN_STALE_BINDING=1` in dev; production unchanged.
│   ├── toElement.ts              ← SVG-aware JSX-to-DOM; adopts the result into the live `document` (KF-240) so inert-template/DOMParser-document nodes aren't returned (WebKit mis-parses innerHTML on inert-doc elements under bursts)
│   └── utils/
│       ├── devMode.ts            ← KF-334 shared dev-mode gate `isDevMode()`. Precedence: `globalThis.KERF_DEV` boolean override (read lazily, wins) → else `process.env.NODE_ENV !== 'production'`. Routes every dev-only path (store get() read-only guard, rowContract row-key warn, the KERF_DEV_WARN_* opt-in family). Lets no-bundler/CDN consumers (no `process`) opt out of dev-ON with `globalThis.KERF_DEV = false` before mount; keeps the NODE_ENV branch so bundlers still DCE dev paths.
│       ├── devReadonly.ts        ← KF-341 dev-only deep read-only Proxy for defineStore's `get()` snapshot. `devReadonlyProxy(obj)` throws a Rule-8 `TypeError` on set/delete/defineProperty and lazily wraps nested plain objects/arrays (deep, O(1)/access, no clone); reads (spread/JSON/keys/iteration/instanceof) are transparent. `toRaw(value)` deep-unwraps (structural-sharing) so a `set({ ...get() })`-derived object is stored plain — the internal signal never holds a Proxy. Never freezes the live object.
│       ├── escapeHtml.ts         ← used by jsx-runtime
│       ├── jsx-attr-aliases.ts   ← camelCase → HTML/SVG attribute name table (KF-21)
│       ├── rowContract.ts        ← KF-103 row-contract helpers — ROW_HTML_SNIPPET_MAX, parseRowTemplate, parseSingleRow, collectTemplateChildren, rowContractError, truncateRowHtml (dev-mode row-key warn gated via utils/devMode.ts). parseSingleRow/collectTemplateChildren are the shared single-row-parse + template-children-capture helpers deduped out of the granular/in-place reconcilers
│       ├── syncFormProp.ts       ← KF-335 form-state property sync (checked/value/selected follow a MUTATED attribute; dirty-flag detachment fix) — called by morph.ts's morphAttributes and bindings.ts's setBoundAttr only at actual attribute mutation, so uncontrolled usage stays untouched; focused elements keep the in-progress edit
│       ├── templateParse.ts      ← KF-333 — static-parts state machine for `html\`\`` (text/tag/comment modes + quote state). Classifies each hole as text or complete-attribute-value; tag-name / attr-name / partial-value / in-comment holes THROW with actionable messages; records per-chunk tag-close offsets for bound-attr marker injection
│       └── urlScreen.ts          ← KF-297 shared URL-attr screening (isDangerousUrlValue / dangerousUrlWarning / reportDangerousUrl) used by BOTH jsx-runtime's renderAttr (static attrs) and bindings' setBoundAttr (bound attrs) — scheme-based: drops javascript:/vbscript: + script-executing data: subtypes (text/html, image/svg+xml, xml; inert media allowlisted) on href/src/formaction/action/xlink:href/data(<object>); normalizes control-char/whitespace scheme obfuscation before matching; raw() opts out. KF-340: reportDangerousUrl THROWS in dev (isDevMode()), console.warns + drops in prod (byte-identical) — the drop happens in both modes, only the reporting differs
├── tests/
│   ├── conventions.test.ts       ← KF-286 — API-surface + no-default-export + row-contract invariants (the in-suite complement to check-doc-api-coverage.mjs / check-feature-coverage.mjs); pins facts line coverage can't express
│   ├── unit/
│   │   ├── array-signal.test.ts
│   │   ├── audit-gap-coverage.test.tsx     ← regression-net for v8-only branches found via coverage gaps
│   │   ├── delegate.test.ts
│   │   ├── attr.test.ts
│   │   ├── dev-delegate-warn.internal.test.ts ← KF-238 — opt-in `KERF_DEV_WARN_DELEGATE_IN_EFFECT=1` dev-mode warning when `delegate()` / `delegateCapture()` is called inside an `effect()` body; covers depth tracking, throw-still-decrements, env-var gate off, production-mode short-circuit, nested effects, one-shot dedup. `.internal.test.ts` so dist-full excludes it.
│   │   ├── dev-each-warn.internal.test.ts ← opt-in `KERF_DEV_WARN_EACH_IN_MORPH_SKIP=1` (each() inside data-morph-skip) and `KERF_DEV_WARN_DUPLICATE_EACH_KEYS=1` (duplicate cacheKey values) warnings; covers env-var gates, dedup, production-mode short-circuit.
│   │   ├── dev-binding-warn.internal.test.ts ← KF-338 — opt-in `KERF_DEV_WARN_STALE_BINDING=1` dev-mode warning when a fine-grained binding switches signal instance on the byte-equal-surrounds fast path; covers attr + text holes, same-instance no-warn, env-var gate off, production short-circuit, per-hole one-shot dedup, and wiring-path retention across a surrounds-changed render. `.internal.test.ts` so dist-full excludes it.
│   │   ├── dev-listener-warn.internal.test.ts ← KF-174 — opt-in `KERF_DEV_WARN_REBUILT_LISTENERS=1` dev-mode MutationObserver-based warning when a node carrying an imperative `addEventListener` listener is removed/rebuilt by the morph; covers the env-var gates, the descendant walk, and the helper-level rowContract `maybeWarnMissingRowKey` branches. `*.internal.test.ts` so dist-full excludes it (the test imports the `_resetWarnedForTests` helper which is not in the public dist barrel).
│   │   ├── dev-store-warn.internal.test.ts ← KF-212 — opt-in `KERF_DEV_WARN_NARROW_SET=1` dev-mode warning when `defineStore.set(next)` has any key from the current state missing in `next`; covers opt-out (env var unset / =0 / production), opt-in (warns once, names missing keys), per-store dedup, same-count-different-keys, array-skip, null-skip, primitive-skip, the `_resetWarnContext` test helper, and (KF-334) that a `globalThis.KERF_DEV` override gates the warning both ways. `*.internal.test.ts` so dist-full excludes it.
│   │   ├── devMode.internal.test.ts ← KF-334 — the shared `isDevMode()` gate: NODE_ENV default (test/dev true, production false, no-`process` CDN consumer true), `globalThis.KERF_DEV` boolean override precedence (false forces prod, true forces dev, non-boolean ignored), and the laziness contract (override read at call time, not memoized at import). `*.internal.test.ts` so dist-full excludes it.
│   │   ├── bindings.internal.test.ts ← KF-347 direct coverage of carryOrRewireRowBindings' argument-shape matrix (both-undefined carry, defensive undefined arms, exact carry-through of the disposer array). `*.internal.test.ts` so dist-full excludes it.
│   │   ├── dev-rerender-warn.internal.test.ts ← KF-345 — opt-in `KERF_DEV_WARN_VALUE_ONLY_RERENDER=1` value-only re-render warning: gate matrix (default-off, KERF_DEV override), end-to-end mount wiring (text/attr/boolean-attr value changes warn; structural + mixed changes stay silent), per-mount one-shot dedup, independent mounts, and the `_isValueOnlyDiff` branch matrix. `*.internal.test.ts` so dist-full excludes it.
│   │   ├── devReadonly.internal.test.ts ← KF-341 dev deep read-only guard helpers: `devReadonlyProxy` wraps null-proto/nested objects + is idempotent/identity-stable; `toRaw` passes primitives/exotics through, unwraps a proxy to its raw, and deep-unwraps a spread-built object preserving structural sharing. `*.internal.test.ts` so dist-full excludes it.
│   │   ├── demo-configs.test.ts ← guards the animated demo-capture configs + committed SVGs under site/scripts/demo-captures/ + site/public/demos/: every frame must use an explicit `cut` or `magic-move` transition (never domotion's silent crossfade default — the full-screen flash), every committed SVG must keep `step-end` on its fv-N opacity tracks (no last-frame fade-out; domotion ≥ 0.18.0 emits `step-end` natively through SVGO, so the old fix-cut-timing post-pass is gone), and — KF-330 follow-up: a config shipped without running its capture 404'd on the site — every config's `output` SVG must be committed, every committed SVG must have a config (no orphans), and every `/demos/*.svg` reference in site/src must resolve to a committed file
│   │   ├── dist-full-config.test.ts ← KF-344 — unit-tests the `srcToDistPlugin` resolver from `vitest.config.dist-full.ts`: pins that a top-level `src/utils/*` (plus bare `utils` and nested `.../utils/*`) import throws the loud "refused to remap private helper" error, and that non-source imports pass through. Guards against the regressed `.includes('/utils/')` check that never matched the leading-slash-free, `src/`-relative `moduleName`.
│   │   ├── diagnostic-error-audit.test.tsx ← KF-169 — one test per Hard Rule pinning the runtime behavior callers see on violation (introduced when the `/ai-evidence/diagnostics/` page existed; that page was removed in KF-211 but the runtime contract these tests pin still matters as a UX gate)
│   │   ├── form-state-sync.internal.test.ts ← KF-335 direct unit tests for the private syncFormProp helper (internal → excluded from dist-full)
│   │   ├── list-render-state.internal.test.ts ← KF-336 direct coverage of the reified dispatch state machine's transition table, incl. the count-drift arm unreachable through mount()
│   │   ├── form-state-sync.test.ts ← KF-335 public-surface coverage for the morph/binding form-prop sync call sites (diverged-property simulation; the truthful dirty-flag behavior is browser-tested)
│   │   ├── morph.internal.test.ts
│   │   ├── doc-contract-coverage.test.tsx  ← KF-104 — comprehensive contract suite covering every doc-asserted behavior
│   │   ├── bindings.test.ts
│   │   ├── each.test.ts
│   │   ├── edge-case-coverage.test.tsx     ← adversarial probes for mount-lifecycle / shape-transitions / focus-on-granular-path / fast-path corners / 1000-row stress
│   │   ├── html.test.ts ← KF-333 — `kerfjs/html` tagged template: JSX semantic parity (text + attr holes), hole-contract errors, fine-grained signal bindings under mount, each() composition (snapshot + granular), SSR snapshots, parse cache
│   │   ├── jsx-runtime.test.ts
│   │   ├── jsx-types.test.tsx
│   │   ├── kf102-each-after-transition.test.tsx ← KF-102 round 2 — each() reconcile after sibling-introduction transitions
│   │   ├── kf377-conditional-sibling-before-each.test.tsx ← KF-377 — removing a conditional sibling before a keyed list must not empty it: morph positional-lookahead preservation (direct/nested shapes, '' + null branches, trailing conditional, arraySignal granular-after-toggle) + the stale-binding self-heal on a container rebuild
│   │   ├── list-reconcile-inplace.test.ts ← snapshot in-place content-update fast path: same-refs-in-order updates morph in place (node identity preserved, no parse) vs replaceChild on tag change; bail cases (length change, reorder, empty/clear, moved+changed) and the row-contract throw
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
│   │   ├── example-apps.spec.ts        ← KF-165 — one smoke spec per `site/src/examples/complete/<name>/` app (all nine: kanban / markdown-editor / chat / todomvc / dashboard / cart-htmx / counter-store / row-selector / live-poll). Kanban drag spec is the regression gate for KF-163 (no visual feedback during drag) and KF-165 (delegateCapture matches() vs. delegate() closest() — pointerdown on `.card-text` missed `.card` until the example switched to `delegate()`).
│   │   ├── global-setup.mjs            ← rebuilds `tests/dist/consumer-app/dist/main.js` AND `tests/dist/example-apps/<name>/` before the suite (skipped per-build via `KERF_SKIP_CONSUMER_BUILD=1` / `KERF_SKIP_EXAMPLE_APPS_BUILD=1`)
│   │   ├── html-tag.spec.ts            ← KF-333 — `kerfjs/html` no-build fixture: dist/html.js via importmap, mount + fine-grained signal updates + each() keyed reconcile across the three engines
│   │   ├── ime-composition.spec.ts     ← IME composition survives a re-render
│   │   ├── mutation-count.spec.ts      ← LIS-based reorder produces the minimum insertBefore count
│   │   ├── perf-1k.spec.ts             ← 1k-row stress (real-browser sanity check on the bench app)
│   │   ├── form-state-sync.spec.ts     ← KF-335 dirty-flag regression suite: controlled checked/value/selected recover after user interaction, uncontrolled + focused preservation guards (chromium/firefox/webkit)
│   │   ├── stateful-attrs.spec.ts      ← `<details open>` / `<dialog open>` user-agent-owned attribute survival
│   │   ├── svg-mathml.spec.ts          ← KF-83 — SVG/MathML namespacing across real browsers
│   │   ├── toelement-adopt.spec.ts     ← KF-240 — toElement() returns live-document nodes (ownerDocument === document, every shape) + mount-before-insert burst across Chromium/Firefox/WebKit
│   │   └── trusted-html-bridges.spec.ts ← KF-305/313/316 — the raw HTML/SVG→DOM bridges are trusted-input only: toElement() HTML-string <script> is inert, SVG <script> survives the parse, and <iframe srcdoc> executes (real-browser trust boundary across Chromium/Firefox/WebKit)
│   └── dist/                     ← run via `npm run test:dist`, against the built bundles
│       ├── barrel-completeness.test.ts    ← KF-24 — pins the public-API list
│       ├── consumer-app/                  ← KF-123 — esbuild-bundled downstream-style app; main.tsx exercises every public primitive (counter/store/each/arraySignal/delegateCapture/focus/morph-skip/SVG/Fragment/declaration-merged custom element). Driven by `tests/browser/consumer-app.spec.ts`
│       ├── example-apps/                  ← KF-165 — Vite-bundled `site/src/examples/complete/<name>/` apps re-emitted with `base: './'` so the Playwright webServer can serve them at `/tests/dist/example-apps/<name>/`. Driven by `tests/browser/example-apps.spec.ts`
│       │   └── build.mjs                  ← one Vite build per app; called from `tests/browser/global-setup.mjs`
│       ├── jsx-typing/                    ← KF-123 — `tsc -p tests/dist/jsx-typing/tsconfig.json` (the native TS 7 `tsc` via the `typescript7` alias) typechecks consumer .tsx against `dist/jsx-runtime.d.ts` to catch IntrinsicElements self-shadow / declaration-merging regressions; gated by `npm run check`
│       ├── safe-html-cross-bundle.test.ts ← KF-14 regression
│       └── store-registry-shared.test.ts  ← KF-15 regression
├── examples/
│   └── reactivity-demo/          ← 9-section live demo (port of Hot Sheet's /_demo/reactivity)
├── bench/
│   ├── kerfjs-impl/              ← PR-ready entry for krausest/js-framework-benchmark
│   ├── setup.sh                  ← clones the upstream harness into .bench-cache/
│   ├── preflight.sh              ← KF-139 — system-busy pre-check (sourced by run.sh; `--force` / `KERF_BENCH_FORCE=1` to skip)
│   ├── run.sh                    ← runs the benchmark against kerfjs + reference frameworks
│   ├── results.sh                ← aggregates results into the viewer (CHANGELOG perf numbers come from here)
│   ├── import-krausest.mjs       ← KF-291 — PUBLISHED-numbers source: fetches the official upstream krausest results (kerf is a merged entry at frameworks/keyed/kerfjs) and writes git-tracked `results.json` + `results.md`. Run `node bench/import-krausest.mjs` + commit to refresh.
│   ├── aggregate-results.mjs     ← KF-138 / KF-291 — DEV-ONLY now: tabulates the LOCAL M1-Pro cache into the gitignored `results.local.{md,json}` (won't clobber the published krausest snapshot). Not the site source.
│   ├── results.json              ← KF-138 / KF-291 — in-repo snapshot tracked in git (from import-krausest.mjs); the Pages build has no network so this IS the source of truth at site-build time
│   ├── results.md                ← markdown tables (from import-krausest.mjs) consumed by docs
│   └── results-table.mjs         ← helper for the perf-comparison renderer
├── site/                         ← Astro + Starlight marketing/docs site, deployed to /kerf/ on GitHub Pages. `site/src/examples/complete/<name>/` holds the nine complete example apps — eight Vite-built .tsx apps plus the no-build `live-poll` (plain main.js + importmap, copied verbatim with a vendored dist by `site/scripts/lib/copy-no-build-app.mjs`; design in docs/15). `site/scripts/demo-captures/pages/<name>/` holds STATIC capture pages (not apps) rendered to animated SVGs by the same domotion machinery — `architecture` (the docs' architecture diagram, embedded in docs/1 §1.5) and `getting-started` (the end-to-end editor→terminal→browser coding session on /kerf/getting-started/ + the README); listed in capture-demos.sh PAGES. `site/src/content/docs/getting-started.md` is the Start-here landing page (hero "Get started" points at it)
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
│   ├── 13-component-packages.md   ← KF-254 — guide to building/publishing reusable kerf components as npm packages (no-instance model, per-instance state via factories, event/cleanup patterns, kerfjs-as-peer-dependency packaging modeled on eslint-plugin-kerfjs)
│   ├── 14-feature-coverage.md     ← KF-284 — feature/behavior coverage axis (orthogonal to line coverage): per-behavior index mapping each behavior (esp. reconciler state transitions) → its guarding test; enforced by scripts/check-feature-coverage.mjs (npm run check:features)
│   ├── 15-no-build-example.md     ← the no-build example app (live-poll): served-as-source (importmap + html tagged template, zero tooling), the vendor-copy contract (site/scripts/lib/copy-no-build-app.mjs shared by the three example build scripts), and its test/capture surfaces
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
│   ├── check-feature-coverage.mjs ← KF-284/286/289 — parses the feature index in docs/14-feature-coverage.md and fails if any behavior row's guarding test (file + title) no longer resolves; ALSO fails if any public value export (src/index.ts + src/array-signal.ts, minus type-only + EXPORT_EXEMPT) has no index row (export-representation completeness). The behavior/transition coverage axis line coverage can't express. Wired into `npm run check` (`npm run check:features`)
│   ├── check-doc-api-signatures.mjs ← KF-343 — parses the emitted dist/*.d.ts export inventory (names + overload signatures, following local re-export chunks) and verifies each public FUNCTION export's signature shown in docs/8-api-reference.md matches the .d.ts truth. Matching rule: parameter names + arity + return type per overload; param/return types compared only when the doc commits to a non-function/non-object type (docs may simplify bare params and object-literal returns); doc may omit trailing OPTIONAL params (e.g. morph's internal `ownedItems?`); every .d.ts overload must be documented (catches a dropped overload). Class members are out of scope (SafeHtml/ArraySignal reference internal types). Needs dist built first — wired into `npm run check` right after `npm run build`; standalone `npm run check:docs:api-signatures` builds then checks
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
├── eslint-plugin/                ← KF-214 — `eslint-plugin-kerfjs` sub-package (own package.json + node_modules, published separately). Eight AST-only rules — `no-inline-jsx-event-handlers` / `require-data-key-in-each` / `no-nested-mount` / `prefer-module-jsx-augmentation` at error, plus `require-delegate-disposer` / `prefer-attr-selector` / `no-raw-with-dynamic-arg` / `ai-assistant-configs` at warn — paired with the dev-warn family in `src/dev-*.ts` to enforce the hard rules at edit time. Tests via `npm test` in that directory (`node --test` + ESLint `RuleTester` + `@typescript-eslint/parser`). Ignored by the root `eslint.config.js`.
├── create-kerf-component/        ← KF-255 — `create-kerf-component` initializer sub-package (own package.json + package-lock, published in lockstep with kerfjs). `index.js` is the zero-dependency CLI (`npm create kerf-component@latest <dir>`); `template/` is the scaffolded component package encoding the docs/13 hard rules (kerfjs peerDependency + tsup `external`, ESM + `.d.ts`, `jsxImportSource: "kerfjs"`, subpath exports, an example `Counter` with a factory + `wire(root)` disposer); `_gitignore` is renamed to `.gitignore` on scaffold. Tests via `npm test` (`node --test tests/scaffold.test.js`). The template's `src/` is typechecked against built `dist/` by `tests/dist/scaffold-typing/tsconfig.json` (the living-proof gate). CI job in `ci.yml`; release via `.github/workflows/release-create-kerf-component.yml`; version bumped in lockstep by `scripts/release.sh`.
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
| `delegate<T>` | `delegate.ts` | Event delegation; auto-promotes known non-bubblers (focus/blur/scroll/load/error/mouseenter/mouseleave) to capture, keeps `closest()` matching; generic `T extends Element` narrows the `target` arg; optional `{ match: 'closest' \| 'direct' }` (default `'closest'`) |
| `delegateCapture<T>` | `delegate.ts` | Explicit-capture escape hatch; `closest()`-style walk-up matching by default (unified with `delegate()`), passes the matched ancestor; same `T` generic; opt into strict `matches()` via `{ match: 'direct' }` |
| `DelegateOptions` | `delegate.ts` | Options for both delegation helpers: `{ match?: 'closest' \| 'direct' }` — `'closest'` (default) walks up via `closest()`, `'direct'` matches only `event.target` |
| `toElement` | `toElement.ts` | JSX → DOM (SVG-aware) |
| `SafeHtml` | `jsx-runtime.ts` | The JSX result type |
| `isSafeHtml` | `jsx-runtime.ts` | Cross-bundle type guard for `SafeHtml` (preferred over `instanceof`) |
| `raw` | `jsx-runtime.ts` | Wrap a pre-escaped HTML string |
| `Fragment` | `jsx-runtime.ts` | JSX `<>...</>` tag; also re-exported from the barrel for manual composition |

Plus, on the `kerfjs/html` subpath: `html` (tagged template — same runtime semantics as JSX, no build step; `HtmlValue` hole type; `_parseCount()` test hook), see `html.ts` above.

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

`npm run build` → `tsup` → `dist/`. TypeScript is dual-track (KF-375): the native **TypeScript 7** compiler — installed as the `typescript7` npm alias, invoked as `node node_modules/typescript7/bin/tsc` — runs every typecheck gate (`npm run typecheck` and the three `-p` dist-typing gates plus the docs-examples compile), while `typescript@6` (the JS-API bridge; native 7 ships no JS API) remains the resolvable `typescript` package for tsup's `.d.ts` emit and typescript-eslint (whose peer range caps at `<6.1.0`). `tsup.config.ts` sets `dts.compilerOptions.ignoreDeprecations: '6.0'` because tsup hardcodes the TS-7-removed `baseUrl` into its dts build — the waiver lives there, not in tsconfig.json.

Outputs:

- `dist/index.js` (ESM bundle, ~11 KB min+gz including `@preact/signals-core`; ~12 KB if a consumer also imports `arraySignal` from `kerfjs/array-signal`. See `bench/results.md` for the per-shape numbers.)
- `dist/index.d.ts` (types)
- `dist/jsx-runtime.js`
- `dist/jsx-runtime.d.ts`
- `dist/array-signal.js` (`kerfjs/array-signal` subpath, KF-95)
- `dist/array-signal.d.ts`
- `dist/html.js` (`kerfjs/html` subpath, KF-333 — the `html` tagged template)
- `dist/html.d.ts`
- `dist/testing.js` (`kerfjs/testing` subpath)
- `dist/testing.d.ts`
- `dist/chunk-*.js` — shared chunks emitted by tsup's code splitting. Both entries import their shared modules (`SafeHtml`, the store registry, etc.) from these chunks so each module-level value exists exactly once at runtime. Do not import directly; consumers always go through the named entry points.
- Source maps for everything

`tsup.config.ts` runs with `splitting: true` (KF-14 / KF-15) — without it, esbuild bundles each entry independently, which both duplicates shared classes (breaking `instanceof` checks across entries) and tree-shakes shared module-level state into broken stubs.

The five entries (`index`, `jsx-runtime`, `testing`, `array-signal`, `html`) each emit a tiny shim that re-exports from one of the shared chunks; the bulk of the runtime lives in those chunks. That keeps the cross-bundle brand symbols (`Symbol.for('kerfjs.SafeHtml')`, `Symbol.for('kerfjs.ArraySignal')`) addressing exactly one class identity per kerf copy.

Runtime dep (`@preact/signals-core`) is external — consumers' bundlers pick it up from their own `node_modules`.

## Where to look for X

| If you're touching... | look in |
| --- | --- |
| Adding a new public export | `src/index.ts` + the relevant module + `docs/8-api-reference.md` — a function export's documented signature is then gated by `scripts/check-doc-api-signatures.mjs` (names + arity + return type vs the emitted `.d.ts`) |
| JSX attribute alias | `src/utils/jsx-attr-aliases.ts` (the `ATTR_ALIASES` map) |
| morph conventions | `src/morph.ts` (public `morph()` (KF-150), key matching, `data-morph-skip`, `data-morph-skip-children` (KF-152), `data-morph-preserve` (KF-151), focus preservation), `src/mount.ts` (segment dispatch) |
| SVG namespace handling | `src/toElement.ts` (`SVG_FRAGMENT_TAGS`) |
| Store reset semantics | `src/store.ts` (`REGISTRY`, `resetAllStores`) |
| Delegation tier docs | `docs/5-event-delegation.md` |
| Test coverage thresholds | `vitest.config.ts` |
| Release flow / version bumping | `scripts/release.sh` (release notes drafted via gitgist) |
| Commit-message drafting | `npm run commit:msg` → `gitgist --staged --commit-message` (gitgist is a devDependency) |
| GitHub Pages live-demo deploy | `.github/workflows/pages.yml` + `examples/reactivity-demo/vite.config.ts` (`base: '/kerf/demo/'`) + `site/astro.config.mjs` (`base: '/kerf'`) + `docs/9-live-demo.md` |
| Benchmark harness / perf numbers | `bench/` (`bench/README.md` + `setup.sh` / `run.sh` / `results.sh` / `aggregate-results.mjs` are the LOCAL dev-only harness → gitignored `results.local.*`). PUBLISHED numbers come from `bench/import-krausest.mjs` (KF-291), which fetches the official upstream krausest results and writes the git-tracked `bench/results.json` + `results.md`; homepage's `site/src/components/PerfTable.astro` imports `bench/results.json` — refresh by re-running the importer and committing. |
| Migrating hub (`/kerf/migrating/`) | `docs/10-migrating.md` (design doc) + `site/src/content/docs/migrating/{index.mdx,react.md,alpine.md,lit.md,vanjs.md}` (rendered pages) — KF-132 + KF-156/157/158/159 |
| Drop-in AI-tool config | `kerf.cursorrules` + `kerf.claude-skill.md` at repo root (source of truth) — both are hand-maintained condensations of `docs/ai/usage-guide.md`. KF-215 ships generated mirrors inside the npm package at `ai/skill.md` / `ai/cursorrules` / `ai/manifest.json`; regenerate via `npm run ai-bundle:sync`; design + canonical-file contract in `docs/12-ai-assistant-configs.md` |

## Update triggers

Update this doc whenever you:

1. Add or rename a file under `src/`.
2. Add a new public export to `src/index.ts`.
3. Change the build output shape (`tsup.config.ts`).
4. Add a new conventional `data-*` attribute that `mount()` recognizes.
5. Add a new test directory or convention.
6. Add a new `scripts/` entry or a new gate wired into `npm run check`.
