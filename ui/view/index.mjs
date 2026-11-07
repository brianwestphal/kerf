// @kerfjs/ui/view: the published, browser-safe view-document layer
// (docs/26-ui-editor.md). The private editor and the kerf-ui-view CLI are
// its clients; neither owns the format.
export { childKind, classifyChild } from './child-kind.mjs';
export { channelOf, createViewCatalog, fieldZoneOf } from './catalog.mjs';
export { parseCssCall, parseCssTree } from './css-grammar.mjs';
export { isAssignable, isLiteralOf } from './types.mjs';
export {
  composedViewPath,
  dataAttributeProblem,
  validateView,
  VIEW_DOCUMENT_SCHEMA_ID,
} from './validate.mjs';
export { createMoveCheck } from './validate-move.mjs';
export {
  canonicalJson,
  contractDigest,
  contractOf,
  diffContracts,
  serializeContract,
  typeText,
  viewDigest,
  walkView,
} from './contract.mjs';
export {
  GENERATOR_VERSION,
  generateView,
  lucideExportName,
  moduleSpecifier,
  printDoc,
  readViewHeader,
  viewModulePath,
} from './generate.mjs';
export {
  interpretView,
  KuiContractMismatch,
  previewView,
} from './interpret.mjs';
