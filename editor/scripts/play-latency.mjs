// KF-GCZ2AP: Play child-HTML latency on the editor preview server, alone
// and while the same process answers project-type analyses. Run against a
// built preview (`npm run build && npm run preview` in editor/):
//   node scripts/play-latency.mjs [http://127.0.0.1:42917]
// See docs/reports/2026-11-11-play-response-latency.md.
const base = process.argv[2] ?? 'http://127.0.0.1:42917';
const playUrl = `${base}/?kerf-ui-play=probe`;
const typesUrl = `${base}/__kerf-ui-editor/api/types`;

const now = () => performance.now();
async function html() {
  const start = now();
  const response = await fetch(playUrl, { cache: 'no-store' });
  await response.text();
  return now() - start;
}
async function analyze(text) {
  const start = now();
  const response = await fetch(typesUrl, {
    method: 'POST',
    headers: { 'x-kerf-ui-editor': '1', 'content-type': 'application/json' },
    body: JSON.stringify({
      action: 'analyze',
      source: 'drafts/probe.kui.json',
      text,
    }),
  });
  const body = await response.text();
  return { ms: now() - start, status: response.status, bytes: body.length };
}
const stats = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  const pick = (p) =>
    sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];
  return {
    n: values.length,
    median: +pick(0.5).toFixed(1),
    p95: +pick(0.95).toFixed(1),
    max: +sorted.at(-1).toFixed(1),
  };
};
/** HTML requests every 25ms while `work` runs. */
async function during(work) {
  const latencies = [];
  let running = true;
  const poller = (async () => {
    while (running) {
      latencies.push(await html());
      await new Promise((done) => setTimeout(done, 25));
    }
  })();
  const result = await work();
  running = false;
  await poller;
  return { result, html: stats(latencies) };
}

const report = {};
for (let index = 0; index < 5; index += 1) await html();
const baseline = [];
for (let index = 0; index < 40; index += 1) baseline.push(await html());
report.baseline = stats(baseline);
report.coldAnalysis = await during(() =>
  analyze('{ id: string; count: number }'),
);
const warm = [];
for (let index = 0; index < 5; index += 1)
  warm.push(await during(() => analyze(`{ id: string; n${index}: number[] }`)));
report.warmAnalyses = warm.map(({ result, html }) => ({
  analyzeMs: +result.ms.toFixed(1),
  status: result.status,
  htmlMax: html.max,
  htmlMedian: html.median,
}));
report.concurrentPair = await during(() =>
  Promise.all([
    analyze('{ a: string; b: Record<string, number> }'),
    analyze('Array<{ c: boolean }>'),
  ]),
);
report.concurrentPair.result = report.concurrentPair.result.map((item) => ({
  ms: +item.ms.toFixed(1),
  status: item.status,
}));
report.coldAnalysis.result = {
  ms: +report.coldAnalysis.result.ms.toFixed(1),
  status: report.coldAnalysis.result.status,
};
console.log(JSON.stringify(report, null, 2));
