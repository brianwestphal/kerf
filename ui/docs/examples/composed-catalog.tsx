import '@kerfjs/ui/popup-menu/register';

import {
  Catalog,
  catalogEntryId,
  type CatalogPackage,
  type CatalogPreview,
  composeCatalog,
} from '@kerfjs/ui/catalog';
import { kerfCatalogPackage } from '@kerfjs/ui/catalog-library';
import { wireCatalog } from '@kerfjs/ui/wire-catalog';
import { batch, mount, signal } from 'kerfjs';
import { resource } from 'kerfjs/async';

/** A consuming app supplies its own preview module loader at the composition boundary. */
export function mountComponentCatalog(
  root: HTMLElement,
  loadPreview: () => Promise<CatalogPreview>,
) {
  const app: CatalogPackage = {
    package: 'review-app',
    label: 'Review App',
    imports: [kerfCatalogPackage],
    entries: [
      {
        id: 'button',
        name: 'Review Actions',
        category: 'Review',
        description: 'Choose how to share a review.',
        uses: [{ package: '@kerfjs/ui', id: 'popup-menu' }],
        loadPreview,
      },
    ],
  };
  const graph = composeCatalog(app);
  const view = root.ownerDocument.defaultView!;
  const linked = new URL(view.location.href).searchParams.get('component');
  const initial =
    linked && graph.entries.has(linked)
      ? linked
      : catalogEntryId(app.package, 'button');
  const active = signal(initial);
  const expanded = signal(
    new Set([app.package, graph.entries.get(initial)!.package]),
  );
  const showDiscouraged = signal(false);
  const preview = resource<CatalogPreview | undefined, string>();
  function select(id: string) {
    const owner = graph.entries.get(id)!.package;
    batch(() => {
      active.value = id;
      if (!expanded.peek().has(owner))
        expanded.value = new Set([...expanded.peek(), owner]);
      void preview.run(id, () => graph.loadPreview(id));
    });
  }
  select(initial);
  const unmount = mount(root, () => {
    const state = preview.value;
    const content =
      state.status === 'completed' && state.input === active.value ? (
        state.data ? (
          state.data()
        ) : (
          <p>This package provides catalog details only.</p>
        )
      ) : (
        <p>
          {state.status === 'failed'
            ? 'Preview could not be loaded.'
            : 'Loading preview…'}
        </p>
      );
    return Catalog({
      brand: { title: 'Component Library' },
      sections: [],
      active: active.value,
      content,
      secondarySections: graph.groups.map((group) => ({
        ...group,
        expanded: expanded.value.has(group.id),
        tagFilter:
          group.id === '@awesome.me/webawesome'
            ? {
                tag: 'Discouraged',
                label: 'Show Discouraged',
                show: showDiscouraged.value,
              }
            : undefined,
      })),
    });
  });
  const unwire = wireCatalog(root, {
    onSelect: select,
    urlParam: 'component',
    revealSelection: true,
    onToggleSecondary(id) {
      if (!id) return;
      const next = new Set(expanded.peek());
      if (next.has(id)) next.delete(id);
      else next.add(id);
      expanded.value = next;
    },
    onToggleSecondaryFilter(show) {
      showDiscouraged.value = show;
    },
  });
  return () => {
    unwire();
    unmount();
    preview.reset();
  };
}
