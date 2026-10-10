import { describe, expect, it } from 'vitest';

import { findCatalogEntry } from '../../ux-demo/catalog.js';
import { uxReviewCaptureUrl } from '../../ux-demo/ux-review.js';

describe('uxReviewCaptureUrl', () => {
  it('presets a region capture for the selected entry and local project', () => {
    const entry = findCatalogEntry('badge')!;
    const link = new URL(
      uxReviewCaptureUrl(
        '/Users/test/My Project',
        entry,
        'http://127.0.0.1:42817/?component=badge',
      ),
    );

    expect(`${link.protocol}//${link.host}`).toBe('uxreview://capture');
    expect(Object.fromEntries(link.searchParams)).toEqual({
      kind: 'screenshot',
      target: 'region',
      project: '/Users/test/My Project',
      title: 'Kerf UI: Badge',
      context:
        'Kerf UI UX demo\nSelected component: Badge (badge)\nDemo: http://127.0.0.1:42817/?component=badge',
    });
  });
});
