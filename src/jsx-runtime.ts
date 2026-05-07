/**
 * kerf JSX runtime.
 *
 * JSX renders to `SafeHtml` — a wrapped HTML string. `SafeHtml.toString()`
 * is what the consumer eventually feeds into `mount()` (which morphs the
 * live DOM toward the new tree) or into `toElement()` (which parses it
 * to a single DOM node).
 *
 * Configure in your `tsconfig.json`:
 *
 *     "jsx": "react-jsx",
 *     "jsxImportSource": "kerf"
 *
 * Then write JSX as you normally would — kerf provides the `jsx` /
 * `jsxs` / `jsxDEV` / `Fragment` exports the JSX transform looks for.
 */

import { escapeAttr, escapeHtml } from './utils/escapeHtml.js';

export class SafeHtml {
  readonly __html: string;
  constructor(html: string) {
    this.__html = html;
  }
  toString(): string {
    return this.__html;
  }
}

/** Inject a pre-escaped HTML string. Use sparingly — caller is responsible for escaping. */
export function raw(html: string): SafeHtml {
  return new SafeHtml(html);
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

function renderChildren(children: Children): string {
  if (children == null || typeof children === 'boolean') return '';
  if (children instanceof SafeHtml) return children.__html;
  if (typeof children === 'string') return escapeHtml(children);
  if (typeof children === 'number') return String(children);
  if (Array.isArray(children)) return children.map(renderChildren).join('');
  // Catch the common mistake of passing a DOM element (e.g. the result of
  // toElement(...)) as a JSX child. The runtime renders to HTML strings, so
  // DOM nodes can't be composed — they'd silently serialize to "" and their
  // event listeners would be lost. Throw loudly so this can't sneak in.
  const maybeNode = children as unknown;
  if (typeof maybeNode === 'object' && maybeNode !== null
      && ('nodeType' in maybeNode || 'outerHTML' in maybeNode)) {
    throw new Error(
      'JSX: DOM elements cannot be passed as children (the JSX runtime renders to HTML strings). '
      + 'Build the tree in one JSX expression and use querySelector after toElement() to get element refs.',
    );
  }
  return '';
}

const ATTR_ALIASES: Record<string, string> = {
  // HTML attributes
  className: 'class',
  htmlFor: 'for',
  httpEquiv: 'http-equiv',
  acceptCharset: 'accept-charset',
  accessKey: 'accesskey',
  autoCapitalize: 'autocapitalize',
  autoComplete: 'autocomplete',
  autoFocus: 'autofocus',
  autoPlay: 'autoplay',
  colSpan: 'colspan',
  contentEditable: 'contenteditable',
  crossOrigin: 'crossorigin',
  dateTime: 'datetime',
  defaultChecked: 'checked',
  defaultValue: 'value',
  encType: 'enctype',
  formAction: 'formaction',
  formEncType: 'formenctype',
  formMethod: 'formmethod',
  formNoValidate: 'formnovalidate',
  formTarget: 'formtarget',
  hrefLang: 'hreflang',
  inputMode: 'inputmode',
  maxLength: 'maxlength',
  minLength: 'minlength',
  noModule: 'nomodule',
  noValidate: 'novalidate',
  readOnly: 'readonly',
  referrerPolicy: 'referrerpolicy',
  rowSpan: 'rowspan',
  spellCheck: 'spellcheck',
  srcDoc: 'srcdoc',
  srcLang: 'srclang',
  srcSet: 'srcset',
  tabIndex: 'tabindex',
  useMap: 'usemap',

  // SVG presentation attributes (camelCase → kebab-case)
  strokeWidth: 'stroke-width',
  strokeLinecap: 'stroke-linecap',
  strokeLinejoin: 'stroke-linejoin',
  strokeDasharray: 'stroke-dasharray',
  strokeDashoffset: 'stroke-dashoffset',
  strokeMiterlimit: 'stroke-miterlimit',
  strokeOpacity: 'stroke-opacity',
  fillOpacity: 'fill-opacity',
  fillRule: 'fill-rule',
  clipPath: 'clip-path',
  clipRule: 'clip-rule',
  colorInterpolation: 'color-interpolation',
  colorInterpolationFilters: 'color-interpolation-filters',
  floodColor: 'flood-color',
  floodOpacity: 'flood-opacity',
  lightingColor: 'lighting-color',
  stopColor: 'stop-color',
  stopOpacity: 'stop-opacity',
  shapeRendering: 'shape-rendering',
  imageRendering: 'image-rendering',
  textRendering: 'text-rendering',
  pointerEvents: 'pointer-events',
  vectorEffect: 'vector-effect',
  paintOrder: 'paint-order',

  // SVG text/font attributes
  fontFamily: 'font-family',
  fontSize: 'font-size',
  fontStyle: 'font-style',
  fontVariant: 'font-variant',
  fontWeight: 'font-weight',
  fontStretch: 'font-stretch',
  textAnchor: 'text-anchor',
  textDecoration: 'text-decoration',
  dominantBaseline: 'dominant-baseline',
  alignmentBaseline: 'alignment-baseline',
  baselineShift: 'baseline-shift',
  letterSpacing: 'letter-spacing',
  wordSpacing: 'word-spacing',
  writingMode: 'writing-mode',

  // SVG marker attributes
  markerStart: 'marker-start',
  markerMid: 'marker-mid',
  markerEnd: 'marker-end',

  // SVG xlink (legacy but still used)
  xlinkHref: 'xlink:href',
  xlinkShow: 'xlink:show',
  xlinkActuate: 'xlink:actuate',
  xlinkType: 'xlink:type',
  xlinkRole: 'xlink:role',
  xlinkTitle: 'xlink:title',
  xlinkArcrole: 'xlink:arcrole',
  xmlBase: 'xml:base',
  xmlLang: 'xml:lang',
  xmlSpace: 'xml:space',
  xmlnsXlink: 'xmlns:xlink',
};

function renderAttr(key: string, value: unknown): string {
  const name = ATTR_ALIASES[key] ?? key;
  if (value == null || value === false) return '';
  if (value === true) return ` ${name}`;
  let strValue: string;
  if (value instanceof SafeHtml) {
    strValue = value.__html;
  } else if (typeof value === 'number') {
    strValue = String(value);
  } else if (typeof value === 'string') {
    strValue = escapeAttr(value);
  } else {
    strValue = '';
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

  const childStr = children != null ? renderChildren(children) : '';
  return new SafeHtml(`<${tag}${attrStr}>${childStr}</${tag}>`);
}

export { jsx as jsxs };
// vitest's dev-mode JSX transform emits `jsxDEV(tag, props, ...)`; the
// alias lets tests import this module without the production build pipeline
// caring.
export { jsx as jsxDEV };

export function Fragment({ children }: { children?: Children }): SafeHtml {
  return new SafeHtml(children != null ? renderChildren(children) : '');
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
