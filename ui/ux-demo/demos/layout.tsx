import { Button } from '@kerfjs/ui/button';
import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { ContentItem } from '@kerfjs/ui/content-item';
import { remify } from '@kerfjs/ui/css-values';
import { List } from '@kerfjs/ui/list';
import { ListInsetText } from '@kerfjs/ui/list-inset-text';
import { Pane } from '@kerfjs/ui/pane';
import { Row } from '@kerfjs/ui/row';
import { Spacer } from '@kerfjs/ui/spacer';
import { PopoverDialogSurface } from '@kerfjs/ui/surface-scaffold';
import { Text } from '@kerfjs/ui/text';
import { Toolbar } from '@kerfjs/ui/toolbar';
import {
  ToolbarButton,
  ToolbarControlGroup,
} from '@kerfjs/ui/toolbar-control-group';
import { ToolbarText } from '@kerfjs/ui/toolbar-text';

/**
 * The anchor the request popup docks to. Production names its shell's main
 * column; the catalog names the specimen frame the same way through
 * `CatalogExample` `viewport.anchorName`.
 */
const demoShellMainAnchor = '--demo-shell-main';

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
        note="The frame stands in for the shell's main column: it is the named anchor a PopoverDialogSurface's anchorName docks to, and its content sits in a centered column. The request dismisses manually, so it stays open until it is answered."
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
          <Button
            popoverTarget="layout-anchored-request"
            popoverTargetAction="show"
            rootAttributes={{ 'data-layout-anchor-trigger': '' }}
          >
            Show Request
          </Button>
        </Row>
        <PopoverDialogSurface
          id="layout-anchored-request"
          labelledBy="layout-anchored-request-title"
          describedBy="layout-anchored-request-description"
          dismiss="manual"
          anchorName={demoShellMainAnchor}
          preferredWidth={remify(480)}
          rootAttributes={{ 'data-anchored-request-popup': '' }}
        >
          {/* The title and its supporting line are one heading unit. */}
          <List>
            <Toolbar
              label="Request Heading"
              leading={
                <ToolbarText
                  text="Allow File Access?"
                  size="xlarge"
                  id="layout-anchored-request-title"
                />
              }
            />
            <ListInsetText sides="rl">
              <Text
                variant="span"
                tone="quiet"
                id="layout-anchored-request-description"
              >
                The assistant wants to read three files in this workspace.
              </Text>
            </ListInsetText>
          </List>
          <Row hAlign="right" controlInsets="rbl">
            <Button
              emphasis="secondary"
              popoverTarget="layout-anchored-request"
              popoverTargetAction="hide"
            >
              Deny
            </Button>
            <Button
              tone="brand"
              popoverTarget="layout-anchored-request"
              popoverTargetAction="hide"
            >
              Allow
            </Button>
          </Row>
        </PopoverDialogSurface>
      </CatalogExample>
    </CatalogExampleStack>
  );
}
