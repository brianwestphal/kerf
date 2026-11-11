// KF-YBMVVM: the shared harness for the editing tests, split across files so
// no one file's happy-dom heap nears CI's 4 GB limit (happy-dom keeps each
// re-rendered editor tree alive until its worker exits).
import { mount } from 'kerfjs';
import { afterEach } from 'vitest';

import { findNode } from '../../../src/editor/model/document.js';
import { createEditor } from './kerf-catalog.js';

export const PANE = '01JB8Z1M6Q8E1X9V4S7K2R3T5A';
export const TOOLBAR = '01JB8Z1M6Q8E1X9V4S7K2R3T5B';
export const COMPOSE = '01JB8Z1M6Q8E1X9V4S7K2R3T5D';
export const FOLDERS = '01JB8Z1M6Q8E1X9V4S7K2R3T5E';

let cleanup: (() => void) | undefined;

/** Disposes the open editor and empties the document. */
export function teardown() {
  cleanup?.();
  cleanup = undefined;
  document.body.replaceChildren();
}
afterEach(teardown);

type Editor = ReturnType<typeof createEditor>;

/** Mounts and wires `editor` into `root`, disposed after the test. */
export function attach(root: HTMLElement, editor: Editor) {
  const stop = mount(root, editor.render);
  const unwire = editor.wire(root);
  cleanup = () => {
    unwire();
    stop();
  };
}

/** Mounts and wires an editor with node `id` selected. */
export function open(id = COMPOSE) {
  const root = document.createElement('div');
  document.body.append(root);
  const editor = createEditor();
  attach(root, editor);
  editor.selection.value = { kind: 'node', id };
  const node = () => findNode(editor.document.value, id)?.node;
  return { root, editor, node };
}

/** Rows a Properties page shows for a prop in place of its field. */
const ROW_HOOKS = [
  'data-editor-promote-prop',
  'data-editor-content-add',
  'data-editor-content-node',
];

/**
 * KF-QWDPM3: opens the Properties page that holds prop `name`, from the
 * overview or a group page, as a person would: its row, then its task's.
 */
export function showProp(root: HTMLElement, name: string) {
  const clicked = new Set<HTMLElement>();
  for (let step = 0; step < 3; step += 1) {
    if (
      root.querySelector(
        [
          `[data-editor-prop="${name}"]`,
          `[data-editor-open^='{"prop":"${name}"']`,
          `[data-editor-icon-place^='{"prop":"${name}"']`,
          ...ROW_HOOKS.map((hook) => `[${hook}="${name}"]`),
        ].join(', '),
      )
    )
      return;
    const rows = [
      ...root.querySelectorAll<HTMLElement>(
        `[data-editor-group-props~="${name}"]`,
      ),
    ].filter((row) => !clicked.has(row));
    // The deepest row: a task's row on its group's page.
    const row = rows.at(-1);
    if (!row) return;
    clicked.add(row);
    row.click();
  }
}

/**
 * KF-QWDPM3: opens the All properties page, which lists every field of the
 * selected node and stays open as another node is selected.
 */
export function showAllProperties(root: HTMLElement) {
  root
    .querySelector<HTMLElement>('[data-editor-prop-group="All properties"]')
    ?.click();
}

/** The element at `selector`, opening the page of a prop it names first. */
export const field = (root: HTMLElement, selector: string) => {
  const prop =
    /data-editor-(?:prop="|open='\{"prop":"|promote-prop="|content-(?:add|node)=")([^"]+)"/.exec(
      selector,
    )?.[1];
  if (prop) showProp(root, prop);
  return root.querySelector<HTMLElement>(selector)!;
};

/** Changes a Select the way its popup does: a new value, then `change`. */
export function choose(select: HTMLElement, value: string) {
  select.setAttribute('value', value);
  Object.defineProperty(select, 'value', { configurable: true, value });
  select.dispatchEvent(new Event('change', { bubbles: true }));
}

/** Types into a text field and commits it with `change`. */
export function type(host: HTMLElement, value: string) {
  const input = host.querySelector<HTMLInputElement>('input, textarea')!;
  input.value = value;
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

export const click = (root: HTMLElement, action: string) =>
  field(root, `[data-action="${action}"]`).click();
