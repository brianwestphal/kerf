import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import postcss, { type Rule } from 'postcss';
import { describe, expect, it } from 'vitest';

const components = ['list-header', 'list-item', 'list-action-row'];

describe('shared list divider token', () => {
  it.each(components)(
    '%s reads an inherited token with the old fallback',
    async (name) => {
      const css = postcss.parse(
        await readFile(
          resolve(import.meta.dirname, `../../src/${name}.css`),
          'utf8',
        ),
      );
      const root = css.nodes.find(
        (node): node is Rule =>
          node.type === 'rule' && node.selector === `.kui-${name}`,
      );
      expect(
        root?.nodes.some(
          (node) =>
            node.type === 'decl' &&
            node.prop === '--kui-list-group-divider-color',
        ),
      ).toBe(false);
      const dividers: string[] = [];
      css.walkDecls(/border-block-(?:start|end)(?:-color)?/, (decl) => {
        if (
          decl.parent?.type === 'rule' &&
          decl.parent.selector.includes('[data-divider=')
        )
          dividers.push(decl.value.replace(/\s+/g, ''));
      });
      expect(dividers).toHaveLength(2);
      for (const value of dividers)
        expect(value).toContain(
          'var(--kui-list-group-divider-color,var(--kui-color-neutral-border-quiet))',
        );
    },
  );
});
