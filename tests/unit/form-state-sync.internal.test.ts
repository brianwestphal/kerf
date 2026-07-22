/**
 * Direct unit coverage for the private `syncFormProp` helper (KF-335 form-state
 * property sync). Lives in an `.internal.test.ts` file because it imports a
 * non-public module (`src/utils/syncFormProp.ts`) — the dist-full suite
 * excludes internal tests since the published surface doesn't expose the
 * helper. The public-surface behavior (morph + bound-attribute call sites) is
 * covered in `form-state-sync.test.ts`, and the truthful browser dirty-flag
 * behavior in `tests/browser/form-state-sync.spec.ts`.
 */

import { beforeEach, describe, expect, it } from 'vitest';

import { syncFormProp } from '../../src/utils/syncFormProp.js';

beforeEach(() => {
  document.body.innerHTML = '<div id="root"></div>';
});

describe('syncFormProp', () => {
  it('sets/clears checked on INPUT', () => {
    const el = document.createElement('input');
    el.type = 'checkbox';
    syncFormProp(el, 'checked', '', true);
    expect(el.checked).toBe(true);
    syncFormProp(el, 'checked', '', false);
    expect(el.checked).toBe(false);
  });

  it('ignores checked on a non-INPUT element', () => {
    const el = document.createElement('div');
    expect(() => syncFormProp(el, 'checked', '', true)).not.toThrow();
  });

  it('sets value on a non-focused INPUT (present and absent)', () => {
    const el = document.createElement('input');
    el.value = 'diverged';
    syncFormProp(el, 'value', 'next', true);
    expect(el.value).toBe('next');
    syncFormProp(el, 'value', '', false);
    expect(el.value).toBe('');
  });

  it('skips value on the focused element (in-progress edit is preserved)', () => {
    const el = document.createElement('input');
    (document.getElementById('root') as HTMLElement).appendChild(el);
    el.focus();
    el.value = 'typing';
    syncFormProp(el, 'value', 'clobber', true);
    expect(el.value).toBe('typing');
  });

  it('ignores value on a non-INPUT element', () => {
    const el = document.createElement('div');
    expect(() => syncFormProp(el, 'value', 'x', true)).not.toThrow();
  });

  it('sets/clears selected on OPTION', () => {
    const el = document.createElement('option');
    syncFormProp(el, 'selected', '', true);
    expect(el.selected).toBe(true);
    syncFormProp(el, 'selected', '', false);
    expect(el.selected).toBe(false);
  });

  it('ignores selected on a non-OPTION element', () => {
    const el = document.createElement('div');
    expect(() => syncFormProp(el, 'selected', '', true)).not.toThrow();
  });

  it('no-ops for unrelated attribute names', () => {
    const el = document.createElement('input');
    el.value = 'kept';
    syncFormProp(el, 'class', 'x', true);
    expect(el.value).toBe('kept');
  });
});
