import { afterEach,beforeEach,describe,expect,it,vi } from 'vitest';

import { raw } from '../../src/jsx-runtime.js';
import { autoReposition,popover,positionAnchored } from '../../src/overlay.js';
import { anchorAt,rectFn,setViewport } from './overlay-test-helpers.js';

beforeEach(() => {
  document.body.innerHTML = '';
});
afterEach(() => {
  vi.useRealTimers();
});

describe('popover()', () => {
  it('is non-modal, sets position:fixed, ignores an anchor click, and dismisses on an outside click', () => {
    const anchor = anchorAt({ left: 100, right: 150, top: 200, bottom: 220, width: 50, height: 20 });
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
    const anchor = anchorAt({ left: 100, right: 150, top: 200, bottom: 220, width: 50, height: 20 });
    const h = popover(anchor, raw('<div class="pop"/>'), { gap: 4 });
    h.el.getBoundingClientRect = rectFn({ left: 0, right: 80, top: 0, bottom: 40, width: 80, height: 40 });
    window.dispatchEvent(new Event('resize')); // reposition with the mocked popover size

    expect(h.el.style.top).toBe('224px'); // anchor.bottom(220) + gap(4)
    expect(h.el.style.left).toBe('100px'); // anchor.left, align start
    h.close();
  });

  it('flips above when there is not enough room below', () => {
    setViewport(1000, 300);
    const anchor = anchorAt({ left: 100, right: 150, top: 250, bottom: 270, width: 50, height: 20 });
    const h = popover(anchor, raw('<div/>'), { gap: 4 });
    h.el.getBoundingClientRect = rectFn({ width: 80, height: 100 });
    window.dispatchEvent(new Event('resize'));
    // below: 270+4+100 = 374 > 300 (overflow); above: 250-4-100 = 146 ≥ 0 → flip above
    expect(h.el.style.top).toBe('146px');
    h.close();
  });

  it('clamps horizontally into the viewport', () => {
    setViewport(400, 800);
    const anchor = anchorAt({ left: 380, right: 400, top: 100, bottom: 120, width: 20, height: 20 });
    const h = popover(anchor, raw('<div/>'));
    h.el.getBoundingClientRect = rectFn({ width: 120, height: 40 });
    window.dispatchEvent(new Event('resize'));
    // align start left = 380, but 380+120 = 500 > 400 → clamp to 400-120 = 280
    expect(h.el.style.left).toBe('280px');
    h.close();
  });

  it('aligns the right edges with align:end', () => {
    setViewport(1000, 800);
    const anchor = anchorAt({ left: 100, right: 300, top: 100, bottom: 120, width: 200, height: 20 });
    const h = popover(anchor, raw('<div/>'), { align: 'end' });
    h.el.getBoundingClientRect = rectFn({ width: 80, height: 40 });
    window.dispatchEvent(new Event('resize'));
    // align end → left = anchor.right(300) - width(80) = 220
    expect(h.el.style.left).toBe('220px');
    h.close();
  });

  it('repositions on scroll while open', () => {
    setViewport(1000, 800);
    const anchor = anchorAt({ left: 100, right: 150, top: 200, bottom: 220, width: 50, height: 20 });
    const h = popover(anchor, raw('<div/>'), { gap: 0 });
    h.el.getBoundingClientRect = rectFn({ width: 80, height: 40 });
    window.dispatchEvent(new Event('resize'));
    expect(h.el.style.top).toBe('220px');

    anchor.getBoundingClientRect = rectFn({ left: 100, right: 150, top: 120, bottom: 140, width: 50, height: 20 });
    window.dispatchEvent(new Event('scroll'));
    expect(h.el.style.top).toBe('140px'); // followed the anchor
    h.close();
  });

  it('removes the reposition listeners on close', async () => {
    const anchor = anchorAt({ left: 0, right: 10, top: 0, bottom: 10, width: 10, height: 10 });
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const h = popover(anchor, raw('<div/>'));
    h.close();
    await h.result; // let the cleanup .then run
    expect(removeSpy).toHaveBeenCalledWith('scroll', expect.any(Function), true);
    expect(removeSpy).toHaveBeenCalledWith('resize', expect.any(Function));
    removeSpy.mockRestore();
  });

  it('merges extra outsideIgnore elements with the anchor', () => {
    const anchor = anchorAt({ left: 0, right: 10, top: 0, bottom: 10, width: 10, height: 10 });
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
    const anchor = anchorAt({ left: 0, right: 10, top: 0, bottom: 10, width: 10, height: 10 });
    const a = document.createElement('div');
    const b = document.createElement('div');
    document.body.append(a, b);
    const h = popover(anchor, raw('<div/>'), { outsideIgnore: [a, b] });
    a.click(); b.click(); anchor.click(); // all exempt
    expect(h.el.parentElement).not.toBeNull();
    document.body.click();
    expect(h.el.parentElement).toBeNull();
  });

  it("placement:'top' stays above when it fits", () => {
    setViewport(1000, 800);
    const anchor = anchorAt({ left: 100, right: 150, top: 400, bottom: 420, width: 50, height: 20 });
    const h = popover(anchor, raw('<div/>'), { placement: 'top', gap: 4 });
    h.el.getBoundingClientRect = rectFn({ width: 80, height: 100 });
    window.dispatchEvent(new Event('resize'));
    // aboveTop = top(400) - gap(4) - height(100) = 296 ≥ 0 → stays above
    expect(h.el.style.top).toBe('296px');
    h.close();
  });

  it("placement:'top' flips below when there is no room above", () => {
    setViewport(1000, 800);
    const anchor = anchorAt({ left: 100, right: 150, top: 20, bottom: 40, width: 50, height: 20 });
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
    const anchor = anchorAt({ left: 100, right: 150, top: 200, bottom: 220, width: 50, height: 20 });
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
    const anchor = anchorAt({ left: 100, right: 150, top: 200, bottom: 220, width: 50, height: 20 });
    const el = document.createElement('div');
    document.body.appendChild(el);
    el.getBoundingClientRect = rectFn({ width: 80, height: 40 });

    const stop = autoReposition(el, anchor, { gap: 0 });
    expect(el.style.top).toBe('220px'); // positioned immediately

    anchor.getBoundingClientRect = rectFn({ left: 100, right: 150, top: 300, bottom: 320, width: 50, height: 20 });
    window.dispatchEvent(new Event('scroll'));
    expect(el.style.top).toBe('320px'); // followed the anchor

    stop();
    anchor.getBoundingClientRect = rectFn({ left: 100, right: 150, top: 400, bottom: 420, width: 50, height: 20 });
    window.dispatchEvent(new Event('scroll'));
    expect(el.style.top).toBe('320px'); // stopped following
  });
});
