// KF-90GTJN: the inspector shows a node only when a condition holds, repeats
// it for each item of a list, and adds, fills, and deletes slots — each edit
// undoable and visible in the outline.
import type { ViewDocument } from '@kerfjs/ui/view';
import { mount } from 'kerfjs';
import { afterEach, describe, expect, it } from 'vitest';

import {
  controlOf,
  setOtherwise,
  setRepeat,
  slotAt,
} from '../../../src/editor/model/control-flow.js';
import { findNode } from '../../../src/editor/model/document.js';
import { insertNode } from '../../../src/editor/model/edits.js';
import { createEditor } from './kerf-catalog.js';

const PANE = '01JB8Z1M6Q8E1X9V4S7K2R3T5A';
const TOOLBAR = '01JB8Z1M6Q8E1X9V4S7K2R3T5B';
const COMPOSE = '01JB8Z1M6Q8E1X9V4S7K2R3T5D';
const FOLDERS = '01JB8Z1M6Q8E1X9V4S7K2R3T5E';
const ROW = '01JB8Z1M6Q8E1X9V4S7K2R3T5F';
const EMPTY = '01JB8Z1M6Q8E1X9V4S7K2R3T5G';
const NEW = '01JB8Z1M6Q8E1X9V4S7K2R3T6A';
const DETAIL = { parent: PANE, zone: 'content', index: 2 };

let cleanup: (() => void) | undefined;
afterEach(() => {
  cleanup?.();
  cleanup = undefined;
  document.body.replaceChildren();
});

function open(id = COMPOSE, edit?: (document: ViewDocument) => ViewDocument) {
  const root = document.createElement('div');
  document.body.append(root);
  const editor = createEditor();
  if (edit) editor.document.value = edit(editor.document.value);
  mount(root, editor.render);
  cleanup = editor.wire(root);
  editor.selection.value = { kind: 'node', id };
  return { root, editor };
}

const field = (root: HTMLElement, selector: string) =>
  root.querySelector<HTMLElement>(selector)!;

/** Changes a Select the way its popup does: a new value, then `change`. */
function choose(select: HTMLElement, value: string) {
  select.setAttribute('value', value);
  Object.defineProperty(select, 'value', { configurable: true, value });
  select.dispatchEvent(new Event('change', { bubbles: true }));
}

/** Types into a text field and commits it with `change`. */
function type(host: HTMLElement, value: string) {
  const input = host.querySelector<HTMLInputElement>('input')!;
  input.value = value;
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

const click = (root: HTMLElement, action: string) =>
  field(root, `[data-action="${action}"]`).click();

const condition = (root: HTMLElement) =>
  field(root, '[data-editor-control="condition"]');
const repeat = (root: HTMLElement) =>
  field(root, '[data-editor-control="repeat"]');
const choices = (select: HTMLElement) => select.innerHTML;

describe('showing a node only when a condition holds', () => {
  it('wraps, rewrites, and unwraps from the Show select, with undo', () => {
    const { root, editor } = open();
    const showEmpty = JSON.stringify({ $param: 'showEmpty' });
    expect(choices(condition(root))).toContain('Param showEmpty');
    choose(condition(root), showEmpty);
    expect(controlOf(editor.document.value, COMPOSE)).toEqual({
      condition: { $param: 'showEmpty' },
    });
    expect(root.textContent).toContain('trailing · if showEmpty');
    // The same choice again changes nothing.
    const before = editor.document.value;
    choose(condition(root), showEmpty);
    expect(editor.document.value).toBe(before);
    choose(condition(root), '');
    expect(controlOf(editor.document.value, COMPOSE)).toEqual({});
    click(root, 'editor-undo');
    expect(controlOf(editor.document.value, COMPOSE)?.condition).toEqual({
      $param: 'showEmpty',
    });
    click(root, 'editor-undo');
    expect(controlOf(editor.document.value, COMPOSE)).toEqual({});
  });

  it('keeps a condition that no longer fits among the choices', () => {
    const { root } = open(EMPTY, (document) => ({
      ...document,
      params: {
        ...document.params,
        showEmpty: { type: { kind: 'string' } },
      },
    }));
    expect(condition(root).getAttribute('value')).toBe(
      JSON.stringify({ $param: 'showEmpty' }),
    );
    expect(choices(condition(root))).toContain('Param showEmpty');
  });

  it('explains a node whose control flow the inspector cannot edit', () => {
    const { root } = open(NEW, (document) => ({
      ...document,
      root: {
        ...document.root,
        zones: {
          ...document.root.zones,
          content: [
            {
              $if: { $param: 'showEmpty' },
              then: {
                $if: { $param: 'showEmpty' },
                then: { id: NEW, type: '@kerfjs/ui:text' },
              },
            },
          ],
        },
      },
    }));
    expect(root.textContent).toContain('edit its control flow in the document');
    expect(root.querySelector('[data-editor-control]')).toBeNull();
  });

  it('adds, replaces, and removes what shows otherwise, then edits it', () => {
    const { root, editor } = open(EMPTY);
    const otherwise = () => field(root, '[data-editor-control="otherwise"]');
    expect(choices(otherwise())).toContain('Badge');
    choose(otherwise(), '@kerfjs/ui:badge');
    const added = controlOf(editor.document.value, EMPTY)?.otherwise as {
      id: string;
      type: string;
    };
    expect(added.type).toBe('@kerfjs/ui:badge');
    expect(root.textContent).toContain('content · unless showEmpty');
    // The same component again changes nothing.
    const before = editor.document.value;
    choose(otherwise(), '@kerfjs/ui:badge');
    expect(editor.document.value).toBe(before);
    // The otherwise node shares the condition and has no otherwise of its own.
    editor.selection.value = { kind: 'node', id: added.id };
    expect(root.querySelector('[data-editor-control="otherwise"]')).toBeNull();
    expect(root.textContent).toContain(
      'This node shows while the condition does not hold',
    );
    choose(condition(root), '');
    expect(controlOf(editor.document.value, added.id)).toEqual({});
    expect(controlOf(editor.document.value, EMPTY)).toEqual({});
    click(root, 'editor-undo');
    editor.selection.value = { kind: 'node', id: EMPTY };
    choose(otherwise(), '');
    expect(controlOf(editor.document.value, EMPTY)).toEqual({
      condition: { $param: 'showEmpty' },
    });
  });

  it('shows an otherwise branch that repeats as read-only', () => {
    const { root } = open(EMPTY, (document) =>
      setOtherwise(document, EMPTY, {
        id: NEW,
        type: '@kerfjs/ui:text',
        props: { children: 'x' },
      }),
    );
    expect(
      field(root, '[data-editor-control="otherwise"]').getAttribute('value'),
    ).toBe('@kerfjs/ui:text');
    cleanup?.();
    document.body.replaceChildren();
    const repeated = open(EMPTY, (document) => {
      const withOther = setOtherwise(document, EMPTY, {
        id: NEW,
        type: '@kerfjs/ui:button',
        props: { children: 'x', action: { $action: 'go' } },
      });
      return setRepeat(withOther, NEW, {
        source: { $param: 'items' },
        as: 'item',
        key: 'item.id',
      });
    });
    expect(repeated.root.textContent).toContain(
      'Select the otherwise branch in the outline to edit it.',
    );
  });

  it('shows no control flow for the root', () => {
    const { root } = open(PANE);
    expect(root.querySelector('[data-editor-control]')).toBeNull();
    expect(root.textContent).not.toContain('Control flow');
  });
});

describe('repeating a node for each item', () => {
  const withItem = (document: ViewDocument) =>
    insertNode(document, FOLDERS, 'children', {
      id: NEW,
      type: '@kerfjs/ui:list-item',
      props: { label: 'One', action: { $action: 'open' } },
    });

  it('repeats over a list param, renames the item, and stops repeating', () => {
    const { root, editor } = open(NEW, withItem);
    const items = JSON.stringify({ $param: 'items' });
    expect(root.querySelector('[data-editor-control="item"]')).toBeNull();
    choose(repeat(root), items);
    expect(controlOf(editor.document.value, NEW)?.repeat).toEqual({
      source: { $param: 'items' },
      as: 'item',
      key: 'item.id',
    });
    expect(root.textContent).toContain('for each item in items');
    // Choosing the current list again changes nothing.
    const before = editor.document.value;
    choose(repeat(root), items);
    expect(editor.document.value).toBe(before);
    type(field(root, '[data-editor-control="item"]'), 'message');
    expect(controlOf(editor.document.value, NEW)?.repeat?.as).toBe('message');
    // The same name again, then a bad one, change nothing.
    const named = editor.document.value;
    type(field(root, '[data-editor-control="item"]'), 'message');
    expect(editor.document.value).toBe(named);
    type(field(root, '[data-editor-control="item"]'), 'Not ok');
    expect(editor.document.value).toBe(named);
    expect(root.textContent).toContain(
      'An item name is a camelCase identifier.',
    );
    choose(repeat(root), '');
    expect(controlOf(editor.document.value, NEW)).toEqual({});
    // Not repeating, "Do not repeat" again is a no-op.
    const plain = editor.document.value;
    choose(repeat(root), '');
    expect(editor.document.value).toBe(plain);
    // A list nothing offers is ignored.
    choose(repeat(root), JSON.stringify({ $param: 'title' }));
    expect(editor.document.value).toBe(plain);
  });

  it('says when no list can repeat a node', () => {
    const { root } = open(COMPOSE, (document) => ({
      ...document,
      params: { title: document.params!.title! },
    }));
    expect(root.textContent).toContain(
      'No list of objects in scope can repeat this node.',
    );
  });

  it('renames the existing row item and its bindings', () => {
    const { root, editor } = open(ROW);
    type(field(root, '[data-editor-control="item"]'), 'message');
    const row = findNode(editor.document.value, ROW)!.node;
    expect(row.props?.label).toEqual({ $bind: 'message.label' });
  });

  it('ignores control and slot edits without their selection', () => {
    const { root, editor } = open();
    editor.selection.value = null;
    const before = editor.document.value;
    root.insertAdjacentHTML(
      'beforeend',
      '<div data-editor-control="condition"><input value="x"></div>' +
        '<div data-editor-slot-input="x"><input value=""></div>' +
        '<button data-action="editor-add-slot"></button>' +
        '<button data-action="editor-delete"></button>',
    );
    type(field(root, '[data-editor-control="condition"]'), 'x');
    type(field(root, '[data-editor-slot-input="x"]'), '');
    click(root, 'editor-add-slot');
    click(root, 'editor-delete');
    expect(editor.document.value).toBe(before);
  });
});

describe('slots', () => {
  it('adds a slot to the chosen zone, selects it, and deletes it', () => {
    const { root, editor } = open(TOOLBAR);
    choose(field(root, '[data-editor-add="zone"]'), 'trailing');
    type(field(root, '[data-editor-slot="name"]'), 'actions');
    click(root, 'editor-add-slot');
    const address = { parent: TOOLBAR, zone: 'trailing', index: 1 };
    expect(editor.selection.value).toEqual({ kind: 'slot', address });
    expect(slotAt(editor.document.value, address)).toEqual({
      $slot: 'actions',
    });
    expect(
      root.querySelector(
        '[data-tree-list-id="editor-outline"] :is([aria-current], [aria-selected="true"])',
      )?.textContent,
    ).toContain('actions slot');
    expect(root.textContent).toContain('The application fills this slot');
    click(root, 'editor-delete');
    expect(editor.selection.value).toBeNull();
    expect(slotAt(editor.document.value, address)).toBeUndefined();
    click(root, 'editor-undo');
    expect(slotAt(editor.document.value, address)?.$slot).toBe('actions');
  });

  it('refuses a bad slot name with an error on the field', () => {
    const { root, editor } = open(TOOLBAR);
    const before = editor.document.value;
    type(field(root, '[data-editor-slot="name"]'), 'Bad Name');
    click(root, 'editor-add-slot');
    expect(editor.document.value).toBe(before);
    expect(root.textContent).toContain(
      'A slot name is a camelCase identifier.',
    );
  });

  it('passes the row item to a slot added inside a row', () => {
    const { root, editor } = open(ROW);
    const pass = field(root, '[data-editor-slot="pass-item"]');
    expect(pass).toBeTruthy();
    type(field(root, '[data-editor-slot="name"]'), 'rowActions');
    click(root, 'editor-add-slot');
    const selected = editor.selection.value;
    expect(selected?.kind).toBe('slot');
    const address = selected?.kind === 'slot' ? selected.address : DETAIL;
    expect(slotAt(editor.document.value, address)?.input).toEqual({
      item: { $bind: 'item' },
    });
    expect(root.textContent).toContain('rowActions slot');
    expect(
      root
        .querySelector('[data-editor-slot-input="item"]')
        ?.getAttribute('value'),
    ).toBe(JSON.stringify({ $bind: 'item' }));
  });

  it('adds a slot without the row item when the switch is off', () => {
    const { root, editor } = open(ROW);
    const pass = field(root, '[data-editor-slot="pass-item"]');
    pass.querySelector('input')!.checked = false;
    type(field(root, '[data-editor-slot="name"]'), 'rowActions');
    click(root, 'editor-add-slot');
    const selected = editor.selection.value;
    const address = selected?.kind === 'slot' ? selected.address : DETAIL;
    expect(slotAt(editor.document.value, address)).toEqual({
      $slot: 'rowActions',
    });
  });

  it('selects a slot from the outline and sets and clears its input', () => {
    const { root, editor } = open(FOLDERS);
    const row = root.querySelector<HTMLElement>(
      `[data-item-id="slot:${PANE}:content:2"]`,
    )!;
    row.click();
    expect(editor.selection.value).toEqual({ kind: 'slot', address: DETAIL });
    const input = field(root, '[data-editor-slot-input="selectedId"]');
    choose(input, '');
    expect(slotAt(editor.document.value, DETAIL)).toEqual({ $slot: 'detail' });
    choose(
      field(root, '[data-editor-slot-input="selectedId"]'),
      JSON.stringify({ $param: 'title' }),
    );
    expect(slotAt(editor.document.value, DETAIL)?.input).toEqual({
      selectedId: { $param: 'title' },
    });
  });

  it('shows nothing selected for a slot that is gone', () => {
    const { root, editor } = open(TOOLBAR);
    editor.selection.value = {
      kind: 'slot',
      address: { ...DETAIL, index: 0 },
    };
    expect(root.textContent).toContain('Nothing selected');
  });
});
