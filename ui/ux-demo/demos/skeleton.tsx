import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { Skeleton } from '@kerfjs/ui/skeleton';
import { ValueTable, ValueTableRow } from '@kerfjs/ui/value-table';

export function SkeletonDemo() {
  return (
    <CatalogExampleStack rootAttributes={{ 'data-demo': 'skeleton' }}>
      <CatalogExample
        label="Primitive"
        note={
          <>
            Subtle, unanimated blocks that hold a value's space. Decorative
            unless labeled.
          </>
        }
        align="glyph"
      >
        <div class="demo-skeleton-blocks">
          <Skeleton width="12em" />
          <Skeleton width="8em" height="1.5em" />
          <Skeleton lines={3} />
          <Skeleton width="6em" label="Loading value" />
        </div>
      </CatalogExample>
      <CatalogExample
        label="In composition"
        note={
          <>
            Value-bearing components accept a <code>placeholder</code> prop that
            renders their real chrome with skeleton value slots. See the{' '}
            <strong>Loading inspector</strong> recipe for a full composition.
          </>
        }
        rootAttributes={{ 'data-catalog-geometry-overlay-skip': '' }}
      >
        <ValueTable label="Placeholder rows">
          <ValueTableRow label="Status" value="" placeholder />
          <ValueTableRow label="Owner" value="" placeholder />
        </ValueTable>
      </CatalogExample>
    </CatalogExampleStack>
  );
}
