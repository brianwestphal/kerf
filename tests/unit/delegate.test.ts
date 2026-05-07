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
