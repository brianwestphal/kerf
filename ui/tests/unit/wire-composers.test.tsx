import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  Composer,
  type ComposerProps,
} from '../../src/components/forms/composer/composer.js';
import { wireComposers } from '../../src/components/forms/composer/wiring/wire-composers.js';

const disposers: Array<() => void> = [];

afterEach(() => {
  for (const dispose of disposers.splice(0)) dispose();
  document.body.replaceChildren();
});

function setup(
  props: Partial<ComposerProps> = {},
  actions: unknown = (
    <button type="button" data-action="send">
      Send
    </button>
  ),
) {
  const host = document.createElement('div');
  host.innerHTML = String(
    Composer({
      name: 'message',
      label: 'Message',
      submitOnEnter: true,
      actions: actions as ComposerProps['actions'],
      ...props,
    }),
  );
  document.body.append(host);
  disposers.push(wireComposers(host));
  const field = host.querySelector('textarea')!;
  const sent = vi.fn();
  host.addEventListener('click', (event) => {
    if ((event.target as Element).closest('[data-action="send"]')) sent();
  });
  return { host, field, sent };
}

function press(
  field: HTMLTextAreaElement,
  init: KeyboardEventInit & { keyCode?: number } = {},
) {
  const event = new KeyboardEvent('keydown', {
    key: 'Enter',
    bubbles: true,
    cancelable: true,
    ...init,
  });
  if (init.keyCode !== undefined)
    Object.defineProperty(event, 'keyCode', { value: init.keyCode });
  field.dispatchEvent(event);
  return event;
}

describe('Composer submitOnEnter', () => {
  it('marks the root and announces the Enter shortcut on the field', () => {
    const host = document.createElement('div');
    host.innerHTML = String(
      Composer({
        name: 'message',
        label: 'Message',
        submitOnEnter: true,
        rootAttributes: {
          'data-submit-on-enter': 'spoofed',
        } as Record<`data-${string}`, string>,
        actions: <button type="button">Send</button>,
      }),
    );
    const root = host.querySelector<HTMLElement>('.kui-composer')!;
    expect(root.dataset.submitOnEnter).toBe('true');
    expect(
      host.querySelector('textarea')!.getAttribute('aria-keyshortcuts'),
    ).toBe('Enter');
  });

  it('is off by default and cannot be spoofed through rootAttributes', () => {
    const host = document.createElement('div');
    host.innerHTML = String(
      Composer({
        name: 'message',
        label: 'Message',
        rootAttributes: {
          'data-submit-on-enter': 'true',
        } as Record<`data-${string}`, string>,
        actions: <button type="button">Send</button>,
      }),
    );
    const root = host.querySelector<HTMLElement>('.kui-composer')!;
    expect(root.hasAttribute('data-submit-on-enter')).toBe(false);
    expect(
      host.querySelector('textarea')!.hasAttribute('aria-keyshortcuts'),
    ).toBe(false);
  });
});

describe('wireComposers', () => {
  it('sends on Enter, Cmd+Enter, and Ctrl+Enter by clicking the first trailing action', () => {
    const { field, sent } = setup();
    field.value = 'Hello';
    expect(press(field).defaultPrevented).toBe(true);
    expect(press(field, { metaKey: true }).defaultPrevented).toBe(true);
    expect(press(field, { ctrlKey: true }).defaultPrevented).toBe(true);
    expect(sent).toHaveBeenCalledTimes(3);
  });

  it('leaves Shift+Enter, Alt+Enter, and other keys to the field', () => {
    const { field, sent } = setup();
    field.value = 'Hello';
    expect(press(field, { shiftKey: true }).defaultPrevented).toBe(false);
    expect(press(field, { altKey: true }).defaultPrevented).toBe(false);
    expect(press(field, { key: 'a' }).defaultPrevented).toBe(false);
    expect(sent).not.toHaveBeenCalled();
  });

  it('does not send an empty or whitespace-only message, or insert a newline', () => {
    const { field, sent } = setup();
    expect(press(field).defaultPrevented).toBe(true);
    field.value = '  \n\t ';
    expect(press(field).defaultPrevented).toBe(true);
    expect(sent).not.toHaveBeenCalled();
  });

  it('ignores an auto-repeating Enter', () => {
    const { field, sent } = setup();
    field.value = 'Hello';
    expect(press(field, { repeat: true }).defaultPrevented).toBe(true);
    expect(sent).not.toHaveBeenCalled();
  });

  it('leaves an Enter that commits an IME composition to the input method', () => {
    const { field, sent } = setup();
    field.value = 'にほん';
    expect(press(field, { isComposing: true }).defaultPrevented).toBe(false);
    expect(press(field, { keyCode: 229 }).defaultPrevented).toBe(false);
    field.dispatchEvent(
      new CompositionEvent('compositionstart', { bubbles: true }),
    );
    expect(press(field).defaultPrevented).toBe(false);
    field.dispatchEvent(
      new CompositionEvent('compositionend', { bubbles: true }),
    );
    expect(sent).not.toHaveBeenCalled();
    // After the composition ends, Enter sends.
    press(field);
    expect(sent).toHaveBeenCalledTimes(1);
  });

  it('does nothing for a composer without submitOnEnter or a plain textarea', () => {
    const { host, field, sent } = setup({ submitOnEnter: false });
    field.value = 'Hello';
    expect(press(field).defaultPrevented).toBe(false);
    const plain = document.createElement('textarea');
    plain.value = 'Hello';
    host.append(plain);
    expect(press(plain).defaultPrevented).toBe(false);
    plain.dispatchEvent(
      new CompositionEvent('compositionstart', { bubbles: true }),
    );
    plain.dispatchEvent(
      new CompositionEvent('compositionend', { bubbles: true }),
    );
    expect(sent).not.toHaveBeenCalled();
  });

  it('does not send from a disabled field', () => {
    const { field, sent } = setup({ disabled: true });
    field.value = 'Hello';
    expect(press(field).defaultPrevented).toBe(false);
    expect(sent).not.toHaveBeenCalled();
  });

  it('does not send while the first action is disabled, loading, or aria-disabled', () => {
    for (const actions of [
      <button type="button" data-action="send" disabled>
        Send
      </button>,
      <wa-button data-action="send" loading>
        Send
      </wa-button>,
      // A busy Button.
      <button type="button" data-action="send" aria-busy="true">
        Send
      </button>,
      <span data-action="send" aria-disabled="true">
        Send
      </span>,
    ]) {
      const { field, sent } = setup({}, actions);
      field.value = 'Hello';
      expect(press(field).defaultPrevented).toBe(true);
      expect(sent).not.toHaveBeenCalled();
    }
  });

  it('reads a disabled property on a custom-element action', () => {
    const { host, field, sent } = setup(
      {},
      <wa-button data-action="send">Send</wa-button>,
    );
    const action = host.querySelector('wa-button')!;
    Object.defineProperty(action, 'disabled', { value: true });
    field.value = 'Hello';
    press(field);
    expect(sent).not.toHaveBeenCalled();
  });

  it('activates only the first action and does nothing without one', () => {
    const { field, sent } = setup(
      {},
      <>
        <button type="button" data-action="send">
          Send
        </button>
        <button type="button" data-action="other">
          Other
        </button>
      </>,
    );
    field.value = 'Hello';
    press(field);
    expect(sent).toHaveBeenCalledTimes(1);
    const empty = setup({}, <span>No action</span>);
    empty.field.value = 'Hello';
    expect(press(empty.field).defaultPrevented).toBe(true);
    expect(empty.sent).not.toHaveBeenCalled();
  });

  it('stops listening once disposed', () => {
    const host = document.createElement('div');
    host.innerHTML = String(
      Composer({
        name: 'message',
        label: 'Message',
        submitOnEnter: true,
        actions: (
          <button type="button" data-action="send">
            Send
          </button>
        ),
      }),
    );
    document.body.append(host);
    const sent = vi.fn();
    host.addEventListener('click', sent);
    const dispose = wireComposers(document);
    const field = host.querySelector('textarea')!;
    field.value = 'Hello';
    dispose();
    field.dispatchEvent(
      new CompositionEvent('compositionstart', { bubbles: true }),
    );
    expect(press(field).defaultPrevented).toBe(false);
    expect(sent).not.toHaveBeenCalled();
  });
});
