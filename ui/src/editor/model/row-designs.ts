// Row designs (KF-1CRGP1): an `$each` template may be an `$if` chain whose
// every branch is one keyable row node, so a list picks a row design per
// item. `else` is required, so the last design shows for every item no
// earlier one takes, and a chain of one design is that node again. Every
// edit is a pure transform over the chain's branch list.
import {
  channelOf,
  type ViewCatalog,
  type ViewDocument,
  type ViewNode,
  type ViewTemplate,
  type ViewValue,
} from '@kerfjs/ui/view';

import { controlOf, setTemplate, sources } from './control-flow.js';
import { findNode, type TemplateBranch, visitNodes } from './document.js';
import { addsProblems, type BindingOption, copyChild } from './edits.js';

/** The template that shows `branches` in order; the last one is the `else`. */
function chainOf(branches: readonly TemplateBranch[]): ViewTemplate {
  const [first, ...rest] = branches as [TemplateBranch, ...TemplateBranch[]];
  return rest.length
    ? { $if: first.condition!, then: first.node, else: chainOf(rest) }
    : first.node;
}

/** The row designs around repeated node `id`: its template's branches. */
function designsOf(document: ViewDocument, id: string) {
  const control = controlOf(document, id);
  if (!control?.repeat) return undefined;
  return (
    control.rows ?? {
      branches: [{ node: findNode(document, id)!.node }],
      index: 0,
    }
  );
}

/**
 * Adds row design `node`, shown for the items where `condition` holds, to
 * the list that repeats node `id`. It goes before the last design, which
 * stays the one for every other item; a one-node template becomes that last
 * design. Unchanged when node `id` does not repeat.
 */
export function addRowDesign(
  document: ViewDocument,
  id: string,
  node: ViewNode,
  condition: ViewValue,
): ViewDocument {
  const designs = designsOf(document, id);
  if (!designs) return document;
  const branches = [...designs.branches];
  branches.splice(branches.length - 1, 0, { node, condition });
  return setTemplate(document, id, chainOf(branches));
}

/**
 * Removes row design `id` from its list. Removing the last design makes the
 * one before it the design for every other item, and a chain left with one
 * design becomes that node. Unchanged for a one-node template, which is
 * removed as any node is.
 */
export function removeRowDesign(
  document: ViewDocument,
  id: string,
): ViewDocument {
  const rows = controlOf(document, id)?.rows;
  if (!rows) return document;
  const rest = rows.branches.filter((_, at) => at !== rows.index);
  return setTemplate(document, id, chainOf(rest));
}

/**
 * Shows row design `id` for the items where `condition` holds. Unchanged for
 * the last design, which takes every other item.
 */
export function setRowCondition(
  document: ViewDocument,
  id: string,
  condition: ViewValue,
): ViewDocument {
  const rows = controlOf(document, id)?.rows;
  if (!rows || rows.index === rows.branches.length - 1) return document;
  const branches = rows.branches.map((branch, at) =>
    at === rows.index ? { ...branch, condition } : branch,
  );
  return setTemplate(document, id, chainOf(branches));
}

/**
 * The params and item fields that can pick a row design in the list that
 * repeats node `id`: each one the validator accepts as a branch condition
 * there, judged on a probe chain that adds a copy of the node.
 */
export function rowConditionOptions(
  document: ViewDocument,
  catalog: ViewCatalog,
  id: string,
): BindingOption[] {
  const designs = designsOf(document, id);
  if (!designs) return [];
  const names = new Set(
    visitNodes(document).flatMap(({ node }) => (node.name ? [node.name] : [])),
  );
  let count = 0;
  const probe = copyChild(
    designs.branches[designs.index]!.node,
    names,
    // Well-formed ids, so the probe adds no id problems of its own.
    () => String((count += 1)).padStart(26, '0'),
  );
  return sources(document, id)
    .filter(
      ({ value }) =>
        !addsProblems(
          document,
          addRowDesign(document, id, probe, value),
          catalog,
        ),
    )
    .map(({ label, value }) => ({ label, value }));
}

/** The components in `choices` that can be a row: each has a `data-*` channel. */
export function rowDesignChoices<Choice extends { readonly value: string }>(
  catalog: ViewCatalog,
  choices: readonly Choice[],
): Choice[] {
  return choices.filter((choice) => {
    const entry = catalog.components.get(choice.value);
    return (
      entry !== undefined &&
      channelOf(entry.component as Parameters<typeof channelOf>[0]) !== 'none'
    );
  });
}
