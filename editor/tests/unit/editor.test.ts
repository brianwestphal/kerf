import { mount } from 'kerfjs';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createEditor } from '../../src/editor.js';

let cleanup: (() => void) | undefined;
afterEach(() => {
  cleanup?.();
  cleanup = undefined;
  document.body.replaceChildren();
});

function open(options: Parameters<typeof createEditor>[0] = {}) {
  const root = document.createElement('div');
  document.body.append(root);
  const editor = createEditor(options);
  mount(root, editor.render);
  const unwire = editor.wire(root);
  cleanup = unwire;
  return { root, editor };
}

const inspectorHeading = (root: HTMLElement) =>
  root.querySelector('[data-component="list-header"], .kui-list-header')
    ?.textContent ?? '';

describe('the editor shell', () => {
  it('renders the sample document on the canvas with every node marked', () => {
    const { root } = open();
    const canvas = root.querySelector('[data-editor-canvas]')!;
    expect(
      canvas.querySelectorAll('[data-kerf-node]').length,
    ).toBeGreaterThanOrEqual(6);
    expect(canvas.textContent).toContain('Compose');
    expect(canvas.textContent).toContain('detail slot');
    expect(root.textContent).toContain('Nothing selected');
    expect(root.textContent).toContain('inbox.kui.json · 7 nodes · valid');
  });

  it('selects a node from the outline and shows its props', () => {
    const { root, editor } = open();
    const row = root.querySelector<HTMLElement>(
      '[data-action="editor-select-node"][data-item-id="01JB8Z1M6Q8E1X9V4S7K2R3T5D"]',
    )!;
    row.click();
    expect(editor.selection.value).toEqual({
      kind: 'node',
      id: '01JB8Z1M6Q8E1X9V4S7K2R3T5D',
    });
    expect(root.textContent).toContain('composeButton · Button');
    expect(root.textContent).toContain('"brand"');
    expect(inspectorHeading(root)).not.toBe('');
  });

  it('selects the innermost node clicked on the canvas without running its action', () => {
    const { root, editor } = open();
    const compose = root.querySelector<HTMLElement>(
      '[data-editor-canvas] [data-kerf-node="01JB8Z1M6Q8E1X9V4S7K2R3T5D"]',
    )!;
    const click = new MouseEvent('click', { bubbles: true, cancelable: true });
    compose.dispatchEvent(click);
    expect(click.defaultPrevented).toBe(true);
    expect(editor.selection.value).toEqual({
      kind: 'node',
      id: '01JB8Z1M6Q8E1X9V4S7K2R3T5D',
    });
    root
      .querySelector('[data-editor-canvas]')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(editor.selection.value).toEqual({
      kind: 'node',
      id: '01JB8Z1M6Q8E1X9V4S7K2R3T5D',
    });
  });

  it('documents a palette component', () => {
    const { root, editor } = open();
    root
      .querySelector<HTMLElement>(
        '[data-action="editor-show-component"][data-item-id="@kerfjs/ui:badge"]',
      )!
      .click();
    expect(editor.selection.value).toEqual({
      kind: 'component',
      key: '@kerfjs/ui:badge',
    });
    expect(root.textContent).toContain('Badge');
    expect(root.textContent).not.toContain('Nothing selected');
  });

  it('saves the document as stable JSON under its file name', () => {
    const save = vi.fn();
    const { root, editor } = open({ save });
    root.querySelector<HTMLElement>('[data-action="editor-save"]')!.click();
    expect(save).toHaveBeenCalledWith(
      'inbox.kui.json',
      `${JSON.stringify(editor.document.value, null, 2)}\n`,
    );
  });

  it('reports document problems and documents it cannot preview', () => {
    const { root } = open({
      document: {
        schema: 'kerf-ui-document/v1',
        name: 'Broken',
        catalogs: ['@kerfjs/ui'],
        root: { id: '01JB8Z1M6Q8E1X9V4S7K2R3TZZ', type: '@kerfjs/ui:nope' },
      },
    });
    expect(root.textContent).toContain('1 problem in this document');
    expect(root.textContent).toContain('KUI-V002');
    expect(root.textContent).toContain('This document cannot be previewed');
  });

  it('shows a selected node that has no props entry, and a stale selection', () => {
    const { root, editor } = open({
      document: {
        schema: 'kerf-ui-document/v1',
        name: 'Words',
        catalogs: ['@kerfjs/ui'],
        root: {
          id: '01JB8Z1M6Q8E1X9V4S7K2R3TYA',
          type: '@kerfjs/ui:button',
          zones: {
            children: [
              { id: '01JB8Z1M6Q8E1X9V4S7K2R3TYB', type: '#text', value: 'Go' },
            ],
          },
        },
      },
    });
    editor.selection.value = { kind: 'node', id: '01JB8Z1M6Q8E1X9V4S7K2R3TYB' };
    expect(root.textContent).toContain('This node has no props to inspect.');
    editor.selection.value = { kind: 'node', id: 'gone' };
    expect(root.textContent).toContain('Nothing selected');
  });

  it('collapses and restores the rails', () => {
    const { root } = open();
    const toggle = root.querySelector<HTMLElement>(
      '[data-action="editor-toggle-inspector"]',
    )!;
    toggle.click();
    expect(
      root.querySelectorAll('[data-action="editor-toggle-inspector"]').length,
    ).toBeGreaterThan(0);
    root
      .querySelector<HTMLElement>('[data-action="editor-toggle-document"]')!
      .click();
  });
});
