import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { jsx, raw } from '../../src/jsx-runtime.js';
import { autoReposition, confirm, form, overlay, popover, positionAnchored, prompt, toast, tooltip } from '../../src/overlay.js';
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

  it('returns { el, dismiss } — el is the node, dismiss removes it early (idempotent)', () => {
    vi.useFakeTimers();
    const { el, dismiss } = toast('Hi', { className: 'my-toast' });
    expect(el).toBe(document.querySelector('.my-toast'));
    expect(document.querySelector('.my-toast')).not.toBeNull();
    dismiss();
    expect(document.querySelector('.my-toast')).toBeNull();
    dismiss(); // idempotent
  });

  it('duration 0 keeps it until dismissed by hand', () => {
    vi.useFakeTimers();
    const { dismiss } = toast('Sticky', { duration: 0 });
    vi.advanceTimersByTime(100000);
    expect(document.querySelector('.kerf-toast')).not.toBeNull();
    dismiss();
    expect(document.querySelector('.kerf-toast')).toBeNull();
  });

  it('accepts a custom container', () => {
    const box = document.createElement('div');
    box.id = 'box';
    document.body.appendChild(box);
    const { dismiss } = toast('X', { container: box, duration: 0 });
    expect(box.querySelector('.kerf-toast')).not.toBeNull();
    expect(document.querySelector('.kerf-toasts')).toBeNull(); // no shared region created
    dismiss();
  });

  it("variant adds a `${className}--${variant}` accent class", () => {
    vi.useFakeTimers();
    toast('done', { variant: 'success', duration: 0 });
    const el = document.querySelector('.kerf-toast') as HTMLElement;
    expect(el.classList.contains('kerf-toast--success')).toBe(true);
  });

  it("mode:'replace' collapses to the latest — a rapid sequence leaves one toast", () => {
    vi.useFakeTimers();
    toast('one', { duration: 0 });
    toast('two', { duration: 0 });
    expect(document.querySelectorAll('.kerf-toast').length).toBe(2); // default stacks

    toast('three', { mode: 'replace', duration: 0 });
    const toasts = document.querySelectorAll('.kerf-toast');
    expect(toasts.length).toBe(1);
    expect(toasts[0].textContent).toBe('three');
  });

  it('enterClass is added on the next animation frame (CSS entrance hook)', () => {
    vi.useFakeTimers();
    const { el } = toast('hi', { enterClass: 'is-in', duration: 0 });
    expect(el.classList.contains('is-in')).toBe(false); // not yet — waits a frame
    vi.advanceTimersByTime(20); // flush the rAF
    expect(el.classList.contains('is-in')).toBe(true);
  });

  it('exitClass is added on dismiss and the node is removed after exitDuration (CSS exit hook)', () => {
    vi.useFakeTimers();
    const { el, dismiss } = toast('bye', { exitClass: 'is-out', exitDuration: 200, duration: 0 });
    dismiss();
    expect(el.classList.contains('is-out')).toBe(true); // exit class applied
    expect(document.querySelector('.kerf-toast')).not.toBeNull(); // still present during the transition
    vi.advanceTimersByTime(200);
    expect(document.querySelector('.kerf-toast')).toBeNull(); // removed after exitDuration
  });

  it('a dismissed toast never adds its enterClass (a frame after removal)', () => {
    vi.useFakeTimers();
    const { el, dismiss } = toast('x', { enterClass: 'is-in', duration: 0 });
    dismiss(); // before the rAF fires
    vi.advanceTimersByTime(20);
    expect(el.classList.contains('is-in')).toBe(false);
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

const rectFn = (r: Partial<DOMRect>) => () =>
  ({ left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0, x: 0, y: 0, toJSON() {} , ...r }) as DOMRect;

const setViewport = (w: number, h: number): void => {
  Object.defineProperty(window, 'innerWidth', { value: w, configurable: true });
  Object.defineProperty(window, 'innerHeight', { value: h, configurable: true });
};

function anchorAt(r: Partial<DOMRect>): HTMLElement {
  const a = document.createElement('button');
  document.body.appendChild(a);
  a.getBoundingClientRect = rectFn(r);
  return a;
}

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

describe('confirm / prompt / form — bring-your-own markup (render)', () => {
  it('confirm render: spreading ok/cancel wires the buttons; default markup is not used', async () => {
    const p = confirm('Delete?', {
      render: ({ message, ok, cancel }) => jsx('div', {
        class: 'my-dialog',
        children: [
          jsx('p', { children: message }),
          jsx('button', { ...cancel, class: 'btn', children: 'No' }),
          jsx('button', { ...ok, class: 'btn btn-danger', children: 'Yes' }),
        ],
      }),
    });
    expect(document.querySelector('.my-dialog')).not.toBeNull();
    expect(document.querySelector('.kerf-confirm')).toBeNull(); // default markup skipped
    const yes = document.querySelector('.btn-danger') as HTMLElement;
    expect(yes.getAttribute('data-confirm')).toBe('ok'); // wiring spread through
    yes.click();
    await expect(p).resolves.toBe(true);

    const p2 = confirm('Delete?', {
      render: ({ ok, cancel }) => jsx('div', {
        children: [
          jsx('button', { ...cancel, class: 'no-btn', children: 'No' }),
          jsx('button', { ...ok, children: 'Yes' }),
        ],
      }),
    });
    (document.querySelector('.no-btn') as HTMLElement).click();
    await expect(p2).resolves.toBe(false);
  });

  it('prompt render: input/error/ok wiring — validate blocks in the BYO error slot, then OK resolves', async () => {
    const p = prompt('Name', {
      defaultValue: 'seed',
      validate: (v) => (v.length > 0 ? '' : 'required'),
      render: ({ message, input, error, ok, cancel }) => jsx('div', {
        class: 'my-prompt',
        children: [
          jsx('label', { children: message }),
          jsx('input', { ...input, class: 'my-input' }),
          jsx('span', { ...error, class: 'my-err' }),
          jsx('button', { ...cancel, class: 'my-cancel', children: 'X' }),
          jsx('button', { ...ok, class: 'my-ok', children: 'Go' }),
        ],
      }),
    });
    const input = document.querySelector('.my-input') as HTMLInputElement;
    expect(input.getAttribute('data-prompt-input')).toBe('');
    expect(input.value).toBe('seed'); // input attrs (value) spread through

    input.value = '';
    (document.querySelector('.my-ok') as HTMLElement).click();
    const err = document.querySelector('.my-err') as HTMLElement;
    expect(err.hidden).toBe(false);
    expect(err.textContent).toBe('required');
    expect(document.querySelector('.my-prompt')).not.toBeNull(); // still open

    input.value = 'ada';
    (document.querySelector('.my-ok') as HTMLElement).click();
    await expect(p).resolves.toBe('ada');
  });

  it('prompt render without an error slot: validate re-focuses without a message (no crash)', async () => {
    const p = prompt('Name', {
      validate: (v) => (v ? '' : 'nope'),
      render: ({ input, ok, cancel }) => jsx('div', {
        children: [
          jsx('input', { ...input, class: 'bare-input' }),
          jsx('button', { ...cancel, class: 'bc', children: 'X' }),
          jsx('button', { ...ok, class: 'bo', children: 'Go' }),
        ],
      }),
    });
    (document.querySelector('.bo') as HTMLElement).click(); // empty → validate blocks
    expect(document.querySelector('.bare-input')).not.toBeNull(); // still open, no throw

    (document.querySelector('.bare-input') as HTMLInputElement).value = 'ada';
    (document.querySelector('.bo') as HTMLElement).click();
    await expect(p).resolves.toBe('ada');
  });

  it('form render: per-field input/error wiring, validate blocks in the BYO slot, resolves a record', async () => {
    const p = form(
      [
        { name: 'host', label: 'Host', defaultValue: 'localhost' },
        { name: 'token', validate: (v) => (v.length >= 3 ? '' : 'short') },
      ],
      {
        render: ({ fields, ok, cancel }) => jsx('div', {
          class: 'my-form',
          children: [
            ...fields.map((f) => jsx('div', {
              children: [
                jsx('label', { children: f.label }),
                jsx('input', { ...f.input, class: `fi-${f.name}` }),
                jsx('span', { ...f.error, class: `fe-${f.name}` }),
              ],
            })),
            jsx('button', { ...cancel, class: 'fc', children: 'X' }),
            jsx('button', { ...ok, class: 'fo', children: 'Go' }),
          ],
        }),
      },
    );
    const host = document.querySelector('.fi-host') as HTMLInputElement;
    expect(host.value).toBe('localhost');
    expect(host.getAttribute('data-field')).toBe('host');

    (document.querySelector('.fo') as HTMLElement).click(); // token empty → blocks
    const tErr = document.querySelector('.fe-token') as HTMLElement;
    expect(tErr.hidden).toBe(false);
    expect(tErr.textContent).toBe('short');

    (document.querySelector('.fi-token') as HTMLInputElement).value = 'abcd';
    (document.querySelector('.fo') as HTMLElement).click();
    await expect(p).resolves.toEqual({ host: 'localhost', token: 'abcd' });
  });

  it('form render without error slots: blocks + focuses first invalid, then resolves (no crash)', async () => {
    const p = form([{ name: 'a', validate: (v) => (v ? '' : 'req') }], {
      render: ({ fields, ok, cancel }) => jsx('div', {
        children: [
          ...fields.map((f) => jsx('input', { ...f.input, class: `bare-${f.name}` })),
          jsx('button', { ...cancel, class: 'bfc', children: 'X' }),
          jsx('button', { ...ok, class: 'bfo', children: 'Go' }),
        ],
      }),
    });
    (document.querySelector('.bfo') as HTMLElement).click(); // empty → blocks, no error slot
    expect(document.querySelector('.bare-a')).not.toBeNull(); // still open

    (document.querySelector('.bare-a') as HTMLInputElement).value = 'x';
    (document.querySelector('.bfo') as HTMLElement).click();
    await expect(p).resolves.toEqual({ a: 'x' });
  });
});
