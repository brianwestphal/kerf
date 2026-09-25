import { List } from '../../list.js';
import { ListHeader } from '../../list-header.js';
import { ListItem } from '../../list-item.js';
import type { CatalogSection } from '../types.js';

interface CatalogSectionListProps {
  sections: readonly CatalogSection[];
  active: string;
  selectAction: string;
}

/** The primary category sections in the catalog navigation. */
export function CatalogSectionList({
  sections,
  active,
  selectAction,
}: CatalogSectionListProps) {
  return (
    <div class="kui-catalog__sections">
      {sections.map((section) => (
        <section class="kui-catalog__group">
          <ListHeader label={section.category} />
          <div class="kui-catalog__items">
            <List gap="2xs">
              {section.entries.map((entry) => (
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
          </div>
        </section>
      ))}
    </div>
  );
}
