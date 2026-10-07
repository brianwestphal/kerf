import { Moon, Sun, X } from 'lucide';

import { ToolbarControlGroup } from '../../components/actions/toolbar-control-group/toolbar-control-group.js';
import { ToolbarText } from '../../components/actions/toolbar-text/toolbar-text.js';
import { ListInsetControl } from '../../components/collections/list-inset-control/list-inset-control.js';
import { ListInsetText } from '../../components/collections/list-inset-text/list-inset-text.js';
import { TokenSearchField } from '../../components/forms/token-search-field/token-search-field.js';
import { Workbench } from '../../components/layout/workbench/workbench.js';
import { LucideIcon } from '../../components/media/lucide-icon/lucide-icon.js';
import { Text } from '../../components/typography/text/text.js';
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
  backgroundStyle,
  stageRootAttributes,
  selectAction = 'catalog-select',
  toggleSidebarAction = 'catalog-toggle-sidebar',
  toggleThemeAction = 'catalog-toggle-theme',
  toggleSecondaryAction = 'catalog-toggle-secondary',
  headerPlacement = 'auto',
  footerPlacement = 'auto',
  sidebar = {},
  mainToolbar,
  footerToolbar,
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
      slot={slot}
    >
      <Workbench
        id={id}
        label={catalogName}
        leftRail={{
          label: catalogName,
          size: sidebar.size ?? 288,
          resizable: sidebar.resizable,
          separator: sidebar.separator,
          collapseMotion: sidebar.collapseMotion,
          presentation: sidebar.presentation,
          responsiveOverlayAt: sidebar.responsiveOverlayAt,
          compactOverlay: sidebar.compactOverlay,
          collapsed,
          toolbar: {
            ...sidebar.toolbar,
            label: `${catalogName} header`,
            title: (
              <>
                {brand.logoUrl ? (
                  <ToolbarControlGroup
                    appearance="borderless"
                    content="avatar"
                    shape="rounded"
                    single
                    avatarImage={brand.logoUrl}
                  >
                    {null}
                  </ToolbarControlGroup>
                ) : null}
                <ToolbarText text={brand.title} size="large" headingLevel={1} />
              </>
            ),
            toggle: { action: toggleSidebarAction, name: catalogName },
          },
          header: (
            <ListInsetControl sides="rbl">
              <TokenSearchField
                id={`${id}-filter`}
                label="Filter catalog"
                placeholder="Filter items or headings"
                editorAttributes={{ 'data-catalog-filter': '' }}
                trailingAction={{
                  icon: <LucideIcon icon={X} name="x" />,
                  label: 'Clear filter',
                  action: 'catalog-clear-filter',
                }}
              />
            </ListInsetControl>
          ),
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
          ...mainToolbar,
          label: `${name} header`,
          // The entry title stays whole; actions wrap below it when narrow.
          responsive: mainToolbar?.responsive ?? 'wrap',
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
        mainPane={{ appearance: 'sunken' }}
        mainFooter={
          <CatalogResourceFooter
            name={name}
            resources={selected?.resources ?? []}
            related={selected?.related ?? []}
            status={status}
            selectAction={selectAction}
            toolbar={footerToolbar}
          />
        }
        mainHeader={
          selected?.description ? (
            <ListInsetText
              sides="trbl"
              rootAttributes={{ 'data-catalog-description': '' }}
            >
              <Text variant="span">{selected.description}</Text>
            </ListInsetText>
          ) : null
        }
        mainHeaderPlacement={headerPlacement}
        mainFooterPlacement={footerPlacement}
        main={
          <CatalogStage
            name={name}
            content={content}
            backgroundStyle={backgroundStyle}
            rootAttributes={stageRootAttributes}
          />
        }
      />
    </main>
  );
}
