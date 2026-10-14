import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { ContentItem } from '@kerfjs/ui/content-item';
import { fillColor } from '@kerfjs/ui/css-values';
import { List } from '@kerfjs/ui/list';
import { ListInsetText } from '@kerfjs/ui/list-inset-text';
import { ListItem } from '@kerfjs/ui/list-item';
import { LucideIcon } from '@kerfjs/ui/lucide-icon';
import { Pane } from '@kerfjs/ui/pane';
import { Toolbar } from '@kerfjs/ui/toolbar';
import { ToolbarText } from '@kerfjs/ui/toolbar-text';
import { Workbench } from '@kerfjs/ui/workbench';
import { Bell, Calendar, Mail, ShieldCheck } from 'lucide';

import { EdgeToEdgeTable } from '../components/edge-to-edge-table.js';

/** Inbox rows for the overlay header example: colored tiles show through it. */
const inboxMessages = Array.from({ length: 18 }, (_, index) => {
  const kinds = [
    {
      label: 'Design Review',
      icon: <LucideIcon icon={Calendar} name="calendar" />,
      tone: 'brand',
    },
    {
      label: 'Backup Complete',
      icon: <LucideIcon icon={ShieldCheck} name="shield-check" />,
      tone: 'success',
    },
    {
      label: 'Storage Almost Full',
      icon: <LucideIcon icon={Bell} name="bell" />,
      tone: 'warning',
    },
    {
      label: 'Weekly Summary',
      icon: <LucideIcon icon={Mail} name="mail" />,
      tone: 'neutral',
    },
  ] as const;
  const kind = kinds[index % kinds.length]!;
  return { id: `inbox-${String(index + 1)}`, ...kind };
});

export function PaneDemo() {
  return (
    <CatalogExampleStack rootAttributes={{ 'data-demo': 'pane' }}>
      <CatalogExample
        label="Pane Structure and Separators"
        note="The header and footer stay fixed while the primary vertical content slot owns scrolling."
        viewport={{
          layout: 'grid',
          width: 'medium',
          height: 'tall',
          surface: 'default',
        }}
      >
        <Pane
          element="section"
          label="Pane Anatomy"
          separators={[
            'block-start',
            'block-end',
            'inline-start',
            'inline-end',
          ]}
          header={
            <>
              <Toolbar
                label="Pane Header"
                leading={<ToolbarText text="Pane Header" size="large" />}
              />
              <ListInsetText>Optional secondary header row</ListInsetText>
            </>
          }
          footer={
            <Toolbar
              label="Pane Footer"
              leading={<ToolbarText text="Optional footer" size="small" />}
            />
          }
        >
          <ContentItem>First content group</ContentItem>
          <ContentItem frame="framed">Framed content group</ContentItem>
        </Pane>
      </CatalogExample>
      <CatalogExample
        label="Focusable Pane and Persistent Outline"
        note="tabIndex makes the pane reachable by keyboard; outlined keeps its focus ring visible while it marks a drop target."
        viewport={{ layout: 'grid', width: 'medium', height: 'short' }}
      >
        <Pane
          element="section"
          label="Drop Target Pane"
          tabIndex={0}
          outlined
          rootAttributes={{ 'data-demo-focus-pane': '' }}
        >
          <ContentItem>Drop a project here.</ContentItem>
        </Pane>
      </CatalogExample>
      <CatalogExample
        label="Deep Inset Content"
        note="deepInset adds 8px on all sides of the Pane's scrolling content. Direct items and items inside a List align at 16px from the inline edge while the List keeps its ordinary internal 8px spacing."
        viewport={{
          layout: 'grid',
          width: 'medium',
          height: 'short',
          surface: 'default',
        }}
      >
        <Pane
          label="Deep Inset Example"
          deepInset
          header={
            <Toolbar
              label="Deep Inset Header"
              leading={<ToolbarText text="Projects" size="large" />}
            />
          }
        >
          <ContentItem>Direct content item</ContentItem>
          <List>
            <ContentItem>Nested List content item</ContentItem>
          </List>
        </Pane>
      </CatalogExample>
      <CatalogExample
        label="Edge-to-Edge Table, Regular Content Inset"
        note="The table's tinted rows and rules reach both Pane edges. Its cell text follows the ordinary content-item text axis."
        viewport={{
          layout: 'grid',
          width: 'medium',
          height: 'tall',
          surface: 'default',
        }}
      >
        <EdgeToEdgeTable deepInset={false} />
      </CatalogExample>
      <CatalogExample
        label="Edge-to-Edge Table, Deep Inset"
        note="The same table reads the Pane's resolved inline inset variables, including deepInset and safe-area padding."
        viewport={{
          layout: 'grid',
          width: 'medium',
          height: 'tall',
          surface: 'default',
        }}
      >
        <EdgeToEdgeTable deepInset />
      </CatalogExample>
      <CatalogExample
        label="Scroll Dividers"
        note="The line under the header appears once the content scrolls beneath it, and the line over the footer only while more content lies below. wireScrollDividers reports the scroll state; the pane draws both lines."
        viewport={{
          layout: 'grid',
          width: 'medium',
          height: 'tall',
          surface: 'default',
        }}
      >
        <Pane
          element="section"
          label="Scrolling Pane"
          appearance="sunken"
          rootAttributes={{ 'data-scroll-divider-demo': 'pane' }}
          header={
            <Toolbar
              label="Activity Header"
              leading={<ToolbarText text="Activity" size="large" />}
            />
          }
          footer={
            <Toolbar
              label="Activity Footer"
              leading={<ToolbarText text="12 updates" size="small" />}
            />
          }
        >
          {Array.from({ length: 12 }, (_, index) => (
            <ContentItem>{`Update ${index + 1}`}</ContentItem>
          ))}
        </Pane>
      </CatalogExample>
      <CatalogExample
        label="Background Color"
        note="background paints the whole pane, header included, in an app-chosen color from @kerfjs/ui/css-values. Here a light-dark() literal keeps the text at AA in both color schemes."
        viewport={{
          layout: 'grid',
          width: 'medium',
          height: 'tall',
          surface: 'default',
        }}
      >
        <Pane
          element="section"
          label="Album"
          background={fillColor('light-dark(#e6edfb, #1b2438)')}
          rootAttributes={{ 'data-background-demo': 'pane' }}
          header={
            <Toolbar
              label="Album Header"
              leading={<ToolbarText text="Night Drive" size="xlarge" />}
            />
          }
        >
          {['Overture', 'Neon Rain', 'Coastline', 'Last Exit'].map(
            (title, index) => (
              <ContentItem>{`${index + 1}. ${title}`}</ContentItem>
            ),
          )}
        </Pane>
      </CatalogExample>
      <CatalogExample
        label="Overlay Header"
        note="headerPresentation overlay lays the header over the content on the translucent chrome material, so messages scroll visibly beneath it. wireScrollDividers measures the header, and the first message rests just below it."
        viewport={{
          layout: 'grid',
          width: 'medium',
          height: 'tall',
          surface: 'default',
        }}
      >
        <Pane
          element="section"
          label="Inbox"
          headerPresentation="overlay"
          rootAttributes={{ 'data-overlay-header-demo': 'pane' }}
          header={
            <Toolbar
              label="Inbox Header"
              leading={<ToolbarText text="Inbox" size="xlarge" />}
            />
          }
        >
          <List>
            {inboxMessages.map((message) => (
              <ListItem
                action="log-inbox"
                itemId={message.id}
                label={message.label}
                icon={message.icon}
                iconTile={message.tone}
              />
            ))}
          </List>
        </Pane>
      </CatalogExample>
      <CatalogExample
        label="Sunken Chat Workspace"
        note="The lowered surface fills short conversations behind the fixed composer without another scroller."
        viewport={{
          layout: 'grid',
          width: 'medium',
          height: 'tall',
          surface: 'default',
        }}
      >
        <Workbench
          id="sunken-chat"
          label="Chat Workspace"
          mainPane={{ appearance: 'sunken' }}
          main={<ContentItem>Welcome to the conversation</ContentItem>}
          mainFooter={
            <ContentItem>
              <input aria-label="Message" placeholder="Write a message" />
            </ContentItem>
          }
        />
      </CatalogExample>
      <CatalogExample
        label="Sunken Auto Chrome"
        note="At short heights the Pane root owns the scroll, while its header and footer stay on the normal surface."
        viewport={{
          layout: 'grid',
          width: 'medium',
          height: 'tall',
          surface: 'default',
        }}
      >
        <Pane
          appearance="sunken"
          chromePlacement="auto"
          label="Sunken Auto Workspace"
          header={<Toolbar label="Header" leading={<span>Header</span>} />}
          footer={<Toolbar label="Footer" leading={<span>Footer</span>} />}
        >
          {Array.from({ length: 12 }, (_, index) => (
            <ContentItem>{`Entry ${index + 1}`}</ContentItem>
          ))}
        </Pane>
      </CatalogExample>
      <CatalogExample
        label="Sunken Workbench Regions Without Pane Chrome"
        note="The main region and rail paint their own surfaces when no Pane chrome is composed."
        viewport={{
          layout: 'grid',
          width: 'medium',
          height: 'tall',
          surface: 'default',
        }}
      >
        <Workbench
          id="sunken-raw-workbench"
          label="Bare Work Regions"
          mainPane={{ appearance: 'sunken' }}
          main={<ContentItem>Main work area</ContentItem>}
          leftRail={{
            label: 'Navigator',
            pane: { appearance: 'sunken' },
            content: <ContentItem>Navigator</ContentItem>,
          }}
        />
      </CatalogExample>
    </CatalogExampleStack>
  );
}
