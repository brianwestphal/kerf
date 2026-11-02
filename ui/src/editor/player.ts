// The play page (KF-60BEEJ: play mode core; docs/26-ui-editor.md §11.3).
// Play mode's stage is an iframe that loads the host's own editor page with
// `?kerf-ui-play`, so it has the same catalogs, registrations, and global CSS
// as the canvas, and neither host needs a second route. `createEditor` sees
// the flag and returns this player instead of the editor. The player asks
// its parent for the document, renders it as the canvas does without the
// editing stand-ins, and wires it for real over a play-time copy
// (play-adapters.ts). Nothing it does reaches the edited document.
import type { ViewDocument } from '@kerfjs/ui/view';
import { effect, raw, type SafeHtml, signal } from 'kerfjs';

import { deviceClass } from '../shared/environment/device-class.js';
import { type DeviceInsets, safeAreaTokens } from './model/play-device.js';
import { wirePlayState } from './play-adapters.js';

/** The query flag that makes the editor page a play page. */
export const PLAY_PARAM = 'kerf-ui-play';
/** The player's message to its parent once it listens for the document. */
export const PLAY_READY = 'kerf-ui-play:ready';
/** The editor's message carrying the document to play. */
export const PLAY_DOCUMENT = 'kerf-ui-play:document';
/**
 * KF-R7KXSN: the editor's message carrying the emulated device's safe areas
 * (physical insets), sent with the document and whenever they change.
 */
export const PLAY_ENVIRONMENT = 'kerf-ui-play:environment';

/** Whether `location` is a play page. */
export const isPlayPage = (location: Pick<Location, 'search'>): boolean =>
  new URLSearchParams(location.search).has(PLAY_PARAM);

/** The play page for the editor page at `href`. */
export function playPageUrl(href: string): string {
  const url = new URL(href);
  url.hash = '';
  url.searchParams.set(PLAY_PARAM, '');
  return url.href;
}

/** A message from `source` is the editor's or the player's own peer. */
export const fromPeer = (
  event: MessageEvent,
  view: Window,
  source: MessageEventSource | null,
): boolean =>
  event.origin === view.location.origin &&
  source !== null &&
  event.source === source;

/**
 * The player: renders `preview` of the document its parent sends, with
 * real wiring over a play-time copy. Same `render`/`wire` shape as the
 * editor, so a host mounts either one the same way.
 */
export function createPlayer(
  initial: ViewDocument,
  preview: (document: ViewDocument) => SafeHtml,
) {
  /** The play-time copy: what the view's own wiring changes. */
  const document = signal<ViewDocument>(initial);
  /** Nothing renders until the editor sends the document to play. */
  const received = signal(false);

  const render = (): SafeHtml =>
    received.value ? preview(document.value) : raw('');

  const wire = (root: HTMLElement) => {
    const view = root.ownerDocument.defaultView!;
    const play = wirePlayState(root, document);
    const html = root.ownerDocument.documentElement;
    const onMessage = (event: MessageEvent) => {
      if (!fromPeer(event, view, view.parent)) return;
      const data = event.data as {
        type?: unknown;
        document?: ViewDocument;
        safeArea?: DeviceInsets;
      };
      if (data?.type === PLAY_ENVIRONMENT && data.safeArea) {
        // A frame cannot set env(safe-area-inset-*), so the emulated
        // device's insets go into Kerf UI's own tokens on :root.
        const direction =
          html.dir === 'rtl' || view.getComputedStyle(html).direction === 'rtl'
            ? 'rtl'
            : 'ltr';
        for (const [token, value] of Object.entries(
          safeAreaTokens(data.safeArea, direction),
        ))
          html.style.setProperty(token, value);
        return;
      }
      if (data?.type !== PLAY_DOCUMENT || !data.document) return;
      document.value = data.document;
      received.value = true;
    };
    view.addEventListener('message', onMessage);
    // The class the played view's own deviceClass() reads, on the play
    // page's root, so a test (or an author's inspector) can see it follow
    // the device.
    const device = deviceClass();
    const stopDevice = effect(() => {
      const { size, orientation } = device.value;
      html.dataset.kerfPlayDevice = `${size} ${orientation}`;
    });
    // Adapters follow the rendered view: the mount re-renders first.
    const stopSync = effect(() => {
      void document.value;
      void received.value;
      globalThis.queueMicrotask(play.sync);
    });
    // A play page outside a frame posts to itself, which it ignores.
    view.parent.postMessage({ type: PLAY_READY }, view.location.origin);
    return () => {
      view.removeEventListener('message', onMessage);
      stopDevice();
      stopSync();
      play.dispose();
    };
  };

  return { render, wire, document };
}
