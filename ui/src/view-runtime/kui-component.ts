import type { SafeHtml } from 'kerfjs';

/**
 * Preserve component prop inference behind a curried call boundary. Rollup's
 * effect analysis stays linear through large generated component trees.
 */
export function kuiComponent<P>(
  component: (props: P) => SafeHtml,
): (props: P) => SafeHtml {
  return (props) => component(props);
}
