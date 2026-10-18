import { afterEach, describe, expect, it } from 'vitest';

import { TextField } from '../../src/components/forms/text-field/text-field.js';
import { wireTextFields } from '../../src/components/forms/text-field/wiring/wire-text-fields.js';

const render = (markup: unknown) => {
  const host = document.createElement('div');
  host.innerHTML = String(markup);
  document.body.append(host);
  return host.firstElementChild as HTMLElement;
};

const input = (field: HTMLElement) =>
  field.querySelector<HTMLInputElement>('.kui-text-field__input')!;

afterEach(() => {
  document.body.replaceChildren();
});

describe('TextField', () => {
  it('renders a labeled native input at the default size', () => {
    const field = render(TextField({ label: 'Project Name' }));
    expect(field.localName).toBe('label');
    expect(field.className).toBe('kui-text-field');
    expect(field.dataset).toMatchObject({
      component: 'text-field',
      size: 'default',
    });
    const label = field.querySelector('.kui-text-field__label')!;
    expect(label.textContent).toBe('Project Name');
    expect(label.getAttribute('aria-hidden')).toBe('true');
    const control = input(field);
    expect(control.localName).toBe('input');
    expect(control.type).toBe('text');
    expect(control.getAttribute('aria-label')).toBe('Project Name');
    for (const attribute of [
      'aria-description',
      'aria-invalid',
      'placeholder',
      'value',
      'maxlength',
      'min',
      'max',
      'step',
      'disabled',
      'readonly',
      'required',
      'autofocus',
      'name',
      'id',
    ])
      expect(control.hasAttribute(attribute)).toBe(false);
    for (const attribute of ['data-invalid', 'data-multiline', 'style', 'slot'])
      expect(field.hasAttribute(attribute)).toBe(false);
    for (const part of [
      'icon',
      'clear',
      'hint',
      'error',
      'footer',
      'count',
      'required',
    ])
      expect(field.querySelector(`.kui-text-field__${part}`)).toBe(null);
  });

  it('describes the field with its hint and error and marks it invalid', () => {
    const field = render(
      TextField({
        label: 'Email',
        hint: 'Used for sign-in.',
        error: 'Enter a complete email address.',
        type: 'email',
        required: true,
        value: 'robin@',
      }),
    );
    const control = input(field);
    expect(control.getAttribute('aria-description')).toBe(
      'Used for sign-in. Enter a complete email address.',
    );
    expect(control.getAttribute('aria-invalid')).toBe('true');
    expect(control.type).toBe('email');
    expect(control.required).toBe(true);
    expect(control.value).toBe('robin@');
    expect(field.hasAttribute('data-invalid')).toBe(true);
    expect(
      field
        .querySelector('.kui-text-field__required')!
        .getAttribute('aria-hidden'),
    ).toBe('true');
    for (const part of ['hint', 'error'])
      expect(
        field
          .querySelector(`.kui-text-field__${part}`)!
          .getAttribute('aria-hidden'),
      ).toBe('true');
  });

  it('forwards numeric constraints only to a number input', () => {
    const duty = input(
      render(
        TextField({
          label: 'Customs Duty',
          type: 'number',
          min: '0',
          max: 100,
          step: '0.01',
        }),
      ),
    );
    expect(duty.getAttribute('min')).toBe('0');
    expect(duty.getAttribute('max')).toBe('100');
    expect(duty.getAttribute('step')).toBe('0.01');

    const rate = input(
      render(
        TextField({ label: 'Exchange Rate', type: 'number', step: 'any' }),
      ),
    );
    expect(rate.getAttribute('step')).toBe('any');
    expect(rate.hasAttribute('min')).toBe(false);
    expect(rate.hasAttribute('max')).toBe(false);

    const text = input(
      render(TextField({ label: 'Code', min: 0, max: 100, step: 1 })),
    );
    for (const attribute of ['min', 'max', 'step'])
      expect(text.hasAttribute(attribute)).toBe(false);

    const area = render(
      TextField({
        label: 'Notes',
        multiline: true,
        type: 'number',
        min: 0,
        max: 100,
        step: 1,
      }),
    ).querySelector('textarea')!;
    for (const attribute of ['min', 'max', 'step'])
      expect(area.hasAttribute(attribute)).toBe(false);
  });

  it('renders a native date input with its value and form attributes', () => {
    const field = render(
      TextField({
        label: 'Needed By',
        type: 'date',
        value: '2026-11-12',
        name: 'neededBy',
        required: true,
        min: '2026-10-01',
      }),
    );
    const control = input(field);
    expect(control.type).toBe('date');
    expect(control.value).toBe('2026-11-12');
    expect(control.name).toBe('neededBy');
    expect(control.required).toBe(true);
    expect(control.getAttribute('aria-label')).toBe('Needed By');
    expect(control.hasAttribute('min')).toBe(false);

    const updated = render(
      TextField({ label: 'Needed By', type: 'date', value: '2026-12-01' }),
    );
    expect(input(updated).value).toBe('2026-12-01');
    const disabled = input(
      render(TextField({ label: 'Received On', type: 'date', disabled: true })),
    );
    expect(disabled.disabled).toBe(true);
    const readOnly = input(
      render(TextField({ label: 'Received On', type: 'date', readOnly: true })),
    );
    expect(readOnly.readOnly).toBe(true);
  });

  it('forwards autofocus to the native input or textarea', () => {
    const single = input(
      render(TextField({ label: 'Title', autofocus: true })),
    );
    expect(single.autofocus).toBe(true);
    expect(single.hasAttribute('autofocus')).toBe(true);

    const area = render(
      TextField({ label: 'Description', multiline: true, autofocus: true }),
    ).querySelector('textarea')!;
    expect(area.autofocus).toBe(true);
    expect(area.hasAttribute('autofocus')).toBe(true);
  });

  it('carries input attributes, an accessible name, and protected metadata', () => {
    const field = render(
      TextField({
        ariaLabel: 'Search Components',
        name: 'q',
        placeholder: 'Search',
        size: 'compact',
        icon: <svg data-lucide="search" />,
        type: 'search',
        disabled: true,
        readOnly: true,
        autocomplete: 'off',
        maxLength: 40,
        id: 'search',
        className: 'wide',
        slot: 'start',
        rootAttributes: {
          'data-key': 'search',
          'data-size': 'default',
          'data-component': 'other',
        },
      }),
    );
    expect(field.className).toBe('kui-text-field wide');
    expect(field.getAttribute('slot')).toBe('start');
    expect(field.dataset).toMatchObject({
      key: 'search',
      size: 'compact',
      component: 'text-field',
    });
    expect(field.querySelector('.kui-text-field__label')).toBe(null);
    expect(
      field.querySelector('.kui-text-field__icon')!.getAttribute('aria-hidden'),
    ).toBe('true');
    const control = input(field);
    expect(control.getAttribute('aria-label')).toBe('Search Components');
    expect(control).toMatchObject({
      name: 'q',
      placeholder: 'Search',
      type: 'search',
      disabled: true,
      readOnly: true,
      autocomplete: 'off',
      maxLength: 40,
      id: 'search',
    });
  });

  it('renders a clear button whose field always has a placeholder', () => {
    const field = render(
      TextField({ label: 'Name', value: 'Atlas', clearable: true }),
    );
    const clear = field.querySelector<HTMLButtonElement>(
      'button.kui-text-field__clear',
    )!;
    expect(clear.type).toBe('button');
    expect(clear.getAttribute('aria-label')).toBe('Clear');
    expect(clear.hasAttribute('data-text-field-clear')).toBe(true);
    expect(clear.disabled).toBe(false);
    // A blank placeholder lets CSS hide the button while the field is empty.
    expect(input(field).placeholder).toBe(' ');

    const named = render(
      TextField({
        label: 'Name',
        clearable: true,
        clearLabel: 'Clear Name',
        placeholder: 'Untitled',
        readOnly: true,
      }),
    );
    expect(
      named.querySelector('.kui-text-field__clear')!.getAttribute('aria-label'),
    ).toBe('Clear Name');
    expect(input(named).placeholder).toBe('Untitled');
    expect(
      named.querySelector<HTMLButtonElement>('.kui-text-field__clear')!
        .disabled,
    ).toBe(true);
  });

  it('renders a textarea with rows, a growing maximum, and a count', () => {
    const field = render(
      TextField({
        label: 'Release Note',
        multiline: true,
        rows: 4,
        value: 'Every row',
        hint: 'Markdown is supported.',
        maxLength: 200,
        showCount: true,
        clearable: true,
        icon: <svg data-lucide="pen" />,
      }),
    );
    const area = field.querySelector('textarea')!;
    expect(area.className).toBe('kui-text-field__input');
    expect(area.getAttribute('rows')).toBe('4');
    expect(area.value).toBe('Every row');
    expect(area.maxLength).toBe(200);
    expect(field.dataset.multiline).toBe('');
    expect(field.getAttribute('style')).toBe('--_kui-text-field-rows:4');
    // A multi-line field has no icon or clear button.
    expect(field.querySelector('.kui-text-field__icon')).toBe(null);
    expect(field.querySelector('.kui-text-field__clear')).toBe(null);
    expect(area.hasAttribute('placeholder')).toBe(false);
    const footer = field.querySelector('.kui-text-field__footer')!;
    expect(footer.querySelector('.kui-text-field__hint')!.textContent).toBe(
      'Markdown is supported.',
    );
    expect(footer.querySelector('.kui-text-field__count')!.textContent).toBe(
      '9 / 200',
    );

    const growing = render(
      TextField({
        label: 'Comment',
        multiline: true,
        rows: 4,
        maxRows: 2,
        showCount: true,
      }),
    );
    expect(growing.dataset.multiline).toBe('grow');
    // The maximum is never below the minimum; a count needs a maxLength.
    expect(growing.getAttribute('style')).toBe(
      '--_kui-text-field-rows:4;--_kui-text-field-max-rows:4',
    );
    expect(growing.querySelector('textarea')!.getAttribute('rows')).toBe('4');
    expect(growing.querySelector('textarea')!.value).toBe('');
    expect(growing.querySelector('.kui-text-field__count')).toBe(null);

    const countedEmpty = render(
      TextField({ label: 'Title', maxLength: 10, showCount: true }),
    );
    expect(
      countedEmpty.querySelector('.kui-text-field__footer')!.children.length,
    ).toBe(1);
    expect(
      countedEmpty.querySelector('.kui-text-field__count')!.textContent,
    ).toBe('0 / 10');
  });
});

describe('wireTextFields', () => {
  it('clears a field, announces input and change, and focuses it', () => {
    const field = render(
      TextField({ label: 'Name', value: 'Atlas', clearable: true }),
    );
    const stop = wireTextFields(document.body);
    const events: string[] = [];
    const control = input(field);
    control.addEventListener('input', () => events.push('input'));
    control.addEventListener('change', () => events.push('change'));
    field
      .querySelector('.kui-text-field__clear svg')!
      .dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(control.value).toBe('');
    expect(events).toEqual(['input', 'change']);
    expect(document.activeElement).toBe(control);

    stop();
    control.value = 'Again';
    field.querySelector<HTMLElement>('.kui-text-field__clear')!.click();
    expect(control.value).toBe('Again');
  });

  it('leaves disabled, read-only, and unrelated clicks alone', () => {
    const root = document.createElement('div');
    root.innerHTML = String(
      <>
        {TextField({
          label: 'Off',
          value: 'x',
          clearable: true,
          disabled: true,
        })}
        {TextField({
          label: 'Fixed',
          value: 'y',
          clearable: true,
          readOnly: true,
        })}
        <button type="button" data-text-field-clear="">
          Orphan
        </button>
      </>,
    );
    document.body.append(root);
    const stop = wireTextFields(root);
    const [off, fixed] = [
      ...root.querySelectorAll<HTMLInputElement>('.kui-text-field__input'),
    ];
    // A disabled button never dispatches a click, so dispatch one directly.
    for (const button of root.querySelectorAll('.kui-text-field__clear'))
      button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(off!.value).toBe('x');
    expect(fixed!.value).toBe('y');
    root.querySelector<HTMLElement>(':scope > button')!.click();
    root.dispatchEvent(new MouseEvent('click'));
    stop();
  });

  it('ignores a click that does not come from an element', () => {
    const stop = wireTextFields(document);
    expect(() => document.dispatchEvent(new MouseEvent('click'))).not.toThrow();
    stop();
  });

  it('keeps a count current as people type', () => {
    const root = document.createElement('div');
    root.innerHTML = String(
      <>
        {TextField({
          label: 'Note',
          multiline: true,
          maxLength: 20,
          showCount: true,
        })}
        {TextField({ label: 'Plain' })}
        <input class="kui-text-field__input" />
      </>,
    );
    document.body.append(root);
    const stop = wireTextFields(root);
    const area = root.querySelector('textarea')!;
    area.value = 'Hello';
    area.dispatchEvent(new Event('input', { bubbles: true }));
    expect(root.querySelector('.kui-text-field__count')!.textContent).toBe(
      '5 / 20',
    );
    // Fields without a count, and events from elsewhere, change nothing.
    const plain = root.querySelectorAll('input')[0]!;
    plain.dispatchEvent(new Event('input', { bubbles: true }));
    root.dispatchEvent(new Event('input'));
    stop();
    area.value = 'Hello again';
    area.dispatchEvent(new Event('input', { bubbles: true }));
    expect(root.querySelector('.kui-text-field__count')!.textContent).toBe(
      '5 / 20',
    );
  });

  it('counts only the field input itself', () => {
    const field = render(
      TextField({ label: 'Note', maxLength: 5, showCount: true }),
    );
    const stray = document.createElement('input');
    field.append(stray);
    const stop = wireTextFields(document.body);
    stray.value = 'abc';
    stray.dispatchEvent(new Event('input', { bubbles: true }));
    expect(field.querySelector('.kui-text-field__count')!.textContent).toBe(
      '0 / 5',
    );
    stop();
  });
});
