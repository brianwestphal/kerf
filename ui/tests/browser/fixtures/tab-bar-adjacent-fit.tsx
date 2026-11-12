import '@kerfjs/ui/foundation.css';
import '@kerfjs/ui/tab-bar.css';
import '@kerfjs/ui/tab-bar-item.css';
import '@kerfjs/ui/button.css';

import { Button } from '@kerfjs/ui/button';
import { TabBar } from '@kerfjs/ui/tab-bar';
import { TabBarItem } from '@kerfjs/ui/tab-bar-item';
import { type TabBarFit, wireTabBars } from '@kerfjs/ui/wire-tab-bars';
import { mount } from 'kerfjs';

/**
 * A TabBar with an adjacent trailing action and a pinned end action, wired
 * with `onFitChange`. Every report is appended to `window.fits`, so a spec
 * can read the room between the adjacent trailing zone and the end zone as
 * the host resizes.
 */
declare global {
  interface Window {
    fits: TabBarFit[];
  }
}
window.fits = [];

const host = document.querySelector<HTMLElement>('[data-fit-host]')!;
mount(host, () => (
  <TabBar
    id="adjacent-fit"
    label="Projects"
    trailingPlacement="adjacent"
    trailing={<Button>Add</Button>}
    end={<Button>New Ticket…</Button>}
  >
    <TabBarItem id="one" name="Inbox" selected />
    <TabBarItem id="two" name="Sprint" />
  </TabBar>
));
wireTabBars(host, {
  onReorder: () => {},
  onFitChange: (fit) => window.fits.push(fit),
});
