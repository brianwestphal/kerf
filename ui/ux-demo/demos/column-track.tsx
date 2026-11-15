import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { ColumnTrack } from '@kerfjs/ui/column-track';
import { List } from '@kerfjs/ui/list';
import { ListHeader } from '@kerfjs/ui/list-header';
import { wireColumnTracks } from '@kerfjs/ui/wire-column-tracks';

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

/** A timeline whose current work is at the far end. */
const timeline = [
  { id: 'later', title: 'Later', cards: ['File drop zone'] },
  { id: 'then', title: 'Then', cards: ['Docs pass'] },
  { id: 'next', title: 'Next', cards: ['Audit tokens'] },
  { id: 'working', title: 'Working Now', cards: ['ColumnTrack start'] },
  { id: 'done', title: 'Done', cards: ['Ship Button toggles'] },
];

/** Opens the boards that name a `start` column; the others need no wiring. */
export function wireColumnTrackDemo(canvas: HTMLElement): () => void {
  return wireColumnTracks(canvas);
}

function board(lanes: readonly (typeof columns)[number][] = columns) {
  return lanes.map((column) => (
    <List
      gap="xs"
      scrollable
      landmark="region"
      ariaLabel={column.title}
      rootAttributes={{ 'data-column-id': column.id }}
    >
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
      <CatalogExample
        label="Opens at the End"
        note='start="end" opens a timeline whose current work is last, and keeps it in view as the track resizes until the person scrolls.'
        viewport={{ height: 'medium', frame: 'solid' }}
      >
        <ColumnTrack ariaLabel="Timeline" start="end">
          {board(timeline)}
        </ColumnTrack>
      </CatalogExample>
      <CatalogExample
        label="Opens on a Column"
        note="start={{ column }} opens a paged board on the column whose data-column-id matches."
        viewport={{ height: 'medium', width: 'compact', frame: 'solid' }}
      >
        <ColumnTrack
          layout="paged"
          inset="none"
          ariaLabel="Paged Timeline"
          start={{ column: 'working' }}
        >
          {board(timeline)}
        </ColumnTrack>
      </CatalogExample>
    </CatalogExampleStack>
  );
}
