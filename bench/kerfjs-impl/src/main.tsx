/**
 * kerfjs entry for krausest js-framework-benchmark — keyed.
 *
 * KF-92 update: rows live in an `arraySignal`, and the selected-row state is
 * stored on each row's `selected` flag rather than in a separate signal.
 * This lets every interactive scenario produce granular patch events the
 * keyed-list reconciler can apply in O(changes) instead of iterating all N
 * items on every render:
 *
 *   - Append:   N inserts (no full re-render).
 *   - Update:   N updates (touches only the changed rows).
 *   - Select:   2 updates (deselect old + select new) — no closure re-run on
 *               the surrounds, no full each() iteration.
 *   - Swap:     1 move (1 insertBefore).
 *   - Remove:   1 remove.
 *   - Create:   first render, no granular wins available — same speed as before.
 */

import { arraySignal } from 'kerfjs/array-signal';
import { batch, delegate, each, mount } from 'kerfjs';

interface Row {
  id: number;
  label: string;
  selected: boolean;
}

const ADJECTIVES = [
  'pretty', 'large', 'big', 'small', 'tall', 'short', 'long', 'handsome',
  'plain', 'quaint', 'clean', 'elegant', 'easy', 'angry', 'crazy', 'helpful',
  'mushy', 'odd', 'unsightly', 'adorable', 'important', 'inexpensive',
  'cheap', 'expensive', 'fancy',
];
const COLOURS = [
  'red', 'yellow', 'blue', 'green', 'pink', 'brown', 'purple', 'brown',
  'white', 'black', 'orange',
];
const NOUNS = [
  'table', 'chair', 'house', 'bbq', 'desk', 'car', 'pony', 'cookie',
  'sandwich', 'burger', 'pizza', 'mouse', 'keyboard',
];

let nextId = 1;

function pick(arr: string[]): string {
  return arr[(Math.random() * arr.length) | 0];
}

function buildData(count: number): Row[] {
  const data = new Array<Row>(count);
  for (let i = 0; i < count; i++) {
    data[i] = {
      id: nextId++,
      label: `${pick(ADJECTIVES)} ${pick(COLOURS)} ${pick(NOUNS)}`,
      selected: false,
    };
  }
  return data;
}

const rows = arraySignal<Row>([]);
let selectedIndex = -1;  // index into rows for fast deselect (no array scan)

const root = document.getElementById('main')!;

mount(root, () => (
  <div className="container">
    <div className="jumbotron">
      <div className="row">
        <div className="col-md-6"><h1>kerfjs-keyed</h1></div>
        <div className="col-md-6">
          <div className="row">
            <div className="col-sm-6 smallpad">
              <button type="button" className="btn btn-primary btn-block" id="run">Create 1,000 rows</button>
            </div>
            <div className="col-sm-6 smallpad">
              <button type="button" className="btn btn-primary btn-block" id="runlots">Create 10,000 rows</button>
            </div>
            <div className="col-sm-6 smallpad">
              <button type="button" className="btn btn-primary btn-block" id="add">Append 1,000 rows</button>
            </div>
            <div className="col-sm-6 smallpad">
              <button type="button" className="btn btn-primary btn-block" id="update">Update every 10th row</button>
            </div>
            <div className="col-sm-6 smallpad">
              <button type="button" className="btn btn-primary btn-block" id="clear">Clear</button>
            </div>
            <div className="col-sm-6 smallpad">
              <button type="button" className="btn btn-primary btn-block" id="swaprows">Swap Rows</button>
            </div>
          </div>
        </div>
      </div>
    </div>
    <table className="table table-hover table-striped test-data">
      <tbody id="tbody">
        {each(rows, (row) => (
          <tr data-key={row.id} className={row.selected ? 'danger' : ''}>
            <td className="col-md-1">{String(row.id)}</td>
            <td className="col-md-4"><a className="lbl" data-id={String(row.id)}>{row.label}</a></td>
            <td className="col-md-1"><a className="remove" data-id={String(row.id)}><span className="glyphicon glyphicon-remove" aria-hidden="true"></span></a></td>
            <td className="col-md-6"></td>
          </tr>
        ))}
      </tbody>
    </table>
    <span className="preloadicon glyphicon glyphicon-remove" aria-hidden="true"></span>
  </div>
));

delegate(root, 'click', '#run', () => {
  selectedIndex = -1;
  rows.replace(buildData(1000));
});
delegate(root, 'click', '#runlots', () => {
  selectedIndex = -1;
  rows.replace(buildData(10000));
});
delegate(root, 'click', '#add', () => {
  // Append 1k rows via individual insert events. Wrap in batch() so all
  // 1k inserts coalesce into a single mount re-render that drains the
  // whole patch queue in one granular reconcile pass.
  batch(() => {
    const additions = buildData(1000);
    const startIndex = rows.value.length;
    for (let i = 0; i < additions.length; i++) {
      rows.insert(startIndex + i, additions[i]);
    }
  });
});
delegate(root, 'click', '#update', () => {
  // Update every 10th row via granular .update events, batched.
  batch(() => {
    const len = rows.value.length;
    for (let i = 0; i < len; i += 10) {
      rows.update(i, (r) => ({ ...r, label: r.label + ' !!!' }));
    }
  });
});
delegate(root, 'click', '#clear', () => {
  selectedIndex = -1;
  rows.replace([]);
});
delegate(root, 'click', '#swaprows', () => {
  if (rows.value.length <= 998) return;
  // Two granular moves, batched into a single re-render.
  batch(() => {
    rows.move(998, 1);
    rows.move(2, 998);  // after the first move, the original row at 1 is now at index 2
  });
});
delegate(root, 'click', 'a.lbl', (_e, el) => {
  const id = (el as HTMLElement).dataset.id;
  if (id === undefined) return;
  const target = Number(id);
  // Deselect previous + select new in one batched re-render.
  batch(() => {
    if (selectedIndex !== -1) {
      rows.update(selectedIndex, (r) => ({ ...r, selected: false }));
      selectedIndex = -1;
    }
    const items = rows.value;
    for (let i = 0; i < items.length; i++) {
      if (items[i].id === target) {
        rows.update(i, (r) => ({ ...r, selected: true }));
        selectedIndex = i;
        break;
      }
    }
  });
});
delegate(root, 'click', 'a.remove', (_e, el) => {
  const id = (el as HTMLElement).dataset.id;
  if (id === undefined) return;
  const target = Number(id);
  const items = rows.value;
  for (let i = 0; i < items.length; i++) {
    if (items[i].id === target) {
      rows.remove(i);
      if (selectedIndex === i) selectedIndex = -1;
      else if (selectedIndex > i) selectedIndex -= 1;
      break;
    }
  }
});
