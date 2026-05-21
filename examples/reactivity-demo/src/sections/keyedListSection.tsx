/**
 * §4 — Keyed list with identity preservation.
 *
 * Each row has a `data-key`. morphdom matches rows across re-renders by key,
 * so an unrelated reorder/insert moves existing DOM nodes instead of
 * destroying and recreating them. The proof: every row contains an `<input>`.
 * Type into a row's input, then reorder the list — your typed value stays
 * with the same logical row.
 */

import { attr, delegate, mount, signal, type AttrSpec } from 'kerfjs';

const ACTIONS = {
  add:      attr('data-action', 'add'),
  remove:   attr('data-action', 'remove'),
  shuffle:  attr('data-action', 'shuffle'),
  reverse:  attr('data-action', 'reverse'),
  rerender: attr('data-action', 'rerender'),
} as const satisfies Record<string, AttrSpec<'data-action'>>;
const ITEM = { id: attr('data-id') } as const;

interface Row { id: string; label: string }

let rowSeq = 0;
function makeRow(label: string): Row {
  rowSeq += 1;
  return { id: `row-${rowSeq}`, label };
}

export function mountKeyedList(root: HTMLElement): void {
  const rows = signal<Row[]>([
    makeRow('Alpha'),
    makeRow('Beta'),
    makeRow('Gamma'),
  ]);
  const renderTicks = signal(0);

  mount(root, () => {
    void renderTicks.value;
    return (
      <div className="demo-card">
        <h2>4. Keyed list <span className="demo-tag">data-key • identity preserved across reorders</span></h2>

        <div className="demo-row">
          <button type="button" {...ACTIONS.add.attrs} className="demo-btn">+ add row</button>
          <button type="button" {...ACTIONS.shuffle.attrs} className="demo-btn">shuffle</button>
          <button type="button" {...ACTIONS.reverse.attrs} className="demo-btn">reverse</button>
          <button type="button" {...ACTIONS.rerender.attrs} className="demo-btn demo-btn-ghost">force re-render</button>
        </div>

        <ul className="demo-keyed-list">
          {rows.value.map((row) => (
            <li className="demo-keyed-row" data-key={row.id}>
              <span className="demo-keyed-label">{row.label}</span>
              <input
                type="text"
                placeholder="type something..."
                className="demo-input demo-input-inline"
                autocomplete="off"
                spellcheck="false"
              />
              <button type="button" {...ACTIONS.remove.attrs} {...ITEM.id(row.id)} className="demo-btn demo-btn-ghost demo-btn-tiny">×</button>
            </li>
          ))}
        </ul>

        <p className="demo-note">
          Type into the inputs. Then shuffle / reverse / add — your typed values
          travel with their row because the <code>data-key</code> tells morphdom
          to move the existing DOM node rather than rebuild a new one.
        </p>
      </div>
    );
  });

  delegate(root, 'click', ACTIONS.add.selector, () => {
    rows.value = [...rows.value, makeRow(`Row ${rows.value.length + 1}`)];
  });
  delegate(root, 'click', ACTIONS.remove.selector, (_e, btn) => {
    const id = (btn as HTMLElement).dataset.id;
    if (id !== undefined) rows.value = rows.value.filter((r) => r.id !== id);
  });
  delegate(root, 'click', ACTIONS.shuffle.selector, () => {
    rows.value = [...rows.value].sort(() => Math.random() - 0.5);
  });
  delegate(root, 'click', ACTIONS.reverse.selector, () => {
    rows.value = [...rows.value].reverse();
  });
  delegate(root, 'click', ACTIONS.rerender.selector, () => {
    renderTicks.value += 1;
  });
}
