import '@kerfjs/ui/lucide-icon.css';

import { CatalogExample, CatalogExampleStack } from '@kerfjs/ui/catalog';
import { FloatingToolbar } from '@kerfjs/ui/floating-toolbar';
import { LucideIcon } from '@kerfjs/ui/lucide-icon';
import { Toolbar } from '@kerfjs/ui/toolbar';
import { ToolbarControlGroup } from '@kerfjs/ui/toolbar-control-group';
import { ToolbarText } from '@kerfjs/ui/toolbar-text';
import { PanelBottomOpen, Terminal, X } from 'lucide';

import { floatingToolbarOpen } from './state.js';

export function FloatingToolbarDemo() {
  const open = floatingToolbarOpen.value;
  return (
    <CatalogExampleStack
      label="FloatingToolbar demo"
      rootAttributes={{ 'data-demo': 'floating-toolbar' }}
    >
      <CatalogExample
        label="Floating over content"
        note={
          <>
            A transparent, forced-dark toolbar floats over its container's
            content — like a terminal-drawer restore — but never over dialogs
            (it is not top-layer). It is inset an extra 8px past a top toolbar;
            override <code>--kui-floating-toolbar-inset</code> or set{' '}
            <code>position</code> to move it. Toggle it on; it hides
            automatically when you leave this demo.
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
          label="Work area"
          dividerSides="b"
          leading={
            <ToolbarControlGroup appearance="borderless" single>
              <ToolbarText text="Terminals" size="small" />
            </ToolbarControlGroup>
          }
          trailing={
            <ToolbarControlGroup appearance="borderless" single>
              <button
                type="button"
                data-action="toggle-floating-toolbar"
                aria-pressed={String(open)}
                aria-label={
                  open ? 'Hide floating toolbar' : 'Show floating toolbar'
                }
              >
                <LucideIcon
                  icon={open ? X : PanelBottomOpen}
                  name={open ? 'x' : 'panel-bottom-open'}
                />
              </button>
            </ToolbarControlGroup>
          }
        />
        <div class="kui-content-item">
          Scrolling content sits behind the floating toolbar.
        </div>
        {open ? (
          <FloatingToolbar label="Terminal drawer">
            <ToolbarControlGroup label="Terminal drawer" single>
              <button
                type="button"
                aria-label="Restore terminal drawer"
                data-action="log-restore-drawer"
              >
                <LucideIcon icon={Terminal} name="terminal" />
              </button>
            </ToolbarControlGroup>
          </FloatingToolbar>
        ) : null}
      </CatalogExample>
    </CatalogExampleStack>
  );
}
