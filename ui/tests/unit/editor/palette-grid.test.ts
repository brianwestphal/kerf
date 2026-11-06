// KF-JC7WTW: the Components area shows a list of names or a grid of tiles,
// each a live thumbnail of its component as added, a sketch of a layout, or
// an icon; the choice persists.
import { mount } from 'kerfjs';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { wirePaletteThumbnails } from '../../../src/editor/palette-thumbnails.js';
import { createEditor } from './kerf-catalog.js';

const VIEW_KEY = 'kerf-ui-editor:palette-view';

let cleanup: (() => void) | undefined;
afterEach(() => {
  cleanup?.();
  cleanup = undefined;
  document.body.replaceChildren();
  window.localStorage.clear();
});

function open() {
  const root = window.document.createElement('div');
  window.document.body.append(root);
  const editor = createEditor({});
  const stopMount = mount(root, editor.render);
  const unwireEditor = editor.wire(root);
  cleanup = () => {
    unwireEditor();
    stopMount();
  };
  root
    .querySelector<HTMLElement>(
      '[role="tab"][data-tab-id="editor-document-areas-components"]',
    )!
    .click();
  return { root, editor };
}

const tile = (root: HTMLElement, key: string) =>
  root.querySelector<HTMLElement>(`[data-editor-palette="${key}"]`)!;
const segment = (root: HTMLElement, value: 'list' | 'grid') =>
  root.querySelector<HTMLElement>(
    `[data-segmented-control-id="editor-palette-view"] [data-segment-value="${value}"]`,
  )!;

describe('palette grid view', () => {
  it('starts as a list and switches to tiles, remembering the choice', () => {
    const { root } = open();
    expect(tile(root, '@kerfjs/ui:badge').matches('.kui-list-item')).toBe(true);
    expect(root.querySelector('.kui-editor__palette-thumb')).toBeNull();
    segment(root, 'grid').click();
    const badge = tile(root, '@kerfjs/ui:badge');
    expect(badge.matches('.kui-content-item')).toBe(true);
    expect(badge.textContent).toContain('Badge');
    expect(window.localStorage.getItem(VIEW_KEY)).toBe('grid');
    // A new editor opens on the grid.
    cleanup!();
    document.body.replaceChildren();
    const again = open();
    expect(
      tile(again.root, '@kerfjs/ui:badge').matches('.kui-content-item'),
    ).toBe(true);
    segment(again.root, 'list').click();
    expect(window.localStorage.getItem(VIEW_KEY)).toBe('list');
    expect(tile(again.root, '@kerfjs/ui:badge').matches('.kui-list-item')).toBe(
      true,
    );
  });

  it('selects a component from its tile and narrows tiles by the filter', () => {
    const { root, editor } = open();
    segment(root, 'grid').click();
    tile(root, '@kerfjs/ui:switch').click();
    expect(editor.selection.value).toEqual({
      kind: 'component',
      key: '@kerfjs/ui:switch',
    });
    expect(
      tile(root, '@kerfjs/ui:switch').getAttribute('aria-pressed') ??
        tile(root, '@kerfjs/ui:switch').getAttribute('aria-selected'),
    ).toBe('true');
    // The filter's editor is contenteditable (KF-PR8MA6).
    const filter = root.querySelector<HTMLElement>(
      '[data-editor-palette-filter]',
    )!;
    filter.textContent = 'swit';
    filter.dispatchEvent(new Event('input', { bubbles: true }));
    const keys = [
      ...root.querySelectorAll<HTMLElement>('[data-editor-palette]'),
    ].map((element) => element.dataset.editorPalette);
    expect(keys).toEqual(['@kerfjs/ui:switch']);
  });

  it('sketches layouts, shows icons for blank components, and renders the rest live', async () => {
    const { root } = open();
    segment(root, 'grid').click();
    // A layout draws a sketch, not a thumbnail.
    const workbench = tile(root, '@kerfjs/ui:workbench');
    expect(workbench.querySelector('.kui-editor__palette-thumb svg')).not.toBe(
      null,
    );
    expect(workbench.querySelector('[data-editor-palette-thumb]')).toBeNull();
    // An icon with no name shows a stand-in icon.
    const icon = tile(root, '@kerfjs/ui:lucide-icon');
    expect(icon.querySelector('[data-editor-palette-thumb]')).toBeNull();
    expect(icon.querySelector('svg')).not.toBeNull();
    // A control renders as added, in its tile's shadow root.
    const host = tile(root, '@kerfjs/ui:badge').querySelector<HTMLElement>(
      '[data-editor-palette-thumb]',
    )!;
    expect(host.inert).toBe(true);
    // Tiles fill as they appear.
    await vi.waitFor(() => expect(host.shadowRoot).not.toBeNull());
    const stage = host.shadowRoot!.querySelector('[data-thumb-stage]')!;
    expect(stage.querySelector('.kui-badge')).not.toBeNull();
    // Its ids and markers stay out of the editor's own queries.
    expect(root.querySelector('[data-thumb-stage]')).toBeNull();
    // Nothing lays out here, so the fallback icon shows.
    await vi.waitFor(() =>
      expect(host.hasAttribute('data-thumb-empty')).toBe(true),
    );
    expect(host.shadowRoot!.querySelector('slot')!.hidden).toBe(false);
  });
});

describe('wirePaletteThumbnails', () => {
  const size = (element: Element, sizes: Record<string, number>) => {
    for (const [name, value] of Object.entries(sizes))
      Object.defineProperty(element, name, { value, configurable: true });
  };

  it('scales a thumbnail to fit its tile, centered, never past its size', async () => {
    const root = document.createElement('div');
    root.innerHTML = '<div data-editor-palette-thumb="wide">Fallback</div>';
    document.body.append(root);
    const host = root.firstElementChild as HTMLElement;
    size(host, { clientWidth: 112, clientHeight: 84 });
    const stop = wirePaletteThumbnails(root, {
      htmlOf: (key) => `<div class="thumb-${key}">${key}</div>`,
    });
    const content = host.shadowRoot!.querySelector<HTMLElement>('.thumb-wide')!;
    size(content, {
      offsetWidth: 200,
      offsetHeight: 50,
      offsetLeft: 10,
      offsetTop: 57.5,
      scrollWidth: 200,
      scrollHeight: 50,
    });
    const stage =
      host.shadowRoot!.querySelector<HTMLElement>('[data-thumb-stage]')!;
    // (112 - 12) / 200 = 0.5; its center (110, 82.5) lands on (56, 42).
    await vi.waitFor(() =>
      expect(stage.style.transform).toBe('translate(1px, 0.75px) scale(0.5)'),
    );
    expect(host.hasAttribute('data-thumb-empty')).toBe(false);
    expect(stage.style.visibility).toBe('');
    expect(host.shadowRoot!.querySelector('slot')!.hidden).toBe(true);
    // Filled once: a repeated scan leaves it alone.
    host.setAttribute('data-other', '');
    expect(host.shadowRoot!.querySelector('.thumb-wide')).toBe(content);
    // A small control keeps its own size.
    size(content, {
      offsetWidth: 40,
      offsetHeight: 20,
      scrollWidth: 40,
      scrollHeight: 20,
      offsetLeft: 90,
      offsetTop: 72.5,
    });
    host.dataset.editorPaletteThumb = 'small';
    await vi.waitFor(() =>
      expect(host.shadowRoot!.querySelector('.thumb-small')).not.toBeNull(),
    );
    stop();
  });

  it('keeps the fallback for a component with no thumbnail', () => {
    const root = document.createElement('div');
    root.innerHTML = '<div data-editor-palette-thumb="none">Fallback</div>';
    document.body.append(root);
    const stop = wirePaletteThumbnails(root, { htmlOf: () => undefined });
    const host = root.firstElementChild as HTMLElement;
    expect(host.hasAttribute('data-thumb-empty')).toBe(true);
    expect(host.shadowRoot!.querySelector('slot')!.hidden).toBe(false);
    stop();
  });
});
