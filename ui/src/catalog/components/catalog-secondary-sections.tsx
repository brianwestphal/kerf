import { List } from '../../list.js';
import { ListHeader } from '../../list-header.js';
import type { CatalogSecondaryGroup } from '../types.js';
import { CatalogSectionEntries } from './catalog-section-entries.js';

interface CatalogSecondarySectionsProps {
  group: CatalogSecondaryGroup;
  active: string;
  selectAction: string;
  toggleAction: string;
}

/** The quieter, optionally collapsible navigation below primary sections. */
export function CatalogSecondarySections({
  group,
  active,
  selectAction,
  toggleAction,
}: CatalogSecondarySectionsProps) {
  const open = !group.collapsible || Boolean(group.expanded);
  return (
    <List dividerSides="t" controlInsets="t">
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
      {open ? (
        <List gap="m" rootAttributes={{ 'data-catalog-secondary': '' }}>
          {group.sections.map((section) => (
            <CatalogSectionEntries
              section={section}
              active={active}
              selectAction={selectAction}
            />
          ))}
        </List>
      ) : null}
    </List>
  );
}
