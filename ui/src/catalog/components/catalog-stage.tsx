import { filterDataAttributes } from '../../extension-attributes.js';
import type { KerfUiContent } from '../../semantic-content.js';
import type { CatalogStageRootAttributes } from '../types.js';

const protectedAttributes = new Set(['data-catalog-stage']);

interface CatalogStageProps {
  name: string;
  content: KerfUiContent;
  geometryOverlay?: boolean;
  rootAttributes?: CatalogStageRootAttributes;
}

/** The centered preview canvas and its optional wire-managed geometry overlay. */
export function CatalogStage({
  name,
  content,
  geometryOverlay,
  rootAttributes = {},
}: CatalogStageProps) {
  const safeRootAttributes = filterDataAttributes(
    rootAttributes,
    protectedAttributes,
  );
  return (
    <section
      {...safeRootAttributes}
      class="kui-catalog__stage"
      data-catalog-stage
      aria-label={`${name} preview`}
    >
      <div class="kui-catalog__canvas">
        {content}
        {geometryOverlay !== undefined ? (
          <div
            class="kui-catalog__geometry-overlay"
            data-catalog-geometry-overlay
            data-morph-skip-children
            aria-hidden="true"
          />
        ) : null}
      </div>
    </section>
  );
}
