// The editor's starting document, checked against the catalog it opens in
// (KF-5MVBPB: no unchecked cast), so a sample that drifts from the catalog
// fails loudly at startup and in the host unit test rather than opening as
// a broken document.
import {
  validateView,
  type ViewCatalog,
  type ViewDocument,
} from '@kerfjs/ui/view';

import sample from './sample.kui.json';

const isValidDocument = (
  value: unknown,
  catalog: ViewCatalog,
): value is ViewDocument => validateView(value, catalog).valid;

/** The sample document, validated against `catalog`; throws if invalid. */
export function loadSample(catalog: ViewCatalog): ViewDocument {
  if (isValidDocument(sample, catalog)) return sample;
  const problems = validateView(sample, catalog).diagnostics.map(
    ({ code, path, message }) => `${code} ${path}: ${message}`,
  );
  throw new Error(`The editor sample is not valid:\n${problems.join('\n')}`);
}
