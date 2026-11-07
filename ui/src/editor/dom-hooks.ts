// The editor's DOM hook attributes that more than one editor module reads or
// writes (KF-YF1PDR: one name per hook instead of repeated literals). A
// hook marks an element for the editor's own wiring; documents may not use
// the `data-editor-*` names (validateView reports them as KUI-V015).

export const HOOK = {
  /** The edit canvas's root, around the previewed document. */
  canvas: 'data-editor-canvas',
  /** An empty zone placeholder, holding its slot address (or `root`). */
  empty: 'data-editor-empty',
  /** A `$slot` placeholder on the canvas, holding its slot address. */
  slotAddress: 'data-editor-slot-address',
  /** An Inspector control's kind (`list`, `choice`, `tags`, …). */
  kind: 'data-editor-kind',
  /** A control-flow section control (`condition`, `repeat`, …). */
  control: 'data-editor-control',
  /** A `$slot` section control (`name`, `pass-item`). */
  slot: 'data-editor-slot',
  /** A `$slot` input field, by input name. */
  slotInput: 'data-editor-slot-input',
  /** A row design control in the Repeat section. */
  rowDesign: 'data-editor-row-design',
  /** A palette tile's thumbnail host, by component key. */
  paletteThumb: 'data-editor-palette-thumb',
  /** Play mode's device iframe. */
  playFrame: 'data-editor-play-frame',
  add: 'data-editor-add',
  attribute: 'data-editor-attribute',
  bind: 'data-editor-bind',
  embed: 'data-editor-embed',
  embedSearch: 'data-editor-embed-search',
  extract: 'data-editor-extract',
  field: 'data-editor-field',
  icon: 'data-editor-icon',
  iconSearch: 'data-editor-icon-search',
  insertDocument: 'data-editor-insert-document',
  insertDocumentSearch: 'data-editor-insert-document-search',
  library: 'data-editor-library',
  name: 'data-editor-name',
  open: 'data-editor-open',
  palette: 'data-editor-palette',
  paletteDocument: 'data-editor-palette-document',
  paletteFilter: 'data-editor-palette-filter',
  param: 'data-editor-param',
  promote: 'data-editor-promote',
  prop: 'data-editor-prop',
} as const;

export type Hook = (typeof HOOK)[keyof typeof HOOK];

/** The selector for a hook: `[name]`, or `[name="value"]` with a value. */
export function hook(name: Hook, value?: string): string {
  return value === undefined ? `[${name}]` : `[${name}="${value}"]`;
}
