import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { jsx, raw } from '../../src/jsx-runtime.js';
import { confirm, overlay, toast } from '../../src/overlay.js';
import { signal } from '../../src/reactive.js';

function key(target: EventTarget, k: string, init: KeyboardEventInit = {}): void {
  target.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...init }));
}

beforeEach(() => {
  document.body.innerHTML = '';
});
afterEach(() => {
  vi.useRealTimers();
});

describe('overlay()', () => {
  it('appends a wrapper with the className + aria, mounts content, and removes it all on close', () => {
    const h = overlay(raw('<button class="go">go</button>'), { className: 'my-overlay', trap: true });
    expect(h.el.parentElement).toBe(document.body);
    expect(h.el.className).toBe('my-overlay');
    expect(h.el.getAttribute('role')).toBe('dialog');
    expect(h.el.getAttribute('aria-modal')).toBe('true');
    expect(h.el.querySelector('.go')).not.toBeNull();

    h.close();
    expect(h.el.parentElement).toBeNull();
    expect(document.body.querySelector('.my-overlay')).toBeNull();
  });

  it('resolves result with the value passed to close()', async () => {
    const h = overlay(raw('<div/>'));
    h.close('picked');
    await expect(h.result).resolves.toBe('picked');
  });

  it('drives reactive content through mount() and disposes it on close', () => {
    const label = signal('a');
    const h = overlay(() => jsx('span', { class: 'v', children: label.value }));
    expect(h.el.querySelector('.v')?.textContent).toBe('a');
    label.value = 'b';
    expect(h.el.querySelector('.v')?.textContent).toBe('b');
    h.close();
    // After close the mount is disposed — a further write does not throw / re-render.
    expect(() => { label.value = 'c'; }).not.toThrow();
  });

  it('close() is idempotent', async () => {
    const h = overlay(raw('<div/>'));
    h.close(1);
    h.close(2); // ignored
    await expect(h.result).resolves.toBe(1);
    expect(document.body.children.length).toBe(0);
  });

  describe('dismissal', () => {
    it('Escape dismisses and calls onDismiss (default triggers)', () => {
      const onDismiss = vi.fn();
      const h = overlay(raw('<div/>'), { onDismiss });
      key(document, 'Escape');
      expect(onDismiss).toHaveBeenCalledTimes(1);
      expect(h.el.parentElement).toBeNull();
    });

    it('a backdrop click (on the wrapper itself) dismisses, but a click on content does NOT', () => {
      const h = overlay(raw('<button class="inner">x</button>'), { dismiss: ['backdrop'] });
      (h.el.querySelector('.inner') as HTMLElement).click(); // content — no dismiss
      expect(h.el.parentElement).toBe(document.body);
      h.el.click(); // the wrapper/backdrop itself
      expect(h.el.parentElement).toBeNull();
    });

    it('outside: a click outside the wrapper dismisses; outsideIgnore exempts an element', () => {
      const trigger = document.createElement('button');
      document.body.appendChild(trigger);
      const h = overlay(raw('<div class="inner"/>'), { dismiss: ['outside'], trap: false, outsideIgnore: trigger });

      trigger.click(); // ignored
      expect(h.el.parentElement).toBe(document.body);

      (h.el.querySelector('.inner') as HTMLElement).click(); // inside — no dismiss
      expect(h.el.parentElement).toBe(document.body);

      document.body.click(); // outside — dismiss
      expect(h.el.parentElement).toBeNull();
    });

    it('outside without outsideIgnore dismisses on any outside click', () => {
      const h = overlay(raw('<div/>'), { dismiss: ['outside'], trap: false });
      document.body.click();
      expect(h.el.parentElement).toBeNull();
    });

    it('outsideIgnore accepts an array and exempts a click on a descendant of an ignored element', () => {
      const panel = document.createElement('div');
      const child = document.createElement('button');
      panel.appendChild(child);
      document.body.appendChild(panel);
      const h = overlay(raw('<div/>'), { dismiss: ['outside'], trap: false, outsideIgnore: [panel] });
      child.click(); // descendant of an ignored element — not dismissed
      expect(h.el.parentElement).toBe(document.body);
      document.body.click(); // truly outside — dismiss
      expect(h.el.parentElement).toBeNull();
    });

    it('dismiss:false disables user dismissal (only close() works)', () => {
      const h = overlay(raw('<div/>'), { dismiss: false });
      key(document, 'Escape');
      h.el.click();
      expect(h.el.parentElement).toBe(document.body);
      h.close();
      expect(h.el.parentElement).toBeNull();
    });
  });

  it('initialFocus: a selector focuses the matched element', () => {
    const h = overlay(raw('<input class="first"/><input class="second"/>'), { initialFocus: '.second' });
    expect(document.activeElement).toBe(h.el.querySelector('.second'));
  });

  it('initialFocus true focuses the wrapper itself when there is nothing focusable', () => {
    const h = overlay(raw('<p>no controls</p>'), { initialFocus: true });
    expect(document.activeElement).toBe(h.el);
    expect(h.el.tabIndex).toBe(-1);
  });

  // The trap's WRAP-AROUND (dispatched Tab lands on a boundary → the handler
  // calls .focus()) is observable in happy-dom because .focus() updates
  // activeElement. NATIVE intermediate Tab order is the browser spec's job.
  describe('focus trap', () => {
    const tab = (shift = false) =>
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Tab', shiftKey: shift, bubbles: true, cancelable: true }),
      );
    const setup = () => {
      const h = overlay(raw('<button id="a">a</button><button id="b">b</button><button id="c">c</button>'), {
        trap: true,
        initialFocus: '#a',
      });
      const get = (id: string) => h.el.querySelector<HTMLElement>('#' + id) as HTMLElement;
      return { h, get };
    };

    it('Tab on the last focusable wraps to the first', () => {
      const { get } = setup();
      get('c').focus();
      tab();
      expect(document.activeElement).toBe(get('a'));
    });

    it('Shift+Tab on the first focusable wraps to the last', () => {
      const { get } = setup();
      get('a').focus();
      tab(true);
      expect(document.activeElement).toBe(get('c'));
    });

    it('Tab while focus is outside the overlay pulls it back to the first', () => {
      const { get } = setup();
      document.body.focus();
      tab();
      expect(document.activeElement).toBe(get('a'));
    });

    it('Tab in the middle is left to the browser (no wrap, no throw)', () => {
      const { get } = setup();
      get('b').focus();
      tab();
      expect(document.activeElement).toBe(get('b')); // handler didn't move it
    });

    it('Tab with no focusable content is a no-op (no throw)', () => {
      overlay(raw('<p>nothing</p>'), { trap: true, initialFocus: false });
      expect(() => tab()).not.toThrow();
    });
  });
});

describe('confirm()', () => {
  it('OK resolves true, Cancel resolves false', async () => {
    const p1 = confirm('Sure?');
    const ok = document.querySelector('[data-confirm="ok"]') as HTMLElement;
    ok.click();
    await expect(p1).resolves.toBe(true);

    const p2 = confirm('Sure?');
    (document.querySelector('[data-confirm="cancel"]') as HTMLElement).click();
    await expect(p2).resolves.toBe(false);
  });

  it('Escape (and any dismissal) resolves false', async () => {
    const p = confirm('Sure?');
    key(document, 'Escape');
    await expect(p).resolves.toBe(false);
  });

  it('escapes the message + labels and honors title / danger', () => {
    void confirm('<img src=x onerror=alert(1)>', { title: 'Danger', okText: 'Yes', danger: true });
    const wrapper = document.querySelector('.kerf-confirm--danger') as HTMLElement;
    expect(wrapper).not.toBeNull();
    const msg = wrapper.querySelector('.kerf-confirm__message') as HTMLElement;
    // Auto-escaped: the tag is text, not a real <img> element.
    expect(msg.querySelector('img')).toBeNull();
    expect(msg.textContent).toBe('<img src=x onerror=alert(1)>');
    expect(wrapper.querySelector('.kerf-confirm__title')?.textContent).toBe('Danger');
    expect(wrapper.querySelector('.kerf-confirm__ok')?.textContent).toBe('Yes');
  });
});

describe('toast()', () => {
  it('lazily creates a shared region, mounts the content, and auto-dismisses after duration', () => {
    vi.useFakeTimers();
    toast('Saved');
    const region = document.querySelector('.kerf-toasts');
    expect(region).not.toBeNull();
    const el = region?.querySelector('.kerf-toast') as HTMLElement;
    expect(el.getAttribute('role')).toBe('status');
    expect(el.textContent).toBe('Saved');

    vi.advanceTimersByTime(4000);
    expect(region?.querySelector('.kerf-toast')).toBeNull();
  });

  it('a second toast reuses the shared region (stacking)', () => {
    vi.useFakeTimers();
    toast('one', { duration: 0 });
    toast('two', { duration: 0 });
    expect(document.querySelectorAll('.kerf-toasts .kerf-toast').length).toBe(2);
  });

  it('accepts a render function as content', () => {
    vi.useFakeTimers();
    toast(() => jsx('b', { class: 'bold', children: 'hi' }), { duration: 0 });
    expect(document.querySelector('.kerf-toast .bold')?.textContent).toBe('hi');
  });

  it('returns a dismiss function that removes it early', () => {
    vi.useFakeTimers();
    const dismiss = toast('Hi', { className: 'my-toast' });
    expect(document.querySelector('.my-toast')).not.toBeNull();
    dismiss();
    expect(document.querySelector('.my-toast')).toBeNull();
    dismiss(); // idempotent
  });

  it('duration 0 keeps it until dismissed by hand', () => {
    vi.useFakeTimers();
    const dismiss = toast('Sticky', { duration: 0 });
    vi.advanceTimersByTime(100000);
    expect(document.querySelector('.kerf-toast')).not.toBeNull();
    dismiss();
    expect(document.querySelector('.kerf-toast')).toBeNull();
  });

  it('accepts a custom container', () => {
    const box = document.createElement('div');
    box.id = 'box';
    document.body.appendChild(box);
    const dismiss = toast('X', { container: box, duration: 0 });
    expect(box.querySelector('.kerf-toast')).not.toBeNull();
    expect(document.querySelector('.kerf-toasts')).toBeNull(); // no shared region created
    dismiss();
  });
});
