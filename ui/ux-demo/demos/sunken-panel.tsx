import '@awesome.me/webawesome/dist/components/details/details.js';

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
        label="Rounded application work area"
        note="The default shape uses the shared rounded-rectangle radius."
      >
        <SunkenPanel ariaLabel="Release workspace">
          <StateBanner tone="neutral" title="Release candidate ready" />
          <ValueTable label="Release details">
            <ValueTableRow label="Version" value="5.0.0-beta.2" />
            <ValueTableRow label="Checks" value="Passing" />
          </ValueTable>
        </SunkenPanel>
      </CatalogExample>
      <CatalogExample
        label="Focusable outlined surface"
        note="tabIndex makes the surface a keyboard stop; outlined can keep its ring visible for a selected or drop-target state."
      >
        <SunkenPanel ariaLabel="Selected work surface" tabIndex={0} outlined>
          <Text>Selected work surface</Text>
        </SunkenPanel>
      </CatalogExample>
      <CatalogExample
        label="Square-corner content stack"
        note="Square corners fit a flush or edge-to-edge application area."
      >
        <SunkenPanel shape="square">
          <Text>Recent activity</Text>
          <Text>Three checks completed.</Text>
          <Text>One beta is ready to publish.</Text>
        </SunkenPanel>
      </CatalogExample>
      <CatalogExample
        label="Panel fills a work area"
        note="fill takes the height of a definite-height frame; flex takes the remaining space in a flex column. Neither creates another scroller."
        align="none"
        viewport={{ layout: 'grid', width: 'medium', height: 'app' }}
      >
        <List fill>
          <Text>Work area</Text>
          <SunkenPanel flex ariaLabel="Growing work surface">
            <Text>Content stays at the top while the surface fills space.</Text>
          </SunkenPanel>
        </List>
      </CatalogExample>
      <CatalogExample
        label="Direct frame fill"
        note="A panel can fill a definite-height frame without an application wrapper."
        align="none"
        viewport={{ layout: 'grid', width: 'medium', height: 'app' }}
      >
        <SunkenPanel fill ariaLabel="Full-height work surface">
          <Text>Full-height surface</Text>
        </SunkenPanel>
      </CatalogExample>
      <CatalogExample
        label="Nested surfaces"
        note="The shared translucent lowered color composites naturally at every depth. No per-layer styling is needed."
      >
        <SunkenPanel ariaLabel="First layer">
          <Text>First layer</Text>
          <SunkenPanel ariaLabel="Second layer">
            <Text>Second layer</Text>
            <SunkenPanel ariaLabel="Third layer">
              <Text>Third layer</Text>
              <wa-button>Focus nested control</wa-button>
            </SunkenPanel>
          </SunkenPanel>
        </SunkenPanel>
      </CatalogExample>
      <CatalogExample
        label="Pane and nested panel"
        viewport={{ layout: 'grid', width: 'medium', height: 'app' }}
      >
        <Pane appearance="sunken" label="Layered pane">
          <SunkenPanel ariaLabel="Pane content layer">
            <Text>The same lowered token paints both surfaces.</Text>
          </SunkenPanel>
        </Pane>
      </CatalogExample>
      <CatalogExample label="Web Awesome nested surfaces">
        <wa-card appearance="sunken">
          <Text>Web Awesome card</Text>
          <wa-details appearance="sunken" summary="Nested details" open>
            <Text>Shared theme colors compound here too.</Text>
          </wa-details>
        </wa-card>
      </CatalogExample>
    </CatalogExampleStack>
  );
}
