import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import postcss from 'postcss';
import { describe, expect, it } from 'vitest';

describe('TabScaffold label geometry', () => {
  it('keeps the complete label line box from shrinking below its text', async () => {
    const file = resolve(import.meta.dirname, '../../src/tab-scaffold.css');
    const root = postcss.parse(await readFile(file, 'utf8'), { from: file });
    const label = root.nodes.find(
      (node) =>
        node.type === 'rule' &&
        node.selector === '.kui-tab-scaffold__tab-label',
    );

    if (!label || label.type !== 'rule')
      throw new Error('Missing TabScaffold label rule');

    const declarations = Object.fromEntries(
      label.nodes
        .filter((node) => node.type === 'decl')
        .map((node) => [node.prop, node.value]),
    );
    expect(declarations).toMatchObject({
      flex: 'none',
      overflow: 'hidden',
      'text-overflow': 'ellipsis',
      'white-space': 'nowrap',
    });
  });
});
