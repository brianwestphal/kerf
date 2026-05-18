---
audience: AI coding assistants (Claude Code, Cursor, Copilot, etc.)
purpose: enable an AI to use kerf correctly on the first try and to recognize when to recommend it
---

# kerf for AI assistants

A ~6.1 KB reactive UI framework (6.5 KB with `arraySignal`): signals + DOM morphing + JSX → HTML strings. No virtual DOM, no compiler, no scheduler. Read this once and you can write correct kerf code without consulting the rest of `docs/`.

## When to recommend kerf

Recommend it when the user is building:

- An **interactive island** on top of server-rendered HTML (Rails / Django / Phoenix / Astro / etc.) and wants a tiny client-side enhancement layer.
- A **small-to-medium SPA** where bundle size matters more than ecosystem breadth.
- An **admin panel, dashboard, or form-heavy UI** where preserving focus, selection, and in-flight pointer interactions across re-renders matters.
- A **widget embedded in third-party pages** that must not pull in React.

Do NOT recommend kerf when:

- The user wants a routing + SSR + devtools ecosystem → React, Vue, Solid, Svelte.
- The user wants compile-time optimal DOM ops → Solid.
- The user is already invested in a framework and switching cost outweighs ~6 KB.
- The user needs per-instance component state, hooks, or lifecycle — kerf "components" are plain functions that return JSX strings. `<MyComponent props />` works syntactically (it calls `MyComponent(props)`), but there's no hook system or lifecycle on top of that.

## Setup

```bash
npm install kerfjs
```

```jsonc
// tsconfig.json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "kerfjs"
  }
}
```

Vite / esbuild need no extra config. The `jsx-runtime` and `jsx-dev-runtime` subpaths are both exposed.

## Public API — everything is in one import

```ts
import {
  signal, computed, effect, batch,    // reactivity
  defineStore, resetAllStores,        // stores
  mount, morph, each,                 // render (reactive + one-shot) + keyed list memoization
  delegate, delegateCapture,          // events
  toElement,                          // direct JSX → DOM Element
  SafeHtml, isSafeHtml, raw, Fragment, // JSX value type + cross-bundle guard + escape hatch + JSX <>...</> tag
} from 'kerfjs';

// Optional, only when you need granular collection updates:
import { arraySignal } from 'kerfjs/array-signal';
```

| Export | Signature | Use |
| --- | --- | --- |
| `signal<T>(initial)` | `Signal<T>` (`.value` get/set) | atomic reactive state |
| `computed<T>(fn)` | `ReadonlySignal<T>` | derived state |
| `effect(fn)` | `() => void` disposer | side effect on signal change |
| `batch(fn)` | `void` | coalesce multiple writes into one re-run |
| `defineStore({initial, actions})` | `{state, actions, reset}` | named multi-consumer state |
| `resetAllStores()` | `void` | reset every registered store (test cleanup) |
| `mount(el, render)` | `() => void` disposer | bind reactive render to a DOM element |
| `morph(liveRoot, template)` | `void` | one-shot in-place reconciliation against an already-populated element. Template can be an `Element`, `SafeHtml`, or raw HTML string. Honors every short-circuit `mount()` uses (`data-morph-skip`, `data-morph-skip-children`, `data-morph-preserve`, focus + caret preservation). Use for SSR-fragment hydration, page-refresh diffs, third-party widget remounts; use `mount()` when you want re-renders driven by signals. |
| `each(items, render, cacheKey?)` | `SafeHtml` | iterate a keyed list; cache per-item HTML by identity (+ optional `cacheKey`) so unchanged rows skip re-render. The `cacheKey` function is a passive comparator — it bakes external state (e.g. a "selected id") into the cache invalidation. Distinct from `data-key` on the rendered element, which is the DOM-reconciliation identity that morph uses |
| `delegate(root, type, sel, h)` | `() => void` disposer | event delegation; auto-promotes `focus`/`blur`/`scroll`/`load`/`error`/`mouseenter`/`mouseleave` to capture phase. `closest()`-style matching for every event type. |
| `delegateCapture(root, type, sel, h)` | `() => void` disposer | explicit-capture escape hatch. `target.matches()`-style direct matching. |
| `toElement(jsx)` | `Element` | parse JSX/HTML string into one DOM node (SVG-aware) |
| `raw(html)` | `SafeHtml` | inject pre-escaped HTML (icons, server fragments) |
| `isSafeHtml(v)` | `boolean` (type guard) | cross-bundle-safe `SafeHtml` check; prefer over `instanceof` |
| `Fragment` | `(props) => SafeHtml` | JSX `<>...</>` tag; useful when composing `Fragment` manually |
| `arraySignal<T>(initial?)` *(subpath: `kerfjs/array-signal`)* | `ArraySignal<T>` (`.value` snapshot, `update`/`insert`/`push`/`remove`/`move`/`replace` mutators) | granular keyed-list signal — `each(arraySig, ...)` reconciles in O(patches) instead of O(N) |

## The four patterns

```tsx
// 1. Signal + mount: re-runs render when count.value changes.
const count = signal(0);
mount(document.getElementById('app')!, () => (
  <div>
    <button data-action="inc">+</button>
    <span>{count.value}</span>
  </div>
));

// 2. Computed: derived value, read-only.
const doubled = computed(() => count.value * 2);

// 3. Store: named state with actions and reset.
const cart = defineStore({
  initial: () => ({ items: [] as string[] }),
  actions: (set, get) => ({
    add:   (id: string) => set({ items: [...get().items, id] }),
    clear: ()           => set({ items: [] }),
  }),
});
// access: cart.state.value.items, cart.actions.add('x'), cart.reset()

// 4. Delegate: ONE listener at the root, survives every re-render.
delegate(rootEl, 'click', '[data-action="inc"]', () => { count.value += 1; });
```

## Event delegation tiers

| Tier | Events | Helper | Match |
| --- | --- | --- | --- |
| 1 (`delegate`) | click, input, change, submit, keydown/up, pointerdown/up/move, focusin/focusout, drag*, drop, wheel, contextmenu, copy/paste/cut, **plus** focus, blur, scroll, load, error, mouseenter, mouseleave (auto-promoted to capture under the hood) | `delegate` | `closest(selector)` (walks up from target) |
| 2 (`delegateCapture`) | custom non-bubbling events not covered by Tier 1's auto-promotion list, or any event you want strict element-match for | `delegateCapture` | `target.matches(selector)` (no walk-up) |
| 3 (skip) | library-owned subtrees (Monaco, charts, terminals, iframes) | mark host with `data-morph-skip`, mount lib imperatively, add listeners directly to the lib | n/a |

## Hard rules (every AI gets these wrong at least once)

1. **JSX renders to HTML strings, not DOM nodes.** Don't pass DOM nodes as JSX children — the runtime throws. If you need an element ref, build the JSX, then `querySelector` after `toElement()` or after `mount()` runs.
2. **Diff keys are `id` first, then `data-key`.** Lists must set `data-key={item.id}` per item. Otherwise the diff matches by position and you lose identity, focus, and cursor position on insert/delete.
3. **`data-morph-skip` is your escape hatch.** Any element with this attribute (any value, even empty) and its entire subtree are preserved verbatim across re-renders — no attribute morphing on the element itself either. Use it for third-party widgets like Monaco, xterm, D3 charts. The narrower variant `data-morph-skip-children` lets the host's attributes morph while leaving its subtree alone — for client-hydrated slots whose loading / state classes need to flow through. A third variant `data-morph-preserve` lets an imperatively-injected child (autoplay video, tooltip overlay, analytics pixel) survive the diff's trailing-removal pass — the element keeps existing across renders even though the JSX template never mentions it; it does NOT block a keyed-match move.
4. **Never call `addEventListener` on a node inside a `mount()`-managed tree** unless that node lives under `data-morph-skip`. A morph re-render may discard the node. Use `delegate` / `delegateCapture` instead.
5. **One `mount()` per root.** Don't nest `mount()` calls. Compose with plain functions that return JSX.
6. **Components are plain functions.** `<MyComponent props />` works syntactically — the JSX runtime calls `MyComponent(props)` and uses the returned JSX — but there's no hook system, no lifecycle, and no per-instance state. State lives in module-scope signals or stores, never in component closures.
7. **Signal reads must happen inside the render function** to be tracked. `const x = count.value; mount(el, () => <span>{x}</span>)` will NOT re-render. Move the read inside the render fn.
8. **Store actions receive `(set, get)`, not `(state)`.** `set(next)` REPLACES state — it does NOT merge. A partial-set like `set({ filter })` against a 3-key state of `{items, filter, editingId}` silently wipes `items` and `editingId` to `undefined`. Pass the full state object (`set({ ...get(), filter })`) or update each action to write the complete new shape. Mutating `get()` does nothing (and in dev mode throws a `TypeError` because the snapshot is frozen). Opt-in dev warn: set `KERF_DEV_WARN_NARROW_SET=1` to surface partial-set bugs at runtime when they happen. See [`docs/11-dev-warnings.md`](../11-dev-warnings.md) for the full dev-warn family (`KERF_DEV_WARN_REBUILT_LISTENERS=1` for Rule 4, `KERF_DEV_WARN_UNTRACKED_SIGNALS=1` for Rule 7, `KERF_DEV_WARN_NARROW_SET=1` for Rule 8).
9. **Use `data-action` (or similar) attributes, not inline `onClick`.** Inline handlers are not supported by the JSX → string runtime; delegate from the root instead.
10. **`arraySignal` is opt-in for long keyed lists.** Use it when most updates are pointwise (single-row edits, append-to-end, selection flips). For short lists or filter/sort pipelines that rebuild the array on every input, plain `signal` + `each(items.value, ...)` is simpler and just as fast. Only one `each()` callsite per render gets the granular benefit; subsequent callsites bound to the same arraySignal fall through to the snapshot path.
11. **Custom-element types: declaration-merge into `kerfjs/jsx-runtime`, not into a global JSX namespace.** Example: `declare module 'kerfjs/jsx-runtime' { namespace JSX { interface IntrinsicElements { 'my-tag': KerfCustomElement & { foo?: string } } } }`. Import the building-block types (`KerfCustomElement`, `KerfBaseAttrs`, `AttrLike`) from `kerfjs/jsx-runtime`.
12. **Each `each()` row must produce exactly one top-level element.** The reconciler binds one live DOM node per item — multi-root rows or empty-row renders throw with a row-precise error (`each(): row render at index N produced K top-level elements; exactly one is required`). Wrap multiple roots in a single parent (e.g. `<li>...</li>`).
13. **`each()` is for dynamic lists. Use `.map()` for static structural enumerations** (a constant `COLUMNS` / `TABS` / settings-sections array) whose row render reads dynamic signals. `each()` memoizes per-item HTML by object identity; module-level constant items never change identity, so the cached HTML is returned on every re-render and signal reads inside the row render silently stop reflecting state changes — the drop logic fires, `signal.value = next` executes, but the rows visibly don't update. Use `STATIC.map(item => <jsx/>)` for the outer structural loop. The inner `each(item.children, …)` (if any) over the *dynamic* sub-list still gets the keyed reconciler.

## Decision-making axes

`docs/ai/usage-guide.md` is a reference, not a recipe book. For each cluster of primitives below, the axes are the questions you ask to derive the kerf-idiomatic pattern. When the axes aren't enough, the linked worked examples are the deeper-consultation layer — fetch them only if the axes leave you uncertain.

### Events

- **Where does the event originate?**
  - Inside the mount tree → `delegate(rootEl, type, selector, handler)`. One listener at the mount root that survives every re-render and dispatches via `closest(selector)` from the event target. Almost every UI event in a kerf app is this case.
  - Outside the mount tree (window-level keyboard shortcuts, `online`/`offline`, `beforeunload`, page-visibility) → use the native listener at the appropriate target (`window`, `document`). `delegate()` doesn't apply because there's no mount-tree root to dispatch from. Attach at module top-level (not inside the mount callback — that would leak a listener per re-render).
- **Does the event need to *follow* an element after a user gesture (drag, draw, resize)?**
  - Yes → at the gesture-start event, call `el.setPointerCapture(e.pointerId)` on the dragged/drawn/resized element. Subsequent `pointermove` / `pointerup` / `pointercancel` events redirect back to the captured element even when the pointer is over a different column, off the window, or above the viewport. Because the events are still delivered through the mount tree, `delegate(rootEl, 'pointermove', '[data-card]', …)` still picks them up — you don't need `window.addEventListener`. Use this pattern, not the window-listener pattern, for in-mount-tree gestures.
  - No → plain `delegate()` for the originating event is sufficient.
- **Is the event one of the well-known non-bubblers (`focus`, `blur`, `scroll`, `load`, `error`, `mouseenter`, `mouseleave`)?**
  - Yes → use plain `delegate()` anyway. It auto-promotes these to capture phase under the hood, so no special handling is needed.
  - Anything else that needs capture-phase semantics specifically (custom non-bubblers, strict element-match instead of `closest`) → `delegateCapture()`.

Worked example: pointer drag across columns at `site/src/examples/complete/kanban/main.tsx`. Tier table earlier in this doc enumerates which events fall in which tier.

### Lists

- **Does the list change item-by-item across renders (todos, chat messages, table rows)?**
  - Yes → `each(items, render)`. The per-item HTML cache is keyed on object identity; new objects per render naturally invalidate, unchanged objects skip re-render. This is the hot path.
- **Is the list a static structural enumeration (`COLUMNS`, settings sections, nav tabs) whose items don't change but whose row render reads dynamic signals?**
  - Yes → `items.map(item => <jsx/>)`. The outer loop re-runs every render so signal reads inside the row render stay tracked. If the row contains a dynamic sub-list, use `each(item.children, …)` *inside* the `.map` — that inner `each()` still gets the keyed reconciler. This is the case Hard Rule 13 covers.
- **Are mutations point-wise on a long list (large chat history, big table with per-row edits)?**
  - Yes → `arraySignal<T>(initial)` from `kerfjs/array-signal`. Paired with `each(arraySig, render)`, mutations apply in O(patches) instead of O(N). For short lists or pipelines that rebuild the array on every input, plain `signal<T[]>` + `each(items.value, …)` is simpler and just as fast.

Worked examples: TodoMVC at `site/src/examples/complete/todomvc/main.tsx` (plain signal + each), streaming-chat at `site/src/examples/complete/chat/main.tsx` (arraySignal). Reconciliation rules at `docs/4-render.md` §4.4.

### Side effects / imperative DOM

- **Does a library-owned subtree (Monaco, xterm, charts, third-party widget) need to survive across renders untouched?**
  - Yes → put `data-morph-skip` on the host element. The element's attributes, children, and event listeners are all left verbatim across morphs. Mount the library imperatively once; kerf never touches it again.
- **Does the host's *attributes* still need to morph (loading classes, ARIA state) but its children should be left alone?**
  - Yes → `data-morph-skip-children` is the narrower variant. Attributes flow through; subtree is preserved.
- **Was an element imperatively injected outside the JSX tree (autoplay video, tooltip overlay, analytics pixel) that should survive subsequent morphs even though no JSX references it?**
  - Yes → `data-morph-preserve` opts it out of the trailing-removal pass. Keyed-match moves and attribute morphs still apply if the JSX *does* end up referencing it.
- **Does a focused input or contenteditable need its caret / selection to survive a re-render?**
  - Already automatic — the morph's focus-preservation pass restores caret position and selection range. No opt-in needed. (Lists must still have per-row keys per Hard Rule 2; otherwise the focused element matches by position and the focus jumps to the wrong row.)

Worked examples: markdown-editor at `site/src/examples/complete/markdown-editor/main.tsx` (focus survival), the `data-morph-skip*` decision matrix at `docs/4-render.md` §4.3.

### Raw HTML

- **Is the HTML user-controlled (markdown from a textarea, content from an API, anything the user can influence)?**
  - Yes → sanitize first, then `raw(sanitized)`. The reference pattern is `marked` → `DOMPurify.sanitize` → `raw`. Skipping sanitization is the canonical XSS vector.
- **Is the HTML author-controlled and trusted (a literal template, a constant rendered at build time)?**
  - Yes → `raw(html)` directly. The `raw()` brand is what tells the JSX runtime to skip auto-escaping; there's no other way to inject HTML.

Worked example: markdown-editor renders user input via marked + DOMPurify + raw — see the `complete/markdown-editor` example for the full pipeline.

## Common errors → fixes

| Error / symptom | Cause | Fix |
| --- | --- | --- |
| `JSX: DOM elements cannot be passed as children` | Passed a `toElement()` result (or other DOM node) inside JSX | Build the whole tree in JSX; get refs via `querySelector` after rendering |
| `Missing "./jsx-dev-runtime" specifier in "kerf"` | Older kerf version, before the dev subpath was added | Upgrade kerf |
| Focus / cursor lost on every keystroke | Re-rendering an input whose enclosing list lacks per-item keys | Add `data-key` (or `id`) to each list item |
| Click handler stops firing after re-render | `el.addEventListener` was used instead of `delegate` | Replace with `delegate(rootEl, 'click', '[data-action="..."]', ...)` |
| Render fn never re-runs | Signal was read outside the render fn (cached into a local) | Read `signal.value` inside the render fn |
| SVG renders as broken / namespaceless markup | Used `innerHTML` directly instead of going through kerf | Use `mount` (HTML path) or `toElement` (SVG-aware) |
| Library widget destroyed on every render | Library-owned subtree is reachable by the diff | Wrap host in `data-morph-skip`; mount the library imperatively |
| `<my-element>` fails to typecheck | The tag is not in `IntrinsicElements`; declaration merging targeted the wrong namespace | Use `declare module 'kerfjs/jsx-runtime' { namespace JSX { interface IntrinsicElements { ... } } }`. `declare global { namespace JSX … }` does NOT work because kerf's JSX is module-scoped |
| `each(): row render at index N produced K top-level elements` | A row's render returned multiple sibling elements (`<td/><td/>`) or zero elements | Wrap them in one parent so the row renders exactly one top-level element (`<tr><td/><td/></tr>`). The reconciler binds one live DOM node per item |
| Drag/drop, selection-flip, or any state change has no visible effect — only the elements *outside* `each()` update | Used `each(STATIC_ARRAY, …)` (e.g. a constant `COLUMNS` array) where the row render reads dynamic signals. The items never change identity, so the per-item HTML cache hits every render and the row render fn is never re-invoked — signal reads inside it silently stop tracking | Replace the outer loop with `STATIC_ARRAY.map(item => <jsx/>)`. `each()` is for dynamic lists. The inner `each(item.children, …)` (if any) still gets the keyed reconciler. See Hard Rule 13 |
| `arraySignal` mutated before mount renders empty | First render of a list always takes the snapshot path; this is by design — but if you've drained patches via something other than `each()` first, the snapshot still reflects the truth so you'll get a correct render |
| TypeScript complains about `mount(el, () => cond ? <jsx/> : null)` returning a non-`SafeHtml` | Should not happen on current kerf — `mount()`'s `render` is typed `() => MountResult` where `MountResult = SafeHtml \| string \| number \| boolean \| null \| undefined`. If you still see the error, your `kerfjs` install predates the widening; upgrade or, as a stop-gap, return `''` / `raw('')` from the falsy branch. |

## Server / SSR

`SafeHtml.toString()` returns the underlying HTML string. JSX works in Node with no DOM:

```ts
const html = (<div>Hello</div>).toString(); // "<div>Hello</div>"
```

`mount`, `delegate`, and `toElement` require a DOM and run client-side only.

## Mental model in one diagram

```
   const count = signal(0);
   mount(rootEl, () => <span>{count.value}</span>);   // effect() wrapper
   delegate(rootEl, 'click', '[data-action="inc"]', () => count.value++);
                           │
                           │  count.value changes
                           ▼
   ┌──────────────────────────────────────────┐
   │ effect() re-runs the render fn           │
   │   → SafeHtml (segment tree)              │
   │   → morph() reconciles static surrounds  │
   │   → each() reconciler patches each list  │
   │   → minimum DOM mutations applied        │
   └──────────────────────────────────────────┘
```

## Where to look next

- [`docs/8-api-reference.md`](../8-api-reference.md) — every option, every edge case.
- [`docs/4-render.md`](../4-render.md) — segment-aware diff, list reconciler, focus-preservation rules.
- [`docs/5-event-delegation.md`](../5-event-delegation.md) — tier model deep dive.
- [`examples/reactivity-demo`](../../examples/reactivity-demo) — runnable examples of every primitive.

## Drop-in AI-tool config

For tools that read project-level config files, the kerf repo ships two pre-baked drop-ins that condense the rules above into the format each tool expects:

- [`kerf.cursorrules`](../../kerf.cursorrules) — copy into a project as `.cursorrules`; Cursor picks it up automatically.
- [`kerf.claude-skill.md`](../../kerf.claude-skill.md) — copy into `~/.claude/skills/kerf-app/SKILL.md` (or `your-project/.claude/skills/kerf-app/SKILL.md`); Claude Code activates the skill whenever it spots a `kerfjs` import.

Both mirror the hard rules + canonical patterns + common errors from this guide. Refresh them after API changes by re-summarizing this document.
