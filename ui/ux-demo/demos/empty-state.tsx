import { Button } from '@kerfjs/ui/button';
import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { Disclosure } from '@kerfjs/ui/disclosure';
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
          title="Nothing Here Yet"
          detail="Create the first item when you are ready."
          icon={<LucideIcon icon={Search} name="search" />}
          action={<Button action="log-add">Create Item</Button>}
        />
      </CatalogExample>
      <CatalogExample
        label="Unavailable With Details"
        note="Recovery controls stay centered while technical details read from the start edge."
        align="none"
      >
        <EmptyState
          title="Project Unavailable"
          detail="We could not load this project. Try again or return to your projects."
          action={<Button action="log-add">Try Again</Button>}
          secondaryContent={
            <Disclosure title="Technical Details" open>
              <span>Could not find the requested project.</span>
            </Disclosure>
          }
        />
      </CatalogExample>
      <CatalogExample
        label="Busy"
        note="A busy state; the current view stays stable while loading."
        align="none"
      >
        <EmptyState
          title="Loading Items"
          detail="The current view will remain stable."
          busy
        />
      </CatalogExample>
    </CatalogExampleStack>
  );
}
