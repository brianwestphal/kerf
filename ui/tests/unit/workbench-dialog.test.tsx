import { describe, expect, it } from 'vitest';

import { WorkbenchDialog } from '../../src/components/surfaces/workbench-dialog/workbench-dialog.js';
import { remify } from '../../src/shared/styles/css-values.js';

function render(html: unknown): HTMLElement {
  const host = document.createElement('div');
  host.innerHTML = String(html);
  return host;
}

const rail = (name: string, collapsed = false) => ({
  label: name,
  collapsed,
  toolbar: {
    label: name,
    title: <span data-rail-title="">{name}</span>,
    toggle: { action: `toggle-${name.toLowerCase()}`, name },
  },
  content: <p data-rail-content="">{name}</p>,
});

const base = {
  id: 'slide',
  label: 'Edit Slide',
  title: 'Edit Slide',
  description: 'Slide 3 of 12',
  leading: <button type="button" aria-label="Zoom" />,
  actions: <button type="button" aria-label="Share" />,
  main: <p data-test-main="">Canvas</p>,
  mainFooter: <p data-test-main-footer="">Saved</p>,
  mainBottomToolbar: {
    label: 'Slide Actions',
    trailing: <button type="button">Save Slide</button>,
  },
  leftRail: rail('Layers'),
  rightRail: rail('Inspector'),
  bottomDrawer: rail('Notes', true),
};

describe('WorkbenchDialog', () => {
  it('renders a header-less modal around a Workbench whose toolbar carries the title and close', () => {
    const host = render(WorkbenchDialog({ ...base, mainMinSize: 280 }));
    const dialog = host.querySelector<HTMLDialogElement>('dialog')!;
    expect(dialog.id).toBe('slide');
    expect(dialog.getAttribute('aria-label')).toBe('Edit Slide');
    expect(dialog.dataset).toMatchObject({
      component: 'dialog-surface',
      dialogLayout: 'workbench',
      presentation: 'modal',
      size: 'large',
      bodyLayout: 'fill',
      bodyInset: 'none',
    });
    expect(dialog.getAttribute('style')).toContain(
      '--_kui-dialog-surface-height:35rem',
    );
    expect(dialog.querySelector('.kui-dialog-surface__header')).toBeNull();

    const workbench = dialog.querySelector<HTMLElement>('.kui-workbench')!;
    expect(workbench.id).toBe('slide-workbench');
    const heading = dialog.querySelector('#slide-title')!;
    expect(heading.textContent).toContain('Edit Slide');
    const toolbar = heading.closest('.kui-toolbar')!;
    expect(toolbar.textContent).toContain('Slide 3 of 12');
    const trailing = toolbar.querySelector('.kui-toolbar__trailing')!;
    const labels = [...trailing.querySelectorAll('[aria-label]')].map((el) =>
      el.getAttribute('aria-label'),
    );
    expect(labels.at(-1)).toBe('Close');
    expect(labels).toContain('Share');
    expect(
      trailing
        .querySelector('[aria-label="Close"]')!
        .hasAttribute('data-dialog-close'),
    ).toBe(true);
    expect(toolbar.querySelector('[aria-label="Zoom"]')).not.toBeNull();
    expect(dialog.querySelector('[data-test-main]')).not.toBeNull();
    expect(dialog.querySelector('[data-test-main-footer]')).not.toBeNull();
    expect(dialog.textContent).toContain('Save Slide');

    for (const side of ['left', 'right']) {
      const element = dialog.querySelector<HTMLElement>(
        `[data-workbench-rail="${side}"]`,
      )!;
      expect(element.dataset.presentation).toBe('inline');
      expect(element.querySelector('[data-rail-title]')).not.toBeNull();
    }
    expect(dialog.querySelector('#slide-workbench-left-rail')).not.toBeNull();
    expect(
      dialog.querySelector('#slide-workbench-bottom-drawer'),
    ).not.toBeNull();
  });

  it('fills the screen with overlay rails on compact devices and keeps Close after relocated toggles', () => {
    const host = render(
      WorkbenchDialog({
        ...base,
        compact: true,
        closeLabel: 'Done',
        lightDismiss: true,
        height: remify(480),
        viewportGutter: remify(16),
        rightRail: rail('Inspector', true),
        rootAttributes: { 'data-key': 'slide-3' },
        className: 'extra',
        slot: 'dialog',
      }),
    );
    const dialog = host.querySelector<HTMLDialogElement>('dialog')!;
    expect(dialog.dataset.presentation).toBe('fullscreen');
    expect(dialog.dataset.key).toBe('slide-3');
    expect(dialog.hasAttribute('data-light-dismiss')).toBe(true);
    expect(dialog.classList.contains('extra')).toBe(true);
    expect(dialog.getAttribute('slot')).toBe('dialog');
    expect(dialog.getAttribute('style') ?? '').not.toContain('30rem');
    for (const side of ['left', 'right'])
      expect(
        dialog.querySelector<HTMLElement>(`[data-workbench-rail="${side}"]`)!
          .dataset.presentation,
      ).toBe('overlay');
    // The drawer stays as the app gave it.
    expect(
      dialog.querySelector<HTMLElement>('.kui-workbench__drawer')!.dataset
        .presentation,
    ).toBe('inline');
    // A collapsed right rail's toggle relocates into the work area's
    // toolbar, before the close control, which stays outermost.
    const trailing = dialog
      .querySelector('#slide-title')!
      .closest('.kui-toolbar')!
      .querySelector('.kui-toolbar__trailing')!;
    const labels = [...trailing.querySelectorAll('button[aria-label]')].map(
      (el) => el.getAttribute('aria-label'),
    );
    expect(labels).toContain('Show Inspector');
    expect(labels.at(-1)).toBe('Done');
  });

  it('takes a height cap instead of the default height, and runs without rails', () => {
    const capped = render(
      WorkbenchDialog({
        id: 'plain',
        label: 'Plain',
        title: 'Plain',
        main: <p />,
        maxHeight: remify(640),
      }),
    ).querySelector<HTMLDialogElement>('dialog')!;
    expect(capped.getAttribute('style')).toContain('40rem');
    expect(capped.getAttribute('style')).not.toContain(
      '--_kui-dialog-surface-height:35rem',
    );
    expect(capped.querySelector('[data-workbench-rail]')).toBeNull();
    // No description: no accessible description.
    expect(capped.hasAttribute('aria-describedby')).toBe(false);
  });

  it('describes the dialog by its title description, or an explicit describedBy', () => {
    const dialog = render(WorkbenchDialog(base)).querySelector('dialog')!;
    expect(dialog.getAttribute('aria-describedby')).toBe('slide-description');
    const description = dialog.querySelector('#slide-description')!;
    expect(description.textContent).toBe('Slide 3 of 12');
    expect(description.closest('#slide-title')).toBeNull();
    const compact = render(WorkbenchDialog({ ...base, compact: true }));
    expect(
      compact.querySelector('dialog')!.getAttribute('aria-describedby'),
    ).toBe('slide-description');
    expect(compact.querySelector('#slide-description')).not.toBeNull();

    const explicit = render(
      WorkbenchDialog({
        ...base,
        describedBy: 'slide-summary',
        main: <p id="slide-summary">Unsaved changes</p>,
      }),
    ).querySelector('dialog')!;
    expect(explicit.getAttribute('aria-describedby')).toBe('slide-summary');
    expect(explicit.querySelector('#slide-summary')).not.toBeNull();
  });
});
