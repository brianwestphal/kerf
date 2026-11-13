// @vitest-environment node
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  createViewCatalog,
  generateView,
  type ViewDocument,
} from '../../view/index.mjs';
import { createProjectTypeService } from '../../view/project-types.mjs';
import {
  containedTypeExpression,
  typeExpressionText,
  validTypeExpression,
} from '../../view/type-expression.mjs';

const ui = resolve(import.meta.dirname, '../..');
const repo = resolve(ui, '..');
const catalog = createViewCatalog({
  props: [
    JSON.parse(readFileSync(join(ui, 'ai/component-props.json'), 'utf8')),
  ],
  composition: [
    JSON.parse(readFileSync(join(ui, 'ai/component-composition.json'), 'utf8')),
  ],
});
let root: string;
let service: ReturnType<typeof createProjectTypeService>;
beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'kerf-project-types-'));
  mkdirSync(join(root, 'src'));
  mkdirSync(join(root, 'views'));
  writeFileSync(
    join(root, 'src/types.ts'),
    'export interface MyCustomType { id: string; label?: string }\nexport type Tone = "brand" | "danger";\n',
  );
  writeFileSync(
    join(root, 'tsconfig.json'),
    JSON.stringify({
      compilerOptions: {
        strict: true,
        module: 'ESNext',
        moduleResolution: 'Bundler',
        target: 'ES2022',
        paths: {
          kerfjs: [join(repo, 'dist/index.d.ts')],
          'kerfjs/*': [join(repo, 'dist/*')],
          '@kerfjs/ui/*': [join(ui, 'dist/*')],
        },
      },
      include: ['src/**/*.ts'],
    }),
  );
  service = createProjectTypeService(root);
});
afterEach(() => {
  service.dispose();
  rmSync(root, { recursive: true, force: true });
});

const source = 'views/card.kui.json';
const document = (type: unknown, value?: unknown): ViewDocument => ({
  schema: 'kerf-ui-document/v1',
  name: 'TypedCard',
  catalogs: ['@kerfjs/ui'],
  params: {
    tone: {
      type: type as never,
      ...(value === undefined ? {} : { default: value }),
    },
  },
  root: {
    id: '01JB8Z1M6Q8E1X9V4S7K2R3T5A',
    type: '@kerfjs/ui:button',
    props: { children: 'Open', tone: { $param: 'tone' } },
  },
});

describe('owning-project TypeScript parameters', () => {
  it('resolves project exports inside generics and preserves portable import context', () => {
    const result = service.analyze({
      source,
      text: 'Array<string | number | MyCustomType>',
    });
    expect(result.diagnostics).toEqual([]);
    expect(result.type).toMatchObject({
      kind: 'array',
      typescript: { source },
    });
    expect(result.type!.typescript.text).toContain(
      'import("../src/types.js").MyCustomType',
    );
    expect(result.type!.items).toMatchObject({ kind: 'union' });
    expect(validTypeExpression(result.type)).toBe(true);
    expect(
      typeExpressionText(result.type!, 'other/deep/card.kui.json'),
    ).toContain('import("../../src/types.js").MyCustomType');
    expect(JSON.parse(JSON.stringify(result.type))).toEqual(result.type);
  });

  it('returns real compiler errors and accepts expressive types without nested forms', () => {
    for (const text of [
      'Record<string, readonly [number, boolean?]>',
      '({ id: string } & { label?: string })[]',
      '<T extends string>(value: T) => Promise<T>',
      '`id-${number}`',
    ]) {
      expect(service.analyze({ source, text }).diagnostics, text).toEqual([]);
    }
    expect(
      service.analyze({ source, text: 'MissingProjectType' }).diagnostics[0]
        .message,
    ).toContain('Cannot find name');
    expect(
      service.analyze({ source, text: 'Array<string' }).diagnostics[0].message,
    ).toContain('complete TypeScript type');
    expect(
      service.analyze({ source, text: 'string; export const escaped = 1' })
        .type,
    ).toBeUndefined();
  });

  it('offers project symbol completions and formats actual TypeScript syntax', () => {
    const result = service.analyze({ source, text: 'MyCus', cursor: 5 });
    const suggestion = result.suggestions.find(
      (item) => item.name === 'MyCustomType',
    );
    expect(suggestion).toBeDefined();
    expect(
      service.analyze({ source, text: suggestion!.text }).diagnostics,
    ).toEqual([]);
    const formatted = service.analyze({
      source,
      text: '{id:string;label?:Array<number|string>}',
    });
    expect(formatted.type!.typescript.text).toContain('id: string;');
    expect(formatted.type!.typescript.text).toContain('Array<number | string>');
    // KF-SNM61J: a caller that will not show suggestions skips completions,
    // and the analysis is otherwise the same.
    const quiet = service.analyze({
      source,
      text: 'MyCus',
      cursor: 5,
      suggest: false,
    });
    expect(quiet.suggestions).toEqual([]);
    expect(quiet.diagnostics).toEqual(
      service.analyze({ source, text: 'MyCus', cursor: 5 }).diagnostics,
    );
    expect(
      service.analyze({ source, text: 'MyCustomType', suggest: false }).type!
        .typescript.text,
    ).toMatch(/import\(".*"\)\.MyCustomType/);
  });

  it('discovers new project files and preserves legacy content semantics', () => {
    service.analyze({ source, text: 'string' });
    writeFileSync(
      join(root, 'src/new.ts'),
      'export interface NewlyAdded { count: number }',
    );
    expect(service.analyze({ source, text: 'NewlyAdded' }).diagnostics).toEqual(
      [],
    );
    const content = service.analyze({
      source,
      text: 'SafeHtml',
      declared: { kind: 'content' },
      catalog,
    });
    expect(content.diagnostics).toEqual([]);
    expect(content.type!.typescript.text).toContain(
      'import("kerfjs").SafeHtml',
    );
  });

  it('recognizes barrel re-exports as the same project declaration', () => {
    writeFileSync(
      join(root, 'src/index.ts'),
      'export type { MyCustomType } from "./types.js";',
    );
    expect(
      service.analyze({ source, text: 'MyCustomType' }).diagnostics,
    ).toEqual([]);
  });

  it('does not auto-pick ambiguous project names', () => {
    writeFileSync(
      join(root, 'src/other.ts'),
      'export interface MyCustomType { other: number }',
    );
    service.dispose();
    service = createProjectTypeService(root);
    expect(
      service.analyze({ source, text: 'MyCustomType' }).diagnostics[0].message,
    ).toContain('Cannot find name');
    expect(
      service.analyze({
        source,
        text: 'import("../src/other.js").MyCustomType',
      }).diagnostics,
    ).toEqual([]);
  });

  it('compiles generated bindings and defaults instead of trusting the projection', () => {
    const tone = service.analyze({ source, text: 'Tone' }).type!;
    expect(
      service.validateDocument(document(tone), catalog, source).diagnostics,
    ).toEqual([]);
    const wrong = service.analyze({ source, text: 'number' }).type!;
    expect(
      service
        .validateDocument(document(wrong), catalog, source)
        .diagnostics.map((item) => item.message)
        .join('\n'),
    ).toContain('not assignable');
    expect(
      service
        .validateDocument(document(tone, 123), catalog, source)
        .diagnostics.map((item) => item.message)
        .join('\n'),
    ).toContain('not assignable');
    const stale = { kind: 'number', typescript: tone.typescript };
    expect(
      service.validateDocument(document(stale), catalog, source).document
        .params!.tone.type.kind,
    ).toBe('enum');
  });

  it('rechecks project changes and rejects forged syntax/import escapes', () => {
    const tone = service.analyze({ source, text: 'Tone' }).type!;
    writeFileSync(join(root, 'src/types.ts'), 'export type Tone = number;');
    expect(
      service
        .validateDocument(document(tone), catalog, source)
        .diagnostics.map((item) => item.message)
        .join('\n'),
    ).toContain('not assignable');
    expect(() =>
      service.analyze({ source, text: 'import("../../outside.js").Hidden' }),
    ).toThrow('inside the project');
    expect(() =>
      service.analyze({ source, text: 'import("/tmp/outside.js").Hidden' }),
    ).toThrow('inside the project');
    const forged = {
      ...tone,
      typescript: {
        ...tone.typescript,
        text: 'string; export const escaped = 1',
        references: [],
      },
    };
    expect(
      service.validateDocument(document(forged), catalog, source).diagnostics[0]
        .message,
    ).toContain('one TypeScript');
    expect(() => generateView(document(forged), catalog)).toThrow();
  });
});

describe('expression transport containment', () => {
  it('keeps arbitrary type syntax inside its generated type position', () => {
    for (const text of [
      'string',
      '(x: string) => number',
      '<A, B>(x: A) => B',
      '{ readonly [K in "x" | "y"]?: number }',
      '`key-${"a" | "b"}`',
      '"export const x=1;"',
    ])
      expect(containedTypeExpression(text), text).toBe(true);
    for (const text of [
      '',
      'string); alert(1); (',
      'string; export const x=1',
      'string /* unclosed',
      'string = number',
      '{x:string',
      '"unclosed',
    ])
      expect(containedTypeExpression(text), text).toBe(false);
  });
});
