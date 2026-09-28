import type { SafeHtml } from 'kerfjs';

import { type CssForegroundColor, em } from './css-values.js';
import { LucideIcon, type LucideNode } from './lucide-icon.js';
import { Skeleton } from './skeleton.js';

export interface SelectChoice<Value extends string = string> {
  value: Value;
  label: string;
  icon?: LucideNode;
  iconName?: string;
  /**
   * Foreground color for the optional icon: a semantic foreground token such
   * as `uiColor('success-on-quiet')`, or an application-owned
   * `foregroundColorVar('--app-icon-color')`. Fill tokens such as
   * `uiColor('success-fill-quiet')` are pale background tints and do not
   * type-check.
   */
  color?: CssForegroundColor;
  group?: string;
  /**
   * Draw a divider between this choice and the previous choice in the same
   * list. A group boundary is already a separator, so the first choice of a
   * group (or of the whole menu) never draws a second one.
   */
  separatorBefore?: boolean;
}

type SelectAccessibleName =
  { label: string; ariaLabel?: string } | { label?: never; ariaLabel: string };

export type SelectPresentation = 'form' | 'toolbar-borderless' | 'navigation';
export type SelectSize = 'default' | 'compact';
export type SelectSelectedPresentation = 'label' | 'icon-only';
export type SelectFocusRingOwner = 'select' | 'group';

interface SelectBaseProps<Value extends string = string> {
  name: string;
  value: NoInfer<Value>;
  choices: readonly SelectChoice<Value>[];
  className?: string;
  /** Empty-value hint text shown in the closed control (the native select placeholder). */
  placeholderText?: string;
  /** Supporting text shown below the control and associated with its combobox. */
  hint?: string;
  disabled?: boolean;
  fitMenu?: boolean;
  renderSelected?: (choice: SelectChoice<Value>) => SafeHtml;
  /** Render as an unanimated loading skeleton: the label above a static, empty control box. */
  placeholder?: boolean;
  /** Form (default), borderless toolbar, or intrinsic navigation chrome. */
  presentation?: SelectPresentation;
  size?: SelectSize;
  /** Show only the selected choice icon while retaining the Select's accessible name. */
  selectedPresentation?: SelectSelectedPresentation;
  /** Let an enclosing ToolbarControlGroup paint the composed focus ring. */
  focusRingOwner?: SelectFocusRingOwner;
  /** Maximum closed-control label width in CSS pixels before ellipsis. */
  labelMaxWidth?: number;
  /** Native named-slot assignment when composed inside a web component. */
  slot?: string;
}

export type SelectProps<Value extends string = string> =
  SelectBaseProps<Value> & SelectAccessibleName;

// The closed wa-select's disclosure glyph: Web Awesome's system `chevron-down`,
// Font Awesome Free 7.0.0 by @fontawesome (https://fontawesome.com), licensed
// CC BY 4.0 (https://fontawesome.com/license/free). The placeholder draws the
// same path so the loading box matches the live control without registering
// Web Awesome.
function SelectChevron() {
  return (
    <svg viewBox="0 0 448 512" aria-hidden="true">
      <path d="M201.4 406.6c12.5 12.5 32.8 12.5 45.3 0l192-192c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L224 338.7 54.6 169.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l192 192z"></path>
    </svg>
  );
}

export function Select<Value extends string>({
  name,
  value,
  label,
  ariaLabel,
  choices,
  className = '',
  placeholderText,
  hint,
  disabled = false,
  fitMenu = false,
  renderSelected,
  placeholder = false,
  presentation = 'form',
  size = 'default',
  selectedPresentation = 'label',
  focusRingOwner = 'select',
  labelMaxWidth,
  slot,
}: SelectProps<Value>) {
  if (placeholder) {
    return (
      <div
        class={`kui-select kui-select--placeholder ${className}`.trim()}
        data-component="select"
        data-placeholder="true"
        data-presentation={presentation}
        data-size={size}
        data-selected-presentation={selectedPresentation}
        data-focus-ring-owner={focusRingOwner}
        aria-busy="true"
        style={
          labelMaxWidth === undefined
            ? undefined
            : `--kui-select-label-max-width:${labelMaxWidth}px`
        }
        slot={slot}
      >
        {label && <span class="kui-select__placeholder-label">{label}</span>}
        <span
          class="kui-select__placeholder-box"
          aria-label={ariaLabel}
          role="img"
        >
          <Skeleton width={em(10)} />
          <span class="kui-select__placeholder-chevron" aria-hidden="true">
            <SelectChevron />
          </span>
        </span>
        {hint && <span class="kui-select__placeholder-hint">{hint}</span>}
      </div>
    );
  }
  const selected = choices.find((choice) => choice.value === value);
  const icon = (choice: SelectChoice<Value>, selectedIcon = false) => (
    <span
      data-key={`${name}:${choice.value}:${selectedIcon ? 'selected' : 'option'}`}
      data-morph-skip
      slot="start"
      class={`kui-select__icon${selectedIcon ? ' kui-select__icon--selected' : ''}`}
      style={choice.color ? `color:${choice.color}` : undefined}
    >
      {choice.icon ? (
        <LucideIcon
          icon={choice.icon}
          name={
            choice.iconName ?? choice.label.toLowerCase().replaceAll(' ', '-')
          }
        />
      ) : null}
    </span>
  );
  const option = (choice: SelectChoice<Value>, index: number) => (
    <>
      {choice.separatorBefore && index > 0 && <wa-divider></wa-divider>}
      <wa-option value={choice.value}>
        {choice.icon ? icon(choice) : null}
        {choice.label}
      </wa-option>
    </>
  );
  const groups = [
    ...new Set(
      choices
        .map((choice) => choice.group)
        .filter((group): group is string => Boolean(group)),
    ),
  ];
  const ungrouped = choices.filter((choice) => !choice.group);
  // Web Awesome names its shadow combobox from the label, not the host's
  // aria-label. Keep ariaLabel-only names available without visible chrome.
  return (
    <wa-select
      class={`kui-select${renderSelected ? ' kui-select--custom-selected' : ''}${fitMenu ? ' kui-select--fit-menu' : ''}${!label ? ' kui-select--label-hidden' : ''} ${className}`.trim()}
      data-component="select"
      data-presentation={presentation}
      data-size={size}
      data-selected-presentation={selectedPresentation}
      data-focus-ring-owner={focusRingOwner}
      name={name}
      label={label || ariaLabel}
      aria-label={ariaLabel}
      value={value}
      placeholder={placeholderText}
      hint={hint}
      disabled={disabled}
      style={
        labelMaxWidth === undefined
          ? undefined
          : `--kui-select-label-max-width:${labelMaxWidth}px`
      }
      slot={slot}
    >
      {selected &&
        (renderSelected ? (
          <span
            data-key={`${name}:${value}:custom-selected`}
            slot="start"
            class="kui-select__custom-selected"
          >
            {renderSelected(selected)}
          </span>
        ) : selected.icon ? (
          icon(selected, true)
        ) : null)}
      {ungrouped.map(option)}
      {groups.map((group, index) => (
        <div
          class={`kui-select__group${index > 0 || ungrouped.length > 0 ? ' kui-select__group--separated' : ''}`}
          role="group"
          aria-label={group}
        >
          <span class="kui-select__group-title">{group}</span>
          {choices.filter((choice) => choice.group === group).map(option)}
        </div>
      ))}
    </wa-select>
  );
}
