import '@awesome.me/webawesome/dist/components/card/card.js';
import '@awesome.me/webawesome/dist/components/input/input.js';

import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { ContentItem } from '@kerfjs/ui/content-item';
import { px } from '@kerfjs/ui/css-values';
import { Grid } from '@kerfjs/ui/grid';
import { Text } from '@kerfjs/ui/text';

import { gridTileSelections } from './state.js';

export function GridDemo() {
  return (
    <CatalogExampleStack rootAttributes={{ 'data-demo': 'grid' }}>
      <CatalogExample
        label="Two columns"
        note="Related form fields divide the available width evenly with the standard homogeneous-group gap."
      >
        <Grid columns={2} gap="m">
          <wa-input label="Quantity" value="12" />
          <wa-input label="Unit" value="pieces" />
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
        label="Responsive form columns"
        note="Equal tracks stay at least 376px wide, then collapse to one when a second track no longer fits."
        viewport={{ width: 'wide' }}
      >
        <Grid minColumnWidth={px(376)} gap="m">
          <wa-input label="Provider name" value="Example provider" />
          <wa-input label="API endpoint" value="https://example.test" />
        </Grid>
      </CatalogExample>
      <CatalogExample
        label="Text and control insets"
        note="Text insets add the full 17px content inset; control insets add 8px. When both select an edge, the text inset wins."
        rootAttributes={{ 'data-demo-section': 'grid-insets' }}
      >
        <Grid
          columns={2}
          textInsets="l"
          controlInsets="rl"
          rootAttributes={{ 'data-demo-grid-insets': '' }}
        >
          <Text flush>Text aligned to the full content inset</Text>
          <wa-input label="Amount" value="12" />
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
      <CatalogExample
        label="Sparse document tiles"
        note="Auto-fill keeps empty tracks, so a single document tile stays at the shared card width instead of stretching across the row."
        viewport={{ width: 'wide' }}
      >
        <Grid minColumnWidth={px(160)} autoFill gap="m">
          <wa-card appearance="outlined">One document</wa-card>
        </Grid>
      </CatalogExample>
      <CatalogExample
        label="Selectable document tiles"
        note="Arrow keys follow the wrapped tile layout; Home and End reach its edges. Enter or Space selects a tile, while its button acts independently."
        viewport={{ width: 'wide' }}
      >
        <Grid
          minColumnWidth={px(160)}
          autoFill
          gap="s"
          selectionMode="multiple"
          ariaLabel="Documents"
          rootAttributes={{ 'data-demo-grid': 'selectable-tiles' }}
        >
          {['Brief', 'Budget', 'Contract', 'Invoice', 'Receipt'].map(
            (name, index) => (
              <ContentItem
                interactive
                action="select-grid-tile"
                itemId={`tile-${index + 1}`}
                selectionMode="multiple"
                selected={gridTileSelections.value.includes(
                  `tile-${index + 1}`,
                )}
                ariaLabel={name}
                frame="framed"
              >
                <strong>{name}</strong>
                <button type="button" data-action="log-card-primary">
                  Add as quote
                </button>
              </ContentItem>
            ),
          )}
        </Grid>
      </CatalogExample>
    </CatalogExampleStack>
  );
}
