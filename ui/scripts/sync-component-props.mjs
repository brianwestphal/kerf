// Regenerates ui/ai/component-props.json from the built declarations
// (dist/*.d.ts), the component catalogs, the curated overlay, and Web
// Awesome's custom-elements.json. `--check` fails when the committed file is
// stale or an input names something that does not exist. Run after a build.
import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import prettier from 'prettier';

import {
  buildComponentProps,
  readComponentPropsInputs,
} from './lib/component-props.mjs';
import { validateJsonSchemaSubset } from './lib/json-schema-subset.mjs';

const check = process.argv.includes('--check');
const root = fileURLToPath(new URL('..', import.meta.url));
const outputUrl = new URL('../ai/component-props.json', import.meta.url);
const readJson = async (path) =>
  JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));

if (!existsSync(new URL('../dist/index.d.ts', import.meta.url))) {
  console.error(
    'component-props: dist/ is missing; run `npm run build` first.',
  );
  process.exit(1);
}

const inputs = readComponentPropsInputs(root);
const [schema, overlaySchema] = await Promise.all([
  readJson('../ai/component-props.schema.json'),
  readJson('../ai/component-props-overlay.schema.json'),
]);
const { document, problems } = buildComponentProps(inputs);
problems.push(
  ...validateJsonSchemaSubset(overlaySchema, inputs.overlay).map(
    (error) => `component-props-overlay.json ${error}`,
  ),
  ...validateJsonSchemaSubset(schema, document).map(
    (error) => `component-props.json ${error}`,
  ),
);
if (problems.length > 0) {
  for (const problem of problems) console.error(`component-props: ${problem}`);
  process.exit(1);
}

const generated = await prettier.format(JSON.stringify(document), {
  parser: 'json',
});

if (check) {
  const current = existsSync(outputUrl)
    ? await readFile(outputUrl, 'utf8')
    : '';
  if (current !== generated) {
    console.error(
      'ai/component-props.json is stale. Run `npm run props:sync` and commit the result.',
    );
    process.exitCode = 1;
  } else {
    console.log(
      `component-props: ${document.components.length} components in sync.`,
    );
  }
} else {
  await writeFile(outputUrl, generated);
  console.log(
    `component-props: wrote ${document.components.length} components.`,
  );
}
