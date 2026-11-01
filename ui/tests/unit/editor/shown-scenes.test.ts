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
