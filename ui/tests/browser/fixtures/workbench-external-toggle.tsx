import '@kerfjs/ui/foundation.css';
import '@kerfjs/ui/document.css';
import '@kerfjs/ui/workbench.css';

import { wireWorkbench } from '@kerfjs/ui/wire-workbench';
import { Workbench } from '@kerfjs/ui/workbench';
import { mount, raw, signal } from 'kerfjs';

// A persistent app-bar toggle outside the Workbench opens its left rail,
// which presents as an overlay at phone width. The toggle is never relocated
// or removed, so focus can move in only once the overlay becomes focusable.
const collapsed = signal(true);
const root = document.querySelector<HTMLElement>('[data-fixture-root]')!;
// The wiring is set up before the render, so its effect runs first when the
// rail opens: the app's render has not shown the drawer yet.
wireWorkbench(root, { id: 'app', panels: { leftRail: { collapsed } } });
mount(root, () => (
  <div style="display:flex;flex-direction:column;height:100vh">
    <header>
      <button
        type="button"
        data-app-toggle
        aria-controls="app-left-rail"
        aria-expanded={String(!collapsed.value)}
      >
        Topics
      </button>
    </header>
    <div style="flex:1;min-height:0">
      {Workbench({
        id: 'app',
        label: 'App',
        main: raw('<p><button type="button">Story</button></p>'),
        leftRail: {
          label: 'Topics',
          collapsed: collapsed.value,
          responsiveOverlayAt: 'narrow',
          content: raw(
            '<div><button type="button" data-first-topic>World</button><button type="button">Science</button></div>',
          ),
        },
      })}
    </div>
  </div>
));
root.addEventListener('click', (event) => {
  if ((event.target as Element).closest('[data-app-toggle]'))
    collapsed.value = !collapsed.value;
});
