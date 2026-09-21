import { describe, expect, expectTypeOf, it } from 'vitest';

import {
  type CatalogResourceKind,
  catalogResources,
} from '../../src/catalog-resources.js';

describe('catalog resources', () => {
  it('builds the standard first-party footer in canonical order', () => {
    expect(
      catalogResources({
        demoSource: { href: '/demo', detail: 'demos/button.tsx' },
        componentSource: { href: '/component', detail: 'src/button.tsx' },
        guidance: { href: '/guidance', detail: 'docs/button.md' },
      }),
    ).toEqual([
      { label: 'Demo source', href: '/demo', detail: 'demos/button.tsx' },
      {
        label: 'Component source',
        href: '/component',
        detail: 'src/button.tsx',
      },
      { label: 'Guidance', href: '/guidance', detail: 'docs/button.md' },
    ]);
  });

  it('uses integration guidance without inventing a component-source action', () => {
    expect(
      catalogResources({
        demoSource: { href: '/demo' },
        designTemplate: { href: '/template' },
        guidance: { href: '/integration' },
        guidanceKind: 'integrationGuidance',
      }),
    ).toEqual([
      { label: 'Demo source', href: '/demo' },
      { label: 'Design template', href: '/template' },
      { label: 'Integration guidance', href: '/integration' },
    ]);
  });

  it('keeps semantic kinds as a closed typed vocabulary', () => {
    expectTypeOf<CatalogResourceKind>().toEqualTypeOf<
      | 'demoSource'
      | 'componentSource'
      | 'designTemplate'
      | 'guidance'
      | 'integrationGuidance'
    >();
  });
});
