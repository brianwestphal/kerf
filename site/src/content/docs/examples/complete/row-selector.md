---
title: Row selector
description: Master-detail select-row list. Fine-grained signal bindings — the selected row's class and the detail pane update without a render re-run or a list reconcile.
---

**[▶ Run live](/kerf/run/row-selector/)** · [View source on GitHub](https://github.com/brianwestphal/kerf/tree/main/site/src/examples/complete/row-selector)

[![Animated preview: clicking rows in a host list; the highlight and detail pane follow while the "list renders" counter stays at 1](/kerf/demos/row-selector.svg)](/kerf/run/row-selector/)

A 120-host list with a master-detail layout. Clicking a host highlights its row and fills the detail pane — but the list is rendered **once**. The "list renders" counter in the header stays at `1` no matter how many rows you click; it only ticks when you hit **Regenerate**, which swaps the dataset and forces an actual re-render.

**What to look at:**

- **A signal handed into the `class` hole.** Each row's `class` is a `computed()` passed straight into JSX (`class={computed(() => id === selectedId.value ? … : …)}`) — not its `.value`. kerf binds that hole to the signal, so a selection change writes only the two affected rows' `class` attributes through their bound effects. No render re-run, no list reconcile.
- **Bound text holes in the detail pane.** Every detail field (`name`, `region`, `ip`, `cpu`, `status`) is a `computed()` over the current selection, dropped into a text position. Selecting a row updates just those text nodes.
- **The discipline that makes it fine-grained.** `selectedId` is *never read in a render body* — it only reaches the bound holes. So the coarse `mount()` effect never subscribes to it, and selection can't trigger a re-render. The render's one dependency is `hosts`, so the `Regenerate` path (which replaces `hosts`) is the one thing that re-renders the list.
- **`delegate()` for both flows.** One Tier-1 `click` listener matches `[data-select]` (a row was clicked, via `closest()`), another matches the Regenerate button — dispatched by `attr()`-typed selectors.

[View source on GitHub →](https://github.com/brianwestphal/kerf/tree/main/site/src/examples/complete/row-selector)

```tsx
// site/src/examples/complete/row-selector/main.tsx (excerpt — full source on GitHub)
import { attr, computed, delegate, mount, signal, type AttrSpec } from 'kerfjs';

const SELECT = attr('data-select');
const selectedId = signal<string | null>(null);
const selected = computed(() => hosts.value.find((h) => h.id === selectedId.value) ?? null);
const dName = computed(() => selected.value?.name ?? 'Select a host'); // bound into the detail pane

let listRenders = 0;

mount(root, () => {
  // hosts is the only render dependency; selecting writes selectedId (never
  // read here), so selection never re-renders.
  listRenders += 1;        // snapshot counter — stays at 1 across selections
  return (
    <div class="rs">
      {/* … header with `list renders: {listRenders}` and a Regenerate button … */}
      <ul class="rs-list">
        {hosts.value.map((h) => (
          <li
            {...SELECT(h.id)}
            class={computed(() => (h.id === selectedId.value ? 'rs-row rs-row-on' : 'rs-row'))}
          >
            {/* … name / region / cpu … */}
          </li>
        ))}
      </ul>
      <aside class="rs-detail"><h2>{dName}</h2>{/* … more bound fields … */}</aside>
    </div>
  );
});

// selectedId is only ever written here — never read inside the render above.
void delegate(root, 'click', '[data-select]', (_e, el) => {
  selectedId.value = (el as HTMLElement).dataset.select ?? null;
});
```
