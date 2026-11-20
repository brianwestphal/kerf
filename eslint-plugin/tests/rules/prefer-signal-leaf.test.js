import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import parser from '@typescript-eslint/parser';
import { Linter } from 'eslint';

import plugin from '../../index.js';

const imports = `import {mount as show,signal as cell,computed as derive} from 'kerfjs';
const root = document.body, name = cell('a'), n = derive(() => 1);
const widget = {value:'x'}, markup = cell({html:'<i/>'}), maybe = cell<string|null>('x');
const erased: {value:string} = cell('x');
const nullable: ReturnType<typeof cell<string>> | null = cell('x');
const rich = cell<string | {html:string}>('x'), nonScalar = cell([1]), callable = cell(()=>1);
declare function Widget(props:any): any;`;
const types = `declare module 'kerfjs' {
 interface Signal<T> {value:T; peek(): T}
 export function signal<T>(x:T):Signal<T>;
 export function computed<T>(f:()=>T):Readonly<Signal<T>>;
 export function mount(el:Element,f:()=>unknown):void;
}`;

test('suggests only resolved, stable scalar leaves in ordinary mounted JSX', (t) => {
  const cwd = mkdtempSync(join(tmpdir(), 'kerf-signal-leaves-'));
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  writeFileSync(join(cwd, 'decl.d.ts'), types);
  const cases = [
    [
      'show(root,()=> <span>{nullable.value}{rich.value}{nonScalar.value}{callable.value}</span>);',
      0,
    ],
    ['show(root,()=> <span title={name.value} title="static"/>);', 0],
    [
      'show(root,()=> <div>{true ? <span>{name.value}</span> : null}</div>);',
      0,
    ],
    [
      'show(root,()=> <span>{maybe.value == null ? "" : maybe.value}</span>);',
      0,
    ],
    [
      'show(root,()=> <div><span title={name.value}>{n.value}</span></div>);',
      2,
    ],
    ['show(root,function(){return <><div>{name.value}</div></>});', 1],
    ['show(root,()=> <span title={n.value}>{markup.value}</span>);', 0],
    [
      'show(root,()=> <span>{widget.value}{erased.value}{maybe.value}</span>);',
      0,
    ],
    [
      'show(root,()=> <span>{name.value + "!"}{name.value && <span/>}</span>);',
      0,
    ],
    [
      'show(root,()=> <Widget text={name.value}><span>{name.value}</span></Widget>);',
      0,
    ],
    [
      'show(root,()=> <div data-morph-skip><span>{name.value}</span></div>);',
      0,
    ],
    ['show(root,()=> <span {...widget}>{name.value}</span>);', 0],
    [
      'show(root,()=> <div contentEditable><span>{name.value}</span></div>);',
      0,
    ],
    ['show(root,()=> <input value={name.value}/>);', 0],
    ['show(root,()=> <textarea>{name.value}</textarea>);', 0],
    ['show(root,()=> <svg><title>{name.value}</title></svg>);', 0],
    ['show(root,()=> <x-label>{name.value}</x-label>);', 0],
    [
      'show(root,()=>{const name=cell("local");return <span>{name.value}</span>;});',
      0,
    ],
    [
      'function unrelated(show: typeof import("kerfjs").mount){show(root,()=> <span>{name.value}</span>);}',
      0,
    ],
    [
      'function wrapper(cell:(v:string)=>{value:string}){const s=cell("x");show(root,()=> <span>{s.value}</span>);}',
      0,
    ],
    ['show(root,()=> <span title={name /* keep */.value}/>);', 0],
    ['const box = <span>{name.value}</span>;', 0],
    [
      'const f = (x:unknown)=>x; show(root,()=>f(<span>{name.value}</span>));',
      0,
    ],
  ];
  const source = imports + '\n' + cases.map(([line]) => line).join('\n');
  writeFileSync(join(cwd, 'app.tsx'), source);
  const pragma = '/** @jsxImportSource solid-js */\n' + source;
  writeFileSync(join(cwd, 'other.tsx'), pragma);
  function config(file = 'tsconfig.json', jsxImportSource = 'kerfjs') {
    writeFileSync(
      join(cwd, file),
      JSON.stringify({
        compilerOptions: {
          strict: true,
          jsx: 'react-jsx',
          jsxImportSource,
          target: 'ES2022',
          module: 'ESNext',
          skipLibCheck: true,
        },
        include: ['*.tsx', '*.ts'],
      }),
    );
  }
  config();
  config('foreign.json', 'react');
  const lint = (code, file, project) =>
    new Linter({ cwd }).verify(
      code,
      [
        {
          files: ['**/*.tsx'],
          languageOptions: {
            parser,
            parserOptions: {
              project: project && join(cwd, project),
              tsconfigRootDir: cwd,
            },
          },
          plugins: { kerfjs: plugin },
          rules: { 'kerfjs/prefer-signal-leaf': 'warn' },
        },
      ],
      { filename: join(cwd, file) },
    );
  const messages = lint(source, 'app.tsx', 'tsconfig.json');
  assert.ok(
    messages.every((m) => m.messageId === 'leaf'),
    JSON.stringify(messages),
  );
  const first = imports.split('\n').length + 1;
  for (const [index, [line, count]] of cases.entries())
    assert.equal(
      messages.filter((m) => m.line === first + index).length,
      count,
      line,
    );
  for (const m of messages) {
    assert.equal(m.fix, undefined);
    assert.equal(m.suggestions.length, 1);
    const edit = m.suggestions[0].fix;
    assert.equal(source.slice(...edit.range), edit.text + '.value');
  }
  assert.deepEqual(lint(source, 'app.tsx', undefined), []);
  assert.deepEqual(
    new Linter({ cwd }).verify(
      "import { mount, signal } from 'kerfjs'; const s = signal('x'); mount(document.body, () => <span>{s.value}</span>);",
      [
        {
          languageOptions: { parserOptions: { ecmaFeatures: { jsx: true } } },
          plugins: { kerfjs: plugin },
          rules: { 'kerfjs/prefer-signal-leaf': 'warn' },
        },
      ],
      { filename: join(cwd, 'ordinary.js') },
    ),
    [],
  );
  assert.deepEqual(lint(pragma, 'other.tsx', 'tsconfig.json'), []);
  assert.deepEqual(lint(source, 'app.tsx', 'foreign.json'), []);
  for (const preset of Object.values(plugin.configs))
    assert.equal(preset.rules?.['kerfjs/prefer-signal-leaf'], undefined);
});
