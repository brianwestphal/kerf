// The numbered docs/*.md files the site publishes verbatim. Currently none.
//
// The numbered docs are the internal source of truth for design and
// reference. The site presents its own consumer-authored pages under
// site/src/content/docs/ instead (hand-owned, at slugs such as docs/overview/
// and api/), so nothing is copied from docs/ at build time.
//
// scripts/check-doc-site-tickets.mjs reads this list: any doc named here is
// scanned for Hot Sheet ticket markers like a site page, because a reader
// would see it. If a doc is ever published verbatim again, name it here and
// add the copy step that publishes it.

/** @type {readonly string[]} file names under docs/, e.g. '1-overview.md' */
export const PUBLISHED_SOURCE_DOCS = [];
