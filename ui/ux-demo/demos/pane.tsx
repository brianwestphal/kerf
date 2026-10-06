import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { ContentItem } from '@kerfjs/ui/content-item';
import { List } from '@kerfjs/ui/list';
import { ListInsetText } from '@kerfjs/ui/list-inset-text';
import { Pane } from '@kerfjs/ui/pane';
import { Toolbar } from '@kerfjs/ui/toolbar';
import { ToolbarText } from '@kerfjs/ui/toolbar-text';
import { Workbench } from '@kerfjs/ui/workbench';

import { EdgeToEdgeTable } from '../components/edge-to-edge-table.js';

export function PaneDemo() {
  return (
    <CatalogExampleStack rootAttributes={{ 'data-demo': 'pane' }}>
      <CatalogExample
        label="Pane structure and separators"
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
          label="Pane anatomy"
          separators={[
            'block-start',
            'block-end',
            'inline-start',
            'inline-end',
          ]}
          header={
            <>
              <Toolbar
                label="Pane header"
                leading={<ToolbarText text="Pane header" size="large" />}
              />
              <ListInsetText>Optional secondary header row</ListInsetText>
            </>
          }
          footer={
            <Toolbar
              label="Pane footer"
              leading={<ToolbarText text="Optional footer" size="small" />}
            />
          }
        >
          <ContentItem>First content group</ContentItem>
          <ContentItem frame="framed">Framed content group</ContentItem>
        </Pane>
      </CatalogExample>
      <CatalogExample
        label="Deep inset content"
        note="deepInset adds 8px on all sides of the Pane's scrolling content. Direct items and items inside a List align at 16px from the inline edge while the List keeps its ordinary internal 8px spacing."
        viewport={{
          layout: 'grid',
          width: 'medium',
          height: 'short',
          surface: 'default',
        }}
      >
        <Pane
          label="Deep inset example"
          deepInset
          header={
            <Toolbar
              label="Deep inset header"
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
        label="Edge-to-edge table, regular content inset"
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
        label="Edge-to-edge table, deep inset"
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
        label="Scroll dividers"
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
          label="Scrolling pane"
          appearance="sunken"
          rootAttributes={{ 'data-scroll-divider-demo': 'pane' }}
          header={
            <Toolbar
              label="Activity header"
              leading={<ToolbarText text="Activity" size="large" />}
            />
          }
          footer={
            <Toolbar
              label="Activity footer"
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
        label="Sunken chat workspace"
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
          label="Chat workspace"
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
        label="Sunken auto chrome"
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
          label="Sunken auto workspace"
          header={<Toolbar label="Header" leading={<span>Header</span>} />}
          footer={<Toolbar label="Footer" leading={<span>Footer</span>} />}
        >
          {Array.from({ length: 12 }, (_, index) => (
            <ContentItem>{`Entry ${index + 1}`}</ContentItem>
          ))}
        </Pane>
      </CatalogExample>
      <CatalogExample
        label="Sunken workbench regions without Pane chrome"
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
          label="Bare work regions"
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
