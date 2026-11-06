// KF-WKABP2: smarter drop targeting. A drag over a multi-panel layout shows
// its zones where they render and drops into the one under the pointer; a
// node alone in a one-child zone is replaced (a seeded placeholder without
// asking, authored content after a confirmation); and a drop made with
// Option, or one inside a container with several zones and no main one,
// asks where it goes.
import type { ViewDocument, ViewNode } from '@kerfjs/ui/view';
import { mount } from 'kerfjs';
import { afterEach, describe, expect, it } from 'vitest';

import {
  isSeedPlaceholder,
  layoutZones,
  regionAt,
  replaceNode,
  singleChildPlace,
  zoneRegions,
  zoneTitle,
} from '../../../src/editor/model/drop-zones.js';
import { createEditor, viewCatalog } from './kerf-catalog.js';

const PANE = '01JB8Z1M6Q8E1X9V4S7K2R4A01';
const WB = '01JB8Z1M6Q8E1X9V4S7K2R4A02';
const MAIN = '01JB8Z1M6Q8E1X9V4S7K2R4A03';
const BAR = '01JB8Z1M6Q8E1X9V4S7K2R4A04';
const NOTE = '01JB8Z1M6Q8E1X9V4S7K2R4A05';
const SPLIT = '01JB8Z1M6Q8E1X9V4S7K2R4A06';
const LIST = '01JB8Z1M6Q8E1X9V4S7K2R4A07';
const DETAIL = '01JB8Z1M6Q8E1X9V4S7K2R4A08';
const COND = '01JB8Z1M6Q8E1X9V4S7K2R4A11';

const text = (id: string, children: string): ViewNode => ({
  id,
  type: '@kerfjs/ui:text',
  props: { children },
});

/** A root Pane holding a seeded Workbench, a Toolbar, and a SplitView. */
function fixture(): ViewDocument {
  return {
    schema: 'kerf-ui-document/v1',
    name: 'Shell',
    catalogs: ['@kerfjs/ui'],
    root: {
      id: PANE,
      type: '@kerfjs/ui:pane',
      props: { fill: true },
      zones: {
        content: [
          {
            id: WB,
            type: '@kerfjs/ui:workbench',
            props: { id: 'Shell', label: 'Shell' },
            zones: { main: [text(MAIN, 'Main')] },
          },
          {
            id: BAR,
            type: '@kerfjs/ui:toolbar',
            props: { label: 'Bar' },
          },
          text(NOTE, 'A note'),
          {
            id: SPLIT,
            type: '@kerfjs/ui:split-view',
            props: { id: 'Split', label: 'Split' },
            zones: {
              list: [text(LIST, 'List')],
              detail: [text(DETAIL, 'Detail')],
            },
          },
          { $if: true, then: text(COND, 'Shown') },
          { $slot: 'aside' },
        ],
      },
    },
  } as ViewDocument;
}

/** The fixture with the Workbench's `main` holding `child` instead. */
function withMain(child: ViewNode): ViewDocument {
  const document = fixture();
  const [workbench, ...rest] = document.root!.zones!.content as ViewNode[];
  return {
    ...document,
    root: {
      ...document.root!,
      zones: {
        content: [{ ...workbench!, zones: { main: [child] } }, ...rest],
      },
    },
  };
}

const names = (key: string) =>
  ({
    '@kerfjs/ui:workbench': 'Workbench',
    '@kerfjs/ui:split-view': 'SplitView',
    '@kerfjs/ui:pane': 'Pane',
  })[key] ?? key;

describe('drop zone model', () => {
  it('lays out multi-panel zones and finds the one under a point', () => {
    const regions = zoneRegions('@kerfjs/ui:workbench')!;
    expect(regions.map((region) => region.zone)).toEqual([
      'leftRail.content',
      'rightRail.content',
      'mainHeader',
      'main',
      'mainFooter',
      'bottomDrawer.content',
    ]);
    expect(zoneTitle('@kerfjs/ui:workbench', 'leftRail.content')).toBe(
      'Left rail',
    );
    expect(zoneTitle('@kerfjs/ui:workbench', 'mainToolbar.title')).toBe(
      undefined,
    );
    // A Pane keeps its main-zone-first drop.
    expect(zoneRegions('@kerfjs/ui:pane')).toBeUndefined();
    expect(regionAt(regions, 0.1, 0.5)!.zone).toBe('leftRail.content');
    expect(regionAt(regions, 0.5, 0.05)!.zone).toBe('mainHeader');
    expect(regionAt(regions, 0.5, 0.9)!.zone).toBe('bottomDrawer.content');
    // Outside every region, the nearest one.
    expect(regionAt(regions, 1.4, 0.5)!.zone).toBe('rightRail.content');
    expect(regionAt([], 0, 0)).toBeUndefined();
  });

  it('takes the boxes of the panels that render and splits the rest', () => {
    const container = { left: 0, top: 0, width: 1000, height: 800 };
    const byZone = (
      zones: ReturnType<typeof layoutZones>,
    ): Record<string, unknown> =>
      Object.fromEntries(zones.map(({ zone, box }) => [zone, box]));
    // Nothing set yet: the default regions.
    const empty = byZone(
      layoutZones('@kerfjs/ui:workbench', container, () => undefined),
    );
    expect(empty['leftRail.content']).toEqual({
      left: 0,
      top: 0,
      width: 240,
      height: 800,
    });
    expect(empty.main).toEqual({
      left: 240,
      top: 128,
      width: 520,
      height: 384,
    });
    // A rendered left rail and drawer: the column between follows them.
    const parts: Record<
      string,
      { left: number; top: number; width: number; height: number }
    > = {
      '.kui-workbench__rail--left': {
        left: 0,
        top: 0,
        width: 300,
        height: 800,
      },
      '.kui-workbench__drawer': {
        left: 300,
        top: 600,
        width: 460,
        height: 200,
      },
    };
    const set = byZone(
      layoutZones(
        '@kerfjs/ui:workbench',
        container,
        (selector) => parts[selector],
      ),
    );
    expect(set['leftRail.content']).toEqual(
      parts['.kui-workbench__rail--left'],
    );
    expect(set['bottomDrawer.content']).toEqual(
      parts['.kui-workbench__drawer'],
    );
    expect(set.mainHeader).toEqual({
      left: 300,
      top: 0,
      width: 460,
      height: 128,
    });
    expect(set.main).toEqual({ left: 300, top: 128, width: 460, height: 344 });
    expect(set.mainFooter).toEqual({
      left: 300,
      top: 472,
      width: 460,
      height: 128,
    });
    // A SplitView takes its rendered list and detail.
    const split = byZone(
      layoutZones('@kerfjs/ui:split-view', container, (selector) =>
        selector === '.kui-split-view__list'
          ? { left: 0, top: 0, width: 280, height: 800 }
          : undefined,
      ),
    );
    expect(split.list).toEqual({ left: 0, top: 0, width: 280, height: 800 });
    expect(split.detail).toEqual({
      left: 340,
      top: 0,
      width: 660,
      height: 800,
    });
    expect(layoutZones('@kerfjs/ui:pane', container, () => undefined)).toEqual(
      [],
    );
  });

  it('finds a node alone in a one-child zone, and tells a placeholder', () => {
    const document = fixture();
    expect(singleChildPlace(document, viewCatalog, MAIN)).toEqual({
      parent: WB,
      zone: 'main',
      index: 0,
    });
    // The root, and a node in a zone that takes more, have none.
    expect(singleChildPlace(document, viewCatalog, PANE)).toBeUndefined();
    expect(singleChildPlace(document, viewCatalog, NOTE)).toBeUndefined();
    expect(isSeedPlaceholder(document, MAIN, names)).toBe(true);
    expect(isSeedPlaceholder(document, DETAIL, names)).toBe(true);
    // Authored text, a different component, and the root are not.
    expect(isSeedPlaceholder(document, NOTE, names)).toBe(false);
    expect(isSeedPlaceholder(document, WB, names)).toBe(false);
    expect(isSeedPlaceholder(document, PANE, names)).toBe(false);
    const named = withMain({ ...text(MAIN, 'Main'), name: 'mainText' });
    expect(isSeedPlaceholder(named, MAIN, names)).toBe(false);
    // A Text with no props names no zone.
    const bare = withMain({ id: MAIN, type: '@kerfjs/ui:text' });
    expect(isSeedPlaceholder(bare, MAIN, names)).toBe(false);
  });

  it('replaces a node with a new one or a moved one, when that is legal', () => {
    const document = fixture();
    const button: ViewNode = {
      id: '01JB8Z1M6Q8E1X9V4S7K2R4A09',
      type: '@kerfjs/ui:button',
      props: { children: 'Go' },
    };
    const added = replaceNode(document, viewCatalog, MAIN, { node: button })!;
    expect((added.root!.zones!.content[0] as ViewNode).zones!.main).toEqual([
      button,
    ]);
    const moved = replaceNode(document, viewCatalog, DETAIL, {
      moved: NOTE,
    })!;
    const split = moved.root!.zones!.content.find(
      (child) => (child as ViewNode).id === SPLIT,
    ) as ViewNode;
    expect((split.zones!.detail[0] as ViewNode).id).toBe(NOTE);
    // Not into itself or its own subtree, and not where nothing is single.
    expect(
      replaceNode(document, viewCatalog, MAIN, { moved: MAIN }),
    ).toBeUndefined();
    expect(
      replaceNode(document, viewCatalog, MAIN, { moved: WB }),
    ).toBeUndefined();
    expect(
      replaceNode(document, viewCatalog, NOTE, { node: button }),
    ).toBeUndefined();
    // Not a node that is not placed directly in a zone.
    expect(
      replaceNode(document, viewCatalog, MAIN, { moved: PANE }),
    ).toBeUndefined();
    expect(
      replaceNode(document, viewCatalog, MAIN, { moved: COND }),
    ).toBeUndefined();
    // A document's own problems do not count against it.
    const flawed = withMain(text(MAIN, 'Main'));
    const [first, ...others] = flawed.root!.zones!.content as ViewNode[];
    const broken: ViewDocument = {
      ...flawed,
      root: {
        ...flawed.root!,
        zones: {
          content: [
            first!,
            ...others,
            { id: '01JB8Z1M6Q8E1X9V4S7K2R4A12', type: '@kerfjs/ui:nope' },
          ],
        },
      },
    };
    expect(
      replaceNode(broken, viewCatalog, MAIN, { node: button }),
    ).toBeDefined();
    expect(
      replaceNode(broken, viewCatalog, DETAIL, { moved: NOTE }),
    ).toBeDefined();
    // Not when the result adds a problem.
    expect(
      replaceNode(document, viewCatalog, DETAIL, {
        node: { id: '01JB8Z1M6Q8E1X9V4S7K2R4A10', type: '@kerfjs/ui:nope' },
      }),
    ).toBeUndefined();
  });
});

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
  width: number,
  height: number,
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
      x: left,
      y: top,
    }),
  });
}

function setUp() {
  const root = document.createElement('div');
  document.body.append(root);
  let under: Element | null = null;
  const editor = createEditor({ document: fixture() });
  const stopMount = mount(root, editor.render);
  Object.defineProperty(document, 'elementFromPoint', {
    configurable: true,
    value: () => under,
  });
  const unwireEditor = editor.wire(root);
  cleanup = () => {
    unwireEditor();
    stopMount();
  };
  const canvas = root.querySelector<HTMLElement>('[data-editor-canvas]')!;
  at(canvas, 0, 0, 1000, 800);
  const node = (id: string) =>
    canvas.querySelector<HTMLElement>(`[data-kerf-node="${id}"]`)!;
  const palette = (key: string) =>
    root.querySelector<HTMLElement>(
      `[data-editor-palette="@kerfjs/ui:${key}"]`,
    )!;
  const pointer = (
    type: string,
    target: Element,
    x: number,
    y: number,
    alt = false,
  ) => {
    const event = new Event(type, { bubbles: true, cancelable: true });
    for (const [key, value] of Object.entries({
      clientX: x,
      clientY: y,
      button: 0,
      pointerId: 1,
      altKey: alt,
    }))
      Object.defineProperty(event, key, { value });
    target.dispatchEvent(event);
  };
  /** Drags canvas element `from` to (`x`, `y`) over `element`. */
  const dragFrom = (from: Element, element: Element, x: number, y: number) => {
    pointer('pointerdown', from, 5, 5);
    under = element;
    pointer('pointermove', from, x, y);
    return { drop: () => pointer('pointerup', from, x, y) };
  };
  /** Drags component `key` from the palette to (`x`, `y`) over `element`. */
  const drag = (key: string, element: Element, x: number, y: number) => {
    const row = palette(key);
    pointer('pointerdown', row, 10, 790);
    under = element;
    pointer('pointermove', row, x, y);
    return {
      drop: (alt = false) => pointer('pointerup', row, x, y, alt),
    };
  };
  const caption = () =>
    canvas.querySelector<HTMLElement>('.kui-editor__drop-caption')!;
  const ghosts = () =>
    canvas.querySelector<HTMLElement>('.kui-editor__zone-ghosts')!;
  const workbench = () =>
    editor.document.value.root!.zones!.content[0] as ViewNode;
  /** Lays the Workbench over the canvas, its seeded Main at its top. */
  const layOut = () => {
    at(node(WB), 0, 0, 1000, 800);
    const main = node(MAIN);
    if (main) at(main, 240, 0, 520, 40);
  };
  /**
   * Waits out the frame the drop menu opens in, and the task in which the
   * click that ends a drag is still suppressed: a person's next click comes
   * later.
   */
  const frame = async () => {
    await new Promise((done) => window.requestAnimationFrame(() => done(null)));
    await new Promise((done) => window.setTimeout(done));
  };
  const menuItems = () =>
    [...root.querySelectorAll<HTMLElement>('[data-editor-drop-choice]')].map(
      (item) => item.textContent!.trim(),
    );
  const choose = (label: string) =>
    [...root.querySelectorAll<HTMLElement>('[data-editor-drop-choice]')]
      .find((item) => item.textContent!.trim() === label)!
      .click();
  return {
    root,
    editor,
    node,
    drag,
    dragFrom,
    caption,
    ghosts,
    workbench,
    layOut,
    frame,
    menuItems,
    choose,
    hover: (element: Element | null) => {
      under = element;
    },
  };
}

describe('smarter drop targeting', () => {
  it('shows a Workbench’s zones and drops into the one under the pointer', () => {
    const { node, drag, caption, ghosts, workbench, layOut } = setUp();
    layOut();
    // Over its left side: the left rail, though it is not set yet.
    const left = drag('nav-stack', node(WB), 100, 400);
    expect(caption().textContent).toBe('Inside Workbench › Left rail');
    const regions = ghosts().querySelectorAll('.kui-editor__zone-ghost');
    expect(ghosts().hidden).toBe(false);
    expect(regions.length).toBeGreaterThan(2);
    expect(ghosts().querySelectorAll('[data-chosen]')).toHaveLength(1);
    left.drop();
    expect(ghosts().hidden).toBe(true);
    expect((workbench().zones!['leftRail.content'][0] as ViewNode).type).toBe(
      '@kerfjs/ui:nav-stack',
    );
    // The rail now renders: its region is the rail's real box, wider than
    // the default quarter.
    layOut();
    const rail = node(WB).querySelector('.kui-workbench__rail--left')!;
    drag('badge', node(WB), 280, 400);
    expect(caption().textContent).not.toBe('Inside Workbench › Left rail');
    at(rail, 0, 0, 300, 800);
    drag('badge', node(WB), 280, 400);
    expect(caption().textContent).toBe('Inside Workbench › Left rail');
  });

  it('drops beside a laid-out container only along its edge', () => {
    const { node, drag, caption, layOut } = setUp();
    layOut();
    drag('badge', node(WB), 500, 3);
    expect(caption().textContent).toBe('Before Workbench');
    // In a row, its start and end edges.
    const row = node(WB).parentElement!;
    row.style.display = 'flex';
    row.style.flexDirection = 'row';
    drag('badge', node(WB), 3, 400);
    expect(caption().textContent).toBe('Before Workbench');
    row.style.display = '';
    // A little further in, its header band.
    drag('badge', node(WB), 500, 60);
    expect(caption().textContent).toBe('Inside Workbench › Header');
  });

  it('replaces a seeded placeholder without asking, authored content after a confirmation', async () => {
    const {
      root,
      editor,
      node,
      drag,
      caption,
      workbench,
      layOut,
      hover,
      frame,
    } = setUp();
    layOut();
    // The placeholder passes the drag to its Workbench: its Main region.
    const first = drag('button', node(MAIN), 500, 300);
    expect(caption().textContent).toBe('Replace Main');
    first.drop();
    const [button] = workbench().zones!.main as ViewNode[];
    expect(button!.type).toBe('@kerfjs/ui:button');
    const dialog = root.querySelector<HTMLDialogElement>(
      '#editor-replace-dialog',
    )!;
    expect(dialog.open).toBe(false);
    // Authored content asks first.
    layOut();
    hover(node(WB));
    const second = drag('text', node(WB), 500, 300);
    expect(caption().textContent).toBe('Replace Button');
    second.drop();
    expect(workbench().zones!.main).toEqual([button]);
    expect(dialog.textContent).toContain('Replace Button?');
    await frame();
    // Closing the dialog drops the request.
    dialog.dispatchEvent(new Event('close'));
    root
      .querySelector<HTMLElement>('[data-action="editor-replace-confirm"]')!
      .click();
    expect(workbench().zones!.main).toEqual([button]);
    // A document changed while it asks replaces nothing.
    layOut();
    drag('text', node(WB), 500, 300).drop();
    await frame();
    const asked = editor.document.value;
    editor.document.value = fixture();
    root
      .querySelector<HTMLElement>('[data-action="editor-replace-confirm"]')!
      .click();
    expect(editor.document.value.root).toEqual(fixture().root);
    editor.document.value = asked;
    // Confirming replaces it; a second ask while it is open keeps it open.
    layOut();
    drag('text', node(WB), 500, 300).drop();
    await frame();
    layOut();
    drag('text', node(WB), 500, 300).drop();
    await frame();
    root
      .querySelector<HTMLElement>('[data-action="editor-replace-confirm"]')!
      .click();
    expect((workbench().zones!.main[0] as ViewNode).type).toBe(
      '@kerfjs/ui:text',
    );
  });

  it('replaces a placeholder with a node moved on the canvas, never with a slot', () => {
    const { root, node, dragFrom, caption, workbench, layOut } = setUp();
    layOut();
    // A slot cannot take the place.
    const slot = root.querySelector(
      '[data-editor-canvas] [data-editor-slot-address]',
    )!;
    dragFrom(slot, node(WB), 500, 300);
    expect(caption().textContent).not.toBe('Replace Main');
    root.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    // A node moved from elsewhere does.
    layOut();
    const note = dragFrom(node(NOTE), node(WB), 500, 300);
    expect(caption().textContent).toBe('Replace Main');
    note.drop();
    expect((workbench().zones!.main[0] as ViewNode).id).toBe(NOTE);
  });

  it('asks where an Option-drop goes and applies the chosen place', async () => {
    const { node, drag, workbench, layOut, frame, menuItems, choose } = setUp();
    layOut();
    drag('badge', node(WB), 500, 300).drop(true);
    await frame();
    expect(menuItems()).toContain('Replace Main');
    expect(menuItems()).toContain('Inside Workbench › Right rail');
    // The document waits for the choice.
    expect(workbench().zones!['rightRail.content']).toBeUndefined();
    choose('Inside Workbench › Right rail');
    expect((workbench().zones!['rightRail.content'][0] as ViewNode).type).toBe(
      '@kerfjs/ui:badge',
    );
  });

  it('offers replacing the node under an Option-drop, and none for a slot', async () => {
    const { root, node, drag, workbench, layOut, frame, menuItems } = setUp();
    layOut();
    drag('button', node(WB), 500, 300).drop();
    const button = (workbench().zones!.main[0] as ViewNode).id;
    at(node(button), 300, 200, 120, 40);
    drag('badge', node(button), 360, 220).drop(true);
    await frame();
    expect(menuItems()).toContain('Replace Button');
    // A slot under the pointer replaces nothing.
    const slot = root.querySelector<HTMLElement>(
      '[data-editor-canvas] [data-editor-slot-address]',
    )!;
    at(slot, 0, 700, 400, 40);
    drag('badge', slot, 200, 720);
    root.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
  });

  it('asks where a drop inside a container with no main zone goes', async () => {
    const { editor, node, drag, frame, menuItems, choose } = setUp();
    at(node(BAR), 0, 0, 800, 60);
    const before = editor.document.value;
    drag('button', node(BAR), 400, 30).drop();
    await frame();
    expect(editor.document.value).toBe(before);
    const choices = menuItems();
    expect(choices.length).toBeGreaterThan(1);
    choose(choices[1]!);
    const bar = editor.document.value.root!.zones!.content[1] as ViewNode;
    expect(Object.values(bar.zones ?? {}).flat()).toHaveLength(1);
  });

  it('asks where an outline drop inside a Workbench goes', async () => {
    const { root, editor, frame, menuItems } = setUp();
    editor.selection.value = { kind: 'node', id: NOTE };
    const row = (id: string) =>
      root.querySelector<HTMLElement>(
        `[data-item-id="${id}"][role="treeitem"]`,
      )!;
    const dragEvent = (type: string, target: HTMLElement, clientY = 0) => {
      const event = new Event(type, { bubbles: true, cancelable: true });
      Object.defineProperty(event, 'clientY', { value: clientY });
      target.dispatchEvent(event);
    };
    const target = row(WB);
    Object.defineProperty(target, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({ left: 0, top: 0, height: 40, bottom: 40 }),
    });
    const before = editor.document.value;
    dragEvent('dragstart', row(NOTE));
    dragEvent('dragover', target, 20);
    dragEvent('drop', target, 20);
    await frame();
    expect(editor.document.value).toBe(before);
    expect(menuItems()).toContain('Inside Workbench › Left rail');
  });
});
