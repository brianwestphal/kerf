import { readFileSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import ts from 'typescript';

import modes from '../ai/choice-wiring-mode.cjs';

const catalog = JSON.parse(
  readFileSync(
    new URL('../ai/component-catalog.json', import.meta.url),
    'utf8',
  ),
);
const supported = catalog.entries.filter((entry) =>
  ['combobox', 'choice-chips'].includes(entry.id),
);
const inside = (root, file) => {
  const path = relative(root, file);
  return !isAbsolute(path) && path !== '..' && !path.startsWith('..' + sep);
};

function visit(node, fn) {
  fn(node);
  node.forEachChild((child) => {
    visit(child, fn);
  });
}

function location(root, node) {
  const file = node.getSourceFile();
  const { line, character } = file.getLineAndCharacterOfPosition(
    node.getStart(),
  );
  return `${relative(root, file.fileName).split(sep).join('/')}:${line + 1}:${character + 1}`;
}

// Follow only import/export aliases. A wrapper function with the same name
// has its own contract. Stopping there is more useful than guessing its props.
function imported(checker, node) {
  if (ts.isPropertyAccessExpression(node)) {
    const declaration = checker
      .getSymbolAtLocation(node.expression)
      ?.declarations?.find(ts.isNamespaceImport);
    const from = declaration?.parent.parent.moduleSpecifier?.text;
    if (
      from &&
      (from === 'kerfjs' ||
        from === '@kerfjs/ui' ||
        from.startsWith('@kerfjs/ui/'))
    )
      return { from, name: node.name.text };
  }
  let symbol = checker.getSymbolAtLocation(node);
  const seen = new Set();
  while (symbol && !seen.has(symbol)) {
    seen.add(symbol);
    for (const decl of symbol.declarations ?? []) {
      if (!ts.isImportSpecifier(decl) && !ts.isExportSpecifier(decl)) continue;
      const owner = ts.isImportSpecifier(decl)
        ? decl.parent.parent.parent
        : decl.parent.parent;
      const from = owner.moduleSpecifier?.text;
      if (
        from === 'kerfjs' ||
        from === '@kerfjs/ui' ||
        from?.startsWith('@kerfjs/ui/')
      )
        return { from, name: (decl.propertyName ?? decl.name).text };
    }
    if (!(symbol.flags & ts.SymbolFlags.Alias)) break;
    symbol = checker.getImmediateAliasedSymbol(symbol);
  }
  return null;
}

function programFor(root, file) {
  const config = ts.findConfigFile(dirname(file), ts.sys.fileExists);
  if (config && inside(root, config)) {
    const parsed = ts.getParsedCommandLineOfConfigFile(
      config,
      {},
      {
        ...ts.sys,
        onUnRecoverableConfigFileDiagnostic: (d) => {
          throw new Error(ts.flattenDiagnosticMessageText(d.messageText, '\n'));
        },
      },
    );
    if (!parsed) throw new Error('Cannot read the consumer tsconfig.');
    return ts.createProgram(
      [...new Set([...parsed.fileNames, file])],
      parsed.options,
    );
  }
  return ts.createProgram([file], {
    allowJs: true,
    jsx: ts.JsxEmit.Preserve,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.Latest,
  });
}

function selectedTag(source, line, column) {
  const starts = source.getLineStarts();
  if (
    line < 1 ||
    line > starts.length ||
    column < 1 ||
    starts[line - 1] + column - 1 >= (starts[line] ?? source.end + 1)
  )
    throw new Error('The JSX location falls outside the file.');
  const pos = starts[line - 1] + column - 1;
  let target;
  visit(source, (node) => {
    if (
      (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) &&
      node.getStart() <= pos &&
      pos < node.end
    )
      target = node;
  });
  if (!target) throw new Error('Choose a position inside a JSX opening tag.');
  return target;
}

function mountRoot(checker, target) {
  for (let node = target.parent; node; node = node.parent) {
    if (
      !ts.isCallExpression(node) ||
      !node.arguments[1] ||
      target.pos < node.arguments[1].pos ||
      target.end > node.arguments[1].end
    )
      continue;
    const api = imported(checker, node.expression);
    if (api?.from === 'kerfjs' && api.name === 'mount')
      return node.arguments[0];
  }
}

function observedCalls(checker, files, root, binding, host) {
  const setups = [];
  const releases = new Map();
  // Gather identifier calls by symbol, so a shadowed disposer name cannot
  // provide false evidence of cleanup. Calls observed in dormant code are
  // still reported only as syntax.
  for (const file of files)
    visit(file, (node) => {
      if (!ts.isCallExpression(node)) return;
      if (ts.isIdentifier(node.expression)) {
        const sym = checker.getSymbolAtLocation(node.expression);
        if (sym) {
          let sites = releases.get(sym);
          if (!sites) releases.set(sym, (sites = []));
          sites.push(location(root, node));
        }
      }
      const api = imported(checker, node.expression);
      if (
        api?.name !== binding.export ||
        ![binding.import, '@kerfjs/ui', binding.componentImport].includes(
          api.from,
        )
      )
        return;
      const arg = node.arguments[0];
      const local =
        ts.isVariableDeclaration(node.parent) &&
        ts.isIdentifier(node.parent.name)
          ? node.parent.name
          : null;
      const same =
        arg &&
        host &&
        ts.isIdentifier(arg) &&
        ts.isIdentifier(host) &&
        checker.getSymbolAtLocation(arg) !== undefined &&
        checker.getSymbolAtLocation(arg) === checker.getSymbolAtLocation(host);
      setups.push({
        site: location(root, node),
        root: arg?.getText() ?? null,
        rootEvidence: same ? 'same binding in source' : 'relationship unknown',
        retention: local
          ? 'assigned'
          : ts.isReturnStatement(node.parent)
            ? 'returned'
            : ts.isExpressionStatement(node.parent)
              ? 'discarded'
              : 'unknown',
        symbol: local && checker.getSymbolAtLocation(local),
      });
    });
  return setups
    .map(({ symbol, ...rest }) => ({
      ...rest,
      cleanupCalls: symbol ? (releases.get(symbol) ?? []) : [],
    }))
    .sort((a, b) => a.site.localeCompare(b.site));
}

export function explainUse(root, position) {
  const match = /^(.+):(\d+):(\d+)$/.exec(position);
  if (!match)
    throw new Error('--explain-use expects file:line:column (one-based).');
  const file = resolve(root, match[1]);
  if (!inside(root, file) || !ts.sys.fileExists(file))
    throw new Error('Select an existing file inside the workspace.');
  const program = programFor(root, file);
  const checker = program.getTypeChecker();
  const use = selectedTag(
    program.getSourceFile(file),
    Number(match[2]),
    Number(match[3]),
  );
  const name = imported(checker, use.tagName);
  const entry = supported.find(
    (e) =>
      e.name === name?.name &&
      [e.delivery.browserImport, '@kerfjs/ui'].includes(name.from),
  );
  const result = {
    schemaVersion: 1,
    location: location(root, use),
    tag: use.tagName.getText(),
    component: entry?.name ?? null,
  };
  if (!entry)
    return {
      ...result,
      unknown: [
        'Component provenance or wrapper behavior could not be established. Inspect its public contract.',
      ],
    };
  const attrs = modes.tsAttributes(ts, use);
  const { mode, required } =
    entry.id === 'combobox'
      ? { mode: 'free-text suggestions', required: true }
      : modes.choiceMode(attrs);
  const binding = entry.wiring.find((w) => w.required);
  const files = program
    .getSourceFiles()
    .filter(
      (s) =>
        !s.isDeclarationFile &&
        inside(root, s.fileName) &&
        !s.fileName.split(sep).includes('node_modules'),
    );
  const setups = observedCalls(
    checker,
    files,
    root,
    { ...binding, componentImport: entry.delivery.browserImport },
    mountRoot(checker, use),
  );
  const unknown = [];
  if (required === null || mode === 'unknown')
    unknown.push(
      'Dynamic props can select different interaction modes. Resolve the final multiple and overflow values.',
    );
  if (required !== false && !setups.length)
    unknown.push(
      'No setup observed in the inspected sources. Check the application entry point.',
    );
  if (setups.length)
    unknown.push(
      'A call site does not prove execution, root containment or eventual disposal.',
    );
  const action = attrs.findLast(
    ([key]) => key === 'action' || key === '...',
  )?.[1];
  return {
    ...result,
    mode,
    alternatives: mode === 'unknown' ? ['radios', 'checkboxes', 'listbox'] : [],
    required,
    owner: entry.appOwns,
    helper: binding.export,
    behavior: binding.reason,
    event: entry.id === 'combobox' ? 'onCommit' : 'change',
    action: action ?? null,
    setups,
    diagnostics: [
      ...(required === true && !setups.length ? ['KUI-L401'] : []),
      ...(setups.some((s) => s.retention === 'discarded') ? ['KUI-L402'] : []),
    ],
    unknown,
    demo: `?component=${entry.id}`,
    recipe: `@kerfjs/ui/ai/components/${entry.id}.md`,
    signature: `@kerfjs/ui/ai/public-api-signatures-v1.md#kerfjsui${entry.id}`,
    next:
      required === false
        ? 'Use the native input change event.'
        : `At the owning root, retain the disposer returned by ${binding.export} and invoke it when that owner is removed.`,
  };
}

export function formatUse(report) {
  const lines = [`${report.location}  <${report.tag}>`];
  if (!report.component) return [...lines, ...report.unknown].join('\n');
  lines.push(
    `Mode: ${report.mode}`,
    `Application owns: ${report.owner.join('; ')}`,
    `Wiring: ${report.helper} (${report.required === null ? 'depends on props' : report.required ? 'required' : 'optional'})`,
    `Event: ${report.event}${report.action ? ' → ' + report.action : ''}`,
  );
  for (const setup of report.setups) {
    lines.push(
      `  ${setup.site}  root ${setup.root} (${setup.rootEvidence}); disposer ${setup.retention}`,
    );
    for (const call of setup.cleanupCalls)
      lines.push(`    cleanup call: ${call}`);
  }
  lines.push(
    ...report.unknown,
    `${report.diagnostics.join(', ')} ${report.next}`.trim(),
    `Contract: ${report.recipe} · ${report.signature}`,
    `Runnable demo: ${report.demo}`,
  );
  return lines.join('\n');
}
