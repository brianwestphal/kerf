/**
 * §8 — `arraySignal` granular reconcile.
 *
 * The §4 keyed-list section uses plain `signal<Row[]>` + `each(rows.value, …)`.
 * Every render iterates the whole array to classify rows; for short lists
 * that's fine.
 *
 * This section uses `arraySignal` from the `kerfjs/array-signal` subpath.
 * Mutators emit typed patch events — `update`, `insert`, `push`, `remove`,
 * `move`, `replace` — and the keyed-list reconciler applies just the
 * patches against the live DOM. Cost is **O(patches)**, not O(N).
 *
 * Watch the patch counter: a single `update` of one row's flag emits a
 * single `update` patch and replaces a single `<li>` node. A 1000-row
 * append emits 1000 contiguous `insert` patches the reconciler bulk-parses
 * in one `template.innerHTML` call.
 */

import { attr, delegate, each, mount, signal, type AttrSpec } from 'kerfjs';
import { arraySignal } from 'kerfjs/array-signal';

const ACTIONS = {
  push:          attr('data-action', 'push'),
  push100:       attr('data-action', 'push-100'),
  toggleFirst:   attr('data-action', 'toggle-first'),
  toggle:        attr('data-action', 'toggle'),
  moveFirstLast: attr('data-action', 'move-first-last'),
  removeLast:    attr('data-action', 'remove-last'),
  reset:         attr('data-action', 'reset'),
} as const satisfies Record<string, AttrSpec<'data-action'>>;
const ITEM = { id: attr('data-id') } as const;

interface Row {
  id: string;
  label: string;
  selected: boolean;
}

let rowSeq = 0;
function makeRow(label: string): Row {
  rowSeq += 1;
  return { id: `as-row-${rowSeq}`, label, selected: false };
}

export function mountArraySignalSection(root: HTMLElement): void {
  const rows = arraySignal<Row>([
    makeRow('Apple'),
    makeRow('Banana'),
    makeRow('Cherry'),
  ]);

  // Patch tracker — wraps the mutators so we can report what fires.
  const lastPatch = signal<string>('—');

  function logPatch(name: string, detail: string): void {
    lastPatch.value = `${name}(${detail})`;
  }

  mount(root, () => (
    <div className="demo-card">
      <h2>
        8. arraySignal <span className="demo-tag">granular reconcile · O(patches), not O(N)</span>
      </h2>

      <div className="demo-row">
        <button type="button" {...ACTIONS.push.attrs} className="demo-btn">push 1</button>
        <button type="button" {...ACTIONS.push100.attrs} className="demo-btn">push 100</button>
        <button type="button" {...ACTIONS.toggleFirst.attrs} className="demo-btn">toggle row 0</button>
        <button type="button" {...ACTIONS.moveFirstLast.attrs} className="demo-btn">move 0 → end</button>
        <button type="button" {...ACTIONS.removeLast.attrs} className="demo-btn demo-btn-ghost">pop</button>
        <button type="button" {...ACTIONS.reset.attrs} className="demo-btn demo-btn-ghost">reset</button>
      </div>

      <p className="demo-note">
        Last patch: <code>{lastPatch.value}</code>
        {' · '}length: <code>{rows.value.length}</code>
      </p>

      <ul className="demo-keyed-list demo-arraysig-list">
        {each(rows, (row) => (
          <li
            className={`demo-keyed-row${row.selected ? ' demo-keyed-row--selected' : ''}`}
            data-key={row.id}
          >
            <span className="demo-keyed-label">{row.label}</span>
            <button
              type="button"
              {...ACTIONS.toggle.attrs}
              {...ITEM.id(row.id)}
              className="demo-btn demo-btn-ghost demo-btn-tiny"
            >
              {row.selected ? '✓' : '·'}
            </button>
          </li>
        ))}
      </ul>

      <p className="demo-note">
        Each mutator emits one patch event. <code>push 100</code> emits 100
        contiguous <code>insert</code> patches that the reconciler bulk-parses
        in one <code>template.innerHTML</code> call. Toggle a row — only
        that row's <code>&lt;li&gt;</code> is replaced; siblings keep their
        existing DOM nodes. Move row 0 to the end — the LIS pass moves a single
        node, no rebuild.
      </p>
    </div>
  ));

  delegate(root, 'click', ACTIONS.push.selector, () => {
    const row = makeRow(`Item ${rowSeq + 1}`);
    rows.push(row);
    logPatch('push', `${row.label}`);
  });

  delegate(root, 'click', ACTIONS.push100.selector, () => {
    const start = rowSeq + 1;
    for (let i = 0; i < 100; i++) {
      rows.push(makeRow(`Item ${start + i}`));
    }
    logPatch('push×100', `Item ${start}..${start + 99}`);
  });

  delegate(root, 'click', ACTIONS.toggleFirst.selector, () => {
    if (rows.value.length === 0) return;
    rows.update(0, (r) => ({ ...r, selected: !r.selected }));
    // arraySignal mutates _items eagerly, so rows.value[0].selected is
    // already the post-update value here — log it directly, not negated.
    logPatch('update', `0 selected→${rows.value[0].selected ? 'true' : 'false'}`);
  });

  delegate(root, 'click', ACTIONS.toggle.selector, (_e, btn) => {
    const id = (btn as HTMLElement).dataset.id;
    const idx = rows.value.findIndex((r) => r.id === id);
    if (idx === -1) return;
    rows.update(idx, (r) => ({ ...r, selected: !r.selected }));
    logPatch('update', `${idx} selected toggle`);
  });

  delegate(root, 'click', ACTIONS.moveFirstLast.selector, () => {
    if (rows.value.length < 2) return;
    rows.move(0, rows.value.length - 1);
    logPatch('move', `0 → ${rows.value.length - 1}`);
  });

  delegate(root, 'click', ACTIONS.removeLast.selector, () => {
    if (rows.value.length === 0) return;
    const idx = rows.value.length - 1;
    const removed = rows.remove(idx);
    logPatch('remove', `${idx} (${removed.label})`);
  });

  delegate(root, 'click', ACTIONS.reset.selector, () => {
    rows.replace([
      makeRow('Apple'),
      makeRow('Banana'),
      makeRow('Cherry'),
    ]);
    logPatch('replace', '3 items');
  });
}
