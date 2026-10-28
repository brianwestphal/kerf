import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import type { ViewContract, ViewDocument } from '@kerfjs/ui/view';
import { describe, expect, it } from 'vitest';

import {
  compareWithModule,
  describeExport,
  exportModule,
  moduleFileName,
} from '../../../src/editor/model/export.js';
import sample from '../../fixtures/view/inbox.kui.json';
import { viewCatalog } from './kerf-catalog.js';

const inbox = sample as unknown as ViewDocument;
const golden = readFileSync(
  resolve(import.meta.dirname, '../../fixtures/view/inbox.view.ts'),
  'utf8',
);

describe('exportModule', () => {
  it('produces exactly what kerf-ui-view generate writes for the same document', () => {
    const result = exportModule(inbox, viewCatalog, 'module');
    expect(result.fileName).toBe('inbox.view.ts');
    expect(result.code).toBe(golden);
  });

  it('omits render for a declarations-only export', () => {
    const result = exportModule(inbox, viewCatalog, 'declarations');
    expect(result.code).not.toContain('renderInbox');
    expect(result.code).toContain('export function wireInbox');
    expect(moduleFileName({ ...inbox, name: 'MailList' })).toBe(
      'mail-list.view.ts',
    );
  });
});

describe('describeExport', () => {
  const base = exportModule(inbox, viewCatalog, 'module').contract;
  const empty: ViewContract = { inputs: {}, actions: {}, slots: {}, refs: {} };

  it('summarizes a first export', () => {
    expect(describeExport(base, undefined)).toEqual({
      title: 'Exported the view module',
      detail: 'Its contract has 4 inputs, 2 actions, 1 slot, 3 refs.',
      breaking: false,
    });
    expect(describeExport(empty, undefined).detail).toBe(
      'Its contract has 0 inputs, 0 actions, 0 slots, 0 refs.',
    );
  });

  it('reports an unchanged contract, compatible changes, and breaking ones', () => {
    expect(describeExport(base, base).title).toBe(
      'Exported; the contract is unchanged',
    );
    const withRef: ViewContract = {
      ...base,
      refs: { ...base.refs, extra: { element: 'HTMLElement', keyed: false } },
    };
    expect(describeExport(withRef, base)).toEqual({
      title: 'Exported with 1 contract change',
      detail: 'Compatible: ref "extra" added',
      breaking: false,
    });
    const report = describeExport(empty, base);
    expect(report.breaking).toBe(true);
    expect(report.title).toMatch(
      /^Exported with 10 contract changes, 10 breaking$/,
    );
    expect(report.detail).toContain('Breaking: action "compose" removed');
  });
});

describe('compareWithModule', () => {
  const current = exportModule(inbox, viewCatalog, 'module').contract;

  it('reports an unchanged contract against the module it would regenerate', () => {
    const result = compareWithModule(golden, current);
    expect(result.contract).toBeDefined();
    expect(result.report).toEqual({
      title: 'Regenerating keeps the module’s contract',
      detail: 'Application code that uses it needs no changes.',
      breaking: false,
    });
  });

  it('lists what regenerating would break, and flags a hand-edited module', () => {
    const changed: ViewContract = {
      ...current,
      actions: { ...current.actions, archive: 'view' },
    };
    expect(compareWithModule(golden, changed).report).toEqual({
      title: 'Regenerating makes 1 contract change, 1 breaking',
      detail: 'Breaking: action "archive" added',
      breaking: true,
    });
    const edited = golden.replace('tone: "brand"', 'tone: "danger"');
    const report = compareWithModule(edited, current).report;
    expect(report.breaking).toBe(true);
    expect(report.detail).toContain('edited by hand');
    expect(compareWithModule(edited, changed).report.detail).toMatch(
      /added The module was also edited by hand/,
    );
  });

  it('rejects a file without a kerf-ui-view header', () => {
    expect(compareWithModule('export const x = 1;\n', current)).toEqual({
      report: expect.objectContaining({
        title: 'That file is not a generated view module',
        breaking: true,
      }),
    });
  });
});
