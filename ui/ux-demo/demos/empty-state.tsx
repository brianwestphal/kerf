import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { EmptyState } from '@kerfjs/ui/empty-state';
import { LucideIcon } from '@kerfjs/ui/lucide-icon';
import { Search } from 'lucide';

export function EmptyStateDemo() {
  return (
    <CatalogExampleStack rootAttributes={{ 'data-demo': 'empty-state' }}>
      <CatalogExample
        label="Actionable"
        note="An empty state that offers a recovery action."
        align="none"
      >
        <EmptyState
          title="Nothing here yet"
          detail="Create the first item when you are ready."
          icon={<LucideIcon icon={Search} name="search" />}
          action={
            <button type="button" data-action="log-add">
              Create item
            </button>
          }
        />
      </CatalogExample>
      <CatalogExample
        label="Busy"
        note="A busy state; the current view stays stable while loading."
        align="none"
      >
        <EmptyState
          title="Loading items"
          detail="The current view will remain stable."
          busy
        />
      </CatalogExample>
    </CatalogExampleStack>
  );
}
