// The core kerfjs/overlay from this repository (the installed kerfjs release
// predates bottom-sheet presentation and exit motion), styled by
// @kerfjs/ui/overlay-sheet.css (KF-CV6GG5).
import '@awesome.me/webawesome/dist/components/button/button.js';

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
  // KF-NYZYFY: Web Awesome buttons as the wired controls. The core focuses
  // the OK button once it has rendered instead of aborting the open.
  openWaButtonSheet: () => {
    result = undefined;
    void confirm('Discard this draft?', {
      presentation: 'bottom-sheet',
      render: ({ message, ok, cancel }) => (
        <div>
          <p>{message}</p>
          <wa-button {...cancel}>Keep Editing</wa-button>
          <wa-button variant="danger" {...ok}>
            Discard
          </wa-button>
        </div>
      ),
    }).then((value) => {
      result = value;
    });
  },
  sheetResult: () => result,
});
