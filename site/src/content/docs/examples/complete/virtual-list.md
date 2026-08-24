---
title: Virtual list
description: A 10,000-row virtualized list built from kerf's companion subpaths — bindList virtualization, a debounced search, and a confirm-to-delete dialog with a toast.
---

**[▶ Run live](/kerf/run/virtual-list/)** · [View source on GitHub](https://github.com/brianwestphal/kerf/tree/main/site/src/examples/complete/virtual-list)

[![Animated preview: scrolling a 10,000-row virtualized list, filtering to one row, then deleting it via a confirm dialog and toast](/kerf/demos/virtual-list.svg)](/kerf/run/virtual-list/)

A list of **10,000 rows** where only a screenful is ever in the DOM. It's built entirely from kerf's optional, tree-shakeable **companion subpaths** — none of which touch the ~12 KB core until you import them:

- **`kerfjs/list` — virtualization.** `bindList(scrollEl, source, { virtualize: { rowHeight } })` renders only the rows in the scroll window (plus a small `overscan`) into an inner sizer, with padding that keeps the scrollbar honest. Scroll through 10,000 items and the DOM never holds more than a screenful.
- **`kerfjs/timing` — debounced search.** The search box drives a `signal`, and `debouncedSignal(query, 200)` trails it by 200 ms. The filtered list is a `computed()` over the debounced query, so the filter recomputes only after typing settles — not on every keystroke.
- **`kerfjs/overlay` — confirm + toast.** Each row's **Delete** opens a promise-based `confirm()` dialog; on confirm, the row is removed from the source and a `toast()` acknowledges it. kerf ships no CSS — the overlay and toast are styled in the app's own stylesheet.

**What to look at:**

- **The list source is a `computed()`.** `filtered` derives from the data signal + the debounced query. A filter or a delete just reassigns a signal; kerf re-windows the visible slice. No manual DOM bookkeeping.
- **Fixed-height windowing is O(1).** With `rowHeight: 36` kerf maps `scrollTop` straight to the first visible index — no per-row measurement. (For content whose height is only known after layout, `bindList` also takes `rowHeight: { estimate }` + `observeRowHeights`; see the [API reference](/kerf/api/#811-keyed-reactive-list--kerfjslist-subpath).)
- **`delegate()` for both flows.** One delegated `input` listener updates the query signal; one delegated `click` listener matches every row's Delete button by walk-up `closest()` — so the handlers survive the rows scrolling in and out of the window.

[View source on GitHub →](https://github.com/brianwestphal/kerf/tree/main/site/src/examples/complete/virtual-list)

```tsx
// site/src/examples/complete/virtual-list/main.tsx (excerpt — full source on GitHub)
import { computed, delegate, mount, signal } from 'kerfjs';
import { bindList } from 'kerfjs/list';
import { confirm, toast } from 'kerfjs/overlay';
import { debouncedSignal } from 'kerfjs/timing';

const query = signal('');
const debouncedQuery = debouncedSignal(query, 200);           // trails the input by 200 ms
const filtered = computed(() =>
  debouncedQuery.value ? all.value.filter((r) => r.name.includes(debouncedQuery.value)) : all.value,
);

// A one-shot mount with a bound text hole — the header count updates without
// touching the list.
const countText = computed(() => `${filtered.value.length} of ${all.value.length} rows`);
mount(countEl, () => <span>{countText}</span>);

bindList(listEl, filtered, {
  key: (r) => r.id,
  render: (r) => <div class="vl-row" style="height:36px">{r.name}</div>,
  virtualize: { rowHeight: 36, overscan: 4 },               // only the visible slice renders
});

delegate(listEl, 'click', '[data-del]', (_e, el) => {
  const row = all.value.find((r) => r.id === Number(el.getAttribute('data-del')))!;
  void confirm(`Delete “${row.name}”?`, { danger: true, okText: 'Delete' }).then((ok) => {
    if (ok) { all.value = all.value.filter((r) => r !== row); toast(`Deleted ${row.name}`); }
  });
});
```
