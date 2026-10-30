// KF-CWDE93: dragging nodes and slots on the canvas, with the drop indicator
// and the click that ends a drag suppressed.
import type { ViewDocument } from '@kerfjs/ui/view';
import { mount } from 'kerfjs';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { wireCanvasDrag } from '../../../src/editor/canvas-drag.js';
import { slotAt } from '../../../src/editor/model/control-flow.js';
import { placementOf } from '../../../src/editor/model/edits.js';
import { createEditor } from './kerf-catalog.js';

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

/** Places an element at a box, for hit tests and indicator geometry. */
function at(
  element: Element,
  left: number,
  top: number,
  width = 200,
  height = 40,
) {
  Object.defineProperty(element, 'getBoundingClientRect', {
    configurable: true,
    value: () => ({
      left,
      top,
      width,
      height,
      right: left + width,
      bottom: top + height,
    }),
  });
}

function setUp() {
  const root = document.createElement('div');
  document.body.append(root);
  let under: Element | null = null;
  const editor = createEditor();
  mount(root, editor.render);
  // The editor's own wiring uses elementFromPoint; point it at the stub.
  Object.defineProperty(document, 'elementFromPoint', {
    configurable: true,
    value: () => under,
  });
  cleanup = editor.wire(root);
  const canvas = root.querySelector<HTMLElement>('[data-editor-canvas]')!;
  at(canvas, 0, 0, 800, 600);
  const node = (id: string) =>
    canvas.querySelector<HTMLElement>(`[data-kerf-node="${id}"]`)!;
  const slot = () =>
    canvas.querySelector<HTMLElement>('[data-editor-slot-address]')!;
  const overlay = () => canvas.querySelector<HTMLElement>('.kui-editor__drop')!;
  const pointer = (
    type: string,
    target: Element,
    x: number,
    y: number,
    init: { button?: number; pointerId?: number } = {},
  ) => {
    const event = new Event(type, { bubbles: true, cancelable: true });
    for (const [key, value] of Object.entries({
      clientX: x,
      clientY: y,
      button: init.button ?? 0,
      pointerId: init.pointerId ?? 1,
    }))
      Object.defineProperty(event, key, { value });
    target.dispatchEvent(event);
    return event;
  };
  return {
    root,
    editor,
    node,
    slot,
    overlay,
    pointer,
    hover: (element: Element | null) => {
      under = element;
    },
  };
}

const content = (document: ViewDocument) =>
  (document.root.zones!.content as readonly { id?: string }[]).map(
    (child) => child.id,
  );

describe('canvas drag', () => {
  it('drags a node after another, drawing a line, and keeps it selected', () => {
    const { root, editor, node, overlay, pointer, hover } = setUp();
    const folders = node(FOLDERS);
    const empty = root.querySelector(
      '[data-editor-canvas] [data-editor-slot-address]',
    )!;
    at(folders, 0, 100, 800, 120);
    at(empty, 0, 300, 800, 40);
    pointer('pointerdown', folders, 10, 110);
    // Under the threshold, nothing happens.
    pointer('pointermove', folders, 11, 111);
    expect(overlay().hidden).toBe(true);
    hover(empty);
    pointer('pointermove', folders, 20, 338);
    expect(overlay().hidden).toBe(false);
    expect(overlay().dataset.drop).toBe('line');
    expect(overlay().style.height).toBe('2px');
    pointer('pointerup', folders, 20, 338);
    expect(overlay().hidden).toBe(true);
    expect(content(editor.document.value).at(-1)).toBe(FOLDERS);
    expect(editor.selection.value).toEqual({ kind: 'node', id: FOLDERS });
    // The click that ends a drag does not select what is under it.
    empty.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(editor.selection.value).toEqual({ kind: 'node', id: FOLDERS });
    // The next click does.
    node(COMPOSE).dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(editor.selection.value).toEqual({ kind: 'node', id: COMPOSE });
  });

  // KF-Y4GHQV: a drag shows what moves and, in words, where it lands.
  it('names the dragged node and its landing place, and dims its place', () => {
    const { root, node, pointer, hover } = setUp();
    const canvas = root.querySelector('[data-editor-canvas]')!;
    const part = (name: string) =>
      canvas.querySelector<HTMLElement>(`.kui-editor__${name}`)!;
    const compose = node(COMPOSE);
    const folders = node(FOLDERS);
    at(compose, 600, 10, 100, 40);
    at(folders, 0, 100, 800, 120);
    pointer('pointerdown', compose, 610, 20);
    expect(part('drag-chip').hidden).toBe(true);
    hover(folders);
    pointer('pointermove', compose, 50, 210);
    // The chip follows the pointer and names the node.
    expect(part('drag-chip').hidden).toBe(false);
    expect(part('drag-chip').textContent).toContain('composeButton');
    expect(part('drag-chip').style.inset).toBe('224px auto auto 64px');
    // The moved node's place dims.
    expect(part('drag-source').hidden).toBe(false);
    expect(part('drag-source').style.width).toBe('100px');
    // The caption rides the line at its far end and says where it lands.
    expect(part('drop-caption').hidden).toBe(false);
    expect(part('drop-caption').textContent).toBe('After folderList');
    expect(part('drop-caption').style.inset).toBe('221px auto auto 792px');
    expect(part('drop-caption').dataset.side).toBe('on');
    // On the top edge of a ring around the target it would land inside.
    pointer('pointermove', compose, 400, 160);
    expect(part('drop-caption').textContent).toMatch(/^Inside folderList/);
    expect(part('drop-caption').style.inset).toBe('100px auto auto 792px');
    // Never above the canvas's top, where it would be clipped.
    at(folders, 0, 10, 800, 120);
    pointer('pointermove', compose, 400, 70);
    expect(part('drop-caption').style.inset).toBe('14px auto auto 792px');
    // Nor is a line before a node at the very top.
    at(folders, 0, 0, 800, 120);
    pointer('pointermove', compose, 400, 2);
    expect(part('drop-caption').textContent).toBe('Before folderList');
    expect(
      root.querySelector<HTMLElement>('.kui-editor__drop')!.style.inset,
    ).toBe('0px auto auto 0px');
    // Over nothing legal, no caption.
    hover(null);
    pointer('pointermove', compose, 400, 500);
    expect(part('drop-caption').hidden).toBe(true);
    expect(part('drag-chip').hidden).toBe(false);
    // Escape clears everything the drag drew.
    root.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    for (const name of ['drag-chip', 'drag-source', 'drop-caption'])
      expect(part(name).hidden).toBe(true);
  });

  it('drags the list a pressed repeated row belongs to', () => {
    const { editor, node, slot, pointer, hover } = setUp();
    const folders = node(FOLDERS);
    const row = folders.querySelector<HTMLElement>('[data-kerf-node]')!;
    at(folders, 0, 100, 800, 120);
    at(slot(), 0, 300, 800, 40);
    pointer('pointerdown', row, 10, 110);
    hover(slot());
    pointer('pointermove', row, 20, 338);
    pointer('pointerup', row, 20, 338);
    expect(content(editor.document.value).at(-1)).toBe(FOLDERS);
  });

  it('rings a target the node would land inside', () => {
    const { editor, node, overlay, pointer, hover } = setUp();
    const compose = node(COMPOSE);
    const folders = node(FOLDERS);
    at(compose, 600, 10, 100, 40);
    at(folders, 0, 100, 800, 120);
    pointer('pointerdown', compose, 610, 20);
    hover(folders);
    pointer('pointermove', compose, 400, 160);
    expect(overlay().dataset.drop).toBe('ring');
    expect(overlay().style.width).toBe('800px');
    pointer('pointerup', compose, 400, 160);
    expect(placementOf(editor.document.value, COMPOSE)?.parent).toBe(FOLDERS);
  });

  it('reads before and after across a row', () => {
    const { node, overlay, pointer, hover } = setUp();
    const compose = node(COMPOSE);
    const toolbar = node(TOOLBAR);
    const title = toolbar.querySelector<HTMLElement>('[data-kerf-node]')!;
    at(compose, 600, 10, 100, 40);
    at(title, 0, 10, 300, 40);
    title.parentElement!.style.display = 'flex';
    title.parentElement!.style.flexDirection = 'row';
    pointer('pointerdown', compose, 610, 20);
    hover(title);
    pointer('pointermove', compose, 2, 20);
    expect(overlay().hidden).toBe(false);
    expect(overlay().style.width).toBe('2px');
    // KF-Y4GHQV: across a row the caption sits under the line's foot, and a
    // line before the first item stays inside the canvas.
    const caption = () =>
      toolbar
        .closest('[data-editor-canvas]')!
        .querySelector<HTMLElement>('.kui-editor__drop-caption')!;
    expect(overlay().style.inset).toBe('10px auto auto 0px');
    expect(caption().dataset.side).toBe('below');
    expect(caption().style.inset).toBe('54px auto auto 0px');
    pointer('pointermove', compose, 298, 20);
    expect(caption().style.inset).toBe('54px auto auto 300px');
  });

  it('drags a slot by its placeholder', () => {
    const { editor, node, slot, pointer, hover } = setUp();
    const placeholder = slot();
    const folders = node(FOLDERS);
    at(placeholder, 0, 300, 800, 40);
    at(folders, 0, 100, 800, 120);
    pointer('pointerdown', placeholder, 10, 310);
    hover(folders);
    pointer('pointermove', placeholder, 10, 102);
    pointer('pointerup', placeholder, 10, 102);
    const top = { parent: PANE, zone: 'content', index: 0 };
    expect(slotAt(editor.document.value, top)?.$slot).toBe('detail');
    expect(editor.selection.value).toEqual({ kind: 'slot', address: top });
  });

  it('ignores drops nowhere, on itself, outside the canvas, and that are not legal', () => {
    const { root, editor, node, overlay, pointer, hover } = setUp();
    const before = editor.document.value;
    const folders = node(FOLDERS);
    at(folders, 0, 100, 800, 120);
    pointer('pointerdown', folders, 10, 110);
    hover(null);
    pointer('pointermove', folders, 50, 50);
    expect(overlay().hidden).toBe(true);
    hover(folders);
    pointer('pointermove', folders, 50, 150);
    expect(overlay().hidden).toBe(true);
    const outside = document.createElement('div');
    outside.setAttribute('data-kerf-node', 'x');
    root.append(outside);
    hover(outside);
    pointer('pointermove', folders, 50, 150);
    expect(overlay().hidden).toBe(true);
    pointer('pointerup', folders, 50, 150);
    expect(editor.document.value).toBe(before);
  });

  // KF-78MHM8: near a container's edge, a drop that cannot land beside it
  // lands inside it, so the root takes drops anywhere.
  it('drops inside the root Pane at its edge, since nothing goes beside it', () => {
    const { editor, node, overlay, pointer, hover } = setUp();
    const folders = node(FOLDERS);
    at(folders, 0, 100, 800, 120);
    at(node(PANE), 0, 0, 800, 600);
    pointer('pointerdown', folders, 10, 110);
    hover(node(PANE));
    pointer('pointermove', folders, 50, 2);
    expect(overlay().dataset.drop).toBe('ring');
    pointer('pointerup', folders, 50, 2);
    // Inside takes the root's main zone first (KF-W10DXQ), at its end.
    expect(placementOf(editor.document.value, FOLDERS)).toEqual({
      parent: PANE,
      zone: 'content',
      index: 2,
    });
  });

  it('ignores other buttons, other pointers, undraggable nodes, and cancels on Escape or pointercancel', () => {
    const { editor, node, overlay, pointer, hover } = setUp();
    const before = editor.document.value;
    const folders = node(FOLDERS);
    const pane = node(PANE);
    at(folders, 0, 100, 800, 120);
    at(pane, 0, 0, 800, 600);
    pointer('pointerdown', folders, 10, 110, { button: 2 });
    pointer('pointermove', folders, 50, 300);
    pointer('pointerdown', pane, 10, 10);
    pointer('pointermove', pane, 50, 300);
    expect(overlay().hidden).toBe(true);
    pointer('pointerdown', folders, 10, 110);
    pointer('pointermove', folders, 50, 300, { pointerId: 2 });
    pointer('pointerup', folders, 50, 300, { pointerId: 2 });
    hover(node(COMPOSE));
    pointer('pointermove', folders, 50, 300);
    folders.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    pointer('pointerup', folders, 50, 300);
    expect(editor.document.value).toBe(before);
    // A press that never moved does not swallow the next click.
    pointer('pointerdown', folders, 10, 110);
    pointer('pointercancel', folders, 10, 110);
    folders.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'a', bubbles: true }),
    );
    folders.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(editor.selection.value).toEqual({ kind: 'node', id: FOLDERS });
    // A pointerdown outside any node is not a drag.
    pointer('pointerdown', document.body, 0, 0);
  });

  // KF-78MHM8: palette rows drag onto the canvas to add a component.
  describe('from the palette', () => {
    const paletteRow = (root: HTMLElement, key: string) =>
      root.querySelector<HTMLElement>(`[data-editor-palette="${key}"]`)!;

    it('adds the dragged component where it drops and selects it', () => {
      const { root, editor, node, overlay, pointer, hover } = setUp();
      const badge = paletteRow(root, '@kerfjs/ui:badge');
      const folders = node(FOLDERS);
      at(folders, 0, 100, 800, 120);
      pointer('pointerdown', badge, 10, 700);
      hover(folders);
      pointer('pointermove', badge, 50, 215);
      expect(overlay().dataset.drop).toBe('line');
      pointer('pointerup', badge, 50, 215);
      const added = content(editor.document.value)[1]!;
      expect(editor.selection.value).toEqual({ kind: 'node', id: added });
      expect(placementOf(editor.document.value, added)).toEqual({
        parent: PANE,
        zone: 'content',
        index: 1,
      });
      // The click that ends the drag does not open the component's docs.
      badge.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(editor.selection.value).toEqual({ kind: 'node', id: added });
    });

    it('names the dragged component on its chip, without dimming anything', () => {
      const { root, node, pointer, hover } = setUp();
      const canvas = root.querySelector('[data-editor-canvas]')!;
      const part = (name: string) =>
        canvas.querySelector<HTMLElement>(`.kui-editor__${name}`)!;
      const badge = paletteRow(root, '@kerfjs/ui:badge');
      at(node(FOLDERS), 0, 100, 800, 120);
      pointer('pointerdown', badge, 10, 700);
      hover(node(FOLDERS));
      pointer('pointermove', badge, 50, 108);
      expect(part('drag-chip').textContent).toContain('Badge');
      expect(part('drag-source').hidden).toBe(true);
      expect(part('drop-caption').textContent).toBe('Before folderList');
      expect(part('drop-caption').dataset.side).toBe('on');
      pointer('pointerup', badge, 50, 108);
      expect(part('drag-chip').hidden).toBe(true);
      expect(part('drop-caption').hidden).toBe(true);
    });

    // KF-67K2VP: a palette drag rests on the Outline tab to open it, then
    // drops on an outline row with TreeList's own indicator.
    it('opens the Outline tab it rests on, and drops on an outline row', () => {
      vi.useFakeTimers();
      try {
        const { root, editor, overlay, pointer, hover } = setUp();
        const tab = (area: string) =>
          root.querySelector<HTMLElement>(
            `#editor-document-areas-${area}-tab`,
          )!;
        const panel = (area: string) =>
          root.querySelector<HTMLElement>(
            `#editor-document-areas-${area}-panel`,
          )!;
        tab('components').click();
        expect(panel('outline').hidden).toBe(true);
        const badge = paletteRow(root, '@kerfjs/ui:badge');
        pointer('pointerdown', badge, 10, 700);
        hover(tab('outline'));
        pointer('pointermove', badge, 20, 40);
        // Resting short of the delay, or moving off, opens nothing.
        vi.advanceTimersByTime(300);
        hover(null);
        pointer('pointermove', badge, 400, 400);
        vi.advanceTimersByTime(500);
        expect(panel('outline').hidden).toBe(true);
        hover(tab('outline'));
        pointer('pointermove', badge, 20, 40);
        pointer('pointermove', badge, 21, 41);
        vi.advanceTimersByTime(500);
        expect(panel('outline').hidden).toBe(false);
        // A row of the outline now takes the drop.
        const row = panel('outline').querySelector<HTMLElement>(
          `[role="treeitem"][data-item-id="${FOLDERS}"]`,
        )!;
        at(row, 0, 300, 260, 40);
        hover(row);
        pointer('pointermove', badge, 50, 302);
        expect(row.dataset.dropPosition).toBe('before');
        expect(overlay().hidden).toBe(true);
        pointer('pointerup', badge, 50, 302);
        expect(row.dataset.dropPosition).toBeUndefined();
        const added = content(editor.document.value)[0]!;
        expect(added).not.toBe(FOLDERS);
        expect(editor.selection.value).toEqual({ kind: 'node', id: added });
      } finally {
        vi.useRealTimers();
      }
    });

    it('clears an outline indicator when the drag reaches the canvas', () => {
      const { root, node, pointer, hover } = setUp();
      const badge = paletteRow(root, '@kerfjs/ui:badge');
      const row = root.querySelector<HTMLElement>(
        `[role="treeitem"][data-item-id="${FOLDERS}"]`,
      )!;
      at(row, 0, 300, 260, 40);
      at(node(FOLDERS), 0, 100, 800, 120);
      pointer('pointerdown', badge, 10, 700);
      hover(row);
      pointer('pointermove', badge, 50, 338);
      expect(row.dataset.dropPosition).toBe('after');
      hover(node(FOLDERS));
      pointer('pointermove', badge, 50, 215);
      expect(row.dataset.dropPosition).toBeUndefined();
      pointer('pointercancel', badge, 50, 215);
    });

    it('offers no drop over a node where the component fits nowhere', () => {
      const { root, editor, node, overlay, pointer, hover } = setUp();
      const before = editor.document.value;
      // A ToolbarControlGroup belongs in a Toolbar only.
      const group = paletteRow(root, '@kerfjs/ui:toolbar-control-group');
      const folders = node(FOLDERS);
      at(folders, 0, 100, 800, 120);
      pointer('pointerdown', group, 10, 700);
      hover(folders);
      pointer('pointermove', group, 50, 160);
      expect(overlay().hidden).toBe(true);
      pointer('pointerup', group, 50, 160);
      expect(editor.document.value).toBe(before);
    });

    // KF-DC23E9: a component whose seeded props leave required ones unfilled
    // (options, menu items, children) still drops; the inspector then asks
    // for what it needs, as it does after Add a child.
    it.each([
      '@kerfjs/ui:corner-status',
      '@kerfjs/ui:popup-menu',
      '@kerfjs/ui:combobox',
      '@kerfjs/ui:select',
      '@kerfjs/ui:resize',
      '@kerfjs/ui:list-inset-control',
      '@kerfjs/ui:choice-chips',
    ])('drops %s though it is not filled in yet', (key) => {
      const { root, editor, node, overlay, pointer, hover } = setUp();
      const row = paletteRow(root, key);
      const folders = node(FOLDERS);
      at(folders, 0, 100, 800, 120);
      pointer('pointerdown', row, 10, 700);
      hover(folders);
      pointer('pointermove', row, 50, 215);
      expect(overlay().hidden).toBe(false);
      pointer('pointerup', row, 50, 215);
      const added = content(editor.document.value)[1]!;
      expect(editor.selection.value).toEqual({ kind: 'node', id: added });
    });

    it('still shows the component on a click without a drag', () => {
      const { root, editor, pointer } = setUp();
      const badge = paletteRow(root, '@kerfjs/ui:badge');
      pointer('pointerdown', badge, 10, 700);
      pointer('pointerup', badge, 10, 700);
      badge.click();
      expect(editor.selection.value).toEqual({
        kind: 'component',
        key: '@kerfjs/ui:badge',
      });
    });

    it('lands beside a repeated row when the component cannot go inside it', () => {
      const { root, editor, node, overlay, pointer, hover } = setUp();
      const before = editor.document.value;
      const button = paletteRow(root, '@kerfjs/ui:button');
      const row = node(FOLDERS).querySelector<HTMLElement>('[data-kerf-node]')!;
      at(row, 0, 100, 800, 40);
      pointer('pointerdown', button, 10, 700);
      hover(row);
      pointer('pointermove', button, 50, 120);
      expect(overlay().hidden).toBe(false);
      // Beside the repeated row means beside its list; inside is illegal.
      expect(overlay().dataset.drop).toBe('line');
      pointer('pointerup', button, 50, 120);
      expect(editor.document.value).not.toBe(before);
      expect(placementOf(editor.document.value, FOLDERS)?.index).toBe(0);
    });
  });

  it('shows each empty zone of a Toolbar and drops into the one under the pointer (KF-7BB55F)', () => {
    const TOOLBAR = '01JB8Z1M6Q8E1X9V4S7K2R3TT1';
    const root = document.createElement('div');
    document.body.append(root);
    const editor = createEditor({
      document: {
        schema: 'kerf-ui-document/v1',
        name: 'Untitled',
        catalogs: ['@kerfjs/ui'],
        root: {
          id: PANE,
          type: '@kerfjs/ui:pane',
          zones: { content: [{ id: TOOLBAR, type: '@kerfjs/ui:toolbar' }] },
        },
      } as ViewDocument,
    });
    mount(root, editor.render);
    let under: Element | null = null;
    Object.defineProperty(document, 'elementFromPoint', {
      configurable: true,
      value: () => under,
    });
    cleanup = editor.wire(root);
    const canvas = root.querySelector<HTMLElement>('[data-editor-canvas]')!;
    at(canvas, 0, 0, 800, 600);
    const empties = [
      ...canvas.querySelectorAll<HTMLElement>('[data-editor-empty]'),
    ];
    expect(empties.map((empty) => empty.textContent)).toEqual([
      'Leading — drop here',
      'Center — drop here',
      'Trailing — drop here',
    ]);
    const trailing = empties[2]!;
    at(trailing, 600, 10, 180, 44);
    const button = root.querySelector<HTMLElement>(
      '[data-editor-palette="@kerfjs/ui:button"]',
    )!;
    const fire = (type: string, x: number, y: number) => {
      const event = new Event(type, { bubbles: true, cancelable: true });
      for (const [key, value] of Object.entries({
        clientX: x,
        clientY: y,
        button: 0,
        pointerId: 1,
      }))
        Object.defineProperty(event, key, { value });
      button.dispatchEvent(event);
    };
    fire('pointerdown', 10, 700);
    under = trailing.querySelector('.kui-text') ?? trailing;
    fire('pointermove', 650, 30);
    const overlay = canvas.querySelector<HTMLElement>('.kui-editor__drop')!;
    expect(overlay.dataset.drop).toBe('ring');
    expect(
      canvas.querySelector<HTMLElement>('.kui-editor__drop-caption')!
        .textContent,
    ).toBe('Inside Toolbar › trailing');
    fire('pointerup', 650, 30);
    const toolbar = editor.document.value.root.zones!.content![0] as {
      zones?: Record<string, { type: string }[]>;
    };
    expect(Object.keys(toolbar.zones!)).toEqual(['trailing']);
    expect(toolbar.zones!.trailing[0]!.type).toBe('@kerfjs/ui:button');
    // No longer empty, it shows its empty zones only while selected.
    const labels = () =>
      [...canvas.querySelectorAll('[data-editor-empty]')].map(
        (empty) => empty.textContent,
      );
    expect(labels()).toEqual([]);
    editor.selection.value = { kind: 'node', id: TOOLBAR };
    expect(labels()).toEqual(['Leading — drop here', 'Center — drop here']);
  });

  it('fills an empty document by dropping on its root', () => {
    const root = document.createElement('div');
    document.body.append(root);
    const editor = createEditor({
      document: {
        schema: 'kerf-ui-document/v1',
        name: 'Untitled',
        catalogs: ['@kerfjs/ui'],
        root: { id: PANE, type: '@kerfjs/ui:pane' },
      } as ViewDocument,
    });
    mount(root, editor.render);
    let under: Element | null = null;
    Object.defineProperty(document, 'elementFromPoint', {
      configurable: true,
      value: () => under,
    });
    cleanup = editor.wire(root);
    const canvas = root.querySelector<HTMLElement>('[data-editor-canvas]')!;
    at(canvas, 0, 0, 800, 600);
    const pane = canvas.querySelector<HTMLElement>(
      `[data-kerf-node="${PANE}"]`,
    )!;
    at(pane, 0, 0, 800, 600);
    const text = root.querySelector<HTMLElement>(
      '[data-editor-palette="@kerfjs/ui:text"]',
    )!;
    const fire = (type: string, x: number, y: number) => {
      const event = new Event(type, { bubbles: true, cancelable: true });
      for (const [key, value] of Object.entries({
        clientX: x,
        clientY: y,
        button: 0,
        pointerId: 1,
      }))
        Object.defineProperty(event, key, { value });
      text.dispatchEvent(event);
    };
    // An empty Pane has no height, so the pointer is over the canvas.
    fire('pointerdown', 10, 700);
    under = canvas;
    fire('pointermove', 400, 300);
    const overlay = canvas.querySelector<HTMLElement>('.kui-editor__drop')!;
    expect(overlay.dataset.drop).toBe('ring');
    // Drawn just inside the canvas, whose edges clip.
    expect(overlay.style.width).toBe('792px');
    fire('pointerup', 400, 300);
    // KF-W10DXQ: it lands in the Pane's content, not its header.
    const zones = editor.document.value.root.zones!;
    expect(Object.keys(zones)).toEqual(['content']);
    expect((zones.content as readonly { type?: string }[])[0]!.type).toBe(
      '@kerfjs/ui:text',
    );
    // A component the root cannot hold gets no drop on blank canvas.
    const group = root.querySelector<HTMLElement>(
      '[data-editor-palette="@kerfjs/ui:toolbar-control-group"]',
    )!;
    const press = (type: string) => {
      const event = new Event(type, { bubbles: true, cancelable: true });
      for (const [key, value] of Object.entries({
        clientX: 400,
        clientY: 300,
        button: 0,
        pointerId: 1,
      }))
        Object.defineProperty(event, key, { value });
      group.dispatchEvent(event);
    };
    press('pointerdown');
    under = canvas;
    const move = new Event('pointermove', { bubbles: true, cancelable: true });
    for (const [key, value] of Object.entries({
      clientX: 600,
      clientY: 500,
      pointerId: 1,
    }))
      Object.defineProperty(move, key, { value });
    group.dispatchEvent(move);
    expect(overlay.hidden).toBe(true);
    press('pointerup');
    // The root itself takes a drop on it too, and a canvas drag of the
    // root over blank canvas goes nowhere.
    fire('pointerdown', 10, 700);
    under = pane;
    fire('pointermove', 400, 300);
    fire('pointerup', 400, 300);
    expect(
      Object.values(editor.document.value.root.zones!).flat(),
    ).toHaveLength(2);
  });
});

// KF-Y4GHQV / KF-67K2VP: the chip, caption, dimmed source, and other drop
// surfaces are optional; a canvas without their hosts still drags.
describe('wireCanvasDrag without its optional parts', () => {
  it('drags with only the drop overlay', () => {
    const root = document.createElement('div');
    root.innerHTML =
      '<div data-editor-canvas><div data-kerf-node="a"></div>' +
      '<div data-kerf-node="b"></div><div class="kui-editor__drop" hidden></div></div>';
    document.body.append(root);
    const [a, b] = root.querySelectorAll<HTMLElement>('[data-kerf-node]');
    at(root.querySelector('[data-editor-canvas]')!, 0, 0, 400, 400);
    at(a!, 0, 0, 400, 40);
    at(b!, 0, 100, 400, 40);
    const moves: unknown[] = [];
    const stop = wireCanvasDrag(root, {
      sourceOf: (element) => element.dataset.kerfNode,
      targetOf: (element) => element.dataset.kerfNode!,
      canDrop: () => true,
      onMove: (move) => moves.push(move),
      pick: () => b!,
    });
    const send = (type: string, x: number, y: number) => {
      const event = new Event(type, { bubbles: true, cancelable: true });
      for (const [key, value] of Object.entries({
        clientX: x,
        clientY: y,
        button: 0,
        pointerId: 1,
      }))
        Object.defineProperty(event, key, { value });
      a!.dispatchEvent(event);
    };
    send('pointerdown', 10, 10);
    send('pointermove', 10, 138);
    expect(root.querySelector<HTMLElement>('.kui-editor__drop')!.hidden).toBe(
      false,
    );
    send('pointerup', 10, 138);
    expect(moves).toEqual([
      { sourceId: 'a', target: { id: 'b', position: 'after' } },
    ]);
    stop();
  });
});
