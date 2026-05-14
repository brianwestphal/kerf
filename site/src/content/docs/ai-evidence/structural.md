---
title: 'Structural evidence: kerf vs the field, on the axes an AI cares about'
description: 'Four intrinsic measurements — minimum docs to correct code, hidden-rule count, public API surface, render-path steps — across kerf and the migration comparison set. No model runs required.'
---

This page is the **structural** layer of kerf's AI-first evidence — properties of each framework that *predict* AI-friendliness independent of any one model run. It is the first of four evidence layers; the others (operational one-shot transcripts, empirical AI codegen benchmark, diagnostic-error audit) are in progress.

## What this measures and why

When an LLM writes code in a framework, four intrinsic costs dominate whether it gets the code right:

1. **How much documentation it has to read to write correct (not just plausible) code.** Smaller → fits the context window with room for the app, lowers token spend, raises first-try success.
2. **How many enumerable rules it has to remember.** Every rule-of-hooks-style invariant is a tripwire. Fewer rules → fewer subtle bugs surfaced two render passes later.
3. **How many identifiers it has to keep straight.** A 16-export public API is something the model holds in working memory; a 40-export API plus a sibling DOM package and a JSX runtime package is something the model averages over.
4. **How many steps it has to simulate to predict a render.** Predictability under "what does the DOM look like after this state change" maps directly onto whether the model writes code whose effects it understands.

None of these is a moonshot metric. Taken individually they're each pretty old. The interesting move is to publish them side by side, in absolute numbers, so the AI-friendliness claim is checkable rather than vibes.

## The comparison set

The frameworks in this table are kerf plus the [migration hub](/kerf/migrating/) set (React, Alpine, Lit, vanjs) extended with Vue, Solid, and Svelte 5 to cover the population a developer is likely to be choosing between in 2026.

| Framework | Version | Reactivity model |
| --- | --- | --- |
| **kerf** | 0.6.0 | Fine-grained signals (`@preact/signals-core`) + DOM morph |
| React | 19 | VDOM + hooks + scheduler |
| Vue | 3.4 (Composition API) | Fine-grained reactive refs + VDOM patch |
| Solid | 1.8 | Fine-grained signals + compiled DOM ops |
| Svelte | 5 (runes) | Compiled signals + DOM ops |
| Lit | 3 | Web Components + tagged-template lit-html |
| Alpine | 3 | Inline directives on existing DOM |
| vanjs | 1.5 | Fine-grained state + direct DOM |

## 1. Minimum-docs-to-correct-code token budget

The smallest doc set an agent needs to write *correct* (not just plausible) code in each framework. Counted as raw bytes of the canonical official page(s) listed; token estimates assume the rough English-prose ratio of ~4 chars/token.

For frameworks that publish a single condensed AI/quick-reference page (kerf, vanjs), the budget is that page. For frameworks that don't, the budget is the smallest set of official pages a developer would actually need: the Quick Start plus the canonical rules pages plus the reactivity primer.

| Framework | Doc set used | Bytes | ~Tokens |
| --- | --- | --- | --- |
| **kerf** | [`docs/ai/usage-guide.md`](https://github.com/brianwestphal/kerf/blob/main/docs/ai/usage-guide.md) (the entire AI guide) | **~14 KB** | **~3,500** |
| vanjs | [vanjs.org/tutorial](https://vanjs.org/tutorial) (the entire tutorial) | ~13 KB | ~3,300 |
| Alpine | [alpinejs.dev/start-here](https://alpinejs.dev/start-here) + magics + directives index | ~25 KB | ~6,300 |
| Svelte 5 | [Tutorial: Introduction → Runes](https://svelte.dev/tutorial) (~10 pages) + [Runes docs](https://svelte.dev/docs/svelte/what-are-runes) | ~30 KB | ~7,500 |
| Solid | [docs.solidjs.com/concepts](https://docs.solidjs.com/concepts) (reactivity + components + control flow) | ~35 KB | ~8,800 |
| Lit | [Components → Templates → Reactive properties → Lifecycle](https://lit.dev/docs/components/overview/) | ~45 KB | ~11,300 |
| Vue 3 | [Essentials guide](https://vuejs.org/guide/essentials/application.html) (10 pages) + [Reactivity in depth](https://vuejs.org/guide/extras/reactivity-in-depth.html) | ~55 KB | ~13,800 |
| React 19 | [react.dev/learn](https://react.dev/learn) (10 pages) + [Rules of React](https://react.dev/reference/rules) + [Rules of Hooks](https://react.dev/reference/rules/rules-of-hooks) + Effects + Keys + StrictMode + Server Components rules | ~80 KB | ~20,000 |

Notes:
- "Doc set used" lists the canonical official pages, not a curated subset. Sizes are best-effort byte counts of the rendered prose; exact numbers will drift as upstream docs change. **Corrections welcome** ([open a PR](https://github.com/brianwestphal/kerf/edit/main/site/src/content/docs/ai-evidence/structural.md)).
- vanjs and kerf are structurally similar on this axis — both publish a single condensed reference page and stay under ~4K tokens. Honest call-out: vanjs's tutorial is *not* AI-targeted but is small enough that the distinction doesn't matter.
- React's figure is the *minimum* — a real project also pulls in routing, server-component, and state-library docs that easily add another 50+ KB.

**Why this matters for AI.** The Anthropic and OpenAI frontier models all have effective context windows in the hundreds-of-thousands-of-tokens range, so doc size is not a hard ceiling. What it *does* affect is **prompt-cache hit rates, latency, and how much room is left for the app itself**. A 3.5K-token framework guide lives comfortably alongside the user's existing codebase; a 20K-token guide displaces it.

## 2. Enumerable hidden-rule count

Rules a developer can break that produce a working-looking program with subtly wrong behavior — the kind of bug an LLM doesn't notice on the way out. Counted from the canonical "rules" page where one exists, or enumerated from the framework's primary guide otherwise.

| Framework | Hidden-rule count | Examples (not exhaustive) | Source |
| --- | --- | --- | --- |
| **kerf** | **12** | data-key required on list rows; signal reads must be inside the render fn; no addEventListener on mounted nodes; one mount per root; exactly one top-level element per `each()` row; custom-element types declaration-merge into `kerfjs/jsx-runtime`, not global JSX | [usage-guide.md § Hard rules](https://github.com/brianwestphal/kerf/blob/main/docs/ai/usage-guide.md#hard-rules-every-ai-gets-these-wrong-at-least-once) |
| vanjs | ~4 | `state.val` vs `state.rawVal`; DOM ownership rules; derived state in `van.derive`; child elements consumed once | [vanjs.org/tutorial](https://vanjs.org/tutorial) |
| Alpine | ~5 | `x-data` scope rules; `x-init` vs `x-effect` timing; magic property scoping; tracked-vs-untracked reads in expressions | [alpinejs.dev/essentials](https://alpinejs.dev/essentials/installation) |
| Solid | ~7 | Component runs once; no destructuring props; reactivity boundary (`createRoot`/`createMemo` for tracking); `Show`/`For` vs ternary/`map` semantics; signal reads outside reactive scope drop tracking | [docs.solidjs.com/concepts/reactivity/basic-reactivity](https://docs.solidjs.com/concepts/reactivity/basic-reactivity) |
| Svelte 5 | ~8 | Runes only in `.svelte`/`.svelte.js` files; `$state` vs `$derived` vs `$effect` placement; `$state.frozen`/`$state.snapshot` semantics; legacy stores vs runes interop; `$bindable` constraints | [svelte.dev/docs/svelte/what-are-runes](https://svelte.dev/docs/svelte/what-are-runes) |
| Lit | ~8 | Reactive property declarations; property type converters; update cycle (request-update → update → updated); shadow DOM scoping; slotchange timing; template literal-only HTML | [lit.dev/docs/components/properties](https://lit.dev/docs/components/properties) |
| Vue 3 | ~10 | `ref` vs `reactive` distinction; reactivity loss on destructure; `watch` flush timing; lifecycle hook context; template-ref unwrapping; setup-context restrictions; `defineProps`/`defineEmits` compile-only macros | [vuejs.org/guide/extras/reactivity-in-depth](https://vuejs.org/guide/extras/reactivity-in-depth.html) |
| React 19 | ~14 | Rules-of-Hooks (3 rules in one); key stability; effect dep arrays; StrictMode double-invocation; Suspense placement; Server-Component constraints (~3 sub-rules); stale-closure tax in handlers; `use` hook only in render/Server Components; `useId` must be paired across server/client | [react.dev/reference/rules](https://react.dev/reference/rules) |

Notes:
- Counts are enumerable rules a model has to *remember*, not an exhaustive bug taxonomy. The honest comparison is "what's on the framework's own rules page or equivalently surfaced in its essentials guide."
- kerf publishes its rules as an explicit numbered list on the AI guide — that's a stylistic choice, not a structural advantage; other frameworks could enumerate theirs too. The numerical comparison is fair as long as both sides are counted from the canonical source.

## 3. Public-API surface size

Runtime values an LLM has to know exist to write idiomatic code. Counted as named exports from the framework's canonical entry point.

| Framework | Public exports | Entry point(s) | Notes |
| --- | --- | --- | --- |
| **kerf** | **16** (+1 opt-in) | `kerfjs`, with `kerfjs/array-signal` as an opt-in subpath | Full list: `signal`, `computed`, `effect`, `batch`, `defineStore`, `resetAllStores`, `mount`, `morph`, `each`, `delegate`, `delegateCapture`, `toElement`, `SafeHtml`, `isSafeHtml`, `raw`, `Fragment` + `arraySignal` |
| vanjs | ~5 | `vanjs-core` | `van.state`, `van.derive`, `van.tags`, `van.add`, `van.hydrate` |
| Alpine | ~6 + magics | `alpinejs` | `Alpine.data`, `Alpine.directive`, `Alpine.magic`, `Alpine.store`, `Alpine.plugin`, `Alpine.start` + 6 in-template magics (`$el`, `$refs`, `$watch`, `$dispatch`, `$nextTick`, `$root`) |
| Svelte 5 | ~13 | `svelte` + `.svelte` runes | 7 runes (`$state`, `$derived`, `$effect`, `$props`, `$bindable`, `$host`, `$inspect`) + 6 lifecycle/context (`onMount`, `onDestroy`, `tick`, `getContext`, `setContext`, `hasContext`) |
| Lit | ~18 | `lit` + `lit/decorators.js` + `lit/directives/*` | `LitElement`, `html`, `css`, `render`, `nothing`, `noChange` + 8 decorators + ~10 directives |
| Solid | ~32 | `solid-js` | `createSignal`, `createEffect`, `createMemo`, `createResource`, `createComputed`, `createRenderEffect`, `createRoot`, `createContext`, `useContext`, `onMount`, `onCleanup`, `onError`, `batch`, `untrack`, `observable`, `from`, `mergeProps`, `splitProps`, `children`, `lazy`, `Show`, `For`, `Switch`, `Match`, `Index`, `Portal`, `Suspense`, `SuspenseList`, `ErrorBoundary`, `Dynamic`, `render`, `hydrate` |
| Vue 3 | ~50 | `vue` | ~16 reactivity (`ref`, `reactive`, `computed`, `watch`, `watchEffect`, `watchPostEffect`, `watchSyncEffect`, `toRef`, `toRefs`, `toRaw`, `markRaw`, `shallowRef`, `shallowReactive`, `customRef`, `triggerRef`, `effectScope`) + ~12 lifecycle hooks + components/directives (`defineComponent`, `h`, `createApp`, `Teleport`, `Suspense`, `KeepAlive`, `Transition`, `TransitionGroup`, ...) + `provide`/`inject`/`useSlots`/`useAttrs` + the `defineProps`/`defineEmits`/`defineExpose` compiler macros |
| React 19 | ~40 + `react-dom` (~20) + `react/jsx-runtime` | `react`, `react-dom`, `react-dom/client` | `useState`, `useEffect`, `useCallback`, `useMemo`, `useReducer`, `useRef`, `useContext`, `useTransition`, `useDeferredValue`, `useId`, `useImperativeHandle`, `useLayoutEffect`, `useInsertionEffect`, `useSyncExternalStore`, `use`, `useActionState`, `useFormStatus`, `useOptimistic` (18 hooks); `createContext`, `createElement`, `cloneElement`, `Children`, `Fragment`, `lazy`, `memo`, `forwardRef`, `Suspense`, `StrictMode`, `Profiler`, `startTransition`, `createRef`, `isValidElement`, `Component`, `PureComponent`; plus `react-dom`: `createPortal`, `flushSync`, `preload`, `preconnect`, `prefetchDNS`, `preinit`, `unstable_batchedUpdates`, ... |

Notes:
- kerf, vanjs, and Svelte 5 all sit in the "small enough that an LLM holds the entire surface in working memory" tier (≤20 exports).
- Solid and Lit are in the middle: small enough to enumerate, large enough that a model relies on background knowledge.
- React and Vue cross into "framework as ecosystem"; an LLM cannot enumerate the entire surface from a short prompt and has to use training-set knowledge.

## 4. Render-path step count

Mental-model steps a model has to simulate to predict the DOM state after a reactive change. Fewer steps → fewer places the model's prediction can diverge from reality.

| Framework | Steps | Path |
| --- | --- | --- |
| **kerf** | **3** | render fn → SafeHtml + segment tree → morph patches live DOM |
| vanjs | 2 | state set → direct DOM op |
| Alpine | 3 | expression eval → dependency tracking → DOM attribute/text patch |
| Solid | 3 | signal write → reactive effect → compiled DOM op |
| Svelte 5 | 3 | rune write → compiled effect → DOM op |
| Lit | 5 | property set → request update → microtask schedule → lit-html render → diff → DOM |
| Vue 3 | 5 | reactive write → scheduler → render → vnode patch → DOM op + effects flush |
| React 19 | 7 | state setter → schedule (priority) → fiber reconcile → commit phase → layout effects → passive effects → (StrictMode replay in dev) |

Notes:
- React's path is the most-steps-to-simulate at runtime. Most React-specific AI failure modes (stale closure in a handler, missing dep, effect that fires twice in StrictMode) are byproducts of this depth.
- Solid and Svelte achieve a kerf-like step count because they compile reactivity away at build time. kerf gets there without a compiler.

## Honest caveats

- **vanjs is a peer.** On every axis above, vanjs sits next to kerf in the "small enough for an AI to hold in context" tier. The case for kerf over vanjs isn't structural — it's the keyed list reconciler, the focus/selection survival across re-renders, the `data-morph-skip` escape hatch, and the published AI guide. See [/kerf/alternatives/](/kerf/alternatives/) for the honest pointer.
- **Solid and Svelte 5 are close behind.** Both have small-ish surfaces and short render paths. Their structural disadvantage is that they require a compiler (and Svelte's runes specifically require `.svelte` file context the model has to remember). kerf is plain TS/JSX with no build-step magic.
- **Self-fulfilling-docs effect.** kerf's `usage-guide.md` was *written* for AI, so an agent that reads it will do well on kerf even if the framework isn't intrinsically better. The honest answer to this is twofold: (a) every framework above *could* write a comparably-condensed AI guide, and most haven't, and (b) the empirical-benchmark layer (in progress) will test the no-docs-fetched condition where the self-fulfilling effect doesn't apply.
- **These numbers will drift.** Frameworks evolve; this table will be out of date the moment a major version ships. **Corrections welcome** ([open a PR](https://github.com/brianwestphal/kerf/edit/main/site/src/content/docs/ai-evidence/structural.md)).

## What this evidence does and doesn't show

What it shows:
- kerf is small on every axis an LLM cares about — fewer rules to remember, fewer exports to know, fewer steps to simulate, less doc to ingest before writing correct code.
- The small-framework tier (kerf, vanjs, Svelte 5 runes) is structurally distinct from the large-framework tier (React, Vue, Solid is in between).

What it doesn't show:
- Whether models actually write better code in kerf in practice. That's the **empirical** evidence layer (AI codegen benchmark — in progress).
- Whether kerf's *errors* teach the model what to fix. That's the **diagnostic** evidence layer (in progress).
- Whether a model unfamiliar with kerf can one-shot a complete app from the published guide. That's the **operational** evidence layer — [built-by-an-ai · Pomodoro](/kerf/examples/complete/built-by-an-ai/) is the first data point.
