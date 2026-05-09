/**
 * JSX intrinsic-element types — kerf's per-tag attribute contracts.
 *
 * Replaces the previous `[elemName: string]: Record<string, unknown>`
 * catch-all that allowed any tag and any prop. Now: known tags get focused
 * attribute interfaces (typos fail to compile); unknown tags are still
 * permitted via the `KerfCustomElement` index entry so custom elements and
 * web components keep working without declaration merging.
 *
 * Coverage is intentionally focused, not exhaustive. The most common ~30
 * HTML elements + the SVG primitives that make up `toElement`'s fragment
 * set are typed in detail. Rare attributes can be added in follow-ups, or
 * extended on a per-project basis via declaration merging:
 *
 *     declare global {
 *       namespace JSX {
 *         interface IntrinsicElements {
 *           'my-element': KerfBaseAttrs & { foo?: string };
 *         }
 *       }
 *     }
 *
 * Every attribute value is `AttrValue` — string / number / boolean / null /
 * undefined / `SafeHtml`. Event-handler props (`onClick` etc.) are
 * deliberately omitted: kerf renders to strings, so inline handlers do
 * nothing. Use `delegate()` / `delegateCapture()` instead.
 */

import type { SafeHtml } from './jsx-runtime.js';

/** Every kerf attribute value resolves to one of these. */
export type AttrValue = string | number | boolean | null | undefined | SafeHtml;

/** A typed-narrowing helper: `AttrLike<'a'|'b'>` accepts the literals plus the runtime fall-throughs. */
export type AttrLike<T = string> = T | SafeHtml | null | undefined;

/**
 * `data-*` and `aria-*` index signatures. Applied via `KerfBaseAttrs` so
 * every typed element accepts them without per-element enumeration.
 */
export interface DataAriaAttrs {
  [k: `data-${string}`]: AttrValue;
  [k: `aria-${string}`]: AttrValue;
}

/** Attributes valid on essentially every HTML element. */
export interface KerfBaseAttrs extends DataAriaAttrs {
  id?: AttrLike;
  className?: AttrLike;
  style?: AttrLike;
  title?: AttrLike;
  lang?: AttrLike;
  dir?: AttrLike<'ltr' | 'rtl' | 'auto'>;
  hidden?: AttrLike<boolean>;
  draggable?: AttrLike<boolean>;
  contentEditable?: AttrLike<boolean | 'true' | 'false' | 'inherit'>;
  inputMode?: AttrLike<'none' | 'text' | 'tel' | 'url' | 'email' | 'numeric' | 'decimal' | 'search'>;
  spellCheck?: AttrLike<boolean>;
  tabIndex?: AttrLike<number>;
  role?: AttrLike;
  slot?: AttrLike;
  is?: AttrLike;
  autoCapitalize?: AttrLike<'off' | 'none' | 'on' | 'sentences' | 'words' | 'characters'>;
  autoFocus?: AttrLike<boolean>;
  accessKey?: AttrLike;
  /** `data-morph-skip` opts a subtree out of kerf's diff. Any value (incl. `true`) is treated as set. */
  'data-morph-skip'?: AttrValue;
  children?: unknown;
}

/** Element-specific attribute interfaces. Each extends `KerfBaseAttrs`. */

export interface HTMLAnchorAttrs extends KerfBaseAttrs {
  href?: AttrLike;
  target?: AttrLike<'_self' | '_blank' | '_parent' | '_top'>;
  rel?: AttrLike;
  download?: AttrLike;
  hrefLang?: AttrLike;
  ping?: AttrLike;
  referrerPolicy?: AttrLike;
  type?: AttrLike;
}

export interface HTMLAreaAttrs extends KerfBaseAttrs {
  alt?: AttrLike;
  coords?: AttrLike;
  shape?: AttrLike<'rect' | 'circle' | 'poly' | 'default'>;
  href?: AttrLike;
  target?: AttrLike;
  rel?: AttrLike;
}

export interface HTMLImgAttrs extends KerfBaseAttrs {
  src?: AttrLike;
  alt?: AttrLike;
  width?: AttrLike<number | string>;
  height?: AttrLike<number | string>;
  srcSet?: AttrLike;
  sizes?: AttrLike;
  loading?: AttrLike<'eager' | 'lazy'>;
  decoding?: AttrLike<'sync' | 'async' | 'auto'>;
  crossOrigin?: AttrLike<'anonymous' | 'use-credentials' | ''>;
  referrerPolicy?: AttrLike;
  useMap?: AttrLike;
  fetchPriority?: AttrLike<'high' | 'low' | 'auto'>;
}

export interface HTMLInputAttrs extends KerfBaseAttrs {
  type?: AttrLike<'text' | 'password' | 'email' | 'number' | 'tel' | 'url' | 'search' | 'date' | 'datetime-local' | 'time' | 'month' | 'week' | 'color' | 'checkbox' | 'radio' | 'file' | 'hidden' | 'submit' | 'reset' | 'button' | 'image' | 'range'>;
  name?: AttrLike;
  value?: AttrLike;
  defaultValue?: AttrLike;
  placeholder?: AttrLike;
  required?: AttrLike<boolean>;
  disabled?: AttrLike<boolean>;
  readOnly?: AttrLike<boolean>;
  checked?: AttrLike<boolean>;
  defaultChecked?: AttrLike<boolean>;
  multiple?: AttrLike<boolean>;
  pattern?: AttrLike;
  min?: AttrLike<number | string>;
  max?: AttrLike<number | string>;
  step?: AttrLike<number | string>;
  minLength?: AttrLike<number>;
  maxLength?: AttrLike<number>;
  size?: AttrLike<number>;
  autoComplete?: AttrLike;
  form?: AttrLike;
  formAction?: AttrLike;
  formMethod?: AttrLike<'get' | 'post' | 'dialog'>;
  formTarget?: AttrLike;
  formEncType?: AttrLike;
  formNoValidate?: AttrLike<boolean>;
  list?: AttrLike;
  src?: AttrLike;
  alt?: AttrLike;
  width?: AttrLike<number | string>;
  height?: AttrLike<number | string>;
  accept?: AttrLike;
  capture?: AttrLike<boolean | 'user' | 'environment'>;
}

export interface HTMLButtonAttrs extends KerfBaseAttrs {
  type?: AttrLike<'button' | 'submit' | 'reset'>;
  name?: AttrLike;
  value?: AttrLike;
  disabled?: AttrLike<boolean>;
  form?: AttrLike;
  formAction?: AttrLike;
  formMethod?: AttrLike;
  formTarget?: AttrLike;
  formEncType?: AttrLike;
  formNoValidate?: AttrLike<boolean>;
}

export interface HTMLFormAttrs extends KerfBaseAttrs {
  action?: AttrLike;
  method?: AttrLike<'get' | 'post' | 'dialog'>;
  encType?: AttrLike;
  target?: AttrLike;
  name?: AttrLike;
  noValidate?: AttrLike<boolean>;
  acceptCharset?: AttrLike;
  autoComplete?: AttrLike;
}

export interface HTMLLabelAttrs extends KerfBaseAttrs {
  htmlFor?: AttrLike;
  form?: AttrLike;
}

export interface HTMLOptionAttrs extends KerfBaseAttrs {
  value?: AttrLike;
  selected?: AttrLike<boolean>;
  defaultSelected?: AttrLike<boolean>;
  disabled?: AttrLike<boolean>;
  label?: AttrLike;
}

export interface HTMLOptgroupAttrs extends KerfBaseAttrs {
  label?: AttrLike;
  disabled?: AttrLike<boolean>;
}

export interface HTMLSelectAttrs extends KerfBaseAttrs {
  name?: AttrLike;
  value?: AttrLike;
  defaultValue?: AttrLike;
  multiple?: AttrLike<boolean>;
  required?: AttrLike<boolean>;
  disabled?: AttrLike<boolean>;
  size?: AttrLike<number>;
  form?: AttrLike;
  autoComplete?: AttrLike;
}

export interface HTMLTextareaAttrs extends KerfBaseAttrs {
  name?: AttrLike;
  value?: AttrLike;
  defaultValue?: AttrLike;
  placeholder?: AttrLike;
  rows?: AttrLike<number>;
  cols?: AttrLike<number>;
  required?: AttrLike<boolean>;
  disabled?: AttrLike<boolean>;
  readOnly?: AttrLike<boolean>;
  maxLength?: AttrLike<number>;
  minLength?: AttrLike<number>;
  wrap?: AttrLike<'hard' | 'soft' | 'off'>;
  autoComplete?: AttrLike;
  form?: AttrLike;
}

export interface HTMLTableAttrs extends KerfBaseAttrs {
  cellPadding?: AttrLike<number | string>;
  cellSpacing?: AttrLike<number | string>;
}

export interface HTMLTableCellAttrs extends KerfBaseAttrs {
  colSpan?: AttrLike<number>;
  rowSpan?: AttrLike<number>;
  headers?: AttrLike;
  scope?: AttrLike<'row' | 'col' | 'rowgroup' | 'colgroup'>;
  abbr?: AttrLike;
}

export interface HTMLColAttrs extends KerfBaseAttrs {
  span?: AttrLike<number>;
}

export interface HTMLMetaAttrs extends KerfBaseAttrs {
  name?: AttrLike;
  content?: AttrLike;
  charSet?: AttrLike;
  httpEquiv?: AttrLike;
}

export interface HTMLLinkAttrs extends KerfBaseAttrs {
  href?: AttrLike;
  rel?: AttrLike;
  type?: AttrLike;
  media?: AttrLike;
  sizes?: AttrLike;
  hrefLang?: AttrLike;
  as?: AttrLike;
  crossOrigin?: AttrLike;
  integrity?: AttrLike;
  referrerPolicy?: AttrLike;
  fetchPriority?: AttrLike<'high' | 'low' | 'auto'>;
}

export interface HTMLScriptAttrs extends KerfBaseAttrs {
  src?: AttrLike;
  type?: AttrLike;
  async?: AttrLike<boolean>;
  defer?: AttrLike<boolean>;
  noModule?: AttrLike<boolean>;
  integrity?: AttrLike;
  crossOrigin?: AttrLike;
  referrerPolicy?: AttrLike;
  nonce?: AttrLike;
}

export interface HTMLStyleAttrs extends KerfBaseAttrs {
  type?: AttrLike;
  media?: AttrLike;
  scoped?: AttrLike<boolean>;
}

export interface HTMLIframeAttrs extends KerfBaseAttrs {
  src?: AttrLike;
  srcDoc?: AttrLike;
  name?: AttrLike;
  sandbox?: AttrLike;
  allow?: AttrLike;
  allowFullScreen?: AttrLike<boolean>;
  width?: AttrLike<number | string>;
  height?: AttrLike<number | string>;
  loading?: AttrLike<'eager' | 'lazy'>;
  referrerPolicy?: AttrLike;
}

export interface HTMLMediaAttrs extends KerfBaseAttrs {
  src?: AttrLike;
  controls?: AttrLike<boolean>;
  autoPlay?: AttrLike<boolean>;
  loop?: AttrLike<boolean>;
  muted?: AttrLike<boolean>;
  preload?: AttrLike<'auto' | 'metadata' | 'none' | ''>;
  crossOrigin?: AttrLike;
}

export interface HTMLVideoAttrs extends HTMLMediaAttrs {
  poster?: AttrLike;
  width?: AttrLike<number | string>;
  height?: AttrLike<number | string>;
  playsInline?: AttrLike<boolean>;
}

export interface HTMLSourceAttrs extends KerfBaseAttrs {
  src?: AttrLike;
  type?: AttrLike;
  srcSet?: AttrLike;
  sizes?: AttrLike;
  media?: AttrLike;
}

export interface HTMLTrackAttrs extends KerfBaseAttrs {
  src?: AttrLike;
  kind?: AttrLike<'subtitles' | 'captions' | 'descriptions' | 'chapters' | 'metadata'>;
  srcLang?: AttrLike;
  label?: AttrLike;
  default?: AttrLike<boolean>;
}

export interface HTMLDetailsAttrs extends KerfBaseAttrs {
  open?: AttrLike<boolean>;
}

export interface HTMLDialogAttrs extends KerfBaseAttrs {
  open?: AttrLike<boolean>;
}

export interface HTMLOlAttrs extends KerfBaseAttrs {
  reversed?: AttrLike<boolean>;
  start?: AttrLike<number>;
  type?: AttrLike<'1' | 'a' | 'A' | 'i' | 'I'>;
}

export interface HTMLLiAttrs extends KerfBaseAttrs {
  value?: AttrLike<number>;
}

export interface HTMLProgressAttrs extends KerfBaseAttrs {
  value?: AttrLike<number>;
  max?: AttrLike<number>;
}

export interface HTMLMeterAttrs extends KerfBaseAttrs {
  value?: AttrLike<number>;
  min?: AttrLike<number>;
  max?: AttrLike<number>;
  low?: AttrLike<number>;
  high?: AttrLike<number>;
  optimum?: AttrLike<number>;
}

export interface HTMLCanvasAttrs extends KerfBaseAttrs {
  width?: AttrLike<number | string>;
  height?: AttrLike<number | string>;
}

export interface HTMLBaseAttrs extends KerfBaseAttrs {
  href?: AttrLike;
  target?: AttrLike;
}

export interface HTMLBlockquoteAttrs extends KerfBaseAttrs { cite?: AttrLike }
export interface HTMLQAttrs extends KerfBaseAttrs { cite?: AttrLike }

/**
 * SVG attribute set — focused on the elements `toElement`'s SVG path supports
 * (the `SVG_FRAGMENT_TAGS` set in `src/toElement.ts`). Presentation attrs are
 * shared via `SVGPresentationAttrs`.
 */
export interface SVGPresentationAttrs {
  fill?: AttrLike;
  fillOpacity?: AttrLike<number | string>;
  fillRule?: AttrLike<'nonzero' | 'evenodd' | 'inherit'>;
  stroke?: AttrLike;
  strokeWidth?: AttrLike<number | string>;
  strokeOpacity?: AttrLike<number | string>;
  strokeLinecap?: AttrLike<'butt' | 'round' | 'square' | 'inherit'>;
  strokeLinejoin?: AttrLike<'miter' | 'round' | 'bevel' | 'inherit'>;
  strokeDasharray?: AttrLike;
  strokeDashoffset?: AttrLike<number | string>;
  strokeMiterlimit?: AttrLike<number | string>;
  opacity?: AttrLike<number | string>;
  vectorEffect?: AttrLike;
  clipPath?: AttrLike;
  clipRule?: AttrLike;
  mask?: AttrLike;
  filter?: AttrLike;
  pointerEvents?: AttrLike;
  shapeRendering?: AttrLike;
  paintOrder?: AttrLike;
  color?: AttrLike;
  display?: AttrLike;
  visibility?: AttrLike;
}

export interface SVGCommonAttrs extends DataAriaAttrs, SVGPresentationAttrs {
  id?: AttrLike;
  className?: AttrLike;
  style?: AttrLike;
  transform?: AttrLike;
  tabIndex?: AttrLike<number>;
  role?: AttrLike;
  xmlns?: AttrLike;
  xmlnsXlink?: AttrLike;
  children?: unknown;
}

export interface SVGSvgAttrs extends SVGCommonAttrs {
  width?: AttrLike<number | string>;
  height?: AttrLike<number | string>;
  viewBox?: AttrLike;
  preserveAspectRatio?: AttrLike;
  x?: AttrLike<number | string>;
  y?: AttrLike<number | string>;
}

export interface SVGPathAttrs extends SVGCommonAttrs {
  d?: AttrLike;
  pathLength?: AttrLike<number>;
}

export interface SVGCircleAttrs extends SVGCommonAttrs {
  cx?: AttrLike<number | string>;
  cy?: AttrLike<number | string>;
  r?: AttrLike<number | string>;
}

export interface SVGRectAttrs extends SVGCommonAttrs {
  x?: AttrLike<number | string>;
  y?: AttrLike<number | string>;
  width?: AttrLike<number | string>;
  height?: AttrLike<number | string>;
  rx?: AttrLike<number | string>;
  ry?: AttrLike<number | string>;
}

export interface SVGLineAttrs extends SVGCommonAttrs {
  x1?: AttrLike<number | string>;
  y1?: AttrLike<number | string>;
  x2?: AttrLike<number | string>;
  y2?: AttrLike<number | string>;
}

export interface SVGEllipseAttrs extends SVGCommonAttrs {
  cx?: AttrLike<number | string>;
  cy?: AttrLike<number | string>;
  rx?: AttrLike<number | string>;
  ry?: AttrLike<number | string>;
}

export interface SVGPolyAttrs extends SVGCommonAttrs {
  points?: AttrLike;
}

export interface SVGTextAttrs extends SVGCommonAttrs {
  x?: AttrLike<number | string>;
  y?: AttrLike<number | string>;
  dx?: AttrLike<number | string>;
  dy?: AttrLike<number | string>;
  textAnchor?: AttrLike<'start' | 'middle' | 'end' | 'inherit'>;
  dominantBaseline?: AttrLike;
  fontFamily?: AttrLike;
  fontSize?: AttrLike<number | string>;
  fontStyle?: AttrLike;
  fontWeight?: AttrLike<number | string>;
  letterSpacing?: AttrLike<number | string>;
}

export interface SVGUseAttrs extends SVGCommonAttrs {
  xlinkHref?: AttrLike;
  href?: AttrLike;
  x?: AttrLike<number | string>;
  y?: AttrLike<number | string>;
  width?: AttrLike<number | string>;
  height?: AttrLike<number | string>;
}

export interface SVGImageAttrs extends SVGCommonAttrs {
  href?: AttrLike;
  xlinkHref?: AttrLike;
  x?: AttrLike<number | string>;
  y?: AttrLike<number | string>;
  width?: AttrLike<number | string>;
  height?: AttrLike<number | string>;
  preserveAspectRatio?: AttrLike;
}

export interface SVGForeignObjectAttrs extends SVGCommonAttrs {
  x?: AttrLike<number | string>;
  y?: AttrLike<number | string>;
  width?: AttrLike<number | string>;
  height?: AttrLike<number | string>;
}

/**
 * Loose attribute set for custom elements / web components. Use via
 * declaration merging if your project uses tags not enumerated below:
 *
 *     declare global {
 *       namespace JSX {
 *         interface IntrinsicElements {
 *           'my-component': KerfCustomElement & { foo?: string };
 *         }
 *       }
 *     }
 */
export interface KerfCustomElement extends KerfBaseAttrs {
  [k: string]: AttrValue | unknown;
}

export interface IntrinsicElements {
  // ----- HTML elements (focused subset of common ones) -----
  // Sectioning / structure
  html: KerfBaseAttrs;
  head: KerfBaseAttrs;
  body: KerfBaseAttrs;
  div: KerfBaseAttrs;
  span: KerfBaseAttrs;
  section: KerfBaseAttrs;
  article: KerfBaseAttrs;
  header: KerfBaseAttrs;
  footer: KerfBaseAttrs;
  main: KerfBaseAttrs;
  nav: KerfBaseAttrs;
  aside: KerfBaseAttrs;
  // Text content
  h1: KerfBaseAttrs;
  h2: KerfBaseAttrs;
  h3: KerfBaseAttrs;
  h4: KerfBaseAttrs;
  h5: KerfBaseAttrs;
  h6: KerfBaseAttrs;
  p: KerfBaseAttrs;
  hr: KerfBaseAttrs;
  br: KerfBaseAttrs;
  pre: KerfBaseAttrs;
  blockquote: HTMLBlockquoteAttrs;
  q: HTMLQAttrs;
  ol: HTMLOlAttrs;
  ul: KerfBaseAttrs;
  li: HTMLLiAttrs;
  dl: KerfBaseAttrs;
  dt: KerfBaseAttrs;
  dd: KerfBaseAttrs;
  figure: KerfBaseAttrs;
  figcaption: KerfBaseAttrs;
  // Inline text
  a: HTMLAnchorAttrs;
  em: KerfBaseAttrs;
  strong: KerfBaseAttrs;
  small: KerfBaseAttrs;
  s: KerfBaseAttrs;
  cite: KerfBaseAttrs;
  code: KerfBaseAttrs;
  kbd: KerfBaseAttrs;
  samp: KerfBaseAttrs;
  var: KerfBaseAttrs;
  sub: KerfBaseAttrs;
  sup: KerfBaseAttrs;
  i: KerfBaseAttrs;
  b: KerfBaseAttrs;
  u: KerfBaseAttrs;
  mark: KerfBaseAttrs;
  abbr: KerfBaseAttrs;
  time: KerfBaseAttrs & { dateTime?: AttrLike };
  // Embedded
  img: HTMLImgAttrs;
  picture: KerfBaseAttrs;
  source: HTMLSourceAttrs;
  track: HTMLTrackAttrs;
  iframe: HTMLIframeAttrs;
  embed: KerfBaseAttrs & { src?: AttrLike; type?: AttrLike; width?: AttrLike<number | string>; height?: AttrLike<number | string> };
  object: KerfBaseAttrs & { data?: AttrLike; type?: AttrLike; name?: AttrLike; width?: AttrLike<number | string>; height?: AttrLike<number | string> };
  audio: HTMLMediaAttrs;
  video: HTMLVideoAttrs;
  canvas: HTMLCanvasAttrs;
  area: HTMLAreaAttrs;
  map: KerfBaseAttrs & { name?: AttrLike };
  // Forms
  form: HTMLFormAttrs;
  input: HTMLInputAttrs;
  button: HTMLButtonAttrs;
  select: HTMLSelectAttrs;
  optgroup: HTMLOptgroupAttrs;
  option: HTMLOptionAttrs;
  textarea: HTMLTextareaAttrs;
  label: HTMLLabelAttrs;
  fieldset: KerfBaseAttrs & { name?: AttrLike; form?: AttrLike; disabled?: AttrLike<boolean> };
  legend: KerfBaseAttrs;
  datalist: KerfBaseAttrs;
  output: KerfBaseAttrs & { name?: AttrLike; form?: AttrLike; htmlFor?: AttrLike };
  progress: HTMLProgressAttrs;
  meter: HTMLMeterAttrs;
  // Tables
  table: HTMLTableAttrs;
  caption: KerfBaseAttrs;
  colgroup: HTMLColAttrs;
  col: HTMLColAttrs;
  thead: KerfBaseAttrs;
  tbody: KerfBaseAttrs;
  tfoot: KerfBaseAttrs;
  tr: KerfBaseAttrs;
  td: HTMLTableCellAttrs;
  th: HTMLTableCellAttrs;
  // Document metadata
  meta: HTMLMetaAttrs;
  link: HTMLLinkAttrs;
  script: HTMLScriptAttrs;
  style: HTMLStyleAttrs;
  base: HTMLBaseAttrs;
  title: KerfBaseAttrs;
  // Interactive
  details: HTMLDetailsAttrs;
  summary: KerfBaseAttrs;
  dialog: HTMLDialogAttrs;
  // Web components
  template: KerfBaseAttrs;
  slot: KerfBaseAttrs & { name?: AttrLike };

  // ----- SVG elements -----
  svg: SVGSvgAttrs;
  g: SVGCommonAttrs;
  defs: SVGCommonAttrs;
  symbol: SVGCommonAttrs;
  use: SVGUseAttrs;
  path: SVGPathAttrs;
  circle: SVGCircleAttrs;
  rect: SVGRectAttrs;
  line: SVGLineAttrs;
  ellipse: SVGEllipseAttrs;
  polygon: SVGPolyAttrs;
  polyline: SVGPolyAttrs;
  text: SVGTextAttrs;
  tspan: SVGTextAttrs;
  image: SVGImageAttrs;
  foreignObject: SVGForeignObjectAttrs;
  clipPath: SVGCommonAttrs;
  mask: SVGCommonAttrs;
  pattern: SVGCommonAttrs;
  marker: SVGCommonAttrs;
  linearGradient: SVGCommonAttrs;
  radialGradient: SVGCommonAttrs;
  stop: SVGCommonAttrs & { offset?: AttrLike<number | string>; stopColor?: AttrLike; stopOpacity?: AttrLike<number | string> };
}
