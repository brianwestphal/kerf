import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
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
      >
        <Pane
          element="section"
          label="Pane anatomy"
          className="demo-pane"
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
                dividerSides=""
                leading={<ToolbarText text="Pane header" size="large" />}
              />
              <ListInsetText className="demo-pane__secondary">
                Optional secondary header row
              </ListInsetText>
            </>
          }
          footer={
            <Toolbar
              label="Pane footer"
              dividerSides=""
              leading={<ToolbarText text="Optional footer" size="small" />}
            />
          }
        >
          <div class="kui-content-item">First content group</div>
          <div class="kui-content-item">Second content group</div>
        </Pane>
      </CatalogExample>
    </CatalogExampleStack>
  );
}
