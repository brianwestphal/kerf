// KF-Z6T0RS: the realm convention (ui/docs/component-contract.md "Realms").
// A controller builds its observers and schedules its timers on the window
// that owns the node it wires, never on the global one, so it works for a
// node in an iframe or another document.

/** The window whose observers and timers serve `node`. */
export function realmOf(node: Node): Window & typeof globalThis {
  const doc = node.ownerDocument ?? (node as Document);
  return (
    doc.defaultView ?? (globalThis as unknown as Window & typeof globalThis)
  );
}
