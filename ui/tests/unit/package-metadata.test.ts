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
        resolve(import.meta.dirname, '../../../site/src/content/docs/docs/component-packages.md'),
      ),
    ).toBe(true);
  });
});
