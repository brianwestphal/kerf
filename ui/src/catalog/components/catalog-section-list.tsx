import type { CatalogSection } from '../types.js';
import { CatalogSectionEntries } from './catalog-section-entries.js';

/** The primary category sections in the catalog navigation. */
export function CatalogSectionList({
  sections,
  active,
  selectAction,
}: {
  sections: readonly CatalogSection[];
  active: string;
  selectAction: string;
}) {
  return (
    <>
      {sections.map((section) => (
        <CatalogSectionEntries
          section={section}
          active={active}
          selectAction={selectAction}
        />
      ))}
    </>
  );
}
