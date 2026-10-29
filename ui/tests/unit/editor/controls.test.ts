import { validateView, VIEW_DOCUMENT_SCHEMA_ID } from '@kerfjs/ui/view';
import { describe, expect, it } from 'vitest';

import {
  controlFor,
  seedProps,
  valueFromControl,
} from '../../../src/editor/model/controls.js';
import { slotNamer } from '../../../src/editor/model/examples.js';
import type { InspectorProp } from '../../../src/editor/model/inspector.js';
import { componentNames, propsByKey, viewCatalog } from './kerf-catalog.js';

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
    expect(seedProps(props, 'X')).toEqual({ count: 0, open: false, size: 's' });
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
    // Zones and slots fill from the outline: a missing one, or a variant
    // that only a zone or slot keeps from matching, is that work, not a gap.
    // Rendered content inside a value is an item slot (KF-SXDM56).
    const missing = [...propsByKey.values()]
      .filter((component) => component.source === 'kerf')
      .flatMap((component) => {
        const holes = new Set(
          component.props
            .filter((item) => item.zone || item.slot)
            .map((item) => item.name),
        );
        const props = seeded(component.key);
        const onlyHoles = (component.variants ?? []).some(
          (variant) =>
            variant.required.every(
              (name) => holes.has(name) || name in props,
            ) &&
            Object.entries(variant.when ?? {}).every(
              ([name, value]) => (props[name] ?? false) === value,
            ),
        );
        return unfilled(component.key).filter(
          (message) =>
            !(
              message.endsWith('props match none of its variants') && onlyHoles
            ) &&
            ![...holes].some((zone) => message.endsWith(`requires "${zone}"`)),
        );
      });
    expect(missing).toEqual([]);
    expect(unfilled('@kerfjs/ui:combobox')).toEqual([]);
    expect(unfilled('@kerfjs/ui:select')).toEqual([]);
    expect(unfilled('@kerfjs/ui:popup-menu')).toEqual([]);
  });
});
