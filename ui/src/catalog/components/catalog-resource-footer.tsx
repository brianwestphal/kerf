import type { SafeHtml } from 'kerfjs';
import { ExternalLink, Waypoints } from 'lucide';

import { LucideIcon } from '../../lucide-icon.js';
import type { KerfUiContent } from '../../semantic-content.js';
import { Toolbar } from '../../toolbar.js';
import {
  ToolbarActionLink,
  ToolbarControlGroup,
} from '../../toolbar-control-group.js';
import type { CatalogRelated, CatalogResource } from '../types.js';

interface CatalogResourceFooterProps {
  name: string;
  active: string;
  resources: readonly CatalogResource[];
  related: readonly CatalogRelated[];
  status?: KerfUiContent;
  selectAction: string;
}

function relatedMenuItems(
  related: readonly CatalogRelated[],
  selectAction: string,
): SafeHtml[] {
  const groups: string[] = [];
  for (const entry of related)
    if (!groups.includes(entry.group)) groups.push(entry.group);

  const nodes: SafeHtml[] = [];
  groups.forEach((group, index) => {
    if (index > 0) nodes.push(<wa-divider></wa-divider>);
    nodes.push(<small class="kui-catalog__related-heading">{group}</small>);
    for (const entry of related) {
      if (entry.group === group)
        nodes.push(
          <wa-dropdown-item data-action={selectAction} data-item-id={entry.id}>
            {entry.name}
          </wa-dropdown-item>,
        );
    }
  });
  return nodes;
}

/** Status, resources, and related-entry navigation for the active specimen. */
export function CatalogResourceFooter({
  name,
  active,
  resources,
  related,
  status,
  selectAction,
}: CatalogResourceFooterProps) {
  return (
    <div class="kui-catalog__footer">
      {status ? <div class="kui-catalog__status">{status}</div> : null}
      <Toolbar
        label={`${name} resources`}
        dividerSides=""
        responsive="stack"
        responsiveAt="narrow"
        leading={
          resources.length > 0 ? (
            <ToolbarControlGroup
              label={`${name} resources`}
              content="mixed"
              size="compact"
              overflow="scroll"
            >
              {resources.map((resource) => (
                <ToolbarActionLink
                  href={resource.href}
                  label={resource.label}
                  detail={resource.detail}
                  ariaLabel={`${name}: ${resource.label} (opens in new tab)`}
                  external
                  icon={<LucideIcon icon={ExternalLink} name="external-link" />}
                />
              ))}
            </ToolbarControlGroup>
          ) : null
        }
        trailing={
          related.length > 0 ? (
            <ToolbarControlGroup
              single
              content="mixed"
              nestedDropdown
              menuInset="compact"
              size="compact"
              label="Related entries"
            >
              <wa-dropdown
                placement="top-end"
                data-key={`kui-catalog-related-${active}`}
                data-catalog-related
                data-morph-skip-children
              >
                <wa-button slot="trigger" appearance="plain" with-caret>
                  <LucideIcon icon={Waypoints} name="waypoints" />
                  <span>Components</span>
                </wa-button>
                {relatedMenuItems(related, selectAction)}
              </wa-dropdown>
            </ToolbarControlGroup>
          ) : null
        }
      />
    </div>
  );
}
