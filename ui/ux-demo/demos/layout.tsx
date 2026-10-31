import { Button } from '@kerfjs/ui/button';
import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { ContentItem } from '@kerfjs/ui/content-item';
import { Pane } from '@kerfjs/ui/pane';
import { Row } from '@kerfjs/ui/row';
import { Spacer } from '@kerfjs/ui/spacer';
import { Text } from '@kerfjs/ui/text';
import { Toolbar } from '@kerfjs/ui/toolbar';
import {
  ToolbarButton,
  ToolbarControlGroup,
} from '@kerfjs/ui/toolbar-control-group';
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
                  <ToolbarButton action="log-add">New Item</ToolbarButton>
                </ToolbarControlGroup>
              }
            />
          }
        >
          <ContentItem appearance="surface" frame="framed">
            <Text weight="strong">One owner per item</Text>
            <Text>
              Each content child owns its margin, border, background, padding,
              and radius.
            </Text>
          </ContentItem>
          <Row controlInsets="l">
            <Button tone="brand" action="log-add">
              Primary Action
            </Button>
            <Button action="log-more">Secondary Action</Button>
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
          {/* Raw: Button has no popoverTarget/popoverTargetAction. */}
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
