import type { KerfUiContent } from '../../../shared/content/semantic-content.js';
import type { CssLength } from '../../../shared/styles/css-values.js';

const unsafeStyleValue = /[;{}<>"'\\]|\p{Cc}/u;

function styleValue(value: CssLength, prop: string): string {
  const trimmed = value.trim();
  if (!trimmed || unsafeStyleValue.test(trimmed))
    throw new TypeError(`EditorFrame ${prop} requires one CSS length.`);
  return trimmed;
}

export type EditorFrameMode = 'source' | 'preview';
export type EditorFrameAppearance = 'framed' | 'embedded';
export type EditorFrameInset = 'padded' | 'flush';

export interface EditorFrameProps {
  /** A Toolbar or other fixed controls above the writing surface. */
  toolbar?: KerfUiContent;
  /** A native textarea in source mode, or rendered content in preview mode. */
  children: KerfUiContent;
  mode: EditorFrameMode;
  /** Framed fixed-height card (default) or unframed content within a host. */
  appearance?: EditorFrameAppearance;
  /** Remove the writing surface inset when the host owns the text column. */
  inset?: EditorFrameInset;
  /** Fill the viewport inset as a raised editor overlay. */
  expanded?: boolean;
  /** Framed block size; defaults to 320px. Ignored while expanded or embedded. */
  height?: CssLength;
  /** Maximum framed inline size; defaults to 672px. */
  maxWidth?: CssLength;
  /** Embedded source height restored by the app. */
  sourceHeight?: CssLength;
  /** Let an embedded native textarea grow with its content. */
  sourceAutosize?: boolean;
  /** Name a distinct editor region for assistive technology. */
  label?: string;
  /** App-owned root identity for delegation or a stable morph key. */
  rootAttributes?: Readonly<Record<`data-${string}`, string | undefined>>;
  slot?: string;
}

/**
 * A fixed toolbar over one writing surface. Source mode gives a native
 * textarea the scrollport; preview mode scrolls the surface around rendered
 * content. The app owns editing, draft restoration, and preview actions.
 */
export function EditorFrame({
  toolbar,
  children,
  mode,
  appearance = 'framed',
  inset = 'padded',
  expanded = false,
  height,
  maxWidth,
  sourceHeight,
  sourceAutosize = false,
  label,
  rootAttributes = {},
  slot,
}: EditorFrameProps) {
  const style = [
    height === undefined
      ? ''
      : `--_kui-editor-frame-height:${styleValue(height, 'height')}`,
    maxWidth === undefined
      ? ''
      : `--_kui-editor-frame-max-width:${styleValue(maxWidth, 'maxWidth')}`,
    sourceHeight === undefined
      ? ''
      : `--_kui-editor-frame-source-height:${styleValue(sourceHeight, 'sourceHeight')}`,
  ]
    .filter(Boolean)
    .join(';');
  return (
    <section
      {...rootAttributes}
      class="kui-editor-frame"
      data-component="editor-frame"
      data-mode={mode}
      data-appearance={appearance}
      data-inset={inset}
      data-expanded={String(expanded)}
      data-source-autosize={String(sourceAutosize)}
      role={label ? 'region' : undefined}
      aria-label={label}
      style={style || undefined}
      slot={slot}
    >
      {toolbar === undefined ? null : (
        <div class="kui-editor-frame__toolbar">{toolbar}</div>
      )}
      <div class="kui-editor-frame__surface">{children}</div>
    </section>
  );
}
