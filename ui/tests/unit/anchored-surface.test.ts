import { type OverlayContent, popover } from 'kerfjs/overlay';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  openAnchoredSurface,
  openAnchoredSurfaceAt,
} from '../../src/components/feedback/anchored-surface/anchored-surface.js';

vi.mock('kerfjs/overlay', () => ({ popover: vi.fn() }));

const mockedPopover = vi.mocked(popover);
const content = (() => 'help') as unknown as OverlayContent;

function surface() {
  const el = document.createElement('div');
  let resolve!: (value: unknown) => void;
  const result = new Promise<unknown>((done) => {
    resolve = done;
  });
  const close = vi.fn((value?: unknown) => resolve(value));
  return { el, close, result };
}

beforeEach(() => {
  document.body.replaceChildren();
  mockedPopover.mockReset();
});

describe('anchored surface contract', () => {
  it('rejects an unnamed surface before opening an overlay', () => {
    expect(() =>
      openAnchoredSurface(document.createElement('button'), content, {
        label: '  ',
      }),
    ).toThrow('nonempty label');
    expect(mockedPopover).not.toHaveBeenCalled();
  });
  it('delegates placement and lifecycle, names the non-modal surface, and focuses content by default', () => {
    const anchor = document.createElement('button');
    document.body.append(anchor);
    const handle = surface();
    mockedPopover.mockReturnValue(handle);
    expect(
      openAnchoredSurface(anchor, content, {
        label: 'Help',
        placement: 'top',
        align: 'end',
        gap: 8,
      }),
    ).toBe(handle);
    expect(mockedPopover).toHaveBeenCalledWith(anchor, content, {
      placement: 'top',
      align: 'end',
      gap: 8,
      className: 'kui-anchored-surface',
      native: true,
      initialFocus: true,
      dismiss: ['escape', 'outside'],
    });
    expect(handle.el.getAttribute('role')).toBe('dialog');
    expect(handle.el.getAttribute('aria-label')).toBe('Help');
    expect(handle.el.dataset.component).toBe('anchored-surface');
    expect(document.activeElement).toBe(anchor);
  });

  it('forwards explicit focus and dismissal policy', () => {
    const anchor = document.createElement('button');
    mockedPopover.mockReturnValue(surface());
    const onDismiss = vi.fn();
    openAnchoredSurface(anchor, content, {
      label: 'Read-only help',
      initialFocus: false,
      dismiss: false,
      onDismiss,
    });
    expect(mockedPopover).toHaveBeenCalledWith(
      anchor,
      content,
      expect.objectContaining({
        initialFocus: false,
        dismiss: false,
        onDismiss,
      }),
    );
  });

  it('uses the pointer viewport rect within a modal context and removes its temporary anchor on close', async () => {
    const context = document.createElement('dialog');
    const input = document.createElement('input');
    context.append(input);
    document.body.append(context);
    const handle = surface();
    mockedPopover.mockReturnValue(handle);
    openAnchoredSurfaceAt({ x: 27, y: 48, context: input }, content, {
      label: 'Point help',
    });
    const anchor = context.querySelector('span')!;
    expect(input.children).toHaveLength(0);
    expect(anchor.getBoundingClientRect().x).toBe(27);
    expect(anchor.getBoundingClientRect().y).toBe(48);
    expect(anchor.getAttribute('aria-hidden')).toBe('true');
    expect(mockedPopover.mock.calls[0][0]).toBe(anchor);
    handle.close();
    await handle.result;
    expect(context.querySelector('span')).toBeNull();
  });

  it('closes when the owning modal closes and drops its listener after dismissal', async () => {
    const dialog = document.createElement('dialog');
    dialog.open = true;
    const anchor = document.createElement('button');
    dialog.append(anchor);
    document.body.append(dialog);
    const handle = surface();
    mockedPopover.mockReturnValue(handle);
    openAnchoredSurface(anchor, content, { label: 'Modal help' });
    dialog.dispatchEvent(new Event('close'));
    expect(handle.close).toHaveBeenCalledTimes(1);
    await handle.result;
    dialog.dispatchEvent(new Event('close'));
    expect(handle.close).toHaveBeenCalledTimes(1);
  });

  it('rejects invalid coordinates and cleans up when construction throws', () => {
    expect(() =>
      openAnchoredSurfaceAt({ x: NaN, y: 4 }, content, { label: 'Help' }),
    ).toThrow('finite coordinates');
    mockedPopover.mockImplementation(() => {
      throw new Error('placement failed');
    });
    expect(() =>
      openAnchoredSurfaceAt({ x: 1, y: 2 }, content, { label: 'Help' }),
    ).toThrow('placement failed');
    expect(document.querySelector('span')).toBeNull();
  });
});
