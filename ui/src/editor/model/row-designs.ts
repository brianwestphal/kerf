// Row designs (KF-1CRGP1): an `$each` template may be an `$if` chain whose
// every branch is one keyable row node, so a list picks a row design per
// item. `else` is required, so the last design shows for every item no
// earlier one takes, and a chain of one design is that node again. Or
// (KF-YX6HMT) an `$each` keeps one row node per item kind in `templates`,
// picked by its `kind`, with a required `default` for every other kind.
// Every edit is a pure transform over the list of designs.
import {
  channelOf,
  type ViewCatalog,
  type ViewDocument,
  type ViewNode,
  type ViewTemplate,
  type ViewValue,
} from '@kerfjs/ui/view';

import { controlOf, setRows, setTemplate, sources } from './control-flow.js';
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
  // A list keyed by kind adds kinds instead.
  if (!designs || designs.kind !== undefined) return document;
  const branches = [...designs.branches];
  branches.splice(branches.length - 1, 0, { node, condition });
  return setTemplate(document, id, chainOf(branches));
}

/**
 * Removes row design `id` from its list. Removing the last design makes the
 * one before it the design for every other item, and a chain left with one
 * design becomes that node. In a list keyed by kind, the `default` design
 * stays, and a map left with only it becomes that node. Unchanged for a
 * one-node template, which is removed as any node is.
 */
export function removeRowDesign(
  document: ViewDocument,
  id: string,
): ViewDocument {
  const rows = controlOf(document, id)?.rows;
  if (!rows) return document;
  const rest = rows.branches.filter((_, at) => at !== rows.index);
  if (rows.kind === undefined) return setTemplate(document, id, chainOf(rest));
  if (rows.branches[rows.index]!.kind === 'default') return document;
  return withKinds(document, id, rest, rows.kind);
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
  if (
    !rows ||
    rows.kind !== undefined ||
    rows.index === rows.branches.length - 1
  )
    return document;
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
  if (!designs || designs.kind !== undefined) return [];
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

/**
 * KF-YX6HMT: `branches` (each with its kind) as a `templates` map picked by
 * `kind`; one left, the `default`, becomes a plain template again.
 */
function withKinds(
  document: ViewDocument,
  id: string,
  branches: readonly TemplateBranch[],
  kind: ViewValue,
): ViewDocument {
  if (branches.length === 1)
    return setTemplate(document, id, branches[0]!.node);
  return setRows(document, id, {
    templates: Object.fromEntries(
      branches.map((branch) => [branch.kind!, branch.node]),
    ) as never,
    kind,
  });
}

/** Whether the designs around a node are an `$if` chain (no kind). */
const isChain = (designs: { branches: readonly unknown[]; kind?: unknown }) =>
  designs.kind === undefined && designs.branches.length > 1;

/**
 * Picks the rows of the list that repeats node `id` by the item's `kind`:
 * a one-node template becomes the `default` design of a `templates` map,
 * and a map's `kind` is replaced. Unchanged for an `$if` chain, or a node
 * that does not repeat.
 */
export function setRowKind(
  document: ViewDocument,
  id: string,
  kind: ViewValue,
): ViewDocument {
  const designs = designsOf(document, id);
  if (!designs || isChain(designs)) return document;
  const branches =
    designs.kind === undefined
      ? [{ node: designs.branches[0]!.node, kind: 'default' }]
      : designs.branches;
  return setRows(document, id, {
    templates: Object.fromEntries(
      branches.map((branch) => [branch.kind!, branch.node]),
    ) as never,
    kind,
  });
}

/** Why `name` cannot name a new or renamed kind among `branches`, if not. */
function kindProblem(
  branches: readonly TemplateBranch[],
  name: string,
): string | undefined {
  if (!name) return 'A kind is a name, such as header.';
  if (branches.some((branch) => branch.kind === name))
    return `This list already has a ${name} design.`;
  return undefined;
}

/**
 * Adds row design `node` for the items whose kind is `name` to the list
 * keyed by kind that repeats node `id`.
 */
export function addKind(
  document: ViewDocument,
  id: string,
  name: string,
  node: ViewNode,
): { document: ViewDocument } | { error: string } {
  const rows = controlOf(document, id)?.rows;
  if (rows?.kind === undefined)
    return { error: 'This list does not pick its rows by kind.' };
  const error = kindProblem(rows.branches, name);
  if (error) return { error };
  return {
    document: withKinds(
      document,
      id,
      [...rows.branches, { node, kind: name }],
      rows.kind,
    ),
  };
}

/**
 * Renames row design `id`'s kind, keeping its place. The `default` design
 * keeps its name, since every other kind falls back to it.
 */
export function renameKind(
  document: ViewDocument,
  id: string,
  name: string,
): { document: ViewDocument } | { error: string } {
  const rows = controlOf(document, id)?.rows;
  if (rows?.kind === undefined)
    return { error: 'This list does not pick its rows by kind.' };
  const current = rows.branches[rows.index]!.kind;
  if (current === name) return { document };
  if (current === 'default')
    return { error: 'The default design keeps its name.' };
  const error = kindProblem(rows.branches, name);
  if (error) return { error };
  return {
    document: withKinds(
      document,
      id,
      rows.branches.map((branch, at) =>
        at === rows.index ? { ...branch, kind: name } : branch,
      ),
      rows.kind,
    ),
  };
}

/**
 * The params and item fields that can pick the row designs of the list that
 * repeats node `id` by kind: each one the validator accepts as its `kind`.
 */
export function rowKindOptions(
  document: ViewDocument,
  catalog: ViewCatalog,
  id: string,
): BindingOption[] {
  const designs = designsOf(document, id);
  if (!designs || isChain(designs)) return [];
  return sources(document, id)
    .filter(
      ({ value }) =>
        !addsProblems(document, setRowKind(document, id, value), catalog),
    )
    .map(({ label, value }) => ({ label, value }));
}
