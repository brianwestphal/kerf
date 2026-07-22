/**
 * Unit tests for the granular update reconciler's fast paths
 * (KF-198 attribute-only + KF-206 text-content-only). Drives them through
 * the public API — `arraySignal.update()` patches inside a `mount()` —
 * and observes (a) the fast-path applied the change in place, preserving
 * DOM node identity, and (b) `template.innerHTML` was NEVER written
 * (the parse + morph path didn't run).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { type ArraySignal,arraySignal } from '../../src/array-signal.js';
import { batch, each, mount } from '../../src/index.js';
import { jsx } from '../../src/jsx-runtime.js';

interface ParseSpy {
  count: number;
  restore: () => void;
}

function spyTemplateInnerHTML(): ParseSpy {
  const tplProto = Object.getPrototypeOf(document.createElement('template'));
  const origDescriptor = Object.getOwnPropertyDescriptor(tplProto, 'innerHTML')
    ?? Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'innerHTML')!;
  const spy: ParseSpy = {
    count: 0,
    restore: () => Object.defineProperty(tplProto, 'innerHTML', origDescriptor),
  };
  Object.defineProperty(tplProto, 'innerHTML', {
    configurable: true,
    get: origDescriptor.get,
    set(value: string) {
      spy.count += 1;
      origDescriptor.set!.call(this, value);
    },
  });
  return spy;
}

describe('granular update fast paths — KF-198 attribute-only', () => {
  let root: HTMLElement;

  beforeEach(() => {
    root = document.createElement('div');
    document.body.appendChild(root);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('class flip on top-level element: fast path fires, no parse, identity preserved', () => {
    type R = { id: number; selected: boolean };
    const rows = arraySignal<R>([
      { id: 1, selected: false },
      { id: 2, selected: false },
    ]);
    mount(root, () => jsx('table', {
      children: jsx('tbody', {
        children: each(rows, (r) => jsx('tr', {
          'data-key': String(r.id),
          class: r.selected ? 'danger' : '',
          children: jsx('td', { children: String(r.id) }),
        })),
      }),
    }));
    const oldTr1 = root.querySelectorAll('tr')[0];
    const oldTr2 = root.querySelectorAll('tr')[1];
    expect(oldTr1.getAttribute('class')).toBe('');

    const spy = spyTemplateInnerHTML();
    try {
      rows.update(0, (r) => ({ ...r, selected: true }));
    } finally {
      spy.restore();
    }

    const trs = root.querySelectorAll('tr');
    expect(trs[0]).toBe(oldTr1);
    expect(trs[1]).toBe(oldTr2);
    expect(trs[0].getAttribute('class')).toBe('danger');
    expect(spy.count).toBe(0);
  });

  it('multi-attribute change on top-level: fast path fires, all changed attrs applied', () => {
    type R = { id: number; cls: string; title: string };
    const rows = arraySignal<R>([{ id: 1, cls: 'a', title: 'one' }]);
    mount(root, () => jsx('ul', {
      children: each(rows, (r) => jsx('li', {
        'data-key': String(r.id),
        class: r.cls,
        title: r.title,
        children: 'x',
      })),
    }));
    const oldLi = root.querySelector('li')!;

    const spy = spyTemplateInnerHTML();
    try {
      rows.update(0, (r) => ({ ...r, cls: 'b', title: 'two' }));
    } finally {
      spy.restore();
    }

    expect(root.querySelector('li')).toBe(oldLi);
    expect(oldLi.getAttribute('class')).toBe('b');
    expect(oldLi.getAttribute('title')).toBe('two');
    expect(spy.count).toBe(0);
  });

  it('attribute added: fast path fires, attribute appears on live node', () => {
    type R = { id: number; title?: string };
    const rows = arraySignal<R>([{ id: 1 }]);
    mount(root, () => jsx('ul', {
      children: each(rows, (r) => jsx('li', {
        'data-key': String(r.id),
        title: r.title,
        children: 'x',
      })),
    }));
    const oldLi = root.querySelector('li')!;
    expect(oldLi.hasAttribute('title')).toBe(false);

    const spy = spyTemplateInnerHTML();
    try {
      rows.update(0, (r) => ({ ...r, title: 'added' }));
    } finally {
      spy.restore();
    }

    expect(root.querySelector('li')).toBe(oldLi);
    expect(oldLi.getAttribute('title')).toBe('added');
    expect(spy.count).toBe(0);
  });

  it('attribute removed: fast path fires, attribute is gone from live node', () => {
    type R = { id: number; title?: string };
    const rows = arraySignal<R>([{ id: 1, title: 'starts' }]);
    mount(root, () => jsx('ul', {
      children: each(rows, (r) => jsx('li', {
        'data-key': String(r.id),
        title: r.title,
        children: 'x',
      })),
    }));
    const oldLi = root.querySelector('li')!;
    expect(oldLi.getAttribute('title')).toBe('starts');

    const spy = spyTemplateInnerHTML();
    try {
      rows.update(0, (_) => ({ id: 1 }));
    } finally {
      spy.restore();
    }

    expect(root.querySelector('li')).toBe(oldLi);
    expect(oldLi.hasAttribute('title')).toBe(false);
    expect(spy.count).toBe(0);
  });

  it('text-content-also-changed: attribute fast path bails, morph path runs', () => {
    // Attribute changed AND text content changed in the same update — the
    // attribute-only check requires everything after the first '>' to be
    // byte-equal, so it bails. The text-content check requires only one
    // text node to differ; the attribute diff disqualifies that too. Falls
    // through to morph (one parse).
    type R = { id: number; cls: string; label: string };
    const rows = arraySignal<R>([{ id: 1, cls: 'a', label: 'one' }]);
    mount(root, () => jsx('ul', {
      children: each(rows, (r) => jsx('li', {
        'data-key': String(r.id),
        class: r.cls,
        children: r.label,
      })),
    }));
    const oldLi = root.querySelector('li')!;

    const spy = spyTemplateInnerHTML();
    try {
      rows.update(0, (_) => ({ id: 1, cls: 'b', label: 'two' }));
    } finally {
      spy.restore();
    }

    // Morph fired; tag identity preserved by the KF-201 in-place morph;
    // both changes applied. One parse for the new row HTML.
    expect(root.querySelector('li')).toBe(oldLi);
    expect(oldLi.getAttribute('class')).toBe('b');
    expect(oldLi.textContent).toBe('two');
    expect(spy.count).toBe(1);
  });

  it('data-morph-skip on row: fast path bails, morph respects the skip', () => {
    type R = { id: number; cls: string };
    const rows = arraySignal<R>([{ id: 1, cls: 'a' }]);
    mount(root, () => jsx('ul', {
      children: each(rows, (r) => jsx('li', {
        'data-key': String(r.id),
        'data-morph-skip': true,
        class: r.cls,
        children: 'x',
      })),
    }));
    const oldLi = root.querySelector('li')!;
    expect(oldLi.getAttribute('class')).toBe('a');

    const spy = spyTemplateInnerHTML();
    try {
      rows.update(0, (_) => ({ id: 1, cls: 'b' }));
    } finally {
      spy.restore();
    }

    // Fast path bailed (data-morph-skip in HTML); morph ran (one parse) and
    // honored the data-morph-skip — `class` stayed as the original 'a'.
    expect(root.querySelector('li')).toBe(oldLi);
    expect(oldLi.getAttribute('class')).toBe('a');
    expect(spy.count).toBe(1);
  });

  it('attribute value containing escaped entities: fast path decodes before setAttribute', () => {
    type R = { id: number; title: string };
    const rows = arraySignal<R>([{ id: 1, title: 'plain' }]);
    mount(root, () => jsx('ul', {
      children: each(rows, (r) => jsx('li', {
        'data-key': String(r.id),
        title: r.title,
        children: 'x',
      })),
    }));
    const oldLi = root.querySelector('li')!;

    const spy = spyTemplateInnerHTML();
    try {
      // A title containing '<', '>', '&', '"' would be emitted as
      // `title="&lt;a &amp; b&gt;&quot;c&quot;"`. The fast path must
      // unescape on the way back to setAttribute or the live attribute
      // value would be the raw escaped string, not the user's intent.
      rows.update(0, (_) => ({ id: 1, title: '<a & b>"c"' }));
    } finally {
      spy.restore();
    }

    expect(root.querySelector('li')).toBe(oldLi);
    expect(oldLi.getAttribute('title')).toBe('<a & b>"c"');
    expect(spy.count).toBe(0);
  });

  it('bulk update of attribute-only changes: zero parses, all rows preserved', () => {
    // krausest select-row shape: two updates flipping a class. Both should
    // hit the fast path; the bulk parse should never run.
    type R = { id: number; selected: boolean };
    const rows = arraySignal<R>([
      { id: 1, selected: false },
      { id: 2, selected: true },
    ]);
    mount(root, () => jsx('table', {
      children: jsx('tbody', {
        children: each(rows, (r) => jsx('tr', {
          'data-key': String(r.id),
          class: r.selected ? 'danger' : '',
          children: jsx('td', { children: String(r.id) }),
        })),
      }),
    }));
    const oldTrs = [...root.querySelectorAll('tr')];

    const spy = spyTemplateInnerHTML();
    try {
      batch(() => {
        rows.update(1, (r) => ({ ...r, selected: false }));
        rows.update(0, (r) => ({ ...r, selected: true }));
      });
    } finally {
      spy.restore();
    }

    const trs = root.querySelectorAll('tr');
    expect(trs[0]).toBe(oldTrs[0]);
    expect(trs[1]).toBe(oldTrs[1]);
    expect(trs[0].getAttribute('class')).toBe('danger');
    expect(trs[1].getAttribute('class')).toBe('');
    expect(spy.count).toBe(0);
  });
});

describe('granular update fast paths — KF-206 text-content-only', () => {
  let root: HTMLElement;

  beforeEach(() => {
    root = document.createElement('div');
    document.body.appendChild(root);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  function mountRows(rows: ArraySignal<{ id: number; label: string }>): void {
    mount(root, () => jsx('ul', {
      children: each(rows, (r) => jsx('li', {
        'data-key': String(r.id),
        children: jsx('span', { children: r.label }),
      })),
    }));
  }

  it('text node inside a child element: fast path fires, no parse, text node identity preserved', () => {
    const rows = arraySignal([
      { id: 1, label: 'first' },
      { id: 2, label: 'second' },
    ]);
    mountRows(rows);
    const oldLi = root.querySelector('li')!;
    const oldSpan = oldLi.querySelector('span')!;
    const oldText = oldSpan.firstChild as Text;
    expect(oldText.nodeValue).toBe('first');

    const spy = spyTemplateInnerHTML();
    try {
      rows.update(0, (r) => ({ ...r, label: 'first updated' }));
    } finally {
      spy.restore();
    }

    expect(root.querySelector('li')).toBe(oldLi);
    expect(oldLi.querySelector('span')).toBe(oldSpan);
    // Same text node, just a new nodeValue — focus / IME / selection on this
    // node survive an update.
    expect(oldSpan.firstChild).toBe(oldText);
    expect(oldText.nodeValue).toBe('first updated');
    expect(spy.count).toBe(0);
  });

  it('top-level text-only change (no wrapping span): fast path fires', () => {
    const rows = arraySignal([{ id: 1, label: 'a' }]);
    mount(root, () => jsx('ul', {
      children: each(rows, (r) => jsx('li', {
        'data-key': String(r.id),
        children: r.label,
      })),
    }));
    const oldLi = root.querySelector('li')!;
    const oldText = oldLi.firstChild as Text;

    const spy = spyTemplateInnerHTML();
    try {
      rows.update(0, (r) => ({ ...r, label: 'a updated' }));
    } finally {
      spy.restore();
    }

    expect(oldLi.firstChild).toBe(oldText);
    expect(oldText.nodeValue).toBe('a updated');
    expect(spy.count).toBe(0);
  });

  it('bulk update of text-only changes at non-contiguous indices: zero parses', () => {
    // krausest partial-update shape: 100 label-only updates at every 10th
    // index. Each diff is one text node, so every row hits the text-content
    // fast path; the bulk parse never runs.
    const initial = Array.from({ length: 5 }, (_, i) => ({ id: i, label: `row${i}` }));
    const rows = arraySignal(initial);
    mountRows(rows);
    const oldRows = [...root.querySelectorAll('li')];

    const spy = spyTemplateInnerHTML();
    try {
      batch(() => {
        rows.update(0, (r) => ({ ...r, label: 'A' }));
        rows.update(2, (r) => ({ ...r, label: 'C' }));
        rows.update(4, (r) => ({ ...r, label: 'E' }));
      });
    } finally {
      spy.restore();
    }

    const lis = root.querySelectorAll('li');
    expect([...lis].map((li) => li.textContent)).toEqual(['A', 'row1', 'C', 'row3', 'E']);
    // Every <li> identity preserved.
    for (let i = 0; i < oldRows.length; i++) {
      expect(lis[i]).toBe(oldRows[i]);
    }
    expect(spy.count).toBe(0);
  });

  it('text touches an entity (text contains &): fast path bails, morph runs', () => {
    // Updating from "plain" to "plain & ampersand" — the new HTML contains
    // '&amp;' (kerf's escape of '&'), which puts the '&' character in the
    // diff window. The fast path's pure-text-window check rejects '&'
    // (entity-touching) and bails.
    const rows = arraySignal([{ id: 1, label: 'plain' }]);
    mount(root, () => jsx('ul', {
      children: each(rows, (r) => jsx('li', {
        'data-key': String(r.id),
        children: r.label,
      })),
    }));
    const oldLi = root.querySelector('li')!;

    const spy = spyTemplateInnerHTML();
    try {
      rows.update(0, (_) => ({ id: 1, label: 'plain & ampersand' }));
    } finally {
      spy.restore();
    }

    expect(root.querySelector('li')).toBe(oldLi);
    expect(oldLi.textContent).toBe('plain & ampersand');
    expect(spy.count).toBe(1);
  });

  it('structural diff (text + child-element change): fast paths bail, morph runs', () => {
    type R = { id: number; label: string; hasFlag: boolean };
    const rows = arraySignal<R>([{ id: 1, label: 'a', hasFlag: false }]);
    mount(root, () => jsx('ul', {
      children: each(rows, (r) => jsx('li', {
        'data-key': String(r.id),
        children: r.hasFlag
          ? jsx('strong', { children: r.label })
          : r.label,
      })),
    }));
    const oldLi = root.querySelector('li')!;

    const spy = spyTemplateInnerHTML();
    try {
      rows.update(0, (_) => ({ id: 1, label: 'A', hasFlag: true }));
    } finally {
      spy.restore();
    }

    // Wrapping element appeared — structural change — fast paths can't
    // help. Morph ran (one parse), KF-201 preserved <li> identity.
    expect(root.querySelector('li')).toBe(oldLi);
    expect(oldLi.querySelector('strong')).not.toBeNull();
    expect(oldLi.textContent).toBe('A');
    expect(spy.count).toBe(1);
  });

  it('data-morph-skip on row: text-content fast path bails too', () => {
    type R = { id: number; label: string };
    const rows = arraySignal<R>([{ id: 1, label: 'first' }]);
    mount(root, () => jsx('ul', {
      children: each(rows, (r) => jsx('li', {
        'data-key': String(r.id),
        'data-morph-skip': true,
        children: r.label,
      })),
    }));
    const oldLi = root.querySelector('li')!;
    expect(oldLi.textContent).toBe('first');

    const spy = spyTemplateInnerHTML();
    try {
      rows.update(0, (_) => ({ id: 1, label: 'changed' }));
    } finally {
      spy.restore();
    }

    // Fast path bailed; morph ran AND honored data-morph-skip — original
    // text preserved.
    expect(oldLi.textContent).toBe('first');
    expect(spy.count).toBe(1);
  });
});


describe('granular fast path — URL screen invariant (KF-305)', () => {
  let root: HTMLElement;

  beforeEach(() => {
    root = document.createElement('div');
    document.body.appendChild(root);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('a dangerous URL set via a granular row update stays dropped through the fast path', () => {
    // KF-305 defense-in-depth: the attribute-only fast path (unescapeAttrValue →
    // setAttribute) trusts that the row HTML was already URL-screened by
    // renderAttr at string-build. Pin that end-to-end: an arraySignal row whose
    // href flips to `javascript:` re-renders through renderAttr (which drops it),
    // so the dangerous value never reaches the fast path's setAttribute — and the
    // change still travels the granular fast path (no `<template>.innerHTML` parse).
    //
    // KF-340: force production mode so renderAttr WARNS+DROPS on the re-render
    // instead of throwing. This test is inherently a prod-behavior invariant (the
    // fast-path setAttribute never sees the dangerous value); in dev the re-render
    // throws — that dev throw is covered by the renderAttr dev-throw tests.
    (globalThis as Record<string, unknown>).KERF_DEV = false;
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      type R = { id: number; url: string };
      const rows = arraySignal<R>([{ id: 1, url: '/safe' }]);
      mount(root, () => jsx('div', {
        children: each(rows, (r) => jsx('a', {
          'data-key': String(r.id),
          href: r.url,
          children: 'x',
        })),
      }));
      const a = root.querySelector('a')!;
      expect(a.getAttribute('href')).toBe('/safe');

      const spy = spyTemplateInnerHTML();
      try {
        rows.update(0, (r) => ({ ...r, url: 'javascript:alert(1)' }));
      } finally {
        spy.restore();
      }

      expect(a.hasAttribute('href')).toBe(false);   // dropped, never written
      expect(root.querySelector('a')).toBe(a);       // same node — fast path, not a rebuild
      expect(spy.count).toBe(0);                     // no innerHTML parse: the granular fast path ran
    } finally {
      warn.mockRestore();
      delete (globalThis as Record<string, unknown>).KERF_DEV;
    }
  });
});
