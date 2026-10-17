// A dedicated AnchoredSurface fitting fixture: an anchor button the test
// places at an exact viewport position on a tall scrolling page, and a surface
// whose content height the test sets. Its geometry belongs to the test alone,
// so restyling any catalog demo never retunes the fit suite.
import '@kerfjs/ui/foundation.css';
import '@kerfjs/ui/anchored-surface.css';

import { openAnchoredSurface } from '@kerfjs/ui/anchored-surface';
import { raw } from 'kerfjs';
import type { OverlayHandle } from 'kerfjs/overlay';

/** What the test controls: the anchor's viewport top and the content height. */
interface FitCase {
  anchorTop: number;
  contentHeight: number;
}

const ROW = 40;

let handle: OverlayHandle | undefined;

Object.assign(globalThis, {
  openFitSurface({ anchorTop, contentHeight }: FitCase): void {
    handle?.close();
    document.getElementById('fit-anchor')?.remove();
    // A page taller than any viewport, so a window scroll moves the anchor.
    document.body.style.cssText = `margin:0;min-height:${anchorTop + 3000}px`;
    const anchor = document.createElement('button');
    anchor.id = 'fit-anchor';
    anchor.type = 'button';
    anchor.textContent = 'Help';
    anchor.style.cssText = `position:absolute;left:24px;top:${anchorTop + globalThis.scrollY}px;height:32px;margin:0`;
    document.body.append(anchor);
    const rows = Math.max(1, Math.round(contentHeight / ROW));
    const content = Array.from(
      { length: rows },
      (_, index) =>
        `<div style="height:${ROW}px;box-sizing:border-box">${
          index === rows - 1 ? 'End of help' : `Row ${index + 1}`
        }</div>`,
    ).join('');
    handle = openAnchoredSurface(anchor, () => raw(content), {
      label: 'Fit Fixture',
      initialFocus: false,
    });
  },
});
