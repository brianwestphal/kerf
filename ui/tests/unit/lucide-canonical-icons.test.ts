// KF-X611ZD: ui sources and demos import Lucide icons by their canonical
// export, never an alias (`Trash2` for `Trash`), so a demo the editor
// builds writes the same `$icon` name its source does (KF-NTK7YW).
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { LUCIDE_ALIASES } from '../../src/editor/model/lucide-aliases.generated.js';

const uiRoot = resolve(import.meta.dirname, '../..');

function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sources(path);
    return /\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

describe('Lucide icon imports (KF-X611ZD)', () => {
  it('names every icon in ui/src and ux-demo by its canonical export', () => {
    const aliases: string[] = [];
    for (const file of ['src', 'ux-demo'].flatMap((dir) =>
      sources(resolve(uiRoot, dir)),
    ))
      for (const [, list] of readFileSync(file, 'utf8').matchAll(
        /import \{([^}]+)\} from 'lucide'/g,
      ))
        for (const name of list!.split(',').map((item) => item.trim()))
          if (LUCIDE_ALIASES.has(name))
            aliases.push(`${relative(uiRoot, file)}: ${name}`);
    expect(aliases).toEqual([]);
  });
});
