import '@awesome.me/webawesome/dist/components/button/button.js';
import '@awesome.me/webawesome/dist/components/card/card.js';

import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { Pane } from '@kerfjs/ui/pane';
import { Row } from '@kerfjs/ui/row';
import { Text } from '@kerfjs/ui/text';
import { Toolbar } from '@kerfjs/ui/toolbar';
import { ToolbarControlGroup } from '@kerfjs/ui/toolbar-control-group';
import { ToolbarText } from '@kerfjs/ui/toolbar-text';

export function LayoutDemo() {
  return (
    <CatalogExampleStack
      label="Semantic layout composition"
      rootAttributes={{ 'data-demo': 'layout' }}
    >
      <CatalogExample label="Pane with child-owned content geometry">
        <Pane
          contentElement="section"
          header={
            <Toolbar
              label="Semantic layout"
              dividerSides=""
              leading={
                <ToolbarText
                  text="Semantic layout"
                  size="xlarge"
                  id="layout-title"
                />
              }
              trailing={
                <ToolbarControlGroup appearance="borderless" single>
                  <button type="button" data-action="log-add">
                    New item
                  </button>
                </ToolbarControlGroup>
              }
            />
          }
        >
          <wa-card appearance="outlined" with-header>
            <strong slot="header">One owner per item</strong>
            <Text variant="span">
              Each content child owns its margin, border, background, padding,
              and radius.
            </Text>
          </wa-card>
          <Row controlInsets="l">
            <wa-button variant="brand" data-action="log-add">
              Primary action
            </wa-button>
            <wa-button data-action="log-more">Secondary action</wa-button>
          </Row>
          <Text>24px major rhythm · 8px internal rhythm</Text>
        </Pane>
      </CatalogExample>
    </CatalogExampleStack>
  );
}
