import './anchored-request-popup.css';

import { Row } from '@kerfjs/ui/row';
import { Text } from '@kerfjs/ui/text';

/**
 * The anchor the stand-in popup positions against. Production names its shell's
 * main column; the catalog names the specimen frame the same way through
 * `CatalogExample` `viewport.anchorName`.
 */
export const demoShellMainAnchor = '--demo-shell-main';

/**
 * App-owned stand-in for a top-layer request popup (`popover="manual"`) that a
 * production app anchors to its shell's main column with CSS anchor
 * positioning. Its own stylesheet owns `position-anchor`, exactly as the
 * production component would.
 */
export function AnchoredRequestPopup({ id }: { id: string }) {
  return (
    <div
      id={id}
      popover="manual"
      class="anchored-request-popup"
      role="dialog"
      aria-labelledby={`${id}-title`}
      data-anchored-request-popup
    >
      <Text variant="h2" size="large" id={`${id}-title`}>
        Allow file access?
      </Text>
      <Text tone="quiet">
        The assistant wants to read three files in this workspace.
      </Text>
      <Row hAlign="right" controlInsets="l">
        {/* Raw: Button has no popoverTarget/popoverTargetAction. */}
        <button
          type="button"
          popoverTarget={id}
          popoverTargetAction="hide"
          data-anchored-request-deny
        >
          Deny
        </button>
        <button type="button" popoverTarget={id} popoverTargetAction="hide">
          Allow
        </button>
      </Row>
    </div>
  );
}
