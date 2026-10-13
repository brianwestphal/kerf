import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { CornerStatus } from '@kerfjs/ui/corner-status';
import { LoadingSpinner } from '@kerfjs/ui/loading-spinner';
import { StateBanner } from '@kerfjs/ui/state-banner';
import { ToolbarControlGroup } from '@kerfjs/ui/toolbar-control-group';

export function CornerStatusDemo() {
  return (
    <CatalogExampleStack rootAttributes={{ 'data-demo': 'corner-status' }}>
      <CatalogExample
        label="Overlay"
        note="A manual popover in the top layer: no close button, light dismiss, or Escape. Apps open it with wireCornerStatus; this toggle opens it directly."
        align="inline-control"
      >
        <ToolbarControlGroup single>
          <button type="button" popoverTarget="catalog-corner-status">
            Toggle Loading Status
          </button>
        </ToolbarControlGroup>
        <CornerStatus id="catalog-corner-status">
          <StateBanner
            tone="neutral"
            urgency="status"
            title="Updating Tickets… 3 of 12"
            icon={<LoadingSpinner label="Updating tickets…" size={16.8} />}
          />
        </CornerStatus>
      </CatalogExample>
      <CatalogExample
        label="Embedded"
        note='presentation="embedded" shows the same stack in flow, for a catalog or an inline preview.'
        align="none"
      >
        <CornerStatus presentation="embedded">
          <StateBanner
            tone="neutral"
            urgency="status"
            title="Loading…"
            icon={<LoadingSpinner label="Loading project…" size={16.8} />}
          />
          <StateBanner
            tone="info"
            urgency="status"
            title="Syncing 2 Providers"
            icon={<LoadingSpinner label="Syncing providers…" size={16.8} />}
          />
        </CornerStatus>
      </CatalogExample>
    </CatalogExampleStack>
  );
}
