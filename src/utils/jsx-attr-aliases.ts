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
 *
 * **When a camelCase attribute needs an entry.** Pass-through is not the same
 * as "no translation": an unlisted `fooBar` is emitted verbatim, and the HTML
 * parser then lowercases it to `foobar`. That is silently *correct* whenever
 * the real attribute name is exactly the lowercased spelling (`fetchPriority`
 * → `fetchpriority`, `charSet` → `charset`, `playsInline` → `playsinline`), and
 * silently *wrong* whenever it isn't — `defaultSelected` rendered
 * `defaultselected`, an attribute no browser has ever read, so the option it
 * was supposed to pre-select never was. Any camelCase key whose HTML name is
 * not its own lowercase MUST have a row here.
 *
 * `tests/unit/jsx-attr-names.test.ts` pins that rule: it reads every attribute
 * key declared in `src/jsx-types.ts` and asserts the name kerf would actually
 * emit for each camelCase one, so a new typed attribute cannot join without
 * someone stating what it renders as.
 *
 * SVG is the reason the lowercasing shortcut can't be relied on in general —
 * SVG attribute names are case-sensitive, and only the fixed set in the HTML
 * parser's SVG adjustment table (`viewBox`, `preserveAspectRatio`,
 * `pathLength`, …) survives the round trip with its case intact.
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
  defaultSelected: 'selected',
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
