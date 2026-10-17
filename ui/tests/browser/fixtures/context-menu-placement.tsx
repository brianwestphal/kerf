import '@kerfjs/ui/foundation.css';
import '@kerfjs/ui/popup-menu.css';

import {
  openPopupMenu,
  openPopupMenuAt,
  PopupMenu,
  type PopupMenuElement,
  type PopupMenuPlacement,
} from '@kerfjs/ui/popup-menu';
import { popupMenuElementsRegistered } from '@kerfjs/ui/popup-menu/register';
import { mount } from 'kerfjs';

/**
 * Context PopupMenus rendered with an `anchor` point and each placement, so
 * the suite can open one from its rendered anchor (`openPopupMenu`) or at a
 * new pointer point (`openPopupMenuAt`) and measure where it sits against
 * that point. Nothing here re-renders, so each menu keeps the placement it
 * was rendered with.
 */
const PLACEMENTS: readonly PopupMenuPlacement[] = [
  'bottom-start',
  'bottom-end',
  'top-start',
  'top-end',
];

// Read the register marker so the side-effect entry that wires the menus is
// not tree-shaken out of the bundle.
document.documentElement.dataset.registered = String(
  popupMenuElementsRegistered,
);

const host = document.createElement('div');
document.body.append(host);
mount(host, () => (
  <div>
    {PLACEMENTS.map((placement) => (
      <PopupMenu
        context
        label={`Context ${placement}`}
        anchor={{ x: 400, y: 400 }}
        placement={placement}
        rootAttributes={{ 'data-context-placement': placement }}
        items={[
          { label: 'Open', action: 'open' },
          { label: 'Rename', action: 'rename' },
          { label: 'Archive', action: 'archive', tone: 'danger' },
        ]}
      />
    ))}
  </div>
));

const menuFor = (placement: string) =>
  document.querySelector<PopupMenuElement>(
    `[data-context-placement="${placement}"]`,
  )!;

(
  globalThis as unknown as {
    contextPlacementFixture: {
      open(placement: string): void;
      openAt(placement: string, x: number, y: number): void;
    };
  }
).contextPlacementFixture = {
  open: (placement) => openPopupMenu(menuFor(placement)),
  openAt: (placement, x, y) => openPopupMenuAt(menuFor(placement), x, y),
};
