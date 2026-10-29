// KF-KX77TV: the inspector edits the selected node, structural actions move,
// delete, and add nodes, and every edit is undoable.
import { validateView } from '@kerfjs/ui/view';
import { mount } from 'kerfjs';
import { afterEach, describe, expect, it } from 'vitest';

import { findNode } from '../../../src/editor/model/document.js';
import { createEditor, viewCatalog } from './kerf-catalog.js';

const PANE = '01JB8Z1M6Q8E1X9V4S7K2R3T5A';
const TOOLBAR = '01JB8Z1M6Q8E1X9V4S7K2R3T5B';
const COMPOSE = '01JB8Z1M6Q8E1X9V4S7K2R3T5D';
const FOLDERS = '01JB8Z1M6Q8E1X9V4S7K2R3T5E';

let cleanup: (() => void) | undefined;
afterEach(() => {
  cleanup?.();
  cleanup = undefined;
  document.body.replaceChildren();
});

function open(id = COMPOSE) {
  const root = document.createElement('div');
  document.body.append(root);
  const editor = createEditor();
  mount(root, editor.render);
  cleanup = editor.wire(root);
  editor.selection.value = { kind: 'node', id };
  const node = () => findNode(editor.document.value, id)?.node;
  return { root, editor, node };
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
  const input = host.querySelector<HTMLInputElement>('input, textarea')!;
  input.value = value;
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

const click = (root: HTMLElement, action: string) =>
  field(root, `[data-action="${action}"]`).click();

describe('editing the selected node', () => {
  it('sets and clears an enum prop from its Select', () => {
    const { root, node } = open();
    const tone = field(root, '[data-editor-prop="tone"]');
    expect(tone.dataset.editorKind).toBe('select');
    choose(tone, 'danger');
    expect(node()?.props?.tone).toBe('danger');
    choose(field(root, '[data-editor-prop="tone"]'), '');
    expect(node()?.props).not.toHaveProperty('tone');
  });

  it('toggles a boolean prop from its Switch and edits text-accepting content', () => {
    const { root, node } = open();
    const disabled = field(root, '[data-editor-prop="disabled"]');
    const input = disabled.querySelector<HTMLInputElement>('input')!;
    input.checked = true;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    expect(node()?.props?.disabled).toBe(true);
    type(field(root, '[data-editor-prop="children"]'), 'Write');
    expect(node()?.props?.children).toBe('Write');
    expect(root.querySelector('[data-editor-canvas]')!.textContent).toContain(
      'Write',
    );
  });

  it('leaves an unchanged value alone, without a history entry', () => {
    const { root, editor } = open();
    const before = editor.document.value;
    type(field(root, '[data-editor-prop="children"]'), 'Compose');
    expect(editor.document.value).toBe(before);
    expect(
      field(root, `[data-action="editor-undo"]`).hasAttribute('disabled'),
    ).toBe(true);
  });

  it('renames a node and shows why an invalid name is refused', () => {
    const { root, node } = open();
    type(field(root, '[data-editor-name]'), 'Send Button');
    expect(node()?.name).toBe('composeButton');
    expect(field(root, '[data-editor-name]').textContent).toContain(
      'camelCase',
    );
    type(field(root, '[data-editor-name]'), 'sendButton');
    expect(node()?.name).toBe('sendButton');
    expect(field(root, '[data-editor-name]').textContent).not.toContain(
      'camelCase',
    );
  });

  it('promotes a prop to a document param', () => {
    const { root, editor, node } = open();
    choose(field(root, '[data-editor-promote]'), 'tone');
    click(root, 'editor-promote');
    expect(node()?.props?.tone).toEqual({ $param: 'composeButtonTone' });
    expect(editor.document.value.params?.composeButtonTone).toMatchObject({
      default: 'brand',
    });
    // A prop that is already a param stays bound to it.
    const promoted = editor.document.value;
    click(root, 'editor-promote');
    expect(editor.document.value).toBe(promoted);
    choose(field(root, '[data-editor-promote]'), 'children');
    click(root, 'editor-promote');
    expect(editor.document.value.params?.composeButtonChildren).toMatchObject({
      default: 'Compose',
    });
  });
});

describe('structural edits', () => {
  it('moves a node within its zone and deletes it', () => {
    const { root, editor } = open(FOLDERS);
    const up = field(root, '[data-action="editor-move-up"]');
    expect(up.hasAttribute('disabled')).toBe(true);
    click(root, 'editor-move-down');
    const content = () =>
      findNode(editor.document.value, PANE)!.node.zones!.content as readonly {
        id?: string;
      }[];
    expect(content()[1]?.id).toBe(FOLDERS);
    click(root, 'editor-move-up');
    expect(content()[0]?.id).toBe(FOLDERS);
    click(root, 'editor-delete');
    expect(findNode(editor.document.value, FOLDERS)).toBeUndefined();
    expect(editor.selection.value).toBeNull();
  });

  it('cannot move or delete the root', () => {
    const { root, editor } = open(PANE);
    expect(
      field(root, '[data-action="editor-delete"]').hasAttribute('disabled'),
    ).toBe(true);
    const before = editor.document.value;
    click(root, 'editor-delete');
    click(root, 'editor-move-down');
    expect(editor.document.value).toBe(before);
  });

  it('adds a chosen component to a chosen zone and selects it', () => {
    const { root, editor } = open(TOOLBAR);
    choose(field(root, '[data-editor-add="zone"]'), 'trailing');
    choose(field(root, '[data-editor-add="component"]'), '@kerfjs/ui:button');
    click(root, 'editor-add-child');
    const selected = editor.selection.value;
    expect(selected?.kind).toBe('node');
    const added = findNode(
      editor.document.value,
      selected?.kind === 'node' ? selected.id : '',
    )!;
    expect(added.node.type).toBe('@kerfjs/ui:button');
    expect(added.ancestors.at(-1)).toMatchObject({ zone: 'trailing' });
    expect(added.node.props).toEqual({ children: 'Button' });
    expect(root.textContent).toContain('8 nodes · valid');
  });
});

describe('list props (KF-HNNWN9)', () => {
  /** Adds component `key` to the Pane's content and returns its node getter. */
  function add(key: string) {
    const opened = open(PANE);
    const { root, editor } = opened;
    choose(field(root, '[data-editor-add="zone"]'), 'content');
    choose(field(root, '[data-editor-add="component"]'), key);
    click(root, 'editor-add-child');
    const selected = editor.selection.value;
    const id = selected?.kind === 'node' ? selected.id : '';
    return { ...opened, node: () => findNode(editor.document.value, id)?.node };
  }

  it.each(['combobox', 'select', 'popup-menu'])(
    'adds a %s that renders without a problem',
    (key) => {
      const { root, node } = add(`@kerfjs/ui:${key}`);
      expect(node()?.type).toBe(`@kerfjs/ui:${key}`);
      expect(root.textContent).toContain('· valid');
      expect(root.textContent).not.toContain('cannot render');
    },
  );

  it('edits a size union from keywords or a builder call (KF-Q5AXNP)', () => {
    const { root, editor, node } = open(FOLDERS);
    const gap = () =>
      field(root, '[data-editor-prop="gap"][data-editor-kind="size"]');
    const builder = () =>
      root.querySelector<HTMLElement>(
        '[data-editor-prop="gap"][data-editor-kind="css"]',
      );
    expect(builder()).toBeNull();
    choose(gap(), 'm');
    expect(node()?.props?.gap).toBe('m');
    choose(gap(), 'true');
    expect(node()?.props?.gap).toBe(true);
    // Custom clears the keyword and opens the builder field.
    choose(gap(), 'custom');
    expect(node()?.props).not.toHaveProperty('gap');
    expect(gap().getAttribute('value')).toBe('custom');
    // Undo brings the keyword back, and the Select shows it, not Custom.
    click(root, 'editor-undo');
    expect(node()?.props?.gap).toBe(true);
    expect(gap().getAttribute('value')).toBe('true');
    expect(builder()).toBeNull();
    choose(gap(), 'custom');
    type(builder()!, 'rgb(0, 0, 0)');
    expect(builder()!.textContent).toContain('This prop takes');
    type(builder()!, 'px(12)');
    expect(node()?.props?.gap).toEqual({ $css: 'px(12)' });
    expect(validateView(editor.document.value, viewCatalog).valid).toBe(true);
    // A keyword again hides the builder field.
    choose(gap(), 'xs');
    expect(node()?.props?.gap).toBe('xs');
    expect(builder()).toBeNull();
    choose(gap(), '');
    expect(node()?.props).not.toHaveProperty('gap');
  });

  it('edits a list prop as JSON and refuses a value its type does not take', () => {
    const { root, node } = add('@kerfjs/ui:combobox');
    const suggestions = field(root, '[data-editor-prop="suggestions"]');
    expect(suggestions.dataset.editorKind).toBe('list');
    expect(suggestions.querySelector('textarea')!.value).toContain(
      'Suggestion 1',
    );
    type(suggestions, '["Red", {"value": "g", "label": "Green"}]');
    expect(node()?.props?.suggestions).toEqual([
      'Red',
      { value: 'g', label: 'Green' },
    ]);
    type(field(root, '[data-editor-prop="suggestions"]'), '[1, 2]');
    expect(node()?.props?.suggestions).toHaveLength(2);
    expect(root.textContent).toContain('Not a ComboboxSuggestion[].');
  });

  it('fills a cleared list prop with an example', () => {
    const { root, node } = add('@kerfjs/ui:combobox');
    type(field(root, '[data-editor-prop="suggestions"]'), '');
    expect(node()?.props).not.toHaveProperty('suggestions');
    expect(root.textContent).toContain('requires "suggestions"');
    click(root, 'editor-fill-example');
    expect(node()?.props?.suggestions).toEqual([
      'Suggestion 1',
      'Suggestion 2',
      'Suggestion 3',
    ]);
    expect(
      root.querySelector('[data-action="editor-fill-example"]'),
    ).toBeNull();
  });

  // KF-SXDM56: content inside a list item (a NavStack view's body) is an
  // item slot the application fills; the outline and canvas show it.
  it('adds a NavStack whose views hold item slots, named apart per node', () => {
    const { root, editor, node } = add('@kerfjs/ui:nav-stack');
    expect(root.textContent).toContain('· valid');
    expect(node()?.props?.views).toEqual([
      { key: 'View 1', content: { $slot: 'view1Content' } },
      { key: 'View 2', content: { $slot: 'view2Content' } },
      { key: 'View 3', content: { $slot: 'view3Content' } },
    ]);
    const canvas = root.querySelector('[data-editor-canvas]')!;
    expect(canvas.textContent).toContain('view1Content slot');
    const row = root.querySelector<HTMLElement>(
      `[data-item-id="item-slot:${node()!.id}:views › 1 › content"]`,
    )!;
    expect(row.textContent).toContain('view1Content slot');
    // A second NavStack in the same document does not reuse those names.
    const first = node()!.id;
    editor.selection.value = { kind: 'node', id: PANE };
    choose(field(root, '[data-editor-add="zone"]'), 'content');
    choose(
      field(root, '[data-editor-add="component"]'),
      '@kerfjs/ui:nav-stack',
    );
    click(root, 'editor-add-child');
    const selected = editor.selection.value;
    const second = findNode(
      editor.document.value,
      selected?.kind === 'node' ? selected.id : '',
    )!.node;
    expect((second.props?.views as { content: unknown }[])[0]?.content).toEqual(
      { $slot: 'view1Content2' },
    );
    // An item slot row selects the node that holds it.
    root
      .querySelector<HTMLElement>(
        `[data-action="editor-select-node"][data-item-id="item-slot:${first}:views › 2 › content"]`,
      )!
      .click();
    expect(editor.selection.value).toEqual({ kind: 'node', id: first });
  });

  it('offers an example only for a required list prop', () => {
    const { root } = add('@kerfjs/ui:popup-menu');
    // The optional anchor is unset and edits as JSON, with no Fill button.
    expect(field(root, '[data-editor-prop="anchor"]').dataset.editorKind).toBe(
      'list',
    );
    expect(
      root.querySelector('[data-action="editor-fill-example"]'),
    ).toBeNull();
  });
});

describe('replacing the root (KF-KWQVDJ)', () => {
  it('starts the document from a NavStack, selects it, and undoes back', () => {
    const { root, editor } = open(PANE);
    const original = editor.document.value;
    choose(
      field(root, '[data-editor-root="component"]'),
      '@kerfjs/ui:nav-stack',
    );
    click(root, 'editor-replace-root');
    const next = editor.document.value.root;
    expect(next.type).toBe('@kerfjs/ui:nav-stack');
    expect(next.id).not.toBe(PANE);
    expect(editor.selection.value).toEqual({ kind: 'node', id: next.id });
    expect(root.textContent).toContain('1 node · valid');
    expect(root.querySelector('[data-editor-canvas]')!.textContent).toContain(
      'view3Content slot',
    );
    // The document keeps its name and params.
    expect(editor.document.value.name).toBe(original.name);
    expect(editor.document.value.params).toEqual(original.params);
    click(root, 'editor-undo');
    expect(editor.document.value).toBe(original);
  });

  it('is offered only for the root', () => {
    const { root } = open(TOOLBAR);
    expect(root.querySelector('[data-editor-root]')).toBeNull();
  });
});

describe('undo and redo', () => {
  it('undoes and redoes from the toolbar and the keyboard', () => {
    const { root, editor, node } = open();
    const original = editor.document.value;
    choose(field(root, '[data-editor-prop="tone"]'), 'danger');
    click(root, 'editor-undo');
    expect(editor.document.value).toBe(original);
    click(root, 'editor-redo');
    expect(node()?.props?.tone).toBe('danger');

    const key = (
      init: KeyboardEventInit,
      target: EventTarget = document.body,
    ) =>
      target.dispatchEvent(
        new KeyboardEvent('keydown', {
          bubbles: true,
          cancelable: true,
          ...init,
        }),
      );
    key({ key: 'z', metaKey: true });
    expect(editor.document.value).toBe(original);
    key({ key: 'Z', ctrlKey: true, shiftKey: true });
    expect(node()?.props?.tone).toBe('danger');
    // Typing keys and the text fields' own undo are left alone.
    key({ key: 'z' });
    key(
      { key: 'z', metaKey: true },
      field(root, '[data-editor-name]').querySelector('input')!,
    );
    expect(node()?.props?.tone).toBe('danger');
  });
});

describe('the Inspector scroll position', () => {
  const frame = () => new Promise((done) => window.requestAnimationFrame(done));
  // happy-dom has no layout and clamps scrollTop to 0; give these elements
  // a plain scroll position so the reset is observable.
  const scrollable = (element: HTMLElement) =>
    Object.defineProperty(element, 'scrollTop', { value: 0, writable: true });

  it('returns to the top for a new selection and stays put for an edit', async () => {
    const { root, editor } = open();
    const rail = root.querySelector<HTMLElement>(
      '[data-workbench-rail="right"]',
    )!;
    const inner = rail.querySelector<HTMLElement>(
      '[data-workbench-panel-content]',
    )!;
    scrollable(rail);
    scrollable(inner);
    await frame(); // the reset for opening on this selection
    inner.scrollTop = 120;
    choose(field(root, '[data-editor-prop="tone"]'), 'danger');
    await frame();
    expect(inner.scrollTop).toBe(120);

    editor.selection.value = { kind: 'node', id: TOOLBAR };
    await frame();
    expect(inner.scrollTop).toBe(0);

    rail.scrollTop = 40;
    editor.selection.value = { kind: 'component', key: '@kerfjs/ui:button' };
    await frame();
    expect(rail.scrollTop).toBe(0);
    editor.selection.value = null;
    await frame();
  });
});

describe('the outline tree', () => {
  it('starts open, closes a node, and reopens its ancestors for a canvas selection', () => {
    const { root, editor } = open(PANE);
    const row = (id: string) =>
      root.querySelector<HTMLElement>(
        `[role="treeitem"][data-item-id="${id}"]`,
      );
    expect(row(COMPOSE)?.getAttribute('aria-level')).toBe('3');
    expect(row(TOOLBAR)?.getAttribute('aria-expanded')).toBe('true');
    row(TOOLBAR)!
      .querySelector<HTMLElement>('.kui-list-item__disclosure')!
      .click();
    expect(row(TOOLBAR)?.getAttribute('aria-expanded')).toBe('false');
    expect(row(COMPOSE)).toBeNull();
    // Choosing the hidden node on the canvas reopens its parent.
    root
      .querySelector<HTMLElement>(
        `[data-editor-canvas] [data-kerf-node="${COMPOSE}"]`,
      )!
      .click();
    expect(editor.selection.value).toEqual({ kind: 'node', id: COMPOSE });
    expect(row(COMPOSE)?.getAttribute('aria-selected')).toBe('true');
    // Reopening what is already open changes nothing.
    row(FOLDERS)!.click();
    expect(row(FOLDERS)?.getAttribute('aria-selected')).toBe('true');
  });
});
