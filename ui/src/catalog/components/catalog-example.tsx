import type { SafeHtml } from 'kerfjs';

import { ListHeader } from '../../components/collections/list-header/list-header.js';
import { ListInsetText } from '../../components/collections/list-inset-text/list-inset-text.js';
import { Text } from '../../components/typography/text/text.js';
import type { KerfUiContent } from '../../shared/content/semantic-content.js';
import { filterDataAttributes } from '../../shared/dom/extension-attributes.js';
import { ensureSunkenTexture } from '../../shared/styles/sunken-texture.js';

/** How a specimen aligns its visible edge with its `ListHeader` label. */
export type CatalogExampleAlign =
  'glyph' | 'inline-control' | 'text-trigger' | 'none';

export interface CatalogExampleViewport {
  layout?: 'grid' | 'flex' | 'flex-column';
  /** Specimen width. `sidebar` (272px, capped at the stage) shows a sidebar
   *  pane's content at a production rail's width. */
  width?:
    'full' | 'sidebar' | 'compact' | 'medium' | 'wide' | 'text' | 'control';
  /** Fixed specimen height; `app` frames an application-sized recipe or layout.
   *  A fixed height is definite, so a child that fills with `height: 100%`
   *  (a horizontal `ResizableRegion`, say) spans the whole frame. */
  height?: 'short' | 'reduced' | 'medium' | 'tall' | 'app';
  /** A minimum the frame may grow past. It is not a definite height: a child
   *  sized with `height: 100%` falls back to its content height, so use
   *  `height` when the specimen must fill the frame. `app` (592px) is the
   *  application frame's height as a floor, for a stage that hosts a
   *  frame-anchored top-layer specimen above in-flow content. */
  minHeight?: 'short' | 'medium' | 'app';
  /** Names the frame as a CSS anchor (`anchor-name`), so a top-layer
   *  specimen whose own CSS sets `position-anchor` to this dashed-ident
   *  positions against the frame as it would against its production anchor.
   *  Anchor names are document-wide: give each frame on a page its own. */
  anchorName?: `--${string}`;
  /** Caps each in-flow child at a centered-or-start content column:
   *  `compact` (440px), `medium` (640px), or `wide` (864px), each capped at
   *  the frame. `[popover]` children keep their own geometry. Applies to
   *  block, `grid`, and `flex-column` flows. */
  contentWidth?: 'compact' | 'medium' | 'wide';
  /** Where a `contentWidth` column sits in the frame; default `start`. */
  contentAlign?: 'start' | 'center';
  frame?: 'solid' | 'dashed';
  surface?: 'default' | 'lowered';
  overflow?: 'hidden' | 'auto-x';
  responsive?: 'roomy-only';
  shadow?: boolean;
  /** Public component custom properties applied to the specimen viewport. */
  tokens?: Readonly<Record<`--${string}`, string>>;
}

// A CSS dashed-ident: `--` and at least one name code point.
const dashedIdent = /^--[\w\-\u0080-\u{10FFFF}]+$/u;

function viewportStyleOf(
  viewport: CatalogExampleViewport | undefined,
): string | undefined {
  if (viewport === undefined) return undefined;
  const declarations = Object.entries(viewport.tokens ?? {}).map(
    ([name, value]) => `${name}:${value}`,
  );
  const { anchorName } = viewport;
  if (anchorName !== undefined) {
    if (!dashedIdent.test(anchorName))
      throw new TypeError(
        `CatalogExample viewport.anchorName must be a CSS dashed-ident such as "--app-shell-main"; received ${JSON.stringify(anchorName)}`,
      );
    declarations.push(`anchor-name:${anchorName}`);
  }
  return declarations.length > 0 ? declarations.join(';') : undefined;
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

/**
 * A labeled catalog specimen with optional explanatory text and alignment. A
 * supplied `label` also names the rendered `section`, so each specimen is an
 * addressable region; an unlabeled example stays an ordinary grouping.
 */
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
  const viewportStyle = viewportStyleOf(viewport);
  if (viewport?.surface === 'lowered') ensureSunkenTexture();
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
      data-content-width={viewport.contentWidth}
      data-content-align={
        viewport.contentWidth === undefined ? undefined : viewport.contentAlign
      }
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
      aria-label={label}
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
        <ListInsetText
          sides="rl"
          className="kui-catalog-example__note"
          rootAttributes={{ 'data-catalog-example-note': '' }}
        >
          <Text variant="span" size="compact" tone="quiet">
            {note}
          </Text>
        </ListInsetText>
      ) : null}
      {compactFallback !== undefined ? (
        <Text tone="quiet" className="kui-catalog-example__compact-fallback">
          {compactFallback}
        </Text>
      ) : null}
      {specimen}
    </section>
  );
}
