/**
 * Pins the HTML attribute name kerf emits for every camelCase attribute the
 * JSX types declare (KF-436).
 *
 * The bug this exists to prevent is invisible at every other layer. A camelCase
 * key with no `ATTR_ALIASES` row is emitted verbatim and lowercased by the HTML
 * parser, which is *correct* for `fetchPriority` → `fetchpriority` and *wrong*
 * for `defaultSelected` → `defaultselected` — a name no browser reads. Both
 * compile, both render, both look right in a snapshot of the markup; only the
 * second one silently does nothing. Type tests can't see it (the type is fine),
 * and render tests can't see it either unless someone already suspected that
 * exact attribute.
 *
 * So the invariant is stated positively instead: every camelCase attribute in
 * `src/jsx-types.ts` has a row below naming the attribute it renders as. A new
 * typed attribute fails this test until its row is added, which is the moment
 * to notice that its lowercase spelling isn't the real HTML name.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cwd } from 'node:process';

import { describe, expect, it } from 'vitest';

import { ATTR_ALIASES } from '../../src/utils/jsx-attr-aliases.js';

// Resolved from the vitest root (the repo root) rather than `import.meta.url` —
// the happy-dom environment rewrites the module URL to an `http:` one, which
// `fileURLToPath` rejects.
const TYPES_SRC = readFileSync(resolve(cwd(), 'src/jsx-types.ts'), 'utf8');

/**
 * Every property key declared in an interface in `src/jsx-types.ts`. Attribute
 * declarations are one per line in the shape `name?: AttrLike<…>;` — including
 * the inline object literals in the tag table (`embed: KerfBaseAttrs & { src?:
 * AttrLike; … }`), which is why this matches anywhere on a line rather than
 * anchoring to the start of one.
 */
function declaredAttributeKeys(): Set<string> {
  const keys = new Set<string>();
  for (const [, key] of TYPES_SRC.matchAll(/(?:^|[{;\s])([A-Za-z][A-Za-z0-9]*)\?:/g)) {
    keys.add(key);
  }
  return keys;
}

/**
 * What each camelCase attribute must render as. `null` marks a key that is a
 * JSX-only concept rather than an attribute name of its own — kerf's own render
 * props, not something the browser ever sees.
 */
const EXPECTED_EMITTED_NAME: Record<string, string | null> = {
  // --- Global / HTML, aliased ---
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

  // --- The `default*` family: React's naming for "the attribute is only the
  // initial value". Each MUST alias to the real attribute; `defaultSelected`
  // rendered `defaultselected` until KF-436 caught it here.
  defaultChecked: 'checked',
  defaultSelected: 'selected',
  defaultValue: 'value',

  // --- Unaliased, and correct only because the HTML name IS the lowercase ---
  allowFullScreen: 'allowfullscreen',
  cellPadding: 'cellpadding',
  cellSpacing: 'cellspacing',
  charSet: 'charset',
  fetchPriority: 'fetchpriority',
  playsInline: 'playsinline',

  // --- SVG presentation / text / marker attributes (kebab-case in SVG) ---
  fillOpacity: 'fill-opacity',
  fillRule: 'fill-rule',
  strokeWidth: 'stroke-width',
  strokeOpacity: 'stroke-opacity',
  strokeLinecap: 'stroke-linecap',
  strokeLinejoin: 'stroke-linejoin',
  strokeDasharray: 'stroke-dasharray',
  strokeDashoffset: 'stroke-dashoffset',
  strokeMiterlimit: 'stroke-miterlimit',
  vectorEffect: 'vector-effect',
  clipPath: 'clip-path',
  clipRule: 'clip-rule',
  pointerEvents: 'pointer-events',
  shapeRendering: 'shape-rendering',
  paintOrder: 'paint-order',
  textAnchor: 'text-anchor',
  dominantBaseline: 'dominant-baseline',
  fontFamily: 'font-family',
  fontSize: 'font-size',
  fontStyle: 'font-style',
  fontWeight: 'font-weight',
  letterSpacing: 'letter-spacing',
  stopColor: 'stop-color',
  stopOpacity: 'stop-opacity',

  // --- SVG attributes the HTML parser's adjustment table restores the case of ---
  viewBox: 'viewBox',
  preserveAspectRatio: 'preserveAspectRatio',
  pathLength: 'pathLength',

  // --- xlink / xmlns, colon-form ---
  xlinkHref: 'xlink:href',
  xmlnsXlink: 'xmlns:xlink',

  // --- Not an attribute: the JSX children prop ---
  children: null,
};

/** The name `renderAttr()` writes into the markup: aliased, else verbatim. */
function emittedName(key: string): string {
  return ATTR_ALIASES[key] ?? key;
}

describe('JSX attribute name emission', () => {
  const camelKeys = [...declaredAttributeKeys()]
    .filter((k) => /[A-Z]/.test(k) || k === 'children')
    .sort();

  it('finds the attribute declarations in src/jsx-types.ts', () => {
    // Guards the regex above: if the source shape changes so nothing matches,
    // every assertion below would vacuously pass.
    expect(camelKeys.length).toBeGreaterThan(50);
    expect(camelKeys).toContain('defaultSelected');
    expect(camelKeys).toContain('className');
  });

  it('every declared camelCase attribute has a pinned emitted name', () => {
    const unpinned = camelKeys.filter((k) => !(k in EXPECTED_EMITTED_NAME));
    expect(
      unpinned,
      'A camelCase attribute was added to src/jsx-types.ts without stating what '
      + 'it renders as. Add it to EXPECTED_EMITTED_NAME — and if its HTML name is '
      + 'not simply its lowercase, add an ATTR_ALIASES row too.',
    ).toEqual([]);
  });

  it('reaches the pinned HTML name for each one', () => {
    for (const key of camelKeys) {
      const expected = EXPECTED_EMITTED_NAME[key];
      if (expected === null) continue;
      // Two ways to be right: kerf writes the HTML name outright (an alias, or
      // a name that was already correct), or it writes the camelCase spelling
      // and the HTML parser's lowercasing lands on it — proved below. Writing
      // `defaultselected` when the attribute is `selected` satisfies neither.
      const written = emittedName(key);
      expect(
        written === expected || written.toLowerCase() === expected,
        `attribute ${key}: kerf writes "${written}", which never reaches "${expected}"`,
      ).toBe(true);
    }
  });

  it('the HTML parser lowercases an unaliased camelCase name (what the rule above rests on)', () => {
    const host = document.createElement('div');
    host.innerHTML = String(<iframe allowFullScreen src="p.html" />);
    const frame = host.firstElementChild!;
    expect(frame.getAttributeNames().sort()).toEqual(['allowfullscreen', 'src']);
    expect(frame.getAttributeNames()).not.toContain('allowFullScreen');
  });

  it('the `default*` family renders the real attribute, not its own name', () => {
    // The concrete regression: `defaultSelected` used to render
    // `defaultselected`, so the option it named was never pre-selected.
    const html = String(
      <select>
        <option value="a">a</option>
        <option value="b" defaultSelected>b</option>
      </select>,
    );
    expect(html).toContain('<option value="b" selected>');
    expect(html).not.toContain('defaultselected');

    expect(String(<input defaultValue="x" defaultChecked />))
      .toBe('<input value="x" checked>');
  });

  it('no alias row is dead — every alias key is a declared attribute', () => {
    // The reverse direction: an alias for an attribute nobody can type is
    // either a typo or a leftover, and it costs bytes in every bundle.
    const declared = declaredAttributeKeys();
    // SVG presentation attributes reachable only through declaration merging on
    // custom elements / untyped tags — deliberately aliased ahead of typing.
    const typedElsewhere = new Set([
      'colorInterpolation', 'colorInterpolationFilters', 'floodColor', 'floodOpacity',
      'lightingColor', 'imageRendering', 'textRendering', 'fontVariant', 'fontStretch',
      'textDecoration', 'alignmentBaseline', 'baselineShift', 'wordSpacing', 'writingMode',
      'markerStart', 'markerMid', 'markerEnd',
      'xlinkShow', 'xlinkActuate', 'xlinkType', 'xlinkRole', 'xlinkTitle', 'xlinkArcrole',
      'xmlBase', 'xmlLang', 'xmlSpace',
    ]);
    const dead = Object.keys(ATTR_ALIASES)
      .filter((k) => !declared.has(k) && !typedElsewhere.has(k));
    expect(dead).toEqual([]);
  });
});
