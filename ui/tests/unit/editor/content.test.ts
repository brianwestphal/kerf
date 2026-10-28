// KF-YR91FA: a content prop holds literal text or nodes in its zone, never
// both; the inspector moves content between the two and validates `$css`
// against the builders a prop accepts.
import type { ViewDocument } from '@kerfjs/ui/view';
import { validateView } from '@kerfjs/ui/view';
import { mount } from 'kerfjs';
import { afterEach, describe, expect, it } from 'vitest';

import {
  contentOf,
  nodesToText,
  textToNodes,
} from '../../../src/editor/model/content.js';
import {
  cssHint,
  valueFromControl,
} from '../../../src/editor/model/controls.js';
import { findNode } from '../../../src/editor/model/document.js';
import sample from '../../fixtures/view/inbox.kui.json';
import { createEditor, viewCatalog } from './kerf-catalog.js';

const inbox = sample as unknown as ViewDocument;
const TOOLBAR = '01JB8Z1M6Q8E1X9V4S7K2R3T5B';
const COMPOSE = '01JB8Z1M6Q8E1X9V4S7K2R3T5D';
const FOLDERS = '01JB8Z1M6Q8E1X9V4S7K2R3T5E';
const TEXT_ID = '01JB8Z1M6Q8E1X9V4S7K2R3T7A';
const node = (document: ViewDocument, id = COMPOSE) =>
  findNode(document, id)!.node;
const valid = (document: ViewDocument) =>
  validateView(document, viewCatalog).diagnostics;

describe('content props', () => {
  it('reads text, nodes, and empty content', () => {
    expect(contentOf(node(inbox), 'children')).toEqual({
      kind: 'text',
      text: 'Compose',
    });
    expect(contentOf(node(inbox), 'icon')).toEqual({ kind: 'empty' });
    expect(contentOf(node(inbox, TOOLBAR), 'trailing')).toEqual({
      kind: 'nodes',
      count: 1,
    });
  });

  it('moves text into the zone and back, keeping the document valid', () => {
    const nodes = textToNodes(inbox, COMPOSE, 'children', () => TEXT_ID);
    expect(node(nodes).props).not.toHaveProperty('children');
    expect(node(nodes).zones).toEqual({
      children: [{ id: TEXT_ID, type: '#text', value: 'Compose' }],
    });
    expect(contentOf(node(nodes), 'children')).toEqual({
      kind: 'nodes',
      count: 1,
      text: 'Compose',
    });
    expect(valid(nodes)).toEqual([]);
    const text = nodesToText(nodes, COMPOSE, 'children');
    expect(text).toEqual(inbox);
  });

  it('leaves other content alone', () => {
    expect(textToNodes(inbox, COMPOSE, 'icon')).toBe(inbox);
    expect(textToNodes(inbox, 'missing', 'children')).toBe(inbox);
    expect(nodesToText(inbox, COMPOSE, 'children')).toBe(inbox);
    expect(nodesToText(inbox, TOOLBAR, 'trailing')).toBe(inbox);
    expect(nodesToText(inbox, 'missing', 'children')).toBe(inbox);
  });

  it('drops only the moved key when others remain', () => {
    const bare = {
      ...inbox,
      root: {
        id: COMPOSE,
        type: '@kerfjs/ui:button',
        props: { children: 'Go' },
      },
    } as unknown as ViewDocument;
    const nodes = textToNodes(bare, COMPOSE, 'children', () => TEXT_ID);
    expect(node(nodes)).not.toHaveProperty('props');
    const withIcon = {
      ...nodes,
      root: {
        ...nodes.root,
        zones: { ...nodes.root.zones, icon: [] },
      },
    } as ViewDocument;
    expect(node(nodesToText(withIcon, COMPOSE, 'children')).zones).toEqual({
      icon: [],
    });
    expect(node(nodesToText(nodes, COMPOSE, 'children'))).not.toHaveProperty(
      'zones',
    );
  });
});

describe('$css values', () => {
  const lengths = ['px', 'rem', 'space', 'lengthVar', 'calc'];

  it('accepts compositions whose outer builder the prop takes', () => {
    expect(
      valueFromControl('css', 'calc(plus(px(8), space("m")))', lengths),
    ).toEqual({ value: { $css: 'calc(plus(px(8), space("m")))' } });
    expect(valueFromControl('css', 'uiColor("x")', lengths)).toEqual({
      error:
        'This prop takes px(), rem(), space(), lengthVar(), or calc(), not uiColor().',
    });
    expect(valueFromControl('css', 'uiColor("x")', ['px'])).toEqual({
      error: 'This prop takes px(), not uiColor().',
    });
    expect(valueFromControl('css', 'uiColor("x")')).toEqual({
      value: { $css: 'uiColor("x")' },
    });
    expect(valueFromControl('css', '8px', lengths)).toHaveProperty('error');
  });

  it('hints at the builders a prop takes and how to compose them', () => {
    expect(cssHint(undefined)).toBe(
      'A css-values builder call, such as px(8) or space("m").',
    );
    expect(cssHint(lengths)).toBe(
      'Takes px(), rem(), space(), lengthVar(), or calc(). Combine lengths with calc(plus(px(8), space("m"))), or read an app variable with lengthVar("--app-gap", px(8)).',
    );
    expect(cssHint(['px', 'calc'])).toBe(
      'Takes px(), or calc(). Combine lengths with calc(plus(px(8), space("m"))).',
    );
    expect(cssHint(['uiColor'])).toBe('Takes uiColor().');
  });
});

describe('the inspector', () => {
  let cleanup: (() => void) | undefined;
  afterEach(() => {
    cleanup?.();
    cleanup = undefined;
    document.body.replaceChildren();
  });

  function open(id: string) {
    const root = document.createElement('div');
    document.body.append(root);
    const editor = createEditor();
    mount(root, editor.render);
    cleanup = editor.wire(root);
    editor.selection.value = { kind: 'node', id };
    return { root, editor };
  }
  const click = (root: HTMLElement, action: string) =>
    root.querySelector<HTMLElement>(`[data-action="${action}"]`)!.click();
  function choose(select: HTMLElement, value: string) {
    select.setAttribute('value', value);
    Object.defineProperty(select, 'value', { configurable: true, value });
    select.dispatchEvent(new Event('change', { bubbles: true }));
  }

  it('moves a label into nodes and back, with undo', () => {
    const { root, editor } = open(COMPOSE);
    click(root, 'editor-content-to-nodes');
    const compose = () => node(editor.document.value);
    expect(compose().zones?.children).toEqual([
      expect.objectContaining({ type: '#text', value: 'Compose' }),
    ]);
    expect(root.textContent).toContain(
      'Holds 1 node; select it in the outline.',
    );
    click(root, 'editor-content-to-text');
    expect(compose().props?.children).toBe('Compose');
    expect(compose()).not.toHaveProperty('zones');
    click(root, 'editor-undo');
    expect(compose().zones?.children).toHaveLength(1);
  });

  it('takes the label into the zone when a child is added to it', () => {
    const { root, editor } = open(COMPOSE);
    choose(root.querySelector('[data-editor-add="zone"]')!, 'children');
    choose(
      root.querySelector('[data-editor-add="component"]')!,
      '@kerfjs/ui:badge',
    );
    click(root, 'editor-add-child');
    const children = node(editor.document.value).zones?.children ?? [];
    expect(
      children.map((child) => ('type' in child ? child.type : '')),
    ).toEqual(['#text', '@kerfjs/ui:badge']);
    expect(node(editor.document.value).props).not.toHaveProperty('children');
    editor.selection.value = { kind: 'node', id: COMPOSE };
    expect(root.textContent).toContain(
      'Holds 2 nodes; select them in the outline.',
    );
    expect(
      root.querySelector('[data-action="editor-content-to-text"]'),
    ).toBeNull();
  });

  it('ignores content actions without a selected node', () => {
    const { root, editor } = open(COMPOSE);
    editor.selection.value = null;
    const before = editor.document.value;
    root.insertAdjacentHTML(
      'beforeend',
      '<button data-action="editor-content-to-nodes" data-editor-content="children"></button>' +
        '<button data-action="editor-content-to-text" data-editor-content="children"></button>',
    );
    click(root, 'editor-content-to-nodes');
    click(root, 'editor-content-to-text');
    expect(editor.document.value).toBe(before);
  });

  it('rejects a builder the prop does not take, and hints at the ones it does', () => {
    const { root, editor } = open(FOLDERS);
    const field = root.querySelector<HTMLElement>(
      '[data-editor-prop="maxHeight"]',
    )!;
    expect(field.textContent).toContain('Combine lengths with calc(');
    const input = field.querySelector('input')!;
    const before = editor.document.value;
    input.value = 'uiColor("surface")';
    input.dispatchEvent(new Event('change', { bubbles: true }));
    expect(editor.document.value).toBe(before);
    expect(root.textContent).toContain('not uiColor().');
    const next = root.querySelector<HTMLInputElement>(
      '[data-editor-prop="maxHeight"] input',
    )!;
    next.value = 'calc(plus(px(200), space("m")))';
    next.dispatchEvent(new Event('change', { bubbles: true }));
    expect(node(editor.document.value, FOLDERS).props?.maxHeight).toEqual({
      $css: 'calc(plus(px(200), space("m")))',
    });
    expect(valid(editor.document.value)).toEqual([]);
  });
});
