import './view-transition-list-row.css';

import { ContentItem } from '@kerfjs/ui/content-item';
import { Text } from '@kerfjs/ui/text';

import type { ViewTransitionListRow as Row } from './demos/view-transition-list-state.js';

/** Catalog-owned wrapper: each row gets one stable document transition name. */
export function ViewTransitionListRow({ row }: { row: Row }) {
  return (
    <div
      class="view-transition-list-row"
      data-key={row.id}
      data-vt-row={row.id}
    >
      <ContentItem appearance="surface" frame="framed">
        <Text>{row.label}</Text>
      </ContentItem>
    </div>
  );
}
