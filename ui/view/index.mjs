// @kerfjs/ui/view: the published, browser-safe view-document layer
// (docs/26-ui-editor.md). The private editor and the kerf-ui-view CLI are
// its clients; neither owns the format.
export {
  channelOf,
  createViewCatalog,
  isAssignable,
  isLiteralOf,
  parseCssCall,
  validateView,
  VIEW_DOCUMENT_SCHEMA_ID,
} from './validate.mjs';
