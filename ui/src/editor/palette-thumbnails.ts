// Live thumbnails for the component palette's grid view (KF-JC7WTW). Each
// tile shows its component as it would be added: the seeded node, rendered
// by the canvas's renderer and scaled to fit the tile. A thumbnail renders
// in its tile's shadow root, so its element ids, labels, and data markers
// never meet the canvas's (a seeded Workbench's `id` would otherwise repeat
// the one on the canvas), and the editor's own queries and wiring never
// reach it. The page's stylesheets are shared into every shadow root.

/** Where a thumbnail lays out before it is scaled into its tile. */
const STAGE_WIDTH = 220;
const STAGE_HEIGHT = 165;
/** A thumbnail never grows past its real size, so small controls stay true. */
const MAX_SCALE = 1;
/** The room a thumbnail leaves inside each edge of its tile. */
const INSET = 6;

const STAGE_STYLE = [
  'position: absolute',
  'inset: 0 auto auto 0',
  `width: ${STAGE_WIDTH}px`,
  `height: ${STAGE_HEIGHT}px`,
  'display: grid',
  'place-items: center',
  'transform-origin: 0 0',
].join('; ');

/** The page's stylesheets as one sheet a shadow root can adopt. */
const sheets = new WeakMap<Document, CSSStyleSheet | null>();

function sharedSheet(document: Document): CSSStyleSheet | null {
  if (sheets.has(document)) return sheets.get(document)!;
  let sheet: CSSStyleSheet | null = null;
  const View = document.defaultView as
    (Window & { CSSStyleSheet?: typeof CSSStyleSheet }) | null;
  if (View?.CSSStyleSheet && 'adoptedStyleSheets' in document) {
    const text: string[] = [];
    for (const source of Array.from(document.styleSheets)) {
      try {
        for (const rule of Array.from(source.cssRules)) text.push(rule.cssText);
      } catch {
        // A cross-origin sheet hides its rules; thumbnails go without it.
      }
    }
    sheet = new View.CSSStyleSheet();
    sheet.replaceSync(text.join('\n'));
  }
  sheets.set(document, sheet);
  return sheet;
}

/**
 * Scales a host's rendered thumbnail to fit the host, centered; or, when it
 * renders nothing visible (a closed dialog), shows the host's own fallback
 * content instead.
 */
function fit(host: HTMLElement): void {
  // Only filled hosts are fitted, so the stage and slot are there.
  const shadow = host.shadowRoot!;
  const stage = shadow.querySelector<HTMLElement>('[data-thumb-stage]')!;
  const slot = shadow.querySelector('slot')!;
  // An empty stage measures as a zero-size box.
  const content = (stage.firstElementChild ?? stage) as HTMLElement;
  // A control whose content outgrows its own box (a field wider than the
  // stage) fits by what it draws.
  const width = Math.max(content.offsetWidth, content.scrollWidth);
  const height = Math.max(content.offsetHeight, content.scrollHeight);
  const box = { width: host.clientWidth, height: host.clientHeight };
  // A component that shows nothing until it opens keeps its fallback icon.
  const empty = content === stage || !width || !height;
  host.toggleAttribute('data-thumb-empty', empty);
  slot.hidden = !empty;
  stage.style.visibility = empty ? 'hidden' : '';
  if (empty || !box.width || !box.height) return;
  // A little room inside the tile, so an edge-to-edge control's border and
  // label never sit on the clipped edge.
  const scale = Math.min(
    MAX_SCALE,
    (box.width - INSET * 2) / width,
    (box.height - INSET * 2) / height,
  );
  const centerX = content.offsetLeft + width / 2;
  const centerY = content.offsetTop + height / 2;
  stage.style.transform = `translate(${box.width / 2 - centerX * scale}px, ${
    box.height / 2 - centerY * scale
  }px) scale(${scale})`;
}

export interface PaletteThumbnailOptions {
  /** The thumbnail markup for component `key`, or undefined for none. */
  readonly htmlOf: (key: string) => string | undefined;
}

/**
 * Fills each `[data-editor-palette-thumb]` host under `root` with its
 * component's thumbnail, as hosts appear, and refits them when they resize.
 * A host's light-DOM children are its fallback, shown through a slot when
 * the thumbnail renders nothing. Returns a disposer.
 */
export function wirePaletteThumbnails(
  root: HTMLElement,
  options: PaletteThumbnailOptions,
): () => void {
  const document = root.ownerDocument;
  const View = document.defaultView!;
  const resize =
    'ResizeObserver' in View
      ? new View.ResizeObserver((entries) => {
          for (const entry of entries) fit(entry.target as HTMLElement);
        })
      : undefined;
  const fill = (host: HTMLElement) => {
    const key = host.dataset.editorPaletteThumb!;
    if (host.dataset.thumbKey === key) return;
    host.dataset.thumbKey = key;
    const html = options.htmlOf(key);
    const shadow = host.shadowRoot ?? host.attachShadow({ mode: 'open' });
    const sheet = sharedSheet(document);
    if (sheet) shadow.adoptedStyleSheets = [sheet];
    // The slot shows the host's fallback until the thumbnail proves visible;
    // the stage lays out unseen meanwhile, so it can be measured.
    shadow.innerHTML = `<slot></slot><div data-thumb-stage style="${STAGE_STYLE}; visibility: hidden">${
      html ?? ''
    }</div>`;
    if (html === undefined) {
      host.toggleAttribute('data-thumb-empty', true);
      return;
    }
    View.requestAnimationFrame(() => fit(host));
    resize?.observe(host);
  };
  const scan = () => {
    for (const host of root.querySelectorAll<HTMLElement>(
      '[data-editor-palette-thumb]',
    ))
      fill(host);
  };
  scan();
  const observer = new View.MutationObserver(scan);
  observer.observe(root, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['data-editor-palette-thumb'],
  });
  return () => {
    observer.disconnect();
    resize?.disconnect();
  };
}
