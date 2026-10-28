// KF-6GT5QY: the published editor's host-facing paths: an empty start, the
// download fallback, opening and comparing through the real file inputs,
// previews that use icons or fail, and edits that need a fresh param name.
import type { ViewDocument } from '@kerfjs/ui/view';
import { mount } from 'kerfjs';
import { afterEach, describe, expect, it, vi } from 'vitest';

import catalogJson from '../../../ai/component-catalog.json';
import compositionJson from '../../../ai/component-composition.json';
import propsJson from '../../../ai/component-props.json';
import { findNode } from '../../../src/editor/model/document.js';
import { setProp } from '../../../src/editor/model/edits.js';
import {
  componentFunctions,
  createEditor,
  createEditorCatalog,
  defaultCatalog,
  sample,
} from './kerf-catalog.js';

let cleanup: (() => void) | undefined;
afterEach(() => {
  cleanup?.();
  cleanup = undefined;
  vi.restoreAllMocks();
  document.body.replaceChildren();
});

function open(options: Parameters<typeof createEditor>[0] = {}) {
  const root = document.createElement('div');
  document.body.append(root);
  const editor = createEditor(options);
  const stop = mount(root, editor.render);
  const unwire = editor.wire(root);
  cleanup = () => {
    unwire();
    stop();
  };
  return { root, editor };
}

const canvas = (root: HTMLElement) =>
  root.querySelector('[data-editor-canvas]')!;
const settle = () => new Promise((done) => window.setTimeout(done, 0));

/** Chooses a file in one of the editor's file pickers. */
async function choose(root: HTMLElement, pickerId: string, text: string) {
  const input = root.querySelector<HTMLInputElement>(
    `[data-file-picker-id="${pickerId}"] input[type="file"]`,
  )!;
  const file = new File([text], 'chosen.json', { type: 'application/json' });
  Object.defineProperty(input, 'files', { configurable: true, value: [file] });
  input.dispatchEvent(new Event('change', { bubbles: true }));
  await settle();
  await settle();
}

describe('the published editor', () => {
  it('starts with an empty Pane when the host gives no document', async () => {
    const { createEditor: bare } =
      await import('../../../src/editor/editor.js');
    const editor = bare({ catalog: defaultCatalog });
    expect(editor.document.value).toMatchObject({
      schema: 'kerf-ui-document/v1',
      catalogs: ['@kerfjs/ui'],
      root: { type: '@kerfjs/ui:pane' },
    });
    expect(editor.document.value.root.id).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/);
  });

  it('downloads a saved file when the host gives no save function', () => {
    const created = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:kerf-editor');
    const revoked = vi.spyOn(URL, 'revokeObjectURL').mockReturnValue();
    const clicks: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      clicks.push(`${this.download} ${this.href}`);
    });
    const { root } = open();
    root.querySelector<HTMLElement>('[data-action="editor-save"]')!.click();
    expect(created).toHaveBeenCalledOnce();
    expect(clicks).toEqual(['inbox.kui.json blob:kerf-editor']);
    expect(revoked).toHaveBeenCalledWith('blob:kerf-editor');
  });

  it('opens a chosen document and reports one that is not a view document', async () => {
    const { root, editor } = open();
    editor.selection.value = {
      kind: 'node',
      id: '01JB8Z1M6Q8E1X9V4S7K2R3T5D',
    };
    const next = { ...sample, name: 'Archive' } as ViewDocument;
    await choose(root, 'open-document', JSON.stringify(next));
    expect(editor.document.value.name).toBe('Archive');
    expect(editor.selection.value).toBeNull();
    expect(
      root
        .querySelector('[data-action="editor-undo"]')
        ?.hasAttribute('disabled'),
    ).toBe(true);
    await choose(root, 'open-document', '{"not":"a document"}');
    expect(editor.loadError.value).toBeTruthy();
    expect(editor.document.value.name).toBe('Archive');
  });

  it('compares the document with a chosen generated module', async () => {
    const { root } = open();
    await choose(root, 'compare-module', 'export const notGenerated = 1;\n');
    expect(root.textContent).toContain('generated');
  });

  it('renders $icon values through Lucide and explains a preview that throws', () => {
    const withIcon = setProp(
      structuredCloneOf(sample),
      '01JB8Z1M6Q8E1X9V4S7K2R3T5D',
      'icon',
      undefined,
    );
    const icon = {
      id: '01JB8Z1M6Q8E1X9V4S7K2R3T7A',
      type: '@kerfjs/ui:lucide-icon',
      props: { icon: { $icon: 'inbox' }, name: 'inbox' },
    };
    const document_ = structuredCloneOf(withIcon) as unknown as {
      root: { zones: { content: unknown[] } };
    };
    document_.root.zones.content.push(icon);
    const first = open({ document: document_ as unknown as ViewDocument });
    expect(
      canvas(first.root).querySelector('[data-lucide="inbox"], svg'),
    ).not.toBeNull();
    cleanup?.();

    const failing = createEditorCatalog({
      props: [propsJson],
      composition: [compositionJson],
      selection: [catalogJson],
      components: {
        ...componentFunctions(),
        '@kerfjs/ui:pane': () => {
          throw new Error('pane exploded');
        },
      },
    });
    const second = open({ catalog: failing });
    expect(canvas(second.root).textContent).toContain(
      'This document cannot be previewed',
    );
    expect(canvas(second.root).textContent).toContain('pane exploded');
  });
});

describe('the selection highlight', () => {
  it('follows the canvas when it resizes', async () => {
    let resized: (() => void) | undefined;
    const observed: Element[] = [];
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: () => void) {
          resized = callback;
        }
        observe(target: Element) {
          observed.push(target);
        }
        disconnect() {}
      },
    );
    const { root, editor } = open();
    expect(observed).toContain(canvas(root));
    editor.selection.value = {
      kind: 'node',
      id: '01JB8Z1M6Q8E1X9V4S7K2R3T5D',
    };
    resized!();
    const highlight = root.querySelector<HTMLElement>(
      '.kui-editor__selection',
    )!;
    expect(highlight.hidden).toBe(false);
    vi.unstubAllGlobals();
  });
});

describe('inspector edits a host can reach', () => {
  it('refuses a value its number field cannot take', () => {
    const bar = '01JB8Z1M6Q8E1X9V4S7K2R3T7B';
    const document_ = structuredCloneOf(sample) as unknown as {
      root: { zones: { content: unknown[] } };
    };
    document_.root.zones.content.push({
      id: bar,
      type: '@kerfjs/ui:progress-bar',
      props: { label: 'Sync' },
    });
    const { root, editor } = open({
      document: document_ as unknown as ViewDocument,
    });
    editor.selection.value = { kind: 'node', id: bar };
    const field = root.querySelector<HTMLElement>(
      '[data-editor-prop="value"]',
    )!;
    expect(field.dataset.editorKind).toBe('number');
    const input = field.querySelector('input')!;
    // A number input keeps only valid numbers; one too large is not finite.
    input.value = '1e999';
    input.dispatchEvent(new Event('change', { bubbles: true }));
    expect(findNode(editor.document.value, bar)?.node.props).not.toHaveProperty(
      'value',
    );
    expect(
      root.querySelector('[data-editor-prop="value"]')!.textContent,
    ).toContain('Enter a number.');
  });

  it('gives a second promotion of the same name a numbered param', () => {
    const { root, editor } = open();
    const add = () => {
      editor.selection.value = {
        kind: 'node',
        id: '01JB8Z1M6Q8E1X9V4S7K2R3T5B',
      };
      root
        .querySelector<HTMLElement>('[data-action="editor-add-child"]')!
        .click();
    };
    const promoteChildren = () => {
      const picker = root.querySelector<HTMLElement>('[data-editor-promote]')!;
      picker.setAttribute('value', 'children');
      Object.defineProperty(picker, 'value', {
        configurable: true,
        value: 'children',
      });
      root
        .querySelector<HTMLElement>('[data-action="editor-promote"]')!
        .click();
    };
    add();
    promoteChildren();
    add();
    promoteChildren();
    expect(Object.keys(editor.document.value.params ?? {})).toEqual(
      expect.arrayContaining(['nodeChildren', 'nodeChildren2']),
    );
  });
});

function structuredCloneOf<T>(value: T): T {
  return globalThis.structuredClone(value);
}
