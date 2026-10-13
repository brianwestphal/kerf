import { readFile } from 'node:fs/promises';

import postcss, { type Root } from 'postcss';
import { describe, expect, it } from 'vitest';

import { componentStylesheet } from './helpers/component-stylesheet.js';

const SHARED =
  'var(--kui-list-row-padding-inline,var(--kui-layout-item-padding,remify(8px)))';

async function parse(name: string): Promise<Root> {
  return postcss.parse(
    await readFile(await componentStylesheet(`${name}.css`), 'utf8'),
  );
}

function declarations(css: Root, selector: string, prop: string): string[] {
  const values: string[] = [];
  css.walkDecls(prop, (decl) => {
    if (decl.parent?.type === 'rule' && decl.parent.selector === selector)
      values.push(decl.value.replace(/\s+/g, ''));
  });
  return values;
}

describe('shared list row inline inset token', () => {
  it('neither row kind declares the shared token on its own root', async () => {
    for (const name of ['list-item', 'list-action-row']) {
      const css = await parse(name);
      const declared: string[] = [];
      css.walkDecls('--kui-list-row-padding-inline', (decl) => {
        declared.push(decl.prop);
      });
      expect(declared, name).toEqual([]);
    }
  });

  it('ListItem reads it beneath its own padding token, padding and drop line alike', async () => {
    const css = await parse('list-item');
    const expected = `var(--kui-list-item-padding-inline,${SHARED})`;
    expect(declarations(css, '.kui-list-item', 'padding-inline')).toEqual([
      expected,
    ]);
    expect(
      declarations(
        css,
        '.kui-list-item[data-drop-position]::after',
        'inset-inline',
      ),
    ).toEqual([expected]);
  });

  it('ListActionRow routes its primary padding, icon, and drop line through it', async () => {
    const css = await parse('list-action-row');
    expect(
      declarations(
        css,
        '.kui-list-action-row',
        '--_kui-list-action-row-padding-inline',
      ),
    ).toEqual([SHARED]);
    const inset = 'var(--_kui-list-action-row-padding-inline)';
    expect(
      declarations(css, '.kui-list-action-row__primary', 'padding-inline'),
    ).toEqual([`calc(1px+${inset})${inset}`]);
    expect(
      declarations(css, '.kui-list-action-row__icon', 'inset-inline-start'),
    ).toEqual([`calc(1px+${inset})`]);
    expect(
      declarations(
        css,
        '.kui-list-action-row[data-drop-position]::after',
        'inset-inline',
      ),
    ).toEqual([inset]);
    // The primary button's leading inset never falls back to the layout token
    // directly, which would ignore the shared token.
    expect(
      declarations(
        css,
        '.kui-list-action-row__primary',
        'padding-inline-start',
      ),
    ).toEqual([]);
  });
});
