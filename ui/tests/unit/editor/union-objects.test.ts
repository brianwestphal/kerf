// KF-907BXY: a prop that holds one of several object types (a Workbench's
// leftRail: a static or a navigation panel) picks its kind, then edits that
// kind's form; switching kinds keeps the fields both share.
import type { ViewType } from '@kerfjs/ui/view';
import { mount } from 'kerfjs';
import { afterEach, describe, expect, it } from 'vitest';

import propsJson from '../../../ai/component-props.json';
import { choiceOptions } from '../../../src/editor/model/controls.js';
import { findNode } from '../../../src/editor/model/document.js';
import {
  memberFor,
  memberLabels,
  objectFields,
} from '../../../src/editor/model/fields.js';
import { createEditor } from './kerf-catalog.js';

const definitions = propsJson.definitions as unknown as Record<
  string,
  ViewType
>;
const panel = propsJson.components
  .find((entry) => entry.export === 'Workbench')!
  .props.find((prop) => prop.name === 'leftRail')!.type as ViewType;
const ref = (name: string) => ({ kind: 'ref', ref: name }) as ViewType;

describe('object members', () => {
  it('names each kind of panel', () => {
    expect(
      choiceOptions(panel, definitions)!.map((option) => option.label),
    ).toEqual(['Static panel…', 'Navigation panel…']);
    expect(
      memberLabels(
        [ref('WorkbenchStaticPanel'), { kind: 'string' } as ViewType],
        definitions,
        'Item',
      ),
    ).toEqual(['Workbench static panel', 'Text']);
  });

  it('tells the kinds apart by the fields each forbids', () => {
    expect(memberFor(panel, definitions, { content: 'x' })).toMatchObject({
      ref: 'WorkbenchStaticPanel',
    });
    expect(
      memberFor(panel, definitions, { navStack: {}, toolbar: {} }),
    ).toMatchObject({ ref: 'WorkbenchNavigationPanel' });
  });

  it('leaves forbidden fields out of a form', () => {
    const names = objectFields(ref('WorkbenchStaticPanel'), definitions).map(
      (field) => field.name,
    );
    expect(names).toContain('content');
    expect(names).not.toContain('navStack');
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

describe('a Workbench panel in the Inspector (KF-907BXY)', () => {
  it('picks a static panel, edits its form, and switches to a navigation panel', () => {
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
    const rail = () =>
      findNode(editor.document.value, id)!.node.props?.leftRail;
    const kind = () =>
      field(root, '[data-editor-prop="leftRail"][data-editor-kind="choice"]');

    choose(kind(), '#0');
    // A new static panel's content is an item slot, named after the prop.
    expect(rail()).toEqual({ content: { $slot: 'leftRailContent' } });
    field(root, `[data-editor-open='{"prop":"leftRail","path":[]}']`).click();
    type(
      field(root, `[data-editor-field='{"prop":"leftRail","path":["label"]}']`),
      'Folders',
    );
    expect(rail()).toMatchObject({ label: 'Folders' });
    // The form edits the static panel; a navigation panel's fields are not in it.
    expect(
      root.querySelector(
        `[data-editor-field='{"prop":"leftRail","path":["navStack"]}']`,
      ),
    ).toBeNull();
    field(root, '#editor-inspector-stack [data-nav-back]').click();

    // Switching keeps the label both kinds share and drops the content.
    choose(kind(), '#1');
    expect(rail()).toMatchObject({ label: 'Folders' });
    expect(rail()).not.toHaveProperty('content');
    expect(rail()).toHaveProperty('navStack');
    expect(kind().getAttribute('value')).toBe('#1');
  });
});
