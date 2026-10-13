import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { raw } from '../../src/jsx-runtime.js';
import {
  autoReposition,
  popover,
  positionAnchored,
  tooltip,
} from '../../src/overlay.js';
import { anchorAt, rectFn, setViewport } from './overlay-test-helpers.js';

beforeEach(() => {
  document.body.innerHTML = '';
});
afterEach(() => {
  vi.useRealTimers();
});

describe('popover()', () => {
  it('is non-modal, sets position:fixed, ignores an anchor click, and dismisses on an outside click', () => {
    const anchor = anchorAt({
      left: 100,
      right: 150,
      top: 200,
      bottom: 220,
      width: 50,
      height: 20,
    });
    const h = popover(anchor, raw('<div class="pop">menu</div>'));

    expect(h.el.getAttribute('aria-modal')).toBeNull(); // trap:false → non-modal
    expect(h.el.style.position).toBe('fixed');

    anchor.click(); // the anchor is outsideIgnore → does NOT dismiss
    expect(h.el.parentElement).not.toBeNull();

    document.body.click(); // truly outside → dismiss
    expect(h.el.parentElement).toBeNull();
  });

  it('positions below the anchor by default (bottom + gap, left-aligned)', () => {
    setViewport(1000, 800);
    const anchor = anchorAt({
      left: 100,
      right: 150,
      top: 200,
      bottom: 220,
      width: 50,
      height: 20,
    });
    const h = popover(anchor, raw('<div class="pop"/>'), { gap: 4 });
    h.el.getBoundingClientRect = rectFn({
      left: 0,
      right: 80,
      top: 0,
      bottom: 40,
      width: 80,
      height: 40,
    });
    window.dispatchEvent(new Event('resize')); // reposition with the mocked popover size

    expect(h.el.style.top).toBe('224px'); // anchor.bottom(220) + gap(4)
    expect(h.el.style.left).toBe('100px'); // anchor.left, align start
    h.close();
  });

  it('flips above when there is not enough room below', () => {
    setViewport(1000, 300);
    const anchor = anchorAt({
      left: 100,
      right: 150,
      top: 250,
      bottom: 270,
      width: 50,
      height: 20,
    });
    const h = popover(anchor, raw('<div/>'), { gap: 4 });
    h.el.getBoundingClientRect = rectFn({ width: 80, height: 100 });
    window.dispatchEvent(new Event('resize'));
    // below: 270+4+100 = 374 > 300 (overflow); above: 250-4-100 = 146 ≥ 0 → flip above
    expect(h.el.style.top).toBe('146px');
    h.close();
  });

  it('clamps horizontally into the viewport', () => {
    setViewport(400, 800);
    const anchor = anchorAt({
      left: 380,
      right: 400,
      top: 100,
      bottom: 120,
      width: 20,
      height: 20,
    });
    const h = popover(anchor, raw('<div/>'));
    h.el.getBoundingClientRect = rectFn({ width: 120, height: 40 });
    window.dispatchEvent(new Event('resize'));
    // align start left = 380, but 380+120 = 500 > 400 → clamp to 400-120 = 280
    expect(h.el.style.left).toBe('280px');
    h.close();
  });

  it('aligns the right edges with align:end', () => {
    setViewport(1000, 800);
    const anchor = anchorAt({
      left: 100,
      right: 300,
      top: 100,
      bottom: 120,
      width: 200,
      height: 20,
    });
    const h = popover(anchor, raw('<div/>'), { align: 'end' });
    h.el.getBoundingClientRect = rectFn({ width: 80, height: 40 });
    window.dispatchEvent(new Event('resize'));
    // align end → left = anchor.right(300) - width(80) = 220
    expect(h.el.style.left).toBe('220px');
    h.close();
  });

  it('repositions on scroll while open', () => {
    setViewport(1000, 800);
    const anchor = anchorAt({
      left: 100,
      right: 150,
      top: 200,
      bottom: 220,
      width: 50,
      height: 20,
    });
    const h = popover(anchor, raw('<div/>'), { gap: 0 });
    h.el.getBoundingClientRect = rectFn({ width: 80, height: 40 });
    window.dispatchEvent(new Event('resize'));
    expect(h.el.style.top).toBe('220px');

    anchor.getBoundingClientRect = rectFn({
      left: 100,
      right: 150,
      top: 120,
      bottom: 140,
      width: 50,
      height: 20,
    });
    window.dispatchEvent(new Event('scroll'));
    expect(h.el.style.top).toBe('140px'); // followed the anchor
    h.close();
  });

  it('removes the reposition listeners on close', async () => {
    const anchor = anchorAt({
      left: 0,
      right: 10,
      top: 0,
      bottom: 10,
      width: 10,
      height: 10,
    });
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const h = popover(anchor, raw('<div/>'));
    h.close();
    await h.result; // let the cleanup .then run
    expect(removeSpy).toHaveBeenCalledWith(
      'scroll',
      expect.any(Function),
      true,
    );
    expect(removeSpy).toHaveBeenCalledWith('resize', expect.any(Function));
    removeSpy.mockRestore();
  });

  it('merges extra outsideIgnore elements with the anchor', () => {
    const anchor = anchorAt({
      left: 0,
      right: 10,
      top: 0,
      bottom: 10,
      width: 10,
      height: 10,
    });
    const friend = document.createElement('div');
    document.body.appendChild(friend);
    const h = popover(anchor, raw('<div/>'), { outsideIgnore: friend });
    friend.click(); // exempt → no dismiss
    expect(h.el.parentElement).not.toBeNull();
    anchor.click(); // anchor still exempt
    expect(h.el.parentElement).not.toBeNull();
    document.body.click();
    expect(h.el.parentElement).toBeNull();
  });
});

describe('popover() — more placement coverage', () => {
  it('accepts an outsideIgnore array (merged with the anchor)', () => {
    const anchor = anchorAt({
      left: 0,
      right: 10,
      top: 0,
      bottom: 10,
      width: 10,
      height: 10,
    });
    const a = document.createElement('div');
    const b = document.createElement('div');
    document.body.append(a, b);
    const h = popover(anchor, raw('<div/>'), { outsideIgnore: [a, b] });
    a.click();
    b.click();
    anchor.click(); // all exempt
    expect(h.el.parentElement).not.toBeNull();
    document.body.click();
    expect(h.el.parentElement).toBeNull();
  });

  it("placement:'top' stays above when it fits", () => {
    setViewport(1000, 800);
    const anchor = anchorAt({
      left: 100,
      right: 150,
      top: 400,
      bottom: 420,
      width: 50,
      height: 20,
    });
    const h = popover(anchor, raw('<div/>'), { placement: 'top', gap: 4 });
    h.el.getBoundingClientRect = rectFn({ width: 80, height: 100 });
    window.dispatchEvent(new Event('resize'));
    // aboveTop = top(400) - gap(4) - height(100) = 296 ≥ 0 → stays above
    expect(h.el.style.top).toBe('296px');
    h.close();
  });

  it("placement:'top' flips below when there is no room above", () => {
    setViewport(1000, 800);
    const anchor = anchorAt({
      left: 100,
      right: 150,
      top: 20,
      bottom: 40,
      width: 50,
      height: 20,
    });
    const h = popover(anchor, raw('<div/>'), { placement: 'top', gap: 4 });
    h.el.getBoundingClientRect = rectFn({ width: 80, height: 100 });
    window.dispatchEvent(new Event('resize'));
    // aboveTop = 20-4-100 = -84 < 0, belowTop+height = 44+100 = 144 ≤ 800 → flip below
    expect(h.el.style.top).toBe('44px'); // anchor.bottom(40) + gap(4)
    h.close();
  });
});

describe('positionAnchored() / autoReposition()', () => {
  it('positionAnchored places an arbitrary element below the anchor (fixed)', () => {
    setViewport(1000, 800);
    const anchor = anchorAt({
      left: 100,
      right: 150,
      top: 200,
      bottom: 220,
      width: 50,
      height: 20,
    });
    const el = document.createElement('div');
    document.body.appendChild(el);
    el.getBoundingClientRect = rectFn({ width: 80, height: 40 });

    positionAnchored(el, anchor, { gap: 4 });
    expect(el.style.position).toBe('fixed');
    expect(el.style.top).toBe('224px'); // anchor.bottom(220) + gap(4)
    expect(el.style.left).toBe('100px');
  });

  it('autoReposition positions immediately, follows on scroll, and stops on dispose', () => {
    setViewport(1000, 800);
    const anchor = anchorAt({
      left: 100,
      right: 150,
      top: 200,
      bottom: 220,
      width: 50,
      height: 20,
    });
    const el = document.createElement('div');
    document.body.appendChild(el);
    el.getBoundingClientRect = rectFn({ width: 80, height: 40 });

    const stop = autoReposition(el, anchor, { gap: 0 });
    expect(el.style.top).toBe('220px'); // positioned immediately

    anchor.getBoundingClientRect = rectFn({
      left: 100,
      right: 150,
      top: 300,
      bottom: 320,
      width: 50,
      height: 20,
    });
    window.dispatchEvent(new Event('scroll'));
    expect(el.style.top).toBe('320px'); // followed the anchor

    stop();
    anchor.getBoundingClientRect = rectFn({
      left: 100,
      right: 150,
      top: 400,
      bottom: 420,
      width: 50,
      height: 20,
    });
    window.dispatchEvent(new Event('scroll'));
    expect(el.style.top).toBe('320px'); // stopped following
  });
  describe('a containing block for fixed descendants (a transformed/filtered dialog)', () => {
    const anchorRect = {
      left: 100,
      right: 150,
      top: 200,
      bottom: 220,
      width: 50,
      height: 20,
    };

    // happy-dom has no layout; stand in for the engine by answering the
    // positioning probe (the only element here without its own rect stub) with
    // where a `left:0; top:0` fixed box lands inside the containing block.
    function stubProbe(rect: {
      left: number;
      top: number;
      width: number;
      height: number;
    }): { probes: Element[] } {
      const probes: Element[] = [];
      vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(
        function (this: Element) {
          probes.push(this);
          return {
            ...rect,
            right: rect.left + rect.width,
            bottom: rect.top + rect.height,
            x: rect.left,
            y: rect.top,
            toJSON: () => ({}),
          } as DOMRect;
        },
      );
      return { probes };
    }

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('subtracts the containing block origin so the element still lands next to the anchor', () => {
      setViewport(1000, 800);
      const anchor = anchorAt(anchorRect);
      const dialog = document.createElement('dialog');
      const slot = document.createElement('div');
      dialog.appendChild(slot);
      document.body.appendChild(dialog);
      const el = document.createElement('div');
      slot.appendChild(el);
      el.getBoundingClientRect = rectFn({ width: 80, height: 40 });
      const { probes } = stubProbe({ left: 30, top: 50, width: 1, height: 1 });

      positionAnchored(el, anchor, { gap: 4 });
      expect(el.style.left).toBe('70px'); // viewport 100 − origin 30
      expect(el.style.top).toBe('174px'); // viewport 224 − origin 50
      // Exactly one probe measured, as a sibling of `el`, and gone afterwards.
      expect(probes).toHaveLength(1);
      expect(probes[0]!.isConnected).toBe(false);
      expect(slot.children).toHaveLength(1);
    });

    it('divides out a scaled containing block', () => {
      setViewport(1000, 800);
      const anchor = anchorAt(anchorRect);
      const el = document.createElement('div');
      document.body.appendChild(el);
      el.getBoundingClientRect = rectFn({ width: 80, height: 40 });
      stubProbe({ left: 20, top: 24, width: 0.5, height: 2 });

      positionAnchored(el, anchor, { gap: 4 });
      expect(el.style.left).toBe('160px'); // (100 − 20) / 0.5
      expect(el.style.top).toBe('100px'); // (224 − 24) / 2
    });

    it('treats a zero-size probe (no layout, or a scale(0) animation) as unscaled', () => {
      setViewport(1000, 800);
      const anchor = anchorAt(anchorRect);
      const el = document.createElement('div');
      document.body.appendChild(el);
      el.getBoundingClientRect = rectFn({ width: 80, height: 40 });
      stubProbe({ left: 10, top: 10, width: 0, height: 0 });

      positionAnchored(el, anchor, { gap: 4 });
      expect(el.style.left).toBe('90px');
      expect(el.style.top).toBe('214px');
    });

    it('skips the probe for a detached element (viewport coordinates as-is)', () => {
      setViewport(1000, 800);
      const anchor = anchorAt(anchorRect);
      const el = document.createElement('div');
      el.getBoundingClientRect = rectFn({ width: 80, height: 40 });
      const { probes } = stubProbe({ left: 30, top: 50, width: 1, height: 1 });

      positionAnchored(el, anchor, { gap: 4 });
      expect(probes).toHaveLength(0);
      expect(el.style.left).toBe('100px');
      expect(el.style.top).toBe('224px');
    });
  });
});

describe('viewportMargin / fitHeight', () => {
  const AVAILABLE = '--kerf-anchor-available-height';

  // Stand in for CSS `max-height: var(--kerf-anchor-available-height)`: the
  // element lays out at its natural height, capped by the published room.
  function cappedElement(width: number, naturalHeight: number): HTMLElement {
    const el = document.createElement('div');
    document.body.appendChild(el);
    const laidOut = () => {
      const cap = Number.parseFloat(el.style.getPropertyValue(AVAILABLE));
      return Number.isNaN(cap) ? naturalHeight : Math.min(naturalHeight, cap);
    };
    el.getBoundingClientRect = () =>
      rectFn({ width, height: laidOut() * scale })();
    // A capped element scrolls the rest of its content.
    Object.defineProperties(el, {
      offsetHeight: { get: () => (scale === 1 ? 0 : laidOut()) },
      clientHeight: { get: laidOut },
      scrollHeight: { get: () => naturalHeight },
    });
    return el;
  }
  let scale = 1;
  afterEach(() => {
    scale = 1;
  });

  it('clamps horizontally inside the viewport margin on both edges', () => {
    setViewport(400, 800);
    const right = anchorAt({ left: 380, right: 400, top: 100, bottom: 120 });
    const el = cappedElement(120, 40);
    positionAnchored(el, right, { viewportMargin: 8 });
    expect(el.style.left).toBe('272px'); // 400 − 8 − 120
    const leftEdge = anchorAt({ left: 0, right: 20, top: 100, bottom: 120 });
    positionAnchored(el, leftEdge, { align: 'end', viewportMargin: 8 });
    expect(el.style.left).toBe('8px'); // 20 − 120 = −100 → margin
  });

  it('counts the margin when deciding whether the preferred side fits', () => {
    setViewport(1000, 300);
    // Below: 204 + 90 = 294 fits the bare edge but not a 10px gutter (290).
    const anchor = anchorAt({ left: 100, right: 150, top: 180, bottom: 200 });
    const el = cappedElement(80, 90);
    positionAnchored(el, anchor, {});
    expect(el.style.top).toBe('204px');
    positionAnchored(el, anchor, { viewportMargin: 10 });
    expect(el.style.top).toBe('86px'); // above: 180 − 4 − 90
    // Without fitHeight nothing is published.
    expect(el.style.getPropertyValue(AVAILABLE)).toBe('');
  });

  it('keeps the preferred side when neither fits unless fitHeight is set', () => {
    setViewport(1000, 400);
    // Room below 400 − 8 − 224 = 168; room above 200 − 4 − 8 = 188.
    const anchor = anchorAt({ left: 100, right: 150, top: 200, bottom: 220 });
    const el = cappedElement(80, 500);
    positionAnchored(el, anchor, { viewportMargin: 8 });
    expect(el.style.top).toBe('224px'); // legacy: stays below and overflows

    positionAnchored(el, anchor, { viewportMargin: 8, fitHeight: true });
    expect(el.style.getPropertyValue(AVAILABLE)).toBe('188px');
    // Above, hanging from the capped 188px height: 200 − 4 − 188 = 8.
    expect(el.style.top).toBe('8px');
  });

  it('publishes the room on the chosen side and refreshes it on reposition', () => {
    setViewport(1000, 800);
    const anchor = anchorAt({ left: 100, right: 150, top: 100, bottom: 120 });
    const el = cappedElement(80, 200);
    const stop = autoReposition(el, anchor, {
      viewportMargin: 8,
      fitHeight: true,
    });
    // Fits below: room 800 − 8 − 124 = 668, natural height kept.
    expect(el.style.getPropertyValue(AVAILABLE)).toBe('668px');
    expect(el.style.top).toBe('124px');

    setViewport(1000, 300);
    window.dispatchEvent(new Event('resize'));
    // Measured at its full 200px (laid out plus scrolled content):
    // room below 168, above 88, so it stays below with a 168px cap.
    expect(el.style.getPropertyValue(AVAILABLE)).toBe('168px');
    expect(el.style.top).toBe('124px');
    stop();
  });

  it('takes the roomier side and publishes zero room rather than a negative height', () => {
    setViewport(1000, 100);
    const anchor = anchorAt({ left: 0, right: 10, top: 90, bottom: 110 });
    const el = cappedElement(80, 50);
    positionAnchored(el, anchor, { fitHeight: true, placement: 'bottom' });
    // Room below 100 − 114 < 0; above 86 → above wins with 86px.
    expect(el.style.getPropertyValue(AVAILABLE)).toBe('86px');
    const offscreen = anchorAt({ left: 0, right: 10, top: -50, bottom: 200 });
    positionAnchored(el, offscreen, { fitHeight: true });
    expect(el.style.getPropertyValue(AVAILABLE)).toBe('0px');
  });

  it('reads the full height of a capped, scrolled element without lifting its cap', () => {
    setViewport(1000, 800);
    const anchor = anchorAt({ left: 100, right: 150, top: 100, bottom: 120 });
    const el = cappedElement(80, 300);
    el.style.setProperty(AVAILABLE, '120px'); // a previous, tighter fit
    scale = 2; // a 2x containing block: CSS px are 2 viewport px
    positionAnchored(el, anchor, { fitHeight: true, placement: 'top' });
    // Full height 120×2 + (300 − 120)×2 = 600 viewport px: no room above
    // (96) or below (676 fits), so it flips below and is never uncapped.
    expect(el.style.top).toBe('124px');
    expect(el.style.getPropertyValue(AVAILABLE)).toBe('676px');
  });

  it("honors the element's own max-height when choosing a side", () => {
    setViewport(1000, 800);
    // Room below 800 − 454 = 346; room above 400 − 4 = 396.
    const anchor = anchorAt({ left: 100, right: 150, top: 400, bottom: 450 });
    const el = cappedElement(80, 500);
    positionAnchored(el, anchor, { fitHeight: true });
    // Uncapped, 500px fits neither side: the roomier side (above) wins.
    expect(el.style.getPropertyValue(AVAILABLE)).toBe('396px');

    // An app cap of 300px fits below, so the preferred side holds.
    el.style.maxHeight = '300px';
    positionAnchored(el, anchor, { fitHeight: true });
    expect(el.style.top).toBe('454px');
    expect(el.style.getPropertyValue(AVAILABLE)).toBe('346px');

    // A content-box cap adds the vertical padding and border: 300 + 2×20 +
    // 2×5 = 350 no longer fits below (346), so it goes above again.
    el.style.padding = '20px 0';
    el.style.border = '5px solid';
    el.style.boxSizing = 'content-box';
    positionAnchored(el, anchor, { fitHeight: true });
    expect(el.style.getPropertyValue(AVAILABLE)).toBe('396px');
    // A border-box cap is the whole height.
    el.style.boxSizing = 'border-box';
    positionAnchored(el, anchor, { fitHeight: true });
    expect(el.style.getPropertyValue(AVAILABLE)).toBe('346px');
    // A keyword cap is no cap.
    el.style.maxHeight = 'none';
    positionAnchored(el, anchor, { fitHeight: true });
    expect(el.style.getPropertyValue(AVAILABLE)).toBe('396px');
  });

  describe('a cap that stays relative after computing', () => {
    // happy-dom has no layout: stand in for the engine's used height of the
    // resolution probe, a percentage of an 800px-tall containing block.
    const realComputedStyle = window.getComputedStyle.bind(window);
    function resolvePercentProbes(): Element[] {
      const probes: Element[] = [];
      vi.spyOn(window, 'getComputedStyle').mockImplementation((target) => {
        const style = realComputedStyle(target);
        const height = (target as HTMLElement).style.height;
        if (!(target as HTMLElement).style.visibility) return style;
        probes.push(target);
        return new Proxy(style, {
          get: (base, key) =>
            key === 'height'
              ? `${(Number.parseFloat(height) / 100) * 800}px`
              : Reflect.get(base, key),
        });
      });
      return probes;
    }
    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('resolves a percentage cap against the containing block with a probe beside the element', () => {
      setViewport(1000, 800);
      // Room below 800 − 454 = 346; room above 400 − 4 = 396.
      const anchor = anchorAt({ left: 100, right: 150, top: 400, bottom: 450 });
      const el = cappedElement(80, 500);
      const probes = resolvePercentProbes();
      // 40% of 800 = 320 fits below, so the preferred side holds.
      el.style.maxHeight = '40%';
      positionAnchored(el, anchor, { fitHeight: true });
      expect(el.style.top).toBe('454px');
      expect(el.style.getPropertyValue(AVAILABLE)).toBe('346px');
      expect(probes).toHaveLength(1);
      expect(probes[0]!.isConnected).toBe(false);
      expect(document.body.children).toHaveLength(2); // anchor + el only

      // A content-box cap adds the vertical padding: 320 + 2×20 = 360 no
      // longer fits below, so it goes above.
      el.style.padding = '20px 0';
      el.style.boxSizing = 'content-box';
      positionAnchored(el, anchor, { fitHeight: true });
      expect(el.style.getPropertyValue(AVAILABLE)).toBe('396px');
    });

    it('treats a height the probe cannot take, or a detached element, as no cap', () => {
      setViewport(1000, 800);
      const anchor = anchorAt({ left: 100, right: 150, top: 400, bottom: 450 });
      const el = cappedElement(80, 500);
      resolvePercentProbes();
      // happy-dom computes `min()` but rejects it as an inline height.
      el.style.maxHeight = 'min(300px, 40%)';
      positionAnchored(el, anchor, { fitHeight: true });
      expect(el.style.getPropertyValue(AVAILABLE)).toBe('396px');

      el.style.maxHeight = '40%';
      el.remove();
      positionAnchored(el, anchor, { fitHeight: true });
      expect(el.style.getPropertyValue(AVAILABLE)).toBe('396px');
    });
  });

  describe('an app transition on the element', () => {
    const realComputedStyle = window.getComputedStyle.bind(window);
    const LONGHANDS = [
      'transition-property',
      'transition-duration',
      'transition-delay',
    ];
    afterEach(() => {
      vi.restoreAllMocks();
    });

    // happy-dom computes no transitions: report the element's transitions
    // from its inline longhands (or a stylesheet's `opacity 1s, max-height
    // 2s`), and, like an engine, report a running transition's value — the
    // published room — for `max-height` unless the read disables it.
    function emulateTransitions(el: HTMLElement): {
      atRead: string[];
    } {
      const atRead: string[] = [];
      vi.spyOn(window, 'getComputedStyle').mockImplementation((target) => {
        const style = realComputedStyle(target);
        if (target !== el) return style;
        const stylesheet: Record<string, string> = {
          'transition-property': 'opacity, max-height',
          'transition-duration': '1s, 2s',
          'transition-delay': '0s',
        };
        const getPropertyValue = (name: string): string =>
          name in stylesheet
            ? el.style.getPropertyValue(name) || stylesheet[name]!
            : style.getPropertyValue(name);
        return new Proxy(style, {
          get: (base, key) => {
            switch (key) {
              case 'getPropertyValue':
                return getPropertyValue;
              case 'maxHeight': {
                for (const name of LONGHANDS)
                  atRead.push(
                    `${el.style.getPropertyValue(name).replace(/\s/g, '')}|${el.style.getPropertyPriority(name)}`,
                  );
                const settled = el.style
                  .getPropertyValue('transition-property')
                  .match(/max-height$|^none$/);
                return settled ? '300px' : el.style.getPropertyValue(AVAILABLE);
              }
              default: {
                const value: unknown = Reflect.get(base, key);
                return typeof value === 'function' ? value.bind(base) : value;
              }
            }
          },
        });
      });
      return { atRead };
    }

    it('reads the cap with max-height transitions off and restores the inline transitions', () => {
      setViewport(1000, 800);
      // Room below 800 − 454 = 346; room above 400 − 4 = 396.
      const anchor = anchorAt({ left: 100, right: 150, top: 400, bottom: 450 });
      const el = cappedElement(80, 500);
      // A previous placement published 450px; a running max-height transition
      // would report that, which fits neither side.
      el.style.setProperty(AVAILABLE, '450px');
      const { atRead } = emulateTransitions(el);
      positionAnchored(el, anchor, { fitHeight: true });
      // Read as the 300px cap instead: fits below.
      expect(el.style.top).toBe('454px');
      // `max-height` appended with no duration or delay; every other
      // transition paired with its own duration and delay as before.
      expect(atRead).toEqual([
        'opacity,max-height,max-height|important',
        '1s,2s,0s|important',
        '0s,0s,0s|important',
      ]);
      for (const name of LONGHANDS)
        expect(el.style.getPropertyValue(name)).toBe('');

      // Inline longhands, with their priorities, come back exactly.
      el.style.setProperty('transition-property', 'opacity');
      el.style.setProperty('transition-duration', '150ms', 'important');
      positionAnchored(el, anchor, { fitHeight: true });
      expect(atRead.slice(3)).toEqual([
        'opacity,max-height|important',
        '150ms,0s|important',
        '0s,0s|important',
      ]);
      expect(el.style.getPropertyValue('transition-property')).toBe('opacity');
      expect(el.style.getPropertyPriority('transition-property')).toBe('');
      expect(el.style.getPropertyValue('transition-duration')).toBe('150ms');
      expect(el.style.getPropertyPriority('transition-duration')).toBe(
        'important',
      );
      expect(el.style.getPropertyValue('transition-delay')).toBe('');
    });

    it('leaves an element without transitions untouched', () => {
      setViewport(1000, 800);
      const anchor = anchorAt({ left: 100, right: 150, top: 400, bottom: 450 });
      const el = cappedElement(80, 500);
      el.style.maxHeight = '300px';
      el.style.setProperty('transition-property', 'none');
      const { atRead } = emulateTransitions(el);
      positionAnchored(el, anchor, { fitHeight: true });
      expect(atRead).toEqual(['none|', '|', '|']);
      expect(el.style.getPropertyValue('transition-property')).toBe('none');
    });
  });

  it('never reads back the room it published as the element cap', () => {
    setViewport(1000, 800);
    const anchor = anchorAt({ left: 100, right: 150, top: 400, bottom: 450 });
    const el = cappedElement(80, 500);
    // The element is capped by the room kerf publishes, and a previous,
    // tight placement published 100px. Read back as the element's own cap,
    // that 100px would "fit" below and pin it there.
    el.style.maxHeight = `var(${AVAILABLE})`;
    el.style.setProperty(AVAILABLE, '100px');
    positionAnchored(el, anchor, { fitHeight: true });
    // Measured at its full 500px instead: the roomier side (above) wins.
    expect(el.style.getPropertyValue(AVAILABLE)).toBe('396px');
  });

  it('forwards the options through popover() and tooltip()', () => {
    vi.useFakeTimers();
    setViewport(400, 400);
    const anchor = anchorAt({ left: 380, right: 400, top: 200, bottom: 220 });
    const h = popover(anchor, raw('<div/>'), {
      viewportMargin: 8,
      fitHeight: true,
    });
    expect(h.el.style.getPropertyValue(AVAILABLE)).toBe('168px'); // 400 − 8 − 224
    h.close();

    const dispose = tooltip(anchor, 'tip', {
      delay: 0,
      placement: 'top',
      viewportMargin: 8,
      fitHeight: true,
    });
    anchor.dispatchEvent(new Event('pointerenter'));
    vi.advanceTimersByTime(0);
    const tip = document.querySelector<HTMLElement>('.kerf-tooltip')!;
    expect(tip.style.getPropertyValue(AVAILABLE)).toBe('188px'); // 200 − 4 − 8
    dispose();
  });
});
