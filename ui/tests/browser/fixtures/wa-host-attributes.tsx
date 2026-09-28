import '@kerfjs/ui/foundation.css';
import '@kerfjs/ui/webawesome.css';
import '@kerfjs/ui/select.css';
import '@kerfjs/ui/popup-menu.css';

import { PopupMenu } from '@kerfjs/ui/popup-menu';
import { popupMenuElementsRegistered } from '@kerfjs/ui/popup-menu/register';
import { Select } from '@kerfjs/ui/select';
import { selectElementsRegistered } from '@kerfjs/ui/select/register';
import { mount, signal } from 'kerfjs';

/**
 * A single Select whose choices put a divider inside one run of options, a
 * multiple Select, and a PopupMenu, mounted under a signal the test bumps to
 * force kerf re-renders with an unchanged template. Web Awesome sets
 * attributes on these hosts itself, so the test can check what a
 * re-render's morph leaves behind (and whether it churns any).
 */
const renders = signal(0);

// Reference the markers so the side-effect-only registrations are not
// tree-shaken out of the bundle.
document.documentElement.dataset.registered = String(
  selectElementsRegistered && popupMenuElementsRegistered,
);

mount(document.querySelector<HTMLElement>('[data-wa-host-attributes]')!, () => (
  <div data-renders={String(renders.value)}>
    <Select<string>
      name="divided"
      value="a"
      label="Divided"
      choices={[
        { value: 'a', label: 'A' },
        { value: 'b', label: 'B', separatorBefore: true },
        { value: 'c', label: 'C' },
      ]}
    />
    <Select<string>
      name="labels"
      multiple
      value={['bug']}
      label="Labels"
      choices={[
        { value: 'bug', label: 'Bug' },
        { value: 'docs', label: 'Docs' },
      ]}
    />
    <PopupMenu
      label="Actions"
      items={[
        { label: 'Rename', action: 'rename' },
        { kind: 'divider' },
        { label: 'Delete', action: 'delete' },
      ]}
    />
  </div>
));

Object.assign(window, {
  rerender: () => {
    renders.value += 1;
  },
});
