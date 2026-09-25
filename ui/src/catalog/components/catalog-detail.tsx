import { Moon, PanelLeftOpen, Sun } from 'lucide';

import { LucideIcon } from '../../lucide-icon.js';
import { Pane } from '../../pane.js';
import type { KerfUiContent } from '../../semantic-content.js';
import { Toolbar } from '../../toolbar.js';
import { ToolbarControlGroup } from '../../toolbar-control-group.js';
import { ToolbarText } from '../../toolbar-text.js';
import type { CatalogEntry } from '../types.js';
import { CatalogResourceFooter } from './catalog-resource-footer.js';
import { CatalogStage } from './catalog-stage.js';

interface CatalogDetailProps {
  brandTitle: string;
  active: string;
  selected?: CatalogEntry;
  content: KerfUiContent;
  collapsed: boolean;
  theme?: 'light' | 'dark';
  headerActions?: KerfUiContent;
  status?: KerfUiContent;
  geometryOverlay?: boolean;
  selectAction: string;
  toggleSidebarAction: string;
  toggleThemeAction: string;
}

/** Active-entry header, preview stage, and resource footer. */
export function CatalogDetail({
  brandTitle,
  active,
  selected,
  content,
  collapsed,
  theme,
  headerActions,
  status,
  geometryOverlay,
  selectAction,
  toggleSidebarAction,
  toggleThemeAction,
}: CatalogDetailProps) {
  const name = selected?.name ?? '';
  const nextTheme = theme === 'dark' ? 'light' : 'dark';

  return (
    <article class="kui-catalog__detail">
      <Pane
        header={
          <div class="kui-catalog__header">
            <Toolbar
              label={`${name} header`}
              dividerSides=""
              leading={
                <>
                  {collapsed ? (
                    <ToolbarControlGroup appearance="borderless" single>
                      <button
                        type="button"
                        data-action={toggleSidebarAction}
                        aria-label={`Expand ${brandTitle} catalog`}
                      >
                        <LucideIcon
                          icon={PanelLeftOpen}
                          name="panel-left-open"
                        />
                      </button>
                    </ToolbarControlGroup>
                  ) : null}
                  <ToolbarText text={name} size="xlarge" headingLevel={2} />
                </>
              }
              trailing={
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
              }
            />
            {selected?.description ? (
              <p class="kui-catalog__description kui-content-item">
                {selected.description}
              </p>
            ) : null}
          </div>
        }
        footer={
          <CatalogResourceFooter
            name={name}
            active={active}
            resources={selected?.resources ?? []}
            related={selected?.related ?? []}
            status={status}
            selectAction={selectAction}
          />
        }
      >
        <CatalogStage
          name={name}
          content={content}
          geometryOverlay={geometryOverlay}
        />
      </Pane>
    </article>
  );
}
