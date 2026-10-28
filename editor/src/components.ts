// Catalog key → component function, for interpretView. The root barrel holds
// most components; the layout-heavy ones ship only from their own subpaths.
import * as barrel from '@kerfjs/ui';
import {
  CollapsiblePanel,
  CollapsiblePanelRelocated,
  CollapsiblePanelToggle,
} from '@kerfjs/ui/collapsible-panel';
import { ColorField } from '@kerfjs/ui/color-field';
import { ColorPicker } from '@kerfjs/ui/color-picker';
import { ColorSwatches } from '@kerfjs/ui/color-swatches';
import { Disclosure } from '@kerfjs/ui/disclosure';
import { ListDetailDialog } from '@kerfjs/ui/list-detail-dialog';
import { NavStack } from '@kerfjs/ui/nav-stack';
import { ProgressBar } from '@kerfjs/ui/progress-bar';
import { ProgressRing } from '@kerfjs/ui/progress-ring';
import { Slider } from '@kerfjs/ui/slider';
import { SplitView } from '@kerfjs/ui/split-view';
import { TabNavigator } from '@kerfjs/ui/tab-navigator';
import { TagField } from '@kerfjs/ui/tag-field';
import { Workbench } from '@kerfjs/ui/workbench';
import { WorkbenchDialog } from '@kerfjs/ui/workbench-dialog';
import type { SafeHtml } from 'kerfjs';

import { propsByKey } from './catalog.js';

type Render = (props: never) => SafeHtml;

const subpathOnly: Record<string, unknown> = {
  CollapsiblePanel,
  CollapsiblePanelRelocated,
  CollapsiblePanelToggle,
  ColorField,
  ColorPicker,
  ColorSwatches,
  Disclosure,
  ListDetailDialog,
  NavStack,
  ProgressBar,
  ProgressRing,
  Slider,
  SplitView,
  TabNavigator,
  TagField,
  Workbench,
  WorkbenchDialog,
};

/** Every Kerf UI component function the props catalog lists, by key. */
export function componentFunctions(): Record<string, Render> {
  const functions: Record<string, Render> = {};
  const exports = barrel as unknown as Record<string, unknown>;
  for (const [key, component] of propsByKey) {
    if (component.source !== 'kerf' || !component.export) continue;
    const render = exports[component.export] ?? subpathOnly[component.export];
    if (typeof render === 'function') functions[key] = render as Render;
  }
  return functions;
}
