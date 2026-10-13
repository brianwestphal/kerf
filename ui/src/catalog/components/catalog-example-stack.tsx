import type { KerfUiContent } from '../../shared/content/semantic-content.js';
import { filterDataAttributes } from '../../shared/dom/extension-attributes.js';

const protectedAttributes = new Set([
  'data-catalog-example',
  'data-catalog-example-stack',
  'data-catalog-example-label',
  'data-catalog-example-note',
  'data-align',
  'data-width',
]);

type CatalogExampleStackRootAttributes = Readonly<
  Record<`data-${string}`, string | undefined> & {
    'data-catalog-example'?: never;
    'data-catalog-example-stack'?: never;
    'data-catalog-example-label'?: never;
    'data-catalog-example-note'?: never;
    'data-align'?: never;
    'data-width'?: never;
  }
>;

/**
 * How wide a stack may grow: `reading` (default) caps it at a 736px reading
 * measure for component specimens; `full` lets it span the stage for
 * application-width compositions such as boards, app shells, drawers, and
 * split views.
 */
export type CatalogExampleStackWidth = 'reading' | 'full';

export interface CatalogExampleStackProps {
  label?: string;
  /** Maximum width of the stack (default `reading`). */
  width?: CatalogExampleStackWidth;
  rootAttributes?: CatalogExampleStackRootAttributes;
  className?: string;
  children?: KerfUiContent;
  /** Native named-slot assignment when composed inside a web component. */
  slot?: string;
}

/** A vertically stacked group of catalog examples. */
export function CatalogExampleStack({
  label,
  width = 'reading',
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
      data-width={width === 'full' ? 'full' : undefined}
      aria-label={label}
      slot={slot}
    >
      {children}
    </section>
  );
}
