import { mount } from 'kerfjs';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createEditor } from './kerf-catalog.js';

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

  // KF-X2YQZE: counts of one read in the singular.
  it('writes one node and one problem in the singular', () => {
    const { root, editor } = open();
    const button = (props: Record<string, unknown>) => ({
      schema: 'kerf-ui-document/v1',
      name: 'Greeting',
      catalogs: ['@kerfjs/ui'],
      root: {
        id: '01JB8Z1M6Q8E1X9V4S7K2R3TXA',
        type: '@kerfjs/ui:button',
        props,
      },
    });
    editor.document.value = button({ children: 'Hi' }) as never;
    expect(root.textContent).toContain('greeting.kui.json · 1 node · valid');
    editor.document.value = button({ children: 'Hi', tone: 'loud' }) as never;
    expect(root.textContent).toContain('1 node · 1 problem');
    expect(root.textContent).not.toContain('1 problems');
  });

  // KF-QSSTMX: without storage, New simply replaces the document.
  it('starts a new empty document from New', () => {
    const { root, editor } = open();
    root.querySelector<HTMLElement>('[data-action="editor-new"]')!.click();
    expect(editor.document.value).toMatchObject({
      name: 'Untitled',
      root: { type: '@kerfjs/ui:pane' },
    });
    expect(root.textContent).toContain('untitled.kui.json · 1 node · valid');
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
    expect(
      root.querySelector('[data-editor-prop="tone"]')?.getAttribute('value'),
    ).toBe('brand');
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

  it('exports the view module and reports contract changes since the last export', () => {
    const save = vi.fn();
    const { root, editor } = open({ save });
    const exportItem = (action: string) =>
      root.querySelector<HTMLElement>(`[data-action="${action}"]`)!;
    exportItem('editor-export-module').click();
    expect(save).toHaveBeenLastCalledWith(
      'inbox.view.ts',
      expect.stringContaining('export function renderInbox'),
    );
    expect(root.textContent).toContain('Exported the view module');
    exportItem('editor-export-declarations').click();
    expect(save).toHaveBeenLastCalledWith(
      'inbox.view.ts',
      expect.not.stringContaining('renderInbox'),
    );
    expect(root.textContent).toContain('the contract is unchanged');
    const next = globalThis.structuredClone(
      editor.document.value,
    ) as unknown as {
      root: {
        zones: {
          header: {
            zones: { trailing: { props: Record<string, unknown> }[] };
          }[];
        };
      };
    };
    next.root.zones.header[0]!.zones.trailing[0]!.props.action = {
      $action: 'send',
    };
    editor.document.value = next as never;
    exportItem('editor-export-module').click();
    expect(root.textContent).toContain(
      'Exported with 2 contract changes, 2 breaking',
    );
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

  it('reports document problems and previews a placeholder for the broken node', () => {
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
    expect(root.textContent).toContain('@kerfjs/ui:nope cannot render');
    expect(
      root.querySelector(
        '[data-editor-canvas] [data-kerf-node="01JB8Z1M6Q8E1X9V4S7K2R3TZZ"]',
      ),
    ).not.toBeNull();
  });

  it('previews a content param with no default as its name', () => {
    const { root } = open({
      document: {
        schema: 'kerf-ui-document/v1',
        name: 'Titled',
        catalogs: ['@kerfjs/ui'],
        params: { pageTitle: { type: { kind: 'content' } } },
        root: {
          id: '01JB8Z1M6Q8E1X9V4S7K2R3TP3',
          type: '@kerfjs/ui:text',
          props: { children: { $param: 'pageTitle' } },
        },
      } as never,
    });
    expect(root.querySelector('[data-editor-canvas]')!.textContent).toContain(
      'Page Title',
    );
  });

  it('shows an empty container as a placeholder that selects it and takes a drop (KF-ZWJHJR)', () => {
    const PANE = '01JB8Z1M6Q8E1X9V4S7K2R3TP0';
    const ROW = '01JB8Z1M6Q8E1X9V4S7K2R3TP1';
    const { root, editor } = open({
      document: {
        schema: 'kerf-ui-document/v1',
        name: 'Empty',
        catalogs: ['@kerfjs/ui'],
        root: {
          id: PANE,
          type: '@kerfjs/ui:pane',
          zones: {
            content: [
              { id: ROW, type: '@kerfjs/ui:row' },
              {
                id: '01JB8Z1M6Q8E1X9V4S7K2R3TP2',
                type: '@kerfjs/ui:button',
                props: { children: 'Has a label' },
              },
            ],
          },
        },
      } as never,
    });
    const canvas = root.querySelector('[data-editor-canvas]')!;
    const empties = canvas.querySelectorAll<HTMLElement>('[data-editor-empty]');
    // Only the Row is empty: the Pane holds nodes, the Button has a label.
    expect(empties).toHaveLength(1);
    expect(empties[0]!.textContent).toBe(
      'Row is empty — drag a component here',
    );
    expect(
      empties[0]!.closest('[data-kerf-node]')?.getAttribute('data-kerf-node'),
    ).toBe(ROW);
    empties[0]!.click();
    expect(editor.selection.value).toEqual({ kind: 'node', id: ROW });
    // The placeholder is preview-only: the document and its count are unchanged.
    expect(editor.document.value.root.zones!.content![0]).not.toHaveProperty(
      'zones',
    );
    expect(root.textContent).toContain('3 nodes');
  });

  it('lists problems, marks their nodes in the outline, and selects one', () => {
    const document = globalThis.structuredClone(
      createEditor().document.value,
    ) as unknown as {
      root: {
        zones: {
          header: {
            zones: { trailing: { props: Record<string, unknown> }[] };
          }[];
        };
      };
      params: Record<string, unknown>;
    };
    document.root.zones.header[0]!.zones.trailing[0]!.props.tone = 'purple';
    document.params.bad = { type: { kind: 'map' } };
    const { root, editor } = open({ document: document as never });
    const rows = root.querySelectorAll<HTMLElement>(
      '[data-action="editor-select-problem"]',
    );
    expect(rows).toHaveLength(2);
    // A document-level problem has no node to select.
    expect(rows[0]!.matches(':disabled, [aria-disabled="true"]')).toBe(true);
    rows[1]!.click();
    expect(editor.selection.value).toEqual({
      kind: 'node',
      id: '01JB8Z1M6Q8E1X9V4S7K2R3T5D',
    });
    const outlineRow = root.querySelector(
      '[data-action="editor-select-node"][data-item-id="01JB8Z1M6Q8E1X9V4S7K2R3T5D"]',
    )!;
    expect(
      outlineRow.closest('[data-component], li, .kui-list-item')?.textContent,
    ).toContain('1');
    expect(root.textContent).toContain('2 problems in this document');
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
