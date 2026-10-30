// KF-MHY1GB: each rail switches between its focus areas with a segmented tab
// strip; only the current area's panel shows, and the choice persists.
import type { ViewDocument } from '@kerfjs/ui/view';
import { mount } from 'kerfjs';
import { afterEach, describe, expect, it } from 'vitest';

import { createEditor } from './kerf-catalog.js';

const COMPOSE = '01JB8Z1M6Q8E1X9V4S7K2R3T5D';
const FOLDERS = '01JB8Z1M6Q8E1X9V4S7K2R3T5E';

let cleanup: (() => void) | undefined;
afterEach(() => {
  cleanup?.();
  cleanup = undefined;
  document.body.replaceChildren();
});

function open(document?: ViewDocument) {
  const root = window.document.createElement('div');
  window.document.body.append(root);
  const editor = createEditor(document ? { document } : {});
  mount(root, editor.render);
  cleanup = editor.wire(root);
  return { root, editor };
}

const tab = (root: HTMLElement, strip: string, area: string) =>
  root.querySelector<HTMLElement>(
    `[role="tab"][data-tab-id="${strip}-${area}"]`,
  )!;
const panel = (root: HTMLElement, strip: string, area: string) =>
  root.querySelector<HTMLElement>(`#${strip}-${area}-panel`)!;

describe('document rail areas', () => {
  const strip = 'editor-document-areas';

  it('starts on the outline and switches to components and problems', () => {
    const { root } = open();
    expect(tab(root, strip, 'outline').getAttribute('aria-selected')).toBe(
      'true',
    );
    expect(panel(root, strip, 'outline').hidden).toBe(false);
    expect(panel(root, strip, 'components').hidden).toBe(true);
    tab(root, strip, 'components').click();
    expect(panel(root, strip, 'components').hidden).toBe(false);
    expect(panel(root, strip, 'outline').hidden).toBe(true);
    expect(
      root.querySelector(`#${strip}-components-panel [data-editor-palette]`),
    ).not.toBeNull();
    tab(root, strip, 'problems').click();
    expect(panel(root, strip, 'problems').textContent).toContain('No problems');
    // A valid document's Problems tab carries no count.
    expect(
      tab(root, strip, 'problems')
        .closest('[role="presentation"], .kui-tab-bar-item')
        ?.querySelector('.kui-badge'),
    ).toBeNull();
  });

  it('filters the components by name or category (KF-Y26SKM)', () => {
    const { root } = open();
    tab(root, strip, 'components').click();
    const components = panel(root, strip, 'components');
    const names = () =>
      [
        ...components.querySelectorAll<HTMLElement>('[data-editor-palette]'),
      ].map((row) => row.textContent!.trim());
    const headers = () =>
      [...components.querySelectorAll('[data-component="list-header"]')].map(
        (header) => header.textContent!.trim(),
      );
    // KF-PR8MA6: the filter sits in the rail's pinned header, not the panel.
    const editor = () =>
      root.querySelector<HTMLElement>('[data-editor-palette-filter]')!;
    expect(components.contains(editor())).toBe(false);
    const filter = (text: string) => {
      editor().textContent = text;
      editor().dispatchEvent(new Event('input', { bubbles: true }));
    };
    const all = names().length;
    expect(all).toBeGreaterThan(20);

    filter('  BADGE ');
    expect(names()).toEqual(['Badge']);
    expect(headers()).toHaveLength(1);

    // A category name keeps its whole group.
    const category = headers()[0]!;
    filter(category);
    expect(headers()).toContain(category);
    expect(names().length).toBeGreaterThan(1);

    filter('zzz-no-such');
    expect(names()).toEqual([]);
    expect(components.textContent).toContain('No matching components');

    // Clear empties the field, rebuilds its editor, and lists everything.
    const before = editor();
    root
      .querySelector<HTMLElement>(
        '[data-action="editor-clear-palette-filter"]',
      )!
      .click();
    expect(names()).toHaveLength(all);
    expect(editor()).not.toBe(before);
    expect(editor().textContent).toBe('');
    expect(
      root.querySelector('[data-action="editor-clear-palette-filter"]'),
    ).toBeNull();
    // Only the Components area shows the filter.
    tab(root, strip, 'outline').click();
    expect(root.querySelector('[data-editor-palette-filter]')).toBeNull();
  });

  it('counts problems on the tab and lists them in its panel', () => {
    const { root, editor } = open();
    editor.selection.value = { kind: 'node', id: COMPOSE };
    const broken = globalThis.structuredClone(
      editor.document.value,
    ) as ViewDocument & {
      root: {
        zones: { header: { zones: { trailing: { props: object }[] } }[] };
      };
    };
    broken.root.zones.header[0]!.zones.trailing[0]!.props = { tone: 'loud' };
    editor.document.value = broken;
    const problems = tab(root, strip, 'problems').closest('.kui-tab-bar-item')!;
    expect(problems.textContent).toMatch(/^Problems\d+$/);
    tab(root, strip, 'problems').click();
    expect(
      panel(root, strip, 'problems').querySelector(
        '[data-action="editor-select-problem"]',
      ),
    ).not.toBeNull();
  });
});

describe('inspector areas', () => {
  const strip = 'editor-inspector-areas';

  it('splits a node into properties, flow, and children, and keeps the area across selections', () => {
    const { root, editor } = open();
    editor.selection.value = { kind: 'node', id: COMPOSE };
    expect(panel(root, strip, 'properties').hidden).toBe(false);
    expect(
      panel(root, strip, 'properties').querySelector('[data-editor-name]'),
    ).not.toBeNull();
    expect(panel(root, strip, 'flow').textContent).toContain('Show');
    expect(
      panel(root, strip, 'children').querySelector('[data-editor-add]') ??
        panel(root, strip, 'children').textContent,
    ).toBeTruthy();
    tab(root, strip, 'flow').click();
    expect(panel(root, strip, 'flow').hidden).toBe(false);
    expect(panel(root, strip, 'properties').hidden).toBe(true);
    editor.selection.value = { kind: 'node', id: FOLDERS };
    expect(tab(root, strip, 'flow').getAttribute('aria-selected')).toBe('true');
    expect(panel(root, strip, 'flow').hidden).toBe(false);
    tab(root, strip, 'children').click();
    expect(
      panel(root, strip, 'children').querySelector('[data-editor-add="zone"]'),
    ).not.toBeNull();
    // Adding a child selects it on its Properties.
    root
      .querySelector<HTMLElement>('[data-action="editor-add-child"]')!
      .click();
    expect(tab(root, strip, 'properties').getAttribute('aria-selected')).toBe(
      'true',
    );
  });

  it('shows no tabs for a component or an empty selection', () => {
    const { root, editor } = open();
    expect(root.querySelector(`#${strip}`)).toBeNull();
    editor.selection.value = { kind: 'component', key: '@kerfjs/ui:badge' };
    expect(root.querySelector(`#${strip}`)).toBeNull();
  });

  it('moves between areas with the arrow keys, and never reorders them', () => {
    const { root } = open();
    const outline = tab(root, 'editor-document-areas', 'outline');
    outline.focus();
    outline.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }),
    );
    expect(
      tab(root, 'editor-document-areas', 'components').getAttribute(
        'aria-selected',
      ),
    ).toBe('true');
    // Even a tab made draggable keeps its place: the editor ignores reorders.
    const components = tab(root, 'editor-document-areas', 'components');
    components.closest('.kui-tab-bar-item')!.setAttribute('draggable', 'true');
    components.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'ArrowLeft',
        altKey: true,
        shiftKey: true,
        bubbles: true,
      }),
    );
    expect(
      [
        ...root.querySelectorAll(
          '[role="tab"][data-tab-id^="editor-document-areas-"]',
        ),
      ].map((item) => item.textContent),
    ).toEqual(['Outline', 'Components', 'Problems']);
  });
});
