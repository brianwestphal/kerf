import type { SafeHtml } from 'kerfjs';

export interface ListInsetTextProps {
  /** Text (or inline content) that carries no margin, border, or padding of its own. */
  children: SafeHtml | SafeHtml[] | string;
  className?: string;
}

/**
 * Gives bare text the content-item geometry — an 8px inline margin, a 1px
 * transparent border, and 8px padding — so a plain string lines up with
 * bordered `.kui-content` items (its text edge lands at the same 17px inset).
 * Use it for text elements that have no margin, border, or padding of their own.
 */
export function ListInsetText({ children, className = '' }: ListInsetTextProps) {
  return <div class={`kui-list-inset-text ${className}`.trim()} data-component="list-inset-text">{children}</div>;
}
