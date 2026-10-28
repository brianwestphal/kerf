// Exporting a document's generated view module (docs/26-ui-editor.md §4, §6)
// and summarizing its contract changes since the previous export.
import {
  diffContracts,
  generateView,
  readViewHeader,
  type ViewCatalog,
  type ViewContract,
  type ViewDocument,
} from '@kerfjs/ui/view';

import { documentFileName } from './document.js';

export type ExportKind = 'module' | 'declarations';

export interface ExportResult {
  readonly fileName: string;
  readonly code: string;
  readonly contract: ViewContract;
}

/** The module file name for a document (`inbox.kui.json` → `inbox.view.ts`). */
export function moduleFileName(document: ViewDocument): string {
  return documentFileName(document).replace(/\.kui\.json$/, '.view.ts');
}

/**
 * Generates the module exactly as `kerf-ui-view generate` would for a
 * document saved under its file name. `declarations` omits `render<Name>`,
 * for apps that render the document at runtime with interpretView.
 */
export function exportModule(
  document: ViewDocument,
  catalog: ViewCatalog,
  kind: ExportKind,
): ExportResult {
  const generated = generateView(document, catalog, {
    source: documentFileName(document),
    declarationsOnly: kind === 'declarations',
  });
  return {
    fileName: moduleFileName(document),
    code: generated.code,
    contract: generated.contract,
  };
}

const plural = (count: number, word: string) =>
  `${count} ${word}${count === 1 ? '' : 's'}`;

/** One banner's worth of text about what an export changed. */
export function describeExport(
  contract: ViewContract,
  previous: ViewContract | undefined,
): {
  readonly title: string;
  readonly detail: string;
  readonly breaking: boolean;
} {
  if (!previous) {
    const counts = [
      plural(Object.keys(contract.inputs).length, 'input'),
      plural(Object.keys(contract.actions).length, 'action'),
      plural(Object.keys(contract.slots).length, 'slot'),
      plural(Object.keys(contract.refs).length, 'ref'),
    ];
    return {
      title: 'Exported the view module',
      detail: `Its contract has ${counts.join(', ')}.`,
      breaking: false,
    };
  }
  const changes = diffContracts(previous, contract);
  if (changes.length === 0) {
    return {
      title: 'Exported; the contract is unchanged',
      detail:
        'Application code that uses the previous export needs no changes.',
      breaking: false,
    };
  }
  const breaking = changes.filter((change) => change.breaking).length;
  return {
    title: `Exported with ${plural(changes.length, 'contract change')}${breaking ? `, ${breaking} breaking` : ''}`,
    detail: changes
      .map(
        (change) =>
          `${change.breaking ? 'Breaking' : 'Compatible'}: ${change.member} "${change.name}" ${change.change}`,
      )
      .join('; '),
    breaking: breaking > 0,
  };
}

export interface ExportReport {
  readonly title: string;
  readonly detail: string;
  readonly breaking: boolean;
}

/**
 * Compares an existing generated module (the file an app already imports)
 * with the contract the current document would generate. Returns the
 * module's recorded contract, to compare later exports against, and a report
 * of what regenerating would change. A file without a kerf-ui-view header
 * returns no contract.
 */
export function compareWithModule(
  code: string,
  current: ViewContract,
): { readonly contract?: ViewContract; readonly report: ExportReport } {
  const header = readViewHeader(code);
  if (!header) {
    return {
      report: {
        title: 'That file is not a generated view module',
        detail:
          'Choose a .view.ts or .view.js file written by kerf-ui-view or this editor.',
        breaking: true,
      },
    };
  }
  const changes = diffContracts(header.contract, current);
  const breaking = changes.filter((change) => change.breaking).length;
  const edited = header.intact
    ? ''
    : ' The module was also edited by hand; regenerating discards those edits.';
  if (changes.length === 0) {
    return {
      contract: header.contract,
      report: {
        title: 'Regenerating keeps the module’s contract',
        detail: `Application code that uses it needs no changes.${edited}`,
        breaking: !header.intact,
      },
    };
  }
  return {
    contract: header.contract,
    report: {
      title: `Regenerating makes ${plural(changes.length, 'contract change')}${breaking ? `, ${breaking} breaking` : ''}`,
      detail:
        changes
          .map(
            (change) =>
              `${change.breaking ? 'Breaking' : 'Compatible'}: ${change.member} "${change.name}" ${change.change}`,
          )
          .join('; ') + edited,
      breaking: breaking > 0 || !header.intact,
    },
  };
}
