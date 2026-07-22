/**
 * KERF_DEV_WARN_VALUE_ONLY_RERENDER=1 — the opt-in value-only-re-render
 * warning (phase 2 of the bound-first consolidation). Covers the gate matrix
 * (off by default, production-off via the KERF_DEV override), the end-to-end
 * mount wiring for text/attr/boolean-attr value changes, the structural
 * negatives, per-mount one-shot dedup, and the `_isValueOnlyDiff` branch
 * matrix directly. `*.internal.test.ts` — imports non-public modules, so the
 * dist-full suite excludes it.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { _isValueOnlyDiff, isOptedIn, maybeWarnValueOnlyRerender } from '../../src/dev-rerender-warn.js';
import { mount, signal } from '../../src/index.js';
import { jsx } from '../../src/jsx-runtime.js';

const env = (globalThis as { process?: { env?: Record<string, string | undefined> } })
  .process!.env!;

let warn: ReturnType<typeof vi.spyOn>;
let disposers: Array<() => void>;

beforeEach(() => {
  document.body.innerHTML = '<div id="root"></div>';
  warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  disposers = [];
  env.KERF_DEV_WARN_VALUE_ONLY_RERENDER = '1';
});

afterEach(() => {
  for (const d of disposers) d();
  warn.mockRestore();
  delete env.KERF_DEV_WARN_VALUE_ONLY_RERENDER;
});

const root = (): HTMLElement => document.getElementById('root') as HTMLElement;

function mounted(render: () => ReturnType<typeof jsx>): void {
  disposers.push(mount(root(), render));
}

describe('gating', () => {
  it('is off by default (env var unset)', () => {
    delete env.KERF_DEV_WARN_VALUE_ONLY_RERENDER;
    expect(isOptedIn()).toBe(false);
  });

  it('is off when the flag is set but dev mode is overridden off', () => {
    const glob = globalThis as { KERF_DEV?: boolean };
    glob.KERF_DEV = false;
    try {
      expect(isOptedIn()).toBe(false);
    } finally {
      delete glob.KERF_DEV;
    }
  });

  it('is on with the flag under dev (NODE_ENV=test)', () => {
    expect(isOptedIn()).toBe(true);
  });

  it('does not warn when opted out even for a value-only change', () => {
    delete env.KERF_DEV_WARN_VALUE_ONLY_RERENDER;
    const label = signal('a');
    mounted(() => jsx('span', { children: label.value }));
    label.value = 'b';
    expect(warn).not.toHaveBeenCalled();
  });
});

describe('end-to-end through mount()', () => {
  it('warns on a text-only value change', () => {
    const label = signal('a');
    mounted(() => jsx('span', { children: label.value }));
    label.value = 'b';
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toMatch(/values bind, structure re-renders/i);
  });

  it('warns on an attribute-value-only change', () => {
    const cls = signal('a');
    mounted(() => jsx('div', { class: cls.value, children: 'x' }));
    cls.value = 'b';
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('warns when a boolean attribute appears/disappears (still a value change)', () => {
    const on = signal(false);
    mounted(() => jsx('button', { disabled: on.value, children: 'x' }));
    on.value = true;
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('does NOT warn on a structural change (conditional element)', () => {
    const show = signal(false);
    mounted(() => jsx('div', {
      children: show.value ? jsx('em', { children: 'x' }) : 'x',
    }));
    show.value = true;
    expect(warn).not.toHaveBeenCalled();
  });

  it('does NOT warn when a value change rides along with a structural change', () => {
    const state = signal({ label: 'a', extra: false });
    mounted(() => jsx('div', {
      children: [
        jsx('span', { children: state.value.label }),
        state.value.extra ? jsx('em', { children: '!' }) : null,
      ],
    }));
    state.value = { label: 'b', extra: true };
    expect(warn).not.toHaveBeenCalled();
  });

  it('warns once per mount (one-shot dedup)', () => {
    const label = signal('a');
    mounted(() => jsx('span', { children: label.value }));
    label.value = 'b';
    label.value = 'c';
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('separate mounts warn independently', () => {
    document.body.innerHTML = '<div id="root"></div><div id="root2"></div>';
    const a = signal('a');
    const b = signal('a');
    disposers.push(mount(document.getElementById('root')!, () =>
      jsx('span', { children: a.value })));
    disposers.push(mount(document.getElementById('root2')!, () =>
      jsx('span', { children: b.value })));
    a.value = 'x';
    b.value = 'y';
    expect(warn).toHaveBeenCalledTimes(2);
  });
});

describe('_isValueOnlyDiff branch matrix', () => {
  const frag = (html: string): DocumentFragment => {
    const t = document.createElement('template');
    t.innerHTML = html;
    return t.content;
  };

  it('true for text-data and attribute differences', () => {
    expect(_isValueOnlyDiff(frag('<p class="a">x</p>'), frag('<p class="b">y</p>'))).toBe(true);
    expect(_isValueOnlyDiff(frag('<p>x</p>'), frag('<p data-new>x</p>'))).toBe(true);
  });

  it('false on child-count mismatch', () => {
    expect(_isValueOnlyDiff(frag('<p>x</p>'), frag('<p>x</p><p>y</p>'))).toBe(false);
  });

  it('false on node-type mismatch at the same index', () => {
    expect(_isValueOnlyDiff(frag('<p>x</p>'), frag('text'))).toBe(false);
  });

  it('false on tag-name mismatch', () => {
    expect(_isValueOnlyDiff(frag('<p>x</p>'), frag('<div>x</div>'))).toBe(false);
  });

  it('false when nested children differ structurally', () => {
    expect(_isValueOnlyDiff(frag('<div><p>x</p></div>'), frag('<div><p>x</p><i>!</i></div>')))
      .toBe(false);
  });

  it('false on comment-data mismatch (markers are structural)', () => {
    expect(_isValueOnlyDiff(frag('<!--kf-list:0-->'), frag('<!--kf-list:1-->'))).toBe(false);
  });

  it('true on identical comments', () => {
    expect(_isValueOnlyDiff(frag('<!--m--><p>a</p>'), frag('<!--m--><p>b</p>'))).toBe(true);
  });

  it('warns through the direct API and then dedups via the context', () => {
    const ctx = { warned: false };
    maybeWarnValueOnlyRerender('<p>a</p>', '<p>b</p>', ctx);
    expect(ctx.warned).toBe(true);
    maybeWarnValueOnlyRerender('<p>b</p>', '<p>c</p>', ctx);
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('leaves the context unwarned on a structural diff', () => {
    const ctx = { warned: false };
    maybeWarnValueOnlyRerender('<p>a</p>', '<div>a</div>', ctx);
    expect(ctx.warned).toBe(false);
    expect(warn).not.toHaveBeenCalled();
  });
});
