// KF-EXA2WH: `createEditor({ fieldEditors })` registers an editor for a
// named type; it replaces the type-driven form wherever a prop or field has
// that type, chooses its container, and composes the editor's own controls.
import type { ViewType } from '@kerfjs/ui/view';
import { delegate, mount } from 'kerfjs';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Button } from '../../../src/components/actions/button/button.js';
import {
  type FieldEditor,
  type FieldEditorContext,
} from '../../../src/editor/editor.js';
import { fieldEditorFor } from '../../../src/editor/field-editors.js';
import { findNode } from '../../../src/editor/model/document.js';
import { createEditor } from './kerf-catalog.js';

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

const place = (prop: string, path: unknown[] = []) =>
  JSON.stringify({ prop, path });

/** An editor over a Workbench root, with `fieldEditors` registered. */
function workbench(fieldEditors: Record<string, FieldEditor>) {
  const root = document.createElement('div');
  document.body.append(root);
  const editor = createEditor({ fieldEditors });
  mount(root, editor.render);
  cleanup = editor.wire(root);
  editor.selection.value = { kind: 'node', id: editor.document.value.root.id };
  choose(field(root, '[data-editor-root="component"]'), '@kerfjs/ui:workbench');
  field(root, '[data-action="editor-replace-root"]').click();
  const id = editor.document.value.root.id;
  const props = () => findNode(editor.document.value, id)!.node.props ?? {};
  return { root, editor, props };
}

/** A ListConfig editor: two presets, its own alignment input, and the form. */
const presets: FieldEditor = {
  render: (context) => (
    <div data-app-list-config>
      <Button
        action={context.setAction}
        rootAttributes={context.set({ gap: 'l', hAlign: 'center' })}
      >
        Roomy
      </Button>
      <Button
        action={context.setAction}
        rootAttributes={context.set(undefined)}
      >
        Plain
      </Button>
      <input
        aria-label="Alignment"
        value={String((context.value as { hAlign?: string })?.hAlign ?? '')}
        {...context.control(['hAlign'], 'text')}
      />
      {context.form()}
    </div>
  ),
};

describe('fieldEditorFor', () => {
  it('finds the editor registered for a type’s ref name', () => {
    const ref = { kind: 'ref', ref: 'ListConfig' } as ViewType;
    expect(fieldEditorFor(ref, { ListConfig: presets })).toEqual({
      name: 'ListConfig',
      editor: presets,
    });
    expect(fieldEditorFor(ref, {})).toBeUndefined();
    expect(fieldEditorFor(ref, undefined)).toBeUndefined();
    expect(
      fieldEditorFor({ kind: 'string' } as ViewType, { ListConfig: presets }),
    ).toBeUndefined();
    expect(fieldEditorFor(undefined, { ListConfig: presets })).toBeUndefined();
  });
});

describe('application field editors (KF-EXA2WH)', () => {
  it('replaces the form for its type, with presets, its own input, and the form', () => {
    const { root, props } = workbench({ ListConfig: presets });
    field(root, `[data-editor-open='${place('mainFooterList')}']`).click();
    const editor = field(
      root,
      '#editor-inspector-stack [data-app-list-config]',
    );
    expect(editor).not.toBeNull();
    // The type-driven form is composed inside it.
    expect(
      editor.querySelector(
        `[data-editor-field='${place('mainFooterList', ['vAlign'])}']`,
      ),
    ).not.toBeNull();
    field(editor, '[data-editor-value]').click();
    expect(props().mainFooterList).toEqual({ gap: 'l', hAlign: 'center' });
    // Its own input commits on change, as the Inspector's controls do.
    const input = field(
      root,
      `input[data-editor-field='${place('mainFooterList', ['hAlign'])}']`,
    ) as HTMLInputElement;
    expect(input.value).toBe('center');
    input.value = 'right';
    input.dispatchEvent(new Event('change', { bubbles: true }));
    expect(props().mainFooterList).toEqual({ gap: 'l', hAlign: 'right' });
    // A preset with no value unsets it.
    [...root.querySelectorAll<HTMLElement>('[data-editor-value]')]
      .at(-1)!
      .click();
    expect(props()).not.toHaveProperty('mainFooterList');
    // Edit as JSON still swaps it for the typed JSON field, and back.
    field(root, '[data-action="editor-field-json"]').click();
    expect(root.querySelector('[data-app-list-config]')).toBeNull();
    expect(root.textContent).toContain('Edit as form');
    field(root, '[data-action="editor-field-json"]').click();
    expect(root.querySelector('[data-app-list-config]')).not.toBeNull();
  });

  it('opens in the container it names, and for a field inside a form', () => {
    const tint: FieldEditor = {
      container: 'dialog',
      render: (context) => (
        <p data-app-tint>{JSON.stringify(context.value ?? null)}</p>
      ),
    };
    const { root, props } = workbench({ SurfaceTint: tint });
    // A Pane's tint inside the mainPane form opens as a row, not fields.
    field(root, `[data-editor-open='${place('mainPane')}']`).click();
    const dialog = field(root, '#editor-field-dialog') as HTMLDialogElement;
    expect(dialog.open).toBe(true);
    field(root, `[data-editor-open='${place('mainPane', ['tint'])}']`).click();
    expect(field(dialog, '[data-app-tint]').textContent).toBe('null');
    expect(props()).not.toHaveProperty('mainPane');
  });

  it('opens a prop of its type in the dialog it names', () => {
    const { root } = workbench({
      ListConfig: { ...presets, container: 'dialog' },
    });
    field(root, `[data-editor-open='${place('mainHeaderList')}']`).click();
    const dialog = field(root, '#editor-field-dialog') as HTMLDialogElement;
    expect(dialog.open).toBe(true);
    expect(dialog.querySelector('[data-app-list-config]')).not.toBeNull();
  });

  it('wires its own events, reading the open value’s context', () => {
    let read: (() => FieldEditorContext | undefined) | undefined;
    const stop = vi.fn();
    const custom: FieldEditor = {
      render: () => <button type="button" data-app-reset />,
      wire: (root, context) => {
        read = context;
        const off = delegate(root, 'click', '[data-app-reset]', () =>
          context()!.commit({ gap: 'xs' }),
        );
        return () => {
          stop();
          off();
        };
      },
    };
    const { root, editor, props } = workbench({
      ListConfig: custom,
      SurfaceTint: { render: () => <span /> },
    });
    expect(read!()).toBeUndefined();
    field(root, `[data-editor-open='${place('mainFooterList')}']`).click();
    expect(read!()!.value).toBeUndefined();
    field(root, '[data-app-reset]').click();
    expect(props().mainFooterList).toEqual({ gap: 'xs' });
    expect(read!()!.value).toEqual({ gap: 'xs' });
    // Another type's open value is not this editor's.
    field(root, '#editor-inspector-stack [data-nav-back]').click();
    field(root, `[data-editor-open='${place('mainPane')}']`).click();
    expect(read!()).toBeUndefined();
    editor.selection.value = null;
    expect(read!()).toBeUndefined();
    cleanup!();
    cleanup = undefined;
    expect(stop).toHaveBeenCalledTimes(1);
  });
});
