import { afterEach,beforeEach,describe,expect,it,vi } from 'vitest';

import { jsx } from '../../src/jsx-runtime.js';
import { toast } from '../../src/overlay.js';

beforeEach(() => {
  document.body.innerHTML = '';
});
afterEach(() => {
  vi.useRealTimers();
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

describe("toast() — KF-495 replace collapse + symmetric exit", () => {
  it("mode:'replace' collapse:'instant' removes the prior toast synchronously (no cross-fade)", () => {
    vi.useFakeTimers();
    toast('First', { mode: 'replace', exitClass: 'hide', exitDuration: 300, duration: 0 });
    expect(document.querySelectorAll('.kerf-toast').length).toBe(1);

    toast('Second', { mode: 'replace', collapse: 'instant', exitClass: 'hide', exitDuration: 300, duration: 0 });
    const toasts = document.querySelectorAll('.kerf-toast');
    expect(toasts.length).toBe(1); // First removed immediately — never overlaps
    expect(toasts[0].textContent).toBe('Second');
  });

  it("mode:'replace' default collapse:'fade' keeps the prior through its exit transition", () => {
    vi.useFakeTimers();
    toast('First', { mode: 'replace', exitClass: 'hide', exitDuration: 300, duration: 0 });
    toast('Second', { mode: 'replace', exitClass: 'hide', exitDuration: 300, duration: 0 }); // default fade

    expect(document.querySelectorAll('.kerf-toast').length).toBe(2); // both present during the fade
    const first = Array.from(document.querySelectorAll('.kerf-toast')).find((t) => t.textContent === 'First')!;
    expect(first.classList.contains('hide')).toBe(true); // First is exiting
    vi.advanceTimersByTime(300);
    expect(document.querySelectorAll('.kerf-toast').length).toBe(1); // First gone after exitDuration
  });

  it('exit removes the enterClass and adds the exitClass', () => {
    vi.useFakeTimers();
    const { el, dismiss } = toast('x', { enterClass: 'show', exitClass: 'hide', exitDuration: 100, duration: 0 });
    vi.advanceTimersByTime(20); // entrance applied
    expect(el.classList.contains('show')).toBe(true);

    dismiss();
    expect(el.classList.contains('show')).toBe(false); // enterClass removed on exit
    expect(el.classList.contains('hide')).toBe(true); // exitClass added
    vi.advanceTimersByTime(100);
    expect(document.querySelector('.kerf-toast')).toBeNull();
  });

  it('exitDuration delays removal even without an exitClass (symmetric single-class fade)', () => {
    vi.useFakeTimers();
    const { el, dismiss } = toast('x', { enterClass: 'visible', exitDuration: 200, duration: 0 });
    vi.advanceTimersByTime(20);
    expect(el.classList.contains('visible')).toBe(true);

    dismiss();
    expect(el.classList.contains('visible')).toBe(false); // entrance reversed
    expect(document.querySelector('.kerf-toast')).not.toBeNull(); // still present during the fade-out
    vi.advanceTimersByTime(200);
    expect(document.querySelector('.kerf-toast')).toBeNull(); // removed after exitDuration
  });
});

describe("toast() — KF-497 instant single-toast dismiss", () => {
  it('dismiss({ instant: true }) removes synchronously, skipping the exit transition', () => {
    vi.useFakeTimers();
    const { el, dismiss } = toast('x', { exitClass: 'hide', exitDuration: 300, duration: 0 });
    dismiss({ instant: true });
    expect(el.classList.contains('hide')).toBe(false); // no exit class added
    expect(document.querySelector('.kerf-toast')).toBeNull(); // gone NOW, no 300ms wait
  });

  it("mode:'replace' collapse:'instant' cleans up a toast that is ALREADY fading (action-button pattern)", () => {
    vi.useFakeTimers();
    const a = toast('A', { exitClass: 'hide', exitDuration: 300, duration: 0 });
    a.dismiss(); // A starts its fade — node lingers for exitDuration
    expect(document.querySelector('.kerf-toast')).not.toBeNull();

    // The action shows a replacement in the SAME centered slot.
    toast('B', { mode: 'replace', collapse: 'instant', exitClass: 'hide', exitDuration: 300, duration: 0 });
    // A (mid-fade) is removed synchronously — only B remains, no cross-fade.
    const toasts = document.querySelectorAll('.kerf-toast');
    expect(toasts.length).toBe(1);
    expect(toasts[0].textContent).toBe('B');
  });

  it('a stale exit timer after an instant dismiss is a no-op (idempotent)', () => {
    vi.useFakeTimers();
    const { dismiss } = toast('x', { exitClass: 'hide', exitDuration: 300, duration: 0 });
    dismiss(); // fade → exit timer scheduled
    dismiss({ instant: true }); // force-remove now
    expect(document.querySelector('.kerf-toast')).toBeNull();
    vi.advanceTimersByTime(300); // the cleared/stale exit timer must not re-run
    expect(document.querySelector('.kerf-toast')).toBeNull();
  });

  it('instant dismiss cancels a pending auto-dismiss timer', () => {
    vi.useFakeTimers();
    const { dismiss } = toast('x', { duration: 4000 }); // has an auto-dismiss timer pending
    dismiss({ instant: true });
    expect(document.querySelector('.kerf-toast')).toBeNull();
    expect(() => vi.advanceTimersByTime(4000)).not.toThrow(); // the auto timer was cleared
    expect(document.querySelector('.kerf-toast')).toBeNull();
  });

  it('further dismiss calls after removal are no-ops (idempotent both ways)', () => {
    vi.useFakeTimers();
    const { dismiss } = toast('x', { exitClass: 'hide', exitDuration: 300, duration: 0 });
    dismiss({ instant: true });
    expect(document.querySelector('.kerf-toast')).toBeNull();
    expect(() => { dismiss({ instant: true }); dismiss(); }).not.toThrow(); // removed → guarded
    expect(document.querySelector('.kerf-toast')).toBeNull();
  });
});
