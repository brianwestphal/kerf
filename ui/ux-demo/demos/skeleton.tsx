import { CatalogExample } from '@kerfjs/ui/catalog';
import { ListHeader } from '@kerfjs/ui/list-header';
import { Skeleton } from '@kerfjs/ui/skeleton';
import { ValueTable, ValueTableRow } from '@kerfjs/ui/value-table';

export function SkeletonDemo() {
  return (
    <div class="kui-catalog-example-stack" data-demo="skeleton">
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
      <section
        class="kui-catalog-example"
        data-align="none"
        data-demo-overlay-skip
      >
        <ListHeader label="In composition" />
        <p class="kui-catalog-example__note">
          Value-bearing components accept a <code>placeholder</code> prop that
          renders their real chrome with skeleton value slots. See the{' '}
          <strong>Loading inspector</strong> recipe for a full composition.
        </p>
        <ValueTable label="Placeholder rows">
          <ValueTableRow label="Status" value="" placeholder />
          <ValueTableRow label="Owner" value="" placeholder />
        </ValueTable>
      </section>
    </div>
  );
}
