import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
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

const files = (await cssFiles(sourceDirectory)).sort();

await mkdir(outputDirectory, { recursive: true });
await Promise.all(
  files.map(async (file) => {
    const source = new URL(file, sourceDirectory);
    const output = new URL(file, outputDirectory);
    await mkdir(dirname(fileURLToPath(output)), { recursive: true });
    const result = await postcss([remifyCss()]).process(
      await readFile(source, 'utf8'),
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
