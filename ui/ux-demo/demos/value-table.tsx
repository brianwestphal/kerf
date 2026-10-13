import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { px } from '@kerfjs/ui/css-values';
import { LucideIcon } from '@kerfjs/ui/lucide-icon';
import { Pane } from '@kerfjs/ui/pane';
import { ValueTable, ValueTableRow } from '@kerfjs/ui/value-table';
import { Server, Wrench } from 'lucide';

export function ValueTableDemo() {
  return (
    <CatalogExampleStack rootAttributes={{ 'data-demo': 'value-table' }}>
      <CatalogExample label="Populated" align="none">
        <ValueTable label="Package Metadata">
          <ValueTableRow label="Package" value="@kerfjs/ui" />
          <ValueTableRow
            label="Rendering"
            value="Kerf SafeHtml"
            icon={<LucideIcon icon={Wrench} name="wrench" />}
          />
          <ValueTableRow label="Styles" value="Explicit CSS subpaths" />
        </ValueTable>
      </CatalogExample>
      <CatalogExample label="Compact Metadata" align="none">
        <ValueTable label="Connection Metadata" density="compact">
          <ValueTableRow label="Host" value="localhost" />
          <ValueTableRow label="Port" value="5432" />
        </ValueTable>
      </CatalogExample>
      <CatalogExample label="Sunken Pane" align="none">
        <Pane appearance="sunken" deepInset>
          <ValueTable label="Assumptions">
            <ValueTableRow label="Owner" value="Workspace team" />
            <ValueTableRow label="Review State" value="Ready" />
            <ValueTableRow label="Source" value="Procurement brief" />
          </ValueTable>
        </Pane>
      </CatalogExample>
      <CatalogExample
        label="Label Column and Stacking"
        note='labelWidth={px(160)} gives labels a minimum column and the value the rest; stackBelow="compact" puts each value under its label while the table is narrower than 512px.'
        align="none"
      >
        <ValueTable
          label="Connection Details"
          labelWidth={px(160)}
          stackBelow="compact"
        >
          <ValueTableRow
            label="Server"
            value="hotsheet.example.com:4174"
            icon={<LucideIcon icon={Server} name="server" />}
          />
          <ValueTableRow label="Store" value="~/Documents/kerf.hs2" />
          <ValueTableRow label="Status" value="Connected" />
        </ValueTable>
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
        <ValueTable label="Loading Metadata">
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
