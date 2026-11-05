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
  const stopMount = mount(root, editor.render);
  const unwire = editor.wire(root);
  cleanup = () => {
    unwire();
    stopMount();
  };
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
  // KF-PK3GVY: New has no root; the first component chosen becomes it.
  it('starts a new rootless document from New and makes the first pick its root', () => {
    const { root, editor } = open();
    root.querySelector<HTMLElement>('[data-action="editor-new"]')!.click();
    expect(editor.document.value).toEqual({
      schema: 'kerf-ui-document/v1',
      name: 'Untitled',
      catalogs: ['@kerfjs/ui'],
    });
    expect(root.textContent).toContain(
      'untitled.kui.json · 0 nodes · 1 problem',
    );
    expect(root.textContent).toContain('KUI-V017');
    // The empty canvas says what it needs; no problems banner repeats it.
    expect(root.textContent).not.toContain('problem in this document');
    // The canvas asks for the first component; the Outline points there.
    const canvas = root.querySelector('[data-editor-canvas]')!;
    const empty = canvas.querySelector<HTMLElement>(
      '[data-editor-empty="root"]',
    )!;
    expect(empty.textContent).toContain('Start with a component');
    expect(root.querySelector('#editor-outline')).toBeNull();
    expect(root.textContent).toContain('No components yet');
    // The picker starts on a Pane, which becomes a filling root.
    const picker = empty.querySelector<HTMLElement>(
      '[data-editor-root="component"]',
    )!;
    expect(picker.getAttribute('value')).toBe('@kerfjs/ui:pane');
    // Clicking the picker is the editor's own control, not a canvas pick.
    const press = new MouseEvent('click', { bubbles: true, cancelable: true });
    picker.dispatchEvent(press);
    expect(press.defaultPrevented).toBe(false);
    empty
      .querySelector<HTMLElement>('[data-action="editor-first-root"]')!
      .click();
    const first = editor.document.value.root!;
    expect(first).toMatchObject({
      type: '@kerfjs/ui:pane',
      // KF-Z70DBC: a root Pane fills the screen in apps and play mode.
      props: { fill: true },
    });
    expect(editor.selection.value).toEqual({ kind: 'node', id: first.id });
    expect(root.textContent).toContain('untitled.kui.json · 1 node · valid');
    expect(root.querySelector('[data-editor-empty="root"]')).toBeNull();
    // One undo goes back to the rootless document.
    root.querySelector<HTMLElement>('[data-action="editor-undo"]')!.click();
    expect(editor.document.value.root).toBeUndefined();
    // Another component chosen in the picker becomes the root as it is.
    const again = root.querySelector<HTMLElement>(
      '[data-editor-empty="root"] [data-editor-root="component"]',
    )!;
    again.setAttribute('value', '@kerfjs/ui:nav-stack');
    Object.defineProperty(again, 'value', {
      configurable: true,
      value: '@kerfjs/ui:nav-stack',
    });
    again.dispatchEvent(new Event('change', { bubbles: true }));
    root
      .querySelector<HTMLElement>('[data-action="editor-first-root"]')!
      .click();
    expect(editor.document.value.root!.type).toBe('@kerfjs/ui:nav-stack');
    expect(editor.document.value.root!.props?.fill).toBeUndefined();
  });

  it('plays and lists problems for a rootless document without throwing', () => {
    const { root, editor } = open();
    root.querySelector<HTMLElement>('[data-action="editor-new"]')!.click();
    root.querySelector<HTMLElement>('[data-action="editor-play"]')!.click();
    expect(editor.document.value.root).toBeUndefined();
    root
      .querySelector<HTMLElement>('[data-action="editor-play-done"]')!
      .click();
    expect(root.querySelector('[data-editor-empty="root"]')).not.toBeNull();
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
    const [file, text] = save.mock.calls[0] as [string, string];
    expect(file).toBe('inbox.kui.json');
    // KF-YJFMZY: two-space JSON of the document, its props in declared order.
    expect(JSON.parse(text)).toEqual(editor.document.value);
    expect(text).toBe(`${JSON.stringify(JSON.parse(text), null, 2)}\n`);
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

  it('lists the selected node’s problems in its Inspector and marks the fields (KF-H782W9)', () => {
    const FIELD = '01JB8Z1M6Q8E1X9V4S7K2R3TP4';
    const { root, editor } = open({
      document: {
        schema: 'kerf-ui-document/v1',
        name: 'Unlabeled',
        catalogs: ['@kerfjs/ui'],
        root: {
          id: '01JB8Z1M6Q8E1X9V4S7K2R3TP5',
          type: '@kerfjs/ui:list',
          zones: {
            children: [
              {
                id: FIELD,
                type: '@kerfjs/ui:text-field',
                props: { placeholder: 'Search', size: 'huge' },
              },
            ],
          },
        },
      } as never,
    });
    editor.selection.value = { kind: 'node', id: FIELD };
    const banners = [
      ...root.querySelectorAll<HTMLElement>('[data-editor-node-problem]'),
    ].map((banner) => banner.textContent);
    expect(banners.join()).toContain('set "label" or "ariaLabel"');
    expect(banners).toHaveLength(2);
    // The fields the hint names say so; a prop's own problem marks it.
    const label = root.querySelector('[data-editor-prop="label"]')!;
    expect(label.textContent).toContain('To fix: set "label" or "ariaLabel"');
    // Another node shows none.
    editor.selection.value = {
      kind: 'node',
      id: '01JB8Z1M6Q8E1X9V4S7K2R3TP5',
    };
    expect(root.querySelector('[data-editor-node-problem]')).toBeNull();
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
    expect(editor.document.value.root!.zones!.content![0]).not.toHaveProperty(
      'zones',
    );
    expect(root.textContent).toContain('3 nodes');
  });

  it('shows an icon-only button as complete until it is selected (KF-6EV4Q5)', () => {
    const BUTTON = '01JB8Z1M6Q8E1X9V4S7K2R3TP4';
    const { root, editor } = open({
      document: {
        schema: 'kerf-ui-document/v1',
        name: 'Icon Button',
        catalogs: ['@kerfjs/ui'],
        root: {
          id: '01JB8Z1M6Q8E1X9V4S7K2R3TP3',
          type: '@kerfjs/ui:pane',
          zones: {
            content: [
              {
                id: BUTTON,
                type: '@kerfjs/ui:button',
                props: { ariaLabel: 'Refresh' },
                zones: {
                  icon: [
                    {
                      id: '01JB8Z1M6Q8E1X9V4S7K2R3TP5',
                      type: '@kerfjs/ui:lucide-icon',
                      props: {
                        icon: { $icon: 'refresh-cw' },
                        name: 'refresh-cw',
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
      } as never,
    });
    const empties = () =>
      root.querySelectorAll('[data-editor-canvas] [data-editor-empty]');
    expect(empties()).toHaveLength(0);
    // Selected, its label zone still takes a drop.
    editor.selection.value = { kind: 'node', id: BUTTON };
    expect(empties()).toHaveLength(1);
    expect(empties()[0]!.textContent).toBe(
      'Button is empty — drag a component here',
    );
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
              { id: '01JB8Z1M6Q8E1X9V4S7K2R3TYC', type: '@acme:widget' },
            ],
          },
        },
      },
    });
    // KF-YBMVVM: a text run edits its text.
    editor.selection.value = { kind: 'node', id: '01JB8Z1M6Q8E1X9V4S7K2R3TYB' };
    expect(
      root.querySelector('[data-editor-text-run] input')?.getAttribute('value'),
    ).toBe('Go');
    editor.selection.value = { kind: 'node', id: '01JB8Z1M6Q8E1X9V4S7K2R3TYC' };
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
