import { afterEach, describe, expect, it } from 'vitest';

import { Checkbox } from '../../src/components/forms/checkbox/checkbox.js';
import { wireCheckboxes } from '../../src/components/forms/checkbox/wiring/wire-checkboxes.js';
import { RadioGroup } from '../../src/components/forms/radio-group/radio-group.js';
import { Switch } from '../../src/components/forms/switch/switch.js';

const render = (markup: unknown) => {
  const host = document.createElement('div');
  host.innerHTML = String(markup);
  document.body.append(host);
  return host.firstElementChild as HTMLElement;
};

afterEach(() => {
  document.body.replaceChildren();
});

describe('Checkbox', () => {
  it('renders a native checkbox inside its label at the default size', () => {
    const root = render(Checkbox({ label: 'Email' }));
    expect(root.className).toBe('kui-checkbox');
    expect(root.dataset).toMatchObject({
      component: 'checkbox',
      size: 'default',
    });
    const input = root.querySelector<HTMLInputElement>('input')!;
    expect(input.type).toBe('checkbox');
    expect(input.closest('label')!.textContent).toBe('Email');
    expect(input.checked).toBe(false);
    for (const attribute of [
      'aria-description',
      'aria-invalid',
      'data-indeterminate',
      'data-action',
      'name',
      'value',
      'form',
      'id',
      'disabled',
      'required',
    ])
      expect(input.hasAttribute(attribute)).toBe(false);
    expect(
      root.querySelector('.kui-checkbox__box')!.getAttribute('aria-hidden'),
    ).toBe('true');
    expect(root.querySelector('.kui-checkbox__hint')).toBe(null);
    expect(root.querySelector('.kui-checkbox__error')).toBe(null);
    expect(root.hasAttribute('data-invalid')).toBe(false);
  });

  it('carries state, form attributes, description, and protected metadata', () => {
    const root = render(
      Checkbox({
        label: 'Terms',
        checked: true,
        indeterminate: true,
        name: 'terms',
        value: 'yes',
        hint: 'Read them first.',
        error: 'Accept to continue.',
        size: 'compact',
        disabled: true,
        required: true,
        action: 'accept',
        form: 'signup',
        id: 'terms',
        className: 'wide',
        slot: 'start',
        rootAttributes: { 'data-key': 'terms', 'data-size': 'default' },
      }),
    );
    expect(root.className).toBe('kui-checkbox wide');
    expect(root.getAttribute('slot')).toBe('start');
    expect(root.dataset).toMatchObject({ key: 'terms', size: 'compact' });
    expect(root.hasAttribute('data-invalid')).toBe(true);
    const input = root.querySelector<HTMLInputElement>('input')!;
    expect(input).toMatchObject({
      checked: true,
      name: 'terms',
      value: 'yes',
      disabled: true,
      required: true,
      id: 'terms',
    });
    expect(input.getAttribute('form')).toBe('signup');
    expect(input.dataset.action).toBe('accept');
    expect(input.hasAttribute('data-indeterminate')).toBe(true);
    expect(input.getAttribute('aria-description')).toBe(
      'Read them first. Accept to continue.',
    );
    expect(input.getAttribute('aria-invalid')).toBe('true');
    for (const part of ['hint', 'error'])
      expect(
        root
          .querySelector(`.kui-checkbox__${part}`)!
          .getAttribute('aria-hidden'),
      ).toBe('true');
  });
});

describe('wireCheckboxes', () => {
  const flush = () =>
    new Promise((resolve) => globalThis.setTimeout(resolve, 0));

  it('sets the native mixed state and keeps it in step with renders', async () => {
    const root = document.createElement('div');
    root.innerHTML = String(
      <>
        {Checkbox({ label: 'All', indeterminate: true })}
        {Checkbox({ label: 'One' })}
      </>,
    );
    document.body.append(root);
    const [all, one] = [...root.querySelectorAll('input')];
    const stop = wireCheckboxes(root);
    expect(all!.indeterminate).toBe(true);
    expect(one!.indeterminate).toBe(false);

    all!.removeAttribute('data-indeterminate');
    one!.setAttribute('data-indeterminate', '');
    await flush();
    expect(all!.indeterminate).toBe(false);
    expect(one!.indeterminate).toBe(true);

    // Added checkboxes, alone or inside a subtree, are synced too.
    const added = render(Checkbox({ label: 'Two', indeterminate: true }));
    root.append(added);
    const bare = document.createElement('input');
    bare.type = 'checkbox';
    bare.setAttribute('data-indeterminate', '');
    root.append(bare, document.createTextNode('text'));
    // Other elements carrying the marker are ignored.
    const other = document.createElement('div');
    root.append(other);
    await flush();
    other.setAttribute('data-indeterminate', '');
    await flush();
    expect(added.querySelector('input')!.indeterminate).toBe(true);
    expect(bare.indeterminate).toBe(true);

    stop();
    all!.setAttribute('data-indeterminate', '');
    await flush();
    expect(all!.indeterminate).toBe(false);
  });
});

describe('RadioGroup', () => {
  const choices = [
    { value: 'a', label: 'Compact' },
    { value: 'b', label: 'Balanced', hint: 'The default.' },
    { value: 'c', label: 'Roomy', disabled: true },
  ] as const;

  it('renders a labeled native fieldset of radios', () => {
    const root = render(
      RadioGroup({ label: 'Density', name: 'density', choices, value: 'b' }),
    );
    expect(root.localName).toBe('fieldset');
    expect(root.getAttribute('role')).toBe('radiogroup');
    expect(root.dataset).toMatchObject({
      component: 'radio-group',
      size: 'default',
      orientation: 'vertical',
    });
    expect(root.querySelector('legend')!.textContent).toBe('Density');
    for (const attribute of [
      'aria-label',
      'aria-description',
      'aria-invalid',
      'aria-required',
      'disabled',
      'id',
      'data-invalid',
    ])
      expect(root.hasAttribute(attribute)).toBe(false);
    const radios = [...root.querySelectorAll<HTMLInputElement>('input')];
    expect(radios.map((radio) => [radio.value, radio.checked])).toEqual([
      ['a', false],
      ['b', true],
      ['c', false],
    ]);
    expect(radios.every((radio) => radio.name === 'density')).toBe(true);
    expect(radios[2]!.disabled).toBe(true);
    expect(radios[1]!.getAttribute('aria-description')).toBe('The default.');
    expect(radios[0]!.hasAttribute('aria-description')).toBe(false);
    expect(radios[0]!.closest('label')!.textContent).toBe('Compact');
    expect(
      root.querySelector('.kui-radio-group__choice-hint')!.textContent,
    ).toBe('The default.');
    expect(root.querySelector('.kui-radio-group__hint')).toBe(null);
    expect(root.querySelector('.kui-radio-group__error')).toBe(null);
  });

  it('carries naming, description, validation, and form attributes', () => {
    const root = render(
      RadioGroup({
        ariaLabel: 'Channel',
        name: 'channel',
        choices,
        hint: 'Pick one.',
        error: 'Required.',
        size: 'compact',
        orientation: 'horizontal',
        required: true,
        disabled: true,
        action: 'pick',
        form: 'settings',
        id: 'channel',
        className: 'wide',
        slot: 'start',
        rootAttributes: { 'data-key': 'channel', 'data-orientation': 'x' },
      }),
    );
    expect(root.querySelector('legend')).toBe(null);
    expect(root.getAttribute('aria-label')).toBe('Channel');
    expect(root.getAttribute('aria-description')).toBe('Pick one. Required.');
    expect(root.getAttribute('aria-invalid')).toBe('true');
    expect(root.getAttribute('aria-required')).toBe('true');
    expect((root as HTMLFieldSetElement).disabled).toBe(true);
    expect(root.id).toBe('channel');
    expect(root.className).toBe('kui-radio-group wide');
    expect(root.getAttribute('slot')).toBe('start');
    expect(root.dataset).toMatchObject({
      key: 'channel',
      size: 'compact',
      orientation: 'horizontal',
    });
    expect(root.hasAttribute('data-invalid')).toBe(true);
    const radio = root.querySelector<HTMLInputElement>('input')!;
    expect(radio.required).toBe(true);
    expect(radio.dataset.action).toBe('pick');
    expect(radio.getAttribute('form')).toBe('settings');
    expect(radio.checked).toBe(false);
  });
});

describe('Switch', () => {
  it('renders a native checkbox with the switch role', () => {
    const root = render(Switch({ label: 'Live updates' }));
    expect(root.className).toBe('kui-switch');
    expect(root.dataset).toMatchObject({
      component: 'switch',
      size: 'default',
    });
    const input = root.querySelector<HTMLInputElement>('input')!;
    expect(input.type).toBe('checkbox');
    expect(input.getAttribute('role')).toBe('switch');
    expect(input.checked).toBe(false);
    expect(input.closest('label')!.textContent).toBe('Live updates');
    for (const attribute of [
      'aria-description',
      'data-action',
      'name',
      'value',
      'form',
      'id',
      'disabled',
    ])
      expect(input.hasAttribute(attribute)).toBe(false);
    expect(root.querySelector('.kui-switch__hint')).toBe(null);
  });

  it('carries state, form attributes, a hint, and protected metadata', () => {
    const root = render(
      Switch({
        label: 'Avatars',
        checked: true,
        name: 'avatars',
        value: 'on',
        hint: 'Shown beside names.',
        size: 'compact',
        disabled: true,
        action: 'toggle-avatars',
        form: 'prefs',
        id: 'avatars',
        className: 'wide',
        slot: 'end',
        rootAttributes: { 'data-key': 'avatars', 'data-component': 'x' },
      }),
    );
    expect(root.className).toBe('kui-switch wide');
    expect(root.getAttribute('slot')).toBe('end');
    expect(root.dataset).toMatchObject({
      key: 'avatars',
      component: 'switch',
      size: 'compact',
    });
    const input = root.querySelector<HTMLInputElement>('input')!;
    expect(input).toMatchObject({
      checked: true,
      name: 'avatars',
      value: 'on',
      disabled: true,
      id: 'avatars',
    });
    expect(input.getAttribute('form')).toBe('prefs');
    expect(input.dataset.action).toBe('toggle-avatars');
    expect(input.getAttribute('aria-description')).toBe('Shown beside names.');
    expect(
      root.querySelector('.kui-switch__hint')!.getAttribute('aria-hidden'),
    ).toBe('true');
  });
});
