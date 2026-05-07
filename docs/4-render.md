# 4. Render

`mount(rootEl, render)` is the single rendering primitive.

```ts
import { mount, signal } from 'kerfjs';

const count = signal(0);

const dispose = mount(document.getElementById('app')!, () => (
  <div>
    <span>{count.value}</span>
    <button data-action="inc">+</button>
  </div>
));
```

## 4.1 What `mount` does

1. Wraps `effect()` so the render fn re-runs whenever any signal it reads changes.
2. On each run, evaluates `render()` to a `SafeHtml`, takes its `.toString()`.
3. Builds a shallow clone of `rootEl` and sets its `innerHTML` to the new string.
4. Calls `morphdom(rootEl, template, { childrenOnly: true, ... })` to apply the minimum DOM mutations.
5. Returns a disposer that tears down the effect.

## 4.2 Diff keys

morphdom matches elements across the diff by:

- **`id`** — wins over any other key. Useful for singletons.
- **`data-key`** — generic per-row key for list items.

Elements without a key are matched positionally by tag name. Pure-HTML diffs work fine without keys; you only need keys when list rows reorder, are inserted in the middle, or removed.

```tsx
// Reorderable list — give each row a stable data-key
<ul>
  {rows.value.map((r) => (
    <li data-key={r.id}>{r.label}</li>
  ))}
</ul>
```

For large lists where most rows are unchanged across renders, swap `.map(...)` for the `each(items, render, key?)` helper. It memoises each row's HTML keyed by item identity (and an optional `key` that captures external state, like a "selected id"), so unchanged rows skip the JSX evaluation + string-build entirely. Items must be objects (the cache is a `WeakMap`); the immutable-update style elsewhere in this codebase makes the cache work automatically — replace a row with a fresh object and it re-renders, leave its reference alone and it doesn't.

```tsx
import { each } from 'kerfjs';

<ul>
  {each(rows.value, (r) => <li data-key={r.id}>{r.label}</li>)}
</ul>
```

## 4.3 `data-morph-skip`

Apply this attribute to any element whose subtree you DON'T want morphdom to touch:

```tsx
<div id="chart-mount" data-morph-skip />
```

After the first render, mount your library widget into `#chart-mount` directly:

```ts
const chart = new ThirdPartyChart(document.getElementById('chart-mount')!);
```

On subsequent re-renders, morphdom calls `onBeforeElUpdated` on the host, sees `data-morph-skip`, and returns `false` — so the entire subtree (the chart's internal DOM) is preserved. Use this for:

- xterm.js / Monaco-style editors.
- D3 / Plotly / Chart.js mounted regions.
- Any element with imperative DOM mutations you manage yourself.

## 4.4 Focus + selection preservation

When morphdom is about to update an element that is currently the active element, kerf preserves the user's in-progress edit. The mechanism differs by element kind:

### `<input>` (text-entry types) and `<textarea>`

For `input[type=text|search|url|email|tel|password|""]` and `<textarea>`, kerf:

- Copies the live `.value` and `selectionStart` / `selectionEnd` onto the morph target.
- Lets morphdom proceed with the update.

The result: attribute updates from the surrounding render still apply (className, disabled, etc.), but the user's typed value and cursor position survive. They never see their cursor jump mid-keystroke.

Other input types (range, color, file, date, checkbox, radio…) don't have meaningful text-selection state, so they aren't touched specially — morphdom proceeds normally.

### `[contenteditable]`

For a focused contenteditable, kerf takes the heavier-handed approach: **the entire subtree is skipped on this morph**, the same way `data-morph-skip` works. The user's typed content, caret position, and any multi-range selection survive verbatim — including any custom DOM they produced (`<b>`, `<a>`, line breaks, etc.). The trade-off is that *any* update to the contenteditable's attributes or children is also deferred until the next render after the user blurs.

This is the behaviour you almost always want for in-progress rich-text editing: don't disturb the editor mid-edit. If you want kerf to drive a contenteditable's content despite the user being focused, that's outside the framework — manage it imperatively or move that state outside the contenteditable.

### Non-text focused elements

For anything else with focus (a `<button>`, `<a>`, `<div tabindex>`), morphdom proceeds normally. There's no special handling — none of those elements have user-visible state that a re-render would clobber.

## 4.5 Multiple `mount()` calls

You can call `mount()` on different elements for different parts of the page. Each one gets its own `effect()` and tracks its own signals:

```ts
mount(badgeEl, () => <span>{cart.state.value.items.length}</span>);
mount(listEl,  () => <ul>{cart.state.value.items.map(renderRow)}</ul>);
mount(footerEl, () => <div>{cartTotal.value.toFixed(2)}</div>);
```

Each region re-renders only when its own dependencies change. Adding an item to the cart triggers all three; changing an unrelated piece of state triggers none.

## 4.6 Server-rendering

`SafeHtml.toString()` is server-safe. You can build the same JSX server-side, write the resulting string into your HTML response, and then call `mount()` on the same element on the client. morphdom will diff against whatever the server emitted; if the server output and client output match (which they should, given the same store state), no mutations are applied — but signal subscriptions are now wired up for future updates.

This isn't a full SSR story (no streaming, no hydration mismatch detection), but it's enough for "render once on the server, hydrate interactivity on the client" workflows.

## 4.7 Disposing

The disposer returned by `mount()` tears down the effect:

```ts
const dispose = mount(rootEl, render);
// later, when rootEl leaves the DOM:
dispose();
```

After dispose, signal mutations no longer trigger re-renders for this mount. The DOM tree itself is left as-is — kerf doesn't clear it; you do.

## 4.8 What `mount` does NOT do

- It doesn't manage component lifecycle. There's no `onMount` / `onUnmount` / `onUpdate` hook. Use `effect()` directly if you need a side effect tied to a signal.
- It doesn't batch updates across animation frames. If a signal mutates 100 times in 16ms, the render fn runs 100 times. Use `batch()` if you have a multi-write action that should fire once.
- It doesn't dedupe identical renders. If your render fn returns the same HTML string on consecutive runs, morphdom still does the diff (and finds nothing to change). The cost is the diff walk; it's cheap for small trees.
