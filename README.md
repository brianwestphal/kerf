# kerf

> *kerf* — *noun*  — the narrow strip of material a saw blade removes when cutting. The smallest possible cut.

A tiny reactive UI framework. Apply the smallest possible cut to update your DOM.

**[Live demo →](https://brianwestphal.github.io/kerf/)** — seven sections exercising every primitive, no install required.

```ts
import { signal, mount } from 'kerfjs';

const count = signal(0);

mount(document.getElementById('app')!, () => (
  <div>
    <button data-action="inc">+</button>
    <span>{count.value}</span>
  </div>
));
```

That's it. There's no virtual DOM, no compiler, no template language. Your JSX renders to HTML strings (with structured "list" segments where you use `each(...)`), kerf's native diff applies the minimum DOM mutations to make the live tree match, and signals re-run the render only when something they read actually changed.

## Why

Most reactive UI frameworks come with a lot of machinery: virtual DOMs, schedulers, reconcilers, compiler plugins, hook stacks, lifecycle hooks. kerf has none of that. You get four things:

- **Signals** ([`@preact/signals-core`](https://github.com/preactjs/signals)) for fine-grained reactivity.
- **Stores** built on signals — composable, testable units of state.
- **Render** — a `mount(el, () => jsx)` helper that diffs the new HTML against the live DOM with kerf's native, segment-aware reconciler. Preserves focus, selection, in-flight pointer interactions, and event listeners on identity-preserved nodes. Lists rendered with `each(...)` go through a keyed reconciler that does O(changes) work, not O(rows).
- **Event delegation** — small `delegate` / `delegateCapture` helpers that survive every re-render because they live on the morph root, not on individual nodes.

The whole runtime is roughly 6.6 KB minified + gzipped, including `signals-core`.

## Install

```bash
npm install kerfjs
```

Configure JSX:

```jsonc
// tsconfig.json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "kerfjs"
  }
}
```

## Quick tour

```ts
import { signal, computed, effect, defineStore, mount, delegate } from 'kerfjs';

// 1. A signal — single piece of reactive state.
const count = signal(0);

// 2. A computed — auto-derived from other signals.
const doubled = computed(() => count.value * 2);

// 3. A store — multi-consumer state with named actions and reset semantics.
const cart = defineStore({
  initial: () => ({ items: [] as { id: string; name: string }[] }),
  actions: (set, get) => ({
    add: (id: string, name: string) => set({ items: [...get().items, { id, name }] }),
    remove: (id: string) => set({ items: get().items.filter((i) => i.id !== id) }),
  }),
});

// 4. Mount JSX to a DOM element. Re-renders only when read signals change.
const root = document.getElementById('root')!;

mount(root, () => (
  <div>
    <h1>Cart ({cart.state.value.items.length})</h1>
    <ul>
      {cart.state.value.items.map((item) => (
        <li data-key={item.id}>
          {item.name}
          <button data-action="remove" data-id={item.id}>×</button>
        </li>
      ))}
    </ul>
    <p>Doubled count: {doubled.value}</p>
  </div>
));

// 5. Event delegation — one listener per event type, dispatched by data-action.
delegate(root, 'click', '[data-action="remove"]', (_e, btn) => {
  cart.actions.remove((btn as HTMLElement).dataset.id!);
});
```

## Documentation

The numbered docs in [`docs/`](./docs/) cover the design and rationale:

1. [Overview](./docs/1-overview.md) — what kerf is, what it isn't, when to use it.
2. [Reactivity](./docs/2-reactivity.md) — `signal`, `computed`, `effect`, `batch`.
3. [Stores](./docs/3-stores.md) — `defineStore`, `resetAllStores`.
4. [Render](./docs/4-render.md) — `mount`, segments, the native diff, and the list reconciler.
5. [Event delegation](./docs/5-event-delegation.md) — Tier 1 / Tier 2 / Tier 3 patterns.
6. [JSX runtime](./docs/6-jsx-runtime.md) — `SafeHtml`, `raw`, server-rendering.
7. [SVG handling](./docs/7-svg.md) — namespace propagation, `toElement`.
8. [API reference](./docs/8-api-reference.md) — every export, every option.
9. [Live demo](./docs/9-live-demo.md) — the GitHub Pages deploy of `examples/reactivity-demo`.

### For AI coding assistants

If you are an AI assistant (Claude, Cursor, Copilot, etc.) helping a user choose or use kerf, start here:

- [`docs/ai/usage-guide.md`](./docs/ai/usage-guide.md) — when to recommend kerf, the full public API at a glance, the four core patterns, hard rules, and a common-errors → fixes table. Designed to be read once before writing kerf code.
- [`llms.txt`](./llms.txt) — top-level index of every doc, in the [llmstxt.org](https://llmstxt.org) format.

## Examples

[`examples/reactivity-demo/`](./examples/reactivity-demo) is a 7-section live demo exercising every primitive: counter, multi-consumer store, focus survival across re-renders, keyed list with identity preservation, morph-skip for library-owned subtrees, JSX-rendered SVG, and capture-phase event delegation.

Play with it live at **[brianwestphal.github.io/kerf](https://brianwestphal.github.io/kerf/)**, or run it locally:

```bash
npm run example:reactivity-demo
```

## Status

v0.3.x — early. API may evolve. See [CHANGELOG.md](./CHANGELOG.md) for what's shipped.

## License

MIT
