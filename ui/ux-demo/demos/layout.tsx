import '@awesome.me/webawesome/dist/components/button/button.js';
import '@awesome.me/webawesome/dist/components/card/card.js';

import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { Pane } from '@kerfjs/ui/pane';
import { Row } from '@kerfjs/ui/row';
import { Spacer } from '@kerfjs/ui/spacer';
import { Text } from '@kerfjs/ui/text';
import { Toolbar } from '@kerfjs/ui/toolbar';
import { ToolbarControlGroup } from '@kerfjs/ui/toolbar-control-group';
import { ToolbarText } from '@kerfjs/ui/toolbar-text';

import {
  AnchoredRequestPopup,
  demoShellMainAnchor,
} from '../components/anchored-request-popup.js';

export function LayoutDemo() {
  return (
    <CatalogExampleStack
      label="Semantic Layout Composition"
      rootAttributes={{ 'data-demo': 'layout' }}
    >
      <CatalogExample label="Pane with Child-Owned Content Geometry">
        <Pane
          contentElement="section"
          header={
            <Toolbar
              label="Semantic Layout"
              leading={
                <ToolbarText
                  text="Semantic Layout"
                  size="xlarge"
                  id="layout-title"
                />
              }
              trailing={
                <ToolbarControlGroup appearance="borderless" single>
                  <button type="button" data-action="log-add">
                    New Item
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
              Primary Action
            </wa-button>
            <wa-button data-action="log-more">Secondary Action</wa-button>
          </Row>
          <Text>24px major rhythm · 8px internal rhythm</Text>
        </Pane>
      </CatalogExample>
      <CatalogExample
        label="Top-Layer Popup Anchored to the Frame"
        note="The frame stands in for the shell's main column: it is the named anchor the app's top-layer popup docks to, and its content sits in a centered column."
        viewport={{
          layout: 'flex-column',
          width: 'full',
          minHeight: 'app',
          frame: 'solid',
          surface: 'lowered',
          anchorName: demoShellMainAnchor,
          contentWidth: 'compact',
          contentAlign: 'center',
        }}
        rootAttributes={{ 'data-layout-anchor-example': '' }}
      >
        <Text>
          Conversation content stays in a readable column while a request docks
          to the bottom of the main column.
        </Text>
        <Spacer flex />
        <Row controlInsets="l">
          <button
            type="button"
            popoverTarget="layout-anchored-request"
            popoverTargetAction="show"
            data-layout-anchor-trigger
          >
            Show Request
          </button>
        </Row>
        <AnchoredRequestPopup id="layout-anchored-request" />
      </CatalogExample>
    </CatalogExampleStack>
  );
}
