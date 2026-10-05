import type { SafeHtml } from 'kerfjs';

/**
 * Renderable content for semantic Kerf UI component positions.
 *
 * Unlike core JSX children, UI content intentionally excludes raw strings,
 * numbers, and signals: semantic component zones should contain trusted
 * `SafeHtml` components. Boolean and nullish values render nothing, and nested
 * readonly arrays let conditionals and mapped component collections compose
 * directly without an otherwise-unnecessary Fragment.
 */
export type KerfUiContent =
  SafeHtml | boolean | null | undefined | readonly KerfUiContent[];
