import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { Inbox } from 'lucide';
import { describe, expect, it } from 'vitest';

import { LucideIcon } from '../../src/lucide-icon.js';
import {
  createViewCatalog,
  generateView,
  interpretView,
  lucideExportName,
  validateView,
} from '../../view/index.mjs';

const root = resolve(import.meta.dirname, '../..');
const readJson = (path: string) =>
  JSON.parse(readFileSync(resolve(root, path), 'utf8'));
const catalog = createViewCatalog({
  props: [readJson('ai/component-props.json')],
  composition: [readJson('ai/component-composition.json')],
});
const iconDoc = (icon: unknown, prop = 'icon') => ({
  schema: 'kerf-ui-document/v1',
  name: 'Glyph',
  catalogs: ['@kerfjs/ui'],
  root: {
    id: '01JB8Z1M6Q8E1X9V4S7K2R3TCA',
    type: '@kerfjs/ui:lucide-icon',
    props: { name: 'inbox', icon: [], [prop]: icon },
  },
});
const codes = (document: unknown, icons?: string[]) =>
  validateView(document, catalog, icons ? { icons } : {}).diagnostics.map(
    (item) => item.code,
  );

describe('$icon: naming Lucide icons in view documents', () => {
  it('marks LucideIcon.icon as Lucide icon data in component-props', () => {
    const icon = catalog.components.get('@kerfjs/ui:lucide-icon')!
      .component as { props: { name: string; iconSource?: string }[] };
    expect(icon.props.find((prop) => prop.name === 'icon')?.iconSource).toBe(
      'lucide',
    );
  });

  it('validates the prop, the name shape, and (given a list) the name', () => {
    expect(codes(iconDoc({ $icon: 'inbox' }))).toEqual([]);
    expect(codes(iconDoc({ $icon: 'inbox' }, 'label'))).toEqual(['KUI-V013']);
    expect(codes(iconDoc({ $icon: 'Inbox' }))).toEqual(['KUI-V013']);
    expect(codes(iconDoc({ $icon: 'inbox' }), ['inbox', 'mail'])).toEqual([]);
    expect(codes(iconDoc({ $icon: 'nope' }), ['inbox'])).toEqual(['KUI-V013']);
  });

  it('generates an aliased lucide import that cannot collide with components', () => {
    const { code } = generateView(iconDoc({ $icon: 'a-arrow-down' }), catalog);
    expect(code).toContain(
      "import { AArrowDown as lucideAArrowDown } from 'lucide';",
    );
    expect(code).toContain('icon: lucideAArrowDown');
    expect(lucideExportName('arrow-down-0-1')).toBe('ArrowDown01');
  });

  it('interprets $icon through the app-supplied icon map', () => {
    const document = iconDoc({ $icon: 'inbox' });
    const { digest } = generateView(document, catalog);
    const render = (icons?: Record<string, unknown>) =>
      String(
        interpretView(document, {
          catalog,
          components: { '@kerfjs/ui:lucide-icon': LucideIcon },
          contract: digest,
          ...(icons ? { icons } : {}),
        }),
      );
    expect(render({ inbox: Inbox })).toBe(
      String(
        LucideIcon({
          name: 'inbox',
          icon: Inbox,
          rootAttributes: { 'data-kerf-node': '01JB8Z1M6Q8E1X9V4S7K2R3TCA' },
        }),
      ),
    );
    expect(() => render()).toThrow(/no icon data for "inbox"/);
  });
});
