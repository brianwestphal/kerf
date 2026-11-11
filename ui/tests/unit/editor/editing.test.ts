// KF-KX77TV: the inspector edits the selected node, and every edit is
// undoable (structural edits and list props have their own files).
import { describe, expect, it } from 'vitest';

import { findNode } from '../../../src/editor/model/document.js';
import {
  attach,
  choose,
  click,
  COMPOSE,
  field,
  FOLDERS,
  inspectorBack,
  open,
  PANE,
  showAllProperties,
  showBind,
  showProp,
  teardown,
  TOOLBAR,
  type,
} from './editing-harness.js';
import { createEditor } from './kerf-catalog.js';

describe('editing the selected node', () => {
  it('sets and clears an enum prop from its Select', () => {
    const { root, node } = open();
    const tone = field(root, '[data-editor-prop="tone"]');
    expect(tone.dataset.editorKind).toBe('select');
    choose(tone, 'danger');
    expect(node()?.props?.tone).toBe('danger');
    choose(field(root, '[data-editor-prop="tone"]'), '');
    expect(node()?.props).not.toHaveProperty('tone');
  });

  it('toggles a boolean prop from its Switch and edits text-accepting content', () => {
    const { root, node } = open();
    const disabled = field(root, '[data-editor-prop="disabled"]');
    const input = disabled.querySelector<HTMLInputElement>('input')!;
    input.checked = true;
    input.dispatchEvent(new Event('change', { bubbles: true }));
    expect(node()?.props?.disabled).toBe(true);
    type(field(root, '[data-editor-prop="children"]'), 'Write');
    expect(node()?.props?.children).toBe('Write');
    expect(root.querySelector('[data-editor-canvas]')!.textContent).toContain(
      'Write',
    );
  });

  // KF-8FCJ02: a prop the overlay marks textarea edits line breaks.
  it('edits a textarea prop in a multi-line field that keeps line breaks', () => {
    const PREVIEW = '01JB8Z1M6Q8E1X9V4S7K2R3TV1';
    const EMPTY = '01JB8Z1M6Q8E1X9V4S7K2R3TV2';
    const root = document.createElement('div');
    document.body.append(root);
    const editor = createEditor({
      document: {
        schema: 'kerf-ui-document/v1',
        name: 'Previews',
        catalogs: ['@kerfjs/ui'],
        root: {
          id: '01JB8Z1M6Q8E1X9V4S7K2R3TV0',
          type: '@kerfjs/ui:pane',
          zones: {
            content: [
              {
                id: PREVIEW,
                type: '@kerfjs/ui:value-preview',
                props: { label: 'Version', value: 'One line' },
              },
              {
                id: EMPTY,
                type: '@kerfjs/ui:empty-state',
                props: { title: 'Nothing yet' },
              },
            ],
          },
        },
      },
    });
    attach(root, editor);
    const props = (id: string) =>
      findNode(editor.document.value, id)?.node.props;
    editor.selection.value = { kind: 'node', id: PREVIEW };
    const value = field(root, '[data-editor-prop="value"]');
    expect(value.querySelector('textarea')).not.toBeNull();
    type(value, 'First line\nSecond line');
    expect(props(PREVIEW)?.value).toBe('First line\nSecond line');
    // Undo also discards a live textarea draft that was never committed.
    value.querySelector('textarea')!.value = 'Uncommitted draft';
    click(root, 'editor-undo');
    expect(
      field(root, '[data-editor-prop="value"]').querySelector('textarea')!
        .value,
    ).toBe('One line');
    click(root, 'editor-redo');
    // An optional one keeps its Not set toggle, at the field's top end.
    editor.selection.value = { kind: 'node', id: EMPTY };
    const detail = field(root, '[data-editor-prop="detail"]');
    expect(detail.querySelector('textarea')).not.toBeNull();
    expect(
      detail.querySelector('.kui-text-field__toggle[aria-pressed="true"]'),
    ).not.toBeNull();
    type(detail, 'Add a project\nto begin.');
    expect(props(EMPTY)?.detail).toBe('Add a project\nto begin.');
  });

  it('leaves an unchanged value alone, without a history entry', () => {
    const { root, editor } = open();
    const before = editor.document.value;
    type(field(root, '[data-editor-prop="children"]'), 'Compose');
    expect(editor.document.value).toBe(before);
    expect(
      field(root, `[data-action="editor-undo"]`).hasAttribute('disabled'),
    ).toBe(true);
  });

  it('renames a node and shows why an invalid name is refused', () => {
    const { root, node } = open();
    type(field(root, '[data-editor-name]'), 'Send Button');
    expect(node()?.name).toBe('composeButton');
    expect(field(root, '[data-editor-name]').textContent).toContain(
      'camelCase',
    );
    type(field(root, '[data-editor-name]'), 'sendButton');
    expect(node()?.name).toBe('sendButton');
    expect(field(root, '[data-editor-name]').textContent).not.toContain(
      'camelCase',
    );
  });

  it('promotes a prop to a document param', () => {
    const { root, editor, node } = open();
    // KF-FN28S3: Promote sits on the field's own Bind page.
    showBind(root, 'tone');
    click(root, 'editor-promote-prop');
    expect(node()?.props?.tone).toEqual({ $param: 'composeButtonTone' });
    expect(editor.document.value.params?.composeButtonTone).toMatchObject({
      default: 'brand',
    });
    // A prop that is already a param offers no Promote; its page stays open
    // and shows the param it reads.
    const page = root.querySelector('[data-editor-bind-page="tone"]')!;
    expect(
      page.querySelector('[data-action="editor-promote-prop"]'),
    ).toBeNull();
    expect(page.textContent).toContain('composeButtonTone');
    inspectorBack(root);
    inspectorBack(root);
    showBind(root, 'children');
    click(root, 'editor-promote-prop');
    expect(editor.document.value.params?.composeButtonChildren).toMatchObject({
      default: 'Compose',
    });
  });
});

describe('replacing the root (KF-KWQVDJ)', () => {
  it('starts the document from a NavStack, selects it, and undoes back', () => {
    const { root, editor } = open(PANE);
    const original = editor.document.value;
    choose(
      field(root, '[data-editor-root="component"]'),
      '@kerfjs/ui:nav-stack',
    );
    click(root, 'editor-replace-root');
    const next = editor.document.value.root!;
    expect(next.type).toBe('@kerfjs/ui:nav-stack');
    expect(next.id).not.toBe(PANE);
    expect(editor.selection.value).toEqual({ kind: 'node', id: next.id });
    expect(root.textContent).toContain('1 node · valid');
    expect(root.querySelector('[data-editor-canvas]')!.textContent).toContain(
      'view3Content slot',
    );
    // The document keeps its name and params.
    expect(editor.document.value.name).toBe(original.name);
    expect(editor.document.value.params).toEqual(original.params);
    click(root, 'editor-undo');
    expect(editor.document.value).toBe(original);
  });

  // KF-Z70DBC: a Pane that becomes the root starts filled, as New's does.
  it('starts a replaced root Pane with fill on, and a NavStack without it', () => {
    const { root, editor } = open(PANE);
    const picker = () => field(root, '[data-editor-root="component"]');
    choose(picker(), '@kerfjs/ui:nav-stack');
    click(root, 'editor-replace-root');
    expect(editor.document.value.root!.props?.fill).toBeUndefined();
    choose(picker(), '@kerfjs/ui:pane');
    click(root, 'editor-replace-root');
    expect(editor.document.value.root).toMatchObject({
      type: '@kerfjs/ui:pane',
      props: { fill: true },
    });
  });

  it('is offered only for the root', () => {
    const { root } = open(TOOLBAR);
    expect(root.querySelector('[data-editor-root]')).toBeNull();
  });
});

describe('undo and redo', () => {
  it('undoes and redoes from the toolbar and the keyboard', () => {
    const { root, editor, node } = open();
    const original = editor.document.value;
    choose(field(root, '[data-editor-prop="tone"]'), 'danger');
    click(root, 'editor-undo');
    expect(editor.document.value).toBe(original);
    click(root, 'editor-redo');
    expect(node()?.props?.tone).toBe('danger');

    const key = (
      init: KeyboardEventInit,
      target: EventTarget = document.body,
    ) =>
      target.dispatchEvent(
        new KeyboardEvent('keydown', {
          bubbles: true,
          cancelable: true,
          ...init,
        }),
      );
    key({ key: 'z', metaKey: true });
    expect(editor.document.value).toBe(original);
    key({ key: 'Z', ctrlKey: true, shiftKey: true });
    expect(node()?.props?.tone).toBe('danger');
    // Typing keys and the text fields' own undo are left alone.
    key({ key: 'z' });
    key(
      { key: 'z', metaKey: true },
      field(root, '[data-editor-name]').querySelector('input')!,
    );
    expect(node()?.props?.tone).toBe('danger');
  });
});

describe('the Inspector scroll position', () => {
  const frame = () => new Promise((done) => window.requestAnimationFrame(done));
  // happy-dom has no layout and clamps scrollTop to 0; give these elements
  // a plain scroll position so the reset is observable.
  const scrollable = (element: HTMLElement) =>
    Object.defineProperty(element, 'scrollTop', { value: 0, writable: true });

  it('returns to the top for a new selection and stays put for an edit', async () => {
    const { root, editor } = open();
    const rail = root.querySelector<HTMLElement>(
      '[data-workbench-rail="right"]',
    )!;
    const inner = rail.querySelector<HTMLElement>(
      '[data-workbench-panel-content]',
    )!;
    scrollable(rail);
    scrollable(inner);
    await frame(); // the reset for opening on this selection
    inner.scrollTop = 120;
    choose(field(root, '[data-editor-prop="tone"]'), 'danger');
    await frame();
    expect(inner.scrollTop).toBe(120);

    editor.selection.value = { kind: 'node', id: TOOLBAR };
    await frame();
    expect(inner.scrollTop).toBe(0);

    rail.scrollTop = 40;
    editor.selection.value = { kind: 'component', key: '@kerfjs/ui:button' };
    await frame();
    expect(rail.scrollTop).toBe(0);
    editor.selection.value = null;
    await frame();
  });
});

describe('the outline tree', () => {
  it('starts open, closes a node, and reopens its ancestors for a canvas selection', () => {
    const { root, editor } = open(PANE);
    const row = (id: string) =>
      root.querySelector<HTMLElement>(
        `[role="treeitem"][data-item-id="${id}"]`,
      );
    expect(row(COMPOSE)?.getAttribute('aria-level')).toBe('3');
    expect(row(TOOLBAR)?.getAttribute('aria-expanded')).toBe('true');
    row(TOOLBAR)!
      .querySelector<HTMLElement>('.kui-list-item__disclosure')!
      .click();
    expect(row(TOOLBAR)?.getAttribute('aria-expanded')).toBe('false');
    expect(row(COMPOSE)).toBeNull();
    // Choosing the hidden node on the canvas reopens its parent.
    root
      .querySelector<HTMLElement>(
        `[data-editor-canvas] [data-kerf-node="${COMPOSE}"]`,
      )!
      .click();
    expect(editor.selection.value).toEqual({ kind: 'node', id: COMPOSE });
    expect(row(COMPOSE)?.getAttribute('aria-selected')).toBe('true');
    // Reopening what is already open changes nothing.
    row(FOLDERS)!.click();
    expect(row(FOLDERS)?.getAttribute('aria-selected')).toBe('true');
  });
});

// KF-QCBJ4F: a node's problems appear above its controls; unkeyed, the morph
// turned one prop's input into another's (in WebKit the next clear then
// fired no change event).
describe('Inspector control identity', () => {
  // KF-3Y2GS2: Not set is a toggle; an emptied field is the empty string.
  it('unsets an optional text prop from its toggle, and empties to ""', () => {
    const toggle = (root: HTMLElement, name: string) =>
      root.querySelector<HTMLButtonElement>(
        `[data-editor-prop="${name}"] .kui-text-field__toggle`,
      );
    // A required prop (a Text's children) has no toggle; emptied, it is "".
    const text = open('01JB8Z1M6Q8E1X9V4S7K2R3T5G');
    showProp(text.root, 'children');
    expect(toggle(text.root, 'children')).toBeNull();
    type(field(text.root, '[data-editor-prop="children"]'), '');
    expect(text.node()!.props?.children).toBe('');
    teardown();
    // An optional one (a Button's title) starts Not set (pressed).
    const { root, node } = open();
    expect(node()!.props?.title).toBeUndefined();
    showProp(root, 'title');
    expect(toggle(root, 'title')!.getAttribute('aria-pressed')).toBe('true');
    const input = () =>
      field(root, '[data-editor-prop="title"]').querySelector('input')!;
    // Unset reads Not set; the empty string reads blank.
    expect(input().placeholder).toBe('Not set');
    type(field(root, '[data-editor-prop="title"]'), 'Send now');
    expect(node()!.props?.title).toBe('Send now');
    expect(toggle(root, 'title')!.getAttribute('aria-pressed')).toBe('false');
    // Emptied, it holds "", still set.
    type(field(root, '[data-editor-prop="title"]'), '');
    expect(node()!.props?.title).toBe('');
    expect(toggle(root, 'title')!.getAttribute('aria-pressed')).toBe('false');
    expect(input().placeholder).toBe('');
    // The toggle unsets it, and un-pressed sets it back to "".
    toggle(root, 'title')!.click();
    expect(node()!.props && 'title' in node()!.props!).toBe(false);
    expect(toggle(root, 'title')!.getAttribute('aria-pressed')).toBe('true');
    toggle(root, 'title')!.click();
    expect(node()!.props?.title).toBe('');
  });

  it('keeps each control’s input when a problem appears above them', () => {
    const { root, editor } = open();
    // Every control shows on the All properties page (KF-QWDPM3).
    showAllProperties(root);
    const inputs = () =>
      new Map(
        [
          ...root.querySelectorAll<HTMLElement>(
            '[data-editor-prop], [data-editor-name]',
          ),
        ].map((control) => [
          control.dataset.editorProp ?? 'ref name',
          [control, control.querySelector('input, textarea')] as const,
        ]),
      );
    const before = inputs();
    expect(before.has('children')).toBe(true);
    expect(root.querySelector('[data-editor-node-problem]')).toBeNull();
    // The required label goes missing (KF-3Y2GS2: an emptied field is "",
    // so the problem comes from the document rather than the field).
    const missing = JSON.parse(
      JSON.stringify(editor.document.value),
    ) as typeof editor.document.value;
    delete (findNode(missing, COMPOSE)!.node.props as Record<string, unknown>)
      .children;
    editor.document.value = missing;
    expect(root.querySelector('[data-editor-node-problem]')).not.toBeNull();
    const after = inputs();
    let compared = 0;
    for (const [key, [control, input]] of before) {
      const now = after.get(key);
      if (!now) continue;
      compared += 1;
      expect(now[0], key).toBe(control);
      expect(now[1], key).toBe(input);
    }
    expect(compared).toBeGreaterThan(3);
  });
});

// KF-1HEZZZ: a param-bound prop names its param, and renaming it there
// renames the param and every use of it.
describe('renaming a param', () => {
  const TITLE_TEXT = '01JB8Z1M6Q8E1X9V4S7K2R3T5C';

  it('renames from the bound prop and refuses a taken or invalid name', () => {
    const { root, editor, node } = open(TITLE_TEXT);
    showProp(root, 'text');
    const param = () => field(root, '[data-editor-param]');
    expect(param().dataset.editorParam).toBe('title');
    type(param(), 'heading');
    expect(node()?.props?.text).toEqual({ $param: 'heading' });
    expect(editor.document.value.params).toHaveProperty('heading');
    expect(editor.document.value.params).not.toHaveProperty('title');
    expect(param().dataset.editorParam).toBe('heading');
    type(param(), 'showEmpty');
    expect(node()?.props?.text).toEqual({ $param: 'heading' });
    expect(param().textContent).toContain(
      'There is already a param named showEmpty.',
    );
    click(root, 'editor-undo');
    expect(node()?.props?.text).toEqual({ $param: 'title' });
  });
});

// KF-YBMVVM: a zone that takes text takes text runs beside its nodes, and a
// run's text is edited in its own Inspector.
describe('text runs', () => {
  it('adds a run after the zone’s text and edits it, undoably', () => {
    const { root, node } = open(COMPOSE);
    choose(field(root, '[data-editor-add="zone"]'), 'children');
    const component = field(root, '[data-editor-add="component"]');
    expect(
      [...component.querySelectorAll('[role="option"]')].some(
        (option) => option.textContent === 'Text run',
      ),
    ).toBe(true);
    choose(component, '#text');
    click(root, 'editor-add-child');
    // The zone's text became a run, and the new run follows it.
    const runs = () =>
      (node()?.zones?.children ?? []) as readonly {
        type: string;
        value?: string;
      }[];
    expect(runs().map((run) => [run.type, run.value])).toEqual([
      ['#text', 'Compose'],
      ['#text', 'Text'],
    ]);
    const text = field(root, '[data-editor-text-run]');
    type(text, ' now');
    expect(runs()[1]!.value).toBe(' now');
    click(root, 'editor-undo');
    expect(runs()[1]!.value).toBe('Text');
  });

  it('offers no text run where a zone takes only nodes', () => {
    const { root } = open(TOOLBAR);
    const component = field(root, '[data-editor-add="component"]');
    expect(
      [...component.querySelectorAll('[role="option"]')].some(
        (option) => option.textContent === 'Text run',
      ),
    ).toBe(false);
  });
});
