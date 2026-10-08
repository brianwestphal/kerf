import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { LucideIcon } from '@kerfjs/ui/lucide-icon';
import { Pane } from '@kerfjs/ui/pane';
import { ValueTable, ValueTableRow } from '@kerfjs/ui/value-table';
import { Wrench } from 'lucide';

export function ValueTableDemo() {
  return (
    <CatalogExampleStack rootAttributes={{ 'data-demo': 'value-table' }}>
      <CatalogExample label="Populated" align="none">
        <ValueTable label="Package metadata">
          <ValueTableRow label="Package" value="@kerfjs/ui" />
          <ValueTableRow
            label="Rendering"
            value="Kerf SafeHtml"
            icon={<LucideIcon icon={Wrench} name="wrench" />}
          />
          <ValueTableRow label="Styles" value="Explicit CSS subpaths" />
        </ValueTable>
      </CatalogExample>
      <CatalogExample label="Compact metadata" align="none">
        <ValueTable label="Connection metadata" density="compact">
          <ValueTableRow label="Host" value="localhost" />
          <ValueTableRow label="Port" value="5432" />
        </ValueTable>
      </CatalogExample>
      <CatalogExample label="Sunken Pane" align="none">
        <Pane appearance="sunken" deepInset>
          <ValueTable label="Assumptions">
            <ValueTableRow label="Owner" value="Workspace team" />
            <ValueTableRow label="Review state" value="Ready" />
            <ValueTableRow label="Source" value="Procurement brief" />
          </ValueTable>
        </Pane>
      </CatalogExample>
      <CatalogExample
        label="Placeholder"
        note={
          <>
            Rows accept <code>placeholder</code> to skeleton their values while
            a record loads.
          </>
        }
        align="none"
      >
        <ValueTable label="Loading metadata">
          <ValueTableRow label="Package" value="" placeholder />
          <ValueTableRow
            label="Rendering"
            value=""
            icon={<LucideIcon icon={Wrench} name="wrench" />}
            placeholder
          />
          <ValueTableRow label="Styles" value="" placeholder />
        </ValueTable>
      </CatalogExample>
    </CatalogExampleStack>
  );
}
