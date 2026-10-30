// The catalogs the editor reads: component props (types, groups, hints), the
// composition catalog (zones and rules), and the selection catalog (names and
// categories for the palette). An editor gets one EditorCatalog, so a host
// can add an application's catalogs beside Kerf UI's (KF-6GT5QY).
import { createViewCatalog, type ViewCatalog } from '@kerfjs/ui/view';
import type { SafeHtml } from 'kerfjs';

import type { InspectorComponent } from './model/inspector.js';
import { KERF_UI_PLACEHOLDERS, type Placeholders } from './placeholders.js';

export interface PropsComponent extends InspectorComponent {
  readonly id: string;
  readonly source: 'kerf' | 'webawesome' | 'package';
  readonly export?: string;
  readonly tagName?: string;
  /** Prop combinations a union-typed props interface allows. */
  readonly variants?: readonly {
    readonly required: readonly string[];
    readonly forbidden: readonly string[];
    readonly when?: Readonly<Record<string, string | number | boolean>>;
  }[];
}

/** A selection catalog entry: a component's display name and category. */
export interface CatalogEntry {
  readonly id: string;
  readonly name: string;
  readonly category: string;
  readonly source: string;
}

export interface PaletteGroup {
  readonly category: string;
  readonly items: readonly { readonly key: string; readonly name: string }[];
}

/** A component function the preview can call with a node's props. */
export type ComponentFunction = (props: never) => SafeHtml;

/** Everything an editor knows about the components it can place. */
export interface EditorCatalog {
  readonly viewCatalog: ViewCatalog;
  /** Component key → props entry. */
  readonly propsByKey: ReadonlyMap<string, PropsComponent>;
  /** Component key → display name ("Button", "FieldLabel", "OrderCard"). */
  readonly componentNames: ReadonlyMap<string, string>;
  /** Component key → the function the preview renders it with. */
  readonly components: Readonly<Record<string, ComponentFunction>>;
  /** Placeable components by category, in catalog order. */
  paletteGroups(): PaletteGroup[];
  /**
   * Preview stand-ins for app-supplied props, by `<component key>.<prop>`
   * (KF-H3CB2P): Kerf UI's, then the host's.
   */
  readonly placeholders: Placeholders;
}

export interface EditorCatalogInputs {
  /** `component-props.json` catalogs: Kerf UI's and any package's. */
  readonly props: readonly unknown[];
  /** `component-composition.json` catalogs, in the same packages. */
  readonly composition: readonly unknown[];
  /** Selection catalogs (`component-catalog.json`) for names and categories. */
  readonly selection?: readonly unknown[];
  readonly components: Readonly<Record<string, ComponentFunction>>;
  /**
   * Preview stand-ins for the app-supplied props (functions, models) of an
   * application's components, by `<component key>.<prop>`; each returns a
   * fresh value. They add to and replace Kerf UI's own.
   */
  readonly placeholders?: Placeholders;
}

/** The category of a package component no selection catalog lists. */
const APP_CATEGORY = 'Application';

export function createEditorCatalog(
  inputs: EditorCatalogInputs,
): EditorCatalog {
  const viewCatalog = createViewCatalog({
    props: inputs.props as never,
    composition: inputs.composition as never,
  });
  const propsComponents = inputs.props.flatMap(
    (catalog) => (catalog as { components: PropsComponent[] }).components,
  );
  const entries = (inputs.selection ?? []).flatMap(
    (catalog) => (catalog as { entries: CatalogEntry[] }).entries,
  );
  const propsByKey = new Map(
    propsComponents.map((component) => [component.key, component]),
  );
  const componentNames = new Map(
    propsComponents.map((component) => {
      const entry = entries.find((item) => item.id === component.id);
      const name = component.key.includes('#')
        ? component.export!
        : (entry?.name ?? component.export ?? component.id);
      return [component.key, name];
    }),
  );
  return {
    viewCatalog,
    propsByKey,
    componentNames,
    components: inputs.components,
    placeholders: { ...KERF_UI_PLACEHOLDERS, ...inputs.placeholders },
    paletteGroups() {
      const groups = new Map<string, { key: string; name: string }[]>();
      const add = (category: string, key: string) => {
        const list = groups.get(category) ?? [];
        list.push({ key, name: componentNames.get(key)! });
        groups.set(category, list);
      };
      for (const entry of entries) {
        if (entry.source !== 'kerf') continue;
        for (const component of propsComponents)
          if (component.id === entry.id && component.source === 'kerf')
            add(entry.category, component.key);
      }
      // Package components (an application's own) group after Kerf UI's.
      for (const component of propsComponents)
        if (component.source === 'package')
          add(
            entries.find((item) => item.id === component.id)?.category ??
              APP_CATEGORY,
            component.key,
          );
      return [...groups].map(([category, items]) => ({ category, items }));
    },
  };
}

/** A props catalog component's import location, as the generator records it. */
interface ImportableComponent {
  readonly key: string;
  readonly import?: string;
  readonly export?: string;
}

/**
 * Catalog key → component function, from props catalogs and the modules
 * their components import from (`modules[import][export]`). A host imports
 * those modules (the Vite editor plugin generates the imports), so this
 * module embeds no components of its own.
 */
export function componentMap(
  props: readonly unknown[],
  modules: Readonly<Record<string, Readonly<Record<string, unknown>>>>,
): Record<string, ComponentFunction> {
  const map: Record<string, ComponentFunction> = {};
  for (const catalog of props)
    for (const component of (catalog as { components: ImportableComponent[] })
      .components) {
      const render =
        component.import && component.export
          ? modules[component.import]?.[component.export]
          : undefined;
      if (typeof render === 'function')
        map[component.key] = render as ComponentFunction;
    }
  return map;
}
