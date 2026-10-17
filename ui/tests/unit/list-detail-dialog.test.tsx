import { describe, expect, it } from 'vitest';

import { ListDetailDialog } from '../../src/components/surfaces/list-detail-dialog/list-detail-dialog.js';

function render(html: unknown): HTMLElement {
  const host = document.createElement('div');
  host.innerHTML = String(html);
  return host;
}

const base = {
  id: 'projects',
  label: 'Project Details',
  list: {
    title: 'Recent Projects',
    toolbar: <button type="button" aria-label="Add Project" />,
    content: <ul data-test-list="" />,
    footer: <p data-test-list-footer="">3 projects</p>,
  },
  detail: {
    title: 'Northstar',
    description: 'Mara Chen',
    actions: <button type="button" aria-label="Share" />,
    content: <p data-test-detail="">Details</p>,
    footer: <button type="button">Open Project</button>,
  },
};

describe('ListDetailDialog', () => {
  it('renders a header-less modal whose columns each carry their own chrome', () => {
    const host = render(ListDetailDialog(base));
    const dialog = host.querySelector<HTMLDialogElement>('dialog')!;
    expect(dialog.id).toBe('projects');
    expect(dialog.getAttribute('aria-label')).toBe('Project Details');
    expect(dialog.dataset.component).toBe('dialog-surface');
    expect(dialog.dataset.dialogLayout).toBe('list-detail');
    expect(dialog.dataset.presentation).toBe('modal');
    expect(dialog.dataset.size).toBe('large');
    expect(dialog.dataset.bodyLayout).toBe('fill');
    expect(dialog.dataset.bodyInset).toBe('none');
    expect(dialog.getAttribute('style')).toContain(
      '--_kui-dialog-surface-height:35rem',
    );
    // No surface header: the divider runs the full height.
    expect(dialog.querySelector('.kui-dialog-surface__header')).toBeNull();

    const split = dialog.querySelector<HTMLElement>('.kui-split-view')!;
    expect(split.id).toBe('projects-split');
    expect(split.dataset.splitMode).toBe('split');
    expect(split.getAttribute('style')).toBe(
      '--kui-split-view-list-width:min(17.5rem, 40%)',
    );

    const list = split.querySelector('[data-split-list]')!;
    const listTitle = list.querySelector('.kui-toolbar .kui-toolbar-text')!;
    expect(listTitle.textContent).toContain('Recent Projects');
    expect(listTitle.getAttribute('data-size') ?? 'default').not.toBe('xlarge');
    expect(
      list.querySelector('.kui-toolbar__trailing [aria-label="Add Project"]'),
    ).not.toBeNull();
    expect(list.querySelector('[data-test-list]')).not.toBeNull();
    expect(list.querySelector('[data-test-list-footer]')).not.toBeNull();

    const detail = split.querySelector('[data-split-detail]')!;
    const title = detail.querySelector('#projects-title')!;
    expect(title.getAttribute('role')).toBe('heading');
    expect(title.getAttribute('aria-level')).toBe('2');
    expect(title.textContent).toBe('Northstar');
    expect(detail.textContent).toContain('Mara Chen');
    const trailing = detail.querySelector('.kui-toolbar__trailing')!;
    const controls = [...trailing.querySelectorAll('button')];
    expect(controls.map((b) => b.getAttribute('aria-label'))).toEqual([
      'Share',
      'Close',
    ]);
    expect(controls[1]!.hasAttribute('data-dialog-close')).toBe(true);
    expect(detail.querySelector('[data-test-detail]')).not.toBeNull();
    expect(detail.textContent).toContain('Open Project');
    // The detail description describes the selection, not the dialog.
    expect(dialog.hasAttribute('aria-describedby')).toBe(false);
  });

  it('takes an explicit describedBy for app-owned summary copy', () => {
    for (const compact of [false, true]) {
      const dialog = render(
        ListDetailDialog({
          ...base,
          compact,
          detailActive: compact,
          describedBy: 'projects-summary',
          detail: {
            ...base.detail,
            content: <p id="projects-summary">2 projects need review.</p>,
          },
        }),
      ).querySelector('dialog')!;
      expect(dialog.getAttribute('aria-describedby')).toBe('projects-summary');
      expect(dialog.querySelector('#projects-summary')).not.toBeNull();
    }
  });

  it('forwards sizing, dismissal, and identity, protecting its layout marker', () => {
    const host = render(
      ListDetailDialog({
        ...base,
        size: 'medium',
        lightDismiss: true,
        closeLabel: 'Dismiss',
        maxHeight: 'viewport',
        viewportGutter: '1rem' as never,
        list: { ...base.list, width: 200 },
        rootAttributes: {
          'data-key': 'projects',
          'data-dialog-layout': 'spoofed',
        },
        className: 'app-dialog',
        slot: 'dialogs',
      }),
    );
    const dialog = host.querySelector<HTMLDialogElement>('dialog')!;
    expect(dialog.dataset.size).toBe('medium');
    expect(dialog.hasAttribute('data-light-dismiss')).toBe(true);
    expect(dialog.dataset.key).toBe('projects');
    expect(dialog.dataset.dialogLayout).toBe('list-detail');
    expect(dialog.className).toBe('kui-dialog-surface app-dialog');
    expect(dialog.getAttribute('slot')).toBe('dialogs');
    expect(dialog.hasAttribute('data-max-height')).toBe(true);
    // A height cap replaces the default definite height.
    expect(dialog.hasAttribute('data-height')).toBe(false);
    expect(
      dialog.querySelector('[data-dialog-close]')?.getAttribute('aria-label'),
    ).toBe('Dismiss');
    expect(dialog.querySelector('.kui-split-view')?.getAttribute('style')).toBe(
      '--kui-split-view-list-width:12.5rem',
    );
  });

  it('becomes a full-screen NavStack with the close control on every view', () => {
    const listOnly = render(ListDetailDialog({ ...base, compact: true }));
    const dialog = listOnly.querySelector<HTMLDialogElement>('dialog')!;
    expect(dialog.dataset.presentation).toBe('fullscreen');
    expect(dialog.hasAttribute('data-height')).toBe(false);
    expect(dialog.querySelector('.kui-dialog-surface__header')).toBeNull();
    const split = dialog.querySelector<HTMLElement>('.kui-split-view')!;
    expect(split.dataset.splitMode).toBe('compact');
    expect(split.querySelectorAll('[data-nav-key]').length).toBe(1);
    expect(dialog.textContent).toContain('Recent Projects');
    expect(dialog.querySelector('[aria-label="Add Project"]')).not.toBeNull();
    expect(dialog.querySelectorAll('[data-dialog-close]').length).toBe(1);
    expect(dialog.querySelector('[data-test-list-footer]')).not.toBeNull();

    const pushed = render(
      ListDetailDialog({
        ...base,
        compact: true,
        detailActive: true,
        backLabel: 'Back to Projects',
      }),
    );
    const views = pushed.querySelectorAll('[data-nav-key]');
    expect(views.length).toBe(2);
    expect(
      pushed.querySelector('[aria-label="Back to Projects"]'),
    ).not.toBeNull();
    expect(pushed.querySelector('[aria-label="Share"]')).not.toBeNull();
    expect(pushed.querySelector('[data-test-detail]')).not.toBeNull();
    expect(pushed.textContent).toContain('Open Project');
    expect(pushed.textContent).toContain('Northstar');
  });
});
