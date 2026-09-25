import { filterDataAttributes } from '../../extension-attributes.js';
import type { KerfUiContent } from '../../semantic-content.js';

const protectedAttributes = new Set([
  'data-catalog-example',
  'data-catalog-example-stack',
  'data-catalog-example-label',
  'data-catalog-example-note',
  'data-align',
]);

type CatalogExampleStackRootAttributes = Readonly<
  Record<`data-${string}`, string | undefined> & {
    'data-catalog-example'?: never;
    'data-catalog-example-stack'?: never;
    'data-catalog-example-label'?: never;
    'data-catalog-example-note'?: never;
    'data-align'?: never;
  }
>;

export interface CatalogExampleStackProps {
  label?: string;
  rootAttributes?: CatalogExampleStackRootAttributes;
  className?: string;
  children?: KerfUiContent;
  /** Native named-slot assignment when composed inside a web component. */
  slot?: string;
}

/** A vertically stacked group of catalog examples. */
export function CatalogExampleStack({
  label,
  rootAttributes = {},
  className = '',
  children,
  slot,
}: CatalogExampleStackProps) {
  const safeRootAttributes = filterDataAttributes(
    rootAttributes,
    protectedAttributes,
  );

  return (
    <section
      {...safeRootAttributes}
      class={`kui-catalog-example-stack ${className}`.trim()}
      data-catalog-example-stack
      aria-label={label}
      slot={slot}
    >
      {children}
    </section>
  );
}
