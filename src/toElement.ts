/**
 * `toElement(jsx)` — JSX → DOM, with SVG-aware namespace handling.
 *
 * The naive implementation parses JSX through a `<template>` element's
 * `innerHTML`. That works for HTML and for SVG fragments whose root tag is
 * `<svg>` (the parser switches to "foreign content" mode). It silently
 * fails for SVG fragments WITHOUT an `<svg>` wrapper — descendants come out
 * as `HTMLUnknownElement` and never paint.
 *
 * `toElement` detects SVG content and routes through `DOMParser` with the
 * `image/svg+xml` MIME, which guarantees correct namespacing for all
 * descendants. HTML content takes the original `<template>` path unchanged.
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

function leadingTag(html: string): string | null {
  const match = /^\s*<([a-zA-Z][a-zA-Z0-9]*)\b/.exec(html);
  return match !== null ? match[1] : null;
}

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

export function toElement(jsx: SafeHtml | string): Element {
  const html = typeof jsx === 'string' ? jsx : jsx.toString();
  const tag = leadingTag(html);

  if (tag === 'svg') {
    // SVG root — parse as XML to guarantee namespace propagation.
    return parseSvgOrThrow(html, 'SVG', html).documentElement;
  }

  if (tag !== null && SVG_FRAGMENT_TAGS.has(tag)) {
    // SVG fragment without an <svg> wrapper — wrap, parse, unwrap.
    const wrapped = `<svg xmlns="${SVG_NS}">${html}</svg>`;
    const doc = parseSvgOrThrow(wrapped, 'SVG fragment', html);
    const first = doc.documentElement.firstElementChild;
    /* c8 ignore next 2 — defensive: a successful XML parse of a wrapped svg always yields ≥1 child. */
    if (first === null) throw new Error(`toElement: SVG fragment produced no element\n  input: ${excerpt(html)}`);
    return first;
  }

  // HTML — `<template>`-based parse.
  const t = document.createElement('template');
  t.innerHTML = html;
  const child = t.content.firstElementChild;
  if (child === null) throw new Error(`toElement: produced no element\n  input: ${excerpt(html)}`);
  return child;
}
