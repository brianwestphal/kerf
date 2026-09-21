# `ui-wiring`

Checks wiring obligations published by the versioned composition catalog. `KUI-L401` reports a used component whose required helper or side-effect registration import is absent. `KUI-L402` reports a helper call whose disposer is discarded.

Assign, return, or otherwise retain a disposer when the binding has a shorter lifetime than the page. A `void` call is accepted as an explicit page-lifetime choice. The rule derives valid helper sources from each v1 entry's `publicExports` and `wiring[].import` facts, so aliases, root named imports, root namespaces, wiring-subpath named imports, and wiring-subpath namespaces resolve without a second hard-coded export table. It does not attempt flow-sensitive cleanup proof and offers no autofix.
