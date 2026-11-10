import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { ColumnTrack } from '@kerfjs/ui/column-track';
import { List } from '@kerfjs/ui/list';
import { ListHeader } from '@kerfjs/ui/list-header';

import { DemoContentItem } from './demo-content-item.js';

const columns = [
  {
    id: 'todo',
    title: 'To Do',
    cards: ['Draft release notes', 'Audit tokens'],
  },
  { id: 'doing', title: 'In Progress', cards: ['Paged board snapping'] },
  { id: 'review', title: 'Review', cards: ['ColumnTrack demo', 'Docs pass'] },
  { id: 'done', title: 'Done', cards: ['Ship Button toggles'] },
  { id: 'later', title: 'Later', cards: ['File drop zone'] },
];

function board() {
  return columns.map((column) => (
    <List gap="xs" scrollable landmark="region" ariaLabel={column.title}>
      <ListHeader label={column.title} />
      {column.cards.map((card) => (
        <DemoContentItem title={card} detail={`In ${column.title}`} />
      ))}
    </List>
  ));
}

export function ColumnTrackDemo() {
  return (
    <CatalogExampleStack rootAttributes={{ 'data-demo': 'column-track' }}>
      <CatalogExample
        label="Scrolling Board"
        note="Equal columns never narrow below 250px; when they do not fit, the track scrolls sideways instead of crushing them."
        viewport={{ height: 'medium', frame: 'solid' }}
      >
        <ColumnTrack ariaLabel="Board">{board()}</ColumnTrack>
      </CatalogExample>
      <CatalogExample
        label="Paged Board"
        note='layout="paged" shows one near-full-width column per page; the next one peeks in and a swipe snaps to its start.'
        viewport={{ height: 'medium', width: 'compact', frame: 'solid' }}
      >
        <ColumnTrack layout="paged" inset="none" ariaLabel="Paged Board">
          {board()}
        </ColumnTrack>
      </CatalogExample>
    </CatalogExampleStack>
  );
}
