// KF-65FTKX: the Inspector edits a component's `rootAttributes` as data-*
// name and value fields, rejecting reserved and protected names.
import { validateView } from '@kerfjs/ui/view';
import { mount } from 'kerfjs';
import { afterEach, describe, expect, it } from 'vitest';

import {
  dataAttributeNameError,
  dataAttributes,
  editDataAttributes,
  newDataAttributeName,
  protectedDataAttributes,
} from '../../../src/editor/model/data-attributes.js';
import { findNode } from '../../../src/editor/model/document.js';
import { setProp } from '../../../src/editor/model/edits.js';
import { loadScaledTimeout } from '../../helpers/load-scaled-timeout.js';
import { createEditor, propsByKey, viewCatalog } from './kerf-catalog.js';

const BADGE = '@kerfjs/ui:badge';
const badgeAttributes = () => {
  const prop = propsByKey
    .get(BADGE)!
    .props.find((item) => item.name === 'rootAttributes')!;
  return protectedDataAttributes(
    prop.type as never,
    viewCatalog.components.get(BADGE)!.definitions,
  );
};

describe('the data attributes model', () => {
  it('reads a string record, and nothing else', () => {
    expect(dataAttributes(undefined)).toEqual([]);
    expect(dataAttributes({ 'data-band': 'high' })).toEqual([
      ['data-band', 'high'],
    ]);
    expect(dataAttributes({ $param: 'attrs' })).toBeUndefined();
    expect(dataAttributes({ 'data-n': 1 } as never)).toBeUndefined();
    expect(dataAttributes(['x'] as never)).toBeUndefined();
    expect(dataAttributes(null as never)).toBeUndefined();
  });

  it('finds the names a component protects, through refs and unions', () => {
    const own = badgeAttributes();
    expect(own.has('data-tone')).toBe(true);
    expect(own.has('data-band')).toBe(false);
    // A record channel (Button) protects nothing in its type.
    expect(protectedDataAttributes({ kind: 'record' } as never).size).toBe(0);
    expect(
      protectedDataAttributes(
        {
          kind: 'union',
          members: [{ kind: 'ref', ref: 'A' }, { kind: 'string' }],
        } as never,
        {
          A: {
            kind: 'object',
            props: [
              { name: 'data-x', type: { kind: 'never' } },
              { name: 'role', type: { kind: 'never' } },
            ],
          },
        } as never,
      ),
    ).toEqual(new Set(['data-x']));
  });

  it('names what is wrong with a name', () => {
    const list = [
      ['data-band', 'high'],
      ['data-row', '1'],
    ] as const;
    expect(dataAttributeNameError('data-shelf', list, 0)).toBeUndefined();
    expect(dataAttributeNameError('data-band', list, 0)).toBeUndefined();
    expect(dataAttributeNameError('data-row', list, 0)).toBe(
      'Already set above.',
    );
    expect(dataAttributeNameError('role', list, 0)).toMatch(/lowercase data-/);
    expect(dataAttributeNameError('data-Band', list, 0)).toMatch(/lowercase/);
    expect(dataAttributeNameError('data-kerf-node', list, 0)).toBe(
      'Reserved for the editor.',
    );
    expect(dataAttributeNameError('data-key', list, 0)).toMatch(/Reserved/);
    expect(dataAttributeNameError('data-editor-x', list, 0)).toMatch(
      /Reserved/,
    );
    expect(
      dataAttributeNameError('data-tone', list, 0, badgeAttributes()),
    ).toBe('The component sets this one.');
  });

  it('picks an unused name and edits in order', () => {
    expect(newDataAttributeName([])).toBe('data-name');
    expect(
      newDataAttributeName([['data-name', '']], new Set(['data-name-2'])),
    ).toBe('data-name-3');
    const list = [
      ['data-a', '1'],
      ['data-b', '2'],
    ] as const;
    expect(
      Object.keys(
        editDataAttributes(list, { kind: 'name', index: 0, name: 'data-z' })!,
      ),
    ).toEqual(['data-z', 'data-b']);
    expect(
      editDataAttributes(list, { kind: 'value', index: 1, value: 'x' }),
    ).toEqual({ 'data-a': '1', 'data-b': 'x' });
    expect(editDataAttributes(list, { kind: 'add', name: 'data-c' })).toEqual({
      'data-a': '1',
      'data-b': '2',
      'data-c': '',
    });
    expect(
      editDataAttributes([['data-a', '1']], { kind: 'remove', index: 0 }),
    ).toBeUndefined();
  });
});

let cleanup: (() => void) | undefined;
afterEach(() => {
  cleanup?.();
  cleanup = undefined;
  document.body.replaceChildren();
});

const PANE = '01JB8Z1M6Q8E1X9V4S7K2R3T5A';

function choose(select: HTMLElement, value: string) {
  select.setAttribute('value', value);
  Object.defineProperty(select, 'value', { configurable: true, value });
  select.dispatchEvent(new Event('change', { bubbles: true }));
}

/** Types into a TextField and commits it, as a blur does. */
function type(field: HTMLElement, text: string) {
  const input = field.querySelector('input')!;
  input.value = text;
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

const field = (root: HTMLElement, index: number, part: string) =>
  root.querySelector<HTMLElement>(
    `[data-editor-attribute="${index}"][data-editor-attribute-part="${part}"]`,
  )!;

/** An editor with a new Badge added to the inbox Pane, selected. */
function addedBadge() {
  const root = document.createElement('div');
  document.body.append(root);
  const editor = createEditor();
  const stopMount = mount(root, editor.render);
  const unwireEditor = editor.wire(root);
  cleanup = () => {
    unwireEditor();
    stopMount();
  };
  editor.selection.value = { kind: 'node', id: PANE };
  choose(root.querySelector('[data-editor-add="zone"]')!, 'content');
  choose(root.querySelector('[data-editor-add="component"]')!, BADGE);
  root.querySelector<HTMLElement>('[data-action="editor-add-child"]')!.click();
  const { id } = editor.selection.value as { id: string };
  const props = () => findNode(editor.document.value, id)!.node.props ?? {};
  return { root, editor, id, props };
}

describe(
  'the data attributes section (KF-65FTKX)',
  { timeout: loadScaledTimeout(15_000) },
  () => {
    it('adds, renames, sets, rejects, undoes, and removes attributes', () => {
      const { root, editor, id, props } = addedBadge();
      const section = () =>
        root.querySelector<HTMLElement>('[data-key="editor-data-attributes"]')!;
      expect(section().textContent).toContain('Application data-* identity');
      root
        .querySelector<HTMLElement>(
          '[data-action="editor-add-data-attribute"]',
        )!
        .click();
      expect(props().rootAttributes).toEqual({ 'data-name': '' });
      type(field(root, 0, 'name'), 'data-band');
      type(field(root, 0, 'value'), 'high');
      expect(props().rootAttributes).toEqual({ 'data-band': 'high' });
      // The canvas renders it on the badge's root, beside the marker.
      const badge = root.querySelector(`[data-kerf-node="${id}"]`)!;
      expect(badge.getAttribute('data-band')).toBe('high');
      // Reserved, protected, malformed, and duplicate names are refused.
      for (const [name, error] of [
        ['data-kerf-node', 'Reserved'],
        ['data-tone', 'sets this one'],
        ['aria-label', 'lowercase data-'],
      ] as const) {
        type(field(root, 0, 'name'), name);
        expect(field(root, 0, 'name').textContent).toContain(error);
        expect(props().rootAttributes).toEqual({ 'data-band': 'high' });
      }
      root
        .querySelector<HTMLElement>(
          '[data-action="editor-add-data-attribute"]',
        )!
        .click();
      type(field(root, 1, 'name'), 'data-band');
      expect(field(root, 1, 'name').textContent).toContain('Already set');
      // A valid name clears the error.
      type(field(root, 1, 'name'), 'data-shelf');
      expect(field(root, 1, 'name').textContent).not.toContain('Already');
      // An unchanged name or value commits nothing new.
      const before = editor.document.value;
      type(field(root, 1, 'name'), 'data-shelf');
      type(field(root, 1, 'value'), '');
      expect(editor.document.value).toBe(before);
      expect(props().rootAttributes).toEqual({
        'data-band': 'high',
        'data-shelf': '',
      });
      // What the editor writes is what the validator accepts.
      expect(
        validateView(editor.document.value, viewCatalog).diagnostics.map(
          (item) => item.code,
        ),
      ).not.toContain('KUI-V015');
      root.querySelector<HTMLElement>('[data-action="editor-undo"]')!.click();
      expect(props().rootAttributes).toEqual({
        'data-band': 'high',
        'data-name': '',
      });
      root
        .querySelector<HTMLElement>('[data-editor-attribute-remove="1"]')!
        .click();
      root
        .querySelector<HTMLElement>('[data-editor-attribute-remove="0"]')!
        .click();
      expect(props()).not.toHaveProperty('rootAttributes');
    });

    it('shows a bound value as its binding, and a hand-edited reserved name as its problem', () => {
      const { root, editor, id } = addedBadge();
      const section = () =>
        root.querySelector<HTMLElement>('[data-key="editor-data-attributes"]')!;
      editor.document.value = setProp(
        editor.document.value,
        id,
        'rootAttributes',
        {
          'data-key': 'x',
        },
      );
      expect(field(root, 0, 'name').textContent).toContain(
        'reserved for the generated view',
      );
      editor.document.value = setProp(
        editor.document.value,
        id,
        'rootAttributes',
        {
          $param: 'attrs',
        } as never,
      );
      expect(section().textContent).toContain('param attrs');
      expect(section().querySelector('[data-editor-attribute]')).toBeNull();
    });
  },
);
