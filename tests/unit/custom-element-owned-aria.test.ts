/**
 * Custom elements own their host `role` / `aria-*` (plus `open`): the morph and
 * the keyed-list attribute fast path never REMOVE them just because the
 * template omits them, while setting / changing them from the template still
 * applies and a signal binding (explicit intent) can still remove them. Plain
 * elements keep the ordinary rule. The rule lives in
 * `src/utils/isUserAgentOwnedAttr.ts`.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { arraySignal } from '../../src/array-signal.js';
import { each } from '../../src/each.js';
import { html } from '../../src/html.js';
import { jsx } from '../../src/jsx-runtime.js';
import { morph } from '../../src/morph.js';
import { mount } from '../../src/mount.js';
import { signal } from '../../src/reactive.js';
import { isUserAgentOwnedAttr } from '../../src/utils/isUserAgentOwnedAttr.js';

let root: HTMLElement;

beforeEach(() => {
  root = document.createElement('div');
  document.body.appendChild(root);
});

afterEach(() => {
  document.body.innerHTML = '';
});

/** Attributes a web component typically sets on its own host. */
function selfSetSemantics(el: Element): void {
  el.setAttribute('role', 'option');
  el.setAttribute('aria-selected', 'true');
  el.setAttribute('aria-disabled', 'false');
  el.setAttribute('tabindex', '-1');
  el.setAttribute('data-state', 'x');
}

describe('isUserAgentOwnedAttr()', () => {
  it('owns open, role, and aria-* on hyphenated tags only', () => {
    expect(isUserAgentOwnedAttr('WA-OPTION', 'role')).toBe(true);
    expect(isUserAgentOwnedAttr('WA-OPTION', 'aria-selected')).toBe(true);
    expect(isUserAgentOwnedAttr('WA-OPTION', 'open')).toBe(true);
    expect(isUserAgentOwnedAttr('WA-OPTION', 'tabindex')).toBe(false);
    expect(isUserAgentOwnedAttr('WA-OPTION', 'class')).toBe(false);
    expect(isUserAgentOwnedAttr('WA-OPTION', 'arialabel')).toBe(false);
    expect(isUserAgentOwnedAttr('DIV', 'role')).toBe(false);
    expect(isUserAgentOwnedAttr('DIV', 'aria-label')).toBe(false);
    expect(isUserAgentOwnedAttr('DIV', 'open')).toBe(false);
    expect(isUserAgentOwnedAttr('DETAILS', 'open')).toBe(true);
    expect(isUserAgentOwnedAttr('DIALOG', 'open')).toBe(true);
    expect(isUserAgentOwnedAttr('DETAILS', 'role')).toBe(false);
  });
});

describe('morph(): custom-element-owned role / aria-*', () => {
  it('keeps a custom element’s self-set role and aria-* when the template omits them', () => {
    root.innerHTML = '<wa-option value="a"></wa-option>';
    const option = root.firstElementChild!;
    selfSetSemantics(option);
    morph(root, '<wa-option value="b"></wa-option>');
    expect(root.firstElementChild).toBe(option);
    expect(option.getAttribute('value')).toBe('b'); // the diff ran
    expect(option.getAttribute('role')).toBe('option');
    expect(option.getAttribute('aria-selected')).toBe('true');
    expect(option.getAttribute('aria-disabled')).toBe('false');
    // Only role / aria-* / open are element-owned.
    expect(option.hasAttribute('tabindex')).toBe(false);
    expect(option.hasAttribute('data-state')).toBe(false);
  });

  it('still strips role and aria-* from a plain element the template omits them on', () => {
    root.innerHTML = '<div class="a"></div>';
    const div = root.firstElementChild!;
    selfSetSemantics(div);
    morph(root, '<div class="b"></div>');
    expect(div.getAttribute('class')).toBe('b');
    for (const name of ['role', 'aria-selected', 'aria-disabled', 'tabindex']) {
      expect(div.hasAttribute(name)).toBe(false);
    }
  });

  it('lets the template set and change role / aria-* on a custom element', () => {
    root.innerHTML = '<wa-divider></wa-divider>';
    const divider = root.firstElementChild!;
    morph(root, '<wa-divider role="separator" aria-label="one"></wa-divider>');
    expect(divider.getAttribute('role')).toBe('separator');
    expect(divider.getAttribute('aria-label')).toBe('one');
    morph(
      root,
      '<wa-divider role="presentation" aria-label="two"></wa-divider>',
    );
    expect(divider.getAttribute('role')).toBe('presentation');
    expect(divider.getAttribute('aria-label')).toBe('two');
  });

  it('pins the trade-off: a template that sets then omits aria-* on a custom element keeps the last value', () => {
    root.innerHTML = '<my-toggle aria-pressed="true"></my-toggle>';
    const toggle = root.firstElementChild!;
    morph(root, '<my-toggle></my-toggle>');
    expect(toggle.getAttribute('aria-pressed')).toBe('true');
    // An explicit value is the template-driven way to change it.
    morph(root, '<my-toggle aria-pressed="false"></my-toggle>');
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
  });

  it('keeps them under mount() re-renders (JSX and the html tagged template)', () => {
    const tick = signal(0);
    mount(root, () =>
      jsx('div', {
        children: [
          jsx('span', { children: String(tick.value) }),
          jsx('wa-option', { value: 'a' }),
          html`<wa-divider data-tick=${String(tick.value)}></wa-divider>`,
        ],
      }),
    );
    const option = root.querySelector('wa-option')!;
    const divider = root.querySelector('wa-divider')!;
    selfSetSemantics(option);
    divider.setAttribute('role', 'separator');
    divider.setAttribute('aria-orientation', 'horizontal');
    tick.value = 1;
    expect(root.querySelector('span')!.textContent).toBe('1');
    expect(divider.getAttribute('data-tick')).toBe('1');
    expect(option.getAttribute('role')).toBe('option');
    expect(option.getAttribute('aria-selected')).toBe('true');
    expect(divider.getAttribute('role')).toBe('separator');
    expect(divider.getAttribute('aria-orientation')).toBe('horizontal');
    expect(option.hasAttribute('data-state')).toBe(false);
  });
});

describe('keyed-list attribute fast path: custom-element-owned role / aria-*', () => {
  function renderRows<T extends { id: number }>(
    rows: ReturnType<typeof arraySignal<T>>,
    tag: string,
    attrs: (row: T) => Record<string, string | undefined>,
  ): void {
    mount(root, () =>
      jsx('div', {
        children: each(rows, (row) =>
          jsx(tag, { 'data-key': String(row.id), ...attrs(row) }),
        ),
      }),
    );
  }

  it('keeps a custom row’s template-set aria-* the next template omits, updates a changed one', () => {
    const rows = arraySignal<{ id: number; label?: string; tone: string }>([
      { id: 1, label: 'one', tone: 'a' },
    ]);
    renderRows(rows, 'wa-option', (row) => ({
      'aria-label': row.label,
      'aria-describedby': `d-${row.tone}`,
      'data-tone': row.tone,
    }));
    const option = root.querySelector('wa-option')!;
    rows.update(0, (row) => ({ ...row, label: undefined, tone: 'b' }));
    const live = root.querySelector('wa-option')!;
    expect(live).toBe(option);
    expect(live.getAttribute('data-tone')).toBe('b');
    expect(live.getAttribute('aria-describedby')).toBe('d-b');
    expect(live.getAttribute('aria-label')).toBe('one');
  });

  it('still removes a plain row’s aria-* the next template omits', () => {
    const rows = arraySignal<{ id: number; label?: string; tone: string }>([
      { id: 1, label: 'one', tone: 'a' },
    ]);
    renderRows(rows, 'li', (row) => ({
      'aria-label': row.label,
      role: row.label === undefined ? undefined : 'option',
      'data-tone': row.tone,
    }));
    const li = root.querySelector('li')!;
    rows.update(0, (row) => ({ ...row, label: undefined, tone: 'b' }));
    expect(root.querySelector('li')).toBe(li);
    expect(li.getAttribute('data-tone')).toBe('b');
    expect(li.hasAttribute('aria-label')).toBe(false);
    expect(li.hasAttribute('role')).toBe(false);
  });
});

describe('signal bindings can still remove role / aria-* from a custom element', () => {
  it('a bound aria-* set to null / false removes it; a value sets it again (JSX)', () => {
    const expanded = signal<string | null | false>('true');
    const tick = signal(0);
    mount(root, () =>
      jsx('div', {
        'data-tick': String(tick.value),
        children: jsx('wa-dropdown', { 'aria-expanded': expanded }),
      }),
    );
    const dropdown = root.querySelector('wa-dropdown')!;
    expect(dropdown.getAttribute('aria-expanded')).toBe('true');
    expanded.value = null;
    expect(dropdown.hasAttribute('aria-expanded')).toBe(false);
    tick.value = 1; // an unrelated re-render must not resurrect it
    expect(dropdown.hasAttribute('aria-expanded')).toBe(false);
    expanded.value = 'false';
    expect(dropdown.getAttribute('aria-expanded')).toBe('false');
    expanded.value = false;
    expect(dropdown.hasAttribute('aria-expanded')).toBe(false);
  });

  it('a bound role set to null removes it (html tagged template)', () => {
    const role = signal<string | null>('menu');
    mount(root, () => html`<my-menu role=${role}></my-menu>`);
    const menu = root.querySelector('my-menu')!;
    expect(menu.getAttribute('role')).toBe('menu');
    role.value = null;
    expect(menu.hasAttribute('role')).toBe(false);
  });
});

describe('transition matrix (adversarial): who owns a custom element’s aria-*', () => {
  it('walks element-set → template-set → template-change → template-omit → element-rewrite → tag swap', () => {
    // States of one `aria-selected` on a custom row: absent, element-owned
    // (set by the component), template-owned (rendered). Each step crosses a
    // boundary; re-renders run through both the morph (mount surrounds) and
    // the keyed list (arraySignal rows) so both routes are walked.
    const tick = signal(0);
    const rows = arraySignal<{ id: number; sel?: string; tag: string }>([
      { id: 1, tag: 'wa-option' },
      { id: 2, tag: 'wa-option' },
    ]);
    mount(root, () =>
      jsx('div', {
        children: [
          jsx('wa-select', { 'data-tick': String(tick.value) }),
          jsx('div', {
            children: each(rows, (row) =>
              jsx(row.tag, {
                'data-key': String(row.id),
                'aria-selected': row.sel,
              }),
            ),
          }),
        ],
      }),
    );
    const host = root.querySelector('wa-select')!;
    const [first, second] = [...root.querySelectorAll('wa-option')];

    // 1. The component sets its own semantics; an unrelated re-render keeps them.
    host.setAttribute('role', 'combobox');
    host.setAttribute('aria-expanded', 'false');
    first.setAttribute('aria-selected', 'false');
    tick.value = 1;
    expect(host.getAttribute('role')).toBe('combobox');
    expect(host.getAttribute('aria-expanded')).toBe('false');
    expect(first.getAttribute('aria-selected')).toBe('false');

    // 2. The template takes over and sets a value.
    rows.update(0, (row) => ({ ...row, sel: 'true' }));
    expect(first.getAttribute('aria-selected')).toBe('true');

    // 3. The template changes it.
    rows.update(0, (row) => ({ ...row, sel: 'false' }));
    expect(first.getAttribute('aria-selected')).toBe('false');

    // 4. The template omits it: the last value survives (trade-off).
    rows.update(0, (row) => ({ ...row, sel: undefined }));
    expect(first.getAttribute('aria-selected')).toBe('false');

    // 5. The component rewrites it again; a reorder + re-render keeps it.
    first.setAttribute('aria-selected', 'true');
    rows.move(0, 1);
    tick.value = 2;
    const reordered = [...root.querySelectorAll('[data-key]')];
    expect(reordered.map((el) => el.getAttribute('data-key'))).toEqual([
      '2',
      '1',
    ]);
    expect(reordered[1]).toBe(first);
    expect(first.getAttribute('aria-selected')).toBe('true');
    expect(second.hasAttribute('aria-selected')).toBe(false);

    // 6. Empty-then-refill: rows the component had annotated are gone, and
    //    fresh rows start without them.
    rows.replace([]);
    expect(root.querySelectorAll('wa-option')).toHaveLength(0);
    rows.replace([{ id: 1, tag: 'wa-option' }]);
    const refilled = root.querySelector('wa-option')!;
    expect(refilled).not.toBe(first);
    expect(refilled.hasAttribute('aria-selected')).toBe(false);

    // 7. The row swaps to a plain tag: a new node, and a template-omitted
    //    aria-* on a plain element is removed as usual.
    rows.update(0, (row) => ({ ...row, tag: 'li', sel: 'true' }));
    const li = root.querySelector('li')!;
    expect(li.getAttribute('aria-selected')).toBe('true');
    rows.update(0, (row) => ({ ...row, sel: undefined }));
    expect(root.querySelector('li')!.hasAttribute('aria-selected')).toBe(false);

    // The surrounds kept the host's element-owned ARIA throughout.
    expect(host.getAttribute('role')).toBe('combobox');
    expect(host.getAttribute('aria-expanded')).toBe('false');
  });
});
