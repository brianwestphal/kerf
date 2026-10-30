// KF-3CKTKN: a union of scalars, a number or boolean enum, or a lone
// literal picks a typed value from a Select; an open member (text, a
// number, a list, an object) gets its own control beneath it.
import type { ViewType } from '@kerfjs/ui/view';
import { mount } from 'kerfjs';
import { afterEach, describe, expect, it } from 'vitest';

import propsJson from '../../../ai/component-props.json';
import {
  choiceOptions,
  controlFor,
  valueFromControl,
} from '../../../src/editor/model/controls.js';
import { findNode } from '../../../src/editor/model/document.js';
import { createEditor } from './kerf-catalog.js';

const definitions = propsJson.definitions as unknown as Record<
  string,
  ViewType
>;
const propOf = (component: string, name: string) =>
  propsJson.components
    .find((entry) => entry.export === component)!
    .props.find((prop) => prop.name === name)! as never;
const typeOf = (component: string, name: string) =>
  (propOf(component, name) as { type: ViewType }).type;

describe('typed choices', () => {
  it('lists fixed values, then the open members', () => {
    const labels = (component: string, name: string) =>
      choiceOptions(typeOf(component, name), definitions)!.map(
        (option) => option.label,
      );
    expect(labels('Badge', 'size')).toEqual(['compact', 'default', 'dot']);
    expect(labels('Badge', 'ariaHidden')).toEqual(['true', 'false']);
    expect(labels('LucideIcon', 'size')).toEqual([
      'xs',
      's',
      'm',
      'l',
      'xl',
      'Number…',
    ]);
    expect(labels('Button', 'badge')).toEqual([
      'true',
      'false',
      'Text…',
      'Number…',
    ]);
    expect(labels('Select', 'value')).toEqual(['Text…', 'List…']);
    expect(labels('ToolbarText', 'headingLevel')).toEqual([
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
    ]);
    expect(labels('List', 'inset')).toEqual(['document']);
    // A ReadonlySet member no form fills is left out.
    expect(labels('TreeList', 'expanded')).toEqual(['List…']);
    // Two object shapes are numbered apart.
    expect(labels('SearchField', 'trailingAction')).toEqual([
      'Custom 1…',
      'Custom 2…',
    ]);
  });

  it('flattens a union nested in a union', () => {
    const nested = {
      kind: 'union',
      members: [
        { kind: 'union', members: [{ kind: 'literal', value: 'auto' }] },
        { kind: 'number' },
      ],
    } as ViewType;
    expect(choiceOptions(nested)!.map((option) => option.label)).toEqual([
      'auto',
      'Number…',
    ]);
  });

  it('is not offered for strings, string enums, or a member no control edits', () => {
    expect(choiceOptions({ kind: 'string' } as ViewType)).toBeUndefined();
    expect(
      choiceOptions({ kind: 'enum', values: ['a', 'b'] } as ViewType),
    ).toBeUndefined();
    expect(choiceOptions({ kind: 'enum' } as ViewType)).toBeUndefined();
    expect(
      choiceOptions(typeOf('ListHeader', 'actionIcon'), definitions),
    ).toBeUndefined();
  });

  it('reads the current option from the value and keeps it typed', () => {
    const level = propOf('ToolbarText', 'headingLevel');
    expect(controlFor(level, 2, definitions)).toMatchObject({
      kind: 'choice',
      raw: '2',
    });
    expect(valueFromControl('choice', '2')).toEqual({ value: 2 });
    expect(valueFromControl('choice', '')).toEqual({ value: undefined });
    const size = propOf('LucideIcon', 'size');
    expect(controlFor(size, 20, definitions)).toMatchObject({
      raw: '#0',
      member: { kind: 'number' },
    });
    // A value of no option's kind, or a binding, stays read-only.
    expect(controlFor(size, true, definitions).kind).toBe('readonly');
    expect(
      controlFor(size, { $param: 'size' } as never, definitions).kind,
    ).toBe('readonly');
    // Choosing an open member starts it from a placeholder.
    const type = { type: typeOf('LucideIcon', 'size'), definitions };
    expect(valueFromControl('choice', '#0', undefined, type)).toEqual({
      value: 0,
    });
    const tile = { type: typeOf('ListItem', 'iconTile'), definitions };
    const custom = choiceOptions(tile.type, definitions)!.at(-1)!.value;
    expect(valueFromControl('choice', custom, undefined, tile)).toEqual({
      value: {},
    });
  });

  it('keeps a required lone literal fixed', () => {
    const kind = {
      name: 'kind',
      type: { kind: 'literal', value: 'divider' },
      required: true,
    } as const;
    expect(controlFor(kind, 'divider').kind).toBe('readonly');
    expect(controlFor({ ...kind, required: false }, undefined).kind).toBe(
      'choice',
    );
  });
});

let cleanup: (() => void) | undefined;
afterEach(() => {
  cleanup?.();
  cleanup = undefined;
  document.body.replaceChildren();
});

const field = (root: HTMLElement, selector: string) =>
  root.querySelector<HTMLElement>(selector)!;

function choose(select: HTMLElement, value: string) {
  select.setAttribute('value', value);
  Object.defineProperty(select, 'value', { configurable: true, value });
  select.dispatchEvent(new Event('change', { bubbles: true }));
}

function type(host: HTMLElement, value: string) {
  const input = host.querySelector<HTMLInputElement>('input, textarea')!;
  input.value = value;
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

/** An editor with a new `key` node added to the inbox Pane, selected. */
function added(key: string) {
  const root = document.createElement('div');
  document.body.append(root);
  const editor = createEditor();
  mount(root, editor.render);
  cleanup = editor.wire(root);
  editor.selection.value = { kind: 'node', id: '01JB8Z1M6Q8E1X9V4S7K2R3T5A' };
  choose(field(root, '[data-editor-add="zone"]'), 'content');
  choose(field(root, '[data-editor-add="component"]'), key);
  field(root, '[data-action="editor-add-child"]').click();
  const { id } = editor.selection.value as { id: string };
  const props = () => findNode(editor.document.value, id)!.node.props ?? {};
  return { root, props };
}

describe('choice controls in the Inspector (KF-3CKTKN)', () => {
  it('sets a LucideIcon’s size from a keyword or a number', () => {
    const { root, props } = added('@kerfjs/ui:lucide-icon');
    const size = () =>
      field(root, '[data-editor-prop="size"][data-editor-kind="choice"]');
    choose(size(), '"l"');
    expect(props().size).toBe('l');
    choose(size(), '#0');
    expect(props().size).toBe(0);
    const number = field(
      root,
      '[data-editor-prop="size"][data-editor-kind="number"]',
    );
    type(number, '20');
    expect(props().size).toBe(20);
    choose(size(), '');
    expect(props()).not.toHaveProperty('size');
  });

  it('sets a heading level as a number', () => {
    const { root, props } = added('@kerfjs/ui:toolbar-text');
    choose(
      field(
        root,
        '[data-editor-prop="headingLevel"][data-editor-kind="choice"]',
      ),
      '2',
    );
    expect(props().headingLevel).toBe(2);
  });

  it('opens an object member’s form, as a ListItem’s custom icon tile', () => {
    const { root, props } = added('@kerfjs/ui:list-item');
    const tile = () =>
      field(root, '[data-editor-prop="iconTile"][data-editor-kind="choice"]');
    choose(tile(), '"success"');
    expect(props().iconTile).toBe('success');
    const custom = [...tile().querySelectorAll('[value^="#"]')].length
      ? '#0'
      : '#0';
    choose(tile(), custom);
    expect(props().iconTile).toEqual({});
    const row = field(
      root,
      `[data-editor-open='{"prop":"iconTile","path":[]}']`,
    );
    row.click();
    // The form edits the object member's fields, not the union.
    expect(
      root.querySelector(
        `[data-editor-field='{"prop":"iconTile","path":["foreground"]}']`,
      ),
    ).not.toBeNull();
  });
});
