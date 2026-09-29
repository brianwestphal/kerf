// @vitest-environment node
import { readdir, readFile } from 'node:fs/promises';
import { relative, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  reachableScripts,
  testSelectors,
  unreachableTestFiles,
} from '../../scripts/lib/test-script-reachability.mjs';

const root = resolve(import.meta.dirname, '../..');

async function filesUnder(directory: string): Promise<string[]> {
  const files: string[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await filesUnder(path)));
    else files.push(relative(root, path));
  }
  return files;
}

describe('test script reachability', () => {
  it('follows npm run and npm test references transitively', () => {
    const scripts = {
      check: 'npm run lint && npm test',
      lint: 'eslint .',
      test: 'npm run -s test:unit',
      'test:unit': 'vitest run tests/unit',
      orphan: 'vitest run tests/orphan',
    };
    expect([...reachableScripts(scripts, ['check'])].sort()).toEqual([
      'check',
      'lint',
      'test',
      'test:unit',
    ]);
  });

  it('reads vitest paths, bare vitest runs, and the Playwright test directory', () => {
    expect(
      testSelectors(
        'npm run build && vitest run ./tests/unit/ tests/a.test.ts --coverage',
      ),
    ).toEqual(['tests/unit', 'tests/a.test.ts']);
    expect(testSelectors('vitest run --coverage')).toEqual(['*']);
    expect(
      testSelectors('playwright test', {
        playwrightTestDir: './tests/browser',
      }),
    ).toEqual(['tests/browser']);
  });

  it('reports a test file no gate-reachable script selects', () => {
    const scripts = {
      check: 'npm run test:unit',
      'test:unit': 'vitest run tests/unit',
      'test:orphan': 'vitest run tests/integration/orphan.test.ts',
    };
    expect(
      unreachableTestFiles(
        [
          'tests/unit/a.test.ts',
          'tests/unit-extra/b.test.ts',
          'tests/integration/orphan.test.ts',
          'tests/integration/helper.ts',
        ],
        scripts,
        ['check'],
      ),
    ).toEqual([
      'tests/unit-extra/b.test.ts',
      'tests/integration/orphan.test.ts',
    ]);
  });

  it('runs every package test file from a gate CI executes', async () => {
    const pkg = JSON.parse(
      await readFile(resolve(root, 'package.json'), 'utf8'),
    ) as { scripts: Record<string, string> };
    const playwrightConfig = await readFile(
      resolve(root, 'playwright.config.ts'),
      'utf8',
    );
    const playwrightTestDir = /testDir:\s*['"]([^'"]+)['"]/.exec(
      playwrightConfig,
    )?.[1];
    expect(playwrightTestDir).toBeDefined();
    const files = await filesUnder(resolve(root, 'tests'));
    // CI's ui job runs `npm run check` then `npm run test:e2e`.
    expect(
      unreachableTestFiles(files, pkg.scripts, ['check', 'test:e2e'], {
        playwrightTestDir,
      }),
    ).toEqual([]);
  });
});
