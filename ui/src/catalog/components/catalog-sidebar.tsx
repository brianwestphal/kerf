import { PanelLeftClose } from 'lucide';

import { LucideIcon } from '../../lucide-icon.js';
import { Pane } from '../../pane.js';
import type { KerfUiContent } from '../../semantic-content.js';
import { Toolbar } from '../../toolbar.js';
import { ToolbarControlGroup } from '../../toolbar-control-group.js';
import { ToolbarText } from '../../toolbar-text.js';
import type {
  CatalogBrand,
  CatalogSecondaryGroup,
  CatalogSection,
} from '../types.js';
import { CatalogSecondarySections } from './catalog-secondary-sections.js';
import { CatalogSectionList } from './catalog-section-list.js';

interface CatalogSidebarProps {
  brand: CatalogBrand;
  sections: readonly CatalogSection[];
  active: string;
  collapsed: boolean;
  secondarySections?: CatalogSecondaryGroup;
  footer?: KerfUiContent;
  selectAction: string;
  toggleSidebarAction: string;
  toggleSecondaryAction: string;
}

export function CatalogSidebar({
  brand,
  sections,
  active,
  collapsed,
  secondarySections,
  footer,
  selectAction,
  toggleSidebarAction,
  toggleSecondaryAction,
}: CatalogSidebarProps) {
  return (
    <aside
      class="kui-catalog__sidebar"
      aria-label={`${brand.title} catalog`}
      data-collapsed={String(collapsed)}
    >
      <Pane
        header={
          <div class="kui-catalog__brand">
            <Toolbar
              label={`${brand.title} catalog header`}
              dividerSides=""
              leading={
                <>
                  {brand.logoUrl ? (
                    <ToolbarControlGroup appearance="borderless" single>
                      <img
                        class="kui-catalog__mark"
                        src={brand.logoUrl}
                        alt=""
                      />
                    </ToolbarControlGroup>
                  ) : null}
                  <ToolbarText
                    text={brand.title}
                    size="large"
                    headingLevel={1}
                  />
                </>
              }
              trailing={
                <ToolbarControlGroup appearance="borderless" single>
                  <button
                    type="button"
                    data-action={toggleSidebarAction}
                    aria-label={`Collapse ${brand.title} catalog`}
                  >
                    <LucideIcon icon={PanelLeftClose} name="panel-left-close" />
                  </button>
                </ToolbarControlGroup>
              }
            />
            {brand.subtitle ? (
              <p class="kui-catalog__subtitle">{brand.subtitle}</p>
            ) : null}
          </div>
        }
      >
        <nav
          class="kui-catalog__navigation"
          aria-label={`${brand.title} components`}
        >
          <CatalogSectionList
            sections={sections}
            active={active}
            selectAction={selectAction}
          />
          {secondarySections ? (
            <CatalogSecondarySections
              group={secondarySections}
              active={active}
              selectAction={selectAction}
              toggleAction={toggleSecondaryAction}
            />
          ) : null}
          {footer}
        </nav>
      </Pane>
    </aside>
  );
}
