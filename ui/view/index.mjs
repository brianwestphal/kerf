// @kerfjs/ui/view: the published, browser-safe view-document layer
// (docs/26-ui-editor.md). The private editor and the kerf-ui-view CLI are
// its clients; neither owns the format.
export {
  channelOf,
  createViewCatalog,
  isAssignable,
  isLiteralOf,
  parseCssCall,
  parseCssTree,
  validateView,
  VIEW_DOCUMENT_SCHEMA_ID,
} from './validate.mjs';
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
  printDoc,
  readViewHeader,
  viewModulePath,
} from './generate.mjs';
export { interpretView, KuiContractMismatch } from './interpret.mjs';
