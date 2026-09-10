import type { SafeHtml } from 'kerfjs';

export interface AppTabProps {
  id: string;
  name: string;
  selected?: boolean;
  closable?: boolean;
  draggable?: boolean;
  leading?: SafeHtml;
  trailing?: SafeHtml;
  selectAction?: string;
  closeAction?: string;
  className?: string;
  rootAttributes?: Readonly<Record<`data-${string}`, string>>;
}

function CloseIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round"><path d="m7 7 10 10"></path><path d="M17 7 7 17"></path></svg>;
}

export function AppTab({ id, name, selected = false, closable = true, draggable = false, leading, trailing, selectAction = 'select-tab', closeAction = 'close-tab', className = '', rootAttributes = {} }: AppTabProps) {
  const keyshortcuts = [closable ? 'Delete Backspace' : '', draggable ? 'Alt+Shift+ArrowLeft Alt+Shift+ArrowRight' : ''].filter(Boolean).join(' ');
  return <div class={`kui-app-tab ${className}`.trim()} {...rootAttributes} data-component="app-tab" data-tab-id={id} data-selected={String(selected)} draggable={draggable ? 'true' : 'false'}>
    {closable && <button type="button" tabindex="-1" class="kui-app-tab__close" data-action={closeAction} data-tab-id={id} aria-label={`Close ${name}`} title={`Close ${name}`}><CloseIcon /></button>}
    <button type="button" class="kui-app-tab__select" role="tab" aria-selected={String(selected)} aria-keyshortcuts={keyshortcuts || undefined} data-action={selectAction} data-tab-id={id} tabindex={selected ? '0' : '-1'}>
      {leading}<span class="kui-app-tab__name">{name}</span>{closable || trailing ? <span class="kui-app-tab__trailing">{trailing}</span> : undefined}
    </button>
  </div>;
}
