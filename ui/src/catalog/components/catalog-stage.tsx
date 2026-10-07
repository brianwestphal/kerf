import type { KerfUiContent } from '../../shared/content/semantic-content.js';
import { filterDataAttributes } from '../../shared/dom/extension-attributes.js';
import type {
  CatalogBackgroundStyle,
  CatalogStageRootAttributes,
} from '../types.js';

const protectedAttributes = new Set([
  'data-catalog-stage',
  'data-background-style',
]);

interface CatalogStageProps {
  name: string;
  content: KerfUiContent;
  backgroundStyle?: CatalogBackgroundStyle;
  rootAttributes?: CatalogStageRootAttributes;
}

/** The preview canvas for an active Catalog entry. */
export function CatalogStage({
  name,
  content,
  backgroundStyle = 'checkerboard',
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
      data-background-style={backgroundStyle}
      aria-label={`${name} preview`}
    >
      <div class="kui-catalog__canvas">{content}</div>
    </section>
  );
}
