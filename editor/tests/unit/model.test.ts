import type { ViewDocument } from '@kerfjs/ui/view';
import { describe, expect, it } from 'vitest';

import {
  componentNames,
  paletteGroups,
  propsByKey,
} from '../../src/catalog.js';
import { componentFunctions } from '../../src/components.js';
import {
  documentFileName,
  findNode,
  parseDocument,
  serializeDocument,
  visitNodes,
} from '../../src/model/document.js';
import { formatValue, inspectorSections } from '../../src/model/inspector.js';
import { nodeTitle, outlineRows } from '../../src/model/outline.js';
import { sampleInputs, sampleValue } from '../../src/model/sample-inputs.js';
import sample from '../../src/sample.kui.json';

const inbox = sample as unknown as ViewDocument;

describe('document model', () => {
  it('parses view documents and rejects anything else', () => {
    const parsed = parseDocument(serializeDocument(inbox));
    expect(parsed).toEqual({ ok: true, document: inbox });
    expect(parseDocument('{nope')).toMatchObject({
      ok: false,
      error: expect.stringMatching(/^Not valid JSON/),
    });
    expect(parseDocument('{"schema":"other"}')).toEqual({
      ok: false,
      error: 'Not a kerf-ui-document/v1 view document.',
    });
    expect(parseDocument('null')).toMatchObject({ ok: false });
  });

  it('serializes stably and names the file after the document', () => {
    expect(serializeDocument(inbox)).toBe(
      `${JSON.stringify(inbox, null, 2)}\n`,
    );
    expect(documentFileName(inbox)).toBe('inbox.kui.json');
    expect(documentFileName({ ...inbox, name: 'MailFolderList' })).toBe(
      'mail-folder-list.kui.json',
    );
    expect(documentFileName({ ...inbox, name: '' })).toBe('view.kui.json');
  });

  it('visits every node, including $each templates and $if branches', () => {
    const visits = visitNodes(inbox);
    expect(visits.map(({ node }) => node.id.slice(-2))).toEqual([
      '5A',
      '5B',
      '5C',
      '5D',
      '5E',
      '5F',
      '5G',
    ]);
    expect(visits.find(({ node }) => node.name === 'row')?.repeated).toBe(true);
    expect(
      findNode(inbox, '01JB8Z1M6Q8E1X9V4S7K2R3T5D')?.ancestors.map(
        ({ zone }) => zone,
      ),
    ).toEqual(['header', 'trailing']);
    expect(findNode(inbox, 'missing')).toBeUndefined();
    const withElse: ViewDocument = {
      ...inbox,
      root: {
        id: '01JB8Z1M6Q8E1X9V4S7K2R3TZA',
        type: '@kerfjs/ui:list',
        zones: {
          children: [
            {
              $if: true,
              then: {
                id: '01JB8Z1M6Q8E1X9V4S7K2R3TZB',
                type: '#text',
                value: 'a',
              },
              else: {
                id: '01JB8Z1M6Q8E1X9V4S7K2R3TZC',
                type: '#text',
                value: 'b',
              },
            },
            { $slot: 'extra' },
          ],
        },
      },
    };
    expect(visitNodes(withElse)).toHaveLength(3);
  });
});

describe('outline', () => {
  it('labels nodes by name or component and describes where they sit', () => {
    const rows = outlineRows(inbox, componentNames);
    expect(rows[0]).toEqual({
      id: '01JB8Z1M6Q8E1X9V4S7K2R3T5A',
      label: 'Pane',
      detail: 'Root',
      depth: 0,
    });
    expect(rows.find((row) => row.label === 'composeButton')).toMatchObject({
      detail: 'Button · Pane › header › Toolbar › trailing',
      depth: 2,
    });
    expect(rows.find((row) => row.label === 'row')?.detail).toContain(
      'repeated',
    );
  });

  it('titles text runs, composed views, and unknown types', () => {
    const names = new Map<string, string>();
    expect(nodeTitle({ id: 'a', type: '#text', value: 'Short' }, names)).toBe(
      'Text “Short”',
    );
    expect(
      nodeTitle(
        { id: 'a', type: '#text', value: 'A much longer text run that is cut' },
        names,
      ),
    ).toBe('Text “A much longer text run…”');
    expect(
      nodeTitle({ id: 'a', type: '#text', value: { $param: 'x' } }, names),
    ).toBe('Text “bound text”');
    expect(
      nodeTitle({ id: 'a', type: '#view', src: './a.kui.json' }, names),
    ).toBe('View ./a.kui.json');
    expect(nodeTitle({ id: 'a', type: '#view' }, names)).toBe('View');
    expect(nodeTitle({ id: 'a', type: 'pkg:thing' }, names)).toBe('pkg:thing');
  });
});

describe('inspector', () => {
  const button = propsByKey.get('@kerfjs/ui:button')!;
  const node = findNode(inbox, '01JB8Z1M6Q8E1X9V4S7K2R3T5D')!.node;

  it('groups a node’s props by curated group, hiding plumbing and zones', () => {
    const sections = inspectorSections(node, button);
    expect(sections.map((section) => section.title)).toEqual([
      'Content',
      'Appearance',
      'State',
      'Form',
      'Other',
    ]);
    const appearance = sections.find(
      (section) => section.title === 'Appearance',
    )!;
    expect(appearance.rows[0]).toEqual({
      name: 'tone',
      value: '"brand"',
      set: true,
    });
    expect(appearance.rows.find((row) => row.name === 'shape')?.value).toBe(
      '"rounded" (default)',
    );
    const all = sections.flatMap((section) =>
      section.rows.map((row) => row.name),
    );
    expect(all).not.toContain('className');
    expect(all).not.toContain('rootAttributes');
    expect(
      sections
        .find((section) => section.title === 'Other')!
        .rows.find((row) => row.name === 'action')?.value,
    ).toBe('action compose');
  });

  it('documents prop types for a palette component', () => {
    const rows = inspectorSections(
      undefined,
      propsByKey.get('@kerfjs/ui:list-item')!,
    ).flatMap((section) => section.rows);
    expect(rows.find((row) => row.name === 'label')?.value).toMatch(/^.+$/);
    expect(rows.find((row) => row.name === 'density')?.value).toMatch(/\?/);
  });

  it('marks required props a node leaves unset, and formats every value form', () => {
    const item = propsByKey.get('@kerfjs/ui:list-item')!;
    const rows = inspectorSections(
      { id: 'x', type: '@kerfjs/ui:list-item' },
      item,
    ).flatMap((section) => section.rows);
    expect(rows.find((row) => row.name === 'action')?.value).toBe('required');
    expect(formatValue({ $param: 'title' })).toBe('param title');
    expect(formatValue({ $bind: 'item.label' })).toBe('bound to item.label');
    expect(formatValue({ $css: 'px(2)' })).toBe('px(2)');
    expect(formatValue({ $icon: 'inbox' })).toBe('icon inbox');
    expect(formatValue([1, 'a'])).toBe('[1,"a"]');
    expect(formatValue({ 'data-x': 'y' })).toBe('{"data-x":"y"}');
  });
});

describe('preview inputs', () => {
  it('fills params without defaults with placeholders', () => {
    const inputs = sampleInputs(inbox, (label) => `<${label}>`);
    expect(Object.keys(inputs)).toEqual(['selectedId', 'items']);
    expect(inputs.selectedId).toBe('Selected Id');
    expect(inputs.items).toEqual([
      { id: 'Id', label: 'Label' },
      { id: 'Id 2', label: 'Label 2' },
      { id: 'Id 3', label: 'Label 3' },
    ]);
  });

  it('covers every declared kind', () => {
    const content = (label: string) => `<${label}>`;
    expect(sampleValue({ kind: 'number' }, 'count', content, 1)).toBe(2);
    expect(sampleValue({ kind: 'boolean' }, 'on', content)).toBe(false);
    expect(
      sampleValue({ kind: 'enum', values: ['a', 'b'] }, 'tone', content),
    ).toBe('a');
    expect(sampleValue({ kind: 'literal', value: 'x' }, 'kind', content)).toBe(
      'x',
    );
    expect(sampleValue({ kind: 'content' }, 'emptyState', content)).toBe(
      '<Empty State>',
    );
    expect(sampleValue({ kind: 'mystery' }, 'x', content)).toBeUndefined();
  });
});

describe('catalog and components', () => {
  it('maps every Kerf UI component in the props catalog to its function', () => {
    const functions = componentFunctions();
    const kerf = [...propsByKey.values()].filter(
      (component) => component.source === 'kerf',
    );
    expect(Object.keys(functions).sort()).toEqual(
      kerf.map((component) => component.key).sort(),
    );
  });

  it('groups the palette by catalog category with display names', () => {
    const groups = paletteGroups();
    expect(groups[0]?.category).toBe('Foundation');
    expect(
      groups.flatMap((group) => group.items.map((item) => item.name)),
    ).toContain('FieldLabel');
    expect(componentNames.get('@kerfjs/ui:text#FieldLabel')).toBe('FieldLabel');
  });
});
