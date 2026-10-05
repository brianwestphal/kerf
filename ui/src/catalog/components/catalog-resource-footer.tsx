import { ExternalLink, Waypoints } from 'lucide';

import {
  PopupMenu,
  type PopupMenuEntry,
} from '../../components/actions/popup-menu/popup-menu.js';
import {
  Toolbar,
  type ToolbarConfig,
} from '../../components/actions/toolbar/toolbar.js';
import {
  ToolbarActionLink,
  ToolbarControlGroup,
} from '../../components/actions/toolbar-control-group/toolbar-control-group.js';
import { Row } from '../../components/layout/row/row.js';
import { LucideIcon } from '../../components/media/lucide-icon/lucide-icon.js';
import type { KerfUiContent } from '../../shared/content/semantic-content.js';
import type { CatalogRelated, CatalogResource } from '../types.js';

interface CatalogResourceFooterProps {
  name: string;
  resources: readonly CatalogResource[];
  related: readonly CatalogRelated[];
  status?: KerfUiContent;
  selectAction: string;
  toolbar?: ToolbarConfig;
}

function relatedMenuItems(
  related: readonly CatalogRelated[],
  selectAction: string,
): PopupMenuEntry[] {
  const groups: string[] = [];
  for (const entry of related)
    if (!groups.includes(entry.group)) groups.push(entry.group);

  const items: PopupMenuEntry[] = [];
  groups.forEach((group, index) => {
    if (index > 0) items.push({ kind: 'divider' });
    items.push({ kind: 'heading', label: group });
    for (const entry of related)
      if (entry.group === group)
        items.push({
          label: entry.name,
          action: selectAction,
          attributes: { 'data-item-id': entry.id },
        });
  });
  return items;
}

/** Status, resources, and related-entry navigation for the active specimen. */
export function CatalogResourceFooter({
  name,
  resources,
  related,
  status,
  selectAction,
  toolbar,
}: CatalogResourceFooterProps) {
  return (
    <>
      {status ? (
        <Row
          hAlign="space-between"
          vAlign="baseline"
          gap="xs"
          wrap
          textInsets="trl"
        >
          {status}
        </Row>
      ) : null}
      <Toolbar
        position="footer"
        label={`${name} resources`}
        dividerSides={toolbar?.dividerSides}
        centerAlign={toolbar?.centerAlign}
        responsive={toolbar?.responsive ?? 'stack'}
        responsiveAt={toolbar?.responsiveAt ?? 'narrow'}
        safeAreaEdges={toolbar?.safeAreaEdges}
        leading={
          resources.length > 0 ? (
            <ToolbarControlGroup
              label={`${name} resources`}
              content="mixed"
              size="compact"
              overflow="wrap"
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
              <PopupMenu
                text="Components"
                icon={<LucideIcon icon={Waypoints} name="waypoints" />}
                placement="top-end"
                items={relatedMenuItems(related, selectAction)}
                rootAttributes={{ 'data-catalog-related': '' }}
              />
            </ToolbarControlGroup>
          ) : null
        }
      />
    </>
  );
}
