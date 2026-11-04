// Shared by the page and the worker so both threads run byte-identical work.

const ADJ = [
  'pretty',
  'large',
  'big',
  'small',
  'tall',
  'short',
  'long',
  'handsome',
  'plain',
  'quaint',
  'clean',
  'elegant',
  'easy',
  'angry',
  'crazy',
  'helpful',
  'mushy',
  'odd',
  'unsightly',
  'adorable',
];
const NOUN = [
  'table',
  'chair',
  'house',
  'bbq',
  'desk',
  'car',
  'pony',
  'cookie',
  'sandwich',
  'burger',
  'pizza',
  'mouse',
  'keyboard',
];

/** Deterministic rows: `{ id, label }`, krausest-style labels. */
export function makeRows(n) {
  let seed = 1;
  const next = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff);
  const rows = new Array(n);
  for (let i = 0; i < n; i++) {
    const adj = ADJ[next() % ADJ.length];
    const noun = NOUN[next() % NOUN.length];
    rows[i] = { id: i, label: `${adj} ${noun} ${next() % 10000}` };
  }
  return rows;
}

/** Filter by substring, sort by label, return the top 50. */
export function query(rows, q) {
  return rows
    .filter((row) => row.label.includes(q))
    .sort((a, b) =>
      a.label < b.label ? -1 : a.label > b.label ? 1 : a.id - b.id,
    )
    .slice(0, 50);
}

/** A numeric column of `n` doubles. */
export function makeColumn(n) {
  const col = new Float64Array(n);
  for (let i = 0; i < n; i++) col[i] = i * 0.5;
  return col;
}

/** The cheapest possible O(n) pass over a column. */
export function sum(col) {
  let total = 0;
  for (let i = 0; i < col.length; i++) total += col[i];
  return total;
}
