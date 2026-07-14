/**
 * kerf JSX runtime.
 *
 * JSX renders to `SafeHtml`, which wraps both:
 *   - `__html`: the flattened HTML string (what `toString()` returns; what
 *     legacy/SSR consumers care about)
 *   - `__segment`: a structured representation that distinguishes "static
 *     html", "keyed list", and "mixed" content.
 *
 * Most renders are pure-static and the segment is just `{kind:'static',html}`.
 * When the tree contains a list (via `each()`) or a parent whose children
 * include a non-static segment, the runtime threads that structure up so
 * `mount()` can dispatch on it — running its native keyed reconciler for
 * the list parts and leaving the static surrounds to the general-purpose
 * diff.
 *
 * Configure in your `tsconfig.json`:
 *
 *     "jsx": "react-jsx",
 *     "jsxImportSource": "kerfjs"
 *
 * Then write JSX as you normally would — kerf provides the `jsx` /
 * `jsxs` / `jsxDEV` / `Fragment` exports the JSX transform looks for.
 */

import { bindAttr, bindMarkerAttr, bindText, isSignal } from './bindings.js';
import type { KerfBuiltinIntrinsicElements } from './jsx-types.js';
import type { ReadonlySignal, Signal } from './reactive.js';
import {
  flatten,
  type ListSegment,
  mergeChildSegments,
  type Segment,
  wrapWithTags,
} from './segment.js';
import { escapeAttr, escapeHtml } from './utils/escapeHtml.js';
import { ATTR_ALIASES } from './utils/jsx-attr-aliases.js';
import { dangerousUrlWarning, isDangerousUrlValue } from './utils/urlScreen.js';

// Cross-realm/cross-bundle brand. Using `Symbol.for` (the global registry)
// means two `SafeHtml` classes from different module copies still recognize
// each other. Same approach React uses for `$$typeof: Symbol.for('react.element')`.
// Without this, `instanceof SafeHtml` fails when the consumer's bundler ends
// up loading two copies of kerf (separate barrel + jsx-runtime entries,
// monorepo dedup misses, ESM/CJS interop, etc.).
const SAFE_HTML_BRAND = Symbol.for('kerfjs.SafeHtml');

export class SafeHtml {
  readonly __html: string;
  readonly __segment: Segment;
  // Branded so `isSafeHtml()` recognizes instances from any copy of this module.
  readonly [SAFE_HTML_BRAND] = true as const;
  constructor(input: string | Segment) {
    if (typeof input === 'string') {
      this.__segment = { kind: 'static', html: input };
      this.__html = input;
    } else {
      this.__segment = input;
      this.__html = flatten(input, false);
    }
  }
  toString(): string {
    return this.__html;
  }
}

/**
 * Type guard for `SafeHtml`. Prefer this over `instanceof SafeHtml` — it works
 * across module copies (e.g. when the consumer's bundler loads kerf's barrel
 * and JSX-runtime entries as independent modules).
 *
 * Security note (KF-321): this is a duck-check on the global `Symbol.for` brand,
 * so same-realm code *can* forge a "trusted" value — `{ [SAFE_HTML_BRAND]: true,
 * __html: '<img onerror=…>' }` passes and bypasses escaping + the URL screen.
 * This is intentional and not a vulnerability: minting the brand requires a
 * Symbol key, which no data channel (JSON.parse, form/query/localStorage,
 * structuredClone, JSON-based prototype-pollution) can produce — those all yield
 * string keys. The only way to forge it is to run JS that writes the symbol, and
 * such code can equally `import { raw }`. Forgery therefore grants no capability
 * an attacker with code execution lacks — the same posture as React's
 * `$$typeof: Symbol.for('react.element')`. The global `Symbol.for` (vs a
 * module-private symbol) is a deliberate cross-bundle-recognition tradeoff (see
 * the `SAFE_HTML_BRAND` note above); a private symbol would additionally block
 * same-realm forgery, but only closes a non-threat at the cost of that
 * recognition, so it's kept global by design.
 */
export function isSafeHtml(value: unknown): value is SafeHtml {
  return typeof value === 'object'
    && value !== null
    && (value as Record<symbol, unknown>)[SAFE_HTML_BRAND] === true;
}

/** Inject a pre-escaped HTML string. Use sparingly — caller is responsible for escaping. */
export function raw(html: string): SafeHtml {
  return new SafeHtml(html);
}

/**
 * Internal: build a `SafeHtml` representing a list segment. Used by
 * `each()` so the JSX runtime is the sole owner of `SafeHtml` construction.
 */
export function listSafeHtml(id: string, items: ListSegment['items']): SafeHtml {
  return new SafeHtml({ kind: 'list', id, items });
}

/**
 * Internal: build a `SafeHtml` representing a granular list segment with
 * patches (KF-92). The reconciler applies the patches to the existing
 * binding directly, skipping the per-item iteration that the snapshot
 * `listSafeHtml` requires. `items` is included for fall-through paths
 * (toString during SSR, fall-back when the binding doesn't exist yet).
 *
 * Patch HTML is rendered upstream (in `each()`) inside a try/catch — see
 * KF-99 — so by the time we get here every `update` / `insert` patch
 * already carries a `html` string, and the reconciler does no further
 * row rendering.
 */
export function granularListSafeHtml(
  id: string,
  items: ListSegment['items'],
  patches: NonNullable<ListSegment['patches']>,
): SafeHtml {
  return new SafeHtml({ kind: 'list', id, items, patches });
}

// KF-294: `ReadonlySignal<unknown>` (covariant) accepts both `signal()` and
// `computed()` values of any T handed straight into a text hole — the runtime
// binds them fine-grained instead of stringifying.
type Child = SafeHtml | string | number | boolean | null | undefined | ReadonlySignal<unknown>;
type Children = Child | Children[];

interface Props {
  children?: Children;
  [key: string]: unknown;
}

const VOID_TAGS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'source', 'track', 'wbr',
]);

/**
 * Convert a single JSX child into a Segment. Handles SafeHtml passthrough,
 * primitive coercion + escaping, arrays (recursive), and the nullish/false
 * skip cases.
 */
function toSegment(child: Children): Segment {
  if (child == null || typeof child === 'boolean') return { kind: 'static', html: '' };
  // KF-294: a signal handed straight into a text position. Inside a mount
  // render, emit a comment marker and record a binding so the text node
  // updates fine-grained (no render re-run). Outside a mount (SSR/toString),
  // snapshot the current value as escaped text.
  if (isSignal(child)) {
    const marker = bindText(child);
    if (marker !== null) return { kind: 'static', html: marker };
    const v = (child as Signal<unknown>).value;
    return { kind: 'static', html: v == null || typeof v === 'boolean' ? '' : escapeHtml(String(v)) };
  }
  if (isSafeHtml(child)) {
    // Cross-bundle SafeHtml shims (KF-14 case) may have only `__html`.
    return child.__segment ?? { kind: 'static', html: child.__html };
  }
  if (typeof child === 'string') return { kind: 'static', html: escapeHtml(child) };
  if (typeof child === 'number') return { kind: 'static', html: String(child) };
  if (Array.isArray(child)) return mergeChildSegments(child.map(toSegment));
  // Catch the common mistake of passing a DOM element (e.g. the result of
  // toElement(...)) as a JSX child. The runtime renders to HTML strings, so
  // DOM nodes can't be composed — they'd silently serialize to "" and their
  // event listeners would be lost. Throw loudly so this can't sneak in.
  const maybeNode = child as unknown;
  if (typeof maybeNode === 'object' && maybeNode !== null
      && ('nodeType' in maybeNode || 'outerHTML' in maybeNode)) {
    throw new Error(
      'JSX: DOM elements cannot be passed as children (the JSX runtime renders to HTML strings). '
      + 'Build the tree in one JSX expression and use querySelector after toElement() to get element refs.',
    );
  }
  throw new Error(
    `JSX: unsupported child of type ${describeValue(child)}. `
    + 'Children must be SafeHtml, string, number, boolean, null, undefined, or an array of those. '
    + 'Common mistakes: passing a Signal/Store object directly (use signal.value or store.state.value), '
    + 'passing a function (call it first), or passing a Promise (await it before render).',
  );
}

function describeValue(v: unknown): string {
  if (Array.isArray(v)) return 'array';
  if (typeof v === 'object' && v !== null) {
    const ctor = (v as { constructor?: { name?: string } }).constructor?.name;
    return ctor && ctor !== 'Object' ? `object (${ctor})` : 'object';
  }
  return typeof v;
}

/**
 * A well-formed HTML/SVG attribute name: a letter/underscore/colon, then
 * letters, digits, or `_.:-` — covers `class`, `data-id`, `aria-label`,
 * `xlink:href`, `xmlns:xlink`, `stroke-width`, `viewBox`, etc. A name outside
 * this shape can only come from spreading untrusted KEYS into JSX
 * (`<div {...obj}>`), and is exactly the shape that could carry the whitespace,
 * `>`, `=`, quotes, or control chars needed to break out of the open tag and
 * inject markup — so `renderAttr` rejects it (KF-306).
 */
const SAFE_ATTR_NAME = /^[A-Za-z_:][\w.:-]*$/;

function renderAttr(key: string, value: unknown): string {
  const name = ATTR_ALIASES[key] ?? key;
  if (value == null || value === false) return '';
  // Inline event-handler attributes are rejected regardless of value type or
  // case (KF-306). kerf's model is event delegation; a string like
  // `onclick="alert(1)"` emitted into the HTML becomes a LIVE handler in the
  // browser — an XSS vector when the key/value is attacker-controlled. (The old
  // guard only caught function values whose key matched `/^on[A-Z]/`, so a
  // string `onclick`, or any lowercase-keyed handler, slipped through.)
  if (/^on[a-z]/i.test(name)) {
    if (typeof value === 'function') {
      throw new Error(
        `JSX: inline event handlers like ${key}={fn} are not supported by kerf's JSX → HTML-string runtime. `
        + 'Use event delegation from the mount root instead:\n\n'
        + '  delegate(rootEl, \'click\', \'[data-action="..."]\', (evt, target) => { ... });\n'
        + '  <button data-action="...">click</button>\n\n'
        + 'See docs/5-event-delegation.md for the tier-1/tier-2/tier-3 model.',
      );
    }
    throw new Error(
      `JSX: event-handler attribute ${JSON.stringify(key)} is not allowed — a string like `
      + '`onclick="..."` becomes a live inline handler (an XSS vector) once emitted into HTML. '
      + 'kerf uses event delegation: delegate(rootEl, \'click\', \'[data-action="..."]\', handler). '
      + 'See docs/5-event-delegation.md.',
    );
  }
  // Reject malformed attribute names so a spread of untrusted keys can't break
  // out of the open tag and inject markup (KF-306). Validated post-alias; every
  // ATTR_ALIASES value is itself a valid name, so aliasing is safe.
  if (!SAFE_ATTR_NAME.test(name)) {
    throw new Error(
      `JSX: invalid attribute name ${JSON.stringify(key)}. Attribute names must be a `
      + 'letter/underscore/colon followed by letters, digits, or "_.:-" (e.g. class, '
      + 'data-id, aria-label, xlink:href). This usually means an untrusted object was '
      + 'spread into JSX ({...obj}) with attacker-controlled keys — validate keys first.',
    );
  }
  if (value === true) return ` ${name}`;
  let strValue: string;
  if (isSafeHtml(value)) {
    strValue = value.__html;
  } else if (typeof value === 'number') {
    strValue = String(value);
  } else if (typeof value === 'string') {
    // URL-screening shared with the fine-grained binding writer (KF-297).
    // `SafeHtml` values (raw()) skip this — they hit the branch above.
    if (isDangerousUrlValue(name, value)) {
      console.warn(`JSX: ${dangerousUrlWarning(name, value)}`);
      return '';
    }
    strValue = escapeAttr(value);
  } else {
    throw new Error(
      `JSX: unsupported value for attribute "${key}" — got ${describeValue(value)}. `
      + 'Attribute values must be string, number, boolean, null, undefined, or SafeHtml. '
      + 'Did you mean to read .value off a Signal, or stringify the object first?',
    );
  }
  return ` ${name}="${strValue}"`;
}

export function jsx(tag: string | ((props: Props) => SafeHtml), props: Props): SafeHtml {
  if (typeof tag === 'function') return tag(props);

  const { children, ...attrs } = props;
  let attrStr = '';
  let bindIds: string[] | null = null;
  for (const [k, v] of Object.entries(attrs)) {
    // KF-294: a signal handed straight into an attribute. Inside a mount
    // render, register a binding and mark the element (via `data-kfb` for
    // static-surround holes / `data-kfbrow` for each()-row holes) instead of
    // emitting the attribute — the wiring pass sets it after parse and keeps
    // it fine-grained. Outside a mount, snapshot the current value.
    if (isSignal(v)) {
      const id = bindAttr(ATTR_ALIASES[k] ?? k, v);
      if (id !== null) {
        (bindIds ??= []).push(id);
        continue;
      }
      attrStr += renderAttr(k, (v as Signal<unknown>).value);
      continue;
    }
    attrStr += renderAttr(k, v);
  }
  // All signal attrs on one element share a scope, so the marker attr name is
  // fetched once (avoids a per-attr object alloc from bindAttr).
  if (bindIds !== null) attrStr += ` ${bindMarkerAttr()}="${bindIds.join(',')}"`;

  if (VOID_TAGS.has(tag)) return new SafeHtml(`<${tag}${attrStr}>`);

  const childSegment: Segment = children != null
    ? toSegment(children)
    : { kind: 'static', html: '' };
  return new SafeHtml(wrapWithTags(childSegment, `<${tag}${attrStr}>`, `</${tag}>`));
}

export { jsx as jsxs };
// vitest's dev-mode JSX transform emits `jsxDEV(tag, props, ...)`; the
// alias lets tests import this module without the production build pipeline
// caring.
export { jsx as jsxDEV };

export function Fragment({ children }: { children?: Children }): SafeHtml {
  return new SafeHtml(children != null ? toSegment(children) : { kind: 'static', html: '' });
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace JSX {
  export type Element = SafeHtml;
  export interface ElementChildrenAttribute {
    children: unknown;
  }
  // Per-tag attribute contracts live in `./jsx-types.ts` as
  // `KerfBuiltinIntrinsicElements`. Re-exposed as an **interface** (not a
  // type alias) so consumers can declaration-merge custom-element tags
  // (KF-100):
  //
  //     declare module 'kerfjs/jsx-runtime' {
  //       namespace JSX {
  //         interface IntrinsicElements {
  //           'my-element': KerfCustomElement & { foo?: string };
  //         }
  //       }
  //     }
  //
  // KF-123: the imported interface is named `KerfBuiltinIntrinsicElements`
  // upstream so tsup/tsc cannot strip an import alias and end up emitting
  // `interface IntrinsicElements extends IntrinsicElements {}` in the .d.ts
  // — that shadowed form self-resolves to empty and breaks every `<tag>` in
  // consumer .tsx with TS2339. Verified against `dist/jsx-runtime.d.ts` by
  // `tests/dist/jsx-typing/` on every `npm run build`.
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  export interface IntrinsicElements extends KerfBuiltinIntrinsicElements {}
}

/**
 * Public re-exports of the JSX type primitives so consumers can compose
 * attribute interfaces for custom elements without reaching into
 * `kerfjs/jsx-types` (which is intentionally not in `package.json#exports`).
 */
export type {
  AttrLike,
  AttrValue,
  DataAriaAttrs,
  KerfBaseAttrs,
  KerfCustomElement,
} from './jsx-types.js';
