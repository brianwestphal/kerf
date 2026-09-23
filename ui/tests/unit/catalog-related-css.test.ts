import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import postcss, { type Rule } from 'postcss';
import { describe, expect, it } from 'vitest';

describe('Catalog related selector CSS', () => {
  it('lets the complete trigger grow and gives its popup a standard inset', async () => {
    const file = resolve(import.meta.dirname, '../../src/catalog.css');
    const root = postcss.parse(await readFile(file, 'utf8'), { from: file });
    const matchingRules = root.nodes.filter(
      (node): node is Rule =>
        node.type === 'rule' && node.selector.includes('related-menu'),
    );
    const widthRule = matchingRules.find((rule) =>
      rule.nodes.some(
        (node) =>
          node.type === 'decl' &&
          node.prop === 'width' &&
          node.value === 'auto',
      ),
    );
    expect(widthRule?.selector).toContain('> .kui-catalog__related-menu');
    const menuRule = matchingRules.find(
      (rule) => rule.selector === '.kui-catalog__related-menu::part(menu)',
    );
    expect(
      menuRule?.nodes.some(
        (node) =>
          node.type === 'decl' &&
          node.prop === 'padding' &&
          node.value === 'var(--kui-wa-surface-inset, remify(8px))',
      ),
    ).toBe(true);
  });
});
