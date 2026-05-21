/**
 * Dev-mode warning for each() inside data-morph-skip subtrees
 * (KERF_DEV_WARN_EACH_IN_MORPH_SKIP=1).
 *
 * `maybeWarnEachInMorphSkip` is called by `mount()`'s `bindListsFromMarkers`
 * when a new list binding is established. Tests verify the opt-out / opt-in /
 * dedup / production-mode paths.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { _resetDupWarnedForTests, _resetWarnedForTests } from '../../src/dev-each-warn.js';
import { each } from '../../src/each.js';
import { jsx } from '../../src/jsx-runtime.js';
import { mount } from '../../src/mount.js';
import { signal } from '../../src/reactive.js';

const env = (globalThis as { process: { env: Record<string, string | undefined> } }).process.env;

let root: HTMLElement;
let warnSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  _resetWarnedForTests();
  _resetDupWarnedForTests();
  root = document.createElement('div');
  document.body.appendChild(root);
  warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  document.body.innerHTML = '';
  delete env.KERF_DEV_WARN_EACH_IN_MORPH_SKIP;
  delete env.KERF_DEV_WARN_DUPLICATE_EACH_KEYS;
  warnSpy.mockRestore();
});

describe('dev-each-warn (KERF_DEV_WARN_EACH_IN_MORPH_SKIP=1)', () => {
  const items = [{ id: 1 }, { id: 2 }];

  function renderSkippedList(): unknown {
    return jsx('div', {
      'data-morph-skip': '',
      children: jsx('ul', {
        children: each(items, (it) =>
          jsx('li', { 'data-key': String(it.id), children: String(it.id) }),
        ),
      }),
    });
  }

  function renderNormalList(): unknown {
    return jsx('div', {
      children: jsx('ul', {
        children: each(items, (it) =>
          jsx('li', { 'data-key': String(it.id), children: String(it.id) }),
        ),
      }),
    });
  }

  it('warns when each() list parent has a data-morph-skip ancestor', () => {
    env.KERF_DEV_WARN_EACH_IN_MORPH_SKIP = '1';
    mount(root, () => renderSkippedList() as never);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toMatch(/data-morph-skip/);
    expect(warnSpy.mock.calls[0][0]).toMatch(/each\(\)/);
    expect(warnSpy.mock.calls[0][0]).toMatch(/KERF_DEV_WARN_EACH_IN_MORPH_SKIP=0/);
  });

  it('does NOT warn when the env var is unset (default off)', () => {
    mount(root, () => renderSkippedList() as never);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('does NOT warn when each() list has no data-morph-skip ancestor', () => {
    env.KERF_DEV_WARN_EACH_IN_MORPH_SKIP = '1';
    mount(root, () => renderNormalList() as never);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('does NOT warn when NODE_ENV === \'production\' even with the env var set', () => {
    env.KERF_DEV_WARN_EACH_IN_MORPH_SKIP = '1';
    const prevNodeEnv = env.NODE_ENV;
    env.NODE_ENV = 'production';
    try {
      mount(root, () => renderSkippedList() as never);
      expect(warnSpy).not.toHaveBeenCalled();
    } finally {
      env.NODE_ENV = prevNodeEnv;
    }
  });

  it('warns at most once per list id (one-shot dedup)', () => {
    env.KERF_DEV_WARN_EACH_IN_MORPH_SKIP = '1';
    const sig = signal(items);
    mount(root, () =>
      jsx('div', {
        'data-morph-skip': '',
        children: jsx('ul', {
          children: each(sig.value, (it) =>
            jsx('li', { 'data-key': String(it.id), children: String(it.id) }),
          ),
        }),
      }) as never,
    );
    expect(warnSpy).toHaveBeenCalledTimes(1);
    // Signal change triggers a re-render; warn should NOT fire again for the same list id.
    sig.value = [...items];
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it('warns independently for two different each() lists in the same morph-skipped subtree', () => {
    env.KERF_DEV_WARN_EACH_IN_MORPH_SKIP = '1';
    const items2 = [{ id: 3 }];
    mount(root, () =>
      jsx('div', {
        'data-morph-skip': '',
        children: [
          jsx('ul', {
            children: each(items, (it) =>
              jsx('li', { 'data-key': String(it.id), children: String(it.id) }),
            ),
          }),
          jsx('ul', {
            children: each(items2, (it) =>
              jsx('li', { 'data-key': String(it.id), children: String(it.id) }),
            ),
          }),
        ],
      }) as never,
    );
    expect(warnSpy).toHaveBeenCalledTimes(2);
  });
});

describe('dev-each-warn duplicate cacheKey (KERF_DEV_WARN_DUPLICATE_EACH_KEYS=1)', () => {
  const itemsWithDupKey = [{ id: 1, type: 'a' }, { id: 2, type: 'a' }, { id: 3, type: 'b' }];
  const itemsNoDupKey  = [{ id: 1, type: 'a' }, { id: 2, type: 'b' }, { id: 3, type: 'c' }];

  it('warns when cacheKey function returns duplicate values', () => {
    env.KERF_DEV_WARN_DUPLICATE_EACH_KEYS = '1';
    mount(root, () =>
      jsx('ul', {
        children: each(
          itemsWithDupKey,
          (it) => jsx('li', { 'data-key': String(it.id), children: it.type }),
          (it) => it.type,
        ),
      }) as never,
    );
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toMatch(/duplicate cacheKey/);
    expect(warnSpy.mock.calls[0][0]).toMatch(/KERF_DEV_WARN_DUPLICATE_EACH_KEYS=0/);
  });

  it('does NOT warn when all cacheKey values are unique', () => {
    env.KERF_DEV_WARN_DUPLICATE_EACH_KEYS = '1';
    mount(root, () =>
      jsx('ul', {
        children: each(
          itemsNoDupKey,
          (it) => jsx('li', { 'data-key': String(it.id), children: it.type }),
          (it) => it.type,
        ),
      }) as never,
    );
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('does NOT warn when no cacheKey function is provided', () => {
    env.KERF_DEV_WARN_DUPLICATE_EACH_KEYS = '1';
    mount(root, () =>
      jsx('ul', {
        children: each(
          itemsWithDupKey,
          (it) => jsx('li', { 'data-key': String(it.id), children: it.type }),
        ),
      }) as never,
    );
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('does NOT warn when the env var is unset (default off)', () => {
    mount(root, () =>
      jsx('ul', {
        children: each(
          itemsWithDupKey,
          (it) => jsx('li', { 'data-key': String(it.id), children: it.type }),
          (it) => it.type,
        ),
      }) as never,
    );
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it('warns at most once per list id (one-shot dedup)', () => {
    env.KERF_DEV_WARN_DUPLICATE_EACH_KEYS = '1';
    const sig = signal(itemsWithDupKey);
    mount(root, () =>
      jsx('ul', {
        children: each(
          sig.value,
          (it) => jsx('li', { 'data-key': String(it.id), children: it.type }),
          (it) => it.type,
        ),
      }) as never,
    );
    expect(warnSpy).toHaveBeenCalledTimes(1);
    sig.value = [...itemsWithDupKey];
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it('does NOT warn in production mode', () => {
    env.KERF_DEV_WARN_DUPLICATE_EACH_KEYS = '1';
    const prevNodeEnv = env.NODE_ENV;
    env.NODE_ENV = 'production';
    try {
      mount(root, () =>
        jsx('ul', {
          children: each(
            itemsWithDupKey,
            (it) => jsx('li', { 'data-key': String(it.id), children: it.type }),
            (it) => it.type,
          ),
        }) as never,
      );
      expect(warnSpy).not.toHaveBeenCalled();
    } finally {
      env.NODE_ENV = prevNodeEnv;
    }
  });
});
