import type { SafeHtml } from 'kerfjs';

import { filterDataAttributes } from '../../extension-attributes.js';
import { ListHeader } from '../../list-header.js';
import type { KerfUiContent } from '../../semantic-content.js';

/** How a specimen aligns its visible edge with its `ListHeader` label. */
export type CatalogExampleAlign = 'glyph' | 'inline-control' | 'none';

const protectedAttributes = new Set([
  'data-catalog-example',
  'data-catalog-example-stack',
  'data-catalog-example-label',
  'data-catalog-example-note',
  'data-align',
]);

type CatalogExampleRootAttributes = Readonly<
  Record<`data-${string}`, string | undefined> & {
    'data-catalog-example'?: never;
    'data-catalog-example-stack'?: never;
    'data-catalog-example-label'?: never;
    'data-catalog-example-note'?: never;
    'data-align'?: never;
  }
>;

export interface CatalogExampleProps {
  label?: string;
  note?: SafeHtml | string;
  align?: CatalogExampleAlign;
  rootAttributes?: CatalogExampleRootAttributes;
  className?: string;
  children?: KerfUiContent;
}

/** A labeled catalog specimen with optional explanatory text and alignment. */
export function CatalogExample({
  label,
  note,
  align = 'none',
  rootAttributes = {},
  className = '',
  children,
}: CatalogExampleProps) {
  const safeRootAttributes = filterDataAttributes(
    rootAttributes,
    protectedAttributes,
  );

  return (
    <section
      {...safeRootAttributes}
      class={`kui-catalog-example ${className}`.trim()}
      data-catalog-example
      data-align={align}
    >
      {label !== undefined ? (
        <ListHeader
          label={label}
          width="content"
          rootAttributes={{ 'data-catalog-example-label': '' }}
        />
      ) : null}
      {note !== undefined ? (
        <p class="kui-catalog-example__note" data-catalog-example-note>
          {note}
        </p>
      ) : null}
      {children}
    </section>
  );
}
