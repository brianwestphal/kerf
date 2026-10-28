// KF-CWDE93: dragging nodes and slots on the canvas, with the drop indicator
// and the click that ends a drag suppressed.
import type { ViewDocument } from '@kerfjs/ui/view';
import { mount } from 'kerfjs';
import { afterEach, describe, expect, it } from 'vitest';

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
    // The Pane root is no place to land beside.
    hover(node(PANE));
    at(node(PANE), 0, 0, 800, 600);
    pointer('pointermove', folders, 50, 2);
    pointer('pointerup', folders, 50, 2);
    expect(editor.document.value).toBe(before);
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
});
