// The `class` attributes a `kerfjs/html` tagged template writes, read from its
// static parts. It follows the runtime's static-part rules
// (`src/utils/parseTemplate.ts`): markup is text, open tags, and comments; a
// `${…}` hole is a whole attribute value (`class=${x}` / `class="${x}"`), so
// a class it supplies is unknown and skipped. A complete static value
// (`class="kui-pane"`) counts in full; when a hole interrupts a value (which
// the runtime rejects as a partial value) only the whitespace-delimited names
// the static text completes count, as for a JSX template literal. Tags whose
// name is a hole, and holes inside comments, are not markup and are skipped.

const HOLE = '\0';

const isSpace = (ch) => /\s/.test(ch);

// `{ quasi, tag, value }` for every `class` attribute, where `quasi` is the
// index of the static part the attribute name starts in, `tag` the lowercased
// element name, and `value` the attribute value with each hole as `\0`.
export function htmlTemplateClassAttributes(strings) {
  const text = strings.join(HOLE);
  // Offset where each static part starts in `text`.
  const starts = [];
  let offset = 0;
  for (const part of strings) {
    starts.push(offset);
    offset += part.length + 1;
  }
  const quasiAt = (position) => {
    let index = 0;
    while (index + 1 < starts.length && starts[index + 1] <= position)
      index += 1;
    return index;
  };
  const attributes = [];
  let i = 0;
  while (i < text.length) {
    if (text[i] !== '<') {
      i += 1;
      continue;
    }
    if (text.startsWith('<!--', i)) {
      const end = text.indexOf('-->', i + 4);
      i = end === -1 ? text.length : end + 3;
      continue;
    }
    if (!/[a-zA-Z]/.test(text[i + 1] ?? '')) {
      // A closing tag, `<!DOCTYPE`, `<?…`, or a tag-name hole: skip it whole.
      if (/[!/?]/.test(text[i + 1] ?? '')) {
        const end = text.indexOf('>', i + 1);
        i = end === -1 ? text.length : end + 1;
      } else i += 1;
      continue;
    }
    let j = i + 1;
    while (j < text.length && !/[\s/>]/.test(text[j]) && text[j] !== HOLE)
      j += 1;
    const tag = text.slice(i + 1, j).toLowerCase();
    // A hole completing the tag name (`<div${x}>`) makes it unknown.
    const knownTag = text[j] !== HOLE;
    // Attributes until the tag closes.
    while (j < text.length && text[j] !== '>') {
      if (isSpace(text[j]) || text[j] === '/' || text[j] === HOLE) {
        j += 1;
        continue;
      }
      const nameStart = j;
      while (j < text.length && !/[\s"'<>/=]/.test(text[j]) && text[j] !== HOLE)
        j += 1;
      if (j === nameStart) {
        // A stray quote or `=` with no name; step past it.
        j += 1;
        continue;
      }
      const name = text.slice(nameStart, j).toLowerCase();
      // A hole completing the name (`data-${x}=…`) makes it unknown.
      const knownName = text[j] !== HOLE;
      let k = j;
      while (k < text.length && isSpace(text[k])) k += 1;
      if (text[k] !== '=') continue;
      k += 1;
      while (k < text.length && isSpace(text[k])) k += 1;
      let value;
      if (text[k] === '"' || text[k] === "'") {
        const end = text.indexOf(text[k], k + 1);
        value = text.slice(k + 1, end === -1 ? text.length : end);
        j = end === -1 ? text.length : end + 1;
      } else {
        let end = k;
        while (end < text.length && !/[\s>]/.test(text[end])) end += 1;
        value = text.slice(k, end);
        j = end;
      }
      if (knownTag && knownName && name === 'class')
        attributes.push({ quasi: quasiAt(nameStart), tag, value });
    }
    i = j + 1;
  }
  return attributes;
}

// The class names a value states outright: whitespace-delimited names no hole
// touches.
export function staticClassNames(value) {
  return value.split(/\s+/).filter((name) => name && !name.includes(HOLE));
}
