import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { StateBanner } from '@kerfjs/ui/state-banner';
import { SunkenPanel } from '@kerfjs/ui/sunken-panel';
import { ValueTable, ValueTableRow } from '@kerfjs/ui/value-table';

export function SunkenPanelDemo() {
  return (
    <CatalogExampleStack rootAttributes={{ 'data-demo': 'sunken-panel' }}>
      <CatalogExample
        label="Rounded application work area"
        note={<>The default shape uses the shared rounded-rectangle radius.</>}
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
        note={<>Square corners fit a flush or edge-to-edge application area.</>}
      >
        <SunkenPanel shape="square">
          <strong>Recent activity</strong>
          <span>Three checks completed.</span>
          <span>One beta is ready to publish.</span>
        </SunkenPanel>
      </CatalogExample>
    </CatalogExampleStack>
  );
}
