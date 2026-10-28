// Catalog key → component function, for interpretView. The root barrel holds
// most components; the layout-heavy ones ship only from their own subpaths.
import * as barrel from '@kerfjs/ui';
import propsJson from '@kerfjs/ui/ai/component-props.json';
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
import { TreeList } from '@kerfjs/ui/tree-list';
import { Workbench } from '@kerfjs/ui/workbench';
import { WorkbenchDialog } from '@kerfjs/ui/workbench-dialog';
import type { SafeHtml } from 'kerfjs';

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
  TreeList,
  Workbench,
  WorkbenchDialog,
};

/** Every Kerf UI component function the props catalog lists, by key. */
export function componentFunctions(): Record<string, Render> {
  const functions: Record<string, Render> = {};
  const exports = barrel as unknown as Record<string, unknown>;
  const catalog = propsJson as unknown as {
    components: { key: string; source: string; export?: string }[];
  };
  for (const component of catalog.components) {
    if (component.source !== 'kerf' || !component.export) continue;
    const render = exports[component.export] ?? subpathOnly[component.export];
    if (typeof render === 'function')
      functions[component.key] = render as Render;
  }
  return functions;
}
