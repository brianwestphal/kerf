import '@kerfjs/ui/foundation.css';
import '@kerfjs/ui/select.css';

import { Select } from '@kerfjs/ui/select';
import { selectElementsRegistered } from '@kerfjs/ui/select/register';
import { mount } from 'kerfjs';

/**
 * A Select far down a page that scrolls its document (KF-GRNDW5), with a
 * list taller than half the viewport, so where it opens depends on the room
 * the viewport has around the trigger, not on how far the page scrolled.
 */
// Read the register marker so the side-effect entry that wires every
// Select is not tree-shaken out of the bundle.
document.documentElement.dataset.registered = String(selectElementsRegistered);

const host = document.createElement('div');
document.body.append(host);
mount(host, () => (
  <div style="padding: 0 24px">
    <div data-spacer style="height: 1600px" />
    <Select
      name="fruit"
      value="f1"
      label="Fruit"
      choices={Array.from({ length: 11 }, (_, index) => ({
        value: `f${index + 1}`,
        label: `Fruit ${index + 1}`,
      }))}
    />
    <div style="height: 1600px" />
  </div>
));
