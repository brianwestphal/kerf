// KF-P6FPG2: a document whose preview fails when mounted (a repeated row whose
// markup splits into two elements) shows why on the canvas and leaves the
// rest of the editor working.
import { mount, raw } from 'kerfjs';
import { afterEach, describe, expect, it } from 'vitest';

import catalogJson from '../../../ai/component-catalog.json';
import compositionJson from '../../../ai/component-composition.json';
import propsJson from '../../../ai/component-props.json';
import {
  componentFunctions,
  createEditor,
  createEditorCatalog,
} from './kerf-catalog.js';

const FOLDERS = '01JB8Z1M6Q8E1X9V4S7K2R3T5E';
const COMPOSE = '01JB8Z1M6Q8E1X9V4S7K2R3T5D';

let cleanup: (() => void) | undefined;
afterEach(() => {
  cleanup?.();
  cleanup = undefined;
  document.body.replaceChildren();
});

describe('a preview that fails when mounted', () => {
  it('explains itself on the canvas while the rest of the editor keeps working', () => {
    // A ListItem whose markup is two elements, as a nested <button> becomes
    // once the HTML parser splits it.
    const catalog = createEditorCatalog({
      props: [propsJson],
      composition: [compositionJson],
      selection: [catalogJson],
      components: {
        ...componentFunctions(),
        '@kerfjs/ui:list-item': () =>
          raw(
            '<button type="button">A</button><button type="button">B</button>',
          ),
      },
    });
    const root = document.createElement('div');
    document.body.append(root);
    const editor = createEditor({ catalog });
    mount(root, editor.render);
    cleanup = editor.wire(root);
    const canvas = root.querySelector('[data-editor-canvas]')!;
    expect(canvas.textContent).toContain('This document cannot be previewed');
    expect(canvas.textContent).toContain('exactly one is required');
    // The editor still renders other changes.
    editor.selection.value = { kind: 'node', id: COMPOSE };
    expect(root.textContent).toContain('composeButton · Button');
    // Deleting the list that repeats the failing row restores the preview.
    editor.selection.value = { kind: 'node', id: FOLDERS };
    root.querySelector<HTMLElement>('[data-action="editor-delete"]')!.click();
    expect(canvas.textContent).not.toContain('cannot be previewed');
    expect(canvas.textContent).toContain('Compose');
  });
});
