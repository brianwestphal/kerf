import { spawnSync } from 'node:child_process';
import { cwd,execPath } from 'node:process';

import { describe,expect,it } from 'vitest';

function check(output: string) {
  return spawnSync(execPath, ['scripts/check-site-build-output.mjs'], {
    cwd: cwd(),
    encoding: 'utf8',
    input: output,
  });
}

describe('site build output gate', () => {
  it('accepts a clean Astro build with unrelated warnings', () => {
    const result = check([
      'astro v6 building static entrypoints',
      '[WARN] A non-routing advisory that does not threaten the build',
      'Complete!',
    ].join('\n'));

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('no route collisions or future hard errors');
  });

  it('rejects static and dynamic route collisions and future hard-error warnings', () => {
    const output = [
      '[WARN] [router] The route "/docs" is defined twice. A static route cannot be defined more than once.',
      '[WARN] [router] The route "/[slug]" is defined twice using SSR mode. A dynamic SSR route cannot be defined more than once.',
      '\u001b[33m[WARN]\u001b[39m A collision will result in a hard error in following versions of Astro.',
    ].join('\n');

    const result = check(output);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('A static route cannot be defined more than once.');
    expect(result.stderr).toContain('A dynamic SSR route cannot be defined more than once.');
    expect(result.stderr).toContain('A collision will result in a hard error in following versions of Astro.');
  });
});
