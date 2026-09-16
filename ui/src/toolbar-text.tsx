import { Skeleton } from './skeleton.js';

export type ToolbarTextSize = 'xlarge' | 'large' | 'default' | 'small';

/** ARIA heading level for a title exposed as a heading landmark. */
export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

export interface ToolbarTextProps {
  text: string;
  size?: ToolbarTextSize;
  className?: string;
  /** Optional id, e.g. so a dialog can reference the title via aria-labelledby. */
  id?: string;
  /**
   * Expose heading semantics (`role="heading"` + `aria-level`) so the text acts as
   * a heading landmark — e.g. a page's primary title. Omit to keep the plain span
   * (the default), which suits a dialog title referenced via `aria-labelledby`.
   */
  headingLevel?: HeadingLevel;
  /** Render the text as an unanimated loading skeleton instead of its value. */
  placeholder?: boolean;
}

export function ToolbarText({ text, size = 'default', className = '', id, headingLevel, placeholder = false }: ToolbarTextProps) {
  return <span class={`kui-toolbar-text ${className}`.trim()} data-component="toolbar-text" data-size={size} data-placeholder={placeholder ? 'true' : undefined} id={id} role={headingLevel ? 'heading' : undefined} aria-level={headingLevel ? String(headingLevel) : undefined} aria-busy={placeholder ? 'true' : undefined}>{placeholder ? <Skeleton width="8em" /> : text}</span>;
}
