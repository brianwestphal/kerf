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
 *
 * The screen is a scheme allow/deny check, not a full URL sanitizer, but it is
 * hardened against the obfuscations a real browser sees through:
 *
 *   - **Control-character / whitespace obfuscation of the scheme.** Browsers
 *     strip leading C0 controls + spaces and remove TAB/LF/CR from anywhere in
 *     a URL before resolving the scheme, so `java\tscript:`, `\x01javascript:`,
 *     and `javascript\x00:` all resolve to `javascript:`. We normalize the same
 *     way (strip every C0 control 0x00-0x1F + DEL, trim leading whitespace)
 *     BEFORE extracting the scheme, so none of those slip past.
 *
 *   - **`data:` is subtype-specific.** `data:image/png` in `<img src>` is safe
 *     and common; `data:text/html` / `data:image/svg+xml` / `data:*xml` load as
 *     a document and run script (SVG `<script>`, HTML/XHTML `<script>`). We
 *     allowlist the inert media families (raster images, fonts, audio, video,
 *     plain text/css) and drop every other `data:` — so a novel dangerous
 *     subtype fails closed.
 */

/**
 * URL-bearing HTML/SVG attributes whose plain-string values are screened.
 * `data` covers `<object data>` (loads its target as a document, so
 * `data:text/html` there executes). Image-context URL attributes
 * (`srcset` / `poster` / `background` / `ping`) are intentionally NOT screened:
 * a `javascript:` / `data:` value in them does not execute as script in modern
 * browsers, so screening would add false positives without closing a real sink.
 */
const URL_ATTRS = new Set(['href', 'src', 'xlink:href', 'formaction', 'action', 'data']);

/** Schemes that execute script when a browser resolves them as a URL. */
const DANGEROUS_SCHEMES = new Set(['javascript', 'vbscript']);

/** Matches every C0 control character (0x00-0x1F) and DEL (0x7F). */
// eslint-disable-next-line no-control-regex -- deliberately matching C0 + DEL.
const CONTROL_CHARS = /[\u0000-\u001F\u007F]/g;

/**
 * Normalize a URL the way a browser does before scheme resolution: remove every
 * C0 control (0x00-0x1F) and DEL (0x7F) from anywhere — no legitimate URL
 * carries a raw control char (they must be percent-encoded), so this collapses
 * `java\tscript:` / `\x01javascript:` / `javascript\x00:` back to their real
 * scheme — then trim leading whitespace. Internal spaces are left intact: a
 * space is not a valid scheme character, so a browser treats `java script:` as
 * a relative URL, not the `javascript:` scheme, and we must not "repair" it
 * into a false positive.
 */
function normalizeUrl(value: string): string {
  return value.replace(CONTROL_CHARS, '').replace(/^\s+/, '');
}

/** The lowercased URL scheme (text before the first `:`), or null if none. */
function extractScheme(value: string): string | null {
  const m = /^([a-zA-Z][a-zA-Z0-9+.-]*):/.exec(normalizeUrl(value));
  return m ? m[1].toLowerCase() : null;
}

/**
 * True if a `data:` URL is a script-executing document type. Allowlists the
 * inert media families and fails closed on everything else — so `text/html`,
 * `image/svg+xml`, XHTML/XML, and any unknown/novel subtype are all treated as
 * dangerous, while `data:image/png` / fonts / audio / video / plain text pass.
 */
function isDangerousDataUrl(value: string): boolean {
  const media = /^data:([^;,]*)/.exec(normalizeUrl(value).toLowerCase())?.[1].trim() ?? '';
  if (media === '' || media === 'text/plain' || media === 'text/css') return false;
  if (media === 'image/svg+xml') return true; // SVG can carry <script>
  if (media.startsWith('image/')) return false;
  if (media.startsWith('font/') || media.startsWith('application/font')) return false;
  if (media.startsWith('audio/') || media.startsWith('video/')) return false;
  return true; // text/html, application/xhtml+xml, *xml, unknown → block
}

/** True if `value` is a dangerous URL for the URL-bearing attribute `name`. */
export function isDangerousUrlValue(name: string, value: string): boolean {
  if (!URL_ATTRS.has(name)) return false;
  const scheme = extractScheme(value);
  if (scheme === null) return false;
  if (DANGEROUS_SCHEMES.has(scheme)) return true;
  return scheme === 'data' && isDangerousDataUrl(value);
}

/**
 * The shared warning body for a dropped dangerous URL. Each caller prefixes
 * its own context (`JSX:` for the string serializer, `kerf binding:` for the
 * live-attribute writer).
 */
export function dangerousUrlWarning(name: string, value: string): string {
  return `dropped dangerous URL value for ${name}=${JSON.stringify(value.slice(0, 80))}. `
    + 'kerf blocks javascript:, vbscript:, and script-executing data: URLs '
    + '(text/html, image/svg+xml, xml) in href/src/data/formaction/action/xlink:href by default. '
    + 'Wrap in raw() if this is intentional (e.g. bookmarklets), or sanitize upstream.';
}
