import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { jsx, raw } from '../../src/jsx-runtime.js';
import { confirm, form, overlay, prompt, toast } from '../../src/overlay.js';
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

const clickBtn = (sel: string): void => {
  document.querySelector<HTMLElement>(sel)?.click();
};

describe('prompt()', () => {
  it('prefills defaultValue and resolves the live entered string on OK', async () => {
    const p = prompt('Name?', { defaultValue: 'ada' });
    const input = document.querySelector<HTMLInputElement>('.kerf-prompt__input')!;
    expect(input.value).toBe('ada');
    input.value = 'grace';
    clickBtn('[data-prompt="ok"]');
    await expect(p).resolves.toBe('grace');
    expect(document.querySelector('.kerf-prompt')).toBeNull(); // closed
  });

  it('an empty string is a valid OK result (not null)', async () => {
    const p = prompt('X', { defaultValue: '' });
    clickBtn('[data-prompt="ok"]');
    await expect(p).resolves.toBe('');
  });

  it('resolves null on Cancel', async () => {
    const p = prompt('X', { defaultValue: 'ignored' });
    clickBtn('[data-prompt="cancel"]');
    await expect(p).resolves.toBeNull();
  });

  it('resolves null on Escape dismissal', async () => {
    const p = prompt('X');
    key(document, 'Escape');
    await expect(p).resolves.toBeNull();
  });

  it('Enter in the field submits, like the native prompt', async () => {
    const p = prompt('X', { defaultValue: 'v' });
    const input = document.querySelector<HTMLInputElement>('.kerf-prompt__input')!;
    key(input, 'Enter');
    await expect(p).resolves.toBe('v');
  });

  it('validate blocks OK inline and keeps the dialog open, then allows once it passes', async () => {
    const p = prompt('Email', { validate: (v) => (v.includes('@') ? '' : 'need @') });
    const input = document.querySelector<HTMLInputElement>('.kerf-prompt__input')!;
    const err = document.querySelector<HTMLElement>('.kerf-prompt__error')!;
    expect(err.hidden).toBe(true);

    input.value = 'nope';
    clickBtn('[data-prompt="ok"]');
    expect(err.hidden).toBe(false);
    expect(err.textContent).toBe('need @');
    expect(document.querySelector('.kerf-prompt')).not.toBeNull(); // still open

    input.value = 'a@b';
    clickBtn('[data-prompt="ok"]');
    await expect(p).resolves.toBe('a@b');
  });

  it('auto-escapes the message (no HTML injection)', async () => {
    const p = prompt('<img src=x onerror=alert(1)>');
    const label = document.querySelector('.kerf-prompt__message')!;
    expect(label.querySelector('img')).toBeNull();
    expect(label.textContent).toContain('<img');
    clickBtn('[data-prompt="cancel"]'); // clean up the pending overlay
    await p;
  });

  it('renders an optional title, placeholder, and a custom inputType', async () => {
    const p = prompt('Email please', { title: 'Sign in', placeholder: 'you@example.com', inputType: 'email' });
    expect(document.querySelector('.kerf-prompt__title')?.textContent).toBe('Sign in');
    const input = document.querySelector<HTMLInputElement>('.kerf-prompt__input')!;
    expect(input.getAttribute('type')).toBe('email');
    expect(input.getAttribute('placeholder')).toBe('you@example.com');
    clickBtn('[data-prompt="cancel"]');
    await p;
  });

  it('Enter on a non-field element (the Cancel button) does not submit', async () => {
    const p = prompt('X', { defaultValue: 'v' });
    key(document.querySelector('[data-prompt="cancel"]')!, 'Enter');
    expect(document.querySelector('.kerf-prompt')).not.toBeNull(); // still open — not submitted
    clickBtn('[data-prompt="cancel"]');
    await expect(p).resolves.toBeNull();
  });
});

describe('form()', () => {
  it('renders one labeled input per field (label defaults to name) and resolves a record on OK', async () => {
    const p = form([
      { name: 'host', label: 'Host', defaultValue: 'localhost' },
      { name: 'port', defaultValue: '80' },
    ]);
    const labels = Array.from(document.querySelectorAll('.kerf-form__label')).map((l) => l.textContent);
    expect(labels).toEqual(['Host', 'port']); // second falls back to the name

    document.querySelector<HTMLInputElement>('[data-field="host"]')!.value = 'db.example';
    clickBtn('[data-form="ok"]');
    await expect(p).resolves.toEqual({ host: 'db.example', port: '80' });
    expect(document.querySelector('.kerf-form')).toBeNull();
  });

  it('resolves null on Cancel and on Escape', async () => {
    const pCancel = form([{ name: 'x' }]);
    clickBtn('[data-form="cancel"]');
    await expect(pCancel).resolves.toBeNull();

    const pEsc = form([{ name: 'x' }]);
    key(document, 'Escape');
    await expect(pEsc).resolves.toBeNull();
  });

  it('per-field validate blocks OK, shows each error, focuses the first invalid, then passes once fixed', async () => {
    const p = form([
      { name: 'user', validate: (v) => (v ? '' : 'required') },
      { name: 'token', validate: (v) => (v.length >= 3 ? '' : 'too short') },
    ]);
    clickBtn('[data-form="ok"]');

    const uErr = document.querySelector<HTMLElement>('[data-field-error="user"]')!;
    const tErr = document.querySelector<HTMLElement>('[data-field-error="token"]')!;
    expect(uErr.hidden).toBe(false);
    expect(uErr.textContent).toBe('required');
    expect(tErr.textContent).toBe('too short');
    expect(document.activeElement).toBe(document.querySelector('[data-field="user"]'));
    expect(document.querySelector('.kerf-form')).not.toBeNull(); // still open

    document.querySelector<HTMLInputElement>('[data-field="user"]')!.value = 'ada';
    document.querySelector<HTMLInputElement>('[data-field="token"]')!.value = 'abcd';
    clickBtn('[data-form="ok"]');
    await expect(p).resolves.toEqual({ user: 'ada', token: 'abcd' });
  });

  it('clears a previously-shown error once the field validates, on the next OK', async () => {
    const p = form([{ name: 'a', validate: (v) => (v ? '' : 'req') }]);
    clickBtn('[data-form="ok"]');
    const err = document.querySelector<HTMLElement>('[data-field-error="a"]')!;
    expect(err.hidden).toBe(false);

    document.querySelector<HTMLInputElement>('[data-field="a"]')!.value = 'x';
    clickBtn('[data-form="ok"]');
    await expect(p).resolves.toEqual({ a: 'x' });
  });

  it('Enter in a field submits', async () => {
    const p = form([{ name: 'q', defaultValue: 'hi' }]);
    key(document.querySelector('[data-field="q"]')!, 'Enter');
    await expect(p).resolves.toEqual({ q: 'hi' });
  });

  it('renders an optional title, a field placeholder, and a custom input type', async () => {
    const p = form([{ name: 'pw', label: 'Password', type: 'password', placeholder: '••••' }], { title: 'Login' });
    expect(document.querySelector('.kerf-form__title')?.textContent).toBe('Login');
    const input = document.querySelector<HTMLInputElement>('[data-field="pw"]')!;
    expect(input.getAttribute('type')).toBe('password');
    expect(input.getAttribute('placeholder')).toBe('••••');
    clickBtn('[data-form="ok"]');
    await expect(p).resolves.toEqual({ pw: '' }); // empty submit is still a record
  });

  it('Enter on a non-field element (the Cancel button) does not submit', async () => {
    const p = form([{ name: 'x' }]);
    key(document.querySelector('[data-form="cancel"]')!, 'Enter');
    expect(document.querySelector('.kerf-form')).not.toBeNull(); // still open
    clickBtn('[data-form="cancel"]');
    await expect(p).resolves.toBeNull();
  });
});
