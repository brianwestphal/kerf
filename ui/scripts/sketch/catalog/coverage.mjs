import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import prettier from 'prettier';

import { COMPONENTS } from '../../build-design-templates.mjs';

const output = fileURLToPath(
  new URL('../../../docs/design/sketch/coverage.md', import.meta.url),
);

// Family assignments are intentionally explicit. A new template component must
// be triaged before this report can pass the offline design-template gate.
const families = [
  {
    name: 'Button pilot',
    ticket: 'KF-MKW7QZ',
    status: 'supported',
    components: ['button'],
  },
  {
    name: 'Form controls',
    ticket: 'KF-8VXPDP',
    status: 'pending',
    components: [
      'split-button',
      'text-field',
      'checkbox',
      'checkbox-group',
      'radio-group',
      'switch',
    ],
  },
  {
    name: 'Advanced inputs',
    ticket: 'KF-6CC071',
    status: 'pending',
    components: [
      'select',
      'search-field',
      'tag-field',
      'slider',
      'color-field',
      'color-picker',
      'color-swatches',
    ],
  },
  {
    name: 'Toolbars and navigation',
    ticket: 'KF-6Q8S95',
    status: 'pending',
    components: [
      'toolbar-control-group',
      'toolbar',
      'toolbar-text',
      'tab-bar',
      'segmented-control',
      'choice-chips',
      'chip',
    ],
  },
  {
    name: 'Lists and data',
    ticket: 'KF-83M2MW',
    status: 'pending',
    components: [
      'list',
      'list-item',
      'list-header',
      'list-action-row',
      'value-table',
    ],
  },
  {
    name: 'Content and feedback',
    ticket: 'KF-P0X4R9',
    status: 'pending',
    components: [
      'disclosure',
      'message-composer',
      'progress-bar',
      'progress-ring',
      'state-banner',
      'empty-state',
      'skeleton',
    ],
  },
];

const seen = new Set();
for (const family of families)
  for (const component of family.components) {
    assert.ok(COMPONENTS[component], `Unknown catalog component: ${component}`);
    assert.ok(
      !seen.has(component),
      `Duplicate catalog component: ${component}`,
    );
    seen.add(component);
  }
assert.deepEqual(
  [...seen].sort(),
  Object.keys(COMPONENTS).sort(),
  'Sketch coverage must classify every template component',
);

const rows = families.flatMap((family) =>
  family.components.flatMap((component) =>
    COMPONENTS[component].variants.map((variant) => ({
      family: family.name,
      component,
      variant: variant.id,
      label: variant.label,
      status: family.status,
      ticket: family.ticket,
    })),
  ),
);
assert.equal(rows.length, 110, 'Reconcile catalog count and ticket batches');
assert.equal(rows.filter((row) => row.status === 'supported').length, 7);
assert.equal(rows.filter((row) => row.status === 'pending').length, 103);
assert.equal(
  new Set(rows.map((row) => `${row.component}/${row.variant}`)).size,
  rows.length,
  'Template variant ids must be unique per component',
);

const counts = families.map(
  (family) =>
    `| ${family.name} | ${family.components.length} | ${rows.filter((row) => row.family === family.name).length} | ${family.status} | ${family.ticket} |`,
);
const variants = rows.map(
  (row) =>
    `| ${row.component} | ${row.variant} | ${row.label.replaceAll('|', '\\|')} | ${row.status} | ${row.ticket} |`,
);
const draft = `# Native Sketch coverage

Generated from \`scripts/build-design-templates.mjs\` by
\`scripts/sketch/catalog/coverage.mjs\`. Run with \`--write\` after changing
the template manifest or a family assignment. The offline
\`check:design-templates\` gate compares this file with the current tree.

The source inventory has **${Object.keys(COMPONENTS).length} components**, **${rows.length} variants**,
and **${rows.length * 2} light/dark SVG captures**. Supported means that an editable
native Symbol batch passed its own browser, override, resize, imported consumer,
and save/reopen checks. Pending means the SVG exists but its reusable Sketch
component boundary and semantic layout have not passed those checks. A source
variant may be a multi-control showcase; a family ticket must export its actual
individual component states and retain the sheet only as a catalog page.

The Button pilot covers seven source showcase variants with 40 editable
appearance Symbols in [Kerf-Button.sketch](button/README.md). Its Symbols are
the first published native batch. The five pending family tickets cover the
other source variants, including ColorSwatches; they must update this matrix
as they ship. The catalog's [install and update guide](README.md) identifies
the current library and supported Sketch version.

## Family batches

| Family | Components | Source variants | Status | Ticket |
| --- | ---: | ---: | --- | --- |
${counts.join('\n')}

## Variant inventory

| Component | Source variant | Presentation | Native status | Ticket |
| --- | --- | --- | --- | --- |
${variants.join('\n')}
`;
const document = await prettier.format(draft, { filepath: output });

if (process.argv.includes('--write')) {
  await writeFile(output, document);
  console.log(`Wrote ${rows.length} Sketch coverage rows.`);
} else {
  assert.equal(
    await readFile(output, 'utf8'),
    document,
    'Sketch coverage changed; run node scripts/sketch/catalog/coverage.mjs --write',
  );
  console.log(`Sketch coverage matches ${rows.length} template variants.`);
}
