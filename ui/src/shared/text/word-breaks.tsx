import type { SafeHtml } from 'kerfjs';

// A lowercase letter or digit followed by an uppercase letter ("ticketBoard"),
// or an acronym followed by a capitalized word ("HTMLParser" → "HTML|Parser").
const CAMEL_BOUNDARY =
  /(?<=[\p{Ll}\p{N}])(?=\p{Lu})|(?<=\p{Lu})(?=\p{Lu}\p{Ll})/u;

/**
 * A label with line-break opportunities (`<wbr>`) at camelCase boundaries, so a
 * wrapping row breaks a long identifier-like name (`QuickTicketComposer`) at a
 * word boundary instead of mid-word. The text, and so the accessible name, is
 * unchanged; a `SafeHtml` label is returned as given.
 */
export function withWordBreaks(label: string | SafeHtml): string | SafeHtml {
  if (typeof label !== 'string') return label;
  const parts = label.split(CAMEL_BOUNDARY);
  if (parts.length < 2) return label;
  return (
    <>
      {parts.map((part, index) => (
        <>
          {index > 0 ? <wbr /> : null}
          {part}
        </>
      ))}
    </>
  );
}
