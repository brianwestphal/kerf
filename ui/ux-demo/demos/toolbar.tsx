import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { List } from '@kerfjs/ui/list';
import { LucideIcon } from '@kerfjs/ui/lucide-icon';
import { TokenSearchField } from '@kerfjs/ui/token-search-field';
import { Toolbar } from '@kerfjs/ui/toolbar';
import { ToolbarControlGroup } from '@kerfjs/ui/toolbar-control-group';
import { ToolbarText } from '@kerfjs/ui/toolbar-text';
import { CircleHelp, Settings, SlidersHorizontal } from 'lucide';

import { toolbarFindOpen, toolbarFindQuery } from './state.js';

export function ToolbarDemo() {
  const findExpanded =
    toolbarFindOpen.value || toolbarFindQuery.value.length > 0;
  return (
    <CatalogExampleStack rootAttributes={{ 'data-demo': 'toolbar' }}>
      <CatalogExample viewport={{ width: 'wide', frame: 'solid' }}>
        <List gap="xs">
          <Toolbar
            label="Document controls"
            centerAlign="stretch"
            responsive="center-priority"
            leading={
              <ToolbarControlGroup appearance="borderless" single>
                <ToolbarText text="Component library" size="large" />
              </ToolbarControlGroup>
            }
            center={
              <ToolbarControlGroup
                content="search"
                focusRing="halo"
                expanded={findExpanded}
                single={!findExpanded}
              >
                <TokenSearchField
                  id="toolbar-find"
                  label="Find in workspace"
                  query={toolbarFindQuery.value}
                  collapsible
                  expanded={toolbarFindOpen.value}
                  presentation="toolbar-group"
                  placeholder="Find in workspace"
                  expandLabel="Open find"
                  clearAction="clear-toolbar-find"
                  editorAttributes={{ 'data-demo-toolbar-find': 'true' }}
                  trailing={<LucideIcon icon={CircleHelp} name="circle-help" />}
                />
              </ToolbarControlGroup>
            }
            trailing={
              <ToolbarControlGroup
                label="View controls"
                buttonAppearance="push"
              >
                <button
                  type="button"
                  aria-label="Toggle inspector"
                  aria-pressed="true"
                >
                  <LucideIcon
                    icon={SlidersHorizontal}
                    name="sliders-horizontal"
                  />
                </button>
                <button type="button" aria-label="Settings">
                  <LucideIcon icon={Settings} name="settings" />
                </button>
              </ToolbarControlGroup>
            }
          />
          <Toolbar
            label="Compact toolbar"
            dividerSides="trbl"
            leading={
              <ToolbarControlGroup appearance="borderless" single>
                <ToolbarText text="Borderless" size="small" />
              </ToolbarControlGroup>
            }
            trailing={
              <ToolbarControlGroup appearance="borderless" single>
                <button type="button" data-action="log-add">
                  Add
                </button>
              </ToolbarControlGroup>
            }
          />
        </List>
      </CatalogExample>
    </CatalogExampleStack>
  );
}
