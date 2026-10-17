import { afterEach, describe, expect, it } from 'vitest';

import { CheckboxGroup } from '../../src/components/forms/checkbox-group/checkbox-group.js';

const render = (markup: unknown) => {
  const host = document.createElement('div');
  host.innerHTML = String(markup);
  document.body.append(host);
  return host.firstElementChild as HTMLFieldSetElement;
};

afterEach(() => {
  document.body.replaceChildren();
});

describe('CheckboxGroup', () => {
  const choices = [
    { value: 'email', label: 'Email' },
    { value: 'push', label: 'Push', hint: 'On this device.' },
    { value: 'sms', label: 'Text message', disabled: true },
  ] as const;

  it('renders a labeled native fieldset of Checkboxes', () => {
    const root = render(
      CheckboxGroup({
        label: 'Notifications',
        name: 'channels',
        choices,
        value: ['email', 'sms'],
      }),
    );
    expect(root.localName).toBe('fieldset');
    // A fieldset is natively a named group; no role is added over it.
    expect(root.hasAttribute('role')).toBe(false);
    expect(root.className).toBe('kui-checkbox-group');
    expect(root.dataset).toMatchObject({
      component: 'checkbox-group',
      size: 'default',
      orientation: 'vertical',
    });
    expect(root.querySelector('legend')!.textContent).toBe('Notifications');
    expect(root.querySelector('legend')!.className).toBe(
      'kui-checkbox-group__label',
    );
    for (const attribute of [
      'aria-label',
      'aria-labelledby',
      'aria-description',
      'aria-invalid',
      'disabled',
      'id',
      'slot',
      'data-invalid',
    ])
      expect(root.hasAttribute(attribute)).toBe(false);

    // Each choice is the package's own Checkbox, stacked in the choices list.
    const checkboxes = [
      ...root.querySelectorAll<HTMLElement>(
        '.kui-checkbox-group__choices > .kui-checkbox',
      ),
    ];
    expect(checkboxes.map((checkbox) => checkbox.dataset.component)).toEqual([
      'checkbox',
      'checkbox',
      'checkbox',
    ]);
    expect(checkboxes.every((box) => box.dataset.size === 'default')).toBe(
      true,
    );
    const inputs = [...root.querySelectorAll<HTMLInputElement>('input')];
    expect(
      inputs.map((input) => [input.type, input.value, input.checked]),
    ).toEqual([
      ['checkbox', 'email', true],
      ['checkbox', 'push', false],
      ['checkbox', 'sms', true],
    ]);
    expect(inputs.every((input) => input.name === 'channels')).toBe(true);
    expect(inputs.map((input) => input.disabled)).toEqual([false, false, true]);
    expect(inputs[0]!.closest('label')!.textContent).toBe('Email');
    expect(inputs[1]!.getAttribute('aria-description')).toBe('On this device.');
    expect(inputs[0]!.hasAttribute('aria-description')).toBe(false);
    expect(
      checkboxes[1]!.querySelector('.kui-checkbox__hint')!.textContent,
    ).toBe('On this device.');
    for (const input of inputs) {
      expect(input.hasAttribute('data-action')).toBe(false);
      expect(input.hasAttribute('form')).toBe(false);
      expect(input.required).toBe(false);
    }
    expect(root.querySelector('.kui-checkbox-group__hint')).toBe(null);
    expect(root.querySelector('.kui-checkbox-group__error')).toBe(null);
  });

  it('checks nothing without a value', () => {
    const root = render(
      CheckboxGroup({ ariaLabel: 'Channels', name: 'channels', choices }),
    );
    expect(
      [...root.querySelectorAll<HTMLInputElement>('input')].some(
        (input) => input.checked,
      ),
    ).toBe(false);
  });

  it('carries naming, description, validation, and form attributes', () => {
    const root = render(
      CheckboxGroup({
        ariaLabel: 'Channels',
        name: 'channels',
        choices,
        value: ['push'],
        hint: 'Pick any.',
        error: 'Pick at least one.',
        size: 'compact',
        orientation: 'horizontal',
        disabled: true,
        action: 'toggle-channel',
        form: 'settings',
        id: 'channels',
        className: 'wide',
        slot: 'start',
        rootAttributes: {
          'data-key': 'channels',
          'data-orientation': 'x',
          'data-component': 'x',
        },
      }),
    );
    expect(root.querySelector('legend')).toBe(null);
    expect(root.getAttribute('aria-label')).toBe('Channels');
    expect(root.getAttribute('aria-description')).toBe(
      'Pick any. Pick at least one.',
    );
    expect(root.getAttribute('aria-invalid')).toBe('true');
    expect(root.disabled).toBe(true);
    expect(root.id).toBe('channels');
    expect(root.className).toBe('kui-checkbox-group wide');
    expect(root.getAttribute('slot')).toBe('start');
    expect(root.dataset).toMatchObject({
      key: 'channels',
      component: 'checkbox-group',
      size: 'compact',
      orientation: 'horizontal',
    });
    expect(root.hasAttribute('data-invalid')).toBe(true);
    expect(root.querySelector('.kui-checkbox-group__hint')!.textContent).toBe(
      'Pick any.',
    );
    expect(root.querySelector('.kui-checkbox-group__error')!.textContent).toBe(
      'Pick at least one.',
    );
    // Group hint and error are the group's description, so they stay hidden
    // from the reading order rather than being read twice.
    for (const text of root.querySelectorAll(
      '.kui-checkbox-group__hint, .kui-checkbox-group__error',
    ))
      expect(text.getAttribute('aria-hidden')).toBe('true');
    // The group's error marks the group, not each checkbox's own text.
    expect(root.querySelector('.kui-checkbox__error')).toBe(null);
    for (const checkbox of root.querySelectorAll<HTMLElement>(
      '.kui-checkbox',
    )) {
      expect(checkbox.dataset.size).toBe('compact');
      expect(checkbox.hasAttribute('data-invalid')).toBe(false);
    }
    const inputs = [...root.querySelectorAll<HTMLInputElement>('input')];
    expect(inputs.map((input) => input.checked)).toEqual([false, true, false]);
    for (const input of inputs) {
      expect(input.dataset.action).toBe('toggle-channel');
      expect(input.getAttribute('form')).toBe('settings');
    }
  });

  it('can be named by a heading elsewhere', () => {
    const root = render(
      CheckboxGroup({
        labelledBy: 'channels-heading',
        name: 'channels',
        choices,
      }),
    );
    expect(root.getAttribute('aria-labelledby')).toBe('channels-heading');
    expect(root.querySelector('legend')).toBe(null);
    expect(root.hasAttribute('aria-label')).toBe(false);
  });

  it('submits every checked value under its name', () => {
    const form = document.createElement('form');
    form.innerHTML = String(
      CheckboxGroup({
        label: 'Notifications',
        name: 'channels',
        choices: [
          { value: 'email', label: 'Email' },
          { value: 'push', label: 'Push' },
          { value: 'digest', label: 'Digest' },
        ],
        value: ['email', 'digest'],
      }),
    );
    document.body.append(form);
    expect(new FormData(form).getAll('channels')).toEqual(['email', 'digest']);
  });
});
