import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import postcss from 'postcss';

import remifyCss from './remify-css.mjs';

const sourceDirectory = new URL('../src/', import.meta.url);
const outputDirectory = new URL('../dist/styles/', import.meta.url);
const files = (await readdir(sourceDirectory)).filter((file) => file.endsWith('.css')).sort();

await mkdir(outputDirectory, { recursive: true });
await Promise.all(files.map(async (file) => {
  const source = new URL(file, sourceDirectory);
  const output = new URL(file, outputDirectory);
  const result = await postcss([remifyCss()]).process(await readFile(source, 'utf8'), {
    from: fileURLToPath(source),
    to: fileURLToPath(output),
    map: false,
  });
  if (result.css.includes('remify(')) {
    throw new Error(`${file}: built CSS still contains remify() authoring syntax`);
  }
  await writeFile(output, result.css);
}));

console.log(`Built ${files.length} CSS files in dist/styles/.`);
