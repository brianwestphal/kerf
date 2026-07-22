/**
 * Static-parts parser for the `kerfjs/html` tagged template (`html\`\``).
 *
 * Parses a template's static string chunks ONCE into a `ParsedTemplate`:
 * the (possibly trimmed) chunks plus an ordered hole-descriptor list that
 * classifies each `${…}` hole as a TEXT hole (a child position) or an ATTR
 * hole (a complete attribute value, `attr=${v}` / `attr="${v}"`). The
 * renderer in `src/html.ts` caches the parse per template-strings-array
 * identity, so repeated renders of the same call site skip this entirely.
 *
 * The state machine is deliberately small and strict: it tracks only
 * text / inside-open-tag / inside-comment modes and quote state. Holes in
 * any position it can't prove safe — tag names, attribute names, partial
 * attribute values, comments — THROW with an actionable message rather
 * than guessing. Static chunks are author-written markup and pass through
 * verbatim (the same trust model as JSX tag/attribute names).
 */

export interface AttrHole {
  kind: 'attr';
  /** The attribute name scanned from the preceding static chunk, verbatim. */
  name: string;
  /** The surrounding quote character, or null for an unquoted `attr=${v}`. */
  quote: '"' | "'" | null;
}

export interface TextHole {
  kind: 'text';
}

export type TemplateHole = AttrHole | TextHole;

export interface ParsedTemplate {
  /**
   * Static chunks with attr-hole scaffolding (`name=`, quotes) stripped —
   * the renderer re-emits the whole ` name="value"` via the JSX attribute
   * renderer. Always `holes.length + 1` entries.
   */
  chunks: string[];
  holes: TemplateHole[];
  /**
   * Per-chunk offset of the `>` that closes the element tag open at the
   * chunk's start, or -1. Only chunks that follow an attr hole can start
   * inside a tag; the renderer uses this to inject the bound-attribute
   * marker (`data-kfb` / `data-kfbrow`) for signal attribute holes.
   */
  tagClose: number[];
}

const TEXT_HOLE: TextHole = { kind: 'text' };

/** Matches a chunk tail of `name=` optionally followed by an opening quote. */
const ATTR_TAIL = /(\s*)([^\s"'<>/=]+)=(["'])?$/;

function holeError(detail: string): Error {
  return new Error(`html\`\`: ${detail}`);
}

function partialValueError(tail: string): Error {
  return holeError(
    `partial attribute values are not supported (near ${JSON.stringify(tail.slice(-30))}) — `
    + 'a hole must be the COMPLETE attribute value: attr=${v} or attr="${v}". '
    + 'For class="a ${b}"-style composition, build the full string first '
    + '(a plain template literal, or computed(() => `a ${b.value}`) for a bound attribute).',
  );
}

export function parseTemplate(strings: readonly string[]): ParsedTemplate {
  const chunks: string[] = new Array(strings.length);
  const holes: TemplateHole[] = new Array(strings.length - 1);
  const tagClose: number[] = new Array<number>(strings.length).fill(-1);
  let mode: 'text' | 'tag' | 'comment' = 'text';
  let quote: '"' | "'" | null = null;

  for (let i = 0; i < strings.length; i++) {
    let s = strings[i];
    // A quoted attr hole (`attr="${v}"`) must be immediately closed by its
    // quote — the renderer emits the full quoted attribute itself, so the
    // author's closing quote is consumed here.
    if (i > 0) {
      const prev = holes[i - 1];
      if (prev.kind === 'attr' && prev.quote !== null) {
        if (s[0] !== prev.quote) throw partialValueError(strings[i - 1]);
        s = s.slice(1);
      }
    }

    const startedInTag = mode === 'tag';
    for (let j = 0; j < s.length; j++) {
      const ch = s[j];
      if (mode === 'text') {
        if (ch === '<') {
          if (s.startsWith('<!--', j)) {
            mode = 'comment';
            j += 3;
          } else if (j + 1 < s.length && /[a-zA-Z!/?]/.test(s[j + 1])) {
            mode = 'tag';
          }
        }
      } else if (mode === 'tag') {
        if (quote !== null) {
          if (ch === quote) quote = null;
        } else if (ch === '"' || ch === "'") {
          quote = ch;
        } else if (ch === '>') {
          if (startedInTag && tagClose[i] === -1) tagClose[i] = j;
          mode = 'text';
        }
      } else if (ch === '-' && s.startsWith('-->', j)) {
        mode = 'text';
        j += 2;
      }
    }

    // Classify the hole that follows this chunk (no hole after the last one).
    if (i < strings.length - 1) {
      if (mode === 'comment') {
        throw holeError(
          'holes inside HTML comments are not supported — move the ${…} hole outside the <!-- --> comment.',
        );
      }
      if (mode === 'text') {
        if (/<\/?$/.test(s)) {
          throw holeError(
            'tag-name holes (`<${…}>`) are not supported — write tag names statically. '
            + 'For a literal "<" before a hole, escape it as &lt;.',
          );
        }
        holes[i] = TEXT_HOLE;
      } else {
        const m = ATTR_TAIL.exec(s);
        if (quote !== null) {
          // Inside a quoted attribute value: only valid if the quote opened
          // as the chunk's very last character (i.e. the hole IS the value).
          if (m === null || m[3] === undefined) throw partialValueError(s);
          holes[i] = { kind: 'attr', name: m[2], quote: m[3] as '"' | "'" };
          s = s.slice(0, s.length - m[0].length);
          quote = null;
        } else if (m !== null && m[3] === undefined) {
          // Unquoted `attr=${v}`: the next static chunk must resume with an
          // attribute delimiter, or the template may simply end there.
          const next = strings[i + 1];
          const validNext = next.length > 0 ? /^[\s>/]/.test(next) : i + 1 === strings.length - 1;
          if (!validNext) throw partialValueError(s);
          holes[i] = { kind: 'attr', name: m[2], quote: null };
          s = s.slice(0, s.length - m[0].length);
        } else if (/<\/?$/.test(s)) {
          // The tag opened as the chunk's last characters (`</${…}`).
          throw holeError(
            'tag-name holes (`<${…}>`) are not supported — write tag names statically. '
            + 'For a literal "<" before a hole, escape it as &lt;.',
          );
        } else {
          throw holeError(
            'a hole inside a tag must be a complete attribute value — attr=${…} or attr="${…}". '
            + 'Tag-name and attribute-name holes are not supported; write those statically.',
          );
        }
      }
    }
    chunks[i] = s;
  }
  return { chunks, holes, tagClose };
}
