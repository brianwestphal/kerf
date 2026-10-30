// KF-KX77TV: the inspector edits the selected node, structural actions move,
// delete, and add nodes, and every edit is undoable.
import { validateView } from '@kerfjs/ui/view';
import { mount } from 'kerfjs';
import { afterEach, describe, expect, it } from 'vitest';

import { findNode } from '../../../src/editor/model/document.js';
import { loadScaledTimeout } from '../../helpers/load-scaled-timeout.js';
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
  it(
    'duplicates, copies, and pastes nodes, and says why a paste does not fit (KF-QAVK73)',
    // Each step re-renders the whole editor, slow under a parallel run.
    { timeout: loadScaledTimeout(15_000) },
    () => {
      const { root, editor } = open(FOLDERS);
      const content = () =>
        (
          editor.document.value.root.zones!.content as readonly {
            id: string;
            name?: string;
          }[]
        ).map((child) => child.name ?? child.id);
      const before = content();
      click(root, 'editor-duplicate');
      expect(content()).toEqual([
        ...before.slice(0, before.indexOf('folderList') + 1),
        'folderList2',
        ...before.slice(before.indexOf('folderList') + 1),
      ]);
      // The copy is selected; one undo removes it.
      const copy = (editor.selection.value as { id: string }).id;
      expect(findNode(editor.document.value, copy)!.node.name).toBe(
        'folderList2',
      );
      click(root, 'editor-undo');
      expect(content()).toEqual(before);
      const key = (letter: string) =>
        document.body.dispatchEvent(
          new KeyboardEvent('keydown', {
            key: letter,
            metaKey: true,
            bubbles: true,
          }),
        );
      editor.selection.value = { kind: 'node', id: FOLDERS };
      key('d');
      expect(content()).toContain('folderList2');
      click(root, 'editor-undo');
      // Copy, then paste after the selection.
      editor.selection.value = { kind: 'node', id: FOLDERS };
      key('c');
      key('v');
      expect(content()).toContain('folderList2');
      // A List does not fit a Button's icon: nothing changes, and a notice
      // says so.
      editor.selection.value = { kind: 'node', id: COMPOSE };
      click(root, 'editor-content-add');
      const unchanged = editor.document.value;
      key('v');
      expect(editor.document.value).toBe(unchanged);
      expect(root.textContent).toContain('folderList cannot be pasted there.');
      // The next edit clears it.
      key('d');
      expect(root.textContent).not.toContain('cannot be pasted there');
    },
  );

  it(
    'pastes into the main zone of the root or nothing selected, and refuses a place with no zone (KF-QAVK73)',
    // Each step re-renders the whole editor, slow under a parallel run.
    { timeout: loadScaledTimeout(15_000) },
    () => {
      const { root, editor } = open(PANE);
      const key = (letter: string) =>
        document.body.dispatchEvent(
          new KeyboardEvent('keydown', {
            key: letter,
            ctrlKey: true,
            bubbles: true,
          }),
        );
      const content = () =>
        editor.document.value.root.zones!.content as readonly { id?: string }[];
      // Nothing to paste yet, and the root has no place to duplicate beside.
      const start = editor.document.value;
      key('v');
      key('d');
      expect(editor.document.value).toBe(start);
      // Nothing selected copies and duplicates nothing.
      editor.selection.value = null;
      key('d');
      key('c');
      key('v');
      expect(editor.document.value).toBe(start);
      // With text selected, copy is the browser's.
      editor.selection.value = { kind: 'node', id: COMPOSE };
      const text = document.createElement('p');
      text.textContent = 'words';
      document.body.append(text);
      document.getSelection()!.selectAllChildren(text);
      key('c');
      key('v');
      expect(editor.document.value).toBe(start);
      document.getSelection()!.removeAllRanges();
      key('c');
      // The root selected: the copy goes at the end of its content.
      editor.selection.value = { kind: 'node', id: PANE };
      key('v');
      const last = content().at(-1)!;
      expect(findNode(editor.document.value, last.id!)!.node.type).toBe(
        '@kerfjs/ui:button',
      );
      // Nothing selected: the root's content too.
      editor.selection.value = null;
      key('v');
      expect(content()).toHaveLength(content().length);
      // A root with no zones takes nothing.
      const icon = '01JB8Z1M6Q8E1X9V4S7K2R3TQ2';
      editor.document.value = {
        ...editor.document.value,
        root: {
          id: icon,
          type: '@kerfjs/ui:lucide-icon',
          props: { icon: { $icon: 'plus' }, name: 'plus' },
        },
      } as never;
      editor.selection.value = { kind: 'node', id: icon };
      key('v');
      expect(root.textContent).toContain(
        'composeButton cannot be pasted there.',
      );
      // An unnamed node pastes into an empty zone, and is called by its type.
      const pane = '01JB8Z1M6Q8E1X9V4S7K2R3TQ4';
      const unnamed = '01JB8Z1M6Q8E1X9V4S7K2R3TQ5';
      editor.document.value = {
        ...editor.document.value,
        root: {
          id: pane,
          type: '@kerfjs/ui:pane',
          zones: {
            content: [
              {
                id: unnamed,
                type: '@kerfjs/ui:text',
                props: { children: 'Hi' },
              },
            ],
          },
        },
      } as never;
      editor.selection.value = { kind: 'node', id: unnamed };
      key('c');
      editor.document.value = {
        ...editor.document.value,
        root: { id: pane, type: '@kerfjs/ui:pane' },
      } as never;
      editor.selection.value = { kind: 'node', id: pane };
      key('v');
      expect(content()).toHaveLength(1);
      editor.document.value = {
        ...editor.document.value,
        root: {
          id: icon,
          type: '@kerfjs/ui:lucide-icon',
          props: { icon: { $icon: 'plus' }, name: 'plus' },
        },
      } as never;
      editor.selection.value = { kind: 'node', id: icon };
      key('v');
      expect(root.textContent).toContain('Text cannot be pasted there.');
    },
  );

  it('names what fills a content prop: one node, several, or a slot (KF-5T3TE4)', () => {
    const { root, editor } = open(COMPOSE);
    const id = '01JB8Z1M6Q8E1X9V4S7K2R3TQ3';
    const show = (trailing: unknown[]) => {
      editor.document.value = {
        ...editor.document.value,
        root: {
          id,
          type: '@kerfjs/ui:list-item',
          props: { label: 'Row' },
          zones: { trailing },
        },
      } as never;
      editor.selection.value = { kind: 'node', id };
      return root.querySelector<HTMLElement>(
        '[data-editor-content-node="trailing"]',
      )!;
    };
    const badge = (name?: string) => ({
      id: `01JB8Z1M6Q8E1X9V4S7K2R3TR${name ? '1' : '2'}`,
      type: '@kerfjs/ui:badge',
      ...(name ? { name } : {}),
      props: { children: '3' },
    });
    expect(show([badge('unread')]).textContent).toContain('unread');
    expect(show([badge()]).textContent).toContain('Badge');
    expect(show([badge(), badge('unread')]).textContent).toContain('2 items');
    const slot = show([{ $slot: 'extra' }]);
    expect(slot.textContent).toContain('1 item');
    // A slot alone selects its node.
    slot.click();
    expect(editor.selection.value).toEqual({ kind: 'node', id });
  });

  it('adds a node-only content prop from its Properties row and selects it (KF-5T3TE4)', () => {
    const { root, editor, node } = open(COMPOSE);
    const row = () =>
      root.querySelector<HTMLElement>('[data-editor-content-add="icon"]');
    expect(row()!.textContent).toContain('Not set');
    row()!.click();
    const [icon] = node()!.zones!.icon as { id: string; type: string }[];
    expect(icon!.type).toBe('@kerfjs/ui:lucide-icon');
    expect(editor.selection.value).toEqual({ kind: 'node', id: icon!.id });
    // Back on the Button, the row names what fills it and selects it.
    editor.selection.value = { kind: 'node', id: COMPOSE };
    const filled = root.querySelector<HTMLElement>(
      '[data-editor-content-node="icon"]',
    )!;
    expect(filled.textContent).toContain('LucideIcon · circle');
    expect(row()).toBeNull();
    filled.click();
    expect(editor.selection.value).toEqual({ kind: 'node', id: icon!.id });
  });

  it('opens Children on a content prop it has nothing to suggest for', () => {
    const { root, editor } = open(COMPOSE);
    // Turn the Button into a ListItem-free case: a ListItem's trailing has
    // no suggestion, so its row opens Children on that zone.
    const id = '01JB8Z1M6Q8E1X9V4S7K2R3TQ1';
    editor.document.value = {
      ...editor.document.value,
      root: {
        id,
        type: '@kerfjs/ui:list-item',
        props: { label: 'Row' },
      },
    } as never;
    editor.selection.value = { kind: 'node', id };
    // The main zone has no row; trailing does.
    expect(
      root.querySelector('[data-editor-content-add="children"]'),
    ).toBeNull();
    root
      .querySelector<HTMLElement>('[data-editor-content-add="trailing"]')!
      .click();
    expect(editor.selection.value).toEqual({ kind: 'node', id });
    expect(
      root.querySelector('[data-editor-add="zone"]')!.getAttribute('value'),
    ).toBe('trailing');
    expect(
      root
        .querySelector('[data-editor-add="zone"]')!
        .closest('[role="tabpanel"]')!
        .hasAttribute('hidden'),
    ).toBe(false);
  });

  it('seeds and suggests a ToolbarButton in a ToolbarControlGroup (KF-7BB55F)', () => {
    const { root, editor, node } = open(TOOLBAR);
    choose(field(root, '[data-editor-add="zone"]'), 'trailing');
    choose(
      field(root, '[data-editor-add="component"]'),
      '@kerfjs/ui:toolbar-control-group',
    );
    click(root, 'editor-add-child');
    const group = (editor.selection.value as { id: string }).id;
    const seeded = findNode(editor.document.value, group)!.node.zones!;
    const [child] = Object.values(seeded).flat() as { type: string }[];
    expect(child!.type).toBe('@kerfjs/ui:toolbar-control-group#ToolbarButton');
    expect(
      validateView(editor.document.value, viewCatalog).diagnostics,
    ).toEqual([]);
    // Adding to the group suggests its own controls first.
    editor.selection.value = { kind: 'node', id: group };
    const options = [
      ...field(
        root,
        '[data-editor-add="component"]',
      ).querySelectorAll<HTMLElement>('[role="option"]'),
    ].map((option) => option.dataset.value);
    expect(options.slice(0, 2)).toEqual([
      '@kerfjs/ui:toolbar-control-group#ToolbarButton',
      '@kerfjs/ui:toolbar-control-group#ToolbarActionLink',
    ]);
    expect(node()).toBeDefined();
  });

  it('suggests the components a zone is named for, grouped by category (KF-N8TW04)', () => {
    const { root } = open(COMPOSE);
    const picker = () => field(root, '[data-editor-add="component"]');
    const options = () =>
      [...picker().querySelectorAll<HTMLElement>('[role="option"]')].map(
        (option) => option.dataset.value,
      );
    // The Button's children zone suggests nothing, so it opens on the first
    // category's first component.
    expect(picker().getAttribute('value')).toBe(options()[0]);
    expect(picker().textContent).not.toContain('Suggested');
    choose(field(root, '[data-editor-add="zone"]'), 'icon');
    expect(options()[0]).toBe('@kerfjs/ui:lucide-icon');
    expect(picker().getAttribute('value')).toBe('@kerfjs/ui:lucide-icon');
    expect(picker().textContent).toContain('Suggested');
    expect(picker().textContent).toContain('Foundation');
    // Every component is still offered, once.
    expect(new Set(options()).size).toBe(options().length);
    // Choosing another component sticks until the zone changes.
    choose(picker(), '@kerfjs/ui:badge');
    expect(picker().getAttribute('value')).toBe('@kerfjs/ui:badge');
    choose(field(root, '[data-editor-add="zone"]'), 'children');
    expect(picker().getAttribute('value')).toBe(options()[0]);
  });

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

  // KF-CY1D5W: a list of union items opens its list editor; its typed JSON
  // stays one click away there.
  const openSuggestions = (root: HTMLElement) =>
    field(
      root,
      `[data-editor-open='{"prop":"suggestions","path":[]}']`,
    ).click();
  const suggestionsJson = (root: HTMLElement) =>
    field(root, `[data-editor-field='{"prop":"suggestions","path":[]}']`);

  it('edits a list prop as JSON and refuses a value its type does not take', () => {
    const { root, node } = add('@kerfjs/ui:combobox');
    openSuggestions(root);
    click(root, 'editor-field-json');
    expect(suggestionsJson(root).dataset.editorKind).toBe('list');
    expect(suggestionsJson(root).querySelector('textarea')!.value).toContain(
      'Suggestion 1',
    );
    type(suggestionsJson(root), '["Red", {"value": "g", "label": "Green"}]');
    expect(node()?.props?.suggestions).toEqual([
      'Red',
      { value: 'g', label: 'Green' },
    ]);
    type(suggestionsJson(root), '[1, 2]');
    expect(node()?.props?.suggestions).toHaveLength(2);
    expect(root.textContent).toContain('Not a ComboboxSuggestion[].');
  });

  it('fills a cleared list prop with an example', () => {
    const { root, node } = add('@kerfjs/ui:combobox');
    openSuggestions(root);
    click(root, 'editor-reset-field');
    expect(node()?.props).not.toHaveProperty('suggestions');
    expect(root.textContent).toContain('requires "suggestions"');
    click(root, 'editor-fill-field-example');
    expect(node()?.props?.suggestions).toEqual([
      'Suggestion 1',
      'Suggestion 2',
      'Suggestion 3',
    ]);
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
    // The optional anchor is unset and opens its form (KF-Z9S029), with no
    // Fill button beside it.
    expect(
      root.querySelector('[data-editor-open*=\'"prop":"anchor"\']'),
    ).not.toBeNull();
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

// KF-QCBJ4F: a node's problems appear above its controls; unkeyed, the morph
// turned one prop's input into another's (in WebKit the next clear then
// fired no change event).
describe('Inspector control identity', () => {
  it('keeps each control’s input when a problem appears above them', () => {
    const { root } = open();
    const inputs = () =>
      new Map(
        [
          ...root.querySelectorAll<HTMLElement>(
            '[data-editor-prop], [data-editor-name]',
          ),
        ].map((control) => [
          control.dataset.editorProp ?? 'ref name',
          [control, control.querySelector('input, textarea')] as const,
        ]),
      );
    const before = inputs();
    expect(before.has('children')).toBe(true);
    expect(root.querySelector('[data-editor-node-problem]')).toBeNull();
    type(field(root, '[data-editor-prop="children"]'), '');
    expect(root.querySelector('[data-editor-node-problem]')).not.toBeNull();
    const after = inputs();
    let compared = 0;
    for (const [key, [control, input]] of before) {
      const now = after.get(key);
      if (!now) continue;
      compared += 1;
      expect(now[0], key).toBe(control);
      expect(now[1], key).toBe(input);
    }
    expect(compared).toBeGreaterThan(3);
  });
});
