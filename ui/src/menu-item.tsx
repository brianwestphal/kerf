import type { SafeHtml } from 'kerfjs';

export interface MenuItemProps {
  label: string | SafeHtml;
  icon?: SafeHtml;
  trailing?: SafeHtml;
  selected?: boolean;
  action: string;
  itemId?: string;
  className?: string;
  style?: string;
  pressed?: boolean;
  accessibleLabel?: string;
  title?: string;
  multiline?: boolean;
  state?: string;
  disabled?: boolean;
  tabIndex?: number;
}

export function MenuItem({ label, icon, trailing, selected = false, action, itemId, className = '', style, pressed, accessibleLabel, title, multiline = false, state, disabled = false, tabIndex }: MenuItemProps) {
  return <button type="button" class={`kui-menu-item ${className}`.trim()} style={style} title={title} disabled={disabled} tabindex={tabIndex} data-component="menu-item" data-action={action} data-item-id={itemId} data-multiline={multiline ? 'true' : undefined} data-state={state} aria-label={accessibleLabel} aria-current={selected ? 'page' : undefined} aria-pressed={pressed === undefined ? undefined : String(pressed)}>
    {icon && <span class="kui-menu-item__icon">{icon}</span>}
    <span class="kui-menu-item__label">{label}</span>
    {trailing && <span class="kui-menu-item__trailing">{trailing}</span>}
  </button>;
}
