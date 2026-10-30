// KF-Z9S029: an object prop edits in a form built from its type's fields,
// pushed in the Inspector for a single step of at most 10 fields and in a
// dialog for more, with Edit as JSON, Reset, and Fill with example.
import type { ViewType, ViewValue } from '@kerfjs/ui/view';
import { mount } from 'kerfjs';
import { afterEach, describe, expect, it } from 'vitest';

import propsJson from '../../../ai/component-props.json';
import {
  controlFor,
  cssGrammar,
  cssHint,
  cssPlaceholder,
  valueFromControl,
} from '../../../src/editor/model/controls.js';
import { findNode } from '../../../src/editor/model/document.js';
import {
  containerFor,
  enumSetValues,
  fieldEditorKind,
  fieldSummary,
  memberFor,
  objectFields,
  propLabel,
  stepTitle,
  SUBVIEW_FIELDS,
  typeAt,
  unionMembers,
  valueAt,
  withValueAt,
} from '../../../src/editor/model/fields.js';
import { createEditor } from './kerf-catalog.js';

const definitions = propsJson.definitions as unknown as Record<
  string,
  ViewType
>;
const ref = (name: string) => ({ kind: 'ref', ref: name }) as ViewType;
const list = (items: ViewType) => ({ kind: 'array', items }) as ViewType;

describe('field editor model', () => {
  it('picks an editor for each structured shape', () => {
    expect(fieldEditorKind(ref('ListConfig'), definitions)).toBe('object');
    expect(fieldEditorKind(list(ref('SelectChoice')), definitions)).toBe(
      'object-list',
    );
    expect(fieldEditorKind(list(ref('PopupMenuEntry')), definitions)).toBe(
      'union-list',
    );
    expect(fieldEditorKind(list({ kind: 'string' } as ViewType), {})).toBe(
      'tags',
    );
    expect(
      fieldEditorKind(list({ kind: 'enum', values: ['a', 'b'] } as never), {}),
    ).toBe('enum-set');
    expect(
      fieldEditorKind(list({ kind: 'enum', values: [1, 2] } as never), {}),
    ).toBe('json');
    expect(
      fieldEditorKind(list({ kind: 'array' } as never), {}, 'lucide'),
    ).toBe('icon');
    // An object with no fields, a list of those, a union with a member no
    // form edits, and a scalar all stay JSON.
    expect(fieldEditorKind({ kind: 'object' } as ViewType, {})).toBe('json');
    expect(fieldEditorKind(list({ kind: 'object' } as ViewType), {})).toBe(
      'json',
    );
    expect(
      fieldEditorKind(
        list({ kind: 'union', members: [{ kind: 'number' }] } as never),
        {},
      ),
    ).toBe('json');
    expect(fieldEditorKind(list({ kind: 'number' } as ViewType), {})).toBe(
      'json',
    );
    expect(fieldEditorKind({ kind: 'string' } as ViewType, {})).toBe('json');
  });

  it('lists the union members a list editor can add', () => {
    expect(unionMembers(ref('PopupMenuEntry'), definitions)).toHaveLength(3);
    expect(unionMembers(ref('ListConfig'), definitions)).toEqual([]);
  });

  it('shapes an object type’s fields like Inspector props', () => {
    const fields = objectFields(ref('SurfaceTint'), definitions);
    expect(fields.map((field) => field.name)).toEqual([
      'color',
      'scheme',
      'accent',
    ]);
    expect(fields[0]!.required).toBe(true);
    expect(fields[2]!.required).toBe(false);
    expect(
      objectFields(ref('SelectChoice'), definitions).find(
        (field) => field.name === 'icon',
      )?.iconSource,
    ).toBe('lucide');
    expect(objectFields({ kind: 'string' } as ViewType, {})).toEqual([]);
  });

  it('opens at most 10 fields in the Inspector and the rest in a dialog', () => {
    expect(objectFields(ref('ListConfig'), definitions).length).toBeLessThan(
      SUBVIEW_FIELDS + 1,
    );
    expect(containerFor(ref('ListConfig'), definitions)).toBe('subview');
    expect(objectFields(ref('PaneConfig'), definitions).length).toBeGreaterThan(
      SUBVIEW_FIELDS,
    );
    expect(containerFor(ref('PaneConfig'), definitions)).toBe('dialog');
    // A sub-selection or a picker is a dialog; an explicit choice wins.
    expect(containerFor(list(ref('SelectChoice')), definitions)).toBe('dialog');
    expect(containerFor(list(ref('PopupMenuEntry')), definitions)).toBe(
      'dialog',
    );
    expect(containerFor(undefined, {}, 'lucide')).toBe('dialog');
    expect(containerFor(list({ kind: 'string' } as ViewType), {})).toBe(
      'subview',
    );
    expect(
      containerFor(ref('PaneConfig'), definitions, undefined, 'subview'),
    ).toBe('subview');
  });

  it('follows fields, items, and union members to the type at a path', () => {
    const tint = typeAt(ref('PaneConfig'), definitions, ['tint']);
    expect(tint).toMatchObject({ ref: 'SurfaceTint' });
    expect(typeAt(ref('PaneConfig'), definitions, ['nope'])).toBeUndefined();
    expect(typeAt({ kind: 'string' } as ViewType, {}, [0])).toBeUndefined();
    const items: ViewValue = [{ kind: 'divider' }, { label: 'Open' }];
    expect(
      typeAt(list(ref('PopupMenuEntry')), definitions, [0], items),
    ).toMatchObject({ ref: 'PopupMenuDivider' });
    expect(
      typeAt(list(ref('PopupMenuEntry')), definitions, [1, 'label'], items),
    ).toMatchObject({ kind: 'string' });
    // With no value, an item is the union's first object member.
    expect(typeAt(list(ref('PopupMenuEntry')), definitions, [0])).toMatchObject(
      { ref: 'PopupMenuItem' },
    );
  });

  it('titles a step after its field, or numbers a list item', () => {
    expect(stepTitle({ prop: 'mainPane', path: [] })).toBe('Main pane');
    expect(stepTitle({ prop: 'mainPane', path: ['tint'] })).toBe('Tint');
    expect(stepTitle({ prop: 'items', path: [1] })).toBe('Item 2');
  });

  it('labels a prop in sentence case (KF-7M4XQR)', () => {
    expect(propLabel('controlInsets')).toBe('Control insets');
    expect(propLabel('hAlign')).toBe('Horizontal align');
    expect(propLabel('vAlign')).toBe('Vertical align');
    expect(propLabel('ariaLabel')).toBe('ARIA label');
    expect(propLabel('id')).toBe('ID');
    expect(propLabel('wrap')).toBe('Wrap');
    expect(propLabel('rootAttributes')).toBe('Root attributes');
    expect(propLabel('maxHTMLLength')).toBe('Max HTML length');
    expect(propLabel('size2x')).toBe('Size 2x');
  });

  it('picks a union member from a value', () => {
    const entry = ref('PopupMenuEntry');
    expect(memberFor(entry, definitions, { kind: 'heading' })).toMatchObject({
      ref: 'PopupMenuHeading',
    });
    expect(memberFor(entry, definitions, undefined)).toMatchObject({
      ref: 'PopupMenuItem',
    });
    const suggestion = { kind: 'ref', ref: 'ComboboxSuggestion' } as ViewType;
    const union = {
      kind: 'union',
      members: [{ kind: 'string' }, suggestion],
    } as ViewType;
    expect(memberFor(union, definitions, 'Text')).toMatchObject({
      kind: 'string',
    });
    // A value no member's discriminant fits falls back to the first object.
    expect(memberFor(entry, definitions, { kind: 'other' })).toMatchObject({
      ref: 'PopupMenuItem',
    });
    expect(memberFor({ kind: 'string' } as ViewType, {}, 'a')).toEqual({
      kind: 'string',
    });
  });

  it('reads and writes at a path without changing the original', () => {
    const value = { gap: 'm', tint: { color: { $css: 'px(1)' } } };
    expect(valueAt(value, ['tint', 'color'])).toEqual({ $css: 'px(1)' });
    expect(valueAt(value, ['gap', 'nope'])).toBeUndefined();
    expect(valueAt(['a', 'b'], [1])).toBe('b');
    expect(valueAt('a', [0])).toBeUndefined();
    const next = withValueAt(value, ['tint', 'scheme'], 'dark');
    expect(next).toEqual({
      gap: 'm',
      tint: { color: { $css: 'px(1)' }, scheme: 'dark' },
    });
    expect(value.tint).not.toHaveProperty('scheme');
    // Missing objects on the way are made; clearing the last field unsets.
    expect(withValueAt(undefined, ['tint', 'scheme'], 'dark')).toEqual({
      tint: { scheme: 'dark' },
    });
    expect(withValueAt({ gap: 'm' }, ['gap'], undefined)).toBeUndefined();
    // A list item is replaced or removed; clearing its last field keeps it.
    expect(withValueAt(['a', 'b'], [1], 'c')).toEqual(['a', 'c']);
    expect(withValueAt(['a', 'b'], [0], undefined)).toEqual(['b']);
    expect(withValueAt([{ label: 'A' }], [0, 'label'], undefined)).toEqual([
      {},
    ]);
    expect(withValueAt(undefined, [0], 'a')).toEqual(['a']);
    expect(withValueAt({ a: 1 }, [], 2)).toBe(2);
  });

  it('summarizes a value for its row', () => {
    expect(fieldSummary(undefined)).toBe('Not set');
    expect(fieldSummary({ gap: 'm' })).toBe('1 field set');
    expect(fieldSummary({ gap: 'm', hAlign: 'c' })).toBe('2 fields set');
    expect(fieldSummary(['a'])).toBe('1 item');
    expect(fieldSummary(['a', 'b'])).toBe('2 items');
    expect(fieldSummary('a')).toBe('Set');
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

function type(host: HTMLElement, value: string) {
  const input = host.querySelector<HTMLInputElement>('input, textarea')!;
  input.value = value;
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

const click = (root: HTMLElement, action: string) =>
  field(root, `[data-action="${action}"]`).click();

/** The Configure row that opens `prop` (or a field at `path` inside it). */
const opener = (root: HTMLElement, prop: string, path: unknown[] = []) =>
  field(
    root,
    `[data-editor-open='${JSON.stringify({ prop, path })}'] [data-action]`,
  ) ?? field(root, `[data-editor-open='${JSON.stringify({ prop, path })}']`);

/** A control inside an open field editor, by its place. */
const at = (root: HTMLElement, prop: string, path: unknown[]) =>
  field(root, `[data-editor-field='${JSON.stringify({ prop, path })}']`);

/** An editor whose document is a Workbench, selected. */
function workbench() {
  const root = document.createElement('div');
  document.body.append(root);
  const editor = createEditor();
  mount(root, editor.render);
  cleanup = editor.wire(root);
  editor.selection.value = {
    kind: 'node',
    id: editor.document.value.root.id,
  };
  choose(field(root, '[data-editor-root="component"]'), '@kerfjs/ui:workbench');
  click(root, 'editor-replace-root');
  const id = editor.document.value.root.id;
  const props = () => findNode(editor.document.value, id)!.node.props ?? {};
  return { root, editor, props };
}

/** The views the Inspector's NavStack shows, root first. */
const views = (root: HTMLElement) =>
  [
    ...root.querySelectorAll<HTMLElement>(
      '#editor-inspector-stack [data-nav-key]',
    ),
  ].map((view) => view.dataset.navKey);

describe('object forms in the Inspector (KF-Z9S029)', () => {
  it('shows an object prop as a Configure row instead of JSON', () => {
    const { root } = workbench();
    const row = field(
      root,
      `[data-editor-open='{"prop":"mainFooterList","path":[]}']`,
    );
    expect(row.textContent).toContain('Main footer list');
    expect(row.textContent).toContain('Not set');
    expect(
      root.querySelector('[data-editor-prop="mainFooterList"]'),
    ).toBeNull();
  });

  it('pushes a small object’s form, edits it live, and pops with Back', () => {
    const { root, props } = workbench();
    opener(root, 'mainFooterList').click();
    expect(views(root)).toEqual(['inspector', 'field-mainFooterList']);
    choose(at(root, 'mainFooterList', ['hAlign']), 'center');
    expect(props().mainFooterList).toEqual({ hAlign: 'center' });
    // The form stays open on the edited value, and its row says so.
    expect(views(root)).toContain('field-mainFooterList');
    expect(
      (
        at(root, 'mainFooterList', ['hAlign']) as HTMLElement & {
          value?: string;
        }
      ).getAttribute('value'),
    ).toBe('center');
    field(root, '#editor-inspector-stack [data-nav-back]').click();
    expect(views(root)).toEqual(['inspector']);
    expect(
      field(root, `[data-editor-open='{"prop":"mainFooterList","path":[]}']`)
        .textContent,
    ).toContain('1 field set');
  });

  it('opens an object of more than 10 fields in a dialog, nested steps inside it', () => {
    const { root, props } = workbench();
    opener(root, 'mainPane').click();
    const dialog = field(root, '#editor-field-dialog') as HTMLDialogElement;
    expect(dialog.open).toBe(true);
    expect(views(root)).toEqual(['inspector']);
    expect(dialog.textContent).toContain('Chrome dividers');
    choose(at(root, 'mainPane', ['chromeDividers']), 'always');
    expect(props().mainPane).toEqual({ chromeDividers: 'always' });
    // A nested object steps forward inside the dialog, and Back returns.
    opener(root, 'mainPane', ['tint']).click();
    expect(dialog.textContent).toContain('Scheme');
    choose(at(root, 'mainPane', ['tint', 'scheme']), 'dark');
    expect(props().mainPane).toEqual({
      chromeDividers: 'always',
      tint: { scheme: 'dark' },
    });
    click(root, 'editor-field-back');
    expect(dialog.textContent).toContain('Chrome dividers');
    expect(root.querySelector('[data-action="editor-field-back"]')).toBeNull();
    click(root, 'editor-field-done');
    expect(dialog.open).toBe(false);
  });

  it('closes the editor when its node is no longer selected', () => {
    const { root, editor } = workbench();
    opener(root, 'mainFooterList').click();
    expect(views(root)).toHaveLength(2);
    editor.selection.value = null;
    expect(views(root)).toEqual(['inspector']);
  });

  it('edits a step as JSON, rejects what does not fit, and resets', () => {
    const { root, props } = workbench();
    opener(root, 'mainFooterList').click();
    click(root, 'editor-field-json');
    const json = at(root, 'mainFooterList', []);
    expect(json.dataset.editorKind).toBe('list');
    type(json, '{"hAlign": "nowhere"}');
    expect(at(root, 'mainFooterList', []).textContent).toContain('Not a');
    expect(props().mainFooterList).toBeUndefined();
    type(at(root, 'mainFooterList', []), '{"hAlign": "center"}');
    expect(props().mainFooterList).toEqual({ hAlign: 'center' });
    // The same value again records nothing.
    type(at(root, 'mainFooterList', []), '{"hAlign":"center"}');
    expect(props().mainFooterList).toEqual({ hAlign: 'center' });
    click(root, 'editor-field-json');
    expect(at(root, 'mainFooterList', ['hAlign'])).not.toBeNull();
    click(root, 'editor-reset-field');
    expect(props().mainFooterList).toBeUndefined();
  });

  it('fills a step with its example and sets a Custom size inside a form', () => {
    const { root, props } = workbench();
    opener(root, 'mainToolbar').click();
    click(root, 'editor-fill-field-example');
    expect(props().mainToolbar).toEqual({ label: 'Main toolbar' });
    click(root, 'editor-field-done');
    opener(root, 'mainFooterList').click();
    choose(at(root, 'mainFooterList', ['gap']), 'custom');
    // Custom shows the builder field for the nested gap.
    const builder = at(root, 'mainFooterList', ['gap']);
    expect(
      root.querySelectorAll(
        `[data-editor-field='{"prop":"mainFooterList","path":["gap"]}']`,
      ),
    ).toHaveLength(2);
    expect(builder).not.toBeNull();
    const custom = [
      ...root.querySelectorAll<HTMLElement>(
        `[data-editor-field='{"prop":"mainFooterList","path":["gap"]}']`,
      ),
    ].find((element) => element.dataset.editorKind === 'css')!;
    type(custom, 'px(4)');
    expect(props().mainFooterList).toEqual({ gap: { $css: 'px(4)' } });
    // A keyword hides the builder field again.
    choose(at(root, 'mainFooterList', ['gap']), 'm');
    expect(props().mainFooterList).toEqual({ gap: 'm' });
    expect(
      root.querySelectorAll(
        `[data-editor-field='{"prop":"mainFooterList","path":["gap"]}']`,
      ),
    ).toHaveLength(1);
  });

  it('clears a field’s error when it is set back to the value it holds', () => {
    const { root, props } = workbench();
    opener(root, 'mainFooterList').click();
    click(root, 'editor-field-json');
    type(at(root, 'mainFooterList', []), 'not json');
    expect(at(root, 'mainFooterList', []).textContent).toContain('Enter JSON');
    type(at(root, 'mainFooterList', []), '');
    expect(props().mainFooterList).toBeUndefined();
    expect(at(root, 'mainFooterList', []).textContent).not.toContain(
      'Enter JSON',
    );
  });

  it('lists fields the form cannot edit with their values', () => {
    const { root } = workbench();
    choose(
      field(root, '[data-editor-root="component"]'),
      '@kerfjs/ui:list-detail-dialog',
    );
    click(root, 'editor-replace-root');
    opener(root, 'detail').click();
    click(root, 'editor-fill-field-example');
    const form = field(root, '#editor-inspector-stack');
    // `content` is a slot, shown as its value; `actions`, unset, as its type.
    expect(form.textContent).toMatch(/Content\{"\$slot":"[^"]+"\}/);
    expect(form.textContent).toContain('actions');
  });
});

describe('inline list editors (KF-A9ZHGW)', () => {
  /** An editor with the inbox Pane selected. */
  function pane() {
    const root = document.createElement('div');
    document.body.append(root);
    const editor = createEditor();
    mount(root, editor.render);
    cleanup = editor.wire(root);
    const id = '01JB8Z1M6Q8E1X9V4S7K2R3T5A';
    editor.selection.value = { kind: 'node', id };
    const props = () => findNode(editor.document.value, id)!.node.props ?? {};
    return { root, editor, props };
  }

  /** Types into a TagField's editor and presses Enter to add the tag. */
  function addTag(host: HTMLElement, text: string) {
    const editor = host.querySelector<HTMLElement>('[data-tag-field-editor]')!;
    const span =
      editor.querySelector<HTMLElement>(
        '[data-search-field-text]:last-of-type',
      ) ?? editor;
    span.textContent = text;
    editor.dispatchEvent(
      new InputEvent('input', { bubbles: true, inputType: 'insertText' }),
    );
    editor.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Enter',
        bubbles: true,
        cancelable: true,
      }),
    );
  }

  /** Checks or unchecks a CheckboxGroup's choice, as a click does. */
  function check(group: HTMLElement, value: string, checked = true) {
    const input = group.querySelector<HTMLInputElement>(
      `input[value="${value}"]`,
    )!;
    input.checked = checked;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  it('picks the inline control from the type and the value', () => {
    const tags = {
      name: 'tags',
      type: { kind: 'array', items: { kind: 'string' } },
      required: false,
    } as const;
    expect(controlFor(tags, undefined)).toEqual({ kind: 'tags', raw: '[]' });
    expect(controlFor(tags, ['a'])).toEqual({ kind: 'tags', raw: '["a"]' });
    // A list holding anything but strings stays JSON.
    expect(controlFor(tags, [1] as never).kind).toBe('list');
    const sides = {
      name: 'sides',
      type: { kind: 'array', items: { kind: 'enum', values: ['t', 'b'] } },
      required: false,
    } as const;
    expect(controlFor(sides, ['b'])).toEqual({
      kind: 'enum-set',
      choices: ['t', 'b'],
      raw: '["b"]',
    });
    // A value outside the set stays JSON, as does a binding.
    expect(controlFor(sides, ['x']).kind).toBe('list');
    expect(controlFor(sides, { $param: 'sides' } as never).kind).toBe(
      'readonly',
    );
    expect(enumSetValues(sides.type as never, {})).toEqual(['t', 'b']);
    expect(enumSetValues({ kind: 'string' } as never, {})).toEqual([]);
  });

  it('round-trips the inline values, an empty list unsetting the prop', () => {
    expect(valueFromControl('tags', '["a","b"]')).toEqual({
      value: ['a', 'b'],
    });
    expect(valueFromControl('enum-set', '[]')).toEqual({ value: undefined });
  });

  it('edits a Pane’s separators in a CheckboxGroup', () => {
    const { root, props, editor } = pane();
    const group = field(root, '[data-editor-prop="separators"]');
    expect(group.dataset.editorKind).toBe('enum-set');
    check(group, 'block-end');
    expect(props().separators).toEqual(['block-end']);
    check(field(root, '[data-editor-prop="separators"]'), 'block-start');
    // Checked values keep the choices' order.
    expect(props().separators).toEqual(['block-start', 'block-end']);
    check(field(root, '[data-editor-prop="separators"]'), 'block-start', false);
    check(field(root, '[data-editor-prop="separators"]'), 'block-end', false);
    expect(props()).not.toHaveProperty('separators');
    click(root, 'editor-undo');
    expect(editor.document.value.root.props?.separators).toEqual(['block-end']);
  });

  it('edits a TagField’s tags inline', () => {
    const { root, editor } = pane();
    choose(field(root, '[data-editor-add="zone"]'), 'content');
    choose(
      field(root, '[data-editor-add="component"]'),
      '@kerfjs/ui:tag-field',
    );
    click(root, 'editor-add-child');
    const selected = editor.selection.value as { id: string };
    const props = () =>
      findNode(editor.document.value, selected.id)!.node.props ?? {};
    const host = field(root, '[data-editor-prop="tags"]');
    expect(host.dataset.editorKind).toBe('tags');
    // A new TagField is seeded with three placeholder tags.
    const seeded = props().tags as string[];
    addTag(host, 'urgent');
    expect(props().tags).toEqual([...seeded, 'urgent']);
    addTag(field(root, '[data-editor-prop="tags"]'), 'later');
    expect(props().tags).toEqual([...seeded, 'urgent', 'later']);
    // A native change from inside the TagField does not commit on its own.
    field(root, '[data-editor-prop="tags"]').dispatchEvent(
      new Event('change', { bubbles: true }),
    );
    expect(props().tags).toEqual([...seeded, 'urgent', 'later']);
  });

  it('edits a set of sides inside an object form', () => {
    const { root, props } = workbench();
    opener(root, 'mainPane').click();
    const group = at(root, 'mainPane', ['separators']);
    expect(group.dataset.editorKind).toBe('enum-set');
    check(group, 'inline-end');
    expect(props().mainPane).toEqual({ separators: ['inline-end'] });
  });
});

describe('css-value examples by grammar (KF-PE0PTT)', () => {
  it('suggests builders for the value’s grammar when the prop names none', () => {
    expect(cssPlaceholder(undefined, 'CssColor')).toBe(
      'uiColor("surface-raised")',
    );
    expect(cssHint(undefined, 'CssColor')).toContain('colorVar("--app-color")');
    expect(cssPlaceholder(undefined, 'CssFlex')).toBe('flex(1)');
    expect(cssHint(undefined, 'CssFlex')).toContain('flex(1)');
    // A length, or no grammar, keeps the length example.
    expect(cssPlaceholder(undefined, 'CssLength')).toBe('px(8)');
    expect(cssPlaceholder(undefined)).toBe('px(8)');
    expect(cssHint(undefined)).toContain('px(8)');
    // Builders the catalog names win.
    expect(cssPlaceholder(['flex'], 'CssFlex')).toBe('flex(1)');
    expect(cssPlaceholder(['px', 'space'], 'CssColor')).toBe('px(8)');
    expect(cssHint(['px'], 'CssColor')).toBe('Takes px().');
  });

  it('reads the grammar of a css-value, a union member, or neither', () => {
    expect(
      cssGrammar({ kind: 'css-value', grammar: 'CssColor' } as ViewType),
    ).toBe('CssColor');
    const gap = objectFields(ref('ListConfig'), definitions).find(
      (field) => field.name === 'gap',
    )!;
    expect(cssGrammar(gap.type as ViewType, definitions)).toBe('CssLength');
    expect(
      cssGrammar({ kind: 'union', members: [{ kind: 'string' }] } as ViewType),
    ).toBeUndefined();
    expect(cssGrammar({ kind: 'string' } as ViewType)).toBeUndefined();
  });

  it('suggests a color for a Pane background inside a Workbench form', () => {
    const { root } = workbench();
    opener(root, 'mainPane').click();
    const background = at(root, 'mainPane', ['background']);
    expect(background.querySelector('input')!.placeholder).toBe(
      'uiColor("surface-raised")',
    );
  });
});
