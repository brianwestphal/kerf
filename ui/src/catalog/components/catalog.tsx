import type { CatalogEntry, CatalogProps, CatalogSection } from '../types.js';
import { CatalogDetail } from './catalog-detail.js';
import { CatalogSidebar } from './catalog-sidebar.js';

function findEntry(
  sections: readonly CatalogSection[],
  id: string,
): CatalogEntry | undefined {
  for (const section of sections) {
    for (const entry of section.entries) if (entry.id === id) return entry;
  }
  return undefined;
}

/** Controlled, stateless component-catalog shell. */
export function Catalog({
  brand,
  sections,
  active,
  content,
  collapsed = false,
  theme,
  headerActions,
  secondarySections,
  sidebarFooter,
  status,
  geometryOverlay,
  selectAction = 'catalog-select',
  toggleSidebarAction = 'catalog-toggle-sidebar',
  toggleThemeAction = 'catalog-toggle-theme',
  toggleSecondaryAction = 'catalog-toggle-secondary',
  className = '',
  slot,
}: CatalogProps) {
  const selected =
    findEntry(sections, active) ??
    (secondarySections
      ? findEntry(secondarySections.sections, active)
      : undefined);

  return (
    <main
      class={`kui-catalog ${className}`.trim()}
      data-component="catalog"
      data-sidebar-collapsed={String(collapsed)}
      data-geometry-overlay={
        geometryOverlay === undefined ? undefined : String(geometryOverlay)
      }
      slot={slot}
    >
      <CatalogSidebar
        brand={brand}
        sections={sections}
        active={active}
        collapsed={collapsed}
        secondarySections={secondarySections}
        footer={sidebarFooter}
        selectAction={selectAction}
        toggleSidebarAction={toggleSidebarAction}
        toggleSecondaryAction={toggleSecondaryAction}
      />
      <CatalogDetail
        brandTitle={brand.title}
        active={active}
        selected={selected}
        content={content}
        collapsed={collapsed}
        theme={theme}
        headerActions={headerActions}
        status={status}
        geometryOverlay={geometryOverlay}
        selectAction={selectAction}
        toggleSidebarAction={toggleSidebarAction}
        toggleThemeAction={toggleThemeAction}
      />
    </main>
  );
}
