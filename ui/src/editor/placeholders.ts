// Placeholder values for app-supplied props in the editor's preview
// (KF-H3CB2P: app-supplied values). A document takes a function or a model
// through a prop-typed param the application passes; on the canvas no
// application runs, so each such prop gets a stand-in that does something
// typically useful, or nothing at all. A host adds or replaces them with
// `createEditorCatalog({ placeholders })`, keyed `<component key>.<prop>`.
import { jsx } from 'kerfjs/jsx-runtime';

import { createSearchFieldModel } from '../components/forms/search-field/model/search-field-model.js';

/** A placeholder's factory: called for each preview, so state never leaks. */
export type Placeholder = () => unknown;

/** Placeholders by `<component key>.<prop>`. */
export type Placeholders = Readonly<Record<string, Placeholder>>;

/** Kerf UI's own app-supplied props. */
export const KERF_UI_PLACEHOLDERS: Placeholders = {
  // The selected choice's label, as the default rendering shows it.
  '@kerfjs/ui:select.renderSelected': () => (choice: { label: string }) =>
    jsx('span', { children: choice.label }),
  // A working model with no rules: typing edits the query.
  '@kerfjs/ui:search-field.model': () => createSearchFieldModel(),
};
