import { Badge } from '@kerfjs/ui/badge';
import { Button } from '@kerfjs/ui/button';
import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { Chip } from '@kerfjs/ui/chip';
import { List } from '@kerfjs/ui/list';
import { LucideIcon } from '@kerfjs/ui/lucide-icon';
import { SummaryRow } from '@kerfjs/ui/summary-row';
import { Bug, Lightbulb, ListTodo } from 'lucide';

import { summaryRowSelected } from './state.js';

const items = [
  {
    id: 'KF-12',
    icon: Bug,
    iconName: 'bug',
    title: 'Toolbar search overflows the trailing zone on narrow rails',
    updated: '2m',
    status: 'Started',
    tone: 'info',
    rail: 'warning',
    tags: ['toolbar', 'layout'],
  },
  {
    id: 'KF-13',
    icon: Lightbulb,
    iconName: 'lightbulb',
    title: 'Paged board snapping with a peeking next column',
    updated: '1h',
    status: 'Not started',
    tone: 'neutral',
    rail: undefined,
    tags: ['board'],
  },
  {
    id: 'KF-14',
    icon: ListTodo,
    iconName: 'list-todo',
    title: 'Document the summary row in the selection guide',
    updated: '3d',
    status: 'Completed',
    tone: 'success',
    rail: undefined,
    tags: [],
    dimmed: true,
  },
] as const;

const edges = ['start', undefined, 'end'] as const;

function rows(presentation: 'row' | 'card') {
  return items.map((item, index) => (
    <SummaryRow
      presentation={presentation}
      listEdge={presentation === 'row' ? edges[index] : undefined}
      selected={summaryRowSelected.value === item.id}
      rail={item.rail}
      dimmed={'dimmed' in item}
      leading={<LucideIcon icon={item.icon} name={item.iconName} />}
      trailingMeta={item.updated}
      title={
        <>
          <strong>{item.id}</strong> {item.title}
        </>
      }
      metadata={
        <>
          <Badge tone={item.tone} size="compact">
            {item.status}
          </Badge>
          {item.tags.map((tag) => (
            <Chip size="compact">{tag}</Chip>
          ))}
        </>
      }
      rootAttributes={{
        'data-action': 'select-summary-row-demo',
        'data-item-id': item.id,
      }}
    />
  ));
}

export function SummaryRowDemo() {
  return (
    <CatalogExampleStack rootAttributes={{ 'data-demo': 'summary-row' }}>
      <CatalogExample
        label="List Section"
        note="Rows round at the section's edges, clip long titles to two lines, float the timestamp at the title's end, and show the selection; click a row to select it."
        viewport={{ width: 'medium', surface: 'lowered', frame: 'solid' }}
      >
        <List controlInsets="trbl">
          <div role="listbox" aria-label="Tickets">
            {rows('row')}
          </div>
        </List>
      </CatalogExample>
      <CatalogExample
        label="Board Cards"
        note='presentation="card" is a borderless rounded card that allows four title lines.'
        viewport={{ width: 'compact', surface: 'lowered', frame: 'solid' }}
      >
        <div role="listbox" aria-label="Board Column">
          <List gap="xs" controlInsets="trbl">
            {rows('card')}
          </List>
        </div>
      </CatalogExample>
      <CatalogExample
        label="Diagnostic Group"
        note="A labeled static row keeps the danger rail and selection fill while its nested Open button owns keyboard focus and activation."
        viewport={{ width: 'compact', surface: 'lowered', frame: 'solid' }}
      >
        <SummaryRow
          semanticRole="group"
          ariaLabel="Unreadable ticket diagnostic"
          presentation="row"
          listEdge="only"
          rail="danger"
          selected
          leading={<LucideIcon icon={Bug} name="bug" />}
          title={
            <>
              <strong>Unreadable ticket</strong>
              {'\u00a0'}
              <Button size="compact" emphasis="secondary" action="log-more">
                Open
              </Button>
            </>
          }
          metadata={
            <Badge tone="danger" size="compact">
              Needs recovery
            </Badge>
          }
        />
      </CatalogExample>
    </CatalogExampleStack>
  );
}
