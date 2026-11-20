import '@kerfjs/ui/document.css';

import { PopupMenu } from '@kerfjs/ui/popup-menu';

import { mountComponentCatalog } from '../../../docs/examples/composed-catalog.js';

const host = document.querySelector<HTMLElement>('main')!;
mountComponentCatalog(host, async () => {
  host.dataset.previewLoads = String(
    Number(host.dataset.previewLoads ?? 0) + 1,
  );
  return () =>
    PopupMenu({
      text: 'Share Review',
      items: [{ label: 'Copy Link', action: 'copy-link' }],
    });
});
