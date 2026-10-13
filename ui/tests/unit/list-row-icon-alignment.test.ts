import { readFile } from 'node:fs/promises';

import postcss from 'postcss';
import { describe, expect, it } from 'vitest';

import { componentStylesheet } from './helpers/component-stylesheet.js';

async function declarationsFor(file: string, selector: string) {
  const css = await readFile(await componentStylesheet(file), 'utf8');
  const root = postcss.parse(css, { from: file });
  const rule = root.nodes.find(
    (node) => node.type === 'rule' && node.selector === selector,
  );
  if (!rule || rule.type !== 'rule')
    throw new Error(`Missing ${selector} in ${file}`);
  return Object.fromEntries(
    rule.nodes
      .filter((node) => node.type === 'decl')
      .map((declaration) => [
        declaration.prop,
        declaration.value.replace(/\s+/g, ' '),
      ]),
  );
}

describe('menu row icon alignment contract', () => {
  it('clips ListItem content to the rounded row boundary', async () => {
    await expect(
      declarationsFor('list-item.css', '.kui-list-item'),
    ).resolves.toMatchObject({
      overflow: 'hidden',
    });
  });

  it('gives described ListItems enough height to keep owned text inside that boundary', async () => {
    await expect(
      declarationsFor(
        'list-item.css',
        '.kui-list-item[data-has-description="true"]',
      ),
    ).resolves.toEqual({
      'min-height': 'var(--kui-list-item-min-height, remify(52px))',
    });
    await expect(
      declarationsFor(
        'list-item.css',
        '.kui-list-item[data-density="compact"][data-has-description="true"]',
      ),
    ).resolves.toEqual({
      'min-height': 'var(--kui-list-item-min-height, remify(44px))',
    });
  });

  it('sizes the ListItem leading icon and its SVG to 18px', async () => {
    await expect(
      declarationsFor('list-item.css', '.kui-list-item'),
    ).resolves.toMatchObject({
      '--_kui-list-item-icon-size':
        'var( --kui-list-item-icon-size, var(--kui-list-row-icon-size, remify(18px)) )',
    });
    await expect(
      declarationsFor('list-item.css', '.kui-list-item__icon'),
    ).resolves.toMatchObject({
      width: 'var(--_kui-list-item-icon-size)',
      height: 'var(--_kui-list-item-icon-size)',
    });
    await expect(
      declarationsFor('list-item.css', '.kui-list-item__icon svg'),
    ).resolves.toMatchObject({
      width: 'var(--_kui-list-item-icon-size)',
      height: 'var(--_kui-list-item-icon-size)',
    });
  });

  it('aligns a multiline ListItem icon to the first inherited line box', async () => {
    await expect(
      declarationsFor(
        'list-item.css',
        '.kui-list-item[data-multiline="true"] .kui-list-item__icon',
      ),
    ).resolves.toEqual({
      'align-self': 'start',
      'margin-block-start': 'calc((1lh - var(--_kui-list-item-icon-size)) / 2)',
    });
  });

  it('positions a multiline ListActionRow icon at the first inherited line center', async () => {
    await expect(
      declarationsFor(
        'list-action-row.css',
        '.kui-list-action-row[data-multiline="true"] .kui-list-action-row__icon',
      ),
    ).resolves.toEqual({
      'inset-block-start':
        'calc( var(--_kui-list-action-row-padding-block) + (1lh / 2) )',
    });
  });

  it('derives the ListActionRow label minimum from the density height and padding', async () => {
    await expect(
      declarationsFor('list-action-row.css', '.kui-list-action-row'),
    ).resolves.toMatchObject({
      '--_kui-list-action-row-min-height': 'remify(44px)',
      '--_kui-list-action-row-padding-block':
        'var( --kui-layout-item-padding, remify(8px) )',
      'min-height': 'var(--_kui-list-action-row-min-height)',
    });
    // Compact matches a compact ListItem: a 36px row with 4px block padding,
    // so a single-line label (one 1.45 line box) never holds it taller.
    await expect(
      declarationsFor(
        'list-action-row.css',
        '.kui-list-action-row[data-density="compact"]',
      ),
    ).resolves.toEqual({
      '--_kui-list-action-row-min-height': 'remify(36px)',
      '--_kui-list-action-row-padding-block': 'remify(4px)',
    });
    await expect(
      declarationsFor(
        'list-action-row.css',
        '.kui-list-action-row[data-icon-tile][data-density="compact"]',
      ),
    ).resolves.toEqual({
      '--_kui-list-action-row-min-height': 'remify(42px)',
    });
    await expect(
      declarationsFor('list-action-row.css', '.kui-list-action-row__label'),
    ).resolves.toMatchObject({
      'min-height':
        'calc( var(--_kui-list-action-row-min-height) - (2 * var(--_kui-list-action-row-padding-block)) )',
    });
    await expect(
      declarationsFor('list-action-row.css', '.kui-list-action-row__primary'),
    ).resolves.toMatchObject({
      'padding-block': 'var(--_kui-list-action-row-padding-block)',
    });
  });
});
