/** Public compatibility surface for the decomposed catalog components. */
export { Catalog } from './catalog/components/catalog.js';
export {
  CatalogExample,
  type CatalogExampleAlign,
  type CatalogExampleProps,
  type CatalogExampleViewport,
} from './catalog/components/catalog-example.js';
export {
  CatalogExampleStack,
  type CatalogExampleStackProps,
  type CatalogExampleStackWidth,
} from './catalog/components/catalog-example-stack.js';
export type {
  CatalogBackgroundStyle,
  CatalogBrand,
  CatalogEntry,
  CatalogProps,
  CatalogRelated,
  CatalogResource,
  CatalogSecondaryGroup,
  CatalogSection,
  CatalogSettingsConfig,
  CatalogStageRootAttributes,
  CatalogTagFilter,
  CatalogUxReview,
} from './catalog/types.js';
export {
  loadUxReviewProject,
  UX_REVIEW_PROJECT_PATH,
  type UxReviewCapture,
  uxReviewCaptureUrl,
} from './catalog/ux-review.js';
