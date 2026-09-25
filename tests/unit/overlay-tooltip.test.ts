import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { jsx, raw } from '../../src/jsx-runtime.js';
import { tooltip } from '../../src/overlay.js';
import { anchorAt } from './overlay-test-helpers.js';

beforeEach(() => {
  document.body.innerHTML = '';
});
afterEach(() => {
  vi.useRealTimers();
});

describe('tooltip()', () => {
  const tipAnchor = () =>
    anchorAt({
      left: 100,
      right: 150,
      top: 200,
      bottom: 220,
      width: 50,
      height: 20,
    });

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

  it('pointerenter → focus → pointerleave stays visible until focus leaves', () => {
    vi.useFakeTimers();
    const anchor = tipAnchor();
    const stop = tooltip(anchor, 'x', { delay: 0, hideDelay: 0 });

    anchor.dispatchEvent(new Event('pointerenter'));
    vi.advanceTimersByTime(0);
    anchor.dispatchEvent(new Event('focus'));
    anchor.dispatchEvent(new Event('pointerleave'));
    vi.advanceTimersByTime(0);
    expect(document.querySelector('.kerf-tooltip')).not.toBeNull();

    anchor.dispatchEvent(new Event('blur'));
    vi.advanceTimersByTime(0);
    expect(document.querySelector('.kerf-tooltip')).toBeNull();
    stop();
  });

  it('focus → pointerenter → blur stays visible until the pointer leaves', () => {
    vi.useFakeTimers();
    const anchor = tipAnchor();
    const stop = tooltip(anchor, 'x', { delay: 0, hideDelay: 0 });

    anchor.dispatchEvent(new Event('focus'));
    vi.advanceTimersByTime(0);
    anchor.dispatchEvent(new Event('pointerenter'));
    anchor.dispatchEvent(new Event('blur'));
    vi.advanceTimersByTime(0);
    expect(document.querySelector('.kerf-tooltip')).not.toBeNull();

    anchor.dispatchEvent(new Event('pointerleave'));
    vi.advanceTimersByTime(0);
    expect(document.querySelector('.kerf-tooltip')).toBeNull();
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
    expect(document.querySelector('.kerf-tooltip .tip-em')?.textContent).toBe(
      'e',
    );
    stop1();

    document.body.innerHTML = '';
    const a2 = tipAnchor();
    const stop2 = tooltip(
      a2,
      () => jsx('b', { class: 'tip-b', children: 'B' }),
      { delay: 0 },
    );
    a2.dispatchEvent(new Event('pointerenter'));
    vi.advanceTimersByTime(0);
    expect(document.querySelector('.kerf-tooltip .tip-b')?.textContent).toBe(
      'B',
    );
    stop2();
  });
});

describe('tooltip() — a failed show from the delay timer', () => {
  // Contract: the half-built tooltip is rolled back, the ORIGINAL error escapes
  // the timer callback for the host to report (fake timers surface it at
  // advanceTimersByTime), and the tooltip stays armed for the next enter.
  const geometry = { fail: true };
  const failure = new Error('geometry failed');
  const failingAnchor = (): HTMLElement => {
    geometry.fail = true;
    const anchor = document.createElement('button');
    document.body.appendChild(anchor);
    anchor.getBoundingClientRect = () => {
      if (geometry.fail) throw failure;
      return new DOMRect(100, 200, 50, 20);
    };
    return anchor;
  };

  it('rolls back, rethrows from the timer, and shows on the next hover once positioning works', () => {
    vi.useFakeTimers();
    const anchor = failingAnchor();
    const stop = tooltip(anchor, 'tip', { delay: 10, hideDelay: 5 });

    anchor.dispatchEvent(new Event('pointerenter'));
    expect(() => vi.advanceTimersByTime(10)).toThrow(failure);
    expect(document.querySelector('.kerf-tooltip')).toBeNull();

    // Leaving after the failure schedules no hide and throws nothing.
    anchor.dispatchEvent(new Event('pointerleave'));
    expect(() => vi.advanceTimersByTime(50)).not.toThrow();

    geometry.fail = false;
    anchor.dispatchEvent(new Event('pointerenter'));
    vi.advanceTimersByTime(10);
    const tip = document.querySelector<HTMLElement>('.kerf-tooltip');
    expect(tip?.textContent).toBe('tip');
    expect(tip?.getAttribute('role')).toBe('tooltip');

    anchor.dispatchEvent(new Event('pointerleave'));
    vi.advanceTimersByTime(5);
    expect(document.querySelector('.kerf-tooltip')).toBeNull();
    stop();
  });

  it('does not retry on its own while the pointer stays, but a focus arriving meanwhile retries', () => {
    vi.useFakeTimers();
    const anchor = failingAnchor();
    const stop = tooltip(anchor, 'tip', { delay: 10 });

    anchor.dispatchEvent(new Event('pointerenter'));
    expect(() => vi.advanceTimersByTime(10)).toThrow(failure);
    // No retry storm: nothing further is scheduled while the pointer stays.
    expect(vi.getTimerCount()).toBe(0);

    geometry.fail = false;
    anchor.dispatchEvent(new Event('focus'));
    vi.advanceTimersByTime(10);
    expect(document.querySelector('.kerf-tooltip')).not.toBeNull();
    // Both modalities are still tracked: leaving one keeps the tooltip.
    anchor.dispatchEvent(new Event('pointerleave'));
    vi.advanceTimersByTime(200);
    expect(document.querySelector('.kerf-tooltip')).not.toBeNull();
    stop();
    expect(document.querySelector('.kerf-tooltip')).toBeNull();
  });

  it('a throwing render fn content is rolled back the same way and the next show renders', () => {
    vi.useFakeTimers();
    const anchor = anchorAt({ left: 0, right: 10, top: 50, bottom: 60 });
    const renderFailure = new Error('render failed');
    let attempts = 0;
    const stop = tooltip(
      anchor,
      () => {
        attempts++;
        if (attempts === 1) throw renderFailure;
        return raw('<b class="rendered">ok</b>');
      },
      { delay: 0 },
    );

    anchor.dispatchEvent(new Event('pointerenter'));
    expect(() => vi.advanceTimersByTime(1)).toThrow(renderFailure);
    expect(document.querySelector('.kerf-tooltip')).toBeNull();

    anchor.dispatchEvent(new Event('pointerleave'));
    anchor.dispatchEvent(new Event('pointerenter'));
    vi.advanceTimersByTime(1);
    expect(document.querySelector('.kerf-tooltip .rendered')).not.toBeNull();
    stop();
  });

  it('the disposer is safe after a failed show', () => {
    vi.useFakeTimers();
    const anchor = failingAnchor();
    const stop = tooltip(anchor, 'tip', { delay: 0 });
    anchor.dispatchEvent(new Event('pointerenter'));
    expect(() => vi.advanceTimersByTime(1)).toThrow(failure);
    expect(() => stop()).not.toThrow();
    geometry.fail = false;
    anchor.dispatchEvent(new Event('pointerenter'));
    vi.advanceTimersByTime(1);
    expect(document.querySelector('.kerf-tooltip')).toBeNull();
  });
});
