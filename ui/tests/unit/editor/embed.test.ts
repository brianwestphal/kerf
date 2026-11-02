// KF-6MGYSG: Embed in wraps a node in a new container in its place, from
// the Inspector's menu, its Other… dialog, or a nested layout's hint; the
// canvas no longer frames a nested layout.
import type { ViewDocument } from '@kerfjs/ui/view';
import { mount } from 'kerfjs';
import { afterEach, describe, expect, it } from 'vitest';

import { findNode } from '../../../src/editor/model/document.js';
import { embedNode } from '../../../src/editor/model/edits.js';
import { createEditor } from './kerf-catalog.js';

let cleanup: (() => void) | undefined;
afterEach(() => {
  cleanup?.();
  cleanup = undefined;
  document.body.replaceChildren();
});

const PANE = '01JB8Z1M6Q8E1X9V4S7K2R3TA0';
const BUTTON = '01JB8Z1M6Q8E1X9V4S7K2R3TA1';
const STACK = '01JB8Z1M6Q8E1X9V4S7K2R3TA2';
const button = {
  id: BUTTON,
  type: '@kerfjs/ui:button',
  props: { children: 'Save' },
};
const stack = {
  id: STACK,
  type: '@kerfjs/ui:nav-stack',
  props: {
    id: 'stack',
    label: 'Stack',
    views: [{ key: 'one', content: { $slot: 'oneContent' } }],
  },
};
const pane = (content: object[]) =>
  ({
    schema: 'kerf-ui-document/v1',
    name: 'Embed',
    catalogs: ['@kerfjs/ui'],
    root: { id: PANE, type: '@kerfjs/ui:pane', zones: { content } },
  }) as unknown as ViewDocument;

function open(document: ViewDocument) {
  const root = window.document.createElement('div');
  window.document.body.append(root);
  const editor = createEditor({ document });
  mount(root, editor.render);
  cleanup = editor.wire(root);
  return { root, editor };
}

const first = (editor: ReturnType<typeof open>['editor']) =>
  editor.document.value.root.zones!.content![0] as {
    id: string;
    type: string;
    props?: Record<string, unknown>;
    zones?: Record<string, { id: string }[]>;
  };

describe('embedNode', () => {
  it('puts a container in the node’s place, holding it', () => {
    const result = embedNode(
      pane([button]),
      BUTTON,
      { type: '@kerfjs/ui:sized-region', props: { minHeight: 1 } as never },
      'children',
      () => '01JB8Z1M6Q8E1X9V4S7K2R3TA9',
    )!;
    expect(result.id).toBe('01JB8Z1M6Q8E1X9V4S7K2R3TA9');
    expect(result.document.root.zones!.content).toEqual([
      {
        id: '01JB8Z1M6Q8E1X9V4S7K2R3TA9',
        type: '@kerfjs/ui:sized-region',
        props: { minHeight: 1 },
        zones: { children: [button] },
      },
    ]);
  });

  it('leaves the root alone', () => {
    expect(
      embedNode(
        pane([]),
        PANE,
        { type: '@kerfjs/ui:sized-region' },
        'children',
      ),
    ).toBeUndefined();
  });
});

describe('Embed in', () => {
  it('offers the first containers in the Flow area, then Other…', () => {
    const { root, editor } = open(pane([button]));
    editor.selection.value = { kind: 'node', id: BUTTON };
    const section = root.querySelector('[data-editor-embed-section]')!;
    const offered = [
      ...section.querySelectorAll<HTMLElement>('[data-editor-embed]'),
    ].map((item) => item.dataset.editorEmbed);
    expect(offered).toEqual([
      '@kerfjs/ui:sized-region',
      '@kerfjs/ui:list-inset-control',
      '@kerfjs/ui:list-inset-text',
    ]);
    expect(section.textContent).toContain('Other…');
  });

  it('embeds the node in a SizedRegion with a usable height, as one undo step', () => {
    const { root, editor } = open(pane([button]));
    editor.selection.value = { kind: 'node', id: BUTTON };
    root
      .querySelector<HTMLElement>(
        '[data-editor-embed-section] [data-editor-embed="@kerfjs/ui:sized-region"]',
      )!
      .click();
    const region = first(editor);
    expect(region.type).toBe('@kerfjs/ui:sized-region');
    expect(region.props).toEqual({ minHeight: { $css: 'rem(20)' } });
    expect(region.zones!.children!.map(({ id }) => id)).toEqual([BUTTON]);
    expect(editor.selection.value).toEqual({ kind: 'node', id: region.id });
    root.querySelector<HTMLElement>('[data-action="editor-undo"]')!.click();
    expect(first(editor).id).toBe(BUTTON);
  });

  it('filters every container in the Other… dialog and embeds the choice', () => {
    const { root, editor } = open(pane([button]));
    editor.selection.value = { kind: 'node', id: BUTTON };
    root
      .querySelector<HTMLElement>('[data-action="editor-embed-other"]')!
      .click();
    const dialog = root.querySelector<HTMLElement>('#editor-embed-dialog')!;
    const choices = () =>
      [...dialog.querySelectorAll<HTMLElement>('[data-editor-embed]')].map(
        (item) => item.dataset.editorEmbed,
      );
    expect(choices()).toContain('@kerfjs/ui:row');
    expect(choices()).toContain('@kerfjs/ui:sized-region');
    // A component with no main zone holds nothing.
    expect(choices()).not.toContain('@kerfjs/ui:badge');
    // The filter is a contenteditable search editor.
    const search = dialog.querySelector<HTMLElement>(
      '[data-editor-embed-search]',
    )!;
    search.textContent = 'row';
    search.dispatchEvent(
      new InputEvent('input', { bubbles: true, inputType: 'insertText' }),
    );
    expect(choices()).toEqual([
      '@kerfjs/ui:framed-list#FramedListRow',
      '@kerfjs/ui:row',
    ]);
    // A name no container has says so; clearing the filter lists all again.
    search.textContent = 'zzz';
    search.dispatchEvent(
      new InputEvent('input', { bubbles: true, inputType: 'insertText' }),
    );
    expect(choices()).toEqual([]);
    expect(dialog.textContent).toContain('No matching container');
    dialog
      .querySelector<HTMLElement>('[data-action="editor-embed-clear"]')!
      .click();
    expect(choices()).toContain('@kerfjs/ui:sized-region');
    dialog
      .querySelector<HTMLElement>('[data-editor-embed="@kerfjs/ui:row"]')!
      .click();
    expect(first(editor).type).toBe('@kerfjs/ui:row');
    expect(
      findNode(editor.document.value, BUTTON)!.ancestors.at(-1)!.zone,
    ).toBe('children');
  });

  it('fixes a nested layout’s hint from its row', () => {
    const { root, editor } = open(pane([stack]));
    const fix = root.querySelector<HTMLElement>(
      '[data-editor-hints] [data-editor-embed-node]',
    )!;
    expect(fix.dataset.editorEmbedNode).toBe(STACK);
    expect(fix.getAttribute('aria-label')).toBe('Embed in SizedRegion');
    fix.click();
    expect(first(editor).type).toBe('@kerfjs/ui:sized-region');
    expect(root.querySelector('[data-editor-hints]')).toBeNull();
  });

  it('renders a nested layout on the canvas without a frame', () => {
    const { root } = open(pane([stack]));
    expect(
      root
        .querySelector(`[data-editor-canvas] [data-kerf-node="${STACK}"]`)!
        .parentElement!.classList.contains('kui-editor__screen'),
    ).toBe(false);
    expect(root.querySelector('.kui-editor__screen')).toBeNull();
  });
});
