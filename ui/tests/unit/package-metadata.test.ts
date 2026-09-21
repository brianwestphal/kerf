import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

describe('package metadata', () => {
  it('points the homepage at the published component-package documentation', () => {
    const packageJson = JSON.parse(
      readFileSync(resolve(import.meta.dirname, '../../package.json'), 'utf8'),
    ) as { homepage: string };

    expect(packageJson.homepage).toBe(
      'https://brianwestphal.github.io/kerf/docs/component-packages/',
    );
    expect(
      existsSync(
        resolve(
          import.meta.dirname,
          '../../../site/src/content/docs/docs/component-packages.md',
        ),
      ),
    ).toBe(true);
  });

  it('builds the UI distribution before catalog validation in CI and releases', () => {
    const repoRoot = resolve(import.meta.dirname, '../../..');
    const ciWorkflow = readFileSync(
      resolve(repoRoot, '.github/workflows/ci.yml'),
      'utf8',
    );
    const releaseWorkflow = readFileSync(
      resolve(repoRoot, '.github/workflows/release-ui.yml'),
      'utf8',
    );
    const ciUiJob = ciWorkflow.slice(
      ciWorkflow.indexOf('  ui:\n'),
      ciWorkflow.indexOf('  browser:\n'),
    );
    const releaseValidationJob = releaseWorkflow.slice(
      releaseWorkflow.indexOf('  validate-and-build:\n'),
      releaseWorkflow.indexOf('  detect:\n'),
    );

    expect(ciUiJob).toContain(
      [
        '      - run: npm ci',
        '      - run: npm run build',
        '      - run: npm run check',
      ].join('\n'),
    );
    expect(releaseValidationJob).toContain(
      [
        '      - run: npm ci',
        '        working-directory: ui',
        '      - run: npm run build',
        '        working-directory: ui',
        '      - run: npm run check',
        '        working-directory: ui',
      ].join('\n'),
    );
  });
});
