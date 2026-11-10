import { afterEach, describe, expect, it, vi } from 'vitest';

import { wirePaletteThumbnails } from '../../../src/editor/palette-thumbnails.js';

const stops: (() => void)[] = [];
afterEach(() => {
  while (stops.length) stops.pop()!();
  document.body.replaceChildren();
  vi.restoreAllMocks();
});
const size = (element: Element, values: Record<string, number | undefined>) => {
  for (const [name, value] of Object.entries(values))
    Object.defineProperty(element, name, { configurable: true, value });
};
const rect = (left: number, top: number, width: number, height: number) =>
  ({
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
    x: left,
    y: top,
    toJSON() {},
  }) as DOMRect;
function fixture(html: string, fitOf?: () => 'fill') {
  const root = document.createElement('div');
  root.innerHTML = '<div data-editor-palette-thumb="sample">Icon</div>';
  document.body.append(root);
  const host = root.firstElementChild as HTMLElement;
  size(host, { clientWidth: 100, clientHeight: 80 });
  const htmlOf = vi.fn(() => html);
  const stop = wirePaletteThumbnails(root, { htmlOf, fitOf });
  stops.push(stop);
  const stage =
    host.shadowRoot!.querySelector<HTMLElement>('[data-thumb-stage]')!;
  return { root, host, stage, stop, htmlOf };
}

describe('thumbnail geometry and lifecycle', () => {
  it('fits every visual root of a fragment rather than clipping later roots', async () => {
    const f = fixture('<div class="one"></div><div class="two"></div>');
    size(f.stage.children[0], {
      offsetLeft: 0,
      offsetTop: 0,
      offsetWidth: 50,
      offsetHeight: 20,
    });
    size(f.stage.children[1], {
      offsetLeft: 60,
      offsetTop: 30,
      offsetWidth: 80,
      offsetHeight: 20,
    });
    await vi.waitFor(() =>
      expect(f.stage.style.transform).toContain('scale(0.6285714285714286)'),
    );
    expect(f.host.hasAttribute('data-thumb-empty')).toBe(false);
  });
  it('measures SVG roots without HTMLElement offset properties and preserves fill geometry', async () => {
    const f = fixture('<svg viewBox="0 0 96 72"></svg>', () => 'fill');
    const svg = f.stage.firstElementChild!;
    size(svg, { offsetLeft: undefined, offsetTop: undefined });
    vi.spyOn(svg, 'getBoundingClientRect').mockReturnValue(rect(0, 0, 100, 80));
    await vi.waitFor(() => expect(f.stage.style.visibility).toBe(''));
    expect(f.stage.style.transform).toBe('');
    expect(f.stage.style.width).toBe('100%');
    expect(f.stage.style.height).toBe('100%');
    expect(f.host.shadowRoot!.querySelector('slot')!.hidden).toBe(true);
  });
  it('fits static text renderer output through its text range', async () => {
    const original = document.createRange.bind(document);
    vi.spyOn(document, 'createRange').mockImplementation(() => {
      const range = original();
      range.getBoundingClientRect = () => rect(10, 20, 40, 12);
      return range;
    });
    const f = fixture('Plain sample text');
    await vi.waitFor(() =>
      expect(f.stage.style.transform).toBe('translate(20px, 14px) scale(1)'),
    );
  });
  it('refits loaded assets and content resize notifications', async () => {
    const callbacks: ResizeObserverCallback[] = [];
    const observe = vi.fn(),
      unobserve = vi.fn(),
      disconnect = vi.fn();
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: ResizeObserverCallback) {
          callbacks.push(callback);
        }
        observe = observe;
        unobserve = unobserve;
        disconnect = disconnect;
      },
    );
    try {
      const f = fixture('<img src="preview.svg">');
      const img = f.stage.firstElementChild!;
      await vi.waitFor(() =>
        expect(f.host.hasAttribute('data-thumb-empty')).toBe(true),
      );
      size(img, {
        offsetWidth: 40,
        offsetHeight: 30,
        offsetLeft: 0,
        offsetTop: 0,
      });
      img.dispatchEvent(new Event('load'));
      await vi.waitFor(() =>
        expect(f.stage.style.transform).toBe('translate(30px, 25px) scale(1)'),
      );
      expect(observe).toHaveBeenCalledWith(img);
      size(img, { offsetWidth: 60 });
      callbacks[0](
        [{ target: img } as ResizeObserverEntry],
        {} as ResizeObserver,
      );
      await vi.waitFor(() =>
        expect(f.stage.style.transform).toBe('translate(20px, 25px) scale(1)'),
      );
      f.host.remove();
      await vi.waitFor(() => expect(unobserve).toHaveBeenCalledWith(img));
      expect(unobserve).toHaveBeenCalledWith(f.host);
      callbacks[0](
        [{ target: img } as ResizeObserverEntry],
        {} as ResizeObserver,
      );
      f.root.append(f.host);
      await vi.waitFor(() => expect(f.htmlOf).toHaveBeenCalledTimes(2));
      f.stop();
      expect(disconnect).toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });
  it('cancels pending frames when hosts change or owners dispose', async () => {
    const callbacks: FrameRequestCallback[] = [];
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      callbacks.push(callback);
      return callbacks.length;
    });
    const cancel = vi
      .spyOn(window, 'cancelAnimationFrame')
      .mockImplementation(() => {});
    const f = fixture('<div>Sample</div>');
    f.stage.firstElementChild!.dispatchEvent(new Event('load'));
    expect(cancel).toHaveBeenCalledWith(1);
    f.host.dataset.editorPaletteThumb = 'changed';
    await vi.waitFor(() => expect(f.htmlOf).toHaveBeenCalledTimes(2));
    f.stop();
    expect(() => f.stop()).not.toThrow();
    expect(cancel).toHaveBeenCalled();
    // A frame already dequeued when disposal runs still cannot touch the owner.
    callbacks.at(-1)!(0);
    expect(f.stage.style.transform).toBe('');
  });
});
