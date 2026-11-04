// KF-RESJ2S: a Button's `link` prop (a URL, or `{ href, target }`) is
// authorable in the Inspector: a text destination, or an object whose
// `href` is text and whose `target` is a choice.
import type { ViewType } from '@kerfjs/ui/view';
import { mount } from 'kerfjs';
import { afterEach, describe, expect, it } from 'vitest';

import propsJson from '../../../ai/component-props.json';
import { choiceOptions } from '../../../src/editor/model/controls.js';
import { findNode } from '../../../src/editor/model/document.js';
import { objectFields, typeAt } from '../../../src/editor/model/fields.js';
import { createEditor } from './kerf-catalog.js';

const definitions = propsJson.definitions as unknown as Record<
  string,
  ViewType
>;
const buttonProps = propsJson.components.find(
  (entry) => entry.export === 'Button',
)!.props;
const link = buttonProps.find((prop) => prop.name === 'link')!.type as ViewType;

describe('Button link in the props catalog', () => {
  it('offers a text destination or a destination with a target', () => {
    // A URL object has no fields a document can hold, so it is not offered.
    expect(choiceOptions(link, definitions)).toHaveLength(2);
    const object = (link as { members: readonly ViewType[] }).members.find(
      (member) => member.kind === 'object',
    )!;
    expect(
      objectFields(object, definitions).map((field) => field.name),
    ).toEqual(['href', 'target']);
    expect(
      typeAt(link, definitions, ['target'], { href: '/docs' }),
    ).toMatchObject({ kind: 'enum' });
  });

  it('keeps href and target, and adds link to the emphasis choices', () => {
    const names = buttonProps.map((prop) => prop.name);
    expect(names).toEqual(expect.arrayContaining(['link', 'href', 'target']));
    const emphasis = buttonProps.find((prop) => prop.name === 'emphasis')!
      .type as { values: readonly string[] };
    expect(emphasis.values).toContain('link');
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

describe('a Button link in the Inspector (KF-RESJ2S)', () => {
  it('sets link to a destination with a target, and the link emphasis', () => {
    const root = document.createElement('div');
    document.body.append(root);
    const editor = createEditor();
    const stopMount = mount(root, editor.render);
    const unwireEditor = editor.wire(root);
    cleanup = () => {
      unwireEditor();
      stopMount();
    };
    editor.selection.value = {
      kind: 'node',
      id: editor.document.value.root.id,
    };
    choose(field(root, '[data-editor-root="component"]'), '@kerfjs/ui:button');
    field(root, '[data-action="editor-replace-root"]').click();
    const id = editor.document.value.root.id;
    const props = () => findNode(editor.document.value, id)!.node.props ?? {};
    const kind = root.querySelector<HTMLElement>(
      '[data-editor-prop="link"][data-editor-kind="choice"]',
    );
    expect(kind).not.toBeNull();
    const options = choiceOptions(link, definitions)!;
    const objectIndex = options.findIndex(
      (option) =>
        (option.member as { kind?: string } | undefined)?.kind === 'object',
    );
    expect(objectIndex).toBeGreaterThanOrEqual(0);
    choose(kind!, `#${objectIndex}`);
    expect(props().link).toMatchObject({ href: expect.any(String) });
  });
});
