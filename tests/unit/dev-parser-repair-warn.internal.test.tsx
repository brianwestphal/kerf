/**
 * The opt-in parser-repair warning (`KERF_DEV_WARN_PARSER_REPAIR=1`).
 *
 * `<p>` may contain only phrasing content, so the HTML parser closes it before
 * a block-level child. kerf renders JSX to a string and lets the parser build
 * the DOM, so the author's `<p>` ends up empty with its children hoisted to be
 * its siblings. The tests below pin both halves of the claim: that the repair
 * really happens (and what it costs), and that the warning names it.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { arraySignal } from '../../src/array-signal.js';
import { _resetWarnedForTests, findParagraphRepair } from '../../src/dev-parser-repair-warn.js';
import { each, mount, signal } from '../../src/index.js';

const env = (globalThis as { process: { env: Record<string, string | undefined> } }).process.env;

let root: HTMLElement;
let warn: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  document.body.innerHTML = '';
  root = document.createElement('div');
  document.body.appendChild(root);
  delete env.KERF_DEV_WARN_PARSER_REPAIR;
  _resetWarnedForTests();
  warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  delete env.KERF_DEV_WARN_PARSER_REPAIR;
  vi.restoreAllMocks();
});

const warnedAbout = (): string =>
  warn.mock.calls.map((c) => String(c[0])).join('\n');

describe('parser repair: what it actually does', () => {
  it('the parser empties the <p> and hoists its children to siblings', () => {
    const dispose = mount(root, () => (
      <p><section>head</section><span>tail</span></p>
    ));
    expect(root.innerHTML).toBe('<p></p><section>head</section><span>tail</span>');
    dispose();
  });

  it('kerf still reconciles the repaired tree correctly — updates are NOT broken', () => {
    // This is the reason the warning is advisory rather than an error: the
    // structure is wrong, but nothing downstream misbehaves.
    const rows = arraySignal([{ id: 'a' }]);
    const cond = signal(true);
    const dispose = mount(root, () => (
      <p>
        <section>head</section>
        {cond.value ? <b>flag</b> : ''}
        <ul>{each(rows, (r) => <li data-key={r.id}>{r.id}</li>, { key: 'L' })}</ul>
      </p>
    ));
    rows.push({ id: 'b' });
    expect(Array.from(root.querySelectorAll('li')).map((li) => li.textContent)).toEqual(['a', 'b']);
    cond.value = false;
    expect(root.querySelector('b')).toBeNull();
    expect(Array.from(root.querySelectorAll('li')).map((li) => li.textContent)).toEqual(['a', 'b']);
    dispose();
  });
});

describe('parser repair: detection', () => {
  it.each([
    ['<p><div>x</div></p>', 'div'],
    ['<p>text<ul><li>x</li></ul></p>', 'ul'],
    ['<p>a</p><section>b</section>', null],
    ['<p><span>phrasing is fine</span></p>', null],
    ['<div><section>no p involved</section></div>', null],
    ['<p>a</p><p>b</p>', null],
    ['<p><p>nested</p></p>', 'p'],
    ['<p><table><tbody></tbody></table></p>', 'table'],
    ['', null],
  ])('findParagraphRepair(%j) → %j', (html, expected) => {
    expect(findParagraphRepair(html)).toBe(expected);
  });

  it('is not confused by a block element that follows a properly closed <p>', () => {
    expect(findParagraphRepair('<p>one</p><h2>two</h2><p>three</p><h3>four</h3>')).toBeNull();
  });
});

describe('parser repair: reporting', () => {
  it('says nothing when the env var is unset', () => {
    const dispose = mount(root, () => <p><section>x</section></p>);
    expect(warn).not.toHaveBeenCalled();
    dispose();
  });

  it('warns once, naming the offending tag and the fix', () => {
    env.KERF_DEV_WARN_PARSER_REPAIR = '1';
    const dispose = mount(root, () => <p><section>x</section></p>);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warnedAbout()).toMatch(/a <section> inside a <p>/);
    expect(warnedAbout()).toMatch(/Use a <div>/);
    dispose();
  });

  it('does not repeat for the same tag pair across mounts', () => {
    env.KERF_DEV_WARN_PARSER_REPAIR = '1';
    const a = mount(root, () => <p><section>x</section></p>);
    a();
    const second = document.createElement('div');
    document.body.appendChild(second);
    const b = mount(second, () => <p><section>y</section></p>);
    expect(warn).toHaveBeenCalledTimes(1);
    b();
  });

  it('stays quiet for valid phrasing content', () => {
    env.KERF_DEV_WARN_PARSER_REPAIR = '1';
    const dispose = mount(root, () => <p><span>fine</span><em>also fine</em></p>);
    expect(warn).not.toHaveBeenCalled();
    dispose();
  });

  it('is off in production even when set', () => {
    env.KERF_DEV_WARN_PARSER_REPAIR = '1';
    (globalThis as { KERF_DEV?: boolean }).KERF_DEV = false;
    try {
      const dispose = mount(root, () => <p><section>x</section></p>);
      expect(warn).not.toHaveBeenCalled();
      dispose();
    } finally {
      delete (globalThis as { KERF_DEV?: boolean }).KERF_DEV;
    }
  });
});
