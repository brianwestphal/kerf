import { List } from '../../list.js';
import { ListHeader } from '../../list-header.js';
import { ListItem } from '../../list-item.js';
import type { CatalogEntry, CatalogSection } from '../types.js';

/** One labeled section of catalog entries. */
export function CatalogSectionEntries({
  section,
  active,
  selectAction,
}: {
  section: CatalogSection;
  active: string;
  selectAction: string;
}) {
  return (
    <List rootAttributes={{ 'data-catalog-section': section.category }}>
      <ListHeader label={section.category} />
      <List gap="2xs">
        {section.entries.map((entry: CatalogEntry) => (
          <ListItem
            action={selectAction}
            itemId={entry.id}
            label={entry.name}
            status={entry.tags?.join(' · ')}
            selected={active === entry.id}
            title={entry.description}
            multiline
          />
        ))}
      </List>
    </List>
  );
}
