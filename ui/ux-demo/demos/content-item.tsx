import '@awesome.me/webawesome/dist/components/button/button.js';

import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import type { ContentItemAppearance } from '@kerfjs/ui/content-item';
import { ContentItem } from '@kerfjs/ui/content-item';
import { rem } from '@kerfjs/ui/css-values';
import { Grid } from '@kerfjs/ui/grid';
import { List } from '@kerfjs/ui/list';
import { Pane } from '@kerfjs/ui/pane';
import { PopupMenu } from '@kerfjs/ui/popup-menu';
import { Row } from '@kerfjs/ui/row';
import { Text } from '@kerfjs/ui/text';

import {
  contentCardChoice,
  contentCardSelected,
  contentCardSelections,
} from './state.js';

const appearances = [
  'transparent',
  'surface',
  'neutral',
  'info',
  'pop',
  'success',
  'warning',
  'danger',
] as const satisfies readonly ContentItemAppearance[];

function itemCopy(title: string, detail: string) {
  return (
    <List gap="2xs">
      <Text variant="span">
        <strong>{title}</strong>
      </Text>
      <Text variant="span" tone="quiet" size="compact">
        {detail}
      </Text>
    </List>
  );
}

export function ContentItemDemo() {
  return (
    <CatalogExampleStack rootAttributes={{ 'data-demo': 'content-item' }}>
      <CatalogExample
        label="Unframed and framed items"
        note={
          <>
            Every item reserves the same 1px border, so an unframed item and a{' '}
            <code>frame="framed"</code> item share one content edge. Frame an
            item only when it marks a real distinction.
          </>
        }
        align="none"
      >
        <Pane label="Content items">
          <ContentItem rootAttributes={{ 'data-demo-item': 'plain' }}>
            {itemCopy(
              'Workspace details',
              'An ordinary item sits directly on the surface.',
            )}
          </ContentItem>
          <ContentItem
            frame="framed"
            rootAttributes={{ 'data-demo-item': 'framed' }}
          >
            {itemCopy(
              'Unsaved changes',
              'A framed item reads as visibly bounded without moving its content.',
            )}
          </ContentItem>
        </Pane>
      </CatalogExample>
      <CatalogExample
        label="Focusable item and outlined drop target"
        note="A static item may enter the tab order without becoming an action. outlined keeps the same ring visible for a drop target."
        align="none"
      >
        <Pane label="Drop target items">
          <ContentItem
            tabIndex={0}
            outlined
            rootAttributes={{ 'data-demo-item': 'outlined' }}
          >
            {itemCopy('Drop target', 'Drop a file here or focus this item.')}
          </ContentItem>
        </Pane>
      </CatalogExample>
      <CatalogExample
        label="Surface and semantic appearances"
        note="Transparent preserves the surrounding surface; surface adds the base fill. Semantic appearances coordinate the same status fills, borders, and foregrounds as StateBanner."
        align="none"
      >
        <Grid
          minColumnWidth={rem(12)}
          gap="xs"
          rootAttributes={{ 'data-demo-item-appearances': '' }}
        >
          {appearances.map((appearance) => (
            <ContentItem
              appearance={appearance}
              rootAttributes={{
                'data-demo-item': `appearance-${appearance}`,
              }}
            >
              <Text variant="span">
                <strong>{appearance}</strong>
              </Text>
            </ContentItem>
          ))}
        </Grid>
      </CatalogExample>
      <CatalogExample
        label="Flush content and separate card actions"
        note="Flush removes block padding and borders. A rich card keeps its primary and secondary buttons as siblings inside a static item."
        align="none"
      >
        <Pane label="Quotation preview">
          <ContentItem flush rootAttributes={{ 'data-demo-item': 'flush' }}>
            <Text variant="p">
              A compact markdown preview can reach the item's block edges.
            </Text>
          </ContentItem>
          <ContentItem
            frame="framed"
            rootAttributes={{ 'data-demo-item': 'multi-action-card' }}
          >
            <Row vAlign="middle" wrap>
              <wa-button appearance="plain" data-action="log-card-primary">
                Open quotation
              </wa-button>
              <wa-button appearance="plain" data-action="log-more">
                More actions
              </wa-button>
            </Row>
          </ContentItem>
        </Pane>
      </CatalogExample>
      <CatalogExample
        label="Pill shape"
        note={
          <>
            <code>shape="pill"</code> selects the 22px radius that matches pill
            controls.
          </>
        }
        align="none"
      >
        <Pane label="Pill content item">
          <ContentItem
            frame="framed"
            shape="pill"
            rootAttributes={{ 'data-demo-item': 'pill' }}
          >
            <Text variant="span">Three reviewers approved this change.</Text>
          </ContentItem>
        </Pane>
      </CatalogExample>
      <CatalogExample
        label="Interactive cards"
        note="Enter and Space activate the focused card; selection keeps the reserved border geometry."
        align="none"
      >
        <Pane label="Interactive content items" appearance="sunken">
          <ContentItem
            interactive
            action="toggle-content-card"
            itemId="line-42"
            selectionMode="toggle"
            selected={contentCardSelected.value}
            ariaLabel="Line item 42"
            title="Edit this quotation"
            rootAttributes={{ 'data-demo-item': 'toggle-card' }}
          >
            {itemCopy('Line item 42', 'Select this item for review.')}
          </ContentItem>
          <ContentItem
            interactive
            action="toggle-content-card"
            itemId="card-with-action"
            selectionMode="toggle"
            selected={false}
            ariaLabel="Card with nested action"
            rootAttributes={{ 'data-demo-item': 'card-with-action' }}
          >
            {itemCopy('Card with action', 'The inner button acts on its own.')}
            <wa-button appearance="plain" data-action="log-more">
              More actions
            </wa-button>
          </ContentItem>
          <ContentItem
            interactive
            action="toggle-content-card"
            itemId="locked-card"
            disabled
            ariaLabel="Locked item"
            rootAttributes={{ 'data-demo-item': 'disabled-card' }}
          >
            {itemCopy('Locked item', 'Unavailable while processing.')}
          </ContentItem>
          <div role="listbox" aria-label="Documents">
            {(['document-a', 'document-b'] as const).map((id) => (
              <ContentItem
                interactive
                action="choose-content-card"
                itemId={id}
                selectionMode="single"
                selected={contentCardChoice.value === id}
                ariaLabel={id === 'document-a' ? 'Document A' : 'Document B'}
                rootAttributes={{ 'data-demo-item': id }}
              >
                {itemCopy(
                  id === 'document-a' ? 'Document A' : 'Document B',
                  'Choose a document.',
                )}
              </ContentItem>
            ))}
          </div>
        </Pane>
      </CatalogExample>
      <CatalogExample
        label="Selectable rich cards"
        note="Each card is a focusable grid row. Its buttons and decision control keep independent actions; the app owns multi-selection."
        align="none"
      >
        <List selectionMode="multiple" ariaLabel="Demand lines">
          {(['demand-a', 'demand-b'] as const).map((id) => (
            <ContentItem
              interactive
              action="select-rich-card"
              itemId={id}
              selectionMode="multiple"
              selected={contentCardSelections.value.includes(id)}
              ariaLabel={id === 'demand-a' ? 'Demand line A' : 'Demand line B'}
              rootAttributes={{ 'data-demo-item': id }}
            >
              <Row vAlign="middle" wrap>
                {itemCopy(
                  id === 'demand-a' ? 'Demand line A' : 'Demand line B',
                  'Review the quote and choose a decision.',
                )}
                <button type="button" data-action="log-card-primary">
                  Open quote
                </button>
                <PopupMenu
                  text="More actions"
                  items={[{ label: 'Show details', action: 'log-more' }]}
                />
                <button
                  type="button"
                  data-action="log-decision"
                  data-decision="approve"
                >
                  Approve
                </button>
              </Row>
            </ContentItem>
          ))}
        </List>
      </CatalogExample>
    </CatalogExampleStack>
  );
}
