# `ui-composition`

Enforces composition facts published by the versioned UI catalog. `KUI-L201` reports a catalog component under a known, disallowed direct parent. `KUI-L202` reports a statically visible zone child—including an intrinsic or unknown JSX element—that is not one of the zone's cataloged `accepts` entries. `KUI-L203` reports a statically provable zone cardinality violation. Toolbar's `leading`, `center`, and `trailing` validation is therefore derived from its catalog entry rather than a duplicated rule-local allowlist.

The parent check is intentionally conservative: it reports only when both child and direct parent resolve to cataloged imports. The Toolbar zone check understands fragments, arrays, and conditional/logical branches, but expressions whose content cannot be resolved statically remain runtime and accessibility work. Other catalog zone ids are not assumed to be JSX prop names. No autofix is offered because wrapping or moving UI changes structure and behavior.
