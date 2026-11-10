// Live thumbnails for the component palette's grid view (KF-JC7WTW). Each
// tile shows its component as it would be added: the seeded node, rendered
// by the canvas's renderer and scaled to fit the tile. A thumbnail renders
// in its tile's shadow root, so its element ids, labels, and data markers
// never meet the canvas's (a seeded Workbench's `id` would otherwise repeat
// the one on the canvas), and the editor's own queries and wiring never
// reach it. The page's stylesheets are shared into every shadow root.

import { HOOK, hook } from './dom-hooks.js';
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
  const shadow = host.shadowRoot!;
  const stage = shadow.querySelector<HTMLElement>('[data-thumb-stage]')!;
  const slot = shadow.querySelector('slot')!;
  // Measure before scaling, including every visual root of a fragment.
  stage.style.transform = '';
  const stageRect = stage.getBoundingClientRect();
  const boxes = Array.from(stage.children).map((element) => {
    const content = element as HTMLElement;
    const rect = content.getBoundingClientRect();
    return {
      x: content.offsetLeft ?? rect.left - stageRect.left,
      y: content.offsetTop ?? rect.top - stageRect.top,
      width: Math.max(
        content.offsetWidth || 0,
        content.scrollWidth || 0,
        rect.width,
      ),
      height: Math.max(
        content.offsetHeight || 0,
        content.scrollHeight || 0,
        rect.height,
      ),
    };
  });
  for (const node of stage.childNodes) {
    if (node.nodeType !== 3 || !node.textContent?.trim()) continue;
    const range = host.ownerDocument.createRange();
    range.selectNode(node);
    if (typeof range.getBoundingClientRect !== 'function') continue;
    const rect = range.getBoundingClientRect();
    boxes.push({
      x: rect.left - stageRect.left,
      y: rect.top - stageRect.top,
      width: rect.width,
      height: rect.height,
    });
  }
  const visible = boxes.filter((box) => box.width > 0 && box.height > 0);
  const empty = visible.length === 0;
  host.toggleAttribute('data-thumb-empty', empty);
  slot.hidden = !empty;
  stage.style.visibility = empty ? 'hidden' : '';
  const box = { width: host.clientWidth, height: host.clientHeight };
  if (empty || !box.width || !box.height || host.dataset.thumbFit === 'fill')
    return;
  const left = Math.min(...visible.map((box) => box.x));
  const top = Math.min(...visible.map((box) => box.y));
  const width = Math.max(...visible.map((box) => box.x + box.width)) - left;
  const height = Math.max(...visible.map((box) => box.y + box.height)) - top;
  const scale = Math.min(
    MAX_SCALE,
    (box.width - INSET * 2) / width,
    (box.height - INSET * 2) / height,
  );
  stage.style.transform = `translate(${box.width / 2 - (left + width / 2) * scale}px, ${box.height / 2 - (top + height / 2) * scale}px) scale(${scale})`;
}

export interface PaletteThumbnailOptions {
  /** The thumbnail markup for component `key`, or undefined for none. */
  readonly htmlOf: (key: string) => string | undefined;
  /** Fill is for drawings that intentionally use the complete thumbnail canvas. */
  readonly fitOf?: (key: string) => 'contain' | 'fill';
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
  const hosts = new Map<
    HTMLElement,
    { key: string; content?: Element; load: () => void }
  >();
  const owners = new Map<Element, HTMLElement>();
  const frames = new Map<HTMLElement, number>();
  let disposed = false;
  const schedule = (host: HTMLElement) => {
    const previous = frames.get(host);
    if (previous !== undefined) View.cancelAnimationFrame(previous);
    frames.set(
      host,
      View.requestAnimationFrame(() => {
        frames.delete(host);
        if (!disposed && root.contains(host)) fit(host);
      }),
    );
  };
  const resize =
    'ResizeObserver' in View
      ? new View.ResizeObserver((entries) => {
          for (const entry of entries) {
            const host = owners.get(entry.target);
            if (host) schedule(host);
          }
        })
      : undefined;
  const release = (host: HTMLElement) => {
    const owned = hosts.get(host)!;
    const frame = frames.get(host);
    if (frame !== undefined) View.cancelAnimationFrame(frame);
    frames.delete(host);
    resize?.unobserve(host);
    owners.delete(host);
    if (owned.content) {
      resize?.unobserve(owned.content);
      owners.delete(owned.content);
    }
    host.shadowRoot!.removeEventListener('load', owned.load, true);
    hosts.delete(host);
  };
  const fill = (host: HTMLElement) => {
    const key = host.dataset.editorPaletteThumb!;
    if (hosts.get(host)?.key === key) return;
    if (hosts.has(host)) release(host);
    host.dataset.thumbKey = key;
    host.dataset.thumbFit = options.fitOf?.(key) ?? 'contain';
    const html = options.htmlOf(key);
    const shadow = host.shadowRoot ?? host.attachShadow({ mode: 'open' });
    const sheet = sharedSheet(document);
    if (sheet) shadow.adoptedStyleSheets = [sheet];
    const style =
      host.dataset.thumbFit === 'fill'
        ? `${STAGE_STYLE}; width: 100%; height: 100%`
        : STAGE_STYLE;
    shadow.innerHTML = `<slot></slot><div data-thumb-stage style="${style}; visibility: hidden">${html ?? ''}</div>`;
    const content =
      shadow.querySelector('[data-thumb-stage]')!.firstElementChild ??
      undefined;
    const load = () => schedule(host);
    hosts.set(host, { key, content, load });
    shadow.addEventListener('load', load, true);
    if (html === undefined) {
      host.toggleAttribute('data-thumb-empty', true);
      return;
    }
    owners.set(host, host);
    resize?.observe(host);
    if (content) {
      owners.set(content, host);
      resize?.observe(content);
    }
    schedule(host);
  };
  const scan = () => {
    const current = new Set(
      root.querySelectorAll<HTMLElement>(hook(HOOK.paletteThumb)),
    );
    for (const host of hosts.keys()) if (!current.has(host)) release(host);
    for (const host of current) fill(host);
  };
  scan();
  const observer = new View.MutationObserver(scan);
  observer.observe(root, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: [HOOK.paletteThumb],
  });
  return () => {
    if (disposed) return;
    disposed = true;
    observer.disconnect();
    for (const host of hosts.keys()) release(host);
    resize?.disconnect();
  };
}
