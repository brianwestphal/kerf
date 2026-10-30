// KF-6GT5QY: inspector states and guard paths of the published editor: a
// full or restricted zone, a css-value field, plural problem counts, and
// actions that arrive with nothing (or nothing applicable) selected.
import type { ViewDocument } from '@kerfjs/ui/view';
import { mount } from 'kerfjs';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { findNode } from '../../../src/editor/model/document.js';
import { createEditor, sample } from './kerf-catalog.js';

const PANE = '01JB8Z1M6Q8E1X9V4S7K2R3T5A';
const TOOLBAR = '01JB8Z1M6Q8E1X9V4S7K2R3T5B';
const COMPOSE = '01JB8Z1M6Q8E1X9V4S7K2R3T5D';
const FOLDERS = '01JB8Z1M6Q8E1X9V4S7K2R3T5E';
const id = (n: number) =>
  `01JB8Z1M6Q8E1X9V4S7K2R3T${String(n).padStart(2, '8')}`;

let cleanup: (() => void) | undefined;
afterEach(() => {
  cleanup?.();
  cleanup = undefined;
  vi.restoreAllMocks();
  document.body.replaceChildren();
});

function open(document_: ViewDocument = sample) {
  const root = document.createElement('div');
  document.body.append(root);
  const editor = createEditor({ document: document_ });
  const stop = mount(root, editor.render);
  const unwire = editor.wire(root);
  cleanup = () => {
    unwire();
    stop();
  };
  return { root, editor };
}

/** Pushes children into the sample Pane's content zone. */
function withContent(...nodes: object[]): ViewDocument {
  const next = globalThis.structuredClone(sample) as unknown as {
    root: { zones: { content: object[] } };
  };
  next.root.zones.content.push(...nodes);
  return next as unknown as ViewDocument;
}

/** Clicks an action whether or not the editor renders its control now. */
function act(root: HTMLElement, action: string) {
  const button = document.createElement('button');
  button.dataset.action = action;
  root.append(button);
  button.click();
  button.remove();
}

/** Sends a change from a control the editor does not render now. */
function change(root: HTMLElement, attribute: string, value = 'x') {
  const host = document.createElement('div');
  host.setAttribute(attribute, 'tone');
  host.dataset.editorKind = 'text';
  host.innerHTML = `<input value="${value}">`;
  root.append(host);
  host.dispatchEvent(new Event('change', { bubbles: true }));
  host.remove();
}

const frame = () =>
  new Promise((done) => window.requestAnimationFrame(() => done(undefined)));

describe('actions with nothing applicable selected', () => {
  it('ignores edits, moves, adds, promotions, undo, and redo', () => {
    const { root, editor } = open();
    const before = editor.document.value;
    for (const action of [
      'editor-undo',
      'editor-redo',
      'editor-move-up',
      'editor-delete',
      'editor-add-child',
      'editor-promote',
    ])
      act(root, action);
    change(root, 'data-editor-prop');
    change(root, 'data-editor-name');
    editor.selection.value = { kind: 'component', key: '@kerfjs/ui:button' };
    act(root, 'editor-delete');
    expect(editor.document.value).toBe(before);
  });

  it('does not move past either end of a zone', () => {
    const { root, editor } = open();
    editor.selection.value = { kind: 'node', id: FOLDERS };
    act(root, 'editor-move-up');
    const content = () =>
      findNode(editor.document.value, PANE)!.node.zones!.content as readonly {
        id?: string;
      }[];
    expect(content()[0]?.id).toBe(FOLDERS);
    act(root, 'editor-move-down');
    act(root, 'editor-move-down');
    act(root, 'editor-move-down');
    expect(content()[2]?.id).toBe(FOLDERS);
  });

  it('adds and promotes nothing for a node with no zones or promotable props', () => {
    const text = { id: id(1), type: '#text', value: 'Plain words' };
    const { root, editor } = open(withContent(text));
    editor.selection.value = { kind: 'node', id: id(1) };
    const before = editor.document.value;
    act(root, 'editor-add-child');
    act(root, 'editor-promote');
    expect(editor.document.value).toBe(before);
  });

  it('draws no highlight or scroll reset after unmounting', async () => {
    const { root, editor } = open();
    editor.selection.value = { kind: 'node', id: COMPOSE };
    cleanup?.();
    cleanup = undefined;
    root.replaceChildren();
    await frame();
    expect(root.childElementCount).toBe(0);
  });
});

describe('inspector states', () => {
  it('clears a field’s error when an unchanged value is entered', () => {
    const bar = {
      id: id(2),
      type: '@kerfjs/ui:progress-bar',
      props: { label: 'Sync' },
    };
    const { root, editor } = open(withContent(bar));
    editor.selection.value = { kind: 'node', id: id(2) };
    const type = (value: string) => {
      const input = root.querySelector<HTMLInputElement>(
        '[data-editor-prop="value"] input',
      )!;
      input.value = value;
      input.dispatchEvent(new Event('change', { bubbles: true }));
    };
    type('1e999');
    expect(root.textContent).toContain('Enter a number.');
    type('');
    expect(root.textContent).not.toContain('Enter a number.');
  });

  it('shows a documented default as a text field’s placeholder', () => {
    const tags = {
      id: id(9),
      type: '@kerfjs/ui:tag-field',
      props: { id: 'labels', label: 'Labels', tags: [] },
    };
    const { root, editor } = open(withContent(tags));
    editor.selection.value = { kind: 'node', id: id(9) };
    expect(
      root.querySelector<HTMLInputElement>(
        '[data-editor-prop="placeholder"] input',
      )?.placeholder,
    ).toBe('Add tag…');
  });

  it('offers a css-value field with a builder placeholder', () => {
    const icon = {
      id: id(3),
      type: '@kerfjs/ui:lucide-icon',
      props: { icon: { $icon: 'inbox' }, name: 'inbox' },
    };
    const { root, editor } = open(withContent(icon));
    editor.selection.value = { kind: 'node', id: id(3) };
    const color = root.querySelector('[data-editor-prop="color"]')!;
    expect(color.getAttribute('data-editor-kind')).toBe('css');
    // A text color suggests a text color builder, not a length (KF-PE0PTT).
    expect(color.querySelector('input')?.placeholder).toBe(
      'uiColor("success-on-quiet")',
    );
    expect(color.textContent).toContain('foregroundColor("#1f2a44")');
  });

  it('restricts a zone to what it accepts and disables a full one', () => {
    const bar = {
      id: id(4),
      type: '@kerfjs/ui:tab-bar',
      props: { id: 'files', label: 'Files' },
      zones: {
        trailing: [
          { id: id(5), type: '@kerfjs/ui:button', props: { children: 'New' } },
        ],
      },
    };
    const { root, editor } = open(withContent(bar));
    editor.selection.value = { kind: 'node', id: id(4) };
    const component = root.querySelector('[data-editor-add="component"]')!;
    expect(component.getAttribute('value')).toBe('@kerfjs/ui:tabs');
    const zone = root.querySelector('[data-editor-add="zone"]')!;
    expect(zone.innerHTML).toContain('trailing holds at most 1');
  });

  it('says when every zone is full', () => {
    const split = {
      id: id(6),
      type: '@kerfjs/ui:split-view',
      props: { id: 'mail', label: 'Mail' },
      zones: {
        list: [{ id: id(7), type: '#text', value: 'List' }],
        detail: [{ id: id(8), type: '#text', value: 'Detail' }],
      },
    };
    const { root, editor } = open(withContent(split));
    editor.selection.value = { kind: 'node', id: id(6) };
    expect(root.textContent).toContain('Every zone of this component is full.');
  });

  it('adds a component that needs no props, and reopens a closed outline node', async () => {
    const { root, editor } = open();
    editor.selection.value = { kind: 'node', id: TOOLBAR };
    const component = root.querySelector<HTMLElement>(
      '[data-editor-add="component"]',
    )!;
    Object.defineProperty(component, 'value', {
      configurable: true,
      value: '@kerfjs/ui:spacer',
    });
    act(root, 'editor-add-child');
    const added = editor.selection.value;
    await frame();
    await frame();
    expect(document.activeElement).toBe(
      root.querySelector('[data-editor-name] input'),
    );
    expect(
      added?.kind === 'node' && findNode(editor.document.value, added.id)?.node,
    ).toMatchObject({ type: '@kerfjs/ui:spacer' });
    expect(
      added?.kind === 'node' &&
        findNode(editor.document.value, added.id)?.node.props,
    ).toBeUndefined();
    const arrow = () =>
      root.querySelector<HTMLElement>(
        `[role="treeitem"][data-item-id="${TOOLBAR}"] .kui-list-item__disclosure`,
      )!;
    arrow().click();
    arrow().click();
    expect(
      root
        .querySelector(`[role="treeitem"][data-item-id="${TOOLBAR}"]`)
        ?.getAttribute('aria-expanded'),
    ).toBe('true');
  });

  it('counts several problems on one node', () => {
    const broken = globalThis.structuredClone(sample) as unknown as {
      root: {
        zones: { header: { zones: { trailing: { props: object }[] } }[] };
      };
    };
    broken.root.zones.header[0]!.zones.trailing[0]!.props = {
      tone: 'loud',
      emphasis: 'shouting',
    };
    const { root } = open(broken as unknown as ViewDocument);
    // Both values and the variant they leave unmatched: 3 problems.
    expect(
      root.querySelector(`[role="treeitem"][data-item-id="${COMPOSE}"]`)
        ?.innerHTML,
    ).toContain('3 problems');
  });

  it('downloads an export when the host gives no save function', () => {
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:export');
    vi.spyOn(URL, 'revokeObjectURL').mockReturnValue();
    const names: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      names.push(this.download);
    });
    const { root } = open();
    act(root, 'editor-export-module');
    expect(names).toEqual(['inbox.view.ts']);
  });
});

describe('binding a prop', () => {
  // KF-K5TKCV: the Bind section offers the sources the validator accepts.
  const ROW = '01JB8Z1M6Q8E1X9V4S7K2R3T5F';
  const choose = (select: Element, value: string) => {
    select.setAttribute('value', value);
    Object.defineProperty(select, 'value', { configurable: true, value });
    select.dispatchEvent(new Event('change', { bubbles: true }));
  };

  it('binds, rebinds, unbinds, and undoes a prop', () => {
    const { root, editor } = open();
    editor.selection.value = { kind: 'node', id: ROW };
    const prop = () => root.querySelector('[data-editor-bind="prop"]')!;
    const source = () => root.querySelector('[data-editor-bind="source"]')!;
    const label = () => findNode(editor.document.value, ROW)!.node.props?.label;
    choose(prop(), 'label');
    // The row's label is bound to its item already.
    expect(source().getAttribute('value')).toBe('{"$bind":"item.label"}');
    expect(source().innerHTML).toContain('Param title');
    choose(source(), '{"$param":"title"}');
    expect(label()).toEqual({ $param: 'title' });
    choose(source(), '');
    expect(label()).toBeUndefined();
    act(root, 'editor-undo');
    expect(label()).toEqual({ $param: 'title' });
  });

  it('leaves a literal alone on Not bound and explains an empty choice', () => {
    const { root, editor } = open();
    editor.selection.value = { kind: 'node', id: COMPOSE };
    const before = editor.document.value;
    choose(root.querySelector('[data-editor-bind="prop"]')!, 'children');
    choose(root.querySelector('[data-editor-bind="source"]')!, '');
    expect(editor.document.value).toBe(before);
    // No param fits the Button's emphasis enum.
    choose(root.querySelector('[data-editor-bind="prop"]')!, 'emphasis');
    expect(
      root.querySelector('[data-editor-bind="source"]')!.textContent,
    ).toContain('No param or item field in scope fits this prop.');
    // With nothing selected, a source change does nothing.
    editor.selection.value = null;
    const host = document.createElement('kui-select');
    host.setAttribute('data-editor-bind', 'source');
    host.setAttribute('data-editor-bind-prop', 'label');
    root.append(host);
    choose(host, '{"$param":"title"}');
    expect(editor.document.value).toBe(before);
  });
});
