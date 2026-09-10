# Accessibility and keyboard contracts

These are normative contracts for package components and consuming applications.

## Shared rules

- All controls have accessible names and visible `:focus-visible` treatment.
- Decorative `LucideIcon` output is `aria-hidden`; pass `label` only when the SVG itself conveys meaning.
- `MenuItem` uses native button Enter/Space behavior. `selected` maps to `aria-current="page"`; `pressed` maps to `aria-pressed`. It deliberately does not emit `role="menuitem"` in isolation—a true ARIA menu must own arrow, Home/End, Escape, and focus behavior as one widget.
- `LoadingSpinner` is either labeled (`role="img"`) or hidden. Its rotation stops for reduced motion.
- `StateBanner` defaults to polite `role="status"`; use `urgency="alert"` only for an attention-requiring failure.
- `EmptyState` reports busy state through `aria-busy` and never relies on an illustration as its label.
- `Select` follows the Web Awesome host's standard `input`/`change` events. Application tests verify the live `value`, focus, and events—not attributes alone.

## ResizableRegion

The handle exposes separator role, orientation, name, minimum, maximum, and current values. `wireResizableRegions()` adds:

- the axis arrow keys in 16 px steps by default;
- Shift+Arrow in 64 px steps;
- Home and End for minimum and maximum;
- primary-pointer drag with clamping;
- preview callbacks while dragging and one commit callback on release.

The application owns persistence and collapsed/expanded policy. Keep the last expanded size outside the component and restore it when reopening.

## Tabs

`AppTab` renders one tab, not the containing tab system. Put tabs in a `role="tablist"`, pair them with `tabpanel` elements, and keep exactly one tab at `tabindex="0"`. The package sets selected tabs to `0` and unselected tabs to `-1`; the application owns Left/Right, Home/End, activation policy, and Delete/Backspace handling. After removal, focus the nearest surviving tab.

## Verification matrix

For each changed component, inspect default, hover, focus, disabled, selected/pressed, busy/error, long-content, wide, narrow, light, dark, increased-contrast, reduced-motion, keyboard-only, and 200%-zoom states where applicable. DOM order must match reading and focus order, with no clipping or unreachable action.
