<p align="center">
  <img src="./site/src/assets/logo.svg" alt="Kerf logo" width="96" height="96" />
</p>

<h1 align="center">Kerf</h1>

<p align="center"><em>The smallest cut.</em></p>

---

> Introducing Kerf.
> The smallest cut.
>
> 6.1 KB. No virtual DOM. No compiler. No magic.
> Reactive UI that touches only the bytes that changed.

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

That's it. Your JSX renders to HTML strings, kerf's native diff applies the minimum DOM mutations to make the live tree match, and signals re-run the render only when something they read actually changed.

## Why Kerf

1. **Built for the AI-assisted era.** Tiny public surface (15 exports), no compiler magic, no hidden lifecycle. An LLM holds the framework in context and predicts behaviour — your AI agent generates code that works the first time. Ships [`llms.txt`](./llms.txt) and a dedicated AI usage guide; the [Built by an AI · Pomodoro](https://brianwestphal.github.io/kerf/examples/complete/built-by-an-ai/) example is a working app one-shotted by Claude with `llms.txt` as its only kerf knowledge.

2. **Smallest cut.** 6.1 KB gzipped including signals (6.5 KB with `arraySignal`). Fine-grained reactivity re-runs only what changed; the diff touches only the DOM nodes that differ. On the [krausest js-framework-benchmark](./bench/results.md) kerf is competitive with Solid and Vue on swap-rows, remove-row, and clear — no compiler required.

3. **No virtual DOM, no compiler.** JSX → HTML strings → native diff. DevTools shows the real DOM because it *is* the DOM.

4. **Focus, selection, listeners survive re-renders.** We morph instead of rebuilding — your caret stays where you put it, your in-progress drag keeps moving, your delegated handlers keep firing.

5. **Plain TS, plain JSX, plain ESM.** Drops into anything using esbuild / Vite / tsup. No plugin chain.

## When to use Kerf

- **AI-generated apps** — your LLM/agent holds the framework in context; no hallucinated APIs.
- **Hybrid desktop apps (Tauri / Electron)** — small bundle, predictable diff, debuggable runtime; ideal for the embedded webview.
- **Embedded widgets** — chat bubbles, comment boxes, dashboards dropped into someone else's page.
- **Server-rendered apps with islands** — Rails / Phoenix / Django / Hono. `mount` per island; `delegate` survives turbo-frame swaps.
- **Admin panels & internal tools** — reactivity without 200 KB of framework + state lib + router.
- **Replacing jQuery** — incremental migration; same delegation mental model, modern primitives.
- **Prototyping** — entire mental model on a postcard.

### When to reach for something else

- Need a full ecosystem (router + forms + data + SSR streaming) → **Next.js / Remix / SolidStart**.
- Building a deeply componentised design-system app → **React / Solid / Svelte**.
- Need React Native / cross-platform mobile → **React** (Kerf + Tauri/Electron also covers many of these cases).
- Building a static site → **Astro** (we use it for *this* project's site).
- Already invested in a framework where switching cost outweighs the ~6 KB win.

## Quick tour

```ts
import { signal, computed, effect, defineStore, mount, each, delegate } from 'kerfjs';

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
      {each(
        cart.state.value.items,
        (item) => (
          <li>
            {item.name}
            <button data-action="remove" data-id={item.id}>×</button>
          </li>
        ),
        (item) => item.id,
      )}
    </ul>
    <p>Doubled count: {doubled.value}</p>
  </div>
));

// 5. Event delegation — one listener per event type, dispatched by data-action.
delegate(root, 'click', '[data-action="remove"]', (_e, btn) => {
  cart.actions.remove((btn as HTMLElement).dataset.id!);
});
```

### Long keyed lists: `arraySignal`

For lists where most updates are pointwise (single-row edits, append-to-end, selection flips on individual rows), reach for `arraySignal` from the `kerfjs/array-signal` subpath. Mutators emit typed patches that `each()` applies in O(patches), not O(N):

```ts
import { arraySignal } from 'kerfjs/array-signal';

const rows = arraySignal<{ id: number; label: string }>([]);

mount(root, () => (
  <ul>{each(rows, (r) => <li data-key={r.id}>{r.label}</li>)}</ul>
));

rows.push({ id: 1, label: 'a' });               // 1 insert patch
rows.update(0, (r) => ({ ...r, label: 'A' }));  // 1 update patch
rows.move(0, 1);                                // 1 move patch
```

The class lives in its own subpath so apps that don't need it shed ~1 KB. Reads on `rows.value` are tracking, so `computed(() => rows.value.filter(...))` works as expected. See [`docs/2-reactivity.md`](./docs/2-reactivity.md) §2.6.

## Install

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

## Links

- **Site:** [brianwestphal.github.io/kerf](https://brianwestphal.github.io/kerf/)
- **Docs:** [`docs/`](./docs/) — overview · reactivity · stores · render · events · jsx · svg · [API reference](./docs/8-api-reference.md)
- **AI guide:** [`docs/ai/usage-guide.md`](./docs/ai/usage-guide.md) — read once before writing kerf code with an LLM
- **Demo:** [live demo](https://brianwestphal.github.io/kerf/demo/) — eight sections exercising every primitive (counter, store-backed cart, focus survival, keyed list, morph-skip, SVG render, Tier-2 capture, `arraySignal` patches)
- **Repo:** [github.com/brianwestphal/kerf](https://github.com/brianwestphal/kerf)

## Why "kerf"?

A *kerf* is the narrow strip of material a saw blade removes when cutting — the smallest possible cut. The framework's job is the same: apply the smallest possible mutation to update your DOM.

(And yes, ~~kerformance~~ → *performance* jokes were written. They were also rejected.)

## Status

Pre-1.0 — API may evolve. See [CHANGELOG.md](./CHANGELOG.md) for the current version and what's shipped.

## License

MIT
