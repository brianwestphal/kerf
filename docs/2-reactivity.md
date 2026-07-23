# 2. Reactivity

kerf's reactivity primitive is `@preact/signals-core` re-exported through `src/reactive.ts`. The whole API is four functions and two types.

## 2.1 `signal(initialValue)`

```ts
import { signal } from 'kerfjs';

const count = signal(0);
count.value;        // → 0   (read)
count.value = 7;    // (write — notifies subscribers)
```

A signal is a single piece of reactive state. Reads via `.value` are tracked when they happen inside an `effect()` or `computed()`. Writes via `.value = …` trigger every effect that read this signal during its previous run.

## 2.2 `computed(fn)`

```ts
import { computed, signal } from 'kerfjs';

const a = signal(1);
const b = signal(2);
const sum = computed(() => a.value + b.value);

sum.value;          // → 3
a.value = 10;
sum.value;          // → 12
```

A `computed` is a derived signal. Its body is re-run whenever any signal it reads changes. The result is cached until a dependency mutates.

`computed` is read via `.value`, just like `signal`. From a consumer's perspective, you can't tell whether a value is a raw signal or a computed — which is the point.

## 2.3 `effect(fn)`

```ts
import { effect, signal } from 'kerfjs';

const count = signal(0);
const dispose = effect(() => {
  console.log('count is', count.value);
});
// → "count is 0" (synchronous initial run)

count.value = 1;
// → "count is 1"

dispose();
count.value = 2;
// (nothing logged — effect is disposed)
```

An `effect()` runs its body synchronously once on creation, then re-runs it whenever any signal read during the last run changes. Returns a disposer that tears the effect down.

The body may itself return a **cleanup function**: it runs right before the next re-run and again on dispose — the place to clear a timer, abort a fetch, or remove a listener the body installed:

```ts
const dispose = effect(() => {
  const id = setInterval(() => console.log(count.value), 1000);
  return () => clearInterval(id); // runs before each re-run and on dispose()
});
```

`mount()` is built on `effect()` — same semantics, with kerf's segment-aware diff as the side effect.

## 2.4 `batch(fn)`

```ts
import { batch, effect, signal } from 'kerfjs';

const a = signal(1);
const b = signal(2);
effect(() => console.log(a.value + b.value));
// → "3"

batch(() => {
  a.value = 10;
  b.value = 20;
});
// → "30"  (one log, not two)
```

Coalesces multiple writes inside `fn` into a single re-run of any subscribed effect / computed. Useful when an action mutates several signals atomically and you don't want consumers to see intermediate states.

## 2.5 The `Signal<T>` and `ReadonlySignal<T>` types

```ts
import type { ReadonlySignal, Signal } from 'kerfjs';

function reset(s: Signal<number>) {
  s.value = 0;       // OK — Signal allows writes
}

function display(s: ReadonlySignal<number>) {
  return s.value;    // OK — read-only
  // s.value = 0;    // type error — ReadonlySignal forbids writes
}
```

`computed()` returns `ReadonlySignal<T>`. `signal()` returns `Signal<T>`. Stores expose `state: ReadonlySignal<TState>` so consumers can't bypass the action layer.

## 2.6 `arraySignal(initial)` (granular collection signal)

```ts
import { arraySignal } from 'kerfjs/array-signal';

const rows = arraySignal<{ id: number; label: string }>([]);

rows.push({ id: 1, label: 'a' });
rows.update(0, (r) => ({ ...r, label: 'A' }));
rows.insert(1, { id: 2, label: 'b' });
rows.move(0, 1);
rows.remove(0);
rows.replace([{ id: 99, label: 'reset' }]);

rows.value;       // → the live array, readonly-typed; registers a tracking dependency
```

`arraySignal` is a keyed-list-friendly variant of `signal()`. The mutators emit typed patch events (`update` / `insert` / `remove` / `move` / `replace`); when an `arraySignal` is bound to `each(...)` inside a `mount()`, the keyed list reconciler applies just the patches against the live DOM — no per-row iteration, no `classifyItems` Map build, no LIS pass over unchanged rows. Cost is **O(patches)**, not O(N).

It lives in its own subpath (`kerfjs/array-signal`) so apps that don't need granular collections shed ~1 KB from the main barrel. The class itself is detected via a brand symbol — not `instanceof` — so multiple bundle copies still interoperate.

Read-side semantics match a regular signal: reads of `arraySig.value` inside `effect()` / `computed()` register as dependencies, so `computed(() => arraySig.value.filter(...))` works the way you expect. Note the returned array is the signal's live internal array typed `readonly`, not a defensive copy — a reference you hold across a later mutation will observe that mutation; spread (`[...arraySig.value]`) if you need a stable snapshot.

### When to reach for `arraySignal`
- Long keyed lists (hundreds of rows) where most updates are pointwise (selection class flips, single-row edits, append-to-end, etc.).
- Lists where `signal(items.value = [...items.value, x])` is the bottleneck — that pattern triggers a full classify pass on every render.

### When NOT to reach for it
- Short lists (a handful of items). The constant-factor wins don't outweigh the API friction.
- Lists where every render rebuilds from scratch (filter / sort pipelines that reset on every input change). Use `signal` + `computed` and let `each()`'s identity-based caching handle the rest.

### Gotchas
- `arraySignal` mutates `_items` eagerly at the call site. The patch queue and the snapshot are always in sync after a mutation returns.
- Multiple `each(...)` callsites bound to the same `arraySignal` in one render: the first caller drains the patch queue and runs granular reconcile; the second (and beyond) sees an empty queue and falls through to the snapshot path. Both lists end up correct, but only one gets the perf win. Prefer one-binding-per-arraySignal-per-render.
- A `replace()` patch in a batch forces the snapshot path for that render. Granular optimizations resume the next render.
- A throwing row render falls back to the snapshot path automatically. If the snapshot also throws on the same bad row, the error bubbles to the user — fix the row in the signal, and the next render rebuilds from scratch.

## 2.7 What signals are NOT

- They are not deep-reactive. Mutating an array or object inside `signal.value` does NOT trigger subscribers. Always assign a new value:
  ```ts
  // wrong — silently doesn't notify
  count.value.push(1);

  // right
  count.value = [...count.value, 1];
  ```
- They don't track property accesses on plain objects — just `.value` on signal/computed instances.
- They are not async. There's no scheduling, no concurrent mode. Effects run synchronously when their dependencies write.

## 2.8 When to use raw signals vs. stores

- **One consumer reads it = signal.** Local UI state (this dialog's open/closed, this counter's value, this slider's position) belongs in a signal scoped to the component that owns it.
- **Two+ consumers / multi-step mutations / cross-route lifetime = store.** See [§3 Stores](3-stores.md).

## 2.9 Fine-grained bindings — signals in JSX

A signal can reach JSX two ways, and the difference is the single most important idiom choice in kerf:

- **Pass the signal itself** (`{count}`, `class={sig}`) — kerf **binds** that one hole to the signal, so a change updates only that attribute or text node. **`render()` does not re-run, and `each()`'s reconciler does not walk.** This is the *canonical* form for a **value** hole: whenever a hole's content is "this signal's (or computed's) current value," pass the signal.
- **Read `.value`** (`{count.value}`, `cond ? <a/> : <b/>`) — the read is tracked by `mount()`'s effect, so a change re-runs the whole render function and kerf applies the smallest DOM cut. This is the tool for **structural** changes: conditionals that swap elements, list shape, anything where what *exists* — not just a value — depends on the signal.

Rule of thumb: **values bind, structure re-renders.** The bound form is both the fastest path kerf has and the one with the simplest cost model (one effect, one node write), so reach for it first; fall back to `.value` when the JSX structure itself depends on the signal. To find `.value` holes worth migrating, the opt-in dev warning `KERF_DEV_WARN_VALUE_ONLY_RERENDER=1` flags re-renders whose only differences were text/attribute values (see the dev-warnings doc).

The idiom's logical endpoint: **a fully bound mount never re-renders at all.** A render function that reads no `.value` registers zero dependencies on `mount()`'s wrapped effect, so it runs exactly once — every subsequent update flows through the per-hole binding effects, with no string rebuild, no byte-compare, and no morph. There's no flag to set; it falls out of the dependency tracking.

The classic bound-value case — a `selectedId` flipping one row's `class`:

```tsx
const selectedId = signal<number | null>(null);

mount(root, () => (
  <ul>
    {each(items.value, (item) => (
      // Pass the computed itself — kerf binds `class` to it.
      <li class={computed(() => (item.id === selectedId.value ? 'selected' : ''))}>
        {item.label}
      </li>
    ), (item) => item.id)}
  </ul>
));

selectedId.value = 3; // updates only the 2 affected <li> class attrs — no re-render, no reconcile
```

Text holes work the same way:

```tsx
const count = signal(0);
mount(root, () => <span>{count}</span>); // pass the signal, not count.value
count.value++;                            // updates only that text node
```

A bound text hole does not need its own element — it can share a parent with
static text and other holes, and the mix survives coarse re-renders intact:

```tsx
const elapsed = computed(() => fmt(playhead.value));
mount(root, () => <div class="time">{elapsed} / {fmt(duration)}</div>);
```

### When to bind (the default for values)

- **Any hole whose content is a signal's or computed's current value.** Counters, labels, status attributes, selection classes, ticking values. Derived text composes with `computed`: `{computed(() => \`${n.value} items\`)}`.
- It scales down gracefully: a binding on a rarely-changing value costs one idle effect — there is no cliff that makes binding "wrong" for cold holes.

### When to read `.value` instead

- **The JSX structure depends on the signal** — `cond ? <EditForm/> : <Summary/>`, showing/hiding subtrees, choosing which list to render. A binding can only write one attribute or text node; structure needs the render fn.
- **Truly static one-shot values** — just write `class={cond ? 'a' : 'b'}` (a plain string) when nothing reactive drives the hole.
- **Whole-list structural changes** (add/remove/move rows) — that's [`arraySignal`](#26-arraysignal-initial-granular-collection-signal)'s job, not a per-attribute binding.

### Use `computed()`, not a bare closure

Wrap the expression in `computed(() => …)` (or pass a plain `signal`). The memoization matters: when a *shared* signal like `selectedId` changes, every row's `computed` re-evaluates cheaply, but only the ones whose value actually changed re-run their bound effect — so a selection flip touches ~2 DOM nodes, not N. (kerf has no compiler, so it can't auto-lift a bare `{expr}` into a tracked closure the way Solid does — the signal/`computed` must be explicit.)

### How it works (and why it's safe)

The JSX runtime renders to HTML strings. When it sees a signal in a hole it emits a **marker** into the string instead of stringifying, records the binding, and — after the one `innerHTML` parse — wires a tiny `effect` per marker that writes straight to the node. So the string-render model is preserved:

- **SSR / `SafeHtml.toString()`**: outside a `mount()` there's nothing to wire, so a bound signal **snapshots its current value** and emits no markers — server output is correct and marker-free.
- **Non-breaking**: passing a raw signal into JSX used to throw (`"Did you mean to read .value off a Signal?"`), so this only lights up input that couldn't run before.
- **Bound URL attributes** (`href`/`src`/`formaction`/`action`/`xlink:href`/`data`) get the same dangerous-URL screening as static attributes — a bound value resolving to `javascript:`/`vbscript:` or a script-executing `data:` document type (`text/html`, `image/svg+xml`, XHTML/XML) is never written (throws in development, warns and drops the attribute in production — see §6.4.1), including control-character-obfuscated schemes; `raw()` opts out.

### Reserved marker names

Because the wiring pass finds its markers by scanning the mounted subtree and matching by id, a small set of attribute and comment names is **reserved for kerf** — don't put them on your own elements or emit them through `raw()`:

- the `data-kfb` and `data-kfbrow` attributes (fine-grained attribute bindings), and
- HTML comments beginning `kfb:`, `kfbr:`, or `kf-list:` (text bindings and `each()` list boundaries).

A marker that collides with a real binding's id **is not contained to where it appears** — the wiring pass scans the whole mounted subtree, so a stray marker can reach across it: a duplicate `kfb:`/`kfbr:` comment steals a *sibling* text binding's update (the effect wires to the wrong node, silently), and a duplicate `kf-list:` comment can bind a real `each()` list to the *wrong parent element* so its rows render into the wrong place. These names are an internal detail you'll never need in normal use; the only way to hit this is to hand-write one of them or emit one through `raw()` (e.g. rendering user-authored HTML that happens to contain one — sanitize such HTML upstream, as always).

### Limitations

**Bind a stable signal source; don't switch which signal *instance* you bind.** Wrapping in `computed(() => …)` creates a fresh instance every render — that's fine, because the live effect stays bound to the first one and it reads the same underlying signals, so later changes still fire. What you must *not* do is bind a *different signal instance* across renders (`class={cond ? sigA : sigB}`): on a re-render that leaves the surrounds unchanged, kerf keeps the original effect and doesn't re-bind, so the hole goes stale. Bind one `computed` that switches internally instead (`class={computed(() => cond.value ? sigA.value : sigB.value)}`).

Because this failure is silent (the UI just stops updating, with no error), there's an opt-in dev warning for it: set `KERF_DEV_WARN_STALE_BINDING=1` in a non-production build and kerf will `console.warn` once, naming the hole, the first time a static-surround hole binds a different signal instance on that fast path. Like the rest of the dev-warning family it's off by default and free in production. Note it compares signal identity, so it will also flag a *fresh inline* `computed(() => …)` on a global hole (safe, but a new instance each render) — bind a stable `computed`/`signal` reference for global holes to keep it quiet.

**Row bindings that depend on the row's own data work across in-place updates.** A row binding's effect closes over the row object as it was when the row rendered. When an `arraySignal` update (or a `cacheKey`-driven re-render) applies to a row **in place** — the DOM node survives — kerf compares the fresh render's binding instances against the wired ones per hole: unchanged instances carry forward for free (stable external signals, cache hits), and any changed instance is re-wired against the surviving node. So `{computed(() => item.label)}` inside an `arraySignal` row updates correctly after `update()` swaps the row object; a bound hole is never left reading the pre-update object.
