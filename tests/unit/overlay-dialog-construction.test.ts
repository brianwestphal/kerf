/**
 * The promise-dialog helpers (`confirm` / `prompt` / `form` / `choice`) keep
 * wiring the overlay AFTER `overlay()` returns: required-slot lookups, the
 * `delegate()` click table, and an Enter-key listener. That tail is still part
 * of construction — a failed helper call returns no promise, so anything it
 * left open (the overlay node, its dismissal listeners, its place in the
 * fallback stack, the helper's own listeners) would be permanently orphaned.
 *
 * Each post-open step is forced to throw (a missing required slot for real;
 * `delegate()` via its dev hook; the key listener via an `addEventListener`
 * spy) and each case proves: the ORIGINAL error surfaces synchronously, no
 * overlay node or listener survives, focus returns to the trigger, an
 * already-open overlay stays topmost, and the same helper works afterwards.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { devHooks } from '../../src/dev-hooks.js';
import { jsx } from '../../src/jsx-runtime.js';
import { choice, confirm, form, overlay, prompt } from '../../src/overlay.js';

interface ListenerRecord {
  target: EventTarget;
  type: string;
  listener: EventListenerOrEventListenerObject | null;
  capture: boolean;
}

const captureOf = (options?: boolean | EventListenerOptions): boolean =>
  typeof options === 'boolean' ? options : options?.capture === true;

function domEventTargetPrototype(): EventTarget {
  let proto: object | null = document;
  while (
    proto !== null &&
    !Object.prototype.hasOwnProperty.call(proto, 'addEventListener')
  )
    proto = Object.getPrototypeOf(proto) as object | null;
  return proto as EventTarget;
}

/**
 * Record every listener added / removed while installed. `refuse` makes a
 * matching `addEventListener` throw instead, to force a wiring step to fail.
 */
function trackListeners(
  refuse?: (target: EventTarget, type: string) => boolean,
): { live: () => ListenerRecord[]; added: () => number } {
  // The DOM's own EventTarget prototype (the global one may be Node's).
  const proto = domEventTargetPrototype();
  const originalAdd = proto.addEventListener;
  const originalRemove = proto.removeEventListener;
  const records: ListenerRecord[] = [];
  let added = 0;
  vi.spyOn(proto, 'addEventListener').mockImplementation(function (
    this: EventTarget,
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | AddEventListenerOptions,
  ) {
    if (refuse?.(this, type) === true) throw new Error('listener refused');
    added++;
    records.push({
      target: this,
      type,
      listener,
      capture: captureOf(options),
    });
    originalAdd.call(this, type, listener, options);
  });
  vi.spyOn(proto, 'removeEventListener').mockImplementation(function (
    this: EventTarget,
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | EventListenerOptions,
  ) {
    const capture = captureOf(options);
    const index = records.findIndex(
      (r) =>
        r.target === this &&
        r.type === type &&
        r.listener === listener &&
        r.capture === capture,
    );
    if (index !== -1) records.splice(index, 1);
    originalRemove.call(this, type, listener, options);
  });
  return { live: () => records, added: () => added };
}

const isHelperKeydown = (target: EventTarget, type: string): boolean =>
  type === 'keydown' &&
  target instanceof HTMLElement &&
  target.classList.contains('kerf-overlay');

function focusedTrigger(): HTMLButtonElement {
  const trigger = document.createElement('button');
  trigger.id = 'trigger';
  document.body.appendChild(trigger);
  trigger.focus();
  return trigger;
}

function escape(): void {
  document.dispatchEvent(
    new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    }),
  );
}

/** Force `delegate()` itself to throw through its dev-hook call site. */
function refuseDelegate(): Error {
  const failure = new Error('delegate refused');
  devHooks.delegateInEffect = () => {
    throw failure;
  };
  return failure;
}

const savedDelegateHook = devHooks.delegateInEffect;

beforeEach(() => {
  document.body.innerHTML = '';
});
afterEach(() => {
  vi.restoreAllMocks();
  devHooks.delegateInEffect = savedDelegateHook;
});

/**
 * Run `open()` expecting it to throw `expected`, with a lower overlay already
 * open, then assert the full no-residue contract.
 */
function expectRolledBack(open: () => unknown, expected: Error | string): void {
  const trigger = focusedTrigger();
  const lower = overlay(jsx('button', { class: 'lower', children: 'l' }), {
    className: 'lower-overlay',
  });
  trigger.focus();
  const listeners = trackListeners();
  expect(open).toThrow(expected);
  // No overlay node, and every listener the failed call added was removed.
  expect(document.querySelector('.kerf-overlay')).toBeNull();
  expect(listeners.added()).toBeGreaterThan(0);
  expect(listeners.live()).toEqual([]);
  vi.restoreAllMocks();
  // Focus went back to where it was before the failed call.
  expect(document.activeElement).toBe(trigger);
  // The lower overlay is still topmost: Escape dismisses it.
  escape();
  expect(lower.el.isConnected).toBe(false);
}

function expectRolledBackWithRefusedKeydown(open: () => unknown): void {
  const trigger = focusedTrigger();
  const listeners = trackListeners(isHelperKeydown);
  expect(open).toThrow('listener refused');
  expect(document.querySelector('.kerf-overlay')).toBeNull();
  // The helper's delegated click listener (wired before the refused key
  // listener) and overlay()'s own listeners were all removed.
  expect(listeners.added()).toBeGreaterThan(0);
  expect(listeners.live()).toEqual([]);
  vi.restoreAllMocks();
  expect(document.activeElement).toBe(trigger);
}

describe('confirm() — post-open wiring failure', () => {
  it('a throwing delegate() closes the dialog and rethrows; the next confirm works', async () => {
    const failure = refuseDelegate();
    expectRolledBack(() => confirm('Sure?'), failure);
    devHooks.delegateInEffect = savedDelegateHook;

    const next = confirm('Again?');
    (document.querySelector('[data-confirm="ok"]') as HTMLElement).click();
    await expect(next).resolves.toBe(true);
    expect(document.querySelector('.kerf-overlay')).toBeNull();
  });
});

describe('prompt() — post-open wiring failure', () => {
  it('a missing required input rolls back fully; the next prompt works', async () => {
    expectRolledBack(
      () =>
        prompt('Name', {
          render: ({ ok }) =>
            jsx('div', {
              children: [
                jsx('input', { class: 'unwired' }),
                jsx('button', { ...ok, children: 'Go' }),
              ],
            }),
        }),
      'prompt(): render missing <input data-prompt-input>.',
    );

    const next = prompt('Name', { defaultValue: 'ada' });
    (document.querySelector('[data-prompt="ok"]') as HTMLElement).click();
    await expect(next).resolves.toBe('ada');
  });

  it('a throwing delegate() closes the dialog and rethrows', async () => {
    const failure = refuseDelegate();
    expectRolledBack(() => prompt('Name'), failure);
    devHooks.delegateInEffect = savedDelegateHook;

    const next = prompt('Name');
    (document.querySelector('[data-prompt="cancel"]') as HTMLElement).click();
    await expect(next).resolves.toBeNull();
  });

  it('a throwing key listener also removes the already-wired click listener', async () => {
    expectRolledBackWithRefusedKeydown(() => prompt('Name'));

    const next = prompt('Name', { defaultValue: 'x' });
    const input = document.querySelector<HTMLInputElement>(
      '[data-prompt-input]',
    );
    input?.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Enter',
        bubbles: true,
        cancelable: true,
      }),
    );
    await expect(next).resolves.toBe('x');
  });
});

describe('form() — post-open wiring failure', () => {
  it('a missing required field input rolls back fully; the next form works', async () => {
    expectRolledBack(
      () =>
        form([{ name: 'host' }, { name: 'token' }], {
          render: ({ fields, ok }) =>
            jsx('div', {
              children: [
                jsx('input', { ...fields[0].input }),
                jsx('button', { ...ok, children: 'Go' }),
              ],
            }),
        }),
      'form(): render missing <input data-field="token">.',
    );

    const next = form([{ name: 'host', defaultValue: 'h' }]);
    (document.querySelector('[data-form="ok"]') as HTMLElement).click();
    await expect(next).resolves.toEqual({ host: 'h' });
  });

  it('a throwing delegate() closes the dialog and rethrows', async () => {
    const failure = refuseDelegate();
    expectRolledBack(() => form([{ name: 'host' }]), failure);
    devHooks.delegateInEffect = savedDelegateHook;

    const next = form([{ name: 'host' }]);
    (document.querySelector('[data-form="cancel"]') as HTMLElement).click();
    await expect(next).resolves.toBeNull();
  });

  it('a throwing key listener also removes the already-wired click listener', async () => {
    expectRolledBackWithRefusedKeydown(() => form([{ name: 'host' }]));

    const next = form([{ name: 'host', defaultValue: 'h' }]);
    document.querySelector('[data-field="host"]')?.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Enter',
        bubbles: true,
        cancelable: true,
      }),
    );
    await expect(next).resolves.toEqual({ host: 'h' });
  });
});

describe('choice() — post-open wiring failure', () => {
  const actions = [
    { value: 'a', label: 'A' },
    { value: 'b', label: 'B' },
  ];

  it('a throwing delegate() closes the dialog and rethrows; the next choice works', async () => {
    const failure = refuseDelegate();
    expectRolledBack(() => choice('Pick', actions), failure);
    devHooks.delegateInEffect = savedDelegateHook;

    const next = choice('Pick', actions);
    (document.querySelector('[data-choice="1"]') as HTMLElement).click();
    await expect(next).resolves.toBe('b');
  });

  it('a throwing default-key listener also removes the already-wired click listener', async () => {
    expectRolledBackWithRefusedKeydown(() =>
      choice('Pick', actions, { defaultValue: 'a' }),
    );

    const next = choice('Pick', actions, { defaultValue: 'a' });
    document.querySelector('.kerf-overlay')?.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Enter',
        bubbles: true,
        cancelable: true,
      }),
    );
    await expect(next).resolves.toBe('a');
  });
});
