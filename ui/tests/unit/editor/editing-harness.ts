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

export const field = (root: HTMLElement, selector: string) =>
  root.querySelector<HTMLElement>(selector)!;

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
