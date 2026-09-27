/**
 * An anchored surface never outlives its anchor (KF-BAVCEV). A tooltip or
 * popover anchored to a control inside a modal used to stay on screen after
 * the modal closed: the anchor left the document without a pointerleave /
 * blur, and nothing else closed the surface. Both now watch their anchor with
 * the same MutationObserver lifecycle `kerfjs/attach` uses, and close when it
 * leaves the document — but not when it merely moves within it.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { raw } from '../../src/jsx-runtime.js';
import { overlay, popover, tooltip } from '../../src/overlay.js';

// MutationObserver callbacks are delivered as a microtask.
const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  document.body.innerHTML = '';
});
afterEach(() => {
  vi.useRealTimers();
});

const tip = () => document.querySelector('.kerf-tooltip');

function hover(anchor: HTMLElement): void {
  anchor.dispatchEvent(new Event('pointerenter'));
}

describe('popover() closes when its anchor leaves the document', () => {
  it('closing the modal that holds the anchor closes the popover without onDismiss', async () => {
    const modal = overlay(raw('<button id="anchor">a</button>'));
    const onDismiss = vi.fn();
    const pop = popover(
      document.getElementById('anchor')!,
      raw('<p>menu</p>'),
      {
        onDismiss,
      },
    );

    modal.close();
    await flush();
    expect(pop.el.isConnected).toBe(false);
    await expect(pop.result).resolves.toBeUndefined();
    expect(onDismiss).not.toHaveBeenCalled(); // cleanup, not a user dismissal
  });

  it('removing the anchor directly closes the popover', async () => {
    const anchor = document.createElement('button');
    document.body.appendChild(anchor);
    const pop = popover(anchor, raw('<p>menu</p>'));

    anchor.remove();
    await flush();
    expect(pop.el.isConnected).toBe(false);
  });

  it('moving the anchor within the document keeps the popover open', async () => {
    const a = document.createElement('div');
    const b = document.createElement('div');
    const anchor = document.createElement('button');
    a.appendChild(anchor);
    document.body.append(a, b);
    const pop = popover(anchor, raw('<p>menu</p>'));

    b.appendChild(anchor); // one synchronous move
    await flush();
    expect(pop.el.isConnected).toBe(true);
    pop.close();
  });

  it('a popover closed first ignores a later anchor removal', async () => {
    const anchor = document.createElement('button');
    document.body.appendChild(anchor);
    const pop = popover(anchor, raw('<p>menu</p>'));
    pop.close();
    anchor.remove();
    await flush();
    await expect(pop.result).resolves.toBeUndefined();
  });
});

describe('tooltip() hides when its anchor leaves the document', () => {
  it('closing the modal that holds the anchor hides a shown tooltip', async () => {
    const modal = overlay(raw('<button id="anchor">a</button>'));
    const anchor = document.getElementById('anchor')!;
    const dispose = tooltip(anchor, 'tip', { delay: 0 });
    hover(anchor);
    await flush();
    expect(tip()).not.toBeNull();

    modal.close();
    await flush();
    expect(tip()).toBeNull();
    expect(() => dispose()).not.toThrow();
  });

  it('a show still pending when the anchor leaves never appears', async () => {
    vi.useFakeTimers();
    const anchor = document.createElement('button');
    document.body.appendChild(anchor);
    tooltip(anchor, 'tip', { delay: 50 });
    hover(anchor);
    anchor.remove();
    vi.advanceTimersByTime(50);
    expect(tip()).toBeNull();
  });

  it('moving the anchor within the document keeps the tooltip shown', async () => {
    const a = document.createElement('div');
    const b = document.createElement('div');
    const anchor = document.createElement('button');
    a.appendChild(anchor);
    document.body.append(a, b);
    tooltip(anchor, 'tip', { delay: 0 });
    hover(anchor);
    await flush();

    b.appendChild(anchor);
    await flush();
    expect(tip()).not.toBeNull();
  });

  it('a re-inserted anchor shows its tooltip again on the next hover', async () => {
    const anchor = document.createElement('button');
    document.body.appendChild(anchor);
    tooltip(anchor, 'tip', { delay: 0, hideDelay: 0 });
    hover(anchor);
    await flush();
    anchor.remove();
    await flush();
    expect(tip()).toBeNull();

    document.body.appendChild(anchor);
    hover(anchor);
    await flush();
    expect(tip()).not.toBeNull();
  });
});
