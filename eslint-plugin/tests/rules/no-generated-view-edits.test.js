import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';

import { createRuleTester } from '../helpers/rule-tester.js';

import rule, { viewDigest } from '../../lib/rules/no-generated-view-edits.js';
import { viewDigest as uiViewDigest } from '../../../ui/view/contract.mjs';

const ruleTester = createRuleTester();
// The real generated fixture from @kerfjs/ui's generator tests.
const golden = readFileSync(
  new URL('../../../ui/tests/fixtures/view/inbox.view.ts', import.meta.url),
  'utf8',
);
const folder = mkdtempSync(join(tmpdir(), 'kerfjs-view-rule-'));
writeFileSync(join(folder, 'inbox.kui.json'), '{}');
after(() => rmSync(folder, { recursive: true, force: true }));

const lines = golden.split('\n');
const withHeader = (line1, line2) =>
  [lines[0], line1 ?? lines[1], line2 ?? lines[2], ...lines.slice(3)].join(
    '\n',
  );

test('viewDigest matches @kerfjs/ui/view byte for byte', () => {
  for (const text of ['', 'a', golden, 'ünïcödé\n']) {
    assert.equal(viewDigest(text), uiViewDigest(text));
  }
});

ruleTester.run('no-generated-view-edits', rule, {
  valid: [
    { code: golden, filename: join(folder, 'inbox.view.ts') },
    // Line-ending conversion by a checkout does not count as an edit.
    {
      code: golden.replace(/\n/g, '\r\n'),
      filename: join(folder, 'inbox.view.ts'),
    },
    // Ordinary files, including *.view.ts with no document beside them.
    { code: 'export const x = 1;', filename: join(folder, 'other.ts') },
    { code: 'export const x = 1;', filename: join(folder, 'settings.view.ts') },
  ],
  invalid: [
    {
      code: golden.replace('tone: "brand"', 'tone: "danger"'),
      filename: join(folder, 'inbox.view.ts'),
      errors: [{ messageId: 'edited' }],
    },
    {
      code: `${golden}\nexport const extra = 1;\n`,
      filename: join(folder, 'inbox.view.ts'),
      errors: [{ messageId: 'edited' }],
    },
    {
      code: withHeader('// kui-view: 1 contract broken'),
      filename: join(folder, 'inbox.view.ts'),
      errors: [{ messageId: 'header' }],
    },
    {
      code: withHeader(undefined, '// something else'),
      filename: join(folder, 'inbox.view.ts'),
      errors: [{ messageId: 'header' }],
    },
    {
      code: 'export function renderInbox() {}',
      filename: join(folder, 'inbox.view.ts'),
      errors: [{ messageId: 'missing' }],
    },
  ],
});
