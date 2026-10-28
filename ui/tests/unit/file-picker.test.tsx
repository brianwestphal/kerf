import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  FileDropZone,
  FilePickerTrigger,
} from '../../src/components/forms/file-picker/file-picker.js';
import {
  fileMatchesAccept,
  wireFilePickers,
} from '../../src/components/forms/file-picker/wiring/wire-file-pickers.js';

const file = (name: string, type: string) => new File(['x'], name, { type });

function dragEvent(
  type: string,
  files: File[] = [],
  kinds = ['Files'],
  transfer = true,
) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'dataTransfer', {
    value: transfer ? { files, types: kinds, dropEffect: 'none' } : null,
  });
  return event as DragEvent;
}

describe('FilePickerTrigger and FileDropZone', () => {
  it('render labels around hidden native file inputs', () => {
    expect(
      String(
        FilePickerTrigger({
          label: 'Add',
          accessibleLabel: 'Browse attachments',
          icon: <svg />,
          multiple: true,
          accept: '.pdf',
          name: 'files',
          pickerId: 'attach',
          className: 'compact',
        }),
      ),
    ).toBe(
      '<label class="kui-file-picker compact" data-component="file-picker-trigger" data-presentation="trigger" data-file-picker-id="attach"><span class="kui-file-picker__icon" aria-hidden="true"><svg></svg></span><span>Add</span><input type="file" class="kui-file-picker__input" accept=".pdf" multiple name="files" aria-label="Browse attachments"></label>',
    );
    const zone = String(
      FileDropZone({
        title: 'Drop here',
        detail: 'PDF only',
        icon: <svg />,
        className: 'evidence',
        disabled: true,
      }),
    );
    expect(zone).toContain(
      'data-component="file-drop-zone" data-presentation="drop-zone" data-disabled="true"',
    );
    expect(zone).toContain(
      '<span class="kui-file-picker__title">Drop here</span><span class="kui-file-picker__detail">PDF only</span>',
    );
    expect(zone).toContain('disabled>');
    expect(String(FilePickerTrigger({ label: 'Add' }))).not.toContain('icon');
    expect(
      String(FilePickerTrigger({ label: 'Add', disabled: true })),
    ).toContain('data-presentation="trigger" data-disabled="true"');
    expect(String(FileDropZone({ title: 'Drop' }))).not.toContain('__detail');
  });

  it('looks like a Button with tone, emphasis, or size, and stays a file label', () => {
    expect(
      String(
        FilePickerTrigger({
          label: 'Open',
          icon: <svg />,
          emphasis: 'plain',
          size: 'compact',
          pickerId: 'open',
          disabled: true,
        }),
      ),
    ).toBe(
      '<label class="kui-file-picker" data-component="file-picker-trigger" data-presentation="button" data-file-picker-id="open" data-disabled="true"><span class="kui-button" data-component="button" data-face="true" data-tone="neutral" data-emphasis="plain" data-size="compact"><span class="kui-button__icon" aria-hidden="true"><svg></svg></span><span class="kui-button__label">Open</span></span><input type="file" class="kui-file-picker__input" disabled></label>',
    );
    for (const look of [{ tone: 'brand' }, { size: 'default' }] as const) {
      const html = String(FilePickerTrigger({ label: 'Import', ...look }));
      expect(html).toContain('data-presentation="button"');
      expect(html).toContain('data-emphasis="primary"');
      expect(html).not.toContain('kui-button__icon');
    }
  });
});

describe('fileMatchesAccept', () => {
  it('matches extensions, wildcard types, and exact types', () => {
    expect(fileMatchesAccept(file('a.PDF', ''), '.pdf')).toBe(true);
    expect(fileMatchesAccept(file('a.png', 'image/png'), 'image/*')).toBe(true);
    expect(fileMatchesAccept(file('a.txt', 'text/plain'), 'text/plain')).toBe(
      true,
    );
    expect(
      fileMatchesAccept(file('a.exe', 'application/x'), 'image/*,.pdf'),
    ).toBe(false);
    expect(fileMatchesAccept(file('a.exe', ''), ' , ')).toBe(true);
    expect(fileMatchesAccept(file('a.txt', 'text/plain'), 'image/*')).toBe(
      false,
    );
    expect(fileMatchesAccept(file('a.txt', 'text/plain'), 'text/csv')).toBe(
      false,
    );
  });
});

describe('wireFilePickers', () => {
  afterEach(() => document.body.replaceChildren());

  it('reports browsed files and resets the input', () => {
    const root = document.createElement('div');
    root.innerHTML = String(FilePickerTrigger({ label: 'Add', pickerId: 'a' }));
    document.body.append(root);
    const onFiles = vi.fn();
    const stop = wireFilePickers(root, { onFiles });
    const input = root.querySelector('input')!;
    const chosen = [file('one.txt', 'text/plain')];
    Object.defineProperty(input, 'files', {
      value: chosen,
      configurable: true,
    });
    input.dispatchEvent(new Event('change', { bubbles: true }));
    expect(onFiles).toHaveBeenCalledWith({
      picker: root.firstElementChild,
      id: 'a',
      files: chosen,
      via: 'browse',
    });
    // An empty choice, a non-file input, and an input outside a picker are ignored.
    Object.defineProperty(input, 'files', { value: [], configurable: true });
    input.dispatchEvent(new Event('change', { bubbles: true }));
    const text = document.createElement('input');
    root.append(text);
    text.dispatchEvent(new Event('change', { bubbles: true }));
    const loose = document.createElement('input');
    loose.type = 'file';
    root.append(loose);
    loose.dispatchEvent(new Event('change', { bubbles: true }));
    root.dispatchEvent(new Event('change'));
    expect(onFiles).toHaveBeenCalledOnce();
    stop();
    input.dispatchEvent(new Event('change', { bubbles: true }));
    expect(onFiles).toHaveBeenCalledOnce();
  });

  it('marks dragging, filters drops by accept and multiple, and skips disabled zones', () => {
    const root = document.createElement('div');
    root.innerHTML =
      String(
        FileDropZone({ title: 'Drop', accept: 'image/*', pickerId: 'z' }),
      ) + String(FileDropZone({ title: 'Off', disabled: true }));
    document.body.append(root);
    const [zone, disabled] = [
      ...root.querySelectorAll<HTMLElement>(
        '[data-component="file-drop-zone"]',
      ),
    ];
    const onFiles = vi.fn();
    const stop = wireFilePickers(root, { onFiles });
    const over = dragEvent('dragover');
    zone!.dispatchEvent(over);
    expect(over.defaultPrevented).toBe(true);
    expect(zone!.dataset.dragging).toBe('true');
    // Leaving into a child keeps the highlight; leaving the zone clears it.
    const inside = dragEvent('dragleave');
    Object.defineProperty(inside, 'relatedTarget', {
      value: zone!.firstElementChild,
    });
    zone!.dispatchEvent(inside);
    expect(zone!.dataset.dragging).toBe('true');
    zone!.dispatchEvent(dragEvent('dragleave'));
    expect(zone!.dataset.dragging).toBeUndefined();
    // Text drags and disabled zones are not drop targets.
    const text = dragEvent('dragenter', [], ['text/plain']);
    zone!.dispatchEvent(text);
    expect(text.defaultPrevented).toBe(false);
    disabled!.dispatchEvent(dragEvent('dragover'));
    expect(disabled!.dataset.dragging).toBeUndefined();
    disabled!.dispatchEvent(dragEvent('drop', [file('a.png', 'image/png')]));
    root.dispatchEvent(dragEvent('drop'));
    const loose = document.createTextNode('loose');
    root.append(loose);
    loose.dispatchEvent(dragEvent('dragover'));
    root.dispatchEvent(dragEvent('dragleave'));

    zone!.dispatchEvent(
      dragEvent('drop', [
        file('a.png', 'image/png'),
        file('b.exe', 'application/x'),
        file('c.jpg', 'image/jpeg'),
      ]),
    );
    expect(onFiles).toHaveBeenCalledOnce();
    expect(onFiles.mock.calls[0]![0].files.map((f: File) => f.name)).toEqual([
      'a.png',
    ]);
    expect(onFiles.mock.calls[0]![0].via).toBe('drop');
    // A drop with nothing acceptable reports nothing.
    zone!.dispatchEvent(dragEvent('drop', [file('b.exe', 'application/x')]));
    expect(onFiles).toHaveBeenCalledOnce();
    stop();
  });

  it('highlights a scoped zone and takes drops anywhere in its enclosing element', () => {
    const root = document.createElement('div');
    root.innerHTML = `<section class="panel"><p class="row">Row</p>${String(
      FileDropZone({
        title: 'Drop',
        pickerId: 'attachments',
        multiple: true,
        dropScope: '.panel',
      }),
    )}</section><section class="off"><p class="off-row">Off</p>${String(
      FileDropZone({ title: 'Off', disabled: true, dropScope: '.off' }),
    )}</section><section class="lost">${String(
      FileDropZone({ title: 'Lost', dropScope: '.nowhere' }),
    )}</section><p class="outside">Outside</p>`;
    document.body.append(root);
    const zone = root.querySelector<HTMLElement>('.panel [data-component]')!;
    expect(zone.dataset.dropScope).toBe('.panel');
    const row = root.querySelector('.row')!;
    const onFiles = vi.fn();
    const stop = wireFilePickers(root, { onFiles });
    // Over the panel, outside the zone itself, the zone lights up.
    const over = dragEvent('dragover');
    row.dispatchEvent(over);
    expect(over.defaultPrevented).toBe(true);
    expect(zone.dataset.dragging).toBe('true');
    // Moving from the panel into the zone keeps it; leaving the panel clears it.
    const intoZone = dragEvent('dragleave');
    Object.defineProperty(intoZone, 'relatedTarget', { value: zone });
    row.dispatchEvent(intoZone);
    expect(zone.dataset.dragging).toBe('true');
    zone.dispatchEvent(dragEvent('dragleave'));
    expect(zone.dataset.dragging).toBeUndefined();
    // A drop on the panel is reported for the zone.
    row.dispatchEvent(dragEvent('drop', [file('a.txt', 'text/plain')]));
    expect(onFiles).toHaveBeenCalledWith(
      expect.objectContaining({ picker: zone, id: 'attachments', via: 'drop' }),
    );
    // A disabled scoped zone, an unmatched scope, and the outside take nothing.
    const offOver = dragEvent('dragover');
    root.querySelector('.off-row')!.dispatchEvent(offOver);
    expect(offOver.defaultPrevented).toBe(false);
    const outside = dragEvent('dragover');
    root.querySelector('.outside')!.dispatchEvent(outside);
    expect(outside.defaultPrevented).toBe(false);
    const lost = root.querySelector<HTMLElement>('.lost [data-component]')!;
    lost.dispatchEvent(dragEvent('dragover'));
    expect(lost.dataset.dragging).toBe('true');
    stop();
    root.remove();
  });

  it('keeps every accepted file for a multiple zone and works on a document root', () => {
    document.body.innerHTML = String(
      FileDropZone({ title: 'Drop', multiple: true }),
    );
    const onFiles = vi.fn();
    const stop = wireFilePickers(document, { onFiles });
    const zone = document.querySelector<HTMLElement>(
      '[data-component="file-drop-zone"]',
    )!;
    zone.dispatchEvent(dragEvent('drop', [], [], false));
    expect(onFiles).not.toHaveBeenCalled();
    zone.dispatchEvent(dragEvent('drop', [file('a', ''), file('b', '')]));
    expect(onFiles.mock.calls[0]![0].files).toHaveLength(2);
    zone.querySelector('input')!.remove();
    zone.dispatchEvent(dragEvent('drop', [file('c', '')]));
    expect(onFiles).toHaveBeenCalledTimes(2);
    const noTypes = dragEvent('dragover', [], [], false);
    zone.dispatchEvent(noTypes);
    expect(noTypes.defaultPrevented).toBe(false);
    stop();
  });
});
