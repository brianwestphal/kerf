import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

import { describe, expect, it } from 'vitest';

const TESTS = join(import.meta.dirname, '..');

function testFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory())
      return entry.name === 'node_modules' ? [] : testFiles(path);
    return /\.test\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

// Tests that spawn processes finish well under a second on an idle machine but
// can pass vitest's 5s default under the parallel pre-push gate's load, which
// has flaked pushes more than once. Every such file declares an explicit
// budget — a describe/it `{ timeout }` option or a numeric trailing timeout.
describe('process-spawning test budgets', () => {
  it('gives every test file that imports child_process an explicit timeout', () => {
    const missing = testFiles(TESTS)
      .filter((file) =>
        /from ['"](?:node:)?child_process['"]/.test(readFileSync(file, 'utf8')),
      )
      .filter(
        (file) =>
          !/timeout:\s*[\d_]+|\},\s*[\d_]+\);/.test(readFileSync(file, 'utf8')),
      )
      .map((file) => relative(TESTS, file));
    expect(missing).toEqual([]);
  });
});
