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
