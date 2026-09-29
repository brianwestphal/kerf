import { isSafeHtml, type SafeHtml } from 'kerfjs';

// A render-time annotation, shared across separately bundled UI subpaths.
// It never appears in the DOM or changes the group's visual treatment.
const RELOCATE_ON_COLLAPSE = Symbol.for(
  '@kerfjs/ui.ToolbarControlGroup.relocateOnCollapse',
);

export function markRelocatableGroup(group: SafeHtml): SafeHtml {
  Object.defineProperty(group, RELOCATE_ON_COLLAPSE, { value: true });
  return group;
}

export function isRelocatableGroup(value: unknown): value is SafeHtml {
  return (
    isSafeHtml(value) &&
    (value as SafeHtml & { [RELOCATE_ON_COLLAPSE]?: boolean })[
      RELOCATE_ON_COLLAPSE
    ] === true
  );
}
