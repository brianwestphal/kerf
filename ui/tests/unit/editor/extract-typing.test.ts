// KF-JE8KHX: Extract to document keeps an optional item field optional, so
// the composing module and the extracted row module type-check together under
// the package's strict compiler options.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { generateView, validateView, type ViewDocument } from '@kerfjs/ui/view';
import ts from 'typescript';
import { afterEach, describe, expect, it } from 'vitest';

import {
  type Extraction,
  extractToDocument,
} from '../../../src/editor/model/extract.js';
import { viewCatalog } from './kerf-catalog.js';

const uiRoot = resolve(import.meta.dirname, '../../..');
const ROW = '01JC0V1EW0000000000000000T';
const VIEW = '01JC0V1EW0000000000000000W';

/** An inbox whose rows read an optional `subject` and a required `id`. */
const inbox = {
  schema: 'kerf-ui-document/v1',
  name: 'Inbox',
  catalogs: ['@kerfjs/ui'],
  params: {
    messages: {
      type: {
        kind: 'array',
        items: {
          kind: 'object',
          props: [
            { name: 'id', type: { kind: 'string' }, required: true },
            { name: 'subject', type: { kind: 'string' }, required: false },
          ],
        },
      },
      default: [{ id: 'm1' }, { id: 'm2', subject: 'Lunch on Friday' }],
    },
  },
  root: {
    id: '01JC0V1EW0000000000000000S',
    type: '@kerfjs/ui:list',
    props: { ariaLabel: 'Messages' },
    zones: {
      children: [
        {
          $each: { $param: 'messages' },
          as: 'message',
          key: 'message.id',
          template: {
            id: ROW,
            type: '@kerfjs/ui:list-item',
            props: {
              action: { $action: 'open-message' },
              label: { $bind: 'message.id' },
              description: { $bind: 'message.subject' },
            },
          },
        },
      ],
    },
  },
} as unknown as ViewDocument;

let scratch: string | undefined;
afterEach(() => {
  if (scratch) rmSync(scratch, { recursive: true, force: true });
  scratch = undefined;
});

/** The compiler's messages for `files`, under the package's tsconfig. */
function typeErrors(files: readonly string[]): string[] {
  const config = ts.getParsedCommandLineOfConfigFile(
    join(uiRoot, 'tsconfig.json'),
    {},
    { ...ts.sys, onUnRecoverableConfigFileDiagnostic: () => undefined },
  )!;
  const program = ts.createProgram([...files, join(uiRoot, 'src/css.d.ts')], {
    ...config.options,
    noEmit: true,
  });
  return ts
    .getPreEmitDiagnostics(program)
    .filter((diagnostic) => files.includes(diagnostic.file?.fileName ?? ''))
    .map((diagnostic) =>
      ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'),
    );
}

describe(
  'Extract to document with an optional item field',
  { timeout: 60_000 },
  () => {
    it('makes it an optional param, and both generated modules type-check', () => {
      const result = extractToDocument(inbox, ROW, {
        documentPath: 'views/inbox.kui.json',
        path: 'views/inbox-row.kui.json',
        view: VIEW,
        catalog: viewCatalog,
      });
      if ('error' in result) throw new Error(result.error);
      const { document, extracted, src } = result as Extraction;
      // The required field stays required; the optional one is optional, with
      // no default, so an absent subject still reads as absent.
      expect(extracted.params).toEqual({
        id: { type: { kind: 'string' } },
        subject: { type: { kind: 'string' }, optional: true },
      });
      const resolveView = (name: string) =>
        name === src ? extracted : undefined;
      expect(
        validateView(document, viewCatalog, { resolveView }).diagnostics,
      ).toEqual([]);
      expect(validateView(extracted, viewCatalog).diagnostics).toEqual([]);

      const list = generateView(document, viewCatalog, {
        source: 'inbox.kui.json',
        resolveView,
      }).code;
      const row = generateView(extracted, viewCatalog, {
        source: 'inbox-row.kui.json',
      }).code;
      expect(row).toContain('readonly id: string;');
      expect(row).toContain('readonly subject?: string;');
      expect(row).toContain('description: inputs.subject,');
      expect(list).toContain(
        'renderInboxRow({ id: message.id, subject: message.subject })',
      );

      mkdirSync(join(uiRoot, 'test-results'), { recursive: true });
      scratch = mkdtempSync(join(uiRoot, 'test-results/kui-extract-'));
      const listFile = join(scratch, 'inbox.view.ts');
      const rowFile = join(scratch, 'inbox-row.view.ts');
      writeFileSync(listFile, list);
      writeFileSync(rowFile, row);
      // The composing module is used, as an application would.
      const appFile = join(scratch, 'app.ts');
      writeFileSync(
        appFile,
        "import { renderInbox } from './inbox.view.js';\nexport const html = renderInbox({ messages: [{ id: 'm1' }] }).toString();\n",
      );
      expect(typeErrors([listFile, rowFile, appFile])).toEqual([]);
    });
  },
);
