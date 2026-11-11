import { Badge } from '@kerfjs/ui/badge';
import { Button } from '@kerfjs/ui/button';
import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { Chip } from '@kerfjs/ui/chip';
import { List } from '@kerfjs/ui/list';
import { ListHeader } from '@kerfjs/ui/list-header';
import { LucideIcon } from '@kerfjs/ui/lucide-icon';
import { SummaryRow } from '@kerfjs/ui/summary-row';
import { Text } from '@kerfjs/ui/text';
import { Bug, Lightbulb, ListTodo } from 'lucide';

import { summaryRowSectionOpen, summaryRowSelected } from './state.js';

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
      draggable
      listEdge={presentation === 'row' ? edges[index] : undefined}
      selected={summaryRowSelected.value === item.id}
      rail={item.rail}
      dimmed={'dimmed' in item}
      leading={<LucideIcon icon={item.icon} name={item.iconName} />}
      trailingMeta={item.updated}
      title={
        <>
          <Text variant="span" weight="strong">
            {item.id}
          </Text>
          <Text variant="span">{` ${item.title}`}</Text>
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
        <List controlInsets="trbl" selectionMode="single" ariaLabel="Tickets">
          {rows('row')}
        </List>
      </CatalogExample>
      <CatalogExample
        label="Section Header on the Rows' Edge"
        note='leadingEdge="summary-row" starts the header label on the rows&apos; leading-content edge, and compacts with them in a narrow column.'
        viewport={{ width: 'medium', surface: 'lowered', frame: 'solid' }}
        rootAttributes={{ 'data-demo-summary-row-header': '' }}
      >
        <List controlInsets="trbl">
          <ListHeader
            label="Started"
            count={3}
            countLabel="3 started tickets"
            size="m"
            leadingEdge="summary-row"
            toggle
            expanded={summaryRowSectionOpen.value}
            action="toggle-summary-row-section"
            controls="summary-row-section-rows"
          />
          <List
            id="summary-row-section-rows"
            hidden={!summaryRowSectionOpen.value}
            selectionMode="single"
            ariaLabel="Started"
          >
            {rows('row')}
          </List>
        </List>
      </CatalogExample>
      <CatalogExample
        label="Board Cards"
        note='presentation="card" is a borderless rounded card that allows four title lines.'
        viewport={{ width: 'compact', surface: 'lowered', frame: 'solid' }}
      >
        <List
          gap="xs"
          controlInsets="trbl"
          selectionMode="single"
          ariaLabel="Board Column"
        >
          {rows('card')}
        </List>
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
              <Text variant="span" weight="strong">
                {'Unreadable ticket\u00a0'}
              </Text>
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
