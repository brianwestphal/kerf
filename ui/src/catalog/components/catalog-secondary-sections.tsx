import { List } from '../../components/collections/list/list.js';
import { ListHeader } from '../../components/collections/list-header/list-header.js';
import { Switch } from '../../components/forms/switch/switch.js';
import type { CatalogSecondaryGroup, CatalogSection } from '../types.js';
import { CatalogSectionEntries } from './catalog-section-entries.js';

interface CatalogSecondarySectionsProps {
  group: CatalogSecondaryGroup;
  active: string;
  selectAction: string;
  toggleAction: string;
  filterAction: string;
}

/** Drop entries the tag filter hides (never the active one) and any emptied section. */
function visibleSections(
  group: CatalogSecondaryGroup,
  active: string,
): readonly CatalogSection[] {
  const filter = group.tagFilter;
  if (!filter || filter.show) return group.sections;
  return group.sections
    .map((section) => ({
      ...section,
      entries: section.entries.filter(
        (entry) => entry.id === active || !entry.tags?.includes(filter.tag),
      ),
    }))
    .filter((section) => section.entries.length > 0);
}

/** The quieter, optionally collapsible navigation below primary sections. */
export function CatalogSecondarySections({
  group,
  active,
  selectAction,
  toggleAction,
  filterAction,
}: CatalogSecondarySectionsProps) {
  const open = !group.collapsible || Boolean(group.expanded);
  return (
    <List
      dividerSides="t"
      controlInsets="t"
      rootAttributes={{ 'data-catalog-secondary-group': group.label }}
    >
      {group.collapsible ? (
        <ListHeader
          label={group.label}
          toggle
          expanded={open}
          action={toggleAction}
        />
      ) : (
        <ListHeader label={group.label} />
      )}
      <List
        gap="m"
        rootAttributes={{
          'data-catalog-secondary': '',
          'data-catalog-secondary-collapsed': String(!open),
        }}
      >
        {group.tagFilter ? (
          <List textInsets="rl">
            <Switch
              label={group.tagFilter.label}
              checked={group.tagFilter.show}
              size="compact"
              action={filterAction}
              rootAttributes={{ 'data-catalog-secondary-filter': '' }}
            />
          </List>
        ) : null}
        {visibleSections(group, active).map((section) => (
          <CatalogSectionEntries
            section={section}
            active={active}
            selectAction={selectAction}
          />
        ))}
      </List>
    </List>
  );
}
