// childKind: the one place that tells a view child's kind apart (KF-TZKGBZ:
// one shared child-kind dispatch). A child is an `$each` list, an `$if`
// branch, a `$slot` placement, a composed `#view` node, or a component node;
// every walker switches on this instead of repeating the `in` checks, so a
// new control-flow kind has one place to be added.

/** The kind of a view child: `each`, `if`, `slot`, `view`, or `node`. */
export function childKind(child) {
  if ('$each' in child) return 'each';
  if ('$if' in child) return 'if';
  if ('$slot' in child) return 'slot';
  return child.type === '#view' ? 'view' : 'node';
}

/**
 * The child with its kind, as a value TypeScript narrows on: switching on
 * `classifyChild(child).kind` makes `.child` the `$each`, `$if`, `$slot`, or
 * node shape in each case.
 */
export function classifyChild(child) {
  return { kind: childKind(child), child };
}
