import { List } from '../../components/collections/list/list.js';
import { ListInsetText } from '../../components/collections/list-inset-text/list-inset-text.js';
import { Text } from '../../components/typography/text/text.js';
import type { KerfUiContent } from '../../shared/content/semantic-content.js';
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
  secondarySections?: CatalogSecondaryGroup;
  footer?: KerfUiContent;
  selectAction: string;
  toggleSecondaryAction: string;
}

/** The catalog navigation: brand subtitle, entry sections, and footer. */
export function CatalogSidebar({
  brand,
  sections,
  active,
  secondarySections,
  footer,
  selectAction,
  toggleSecondaryAction,
}: CatalogSidebarProps) {
  return (
    <nav aria-label={`${brand.title} components`}>
      <List gap="m" controlInsets="b">
        {brand.subtitle ? (
          <ListInsetText sides="rl">
            <Text variant="span" size="compact" tone="quiet">
              {brand.subtitle}
            </Text>
          </ListInsetText>
        ) : null}
        <ListInsetText sides="rl">
          <input
            class="kui-catalog__filter"
            type="search"
            aria-label="Filter catalog"
            placeholder="Filter items or headings"
            autocomplete="off"
            data-catalog-filter
          />
        </ListInsetText>
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
        <ListInsetText
          sides="rl"
          rootAttributes={{ 'data-catalog-filter-empty': '' }}
        >
          <Text variant="span" tone="quiet">
            No matching items
          </Text>
        </ListInsetText>
        {footer}
      </List>
    </nav>
  );
}
