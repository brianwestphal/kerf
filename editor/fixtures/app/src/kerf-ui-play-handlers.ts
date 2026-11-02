// The app's mock action handlers for the editor's play mode (KF-RF6RCS: host
// mock action handlers), named to the Vite plugin through its
// `playHandlers` option. They run inside the play frame: opening an order
// row remembers which order it was and pushes the order's view.
import type { PlayHandlers } from '@kerfjs/ui/editor';

const playHandlers: PlayHandlers = {
  'open-order': ({ view }) => {
    view.setParams({ selectedId: view.key ?? '' });
    view.navStack('orders')?.push('order');
  },
};

export default playHandlers;
