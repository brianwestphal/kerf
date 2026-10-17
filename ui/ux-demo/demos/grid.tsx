import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { ContentItem } from '@kerfjs/ui/content-item';
import { px } from '@kerfjs/ui/css-values';
import { Grid } from '@kerfjs/ui/grid';
import { Text } from '@kerfjs/ui/text';
import { TextField } from '@kerfjs/ui/text-field';

import { DemoFrameShell } from './demo-frame-shell.js';
import { gridTileSelections } from './state.js';

export function GridDemo() {
  return (
    <CatalogExampleStack rootAttributes={{ 'data-demo': 'grid' }}>
      <CatalogExample
        label="Two Columns"
        note="Related form fields divide the available width evenly with the standard homogeneous-group gap."
        align="inline-control"
      >
        <Grid columns={2} gap="m">
          <TextField label="Quantity" value="12" />
          <TextField label="Unit" value="pieces" />
        </Grid>
      </CatalogExample>
      <CatalogExample
        label="Four Columns"
        note="The same component accepts any positive column count; each minmax track stays equal even when content has different intrinsic widths. A fixed count keeps its tracks at every width, so it suits short content; use minColumnWidth for tiles with longer labels."
      >
        <Grid columns={4} gap="xs">
          {['Q1', 'Q2', 'Q3', 'Q4 est.'].map((label) => (
            <ContentItem appearance="surface" frame="framed">
              {label}
            </ContentItem>
          ))}
        </Grid>
      </CatalogExample>
      <CatalogExample
        label="Independent Gaps"
        note="Column tracks touch while rows use the m spacing token."
      >
        <Grid
          columns={2}
          gap={{ column: 'none', row: 'm' }}
          rootAttributes={{ 'data-demo-grid-gap-axes': '' }}
        >
          {['Plan', 'Build', 'Review', 'Ship'].map((label) => (
            <ContentItem appearance="surface" frame="framed">
              {label}
            </ContentItem>
          ))}
        </Grid>
      </CatalogExample>
      <CatalogExample
        label="Responsive Form Columns"
        note="Equal tracks stay at least 376px wide, then collapse to one when a second track no longer fits."
        viewport={{ width: 'wide' }}
        align="inline-control"
      >
        <Grid minColumnWidth={px(376)} gap="m">
          <TextField label="Provider Name" value="Example provider" />
          <TextField label="API Endpoint" value="https://example.test" />
        </Grid>
      </CatalogExample>
      <CatalogExample
        label="Text and Control Insets"
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
          <TextField label="Amount" value="12" />
        </Grid>
      </CatalogExample>
      <CatalogExample
        label="Flex Participation"
        note="Like Row and List, Grid can explicitly grow inside a flex-owned parent without changing its equal-track contract."
      >
        <DemoFrameShell>
          <Grid columns={3} gap="xs" flex>
            {['One', 'Two', 'Three'].map((label) => (
              <ContentItem appearance="surface" frame="framed">
                {label}
              </ContentItem>
            ))}
          </Grid>
        </DemoFrameShell>
      </CatalogExample>
      <CatalogExample
        label="Sparse Document Tiles"
        note="Auto-fill keeps empty tracks, so a single document tile stays at the shared card width instead of stretching across the row."
        viewport={{ width: 'wide' }}
      >
        <Grid minColumnWidth={px(160)} autoFill gap="m">
          <ContentItem appearance="surface" frame="framed">
            One document
          </ContentItem>
        </Grid>
      </CatalogExample>
      <CatalogExample
        label="Selectable Document Tiles"
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
                  Add as Quote
                </button>
              </ContentItem>
            ),
          )}
        </Grid>
      </CatalogExample>
    </CatalogExampleStack>
  );
}
