# Site dependency audit

`npm run check:audit` tests the audit policy and then checks all site
dependencies, including build dependencies, with the npm registry. It fails on
new high or critical advisories and on incomplete audit results.

The site pins `sharp` to at least 0.35.5 to include the
[librsvg security fix](https://github.com/lovell/sharp/security/advisories/GHSA-wq5f-xc86-pv6w)
used by its favicon and image build steps.

The one reviewed exception is
[`GHSA-ch52-4w7c-c8xp`](https://github.com/advisories/GHSA-ch52-4w7c-c8xp)
in `http-cache-semantics@4.2.0`, propagated through Astro and Starlight. As of
2026-10-03, upstream has no patched npm release. Astro imports the package in
its remote asset build cache. This documentation site builds static files for
GitHub Pages and has no Astro request server or shared response cache at
runtime, so the advisory's cross-user response reuse path is not reachable in
the deployed site. The policy recognizes only that advisory, its affected
range, and the expected dependency paths; another finding still fails CI.

`KF-0TBXMN` tracks removing this exception once a patched version is available.
