import { delegate, each, mount, signal } from 'kerfjs';

interface Row {
  id: number;
  label: string;
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
    };
  }
  return data;
}

const rows = signal<Row[]>([]);
const selected = signal<number>(-1);

const root = document.getElementById('main')!;

mount(root, () => {
  const sel = selected.value;
  return (
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
          {each(
            rows.value,
            (row) => (
              <tr data-key={row.id} className={row.id === sel ? 'danger' : ''}>
                <td className="col-md-1">{String(row.id)}</td>
                <td className="col-md-4"><a className="lbl" data-id={String(row.id)}>{row.label}</a></td>
                <td className="col-md-1"><a className="remove" data-id={String(row.id)}><span className="glyphicon glyphicon-remove" aria-hidden="true"></span></a></td>
                <td className="col-md-6"></td>
              </tr>
            ),
            (row) => row.id === sel ? 1 : 0,
          )}
        </tbody>
      </table>
      <span className="preloadicon glyphicon glyphicon-remove" aria-hidden="true"></span>
    </div>
  );
});

delegate(root, 'click', '#run', () => {
  rows.value = buildData(1000);
  selected.value = -1;
});
delegate(root, 'click', '#runlots', () => {
  rows.value = buildData(10000);
  selected.value = -1;
});
delegate(root, 'click', '#add', () => {
  rows.value = rows.value.concat(buildData(1000));
});
delegate(root, 'click', '#update', () => {
  const next = rows.value.slice();
  for (let i = 0; i < next.length; i += 10) {
    next[i] = { id: next[i].id, label: next[i].label + ' !!!' };
  }
  rows.value = next;
});
delegate(root, 'click', '#clear', () => {
  rows.value = [];
  selected.value = -1;
});
delegate(root, 'click', '#swaprows', () => {
  const data = rows.value;
  if (data.length <= 998) return;
  const next = data.slice();
  const tmp = next[1];
  next[1] = next[998];
  next[998] = tmp;
  rows.value = next;
});
delegate(root, 'click', 'a.lbl', (_e, el) => {
  const id = (el as HTMLElement).dataset.id;
  if (id !== undefined) selected.value = Number(id);
});
delegate(root, 'click', 'a.remove', (_e, el) => {
  const id = (el as HTMLElement).dataset.id;
  if (id === undefined) return;
  const target = Number(id);
  rows.value = rows.value.filter((r) => r.id !== target);
});
