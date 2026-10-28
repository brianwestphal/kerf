// KF-W99E6W: Button's look without its element, for a control whose own
// element owns activation (a FilePickerTrigger's native file <label>).
// Internal: not re-exported from the `@kerfjs/ui/button` facade.
import type { KerfUiContent } from '../../../../shared/content/semantic-content.js';
import type {
  ButtonEmphasis,
  ButtonLabel,
  ButtonSize,
  ButtonTone,
} from '../button.js';

export interface ButtonFaceProps {
  readonly children: ButtonLabel;
  readonly icon?: KerfUiContent;
  readonly tone?: ButtonTone;
  readonly emphasis?: ButtonEmphasis;
  readonly size?: ButtonSize;
}

/**
 * Button's markup as a non-interactive `<span>`: the same classes and
 * markers, so `button.css` draws it, with no role, focus, or disabled state.
 * The enclosing control is the one people activate and focus.
 */
export function ButtonFace({
  children,
  icon,
  tone = 'neutral',
  emphasis = 'primary',
  size = 'default',
}: ButtonFaceProps) {
  return (
    <span
      class="kui-button"
      data-component="button"
      data-face="true"
      data-tone={tone}
      data-emphasis={emphasis}
      data-size={size}
    >
      {icon === undefined ? null : (
        <span class="kui-button__icon" aria-hidden="true">
          {icon}
        </span>
      )}
      <span class="kui-button__label">{children}</span>
    </span>
  );
}
