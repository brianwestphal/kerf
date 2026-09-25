import { List } from '../../list.js';
import { ListHeader } from '../../list-header.js';
import { ListItem } from '../../list-item.js';
import type { CatalogSecondaryGroup } from '../types.js';

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
  return (
    <section class="kui-catalog__group--secondary">
      {group.collapsible ? (
        <ListHeader
          label={group.label}
          toggle
          expanded={Boolean(group.expanded)}
          action={toggleAction}
        />
      ) : (
        <ListHeader label={group.label} />
      )}
      {!group.collapsible || group.expanded ? (
        <div class="kui-catalog__secondary" data-catalog-secondary>
          {group.sections.map((section) => (
            <section class="kui-catalog__secondary-group">
              <h3 class="kui-catalog__secondary-heading">{section.category}</h3>
              <div class="kui-catalog__secondary-items">
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
      ) : null}
    </section>
  );
}
