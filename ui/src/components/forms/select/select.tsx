import type { SafeHtml } from 'kerfjs';
import type { KerfCustomElement } from 'kerfjs/jsx-runtime';
import { Check } from 'lucide';

import type { KerfUiContent } from '../../../shared/content/semantic-content.js';
import {
  filterDataAttributes,
  type RootDataAttributes,
} from '../../../shared/dom/extension-attributes.js';
import { PopupCaretGlyph } from '../../../shared/popup/popup-glyphs.js';
import type { CssLength } from '../../../shared/styles/css-values.js';
import {
  type CssForegroundColor,
  em,
} from '../../../shared/styles/css-values.js';
import { Badge } from '../../feedback/badge/badge.js';
import { Skeleton } from '../../feedback/skeleton/skeleton.js';
import {
  LucideIcon,
  type LucideNode,
} from '../../media/lucide-icon/lucide-icon.js';
import { summarizeSelection } from './model/select-summary.js';

declare module 'kerfjs/jsx-runtime' {
  // Module augmentation requires the namespace form expected by the JSX runtime.
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      /** The Select root: a light-DOM form control defined by `select/register`. */
      'kui-select': KerfCustomElement & {
        class?: string;
        name?: string;
        value?: string;
        multiple?: boolean;
        disabled?: boolean;
        style?: string;
        slot?: string;
      };
    }
  }
}

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
  /** Empty-value hint text shown in the closed control. */
  placeholderText?: string;
  /** Supporting text shown below the control and announced as its description. */
  hint?: string;
  disabled?: boolean;
  /** Match menu width to the trigger; default menus grow to content within viewport gutters. */
  fitMenu?: boolean;
  /** Render as an unanimated loading skeleton: the label above a static, empty control box. */
  placeholder?: boolean;
  /** Form (default), borderless toolbar, intrinsic navigation, inline, or view-title chrome. */
  presentation?: SelectPresentation;
  size?: SelectSize;
  /** Closed trigger width; omit to keep the presentation's default. */
  triggerWidth?: SelectTriggerWidth;
  /**
   * The widest the closed trigger grows, under any presentation; its value
   * (or `renderSelected` content) ellipsizes inside it and the caret stays.
   */
  maxTriggerWidth?: CssLength;
  /** The narrowest the closed trigger gets. */
  minTriggerWidth?: CssLength;
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
  /** Application `data-*` metadata on the root, such as a row key or an
   * editor node marker; the component's own markers stay protected. */
  rootAttributes?: RootDataAttributes;
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
 * choices and closes on an outside press, Escape, or Tab; the closed control
 * summarizes the chosen labels in choice order.
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
 * a count badge sits beside it, and the trigger's accessible name ends with
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

/**
 * A choice's icon, in the listbox or (`selected`) in the closed trigger.
 * Rendered only for a choice that has one.
 */
function ChoiceIcon<Value extends string>({
  choice,
  icon,
  selected = false,
}: {
  choice: SelectChoice<Value>;
  icon: LucideNode;
  selected?: boolean;
}) {
  return (
    <span
      class={`kui-select__icon${selected ? ' kui-select__icon--selected' : ''}`}
      style={choice.color ? `color:${choice.color}` : undefined}
      aria-hidden="true"
    >
      <LucideIcon
        icon={icon}
        name={
          choice.iconName ?? choice.label.toLowerCase().replaceAll(' ', '-')
        }
      />
    </span>
  );
}

function Caret() {
  return (
    <span class="kui-select__caret" aria-hidden="true">
      <PopupCaretGlyph />
    </span>
  );
}

const SELECT_PROTECTED = new Set([
  'data-caret',
  'data-component',
  'data-default-selected',
  'data-focus-ring-inset',
  'data-focus-ring-owner',
  'data-placeholder',
  'data-placeholder-text',
  'data-presentation',
  'data-select-action',
  'data-selected-presentation',
  'data-size',
  'data-trigger-max',
  'data-trigger-min',
  'data-trigger-width',
  'data-value',
]);

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
    maxTriggerWidth,
    minTriggerWidth,
    caret = true,
    focusRingOwner = 'select',
    focusRingInset = false,
    labelMaxWidth,
    slot,
    rootAttributes = {},
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
  const accessibleName = label || ariaLabel;
  const style =
    [
      labelMaxWidth === undefined
        ? undefined
        : `--kui-select-label-max-width:${labelMaxWidth}px`,
      maxTriggerWidth === undefined
        ? undefined
        : `--_kui-select-trigger-max:${maxTriggerWidth}`,
      minTriggerWidth === undefined
        ? undefined
        : `--_kui-select-trigger-min:${minTriggerWidth}`,
    ]
      .filter(Boolean)
      .join(';') || undefined;
  const rootData = {
    ...filterDataAttributes(rootAttributes, SELECT_PROTECTED),
    'data-component': 'select',
    'data-presentation': presentation,
    'data-size': size,
    'data-trigger-width': triggerWidth,
    'data-trigger-max': maxTriggerWidth === undefined ? undefined : '',
    'data-trigger-min': minTriggerWidth === undefined ? undefined : '',
    'data-caret': caret ? undefined : 'false',
    'data-selected-presentation': selectedPresentation,
    'data-focus-ring-owner': focusRingOwner,
    'data-focus-ring-inset': focusRingInset ? 'true' : undefined,
  } as const;
  if (placeholder) {
    return (
      <div
        class={`kui-select kui-select--placeholder ${className}`.trim()}
        {...rootData}
        data-placeholder="true"
        aria-busy="true"
        style={style}
        slot={slot}
      >
        {label && <span class="kui-select__label">{label}</span>}
        <span
          class="kui-select__placeholder-box"
          aria-label={ariaLabel}
          role="img"
        >
          <Skeleton width={em(10)} />
          {caret ? <Caret /> : null}
        </span>
        {hint && <span class="kui-select__hint">{hint}</span>}
      </div>
    );
  }
  const enabledChosen = choices.filter(
    (choice) => !choice.disabled && values.includes(choice.value),
  );
  const selected = multiple ? undefined : enabledChosen[0];
  // A multiple Select summarizes its chosen labels, in choice order; an
  // icon-only trigger (whose value text is hidden) ends its name with them.
  const summary = multiple
    ? summarizeSelection(enabledChosen.map((choice) => choice.label))
    : '';
  const triggerName =
    iconTrigger && summary ? `${accessibleName}: ${summary}` : accessibleName;
  const valueText = multiple
    ? iconTrigger
      ? ''
      : summary
    : (selected?.label ?? '');
  const option = (choice: SelectChoice<Value>, index: number) => {
    const chosen = !choice.disabled && values.includes(choice.value);
    return (
      <>
        {choice.separatorBefore && index > 0 ? (
          <div class="kui-select__separator" role="separator" />
        ) : null}
        <div
          class="kui-select__option"
          role="option"
          tabindex={-1}
          data-value={choice.value}
          data-default-selected={chosen ? '' : undefined}
          aria-selected={String(chosen)}
          aria-disabled={choice.disabled ? 'true' : undefined}
          title={choice.disabled ? choice.disabledReason : undefined}
        >
          <span class="kui-select__check" aria-hidden="true">
            <LucideIcon icon={Check} name="check" />
          </span>
          {choice.icon ? (
            <ChoiceIcon choice={choice} icon={choice.icon} />
          ) : null}
          <span class="kui-select__option-label">{choice.label}</span>
        </div>
      </>
    );
  };
  const groups = [
    ...new Set(
      choices
        .map((choice) => choice.group)
        .filter((group): group is string => Boolean(group)),
    ),
  ];
  const ungrouped = choices.filter((choice) => !choice.group);
  return (
    <kui-select
      class={`kui-select${renderSelected ? ' kui-select--custom-selected' : ''}${fitMenu ? ' kui-select--fit-menu' : ''} ${className}`.trim()}
      {...rootData}
      name={name}
      value={multiple ? undefined : (selected?.value ?? '')}
      multiple={multiple}
      disabled={disabled}
      style={style}
      slot={slot}
    >
      {label ? (
        <span class="kui-select__label" aria-hidden="true">
          {label}
        </span>
      ) : null}
      <button
        type="button"
        class="kui-select__trigger"
        role="combobox"
        // Safari's default Tab order skips buttons; a select stays in it.
        tabindex={0}
        aria-haspopup="listbox"
        aria-expanded="false"
        aria-label={triggerName}
        aria-description={hint}
        disabled={disabled}
      >
        {iconTrigger ? (
          <span class="kui-select__icon kui-select__icon--selected kui-select__trigger-icon">
            {props.triggerIcon}
          </span>
        ) : selected && renderSelected ? (
          <span class="kui-select__custom-selected">
            <span class="kui-select__custom-selected-content">
              {renderSelected(selected)}
            </span>
          </span>
        ) : selected?.icon ? (
          <ChoiceIcon choice={selected} icon={selected.icon} selected />
        ) : null}
        <span
          class="kui-select__value"
          data-placeholder={valueText ? undefined : 'true'}
          data-placeholder-text={placeholderText}
        >
          {valueText || placeholderText || ''}
        </span>
        {iconTrigger && enabledChosen.length > 0 ? (
          <Badge tone="info" size="compact" ariaHidden>
            {enabledChosen.length}
          </Badge>
        ) : null}
        {caret ? <Caret /> : null}
      </button>
      {hint ? (
        <span class="kui-select__hint" aria-hidden="true">
          {hint}
        </span>
      ) : null}
      <div class="kui-select__popup" popover="manual" tabindex={-1}>
        <div
          class="kui-select__listbox"
          role="listbox"
          aria-label={accessibleName}
          aria-multiselectable={multiple ? 'true' : undefined}
        >
          {ungrouped.map(option)}
          {groups.map((group, index) => (
            <div
              class={`kui-select__group${index > 0 || ungrouped.length > 0 ? ' kui-select__group--separated' : ''}`}
              role="group"
              aria-label={group}
            >
              <span class="kui-select__group-title" aria-hidden="true">
                {group}
              </span>
              {choices.filter((choice) => choice.group === group).map(option)}
            </div>
          ))}
        </div>
        {props.multiple && (props.selectAllLabel || props.clearLabel) ? (
          <div
            class="kui-select__actions"
            role="group"
            aria-label={accessibleName}
          >
            {props.selectAllLabel ? (
              <button
                class="kui-select__action"
                type="button"
                data-select-action="all"
              >
                {props.selectAllLabel}
              </button>
            ) : null}
            {props.clearLabel ? (
              <button
                class="kui-select__action"
                type="button"
                data-select-action="clear"
              >
                {props.clearLabel}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </kui-select>
  );
}
