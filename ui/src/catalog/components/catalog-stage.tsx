import type { KerfUiContent } from '../../semantic-content.js';

interface CatalogStageProps {
  name: string;
  content: KerfUiContent;
  geometryOverlay?: boolean;
}

/** The centered preview canvas and its optional wire-managed geometry overlay. */
export function CatalogStage({
  name,
  content,
  geometryOverlay,
}: CatalogStageProps) {
  return (
    <section class="kui-catalog__stage" aria-label={`${name} preview`}>
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
