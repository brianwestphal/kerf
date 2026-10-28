// Exporting a document's generated view module (docs/26-ui-editor.md §4, §6)
// and summarizing its contract changes since the previous export.
import {
  diffContracts,
  generateView,
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
