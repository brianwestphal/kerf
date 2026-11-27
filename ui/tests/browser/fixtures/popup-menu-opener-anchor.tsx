import '@kerfjs/ui/foundation.css';
import '@kerfjs/ui/button.css';
import '@kerfjs/ui/document.css';
import '@kerfjs/ui/popup-menu.css';

import { Button } from '@kerfjs/ui/button';
import { openPopupMenuAt, PopupMenu } from '@kerfjs/ui/popup-menu';
import { popupMenuElementsRegistered } from '@kerfjs/ui/popup-menu/register';

const root = document.querySelector<HTMLElement>('[data-fixture-root]')!;
root.dataset.registered = String(popupMenuElementsRegistered);
root.innerHTML = String(
  <>
    <h1>Tickets</h1>
    <Button id="opener">More Actions</Button>
    <PopupMenu
      context
      rootAttributes={{ 'data-ticket-menu': '' }}
      label="Ticket Actions"
      items={[
        'Open Ticket',
        'Open in New Tab',
        'Copy Link',
        'Copy Reference',
        'Move to Project',
        'Change Priority',
        'Set Status',
        'Assign Owner',
        'Add Label',
        'Remove Label',
        'Link Ticket',
        'Duplicate Ticket',
        'Watch Ticket',
        'Mute Notifications',
        'Archive Ticket',
      ].map((label) => ({ label }))}
    />
  </>,
);
const opener = root.querySelector<HTMLButtonElement>('#opener')!;
const menu = root.querySelector<HTMLElement>('[data-ticket-menu]')!;
opener.addEventListener('click', (event) => {
  openPopupMenuAt(menu, event.clientX, event.clientY, {
    opener,
    anchorTo: 'opener',
  });
});
