/**
 * KF-391 — row markup the HTML parser RESTRUCTURES must fail loudly, not
 * misbind.
 *
 * `<tr>` rows with the `each()` directly inside `<table>` are the canonical
 * case: the parser inserts an implicit `<tbody>` around the whole row run, so
 * the binding walk paired row 0 with the wrapper, never found the real rows,
 * and the first reconcile re-inserted them *outside* the wrapper — visible
 * duplicate rows. The always-on missing-row-key warning then fired **falsely**
 * (it inspected the wrapper, which has no `data-key`), pointing the author at
 * the wrong problem entirely.
 *
 * This is the same class as the KF-103 row contract — author markup whose
 * parse output cannot line up one row per element — so it gets the same
 * treatment: reject it with a precise error. The contract check now compares
 * the bound element's tag against the row's own top-level tag, which is what
 * the outerHTML comparison alone could not distinguish from harmless browser
 * normalization.
 *
 * The supported shape (an explicit sectioning element around the list) is
 * pinned alongside, because it is what the error tells authors to write and
 * what the benchmark entry uses.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { arraySignal } from '../../src/array-signal.js';
import { each, mount } from '../../src/index.js';

let root: HTMLElement;

beforeEach(() => {
  root = document.createElement('div');
  document.body.appendChild(root);
});

afterEach(() => { document.body.innerHTML = ''; });

describe('KF-391: parser-restructured row markup', () => {
  it('an each() of <tr> directly inside <table> throws naming both tags and the fix', () => {
    const rows = [{ id: 'r1' }, { id: 'r2' }];
    let message = '';
    try {
      mount(root, () => (
        <table>{each(rows, (r) => <tr data-key={r.id}><td>{r.id}</td></tr>)}</table>
      ));
    } catch (e) {
      message = (e as Error).message;
    }
    // Names what the row renders, what the parser produced, and the remedy —
    // the old failure mode gave the author a misleading data-key warning.
    expect(message).toMatch(/row 0 renders <tr>/);
    expect(message).toMatch(/wrapped the rows in <tbody>/);
    expect(message).toMatch(/<table><tbody>\{each\(\.\.\.\)\}<\/tbody><\/table>/);
  });

  it('does not leave a half-built list behind when it throws', () => {
    // The throw happens during first render, so nothing should have been
    // bound or reconciled — no duplicate rows sitting in the DOM.
    const rows = [{ id: 'r1' }, { id: 'r2' }];
    expect(() => mount(root, () => (
      <table>{each(rows, (r) => <tr data-key={r.id}><td>{r.id}</td></tr>)}</table>
    ))).toThrow();
    expect(root.querySelectorAll('tr[data-key="r2"]').length).toBeLessThanOrEqual(1);
  });

  it('the supported shape — each() inside an explicit <tbody> — binds and reconciles cleanly', () => {
    const rows = arraySignal([{ id: 'r1' }, { id: 'r2' }]);
    const dispose = mount(root, () => (
      <table>
        <tbody>{each(rows, (r) => <tr data-key={r.id}><td>{r.id}</td></tr>)}</tbody>
      </table>
    ));
    expect(root.querySelectorAll('tbody tr').length).toBe(2);
    rows.push({ id: 'r3' });
    // Every row lives inside the tbody — no reconciler-inserted strays.
    expect(root.querySelectorAll('tbody tr').length).toBe(3);
    expect(root.querySelectorAll('tr').length).toBe(3);
    rows.remove(0);
    expect(root.querySelectorAll('tbody tr').length).toBe(2);
    expect(root.querySelectorAll('tr').length).toBe(2);
    dispose();
  });

  it('the supported shape does not fire the missing-row-key warning', () => {
    // The false positive was the most misleading symptom of the bug: rows DO
    // carry data-key. Pin that the correct shape is quiet.
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      const rows = [{ id: 'r1' }];
      const dispose = mount(root, () => (
        <table>
          <tbody>{each(rows, (r) => <tr data-key={r.id}><td>{r.id}</td></tr>)}</tbody>
        </table>
      ));
      expect(warn.mock.calls.some((c) => String(c[0]).includes('no `id` or `data-key`'))).toBe(false);
      dispose();
    } finally {
      warn.mockRestore();
    }
  });

  it('ordinary non-table lists are unaffected by the tag check', () => {
    // The check must not fire on normalization-only differences, which is
    // what the outerHTML comparison already tolerated (e.g. void-element
    // spelling). Same tag in and out → no error.
    const rows = arraySignal([{ id: 'a' }, { id: 'b' }]);
    const dispose = mount(root, () => (
      <ul>{each(rows, (r) => <li data-key={r.id}><br />{r.id}</li>)}</ul>
    ));
    expect(root.querySelectorAll('li').length).toBe(2);
    rows.push({ id: 'c' });
    expect(root.querySelectorAll('li').length).toBe(3);
    dispose();
  });
});
