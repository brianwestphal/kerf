// KF-H3CB2P: a function, signal, or model prop comes from the application
// through a param typed as that prop; the editor previews it with a
// placeholder (Kerf UI's, or the host's own).
import type { ViewType } from '@kerfjs/ui/view';
import { mount } from 'kerfjs';
import { jsx } from 'kerfjs/jsx-runtime';
import { afterEach, describe, expect, it } from 'vitest';

import compositionJson from '../../../ai/component-composition.json';
import propsJson from '../../../ai/component-props.json';
import { controlFor } from '../../../src/editor/model/controls.js';
import { findNode } from '../../../src/editor/model/document.js';
import {
  appParamFor,
  fieldEditorKind,
  isAppSupplied,
} from '../../../src/editor/model/fields.js';
import { sampleInputs } from '../../../src/editor/model/sample-inputs.js';
import {
  componentFunctions,
  createEditor,
  createEditorCatalog,
} from './kerf-catalog.js';

const definitions = propsJson.definitions as unknown as Record<
  string,
  ViewType
>;
const propOf = (component: string, name: string) =>
  propsJson.components
    .find((entry) => entry.export === component)!
    .props.find((prop) => prop.name === name)! as never as {
    name: string;
    type: ViewType;
  };

describe('app-supplied props', () => {
  it('knows a function, a model, and anything else apart', () => {
    const render = propOf('Select', 'renderSelected');
    const model = propOf('SearchField', 'model');
    expect(isAppSupplied(render.type, definitions)).toBe(true);
    expect(isAppSupplied(model.type, definitions)).toBe(true);
    expect(isAppSupplied(propOf('Select', 'label').type, definitions)).toBe(
      false,
    );
    expect(appParamFor('@kerfjs/ui:select', render, definitions)).toEqual({
      kind: 'prop',
      component: '@kerfjs/ui:select',
      prop: 'renderSelected',
    });
    expect(
      appParamFor('@kerfjs/ui:select', propOf('Select', 'label'), definitions),
    ).toBeUndefined();
    // No form or JSON for them: they stay read-only until promoted.
    expect(fieldEditorKind(model.type, definitions)).toBe('json');
    expect(controlFor(model as never, undefined, definitions).kind).toBe(
      'readonly',
    );
  });

  it('previews a prop-typed param with its placeholder, or leaves it out', () => {
    const document = {
      params: {
        show: {
          type: {
            kind: 'prop',
            component: '@kerfjs/ui:select',
            prop: 'renderSelected',
          },
        },
        other: { type: { kind: 'prop', component: 'x:y', prop: 'z' } },
      },
    } as never;
    const inputs = sampleInputs(document, String, (key) =>
      key === '@kerfjs/ui:select.renderSelected' ? 'stand-in' : undefined,
    );
    expect(inputs).toEqual({ show: 'stand-in' });
    expect(sampleInputs(document, String)).toEqual({});
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

/** An editor with a new `key` node added to the inbox Pane, selected. */
function added(key: string, options = {}) {
  const root = document.createElement('div');
  document.body.append(root);
  const editor = createEditor(options);
  mount(root, editor.render);
  cleanup = editor.wire(root);
  editor.selection.value = { kind: 'node', id: '01JB8Z1M6Q8E1X9V4S7K2R3T5A' };
  choose(field(root, '[data-editor-add="zone"]'), 'content');
  choose(field(root, '[data-editor-add="component"]'), key);
  field(root, '[data-action="editor-add-child"]').click();
  const { id } = editor.selection.value as { id: string };
  const node = () => findNode(editor.document.value, id)!.node;
  return { root, editor, node, id };
}

/** Promotes `prop` of the selected node from the Promote section. */
function promote(root: HTMLElement, prop: string) {
  choose(field(root, '[data-editor-promote]'), prop);
  field(root, '[data-action="editor-promote"]').click();
}

describe('promoting an app-supplied prop (KF-H3CB2P)', () => {
  it('makes a Select’s renderSelected a prop-typed param and previews it', () => {
    const { root, editor, node } = added('@kerfjs/ui:select');
    promote(root, 'renderSelected');
    const bound = node().props?.renderSelected as { $param: string };
    expect(editor.document.value.params?.[bound.$param]).toEqual({
      type: {
        kind: 'prop',
        component: '@kerfjs/ui:select',
        prop: 'renderSelected',
      },
    });
    expect(root.textContent).toContain('· valid');
    // Kerf UI's placeholder renders the chosen label in a span.
    const select = field(
      root,
      `[data-editor-canvas] [data-kerf-node="${node().id}"]`,
    );
    expect(select.innerHTML).toContain('<span>Choice 1</span>');
  });

  it('promotes an app-supplied prop from its own row (KF-D85GY0)', () => {
    const { root, editor, node } = added('@kerfjs/ui:select');
    const row = () =>
      root.querySelector<HTMLElement>(
        '[data-editor-promote-prop="renderSelected"]',
      );
    expect(row()!.textContent).toContain('The app supplies it');
    row()!.click();
    const bound = node().props?.renderSelected as { $param: string };
    expect(editor.document.value.params?.[bound.$param]?.type).toMatchObject({
      kind: 'prop',
      prop: 'renderSelected',
    });
    // Promoted, it is no longer offered.
    expect(row()).toBeNull();
    // The Promote section names props in words too.
    expect(field(root, '[data-editor-promote]').textContent).toContain(
      'Placeholder text',
    );
  });

  it('previews a SearchField’s model with a working placeholder', () => {
    const { root, node } = added('@kerfjs/ui:search-field');
    promote(root, 'model');
    expect(root.textContent).toContain('· valid');
    expect(
      root.querySelector(
        `[data-editor-canvas] [data-kerf-node="${node().id}"]`,
      )!.textContent,
    ).not.toContain('cannot render');
  });

  it('uses a host’s own placeholder in place of Kerf UI’s', () => {
    const catalog = createEditorCatalog({
      props: [propsJson],
      composition: [compositionJson],
      components: componentFunctions(),
      placeholders: {
        '@kerfjs/ui:select.renderSelected': () => () =>
          jsx('em', { children: 'Host placeholder' }),
      },
    });
    const { root, node } = added('@kerfjs/ui:select', { catalog });
    promote(root, 'renderSelected');
    expect(
      field(root, `[data-editor-canvas] [data-kerf-node="${node().id}"]`)
        .innerHTML,
    ).toContain('<em>Host placeholder</em>');
  });
});

describe('promoting a list prop (KF-V9V2B6)', () => {
  it('makes a Select’s choices a prop-typed param that keeps the list', () => {
    const { root, editor, node } = added('@kerfjs/ui:select');
    const seeded = node().props?.choices;
    promote(root, 'choices');
    const bound = node().props?.choices as { $param: string };
    expect(editor.document.value.params?.[bound.$param]).toEqual({
      type: { kind: 'prop', component: '@kerfjs/ui:select', prop: 'choices' },
      default: seeded,
    });
    expect(root.textContent).toContain('· valid');
    expect(
      root.querySelector(
        `[data-editor-canvas] [data-kerf-node="${node().id}"]`,
      )!.textContent,
    ).toContain('Choice 1');
  });
});
