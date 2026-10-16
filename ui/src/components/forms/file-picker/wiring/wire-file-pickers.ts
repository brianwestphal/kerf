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
 * root, or dropped on a `FileDropZone` (or anywhere in the enclosing element
 * its `dropScope` names), and mark a zone `data-dragging` while files are
 * dragged over it or its scope. Dropped files are filtered by the input's
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
  // The zone a drag event targets, and the area that counts as over it: the
  // zone itself, or the enclosing element its `dropScope` names.
  const zoneOf = (
    event: Event,
  ): { zone: HTMLElement; area: HTMLElement } | null => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return null;
    const direct = target.closest<HTMLElement>(DROP_ZONE);
    if (direct)
      return direct.dataset.disabled === 'true'
        ? null
        : { zone: direct, area: areaOf(direct) };
    for (const zone of root.querySelectorAll<HTMLElement>(
      `${DROP_ZONE}[data-drop-scope]`,
    )) {
      const area = areaOf(zone);
      if (area !== zone && area.contains(target))
        return zone.dataset.disabled === 'true' ? null : { zone, area };
    }
    return null;
  };
  const areaOf = (zone: HTMLElement): HTMLElement => {
    const scope = zone.dataset.dropScope;
    return (scope && zone.parentElement?.closest<HTMLElement>(scope)) || zone;
  };
  const carriesFiles = (event: DragEvent) =>
    [...(event.dataTransfer?.types ?? [])].includes('Files');
  const onDragOver = (event: Event) => {
    const drag = event as DragEvent;
    const over = zoneOf(drag);
    if (!over || !carriesFiles(drag)) return;
    drag.preventDefault();
    // carriesFiles guarantees a DataTransfer.
    drag.dataTransfer!.dropEffect = 'copy';
    over.zone.dataset.dragging = 'true';
  };
  const onDragLeave = (event: Event) => {
    const over = zoneOf(event);
    const related = (event as DragEvent).relatedTarget;
    if (over && !(related instanceof Node && over.area.contains(related)))
      delete over.zone.dataset.dragging;
  };
  const onDrop = (event: Event) => {
    const drag = event as DragEvent;
    const over = zoneOf(drag);
    if (!over) return;
    const { zone } = over;
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
