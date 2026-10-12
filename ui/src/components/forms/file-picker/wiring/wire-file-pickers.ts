type Root = HTMLElement | Document;

const PICKER =
  '[data-component="file-picker-trigger"], [data-component="file-drop-zone"]';
const DROP_ZONE = '[data-component="file-drop-zone"]';

/** Files a picker reported, and how they arrived. */
export interface FilePickerSelection {
  /** The trigger or drop zone element. */
  picker: HTMLElement;
  /** Its `pickerId`, when set. */
  id?: string;
  files: File[];
  via: 'browse' | 'drop';
}

export interface WireFilePickersOptions {
  onFiles: (selection: FilePickerSelection) => void;
}

/** Whether a file matches a native `accept` list (`.png, image/*, text/plain`). */
export function fileMatchesAccept(file: File, accept: string): boolean {
  const tokens = accept
    .split(',')
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean);
  if (tokens.length === 0) return true;
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  return tokens.some((token) => {
    if (token.startsWith('.')) return name.endsWith(token);
    if (token.endsWith('/*')) return type.startsWith(token.slice(0, -1));
    return type === token;
  });
}

function pickerOf(input: HTMLInputElement): HTMLElement | null {
  return input.closest<HTMLElement>(PICKER);
}

function inputOf(picker: HTMLElement): HTMLInputElement | null {
  return picker.querySelector<HTMLInputElement>('input[type="file"]');
}

/**
 * Report files chosen through any `FilePickerTrigger` or `FileDropZone` below
 * root, or dropped on a `FileDropZone`, and mark a zone `data-dragging` while
 * files are dragged over it. Dropped files are filtered by the input's
 * `accept` (and to one when it is not `multiple`); a disabled picker ignores
 * drops. The input is reset after each report, so choosing the same file again
 * reports again. Dispose with the owning application.
 */
export function wireFilePickers(
  root: Root,
  { onFiles }: WireFilePickersOptions,
): () => void {
  const report = (
    picker: HTMLElement,
    files: File[],
    via: FilePickerSelection['via'],
  ) => {
    if (files.length === 0) return;
    onFiles({ picker, id: picker.dataset.filePickerId, files, via });
  };
  const onChange = (event: Event) => {
    const input = event.target;
    if (!(input instanceof HTMLInputElement) || input.type !== 'file') return;
    const picker = pickerOf(input);
    if (!picker) return;
    // A file input always has a FileList.
    report(picker, [...input.files!], 'browse');
    input.value = '';
  };
  const zoneOf = (event: Event): HTMLElement | null => {
    const zone =
      event.target instanceof Element
        ? event.target.closest<HTMLElement>(DROP_ZONE)
        : null;
    return zone && zone.dataset.disabled !== 'true' ? zone : null;
  };
  const carriesFiles = (event: DragEvent) =>
    [...(event.dataTransfer?.types ?? [])].includes('Files');
  const onDragOver = (event: Event) => {
    const drag = event as DragEvent;
    const zone = zoneOf(drag);
    if (!zone || !carriesFiles(drag)) return;
    drag.preventDefault();
    // carriesFiles guarantees a DataTransfer.
    drag.dataTransfer!.dropEffect = 'copy';
    zone.dataset.dragging = 'true';
  };
  const onDragLeave = (event: Event) => {
    const zone = zoneOf(event);
    const related = (event as DragEvent).relatedTarget;
    if (zone && !(related instanceof Node && zone.contains(related)))
      delete zone.dataset.dragging;
  };
  const onDrop = (event: Event) => {
    const drag = event as DragEvent;
    const zone = zoneOf(drag);
    if (!zone) return;
    drag.preventDefault();
    delete zone.dataset.dragging;
    const input = inputOf(zone);
    let files = [...(drag.dataTransfer?.files ?? [])];
    if (input?.accept)
      files = files.filter((file) => fileMatchesAccept(file, input.accept));
    if (input && !input.multiple) files = files.slice(0, 1);
    report(zone, files, 'drop');
  };
  root.addEventListener('change', onChange);
  root.addEventListener('dragenter', onDragOver);
  root.addEventListener('dragover', onDragOver);
  root.addEventListener('dragleave', onDragLeave);
  root.addEventListener('drop', onDrop);
  return () => {
    root.removeEventListener('change', onChange);
    root.removeEventListener('dragenter', onDragOver);
    root.removeEventListener('dragover', onDragOver);
    root.removeEventListener('dragleave', onDragLeave);
    root.removeEventListener('drop', onDrop);
  };
}
