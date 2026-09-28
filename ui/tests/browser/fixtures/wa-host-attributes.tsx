import '@kerfjs/ui/foundation.css';
import '@kerfjs/ui/webawesome.css';
import '@kerfjs/ui/select.css';

import { Select } from '@kerfjs/ui/select';
import { selectElementsRegistered } from '@kerfjs/ui/select/register';
import { mount, signal } from 'kerfjs';

/**
 * A Select whose choices put a divider inside one run of options, mounted
 * under a signal the test bumps to force kerf re-renders with an unchanged
 * template. Web Awesome sets attributes on these hosts itself, so the test
 * can check what a re-render's morph leaves behind.
 */
const renders = signal(0);

// Reference the marker so the side-effect-only registration is not
// tree-shaken out of the bundle.
document.documentElement.dataset.selectRegistered = String(
  selectElementsRegistered,
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
  </div>
));

Object.assign(window, {
  rerender: () => {
    renders.value += 1;
  },
});
