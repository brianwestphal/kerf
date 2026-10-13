import { mount, signal } from 'kerfjs';
import { Circle } from 'lucide';
import { afterEach, describe, expect, it } from 'vitest';

import {
  ChoiceChips,
  type ChoiceChipsChoice,
} from '../../src/components/forms/choice-chips/choice-chips.js';
import { LucideIcon } from '../../src/components/media/lucide-icon/lucide-icon.js';
import {
  colorVar,
  type CssColor,
  fillColor,
} from '../../src/shared/styles/css-values.js';

const colors: readonly ChoiceChipsChoice[] = [
  { value: 'transparent', label: 'Transparent', swatch: 'transparent' },
  { value: 'blue', label: 'Blue', swatch: fillColor('#3b82f6') },
  { value: 'teal', label: 'Teal', swatch: colorVar('--app-teal') },
  { value: 'gray', label: 'Gray', disabled: true, title: 'Unavailable' },
];

function render(html: unknown): HTMLElement {
  const host = document.createElement('div');
  host.innerHTML = String(html);
  document.body.append(host);
  return host;
}

afterEach(() => {
  document.body.replaceChildren();
});

describe('ChoiceChips', () => {
  it('renders a named radiogroup of native radios with the controlled value checked', () => {
    const host = render(
      ChoiceChips({
        id: 'color',
        name: 'color',
        label: 'Command Color',
        value: 'blue',
        action: 'pick-color',
        choices: colors,
        className: 'command-color',
        slot: 'end',
      }),
    );
    const group = host.querySelector<HTMLElement>('.kui-choice-chips')!;
    expect(group.className).toBe('kui-choice-chips command-color');
    expect(group.id).toBe('color');
    expect(group.getAttribute('role')).toBe('radiogroup');
    expect(group.getAttribute('aria-label')).toBe('Command Color');
    expect(group.hasAttribute('aria-labelledby')).toBe(false);
    expect(group.dataset.component).toBe('choice-chips');
    expect(group.dataset.size).toBe('default');
    expect(group.getAttribute('slot')).toBe('end');
    expect(group.hasAttribute('aria-required')).toBe(false);

    const radios = [
      ...group.querySelectorAll<HTMLInputElement>('input[type="radio"]'),
    ];
    expect(radios.map((radio) => radio.value)).toEqual([
      'transparent',
      'blue',
      'teal',
      'gray',
    ]);
    expect(radios.every((radio) => radio.name === 'color')).toBe(true);
    expect(radios.map((radio) => radio.checked)).toEqual([
      false,
      true,
      false,
      false,
    ]);
    expect(radios.map((radio) => radio.dataset.action)).toEqual([
      'pick-color',
      'pick-color',
      'pick-color',
      'pick-color',
    ]);
    // The radio sits inside its label, so the visible text is its name.
    expect(radios[1]!.closest('label')?.textContent).toBe('Blue');
    expect(radios[3]!.disabled).toBe(true);
    const gray = radios[3]!.closest<HTMLElement>('label')!;
    expect(gray.hasAttribute('data-disabled')).toBe(true);
    expect(gray.title).toBe('Unavailable');
    expect(gray.dataset.choiceValue).toBe('gray');
  });

  it('paints a color dot, the struck transparent dot, and no dot for a text choice', () => {
    const host = render(
      ChoiceChips({ name: 'color', label: 'Color', choices: colors }),
    );
    const swatches = [
      ...host.querySelectorAll<HTMLElement>('.kui-choice-chips__swatch'),
    ];
    expect(swatches.map((swatch) => swatch.dataset.swatch)).toEqual([
      'transparent',
      'color',
      'color',
    ]);
    expect(
      swatches.every((swatch) => swatch.getAttribute('aria-hidden') === 'true'),
    ).toBe(true);
    expect(swatches[0]!.getAttribute('style')).toBeNull();
    expect(swatches[1]!.getAttribute('style')).toBe(
      '--_kui-choice-chips-swatch: #3b82f6',
    );
    expect(swatches[2]!.getAttribute('style')).toBe(
      '--_kui-choice-chips-swatch: var(--app-teal)',
    );
    expect(
      host.querySelectorAll('input:checked'),
      'no value means no selection',
    ).toHaveLength(0);
  });

  it('names the group by a visible heading and carries form, required, size, and group disabled state', () => {
    const host = render(
      ChoiceChips({
        name: 'view',
        labelledBy: 'view-label',
        value: 'board',
        size: 'compact',
        required: true,
        disabled: true,
        form: 'settings-form',
        choices: [
          {
            value: 'board',
            label: 'Board',
            icon: LucideIcon({ icon: Circle, name: 'circle' }),
          },
          { value: 'list', label: 'List' },
        ],
      }),
    );
    const group = host.querySelector<HTMLElement>('[role="radiogroup"]')!;
    expect(group.getAttribute('aria-labelledby')).toBe('view-label');
    expect(group.hasAttribute('aria-label')).toBe(false);
    expect(group.getAttribute('aria-required')).toBe('true');
    expect(group.getAttribute('aria-disabled')).toBe('true');
    expect(group.dataset.size).toBe('compact');
    expect(group.hasAttribute('data-disabled')).toBe(true);
    expect(group.hasAttribute('id')).toBe(false);
    const radios = [...group.querySelectorAll<HTMLInputElement>('input')];
    expect(radios.every((radio) => radio.disabled && radio.required)).toBe(
      true,
    );
    expect(radios.every((radio) => radio.getAttribute('form'))).toBe(true);
    expect(radios.every((radio) => !radio.hasAttribute('data-action'))).toBe(
      true,
    );
    const icon = group.querySelector<HTMLElement>('.kui-choice-chips__icon')!;
    expect(icon.getAttribute('aria-hidden')).toBe('true');
    expect(icon.querySelector('[data-lucide="circle"]')).not.toBeNull();
    expect(group.querySelectorAll('.kui-choice-chips__swatch')).toHaveLength(0);
  });

  it('submits the checked radio as the form value', () => {
    const host = render(
      `<form>${String(
        ChoiceChips({
          name: 'color',
          label: 'Color',
          value: 'teal',
          choices: colors,
        }),
      )}</form>`,
    );
    const form = host.querySelector('form')!;
    expect(new FormData(form).get('color')).toBe('teal');
  });

  it('follows a controlled value across rerenders', () => {
    const host = document.createElement('div');
    document.body.append(host);
    const value = signal('blue');
    const dispose = mount(host, () =>
      ChoiceChips({
        name: 'color',
        label: 'Color',
        value: value.value,
        choices: colors,
      }),
    );
    const checked = () =>
      host.querySelector<HTMLInputElement>('input:checked')?.value;
    expect(checked()).toBe('blue');
    value.value = 'transparent';
    expect(checked()).toBe('transparent');
    // A user selection the app adopts stays checked after the rerender.
    host.querySelector<HTMLInputElement>('input[value="teal"]')!.click();
    value.value = 'teal';
    expect(checked()).toBe('teal');
    dispose();
  });

  it('renders a multiple group of native checkboxes with every controlled value checked', () => {
    const host = render(
      ChoiceChips({
        id: 'intents',
        name: 'intents',
        label: 'Intents',
        multiple: true,
        value: ['bug', 'question'],
        action: 'toggle-intent',
        size: 'compact',
        form: 'annotation-form',
        choices: [
          { value: 'comment', label: 'Comment' },
          { value: 'bug', label: 'Bug', swatch: fillColor('#ef4444') },
          {
            value: 'move',
            label: 'Move',
            icon: LucideIcon({ icon: Circle, name: 'circle' }),
            disabled: true,
          },
          { value: 'question', label: 'Question' },
        ],
      }),
    );
    const group = host.querySelector<HTMLElement>('.kui-choice-chips')!;
    expect(group.getAttribute('role')).toBe('group');
    expect(group.getAttribute('aria-label')).toBe('Intents');
    expect(group.hasAttribute('aria-required')).toBe(false);
    expect(group.dataset.size).toBe('compact');
    const boxes = [...group.querySelectorAll<HTMLInputElement>('input')];
    expect(boxes.map((box) => box.type)).toEqual([
      'checkbox',
      'checkbox',
      'checkbox',
      'checkbox',
    ]);
    expect(boxes.every((box) => box.name === 'intents')).toBe(true);
    expect(boxes.map((box) => box.checked)).toEqual([false, true, false, true]);
    expect(boxes.every((box) => !box.required)).toBe(true);
    expect(boxes.every((box) => box.dataset.action === 'toggle-intent')).toBe(
      true,
    );
    expect(
      boxes.every((box) => box.getAttribute('form') === 'annotation-form'),
    ).toBe(true);
    expect(boxes[2]!.disabled).toBe(true);
    expect(boxes[1]!.closest('label')?.textContent).toBe('Bug');
    expect(
      group.querySelectorAll(
        '.kui-choice-chips__swatch, .kui-choice-chips__icon',
      ),
    ).toHaveLength(2);
  });

  it('checks nothing when a multiple group has no value, and submits every checked value', () => {
    const empty = render(
      ChoiceChips({
        name: 'intents',
        label: 'Intents',
        multiple: true,
        choices: colors,
      }),
    );
    expect(empty.querySelectorAll('input:checked')).toHaveLength(0);
    document.body.replaceChildren();

    const host = render(
      `<form>${String(
        ChoiceChips({
          name: 'colors',
          labelledBy: 'colors-label',
          multiple: true,
          value: ['transparent', 'teal'],
          choices: colors,
        }),
      )}</form>`,
    );
    const form = host.querySelector('form')!;
    expect(new FormData(form).getAll('colors')).toEqual([
      'transparent',
      'teal',
    ]);
    // Toggling a box changes the submitted set without touching the others.
    host.querySelector<HTMLInputElement>('input[value="blue"]')!.click();
    host.querySelector<HTMLInputElement>('input[value="teal"]')!.click();
    expect(new FormData(form).getAll('colors')).toEqual([
      'transparent',
      'blue',
    ]);
  });

  it('follows a controlled multiple value across rerenders', () => {
    const host = document.createElement('div');
    document.body.append(host);
    const value = signal<readonly string[]>(['blue']);
    const dispose = mount(host, () =>
      ChoiceChips({
        name: 'colors',
        label: 'Colors',
        multiple: true,
        value: value.value,
        choices: colors,
      }),
    );
    const checked = () =>
      [...host.querySelectorAll<HTMLInputElement>('input:checked')].map(
        (box) => box.value,
      );
    expect(checked()).toEqual(['blue']);
    value.value = ['transparent', 'blue', 'teal'];
    expect(checked()).toEqual(['transparent', 'blue', 'teal']);
    // A user toggle the app adopts stays as toggled after the rerender.
    host.querySelector<HTMLInputElement>('input[value="blue"]')!.click();
    value.value = ['transparent', 'teal'];
    expect(checked()).toEqual(['transparent', 'teal']);
    value.value = [];
    expect(checked()).toEqual([]);
    dispose();
  });

  it('rejects a swatch that is not one CSS color value, and a choice with both a swatch and an icon', () => {
    for (const swatch of ['', ' ', 'red; display: none', 'url("x")'])
      expect(() =>
        ChoiceChips({
          name: 'color',
          label: 'Color',
          choices: [{ value: 'x', label: 'X', swatch: swatch as CssColor }],
        }),
      ).toThrow(/one CSS color value/);
    expect(() =>
      ChoiceChips({
        name: 'color',
        label: 'Color',
        choices: [
          {
            value: 'x',
            label: 'X',
            swatch: 'transparent',
            icon: LucideIcon({ icon: Circle, name: 'circle' }),
          },
        ],
      }),
    ).toThrow(/a swatch or an icon/);
  });
});
