import { afterEach, describe, expect, it, vi } from 'vitest';

import { ResizableRegion } from '../../src/resizable-region.js';
import { wireResizableRegions } from '../../src/wire-resizable-regions.js';

const roots: HTMLElement[] = [];

function region(
  axis: 'horizontal' | 'vertical' = 'horizontal',
  edge: 'start' | 'end' = 'end',
) {
  const root = document.createElement('div');
  root.innerHTML = String(
    ResizableRegion({
      id: 'panel',
      label: 'Panel',
      size: 200,
      min: 100,
      max: 300,
      axis,
      edge,
      children: 'Content' as never,
    }),
  );
  document.body.append(root);
  roots.push(root);
  return {
    root,
    handle: root.querySelector<HTMLElement>('[data-kui-resize-handle]')!,
  };
}

afterEach(() => {
  for (const root of roots.splice(0)) root.remove();
});

describe('wireResizableRegions', () => {
  it('supports arrows, shift acceleration, Home, End, and ignores unrelated keys', () => {
    const { root, handle } = region();
    const onCommit = vi.fn();
    const stop = wireResizableRegions(root, {
      step: 10,
      largeStep: 40,
      onCommit,
    });
    handle.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }),
    );
    expect(onCommit).toHaveBeenLastCalledWith({
      id: 'panel',
      size: 210,
      source: 'keyboard',
    });
    expect(
      root
        .querySelector<HTMLElement>('[data-component="resizable-region"]')!
        .style.getPropertyValue('--kui-resizable-region-expanded-size'),
    ).toBe('210px');
    handle.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'ArrowLeft',
        shiftKey: true,
        bubbles: true,
      }),
    );
    expect(onCommit).toHaveBeenLastCalledWith({
      id: 'panel',
      size: 170,
      source: 'keyboard',
    });
    handle.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Home', bubbles: true }),
    );
    expect(onCommit).toHaveBeenLastCalledWith({
      id: 'panel',
      size: 100,
      source: 'keyboard',
    });
    handle.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'End', bubbles: true }),
    );
    expect(onCommit).toHaveBeenLastCalledWith({
      id: 'panel',
      size: 300,
      source: 'keyboard',
    });
    const count = onCommit.mock.calls.length;
    handle.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
    );
    expect(onCommit).toHaveBeenCalledTimes(count);
    stop();
  });

  it('maps vertical and start-edge arrows to the visual resize direction', () => {
    const { root, handle } = region('vertical', 'start');
    const onCommit = vi.fn();
    const stop = wireResizableRegions(root, { onCommit });
    handle.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }),
    );
    expect(onCommit).toHaveBeenLastCalledWith({
      id: 'panel',
      size: 184,
      source: 'keyboard',
    });
    handle.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true }),
    );
    expect(onCommit).toHaveBeenLastCalledWith({
      id: 'panel',
      size: 200,
      source: 'keyboard',
    });
    stop();
  });

  it('previews pointer movement and commits once on release', () => {
    const { root, handle } = region();
    const onPreview = vi.fn();
    const onCommit = vi.fn();
    Object.defineProperty(handle, 'setPointerCapture', { value: vi.fn() });
    const stop = wireResizableRegions(root, { onPreview, onCommit });
    handle.dispatchEvent(
      new PointerEvent('pointerdown', {
        button: 0,
        pointerId: 3,
        clientX: 20,
        bubbles: true,
      }),
    );
    expect(
      root.querySelector<HTMLElement>('[data-component="resizable-region"]')!
        .dataset.resizing,
    ).toBe('true');
    handle.dispatchEvent(
      new PointerEvent('pointermove', {
        pointerId: 3,
        clientX: 55,
        bubbles: true,
      }),
    );
    expect(onPreview).toHaveBeenLastCalledWith({
      id: 'panel',
      size: 235,
      source: 'pointer',
    });
    expect(handle.getAttribute('aria-valuenow')).toBe('235');
    // The collapse-motion content width follows the live size mid-drag instead
    // of staying at the previously rendered expanded size.
    const liveRegion = root.querySelector<HTMLElement>(
      '[data-component="resizable-region"]',
    )!;
    expect(
      liveRegion.style.getPropertyValue('--kui-resizable-region-size'),
    ).toBe('235px');
    expect(
      liveRegion.style.getPropertyValue('--kui-resizable-region-expanded-size'),
    ).toBe('235px');
    handle.dispatchEvent(
      new PointerEvent('pointerup', { pointerId: 3, bubbles: true }),
    );
    expect(onCommit).toHaveBeenLastCalledWith({
      id: 'panel',
      size: 235,
      source: 'pointer',
    });
    expect(
      root.querySelector<HTMLElement>('[data-component="resizable-region"]')!
        .dataset.resizing,
    ).toBeUndefined();
    stop();
  });

  it('does not resize collapsed, overlay, or responsive-replacement regions', () => {
    const { root, handle } = region();
    const host = root.querySelector<HTMLElement>(
      '[data-component="resizable-region"]',
    )!;
    const onCommit = vi.fn();
    const stop = wireResizableRegions(root, { onCommit });
    for (const configure of [
      () => {
        host.dataset.collapsed = 'true';
      },
      () => {
        host.dataset.collapsed = 'false';
        host.dataset.presentation = 'overlay';
      },
      () => {
        host.dataset.presentation = 'hidden';
      },
    ]) {
      configure();
      handle.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Home', bubbles: true }),
      );
      handle.dispatchEvent(
        new PointerEvent('pointerdown', { button: 0, bubbles: true }),
      );
    }
    expect(onCommit).not.toHaveBeenCalled();
    stop();
  });

  it('handles vertical pointer movement, overlapping drags, and disposal mid-drag', () => {
    const { root, handle } = region('vertical', 'start');
    const onCommit = vi.fn();
    Object.defineProperty(handle, 'setPointerCapture', { value: vi.fn() });
    const stop = wireResizableRegions(root, { onCommit });
    handle.dispatchEvent(
      new PointerEvent('pointerdown', {
        button: 0,
        pointerId: 4,
        clientY: 20,
        bubbles: true,
      }),
    );
    handle.dispatchEvent(
      new PointerEvent('pointermove', {
        pointerId: 4,
        clientY: 45,
        bubbles: true,
      }),
    );
    expect(handle.getAttribute('aria-valuenow')).toBe('175');
    handle.dispatchEvent(
      new PointerEvent('pointerdown', {
        button: 0,
        pointerId: 5,
        clientY: 45,
        bubbles: true,
      }),
    );
    expect(onCommit).toHaveBeenLastCalledWith({
      id: 'panel',
      size: 175,
      source: 'pointer',
    });
    stop();
    expect(onCommit).toHaveBeenLastCalledWith({
      id: 'panel',
      size: 175,
      source: 'pointer',
    });
  });

  it('ignores non-primary pointer input and malformed handles', () => {
    const { root, handle } = region();
    const onCommit = vi.fn();
    const stop = wireResizableRegions(root, { onCommit });
    handle.dispatchEvent(
      new PointerEvent('pointerdown', { button: 1, bubbles: true }),
    );
    root.insertAdjacentHTML(
      'beforeend',
      '<div data-kui-resize-handle tabindex="0"></div>',
    );
    root.lastElementChild!.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Home', bubbles: true }),
    );
    root.insertAdjacentHTML(
      'beforeend',
      '<section data-component="resizable-region" data-region-id="bad" data-axis="diagonal" data-edge="middle"><button data-kui-resize-handle aria-valuemin="x" aria-valuemax="y" aria-valuenow="z"></button></section>',
    );
    const malformed = root.lastElementChild!.querySelector('button')!;
    malformed.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Home', bubbles: true }),
    );
    malformed.dispatchEvent(
      new PointerEvent('pointerdown', { button: 0, bubbles: true }),
    );
    expect(onCommit).not.toHaveBeenCalled();
    stop();
  });

  // KF-DTZY4N: a parent that clamps the track (a max-width stage, a narrow
  // container) bounds the resize itself, so the separator reports what is
  // shown and keyboard resizing never sticks beyond the visible maximum.
  describe('a parent that clamps the track', () => {
    /**
     * Model a parent that clamps the region's track to `limit` px, the way a
     * `max-width: 100%` stage does, with an optional safe-area edge extent
     * added to the flex basis. happy-dom has no layout, so both the used
     * flex basis and the rendered box are derived from the live size here.
     */
    function clampLayout(
      host: HTMLElement,
      limit: number,
      { axis = 'horizontal', extent = 0 } = {},
    ) {
      const basis = () =>
        Number.parseFloat(
          host.style.getPropertyValue('--kui-resizable-region-size'),
        ) + extent;
      const original = globalThis.getComputedStyle;
      vi.spyOn(globalThis, 'getComputedStyle').mockImplementation(
        (element, pseudo) =>
          element === host
            ? ({ flexBasis: `${basis()}px` } as CSSStyleDeclaration)
            : original(element, pseudo),
      );
      vi.spyOn(host, 'getBoundingClientRect').mockImplementation(() => {
        const track = Math.min(basis(), limit);
        return {
          width: axis === 'horizontal' ? track : 100,
          height: axis === 'vertical' ? track : 100,
        } as DOMRect;
      });
    }

    const hostOf = (root: HTMLElement) =>
      root.querySelector<HTMLElement>('[data-component="resizable-region"]')!;
    const key = (handle: HTMLElement, init: KeyboardEventInit) =>
      handle.dispatchEvent(
        new KeyboardEvent('keydown', { bubbles: true, ...init }),
      );

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('clamps keyboard resizing to the visible size and announces the visible maximum', () => {
      const { root, handle } = region();
      clampLayout(hostOf(root), 240);
      const onCommit = vi.fn();
      const stop = wireResizableRegions(root, { onCommit });
      key(handle, { key: 'End' });
      expect(onCommit).toHaveBeenLastCalledWith({
        id: 'panel',
        size: 240,
        source: 'keyboard',
      });
      expect(handle.getAttribute('aria-valuenow')).toBe('240');
      expect(handle.getAttribute('aria-valuemax')).toBe('240');
      // Growing never sticks past the visible maximum...
      key(handle, { key: 'ArrowRight' });
      expect(onCommit).toHaveBeenLastCalledWith({
        id: 'panel',
        size: 240,
        source: 'keyboard',
      });
      // ...so the first step back moves the visible separator.
      key(handle, { key: 'ArrowLeft' });
      expect(onCommit).toHaveBeenLastCalledWith({
        id: 'panel',
        size: 224,
        source: 'keyboard',
      });
      expect(
        hostOf(root).style.getPropertyValue('--kui-resizable-region-size'),
      ).toBe('224px');
      stop();
    });

    it('re-announces after an app re-render writes the declared maximum back', () => {
      const { root, handle } = region();
      clampLayout(hostOf(root), 240);
      const onCommit = vi.fn(({ size }: { size: number }) => {
        // A synchronous app re-render restores the rendered props.
        handle.setAttribute('aria-valuemax', '300');
        handle.setAttribute('aria-valuenow', String(size));
      });
      const stop = wireResizableRegions(root, { onCommit });
      key(handle, { key: 'End' });
      expect(handle.getAttribute('aria-valuemax')).toBe('240');
      // The remembered declared maximum survives the announced value: once
      // the parent grows, End reaches past the old visible maximum.
      clampLayout(hostOf(root), 280);
      key(handle, { key: 'End' });
      expect(onCommit).toHaveBeenLastCalledWith({
        id: 'panel',
        size: 280,
        source: 'keyboard',
      });
      stop();
    });

    it('lets a re-render with a new declared maximum supersede the remembered one', () => {
      const { root, handle } = region();
      clampLayout(hostOf(root), 240);
      const onCommit = vi.fn();
      const stop = wireResizableRegions(root, { onCommit });
      key(handle, { key: 'End' });
      expect(handle.getAttribute('aria-valuemax')).toBe('240');
      // The app lowers its max prop below the clamp; the new prop governs.
      handle.setAttribute('aria-valuemax', '200');
      key(handle, { key: 'End' });
      expect(onCommit).toHaveBeenLastCalledWith({
        id: 'panel',
        size: 200,
        source: 'keyboard',
      });
      expect(handle.getAttribute('aria-valuemax')).toBe('200');
      stop();
    });

    it('reports a stale committed size as the shown size on focus without committing', () => {
      const root = document.createElement('div');
      root.innerHTML = String(
        ResizableRegion({
          id: 'panel',
          label: 'Panel',
          size: 300,
          min: 100,
          max: 300,
          children: 'Content' as never,
        }),
      );
      document.body.append(root);
      roots.push(root);
      const handle = root.querySelector<HTMLElement>(
        '[data-kui-resize-handle]',
      )!;
      clampLayout(hostOf(root), 250);
      const onCommit = vi.fn();
      const stop = wireResizableRegions(root, { onCommit });
      handle.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      expect(handle.getAttribute('aria-valuenow')).toBe('250');
      expect(handle.getAttribute('aria-valuemax')).toBe('250');
      expect(onCommit).not.toHaveBeenCalled();
      // The probe restores the rendered size; only a resize changes it.
      expect(
        hostOf(root).style.getPropertyValue('--kui-resizable-region-size'),
      ).toBe('300px');
      key(handle, { key: 'ArrowLeft' });
      expect(onCommit).toHaveBeenLastCalledWith({
        id: 'panel',
        size: 234,
        source: 'keyboard',
      });
      stop();
    });

    it('clamps a pointer drag to the visible size', () => {
      const { root, handle } = region();
      clampLayout(hostOf(root), 240);
      Object.defineProperty(handle, 'setPointerCapture', { value: vi.fn() });
      const onPreview = vi.fn();
      const onCommit = vi.fn();
      const stop = wireResizableRegions(root, { onPreview, onCommit });
      handle.dispatchEvent(
        new PointerEvent('pointerdown', {
          button: 0,
          pointerId: 7,
          clientX: 0,
          bubbles: true,
        }),
      );
      handle.dispatchEvent(
        new PointerEvent('pointermove', {
          pointerId: 7,
          clientX: 90,
          bubbles: true,
        }),
      );
      expect(onPreview).toHaveBeenLastCalledWith({
        id: 'panel',
        size: 240,
        source: 'pointer',
      });
      handle.dispatchEvent(
        new PointerEvent('pointerup', { pointerId: 7, bubbles: true }),
      );
      expect(onCommit).toHaveBeenLastCalledWith({
        id: 'panel',
        size: 240,
        source: 'pointer',
      });
      stop();
    });

    it('excludes the safe-area edge extent and handles the vertical axis', () => {
      const horizontal = region();
      clampLayout(hostOf(horizontal.root), 270, { extent: 20 });
      const onCommit = vi.fn();
      const stopHorizontal = wireResizableRegions(horizontal.root, {
        onCommit,
      });
      key(horizontal.handle, { key: 'End' });
      // A 270px track holds 20px of edge extent plus 250px of content.
      expect(onCommit).toHaveBeenLastCalledWith({
        id: 'panel',
        size: 250,
        source: 'keyboard',
      });
      stopHorizontal();

      const vertical = region('vertical');
      clampLayout(hostOf(vertical.root), 220, { axis: 'vertical' });
      const stopVertical = wireResizableRegions(vertical.root, { onCommit });
      key(vertical.handle, { key: 'End' });
      expect(onCommit).toHaveBeenLastCalledWith({
        id: 'panel',
        size: 220,
        source: 'keyboard',
      });
      stopVertical();
    });

    it('skips announcing for a collapsed region or a handle a re-render replaced', () => {
      const { root, handle } = region();
      const host = hostOf(root);
      host.dataset.collapsed = 'true';
      const stop = wireResizableRegions(root, {
        onCommit: () => {
          // A keyed re-render swaps the whole region for fresh markup.
          host.replaceWith(host.cloneNode(true));
        },
      });
      handle.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      expect(handle.getAttribute('aria-valuemax')).toBe('300');
      host.dataset.collapsed = 'false';
      clampLayout(host, 240);
      key(handle, { key: 'End' });
      expect(handle.isConnected).toBe(false);
      expect(handle.getAttribute('aria-valuenow')).toBe('240');
      stop();
    });

    it('keeps the declared bounds when the track is not clamped and never goes below the minimum', () => {
      const { root, handle } = region();
      clampLayout(hostOf(root), 1000);
      const onCommit = vi.fn();
      const stop = wireResizableRegions(root, { onCommit });
      key(handle, { key: 'End' });
      expect(onCommit).toHaveBeenLastCalledWith({
        id: 'panel',
        size: 300,
        source: 'keyboard',
      });
      expect(handle.getAttribute('aria-valuemax')).toBe('300');
      clampLayout(hostOf(root), 60);
      key(handle, { key: 'End' });
      expect(onCommit).toHaveBeenLastCalledWith({
        id: 'panel',
        size: 100,
        source: 'keyboard',
      });
      stop();
    });
  });
});
