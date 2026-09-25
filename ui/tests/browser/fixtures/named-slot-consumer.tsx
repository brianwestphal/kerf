import { StateBanner } from '@kerfjs/ui/state-banner';
import { mount, signal } from 'kerfjs';

class NamedSlotHost extends HTMLElement {
  constructor() {
    super();
    const shadow = this.attachShadow({ mode: 'open' });
    shadow.innerHTML =
      '<slot name="primary"></slot><slot name="secondary"></slot>';
  }
}

customElements.define('named-slot-host', NamedSlotHost);

const target = signal('primary');
const host = document.querySelector<HTMLElement>('[data-named-slot-host]')!;

mount(host, () =>
  StateBanner({
    title: 'Projected status',
    detail: 'The same root moves between native named slots.',
    slot: target.value,
  }),
);

Object.assign(globalThis, {
  moveNamedSlot: (slot: 'primary' | 'secondary') => {
    target.value = slot;
  },
});
