// KF-XXT6P4: a whole-screen layout below the document root renders in an
// editor-owned frame with a usable height; as the root it is unframed.
import type { ViewDocument } from '@kerfjs/ui/view';
import { mount } from 'kerfjs';
import { afterEach, describe, expect, it } from 'vitest';

import { createEditor } from './kerf-catalog.js';

let cleanup: (() => void) | undefined;
afterEach(() => {
  cleanup?.();
  cleanup = undefined;
  document.body.replaceChildren();
});

const doc = (root: object) =>
  ({
    schema: 'kerf-ui-document/v1',
    name: 'Screens',
    catalogs: ['@kerfjs/ui'],
    root,
  }) as unknown as ViewDocument;

const navigator = {
  id: '01JB8Z1M6Q8E1X9V4S7K2R3T6A',
  type: '@kerfjs/ui:split-view',
  props: { id: 'split', label: 'Split' },
  zones: {
    list: [{ id: '01JB8Z1M6Q8E1X9V4S7K2R3T6C', type: '@kerfjs/ui:spacer' }],
    detail: [{ id: '01JB8Z1M6Q8E1X9V4S7K2R3T6D', type: '@kerfjs/ui:spacer' }],
  },
};

function canvasOf(document: ViewDocument) {
  const root = globalThis.document.createElement('div');
  globalThis.document.body.append(root);
  const editor = createEditor();
  mount(root, editor.render);
  cleanup = editor.wire(root);
  editor.document.value = document;
  return root.querySelector('[data-editor-canvas]')!;
}

describe('whole-screen layouts on the canvas', () => {
  it('frames a SplitView placed inside a container', () => {
    const canvas = canvasOf(
      doc({
        id: '01JB8Z1M6Q8E1X9V4S7K2R3T6B',
        type: '@kerfjs/ui:pane',
        zones: { content: [navigator] },
      }),
    );
    const node = canvas.querySelector(`[data-kerf-node="${navigator.id}"]`)!;
    expect(node.parentElement!.classList).toContain('kui-editor__screen');
  });

  it('leaves the root unframed', () => {
    const canvas = canvasOf(doc(navigator));
    expect(
      canvas.querySelector(`[data-kerf-node="${navigator.id}"]`),
    ).not.toBeNull();
    expect(canvas.querySelector('.kui-editor__screen')).toBeNull();
  });

  // KF-63XR5K: a parent that already gives the layout a height keeps it.
  it('leaves a layout unframed in a SizedRegion or another layout', () => {
    const inner = {
      id: '01JB8Z1M6Q8E1X9V4S7K2R3T6F',
      type: '@kerfjs/ui:nav-stack',
      props: {
        id: 'inner',
        label: 'Inner',
        views: [{ key: 'one', content: { $slot: 'oneContent' } }],
      },
    };
    const outer = {
      ...navigator,
      zones: { ...navigator.zones, detail: [inner] },
    };
    const canvas = canvasOf(
      doc({
        id: '01JB8Z1M6Q8E1X9V4S7K2R3T6B',
        type: '@kerfjs/ui:pane',
        zones: {
          content: [
            {
              id: '01JB8Z1M6Q8E1X9V4S7K2R3T6E',
              type: '@kerfjs/ui:sized-region',
              zones: { children: [outer] },
            },
          ],
        },
      }),
    );
    const parentOf = (id: string) =>
      canvas.querySelector(`[data-kerf-node="${id}"]`)!.parentElement!;
    expect(parentOf(outer.id).classList).toContain('kui-sized-region');
    expect(parentOf(inner.id).classList).not.toContain('kui-editor__screen');
    expect(canvas.querySelector('.kui-editor__screen')).toBeNull();
  });
});
