import '@awesome.me/webawesome/dist/components/card/card.js';
import '@awesome.me/webawesome/dist/components/input/input.js';

import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { Grid } from '@kerfjs/ui/grid';

export function GridDemo() {
  return (
    <CatalogExampleStack rootAttributes={{ 'data-demo': 'grid' }}>
      <CatalogExample
        label="Two columns"
        note="Related form fields divide the available width evenly with the standard homogeneous-group gap."
      >
        <Grid columns={2} gap="m">
          <wa-input label="Quantity" value="12"></wa-input>
          <wa-input label="Unit" value="pieces"></wa-input>
        </Grid>
      </CatalogExample>
      <CatalogExample
        label="Four columns"
        note="The same component accepts any positive column count; each minmax track stays equal even when content has different intrinsic widths."
      >
        <Grid columns={4} gap="xs">
          {['Requested', 'Quoted price', 'Reviewed', 'Decided'].map((label) => (
            <wa-card appearance="outlined">{label}</wa-card>
          ))}
        </Grid>
      </CatalogExample>
      <CatalogExample
        label="Flex participation"
        note="Like Row and List, Grid can explicitly grow inside a flex-owned parent without changing its equal-track contract."
      >
        <wa-card appearance="sunken">
          <Grid columns={3} gap="xs" flex>
            {['One', 'Two', 'Three'].map((label) => (
              <wa-card appearance="outlined">{label}</wa-card>
            ))}
          </Grid>
        </wa-card>
      </CatalogExample>
    </CatalogExampleStack>
  );
}
