import { afterEach,beforeEach,describe,expect,it,vi } from 'vitest';

import { jsx,raw } from '../../src/jsx-runtime.js';
import { tooltip } from '../../src/overlay.js';
import { anchorAt } from './overlay-test-helpers.js';

beforeEach(() => {
  document.body.innerHTML = '';
});
afterEach(() => {
  vi.useRealTimers();
});

describe('tooltip()', () => {
  const tipAnchor = () => anchorAt({ left: 100, right: 150, top: 200, bottom: 220, width: 50, height: 20 });

  it('shows after delay on pointerenter (role=tooltip), hides after hideDelay on pointerleave', () => {
    vi.useFakeTimers();
    const anchor = tipAnchor();
    const stop = tooltip(anchor, 'hi', { delay: 400, hideDelay: 100 });

    anchor.dispatchEvent(new Event('pointerenter'));
    expect(document.querySelector('.kerf-tooltip')).toBeNull(); // waiting for delay
    vi.advanceTimersByTime(400);
    const tip = document.querySelector('.kerf-tooltip');
    expect(tip).not.toBeNull();
    expect(tip?.getAttribute('role')).toBe('tooltip');
    expect(tip?.textContent).toBe('hi');

    anchor.dispatchEvent(new Event('pointerleave'));
    expect(document.querySelector('.kerf-tooltip')).not.toBeNull(); // still there during hideDelay
    vi.advanceTimersByTime(100);
    expect(document.querySelector('.kerf-tooltip')).toBeNull();
    stop();
  });

  it('re-entering during the hide delay cancels the hide (and does not double-show)', () => {
    vi.useFakeTimers();
    const anchor = tipAnchor();
    const stop = tooltip(anchor, 'x', { delay: 0, hideDelay: 100 });
    anchor.dispatchEvent(new Event('pointerenter'));
    vi.advanceTimersByTime(0);
    anchor.dispatchEvent(new Event('pointerleave')); // start hide timer
    anchor.dispatchEvent(new Event('pointerenter')); // cancels hide, current still set
    vi.advanceTimersByTime(100);
    expect(document.querySelectorAll('.kerf-tooltip').length).toBe(1); // still shown, only one
    stop();
  });

  it('two pointerenters before the delay schedule only one tooltip (debounced show)', () => {
    vi.useFakeTimers();
    const anchor = tipAnchor();
    const stop = tooltip(anchor, 'x', { delay: 400 });
    anchor.dispatchEvent(new Event('pointerenter')); // schedule show #1
    vi.advanceTimersByTime(200);
    anchor.dispatchEvent(new Event('pointerenter')); // clears #1, schedules #2
    vi.advanceTimersByTime(400);
    expect(document.querySelectorAll('.kerf-tooltip').length).toBe(1);
    stop();
  });

  it('leaving before the show delay cancels the show', () => {
    vi.useFakeTimers();
    const anchor = tipAnchor();
    const stop = tooltip(anchor, 'x', { delay: 400 });
    anchor.dispatchEvent(new Event('pointerenter'));
    anchor.dispatchEvent(new Event('pointerleave')); // cancel the pending show
    vi.advanceTimersByTime(400);
    expect(document.querySelector('.kerf-tooltip')).toBeNull();
    stop();
  });

  it('a pointerleave with nothing shown is a no-op', () => {
    vi.useFakeTimers();
    const anchor = tipAnchor();
    const stop = tooltip(anchor, 'x');
    expect(() => anchor.dispatchEvent(new Event('pointerleave'))).not.toThrow();
    expect(document.querySelector('.kerf-tooltip')).toBeNull();
    stop();
  });

  it('shows on focus; the disposer removes listeners, clears a pending show, and hides', () => {
    vi.useFakeTimers();
    const anchor = tipAnchor();
    const stop = tooltip(anchor, 'x', { delay: 0, hideDelay: 0 });
    anchor.dispatchEvent(new Event('focus'));
    vi.advanceTimersByTime(0);
    expect(document.querySelector('.kerf-tooltip')).not.toBeNull();

    stop(); // removes listeners + hides
    expect(document.querySelector('.kerf-tooltip')).toBeNull();
    anchor.dispatchEvent(new Event('focus')); // listener gone → no show
    vi.advanceTimersByTime(0);
    expect(document.querySelector('.kerf-tooltip')).toBeNull();
  });

  it('the disposer clears a still-pending show timer', () => {
    vi.useFakeTimers();
    const anchor = tipAnchor();
    const stop = tooltip(anchor, 'x', { delay: 400 });
    anchor.dispatchEvent(new Event('pointerenter')); // show pending
    stop(); // must clear the pending show timer
    vi.advanceTimersByTime(400);
    expect(document.querySelector('.kerf-tooltip')).toBeNull();
  });

  it('accepts SafeHtml and render-fn content', () => {
    vi.useFakeTimers();
    const a1 = tipAnchor();
    const stop1 = tooltip(a1, raw('<em class="tip-em">e</em>'), { delay: 0 });
    a1.dispatchEvent(new Event('pointerenter'));
    vi.advanceTimersByTime(0);
    expect(document.querySelector('.kerf-tooltip .tip-em')?.textContent).toBe('e');
    stop1();

    document.body.innerHTML = '';
    const a2 = tipAnchor();
    const stop2 = tooltip(a2, () => jsx('b', { class: 'tip-b', children: 'B' }), { delay: 0 });
    a2.dispatchEvent(new Event('pointerenter'));
    vi.advanceTimersByTime(0);
    expect(document.querySelector('.kerf-tooltip .tip-b')?.textContent).toBe('B');
    stop2();
  });
});
