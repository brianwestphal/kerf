// @vitest-environment node
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, beforeAll, expect, it } from 'vitest';

// @ts-expect-error -- internal CLI implementation, exercised as a JSON consumer
import { explainUse, formatUse } from '../../doctor/explain-use.mjs';

const root = mkdtempSync(join(tmpdir(), 'kerf-explain-'));
beforeAll(() => {
  writeFileSync(
    join(root, 'tsconfig.json'),
    JSON.stringify({
      compilerOptions: { jsx: 'preserve', noLib: true },
      include: ['*.tsx', '*.ts'],
    }),
  );
  writeFileSync(
    join(root, 'barrel.ts'),
    "export { Combobox as Picker } from '@kerfjs/ui/combobox';",
  );
});
afterAll(() => rmSync(root, { recursive: true, force: true }));

function query(tag: string, setup = '', mount = false) {
  const start = mount ? 'mount(root, () => ' : 'const view = ';
  const lines = [
    "import {Picker} from './barrel';",
    "import { ChoiceChips as Chips } from '@kerfjs/ui/choice-chips';",
    "import {wireComboboxes as wire} from '@kerfjs/ui/wire-comboboxes';",
    "import {mount} from 'kerfjs';",
    'declare const root: HTMLElement, other: HTMLElement;',
    start + tag + (mount ? ');' : ';'),
    setup,
  ];
  writeFileSync(join(root, 'view.tsx'), lines.join('\n'));
  return explainUse(root, `view.tsx:6:${start.length + 2}`);
}
it('explains native, listbox, scroll and dynamic obligations', () => {
  expect(query('<Chips multiple="toggle" />')).toMatchObject({
    schemaVersion: 1,
    component: 'ChoiceChips',
    mode: 'checkboxes',
    required: false,
    diagnostics: [],
  });
  expect(query('<Chips />').mode).toBe('radios');
  expect(query('<Chips multiple />')).toMatchObject({
    mode: 'listbox',
    required: true,
    diagnostics: ['KUI-L401'],
  });
  expect(query('<Chips multiple="toggle" overflow="scroll" />').required).toBe(
    true,
  );
  expect(query('<Chips multiple {...options} />')).toMatchObject({
    mode: 'unknown',
    required: null,
    alternatives: ['radios', 'checkboxes', 'listbox'],
  });
  expect(
    query('<Chips {...options} multiple={false} overflow="wrap" />').required,
  ).toBe(false);
});
it('reports root and disposer evidence by symbol, including barriers', () => {
  const correct = query(
    '<Picker />',
    'const stop=wire(root, opts); function teardown(){stop();}',
    true,
  );
  expect(correct).toMatchObject({
    component: 'Combobox',
    setups: [
      {
        site: 'view.tsx:7:12',
        root: 'root',
        rootEvidence: 'same binding in source',
        retention: 'assigned',
        cleanupCalls: ['view.tsx:7:50'],
      },
    ],
  });
  const unknown = query(
    '<Picker />',
    'const stop=wire(other, opts); function shadow(stop){stop();}',
    true,
  );
  expect(unknown.setups[0]).toMatchObject({
    root: 'other',
    rootEvidence: 'relationship unknown',
    cleanupCalls: [],
  });
  expect(query('<Picker />', 'wire(other,opts);').diagnostics).toEqual([
    'KUI-L402',
  ]);
  expect(query('<AppWrapper />').unknown).toHaveLength(1);
});
it('reports separate setup sites without claiming they execute', () => {
  const shared = join(root, 'shared.ts');
  writeFileSync(
    shared,
    "import {wireComboboxes} from '@kerfjs/ui/wire-comboboxes';\nexport function setup(root){return wireComboboxes(root,opts);}",
  );
  try {
    const report = query('<Picker />', "import './shared';");
    expect(report.setups[0]).toMatchObject({
      site: 'shared.ts:2:36',
      retention: 'returned',
    });
    expect(formatUse(report)).toContain('relationship unknown');
  } finally {
    rmSync(shared);
  }
});
