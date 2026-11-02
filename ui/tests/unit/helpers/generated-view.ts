// Imports a freshly generated view module, for differential tests between
// interpretView and generateView. The module is written under the package's
// ignored test-results folder (Vite serves only files under its root), with
// each `@kerfjs/ui/<entry>` import pointed at this package's source, so the
// generated code and the interpreter render through the same component
// functions.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

import { generateView, type ViewCatalog } from '../../../view/index.mjs';

const root = resolve(import.meta.dirname, '../../..');

/** A scratch folder for generated modules and its cleanup. */
export function generatedViewScratch(): {
  load<Module>(document: object, catalog: ViewCatalog): Promise<Module>;
  dispose(): void;
} {
  mkdirSync(join(root, 'test-results'), { recursive: true });
  const scratch = mkdtempSync(join(root, 'test-results/kui-view-'));
  let count = 0;
  return {
    async load<Module>(document: object, catalog: ViewCatalog) {
      const { code } = generateView(document as never, catalog, {
        target: 'js',
      });
      count += 1;
      const file = join(scratch, `view-${count}.mjs`);
      writeFileSync(
        file,
        code.replace(
          /from '@kerfjs\/ui\/([a-z-]+)'/g,
          (_match, name: string) =>
            `from './${relative(scratch, resolve(root, 'src', `${name}.js`))}'`,
        ),
      );
      return (await import(/* @vite-ignore */ file)) as Module;
    },
    dispose() {
      rmSync(scratch, { recursive: true, force: true });
    },
  };
}
