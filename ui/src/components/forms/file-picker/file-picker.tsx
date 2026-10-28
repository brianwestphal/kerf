import type { SafeHtml } from 'kerfjs';

import {
  filterDataAttributes,
  type RootDataAttributes,
} from '../../../shared/dom/extension-attributes.js';
import type {
  ButtonEmphasis,
  ButtonSize,
  ButtonTone,
} from '../../actions/button/button.js';
import { ButtonFace } from '../../actions/button/internal/button-face.js';

interface FileInputProps {
  /** Accepted types, as the native `accept` attribute (`.png,image/*`). */
  accept?: string;
  /** Allow several files at once. */
  multiple?: boolean;
  /** Form field name of the native file input. */
  name?: string;
  /** Identifies this picker in `wireFilePickers` reports. */
  pickerId?: string;
  disabled?: boolean;
  className?: string;
  /** Application `data-*` metadata on the root, such as a row key or an
   * editor node marker; the component's own markers stay protected. */
  rootAttributes?: RootDataAttributes;
}

export interface FilePickerTriggerProps extends FileInputProps {
  /** Visible trigger text, such as "Add". */
  label: string;
  /** Accessible name of the file input when it should say more than `label`. */
  accessibleLabel?: string;
  /** Optional decorative leading icon, normally an unsized LucideIcon. */
  icon?: SafeHtml;
  /**
   * Draw the trigger as a `Button` of this tone, so it matches the Buttons
   * beside it. Setting `tone`, `emphasis`, or `size` switches from the
   * compact link-toned trigger to the Button look (defaults `neutral`,
   * `primary`, `default`, as on Button); it stays a native file label.
   */
  tone?: ButtonTone;
  /** The Button look's emphasis: `primary`, `secondary`, or `plain`. */
  emphasis?: ButtonEmphasis;
  /** The Button look's size: `default` (44px) or `compact`. */
  size?: ButtonSize;
}

export interface FileDropZoneProps extends FileInputProps {
  /** Primary copy, such as "Drop attachments here or browse". */
  title: string;
  /** Optional secondary copy, such as accepted types or a size limit. */
  detail?: string;
  /** Optional decorative icon above the copy, normally an unsized LucideIcon. */
  icon?: SafeHtml;
  /** Accessible name of the file input when it should say more than `title`. */
  accessibleLabel?: string;
  /**
   * A selector for an enclosing element (the zone's ancestor) that also
   * takes drops, such as an attachments panel: while files are dragged over
   * any part of it the zone is highlighted, and files dropped there are
   * reported for this zone (`via: 'drop'`).
   */
  dropScope?: string;
}

function fileInput(props: FileInputProps, label: string | undefined) {
  return (
    <input
      type="file"
      class="kui-file-picker__input"
      accept={props.accept}
      multiple={props.multiple}
      name={props.name}
      aria-label={label}
      disabled={props.disabled}
    />
  );
}

const FILE_PICKER_PROTECTED = new Set([
  'data-component',
  'data-disabled',
  'data-drop-scope',
  'data-file-picker-id',
  'data-presentation',
]);

/**
 * A trigger that opens the native file chooser: a label around a visually
 * hidden `<input type="file">`, so a click or keyboard activation reaches the
 * input without script. It is a compact, link-toned trigger, or with `tone`,
 * `emphasis`, or `size` it looks like a `Button` of those settings. Report
 * choices with `wireFilePickers`.
 */
export function FilePickerTrigger(props: FilePickerTriggerProps) {
  const {
    label,
    accessibleLabel,
    icon,
    pickerId,
    disabled,
    tone,
    emphasis,
    size,
    className = '',
    rootAttributes = {},
  } = props;
  if (tone !== undefined || emphasis !== undefined || size !== undefined) {
    return (
      <label
        {...filterDataAttributes(rootAttributes, FILE_PICKER_PROTECTED)}
        class={`kui-file-picker ${className}`.trim()}
        data-component="file-picker-trigger"
        data-presentation="button"
        data-file-picker-id={pickerId}
        data-disabled={disabled ? 'true' : undefined}
      >
        <ButtonFace icon={icon} tone={tone} emphasis={emphasis} size={size}>
          {label}
        </ButtonFace>
        {fileInput(props, accessibleLabel)}
      </label>
    );
  }
  return (
    <label
      {...filterDataAttributes(rootAttributes, FILE_PICKER_PROTECTED)}
      class={`kui-file-picker ${className}`.trim()}
      data-component="file-picker-trigger"
      data-presentation="trigger"
      data-file-picker-id={pickerId}
      data-disabled={disabled ? 'true' : undefined}
    >
      {icon && (
        <span class="kui-file-picker__icon" aria-hidden="true">
          {icon}
        </span>
      )}
      <span>{label}</span>
      {fileInput(props, accessibleLabel)}
    </label>
  );
}

/**
 * A dashed drop target that also opens the file chooser when clicked. While
 * files are dragged over it, `wireFilePickers` sets `data-dragging` and Kerf
 * highlights it; dropped and chosen files are reported the same way.
 */
export function FileDropZone(props: FileDropZoneProps) {
  const {
    title,
    detail,
    icon,
    accessibleLabel,
    pickerId,
    disabled,
    dropScope,
    className = '',
    rootAttributes = {},
  } = props;
  return (
    <label
      {...filterDataAttributes(rootAttributes, FILE_PICKER_PROTECTED)}
      class={`kui-file-picker ${className}`.trim()}
      data-component="file-drop-zone"
      data-drop-scope={dropScope}
      data-presentation="drop-zone"
      data-file-picker-id={pickerId}
      data-disabled={disabled ? 'true' : undefined}
    >
      {icon && (
        <span class="kui-file-picker__icon" aria-hidden="true">
          {icon}
        </span>
      )}
      <span class="kui-file-picker__title">{title}</span>
      {detail && <span class="kui-file-picker__detail">{detail}</span>}
      {fileInput(props, accessibleLabel)}
    </label>
  );
}
