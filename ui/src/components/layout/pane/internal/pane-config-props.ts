import type { PaneConfig } from '../pane.js';

/**
 * Every {@link PaneConfig} field, each present (possibly `undefined`). The
 * mapped type makes a new `PaneConfig` field a type error here until it is
 * forwarded, so a composite can never silently drop pane configuration.
 */
type ForwardedPaneConfig = {
  [K in keyof Required<PaneConfig>]: PaneConfig[K];
};

/**
 * The `Pane` props a composite (a Workbench panel or work area, a
 * CollapsiblePanel, a NavStack view) forwards from the app's `PaneConfig`. An
 * omitted or `undefined` field stays `undefined`, so the Pane keeps its default.
 */
export function paneConfigProps(
  config: PaneConfig | undefined,
): ForwardedPaneConfig {
  return {
    contentElement: config?.contentElement,
    contentLabel: config?.contentLabel,
    separators: config?.separators,
    safeAreaEdges: config?.safeAreaEdges,
    chromeDividers: config?.chromeDividers,
    headerPresentation: config?.headerPresentation,
    appearance: config?.appearance,
    background: config?.background,
    deepInset: config?.deepInset,
    scrollClearance: config?.scrollClearance,
    tabIndex: config?.tabIndex,
    outlined: config?.outlined,
  };
}
