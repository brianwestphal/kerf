import '@awesome.me/webawesome/dist/components/card/card.js';

import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { LucideIcon } from '@kerfjs/ui/lucide-icon';
import { ValueTable, ValueTableRow } from '@kerfjs/ui/value-table';
import { Wrench } from 'lucide';

export function ValueTableDemo() {
  return (
    <wa-card appearance="outlined">
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
        <CatalogExample
          label="Placeholder"
          note={
            <>
              Rows accept <code>placeholder</code> to skeleton their values
              while a record loads.
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
    </wa-card>
  );
}
