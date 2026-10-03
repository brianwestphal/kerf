import type { SafeHtml } from 'kerfjs';

import { Badge } from './badge.js';
import { type CssForegroundColor, em } from './css-values.js';
import { LucideIcon, type LucideNode } from './lucide-icon.js';
import type { KerfUiContent } from './semantic-content.js';
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
  /** Keep an unavailable choice visible but prevent selection. */
  disabled?: boolean;
  /** Optional explanation exposed as the disabled option's native tooltip. */
  disabledReason?: string;
  /**
   * Draw a divider between this choice and the previous choice in the same
   * list. A group boundary is already a separator, so the first choice of a
   * group (or of the whole menu) never draws a second one.
   */
  separatorBefore?: boolean;
}

type SelectAccessibleName =
  { label: string; ariaLabel?: string } | { label?: never; ariaLabel: string };

export type SelectPresentation =
  'form' | 'toolbar-borderless' | 'navigation' | 'inline' | 'title';
export type SelectSize = 'default' | 'compact';
export type SelectSelectedPresentation = 'label' | 'icon-only';
export type SelectFocusRingOwner = 'select' | 'group';
export type SelectTriggerWidth = 'fit-content' | 'max-content' | 'fill';

interface SelectBaseProps<Value extends string = string> {
  name: string;
  choices: readonly SelectChoice<Value>[];
  className?: string;
  /** Empty-value hint text shown in the closed control (the native select placeholder). */
  placeholderText?: string;
  /** Supporting text shown below the control and associated with its combobox. */
  hint?: string;
  disabled?: boolean;
  fitMenu?: boolean;
  /** Render as an unanimated loading skeleton: the label above a static, empty control box. */
  placeholder?: boolean;
  /** Form (default), borderless toolbar, intrinsic navigation, inline, or view-title chrome. */
  presentation?: SelectPresentation;
  size?: SelectSize;
  /** Closed trigger width; omit to keep the presentation's default. */
  triggerWidth?: SelectTriggerWidth;
  /** Show the disclosure caret (default); omit it for a compact icon-only trigger. */
  caret?: boolean;
  /** Let an enclosing ToolbarControlGroup paint the composed focus ring. */
  focusRingOwner?: SelectFocusRingOwner;
  /** Keep the trigger's focus ring inside its box when an ancestor clips overflow. */
  focusRingInset?: boolean;
  /** Maximum closed-control label width in CSS pixels before ellipsis. */
  labelMaxWidth?: number;
  /** Native named-slot assignment when composed inside a web component. */
  slot?: string;
}

/** One chosen value (the default). */
export interface SelectSingleValueProps<Value extends string = string> {
  multiple?: false;
  value: NoInfer<Value>;
  renderSelected?: (choice: SelectChoice<Value>) => SafeHtml;
  /** Show only the selected choice icon while retaining the Select's accessible name. */
  selectedPresentation?: SelectSelectedPresentation;
  triggerIcon?: never;
  selectAllLabel?: never;
  clearLabel?: never;
}

/**
 * Any number of chosen values. The popup stays open while the person toggles
 * choices and closes on an outside click, Escape, or focus leaving; the closed
 * control summarizes the chosen labels in choice order.
 */
export interface SelectMultipleLabelProps<Value extends string = string> {
  multiple: true;
  value: readonly NoInfer<Value>[];
  renderSelected?: never;
  selectedPresentation?: 'label';
  triggerIcon?: never;
  /** Opt in to a footer action that selects every enabled choice. */
  selectAllLabel?: string;
  /** Opt in to a footer action that clears the current selection. */
  clearLabel?: string;
}

/**
 * A multiple Select drawn as an icon-only toolbar trigger, such as a
 * "Filter by label" funnel. No single choice is selected, so the trigger shows
 * a fixed `triggerIcon` naming the menu's purpose; while any choice is chosen
 * a count badge sits beside it, and the combobox's accessible name ends with
 * the chosen labels in choice order.
 */
export interface SelectMultipleIconProps<Value extends string = string> {
  multiple: true;
  value: readonly NoInfer<Value>[];
  renderSelected?: never;
  selectedPresentation: 'icon-only';
  /**
   * The trigger's fixed icon, typically a `LucideIcon` naming the menu's
   * purpose (a funnel for a filter), independent of the selection.
   */
  triggerIcon: KerfUiContent;
  /** Opt in to a footer action that selects every enabled choice. */
  selectAllLabel?: string;
  /** Opt in to a footer action that clears the current selection. */
  clearLabel?: string;
}

export type SelectMultipleValueProps<Value extends string = string> =
  SelectMultipleLabelProps<Value> | SelectMultipleIconProps<Value>;

export type SelectProps<Value extends string = string> =
  SelectBaseProps<Value> &
    SelectAccessibleName &
    (SelectSingleValueProps<Value> | SelectMultipleValueProps<Value>);

// The closed wa-select's disclosure glyph: Web Awesome's system `chevron-down`,
// Font Awesome Free 7.0.0 by @fontawesome (https://fontawesome.com), licensed
// CC BY 4.0 (https://fontawesome.com/license/free). The placeholder draws the
// same path so the loading box matches the live control without registering
// Web Awesome.
function SelectChevron() {
  return (
    <svg viewBox="0 0 448 512" aria-hidden="true">
      <path d="M201.4 406.6c12.5 12.5 32.8 12.5 45.3 0l192-192c12.5-12.5 12.5-32.8 0-45.3s-32.8-12.5-45.3 0L224 338.7 54.6 169.4c-12.5-12.5-32.8-12.5-45.3 0s-12.5 32.8 0 45.3l192 192z" />
    </svg>
  );
}

export function Select<Value extends string>(props: SelectProps<Value>) {
  const {
    name,
    label,
    ariaLabel,
    choices,
    className = '',
    placeholderText,
    hint,
    disabled = false,
    fitMenu = false,
    placeholder = false,
    presentation = 'form',
    size = 'default',
    triggerWidth,
    caret = true,
    focusRingOwner = 'select',
    focusRingInset = false,
    labelMaxWidth,
    slot,
  } = props;
  const multiple = props.multiple === true;
  const values: readonly Value[] = props.multiple ? props.value : [props.value];
  const renderSelected = props.multiple ? undefined : props.renderSelected;
  const selectedPresentation: SelectSelectedPresentation =
    props.selectedPresentation ?? 'label';
  // A multiple icon-only trigger shows a fixed icon naming the menu's
  // purpose instead of a selected choice's icon.
  const iconTrigger =
    props.multiple && props.selectedPresentation === 'icon-only';
  const triggerIcon = iconTrigger ? props.triggerIcon : undefined;
  if (placeholder) {
    return (
      <div
        class={`kui-select kui-select--placeholder ${className}`.trim()}
        data-component="select"
        data-placeholder="true"
        data-presentation={presentation}
        data-size={size}
        data-trigger-width={triggerWidth}
        data-caret={caret ? undefined : 'false'}
        data-selected-presentation={selectedPresentation}
        data-focus-ring-owner={focusRingOwner}
        data-focus-ring-inset={focusRingInset ? 'true' : undefined}
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
  // A multiple Select summarizes its choices in the display text instead of
  // leading with one selected icon.
  const selected = multiple
    ? undefined
    : choices.find((choice) => choice.value === values[0] && !choice.disabled);
  const chosenCount = iconTrigger
    ? choices.filter(
        (choice) => !choice.disabled && values.includes(choice.value),
      ).length
    : 0;
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
      {/* Web Awesome sets the divider's role and aria-orientation on its
          host once, so a template that omits them would lose them to the
          next kerf re-render's morph for good. Render them explicitly, with
          the orientation it reflects (see the wa-select note below). */}
      {choice.separatorBefore && index > 0 && (
        <wa-divider
          orientation="horizontal"
          role="separator"
          aria-orientation="horizontal"
        />
      )}
      <wa-option
        value={choice.value}
        selected={multiple && !choice.disabled && values.includes(choice.value)}
        disabled={choice.disabled}
        title={choice.disabled ? choice.disabledReason : undefined}
      >
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
  // A multiple Select's value is its selected options (the value attribute
  // holds only one string), kept in sync by @kerfjs/ui/select/register.
  // size/appearance/placement are Web Awesome's defaults, which it reflects
  // onto the host; rendering them keeps a re-render's morph from stripping
  // them and forcing a Lit update to put them back.
  return (
    <wa-select
      size="m"
      appearance="outlined"
      placement="bottom"
      class={`kui-select${renderSelected ? ' kui-select--custom-selected' : ''}${fitMenu ? ' kui-select--fit-menu' : ''}${!label ? ' kui-select--label-hidden' : ''} ${className}`.trim()}
      data-component="select"
      data-presentation={presentation}
      data-size={size}
      data-trigger-width={triggerWidth}
      data-caret={caret ? undefined : 'false'}
      data-selected-presentation={selectedPresentation}
      data-focus-ring-owner={focusRingOwner}
      data-focus-ring-inset={focusRingInset ? 'true' : undefined}
      name={name}
      label={label || ariaLabel}
      aria-label={ariaLabel}
      multiple={multiple}
      value={multiple ? undefined : values[0]}
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
      {iconTrigger && (
        <>
          {/* The accessible name ends with the chosen labels, which
              @kerfjs/ui/select/register writes into the summary. */}
          <span slot="label" data-key={`${name}:trigger-label`}>
            {label || ariaLabel}
            <span class="kui-select__name-summary" data-morph-skip />
          </span>
          <span
            data-key={`${name}:trigger-icon`}
            slot="start"
            class="kui-select__icon kui-select__icon--selected kui-select__trigger-icon"
          >
            {triggerIcon}
          </span>
          {chosenCount > 0 && (
            <Badge slot="end" tone="brand" size="compact" ariaHidden>
              {chosenCount}
            </Badge>
          )}
        </>
      )}
      {selected &&
        (renderSelected ? (
          <span
            data-key={`${name}:${values[0]}:custom-selected`}
            slot="start"
            class="kui-select__custom-selected"
          >
            <span class="kui-select__custom-selected-content">
              {renderSelected(selected)}
            </span>
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
      {props.multiple && (props.selectAllLabel || props.clearLabel) && (
        <div
          class="kui-select__actions"
          role="group"
          aria-label={label || ariaLabel}
        >
          {props.selectAllLabel && (
            <button
              class="kui-select__action"
              type="button"
              data-select-action="all"
            >
              {props.selectAllLabel}
            </button>
          )}
          {props.clearLabel && (
            <button
              class="kui-select__action"
              type="button"
              data-select-action="clear"
            >
              {props.clearLabel}
            </button>
          )}
        </div>
      )}
    </wa-select>
  );
}
