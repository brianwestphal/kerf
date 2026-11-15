/**
 * The suffix a middle truncation always keeps: a number of trailing
 * characters, or `segment` for the last path segment with its separator.
 */
export type MiddleTruncateKeep = number | 'segment';

/** Characters a middle truncation keeps when the text has no path separator. */
const MIDDLE_FALLBACK_KEEP = 10;

/** Split text into the shrinkable head and the always-kept tail. */
export function splitMiddle(
  text: string,
  keep: MiddleTruncateKeep,
): [string, string] {
  let tailLength: number;
  if (keep === 'segment') {
    // Ignore one trailing separator so `src/lib/` keeps `/lib/`.
    const searchEnd = /[/\\]$/.test(text) ? text.length - 1 : text.length;
    const separator = Math.max(
      text.lastIndexOf('/', searchEnd - 1),
      text.lastIndexOf('\\', searchEnd - 1),
    );
    tailLength = separator > 0 ? text.length - separator : MIDDLE_FALLBACK_KEEP;
  } else tailLength = keep;
  if (tailLength >= text.length) return [text, ''];
  return [text.slice(0, -tailLength), text.slice(-tailLength)];
}
