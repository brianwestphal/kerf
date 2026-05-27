/**
 * KF-240 — `toElement()` adopts its result into the live document.
 *
 * Both parse paths (`<template>.content`, `DOMParser`) produce nodes owned by
 * an INERT document, not the live one. Operating on such a node before it's
 * inserted — most notably `mount()`'s first-render `rootEl.innerHTML = …` —
 * runs against an inert-document element, which on WebKit trips a fragment-
 * parsing bug: under rapid bursts the parser can hand back a *previous* parse's
 * nodes, so a freshly-built card silently inherits unrelated DOM (the Safari-
 * only "probe shows up pre-answered" report). `toElement` now `adoptNode`s the
 * result into `document`, so the returned node is always safe to mutate.
 *
 * The `ownerDocument === document` assertions are the deterministic, cross-
 * engine regression guard (they fail on every engine without the adopt). The
 * mount-before-insert burst is the functional guard against the actual symptom
 * on the engine that reproduced it.
 */

import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/tests/browser/fixtures/index.html');
  await page.waitForFunction(() => (window as unknown as { kerfReady: boolean }).kerfReady === true);
});

test('toElement() returns nodes owned by the live document, not a <template>/DOMParser inert doc', async ({ page }) => {
  const result = await page.evaluate(() => {
    const { toElement } = (window as any).kerf;
    const htmlEl = toElement('<div class="card"></div>');
    const svgEl = toElement('<svg xmlns="http://www.w3.org/2000/svg"><circle r="1"/></svg>');
    const orphan = toElement('<path d="M0 0"/>');
    const frag = toElement('<span>a</span><span>b</span>');
    return {
      htmlSame: htmlEl.ownerDocument === document,
      svgSame: svgEl.ownerDocument === document,
      svgNS: svgEl.namespaceURI,
      orphanSame: orphan.ownerDocument === document,
      orphanNS: orphan.namespaceURI,
      fragSame: frag.ownerDocument === document,
      fragChildrenSame: (Array.from(frag.children) as Element[]).every((c) => c.ownerDocument === document),
    };
  });
  expect(result.htmlSame).toBe(true);
  expect(result.svgSame).toBe(true);
  expect(result.svgNS).toBe('http://www.w3.org/2000/svg'); // adoption preserves namespace
  expect(result.orphanSame).toBe(true);
  expect(result.orphanNS).toBe('http://www.w3.org/2000/svg');
  expect(result.fragSame).toBe(true);
  expect(result.fragChildrenSame).toBe(true);
});

test('mounting many toElement() cards before insertion paints each from its OWN state — no stale/foreign DOM (WebKit repro shape)', async ({ page }) => {
  const glitches = await page.evaluate(() => {
    const { toElement, mount } = (window as any).kerf;
    // Mirror the LingoGist feed: rapidly create many detached cards, each
    // mounted (first-render innerHTML) BEFORE it's inserted, where the template
    // derives classes from per-card state. Half are pre-"answered" so a stale-
    // parse leak would surface as an unanswered card inheriting the answered
    // markup of a prior one.
    const bad: number[] = [];
    for (let i = 0; i < 400; i++) {
      const answered = i % 3 === 0; // some answered, some not — distinct shapes
      const card = toElement('<div class="probe"></div>') as HTMLElement;
      mount(card, () =>
        `<button class="opt${answered ? ' selected' : ''}"${answered ? ' disabled' : ''}>Yes</button>`,
      );
      const looksAnswered = card.querySelector('.selected, button[disabled]') !== null;
      if (looksAnswered !== answered) bad.push(i); // DOM disagrees with this card's state
      document.body.appendChild(card);
    }
    return bad;
  });
  expect(glitches).toEqual([]);
});
