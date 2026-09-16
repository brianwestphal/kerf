import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import postcss from 'postcss';
import { describe, expect, it } from 'vitest';

async function declarationsFor(file: string, selector: string) {
  const css = await readFile(resolve(import.meta.dirname, `../../src/${file}`), 'utf8');
  const root = postcss.parse(css, { from: file });
  const rule = root.nodes.find((node) => node.type === 'rule' && node.selector === selector);
  if (!rule || rule.type !== 'rule') throw new Error(`Missing ${selector} in ${file}`);
  return Object.fromEntries(rule.nodes
    .filter((node) => node.type === 'decl')
    .map((declaration) => [declaration.prop, declaration.value]));
}

describe('menu row icon alignment contract', () => {
  it('aligns a multiline ListItem icon to the first inherited line box', async () => {
    await expect(declarationsFor(
      'list-item.css',
      '.kui-list-item[data-multiline="true"] .kui-list-item__icon',
    )).resolves.toEqual({
      'align-self': 'start',
      'margin-block-start': 'calc((1lh - remify(24px)) / 2)',
    });
  });

  it('positions a multiline ListActionRow icon at the first inherited line center', async () => {
    await expect(declarationsFor(
      'list-action-row.css',
      '.kui-list-action-row[data-multiline="true"] .kui-list-action-row__icon',
    )).resolves.toEqual({
      'inset-block-start': 'calc(\n    var(--kui-layout-item-padding, remify(8px)) + (1lh / 2)\n  )',
    });
  });
});
