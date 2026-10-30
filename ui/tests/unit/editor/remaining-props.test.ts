// KF-24G2KV: the props the field-editor work left read-only now edit: a
// Chip's children as text or nodes, a record inside a value as typed JSON,
// and an inline object deep in a config as a form.
import { mount } from 'kerfjs';
import { afterEach, describe, expect, it } from 'vitest';

import { controlFor } from '../../../src/editor/model/controls.js';
import { findNode } from '../../../src/editor/model/document.js';
import { createEditor } from './kerf-catalog.js';

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

function editor() {
  const root = document.createElement('div');
  document.body.append(root);
  const instance = createEditor();
  mount(root, instance.render);
  cleanup = instance.wire(root);
  return { root, editor: instance };
}

describe('the props left read-only (KF-24G2KV)', () => {
  it('edits a record as typed JSON', () => {
    const attributes = {
      name: 'rootAttributes',
      type: { kind: 'record', text: 'Record<`data-${string}`, string>' },
      required: false,
    } as const;
    expect(controlFor(attributes, undefined).kind).toBe('list');
    expect(controlFor(attributes, { 'data-key': 'a' }).raw).toContain(
      'data-key',
    );
  });

  it('edits a Chip’s children as text, and offers them as a zone', () => {
    const { root, editor: instance } = editor();
    instance.selection.value = {
      kind: 'node',
      id: '01JB8Z1M6Q8E1X9V4S7K2R3T5A',
    };
    choose(field(root, '[data-editor-add="zone"]'), 'content');
    choose(field(root, '[data-editor-add="component"]'), '@kerfjs/ui:chip');
    field(root, '[data-action="editor-add-child"]').click();
    const { id } = instance.selection.value as { id: string };
    type(field(root, '[data-editor-prop="children"]'), 'Urgent');
    expect(findNode(instance.document.value, id)!.node.props?.children).toBe(
      'Urgent',
    );
    // Adding a Badge to its children moves the text into the zone beside it.
    choose(field(root, '[data-editor-add="zone"]'), 'children');
    choose(field(root, '[data-editor-add="component"]'), '@kerfjs/ui:badge');
    field(root, '[data-action="editor-add-child"]').click();
    const chip = findNode(instance.document.value, id)!.node;
    expect(chip.props ?? {}).not.toHaveProperty('children');
    expect(
      chip.zones?.children?.map((child) => (child as { type: string }).type),
    ).toEqual(['#text', '@kerfjs/ui:badge']);
  });

  it('edits an inline object deep in a Workbench’s pane config as a form', () => {
    const { root, editor: instance } = editor();
    instance.selection.value = {
      kind: 'node',
      id: instance.document.value.root.id,
    };
    choose(
      field(root, '[data-editor-root="component"]'),
      '@kerfjs/ui:workbench',
    );
    field(root, '[data-action="editor-replace-root"]').click();
    const id = instance.document.value.root.id;
    field(root, `[data-editor-open='{"prop":"mainPane","path":[]}']`).click();
    field(
      root,
      `[data-editor-open='{"prop":"mainPane","path":["compactChromeOpen"]}']`,
    ).click();
    const header = field(
      root,
      `[data-editor-field='{"prop":"mainPane","path":["compactChromeOpen","header"]}']`,
    ).querySelector<HTMLInputElement>('input')!;
    header.checked = true;
    header.dispatchEvent(new Event('change', { bubbles: true }));
    expect(findNode(instance.document.value, id)!.node.props?.mainPane).toEqual(
      { compactChromeOpen: { header: true } },
    );
  });
});
