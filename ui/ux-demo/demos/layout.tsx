import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';

import { renderLayoutAnchoredRequest } from '../views/layout-anchored-request.view.js';
import { renderLayoutAnchoredRequestPopup } from '../views/layout-anchored-request-popup.view.js';
import { renderLayoutPane } from '../views/layout-pane.view.js';

/** The named anchor the request popup docks to through its catalog frame. */
const demoShellMainAnchor = '--demo-shell-main';

export function LayoutDemo() {
  return (
    <CatalogExampleStack
      label="Semantic Layout Composition"
      rootAttributes={{ 'data-demo': 'layout' }}
    >
      <CatalogExample label="Pane with Child-Owned Content Geometry">
        {renderLayoutPane()}
      </CatalogExample>
      <CatalogExample
        label="Top-Layer Popup Anchored to the Frame"
        note="The frame stands in for the shell's main column: it is the named anchor a PopoverDialogSurface's anchorName docks to, and its content sits in a centered column. The request dismisses manually, so it stays open until it is answered."
        viewport={{
          layout: 'flex-column',
          width: 'full',
          minHeight: 'app',
          frame: 'solid',
          surface: 'lowered',
          anchorName: demoShellMainAnchor,
          contentWidth: 'compact',
          contentAlign: 'center',
        }}
        rootAttributes={{ 'data-layout-anchor-example': '' }}
      >
        {renderLayoutAnchoredRequest()}
        {renderLayoutAnchoredRequestPopup()}
      </CatalogExample>
    </CatalogExampleStack>
  );
}
