import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import postcss from 'postcss';
import { describe, expect, it } from 'vitest';

describe('opt-in document baseline', () => {
  it('owns the document box model, full-height chain, body theme, and links', async () => {
    const source = await readFile(
      resolve(import.meta.dirname, '../../src/document.css'),
      'utf8',
    );
    const root = postcss.parse(source);
    const declarations = (selector: string) => {
      const rule = root.nodes.find(
        (node) => node.type === 'rule' && node.selector === selector,
      );
      if (!rule || rule.type !== 'rule')
        throw new Error(`Missing ${selector} document baseline rule`);
      return Object.fromEntries(
        rule.nodes
          .filter((node) => node.type === 'decl')
          .map((node) => [node.prop, node.value]),
      );
    };

    expect(declarations('*,\n*::before,\n*::after')).toEqual({
      'box-sizing': 'border-box',
    });
    expect(declarations('html,\nbody,\n.kui-app-root')).toEqual({
      height: '100%',
    });
    expect(declarations('body')).toEqual({
      margin: '0',
      color: 'var(--kui-color-text)',
      background: 'var(--kui-color-surface-lowered)',
      'font-family': 'var(--kui-font-sans)',
      'line-height': '1.45',
    });
    expect(declarations(':where(a)')).toEqual({
      color: 'var(--kui-color-text-link)',
    });
    expect(root.nodes.some((node) => node.type === 'atrule')).toBe(false);
  });
});
