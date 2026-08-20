// Companion-utilities showcase — a 10,000-row VIRTUALIZED list with a debounced
// search and confirm-to-delete, built entirely from kerf's optional companion
// subpaths (none of which touch the ~12 KB core until imported):
//
//   • kerfjs/list    — `bindList` with viewport virtualization: only the rows in
//                      the scroll window are ever in the DOM (10,000 items, a
//                      screenful of nodes).
//   • kerfjs/timing  — `debouncedSignal`: the search query trails the input by
//                      200 ms so the filter recomputes only after typing settles.
//   • kerfjs/overlay — `confirm()` (a promise-based dialog) + `toast()`.
//
// The list source is a `computed()` derived from the data + the debounced query,
// so a filter or a delete just reassigns a signal and kerf re-windows.
import { computed, delegate, mount, signal } from 'kerfjs';
import { bindList } from 'kerfjs/list';
import { confirm, toast } from 'kerfjs/overlay';
import { debouncedSignal } from 'kerfjs/timing';

// Dev diagnostics: kerf never infers dev mode, so install them behind the build's
// own dev flag. Vite folds this to `false` for production — neither the import nor
// its chunk ships.
if (import.meta.env.DEV) await import('kerfjs/dev');

interface Row {
  id: number;
  name: string;
  size: number;
}

// Deterministic data (no Math.random) so the demo, its capture, and the browser
// smoke test are stable across runs.
const ADJ = ['crimson', 'azure', 'golden', 'silent', 'rapid', 'hidden', 'ancient', 'gentle'];
const NOUN = ['falcon', 'harbor', 'meadow', 'cipher', 'lantern', 'quartz', 'willow', 'ember'];
const all = signal<Row[]>(
  Array.from({ length: 10000 }, (_, i) => ({
    id: i,
    name: `${ADJ[i % ADJ.length]}-${NOUN[(i >> 3) % NOUN.length]}-${i}`,
    size: ((i * 7919) % 900) + 100,
  })),
);

const query = signal('');
const debouncedQuery = debouncedSignal(query, 200); // trails the input by 200 ms
const filtered = computed<readonly Row[]>(() => {
  const q = debouncedQuery.value.trim().toLowerCase();
  return q === '' ? all.value : all.value.filter((r) => r.name.includes(q));
});

// The header count is a one-shot mount with a bound text hole — it updates when
// the filter changes without touching the list.
const countText = computed(
  () => `${filtered.value.length.toLocaleString()} of ${all.value.length.toLocaleString()} rows`,
);
mount(document.getElementById('count')!, () => <span>{countText}</span>);

// The virtualized list. Fixed 36 px rows → O(1) windowing; only the visible slice
// (plus `overscan`) is rendered into an inner sizer kerf creates in `#list`.
const listEl = document.getElementById('list')!;
bindList(listEl, filtered, {
  key: (r) => r.id,
  render: (r) => (
    <div class="vl-row" style="height:36px">
      <span class="vl-name">{r.name}</span>
      <span class="vl-size">{r.size} KB</span>
      <button type="button" class="vl-del" data-del={String(r.id)}>Delete</button>
    </div>
  ),
  virtualize: { rowHeight: 36, overscan: 4 },
});

// One delegated `input` listener drives the query signal; the debouncedSignal +
// computed do the rest — the filter recomputes only after typing settles.
delegate(document.body, 'input', '#search', (_event, el) => {
  query.value = (el as HTMLInputElement).value;
});

// Confirm-to-delete via kerfjs/overlay; a toast confirms the action. One delegated
// `click` listener matches every row's Delete button (walk-up `closest()`).
delegate(listEl, 'click', '[data-del]', (_event, el) => {
  const id = Number(el.getAttribute('data-del'));
  const row = all.value.find((r) => r.id === id);
  if (row === undefined) return;
  void confirm(`Delete “${row.name}”?`, { danger: true, okText: 'Delete' }).then((ok) => {
    if (!ok) return;
    all.value = all.value.filter((r) => r.id !== id);
    toast(`Deleted ${row.name}`, { variant: 'success' });
  });
});
