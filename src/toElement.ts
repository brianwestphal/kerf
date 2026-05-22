/**
 * `toElement(jsx)` — JSX → DOM, with SVG-aware namespace handling.
 *
 * Single-root inputs return an `Element`. Multi-root inputs (text + element,
 * `<><svg/> label</>`, two icons side by side, …) return a `DocumentFragment`
 * containing every top-level node. The DOM insertion APIs (`appendChild`,
 * `replaceChildren`, `append`) inline a `DocumentFragment`'s children on
 * insert, so `parent.replaceChildren(toElement(<>{ICON} label</>))` does the
 * obvious thing — parent gets the svg AND the text, no silent loss.
 *
 * SVG namespacing: the HTML5 parser handles `<svg>` as foreign content
 * correctly even when wrapped in a fragment, so multi-root inputs containing
 * SVGs come out namespaced correctly via the `<template>.innerHTML` path. For
 * single-root SVG inputs the XML parser is preferred (stricter — catches
 * malformed markup the HTML5 parser would silently auto-correct). For orphan
 * SVG-namespace fragments without an `<svg>` wrapper (`<path/>`, `<g>`, …)
 * the input is wrapped in `<svg xmlns=...>` and XML-parsed.
 */

import type { SafeHtml } from './jsx-runtime.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

const SVG_FRAGMENT_TAGS = new Set([
  'g', 'path', 'circle', 'rect', 'line', 'polygon', 'polyline', 'ellipse',
  'text', 'tspan', 'defs', 'use', 'symbol', 'clipPath', 'mask', 'pattern',
  'filter', 'marker', 'linearGradient', 'radialGradient', 'stop', 'image',
  'foreignObject',
]);

const EXCERPT_MAX_LEN = 100;

function excerpt(html: string): string {
  const trimmed = html.trim();
  return trimmed.length > EXCERPT_MAX_LEN ? `${trimmed.slice(0, EXCERPT_MAX_LEN)}…` : trimmed;
}

function parseSvgOrThrow(html: string, label: string, originalHtml: string): Document {
  const doc = new DOMParser().parseFromString(html, 'image/svg+xml');
  const err = doc.querySelector('parsererror');
  if (err !== null) {
    throw new Error(`toElement: ${label} parse error — ${err.textContent}\n  input: ${excerpt(originalHtml)}`);
  }
  return doc;
}

// True when the fragment is effectively a single root — exactly one element
// child, all sibling nodes whitespace-only text. Returns that element, else
// null. The whitespace tolerance matches the pre-KF-232 behavior for inputs
// like `  <svg/>\n` (which were treated as a single SVG root).
function singleRootElement(content: DocumentFragment): Element | null {
  if (content.children.length !== 1) return null;
  const onlyElement = content.firstElementChild;
  /* c8 ignore next — guarded by children.length === 1 above. */
  if (onlyElement === null) return null;
  for (const node of content.childNodes) {
    if (node === onlyElement) continue;
    if (node.nodeType !== Node.TEXT_NODE) return null;
    /* c8 ignore next — `textContent` on a TEXT_NODE is always a string; the `??` is a TypeScript-only guard. */
    if ((node.textContent ?? '').trim() !== '') return null;
  }
  return onlyElement;
}

export function toElement(jsx: SafeHtml | string): Element | DocumentFragment {
  const html = typeof jsx === 'string' ? jsx : jsx.toString();

  // First pass: HTML <template> parse. This gives us correct namespacing for
  // `<svg>` (foreign content), reveals the multi-root vs single-root shape,
  // and is the universal fallback path. Orphan SVG fragments without an
  // `<svg>` wrapper are the one case that needs a different parser — handled
  // below.
  const t = document.createElement('template');
  t.innerHTML = html;
  const content = t.content;

  const single = singleRootElement(content);

  if (single !== null) {
    const tag = single.tagName.toLowerCase();

    // Single SVG root → re-parse via XML for strict validation. The HTML5
    // parser silently auto-corrects malformed SVG (`<svg><unclosed</svg>`),
    // which is worse than throwing. Trim so trailing whitespace in the input
    // doesn't trip up the XML parser.
    if (tag === 'svg') {
      return parseSvgOrThrow(html.trim(), 'SVG', html).documentElement;
    }

    // Single orphan SVG-namespace fragment (`<path/>`, `<g>`, …) — the HTML5
    // parser puts these in the XHTML namespace, so wrap in `<svg>` and
    // XML-parse to get the right namespace on the returned element.
    if (SVG_FRAGMENT_TAGS.has(tag)) {
      const wrapped = `<svg xmlns="${SVG_NS}">${html}</svg>`;
      const doc = parseSvgOrThrow(wrapped, 'SVG fragment', html);
      const first = doc.documentElement.firstElementChild;
      /* c8 ignore next 2 — defensive: a successful XML parse of a wrapped svg always yields ≥1 child. */
      if (first === null) throw new Error(`toElement: SVG fragment produced no element\n  input: ${excerpt(html)}`);
      return first;
    }

    return single;
  }

  // Multi-root (or no roots): return the parsed DocumentFragment so the caller
  // can splat all the top-level nodes into their container via appendChild /
  // replaceChildren / append. If the input produced nothing at all, throw —
  // there's no useful Node to hand back.
  if (content.childNodes.length === 0) {
    throw new Error(`toElement: produced no element\n  input: ${excerpt(html)}`);
  }
  if (content.children.length === 0) {
    // No element children at all — only text or comments. Same "no element"
    // failure as the empty case; toElement's name implies at least one
    // element somewhere.
    throw new Error(`toElement: produced no element\n  input: ${excerpt(html)}`);
  }
  return content;
}
