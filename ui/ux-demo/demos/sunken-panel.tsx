import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { StateBanner } from '@kerfjs/ui/state-banner';
import { SunkenPanel } from '@kerfjs/ui/sunken-panel';
import { ValueTable, ValueTableRow } from '@kerfjs/ui/value-table';

export function SunkenPanelDemo() {
  return (
    <CatalogExampleStack rootAttributes={{ 'data-demo': 'sunken-panel' }}>
      <CatalogExample
        label="Application work area"
        note={<>One lowered surface owns the 8px inset and vertical rhythm.</>}
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
        label="Plain content stack"
        note={<>Without a name, the surface remains a non-landmark grouping.</>}
      >
        <SunkenPanel>
          <strong>Recent activity</strong>
          <span>Three checks completed.</span>
          <span>One beta is ready to publish.</span>
        </SunkenPanel>
      </CatalogExample>
    </CatalogExampleStack>
  );
}
