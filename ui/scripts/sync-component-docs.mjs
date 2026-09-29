import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  COMPONENT_DOCS_DIR,
  diffComponentDocs,
  renderComponentDocs,
} from './lib/component-docs.mjs';

const check = process.argv.includes('--check');
const root = fileURLToPath(new URL('..', import.meta.url));
const outputDir = resolve(root, COMPONENT_DOCS_DIR);

const [catalog, composition, publicApiSignatures] = await Promise.all([
  readFile(resolve(root, 'ai/component-catalog.json'), 'utf8').then(JSON.parse),
  readFile(resolve(root, 'ai/component-composition.json'), 'utf8').then(
    JSON.parse,
  ),
  readFile(resolve(root, 'ai/public-api-signatures-v1.md'), 'utf8'),
]);
const expected = await renderComponentDocs({
  catalog,
  composition,
  publicApiSignatures,
});

async function readCurrent() {
  const current = new Map();
  let names = [];
  try {
    names = await readdir(outputDir);
  } catch {
    // A missing directory reports every page as missing below.
  }
  for (const name of names.filter((file) => file.endsWith('.md')).sort())
    current.set(name, await readFile(resolve(outputDir, name), 'utf8'));
  return current;
}

const current = await readCurrent();
const problems = diffComponentDocs(expected, current);

if (check) {
  if (problems.length) {
    console.error(
      `[sync-component-docs] ${COMPONENT_DOCS_DIR}/ is out of date (${problems.join(', ')}); run npm run catalog:sync.`,
    );
    process.exitCode = 1;
  } else {
    console.log(
      `[sync-component-docs] OK — ${expected.size} markdown pages match the component and composition catalogs.`,
    );
  }
} else {
  await mkdir(outputDir, { recursive: true });
  for (const name of current.keys())
    if (!expected.has(name)) await rm(resolve(outputDir, name));
  for (const [name, content] of expected)
    if (current.get(name) !== content)
      await writeFile(resolve(outputDir, name), content);
  console.log(
    `[sync-component-docs] wrote ${expected.size} pages to ${COMPONENT_DOCS_DIR}/ (${problems.length} changed).`,
  );
}
