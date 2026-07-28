/**
 * JSX intrinsic-element types — kerf's per-tag attribute contracts.
 *
 * Replaces the previous `[elemName: string]: Record<string, unknown>`
 * catch-all that allowed any tag and any prop. Now: known tags get focused
 * attribute interfaces (typos fail to compile); unknown tags require
 * declaration merging to opt in.
 *
 * Coverage is intentionally focused, not exhaustive. The most common ~30
 * HTML elements + the SVG primitives that make up `toElement`'s fragment
 * set are typed in detail. Rare attributes can be added in follow-ups, or
 * extended on a per-project basis via declaration merging into the
 * `kerfjs/jsx-runtime` JSX namespace (KF-100):
 *
 *     import type { KerfBaseAttrs, KerfCustomElement } from 'kerfjs/jsx-runtime';
 *
 *     declare module 'kerfjs/jsx-runtime' {
 *       namespace JSX {
 *         interface IntrinsicElements {
 *           'my-element': KerfCustomElement & { foo?: string };
 *         }
 *       }
 *     }
 *
 * `IntrinsicElements` in `jsx-runtime` is an **interface** that extends the
 * one defined here, which is what makes the merge above work — type aliases
 * (the previous shape) couldn't be merged.
 *
 * Every attribute value is `AttrValue` — string / number / boolean / null /
 * undefined / `SafeHtml`. Event-handler props (`onClick` etc.) are
 * deliberately omitted: kerf renders to strings, so inline handlers do
 * nothing. Use `delegate()` / `delegateCapture()` instead.
 *
 * ---
 *
 * ## Provenance — where these types come from
 *
 * Attribute names, value sets, and per-element membership are taken from the
 * **WHATWG HTML Living Standard** (and **SVG 2** for the SVG interfaces), with
 * MDN used only as a readable index into them. They are NOT derived from
 * `@types/react`, `lib.dom.d.ts`, or any other framework's table — those model
 * a *property* surface (`HTMLElement.draggable: boolean`), and kerf emits
 * *content attributes* into an HTML string, which is a different contract in
 * exactly the places that bite (see the enumerated-attribute rule below).
 *
 * Coverage is deliberately focused rather than exhaustive: the ~100 most-used
 * elements and their commonly-authored attributes. A missing attribute is a
 * gap to fill, not a statement that it's invalid — extend via declaration
 * merging (above) until it lands here.
 *
 * ## The rule that governs every value type
 *
 * `boolean` in an attribute type means **HTML boolean attribute** — one whose
 * *presence* is the whole signal. `foo={true}` renders ` foo` and `foo={false}`
 * renders nothing, so only attributes with those exact semantics may accept a
 * boolean.
 *
 * HTML's **enumerated** attributes look boolean but are not: they take the
 * literal *strings* `"true"` / `"false"`, and their missing-value default is a
 * third state. Typing one as `boolean` produces markup that silently means the
 * opposite of what was written:
 *
 *   - `draggable={true}` → `<div draggable>` → empty value is invalid for
 *     `draggable`, so the element falls to the **auto** state — which for a
 *     `<div>` means **not draggable**. The attribute that was supposed to turn
 *     dragging on turns nothing on.
 *   - `draggable={false}` → attribute omitted → **auto** again, and auto for
 *     `<img>` / `<a href>` is *draggable*. The disable never happens either.
 *   - `spellCheck={false}` / `contentEditable={false}` → omitted → the
 *     **inherit** default, not the false state. (Their `true` direction happens
 *     to work: the empty string is a spec keyword for the true state on those
 *     two, unlike `draggable`.)
 *
 * So `draggable`, `spellcheck`, and `contenteditable` are typed as string
 * literal unions here and reject `boolean` outright. The fix is at the type
 * level rather than in the runtime on purpose: translating `{true}` →
 * `="true"` would require the renderer to carry a list of every enumerated
 * attribute in HTML, and any attribute *missing* from that list would silently
 * regress to precisely this bug. A per-attribute type keeps the knowledge where
 * the spec knowledge already lives and costs nothing at runtime. The tradeoff
 * is a compile error on `draggable={true}` — which is the point.
 *
 * One residual hole this cannot close: a signal-valued attribute
 * (`draggable={sig}`) is `ReadonlySignal<unknown>`, so a boolean inside it is
 * invisible to the type system. Put the string in the signal: `signal('true')`.
 *
 * ## Deliberate deviations from the spec
 *
 * Each of these is a knowing departure, kept because removing it would cost
 * more than it buys:
 *
 *   - **Lowercase aliases** (`class`, `for`, `tabindex`, `autofocus`,
 *     `spellcheck`, `contenteditable`, `autocomplete`) sit alongside the
 *     camelCase forms. Both spellings are accepted because the migration docs
 *     tell incoming developers to write the real HTML name.
 *   - **`contentEditable="inherit"`** is accepted but is *not* a spec keyword.
 *     It lands on the inherit state only via the invalid-value default. Kept
 *     for React parity; omitting the attribute is the spec-correct way to
 *     inherit.
 *   - **`tabindex` / `autofocus` / `capture`** accept a widened value set
 *     (string ints, plain `boolean`) matching what the parser actually honors.
 *   - **`cellPadding` / `cellSpacing`** are obsolete presentational attributes,
 *     marked `@deprecated` rather than removed so legacy markup still compiles.
 *   - **`xlink:*`** attributes are deprecated in SVG 2 but still typed — real
 *     documents and icon sprites still carry them.
 *   - **`data-morph-skip` / `-skip-children` / `-preserve`** are kerf's own
 *     `data-*` attributes, valid HTML by the `data-*` rule.
 *   - **`<meta property>`** is Open Graph vocabulary, not an attribute in the
 *     HTML standard. Typed anyway because it is universal in real documents —
 *     every social-preview `<head>` carries `og:*` meta tags.
 *
 * Attributes that are *not* typed because they do nothing when rendered as
 * markup: `value` / `defaultValue` on `<select>` and `<textarea>` (neither
 * element has a `value` content attribute — a select's selection comes from
 * `<option selected>`, a textarea's value is its child text), and any `on*`
 * handler prop (rejected at runtime — use `delegate()`).
 */

import type { SafeHtml } from './jsx-runtime.js';
import type { ReadonlySignal } from './reactive.js';

/**
 * Every kerf attribute value resolves to one of these. A `ReadonlySignal`
 * (covariant — accepts both `signal()` and `computed()` of any T) is a
 * KF-294 fine-grained attribute binding: handed a signal, the runtime updates
 * that attribute directly on change instead of re-running the render.
 */
export type AttrValue = string | number | boolean | null | undefined | SafeHtml
  | ReadonlySignal<unknown>;

/** A typed-narrowing helper: `AttrLike<'a'|'b'>` accepts the literals plus the runtime fall-throughs. */
export type AttrLike<T = string> = T | SafeHtml | null | undefined | ReadonlySignal<unknown>;

/**
 * `data-*` and `aria-*` index signatures. Applied via `KerfBaseAttrs` so
 * every typed element accepts them without per-element enumeration.
 */
export interface DataAriaAttrs {
  [k: `data-${string}`]: AttrValue;
  [k: `aria-${string}`]: AttrValue;
}

/** Attributes valid on essentially every HTML element. */
export interface KerfBaseAttrs extends DataAriaAttrs {
  id?: AttrLike;
  className?: AttrLike;
  /**
   * KF-191 — lowercase HTML form accepted alongside `className`. The
   * migration doc (`docs/10-migrating.md` / the published React-migration
   * page) tells incoming developers to write `class` because that's the
   * canonical HTML attribute name; the type system now accepts either
   * spelling so `<div class="...">` per the docs compiles cleanly.
   */
  class?: AttrLike;
  style?: AttrLike;
  title?: AttrLike;
  lang?: AttrLike;
  dir?: AttrLike<'ltr' | 'rtl' | 'auto'>;
  /**
   * A genuine HTML boolean attribute, so `hidden={true}` → ` hidden` is
   * correct. `'until-found'` is the one non-boolean keyword: the element is
   * hidden but still findable by find-in-page and fragment navigation, which
   * reveals it.
   */
  hidden?: AttrLike<boolean | 'until-found'>;
  /**
   * Enumerated, NOT boolean — write `draggable="true"` / `draggable="false"`.
   * `boolean` is rejected because both directions would render the wrong
   * state: `{true}` emits an empty value (invalid → the **auto** state, which
   * for most elements means *not* draggable) and `{false}` omits the attribute
   * (auto again — and auto for `<img>` / `<a href>` is *draggable*). Omit the
   * attribute to mean auto. See the enumerated-attribute rule in this file's
   * header.
   */
  draggable?: AttrLike<'true' | 'false'>;
  /**
   * Enumerated, NOT boolean — write `contentEditable="true"` / `="false"`.
   * `contentEditable={false}` would omit the attribute, which means *inherit*,
   * not false — so a child of an editable region would stay editable.
   *
   * `'inherit'` is not a spec keyword; it reaches the inherit state only
   * through the invalid-value default. Accepted for React parity, but omitting
   * the attribute is the spec-correct way to inherit.
   */
  contentEditable?: AttrLike<'true' | 'false' | 'inherit' | 'plaintext-only'>;
  /**
   * KF-191 — lowercase HTML form accepted alongside `contentEditable` (same
   * shape as `class` / `tabindex` / `autofocus` / `spellcheck`), with the same
   * enumerated value set.
   */
  contenteditable?: AttrLike<'true' | 'false' | 'inherit' | 'plaintext-only'>;
  inputMode?: AttrLike<'none' | 'text' | 'tel' | 'url' | 'email' | 'numeric' | 'decimal' | 'search'>;
  /**
   * Enumerated, NOT boolean — write `spellCheck="false"` to turn spellchecking
   * off. `spellCheck={false}` would omit the attribute, which means *inherit
   * the default*, not off; the disable would silently never happen.
   */
  spellCheck?: AttrLike<'true' | 'false'>;
  /** KF-183 — lowercase HTML form accepted alongside `spellCheck`. */
  spellcheck?: AttrLike<'true' | 'false'>;
  tabIndex?: AttrLike<number>;
  /**
   * KF-191 — lowercase HTML form accepted alongside `tabIndex`. Widened to
   * also accept strings because the HTML spec defines `tabindex` as a
   * string-valued integer attribute, and an HTML-savvy developer typing
   * the lowercase form will naturally reach for `tabindex="0"`.
   */
  tabindex?: AttrLike<number | string>;
  role?: AttrLike;
  slot?: AttrLike;
  is?: AttrLike;
  autoCapitalize?: AttrLike<'off' | 'none' | 'on' | 'sentences' | 'words' | 'characters'>;
  autoFocus?: AttrLike<boolean>;
  /**
   * KF-191 — lowercase HTML form accepted alongside `autoFocus`.
   *
   * A real boolean attribute, so only `boolean` is accepted. The string forms
   * are deliberately NOT allowed: `autofocus="false"` is *present*, and a
   * present boolean attribute is true regardless of its value — the spelling
   * that reads like "off" turns autofocus **on**. Use `{false}` or omit it.
   */
  autofocus?: AttrLike<boolean>;
  accessKey?: AttrLike;
  /**
   * A genuine HTML boolean attribute (the subtree becomes non-interactive and
   * invisible to assistive tech), so `inert={true}` → ` inert` is correct.
   */
  inert?: AttrLike<boolean>;
  /**
   * Enumerated: `auto` / `hint` / `manual` — but the boolean forms are ALSO
   * accepted, because both land on spec states, unlike `draggable`:
   * `popover={true}` renders the bare attribute, whose empty value is a spec
   * keyword for the **auto** state (`<div popover>` is the canonical
   * spelling), and `popover={false}` omits it — the not-a-popover state.
   */
  popover?: AttrLike<'auto' | 'hint' | 'manual' | boolean>;
  /** CSP nonce. A global attribute — most useful on `<script>` / `<style>` / `<link>`. */
  nonce?: AttrLike;
  /** Shadow-DOM part name(s) this element exposes for `::part()` styling. */
  part?: AttrLike;
  /** All-lowercase in HTML (`exportparts`) — there is no camelCase form to alias. */
  exportparts?: AttrLike;
  enterKeyHint?: AttrLike<'enter' | 'done' | 'go' | 'next' | 'previous' | 'search' | 'send'>;
  /**
   * Enumerated, NOT boolean — write `translate="yes"` / `translate="no"`.
   * `translate={false}` would omit the attribute, which means *inherit*, not
   * "no" — the opt-out would silently never happen. (The keywords are
   * `yes` / `no`, not `true` / `false`.) See the enumerated-attribute rule in
   * this file's header.
   */
  translate?: AttrLike<'yes' | 'no'>;
  /**
   * Enumerated, NOT boolean — write `autocorrect="on"` / `autocorrect="off"`.
   * `autocorrect={false}` would omit the attribute, which means *inherit the
   * default* (on, for most editable elements), not off.
   */
  autocorrect?: AttrLike<'on' | 'off'>;
  // Microdata (the itemscope family — all five, they only make sense together).
  /** A genuine HTML boolean attribute: presence declares the item. */
  itemScope?: AttrLike<boolean>;
  itemProp?: AttrLike;
  itemType?: AttrLike;
  itemId?: AttrLike;
  itemRef?: AttrLike;
  /** `data-morph-skip` opts a subtree out of kerf's morph. Any value (incl. `true`) is treated as set. */
  'data-morph-skip'?: AttrValue;
  /** `data-morph-skip-children` (KF-152) — morph the element's attributes but leave its children verbatim. For client-hydrated slots whose loading/state classes still need to flow through. Any value (incl. `true`) is treated as set. */
  'data-morph-skip-children'?: AttrValue;
  /** `data-morph-preserve` (KF-151) — an unmatched live element with this attribute is skipped by kerf's morph trailing-removal pass instead of removed. For imperatively-injected nodes (autoplay videos, tour overlays, analytics pixels) whose lifetime the consumer manages outside kerf. Does NOT block a keyed-match move; this is strictly an end-of-list-discard opt-out. Any value (incl. `true`) is treated as set. */
  'data-morph-preserve'?: AttrValue;
  children?: unknown;
}

/** Element-specific attribute interfaces. Each extends `KerfBaseAttrs`. */

export interface HTMLAnchorAttrs extends KerfBaseAttrs {
  href?: AttrLike;
  target?: AttrLike<'_self' | '_blank' | '_parent' | '_top'>;
  rel?: AttrLike;
  download?: AttrLike;
  hrefLang?: AttrLike;
  ping?: AttrLike;
  referrerPolicy?: AttrLike;
  type?: AttrLike;
}

export interface HTMLAreaAttrs extends KerfBaseAttrs {
  alt?: AttrLike;
  coords?: AttrLike;
  shape?: AttrLike<'rect' | 'circle' | 'poly' | 'default'>;
  href?: AttrLike;
  target?: AttrLike;
  rel?: AttrLike;
  download?: AttrLike;
  ping?: AttrLike;
  referrerPolicy?: AttrLike;
}

export interface HTMLImgAttrs extends KerfBaseAttrs {
  src?: AttrLike;
  alt?: AttrLike;
  width?: AttrLike<number | string>;
  height?: AttrLike<number | string>;
  srcSet?: AttrLike;
  sizes?: AttrLike;
  loading?: AttrLike<'eager' | 'lazy'>;
  decoding?: AttrLike<'sync' | 'async' | 'auto'>;
  crossOrigin?: AttrLike<'anonymous' | 'use-credentials' | ''>;
  referrerPolicy?: AttrLike;
  useMap?: AttrLike;
  fetchPriority?: AttrLike<'high' | 'low' | 'auto'>;
  /** A genuine HTML boolean attribute: inside `<a href>`, clicks send the click coordinates to the server. */
  isMap?: AttrLike<boolean>;
}

export interface HTMLInputAttrs extends KerfBaseAttrs {
  type?: AttrLike<'text' | 'password' | 'email' | 'number' | 'tel' | 'url' | 'search' | 'date' | 'datetime-local' | 'time' | 'month' | 'week' | 'color' | 'checkbox' | 'radio' | 'file' | 'hidden' | 'submit' | 'reset' | 'button' | 'image' | 'range'>;
  name?: AttrLike;
  value?: AttrLike;
  defaultValue?: AttrLike;
  placeholder?: AttrLike;
  required?: AttrLike<boolean>;
  disabled?: AttrLike<boolean>;
  readOnly?: AttrLike<boolean>;
  checked?: AttrLike<boolean>;
  defaultChecked?: AttrLike<boolean>;
  multiple?: AttrLike<boolean>;
  pattern?: AttrLike;
  min?: AttrLike<number | string>;
  max?: AttrLike<number | string>;
  step?: AttrLike<number | string>;
  minLength?: AttrLike<number>;
  maxLength?: AttrLike<number>;
  size?: AttrLike<number>;
  autoComplete?: AttrLike;
  /** KF-183 — lowercase HTML form accepted alongside `autoComplete`. */
  autocomplete?: AttrLike;
  form?: AttrLike;
  formAction?: AttrLike;
  formMethod?: AttrLike<'get' | 'post' | 'dialog'>;
  formTarget?: AttrLike;
  formEncType?: AttrLike;
  formNoValidate?: AttrLike<boolean>;
  list?: AttrLike;
  src?: AttrLike;
  alt?: AttrLike;
  width?: AttrLike<number | string>;
  height?: AttrLike<number | string>;
  accept?: AttrLike;
  capture?: AttrLike<boolean | 'user' | 'environment'>;
  /** Submits the field's text direction alongside its value, under this name. */
  dirName?: AttrLike;
}

export interface HTMLButtonAttrs extends KerfBaseAttrs {
  type?: AttrLike<'button' | 'submit' | 'reset'>;
  name?: AttrLike;
  value?: AttrLike;
  disabled?: AttrLike<boolean>;
  form?: AttrLike;
  formAction?: AttrLike;
  formMethod?: AttrLike;
  formTarget?: AttrLike;
  formEncType?: AttrLike;
  formNoValidate?: AttrLike<boolean>;
  popoverTarget?: AttrLike;
  popoverTargetAction?: AttrLike<'toggle' | 'show' | 'hide'>;
  /**
   * Invoker Commands: a spec keyword (`show-modal` / `close` / `request-close`
   * for a dialog target, `toggle-popover` / `show-popover` / `hide-popover`
   * for a popover target) or a custom `--*` command. Typed as a plain string
   * because the spec's keyword set is still growing.
   */
  command?: AttrLike;
  commandFor?: AttrLike;
}

export interface HTMLFormAttrs extends KerfBaseAttrs {
  action?: AttrLike;
  method?: AttrLike<'get' | 'post' | 'dialog'>;
  encType?: AttrLike;
  target?: AttrLike;
  name?: AttrLike;
  noValidate?: AttrLike<boolean>;
  acceptCharset?: AttrLike;
  autoComplete?: AttrLike;
  /** KF-183 — lowercase HTML form accepted alongside `autoComplete`. */
  autocomplete?: AttrLike;
}

export interface HTMLLabelAttrs extends KerfBaseAttrs {
  htmlFor?: AttrLike;
  /** KF-191 — lowercase HTML form accepted alongside `htmlFor`. */
  for?: AttrLike;
  form?: AttrLike;
}

export interface HTMLOptionAttrs extends KerfBaseAttrs {
  value?: AttrLike;
  selected?: AttrLike<boolean>;
  defaultSelected?: AttrLike<boolean>;
  disabled?: AttrLike<boolean>;
  label?: AttrLike;
}

export interface HTMLOptgroupAttrs extends KerfBaseAttrs {
  label?: AttrLike;
  disabled?: AttrLike<boolean>;
}

/**
 * No `value` / `defaultValue`: `<select>` has no `value` content attribute, so
 * rendering one is inert markup. The selection is expressed on the options —
 * `<option value="b" selected>` — which is also the form kerf's morph keeps in
 * sync with the live `selected` property after the user has picked.
 */
export interface HTMLSelectAttrs extends KerfBaseAttrs {
  name?: AttrLike;
  multiple?: AttrLike<boolean>;
  required?: AttrLike<boolean>;
  disabled?: AttrLike<boolean>;
  size?: AttrLike<number>;
  form?: AttrLike;
  autoComplete?: AttrLike;
  /** KF-183 — lowercase HTML form accepted alongside `autoComplete`. */
  autocomplete?: AttrLike;
}

/**
 * No `value` / `defaultValue`: a `<textarea>`'s value is its child text, and
 * there is no `value` content attribute to render. Write the text as a child —
 * `<textarea>{draft}</textarea>` — which is what kerf's morph reconciles.
 */
export interface HTMLTextareaAttrs extends KerfBaseAttrs {
  name?: AttrLike;
  placeholder?: AttrLike;
  rows?: AttrLike<number>;
  cols?: AttrLike<number>;
  required?: AttrLike<boolean>;
  disabled?: AttrLike<boolean>;
  readOnly?: AttrLike<boolean>;
  maxLength?: AttrLike<number>;
  minLength?: AttrLike<number>;
  wrap?: AttrLike<'hard' | 'soft' | 'off'>;
  /** Submits the field's text direction alongside its value, under this name. */
  dirName?: AttrLike;
  autoComplete?: AttrLike;
  /** KF-183 — lowercase HTML form accepted alongside `autoComplete`. */
  autocomplete?: AttrLike;
  form?: AttrLike;
}

export interface HTMLTableAttrs extends KerfBaseAttrs {
  /** @deprecated Obsolete presentational attribute — use CSS `padding` on the cells. Typed so legacy markup still compiles. */
  cellPadding?: AttrLike<number | string>;
  /** @deprecated Obsolete presentational attribute — use CSS `border-spacing`. Typed so legacy markup still compiles. */
  cellSpacing?: AttrLike<number | string>;
}

export interface HTMLTableCellAttrs extends KerfBaseAttrs {
  colSpan?: AttrLike<number>;
  rowSpan?: AttrLike<number>;
  headers?: AttrLike;
  scope?: AttrLike<'row' | 'col' | 'rowgroup' | 'colgroup'>;
  abbr?: AttrLike;
}

export interface HTMLColAttrs extends KerfBaseAttrs {
  span?: AttrLike<number>;
}

export interface HTMLMetaAttrs extends KerfBaseAttrs {
  name?: AttrLike;
  content?: AttrLike;
  charSet?: AttrLike;
  httpEquiv?: AttrLike;
  media?: AttrLike;
  /**
   * Open Graph (`og:title` etc.) — NOT in the HTML standard, typed because it
   * is universal in real documents. See the deviations list in this file's
   * header.
   */
  property?: AttrLike;
}

export interface HTMLLinkAttrs extends KerfBaseAttrs {
  href?: AttrLike;
  rel?: AttrLike;
  type?: AttrLike;
  media?: AttrLike;
  sizes?: AttrLike;
  hrefLang?: AttrLike;
  as?: AttrLike;
  crossOrigin?: AttrLike;
  integrity?: AttrLike;
  referrerPolicy?: AttrLike;
  fetchPriority?: AttrLike<'high' | 'low' | 'auto'>;
  /** A genuine HTML boolean attribute on `<link>`: the stylesheet is not applied (and for a stylesheet link, not fetched) until it's removed. */
  disabled?: AttrLike<boolean>;
  /** For `rel="preload" as="image"`: the srcset the preload should match. */
  imageSrcSet?: AttrLike;
  imageSizes?: AttrLike;
  blocking?: AttrLike<'render'>;
}

export interface HTMLScriptAttrs extends KerfBaseAttrs {
  src?: AttrLike;
  type?: AttrLike;
  async?: AttrLike<boolean>;
  defer?: AttrLike<boolean>;
  noModule?: AttrLike<boolean>;
  integrity?: AttrLike;
  crossOrigin?: AttrLike;
  referrerPolicy?: AttrLike;
  blocking?: AttrLike<'render'>;
  fetchPriority?: AttrLike<'high' | 'low' | 'auto'>;
}

/** No `scoped`: the proposal was removed from the HTML standard and never shipped in any engine. */
export interface HTMLStyleAttrs extends KerfBaseAttrs {
  type?: AttrLike;
  media?: AttrLike;
  blocking?: AttrLike<'render'>;
}

export interface HTMLIframeAttrs extends KerfBaseAttrs {
  src?: AttrLike;
  srcDoc?: AttrLike;
  name?: AttrLike;
  sandbox?: AttrLike;
  allow?: AttrLike;
  allowFullScreen?: AttrLike<boolean>;
  width?: AttrLike<number | string>;
  height?: AttrLike<number | string>;
  loading?: AttrLike<'eager' | 'lazy'>;
  referrerPolicy?: AttrLike;
}

export interface HTMLMediaAttrs extends KerfBaseAttrs {
  src?: AttrLike;
  controls?: AttrLike<boolean>;
  autoPlay?: AttrLike<boolean>;
  loop?: AttrLike<boolean>;
  muted?: AttrLike<boolean>;
  preload?: AttrLike<'auto' | 'metadata' | 'none' | ''>;
  crossOrigin?: AttrLike;
}

export interface HTMLVideoAttrs extends HTMLMediaAttrs {
  poster?: AttrLike;
  width?: AttrLike<number | string>;
  height?: AttrLike<number | string>;
  playsInline?: AttrLike<boolean>;
}

export interface HTMLSourceAttrs extends KerfBaseAttrs {
  src?: AttrLike;
  type?: AttrLike;
  srcSet?: AttrLike;
  sizes?: AttrLike;
  media?: AttrLike;
}

export interface HTMLTrackAttrs extends KerfBaseAttrs {
  src?: AttrLike;
  kind?: AttrLike<'subtitles' | 'captions' | 'descriptions' | 'chapters' | 'metadata'>;
  srcLang?: AttrLike;
  label?: AttrLike;
  default?: AttrLike<boolean>;
}

export interface HTMLDetailsAttrs extends KerfBaseAttrs {
  open?: AttrLike<boolean>;
}

export interface HTMLDialogAttrs extends KerfBaseAttrs {
  open?: AttrLike<boolean>;
}

export interface HTMLOlAttrs extends KerfBaseAttrs {
  reversed?: AttrLike<boolean>;
  start?: AttrLike<number>;
  type?: AttrLike<'1' | 'a' | 'A' | 'i' | 'I'>;
}

export interface HTMLLiAttrs extends KerfBaseAttrs {
  value?: AttrLike<number>;
}

export interface HTMLProgressAttrs extends KerfBaseAttrs {
  value?: AttrLike<number>;
  max?: AttrLike<number>;
}

export interface HTMLMeterAttrs extends KerfBaseAttrs {
  value?: AttrLike<number>;
  min?: AttrLike<number>;
  max?: AttrLike<number>;
  low?: AttrLike<number>;
  high?: AttrLike<number>;
  optimum?: AttrLike<number>;
}

export interface HTMLCanvasAttrs extends KerfBaseAttrs {
  width?: AttrLike<number | string>;
  height?: AttrLike<number | string>;
}

export interface HTMLBaseAttrs extends KerfBaseAttrs {
  href?: AttrLike;
  target?: AttrLike;
}

export interface HTMLBlockquoteAttrs extends KerfBaseAttrs { cite?: AttrLike }
export interface HTMLQAttrs extends KerfBaseAttrs { cite?: AttrLike }

/**
 * SVG attribute set — focused on the elements `toElement`'s SVG path supports
 * (the `SVG_FRAGMENT_TAGS` set in `src/toElement.ts`). Presentation attrs are
 * shared via `SVGPresentationAttrs`.
 */
export interface SVGPresentationAttrs {
  fill?: AttrLike;
  fillOpacity?: AttrLike<number | string>;
  fillRule?: AttrLike<'nonzero' | 'evenodd' | 'inherit'>;
  stroke?: AttrLike;
  strokeWidth?: AttrLike<number | string>;
  strokeOpacity?: AttrLike<number | string>;
  strokeLinecap?: AttrLike<'butt' | 'round' | 'square' | 'inherit'>;
  strokeLinejoin?: AttrLike<'miter' | 'round' | 'bevel' | 'inherit'>;
  strokeDasharray?: AttrLike;
  strokeDashoffset?: AttrLike<number | string>;
  strokeMiterlimit?: AttrLike<number | string>;
  opacity?: AttrLike<number | string>;
  vectorEffect?: AttrLike;
  clipPath?: AttrLike;
  clipRule?: AttrLike;
  mask?: AttrLike;
  filter?: AttrLike;
  pointerEvents?: AttrLike;
  shapeRendering?: AttrLike;
  paintOrder?: AttrLike;
  color?: AttrLike;
  display?: AttrLike;
  visibility?: AttrLike;
}

export interface SVGCommonAttrs extends DataAriaAttrs, SVGPresentationAttrs {
  id?: AttrLike;
  className?: AttrLike;
  /** KF-191 — lowercase HTML form accepted alongside `className`. */
  class?: AttrLike;
  style?: AttrLike;
  transform?: AttrLike;
  tabIndex?: AttrLike<number>;
  /** KF-191 — lowercase HTML form accepted alongside `tabIndex` (string-valued per the HTML/SVG spec). */
  tabindex?: AttrLike<number | string>;
  role?: AttrLike;
  xmlns?: AttrLike;
  xmlnsXlink?: AttrLike;
  children?: unknown;
}

export interface SVGSvgAttrs extends SVGCommonAttrs {
  width?: AttrLike<number | string>;
  height?: AttrLike<number | string>;
  viewBox?: AttrLike;
  preserveAspectRatio?: AttrLike;
  x?: AttrLike<number | string>;
  y?: AttrLike<number | string>;
}

export interface SVGPathAttrs extends SVGCommonAttrs {
  d?: AttrLike;
  pathLength?: AttrLike<number>;
}

export interface SVGCircleAttrs extends SVGCommonAttrs {
  cx?: AttrLike<number | string>;
  cy?: AttrLike<number | string>;
  r?: AttrLike<number | string>;
}

export interface SVGRectAttrs extends SVGCommonAttrs {
  x?: AttrLike<number | string>;
  y?: AttrLike<number | string>;
  width?: AttrLike<number | string>;
  height?: AttrLike<number | string>;
  rx?: AttrLike<number | string>;
  ry?: AttrLike<number | string>;
}

export interface SVGLineAttrs extends SVGCommonAttrs {
  x1?: AttrLike<number | string>;
  y1?: AttrLike<number | string>;
  x2?: AttrLike<number | string>;
  y2?: AttrLike<number | string>;
}

export interface SVGEllipseAttrs extends SVGCommonAttrs {
  cx?: AttrLike<number | string>;
  cy?: AttrLike<number | string>;
  rx?: AttrLike<number | string>;
  ry?: AttrLike<number | string>;
}

export interface SVGPolyAttrs extends SVGCommonAttrs {
  points?: AttrLike;
}

export interface SVGTextAttrs extends SVGCommonAttrs {
  x?: AttrLike<number | string>;
  y?: AttrLike<number | string>;
  dx?: AttrLike<number | string>;
  dy?: AttrLike<number | string>;
  textAnchor?: AttrLike<'start' | 'middle' | 'end' | 'inherit'>;
  dominantBaseline?: AttrLike;
  fontFamily?: AttrLike;
  fontSize?: AttrLike<number | string>;
  fontStyle?: AttrLike;
  fontWeight?: AttrLike<number | string>;
  letterSpacing?: AttrLike<number | string>;
}

export interface SVGUseAttrs extends SVGCommonAttrs {
  xlinkHref?: AttrLike;
  href?: AttrLike;
  x?: AttrLike<number | string>;
  y?: AttrLike<number | string>;
  width?: AttrLike<number | string>;
  height?: AttrLike<number | string>;
}

export interface SVGImageAttrs extends SVGCommonAttrs {
  href?: AttrLike;
  xlinkHref?: AttrLike;
  x?: AttrLike<number | string>;
  y?: AttrLike<number | string>;
  width?: AttrLike<number | string>;
  height?: AttrLike<number | string>;
  preserveAspectRatio?: AttrLike;
}

export interface SVGForeignObjectAttrs extends SVGCommonAttrs {
  x?: AttrLike<number | string>;
  y?: AttrLike<number | string>;
  width?: AttrLike<number | string>;
  height?: AttrLike<number | string>;
}

/**
 * Loose attribute set for custom elements / web components. Use via
 * declaration merging into the `kerfjs/jsx-runtime` JSX namespace if your
 * project uses tags not enumerated below:
 *
 *     import type { KerfCustomElement } from 'kerfjs/jsx-runtime';
 *
 *     declare module 'kerfjs/jsx-runtime' {
 *       namespace JSX {
 *         interface IntrinsicElements {
 *           'my-component': KerfCustomElement & { foo?: string };
 *         }
 *       }
 *     }
 *
 * `KerfCustomElement` is re-exported from `kerfjs/jsx-runtime` (KF-100) so
 * apps don't need to reach into the internal `kerfjs/jsx-types` path.
 */
export interface KerfCustomElement extends KerfBaseAttrs {
  [k: string]: AttrValue | unknown;
}

/**
 * Built-in tag table. Renamed from `IntrinsicElements` (KF-123) so the type
 * name in `dist/jsx-runtime.d.ts` cannot shadow the namespace's own
 * `IntrinsicElements` after tsup/tsc strips import aliases — the previous
 * name produced `interface IntrinsicElements extends IntrinsicElements {}`
 * in the emitted .d.ts, which self-resolves to an empty interface and
 * breaks every `<tag>` in consumer .tsx with TS2339.
 */
export interface KerfBuiltinIntrinsicElements {
  // ----- HTML elements (focused subset of common ones) -----
  // Sectioning / structure
  html: KerfBaseAttrs;
  head: KerfBaseAttrs;
  body: KerfBaseAttrs;
  div: KerfBaseAttrs;
  span: KerfBaseAttrs;
  section: KerfBaseAttrs;
  article: KerfBaseAttrs;
  header: KerfBaseAttrs;
  footer: KerfBaseAttrs;
  main: KerfBaseAttrs;
  nav: KerfBaseAttrs;
  aside: KerfBaseAttrs;
  // Text content
  h1: KerfBaseAttrs;
  h2: KerfBaseAttrs;
  h3: KerfBaseAttrs;
  h4: KerfBaseAttrs;
  h5: KerfBaseAttrs;
  h6: KerfBaseAttrs;
  p: KerfBaseAttrs;
  hr: KerfBaseAttrs;
  br: KerfBaseAttrs;
  pre: KerfBaseAttrs;
  blockquote: HTMLBlockquoteAttrs;
  q: HTMLQAttrs;
  ol: HTMLOlAttrs;
  ul: KerfBaseAttrs;
  li: HTMLLiAttrs;
  dl: KerfBaseAttrs;
  dt: KerfBaseAttrs;
  dd: KerfBaseAttrs;
  figure: KerfBaseAttrs;
  figcaption: KerfBaseAttrs;
  // Inline text
  a: HTMLAnchorAttrs;
  em: KerfBaseAttrs;
  strong: KerfBaseAttrs;
  small: KerfBaseAttrs;
  s: KerfBaseAttrs;
  cite: KerfBaseAttrs;
  code: KerfBaseAttrs;
  kbd: KerfBaseAttrs;
  samp: KerfBaseAttrs;
  var: KerfBaseAttrs;
  sub: KerfBaseAttrs;
  sup: KerfBaseAttrs;
  i: KerfBaseAttrs;
  b: KerfBaseAttrs;
  u: KerfBaseAttrs;
  mark: KerfBaseAttrs;
  abbr: KerfBaseAttrs;
  time: KerfBaseAttrs & { dateTime?: AttrLike };
  // Embedded
  img: HTMLImgAttrs;
  picture: KerfBaseAttrs;
  source: HTMLSourceAttrs;
  track: HTMLTrackAttrs;
  iframe: HTMLIframeAttrs;
  embed: KerfBaseAttrs & { src?: AttrLike; type?: AttrLike; width?: AttrLike<number | string>; height?: AttrLike<number | string> };
  object: KerfBaseAttrs & { data?: AttrLike; type?: AttrLike; name?: AttrLike; width?: AttrLike<number | string>; height?: AttrLike<number | string> };
  audio: HTMLMediaAttrs;
  video: HTMLVideoAttrs;
  canvas: HTMLCanvasAttrs;
  area: HTMLAreaAttrs;
  map: KerfBaseAttrs & { name?: AttrLike };
  // Forms
  form: HTMLFormAttrs;
  input: HTMLInputAttrs;
  button: HTMLButtonAttrs;
  select: HTMLSelectAttrs;
  optgroup: HTMLOptgroupAttrs;
  option: HTMLOptionAttrs;
  textarea: HTMLTextareaAttrs;
  label: HTMLLabelAttrs;
  fieldset: KerfBaseAttrs & { name?: AttrLike; form?: AttrLike; disabled?: AttrLike<boolean> };
  legend: KerfBaseAttrs;
  datalist: KerfBaseAttrs;
  output: KerfBaseAttrs & { name?: AttrLike; form?: AttrLike; htmlFor?: AttrLike; for?: AttrLike };
  progress: HTMLProgressAttrs;
  meter: HTMLMeterAttrs;
  // Tables
  table: HTMLTableAttrs;
  caption: KerfBaseAttrs;
  colgroup: HTMLColAttrs;
  col: HTMLColAttrs;
  thead: KerfBaseAttrs;
  tbody: KerfBaseAttrs;
  tfoot: KerfBaseAttrs;
  tr: KerfBaseAttrs;
  td: HTMLTableCellAttrs;
  th: HTMLTableCellAttrs;
  // Document metadata
  meta: HTMLMetaAttrs;
  link: HTMLLinkAttrs;
  script: HTMLScriptAttrs;
  style: HTMLStyleAttrs;
  base: HTMLBaseAttrs;
  title: KerfBaseAttrs;
  // Interactive
  details: HTMLDetailsAttrs;
  summary: KerfBaseAttrs;
  dialog: HTMLDialogAttrs;
  // Web components
  template: KerfBaseAttrs;
  slot: KerfBaseAttrs & { name?: AttrLike };

  // ----- SVG elements -----
  svg: SVGSvgAttrs;
  g: SVGCommonAttrs;
  defs: SVGCommonAttrs;
  symbol: SVGCommonAttrs;
  use: SVGUseAttrs;
  path: SVGPathAttrs;
  circle: SVGCircleAttrs;
  rect: SVGRectAttrs;
  line: SVGLineAttrs;
  ellipse: SVGEllipseAttrs;
  polygon: SVGPolyAttrs;
  polyline: SVGPolyAttrs;
  text: SVGTextAttrs;
  tspan: SVGTextAttrs;
  image: SVGImageAttrs;
  foreignObject: SVGForeignObjectAttrs;
  clipPath: SVGCommonAttrs;
  mask: SVGCommonAttrs;
  pattern: SVGCommonAttrs;
  filter: SVGCommonAttrs;
  marker: SVGCommonAttrs;
  linearGradient: SVGCommonAttrs;
  radialGradient: SVGCommonAttrs;
  stop: SVGCommonAttrs & { offset?: AttrLike<number | string>; stopColor?: AttrLike; stopOpacity?: AttrLike<number | string> };
}
