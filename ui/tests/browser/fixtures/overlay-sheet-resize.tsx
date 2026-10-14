// A resizable core kerfjs/overlay bottom sheet (the repository's overlay:
// the installed kerfjs release predates bottom-sheet presentation), wired by
// wireOverlaySheets and styled by @kerfjs/ui/overlay-sheet.css.
import { signal } from '../../../../src/index.js';
import { raw } from '../../../../src/jsx-runtime.js';
import { overlay, type OverlayHandle } from '../../../../src/overlay.js';
import { wireOverlaySheets } from '../../../src/wire-overlay-sheets.js';

const rows = signal(30);
let handle: OverlayHandle | undefined;
const stop = wireOverlaySheets();

Object.assign(globalThis, {
  openResizableSheet: (native: boolean) => {
    rows.value = 30;
    handle = overlay(
      () =>
        raw(
          `<div class="content">${Array.from(
            { length: rows.value },
            (_, i) =>
              `<p style="margin:0;padding:8px">Row ${String(i + 1)}</p>`,
          ).join('')}</div>`,
        ),
      {
        className: 'kerf-overlay kui-overlay-sheet-resizable',
        presentation: 'bottom-sheet',
        native,
        initialFocus: false,
      },
    );
  },
  setRows: (count: number) => {
    rows.value = count;
  },
  closeSheet: () => handle?.close(undefined, { instant: true }),
  stopSheets: () => stop(),
});
