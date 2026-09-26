import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

    it('insets the handle while the separator sits at the edge the parent clamps it to', async () => {
      const { root, handle } = region();
      const host = hostOf(root);
      clampLayout(host, 240);
      Object.defineProperty(handle, 'setPointerCapture', { value: vi.fn() });
      const stop = wireResizableRegions(root, { onCommit: vi.fn() });
      const inset = () => host.hasAttribute('data-handle-inset');
      // With room past the separator the handle keeps straddling it.
      handle.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      expect(inset()).toBe(false);
      key(handle, { key: 'End' });
      expect(inset()).toBe(true);
      // Sixteen pixels of room clear the 10px overhang...
      key(handle, { key: 'ArrowLeft' });
      expect(inset()).toBe(false);
      // ...and a live drag back to the edge insets it before release.
      handle.dispatchEvent(
        new PointerEvent('pointerdown', {
          button: 0,
          pointerId: 4,
          clientX: 0,
          bubbles: true,
        }),
      );
      handle.dispatchEvent(
        new PointerEvent('pointermove', {
          pointerId: 4,
          clientX: 12,
          bubbles: true,
        }),
      );
      expect(inset()).toBe(true);
      handle.dispatchEvent(
        new PointerEvent('pointerup', { pointerId: 4, bubbles: true }),
      );
      expect(inset()).toBe(true);

      // A re-render drops the attribute it does not render; it comes back.
      host.removeAttribute('data-handle-inset');
      await new Promise((resolve) => globalThis.setTimeout(resolve));
      expect(inset()).toBe(true);

      // An unclamped track reaches its declared maximum and never insets.
      clampLayout(host, 1000);
      key(handle, { key: 'End' });
      expect(handle.getAttribute('aria-valuenow')).toBe('300');
      expect(inset()).toBe(false);
      stop();
    });

    describe('keeps the reported values current at rest', () => {
      /** A ResizeObserver the test notifies by hand; happy-dom has no layout. */
      class StubResizeObserver {
        static instances: StubResizeObserver[] = [];
        readonly targets = new Set<Element>();
        disconnected = false;
        constructor(private readonly callback: ResizeObserverCallback) {
          StubResizeObserver.instances.push(this);
        }
        observe(target: Element) {
          this.targets.add(target);
        }
        unobserve(target: Element) {
          this.targets.delete(target);
        }
        disconnect() {
          this.targets.clear();
          this.disconnected = true;
        }
        notify(...targets: Element[]) {
          this.callback(
            targets.map((target) => ({ target }) as ResizeObserverEntry),
            this as unknown as ResizeObserver,
          );
        }
      }
      const observer = () => StubResizeObserver.instances.at(-1)!;
      /** Let the MutationObserver deliver its records. */
      const settle = () =>
        new Promise((resolve) => globalThis.setTimeout(resolve));

      beforeEach(() => {
        StubResizeObserver.instances = [];
        vi.stubGlobal('ResizeObserver', StubResizeObserver);
      });
      afterEach(() => {
        vi.unstubAllGlobals();
      });

      it('re-clamps the reported values when the parent narrows or grows, without focus or a commit', () => {
        const { root, handle } = region();
        const host = hostOf(root);
        host.style.setProperty('--kui-resizable-region-size', '300px');
        const onCommit = vi.fn();
        const stop = wireResizableRegions(root, { onCommit });
        expect([...observer().targets]).toEqual([host, root]);

        clampLayout(host, 240);
        observer().notify(root);
        expect(handle.getAttribute('aria-valuenow')).toBe('240');
        expect(handle.getAttribute('aria-valuemax')).toBe('240');
        // Reporting never commits and never changes the rendered size.
        expect(onCommit).not.toHaveBeenCalled();
        expect(host.style.getPropertyValue('--kui-resizable-region-size')).toBe(
          '300px',
        );

        // Growing back reports the rendered size again, not the last report.
        clampLayout(host, 1000);
        observer().notify(host);
        expect(handle.getAttribute('aria-valuenow')).toBe('300');
        expect(handle.getAttribute('aria-valuemax')).toBe('300');
        stop();
      });

      it('re-clamps after an unrelated re-render writes the rendered props back', async () => {
        const { root, handle } = region();
        const host = hostOf(root);
        host.style.setProperty('--kui-resizable-region-size', '300px');
        const stop = wireResizableRegions(root, { onCommit: vi.fn() });
        clampLayout(host, 240);
        observer().notify(host);
        expect(handle.getAttribute('aria-valuenow')).toBe('240');

        // A re-render restores the rendered props; the layout is unchanged, so
        // no resize notification follows.
        handle.setAttribute('aria-valuemax', '300');
        handle.setAttribute('aria-valuenow', '300');
        await settle();
        expect(handle.getAttribute('aria-valuenow')).toBe('240');
        expect(handle.getAttribute('aria-valuemax')).toBe('240');
        stop();
      });

      it('does not re-measure its own report, a resizing region, or other aria values', async () => {
        const { root, handle } = region();
        const host = hostOf(root);
        const stop = wireResizableRegions(root, { onCommit: vi.fn() });
        clampLayout(host, 240);
        const measure = vi.mocked(host.getBoundingClientRect);
        observer().notify(host);
        expect(measure).toHaveBeenCalledTimes(1);
        // The report's own attribute writes come back as mutation records.
        await settle();
        expect(measure).toHaveBeenCalledTimes(1);

        // Another aria-valuenow below the root is not a separator.
        const meter = document.createElement('div');
        meter.setAttribute('aria-valuenow', '1');
        root.append(meter);
        await settle();
        meter.setAttribute('aria-valuenow', '2');
        await settle();
        expect(measure).toHaveBeenCalledTimes(1);

        // A stray handle outside any region, and a region whose handle a
        // re-render dropped, are skipped.
        const stray = document.createElement('div');
        stray.setAttribute('data-kui-resize-handle', '');
        root.append(stray);
        await settle();
        stray.setAttribute('aria-valuenow', '5');
        const handleless = document.createElement('section');
        handleless.dataset.component = 'resizable-region';
        observer().notify(handleless);
        document.body.append(handleless);
        observer().notify(handleless);
        root.append(handleless);
        await settle();
        handleless.toggleAttribute('data-handle-inset', true);
        await settle();
        handleless.remove();
        await settle();
        expect(measure).toHaveBeenCalledTimes(1);

        // A drag in progress owns the reported values.
        host.dataset.resizing = 'true';
        handle.setAttribute('aria-valuenow', '300');
        observer().notify(host);
        await settle();
        expect(measure).toHaveBeenCalledTimes(1);
        expect(handle.getAttribute('aria-valuenow')).toBe('300');

        // A collapsed region is left as rendered.
        delete host.dataset.resizing;
        host.dataset.collapsed = 'true';
        observer().notify(host);
        expect(handle.getAttribute('aria-valuenow')).toBe('300');
        stop();
      });

      it('observes regions a re-render adds, releases removed ones, and disconnects on dispose', async () => {
        const { root, handle } = region();
        const host = hostOf(root);
        const stop = wireResizableRegions(root, { onCommit: vi.fn() });
        const stub = observer();

        const nested = document.createElement('div');
        nested.innerHTML = String(
          ResizableRegion({
            id: 'second',
            label: 'Second',
            size: 150,
            min: 100,
            max: 300,
            children: 'More' as never,
          }),
        );
        root.append(nested);
        await settle();
        const second = nested.querySelector<HTMLElement>(
          '[data-component="resizable-region"]',
        )!;
        expect(stub.targets).toEqual(new Set([host, root, second, nested]));

        nested.remove();
        await settle();
        expect(stub.targets).toEqual(new Set([host, root]));
        // A detached region is not measured even if a late notification names it.
        stub.notify(second);

        stop();
        expect(stub.disconnected).toBe(true);
        clampLayout(host, 240);
        handle.setAttribute('aria-valuemax', '299');
        await settle();
        expect(handle.getAttribute('aria-valuemax')).toBe('299');
      });

      it('still re-clamps after a re-render where ResizeObserver is unavailable', async () => {
        vi.stubGlobal('ResizeObserver', undefined);
        const { root, handle } = region();
        const host = hostOf(root);
        host.style.setProperty('--kui-resizable-region-size', '300px');
        const stop = wireResizableRegions(root, { onCommit: vi.fn() });
        expect(StubResizeObserver.instances).toHaveLength(0);
        clampLayout(host, 240);
        handle.setAttribute('aria-valuenow', '300');
        await settle();
        expect(handle.getAttribute('aria-valuenow')).toBe('240');
        root.append(document.createElement('span'));
        await settle();
        stop();
      });
    });
  });
});
