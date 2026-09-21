import { CatalogExample } from '@kerfjs/ui/catalog';
import { ValueTable, ValueTableRow } from '@kerfjs/ui/value-table';
import { Wrench } from 'lucide';

import { icon } from './state.js';

export function ValueTableDemo() {
  return (
    <div
      class="demo-value-table kui-catalog-example-stack"
      data-demo="value-table"
    >
      <CatalogExample label="Populated" align="none">
        <ValueTable label="Package metadata">
          <ValueTableRow label="Package" value="@kerfjs/ui" />
          <ValueTableRow
            label="Rendering"
            value="Kerf SafeHtml"
            icon={icon(Wrench, 'wrench')}
          />
          <ValueTableRow label="Styles" value="Explicit CSS subpaths" />
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
        <ValueTable label="Loading metadata">
          <ValueTableRow label="Package" value="" placeholder />
          <ValueTableRow
            label="Rendering"
            value=""
            icon={icon(Wrench, 'wrench')}
            placeholder
          />
          <ValueTableRow label="Styles" value="" placeholder />
        </ValueTable>
      </CatalogExample>
    </div>
  );
}
