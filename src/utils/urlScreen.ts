/**
 * URL-attribute screening, shared by the JSX runtime's static-attribute
 * serializer (`renderAttr` in `jsx-runtime.ts`) and the fine-grained binding's
 * live-attribute writer (`setBoundAttr` in `bindings.ts`) — KF-297.
 *
 * A stored-XSS payload like `href={userInput}` with `javascript:alert(1)` is
 * dropped (attribute omitted from the string / removed from the live node)
 * rather than written. `raw(...)` / `SafeHtml` values bypass this — the
 * documented opt-out for legitimate cases (bookmarklet builders, values
 * sanitized by a separate trust layer).
 */

/** URL-bearing HTML/SVG attributes whose plain-string values are screened. */
const URL_ATTRS = new Set(['href', 'src', 'xlink:href', 'formaction', 'action']);

const DANGEROUS_URL_RE = /^\s*(?:(?:java|vb)script:|data:text\/html[;,])/i;

/** True if `value` is a dangerous URL for the URL-bearing attribute `name`. */
export function isDangerousUrlValue(name: string, value: string): boolean {
  return URL_ATTRS.has(name) && DANGEROUS_URL_RE.test(value);
}

/**
 * The shared warning body for a dropped dangerous URL. Each caller prefixes
 * its own context (`JSX:` for the string serializer, `kerf binding:` for the
 * live-attribute writer).
 */
export function dangerousUrlWarning(name: string, value: string): string {
  return `dropped dangerous URL value for ${name}=${JSON.stringify(value.slice(0, 80))}. `
    + 'kerf blocks javascript:, vbscript:, and data:text/html URLs in href/src/formaction/action/xlink:href by default. '
    + 'Wrap in raw() if this is intentional (e.g. bookmarklets), or sanitize upstream.';
}
