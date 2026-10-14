import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import postcss from 'postcss';
import { describe, expect, it } from 'vitest';

// KF-YHPYXX static-effects switch: `data-kui-effects="static"` on the root
// element, or a slow-updating display (`@media (update: slow)`), turns every
// backdrop effect opaque and stops every scroll-driven animation. Backdrop
// effects are centralized in foundation tokens; scroll-driven animations live
// in component CSS, so this test holds each file that adds one to the switch.

const srcRoot = resolve(import.meta.dirname, '../../src');
const STATIC_ROOT = ':root[data-kui-effects="static"]';

function cssFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(dir, entry.name);
    if (entry.isDirectory()) return cssFiles(path);
    return entry.name.endsWith('.css') ? [path] : [];
  });
}

interface Decl {
  selector: string;
  media: string;
  prop: string;
  value: string;
}

function declarations(file: string): Decl[] {
  const root = postcss.parse(readFileSync(file, 'utf8'));
  const found: Decl[] = [];
  root.walkDecls((decl) => {
    const parent = decl.parent;
    if (parent?.type !== 'rule') return;
    const rule = parent as postcss.Rule;
    const media: string[] = [];
    let node: postcss.Node | undefined = rule.parent as postcss.Node;
    while (node) {
      if (node.type === 'atrule') {
        const at = node as postcss.AtRule;
        media.push(`@${at.name} ${at.params}`);
      }
      node = node.parent as postcss.Node | undefined;
    }
    found.push({
      selector: rule.selector.replace(/\s+/g, ' '),
      media: media.join(' ').replace(/\s+/g, ' '),
      prop: decl.prop,
      value: decl.value.replace(/\s+/g, ' '),
    });
  });
  return found;
}

const foundation = declarations(resolve(srcRoot, 'foundation.css'));

function staticValue(prop: string): string | undefined {
  return foundation.find(
    (decl) =>
      decl.selector === STATIC_ROOT && decl.media === '' && decl.prop === prop,
  )?.value;
}

function slowValue(prop: string): string | undefined {
  return foundation.find(
    (decl) =>
      decl.selector === ':root' &&
      decl.media === '@media (update: slow)' &&
      decl.prop === prop,
  )?.value;
}

describe('static-effects switch', () => {
  it('turns the chrome material opaque under the root attribute and on slow displays', () => {
    for (const read of [staticValue, slowValue]) {
      expect(read('--kui-chrome-material')).toBe('var(--kui-color-surface)');
      expect(read('--kui-chrome-material-raised')).toBe(
        'var(--kui-color-surface-raised)',
      );
      expect(read('--kui-chrome-material-filter')).toBe('none');
    }
  });

  it('routes every backdrop filter through a token the switch resets', () => {
    for (const file of cssFiles(srcRoot)) {
      for (const decl of declarations(file)) {
        if (!/^(-webkit-)?backdrop-filter$/.test(decl.prop)) continue;
        if (decl.value === 'none') continue;
        const token = /^var\((--kui-[\w-]+)\)$/.exec(decl.value)?.[1];
        expect(
          token,
          `${file}: ${decl.selector} { ${decl.prop}: ${decl.value} } must read a --kui-* filter token`,
        ).toBeDefined();
        expect(
          staticValue(token as string),
          `${token} under ${STATIC_ROOT}`,
        ).toBe('none');
        expect(slowValue(token as string), `${token} under update: slow`).toBe(
          'none',
        );
      }
    }
  });

  it('stops every scroll-driven animation under the root attribute and on slow displays', () => {
    for (const file of cssFiles(srcRoot)) {
      const decls = declarations(file);
      if (!decls.some((decl) => decl.prop === 'animation-timeline')) continue;
      const stops = (decl: Decl) =>
        (decl.prop === 'animation' || decl.prop === 'animation-name') &&
        decl.value === 'none';
      expect(
        decls.some(
          (decl) => decl.selector.includes(STATIC_ROOT) && stops(decl),
        ),
        `${file} must stop its scroll-driven animation under ${STATIC_ROOT}`,
      ).toBe(true);
      expect(
        decls.some(
          (decl) => decl.media.includes('(update: slow)') && stops(decl),
        ),
        `${file} must stop its scroll-driven animation under @media (update: slow)`,
      ).toBe(true);
    }
  });
});
