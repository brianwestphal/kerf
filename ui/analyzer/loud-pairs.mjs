import postcss from 'postcss';

// KUI-L018: the shipped Web Awesome theme pairs every loud fill with an
// on-loud foreground that clears WCAG AA; an override that moves one without
// the other silently drops that guarantee (see docs/webawesome-theme.md).
const loudToken =
  /^--wa-color-(neutral|brand|success|warning|danger|pop)-(fill-loud|on-loud)$/;

/** WCAG AA contrast for normal text. */
export const LOUD_PAIR_MIN_CONTRAST = 4.5;

/**
 * The on-loud foreground `@kerfjs/ui/webawesome.css` ships for each tone,
 * where it is a literal color. An unpaired fill that still clears AA against
 * it keeps the guarantee. `neutral` follows the surface token and `pop` has no
 * Web Awesome default, so neither can be proven and an unpaired fill stays a
 * finding. A unit test keeps this table equal to the shipped stylesheet.
 */
export const DEFAULT_ON_LOUD = Object.freeze({
  brand: 'light-dark(#fff, #111113)',
  success: '#1d1d1f',
  warning: '#1d1d1f',
  danger: 'light-dark(#fff, #111113)',
});

const NAMED_COLORS = new Map([
  ['white', [255, 255, 255]],
  ['black', [0, 0, 0]],
]);

function channel(value, scale) {
  const text = value.trim();
  if (text.endsWith('%')) return (Number(text.slice(0, -1)) / 100) * scale;
  return Number(text);
}

function opaque(alpha) {
  if (alpha === undefined) return true;
  const text = alpha.trim();
  const value = text.endsWith('%')
    ? Number(text.slice(0, -1)) / 100
    : Number(text);
  return value === 1;
}

function hslToRgb(hue, saturation, lightness) {
  const h = (((hue % 360) + 360) % 360) / 360;
  const s = saturation / 100;
  const l = lightness / 100;
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const convert = (t) => {
    const x = t < 0 ? t + 1 : t > 1 ? t - 1 : t;
    if (x < 1 / 6) return p + (q - p) * 6 * x;
    if (x < 1 / 2) return q;
    if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6;
    return p;
  };
  return [convert(h + 1 / 3), convert(h), convert(h - 1 / 3)].map(
    (component) => component * 255,
  );
}

/** An opaque literal sRGB color as `[r, g, b]` (0-255), else `undefined`. */
function parseOpaqueColor(value) {
  const text = value.trim().toLowerCase();
  if (NAMED_COLORS.has(text)) return NAMED_COLORS.get(text);
  const hex = /^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/.exec(text);
  if (hex) {
    const digits =
      hex[1].length <= 4
        ? [...hex[1]].map((digit) => digit + digit).join('')
        : hex[1];
    if (digits.length === 8 && digits.slice(6) !== 'ff') return undefined;
    return [0, 2, 4].map((start) =>
      Number.parseInt(digits.slice(start, start + 2), 16),
    );
  }
  const functional = /^(rgba?|hsla?)\(([^()]*)\)$/.exec(text);
  if (!functional) return undefined;
  const [components, alpha] = functional[2].includes('/')
    ? functional[2].split('/')
    : [functional[2]];
  const parts = components.split(/[\s,]+/).filter(Boolean);
  const alphaPart = alpha ?? parts[3];
  if (parts.length < 3 || !opaque(alphaPart)) return undefined;
  const rgb = functional[1].startsWith('rgb')
    ? parts.slice(0, 3).map((part) => channel(part, 255))
    : hslToRgb(
        Number(parts[0].replace(/deg$/, '')),
        Number(parts[1].replace(/%$/, '')),
        Number(parts[2].replace(/%$/, '')),
      );
  return rgb.every((component) => Number.isFinite(component))
    ? rgb.map((component) => Math.min(255, Math.max(0, component)))
    : undefined;
}

/**
 * A literal color value resolved per color scheme: `{ light, dark }` of
 * `[r, g, b]`. `light-dark(a, b)` splits by scheme; a plain literal applies to
 * both. Anything else (a `var()`, `color-mix()`, a keyword, transparency) is
 * not provable and returns `undefined`.
 */
export function literalSchemeColors(value) {
  const text = value
    .replace(/!important\s*$/i, '')
    .trim()
    .toLowerCase();
  const lightDark = /^light-dark\((.*)\)$/.exec(text);
  if (lightDark) {
    const parts = postcss.list.comma(lightDark[1]);
    if (parts.length !== 2) return undefined;
    const [light, dark] = parts.map(parseOpaqueColor);
    return light && dark ? { light, dark } : undefined;
  }
  const color = parseOpaqueColor(text);
  return color ? { light: color, dark: color } : undefined;
}

function luminance([red, green, blue]) {
  const linear = (component) => {
    const value = component / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * linear(red) + 0.7152 * linear(green) + 0.0722 * linear(blue);
}

/** WCAG 2 contrast ratio between two `[r, g, b]` colors. */
export function contrastRatio(first, second) {
  const [lighter, darker] = [luminance(first), luminance(second)].sort(
    (a, b) => b - a,
  );
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * The lowest per-scheme contrast of a fill/foreground pair, or `undefined`
 * when either value is not a provable literal color.
 */
export function loudPairContrast(fillValue, onLoudValue) {
  const fill = literalSchemeColors(fillValue);
  const foreground = literalSchemeColors(onLoudValue);
  if (!fill || !foreground) return undefined;
  const results = ['light', 'dark'].map((scheme) => ({
    scheme,
    ratio: contrastRatio(fill[scheme], foreground[scheme]),
  }));
  return results.reduce((lowest, item) =>
    item.ratio < lowest.ratio ? item : lowest,
  );
}

function normalizeSelector(selector) {
  return selector
    .replace(/\s+/g, ' ')
    .replace(/\s*([>+~])\s*/g, '$1')
    .trim();
}

function resolvedSelectors(node) {
  const chain = [];
  let current = node;
  while (current && current.type !== 'root') {
    chain.unshift(current);
    current = current.parent;
  }
  let selectors = [''];
  const atRules = [];
  for (const item of chain) {
    if (item.type === 'atrule')
      atRules.push(`@${item.name} ${item.params.replace(/\s+/g, ' ').trim()}`);
    if (item.type !== 'rule') continue;
    const own = postcss.list.comma(item.selector).map(normalizeSelector);
    selectors = selectors.flatMap((parent) =>
      own.map((child) => {
        if (child.includes('&'))
          return child.replaceAll('&', parent || ':root');
        return parent ? `${parent} ${child}` : child;
      }),
    );
  }
  const atScope = atRules.join(' ');
  return selectors.map((selector) => ({
    key: `${atScope}|${selector}`,
    atScope,
    bare: selector,
    selector: atScope ? `${atScope} ${selector}`.trim() : selector,
  }));
}

/**
 * Every loud-token declaration in a stylesheet, one record per resolved
 * selector scope: `{ decl, file, tone, kind, value, scope }`.
 */
export function collectLoudDeclarations(file, root) {
  const records = [];
  root.walkDecls((decl) => {
    const match = loudToken.exec(decl.prop.trim());
    if (!match) return;
    for (const scope of resolvedSelectors(decl.parent))
      records.push({
        decl,
        file,
        tone: match[1],
        kind: match[2],
        value: decl.value,
        scope,
      });
  });
  return records;
}

// Selectors that match the document root (or a shadow root's host), so a
// custom property set there inherits into every other scope.
const rootSelectors = new Set(['', ':root', 'html', ':host', '*']);

// Whether an on-loud declared in `outer` provably reaches an element that
// `inner` matches: the same scope, or an ancestor one. The outer at-rule chain
// must be absent or a prefix of the inner one (an unconditional value applies
// inside `@media`, not the reverse), and the outer selector must be a document
// root selector or the leading compound selector of a descendant/child chain.
function reaches(outer, inner) {
  if (
    outer.atScope &&
    outer.atScope !== inner.atScope &&
    !inner.atScope.startsWith(`${outer.atScope} `)
  )
    return false;
  if (outer.bare === inner.bare || rootSelectors.has(outer.bare)) return true;
  return (
    inner.bare.startsWith(outer.bare) &&
    [' ', '>'].includes(inner.bare[outer.bare.length])
  );
}

// The on-loud that governs a fill scope: the same scope wins (this stylesheet
// before a co-loaded one), then the nearest ancestor (the longest selector).
function governingOnLoud(fill, onLoud) {
  const candidates = onLoud.filter(
    (record) => record.tone === fill.tone && reaches(record.scope, fill.scope),
  );
  const rank = (record) => [
    record.scope.key === fill.scope.key ? 1 : 0,
    record.file === fill.file ? 1 : 0,
    record.scope.atScope.length + record.scope.bare.length,
  ];
  return candidates.sort((a, b) => {
    const [left, right] = [rank(a), rank(b)];
    for (let index = 0; index < left.length; index += 1)
      if (left[index] !== right[index]) return right[index] - left[index];
    return 0;
  })[0];
}

const scopeLabel = (selector) => selector || '(top level)';
// Truncated rather than rounded, so a pair just under 4.5:1 never reads as
// passing.
const truncatedRatio = (ratio) => Math.floor(ratio * 100) / 100;
const ratioLabel = (ratio) => `${truncatedRatio(ratio).toFixed(2)}:1`;

/**
 * Report each loud fill override whose tone lacks a governing on-loud (unless
 * the fill provably clears AA against the theme's default foreground), and
 * each literal pair that is present but below 4.5:1. `siblingOnLoud` holds
 * on-loud records from the other stylesheets the same entry loads.
 */
export function inspectLoudPairs(file, root, report, siblingOnLoud = []) {
  const records = collectLoudDeclarations(file, root);
  const onLoud = [
    ...records.filter(({ kind }) => kind === 'on-loud'),
    ...siblingOnLoud,
  ];
  const fills = new Map();
  for (const record of records.filter(({ kind }) => kind === 'fill-loud')) {
    const group = fills.get(record.decl) ?? [];
    group.push(record);
    fills.set(record.decl, group);
  }
  for (const [decl, scopes] of fills) {
    const { tone } = scopes[0];
    const pair = `--wa-color-${tone}-on-loud`;
    const missing = [];
    const failing = [];
    for (const fill of scopes) {
      const governing = governingOnLoud(fill, onLoud);
      if (governing) {
        const contrast = loudPairContrast(fill.value, governing.value);
        if (contrast && contrast.ratio < LOUD_PAIR_MIN_CONTRAST)
          failing.push({ fill, governing, contrast });
        continue;
      }
      const fallback = DEFAULT_ON_LOUD[tone]
        ? loudPairContrast(fill.value, DEFAULT_ON_LOUD[tone])
        : undefined;
      if (fallback && fallback.ratio >= LOUD_PAIR_MIN_CONTRAST) continue;
      missing.push({ fill, fallback });
    }
    if (missing.length) {
      const [measured] = missing
        .map(({ fallback }) => fallback)
        .filter(Boolean)
        .sort((a, b) => a.ratio - b.ratio);
      report(
        decl,
        `${decl.prop} is overridden without ${pair} in the same or an ancestor scope (${missing
          .map(({ fill }) => scopeLabel(fill.scope.selector))
          .join(', ')})${
          measured
            ? `, and it measures ${ratioLabel(measured.ratio)} against the theme's default ${pair} in the ${measured.scheme} scheme`
            : ''
        }; set ${pair} alongside it so the loud fill keeps an AA-clearing foreground.`,
        {
          property: decl.prop,
          value: decl.value,
          tone,
          pairProperty: pair,
          selectors: missing.map(({ fill }) => fill.scope.selector),
          ...(measured
            ? {
                defaultPairValue: DEFAULT_ON_LOUD[tone],
                contrast: truncatedRatio(measured.ratio),
                scheme: measured.scheme,
              }
            : {}),
        },
      );
    }
    if (failing.length) {
      const worst = failing.reduce((lowest, item) =>
        item.contrast.ratio < lowest.contrast.ratio ? item : lowest,
      );
      report(
        decl,
        `${decl.prop} (${decl.value.trim()}) and its ${pair} (${worst.governing.value.trim()}) measure ${ratioLabel(worst.contrast.ratio)} in the ${worst.contrast.scheme} scheme, below the ${LOUD_PAIR_MIN_CONTRAST}:1 AA minimum (${failing
          .map(({ fill }) => scopeLabel(fill.scope.selector))
          .join(
            ', ',
          )}); choose a fill or foreground that clears 4.5:1 in every scheme.`,
        {
          property: decl.prop,
          value: decl.value,
          tone,
          pairProperty: pair,
          pairValue: worst.governing.value,
          pairLocation: {
            file: worst.governing.file,
            line: worst.governing.decl.source?.start?.line ?? 1,
          },
          contrast: truncatedRatio(worst.contrast.ratio),
          scheme: worst.contrast.scheme,
          selectors: failing.map(({ fill }) => fill.scope.selector),
        },
      );
    }
  }
}
