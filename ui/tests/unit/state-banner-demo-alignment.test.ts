import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import postcss from 'postcss';
import { describe, expect, it } from 'vitest';

describe('StateBanner demo label alignment', () => {
  it('insets specimen chrome by the banner margin, border, and content padding', async () => {
    const file = resolve(import.meta.dirname, '../../ux-demo/style.css');
    const root = postcss.parse(await readFile(file, 'utf8'), { from: file });
    const rule = root.nodes.find(
      (node) => node.type === 'rule' && node.selector === '.demo-state-banner-grid h3',
    );

    if (!rule || rule.type !== 'rule') throw new Error('Missing StateBanner demo label rule');
    const inset = rule.nodes.find(
      (node) => node.type === 'decl' && node.prop === 'margin-inline-start',
    );

    if (!inset || inset.type !== 'decl') throw new Error('Missing StateBanner demo label inset');
    expect(inset.value.replace(/\s+/g, ' ')).toBe(
      'calc( var(--kui-layout-inline-margin, remify(8px)) + 1px + var(--kui-layout-item-padding, remify(8px)) )',
    );
  });
});
