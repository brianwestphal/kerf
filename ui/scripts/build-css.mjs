import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import postcss from 'postcss';

import remifyCss from './remify-css.mjs';

const sourceDirectory = new URL('../src/', import.meta.url);
const outputDirectory = new URL('../dist/styles/', import.meta.url);

async function cssFiles(directory, prefix = '') {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relative = `${prefix}${entry.name}`;
    if (entry.isDirectory()) {
      files.push(
        ...(await cssFiles(
          new URL(`${entry.name}/`, directory),
          `${relative}/`,
        )),
      );
    } else if (entry.name.endsWith('.css')) {
      files.push(relative);
    }
  }
  return files;
}

const FACADE =
  /^\/\* Public stylesheet entry; implementation is colocated with the component\. \*\/\s+((?:@import ["'][^"']+["'];\s*)+)$/;

/**
 * A public stylesheet entry (a facade of only `@import`s) ships as one
 * self-contained file: each import is inlined in order, recursing into
 * imported facades, so `backdrop-image.css` carries the shared scroll-effect
 * layer it builds on even when it is read or concatenated as text.
 */
async function inlineFacade(path) {
  const css = await readFile(path, 'utf8');
  const facade = FACADE.exec(css);
  if (!facade) return css;
  const parts = [];
  for (const [, target] of facade[1].matchAll(/@import ["']([^"']+)["'];/g))
    parts.push(await inlineFacade(resolve(dirname(path), target)));
  return parts.join('\n');
}

const files = (await cssFiles(sourceDirectory)).sort();

await mkdir(outputDirectory, { recursive: true });
await Promise.all(
  files.map(async (file) => {
    const source = new URL(file, sourceDirectory);
    const output = new URL(file, outputDirectory);
    await mkdir(dirname(fileURLToPath(output)), { recursive: true });
    const result = await postcss([remifyCss()]).process(
      await inlineFacade(fileURLToPath(source)),
      {
        from: fileURLToPath(source),
        to: fileURLToPath(output),
        map: false,
      },
    );
    if (result.css.includes('remify(')) {
      throw new Error(
        `${file}: built CSS still contains remify() authoring syntax`,
      );
    }
    await writeFile(output, result.css);
  }),
);

console.log(`Built ${files.length} CSS files in dist/styles/.`);
