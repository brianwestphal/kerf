// @vitest-environment node
import { execFile } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';

import { describe, expect, it } from 'vitest';

import { loadScaledTimeout } from '../../../tests/helpers/load-scaled-timeout.js';

const repo = resolve(import.meta.dirname, '../../..');
const performanceSpec = 'tests/browser/library-performance.spec.ts';
const exclusion = '--test-list-invert=tests/library-performance.exclude';
const editor = resolve(repo, 'editor');
type Suite = {
  suites?: Suite[];
  specs?: Array<{
    id: string;
    file: string;
    tests: Array<{ projectName: string }>;
  }>;
};
const run = promisify(execFile);
/**
 * Playwright's own listing for one browser. Async so a case runs its six
 * listings concurrently: run one after another they took 34 s on a slow CI
 * runner, past the case's unscaled 30 s timeout (KF-1E82EJ).
 */
async function discovered(browser: string, args: string[] = []) {
  const { stdout } = await run(
    process.execPath,
    [
      resolve(editor, 'node_modules/@playwright/test/cli.js'),
      'test',
      '--list',
      '--reporter=json',
      `--project=${browser}`,
      ...args,
    ],
    {
      cwd: editor,
      encoding: 'utf8',
      maxBuffer: 32 * 1024 * 1024,
      env: {
        ...process.env,
        PLAYWRIGHT_JSON_OUTPUT_FILE: '',
        PLAYWRIGHT_JSON_OUTPUT_DIR: '',
        PLAYWRIGHT_JSON_OUTPUT_NAME: '',
      },
    },
  );
  const value = JSON.parse(stdout);
  const records: Array<{ id: string; file: string }> = [];
  const visit = (suite: Suite) => {
    for (const spec of suite.specs ?? [])
      for (const test of spec.tests)
        records.push({ id: `${test.projectName}:${spec.id}`, file: spec.file });
    for (const child of suite.suites ?? []) visit(child);
  };
  for (const suite of value.suites) visit(suite);
  return records;
}

describe('real editor engine coverage (KF-1XBJDT)', () => {
  it.each(['chromium', 'firefox', 'webkit'])(
    'assigns every real %s test exactly once across four functional shards and one benchmark',
    async (browser) => {
      expect(
        readFileSync(
          resolve(editor, 'tests/library-performance.exclude'),
          'utf8',
        ),
      ).toBe('library-performance.spec.ts\n');
      const [baseline, performance, ...shards] = await Promise.all([
        discovered(browser),
        discovered(browser, [performanceSpec]),
        ...[1, 2, 3, 4].map((shard) =>
          discovered(browser, [exclusion, `--shard=${shard}/4`]),
        ),
      ]);
      expect(performance).toHaveLength(1);
      expect(performance[0]!.file).toBe('library-performance.spec.ts');
      const functional = shards.flat();
      console.warn(
        `${browser}: baseline=${baseline.length}, functional shards=${shards.map((tests) => tests.length).join('/')}, benchmark=${performance.length}`,
      );
      expect(
        functional.every((test) => test.file !== 'library-performance.spec.ts'),
      ).toBe(true);
      const assigned = [...functional, ...performance].map((test) => test.id);
      expect(new Set(assigned).size).toBe(assigned.length);
      expect(assigned.sort()).toEqual(baseline.map((test) => test.id).sort());
    },
    loadScaledTimeout(30_000),
  );
});
