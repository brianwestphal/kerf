import '@awesome.me/webawesome/dist/components/details/details.js';

import { ContentItem } from '@kerfjs/ui';
import { Button } from '@kerfjs/ui/button';
import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { List } from '@kerfjs/ui/list';
import { Pane } from '@kerfjs/ui/pane';
import { StateBanner } from '@kerfjs/ui/state-banner';
import { SunkenPanel } from '@kerfjs/ui/sunken-panel';
import { Text } from '@kerfjs/ui/text';
import { ValueTable, ValueTableRow } from '@kerfjs/ui/value-table';

export function SunkenPanelDemo() {
  return (
    <CatalogExampleStack rootAttributes={{ 'data-demo': 'sunken-panel' }}>
      <CatalogExample
        label="Rounded Application Work Area"
        note="The default shape uses the shared rounded-rectangle radius."
      >
        <SunkenPanel ariaLabel="Release Workspace">
          <StateBanner tone="neutral" title="Release Candidate Ready" />
          <ValueTable label="Release Details">
            <ValueTableRow label="Version" value="5.0.0-beta.2" />
            <ValueTableRow label="Checks" value="Passing" />
          </ValueTable>
        </SunkenPanel>
      </CatalogExample>
      <CatalogExample
        label="Focusable Outlined Surface"
        note="tabIndex makes the surface a keyboard stop; outlined can keep its ring visible for a selected or drop-target state."
      >
        <SunkenPanel ariaLabel="Selected Work Surface" tabIndex={0} outlined>
          <Text>Selected work surface</Text>
        </SunkenPanel>
      </CatalogExample>
      <CatalogExample
        label="Square-Corner Content Stack"
        note="Square corners fit a flush or edge-to-edge application area."
      >
        <SunkenPanel shape="square">
          <Text>Recent activity</Text>
          <Text>Three checks completed.</Text>
          <Text>One beta is ready to publish.</Text>
        </SunkenPanel>
      </CatalogExample>
      <CatalogExample
        label="Panel Fills a Work Area"
        note="fill takes the height of a definite-height frame; flex takes the remaining space in a flex column. Neither creates another scroller."
        align="none"
        viewport={{
          layout: 'grid',
          width: 'medium',
          height: 'app',
          frame: 'dashed',
        }}
      >
        <List flex>
          <ContentItem appearance="info">
            <Text>Work area</Text>
          </ContentItem>

          <SunkenPanel flex ariaLabel="Growing Work Surface">
            <Text>Content stays at the top while the surface fills space.</Text>
          </SunkenPanel>
        </List>
      </CatalogExample>
      <CatalogExample
        label="Direct Frame Fill"
        note="A panel can fill a definite-height frame without an application wrapper."
        align="none"
        viewport={{ layout: 'grid', width: 'medium', height: 'app' }}
      >
        <SunkenPanel fill ariaLabel="Full-Height Work Surface">
          <Text>Full-height surface</Text>
        </SunkenPanel>
      </CatalogExample>
      <CatalogExample
        label="Nested Surfaces"
        note="The shared translucent lowered color composites naturally at every depth. No per-layer styling is needed."
      >
        <SunkenPanel ariaLabel="First Layer">
          <Text>First layer</Text>
          <SunkenPanel ariaLabel="Second Layer">
            <Text>Second layer</Text>
            <SunkenPanel ariaLabel="Third Layer">
              <Text>Third layer</Text>
              <Button>Focus Nested Control</Button>
            </SunkenPanel>
          </SunkenPanel>
        </SunkenPanel>
      </CatalogExample>
      <CatalogExample
        label="Pane and Nested Panel"
        viewport={{ layout: 'grid', width: 'medium', height: 'app' }}
      >
        <Pane appearance="sunken" label="Layered Pane">
          <SunkenPanel ariaLabel="Pane Content Layer">
            <Text>The same lowered token paints both surfaces.</Text>
          </SunkenPanel>
        </Pane>
      </CatalogExample>
      <CatalogExample label="Web Awesome Nested Surfaces">
        <wa-card appearance="sunken">
          <Text>Web Awesome card</Text>
          <wa-details appearance="sunken" summary="Nested Details" open>
            <Text>Shared theme colors compound here too.</Text>
          </wa-details>
        </wa-card>
      </CatalogExample>
    </CatalogExampleStack>
  );
}
