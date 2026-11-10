// Browser-safe transport for a compiler-checked TypeScript parameter expression.
// The projection is for navigation; Node's project compiler remains the semantic
// authority. Module-token spans let exports rebase imports without regex-parsing TS.

const OPEN = new Map([
  ['(', ')'],
  ['[', ']'],
  ['{', '}'],
  ['<', '>'],
]);
const DECLARATION =
  /^(?:export|declare|const|let|var|class|interface|namespace|module|function|debugger)$/;

/** A lexical containment check, not TypeScript syntax or semantic validation. */
export function containedTypeExpression(text) {
  if (typeof text !== 'string' || !text.trim() || text.length > 16384)
    return false;
  const stack = [];
  let quote = '';
  for (let at = 0; at < text.length; at += 1) {
    const char = text[at];
    if (quote) {
      if (char === '\\') at += 1;
      else if (char === quote) quote = '';
      else if (quote === '`' && char === '$' && text[at + 1] === '{') {
        stack.push('template');
        quote = '';
        at += 1;
      }
      continue;
    }
    if (char === '"' || char === "'" || char === '`') {
      quote = char;
      continue;
    }
    if (char === '/' && text[at + 1] === '/') {
      const end = text.indexOf('\n', at + 2);
      if (end === -1) break;
      at = end;
      continue;
    }
    if (char === '/' && text[at + 1] === '*') {
      const end = text.indexOf('*/', at + 2);
      if (end === -1) return false;
      at = end + 1;
      continue;
    }
    if (char === '>' && text[at - 1] === '=') continue;
    if (OPEN.has(char)) stack.push(OPEN.get(char));
    else if (')]}>'.includes(char)) {
      const expected = stack.pop();
      if (char === '}' && expected === 'template') quote = '`';
      else if (expected !== char) return false;
    } else if (stack.length === 0) {
      if (
        char === ';' ||
        char === ',' ||
        (char === '=' && text[at + 1] !== '>')
      )
        return false;
      if (/[A-Za-z_$]/.test(char)) {
        const word = /^[A-Za-z_$][\w$]*/.exec(text.slice(at))[0];
        if (DECLARATION.test(word)) return false;
        at += word.length - 1;
      }
    }
  }
  return !quote && stack.length === 0;
}

/** A stable project-relative source name (never an absolute clone path). */
export function typeSourcePath(value) {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    !value.includes('\\') &&
    !value.includes(':') &&
    !value.startsWith('/') &&
    !value
      .split('/')
      .some((part) => part === '..' || part === '.' || part === '')
  );
}

export function validTypeExpression(type) {
  const value = type?.typescript;
  if (
    !value ||
    !containedTypeExpression(value.text) ||
    !typeSourcePath(value.source) ||
    !Array.isArray(value.references)
  )
    return false;
  let end = 0;
  return value.references.every((item) => {
    if (
      !Number.isInteger(item.start) ||
      !Number.isInteger(item.length) ||
      item.start < end ||
      item.length < 2 ||
      typeof item.module !== 'string'
    )
      return false;
    end = item.start + item.length;
    return (
      end <= value.text.length &&
      value.text.slice(item.start, end) === JSON.stringify(item.module) &&
      (!item.module.startsWith('.') ||
        parts(
          [...value.source.split('/').slice(0, -1), item.module].join('/'),
        ) !== undefined)
    );
  });
}

const parts = (value) => {
  const result = [];
  for (const part of value.split('/')) {
    if (part === '..') {
      if (!result.length) return undefined;
      result.pop();
    } else if (part && part !== '.') result.push(part);
  }
  return result;
};
const relative = (from, to) => {
  while (from.length && to.length && from[0] === to[0]) {
    from.shift();
    to.shift();
  }
  const value = [...from.map(() => '..'), ...to].join('/');
  return value.startsWith('.') ? value : `./${value}`;
};

/** Rebase only the module literal tokens the compiler identified in the expression. */
export function typeExpressionText(type, source = type.typescript.source) {
  if (!validTypeExpression(type) || !typeSourcePath(source))
    throw new Error('Invalid TypeScript parameter expression metadata.');
  const { text, references } = type.typescript;
  const original = type.typescript.source.split('/').slice(0, -1);
  const target = source.split('/').slice(0, -1);
  let result = text;
  for (const item of [...references].reverse()) {
    if (!item.module.startsWith('.')) continue;
    const module = relative(
      [...target],
      parts([...original, item.module].join('/')),
    );
    result =
      result.slice(0, item.start) +
      JSON.stringify(module) +
      result.slice(item.start + item.length);
  }
  return result;
}

/** Whether a document needs the project compiler in addition to structural checks. */
export function hasTypeExpressions(document) {
  return Object.values(document.params ?? {}).some(
    (param) => param.type?.typescript !== undefined,
  );
}
