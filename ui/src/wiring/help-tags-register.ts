import { installHelpTags } from './help-tags.js';

installHelpTags();

/**
 * Marker export for tests and tooling; importing this module installs the
 * document-level help tags that name icon-only controls on hover and
 * keyboard focus: an icon-only `<button>` or link inside a
 * `ToolbarControlGroup` (named by `aria-label`, without a native `title`),
 * plus the icon-only `Select` and `PopupMenu` triggers that `select/register`
 * and `popup-menu/register` already cover. Import it once in an application
 * whose toolbars have icon-only buttons but no registered `Select` or
 * `PopupMenu`; importing it alongside them is harmless.
 */
export const helpTagsRegistered = true;
