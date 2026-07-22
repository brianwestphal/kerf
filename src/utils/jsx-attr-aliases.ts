/**
 * JSX → HTML / SVG attribute name aliases.
 *
 * The JSX runtime translates camelCase attributes (React convention) to
 * the kebab-case / colon-form names the browser actually wants. Anything
 * not in this map is passed through verbatim — `data-*`, `aria-*`, and
 * any custom attribute work without ceremony.
 *
 * Lives in its own module so the alias data stays a separable concern from
 * `src/jsx-runtime.ts`'s runtime logic; the bulk of `jsx-runtime.ts` was this
 * table.
 */

export const ATTR_ALIASES: Record<string, string> = {
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
