// @vitest-environment node
import type { Alias } from 'vite';
import { describe, expect, it } from 'vitest';

import { kerfAliases, repo } from '../../vite.workspace.js';

describe('editor workspace runtime identity', () => {
  it('uses the same source JSX runtime for development and production transforms', () => {
    if (!Array.isArray(kerfAliases))
      throw new Error('Expected ordered workspace aliases');
    const aliases = kerfAliases as readonly Alias[];
    const resolve = (specifier: string) =>
      aliases.find(({ find }) =>
        typeof find === 'string' ? find === specifier : find.test(specifier),
      )?.replacement;
    expect(resolve('kerfjs/jsx-runtime')).toBe(`${repo}src/jsx-runtime.ts`);
    expect(resolve('kerfjs/jsx-dev-runtime')).toBe(
      resolve('kerfjs/jsx-runtime'),
    );
    expect(resolve('kerfjs')).toBe(`${repo}src/index.ts`);
  });
});
