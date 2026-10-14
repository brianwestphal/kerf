// The core kerfjs/overlay from this repository (the installed kerfjs release
// predates bottom-sheet presentation and exit motion), styled by
// @kerfjs/ui/overlay-sheet.css (KF-CV6GG5).
import { confirm } from '../../../../src/overlay.js';

let result: boolean | undefined;
Object.assign(globalThis, {
  openSheet: (native: boolean) => {
    result = undefined;
    void confirm('Discard this draft?', {
      presentation: 'bottom-sheet',
      native,
      exitClass: 'kui-overlay-sheet-exit',
      exitDuration: 2000,
    }).then((value) => {
      result = value;
    });
  },
  sheetResult: () => result,
});
