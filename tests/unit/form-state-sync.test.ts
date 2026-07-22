/**
 * Form-state property sync (KF-335) — public-surface coverage for the
 * morph/binding call sites that carry a mutated `checked` / `value` /
 * `selected` attribute onto the live property. (The private `syncFormProp`
 * helper itself is unit-tested in `form-state-sync.internal.test.ts`, which
 * the dist-full suite excludes since the helper isn't published.)
 *
 * happy-dom does not model the browser dirty-value/dirty-checked flags
 * truthfully, so these tests DIVERGE the property from the attribute by hand
 * (exactly what a dirty control looks like) and assert our sync closes — or
 * deliberately doesn't close — the gap. The real dirty-flag behavior is
 * pinned end-to-end in `tests/browser/form-state-sync.spec.ts` across
 * chromium/firefox/webkit.
 */

import { beforeEach, describe, expect, it } from 'vitest';

import { morph, mount, signal } from '../../src/index.js';
import { jsx } from '../../src/jsx-runtime.js';

beforeEach(() => {
  document.body.innerHTML = '<div id="root"></div>';
});

const root = (): HTMLElement => document.getElementById('root') as HTMLElement;

describe('morph carries mutated form attributes onto properties', () => {
  it('checked attribute added → property follows a diverged control', () => {
    root().innerHTML = '<input type="checkbox">';
    const box = root().querySelector('input') as HTMLInputElement;
    box.checked = false; // diverged "dirty" state
    morph(root(), '<input type="checkbox" checked>');
    expect(box.hasAttribute('checked')).toBe(true);
    expect(box.checked).toBe(true);
  });

  it('checked attribute removed → property follows a diverged control', () => {
    root().innerHTML = '<input type="checkbox" checked>';
    const box = root().querySelector('input') as HTMLInputElement;
    box.checked = true;
    morph(root(), '<input type="checkbox">');
    expect(box.hasAttribute('checked')).toBe(false);
    expect(box.checked).toBe(false);
  });

  it('checked attribute unchanged → diverged property is left alone (uncontrolled)', () => {
    root().innerHTML = '<input type="checkbox"><span>a</span>';
    const box = root().querySelector('input') as HTMLInputElement;
    box.checked = true; // user checked; template never mentions the attr
    morph(root(), '<input type="checkbox"><span>b</span>');
    expect(box.checked).toBe(true);
  });

  it('value attribute changed → non-focused property follows', () => {
    root().innerHTML = '<input type="text" value="a">';
    const input = root().querySelector('input') as HTMLInputElement;
    input.value = 'typed';
    morph(root(), '<input type="text" value="b">');
    expect(input.getAttribute('value')).toBe('b');
    expect(input.value).toBe('b');
  });

  it('textarea template text changed → non-focused property follows', () => {
    root().innerHTML = '<textarea>initial</textarea>';
    const ta = root().querySelector('textarea') as HTMLTextAreaElement;
    ta.value = 'typed';
    morph(root(), '<textarea>from-template</textarea>');
    expect(ta.value).toBe('from-template');
  });

  it('textarea template text unchanged → diverged property is left alone', () => {
    root().innerHTML = '<textarea>fixed</textarea><span>a</span>';
    const ta = root().querySelector('textarea') as HTMLTextAreaElement;
    ta.value = 'typed';
    morph(root(), '<textarea>fixed</textarea><span>b</span>');
    expect(ta.value).toBe('typed');
  });

  it('textarea under data-morph-skip-children is not synced', () => {
    root().innerHTML = '<textarea data-morph-skip-children>old</textarea>';
    const ta = root().querySelector('textarea') as HTMLTextAreaElement;
    ta.value = 'typed';
    morph(root(), '<textarea data-morph-skip-children>new</textarea>');
    expect(ta.value).toBe('typed');
  });
});

describe('fine-grained bound attributes sync form properties', () => {
  it('bound checked={sig} carries the property through toggles', () => {
    const on = signal(true);
    const dispose = mount(root(), () =>
      jsx('div', { children: jsx('input', { type: 'checkbox', checked: on }) }));
    const box = root().querySelector('input') as HTMLInputElement;
    box.checked = false; // diverge (simulated user uncheck)
    on.value = false;
    on.value = true;     // attr re-added → property must follow
    expect(box.hasAttribute('checked')).toBe(true);
    expect(box.checked).toBe(true);
    dispose();
  });

  it('bound value={sig} updates a diverged non-focused input', () => {
    const v = signal('initial');
    const dispose = mount(root(), () =>
      jsx('div', { children: jsx('input', { type: 'text', value: v }) }));
    const input = root().querySelector('input') as HTMLInputElement;
    input.value = 'typed'; // diverge
    v.value = 'from-signal';
    expect(input.getAttribute('value')).toBe('from-signal');
    expect(input.value).toBe('from-signal');
    dispose();
  });
});
