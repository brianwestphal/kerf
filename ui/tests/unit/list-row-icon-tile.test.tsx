import { readFile } from 'node:fs/promises';

import { Terminal } from 'lucide';
import postcss from 'postcss';
import { describe, expect, it } from 'vitest';

import { ListActionRow } from '../../src/components/collections/list-action-row/list-action-row.js';
import {
  type ListIconTile,
  ListItem,
  ListItemLink,
} from '../../src/components/collections/list-item/list-item.js';
import { LucideIcon } from '../../src/components/media/lucide-icon/lucide-icon.js';
import {
  type CssColor,
  type CssForegroundColor,
  fillColor,
  uiColor,
} from '../../src/shared/styles/css-values.js';
import { componentStylesheet } from './helpers/component-stylesheet.js';

const icon = <LucideIcon icon={Terminal} name="terminal" />;

function parse(html: string): HTMLElement {
  const template = document.createElement('template');
  template.innerHTML = html;
  const element = template.content.firstElementChild;
  if (!(element instanceof HTMLElement)) throw new Error('Expected a row');
  return element;
}

function item(iconTile: ListIconTile | undefined, extra = {}) {
  return parse(
    ListItem({
      action: 'open',
      label: 'Run Tests',
      icon,
      iconTile,
      ...extra,
    }).toString(),
  );
}

function actionRow(iconTile: ListIconTile | undefined, extra = {}) {
  return parse(
    ListActionRow({
      action: 'open',
      label: 'Run Tests',
      icon,
      iconTile,
      trailingAction: 'edit',
      trailingActionLabel: 'Edit Run Tests',
      trailingActionIcon: icon,
      ...extra,
    }).toString(),
  );
}

const renderers = {
  ListItem: (tile: ListIconTile | undefined, extra = {}) => item(tile, extra),
  ListItemLink: (tile: ListIconTile | undefined, extra = {}) =>
    parse(
      ListItemLink({
        href: '#tests',
        label: 'Run Tests',
        icon,
        iconTile: tile,
        ...extra,
      }).toString(),
    ),
  ListActionRow: (tile: ListIconTile | undefined, extra = {}) =>
    actionRow(tile, extra),
};

const iconClass = {
  ListItem: '.kui-list-item__icon',
  ListItemLink: '.kui-list-item__icon',
  ListActionRow: '.kui-list-action-row__icon',
};

const variable = {
  ListItem: '--_kui-list-item-icon-tile',
  ListItemLink: '--_kui-list-item-icon-tile',
  ListActionRow: '--_kui-list-action-row-icon-tile',
};

describe.each(Object.keys(renderers) as (keyof typeof renderers)[])(
  '%s iconTile',
  (name) => {
    const render = renderers[name];

    it('marks a tone preset on the root without inline color', () => {
      const row = render('success');
      expect(row.dataset.iconTile).toBe('tone');
      expect(row.dataset.iconTileTone).toBe('success');
      expect(row.querySelector(iconClass[name])?.getAttribute('style')).toBe(
        null,
      );
    });

    it('passes an application fill and foreground to the icon slot', () => {
      const row = render({
        color: fillColor('#30a46c'),
        foreground: uiColor('neutral-on-loud'),
      });
      expect(row.dataset.iconTile).toBe('color');
      expect(row.dataset.iconTileTone).toBeUndefined();
      const style =
        row.querySelector(iconClass[name])?.getAttribute('style') ?? '';
      expect(style).toContain(`${variable[name]}-fill: #30a46c`);
      expect(style).toContain(
        `${variable[name]}-foreground: var(--kui-color-neutral-on-loud)`,
      );
    });

    it('leaves the foreground to the automatic contrast when omitted', () => {
      const style =
        render({ color: uiColor('brand-fill-loud') })
          .querySelector(iconClass[name])
          ?.getAttribute('style') ?? '';
      expect(style).toBe(
        `${variable[name]}-fill: var(--kui-color-brand-fill-loud)`,
      );
    });

    it('renders no tile and no tile markers without an icon or a tile', () => {
      const untiled = render(undefined);
      expect(untiled.dataset.iconTile).toBeUndefined();
      expect(untiled.dataset.hasIcon).toBe('true');
      const iconless = render('brand', { icon: undefined });
      expect(iconless.dataset.iconTile).toBeUndefined();
      expect(iconless.dataset.iconTileTone).toBeUndefined();
      expect(iconless.querySelector(iconClass[name])).toBeNull();
    });

    it('keeps tile markers out of reach of rootAttributes', () => {
      const row = render('danger', {
        rootAttributes: {
          'data-icon-tile': 'color',
          'data-icon-tile-tone': 'brand',
        } as never,
      });
      expect(row.dataset.iconTile).toBe('tone');
      expect(row.dataset.iconTileTone).toBe('danger');
    });

    it('swaps the fill for a tile-sized skeleton while loading', () => {
      const row = render(
        { color: fillColor('#e5484d') },
        { placeholder: true },
      );
      expect(row.dataset.iconTile).toBe('color');
      const slot = row.querySelector(iconClass[name]);
      expect(slot?.getAttribute('style')).toBeNull();
      const skeleton = slot?.querySelector('[data-component="skeleton"]');
      expect(skeleton?.getAttribute('style')).toBe('width:2rem;height:2rem');
    });

    it('rejects an unknown tone and a color that is not one declaration value', () => {
      expect(() => render('loud' as ListIconTile)).toThrow(RangeError);
      expect(() => render({ color: 'red; display: none' as CssColor })).toThrow(
        TypeError,
      );
      expect(() =>
        render({
          color: fillColor('#000'),
          foreground: '"white"' as CssForegroundColor,
        }),
      ).toThrow(TypeError);
    });
  },
);

async function declarationsFor(file: string, selector: string) {
  const css = await readFile(await componentStylesheet(file), 'utf8');
  const root = postcss.parse(css, { from: file });
  const rule = root.nodes.find(
    (node) =>
      node.type === 'rule' && node.selector.replace(/\s+/g, ' ') === selector,
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

describe('icon tile stylesheet contract', () => {
  it('sizes both row kinds to a 32px tile, 6px radius, and 18px glyph', async () => {
    await expect(
      declarationsFor('list-item.css', '.kui-list-item[data-icon-tile]'),
    ).resolves.toMatchObject({
      '--_kui-list-item-icon-tile-size': 'remify(32px)',
    });
    await expect(
      declarationsFor(
        'list-action-row.css',
        '.kui-list-action-row[data-icon-tile]',
      ),
    ).resolves.toMatchObject({
      '--_kui-list-action-row-icon-tile-size': 'remify(32px)',
    });
    for (const [file, prefix] of [
      ['list-item.css', 'list-item'],
      ['list-action-row.css', 'list-action-row'],
    ] as const) {
      await expect(
        declarationsFor(
          file,
          `.kui-${prefix}[data-icon-tile] .kui-${prefix}__icon`,
        ),
      ).resolves.toMatchObject({
        'border-radius': 'var(--kui-radius-m, remify(6px))',
      });
      await expect(
        declarationsFor(
          file,
          `.kui-${prefix}[data-icon-tile] .kui-${prefix}__icon svg`,
        ),
      ).resolves.toEqual({
        width: 'remify(18px)',
        height: 'remify(18px)',
      });
    }
  });

  it('leaves the untiled icons on the shared list row icon size', async () => {
    await expect(
      declarationsFor('list-item.css', '.kui-list-item__icon svg'),
    ).resolves.toMatchObject({
      width: 'var(--_kui-list-item-icon-size)',
    });
    await expect(
      declarationsFor('list-action-row.css', '.kui-list-action-row__icon svg'),
    ).resolves.toMatchObject({
      width: 'var(--_kui-list-action-row-icon-size)',
      height: 'var(--_kui-list-action-row-icon-size)',
    });
  });
});
