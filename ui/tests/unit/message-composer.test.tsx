import { describe, expect, it } from 'vitest';

import { MessageComposer } from '../../src/components/forms/message-composer/message-composer.js';

const send = <button type="button">Send</button>;

function render(html: unknown): HTMLElement {
  const host = document.createElement('div');
  host.innerHTML = String(html);
  return host;
}

describe('MessageComposer', () => {
  it('renders a framed, named message field above a hint and trailing actions', () => {
    const host = render(
      MessageComposer({
        id: 'chat',
        name: 'message',
        label: 'Message',
        placeholder: 'Ask about this build',
        hint: 'Answers use the latest nightly build.',
        trailing: send,
      }),
    );
    const root = host.querySelector<HTMLElement>('.kui-message-composer')!;
    expect(root.dataset.component).toBe('message-composer');
    expect(root.getAttribute('style')).toBe(
      '--_kui-message-composer-min-rows:1;--_kui-message-composer-max-rows:8',
    );
    expect(root.hasAttribute('data-disabled')).toBe(false);
    const field = root.querySelector('textarea')!;
    expect(field.className).toBe('kui-message-composer__field');
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
    expect(hint.closest('.kui-toolbar__leading')).not.toBeNull();
    expect(hint.getAttribute('data-tone')).toBe('quiet');
    // The action row is a compact footer Toolbar after the field; trailing
    // actions sit in its trailing zone.
    const row = root.querySelector<HTMLElement>(':scope > .kui-toolbar')!;
    expect(field.nextElementSibling).toBe(row);
    expect(row.tagName).toBe('FOOTER');
    expect(row.dataset.density).toBe('compact');
    expect(row.getAttribute('aria-label')).toBe('Message Actions');
    expect(
      row.querySelector('.kui-toolbar__trailing > button')?.textContent,
    ).toBe('Send');
  });

  it('serializes row bounds, a draft, disabled state, slot, and safe data attributes', () => {
    const host = render(
      MessageComposer({
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
        trailing: send,
      }),
    );
    const root = host.querySelector<HTMLElement>('.kui-message-composer')!;
    expect(root.className).toBe('kui-message-composer app-composer');
    expect(root.getAttribute('slot')).toBe('footer');
    expect(root.dataset.key).toBe('chat');
    expect(root.dataset.component).toBe('message-composer');
    expect(root.dataset.disabled).toBe('true');
    expect(root.getAttribute('style')).toBe(
      '--_kui-message-composer-min-rows:3;--_kui-message-composer-max-rows:12',
    );
    const field = root.querySelector('textarea')!;
    expect(field.getAttribute('rows')).toBe('3');
    expect(field.disabled).toBe(true);
    expect(field.value).toBe('Draft <b>text</b>');
    expect(field.hasAttribute('id')).toBe(false);
    expect(field.hasAttribute('placeholder')).toBe(false);
    expect(field.hasAttribute('aria-describedby')).toBe(false);
    // Without a hint or leading controls the leading zone stays empty.
    expect(
      root.querySelector('.kui-toolbar__leading')?.childElementCount ?? 0,
    ).toBe(0);
  });

  it('puts leading controls before the hint in the action row', () => {
    const host = render(
      MessageComposer({
        name: 'message',
        label: 'Prompt',
        hint: 'Shift+Enter adds a line.',
        leading: <button type="button" aria-label="Attach File" />,
        trailing: send,
      }),
    );
    const leading = host.querySelector('.kui-toolbar__leading')!;
    expect(leading.firstElementChild?.getAttribute('aria-label')).toBe(
      'Attach File',
    );
    expect(leading.lastElementChild?.textContent).toBe(
      'Shift+Enter adds a line.',
    );
  });

  it('shows a hint without an id but does not describe the field with it', () => {
    const host = render(
      MessageComposer({
        name: 'message',
        label: 'Message',
        hint: 'Visible only.',
        trailing: send,
      }),
    );
    expect(host.querySelector('.kui-toolbar__leading')?.textContent).toBe(
      'Visible only.',
    );
    expect(
      host.querySelector('textarea')?.hasAttribute('aria-describedby'),
    ).toBe(false);
  });

  it('rejects row bounds that are not positive integers or that invert', () => {
    const base = { name: 'm', label: 'Message', trailing: send };
    expect(() => MessageComposer({ ...base, minRows: 0 })).toThrow(
      'MessageComposer minRows must be a positive integer.',
    );
    expect(() => MessageComposer({ ...base, maxRows: 2.5 })).toThrow(
      'MessageComposer maxRows must be a positive integer.',
    );
    expect(() => MessageComposer({ ...base, minRows: 4, maxRows: 2 })).toThrow(
      'MessageComposer maxRows must be at least minRows.',
    );
  });
});
