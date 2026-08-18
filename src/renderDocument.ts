/**
 * `renderDocument(node)` — prepend the doctype to a rendered document.
 *
 * Every kerf SSR app ends its routes with the identical concat
 * `"<!DOCTYPE html>" + page.toString()`. This is that one line, blessed, so the
 * doctype isn't reinvented (or forgotten) per route.
 *
 *   import { renderDocument } from 'kerfjs';
 *   return c.html(renderDocument(<Page />));   // "<!DOCTYPE html><html>…"
 *
 * `node` is a `SafeHtml` (from JSX / the `html` tagged template) or a raw string
 * — both are stringified via `.toString()`. The optional `doctype` overrides the
 * default `'html'`.
 */
import type { SafeHtml } from './jsx-runtime.js';

/** Options for {@link renderDocument}. */
export interface RenderDocumentOptions {
  /** The doctype name. Default `'html'` → `<!DOCTYPE html>`. */
  doctype?: string;
}

/** Prepend `<!DOCTYPE …>` to a rendered `SafeHtml` (or string) document and return the full HTML string. */
export function renderDocument(node: SafeHtml | string, options: RenderDocumentOptions = {}): string {
  const { doctype = 'html' } = options;
  return `<!DOCTYPE ${doctype}>${node.toString()}`;
}
