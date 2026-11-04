# Site dependency audit

`npm run check:audit` tests the audit policy and then checks all site
dependencies, including build dependencies, with the npm registry. It fails on
new high or critical advisories and on incomplete audit results.

The site pins `sharp` to at least 0.35.5 to include the
[librsvg security fix](https://github.com/lovell/sharp/security/advisories/GHSA-wq5f-xc86-pv6w)
used by its favicon and image build steps.

There are no reviewed exceptions: every high or critical finding fails the
gate. The former exception for
[`GHSA-ch52-4w7c-c8xp`](https://github.com/advisories/GHSA-ch52-4w7c-c8xp)
(`http-cache-semantics`, propagated through Astro and Starlight) was removed on
2026-11-04 after GitHub withdrew that advisory on 2026-10-28 (`KF-0TBXMN`).
