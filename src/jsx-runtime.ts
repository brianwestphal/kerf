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

import {
  flatten,
  type ListSegment,
  mergeChildSegments,
  type Segment,
  wrapWithTags,
} from './segment.js';
import { escapeAttr, escapeHtml } from './utils/escapeHtml.js';
import { ATTR_ALIASES } from './utils/jsx-attr-aliases.js';

// Cross-realm/cross-bundle brand. Using `Symbol.for` (the global registry)
// means two `SafeHtml` classes from different module copies still recognise
// each other. Same approach React uses for `$$typeof: Symbol.for('react.element')`.
// Without this, `instanceof SafeHtml` fails when the consumer's bundler ends
// up loading two copies of kerf (separate barrel + jsx-runtime entries,
// monorepo dedup misses, ESM/CJS interop, etc.).
const SAFE_HTML_BRAND = Symbol.for('kerfjs.SafeHtml');

export class SafeHtml {
  readonly __html: string;
  readonly __segment: Segment;
  // Branded so `isSafeHtml()` recognises instances from any copy of this module.
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

type Child = SafeHtml | string | number | boolean | null | undefined;
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

function renderAttr(key: string, value: unknown): string {
  const name = ATTR_ALIASES[key] ?? key;
  if (value == null || value === false) return '';
  if (value === true) return ` ${name}`;
  let strValue: string;
  if (isSafeHtml(value)) {
    strValue = value.__html;
  } else if (typeof value === 'number') {
    strValue = String(value);
  } else if (typeof value === 'string') {
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
  const attrStr = Object.entries(attrs)
    .map(([k, v]) => renderAttr(k, v))
    .join('');

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
  export interface IntrinsicElements {
    [elemName: string]: Record<string, unknown>;
  }
}
