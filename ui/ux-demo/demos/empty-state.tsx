import { CatalogExample } from '@kerfjs/ui/catalog';
import { EmptyState } from '@kerfjs/ui/empty-state';
import { Search } from 'lucide';

import { button, icon } from './state.js';

export function EmptyStateDemo() {
  return <div class="kui-catalog-example-stack" data-demo="empty-state">
    <CatalogExample label="Actionable" note={<>An empty state that offers a recovery action.</>} align="none"><EmptyState title="Nothing here yet" detail="Create the first item when you are ready." icon={icon(Search, 'search')} action={button('Create item', 'log-add')} /></CatalogExample>
    <CatalogExample label="Busy" note={<>A busy state; the current view stays stable while loading.</>} align="none"><EmptyState title="Loading items" detail="The current view will remain stable." busy /></CatalogExample>
  </div>;
}
