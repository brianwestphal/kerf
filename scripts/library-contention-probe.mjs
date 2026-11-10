// KF-1XBJDT: same-VM manual evidence, never a retry or a production gate.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { availableParallelism, cpus, loadavg, uptime } from 'node:os';
import { delimiter, dirname, join, resolve } from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

export const contentionCells = [
  { name: 'single-trace-on', workers: 1, trace: 'on' },
  { name: 'three-trace-on', workers: 3, trace: 'on' },
  { name: 'three-trace-off', workers: 3, trace: 'off' },
  { name: 'single-trace-off', workers: 1, trace: 'off' },
];
const performanceSpec = 'tests/browser/library-performance.spec.ts';
const performanceTitle =
  'Library expand/collapse remains responsive with 5000 project files';
const marker = '        const sample = {\n';
const timedMarker = `${marker}          startedAt: performance.timeOrigin + start,\n`;
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const save = (path, value) =>
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);

export function instrumentDisclosureTiming(source) {
  assert.ok(
    !source.includes('startedAt: performance.timeOrigin + start,'),
    'Already instrumented',
  );
  assert.equal(
    source.split(marker).length,
    2,
    'Expected one canonical disclosure sample',
  );
  const result = source.replace(marker, timedMarker);
  assert.equal(result.replace(timedMarker, marker), source);
  return result;
}

export function contentionArguments(cell, browser, output) {
  assert.ok(['chromium', 'firefox', 'webkit'].includes(browser));
  assert.ok(
    contentionCells.some(
      (known) => JSON.stringify(known) === JSON.stringify(cell),
    ),
  );
  return [
    'test',
    performanceSpec,
    ...(cell.workers === 3
      ? ['tests/browser/library.spec.ts', 'tests/browser/params.spec.ts']
      : []),
    `--project=${browser}`,
    `--workers=${cell.workers}`,
    '--retries=0',
    `--trace=${cell.trace}`,
    `--output=${output}`,
    '--reporter=list,json',
  ];
}

export function reportIntervals(report) {
  const entries = [];
  const visit = (suite) => {
    for (const spec of suite.specs ?? [])
      for (const test of spec.tests ?? [])
        for (const result of test.results ?? []) {
          const start = Date.parse(result.startTime);
          entries.push({
            title: spec.title,
            file: spec.file ?? suite.file,
            status: result.status,
            workerIndex: result.workerIndex,
            start,
            end: start + result.duration,
          });
        }
    for (const child of suite.suites ?? []) visit(child);
  };
  for (const suite of report.suites ?? []) visit(suite);
  return entries;
}

export function summarizeDisclosure(metrics, intervals) {
  assert.equal(metrics.measurements.length, 4, 'Missing disclosure samples');
  return metrics.measurements.map((sample, index) => {
    for (const key of ['startedAt', 'taskMs', 'visibleFrameMs'])
      assert.ok(
        Number.isFinite(sample[key]) && sample[key] >= 0,
        `Invalid ${key}`,
      );
    assert.equal(sample.stableBranch, true);
    assert.equal(sample.added, index % 2 ? 25 : 0);
    assert.equal(sample.removed, index % 2 ? 0 : 25);
    return {
      ...sample,
      taskBudgetPassed: sample.taskMs < 1000,
      visibleBudgetPassed: sample.visibleFrameMs < 1000,
      competingTests: intervals.filter(
        (test) =>
          test.title !== performanceTitle &&
          test.start < sample.startedAt + sample.visibleFrameMs &&
          test.end > sample.startedAt,
      ),
    };
  });
}

export function assertMeaningfulOverlap(measurements) {
  assert.ok(
    measurements.length === 4 &&
      measurements.every((sample) => sample.competingTests.length > 0),
    'Every measured click must overlap actual competing tests',
  );
}

export function unavailableAfter(execution) {
  return (
    execution.error !== null ||
    execution.signal !== null ||
    execution.status === null
  );
}

const environment = () => ({
  at: new Date().toISOString(),
  uptime: uptime(),
  cpus: cpus(),
  availableParallelism: availableParallelism(),
  loadavg: loadavg(),
  linuxCpuPressure: existsSync('/proc/pressure/cpu')
    ? readFileSync('/proc/pressure/cpu', 'utf8')
    : null,
});
const files = (root) =>
  existsSync(root)
    ? readdirSync(root, { withFileTypes: true }).flatMap((item) =>
        item.isDirectory()
          ? files(join(root, item.name))
          : [join(root, item.name)],
      )
    : [];

export async function runLibraryContention(target, evidence, browser) {
  assert.ok(
    ['chromium', 'firefox', 'webkit'].includes(browser),
    'Unknown browser',
  );
  target = resolve(target);
  evidence = resolve(evidence);
  mkdirSync(evidence, { recursive: true });
  const editor = join(target, 'editor');
  const specPath = join(editor, performanceSpec);
  const original = readFileSync(specPath, 'utf8');
  const patched = instrumentDisclosureTiming(original);
  const git = (args) => {
    const value = spawnSync('git', ['-C', target, ...args], {
      encoding: 'utf8',
    });
    assert.equal(value.status, 0, value.stderr);
    return value.stdout.trim();
  };
  assert.equal(
    git(['diff', '--', `editor/${performanceSpec}`]),
    '',
    'Candidate spec is dirty',
  );
  const sourceSha = git(['rev-parse', 'HEAD']);
  if (process.env.SOURCE_SHA) assert.equal(sourceSha, process.env.SOURCE_SHA);
  const result = {
    schema: 'kerf-library-contention/v1',
    sourceSha,
    workflowSha: process.env.GITHUB_SHA ?? null,
    runId: process.env.GITHUB_RUN_ID ?? null,
    controllerSha256: sha(readFileSync(new URL(import.meta.url))),
    node: process.version,
    npm: spawnSync('npm', ['--version'], { encoding: 'utf8' }).stdout.trim(),
    browser,
    originalSpecSha256: sha(original),
    instrumentedSpecSha256: sha(patched),
    instrumentation:
      'Only startedAt = performance.timeOrigin + existing start is added; original actions, pacing, metrics and assertions are byte-preserved.',
    cells: [],
  };
  const inputPaths = [
    'package.json',
    'package-lock.json',
    'ui/package.json',
    'ui/package-lock.json',
    'editor/package.json',
    'editor/package-lock.json',
  ];
  const hashes = () =>
    Object.fromEntries(
      inputPaths.map((path) => [path, sha(readFileSync(join(target, path)))]),
    );
  result.inputs = hashes();
  const playwright = await import(
    pathToFileURL(join(editor, 'node_modules/playwright/index.mjs')).href
  );
  const { createFirefoxAppData } = await import(
    pathToFileURL(join(target, 'ui/evaluator/firefox-app-data.mjs')).href
  );
  const firefox = createFirefoxAppData();
  const launched = await playwright[browser].launch(
    browser === 'firefox' ? { env: firefox.env } : {},
  );
  try {
    result.browserVersion = launched.version();
    result.browserExecutable = playwright[browser].executablePath();
  } finally {
    await launched.close();
    firefox.dispose();
  }
  result.playwright = JSON.parse(
    readFileSync(join(editor, 'node_modules/playwright/package.json'), 'utf8'),
  ).version;
  assert.equal(result.playwright, '1.64.1');
  save(join(evidence, 'summary.json'), result);
  writeFileSync(join(evidence, 'original-performance.spec.ts'), original);
  writeFileSync(join(evidence, 'instrumented-performance.spec.ts'), patched);
  try {
    writeFileSync(specPath, patched);
    writeFileSync(
      join(evidence, 'instrumentation.diff'),
      git(['diff', '--', `editor/${performanceSpec}`]),
    );
    writeFileSync(
      join(evidence, 'inverse.patch'),
      git(['diff', '-R', '--', `editor/${performanceSpec}`]),
    );
    let unavailableReason = null;
    for (const cell of contentionCells) {
      if (unavailableReason) {
        result.cells.push({
          ...cell,
          unavailableReason,
          execution: {
            status: null,
            signal: null,
            error: 'UNAVAILABLE_AFTER_ABORT',
          },
        });
        save(join(evidence, 'summary.json'), result);
        continue;
      }
      const folder = join(evidence, cell.name);
      mkdirSync(folder, { recursive: true });
      const args = contentionArguments(
        cell,
        browser,
        join(folder, 'test-results'),
      );
      const item = {
        ...cell,
        command: [
          'node',
          'editor/node_modules/@playwright/test/cli.js',
          ...args,
        ],
        before: environment(),
      };
      const execution = spawnSync(
        process.execPath,
        [join(editor, 'node_modules/@playwright/test/cli.js'), ...args],
        {
          cwd: editor,
          env: {
            ...process.env,
            PATH: `${dirname(process.execPath)}${delimiter}${process.env.PATH ?? ''}`,
            PLAYWRIGHT_JSON_OUTPUT_FILE: join(folder, 'playwright.json'),
          },
          encoding: 'utf8',
          timeout: 300_000,
          killSignal: 'SIGKILL',
          maxBuffer: 64 * 1024 * 1024,
        },
      );
      item.after = environment();
      item.execution = {
        status: execution.status,
        signal: execution.signal,
        error: execution.error?.code ?? null,
      };
      if (unavailableAfter(item.execution))
        unavailableReason = `Prior cell ${cell.name} aborted; child web-server cleanup cannot be assumed`;
      writeFileSync(join(folder, 'stdout.log'), execution.stdout ?? '');
      writeFileSync(join(folder, 'stderr.log'), execution.stderr ?? '');
      try {
        const report = JSON.parse(
          readFileSync(join(folder, 'playwright.json'), 'utf8'),
        );
        item.intervals = reportIntervals(report);
        const metricsPaths = files(join(folder, 'test-results')).filter(
          (path) => path.endsWith('/KF-1XBJDT-disclosure-metrics.json'),
        );
        assert.equal(metricsPaths.length, 1, 'Expected one raw metrics file');
        const metrics = JSON.parse(readFileSync(metricsPaths[0], 'utf8'));
        item.measurements = summarizeDisclosure(metrics, item.intervals);
        if (cell.workers === 3) assertMeaningfulOverlap(item.measurements);
      } catch (error) {
        item.evidenceError = error.message;
      }
      result.cells.push(item);
      save(join(evidence, 'summary.json'), result);
      console.log(
        `${cell.name}: exit ${execution.status}; evidence ${item.evidenceError ?? 'complete'}`,
      );
      assert.deepEqual(
        hashes(),
        result.inputs,
        'Candidate manifest/lock changed',
      );
      assert.equal(
        readFileSync(specPath, 'utf8'),
        patched,
        'Candidate test changed during control',
      );
    }
  } finally {
    writeFileSync(specPath, original);
  }
  assert.equal(readFileSync(specPath, 'utf8'), original);
  result.failedCells = result.cells
    .filter(
      (cell) =>
        cell.execution.status !== 0 ||
        cell.execution.signal ||
        cell.execution.error ||
        cell.evidenceError,
    )
    .map((cell) => cell.name);
  save(join(evidence, 'summary.json'), result);
  return result;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const [target, evidence, browser] = process.argv.slice(2);
  assert.ok(
    target && evidence && browser,
    'Usage: node library-contention-probe.mjs <target> <evidence> <browser>',
  );
  const result = await runLibraryContention(target, evidence, browser);
  if (result.failedCells.length) process.exitCode = 1;
}
