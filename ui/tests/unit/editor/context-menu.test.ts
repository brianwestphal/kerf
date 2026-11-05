// KF-JV7XW1: the node context menu. A right-click (or the ContextMenu key,
// or Shift+F10) on an Outline row or a canvas element selects its node and
// opens a Kerf UI context PopupMenu: Embed in, with the Flow area's entries
// and legality, then the node commands.
import type { ViewDocument } from '@kerfjs/ui/view';
import { mount } from 'kerfjs';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createEditor } from './kerf-catalog.js';

let cleanup: (() => void) | undefined;
afterEach(() => {
  cleanup?.();
  cleanup = undefined;
  document.body.replaceChildren();
});

const PANE = '01JB8Z1M6Q8E1X9V4S7K2R3TB0';
const SAVE = '01JB8Z1M6Q8E1X9V4S7K2R3TB1';
const CANCEL = '01JB8Z1M6Q8E1X9V4S7K2R3TB2';
const button = (id: string, children: string) => ({
  id,
  type: '@kerfjs/ui:button',
  props: { children },
});
const doc = () =>
  ({
    schema: 'kerf-ui-document/v1',
    name: 'Menu',
    catalogs: ['@kerfjs/ui'],
    root: {
      id: PANE,
      type: '@kerfjs/ui:pane',
      zones: {
        content: [button(SAVE, 'Save'), button(CANCEL, 'Cancel')],
        header: [{ $slot: 'top' }],
      },
    },
  }) as unknown as ViewDocument;

function open() {
  const root = window.document.createElement('div');
  window.document.body.append(root);
  const editor = createEditor({ document: doc() });
  const stopMount = mount(root, editor.render);
  const unwireEditor = editor.wire(root);
  cleanup = () => {
    unwireEditor();
    stopMount();
  };
  return { root, editor };
}

const menuOf = (root: HTMLElement) =>
  root.querySelector<HTMLElement>('[data-editor-context-menu]')!;
const anchorOf = (root: HTMLElement) => {
  const style = menuOf(root).style;
  return {
    x: style.getPropertyValue('--kui-popup-menu-context-x'),
    y: style.getPropertyValue('--kui-popup-menu-context-y'),
  };
};
const row = (root: HTMLElement, id: string) =>
  root.querySelector<HTMLElement>(`#editor-outline [data-item-id="${id}"]`)!;
const onCanvas = (root: HTMLElement, id: string) =>
  root.querySelector<HTMLElement>(
    `[data-editor-canvas] [data-kerf-node="${id}"]`,
  )!;
const box = (left: number, top: number, width: number, height: number) =>
  ({
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
    x: left,
    y: top,
    toJSON: () => ({}),
  }) as DOMRect;
const rightClick = (target: Element, x: number, y: number) => {
  const event = new MouseEvent('contextmenu', {
    bubbles: true,
    cancelable: true,
    clientX: x,
    clientY: y,
    button: 2,
  });
  target.dispatchEvent(event);
  return event;
};
const items = (root: HTMLElement) =>
  [
    ...menuOf(root).querySelectorAll<HTMLElement>(
      ':scope > .kui-popup-menu__menu > * > .kui-popup-menu__item, :scope > .kui-popup-menu__menu > .kui-popup-menu__item',
    ),
  ].map((item) => ({
    label: item.querySelector('.kui-popup-menu__item-label')!.textContent,
    disabled: item.getAttribute('aria-disabled') === 'true',
  }));

describe('node context menu', () => {
  it('is a Kerf UI context PopupMenu, empty with nothing selected', () => {
    const { root } = open();
    const menu = menuOf(root);
    expect(menu.dataset.trigger).toBe('context');
    expect(menu.querySelectorAll('.kui-popup-menu__item')).toHaveLength(0);
  });

  it('selects an Outline row’s node and opens at the pointer', () => {
    const { root, editor } = open();
    const target = row(root, CANCEL);
    vi.spyOn(target, 'getBoundingClientRect').mockReturnValue(
      box(10, 100, 200, 40),
    );
    const event = rightClick(target, 50, 120);
    expect(event.defaultPrevented).toBe(true);
    expect(editor.selection.value).toEqual({ kind: 'node', id: CANCEL });
    expect(anchorOf(root)).toEqual({ x: '50px', y: '120px' });
    expect(items(root)).toEqual([
      { label: 'Embed in', disabled: false },
      { label: 'Move up', disabled: false },
      { label: 'Move down', disabled: true },
      { label: 'Duplicate', disabled: false },
      { label: 'Delete', disabled: false },
    ]);
  });

  it('offers Embed in with the Flow area’s entries and legality', () => {
    const { root } = open();
    rightClick(row(root, SAVE), 0, 0);
    const submenu = [
      ...menuOf(root).querySelectorAll<HTMLElement>(
        '.kui-popup-menu__submenu-host .kui-popup-menu__menu .kui-popup-menu__item',
      ),
    ].map((item) => [
      item.dataset.editorContextEmbed ?? item.dataset.action,
      item.getAttribute('aria-disabled') === 'true',
      item.title,
    ]);
    expect(submenu).toEqual([
      ['@kerfjs/ui:sized-region', false, ''],
      ['@kerfjs/ui:list-inset-control', false, ''],
      ['@kerfjs/ui:list-inset-text', true, 'It cannot hold this node here.'],
      ['editor-context-embed-other', false, ''],
    ]);
  });

  it('embeds the node from Embed in, as one undo step', () => {
    const { root, editor } = open();
    rightClick(row(root, SAVE), 0, 0);
    menuOf(root)
      .querySelector<HTMLElement>(
        '[data-editor-context-embed="@kerfjs/ui:sized-region"]',
      )!
      .click();
    const first = editor.document.value.root.zones!.content![0] as {
      id: string;
      type: string;
    };
    expect(first.type).toBe('@kerfjs/ui:sized-region');
    expect(editor.selection.value).toEqual({ kind: 'node', id: first.id });
    root.querySelector<HTMLElement>('[data-action="editor-undo"]')!.click();
    expect(
      (editor.document.value.root.zones!.content![0] as { id: string }).id,
    ).toBe(SAVE);
  });

  it('runs the node commands on the node it opened on', () => {
    const { root, editor } = open();
    rightClick(row(root, CANCEL), 0, 0);
    menuOf(root)
      .querySelector<HTMLElement>('[data-action="editor-context-move-up"]')!
      .click();
    const ids = () =>
      editor.document.value.root.zones!.content!.map(
        (child) => (child as { id: string }).id,
      );
    expect(ids()).toEqual([CANCEL, SAVE]);
    rightClick(row(root, SAVE), 0, 0);
    menuOf(root)
      .querySelector<HTMLElement>('[data-action="editor-context-delete"]')!
      .click();
    expect(ids()).toEqual([CANCEL]);
    const command = (action: string) =>
      menuOf(root)
        .querySelector<HTMLElement>(`[data-action="editor-context-${action}"]`)!
        .click();
    rightClick(row(root, CANCEL), 0, 0);
    command('duplicate');
    expect(ids()).toHaveLength(2);
    expect(ids()[0]).toBe(CANCEL);
    rightClick(row(root, CANCEL), 0, 0);
    command('move-down');
    expect(ids()[1]).toBe(CANCEL);
    // Other… opens the Embed in dialog for the node.
    command('embed-other');
    const dialog = root.querySelector<HTMLDialogElement>(
      '#editor-embed-dialog',
    )!;
    expect(dialog.open).toBe(true);
    dialog
      .querySelector<HTMLElement>('[data-editor-embed="@kerfjs/ui:row"]')!
      .click();
    const row1 = editor.document.value.root.zones!.content![1] as unknown as {
      type: string;
      zones: Record<string, { id: string }[]>;
    };
    expect(row1.type).toBe('@kerfjs/ui:row');
    expect(row1.zones.children!.map(({ id }) => id)).toEqual([CANCEL]);
  });

  it('offers the root Embed in, with commands that cannot act disabled', () => {
    const { root } = open();
    rightClick(row(root, PANE), 0, 0);
    expect(items(root)).toEqual([
      { label: 'Embed in', disabled: false },
      { label: 'Move up', disabled: true },
      { label: 'Move down', disabled: true },
      { label: 'Duplicate', disabled: true },
      { label: 'Delete', disabled: true },
    ]);
  });

  it('opens below a canvas element when the keyboard opened it', () => {
    const { root, editor } = open();
    const target = onCanvas(root, SAVE);
    vi.spyOn(target, 'getBoundingClientRect').mockReturnValue(
      box(300, 200, 100, 30),
    );
    // The ContextMenu key's event carries no point inside the element.
    rightClick(target, 0, 0);
    expect(editor.selection.value).toEqual({ kind: 'node', id: SAVE });
    expect(anchorOf(root)).toEqual({ x: '316px', y: '230px' });
  });

  it('opens from Shift+F10 on a focused Outline row, below it', () => {
    const { root, editor } = open();
    const target = row(root, CANCEL);
    vi.spyOn(target, 'getBoundingClientRect').mockReturnValue(
      box(8, 60, 20, 30),
    );
    const key = new KeyboardEvent('keydown', {
      key: 'F10',
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });
    target.dispatchEvent(key);
    expect(key.defaultPrevented).toBe(true);
    expect(editor.selection.value).toEqual({ kind: 'node', id: CANCEL });
    expect(anchorOf(root)).toEqual({ x: '18px', y: '90px' });
    // Shift+F10 elsewhere does nothing.
    const elsewhere = new KeyboardEvent('keydown', {
      key: 'F10',
      shiftKey: true,
      bubbles: true,
      cancelable: true,
    });
    root.ownerDocument.body.dispatchEvent(elsewhere);
    expect(elsewhere.defaultPrevented).toBe(false);
  });

  it('leaves a slot row, other places, and play mode alone', () => {
    const { root, editor } = open();
    const slot = root.querySelector<HTMLElement>(
      '#editor-outline [data-item-id^="slot:"]',
    )!;
    expect(rightClick(slot, 0, 0).defaultPrevented).toBe(false);
    expect(
      rightClick(root.querySelector('[data-editor-canvas]')!, 0, 0)
        .defaultPrevented,
    ).toBe(false);
    expect(editor.selection.value).toBeNull();
    root.querySelector<HTMLElement>('[data-action="editor-play"]')!.click();
    expect(rightClick(onCanvas(root, SAVE), 0, 0).defaultPrevented).toBe(false);
    expect(editor.selection.value).toBeNull();
  });

  it('returns focus to where it opened when it closes', () => {
    const { root, editor } = open();
    const anchor = () =>
      menuOf(root).querySelector<HTMLElement>(
        '.kui-popup-menu__context-anchor',
      )!;
    // From an Outline row: the selected row, which is that node's.
    rightClick(row(root, CANCEL), 0, 0);
    anchor().focus();
    expect(document.activeElement).toBe(row(root, CANCEL));
    // From a canvas element: the element.
    const target = onCanvas(root, SAVE);
    target.tabIndex = -1;
    rightClick(target, 0, 0);
    expect(editor.selection.value).toEqual({ kind: 'node', id: SAVE });
    anchor().focus();
    expect(document.activeElement).toBe(target);
    // Focus the anchor takes on its own stays.
    anchor().focus();
    expect(document.activeElement).toBe(anchor());
  });
});
