import { readFile } from 'node:fs/promises';
const raw = JSON.parse(await readFile(process.argv[2], 'utf8'));
const { pages, builds } = raw;
function quantile(values, q) {
  const a = values.toSorted((a, b) => a - b);
  const index = (a.length - 1) * q;
  const low = Math.floor(index);
  return a[low] + (a[Math.ceil(index)] - a[low]) * (index - low);
}
function stats(values) {
  if (!values.length) return 'n/a';
  return [
    Math.min(...values),
    quantile(values, 0.5),
    quantile(values, 0.95),
    Math.max(...values),
  ]
    .map((n) => n.toFixed(2))
    .join(' / ');
}
console.log(
  '| Fixture | Operation | Dispatch min / p50 / p95 / max (ms) | Frame opportunity min / p50 / p95 / max (ms) |',
);
console.log('| --- | --- | ---: | ---: |');
for (const name of Object.keys(builds)) {
  const subset = pages.filter((p) => p.name === name);
  if (subset.some((p) => !p.ok)) {
    console.log('| ' + name + ' | failed correctness | — | — |');
    continue;
  }
  const timed = subset.filter((p) => p.pass === 'timing');
  const ops = [
    'coldMount',
    ...new Set(timed[0].samples.map((s) => s.operation)),
  ];
  for (const operation of ops) {
    // Each picker page also remounts once to check duplicate commits. Use
    // cycle zero for comparable samples; cycle one remains in raw evidence.
    const rows = timed.map((p) =>
      operation === 'coldMount'
        ? p.coldMount
        : p.samples.find((s) => s.operation === operation),
    );
    console.log(
      '| ' +
        [
          name,
          operation,
          stats(rows.flatMap((x) => x.syncMs ?? [])),
          stats(rows.map((x) => x.opportunityMs)),
        ].join(' | ') +
        ' |',
    );
  }
}
