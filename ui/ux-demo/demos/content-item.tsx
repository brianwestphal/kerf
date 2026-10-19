import { Button } from '@kerfjs/ui/button';
import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import type { ContentItemAppearance } from '@kerfjs/ui/content-item';
import { ContentItem } from '@kerfjs/ui/content-item';
import { fillColor, rem } from '@kerfjs/ui/css-values';
import { Grid } from '@kerfjs/ui/grid';
import { List } from '@kerfjs/ui/list';
import { Pane } from '@kerfjs/ui/pane';
import { PopupMenu } from '@kerfjs/ui/popup-menu';
import { Row } from '@kerfjs/ui/row';
import { Text } from '@kerfjs/ui/text';

import {
  SKYLINE,
  SKYLINE_BLURRED,
  svgUrl,
} from '../components/sample-artwork.js';
import {
  contentCardChoice,
  contentCardSelected,
  contentCardSelections,
  conversationSelections,
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
        label="Image-Tinted Feed Cards"
        note="Each ContentItem composes BackdropImage for its lead media, with an independent scroll timeline in the shared Pane. The last card adds an edge-to-edge image, fade, scrim, and overlay."
        align="none"
        viewport={{
          layout: 'grid',
          width: 'medium',
          height: 'tall',
          surface: 'default',
        }}
      >
        <Pane
          label="Stories"
          rootAttributes={{ 'data-content-item-feed': 'true' }}
        >
          {['Harbor at dusk', 'Morning coastline', 'Night crossing'].map(
            (title, index) => (
              <ContentItem
                appearance="surface"
                frame="framed"
                media={{
                  src: svgUrl(SKYLINE),
                  alt: '',
                  blurredSrc: svgUrl(SKYLINE_BLURRED),
                  aspectRatio: 16 / 9,
                  parallax: 'subtle',
                  deferOffscreen: true,
                  ...(index === 2
                    ? {
                        fadeTo: fillColor('#283a54'),
                        overlay: <Button action="log-more">Explore</Button>,
                        scrim: 'bottom' as const,
                        edgeToEdge: true,
                      }
                    : {}),
                }}
                tint={{
                  color: fillColor(index === 1 ? '#dad9c8' : '#283a54'),
                  scheme: index === 1 ? 'light' : 'dark',
                  accent: fillColor(index === 1 ? '#67502b' : '#8cb7df'),
                }}
                rootAttributes={{ 'data-feed-card': String(index + 1) }}
              >
                <List gap="2xs">
                  <Text variant="span">
                    <strong>{title}</strong>
                  </Text>
                  <Text variant="span" tone="quiet">
                    A short dispatch from the coast.
                  </Text>
                  <Row vAlign="middle">
                    <a href="#source">Source</a>
                    <Button emphasis="plain" action="log-more">
                      Save
                    </Button>
                  </Row>
                </List>
              </ContentItem>
            ),
          )}
          <ContentItem
            appearance="surface"
            rootAttributes={{ 'data-feed-card': 'no-image' }}
          >
            {itemCopy(
              'Text-only update',
              'No image is available for this story.',
            )}
          </ContentItem>
        </Pane>
      </CatalogExample>
      <CatalogExample
        label="Unframed and Framed Items"
        note={
          <>
            Every item reserves the same 1px border, so an unframed item and a{' '}
            <code>frame="framed"</code> item share one content edge. Frame an
            item only when it marks a real distinction.
          </>
        }
        align="none"
      >
        <Pane label="Content Items">
          <ContentItem rootAttributes={{ 'data-demo-item': 'plain' }}>
            {itemCopy(
              'Workspace Details',
              'An ordinary item sits directly on the surface.',
            )}
          </ContentItem>
          <ContentItem
            frame="framed"
            rootAttributes={{ 'data-demo-item': 'framed' }}
          >
            {itemCopy(
              'Unsaved Changes',
              'A framed item reads as visibly bounded without moving its content.',
            )}
          </ContentItem>
        </Pane>
      </CatalogExample>
      <CatalogExample
        label="Focusable Item and Outlined Drop Target"
        note="A static item may enter the tab order without becoming an action. outlined keeps the same ring visible for a drop target."
        align="none"
      >
        <Pane label="Drop Target Items" deepInset>
          <ContentItem
            tabIndex={0}
            outlined
            rootAttributes={{ 'data-demo-item': 'outlined' }}
          >
            {itemCopy('Drop Target', 'Drop a file here or focus this item.')}
          </ContentItem>
        </Pane>
      </CatalogExample>
      <CatalogExample
        label="Surface and Semantic Appearances"
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
        label="Flush Content and Separate Card Actions"
        note="Flush removes block padding and borders. A rich card keeps its primary and secondary buttons as siblings inside a static item."
        align="none"
      >
        <Pane label="Quotation Preview">
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
              <Button emphasis="plain" action="log-card-primary">
                Open Quotation
              </Button>
              <Button emphasis="plain" action="log-more">
                More Actions
              </Button>
            </Row>
          </ContentItem>
        </Pane>
      </CatalogExample>
      <CatalogExample
        label="Transcript Bubbles"
        note={
          <>
            <code>bubble</code> fits an item to its message up to 80% of the
            row: <code>start</code> for other participants and <code>end</code>{' '}
            with the <code>brand-loud</code> appearance for the person's own
            messages.
          </>
        }
        align="none"
        viewport={{ width: 'medium' }}
      >
        <Pane label="Assistant Conversation">
          <List gap="xs" rootAttributes={{ 'data-demo-transcript': '' }}>
            <ContentItem
              bubble="end"
              appearance="brand-loud"
              rootAttributes={{ 'data-demo-bubble': 'user' }}
            >
              <Text variant="span">Summarize the failing checks.</Text>
            </ContentItem>
            <ContentItem
              bubble="start"
              appearance="neutral"
              rootAttributes={{ 'data-demo-bubble': 'assistant' }}
            >
              <Text variant="span">
                Two checks fail: the bundle budget grew by 213 bytes, and the
                design-template drift render is missing the new variant.
              </Text>
            </ContentItem>
            <ContentItem bubble="end" appearance="brand-loud">
              <Text variant="span">Thanks!</Text>
            </ContentItem>
          </List>
        </Pane>
      </CatalogExample>
      <CatalogExample
        label="Pill Shape"
        note={
          <>
            <code>shape="pill"</code> selects the 22px radius that matches pill
            controls.
          </>
        }
        align="none"
      >
        <Pane label="Pill Content Item">
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
        label="Interactive Cards"
        note="Enter and Space activate the focused card; selection keeps the reserved border geometry."
        align="none"
      >
        <Pane label="Interactive Content Items" appearance="sunken">
          <ContentItem
            interactive
            action="toggle-content-card"
            itemId="line-42"
            selectionMode="toggle"
            selected={contentCardSelected.value}
            ariaLabel="Line Item 42"
            title="Edit this quotation"
            rootAttributes={{ 'data-demo-item': 'toggle-card' }}
          >
            {itemCopy('Line Item 42', 'Select this item for review.')}
          </ContentItem>
          <ContentItem
            interactive
            action="toggle-content-card"
            itemId="card-with-action"
            selectionMode="toggle"
            selected={false}
            ariaLabel="Card with Action"
            rootAttributes={{ 'data-demo-item': 'card-with-action' }}
          >
            {itemCopy('Card with Action', 'The inner button acts on its own.')}
            <Button emphasis="plain" action="log-more">
              More Actions
            </Button>
          </ContentItem>
          <ContentItem
            interactive
            action="toggle-content-card"
            itemId="locked-card"
            disabled
            ariaLabel="Locked Item"
            rootAttributes={{ 'data-demo-item': 'disabled-card' }}
          >
            {itemCopy('Locked Item', 'Unavailable while processing.')}
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
        label="Selectable Rich Cards"
        note="Each card is a focusable grid row. Its buttons and decision control keep independent actions; the app owns multi-selection."
        align="none"
      >
        <List selectionMode="multiple" ariaLabel="Demand Lines">
          {(['demand-a', 'demand-b'] as const).map((id) => (
            <ContentItem
              interactive
              action="select-rich-card"
              itemId={id}
              selectionMode="multiple"
              selected={contentCardSelections.value.includes(id)}
              ariaLabel={id === 'demand-a' ? 'Demand Line A' : 'Demand Line B'}
              rootAttributes={{ 'data-demo-item': id }}
            >
              <Row vAlign="middle" wrap>
                {itemCopy(
                  id === 'demand-a' ? 'Demand Line A' : 'Demand Line B',
                  'Review the quote and choose a decision.',
                )}
                <button type="button" data-action="log-card-primary">
                  Open Quote
                </button>
                <PopupMenu
                  text="More Actions"
                  items={[{ label: 'Show Details', action: 'log-more' }]}
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
      <CatalogExample
        label="Mixed Selectable and Non-Selectable Rows"
        note="A transcript mixes selectable messages with rows that are not selectable: a gridRow item is a grid row with a gridcell and no selection. The grid is one Tab stop; arrow keys move between messages and skip the other rows, whose controls stay reachable by Tab."
        align="none"
      >
        <List selectionMode="multiple" ariaLabel="Conversation">
          {(
            [
              ['message-1', 'Why did the nightly build fail?'],
              ['message-2', 'The bundle budget check failed.'],
            ] as const
          ).map(([id, text]) => (
            <ContentItem
              interactive
              action="select-conversation-message"
              itemId={id}
              selectionMode="multiple"
              selected={conversationSelections.value.includes(id)}
              ariaLabel={text}
            >
              <Text variant="span">{text}</Text>
            </ContentItem>
          ))}
          <ContentItem gridRow>
            <Text variant="span" tone="quiet" size="compact">
              3 messages skipped
            </Text>
          </ContentItem>
          <ContentItem gridRow appearance="surface" frame="framed">
            <Row vAlign="middle">
              <Text variant="span">Ran 4 checks</Text>
              <Button size="compact" emphasis="secondary" action="log-more">
                Show Activity
              </Button>
            </Row>
          </ContentItem>
          {(
            [['message-3', 'Rebaseline the budget with a reason.']] as const
          ).map(([id, text]) => (
            <ContentItem
              interactive
              action="select-conversation-message"
              itemId={id}
              selectionMode="multiple"
              selected={conversationSelections.value.includes(id)}
              ariaLabel={text}
            >
              <Text variant="span">{text}</Text>
            </ContentItem>
          ))}
        </List>
      </CatalogExample>
    </CatalogExampleStack>
  );
}
