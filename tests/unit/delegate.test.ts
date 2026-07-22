/**
 * Unit tests for `delegate()` + `delegateCapture()`.
 *
 * Uses happy-dom for the DOM environment (configured in vitest.config.ts).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { delegate, delegateCapture } from '../../src/delegate.js';

let root: HTMLElement;

beforeEach(() => {
  root = document.createElement('div');
  document.body.appendChild(root);
});

afterEach(() => {
  document.body.innerHTML = '';
});

describe('delegate() — Tier 1 bubbling', () => {
  it('fires when a click target matches the selector', () => {
    root.innerHTML = '<button data-action="add">+</button>';
    const handler = vi.fn();
    delegate(root, 'click', '[data-action="add"]', handler);

    root.querySelector('button')!.click();
    expect(handler).toHaveBeenCalledOnce();
  });

  it('passes the matched element (not the original target) as the second arg', () => {
    root.innerHTML = '<button data-action="add"><span class="icon">+</span></button>';
    const handler = vi.fn();
    delegate(root, 'click', '[data-action="add"]', handler);

    // Dispatch a click on the inner <span>; closest() should bubble to the button.
    const icon = root.querySelector('.icon')!;
    icon.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(handler).toHaveBeenCalledOnce();
    const matched = handler.mock.calls[0]![1] as HTMLElement;
    expect(matched.tagName).toBe('BUTTON');
    expect(matched.dataset.action).toBe('add');
  });

  it('does not fire for clicks that do not match the selector', () => {
    root.innerHTML = '<button data-action="add">+</button><button data-action="other">x</button>';
    const handler = vi.fn();
    delegate(root, 'click', '[data-action="add"]', handler);

    root.querySelectorAll('button')[1]!.click();
    expect(handler).not.toHaveBeenCalled();
  });

  it('disposer removes the listener', () => {
    root.innerHTML = '<button data-action="add">+</button>';
    const handler = vi.fn();
    const dispose = delegate(root, 'click', '[data-action="add"]', handler);

    dispose();
    root.querySelector('button')!.click();
    expect(handler).not.toHaveBeenCalled();
  });

  it('survives DOM rebuilds — newly-inserted matching elements still fire', () => {
    const handler = vi.fn();
    delegate(root, 'click', '[data-action="add"]', handler);

    root.innerHTML = '<button data-action="add">+</button>';
    root.querySelector('button')!.click();
    expect(handler).toHaveBeenCalledOnce();
  });
});

describe('delegate() — auto-promotion to capture for known non-bubblers (KF-56)', () => {
  it('fires for focus on a descendant input', () => {
    root.innerHTML = '<input data-field="A" /><input data-field="B" />';
    const focused: string[] = [];
    delegate(root, 'focus', 'input', (_e, el) => {
      focused.push((el as HTMLElement).dataset.field ?? '');
    });

    const inputs = root.querySelectorAll<HTMLInputElement>('input');
    inputs[0]!.focus();
    inputs[1]!.focus();
    expect(focused).toEqual(['A', 'B']);
  });

  it('uses closest()-style matching, NOT direct matches() — selector matches a wrapper of the focused element', () => {
    // Key behavioral guarantee: auto-promoted events still walk up from
    // event.target via closest(). delegateCapture would only match the
    // exact focused element. The wrapper-selector case is the common
    // delegation pattern users expect from delegate().
    root.innerHTML = '<div class="field-row"><label>name</label><input /></div>';
    const handler = vi.fn();
    delegate(root, 'focus', '.field-row', handler);

    root.querySelector<HTMLInputElement>('input')!.focus();
    expect(handler).toHaveBeenCalledOnce();
    const matched = handler.mock.calls[0]![1] as HTMLElement;
    expect(matched.className).toBe('field-row');
  });

  it('fires for blur events', () => {
    root.innerHTML = '<input />';
    const handler = vi.fn();
    delegate(root, 'blur', 'input', handler);

    const input = root.querySelector<HTMLInputElement>('input')!;
    input.focus();
    input.blur();
    expect(handler).toHaveBeenCalledOnce();
  });

  it('fires for mouseenter on a descendant', () => {
    root.innerHTML = '<button data-action="hover">hover me</button>';
    const handler = vi.fn();
    delegate(root, 'mouseenter', '[data-action="hover"]', handler);

    root.querySelector('button')!.dispatchEvent(new Event('mouseenter'));
    expect(handler).toHaveBeenCalledOnce();
  });

  it('disposer removes the auto-promoted (capture-phase) listener', () => {
    root.innerHTML = '<input />';
    const handler = vi.fn();
    const dispose = delegate(root, 'focus', 'input', handler);

    dispose();
    root.querySelector<HTMLInputElement>('input')!.focus();
    expect(handler).not.toHaveBeenCalled();
  });

  it('bubble-phase events are unaffected — `click` still installs on bubble', () => {
    // Indirect check: a click handler installed via delegate(...) must
    // still receive an event whose eventPhase is BUBBLING_PHASE (3) when
    // dispatched without capture. If the auto-promotion accidentally
    // captured `click`, we'd see CAPTURING_PHASE (1).
    root.innerHTML = '<button data-action="x">x</button>';
    let phase = -1;
    delegate(root, 'click', '[data-action]', (e) => { phase = e.eventPhase; });

    root.querySelector('button')!.click();
    expect(phase).toBe(Event.BUBBLING_PHASE);
  });
});

describe('delegateCapture() — Tier 2 capture-phase', () => {
  it('fires for non-bubbling focus events on matching descendants', () => {
    root.innerHTML = '<input data-field="A" /><input data-field="B" />';
    const focused: string[] = [];
    delegateCapture(root, 'focus', 'input', (_e, el) => {
      focused.push((el as HTMLElement).dataset.field ?? '');
    });

    const inputs = root.querySelectorAll<HTMLInputElement>('input');
    inputs[0]!.focus();
    inputs[1]!.focus();
    expect(focused).toEqual(['A', 'B']);
  });

  it('fires for blur events', () => {
    root.innerHTML = '<input />';
    const handler = vi.fn();
    delegateCapture(root, 'blur', 'input', handler);

    const input = root.querySelector('input')!;
    input.focus();
    input.blur();
    expect(handler).toHaveBeenCalledOnce();
  });

  it('disposer removes the capture-phase listener', () => {
    root.innerHTML = '<input />';
    const handler = vi.fn();
    const dispose = delegateCapture(root, 'focus', 'input', handler);

    dispose();
    root.querySelector('input')!.focus();
    expect(handler).not.toHaveBeenCalled();
  });

  it('does NOT fire for descendants that do not match the selector', () => {
    root.innerHTML = '<input class="a" /><textarea class="b"></textarea>';
    const handler = vi.fn();
    delegateCapture(root, 'focus', '.a', handler);

    root.querySelector<HTMLElement>('.b')!.focus();
    expect(handler).not.toHaveBeenCalled();
  });

  it('defaults to closest()-style walk-up matching and passes the matched ancestor', () => {
    // The unified default (BREAKING change): delegateCapture() now walks UP from
    // event.target via closest(selector) — the SAME behavior as delegate() — and
    // passes the matched ancestor (not the raw target) as the second arg. Before,
    // a click on the inner span would have missed the wrapper button entirely.
    root.innerHTML = '<button class="card"><span class="card-text">go</span></button>';
    const handler = vi.fn();
    delegateCapture(root, 'click', '.card', handler);

    root.querySelector<HTMLElement>('.card-text')!.dispatchEvent(
      new MouseEvent('click', { bubbles: true }),
    );
    expect(handler).toHaveBeenCalledOnce();
    const matched = handler.mock.calls[0]![1] as HTMLElement;
    expect(matched.className).toBe('card');
  });
});

describe('delegateCapture() — { match: \'direct\' } opt-in', () => {
  it('fires only when the event lands on the exact matching element (no walk-up)', () => {
    root.innerHTML = '<button class="card"><span class="card-text">go</span></button>';
    const handler = vi.fn();
    delegateCapture(root, 'click', '.card', handler, { match: 'direct' });

    // Click on the descendant span: direct matching must NOT walk up to .card.
    root.querySelector<HTMLElement>('.card-text')!.dispatchEvent(
      new MouseEvent('click', { bubbles: true }),
    );
    expect(handler).not.toHaveBeenCalled();

    // Click directly on the .card element itself: fires, with itself as the match.
    root.querySelector<HTMLElement>('.card')!.dispatchEvent(
      new MouseEvent('click', { bubbles: true }),
    );
    expect(handler).toHaveBeenCalledOnce();
    const matched = handler.mock.calls[0]![1] as HTMLElement;
    expect(matched.className).toBe('card');
  });

  it('explicit { match: \'closest\' } behaves like the default walk-up', () => {
    root.innerHTML = '<button class="card"><span class="card-text">go</span></button>';
    const handler = vi.fn();
    delegateCapture(root, 'click', '.card', handler, { match: 'closest' });

    root.querySelector<HTMLElement>('.card-text')!.dispatchEvent(
      new MouseEvent('click', { bubbles: true }),
    );
    expect(handler).toHaveBeenCalledOnce();
  });
});

describe('delegate() / delegateCapture() — containment edge cases', () => {
  it('delegate does not fire when the closest() match lives outside rootEl', () => {
    // A matching ancestor exists, but it is OUTSIDE rootEl — the rootEl.contains
    // guard must reject it so a delegated listener never fires for elements it
    // does not own.
    const outer = document.createElement('div');
    outer.className = 'card';
    document.body.appendChild(outer);
    // rootEl is a child of the matching .card ancestor.
    const inner = document.createElement('div');
    outer.appendChild(inner);
    const btn = document.createElement('button');
    inner.appendChild(btn);

    const handler = vi.fn();
    delegate(inner, 'click', '.card', handler);
    btn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(handler).not.toHaveBeenCalled();
  });

  it('delegateCapture (closest default) does not fire when the match lives outside rootEl', () => {
    const outer = document.createElement('div');
    outer.className = 'card';
    document.body.appendChild(outer);
    const inner = document.createElement('div');
    outer.appendChild(inner);
    const target = document.createElement('input');
    inner.appendChild(target);

    const handler = vi.fn();
    delegateCapture(inner, 'focus', '.card', handler);
    target.focus();
    expect(handler).not.toHaveBeenCalled();
  });
});

describe('delegate() — { match: \'direct\' } symmetry', () => {
  it('fires only on the exact target, not a descendant, when direct matching is requested', () => {
    root.innerHTML = '<button data-action="add"><span class="icon">+</span></button>';
    const handler = vi.fn();
    delegate(root, 'click', '[data-action="add"]', handler, { match: 'direct' });

    // Click on the inner span: direct matching does NOT climb to the button.
    root.querySelector<HTMLElement>('.icon')!.dispatchEvent(
      new MouseEvent('click', { bubbles: true }),
    );
    expect(handler).not.toHaveBeenCalled();

    // Click on the button itself: fires.
    root.querySelector<HTMLElement>('button')!.dispatchEvent(
      new MouseEvent('click', { bubbles: true }),
    );
    expect(handler).toHaveBeenCalledOnce();
  });
});

describe('non-Element event targets', () => {
  it('delegate ignores events whose target is not an Element', () => {
    const handler = vi.fn();
    let captured: ((e: Event) => void) | null = null;
    const orig = root.addEventListener.bind(root);
    vi.spyOn(root, 'addEventListener').mockImplementation((type, fn, opts) => {
      captured = fn as (e: Event) => void;
      return orig(type, fn, opts);
    });
    delegate(root, 'click', '*', handler);

    const fakeEvent = { target: null } as unknown as Event;
    captured!(fakeEvent);
    expect(handler).not.toHaveBeenCalled();
  });

  it('delegateCapture ignores events whose target is not an Element', () => {
    const handler = vi.fn();
    let captured: ((e: Event) => void) | null = null;
    const orig = root.addEventListener.bind(root);
    vi.spyOn(root, 'addEventListener').mockImplementation((type, fn, opts) => {
      captured = fn as (e: Event) => void;
      return orig(type, fn, opts);
    });
    delegateCapture(root, 'focus', '*', handler);

    const fakeEvent = { target: null } as unknown as Event;
    captured!(fakeEvent);
    expect(handler).not.toHaveBeenCalled();
  });
});

describe('selector validation', () => {
  it('delegate throws immediately on an invalid selector', () => {
    expect(() => delegate(root, 'click', '[[bad', () => {}))
      .toThrow(/delegate: invalid selector "\[\[bad"/);
  });

  it('delegateCapture throws immediately on an invalid selector', () => {
    expect(() => delegateCapture(root, 'focus', '[unclosed', () => {}))
      .toThrow(/delegateCapture: invalid selector "\[unclosed"/);
  });

  it('does NOT install a listener when the selector is invalid', () => {
    const addSpy = vi.spyOn(root, 'addEventListener');
    expect(() => delegate(root, 'click', '[broken', () => {})).toThrow();
    expect(addSpy).not.toHaveBeenCalled();
    addSpy.mockRestore();
  });
});
