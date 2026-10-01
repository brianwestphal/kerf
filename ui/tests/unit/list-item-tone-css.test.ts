import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import postcss from 'postcss';
import { describe, expect, it } from 'vitest';

describe('ListItem tone tokens', () => {
  it('reads list-scoped colors with fallbacks instead of shadowing them on each row', async () => {
    const file = resolve(import.meta.dirname, '../../src/list-item.css');
    const root = postcss.parse(await readFile(file, 'utf8'), { from: file });
    const rule = (selector: string) => {
      const found = root.nodes.find(
        (node) =>
          node.type === 'rule' &&
          node.selector.replace(/\s+/g, ' ').includes(selector),
      );
      if (!found || found.type !== 'rule')
        throw new Error(`Missing ${selector}`);
      return new Map(
        found.nodes
          .filter((node) => node.type === 'decl')
          .map((node) => [node.prop, node.value.replace(/\s+/g, '')]),
      );
    };
    const rest = rule('.kui-list-item');
    for (const token of [
      '--kui-list-item-color',
      '--kui-list-item-hover-background',
      '--kui-list-item-selected-color',
      '--kui-list-item-selected-background',
    ])
      expect(rest.has(token), token).toBe(false);
    expect(rest.get('color')).toContain(
      'var(--kui-list-item-color,var(--kui-color-neutral-on-normal))',
    );
    expect(rule('.kui-list-item:hover').get('background')).toContain(
      'var(--kui-list-item-hover-background,var(--kui-color-neutral-fill-quiet))',
    );
    const selected = rule('.kui-list-item[aria-current="page"]');
    expect(selected.get('color')).toContain(
      'var(--kui-list-item-selected-color,var(--kui-color-neutral-on-normal))',
    );
    expect(selected.get('background')).toContain(
      'var(--kui-list-item-selected-background,var(--kui-color-brand-fill-normal))',
    );
  });
});
