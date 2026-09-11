import { afterEach,beforeEach,describe,expect,it,vi } from 'vitest';

import { jsx } from '../../src/jsx-runtime.js';
import { choice,confirm,form,prompt } from '../../src/overlay.js';
import { clickBtn } from './overlay-test-helpers.js';

function key(target: EventTarget, k: string, init: KeyboardEventInit = {}): void {
  target.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true, ...init }));
}

beforeEach(() => {
  document.body.innerHTML = '';
});
afterEach(() => {
  vi.useRealTimers();
});

describe('confirm()', () => {
  it('OK resolves true, Cancel resolves false', async () => {
    const p1 = confirm('Sure?');
    const ok = document.querySelector('[data-confirm="ok"]') as HTMLElement;
    ok.click();
    await expect(p1).resolves.toBe(true);

    const p2 = confirm('Sure?');
    (document.querySelector('[data-confirm="cancel"]') as HTMLElement).click();
    await expect(p2).resolves.toBe(false);
  });

  it('Escape (and any dismissal) resolves false', async () => {
    const p = confirm('Sure?');
    key(document, 'Escape');
    await expect(p).resolves.toBe(false);
  });

  it('escapes the message + labels and honors title / danger', () => {
    void confirm('<img src=x onerror=alert(1)>', { title: 'Danger', okText: 'Yes', danger: true });
    const wrapper = document.querySelector('.kerf-confirm--danger') as HTMLElement;
    expect(wrapper).not.toBeNull();
    const msg = wrapper.querySelector('.kerf-confirm__message') as HTMLElement;
    // Auto-escaped: the tag is text, not a real <img> element.
    expect(msg.querySelector('img')).toBeNull();
    expect(msg.textContent).toBe('<img src=x onerror=alert(1)>');
    expect(wrapper.querySelector('.kerf-confirm__title')?.textContent).toBe('Danger');
    expect(wrapper.querySelector('.kerf-confirm__ok')?.textContent).toBe('Yes');
  });
});

describe('prompt()', () => {
  it('prefills defaultValue and resolves the live entered string on OK', async () => {
    const p = prompt('Name?', { defaultValue: 'ada' });
    const input = document.querySelector<HTMLInputElement>('.kerf-prompt__input')!;
    expect(input.value).toBe('ada');
    input.value = 'grace';
    clickBtn('[data-prompt="ok"]');
    await expect(p).resolves.toBe('grace');
    expect(document.querySelector('.kerf-prompt')).toBeNull(); // closed
  });

  it('an empty string is a valid OK result (not null)', async () => {
    const p = prompt('X', { defaultValue: '' });
    clickBtn('[data-prompt="ok"]');
    await expect(p).resolves.toBe('');
  });

  it('resolves null on Cancel', async () => {
    const p = prompt('X', { defaultValue: 'ignored' });
    clickBtn('[data-prompt="cancel"]');
    await expect(p).resolves.toBeNull();
  });

  it('resolves null on Escape dismissal', async () => {
    const p = prompt('X');
    key(document, 'Escape');
    await expect(p).resolves.toBeNull();
  });

  it('Enter in the field submits, like the native prompt', async () => {
    const p = prompt('X', { defaultValue: 'v' });
    const input = document.querySelector<HTMLInputElement>('.kerf-prompt__input')!;
    key(input, 'Enter');
    await expect(p).resolves.toBe('v');
  });

  it('validate blocks OK inline and keeps the dialog open, then allows once it passes', async () => {
    const p = prompt('Email', { validate: (v) => (v.includes('@') ? '' : 'need @') });
    const input = document.querySelector<HTMLInputElement>('.kerf-prompt__input')!;
    const err = document.querySelector<HTMLElement>('.kerf-prompt__error')!;
    expect(err.hidden).toBe(true);

    input.value = 'nope';
    clickBtn('[data-prompt="ok"]');
    expect(err.hidden).toBe(false);
    expect(err.textContent).toBe('need @');
    expect(document.querySelector('.kerf-prompt')).not.toBeNull(); // still open

    input.value = 'a@b';
    clickBtn('[data-prompt="ok"]');
    await expect(p).resolves.toBe('a@b');
  });

  it('auto-escapes the message (no HTML injection)', async () => {
    const p = prompt('<img src=x onerror=alert(1)>');
    const label = document.querySelector('.kerf-prompt__message')!;
    expect(label.querySelector('img')).toBeNull();
    expect(label.textContent).toContain('<img');
    clickBtn('[data-prompt="cancel"]'); // clean up the pending overlay
    await p;
  });

  it('renders an optional title, placeholder, and a custom inputType', async () => {
    const p = prompt('Email please', { title: 'Sign in', placeholder: 'you@example.com', inputType: 'email' });
    expect(document.querySelector('.kerf-prompt__title')?.textContent).toBe('Sign in');
    const input = document.querySelector<HTMLInputElement>('.kerf-prompt__input')!;
    expect(input.getAttribute('type')).toBe('email');
    expect(input.getAttribute('placeholder')).toBe('you@example.com');
    clickBtn('[data-prompt="cancel"]');
    await p;
  });

  it('Enter on a non-field element (the Cancel button) does not submit', async () => {
    const p = prompt('X', { defaultValue: 'v' });
    key(document.querySelector('[data-prompt="cancel"]')!, 'Enter');
    expect(document.querySelector('.kerf-prompt')).not.toBeNull(); // still open — not submitted
    clickBtn('[data-prompt="cancel"]');
    await expect(p).resolves.toBeNull();
  });
});

describe('form()', () => {
  it('renders one labeled input per field (label defaults to name) and resolves a record on OK', async () => {
    const p = form([
      { name: 'host', label: 'Host', defaultValue: 'localhost' },
      { name: 'port', defaultValue: '80' },
    ]);
    const labels = Array.from(document.querySelectorAll('.kerf-form__label')).map((l) => l.textContent);
    expect(labels).toEqual(['Host', 'port']); // second falls back to the name

    document.querySelector<HTMLInputElement>('[data-field="host"]')!.value = 'db.example';
    clickBtn('[data-form="ok"]');
    await expect(p).resolves.toEqual({ host: 'db.example', port: '80' });
    expect(document.querySelector('.kerf-form')).toBeNull();
  });

  it('resolves null on Cancel and on Escape', async () => {
    const pCancel = form([{ name: 'x' }]);
    clickBtn('[data-form="cancel"]');
    await expect(pCancel).resolves.toBeNull();

    const pEsc = form([{ name: 'x' }]);
    key(document, 'Escape');
    await expect(pEsc).resolves.toBeNull();
  });

  it('per-field validate blocks OK, shows each error, focuses the first invalid, then passes once fixed', async () => {
    const p = form([
      { name: 'user', validate: (v) => (v ? '' : 'required') },
      { name: 'token', validate: (v) => (v.length >= 3 ? '' : 'too short') },
    ]);
    clickBtn('[data-form="ok"]');

    const uErr = document.querySelector<HTMLElement>('[data-field-error="user"]')!;
    const tErr = document.querySelector<HTMLElement>('[data-field-error="token"]')!;
    expect(uErr.hidden).toBe(false);
    expect(uErr.textContent).toBe('required');
    expect(tErr.textContent).toBe('too short');
    expect(document.activeElement).toBe(document.querySelector('[data-field="user"]'));
    expect(document.querySelector('.kerf-form')).not.toBeNull(); // still open

    document.querySelector<HTMLInputElement>('[data-field="user"]')!.value = 'ada';
    document.querySelector<HTMLInputElement>('[data-field="token"]')!.value = 'abcd';
    clickBtn('[data-form="ok"]');
    await expect(p).resolves.toEqual({ user: 'ada', token: 'abcd' });
  });

  it('clears a previously-shown error once the field validates, on the next OK', async () => {
    const p = form([{ name: 'a', validate: (v) => (v ? '' : 'req') }]);
    clickBtn('[data-form="ok"]');
    const err = document.querySelector<HTMLElement>('[data-field-error="a"]')!;
    expect(err.hidden).toBe(false);

    document.querySelector<HTMLInputElement>('[data-field="a"]')!.value = 'x';
    clickBtn('[data-form="ok"]');
    await expect(p).resolves.toEqual({ a: 'x' });
  });

  it('Enter in a field submits', async () => {
    const p = form([{ name: 'q', defaultValue: 'hi' }]);
    key(document.querySelector('[data-field="q"]')!, 'Enter');
    await expect(p).resolves.toEqual({ q: 'hi' });
  });

  it('renders an optional title, a field placeholder, and a custom input type', async () => {
    const p = form([{ name: 'pw', label: 'Password', type: 'password', placeholder: '••••' }], { title: 'Login' });
    expect(document.querySelector('.kerf-form__title')?.textContent).toBe('Login');
    const input = document.querySelector<HTMLInputElement>('[data-field="pw"]')!;
    expect(input.getAttribute('type')).toBe('password');
    expect(input.getAttribute('placeholder')).toBe('••••');
    clickBtn('[data-form="ok"]');
    await expect(p).resolves.toEqual({ pw: '' }); // empty submit is still a record
  });

  it('Enter on a non-field element (the Cancel button) does not submit', async () => {
    const p = form([{ name: 'x' }]);
    key(document.querySelector('[data-form="cancel"]')!, 'Enter');
    expect(document.querySelector('.kerf-form')).not.toBeNull(); // still open
    clickBtn('[data-form="cancel"]');
    await expect(p).resolves.toBeNull();
  });
});

describe('confirm / prompt / form — bring-your-own markup (render)', () => {
  it('confirm render: spreading ok/cancel wires the buttons; default markup is not used', async () => {
    const p = confirm('Delete?', {
      render: ({ message, ok, cancel }) => jsx('div', {
        class: 'my-dialog',
        children: [
          jsx('p', { children: message }),
          jsx('button', { ...cancel, class: 'btn', children: 'No' }),
          jsx('button', { ...ok, class: 'btn btn-danger', children: 'Yes' }),
        ],
      }),
    });
    expect(document.querySelector('.my-dialog')).not.toBeNull();
    expect(document.querySelector('.kerf-confirm')).toBeNull(); // default markup skipped
    const yes = document.querySelector('.btn-danger') as HTMLElement;
    expect(yes.getAttribute('data-confirm')).toBe('ok'); // wiring spread through
    yes.click();
    await expect(p).resolves.toBe(true);

    const p2 = confirm('Delete?', {
      render: ({ ok, cancel }) => jsx('div', {
        children: [
          jsx('button', { ...cancel, class: 'no-btn', children: 'No' }),
          jsx('button', { ...ok, children: 'Yes' }),
        ],
      }),
    });
    (document.querySelector('.no-btn') as HTMLElement).click();
    await expect(p2).resolves.toBe(false);
  });

  it('prompt render: input/error/ok wiring — validate blocks in the BYO error slot, then OK resolves', async () => {
    const p = prompt('Name', {
      defaultValue: 'seed',
      validate: (v) => (v.length > 0 ? '' : 'required'),
      render: ({ message, input, error, ok, cancel }) => jsx('div', {
        class: 'my-prompt',
        children: [
          jsx('label', { children: message }),
          jsx('input', { ...input, class: 'my-input' }),
          jsx('span', { ...error, class: 'my-err' }),
          jsx('button', { ...cancel, class: 'my-cancel', children: 'X' }),
          jsx('button', { ...ok, class: 'my-ok', children: 'Go' }),
        ],
      }),
    });
    const input = document.querySelector('.my-input') as HTMLInputElement;
    expect(input.getAttribute('data-prompt-input')).toBe('');
    expect(input.value).toBe('seed'); // input attrs (value) spread through

    input.value = '';
    (document.querySelector('.my-ok') as HTMLElement).click();
    const err = document.querySelector('.my-err') as HTMLElement;
    expect(err.hidden).toBe(false);
    expect(err.textContent).toBe('required');
    expect(document.querySelector('.my-prompt')).not.toBeNull(); // still open

    input.value = 'ada';
    (document.querySelector('.my-ok') as HTMLElement).click();
    await expect(p).resolves.toBe('ada');
  });

  it('prompt render without an error slot: validate re-focuses without a message (no crash)', async () => {
    const p = prompt('Name', {
      validate: (v) => (v ? '' : 'nope'),
      render: ({ input, ok, cancel }) => jsx('div', {
        children: [
          jsx('input', { ...input, class: 'bare-input' }),
          jsx('button', { ...cancel, class: 'bc', children: 'X' }),
          jsx('button', { ...ok, class: 'bo', children: 'Go' }),
        ],
      }),
    });
    (document.querySelector('.bo') as HTMLElement).click(); // empty → validate blocks
    expect(document.querySelector('.bare-input')).not.toBeNull(); // still open, no throw

    (document.querySelector('.bare-input') as HTMLInputElement).value = 'ada';
    (document.querySelector('.bo') as HTMLElement).click();
    await expect(p).resolves.toBe('ada');
  });

  it('form render: per-field input/error wiring, validate blocks in the BYO slot, resolves a record', async () => {
    const p = form(
      [
        { name: 'host', label: 'Host', defaultValue: 'localhost' },
        { name: 'token', validate: (v) => (v.length >= 3 ? '' : 'short') },
      ],
      {
        render: ({ fields, ok, cancel }) => jsx('div', {
          class: 'my-form',
          children: [
            ...fields.map((f) => jsx('div', {
              children: [
                jsx('label', { children: f.label }),
                jsx('input', { ...f.input, class: `fi-${f.name}` }),
                jsx('span', { ...f.error, class: `fe-${f.name}` }),
              ],
            })),
            jsx('button', { ...cancel, class: 'fc', children: 'X' }),
            jsx('button', { ...ok, class: 'fo', children: 'Go' }),
          ],
        }),
      },
    );
    const host = document.querySelector('.fi-host') as HTMLInputElement;
    expect(host.value).toBe('localhost');
    expect(host.getAttribute('data-field')).toBe('host');

    (document.querySelector('.fo') as HTMLElement).click(); // token empty → blocks
    const tErr = document.querySelector('.fe-token') as HTMLElement;
    expect(tErr.hidden).toBe(false);
    expect(tErr.textContent).toBe('short');

    (document.querySelector('.fi-token') as HTMLInputElement).value = 'abcd';
    (document.querySelector('.fo') as HTMLElement).click();
    await expect(p).resolves.toEqual({ host: 'localhost', token: 'abcd' });
  });

  it('form render without error slots: blocks + focuses first invalid, then resolves (no crash)', async () => {
    const p = form([{ name: 'a', validate: (v) => (v ? '' : 'req') }], {
      render: ({ fields, ok, cancel }) => jsx('div', {
        children: [
          ...fields.map((f) => jsx('input', { ...f.input, class: `bare-${f.name}` })),
          jsx('button', { ...cancel, class: 'bfc', children: 'X' }),
          jsx('button', { ...ok, class: 'bfo', children: 'Go' }),
        ],
      }),
    });
    (document.querySelector('.bfo') as HTMLElement).click(); // empty → blocks, no error slot
    expect(document.querySelector('.bare-a')).not.toBeNull(); // still open

    (document.querySelector('.bare-a') as HTMLInputElement).value = 'x';
    (document.querySelector('.bfo') as HTMLElement).click();
    await expect(p).resolves.toEqual({ a: 'x' });
  });
});

describe('choice() — N-way dialog', () => {
  const actions = [
    { value: 'primary' as const, label: 'Save Draft' },
    { value: 'secondary' as const, label: 'Discard' },
    { value: 'cancel' as const, label: 'Keep Editing' },
  ];

  it('renders one button per action and resolves the clicked action value', async () => {
    const p = choice('Unsaved changes', actions);
    const buttons = document.querySelectorAll('.kerf-choice__action');
    expect(Array.from(buttons).map((b) => b.textContent)).toEqual(['Save Draft', 'Discard', 'Keep Editing']);

    (buttons[1] as HTMLElement).click(); // Discard
    await expect(p).resolves.toBe('secondary');
  });

  it('resolves null on Escape / backdrop dismissal', async () => {
    const p = choice('Pick', actions);
    key(document, 'Escape');
    await expect(p).resolves.toBeNull();
  });

  it('Enter resolves defaultValue (global Enter-to-confirm), from anywhere in the dialog', async () => {
    const p = choice('Pick', actions, { defaultValue: 'primary' });
    // A non-Enter key is ignored (dialog stays open)…
    key(document.querySelector('.kerf-choice__message')!, 'a');
    expect(document.querySelector('.kerf-choice')).not.toBeNull();
    // …Enter with focus NOT on a specific button still resolves the default.
    key(document.querySelector('.kerf-choice__message')!, 'Enter');
    await expect(p).resolves.toBe('primary');
  });

  it('without defaultValue, Enter does nothing special (dialog stays open)', async () => {
    const p = choice('Pick', actions);
    key(document.querySelector('.kerf-choice__message')!, 'Enter');
    expect(document.querySelector('.kerf-choice')).not.toBeNull(); // still open
    (document.querySelectorAll('.kerf-choice__action')[0] as HTMLElement).click();
    await expect(p).resolves.toBe('primary');
  });

  it('an action value of null/undefined stays distinct from a dismissal', async () => {
    const p = choice<null | string>('Pick', [
      { value: null, label: 'Nullish' },
      { value: 'x', label: 'X' },
    ]);
    (document.querySelectorAll('.kerf-choice__action')[0] as HTMLElement).click(); // value: null
    // Resolves the ACTION's null, not a dismissal — both are null here but the promise resolved via the click.
    await expect(p).resolves.toBeNull();
  });

  it('applies an optional per-action className and a title', () => {
    choice('Pick', [{ value: 1, label: 'One', className: 'btn btn-danger' }], { title: 'Heads up' });
    expect(document.querySelector('.kerf-choice__title')?.textContent).toBe('Heads up');
    const btn = document.querySelector('.kerf-choice__action') as HTMLElement;
    expect(btn.classList.contains('btn')).toBe(true);
    expect(btn.classList.contains('btn-danger')).toBe(true);
    (document.querySelector('[data-choice]') as HTMLElement).click(); // clean up
  });

  it('render: BYO markup — spread actions[i] onto your buttons', async () => {
    const p = choice('Pick', actions, {
      render: ({ message, actions: slots }) => jsx('div', {
        class: 'my-choice',
        children: [
          jsx('p', { children: message }),
          ...slots.map((slot, i) => jsx('button', { ...slot, class: `c-${i}`, children: actions[i].label })),
        ],
      }),
    });
    expect(document.querySelector('.my-choice')).not.toBeNull();
    expect(document.querySelector('.kerf-choice')).toBeNull(); // default markup skipped
    (document.querySelector('.c-2') as HTMLElement).click();
    await expect(p).resolves.toBe('cancel');
  });

  it('auto-escapes the message', () => {
    choice('<img src=x onerror=alert(1)>', actions);
    const msg = document.querySelector('.kerf-choice__message')!;
    expect(msg.querySelector('img')).toBeNull();
    expect(msg.textContent).toContain('<img');
    (document.querySelector('[data-choice]') as HTMLElement).click(); // clean up
  });
});
