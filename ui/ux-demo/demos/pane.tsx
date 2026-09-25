import './pane.css';

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
        <div class="demo-pane">
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
                  dividerSides=""
                  leading={<ToolbarText text="Pane header" size="large" />}
                />
                <div class="demo-pane__secondary">
                  <ListInsetText>Optional secondary header row</ListInsetText>
                </div>
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
        </div>
      </CatalogExample>
    </CatalogExampleStack>
  );
}
