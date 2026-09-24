import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { Grid } from '@kerfjs/ui/grid';

export function GridDemo() {
  return (
    <CatalogExampleStack rootAttributes={{ 'data-demo': 'grid' }}>
      <CatalogExample
        label="Two columns"
        note="Related form fields divide the available width evenly with the standard homogeneous-group gap."
      >
        <Grid columns={2} gap="m" className="demo-grid-frame demo-grid-two">
          <label class="demo-grid-field">
            <span>Quantity</span>
            <input value="12" aria-label="Quantity" />
          </label>
          <label class="demo-grid-field">
            <span>Unit</span>
            <input value="pieces" aria-label="Unit" />
          </label>
        </Grid>
      </CatalogExample>
      <CatalogExample
        label="Four columns"
        note="The same component accepts any positive column count; each minmax track stays equal even when content has different intrinsic widths."
      >
        <Grid columns={4} gap="xs" className="demo-grid-frame demo-grid-four">
          {['Requested', 'Quoted price', 'Reviewed', 'Decided'].map((label) => (
            <span class="demo-grid-cell">{label}</span>
          ))}
        </Grid>
      </CatalogExample>
      <CatalogExample
        label="Flex participation"
        note="Like Row and List, Grid can explicitly grow inside a flex-owned parent without changing its equal-track contract."
      >
        <div class="demo-grid-flex-parent">
          <Grid columns={3} gap="xs" flex className="demo-grid-flex">
            {['One', 'Two', 'Three'].map((label) => (
              <span class="demo-grid-cell">{label}</span>
            ))}
          </Grid>
        </div>
      </CatalogExample>
    </CatalogExampleStack>
  );
}
