import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { cwd, env, execPath } from 'node:process';

import { afterEach, describe, expect, it } from 'vitest';

const SCRIPT = resolve(cwd(), 'scripts/check-feature-coverage.mjs');
const EXPORT_SOURCES = [
  'src/index.ts',
  'src/array-signal.ts',
  'src/html.ts',
  'src/actions.ts',
  'src/overlay.ts',
  'src/scope.ts',
  'src/async.ts',
  'src/list.ts',
  'src/timing.ts',
  'src/remount.ts',
  'src/attach.ts',
  'src/router.ts',
];

const fixtureRoots: string[] = [];

afterEach(() => {
  for (const root of fixtureRoots.splice(0))
    rmSync(root, { recursive: true, force: true });
});

interface GateFixture {
  sources?: Partial<Record<string, string>>;
  completeApps?: string[];
  exampleRows?: string[];
  exampleSpec?: string;
}

function runGate({
  sources = {},
  completeApps = ['fixture-app'],
  exampleRows = [
    '| FC-EX | fixture complete example | `site/src/examples/complete/fixture-app` | `tests/browser/example-apps.spec.ts` › "example smoke" |',
  ],
  exampleSpec = 'test.describe("fixture-app", () => { test("example smoke", () => {}); });',
}: GateFixture = {}) {
  const root = mkdtempSync(join(tmpdir(), 'kerf-feature-coverage-'));
  fixtureRoots.push(root);
  mkdirSync(join(root, 'src'));
  mkdirSync(join(root, 'docs'));
  mkdirSync(join(root, 'site/scripts'), { recursive: true });
  mkdirSync(join(root, 'tests/browser'), { recursive: true });

  for (const source of EXPORT_SOURCES) {
    writeFileSync(join(root, source), sources[source] ?? '');
  }
  writeFileSync(
    join(root, 'site/scripts/build-examples.mjs'),
    `const COMPLETE_APPS = ${JSON.stringify(completeApps)};`,
  );
  writeFileSync(join(root, 'tests/browser/example-apps.spec.ts'), exampleSpec);
  writeFileSync(join(root, 'tests.ts'), 'it("guard", () => {});');
  writeFileSync(
    join(root, 'docs/14-feature-coverage.md'),
    [
      '| ID | Behavior | Implements | Guarding test(s) |',
      '| --- | --- | --- | --- |',
      '| FC-1 | fixture behavior | (fixture) | `tests.ts` › "guard" |',
      ...exampleRows,
    ].join('\n'),
  );

  return spawnSync(execPath, [SCRIPT], {
    cwd: root,
    encoding: 'utf8',
    env: { ...env, KERF_FEATURE_COVERAGE_ROOT: root },
  });
}

describe('feature-coverage export inventory', () => {
  it('rejects an unrepresented value export from the router subpath', () => {
    const result = runGate({
      sources: { 'src/router.ts': 'export function routerOnly() {}' },
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('routerOnly (exported from src/router.ts)');
  });

  it('reports a value exported by core and a subpath only once', () => {
    const result = runGate({
      sources: {
        'src/index.ts': 'export function sharedExport() {}',
        'src/router.ts': 'export function sharedExport() {}',
      },
    });

    expect(result.status).toBe(1);
    expect(result.stderr.match(/sharedExport \(exported from/g)).toHaveLength(
      1,
    );
    expect(result.stderr).toContain(
      'exported from src/index.ts, src/router.ts',
    );
  });

  it('accepts a complete example independently mapped to its own smoke title', () => {
    const result = runGate();

    expect(result.status).toBe(0);
  });

  it('rejects a complete example whose feature row is missing', () => {
    const result = runGate({ completeApps: ['fixture-app', 'unmapped-app'] });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      'complete example "unmapped-app" has no independent feature-index row',
    );
  });

  it("rejects a complete example mapped to another app's smoke title", () => {
    const result = runGate({
      exampleRows: [
        '| FC-EX | fixture complete example | `site/src/examples/complete/fixture-app` | `tests/browser/example-apps.spec.ts` › "other smoke" |',
      ],
      exampleSpec: [
        'test.describe("fixture-app", () => { test("example smoke", () => {}); });',
        'test.describe("other-app", () => { test("other smoke", () => {}); });',
      ].join('\n'),
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      'complete example "fixture-app" has no feature-index row mapped to one of its own browser smoke tests',
    );
  });
});
