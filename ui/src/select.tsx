import type { SafeHtml } from 'kerfjs';

import { LucideIcon, type LucideNode } from './lucide-icon.js';

export interface SelectChoice<Value extends string = string> {
  value: Value;
  label: string;
  icon?: LucideNode;
  iconName?: string;
  color?: string;
  group?: string;
  separatorBefore?: boolean;
}

export interface SelectProps<Value extends string = string> {
  name: string;
  value: Value;
  label?: string;
  ariaLabel?: string;
  choices: readonly SelectChoice<Value>[];
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  fitMenu?: boolean;
  renderSelected?: (choice: SelectChoice<Value>) => SafeHtml;
}

export function Select<Value extends string>({ name, value, label, ariaLabel, choices, className = '', placeholder, disabled = false, fitMenu = false, renderSelected }: SelectProps<Value>) {
  const selected = choices.find((choice) => choice.value === value);
  const icon = (choice: SelectChoice<Value>, selectedIcon = false) => <span data-key={`${name}:${choice.value}:${selectedIcon ? 'selected' : 'option'}`} data-morph-skip slot="start" class={`kui-select__icon${selectedIcon ? ' kui-select__icon--selected' : ''}`} style={choice.color ? `color:${choice.color}` : undefined}>{choice.icon ? <LucideIcon icon={choice.icon} name={choice.iconName ?? choice.label.toLowerCase().replaceAll(' ', '-')} /> : null}</span>;
  const option = (choice: SelectChoice<Value>) => <>{choice.separatorBefore && <wa-divider></wa-divider>}<wa-option value={choice.value}>{choice.icon ? icon(choice) : null}{choice.label}</wa-option></>;
  const groups = [...new Set(choices.map((choice) => choice.group).filter((group): group is string => Boolean(group)))];
  const ungrouped = choices.filter((choice) => !choice.group);
  return <wa-select class={`kui-select${renderSelected ? ' kui-select--custom-selected' : ''}${fitMenu ? ' kui-select--fit-menu' : ''} ${className}`.trim()} data-component="select" name={name} label={label} aria-label={ariaLabel} value={value} placeholder={placeholder} disabled={disabled}>
    {selected && (renderSelected ? <span data-key={`${name}:${value}:custom-selected`} slot="start" class="kui-select__custom-selected">{renderSelected(selected)}</span> : selected.icon ? icon(selected, true) : null)}
    {ungrouped.map(option)}
    {groups.map((group, index) => <div class={`kui-select__group${index > 0 || ungrouped.length > 0 ? ' kui-select__group--separated' : ''}`} role="group" aria-label={group}><span class="kui-select__group-title">{group}</span>{choices.filter((choice) => choice.group === group).map(option)}</div>)}
  </wa-select>;
}
