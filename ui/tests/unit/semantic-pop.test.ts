import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import postcss, { type AtRule, type Root, type Rule } from 'postcss';
import { describe, expect, it } from 'vitest';

async function cssRoot(file: string): Promise<Root> {
  const path = resolve(import.meta.dirname, `../../src/${file}`);
  return postcss.parse(await readFile(path, 'utf8'), { from: path });
}

function declarations(ruleNode: Rule): Record<string, string> {
  return Object.fromEntries(
    ruleNode.nodes
      .filter((node) => node.type === 'decl')
      .map((node) => [node.prop, node.value.replace(/\s+/g, ' ')]),
  );
}

function findRule(root: Root | AtRule, selector: string): Rule {
  const match = root.nodes?.find(
    (node): node is Rule => node.type === 'rule' && node.selector === selector,
  );
  if (!match) throw new Error(`Missing ${selector}`);
  return match;
}

describe('pop semantic color', () => {
  it('ships a complete light/dark role family and increased-contrast overrides', async () => {
    const root = await cssRoot('foundation.css');
    const base = declarations(findRule(root, ':root'));
    expect(base).toMatchObject({
      '--kui-color-pop-fill-loud': 'light-dark(#af34d4, #da8fff)',
      '--kui-color-pop-fill-quiet': expect.stringContaining(
        'var(--kui-color-pop-fill-loud) 10%',
      ),
      '--kui-color-pop-fill-normal': expect.stringContaining(
        'var(--kui-color-pop-fill-loud) 18%',
      ),
      '--kui-color-pop-border-quiet': expect.stringContaining('36%'),
      '--kui-color-pop-border-normal': expect.stringContaining('58%'),
      '--kui-color-pop-border-loud': 'var(--kui-color-pop-fill-loud)',
      '--kui-color-pop-on-quiet': 'light-dark(#792498, #e8a5ff)',
      '--kui-color-pop-on-normal': 'var(--kui-color-pop-on-quiet)',
      '--kui-color-pop-on-loud': 'light-dark(#fff, #241126)',
      '--kui-color-pop-on-fill': 'var(--kui-color-pop-on-quiet)',
      '--kui-color-pop': 'var(--kui-color-pop-fill-quiet)',
      '--kui-color-pop-text': 'var(--kui-color-pop-on-fill)',
    });

    const contrast = root.nodes.find(
      (node): node is AtRule =>
        node.type === 'atrule' &&
        node.name === 'media' &&
        node.params === '(prefers-contrast: more)',
    );
    if (!contrast) throw new Error('Missing increased-contrast palette');
    expect(declarations(findRule(contrast, ':root'))).toMatchObject({
      '--kui-color-pop-fill-quiet': 'Canvas',
      '--kui-color-pop-fill-normal': 'Canvas',
      '--kui-color-pop-fill-loud': 'Highlight',
      '--kui-color-pop-border-normal': 'currentColor',
      '--kui-color-pop-on-fill': 'currentColor',
      '--kui-color-pop-on-loud': 'HighlightText',
    });
  });

  it('maps pop onto every public semantic-tone surface', async () => {
    const [banner, badge, toolbar] = await Promise.all(
      ['state-banner.css', 'badge.css', 'toolbar-control-group.css'].map(
        cssRoot,
      ),
    );
    expect(
      declarations(findRule(banner, '.kui-state-banner[data-tone="pop"]')),
    ).toMatchObject({
      '--_kui-state-banner-background': expect.stringContaining(
        '--kui-color-pop-fill-quiet',
      ),
      '--_kui-state-banner-border': expect.stringContaining(
        '--kui-color-pop-border-normal',
      ),
      '--_kui-state-banner-foreground': expect.stringContaining(
        '--kui-color-pop-on-fill',
      ),
    });
    expect(
      declarations(findRule(badge, '.kui-badge[data-tone="pop"]')),
    ).toMatchObject({
      '--_kui-badge-fill-quiet': 'var(--kui-color-pop-fill-quiet)',
      '--_kui-badge-fill-solid': 'var(--kui-color-pop-on-fill)',
      '--_kui-badge-on-quiet': 'var(--kui-color-pop-on-quiet)',
      '--_kui-badge-on-solid': 'var(--kui-color-surface)',
    });
    expect(
      declarations(
        findRule(
          toolbar,
          '.kui-toolbar-control-group[data-selected-tone="pop"]',
        ),
      ),
    ).toMatchObject({
      '--kui-toolbar-control-selected-color': 'var(--kui-color-pop-on-quiet)',
    });
  });
});
