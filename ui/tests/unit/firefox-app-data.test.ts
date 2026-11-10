// @vitest-environment node
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname } from 'node:path';
import process from 'node:process';

import { describe, expect, it } from 'vitest';

import { createFirefoxAppData } from '../../evaluator/firefox-app-data.mjs';

describe('Firefox app-data ownership', () => {
  it('uses separate real directories per macOS launch and disposes only its own data', () => {
    const original = { KEEP: 'value' };
    const first = createFirefoxAppData({ platform: 'darwin', env: original });
    const second = createFirefoxAppData({ platform: 'darwin', env: original });
    const firstRoot = dirname(first.env.MOZ_APP_DATA!);
    try {
      expect(first.env.KEEP).toBe('value');
      expect(original).toEqual({ KEEP: 'value' });
      expect(first.env.MOZ_APP_DATA).not.toBe(second.env.MOZ_APP_DATA);
      expect(first.env.MOZ_APP_DATA).not.toBe(first.env.MOZ_LOCAL_APP_DATA);
      expect(existsSync(first.env.MOZ_APP_DATA!)).toBe(true);
      expect(existsSync(first.env.MOZ_LOCAL_APP_DATA!)).toBe(true);
      first.dispose();
      first.dispose();
      expect(existsSync(firstRoot)).toBe(false);
      expect(existsSync(second.env.MOZ_APP_DATA!)).toBe(true);
    } finally {
      first.dispose();
      second.dispose();
    }
  });

  it('preserves complete explicit overrides and non-macOS launch environments', () => {
    for (const options of [
      { platform: 'linux' as const, env: { KEEP: 'linux' } },
      {
        platform: 'darwin' as const,
        env: {
          MOZ_APP_DATA: 'explicit-data',
          MOZ_LOCAL_APP_DATA: 'explicit-cache',
        },
      },
    ]) {
      const result = createFirefoxAppData(options);
      expect(result.env).toEqual(options.env);
      expect(result.env).not.toBe(options.env);
      result.dispose();
    }
  });

  it('cleans a runner-owned directory when its process exits', () => {
    const moduleUrl = new URL(
      '../../evaluator/firefox-app-data.mjs',
      import.meta.url,
    );
    const source = `import { createFirefoxAppData } from ${JSON.stringify(moduleUrl.href)}; console.log(createFirefoxAppData({ platform: 'darwin', env: {} }).env.MOZ_APP_DATA);`;
    const path = execFileSync(
      process.execPath,
      ['--input-type=module', '-e', source],
      {
        encoding: 'utf8',
      },
    ).trim();
    expect(existsSync(dirname(path))).toBe(false);
  });
});
