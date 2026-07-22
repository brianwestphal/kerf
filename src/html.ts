/**
 * `html` — tagged-template authoring at the `kerfjs/html` subpath, so
 * "no build step" is literally true: a CDN / importmap consumer can author
 * kerf UIs without a JSX transform.
 *
 *     import { html } from 'kerfjs/html';
 *     html`<div class="${cls}">Count: ${count}</div>`
 *     html`<ul>${each(items.value, (i) => html`<li id="${i.id}">${i.label}</li>`)}</ul>`
 *
 * A thin front-end over the exact machinery JSX uses — the runtime paths are
 * IDENTICAL. Text holes go through the JSX child pipeline (`_toSegment`):
 * SafeHtml/list-segment passthrough (so `each()` composes and the keyed
 * reconciler owns its rows), string escaping, number stringify, boolean /
 * nullish → nothing, signal → fine-grained text binding, DOM-node and
 * unsupported-type errors. Attribute holes go through the JSX attribute
 * branch: signal → `_assertEmittableAttrName` + `bindAttr` (grouped into one
 * marker attribute per element); anything else → the JSX attribute renderer
 * (booleans, SafeHtml, URL screening, `on*` / malformed-name rejection).
 * `mount()` / `morph()` / the reconcilers need zero changes.
 *
 * Unlike JSX, NO camelCase attribute aliasing is applied — template authors
 * write real HTML attribute names (`class`, not `className`).
 *
 * Hole contract (enforced by the parser in `utils/templateParse.ts`): holes
 * are allowed in text/child positions and as a COMPLETE attribute value
 * (`attr=${v}` or `attr="${v}"`). Tag-name holes, attribute-name holes,
 * partial attribute values (`class="a ${b}"`), and holes inside comments
 * throw. Static chunks are author-written markup and pass through verbatim
 * (same trust model as JSX tags/attrs).
 *
 * Perf: the parse runs once per template call site — the tagged-template
 * strings array has stable identity, so a `WeakMap` keyed on it caches the
 * `ParsedTemplate`. Rendering is a chunk walk with string concatenation,
 * the same cost shape as the JSX runtime.
 */

import { bindAttr, bindMarkerAttr, isSignal } from './bindings.js';
import {
  _assertEmittableAttrName,
  _renderAttrVerbatim,
  _toSegment,
  SafeHtml,
} from './jsx-runtime.js';
import type { ReadonlySignal, Signal } from './reactive.js';
import { mergeChildSegments, type Segment } from './segment.js';
import { type ParsedTemplate, parseTemplate } from './utils/templateParse.js';

/**
 * Values accepted in `html\`\`` holes — the same set JSX accepts for
 * children (text holes) and attribute values (attr holes), including a
 * signal/`computed` itself for a fine-grained binding.
 */
export type HtmlValue =
  | SafeHtml
  | string
  | number
  | boolean
  | null
  | undefined
  | ReadonlySignal<unknown>
  | readonly HtmlValue[];

const PARSE_CACHE = new WeakMap<TemplateStringsArray, ParsedTemplate>();
let parseCount = 0;

/** Test hook: number of template parses performed (cache misses) so far. */
export function _parseCount(): number {
  return parseCount;
}

function getParsed(strings: TemplateStringsArray): ParsedTemplate {
  let parsed = PARSE_CACHE.get(strings);
  if (parsed === undefined) {
    parsed = parseTemplate(strings);
    parseCount++;
    PARSE_CACHE.set(strings, parsed);
  }
  return parsed;
}

export function html(strings: TemplateStringsArray, ...values: HtmlValue[]): SafeHtml {
  const { chunks, holes, tagClose } = getParsed(strings);
  const parts: Segment[] = [];
  let buf = '';
  // Signal-attr binding ids for the currently-open element; flushed as one
  // marker attribute (`data-kfb` / `data-kfbrow`) at the tag's closing `>`,
  // mirroring the per-element grouping in `jsx()`.
  let pendingBindIds: string[] | null = null;

  for (let i = 0; i < chunks.length; i++) {
    let chunk = chunks[i];
    if (pendingBindIds !== null && tagClose[i] !== -1) {
      const off = tagClose[i];
      chunk = `${chunk.slice(0, off)} ${bindMarkerAttr()}="${pendingBindIds.join(',')}"${chunk.slice(off)}`;
      pendingBindIds = null;
    }
    buf += chunk;
    if (i === holes.length) break;

    const hole = holes[i];
    const value = values[i];
    if (hole.kind === 'text') {
      const seg = _toSegment(value);
      if (seg.kind === 'static') {
        buf += seg.html;
      } else {
        parts.push({ kind: 'static', html: buf });
        buf = '';
        parts.push(seg);
      }
    } else if (isSignal(value)) {
      // Same contract as the `jsx()` signal-attribute branch: reject `on*` /
      // malformed names unconditionally (a signal's value changes over time),
      // then register the binding — or snapshot outside a mount render.
      _assertEmittableAttrName(hole.name, hole.name, false);
      const id = bindAttr(hole.name, value as Signal<unknown>);
      if (id !== null) {
        (pendingBindIds ??= []).push(id);
      } else {
        buf += _renderAttrVerbatim(hole.name, (value as Signal<unknown>).value);
      }
    } else {
      buf += _renderAttrVerbatim(hole.name, value);
    }
  }
  if (buf !== '' || parts.length === 0) parts.push({ kind: 'static', html: buf });
  return new SafeHtml(mergeChildSegments(parts));
}
