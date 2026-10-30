import {
  contractDigest,
  contractOf,
  interpretView,
  validateView,
  VIEW_DOCUMENT_SCHEMA_ID,
  type ViewDocument,
  type ViewNode,
} from '@kerfjs/ui/view';
import { mount } from 'kerfjs';
import { Circle } from 'lucide';
import { describe, expect, it } from 'vitest';

import {
  controlFor,
  PLACEHOLDER_ICON,
  seedNode,
  seedProps,
  sizeKeywords,
  valueFromControl,
} from '../../../src/editor/model/controls.js';
import { slotNamer } from '../../../src/editor/model/examples.js';
import type { InspectorProp } from '../../../src/editor/model/inspector.js';
import {
  componentFunctions,
  componentNames,
  propsByKey,
  viewCatalog,
} from './kerf-catalog.js';

const prop = (key: string, name: string) =>
  propsByKey
    .get(`@kerfjs/ui:${key}`)!
    .props.find((item) => item.name === name)!;
const definitions = (key: string) =>
  viewCatalog.components.get(`@kerfjs/ui:${key}`)!.definitions;
/** The props the editor seeds a newly added component of `key` with. */
const seeded = (key: string) => {
  const component = propsByKey.get(key)!;
  return seedProps(
    component.props,
    componentNames.get(key)!,
    component.variants,
    viewCatalog.components.get(key)!.definitions,
    slotNamer([]),
  );
};
/** The prop names a lone seeded node of `key` is still reported missing. */
const unfilled = (key: string) =>
  validateView(
    {
      schema: VIEW_DOCUMENT_SCHEMA_ID,
      name: 'Seeded',
      catalogs: ['@kerfjs/ui'],
      root: { id: '01J0000000000000000000000A', type: key, props: seeded(key) },
    },
    viewCatalog,
  )
    .diagnostics.filter(
      (item) =>
        item.path === '$.root' &&
        (item.code === 'KUI-V004' || item.code === 'KUI-V005'),
    )
    .map((item) => item.message);

describe('controlFor', () => {
  it('edits string enums with a select whose first choice is the default', () => {
    expect(controlFor(prop('button', 'tone'), 'brand')).toEqual({
      kind: 'select',
      choices: ['', 'neutral', 'brand', 'success', 'danger'],
      raw: 'brand',
    });
    expect(controlFor(prop('button', 'tone'), undefined).raw).toBe('');
    // Numeric enums (heading levels) stay read-only.
    expect(
      controlFor(prop('toolbar-text', 'headingLevel'), undefined).kind,
    ).toBe('readonly');
  });

  it('edits booleans, numbers, strings, and text-accepting content', () => {
    expect(controlFor(prop('button', 'disabled'), true)).toEqual({
      kind: 'switch',
      raw: true,
    });
    expect(controlFor(prop('button', 'disabled'), undefined)).toEqual({
      kind: 'switch',
      raw: false,
    });
    expect(controlFor(prop('list-header', 'count'), 3)).toEqual({
      kind: 'number',
      raw: '3',
    });
    expect(controlFor(prop('list-header', 'count'), undefined).raw).toBe('');
    expect(controlFor(prop('button', 'title'), 'Hi')).toEqual({
      kind: 'text',
      raw: 'Hi',
    });
    expect(controlFor(prop('button', 'title'), undefined).raw).toBe('');
    expect(controlFor(prop('button', 'children'), 'Save')).toEqual({
      kind: 'text',
      raw: 'Save',
    });
    expect(controlFor(prop('button', 'children'), undefined).raw).toBe('');
    expect(controlFor(prop('button', 'icon'), undefined).kind).toBe('readonly');
  });

  it('edits css-value builder calls and keeps bound values read-only', () => {
    expect(
      controlFor(prop('pane', 'background'), { $css: "uiColor('surface')" }),
    ).toEqual({
      kind: 'css',
      raw: "uiColor('surface')",
    });
    expect(controlFor(prop('pane', 'background'), undefined)).toEqual({
      kind: 'css',
      raw: '',
    });
    expect(controlFor(prop('pane', 'background'), { $param: 'bg' }).kind).toBe(
      'readonly',
    );
    expect(controlFor(prop('button', 'title'), { $param: 'title' }).kind).toBe(
      'readonly',
    );
    expect(controlFor(prop('button', 'title'), ['x']).kind).toBe('readonly');
    expect(
      controlFor(
        prop('combobox', 'suggestions'),
        { $param: 'options' },
        definitions('combobox'),
      ).kind,
    ).toBe('readonly');
    expect(
      controlFor(
        { name: 'f', required: false, type: { kind: 'function' } },
        undefined,
      ).kind,
    ).toBe('readonly');
  });
});

describe('controlFor list literals (KF-HNNWN9)', () => {
  it('edits list and object literals as JSON, set or unset', () => {
    expect(
      controlFor(
        prop('combobox', 'suggestions'),
        undefined,
        definitions('combobox'),
      ),
    ).toEqual({ kind: 'list', raw: '' });
    expect(
      controlFor(
        prop('select', 'choices'),
        [{ value: 'a', label: 'A' }],
        definitions('select'),
      ),
    ).toEqual({
      kind: 'list',
      raw: JSON.stringify([{ value: 'a', label: 'A' }], null, 2),
    });
  });
});

describe('size controls (KF-Q5AXNP)', () => {
  const sizeOf = (key: string, name: string, value?: unknown) =>
    controlFor(prop(key, name), value as never, definitions(key));

  it('lists the keywords of a size union in scale order, with Custom', () => {
    expect(sizeOf('list', 'gap')).toEqual({
      kind: 'size',
      choices: ['', 'none', '2xs', 'xs', 's', 'm', 'l', 'xl', 'true', 'custom'],
      raw: '',
    });
    expect(sizeOf('row', 'flex').choices).toEqual([
      '',
      'true',
      'auto',
      'none',
      'initial',
      'custom',
    ]);
    expect(sizeOf('list-detail-dialog', 'height').choices).toEqual([
      '',
      'viewport',
      'custom',
    ]);
    expect(sizeOf('skeleton', 'width').kind).toBe('size');
  });

  it('shows a keyword, a builder call, an object, or a binding', () => {
    expect(sizeOf('list', 'gap', 'm').raw).toBe('m');
    expect(sizeOf('list', 'gap', true).raw).toBe('true');
    expect(sizeOf('list', 'gap', { $css: 'px(8)' })).toMatchObject({
      kind: 'size',
      raw: 'custom',
      css: 'px(8)',
    });
    expect(
      sizeOf('list', 'gap', {
        column: { $css: 'px(4)' },
        row: { $css: 'px(8)' },
      }).kind,
    ).toBe('list');
    expect(sizeOf('list', 'gap', { $param: 'gap' }).kind).toBe('readonly');
    expect(sizeOf('list', 'gap', 'huge').kind).toBe('readonly');
  });

  it('leaves unions without a css-value to their own rules', () => {
    expect(sizeKeywords(prop('badge', 'size').type as never)).toBeUndefined();
    expect(sizeKeywords(prop('button', 'tone').type as never)).toBeUndefined();
    expect(
      sizeKeywords(prop('backdrop-image', 'parallax').type as never),
    ).toBeUndefined();
  });

  it('reads nested unions and refuses keywords it cannot offer', () => {
    const css = { kind: 'css-value', text: 'CssLength' };
    const union = (...members: object[]) =>
      ({ kind: 'union', members, text: 'Size' }) as never;
    expect(
      sizeKeywords(
        union(css, {
          kind: 'union',
          members: [{ kind: 'literal', value: 'a' }],
        }),
      ),
    ).toEqual(['a']);
    expect(sizeKeywords(union(css, { kind: 'enum', values: [1, 2] }))).toBe(
      undefined,
    );
    expect(sizeKeywords(union(css, { kind: 'literal', value: 3 }))).toBe(
      undefined,
    );
    expect(sizeKeywords(union({ kind: 'literal', value: 'a' }))).toBe(
      undefined,
    );
  });

  it('converts a size choice to its document value', () => {
    expect(valueFromControl('size', 'm')).toEqual({ value: 'm' });
    expect(valueFromControl('size', 'true')).toEqual({ value: true });
    expect(valueFromControl('size', '')).toEqual({ value: undefined });
    expect(valueFromControl('size', 'custom')).toEqual({ value: undefined });
  });
});

describe('valueFromControl', () => {
  it('converts raw control values and clears on empty input', () => {
    expect(valueFromControl('switch', true)).toEqual({ value: true });
    expect(valueFromControl('switch', false)).toEqual({ value: false });
    expect(valueFromControl('number', ' 4 ')).toEqual({ value: 4 });
    expect(valueFromControl('number', '')).toEqual({ value: undefined });
    expect(valueFromControl('number', 'four')).toEqual({
      error: 'Enter a number.',
    });
    expect(valueFromControl('text', 'Hi')).toEqual({ value: 'Hi' });
    expect(valueFromControl('select', '')).toEqual({ value: undefined });
    expect(valueFromControl('css', ' px(8) ')).toEqual({
      value: { $css: 'px(8)' },
    });
    expect(valueFromControl('css', '')).toEqual({ value: undefined });
    expect(valueFromControl('css', 'red')).toHaveProperty('error');
  });

  it('parses list literals and rejects ones the prop type refuses', () => {
    const type = {
      type: prop('select', 'choices').type as never,
      definitions: definitions('select'),
    };
    expect(
      valueFromControl('list', '[{"value":"a","label":"A"}]', undefined, type),
    ).toEqual({ value: [{ value: 'a', label: 'A' }] });
    expect(valueFromControl('list', '  ', undefined, type)).toEqual({
      value: undefined,
    });
    expect(valueFromControl('list', '[{"value":"a"', undefined, type)).toEqual({
      error: 'Enter JSON, such as ["One", "Two"].',
    });
    expect(
      valueFromControl('list', '[{"value":"a"}]', undefined, type),
    ).toEqual({ error: 'Not a SelectChoice<Value>[].' });
    expect(valueFromControl('list', '{"$param":"x"}', undefined, type)).toEqual(
      { error: 'Bind a param with Bind a prop instead.' },
    );
    // Without a type to check against, any JSON is taken.
    expect(valueFromControl('list', '["x"]')).toEqual({ value: ['x'] });
  });
});

describe('seedProps', () => {
  it('fills required literal props so a new node renders', () => {
    expect(
      seedProps(propsByKey.get('@kerfjs/ui:list-item')!.props, 'ListItem'),
    ).toEqual({
      label: 'ListItem',
      action: 'action',
    });
    const props: InspectorProp[] = [
      { name: 'count', required: true, type: { kind: 'number' } },
      { name: 'open', required: true, type: { kind: 'boolean' } },
      {
        name: 'size',
        required: true,
        type: { kind: 'enum', values: ['s', 'm'] } as InspectorProp['type'],
      },
      {
        name: 'body',
        required: true,
        zone: 'content',
        type: { kind: 'content' },
      },
      { name: 'later', required: false, type: { kind: 'string' } },
    ];
    expect(seedProps(props, 'X')).toEqual({ count: 1, open: false, size: 's' });
  });

  it('fills the smallest props variant it can, with its fixed values', () => {
    const button = propsByKey.get('@kerfjs/ui:button')!;
    expect(seedProps(button.props, 'Button', button.variants)).toEqual({
      children: 'Button',
    });
    const props: InspectorProp[] = [
      { name: 'label', required: false, type: { kind: 'string' } },
      { name: 'icon', required: false, type: { kind: 'element' } as never },
    ];
    expect(
      seedProps(props, 'X', [
        { required: ['icon'] },
        { required: ['label'], when: { compact: true } },
      ]),
    ).toEqual({ label: 'X', compact: true });
    expect(seedProps(props, 'X', [{ required: ['icon'] }])).toEqual({});
  });

  // KF-HNNWN9: a component added from the palette renders, so a Combobox's
  // suggestions, a Select's choices, and a PopupMenu's items get placeholders.
  it('fills required lists with numbered placeholders', () => {
    expect(seeded('@kerfjs/ui:combobox')).toEqual({
      id: 'Combobox',
      label: 'Combobox',
      suggestions: ['Suggestion 1', 'Suggestion 2', 'Suggestion 3'],
    });
    const select = seeded('@kerfjs/ui:select');
    expect(select.choices).toEqual([
      { value: 'choice-1', label: 'Choice 1' },
      { value: 'choice-2', label: 'Choice 2' },
      { value: 'choice-3', label: 'Choice 3' },
    ]);
    // The required value starts on a choice the Select offers.
    expect(select.value).toBe('choice-1');
    expect(seeded('@kerfjs/ui:popup-menu').items).toEqual([
      { label: 'Item 1' },
      { label: 'Item 2' },
      { label: 'Item 3' },
    ]);
  });

  it('leaves no required literal prop unfilled on any Kerf UI component', () => {
    expect(unfilled('@kerfjs/ui:combobox')).toEqual([]);
    expect(unfilled('@kerfjs/ui:select')).toEqual([]);
    expect(unfilled('@kerfjs/ui:popup-menu')).toEqual([]);
  });
});

// KF-FGD8B3: every component added from the palette renders as added, with
// placeholders for the zones and content it requires.
describe('seedNode', () => {
  let count = 0;
  const makeId = () => `01J${String((count += 1)).padStart(23, '0')}`;
  const seedCatalog = {
    component: (key: string) => propsByKey.get(key),
    name: (key: string) => componentNames.get(key)!,
    definitions: (key: string) => viewCatalog.components.get(key)!.definitions,
    entry: (key: string) => viewCatalog.entries.get(key) as never,
  };
  const seededDocument = (key: string) =>
    ({
      schema: VIEW_DOCUMENT_SCHEMA_ID,
      name: 'Seeded',
      catalogs: ['@kerfjs/ui'],
      root: seedNode(key, seedCatalog, makeId, slotNamer([])),
    }) as ViewDocument;

  it('makes every cataloged component a document that validates and renders', () => {
    const failures = [...propsByKey.keys()].flatMap((key) => {
      const document = seededDocument(key);
      const problems = validateView(document, viewCatalog).diagnostics;
      if (problems.length)
        return [`${key}: ${problems.map((item) => item.message).join('; ')}`];
      try {
        const html = interpretView(document, {
          catalog: viewCatalog,
          components: componentFunctions(),
          icons: { [PLACEHOLDER_ICON]: Circle },
          // The canvas fills every slot with a placeholder, as here.
          slots: new Proxy({}, { get: () => () => 'slot' }),
          contract: contractDigest(contractOf(document, viewCatalog)),
        });
        mount(globalThis.document.createElement('div'), () => html)();
        return [];
      } catch (error) {
        return [`${key}: ${(error as Error).message}`];
      }
    });
    expect(failures).toEqual([]);
  });

  it('fills a required zone with its accepted component, or a Text', () => {
    const workbench = seededDocument('@kerfjs/ui:workbench').root;
    expect(workbench.zones?.main).toEqual([
      {
        id: expect.any(String),
        type: '@kerfjs/ui:text',
        props: { children: 'Main' },
      },
    ]);
    const split = seededDocument('@kerfjs/ui:split-view').root;
    expect(Object.keys(split.zones ?? {})).toEqual(['list', 'detail']);
    // A TabBar's tabs zone names TabBarItem, so it gets a seeded one.
    const [tab] = seededDocument('@kerfjs/ui:tab-bar').root.zones!.tabs!;
    expect((tab as ViewNode).type).toBe('@kerfjs/ui:tabs');
    // A required content prop that takes no text holds a Text naming it.
    expect(
      seededDocument('@kerfjs/ui:toolbar-control-group').root.zones,
    ).toEqual({
      children: [
        {
          id: expect.any(String),
          type: '@kerfjs/ui:text',
          props: { children: 'ToolbarControlGroup' },
        },
      ],
    });
  });

  it('seeds from any catalog: qualified zones, a #text fallback, defaults', () => {
    // A catalog with no Text component, a zone naming a qualified key, and a
    // number with its own default.
    const catalog = {
      component: (key: string) =>
        ({
          'app:shell': {
            props: [
              {
                name: 'body',
                required: true,
                slot: true,
                type: { kind: 'content' },
              },
              {
                name: 'size',
                required: true,
                default: 4,
                type: { kind: 'number' },
              },
            ] as InspectorProp[],
          },
          'app:card': { props: [] },
        })[key],
      name: (key: string) => key.slice(4),
      definitions: () => ({}),
      entry: (key: string) =>
        key === 'app:shell'
          ? {
              package: 'app',
              zones: [
                {
                  id: 'main',
                  jsx: { prop: 'main' },
                  accepts: ['app:card'],
                  cardinality: { min: 2 },
                },
              ],
            }
          : undefined,
    };
    const node = seedNode('app:shell', catalog, makeId);
    expect(node.props).toEqual({ size: 4 });
    expect(node.zones?.main?.map((child) => (child as ViewNode).type)).toEqual([
      'app:card',
      'app:card',
    ]);
    expect(node.zones?.body).toEqual([
      { id: expect.any(String), type: '#text', value: 'Body' },
    ]);
  });

  it('seeds icon data, in-range numbers, and list-shaped unions', () => {
    expect(seededDocument('@kerfjs/ui:lucide-icon').root.props?.icon).toEqual({
      $icon: PLACEHOLDER_ICON,
    });
    expect(
      Array.isArray(
        seededDocument('@kerfjs/ui:tree-list').root.props?.expanded,
      ),
    ).toBe(true);
    expect(seeded('@kerfjs/ui:grid').columns).toBe(1);
  });
});
