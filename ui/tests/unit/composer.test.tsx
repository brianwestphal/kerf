import { describe, expect, it } from 'vitest';

import { Composer } from '../../src/components/forms/composer/composer.js';

const send = <button type="button">Send</button>;

function render(html: unknown): HTMLElement {
  const host = document.createElement('div');
  host.innerHTML = String(html);
  return host;
}

describe('Composer', () => {
  it('renders a framed, named message field above a hint and trailing actions', () => {
    const host = render(
      Composer({
        id: 'chat',
        name: 'message',
        label: 'Message',
        placeholder: 'Ask about this build',
        hint: 'Answers use the latest nightly build.',
        actions: send,
      }),
    );
    const root = host.querySelector<HTMLElement>('.kui-composer')!;
    expect(root.dataset.component).toBe('composer');
    expect(root.getAttribute('style')).toBe(
      '--_kui-composer-min-rows:1;--_kui-composer-max-rows:8',
    );
    expect(root.hasAttribute('data-disabled')).toBe(false);
    const field = root.querySelector('textarea')!;
    expect(field.className).toBe('kui-composer__field');
    expect(field.id).toBe('chat');
    expect(field.name).toBe('message');
    expect(field.getAttribute('rows')).toBe('1');
    expect(field.getAttribute('aria-label')).toBe('Message');
    expect(field.placeholder).toBe('Ask about this build');
    expect(field.value).toBe('');
    expect(field.disabled).toBe(false);
    // With an id, the hint is the field's accessible description.
    expect(field.getAttribute('aria-describedby')).toBe('chat-hint');
    const hint = host.querySelector('#chat-hint')!;
    expect(hint.textContent).toBe('Answers use the latest nightly build.');
    expect(hint.closest('.kui-composer__hint')).not.toBeNull();
    expect(hint.getAttribute('data-tone')).toBe('quiet');
    // The action row follows the field; actions sit in the trailing zone.
    const actions = root.querySelector('.kui-composer__actions')!;
    expect(field.nextElementSibling).toBe(actions);
    expect(
      actions.querySelector('.kui-composer__trailing > button')?.textContent,
    ).toBe('Send');
  });

  it('serializes row bounds, a draft, disabled state, slot, and safe data attributes', () => {
    const host = render(
      Composer({
        name: 'prompt',
        label: 'Prompt',
        value: 'Draft <b>text</b>',
        minRows: 3,
        maxRows: 12,
        disabled: true,
        slot: 'footer',
        className: 'app-composer',
        rootAttributes: {
          'data-key': 'chat',
          'data-component': 'spoofed',
        } as Record<`data-${string}`, string>,
        actions: send,
      }),
    );
    const root = host.querySelector<HTMLElement>('.kui-composer')!;
    expect(root.className).toBe('kui-composer app-composer');
    expect(root.getAttribute('slot')).toBe('footer');
    expect(root.dataset.key).toBe('chat');
    expect(root.dataset.component).toBe('composer');
    expect(root.dataset.disabled).toBe('true');
    expect(root.getAttribute('style')).toBe(
      '--_kui-composer-min-rows:3;--_kui-composer-max-rows:12',
    );
    const field = root.querySelector('textarea')!;
    expect(field.getAttribute('rows')).toBe('3');
    expect(field.disabled).toBe(true);
    expect(field.value).toBe('Draft <b>text</b>');
    expect(field.hasAttribute('id')).toBe(false);
    expect(field.hasAttribute('placeholder')).toBe(false);
    expect(field.hasAttribute('aria-describedby')).toBe(false);
    expect(root.querySelector('.kui-composer__hint')?.childElementCount).toBe(
      0,
    );
  });

  it('shows a hint without an id but does not describe the field with it', () => {
    const host = render(
      Composer({
        name: 'message',
        label: 'Message',
        hint: 'Visible only.',
        actions: send,
      }),
    );
    expect(host.querySelector('.kui-composer__hint')?.textContent).toBe(
      'Visible only.',
    );
    expect(
      host.querySelector('textarea')?.hasAttribute('aria-describedby'),
    ).toBe(false);
  });

  it('rejects row bounds that are not positive integers or that invert', () => {
    const base = { name: 'm', label: 'Message', actions: send };
    expect(() => Composer({ ...base, minRows: 0 })).toThrow(
      'Composer minRows must be a positive integer.',
    );
    expect(() => Composer({ ...base, maxRows: 2.5 })).toThrow(
      'Composer maxRows must be a positive integer.',
    );
    expect(() => Composer({ ...base, minRows: 4, maxRows: 2 })).toThrow(
      'Composer maxRows must be at least minRows.',
    );
  });
});
