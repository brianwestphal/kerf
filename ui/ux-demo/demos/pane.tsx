import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { ContentItem } from '@kerfjs/ui/content-item';
import { ListInsetText } from '@kerfjs/ui/list-inset-text';
import { Pane } from '@kerfjs/ui/pane';
import { Toolbar } from '@kerfjs/ui/toolbar';
import { ToolbarText } from '@kerfjs/ui/toolbar-text';

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
    </CatalogExampleStack>
  );
}
