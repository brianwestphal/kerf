import type { SafeHtml } from 'kerfjs';

import { filterDataAttributes } from '../../extension-attributes.js';
import { ListHeader } from '../../list-header.js';
import type { KerfUiContent } from '../../semantic-content.js';

/** How a specimen aligns its visible edge with its `ListHeader` label. */
export type CatalogExampleAlign = 'glyph' | 'inline-control' | 'none';

export interface CatalogExampleViewport {
  layout?: 'grid' | 'flex' | 'flex-column';
  width?: 'full' | 'compact' | 'medium' | 'wide' | 'text' | 'control';
  /** Fixed specimen height; `app` frames an application-sized recipe or layout. */
  height?: 'short' | 'reduced' | 'medium' | 'tall' | 'app' | 'fill';
  minHeight?: 'short' | 'medium';
  frame?: 'solid' | 'dashed';
  surface?: 'default' | 'lowered';
  overflow?: 'hidden' | 'auto-x';
  responsive?: 'roomy-only';
  shadow?: boolean;
  fillChildren?: boolean;
  /** Public component custom properties applied to the specimen viewport. */
  tokens?: Readonly<Record<`--${string}`, string>>;
}

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
  /** Optional catalog-owned constraints for demonstrating layout components. */
  viewport?: CatalogExampleViewport;
  /** Replacement guidance shown when a roomy-only viewport is hidden. */
  compactFallback?: SafeHtml | string;
  rootAttributes?: CatalogExampleRootAttributes;
  className?: string;
  children?: KerfUiContent;
  /** Native named-slot assignment when composed inside a web component. */
  slot?: string;
}

/** A labeled catalog specimen with optional explanatory text and alignment. */
export function CatalogExample({
  label,
  note,
  align = 'none',
  viewport,
  compactFallback,
  rootAttributes = {},
  className = '',
  children,
  slot,
}: CatalogExampleProps) {
  const safeRootAttributes = filterDataAttributes(
    rootAttributes,
    protectedAttributes,
  );
  const viewportStyle = viewport?.tokens
    ? Object.entries(viewport.tokens)
        .map(([name, value]) => `${name}:${value}`)
        .join(';')
    : undefined;
  const specimen = viewport ? (
    <div
      class="kui-catalog-example__viewport"
      data-catalog-example-viewport
      data-layout={viewport.layout}
      data-width={viewport.width}
      data-height={viewport.height}
      data-min-height={viewport.minHeight}
      data-frame={viewport.frame}
      data-surface={viewport.surface}
      data-overflow={viewport.overflow}
      data-responsive={viewport.responsive}
      data-shadow={viewport.shadow ? 'true' : undefined}
      data-fill-children={viewport.fillChildren ? 'true' : undefined}
      style={viewportStyle}
    >
      {children}
    </div>
  ) : (
    children
  );

  return (
    <section
      {...safeRootAttributes}
      class={`kui-catalog-example ${className}`.trim()}
      data-catalog-example
      data-align={align}
      slot={slot}
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
      {compactFallback !== undefined ? (
        <p class="kui-catalog-example__compact-fallback">{compactFallback}</p>
      ) : null}
      {specimen}
    </section>
  );
}
