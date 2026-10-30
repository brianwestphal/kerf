// KF-PD6QC5: content fields inside a prop value (a Workbench rail's
// content, a toolbar's title, a NavStack view's content) take nodes in the
// editor, as zones keyed by their path.
import type { ViewType } from '@kerfjs/ui/view';
import { mount } from 'kerfjs';
import { afterEach, describe, expect, it } from 'vitest';

import propsJson from '../../../ai/component-props.json';
import { findNode } from '../../../src/editor/model/document.js';
import { fieldZoneKeys } from '../../../src/editor/model/fields.js';
import { zoneLabel } from '../../../src/editor/model/outline.js';
import { createEditor } from './kerf-catalog.js';

const definitions = propsJson.definitions as unknown as Record<
  string,
  ViewType
>;
const propsOf = (component: string) =>
  propsJson.components.find((entry) => entry.export === component)!
    .props as never;

describe('field zone keys', () => {
  it('offers content fields inside the props a node sets', () => {
    const keys = fieldZoneKeys(
      {
        id: 'w',
        type: '@kerfjs/ui:workbench',
        props: {
          leftRail: { label: 'Folders' },
          mainToolbar: { label: 'Main' },
          rightRail: { $param: 'rail' },
        },
        zones: { main: [], 'bottomDrawer.content': [] },
      } as never,
      propsOf('Workbench'),
      definitions,
    );
    expect(keys).toEqual(
      expect.arrayContaining([
        'leftRail.content',
        'leftRail.header',
        'mainToolbar.title',
        'mainToolbar.trailing',
        // A zone it already fills stays offered with its prop unset.
        'bottomDrawer.content',
      ]),
    );
    // A bound or unset prop offers none, and nothing deeper than a set value.
    expect(keys.some((key) => key.startsWith('rightRail'))).toBe(false);
    expect(keys).not.toContain('main');
  });

  it('offers each set list item’s content', () => {
    expect(
      fieldZoneKeys(
        {
          id: 's',
          type: '@kerfjs/ui:nav-stack',
          props: { views: [{ key: 'a' }, { key: 'b' }] },
        } as never,
        propsOf('NavStack'),
        definitions,
      ),
    ).toEqual(expect.arrayContaining(['views.0.content', 'views.1.content']));
  });

  it('reads a field zone’s path with arrows', () => {
    expect(zoneLabel('leftRail.content')).toBe('leftRail › content');
    expect(zoneLabel('main')).toBe('main');
  });
});

let cleanup: (() => void) | undefined;
afterEach(() => {
  cleanup?.();
  cleanup = undefined;
  document.body.replaceChildren();
});

const field = (root: HTMLElement, selector: string) =>
  root.querySelector<HTMLElement>(selector)!;

function choose(select: HTMLElement, value: string) {
  select.setAttribute('value', value);
  Object.defineProperty(select, 'value', { configurable: true, value });
  select.dispatchEvent(new Event('change', { bubbles: true }));
}

describe('a Workbench rail’s content in the editor (KF-PD6QC5)', () => {
  it('adds a List to the left rail, replacing its placeholder slot', () => {
    const root = document.createElement('div');
    document.body.append(root);
    const editor = createEditor();
    mount(root, editor.render);
    cleanup = editor.wire(root);
    editor.selection.value = {
      kind: 'node',
      id: editor.document.value.root.id,
    };
    choose(
      field(root, '[data-editor-root="component"]'),
      '@kerfjs/ui:workbench',
    );
    field(root, '[data-action="editor-replace-root"]').click();
    const id = editor.document.value.root.id;
    const workbench = () => findNode(editor.document.value, id)!.node;
    // A rail first: its kind seeds its content as an item slot.
    choose(
      field(root, '[data-editor-prop="leftRail"][data-editor-kind="choice"]'),
      '#0',
    );
    expect(workbench().props?.leftRail).toEqual({
      content: { $slot: 'leftRailContent' },
    });
    choose(field(root, '[data-editor-add="zone"]'), 'leftRail.content');
    choose(field(root, '[data-editor-add="component"]'), '@kerfjs/ui:list');
    field(root, '[data-action="editor-add-child"]').click();
    expect(workbench().zones?.['leftRail.content']).toHaveLength(1);
    // The zone owns the field: the placeholder slot is gone, and the
    // document is valid.
    expect(workbench().props?.leftRail).toEqual({});
    // The rail still reads as a static panel.
    editor.selection.value = { kind: 'node', id };
    expect(
      field(
        root,
        '[data-editor-prop="leftRail"][data-editor-kind="choice"]',
      ).getAttribute('value'),
    ).toBe('#0');
    expect(root.textContent).toContain('· valid');
    const canvas = field(root, '[data-editor-canvas]');
    const list = workbench().zones!['leftRail.content']![0] as { id: string };
    expect(
      canvas.querySelector(
        `[data-workbench-rail="left"] [data-kerf-node="${list.id}"]`,
      ),
    ).not.toBeNull();
    // The outline names the zone by its path.
    expect(root.textContent).toContain('leftRail › content');
  });
});
