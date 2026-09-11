// @vitest-environment node
import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const DIST = resolve(import.meta.dirname, '../../dist');

describe('published JavaScript output', () => {
  it('has no bare chunk imports or duplicate source-map directives', async () => {
    const files = (await readdir(DIST)).filter((file) => file.endsWith('.js'));

    for (const file of files) {
      const source = await readFile(resolve(DIST, file), 'utf8');
      expect(source.match(/^import\s+['"]\.\/chunk-.*\.js['"];?$/gm), file).toBeNull();
      expect(source.match(/^\/\/# sourceMappingURL=.*$/gm), file).toHaveLength(1);
    }
  });
});
