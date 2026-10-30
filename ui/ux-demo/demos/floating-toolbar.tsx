import '@kerfjs/ui/lucide-icon.css';

import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { ContentItem } from '@kerfjs/ui/content-item';
import { FloatingToolbar } from '@kerfjs/ui/floating-toolbar';
import { LucideIcon } from '@kerfjs/ui/lucide-icon';
import { Toolbar } from '@kerfjs/ui/toolbar';
import {
  ToolbarButton,
  ToolbarControlGroup,
} from '@kerfjs/ui/toolbar-control-group';
import { ToolbarText } from '@kerfjs/ui/toolbar-text';
import { PanelBottomOpen, Terminal, X } from 'lucide';

import { floatingToolbarOpen } from './state.js';

export function FloatingToolbarDemo() {
  const open = floatingToolbarOpen.value;
  return (
    <CatalogExampleStack
      label="FloatingToolbar Demo"
      rootAttributes={{ 'data-demo': 'floating-toolbar' }}
    >
      <CatalogExample
        label="Floating over Content"
        note={
          <>
            A transparent, forced-dark toolbar floats over its container's
            content — like a terminal-drawer restore — but never over dialogs
            (it is not top-layer). It is inset an extra 8px past a top toolbar;
            pass a typed <code>inset</code> or set <code>position</code> to move
            it. Toggle it on; it hides automatically when you leave this demo.
          </>
        }
        align="none"
        rootAttributes={{ 'data-demo-floating-toolbar-stage': '' }}
        viewport={{
          layout: 'flex-column',
          width: 'full',
          height: 'medium',
          frame: 'solid',
          surface: 'lowered',
          overflow: 'hidden',
        }}
      >
        <Toolbar
          label="Work Area"
          dividerSides="b"
          leading={
            <ToolbarControlGroup appearance="borderless" single>
              <ToolbarText text="Terminals" size="small" />
            </ToolbarControlGroup>
          }
          trailing={
            <ToolbarControlGroup appearance="borderless" single>
              <ToolbarButton
                ariaLabel={
                  open ? 'Hide Floating Toolbar' : 'Show Floating Toolbar'
                }
                action="toggle-floating-toolbar"
                pressed={open}
                icon={
                  <LucideIcon
                    icon={open ? X : PanelBottomOpen}
                    name={open ? 'x' : 'panel-bottom-open'}
                  />
                }
              />
            </ToolbarControlGroup>
          }
        />
        <ContentItem>
          Scrolling content sits behind the floating toolbar.
        </ContentItem>
        {open ? (
          <FloatingToolbar label="Terminal Drawer">
            <ToolbarControlGroup label="Terminal Drawer" single>
              <ToolbarButton
                ariaLabel="Restore Terminal Drawer"
                action="log-restore-drawer"
                icon={<LucideIcon icon={Terminal} name="terminal" />}
              />
            </ToolbarControlGroup>
          </FloatingToolbar>
        ) : null}
      </CatalogExample>
      <CatalogExample label="Inline Restore Cluster" align="none">
        <FloatingToolbar label="Inline Drawer Restore" placement="inline">
          <ToolbarControlGroup label="Restore Drawer" single>
            <ToolbarButton
              ariaLabel="Restore Drawer"
              icon={<LucideIcon icon={Terminal} name="terminal" />}
            />
          </ToolbarControlGroup>
        </FloatingToolbar>
      </CatalogExample>
    </CatalogExampleStack>
  );
}
