import { describe, expect, it } from 'vitest';

import { propsByKey } from '../../src/catalog.js';
import {
  controlFor,
  seedProps,
  valueFromControl,
} from '../../src/model/controls.js';
import type { InspectorProp } from '../../src/model/inspector.js';

const prop = (key: string, name: string) =>
  propsByKey
    .get(`@kerfjs/ui:${key}`)!
    .props.find((item) => item.name === name)!;

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
        { name: 'f', required: false, type: { kind: 'function' } },
        undefined,
      ).kind,
    ).toBe('readonly');
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
});
