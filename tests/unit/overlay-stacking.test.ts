/**
 * Stacked-surface arbitration for `kerfjs/overlay` (KF-CW7GJ8: a tooltip shown
 * inside a modal used to become the "topmost" overlay and silently disable the
 * modal's Escape, backdrop, and focus trap). These tests walk multi-surface
 * sequences — modal + tooltip, modal + popover, out-of-order closes, focus
 * restoration across a stack, and native `<dialog>` mixed with fallback
 * surfaces — rather than one overlay from a clean state.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { raw } from '../../src/jsx-runtime.js';
import { overlay, popover, tooltip } from '../../src/overlay.js';

function key(target: EventTarget, k: string, shiftKey = false): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    key: k,
    shiftKey,
    bubbles: true,
    cancelable: true,
  });
  target.dispatchEvent(event);
  return event;
}

function cancel(dialog: HTMLElement): Event {
  const event = new Event('cancel', { cancelable: true });
  dialog.dispatchEvent(event);
  return event;
}

const buttons = (...ids: string[]) =>
  raw(ids.map((id) => `<button id="${id}">${id}</button>`).join(''));

const byId = (id: string) => document.getElementById(id) as HTMLElement;

beforeEach(() => {
  document.body.innerHTML = '';
});
afterEach(() => {
  vi.useRealTimers();
});

/** Show a tooltip over `anchor` (hover + the show delay) and return its disposer. */
function showTooltip(anchor: HTMLElement, native = false): () => void {
  const dispose = tooltip(anchor, 'tip', { delay: 10, native });
  anchor.dispatchEvent(new Event('pointerenter'));
  vi.advanceTimersByTime(10);
  expect(document.querySelector('.kerf-tooltip')).not.toBeNull();
  return dispose;
}

describe('overlay stacking — a tooltip never takes arbitration', () => {
  it('modal → tooltip over it → Escape still closes the modal', () => {
    vi.useFakeTimers();
    const modal = overlay(buttons('m1', 'm2'), { initialFocus: '#m1' });
    showTooltip(byId('m2'));

    key(document, 'Escape');
    expect(modal.el.isConnected).toBe(false);
  });

  it('modal → tooltip over it → Tab stays trapped inside the modal', () => {
    vi.useFakeTimers();
    overlay(buttons('m1', 'm2'), { initialFocus: '#m1' });
    showTooltip(byId('m1'));

    byId('m2').focus();
    const forward = key(document, 'Tab');
    expect(forward.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(byId('m1'));

    const back = key(document, 'Tab', true);
    expect(back.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(byId('m2'));
  });

  it('modal → tooltip over it → a backdrop click still dismisses the modal', () => {
    vi.useFakeTimers();
    const modal = overlay(buttons('m1'), { initialFocus: '#m1' });
    showTooltip(byId('m1'));

    modal.el.click();
    expect(modal.el.isConnected).toBe(false);
  });

  it('native modal <dialog> → tooltip over it → Escape (cancel) closes the dialog', () => {
    vi.useFakeTimers();
    const modal = overlay(buttons('n1'), { native: true, initialFocus: '#n1' });
    expect(modal.el.tagName).toBe('DIALOG');
    showTooltip(byId('n1'));

    // The UA surfaces Escape as keydown, then `cancel` on the dialog.
    const down = key(document, 'Escape');
    expect(down.defaultPrevented).toBe(false); // the tooltip swallowed nothing
    cancel(modal.el);
    expect(modal.el.isConnected).toBe(false);
  });
});

describe('overlay stacking — a popover over a modal', () => {
  it('modal → popover → close the popover → the modal trap and Escape still work', () => {
    const modal = overlay(buttons('m1', 'm2'), { initialFocus: '#m1' });
    const pop = popover(byId('m2'), raw('<p>menu</p>'));
    pop.close();

    byId('m2').focus();
    key(document, 'Tab');
    expect(document.activeElement).toBe(byId('m1'));

    key(document, 'Escape');
    expect(modal.el.isConnected).toBe(false);
  });

  it('an Escape-dismissible popover gets Escape first, and only it closes', () => {
    const modal = overlay(buttons('m1', 'm2'), { initialFocus: '#m1' });
    const pop = popover(byId('m2'), raw('<p>menu</p>'), {
      dismiss: ['escape', 'outside'],
    });

    key(document, 'Escape');
    expect(pop.el.isConnected).toBe(false);
    expect(modal.el.isConnected).toBe(true);

    key(document, 'Escape');
    expect(modal.el.isConnected).toBe(false);
  });

  it('a popover that does not dismiss on Escape leaves Escape to the modal beneath', () => {
    const modal = overlay(buttons('m1', 'm2'), { initialFocus: '#m1' });
    const pop = popover(byId('m2'), raw('<p>menu</p>')); // dismiss: ['outside']

    key(document, 'Escape');
    expect(modal.el.isConnected).toBe(false);
    pop.close();
  });

  it('the modal keeps trapping Tab while a non-modal popover is open over it', () => {
    overlay(buttons('m1', 'm2'), { initialFocus: '#m1' });
    popover(byId('m2'), raw('<p>menu</p>'));

    byId('m2').focus();
    key(document, 'Tab');
    expect(document.activeElement).toBe(byId('m1'));
  });

  it('one backdrop click with a popover open closes only the popover', () => {
    const modal = overlay(buttons('m1', 'm2'), { initialFocus: '#m1' });
    const pop = popover(byId('m2'), raw('<p>menu</p>'));

    modal.el.click(); // outside the popover AND on the modal backdrop
    expect(pop.el.isConnected).toBe(false);
    expect(modal.el.isConnected).toBe(true);

    modal.el.click();
    expect(modal.el.isConnected).toBe(false);
  });

  it('a modal opened over a popover blocks the popover from outside clicks and Escape', () => {
    const anchor = document.createElement('button');
    document.body.appendChild(anchor);
    const pop = popover(anchor, raw('<p>menu</p>'), {
      dismiss: ['escape', 'outside'],
    });
    const modal = overlay(buttons('m1'), { dismiss: false });

    byId('m1').click(); // outside the popover, inside the modal
    key(document, 'Escape'); // the modal does not dismiss on Escape — a barrier
    expect(pop.el.isConnected).toBe(true);
    expect(modal.el.isConnected).toBe(true);

    modal.close();
    key(document, 'Escape');
    expect(pop.el.isConnected).toBe(false);
  });
});

describe('overlay stacking — out-of-order closes', () => {
  it('open A, open B, A.close(), then Escape dismisses B', () => {
    const a = overlay(buttons('a1'));
    const b = overlay(buttons('b1'));
    a.close();

    key(document, 'Escape');
    expect(b.el.isConnected).toBe(false);
  });

  it('open A, open B, A.close(): B still traps Tab', () => {
    const a = overlay(buttons('a1'));
    overlay(buttons('b1', 'b2'), { initialFocus: '#b1' });
    a.close();

    byId('b2').focus();
    key(document, 'Tab');
    expect(document.activeElement).toBe(byId('b1'));
  });
});

describe('overlay stacking — focus restoration', () => {
  function setup() {
    const opener = document.createElement('button');
    opener.id = 'x';
    document.body.appendChild(opener);
    opener.focus();
    const a = overlay(buttons('a1', 'a2'), { initialFocus: '#a2' });
    expect(document.activeElement).toBe(byId('a2'));
    const b = overlay(buttons('b1'), { initialFocus: '#b1' });
    expect(document.activeElement).toBe(byId('b1'));
    return { opener, a, b };
  }

  it('close B → focus returns into A; close A → focus returns to the opener', () => {
    const { opener, a, b } = setup();
    b.close();
    expect(document.activeElement).toBe(byId('a2'));
    a.close();
    expect(document.activeElement).toBe(opener);
  });

  it('close A before B → focus stays in B, then closing B lands on the opener (never a detached node)', () => {
    const { opener, a, b } = setup();
    a.close();
    expect(document.activeElement).toBe(byId('b1'));
    expect(document.activeElement?.isConnected).toBe(true);

    b.close();
    expect(document.activeElement).toBe(opener);
    expect(document.activeElement?.isConnected).toBe(true);
  });

  it('dismissing B with Escape restores focus into A', () => {
    const { a } = setup();
    key(document, 'Escape');
    expect(document.activeElement).toBe(byId('a2'));
    expect(a.el.isConnected).toBe(true);
  });
});

describe('overlay stacking — native <dialog> mixed with fallback surfaces', () => {
  it('fallback modal A, then native dialog B: Escape leaves A alone and cancel closes only B', () => {
    const a = overlay(buttons('a1'), { initialFocus: '#a1' });
    const b = overlay(buttons('b1', 'b2'), {
      native: true,
      initialFocus: '#b1',
    });
    expect(b.el.tagName).toBe('DIALOG');

    const down = key(document, 'Escape');
    expect(a.el.isConnected).toBe(true);
    expect(down.defaultPrevented).toBe(false); // the native cancel may follow
    cancel(b.el);
    expect(b.el.isConnected).toBe(false);
    expect(a.el.isConnected).toBe(true);

    key(document, 'Escape');
    expect(a.el.isConnected).toBe(false);
  });

  it('fallback modal A, then native dialog B: A does not steal Tab from B', () => {
    overlay(buttons('a1'), { initialFocus: '#a1' });
    overlay(buttons('b1', 'b2'), { native: true, initialFocus: '#b2' });

    const tab = key(document, 'Tab');
    expect(tab.defaultPrevented).toBe(false); // the dialog's own Tab order runs
    expect(document.activeElement).toBe(byId('b2'));
  });

  // A fallback surface can't mount INSIDE the dialog (kerf allows one mount per
  // tree), so it stacks as a body sibling; keyboard arbitration is the same.
  it('native dialog B, then fallback modal A over it: Escape closes only A and suppresses the dialog cancel', () => {
    const b = overlay(buttons('b1'), { native: true, initialFocus: '#b1' });
    const a = overlay(buttons('a1'), { initialFocus: '#a1' });

    const down = key(document, 'Escape');
    expect(a.el.isConnected).toBe(false);
    expect(down.defaultPrevented).toBe(true); // no close request reaches B
    expect(b.el.isConnected).toBe(true);
    expect((b.el as HTMLDialogElement).open).toBe(true);
    expect(document.activeElement).toBe(byId('b1'));

    cancel(b.el);
    expect(b.el.isConnected).toBe(false);
  });

  it('a stray cancel on a covered native dialog is swallowed without closing it', () => {
    const b = overlay(buttons('b1'), { native: true });
    const a = overlay(buttons('a1'));

    const ev = cancel(b.el);
    expect(ev.defaultPrevented).toBe(true);
    expect(b.el.isConnected).toBe(true);
    a.close();
    b.close();
  });
});
