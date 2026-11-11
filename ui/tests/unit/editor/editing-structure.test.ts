// KF-KX77TV: structural actions move, delete, copy, paste, and add nodes.
import { validateView } from '@kerfjs/ui/view';
import { describe, expect, it } from 'vitest';

import { findNode } from '../../../src/editor/model/document.js';
import { loadScaledTimeout } from '../../helpers/load-scaled-timeout.js';
import {
  choose,
  click,
  COMPOSE,
  field,
  FOLDERS,
  open,
  PANE,
  showAllProperties,
  showProp,
  TOOLBAR,
} from './editing-harness.js';
import { viewCatalog } from './kerf-catalog.js';

describe('structural edits', () => {
  it(
    'duplicates, copies, and pastes nodes, and says why a paste does not fit (KF-QAVK73)',
    // Each step re-renders the whole editor, slow under a parallel run.
    { timeout: loadScaledTimeout(15_000) },
    () => {
      const { root, editor } = open(FOLDERS);
      const content = () =>
        (
          editor.document.value.root!.zones!.content as readonly {
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
      field(root, '[data-editor-content-add="icon"]').click();
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
        editor.document.value.root!.zones!.content as readonly {
          id?: string;
        }[];
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
      return field(root, '[data-editor-content-node="trailing"]');
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
    showProp(root, 'icon');
    expect(row()!.textContent).toContain('Not set');
    row()!.click();
    const [icon] = node()!.zones!.icon as { id: string; type: string }[];
    expect(icon!.type).toBe('@kerfjs/ui:lucide-icon');
    expect(editor.selection.value).toEqual({ kind: 'node', id: icon!.id });
    // Back on the Button, the row names what fills it and selects it.
    editor.selection.value = { kind: 'node', id: COMPOSE };
    const filled = field(root, '[data-editor-content-node="icon"]');
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
    showAllProperties(root);
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

  it('cannot move the root, but deletes it to a rootless document (KF-PK3GVY)', () => {
    const { root, editor } = open(PANE);
    expect(
      field(root, '[data-action="editor-move-down"]').hasAttribute('disabled'),
    ).toBe(true);
    expect(
      field(root, '[data-action="editor-delete"]').hasAttribute('disabled'),
    ).toBe(false);
    const before = editor.document.value;
    click(root, 'editor-move-down');
    expect(editor.document.value).toBe(before);
    click(root, 'editor-delete');
    // Params, slots, and the name stay; only the root goes.
    expect('root' in editor.document.value).toBe(false);
    expect(editor.document.value).toEqual({ ...before, root: undefined });
    expect(editor.selection.value).toBeNull();
    expect(root.textContent).toContain('No components yet');
    expect(root.textContent).toContain('Start with a component');
    // One undo brings the whole tree back.
    click(root, 'editor-undo');
    expect(editor.document.value).toBe(before);
  });

  it('pastes a copy as the root of a rootless document (KF-PK3GVY)', () => {
    const { root, editor } = open(FOLDERS);
    const key = (letter: string) =>
      document.body.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: letter,
          metaKey: true,
          bubbles: true,
        }),
      );
    key('c');
    editor.selection.value = { kind: 'node', id: PANE };
    click(root, 'editor-delete');
    expect(editor.document.value.root).toBeUndefined();
    key('v');
    const pasted = editor.document.value.root!;
    expect(pasted.name).toBe('folderList');
    expect(pasted.id).not.toBe(FOLDERS);
    expect(editor.selection.value).toEqual({ kind: 'node', id: pasted.id });
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
