// KF-CY1D5W: a list of objects or union items edits item by item: one row
// per item opening its form, Remove, drag or keyboard reorder, and Add (an
// Add menu of members for a union list).
import type { ViewType } from '@kerfjs/ui/view';
import { mount } from 'kerfjs';
import { afterEach, describe, expect, it } from 'vitest';

import compositionJson from '../../../ai/component-composition.json';
import propsJson from '../../../ai/component-props.json';
import { findNode } from '../../../src/editor/model/document.js';
import {
  containerFor,
  listItemLabel,
  listMembers,
} from '../../../src/editor/model/fields.js';
import { loadScaledTimeout } from '../../helpers/load-scaled-timeout.js';
import {
  componentFunctions,
  createEditor,
  createEditorCatalog,
} from './kerf-catalog.js';

const definitions = propsJson.definitions as unknown as Record<
  string,
  ViewType
>;
const list = (ref: string) =>
  ({ kind: 'array', items: { kind: 'ref', ref } }) as ViewType;

describe('list editor model', () => {
  it('labels what a list adds', () => {
    const labels = (type: ViewType, name?: string) =>
      listMembers(type, definitions, name).map((member) => member.label);
    expect(labels(list('PopupMenuEntry'))).toEqual([
      'Item',
      'Heading',
      'Divider',
    ]);
    expect(labels(list('ComboboxSuggestion'), 'suggestions')).toEqual([
      'Text',
      'Suggestion',
    ]);
    expect(labels(list('TabNavigatorTab'))).toEqual([
      'Count badge',
      'Dot badge',
    ]);
    expect(labels(list('SelectChoice'), 'choices')).toEqual(['Choice']);
    expect(labels(list('SelectChoice'))).toEqual(['Item']);
    expect(listMembers({ kind: 'string' } as ViewType, {})).toEqual([]);
  });

  it('labels an item from its text, its kind, or its place', () => {
    expect(listItemLabel('Red', 0)).toBe('Red');
    expect(listItemLabel('', 0)).toBe('Item 1');
    expect(listItemLabel({ value: 'g', label: 'Green' }, 1)).toBe('Green');
    expect(listItemLabel({ key: 'inbox' }, 1)).toBe('inbox');
    expect(listItemLabel({ kind: 'divider' }, 2)).toBe('Divider');
    expect(listItemLabel({ label: '' }, 2)).toBe('Item 3');
    expect(listItemLabel(undefined, 0)).toBe('Item 1');
  });

  it('edits a list of small items in the Inspector and the rest in a dialog', () => {
    expect(containerFor(list('SliderTick'), definitions)).toBe('subview');
    expect(containerFor(list('SelectChoice'), definitions)).toBe('dialog');
    // Small items that hold a list of their own are a sub-selection.
    expect(containerFor(list('ColorPickerSamples'), definitions)).toBe(
      'dialog',
    );
  });
});

let cleanup: (() => void) | undefined;
afterEach(() => {
  cleanup?.();
  cleanup = undefined;
  document.body.replaceChildren();
});

const PANE = '01JB8Z1M6Q8E1X9V4S7K2R3T5A';

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

const place = (prop: string, path: unknown[]) => JSON.stringify({ prop, path });

/** An editor with a new `key` node added to the inbox Pane, selected. */
function added(key: string) {
  const root = document.createElement('div');
  document.body.append(root);
  const editor = createEditor();
  mount(root, editor.render);
  cleanup = editor.wire(root);
  editor.selection.value = { kind: 'node', id: PANE };
  choose(field(root, '[data-editor-add="zone"]'), 'content');
  choose(field(root, '[data-editor-add="component"]'), key);
  field(root, '[data-action="editor-add-child"]').click();
  const { id } = editor.selection.value as { id: string };
  const props = () => findNode(editor.document.value, id)!.node.props ?? {};
  return { root, editor, props };
}

/** The rows of the list editor for `prop`, by label. */
const rows = (root: HTMLElement, prop: string) =>
  [
    ...root.querySelectorAll<HTMLElement>(
      `[data-list-id='${place(prop, [])}'] [data-component="list-action-row"]`,
    ),
  ].map((row) => row.querySelector('[data-action]')!.textContent!.trim());

/** Opens a Configure row's or list row's form, as a click on it does. */
function open(root: HTMLElement, prop: string, path: unknown[] = []) {
  const row = field(root, `[data-editor-open='${place(prop, path)}']`);
  (row.querySelector<HTMLElement>('[data-action]') ?? row).click();
}

// Each step re-renders the whole editor and its dialog, which runs past
// vitest's default timeout when the suite runs in parallel.
describe(
  'the list editor (KF-CY1D5W)',
  { timeout: loadScaledTimeout(15_000) },
  () => {
    it('lists a Select’s choices in a dialog, adds, edits, and removes one', () => {
      const { root, props } = added('@kerfjs/ui:select');
      open(root, 'choices');
      const dialog = field(root, '#editor-field-dialog') as HTMLDialogElement;
      expect(dialog.open).toBe(true);
      expect(rows(root, 'choices')).toEqual([
        expect.stringContaining('Choice 1'),
        expect.stringContaining('Choice 2'),
        expect.stringContaining('Choice 3'),
      ]);
      field(root, '[data-action="editor-add-item"]').click();
      expect((props().choices as unknown[]).at(-1)).toEqual({
        value: 'choice-4',
        label: 'Choice 4',
      });
      // Choosing a row opens its form, titled after the item.
      open(root, 'choices', [1]);
      expect(
        dialog.querySelector('h2, [slot="label"]')?.textContent ??
          dialog.textContent,
      ).toContain('Choice 2');
      type(
        field(root, `[data-editor-field='${place('choices', [1, 'label'])}']`),
        'Second',
      );
      expect((props().choices as { label: string }[])[1]!.label).toBe('Second');
      field(root, '[data-action="editor-field-back"]').click();
      expect(rows(root, 'choices')[1]).toContain('Second');
      field(root, `[data-editor-item='${place('choices', [0])}']`).click();
      expect(
        (props().choices as { label: string }[]).map((c) => c.label),
      ).toEqual(['Second', 'Choice 3', 'Choice 4']);
    });

    it('reorders items with Alt+Shift+Arrow', () => {
      const { root, props } = added('@kerfjs/ui:select');
      open(root, 'choices');
      const first = field(
        root,
        `[data-list-id='${place('choices', [])}'] [data-item-id="item-0"]`,
      );
      first.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'ArrowDown',
          altKey: true,
          shiftKey: true,
          bubbles: true,
        }),
      );
      expect(
        (props().choices as { label: string }[]).map((c) => c.label),
      ).toEqual(['Choice 2', 'Choice 1', 'Choice 3']);
    });

    it('adds each kind of PopupMenu item from its Add menu', () => {
      const { root, props } = added('@kerfjs/ui:popup-menu');
      open(root, 'items');
      const add = (member: number) =>
        field(
          root,
          `[data-action="editor-add-item"][data-editor-member="${member}"]`,
        ).click();
      add(2);
      add(1);
      expect((props().items as unknown[]).slice(-2)).toEqual([
        { kind: 'divider' },
        { kind: 'heading', label: 'Item 5' },
      ]);
      // Rows name their member, and a divider by its kind.
      const labels = rows(root, 'items');
      expect(labels.at(-2)).toContain('Divider');
      expect(labels.at(-1)).toContain('Heading');
      // A divider's form has nothing to edit but its fixed kind.
      open(root, 'items', [(props().items as unknown[]).length - 2]);
      const dialog = field(root, '#editor-field-dialog');
      expect(dialog.querySelector('[data-editor-field]')).toBeNull();
      expect(dialog.textContent).toContain('Kind');
    });

    it('edits a Combobox’s text suggestion in a text field', () => {
      const { root, props } = added('@kerfjs/ui:combobox');
      open(root, 'suggestions');
      field(
        root,
        '[data-action="editor-add-item"][data-editor-member="1"]',
      ).click();
      expect((props().suggestions as unknown[]).at(-1)).toEqual({
        value: 'suggestion-4',
        label: 'Suggestion 4',
      });
      open(root, 'suggestions', [0]);
      const text = field(
        root,
        `[data-editor-field='${place('suggestions', [0])}']`,
      );
      expect(text.dataset.editorKind).toBe('text');
      type(text, 'Red');
      expect((props().suggestions as unknown[])[0]).toBe('Red');
      // Clearing it keeps the item, empty.
      type(
        field(root, `[data-editor-field='${place('suggestions', [0])}']`),
        '',
      );
      expect(props().suggestions as unknown[]).toHaveLength(4);
      expect((props().suggestions as unknown[])[0]).toBe('');
    });

    it('edits a Slider’s ticks in the Inspector, starting from none', () => {
      const { root, props } = added('@kerfjs/ui:slider');
      open(root, 'ticks');
      expect(
        [
          ...root.querySelectorAll<HTMLElement>(
            '#editor-inspector-stack [data-nav-key]',
          ),
        ].map((view) => view.dataset.navKey),
      ).toEqual(['inspector', 'field-ticks']);
      expect(
        root.querySelector('#editor-inspector-stack')!.textContent,
      ).toContain('No items yet.');
      field(root, '[data-action="editor-add-item"]').click();
      expect(props().ticks).toEqual([{ value: 1 }]);
      // JSON is one click away, and back to the list.
      field(root, '[data-action="editor-field-json"]').click();
      expect(
        root.querySelector(`[data-editor-field='${place('ticks', [])}']`),
      ).not.toBeNull();
      expect(root.textContent).toContain('Edit as list');
    });
  },
);

describe('a list no field editor takes (KF-CY1D5W)', () => {
  // An application's `values: number[]` keeps the typed JSON field, with
  // Fill with example while the required prop is unset.
  const SPARK = '01JB8Z1M6Q8E1X9V4S7K2R3T7A';
  const chartsProps = {
    schema: 'kerf-ui-component-props/v1',
    package: '@acme/charts',
    components: [
      {
        key: '@acme/charts:sparkline',
        id: 'sparkline',
        source: 'package',
        import: '@acme/charts/sparkline',
        export: 'Sparkline',
        props: [
          {
            name: 'values',
            type: {
              kind: 'array',
              items: { kind: 'number' },
              text: 'number[]',
            },
            required: true,
          },
          {
            name: 'bands',
            type: {
              kind: 'array',
              items: {
                kind: 'object',
                props: [
                  {
                    name: 'color',
                    type: { kind: 'css-value', text: 'CssColor' },
                    required: true,
                  },
                ],
              },
              text: '{ color: CssColor }[]',
            },
            required: false,
          },
        ],
        nativeAttributes: [],
        dataChannel: 'none',
      },
    ],
    definitions: {},
  };
  const chartsComposition = {
    schemaVersion: 1,
    package: '@acme/charts',
    entries: [
      {
        key: '@acme/charts:sparkline',
        package: '@acme/charts',
        id: 'sparkline',
        name: 'Sparkline',
        kind: 'component',
        publicExports: [{ name: 'Sparkline', subpath: './sparkline' }],
        zones: [],
      },
    ],
  };

  it('fills a required number list with its example', () => {
    const catalog = createEditorCatalog({
      props: [propsJson, chartsProps as never],
      composition: [compositionJson, chartsComposition as never],
      components: componentFunctions(),
    });
    const root = document.createElement('div');
    document.body.append(root);
    const editor = createEditor({
      catalog,
      document: {
        schema: 'kerf-ui-document/v1',
        name: 'Charts',
        catalogs: ['@kerfjs/ui', '@acme/charts'],
        root: {
          id: PANE,
          type: '@kerfjs/ui:pane',
          zones: { content: [{ id: SPARK, type: '@acme/charts:sparkline' }] },
        },
      } as never,
    });
    mount(root, editor.render);
    cleanup = editor.wire(root);
    editor.selection.value = { kind: 'node', id: SPARK };
    expect(field(root, '[data-editor-prop="values"]').dataset.editorKind).toBe(
      'list',
    );
    field(root, '[data-action="editor-fill-example"]').click();
    expect(findNode(editor.document.value, SPARK)!.node.props?.values).toEqual([
      1, 2, 3,
    ]);
    expect(
      root.querySelector('[data-action="editor-fill-example"]'),
    ).toBeNull();
    // An item no placeholder can stand for (a required color) starts empty.
    open(root, 'bands');
    field(root, '[data-action="editor-add-item"]').click();
    expect(findNode(editor.document.value, SPARK)!.node.props?.bands).toEqual([
      {},
    ]);
  });
});
