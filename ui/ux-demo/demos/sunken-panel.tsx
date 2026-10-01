import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { List } from '@kerfjs/ui/list';
import { StateBanner } from '@kerfjs/ui/state-banner';
import { SunkenPanel } from '@kerfjs/ui/sunken-panel';
import { ValueTable, ValueTableRow } from '@kerfjs/ui/value-table';

import { SunkenPrototype } from '../sunken-prototype.js';

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
        label="Square-corner content stack"
        note="Square corners fit a flush or edge-to-edge application area."
      >
        <SunkenPanel shape="square">
          <strong>Recent activity</strong>
          <span>Three checks completed.</span>
          <span>One beta is ready to publish.</span>
        </SunkenPanel>
      </CatalogExample>
      <CatalogExample
        label="Panel fills a work area"
        note="fill takes the height of a definite-height frame; flex takes the remaining space in a flex column. Neither creates another scroller."
        align="none"
        viewport={{ layout: 'grid', width: 'medium', height: 'app' }}
      >
        <List fill>
          <strong>Work area</strong>
          <SunkenPanel flex ariaLabel="Growing work surface">
            <span>Content stays at the top while the surface fills space.</span>
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
          <span>Full-height surface</span>
        </SunkenPanel>
      </CatalogExample>
      <CatalogExample
        label="Backdrop-aware prototype"
        note="Research-only opt-in: lighter second tint and a transparent third layer bound nesting without changing semantic color defaults. Compare the Kerf panel, Pane scroller, and Web Awesome sunken card/details across backdrops and themes."
        viewport={{ layout: 'grid', width: 'full', height: 'app' }}
      >
        <SunkenPrototype />
      </CatalogExample>
    </CatalogExampleStack>
  );
}
