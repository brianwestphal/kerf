import { describe, expect, it } from 'vitest';

import { EditorFrame } from '../../src/components/surfaces/editor-frame/editor-frame.js';
import { rem } from '../../src/css-values.js';

function render(html: unknown): HTMLElement {
  const host = document.createElement('div');
  host.innerHTML = String(html);
  return host;
}

const source = (
  <textarea name="markdown-source" aria-label="Markdown Source">
    Recovered draft
  </textarea>
);

describe('EditorFrame', () => {
  it('places fixed toolbar above a native source without replacing its value', () => {
    const host = render(
      EditorFrame({
        label: 'Markdown Editor',
        mode: 'source',
        toolbar: <header data-toolbar>Editor Actions</header>,
        children: source,
      }),
    );
    const frame = host.querySelector<HTMLElement>('.kui-editor-frame')!;
    expect(frame.getAttribute('role')).toBe('region');
    expect(frame.getAttribute('aria-label')).toBe('Markdown Editor');
    expect(frame.dataset.mode).toBe('source');
    expect(frame.dataset.appearance).toBe('framed');
    expect(frame.dataset.inset).toBe('padded');
    expect(frame.dataset.expanded).toBe('false');
    expect(frame.firstElementChild?.className).toBe(
      'kui-editor-frame__toolbar',
    );
    expect(frame.lastElementChild?.className).toBe('kui-editor-frame__surface');
    expect(frame.querySelector('textarea')?.value).toBe('Recovered draft');
    expect(frame.querySelector('textarea')?.name).toBe('markdown-source');
  });

  it('supports embedded autosize, restored source height, and flush inset', () => {
    const host = render(
      EditorFrame({
        mode: 'source',
        appearance: 'embedded',
        inset: 'flush',
        sourceHeight: rem(12),
        sourceAutosize: true,
        children: source,
      }),
    );
    const frame = host.querySelector<HTMLElement>('.kui-editor-frame')!;
    expect(frame.querySelector('.kui-editor-frame__toolbar')).toBeNull();
    expect(frame.dataset.appearance).toBe('embedded');
    expect(frame.dataset.inset).toBe('flush');
    expect(frame.dataset.sourceAutosize).toBe('true');
    expect(frame.getAttribute('style')).toBe(
      '--_kui-editor-frame-source-height:12rem',
    );
    expect(frame.querySelector('textarea')?.value).toBe('Recovered draft');
  });

  it('keeps preview content and expanded dimensions in the same frame', () => {
    const host = render(
      EditorFrame({
        mode: 'preview',
        appearance: 'embedded',
        expanded: true,
        height: rem(20),
        maxWidth: rem(44),
        rootAttributes: {
          'data-key': 'editor-1',
          'data-component': 'spoofed',
        },
        slot: 'content',
        children: <article data-preview>Rendered markdown</article>,
      }),
    );
    const frame = host.querySelector<HTMLElement>('.kui-editor-frame')!;
    expect(frame.dataset.component).toBe('editor-frame');
    expect(frame.dataset.key).toBe('editor-1');
    expect(frame.dataset.mode).toBe('preview');
    expect(frame.dataset.expanded).toBe('true');
    expect(frame.getAttribute('slot')).toBe('content');
    expect(frame.getAttribute('style')).toBe(
      '--_kui-editor-frame-height:20rem;--_kui-editor-frame-max-width:44rem',
    );
    expect(frame.querySelector('[data-preview]')?.textContent).toBe(
      'Rendered markdown',
    );
    expect(frame.querySelector('textarea')).toBeNull();
  });

  it('rejects an unsafe length before rendering an inline style', () => {
    expect(() =>
      EditorFrame({
        mode: 'source',
        height: '20rem;background:red' as ReturnType<typeof rem>,
        children: source,
      }),
    ).toThrow('EditorFrame height requires one CSS length.');
  });
});
