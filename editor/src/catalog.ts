// The catalogs the editor reads: component props (types, groups, hints), the
// composition catalog (zones and rules), and the selection catalog (names and
// categories for the palette).
import catalogJson from '@kerfjs/ui/ai/component-catalog.json';
import compositionJson from '@kerfjs/ui/ai/component-composition.json';
import propsJson from '@kerfjs/ui/ai/component-props.json';
import { createViewCatalog } from '@kerfjs/ui/view';

import type { InspectorComponent } from './model/inspector.js';

export interface PropsComponent extends InspectorComponent {
  readonly id: string;
  readonly source: 'kerf' | 'webawesome';
  readonly export?: string;
  readonly tagName?: string;
}

interface CatalogEntry {
  readonly id: string;
  readonly name: string;
  readonly category: string;
  readonly source: string;
}

export const viewCatalog = createViewCatalog({
  props: [propsJson],
  composition: [compositionJson],
});

const PACKAGE = '@kerfjs/ui';
const propsComponents = (
  propsJson as unknown as { components: PropsComponent[] }
).components;
const entries = (catalogJson as unknown as { entries: CatalogEntry[] }).entries;

/** Component key → props entry. */
export const propsByKey: ReadonlyMap<string, PropsComponent> = new Map(
  propsComponents.map((component) => [component.key, component]),
);

/** Component key → display name ("Button", "FieldLabel", "wa-badge"). */
export const componentNames: ReadonlyMap<string, string> = new Map(
  propsComponents.map((component) => {
    const entry = entries.find((item) => item.id === component.id);
    const name = component.key.includes('#')
      ? component.export!
      : (entry?.name ?? component.id);
    return [component.key, name];
  }),
);

export interface PaletteGroup {
  readonly category: string;
  readonly items: readonly { readonly key: string; readonly name: string }[];
}

/** Kerf components by catalog category, in catalog order. */
export function paletteGroups(): PaletteGroup[] {
  const groups = new Map<string, { key: string; name: string }[]>();
  for (const entry of entries) {
    if (entry.source !== 'kerf') continue;
    for (const component of propsComponents) {
      if (component.id !== entry.id || component.source !== 'kerf') continue;
      const list = groups.get(entry.category) ?? [];
      list.push({
        key: component.key,
        name: componentNames.get(component.key)!,
      });
      groups.set(entry.category, list);
    }
  }
  return [...groups].map(([category, items]) => ({ category, items }));
}

export const UI_PACKAGE = PACKAGE;
