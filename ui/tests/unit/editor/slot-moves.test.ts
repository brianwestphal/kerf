// KF-5RKX3W: a `$slot` is selected from its canvas placeholder and moves
// within or across zones like a node: Move up/down, Delete, and dragging its
// outline row.
import type { ViewDocument } from '@kerfjs/ui/view';
import { mount } from 'kerfjs';
import { afterEach, describe, expect, it } from 'vitest';

import { insertSlot, slotAt } from '../../../src/editor/model/control-flow.js';
import { dropPlacement } from '../../../src/editor/model/drop.js';
import { placeChild } from '../../../src/editor/model/edits.js';
import { previewSlots } from '../../../src/editor/model/preview-slots.js';
import sample from '../../fixtures/view/inbox.kui.json';
import { createEditor, viewCatalog } from './kerf-catalog.js';

const inbox = sample as unknown as ViewDocument;
const PANE = '01JB8Z1M6Q8E1X9V4S7K2R3T5A';
const TOOLBAR = '01JB8Z1M6Q8E1X9V4S7K2R3T5B';
const FOLDERS = '01JB8Z1M6Q8E1X9V4S7K2R3T5E';
const ROW = '01JB8Z1M6Q8E1X9V4S7K2R3T5F';
const DETAIL = { parent: PANE, zone: 'content', index: 2 };

describe('preview slots', () => {
  it('gives each placed slot its own name, declared like the original', () => {
    const second = insertSlot(inbox, FOLDERS, 'children', 'detail');
    if ('error' in second) throw new Error(second.error);
    const { document, slots } = previewSlots(second.document);
    expect([...slots.values()]).toEqual([
      {
        name: 'detail',
        address: { parent: FOLDERS, zone: 'children', index: 1 },
      },
      { name: 'detail', address: DETAIL },
    ]);
    const names = [...slots.keys()];
    expect(new Set(names).size).toBe(2);
    for (const name of names)
      expect(document.slots?.[name]).toEqual(inbox.slots!.detail);
  });

  it('renames slots inside repeats and both branches, and leaves a slot-free document alone', () => {
    const repeated = {
      ...inbox,
      slots: undefined,
      root: {
        ...inbox.root,
        zones: {
          content: [
            {
              $if: { $param: 'showEmpty' },
              then: { $slot: 'a' },
              else: { $slot: 'b' },
            },
            {
              $each: { $param: 'items' },
              as: 'item',
              key: 'item.id',
              template: {
                id: ROW,
                type: '@kerfjs/ui:list-item',
                zones: { trailing: [{ $slot: 'c' }] },
              },
            },
          ],
        },
      },
    } as unknown as ViewDocument;
    const { slots, document } = previewSlots(repeated);
    expect([...slots.values()].map((slot) => slot.name)).toEqual([
      'a',
      'b',
      'c',
    ]);
    expect(document.slots).toEqual({});
    const bare = { ...inbox, root: { id: PANE, type: '@kerfjs/ui:pane' } };
    expect(previewSlots(bare as ViewDocument).document).toBe(bare);
  });

  it('stands a slot in for an empty zone it is asked about (KF-ZWJHJR)', () => {
    const bare = {
      ...inbox,
      root: {
        id: PANE,
        type: '@kerfjs/ui:pane',
        zones: { content: [{ id: ROW, type: '@kerfjs/ui:row' }] },
      },
    } as unknown as ViewDocument;
    const { document, slots } = previewSlots(bare, (node) =>
      node.type === '@kerfjs/ui:row' ? ['children'] : ['content'],
    );
    // The Pane's content holds the Row, so only the Row gets a stand-in.
    expect([...slots.values()]).toEqual([
      {
        name: 'kuiEmptyPreview0',
        address: { parent: ROW, zone: 'children', index: 0 },
        empty: true,
      },
    ]);
    const row = document.root.zones!.content![0] as {
      zones: Record<string, unknown>;
    };
    expect(row.zones.children).toEqual([{ $slot: 'kuiEmptyPreview0' }]);
    // The document itself is untouched.
    expect(bare.root.zones!.content![0]).not.toHaveProperty('zones');
  });
});

describe('placeChild', () => {
  it('moves a slot within its zone and reports where it landed', () => {
    const up = placeChild(inbox, DETAIL, { ...DETAIL, index: 1 });
    expect(up.at).toEqual({ ...DETAIL, index: 1 });
    expect(slotAt(up.document, up.at)?.$slot).toBe('detail');
    const down = placeChild(up.document, up.at, { ...DETAIL, index: 3 });
    expect(down.at).toEqual(DETAIL);
    expect(down.document).toEqual(inbox);
  });

  it('moves a slot into another zone', () => {
    const moved = placeChild(inbox, DETAIL, {
      parent: TOOLBAR,
      zone: 'trailing',
      index: 0,
    });
    expect(slotAt(moved.document, moved.at)?.$slot).toBe('detail');
    expect(moved.document.root.zones!.content).toHaveLength(2);
  });

  it('leaves the document alone for no-op, missing, too-far, and self moves', () => {
    expect(placeChild(inbox, DETAIL, DETAIL).document).toBe(inbox);
    expect(
      placeChild(inbox, { ...DETAIL, index: 9 }, { ...DETAIL, index: 0 })
        .document,
    ).toBe(inbox);
    expect(
      placeChild(inbox, DETAIL, { parent: 'missing', zone: 'x', index: 0 })
        .document,
    ).toBe(inbox);
    expect(
      placeChild(inbox, DETAIL, {
        parent: TOOLBAR,
        zone: 'trailing',
        index: 5,
      }).document,
    ).toBe(inbox);
    const folders = { parent: PANE, zone: 'content', index: 0 };
    expect(
      placeChild(inbox, folders, { parent: ROW, zone: 'trailing', index: 0 })
        .document,
    ).toBe(inbox);
    const toolbar = { parent: PANE, zone: 'header', index: 0 };
    const withElse = {
      ...inbox,
      root: {
        ...inbox.root,
        zones: {
          ...inbox.root.zones,
          footer: [
            {
              $if: { $param: 'showEmpty' },
              then: { $slot: 'detail' },
              else: { $slot: 'detail' },
            },
          ],
        },
      },
    } as ViewDocument;
    expect(
      placeChild(withElse, toolbar, { parent: TOOLBAR, zone: 'x', index: 0 })
        .document,
    ).toBe(withElse);
    // A two-branch condition moves whole.
    const moved = placeChild(
      withElse,
      { parent: PANE, zone: 'footer', index: 0 },
      { parent: TOOLBAR, zone: 'trailing', index: 1 },
    );
    expect(moved.document.root.zones!.footer).toEqual([]);
  });

  it('drops a slot row beside a node', () => {
    expect(
      dropPlacement(
        inbox,
        viewCatalog,
        `slot:${PANE}:content:2`,
        FOLDERS,
        'before',
        () => [],
      ),
    ).toEqual({ parent: PANE, zone: 'content', index: 0 });
    expect(
      dropPlacement(inbox, viewCatalog, 'missing', FOLDERS, 'before', () => []),
    ).toBeUndefined();
  });
});

describe('the editor', () => {
  let cleanup: (() => void) | undefined;
  afterEach(() => {
    cleanup?.();
    cleanup = undefined;
    document.body.replaceChildren();
  });

  function open() {
    const root = document.createElement('div');
    document.body.append(root);
    const editor = createEditor();
    mount(root, editor.render);
    cleanup = editor.wire(root);
    return { root, editor };
  }
  const click = (root: HTMLElement, action: string) =>
    root.querySelector<HTMLElement>(`[data-action="${action}"]`)!.click();
  const button = (root: HTMLElement, action: string) =>
    root.querySelector<HTMLElement>(`[data-action="${action}"]`)!;

  it('selects a slot from its canvas placeholder', () => {
    const { root, editor } = open();
    const placeholder = root.querySelector<HTMLElement>(
      '[data-editor-canvas] [data-editor-slot-address]',
    )!;
    expect(placeholder.textContent).toBe('detail slot');
    placeholder.click();
    expect(editor.selection.value).toEqual({ kind: 'slot', address: DETAIL });
    expect(root.textContent).toContain('The application fills this slot');
  });

  it('moves a slot up and down and deletes it from the toolbar', () => {
    const { root, editor } = open();
    editor.selection.value = { kind: 'slot', address: DETAIL };
    expect(button(root, 'editor-move-down').hasAttribute('disabled')).toBe(
      true,
    );
    click(root, 'editor-move-down');
    expect(editor.selection.value).toEqual({ kind: 'slot', address: DETAIL });
    click(root, 'editor-move-up');
    const up = { ...DETAIL, index: 1 };
    expect(editor.selection.value).toEqual({ kind: 'slot', address: up });
    expect(slotAt(editor.document.value, up)?.$slot).toBe('detail');
    click(root, 'editor-move-down');
    expect(editor.selection.value).toEqual({ kind: 'slot', address: DETAIL });
    click(root, 'editor-delete');
    expect(editor.selection.value).toBeNull();
    expect(slotAt(editor.document.value, DETAIL)).toBeUndefined();
  });

  it('shows no move controls for a slot that is gone, and ignores a delete then', () => {
    const { root, editor } = open();
    const before = editor.document.value;
    editor.selection.value = { kind: 'slot', address: DETAIL };
    const stale = button(root, 'editor-delete');
    editor.selection.value = { kind: 'slot', address: { ...DETAIL, index: 0 } };
    expect(root.querySelector('[data-action="editor-move-up"]')).toBeNull();
    root.append(stale);
    stale.click();
    expect(editor.document.value).toBe(before);
  });

  it('drags a slot row in the outline and keeps it selected', () => {
    const { root, editor } = open();
    const row = (id: string) =>
      root.querySelector<HTMLElement>(
        `[data-tree-list-id="editor-outline"] [role="treeitem"][data-item-id="${id}"]`,
      )!;
    const slotRow = row(`slot:${PANE}:content:2`);
    expect(slotRow.getAttribute('draggable')).toBe('true');
    const drag = (type: string, target: HTMLElement, clientY = 0) => {
      const event = new Event(type, { bubbles: true, cancelable: true });
      Object.defineProperty(event, 'clientY', { value: clientY });
      target.dispatchEvent(event);
    };
    drag('dragstart', slotRow);
    const target = row(FOLDERS);
    Object.defineProperty(target, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({ top: 0, height: 40, bottom: 40 }),
    });
    drag('drop', target, 2);
    const at = { parent: PANE, zone: 'content', index: 0 };
    expect(slotAt(editor.document.value, at)?.$slot).toBe('detail');
    expect(editor.selection.value).toEqual({ kind: 'slot', address: at });
  });
});
