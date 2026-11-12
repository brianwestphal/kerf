import type { ViewDocument } from '@kerfjs/ui/view';
import { describe, expect, it } from 'vitest';

import {
  documentFileName,
  findNode,
  parseDocument,
  serializeDocument,
  visitNodes,
} from '../../../src/editor/model/document.js';
import {
  FOCUSED_FIELD_LIMIT,
  formatValue,
  groupedProps,
  type InspectorComponent,
  type InspectorProp,
  inspectorSections,
  PROP_FAMILIES,
  propPlace,
  splitsIntoPages,
} from '../../../src/editor/model/inspector.js';
import {
  nodeTitle,
  outlineParents,
  outlineRows,
  outlineTree,
  slotRowAddress,
  slotRowId,
} from '../../../src/editor/model/outline.js';
import {
  sampleInputs,
  sampleValue,
} from '../../../src/editor/model/sample-inputs.js';
import sample from '../../fixtures/view/inbox.kui.json';
import { componentNames, paletteGroups, propsByKey } from './kerf-catalog.js';
import { componentFunctions } from './kerf-catalog.js';

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

  it('nests nodes under their parents for the outline tree', () => {
    const tree = outlineTree(inbox, componentNames);
    expect(tree).toHaveLength(1);
    const [pane] = tree;
    expect(pane).toMatchObject({ label: 'Pane', detail: 'Root' });
    const toolbar = pane!.children!.find((node) => node.label === 'Toolbar')!;
    expect(toolbar.detail).toBe('header');
    expect(toolbar.children!.map((node) => [node.label, node.detail])).toEqual([
      ['ToolbarText', 'leading'],
      ['composeButton', 'Button · trailing'],
    ]);
    const row = pane!
      .children!.find((node) => node.label === 'folderList')!
      .children!.find((node) => node.label === 'row')!;
    expect(row.detail).toBe('ListItem · children · for each item in items');
    expect(
      pane!
        .children!.slice(-2)
        .map((node) => [node.id, node.label, node.detail]),
    ).toEqual([
      ['01JB8Z1M6Q8E1X9V4S7K2R3T5G', 'Text', 'content · if showEmpty'],
      ['slot:01JB8Z1M6Q8E1X9V4S7K2R3T5A:content:2', 'detail slot', 'content'],
    ]);
    expect(slotRowAddress(pane!.children!.at(-1)!.id)).toEqual({
      parent: '01JB8Z1M6Q8E1X9V4S7K2R3T5A',
      zone: 'content',
      index: 2,
    });
    expect(slotRowAddress('01JB8Z1M6Q8E1X9V4S7K2R3T5A')).toBeUndefined();
    expect(slotRowId('P', 'z', 0)).toBe('slot:P:z:0');
    expect(row).not.toHaveProperty('children');
    expect(outlineParents(tree)).toEqual([
      '01JB8Z1M6Q8E1X9V4S7K2R3T5A',
      '01JB8Z1M6Q8E1X9V4S7K2R3T5B',
      '01JB8Z1M6Q8E1X9V4S7K2R3T5E',
    ]);
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

  it('groups a node’s props by family, hiding plumbing and zones', () => {
    const sections = inspectorSections(node, button);
    // KF-4BPSTB: the families, in their fixed order; no "Other".
    expect(sections.map((section) => section.title)).toEqual([
      'Content',
      'Appearance',
      'Behavior',
      'Accessibility',
      'Integration',
    ]);
    // KF-X8X8VX: the class list sits with the other integration hooks.
    expect(
      sections.find((section) => section.title === 'Integration')!.rows,
    ).toEqual([
      { name: 'id', value: '—', set: false },
      { name: 'className', value: '—', set: false },
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
    expect(all).not.toContain('rootAttributes');
    expect(
      sections
        .find((section) => section.title === 'Behavior')!
        .rows.find((row) => row.name === 'action')?.value,
    ).toBe('action compose');
  });

  it('gives Button, TextField and Workbench task subgroups (KF-4BPSTB)', () => {
    const shape = (key: string) =>
      groupedProps(propsByKey.get(key)!).map((group) => [
        group.title,
        group.subgroups.map((subgroup) => subgroup.title ?? ''),
      ]);
    expect(shape('@kerfjs/ui:button')).toEqual([
      ['Content', ['', 'Badge']],
      ['Appearance', ['']],
      ['Behavior', ['', 'State', 'Link', 'Form', 'Popup']],
      ['Accessibility', ['']],
      ['Integration', ['']],
    ]);
    expect(shape('@kerfjs/ui:text-field')).toEqual([
      ['Content', ['']],
      ['Appearance', ['', 'Optional controls']],
      ['Behavior', ['Input', 'Validation', 'Typing assistance', 'State']],
      ['Accessibility', ['']],
      ['Integration', ['']],
    ]);
    // A region keeps its toolbar, header, footer, and placements together.
    const workbench = groupedProps(propsByKey.get('@kerfjs/ui:workbench')!);
    expect(shape('@kerfjs/ui:workbench')).toEqual([
      ['Behavior', ['']],
      ['Layout', ['Main', 'Left rail', 'Right rail', 'Bottom drawer']],
      ['Accessibility', ['', 'Work area']],
      ['Integration', ['']],
    ]);
    expect(
      workbench
        .find((group) => group.title === 'Layout')!
        .subgroups[0]!.props.map((prop) => prop.name),
    ).toEqual(
      expect.arrayContaining([
        'mainToolbar',
        'mainHeader',
        'mainHeaderPlacement',
        'mainFooter',
        'mainFooterPlacement',
      ]),
    );
  });

  it('places every visible prop exactly once (KF-4BPSTB)', () => {
    for (const component of propsByKey.values()) {
      const placed = groupedProps(component).flatMap((group) =>
        group.props.map((prop) => prop.name),
      );
      const visible = component.props
        .filter(
          (prop) =>
            prop.control !== 'hidden' &&
            !prop.zone &&
            prop.type.kind !== 'never',
        )
        .map((prop) => prop.name);
      expect(placed.slice().sort()).toEqual(visible.slice().sort());
    }
  });

  // KF-AHW2TM: the Web Awesome (wa-*) entries are curated too.
  describe('curated families across the Kerf catalog (KF-DXTRPR)', () => {
    const kerf = [...propsByKey.values()].filter((component) =>
      component.key.startsWith('@kerfjs/ui:'),
    );
    const webAwesome = kerf.filter((component) =>
      component.key.startsWith('@kerfjs/ui:wa-'),
    );
    const visible = (component: InspectorComponent) =>
      component.props.filter(
        (prop) =>
          prop.control !== 'hidden' && !prop.zone && prop.type.kind !== 'never',
      );
    const place = (key: string, name: string) => {
      const component = propsByKey.get(key)!;
      const prop = component.props.find(
        (candidate) => candidate.name === name,
      )!;
      return propPlace(prop, component).group;
    };

    it('gives every visible Kerf prop an explicit family, never the name fallback', () => {
      expect(kerf.length - webAwesome.length).toBeGreaterThan(80);
      expect(webAwesome.length).toBeGreaterThan(70);
      const unplaced = kerf.flatMap((component) =>
        visible(component)
          // The class list is always Integration (KF-X8X8VX).
          .filter((prop) => prop.control !== 'classes')
          .filter(
            (prop) =>
              !prop.group ||
              !(PROP_FAMILIES as readonly string[]).includes(prop.group) ||
              !(component.groups ?? []).includes(prop.group),
          )
          .map((prop) => `${component.key} ${prop.name}`),
      );
      expect(unplaced).toEqual([]);
    });

    it('places the props the name fallback and legacy groups misplaced', () => {
      const nav = '@kerfjs/ui:nav-stack';
      expect(place(nav, 'views')).toBe('Content');
      expect(place(nav, 'toolbarConfig')).toBe('Layout');
      expect(place(nav, 'bottomToolbar')).toBe('Layout');
      expect(place(nav, 'scheme')).toBe('Appearance');
      expect(place(nav, 'tint')).toBe('Appearance');
      const group = '@kerfjs/ui:toolbar-control-group';
      expect(
        groupedProps(propsByKey.get(group)!)
          .find((family) => family.title === 'Behavior')!
          .props.map((prop) => prop.name)
          .sort(),
      ).toEqual(['busy', 'expanded']);
      expect(place(group, 'avatarImage')).toBe('Content');
      expect(place(group, 'material')).toBe('Appearance');
      expect(place(group, 'scrim')).toBe('Appearance');
      expect(place(group, 'sizing')).toBe('Layout');
      const checkbox = '@kerfjs/ui:checkbox';
      expect(place(checkbox, 'size')).toBe('Appearance');
      for (const name of ['error', 'name', 'action'])
        expect(place(checkbox, name)).toBe('Behavior');
      const list = '@kerfjs/ui:list';
      expect(place(list, 'hidden')).toBe('Layout');
      expect(place(list, 'inset')).toBe('Layout');
      expect(place(list, 'labelledBy')).toBe('Accessibility');
      expect(place(list, 'landmark')).toBe('Accessibility');
    });

    it('splits every family of more than ten fields into titled tasks', () => {
      const crowded = kerf.flatMap((component) =>
        groupedProps(component)
          .filter(
            (family) =>
              family.props.length > FOCUSED_FIELD_LIMIT &&
              !splitsIntoPages(family),
          )
          .map((family) => `${component.key} ${family.title}`),
      );
      expect(crowded).toEqual([]);
    });

    it('splits Web Awesome form fields into the TextField tasks (KF-AHW2TM)', () => {
      const tasks = (key: string, title: string) =>
        groupedProps(propsByKey.get(key)!)
          .find((family) => family.title === title)!
          .subgroups.map((subgroup) => subgroup.title);
      expect(tasks('@kerfjs/ui:wa-input', 'Behavior')).toEqual([
        'Input',
        'Validation',
        'Typing assistance',
        'State',
      ]);
      expect(tasks('@kerfjs/ui:wa-button', 'Behavior')).toEqual([
        'Form',
        'Validation',
        'State',
        'Link',
      ]);
      expect(tasks('@kerfjs/ui:wa-popup', 'Layout')).toEqual([
        'Position',
        'Flip',
        'Shift',
        'Size',
      ]);
      const input = '@kerfjs/ui:wa-input';
      expect(place(input, 'with-clear')).toBe('Appearance');
      expect(place(input, 'with-label')).toBe('Content');
      expect(place(input, 'lang')).toBe('Accessibility');
      expect(place(input, 'did-ssr')).toBe('Integration');
    });
  });

  it('reads legacy and custom group names, and places uncurated props', () => {
    const groups = groupedProps({
      key: 'app:thing',
      groups: ['State', 'Shipping', 'Content'],
      props: [
        { name: 'label', type: { kind: 'string' }, required: false },
        {
          name: 'open',
          type: { kind: 'boolean' },
          required: false,
          group: 'State',
          order: 1,
        },
        {
          name: 'carrier',
          type: { kind: 'string' },
          required: false,
          group: 'Shipping',
        },
        // A group the component never declared falls back to its name.
        {
          name: 'ariaLabel',
          type: { kind: 'string' },
          required: false,
          group: 'Nowhere',
        },
        { name: 'clearLabel', type: { kind: 'string' }, required: false },
        { name: 'tone', type: { kind: 'string' }, required: false },
        { name: 'listWidth', type: { kind: 'number' }, required: false },
        { name: 'detailActive', type: { kind: 'boolean' }, required: false },
        { name: 'headingLevel', type: { kind: 'number' }, required: false },
        { name: 'onPick', type: { kind: 'function' }, required: false },
        { name: 'id', type: { kind: 'string' }, required: false },
        {
          name: 'className',
          type: { kind: 'string' },
          required: false,
          control: 'classes',
        },
      ],
    });
    expect(
      groups.map((group) => [
        group.title,
        group.subgroups.map((subgroup) => [
          subgroup.title ?? '',
          subgroup.props.map((prop) => prop.name),
        ]),
      ]),
    ).toEqual([
      ['Content', [['', ['label']]]],
      ['Appearance', [['', ['tone']]]],
      [
        'Behavior',
        [
          ['', ['detailActive', 'onPick']],
          ['State', ['open']],
        ],
      ],
      ['Layout', [['', ['listWidth']]]],
      ['Accessibility', [['', ['ariaLabel', 'clearLabel', 'headingLevel']]]],
      ['Integration', [['', ['className', 'id']]]],
      // A catalog's own group follows the families.
      ['Shipping', [['', ['carrier']]]],
    ]);
  });

  it('orders a family’s subgroups by curated order, then catalog order, then name', () => {
    const prop = (name: string, fields: Partial<InspectorProp>) => ({
      name,
      type: { kind: 'string' },
      required: false,
      ...fields,
    });
    const behavior = groupedProps({
      key: 'app:thing',
      groups: ['Behavior', 'Mode', 'State'],
      props: [
        prop('zeta', { group: 'Behavior', subgroup: 'Zeta' }),
        prop('alpha', { group: 'Behavior', subgroup: 'Alpha' }),
        prop('state', { group: 'State' }),
        prop('mode', { group: 'Mode' }),
        // A legacy group's prop may name its own task.
        prop('toggle', { group: 'State', subgroup: 'Toggles', order: 0 }),
      ],
    }).find((group) => group.title === 'Behavior')!;
    expect(behavior.subgroups.map((subgroup) => subgroup.title)).toEqual([
      'Toggles',
      'Mode',
      'State',
      'Alpha',
      'Zeta',
    ]);
    // A group named on a component that declares none is not a place.
    expect(
      groupedProps({
        key: 'app:other',
        props: [prop('tone', { group: 'Content' })],
      }).map((group) => group.title),
    ).toEqual(['Appearance']);
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
