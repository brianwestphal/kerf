import { NavStack } from '@kerfjs/ui/nav-stack';
import { wireNavStack } from '@kerfjs/ui/wire-nav-stack';
import { mount, signal } from 'kerfjs';

// A NavStack whose pushed view has nothing focusable (an inert loading
// partial), so wireNavStack focuses the view itself through a generated
// tabindex; an unrelated re-render then morphs the view (KF-ADYAY9).
const pushed = signal(false);
const loaded = signal(false);
const label = signal('Rail');
const app = document.querySelector<HTMLElement>('[data-app]')!;
mount(app, () =>
  NavStack({
    id: 'rail',
    label: label.value,
    views: [
      { key: 'list', content: <button id="open">Open</button> },
      ...(pushed.value
        ? [
            {
              key: 'ticket',
              content: loaded.value ? (
                <button id="loaded">Edit ticket</button>
              ) : (
                <div inert>
                  <button>Loading row</button>
                </div>
              ),
            },
          ]
        : []),
    ],
  }),
);
wireNavStack(app.querySelector<HTMLElement>('[data-component="nav-stack"]')!, {
  duration: 0,
});
Object.assign(globalThis, {
  push: () => {
    pushed.value = true;
  },
  relabel: () => {
    label.value = 'Ticket Rail';
  },
  load: () => {
    loaded.value = true;
  },
});
