// KF-HNNWN9: list props are edited, filled with examples, and validated.
import { validateView } from '@kerfjs/ui/view';
import { describe, expect, it } from 'vitest';

import { findNode } from '../../../src/editor/model/document.js';
import {
  choose,
  click,
  field,
  FOLDERS,
  open,
  PANE,
  showProp,
  type,
} from './editing-harness.js';
import { viewCatalog } from './kerf-catalog.js';

describe('list props (KF-HNNWN9)', () => {
  /** Adds component `key` to the Pane's content and returns its node getter. */
  function add(key: string) {
    const opened = open(PANE);
    const { root, editor } = opened;
    choose(field(root, '[data-editor-add="zone"]'), 'content');
    choose(field(root, '[data-editor-add="component"]'), key);
    click(root, 'editor-add-child');
    const selected = editor.selection.value;
    const id = selected?.kind === 'node' ? selected.id : '';
    return { ...opened, node: () => findNode(editor.document.value, id)?.node };
  }

  it.each(['combobox', 'select', 'popup-menu'])(
    'adds a %s that renders without a problem',
    (key) => {
      const { root, node } = add(`@kerfjs/ui:${key}`);
      expect(node()?.type).toBe(`@kerfjs/ui:${key}`);
      expect(root.textContent).toContain('· valid');
      expect(root.textContent).not.toContain('cannot render');
    },
  );

  it('edits a size union from keywords or a builder call (KF-Q5AXNP)', () => {
    const { root, editor, node } = open(FOLDERS);
    const gap = () =>
      field(root, '[data-editor-prop="gap"][data-editor-kind="size"]');
    const builder = () =>
      root.querySelector<HTMLElement>(
        '[data-editor-prop="gap"][data-editor-kind="css"]',
      );
    showProp(root, 'gap');
    expect(gap()).not.toBeNull();
    expect(builder()).toBeNull();
    choose(gap(), 'm');
    expect(node()?.props?.gap).toBe('m');
    choose(gap(), 'true');
    expect(node()?.props?.gap).toBe(true);
    // Custom clears the keyword and opens the builder field.
    choose(gap(), 'custom');
    expect(node()?.props).not.toHaveProperty('gap');
    expect(gap().getAttribute('value')).toBe('custom');
    // Undo brings the keyword back, and the Select shows it, not Custom.
    click(root, 'editor-undo');
    expect(node()?.props?.gap).toBe(true);
    expect(gap().getAttribute('value')).toBe('true');
    expect(builder()).toBeNull();
    choose(gap(), 'custom');
    type(builder()!, 'rgb(0, 0, 0)');
    expect(builder()!.textContent).toContain('This prop takes');
    type(builder()!, 'px(12)');
    expect(node()?.props?.gap).toEqual({ $css: 'px(12)' });
    expect(validateView(editor.document.value, viewCatalog).valid).toBe(true);
    // A keyword again hides the builder field.
    choose(gap(), 'xs');
    expect(node()?.props?.gap).toBe('xs');
    expect(builder()).toBeNull();
    choose(gap(), '');
    expect(node()?.props).not.toHaveProperty('gap');
  });

  it('splits a gap into columns and rows, each its own size (KF-VA14AP)', () => {
    const { root, editor, node } = open(FOLDERS);
    const gap = () =>
      field(root, '[data-editor-prop="gap"][data-editor-kind="size"]');
    const axis = (name: string, kind = 'size') =>
      root.querySelector<HTMLElement>(
        `[data-editor-field='${JSON.stringify({ prop: 'gap', path: [name] })}'][data-editor-kind="${kind}"]`,
      );
    showProp(root, 'gap');
    expect(gap()).not.toBeNull();
    expect(axis('column')).toBeNull();
    choose(gap(), 'l');
    choose(gap(), 'axes');
    expect(node()?.props?.gap).toEqual({ column: 'l', row: 'l' });
    expect(gap().getAttribute('value')).toBe('axes');
    choose(axis('column')!, 'none');
    expect(node()?.props?.gap).toEqual({ column: 'none', row: 'l' });
    // Custom… keeps the axis's value until its builder field sets one.
    choose(axis('row')!, 'custom');
    expect(node()?.props?.gap).toEqual({ column: 'none', row: 'l' });
    type(axis('row', 'css')!, 'px(12)');
    expect(node()?.props?.gap).toEqual({
      column: 'none',
      row: { $css: 'px(12)' },
    });
    expect(validateView(editor.document.value, viewCatalog).valid).toBe(true);
    // A keyword for the whole gap leaves Columns and rows.
    choose(gap(), 'm');
    expect(node()?.props?.gap).toBe('m');
    expect(axis('column')).toBeNull();
  });

  // KF-CY1D5W: a list of union items opens its list editor; its typed JSON
  // stays one click away there.
  const openSuggestions = (root: HTMLElement) =>
    field(
      root,
      `[data-editor-open='{"prop":"suggestions","path":[]}']`,
    ).click();
  const suggestionsJson = (root: HTMLElement) =>
    field(root, `[data-editor-field='{"prop":"suggestions","path":[]}']`);

  it('edits a list prop as JSON and refuses a value its type does not take', () => {
    const { root, node } = add('@kerfjs/ui:combobox');
    openSuggestions(root);
    click(root, 'editor-field-json');
    expect(suggestionsJson(root).dataset.editorKind).toBe('list');
    expect(suggestionsJson(root).querySelector('textarea')!.value).toContain(
      'Suggestion 1',
    );
    type(suggestionsJson(root), '["Red", {"value": "g", "label": "Green"}]');
    expect(node()?.props?.suggestions).toEqual([
      'Red',
      { value: 'g', label: 'Green' },
    ]);
    type(suggestionsJson(root), '[1, 2]');
    expect(node()?.props?.suggestions).toHaveLength(2);
    expect(root.textContent).toContain('Not a ComboboxSuggestion[].');
  });

  it('fills a cleared list prop with an example', () => {
    const { root, node } = add('@kerfjs/ui:combobox');
    openSuggestions(root);
    click(root, 'editor-reset-field');
    expect(node()?.props).not.toHaveProperty('suggestions');
    expect(root.textContent).toContain('requires "suggestions"');
    click(root, 'editor-fill-field-example');
    expect(node()?.props?.suggestions).toEqual([
      'Suggestion 1',
      'Suggestion 2',
      'Suggestion 3',
    ]);
  });

  // KF-SXDM56: content inside a list item (a NavStack view's body) is an
  // item slot the application fills; the outline and canvas show it.
  it('adds a NavStack whose views hold item slots, named apart per node', () => {
    const { root, editor, node } = add('@kerfjs/ui:nav-stack');
    expect(root.textContent).toContain('· valid');
    expect(node()?.props?.views).toEqual([
      { key: 'View 1', content: { $slot: 'view1Content' } },
      { key: 'View 2', content: { $slot: 'view2Content' } },
      { key: 'View 3', content: { $slot: 'view3Content' } },
    ]);
    const canvas = root.querySelector('[data-editor-canvas]')!;
    expect(canvas.textContent).toContain('view1Content slot');
    const row = root.querySelector<HTMLElement>(
      `[data-item-id="item-slot:${node()!.id}:views › 1 › content"]`,
    )!;
    expect(row.textContent).toContain('view1Content slot');
    // A second NavStack in the same document does not reuse those names.
    const first = node()!.id;
    editor.selection.value = { kind: 'node', id: PANE };
    choose(field(root, '[data-editor-add="zone"]'), 'content');
    choose(
      field(root, '[data-editor-add="component"]'),
      '@kerfjs/ui:nav-stack',
    );
    click(root, 'editor-add-child');
    const selected = editor.selection.value;
    const second = findNode(
      editor.document.value,
      selected?.kind === 'node' ? selected.id : '',
    )!.node;
    expect((second.props?.views as { content: unknown }[])[0]?.content).toEqual(
      { $slot: 'view1Content2' },
    );
    // An item slot row selects the node that holds it.
    root
      .querySelector<HTMLElement>(
        `[data-action="editor-select-node"][data-item-id="item-slot:${first}:views › 2 › content"]`,
      )!
      .click();
    expect(editor.selection.value).toEqual({ kind: 'node', id: first });
  });

  it('offers an example only for a required list prop', () => {
    const { root } = add('@kerfjs/ui:popup-menu');
    // The optional anchor is unset and opens its form (KF-Z9S029), with no
    // Fill button beside it.
    showProp(root, 'anchor');
    expect(
      root.querySelector('[data-editor-open*=\'"prop":"anchor"\']'),
    ).not.toBeNull();
    expect(
      root.querySelector('[data-action="editor-fill-example"]'),
    ).toBeNull();
  });
});
