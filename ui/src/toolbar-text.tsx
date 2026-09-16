import { Skeleton } from './skeleton.js';

export type ToolbarTextSize = 'xlarge' | 'large' | 'default' | 'small';

export interface ToolbarTextProps {
  text: string;
  size?: ToolbarTextSize;
  className?: string;
  /** Optional id, e.g. so a dialog can reference the title via aria-labelledby. */
  id?: string;
  /** Render the text as an unanimated loading skeleton instead of its value. */
  placeholder?: boolean;
}

export function ToolbarText({ text, size = 'default', className = '', id, placeholder = false }: ToolbarTextProps) {
  return <span class={`kui-toolbar-text ${className}`.trim()} data-component="toolbar-text" data-size={size} data-placeholder={placeholder ? 'true' : undefined} id={id} aria-busy={placeholder ? 'true' : undefined}>{placeholder ? <Skeleton width="8em" /> : text}</span>;
}
