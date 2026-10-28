// KF-WXP6AB: placing nodes by drag or by the inspector's Move to picker. The
// validator decides what is legal.
import type { ViewDocument, ViewNode } from '@kerfjs/ui/view';
import { validateView } from '@kerfjs/ui/view';
import { mount } from 'kerfjs';
import { afterEach, describe, expect, it } from 'vitest';

import { setOtherwise } from '../../../src/editor/model/control-flow.js';
import { findNode } from '../../../src/editor/model/document.js';
import {
  dropPlacement,
  moveDestinations,
} from '../../../src/editor/model/drop.js';
import {
  insertNode,
  legalZones,
  placementOf,
  placeNode,
} from '../../../src/editor/model/edits.js';
import sample from '../../fixtures/view/inbox.kui.json';
import { createEditor, propsByKey, viewCatalog } from './kerf-catalog.js';

const inbox = sample as unknown as ViewDocument;
const PANE = '01JB8Z1M6Q8E1X9V4S7K2R3T5A';
const TOOLBAR = '01JB8Z1M6Q8E1X9V4S7K2R3T5B';
const COMPOSE = '01JB8Z1M6Q8E1X9V4S7K2R3T5D';
const FOLDERS = '01JB8Z1M6Q8E1X9V4S7K2R3T5E';
const ROW = '01JB8Z1M6Q8E1X9V4S7K2R3T5F';
const EMPTY = '01JB8Z1M6Q8E1X9V4S7K2R3T5G';
const valid = (document: ViewDocument) =>
  validateView(document, viewCatalog).diagnostics;
const zonesOf = (node: ViewNode) =>
  legalZones(
    node,
    viewCatalog.entries.get(node.type) as Parameters<typeof legalZones>[1],
    propsByKey.get(node.type)?.props ?? [],
    new Set(viewCatalog.components.keys()),
  ).map((zone) => zone.key);
const contentIds = (document: ViewDocument) =>
  (
    document.root.zones!.content as readonly {
      id?: string;
      $slot?: string;
      then?: { id: string };
    }[]
  ).map((child) => child.id ?? child.then?.id ?? `slot ${child.$slot}`);

describe('placing nodes', () => {
  it('reports where a node sits directly in a zone', () => {
    expect(placementOf(inbox, FOLDERS)).toEqual({
      parent: PANE,
      zone: 'content',
      index: 0,
    });
    expect(placementOf(inbox, PANE)).toBeUndefined();
    expect(placementOf(inbox, ROW)).toBeUndefined();
  });

  it('moves within a zone, counting the index before the move', () => {
    const toolbarLast = placeNode(inbox, TOOLBAR, {
      parent: PANE,
      zone: 'header',
      index: 1,
    });
    expect(toolbarLast).toBe(inbox);
    const button = {
      id: '01JB8Z1M6Q8E1X9V4S7K2R3T8A',
      type: '@kerfjs/ui:button',
      props: { children: 'Two', action: { $action: 'two' } },
    };
    const two = {
      ...inbox,
      root: {
        ...inbox.root,
        zones: {
          ...inbox.root.zones,
          header: [
            {
              ...(inbox.root.zones!.header![0] as ViewNode),
              zones: {
                ...(inbox.root.zones!.header![0] as ViewNode).zones,
                trailing: [
                  (inbox.root.zones!.header![0] as ViewNode).zones!
                    .trailing![0]!,
                  button,
                ],
              },
            },
          ],
        },
      },
    } as ViewDocument;
    const down = placeNode(two, COMPOSE, {
      parent: TOOLBAR,
      zone: 'trailing',
      index: 2,
    });
    expect(placementOf(down, COMPOSE)?.index).toBe(1);
    const up = placeNode(down, COMPOSE, {
      parent: TOOLBAR,
      zone: 'trailing',
      index: 0,
    });
    expect(up).toEqual(two);
  });

  it('refuses the root, branches, and moves into itself', () => {
    expect(
      placeNode(inbox, PANE, { parent: TOOLBAR, zone: 'x', index: 0 }),
    ).toBe(inbox);
    expect(
      placeNode(inbox, ROW, { parent: PANE, zone: 'content', index: 0 }),
    ).toBe(inbox);
    expect(
      placeNode(inbox, FOLDERS, {
        parent: FOLDERS,
        zone: 'children',
        index: 0,
      }),
    ).toBe(inbox);
    expect(
      placeNode(inbox, TOOLBAR, {
        parent: COMPOSE,
        zone: 'children',
        index: 0,
      }),
    ).toBe(inbox);
  });
});

describe('drops', () => {
  it('lands before or after a node or a slot in its zone', () => {
    const after = dropPlacement(
      inbox,
      viewCatalog,
      FOLDERS,
      EMPTY,
      'after',
      zonesOf,
    );
    expect(after).toEqual({ parent: PANE, zone: 'content', index: 2 });
    expect(contentIds(placeNode(inbox, FOLDERS, after!)).slice(0, 2)).toEqual([
      EMPTY,
      FOLDERS,
    ]);
    const beforeSlot = dropPlacement(
      inbox,
      viewCatalog,
      FOLDERS,
      `slot:${PANE}:content:2`,
      'before',
      zonesOf,
    );
    expect(beforeSlot).toEqual({ parent: PANE, zone: 'content', index: 2 });
    // A drop that changes nothing is not legal.
    expect(
      dropPlacement(inbox, viewCatalog, FOLDERS, EMPTY, 'before', zonesOf),
    ).toBeUndefined();
    // Beside a repeated row lands beside its whole repeat.
    expect(
      dropPlacement(inbox, viewCatalog, COMPOSE, ROW, 'before', zonesOf),
    ).toEqual({ parent: FOLDERS, zone: 'children', index: 0 });
    expect(
      dropPlacement(inbox, viewCatalog, COMPOSE, PANE, 'before', zonesOf),
    ).toBeUndefined();
  });

  it('lands beside an otherwise branch and past a slot', () => {
    const other = {
      id: '01JB8Z1M6Q8E1X9V4S7K2R3T8B',
      type: '@kerfjs/ui:text',
      props: { children: 'Other' },
    };
    const both = setOtherwise(inbox, EMPTY, other);
    expect(
      dropPlacement(both, viewCatalog, COMPOSE, other.id, 'after', zonesOf),
    ).toEqual({ parent: PANE, zone: 'content', index: 2 });
    const last = {
      id: '01JB8Z1M6Q8E1X9V4S7K2R3T8C',
      type: '@kerfjs/ui:text',
      props: { children: 'Last' },
    };
    const withLast = insertNode(inbox, PANE, 'content', last);
    expect(
      dropPlacement(withLast, viewCatalog, COMPOSE, last.id, 'before', zonesOf),
    ).toEqual({ parent: PANE, zone: 'content', index: 3 });
  });

  it('lands inside the first zone that takes the node, never one that would add a problem', () => {
    const inside = dropPlacement(
      inbox,
      viewCatalog,
      COMPOSE,
      FOLDERS,
      'inside',
      zonesOf,
    );
    expect(inside).toEqual({ parent: FOLDERS, zone: 'children', index: 1 });
    expect(valid(placeNode(inbox, COMPOSE, inside!))).toEqual([]);
    const into = dropPlacement(
      inbox,
      viewCatalog,
      COMPOSE,
      PANE,
      'inside',
      zonesOf,
    );
    expect(into).toMatchObject({ parent: PANE });
    expect(valid(placeNode(inbox, COMPOSE, into!))).toEqual([]);
    expect(
      dropPlacement(inbox, viewCatalog, COMPOSE, 'missing', 'inside', zonesOf),
    ).toBeUndefined();
    expect(
      dropPlacement(inbox, viewCatalog, TOOLBAR, COMPOSE, 'inside', zonesOf),
    ).toBeUndefined();
  });

  it('lists the zones a node can move into, other than its own', () => {
    const destinations = moveDestinations(
      inbox,
      viewCatalog,
      COMPOSE,
      zonesOf,
      (node) => node.type,
    );
    expect(destinations.length).toBeGreaterThan(0);
    expect(
      destinations.some(
        (item) => item.parent === TOOLBAR && item.zone === 'trailing',
      ),
    ).toBe(false);
    for (const destination of destinations) {
      const next = placeNode(inbox, COMPOSE, {
        ...destination,
        index:
          findNode(inbox, destination.parent)!.node.zones?.[destination.zone]
            ?.length ?? 0,
      });
      expect(valid(next)).toEqual([]);
    }
    expect(destinations[0]!.label).toContain(' › ');
    // KF-0P9WWB: the repeated row renders a <button>, so a Button cannot move
    // into its zones (KUI-V014), by Move to or by dropping inside it.
    expect(destinations.some((item) => item.parent === ROW)).toBe(false);
    expect(
      dropPlacement(inbox, viewCatalog, COMPOSE, ROW, 'inside', zonesOf),
    ).toBeUndefined();
    expect(
      moveDestinations(inbox, viewCatalog, ROW, zonesOf, (node) => node.type),
    ).toEqual([]);
  });
});

describe('the editor', () => {
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
    return { root, editor };
  }
  const outlineRow = (root: HTMLElement, id: string) =>
    root.querySelector<HTMLElement>(
      `#editor-outline [data-item-id="${id}"][role="treeitem"], [data-tree-list-id="editor-outline"] [data-item-id="${id}"][role="treeitem"]`,
    )!;
  function drag(type: string, target: HTMLElement, clientY = 0) {
    const event = new Event(type, { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'clientY', { value: clientY });
    target.dispatchEvent(event);
    return event;
  }
  const at = (row: HTMLElement) =>
    Object.defineProperty(row, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({ top: 0, height: 40, bottom: 40 }),
    });

  it('drags movable nodes only, and moves one after another', () => {
    const { root, editor } = open(FOLDERS);
    expect(outlineRow(root, FOLDERS).getAttribute('draggable')).toBe('true');
    expect(outlineRow(root, PANE).hasAttribute('draggable')).toBe(false);
    expect(outlineRow(root, ROW).hasAttribute('draggable')).toBe(false);
    drag('dragstart', outlineRow(root, FOLDERS));
    const target = outlineRow(root, EMPTY);
    at(target);
    expect(drag('dragover', target, 35).defaultPrevented).toBe(true);
    // Asking again uses the kept answer.
    drag('dragover', target, 36);
    expect(target.dataset.dropPosition).toBe('after');
    drag('drop', target, 35);
    expect(contentIds(editor.document.value).slice(0, 2)).toEqual([
      EMPTY,
      FOLDERS,
    ]);
    expect(editor.selection.value).toEqual({ kind: 'node', id: FOLDERS });
    // The changed document answers drops afresh: move it back before Text.
    drag('dragstart', outlineRow(root, FOLDERS));
    const text = outlineRow(root, EMPTY);
    at(text);
    drag('drop', text, 2);
    expect(contentIds(editor.document.value).slice(0, 2)).toEqual([
      FOLDERS,
      EMPTY,
    ]);
  });

  it('moves the selected node to the end of a chosen zone', () => {
    const { root, editor } = open(COMPOSE);
    const select = root.querySelector<HTMLElement>('[data-editor-move]')!;
    const value = JSON.stringify({ parent: PANE, zone: 'content' });
    expect(select.innerHTML).toContain('Pane › content');
    select.setAttribute('value', value);
    Object.defineProperty(select, 'value', { configurable: true, value });
    select.dispatchEvent(new Event('change', { bubbles: true }));
    expect(placementOf(editor.document.value, COMPOSE)).toEqual({
      parent: PANE,
      zone: 'content',
      index: 3,
    });
  });

  it('ignores a cleared Move to and one without a selection', () => {
    const { root, editor } = open(COMPOSE);
    const before = editor.document.value;
    const select = root.querySelector<HTMLElement>('[data-editor-move]')!;
    select.dispatchEvent(new Event('change', { bubbles: true }));
    editor.selection.value = null;
    root.append(select);
    select.setAttribute('value', '{}');
    Object.defineProperty(select, 'value', { configurable: true, value: '{}' });
    select.dispatchEvent(new Event('change', { bubbles: true }));
    expect(editor.document.value).toBe(before);
  });

  it('offers no Move to for a node that cannot move', () => {
    const { root } = open(ROW);
    expect(root.querySelector('[data-editor-move]')).toBeNull();
  });
});
