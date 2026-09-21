function syntaxError(label, index, message) {
  throw new Error(`${label} is invalid JSONC at offset ${index}: ${message}.`);
}

export function parseJsoncDocument(source, label = 'JSONC document') {
  let index = 0;
  const skipTrivia = () => {
    while (index < source.length) {
      if (/\s/.test(source[index])) {
        index += 1;
        continue;
      }
      if (source.startsWith('//', index)) {
        index = source.indexOf('\n', index + 2);
        if (index < 0) index = source.length;
        continue;
      }
      if (source.startsWith('/*', index)) {
        const end = source.indexOf('*/', index + 2);
        if (end < 0) syntaxError(label, index, 'unterminated block comment');
        index = end + 2;
        continue;
      }
      break;
    }
  };
  const parseString = () => {
    const start = index++;
    while (index < source.length) {
      if (source[index] === '\\') {
        index += 2;
        continue;
      }
      if (source[index++] === '"') {
        try {
          return {
            type: 'string',
            start,
            end: index,
            value: JSON.parse(source.slice(start, index)),
          };
        } catch {
          syntaxError(label, start, 'invalid string');
        }
      }
    }
    syntaxError(label, start, 'unterminated string');
  };
  const parseValue = () => {
    skipTrivia();
    const start = index;
    if (source[index] === '"') return parseString();
    if (source[index] === '{') {
      index += 1;
      const properties = new Map();
      const value = {};
      skipTrivia();
      while (source[index] !== '}') {
        if (index >= source.length)
          syntaxError(label, start, 'unterminated object');
        if (source[index] !== '"')
          syntaxError(label, index, 'object keys must be quoted strings');
        const propertyStart = index;
        const keyNode = parseString();
        skipTrivia();
        if (source[index++] !== ':')
          syntaxError(label, index - 1, 'expected a colon');
        const valueNode = parseValue();
        if (properties.has(keyNode.value))
          syntaxError(label, keyNode.start, `duplicate key ${keyNode.value}`);
        const property = {
          key: keyNode.value,
          start: propertyStart,
          end: valueNode.end,
          valueNode,
          comma: null,
        };
        properties.set(keyNode.value, property);
        value[keyNode.value] = valueNode.value;
        skipTrivia();
        if (source[index] === ',') {
          property.comma = index++;
          skipTrivia();
          if (source[index] === '}') break;
        } else if (source[index] !== '}')
          syntaxError(label, index, 'expected a comma or closing brace');
      }
      index += 1;
      return { type: 'object', start, end: index, value, properties };
    }
    if (source[index] === '[') {
      index += 1;
      const items = [];
      const value = [];
      skipTrivia();
      while (source[index] !== ']') {
        if (index >= source.length)
          syntaxError(label, start, 'unterminated array');
        const item = parseValue();
        items.push(item);
        value.push(item.value);
        skipTrivia();
        if (source[index] === ',') {
          index += 1;
          skipTrivia();
          if (source[index] === ']') break;
        } else if (source[index] !== ']')
          syntaxError(label, index, 'expected a comma or closing bracket');
      }
      index += 1;
      return { type: 'array', start, end: index, value, items };
    }
    const match = source
      .slice(index)
      .match(
        /^(?:true|false|null|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)/,
      );
    if (!match) syntaxError(label, index, 'expected a value');
    index += match[0].length;
    return {
      type: 'primitive',
      start,
      end: index,
      value: JSON.parse(match[0]),
    };
  };

  const root = parseValue();
  skipTrivia();
  if (index !== source.length)
    syntaxError(label, index, 'unexpected content after the root value');
  return { root, value: root.value };
}

const lineIndent = (source, position) => {
  const start = source.lastIndexOf('\n', position - 1) + 1;
  return source.slice(start, position).match(/^\s*/)[0];
};

const formattedValue = (value, indent, childIndent, newline) => {
  const unit = childIndent.slice(indent.length) || '  ';
  const formatted = JSON.stringify(value, null, unit);
  return formatted.replaceAll('\n', `${newline}${childIndent}`);
};

export function jsoncValueEdit(node, value, source) {
  const newline = source.includes('\r\n') ? '\r\n' : '\n';
  return {
    start: node.start,
    end: node.end,
    text: formattedValue(value, '', lineIndent(source, node.start), newline),
  };
}

export function jsoncInsertProperties(source, objectNode, entries) {
  if (!entries.length) return [];
  const newline = source.includes('\r\n') ? '\r\n' : '\n';
  const close = objectNode.end - 1;
  const closeLineStart = source.lastIndexOf('\n', close - 1) + 1;
  const closePrefix = source.slice(closeLineStart, close);
  const closeIndent = /^\s*$/.test(closePrefix)
    ? closePrefix
    : lineIndent(source, close);
  const firstProperty = objectNode.properties.values().next().value;
  const childIndent = firstProperty
    ? lineIndent(source, firstProperty.start)
    : `${closeIndent}${source.includes('\t') ? '\t' : '  '}`;
  const insertAt = /^\s*$/.test(closePrefix) ? closeLineStart : close;
  const rendered = entries
    .map(
      ([key, value]) =>
        `${childIndent}${JSON.stringify(key)}: ${formattedValue(value, closeIndent, childIndent, newline)}`,
    )
    .join(`,${newline}`);
  const edits = [
    {
      start: insertAt,
      end: insertAt,
      text: `${insertAt === close ? newline : ''}${rendered}${newline}${closeIndent}`,
    },
  ];
  const properties = [...objectNode.properties.values()];
  const last = properties.at(-1);
  if (last && last.comma === null)
    edits.push({
      start: last.valueNode.end,
      end: last.valueNode.end,
      text: ',',
    });
  return edits;
}

export function applyJsoncEdits(source, edits) {
  return [...edits]
    .sort((left, right) => right.start - left.start || right.end - left.end)
    .reduce(
      (output, edit) =>
        `${output.slice(0, edit.start)}${edit.text}${output.slice(edit.end)}`,
      source,
    );
}
