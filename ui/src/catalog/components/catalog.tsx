import { Moon, Sun } from 'lucide';

import { List } from '../../list.js';
import { ListInsetText } from '../../list-inset-text.js';
import { LucideIcon } from '../../lucide-icon.js';
import { Text } from '../../text.js';
import { ToolbarControlGroup } from '../../toolbar-control-group.js';
import { ToolbarText } from '../../toolbar-text.js';
import { Workbench } from '../../workbench.js';
import type { CatalogEntry, CatalogProps, CatalogSection } from '../types.js';
import { CatalogResourceFooter } from './catalog-resource-footer.js';
import { CatalogSidebar } from './catalog-sidebar.js';
import { CatalogStage } from './catalog-stage.js';

function findEntry(
  sections: readonly CatalogSection[],
  id: string,
): CatalogEntry | undefined {
  for (const section of sections) {
    for (const entry of section.entries) if (entry.id === id) return entry;
  }
  return undefined;
}

/**
 * Controlled, stateless component-catalog shell: a `Workbench` whose left rail
 * is the catalog navigation and whose work area is the active entry — its
 * toolbar, description, preview stage, and resource footer. The sidebar's
 * standard toggle moves into the entry toolbar while it is collapsed, and on
 * a small screen the sidebar overlays the stage like any Workbench rail.
 */
export function Catalog({
  id = 'kui-catalog',
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
  stageRootAttributes,
  selectAction = 'catalog-select',
  toggleSidebarAction = 'catalog-toggle-sidebar',
  toggleThemeAction = 'catalog-toggle-theme',
  toggleSecondaryAction = 'catalog-toggle-secondary',
  headerPlacement = 'fixed',
  footerPlacement = 'fixed',
  className = '',
  slot,
}: CatalogProps) {
  const selected =
    findEntry(sections, active) ??
    (secondarySections
      ? findEntry(secondarySections.sections, active)
      : undefined);
  const name = selected?.name ?? '';
  const nextTheme = theme === 'dark' ? 'light' : 'dark';
  const catalogName = `${brand.title} catalog`;

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
      <Workbench
        id={id}
        label={catalogName}
        leftRail={{
          label: catalogName,
          size: 288,
          collapsed,
          toolbar: {
            label: `${catalogName} header`,
            title: (
              <>
                {brand.logoUrl ? (
                  <ToolbarControlGroup appearance="borderless" single>
                    <img class="kui-catalog__mark" src={brand.logoUrl} alt="" />
                  </ToolbarControlGroup>
                ) : null}
                <ToolbarText text={brand.title} size="large" headingLevel={1} />
              </>
            ),
            toggle: { action: toggleSidebarAction, name: catalogName },
          },
          content: (
            <CatalogSidebar
              brand={brand}
              sections={sections}
              active={active}
              secondarySections={secondarySections}
              footer={sidebarFooter}
              selectAction={selectAction}
              toggleSecondaryAction={toggleSecondaryAction}
            />
          ),
        }}
        mainToolbar={{
          label: `${name} header`,
          // The entry title stays whole; actions wrap below it when narrow.
          responsive: 'wrap',
          title: <ToolbarText text={name} size="xlarge" headingLevel={2} />,
          trailing: (
            <>
              {headerActions}
              {theme ? (
                <ToolbarControlGroup
                  appearance="borderless"
                  content="mixed"
                  size="compact"
                  label="Catalog display"
                >
                  <button
                    type="button"
                    data-action={toggleThemeAction}
                    aria-label={`Use ${nextTheme} theme`}
                    data-theme-preview={theme}
                  >
                    {nextTheme === 'dark' ? (
                      <LucideIcon icon={Moon} name="moon" />
                    ) : (
                      <LucideIcon icon={Sun} name="sun" />
                    )}
                    <span>{nextTheme === 'dark' ? 'Dark' : 'Light'}</span>
                  </button>
                </ToolbarControlGroup>
              ) : null}
            </>
          ),
        }}
        mainFooter={
          <CatalogResourceFooter
            name={name}
            resources={selected?.resources ?? []}
            related={selected?.related ?? []}
            status={status}
            selectAction={selectAction}
          />
        }
        mainHeaderPlacement={headerPlacement}
        mainFooterPlacement={footerPlacement}
        main={
          // The description is supporting copy, so it scrolls with the
          // preview rather than pinning under the toolbar.
          <List flex>
            {selected?.description ? (
              <ListInsetText
                sides="trbl"
                rootAttributes={{ 'data-catalog-description': '' }}
              >
                <Text variant="span">{selected.description}</Text>
              </ListInsetText>
            ) : null}
            <CatalogStage
              name={name}
              content={content}
              geometryOverlay={geometryOverlay}
              rootAttributes={stageRootAttributes}
            />
          </List>
        }
      />
    </main>
  );
}
