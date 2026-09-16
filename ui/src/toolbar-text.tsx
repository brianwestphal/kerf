export type ToolbarTextSize = 'xlarge' | 'large' | 'default' | 'small';

export interface ToolbarTextProps {
  text: string;
  size?: ToolbarTextSize;
  className?: string;
  /** Optional id, e.g. so a dialog can reference the title via aria-labelledby. */
  id?: string;
}

export function ToolbarText({ text, size = 'default', className = '', id }: ToolbarTextProps) {
  return <span class={`kui-toolbar-text ${className}`.trim()} data-component="toolbar-text" data-size={size} id={id}>{text}</span>;
}
