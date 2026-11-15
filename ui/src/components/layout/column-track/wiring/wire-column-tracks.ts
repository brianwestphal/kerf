// KF-QHJKA4: a ColumnTrack's opening column. A board whose newest column is
// last opens at its end, and a paged phone board on a named column; the
// track keeps that column in view across width changes until the person
// scrolls the track themselves.
import { realmOf } from '../../../../shared/dom/realm.js';

const TRACK = '[data-component="column-track"]';
const COLUMNS = 'kui-column-track__columns';
/** Inputs that mean a person, not a layout change, moved the track. */
const INPUTS = ['wheel', 'touchstart', 'pointerdown', 'keydown'] as const;

interface Anchor {
  /** The start request and column ids last applied, so a re-render that keeps both is not a change. */
  signature: string;
  /** False once the person scrolls the track away from the applied position. */
  held: boolean;
  /** Whether the person has used an input inside the track since the last apply. */
  touched: boolean;
  /** The scroll offset the last apply left. */
  left: number;
  /** The track's width at the last apply. */
  width: number;
}

const columnsOf = (track: HTMLElement): HTMLElement[] => {
  const columns = track.querySelector(`:scope > .${COLUMNS}`);
  return columns
    ? [...columns.children].filter(
        (child): child is HTMLElement => child instanceof HTMLElement,
      )
    : [];
};

const signatureOf = (track: HTMLElement) =>
  [
    track.dataset.start ?? '',
    track.dataset.startColumn ?? '',
    ...columnsOf(track).map((column) => column.dataset.columnId ?? ''),
  ].join('\u0000');

const requested = (track: HTMLElement) =>
  track.dataset.start === 'end' || track.dataset.startColumn !== undefined;

/**
 * The scroll offset that shows the requested column: `end` is the far end;
 * a named column aligns its start with the track's inline padding, clamped
 * to the scroll range. Undefined while the named column is absent.
 */
function targetLeft(track: HTMLElement): number | undefined {
  const win = realmOf(track);
  const rtl = win.getComputedStyle(track).direction === 'rtl';
  const range = track.scrollWidth - track.clientWidth;
  // Right-to-left scroll offsets run from 0 at the start to -range at the end.
  const sign = rtl ? -1 : 1;
  if (track.dataset.start === 'end') return sign * range;
  const id = track.dataset.startColumn;
  const column = columnsOf(track).find(
    (entry) => entry.dataset.columnId === id,
  );
  if (!column) return undefined;
  const style = win.getComputedStyle(track);
  const box = track.getBoundingClientRect();
  const rect = column.getBoundingClientRect();
  const padding = (value: string) => parseFloat(value) || 0;
  const offset = rtl
    ? box.right - padding(style.paddingRight) - rect.right
    : rect.left - box.left - padding(style.paddingLeft);
  const left = track.scrollLeft + sign * offset;
  return sign * Math.min(Math.max(sign * left, 0), range);
}

/**
 * Wire every ColumnTrack under `root` that has a `start` of `'end'` or a
 * named column (`{ column }`, matched by a column's `data-column-id`):
 * - it opens there without animating, and again whenever its `start` or its
 *   set of column ids changes;
 * - when the track's width changes (a window resize, a side rail opening),
 *   it returns there, unless the person has scrolled the track since;
 * - a named column not yet rendered is shown once it appears.
 * A track with the default `start` is left alone. Returns a disposer.
 */
export function wireColumnTracks(root: HTMLElement): () => void {
  const win = realmOf(root);
  const anchors = new WeakMap<HTMLElement, Anchor>();
  const observed = new Set<HTMLElement>();

  const apply = (track: HTMLElement, anchor: Anchor) => {
    const left = targetLeft(track);
    anchor.width = track.clientWidth;
    anchor.touched = false;
    if (left === undefined) return;
    track.scrollTo({ left, behavior: 'instant' });
    anchor.left = track.scrollLeft;
  };

  const resizes = win.ResizeObserver
    ? new win.ResizeObserver((entries) => {
        for (const { target } of entries) {
          const track = target as HTMLElement;
          const anchor = anchors.get(track);
          if (!anchor?.held || !track.isConnected) continue;
          if (track.clientWidth !== anchor.width) apply(track, anchor);
        }
      })
    : undefined;

  /** Apply a track whose request or column set changed since it was last seen. */
  const sync = (track: HTMLElement) => {
    if (!requested(track)) {
      anchors.delete(track);
      return;
    }
    const signature = signatureOf(track);
    const anchor = anchors.get(track);
    if (anchor?.signature === signature) return;
    const next: Anchor = {
      signature,
      held: true,
      touched: false,
      left: 0,
      width: 0,
    };
    anchors.set(track, next);
    if (!observed.has(track)) {
      observed.add(track);
      resizes?.observe(track);
    }
    apply(track, next);
  };

  const syncAll = () => {
    for (const track of observed)
      if (!track.isConnected) {
        resizes?.unobserve(track);
        observed.delete(track);
      }
    const tracks = [...root.querySelectorAll<HTMLElement>(TRACK)];
    if (root.matches(TRACK)) tracks.unshift(root);
    for (const track of tracks) sync(track);
  };

  const onInput = (event: Event) => {
    const track = (event.target as Element).closest<HTMLElement>(TRACK);
    const anchor = track ? anchors.get(track) : undefined;
    if (anchor) anchor.touched = true;
  };
  // A person's own sideways scroll releases the track; the scroll a layout
  // change or an engine's re-snap causes leaves it held.
  const onScroll = (event: Event) => {
    const track = event.target as HTMLElement;
    const anchor = anchors.get(track);
    if (anchor?.touched && Math.abs(track.scrollLeft - anchor.left) > 1)
      anchor.held = false;
  };
  // Scroll events do not bubble; capture them for every track at once.
  root.addEventListener('scroll', onScroll, { capture: true, passive: true });
  for (const type of INPUTS)
    root.addEventListener(type, onInput, { capture: true, passive: true });

  const observer = new win.MutationObserver(syncAll);
  observer.observe(root, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['data-start', 'data-start-column', 'data-column-id'],
  });
  syncAll();

  return () => {
    observer.disconnect();
    resizes?.disconnect();
    observed.clear();
    root.removeEventListener('scroll', onScroll, { capture: true });
    for (const type of INPUTS)
      root.removeEventListener(type, onInput, { capture: true });
  };
}
