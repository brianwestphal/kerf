import { spawnSync } from 'node:child_process';
import { mkdirSync,mkdtempSync,rmSync,writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join,resolve } from 'node:path';
import { cwd,env,execPath } from 'node:process';

import { afterEach,describe,expect,it } from 'vitest';

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
  for (const root of fixtureRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function runGate(sources: Partial<Record<string, string>>) {
  const root = mkdtempSync(join(tmpdir(), 'kerf-feature-coverage-'));
  fixtureRoots.push(root);
  mkdirSync(join(root, 'src'));
  mkdirSync(join(root, 'docs'));

  for (const source of EXPORT_SOURCES) {
    writeFileSync(join(root, source), sources[source] ?? '');
  }
  writeFileSync(join(root, 'tests.ts'), 'it("guard", () => {});');
  writeFileSync(
    join(root, 'docs/14-feature-coverage.md'),
    [
      '| ID | Behavior | Guarding test(s) |',
      '| --- | --- | --- |',
      '| FC-1 | fixture behavior | `tests.ts` › "guard" |',
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
    const result = runGate({ 'src/router.ts': 'export function routerOnly() {}' });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('routerOnly (exported from src/router.ts)');
  });

  it('reports a value exported by core and a subpath only once', () => {
    const result = runGate({
      'src/index.ts': 'export function sharedExport() {}',
      'src/router.ts': 'export function sharedExport() {}',
    });

    expect(result.status).toBe(1);
    expect(result.stderr.match(/sharedExport \(exported from/g)).toHaveLength(1);
    expect(result.stderr).toContain('exported from src/index.ts, src/router.ts');
  });
});
