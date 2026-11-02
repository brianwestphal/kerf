// KF-YZPBFH: the canvas shows the tab that holds the selected node; the
// document keeps the tab it opens on.
import type { ViewDocument } from '@kerfjs/ui/view';
import { mount } from 'kerfjs';
import { afterEach, describe, expect, it } from 'vitest';

import { shownScenes } from '../../../src/editor/model/shown-scenes.js';
import { createEditor } from './kerf-catalog.js';

let cleanup: (() => void) | undefined;
afterEach(() => {
  cleanup?.();
  cleanup = undefined;
  document.body.replaceChildren();
});

const ids = {
  pane: '01JB8Z1M6Q8E1X9V4S7K2R3T7A',
  tabs: '01JB8Z1M6Q8E1X9V4S7K2R3T7B',
  first: '01JB8Z1M6Q8E1X9V4S7K2R3T7C',
  second: '01JB8Z1M6Q8E1X9V4S7K2R3T7D',
  inner: '01JB8Z1M6Q8E1X9V4S7K2R3T7E',
  icon: '01JB8Z1M6Q8E1X9V4S7K2R3T7F',
};

const spacer = (id: string) => ({ id, type: '@kerfjs/ui:spacer' });

/** A Pane holding a TabNavigator whose second tab holds a ContentItem. */
const sample = () =>
  ({
    schema: 'kerf-ui-document/v1',
    name: 'Tabs',
    catalogs: ['@kerfjs/ui'],
    root: {
      id: ids.pane,
      type: '@kerfjs/ui:pane',
      zones: {
        content: [
          {
            id: ids.tabs,
            type: '@kerfjs/ui:tab-navigator',
            props: {
              id: 'sections',
              label: 'Sections',
              tabs: [
                { id: 'one', label: 'One' },
                { id: 'two', label: 'Two' },
              ],
              active: 'one',
            },
            zones: {
              'tabs.0.content': [spacer(ids.first)],
              'tabs.1.content': [
                {
                  id: ids.second,
                  type: '@kerfjs/ui:content-item',
                  zones: { children: [spacer(ids.inner)] },
                },
              ],
              'tabs.1.icon': [spacer(ids.icon)],
            },
          },
        ],
      },
    },
  }) as unknown as ViewDocument;

const activeOf = (document: ViewDocument) =>
  (document.root.zones!.content![0] as unknown as { props: { active: string } })
    .props.active;

describe('the scene the canvas shows', () => {
  it('shows the tab whose content holds the selected node, at any depth', () => {
    const document = sample();
    expect(activeOf(shownScenes(document, ids.second))).toBe('two');
    expect(activeOf(shownScenes(document, ids.inner))).toBe('two');
    // The document itself keeps the tab it opens on.
    expect(activeOf(document)).toBe('one');
  });

  it('leaves the document alone otherwise', () => {
    const document = sample();
    // Nothing selected, the navigator itself, a node in the active tab, and
    // a tab's icon (which shows in the bar whatever the tab).
    for (const selected of [undefined, ids.tabs, ids.first, ids.icon, 'gone'])
      expect(shownScenes(document, selected)).toBe(document);
  });

  it('previews the selected node’s tab and exports the document’s', () => {
    const root = globalThis.document.createElement('div');
    globalThis.document.body.append(root);
    const editor = createEditor();
    mount(root, editor.render);
    cleanup = editor.wire(root);
    editor.document.value = sample();
    const scene = (id: string) =>
      root
        .querySelector(`[data-editor-canvas] [data-kerf-node="${id}"]`)!
        .closest('.kui-tab-scaffold__scene')!;
    expect(scene(ids.first).getAttribute('data-active')).toBe('true');
    editor.selection.value = { kind: 'node', id: ids.inner };
    expect(scene(ids.second).getAttribute('data-active')).toBe('true');
    expect(scene(ids.first).getAttribute('data-active')).toBe('false');
    expect(activeOf(editor.document.value)).toBe('one');
    editor.selection.value = { kind: 'node', id: ids.tabs };
    expect(scene(ids.first).getAttribute('data-active')).toBe('true');
  });
});

// KF-RMZ2NP: Show this view cuts a NavStack back to a lower view on the
// canvas only.
describe('the NavStack view the canvas shows', () => {
  const STACK = '01JB8Z1M6Q8E1X9V4S7K2R3T7G';
  const stackDocument = () =>
    ({
      schema: 'kerf-ui-document/v1',
      name: 'Stack',
      catalogs: ['@kerfjs/ui'],
      root: {
        id: STACK,
        type: '@kerfjs/ui:nav-stack',
        props: {
          id: 'stack',
          label: 'Stack',
          views: [
            { key: 'library', content: { $slot: 'libraryContent' } },
            { key: 'project', content: { $slot: 'projectContent' } },
          ],
        },
        zones: {
          'views.1.toolbar.trailing': [spacer('01JB8Z1M6Q8E1X9V4S7K2R3T7H')],
        },
      },
    }) as unknown as ViewDocument;
  const views = (document: ViewDocument) =>
    (document.root.props!.views as { key: string }[]).map(({ key }) => key);

  it('cuts the stack back to the chosen view and drops later zones', () => {
    const document = stackDocument();
    const shown = shownScenes(document, undefined, new Map([[STACK, 0]]));
    expect(views(shown)).toEqual(['library']);
    expect(shown.root.zones).toEqual({});
    expect(views(document)).toEqual(['library', 'project']);
  });

  it('ignores the top view, an index out of range, and a non-stack', () => {
    const document = stackDocument();
    for (const index of [1, 2, -1, 0.5])
      expect(shownScenes(document, undefined, new Map([[STACK, index]]))).toBe(
        document,
      );
    expect(shownScenes(document, undefined, new Map([['nope', 0]]))).toBe(
      document,
    );
  });

  it('cuts a stack with no zones', () => {
    const document = stackDocument();
    delete (document.root as { zones?: unknown }).zones;
    expect(
      views(shownScenes(document, undefined, new Map([[STACK, 0]]))),
    ).toEqual(['library']);
  });

  it('offers no views for a stack whose views are a param', () => {
    const root = globalThis.document.createElement('div');
    globalThis.document.body.append(root);
    const editor = createEditor();
    mount(root, editor.render);
    cleanup = editor.wire(root);
    const document = stackDocument() as unknown as {
      params: Record<string, unknown>;
      root: { props: Record<string, unknown> };
    };
    document.params = {
      stackViews: {
        type: { kind: 'ref', ref: 'NavStackView[]' },
      },
    };
    document.root.props.views = { $param: 'stackViews' };
    editor.document.value = document as unknown as ViewDocument;
    editor.selection.value = { kind: 'node', id: STACK };
    expect(root.querySelector('[data-editor-shown-view]')).toBeNull();
  });

  it('shows a chosen view from the Flow area, and the top view again', () => {
    const root = globalThis.document.createElement('div');
    globalThis.document.body.append(root);
    const editor = createEditor();
    mount(root, editor.render);
    cleanup = editor.wire(root);
    editor.document.value = stackDocument();
    editor.selection.value = { kind: 'node', id: STACK };
    const row = (index: number) =>
      root.querySelector<HTMLElement>(
        `[data-editor-show-view='${JSON.stringify({ id: STACK, index })}']`,
      )!;
    const shownView = () =>
      root.querySelector<HTMLElement>('[data-editor-shown-view]')!.dataset
        .editorShownView;
    const canvasViews = () =>
      root.querySelectorAll('[data-editor-canvas] .kui-nav-stack__view').length;
    expect(shownView()).toBe('1');
    expect(canvasViews()).toBe(2);
    row(0).click();
    expect(shownView()).toBe('0');
    expect(canvasViews()).toBe(1);
    expect(views(editor.document.value)).toEqual(['library', 'project']);
    row(1).click();
    expect(shownView()).toBe('1');
    expect(canvasViews()).toBe(2);
  });
});
