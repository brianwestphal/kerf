import '@awesome.me/webawesome/dist/components/badge/badge.js';
import '@awesome.me/webawesome/dist/components/button/button.js';
import '@awesome.me/webawesome/dist/components/tag/tag.js';

import { mount, signal } from 'kerfjs';

/**
 * Raw Web Awesome hosts whose templates deliberately omit the defaults Lit
 * reflects onto them (wa-button variant/appearance/size, wa-tag variant/
 * appearance/size, wa-badge attention). Rows mirror a list-free selection: a
 * signal the test bumps changes one row's attribute, so every re-render runs
 * kerf's morph over all the hosts.
 */
const selected = signal(0);
const rows = [0, 1, 2, 3, 4, 5, 6, 7];

mount(
  document.querySelector<HTMLElement>('[data-wa-reflected-defaults]')!,
  () => (
    <ul>
      {rows.map((id) => (
        <li data-selected={selected.value === id ? '' : undefined}>
          <wa-tag>{`Row ${String(id)}`}</wa-tag>
          <wa-badge>{String(id)}</wa-badge>
          <wa-button>Open</wa-button>
        </li>
      ))}
    </ul>
  ),
);

Object.assign(window, {
  select: (id: number) => {
    selected.value = id;
  },
});
