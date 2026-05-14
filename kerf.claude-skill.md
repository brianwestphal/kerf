---
name: kerf-app
description: Build UIs in the kerf reactive framework (https://github.com/brianwestphal/kerf). Use this skill whenever the user is writing or modifying code that imports `kerfjs`, asks to add a feature to a kerf app, or asks "how do I do X in kerf?". Use it proactively the moment you spot a kerf import in the file you're editing.
---

# Building apps with kerf

> Drop this file into your `~/.claude/skills/kerf-app/SKILL.md` (or your
> project's `.claude/skills/kerf-app/SKILL.md`) so Claude Code activates
> it whenever you work on a kerf app.

kerf is a ~6.1 KB reactive UI framework (6.5 KB with `arraySignal`): signals + DOM morphing + JSX → HTML strings. No virtual DOM, no compiler, no scheduler. The whole public surface fits in 15 exports.

## Setup

- Install: `npm install kerfjs`
- `tsconfig.json`: `"jsx": "react-jsx"`, `"jsxImportSource": "kerfjs"`
- Vite / esbuild need no extra config.

## Public API — one import path

```ts
import {
  signal, computed, effect, batch,    // reactivity
  defineStore, resetAllStores,        // stores
  mount, morph, each,                 // render (reactive + one-shot) + keyed list
  delegate, delegateCapture,          // events
  toElement,                          // direct JSX → DOM Element
  SafeHtml, isSafeHtml, raw, Fragment,
} from 'kerfjs';

// Optional, only when you need granular collection updates:
import { arraySignal } from 'kerfjs/array-signal';
```

| Export | Use |
| --- | --- |
| `signal(initial)` | atomic reactive state; `.value` get/set |
| `computed(fn)` | derived value, read-only |
| `effect(fn)` | side effect on signal change; returns disposer |
| `batch(fn)` | coalesce multiple writes into one re-run |
| `defineStore({initial, actions})` | named multi-consumer state |
| `resetAllStores()` | reset every store (test teardown) |
| `mount(el, render)` | bind reactive render to a DOM element; returns disposer |
| `morph(liveRoot, template)` | one-shot reconcile against a populated element (SSR hydration, page-refresh diffs). Template = `Element`, `SafeHtml`, or HTML string |
| `each(items, render, key?)` | keyed list iteration; per-row memoization on identity (+ optional key) |
| `delegate(root, type, sel, h)` | one listener at the root; `closest(selector)` walk from target |
| `delegateCapture(root, type, sel, h)` | capture-phase escape hatch; `target.matches()` strict match |
| `toElement(jsx)` | parse JSX into one DOM node (SVG-aware) |
| `raw(html)` | inject pre-escaped HTML |
| `arraySignal(initial?)` | granular keyed-list signal (subpath `kerfjs/array-signal`); `each()` reconciles in O(patches) |

## Hard rules — every AI assistant gets these wrong at least once

1. **JSX renders to HTML strings, not DOM nodes.** Don't pass DOM nodes as JSX children — the runtime throws. Need a ref? Build the JSX, then `querySelector` after `mount()` / `toElement()`.
2. **Diff keys: `id` first, then `data-key`.** Lists MUST set `data-key={item.id}` per item — otherwise the diff matches by position and you lose focus, cursor, and identity on insert/delete.
3. **Three escape hatches for the morph:**
   - `data-morph-skip` — element AND subtree preserved verbatim. For library-owned hosts (Monaco, xterm, D3).
   - `data-morph-skip-children` — attrs on the host morph, subtree preserved. For client-hydrated slots whose loading/state classes need to flow through.
   - `data-morph-preserve` — element survives the trailing-removal pass even when the new template doesn't emit it. For imperatively-injected children (autoplay video, tooltip overlay, analytics pixel). Does NOT block a keyed-match move.
4. **Never `addEventListener` inside a `mount()`-managed tree** unless under `data-morph-skip`. A morph re-render may discard the node. Use `delegate` / `delegateCapture` instead.
5. **One `mount()` per root.** Don't nest `mount()` calls. Compose with plain functions returning JSX.
6. **No `<MyComponent />` semantics with hooks.** Components are plain functions returning JSX. State lives in module-scope signals or stores, never in component closures.
7. **Signal reads must happen INSIDE the render function** to be tracked. `const x = count.value; mount(el, () => <span>{x}</span>)` does NOT re-render. Move the read inside.
8. **Store actions take `(set, get)`, not `(state)`.** `set(next)` replaces state; mutating `get()` does nothing.
9. **Use `data-action` attributes, not inline `onClick`.** Inline handlers are NOT supported by the JSX → string runtime; delegate from the root.
10. **`arraySignal` is opt-in for long keyed lists** where most updates are pointwise. For short lists / filter+sort pipelines, plain `signal` + `each(items.value, ...)` is simpler and equally fast.
11. **Custom-element types: declaration-merge into `kerfjs/jsx-runtime`**, NOT into a global JSX namespace. Pattern: `declare module 'kerfjs/jsx-runtime' { namespace JSX { interface IntrinsicElements { 'my-tag': KerfCustomElement & { foo?: string } } } }`.
12. **Each `each()` row must produce exactly one top-level element.** Multi-root or empty rows throw a row-precise error. Wrap multiple roots in one parent.

## Canonical patterns

```tsx
// Pattern 1: signal + mount + delegate
const count = signal(0);
mount(document.getElementById('app')!, () => (
  <div>
    <button data-action="inc">+</button>
    <span>{count.value}</span>
  </div>
));
delegate(rootEl, 'click', '[data-action="inc"]', () => { count.value += 1; });

// Pattern 2: keyed list with per-row memoization
mount(listEl, () => (
  <ul>
    {each(rows.value, (row) => <li data-key={row.id}>{row.label}</li>)}
  </ul>
));

// Pattern 3: store with reset
const cart = defineStore({
  initial: () => ({ items: [] as string[] }),
  actions: (set, get) => ({
    add:   (id: string) => set({ items: [...get().items, id] }),
    clear: ()           => set({ items: [] }),
  }),
});
// access: cart.state.value.items, cart.actions.add('x'), cart.reset()

// Pattern 4: one-shot reconcile (no signals, no effect)
morph(liveCard, '<article class="card">…</article>');
```

## Diagnosing common errors

| Error / symptom | Root cause | Fix |
| --- | --- | --- |
| `JSX: DOM elements cannot be passed as children` | passed a `toElement()` result inside JSX | Build the whole tree in JSX; refs via `querySelector` after rendering |
| Focus / cursor lost on every keystroke | list items lack `data-key` | Add `data-key` (or `id`) to each list item |
| Click handler stops firing after re-render | `el.addEventListener` was used | Replace with `delegate(rootEl, 'click', '[data-action="..."]', ...)` |
| Render fn never re-runs | signal was read outside the render fn | Move `signal.value` read inside the render fn |
| SVG renders as broken / namespaceless markup | `innerHTML` used directly | Use `mount` or `toElement` (SVG-aware) |
| Library widget destroyed on every render | host reachable by the morph | Wrap host in `data-morph-skip`; mount the library imperatively after first render |
| `<my-tag>` fails to typecheck | declaration merging targeted global JSX | Use `declare module 'kerfjs/jsx-runtime' { namespace JSX { … } }` instead |
| `each(): row render at index N produced K top-level elements` | row returned multiple sibling elements or zero | Wrap them in one parent so the row renders exactly one element |

## Workflow guidance

When the user asks you to add a feature to a kerf app:

1. **Check what state already exists.** Is there a signal / store you should reuse? Don't create a new one for derived data — use `computed`.
2. **Decide where state lives.** Module-scope signal for ephemeral UI state; `defineStore` for state shared across mounts or that needs `reset()` for tests.
3. **Decide who fires the action.** A handler on a DOM event → `delegate` with a `data-action` attribute. A signal change → `effect()`.
4. **Render output is JSX returning `SafeHtml`.** No JSX-as-DOM-node, no inline handlers. Lists get `data-key`.
5. **Test with `kerfjs/testing`'s `clearStoreRegistry()`** between unit tests if you used `defineStore`.

When you spot user code that violates any of the hard rules above, fix it inline AND explain the rule briefly so the user learns the pattern.

## Server / SSR

`SafeHtml.toString()` returns the HTML string. JSX works in Node with no DOM. `mount`, `morph`, `delegate`, `toElement` all require a DOM and run client-side.

## Where to look next

- API reference: <https://brianwestphal.github.io/kerf/api/>
- Full AI guide: <https://github.com/brianwestphal/kerf/blob/main/docs/ai/usage-guide.md>
- llms.txt index: <https://github.com/brianwestphal/kerf/blob/main/llms.txt>
- Example apps: <https://brianwestphal.github.io/kerf/examples/>
