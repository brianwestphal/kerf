import { describe, expect, it } from 'vitest';

import { ContentItem } from '../../src/components/surfaces/content-item/content-item.js';
import { wireContentItemMedia } from '../../src/components/surfaces/content-item/wiring/wire-content-item-media.js';
import { fillColor } from '../../src/shared/styles/css-values.js';

function card(tinted = true) {
  const root = document.createElement('div');
  root.innerHTML = String(
    ContentItem({
      media: { src: '/lead.jpg', alt: 'Lead', blurredSrc: '/soft.jpg' },
      tint: tinted
        ? {
            color: fillColor('#283a54'),
            scheme: 'dark',
            accent: fillColor('#8cb7df'),
          }
        : undefined,
      children: 'Story',
    }),
  );
  return root.firstElementChild as HTMLElement;
}

describe('ContentItem image state wiring', () => {
  it('restores tint after a failed lead source is replaced and keeps the soft copy decorative', async () => {
    const root = document.createElement('div');
    const item = card();
    root.append(item);
    const lead = item.querySelector<HTMLImageElement>(
      '.kui-content-item__media-image',
    )!;
    const soft = item.querySelector<HTMLImageElement>(
      '.kui-content-item__media-blurred',
    )!;
    let complete = false;
    let width = 0;
    let softWidth = 0;
    Object.defineProperties(lead, {
      complete: { get: () => complete },
      naturalWidth: { get: () => width },
    });
    Object.defineProperties(soft, {
      complete: { get: () => complete },
      naturalWidth: { get: () => softWidth },
    });
    const stop = wireContentItemMedia(root);
    expect(item.dataset.mediaState).toBe('pending');
    root.dispatchEvent(new Event('load'));
    item.dispatchEvent(new Event('error'));
    expect(item.dataset.mediaState).toBe('pending');
    complete = true;
    lead.dispatchEvent(new Event('error'));
    expect(item.dataset.mediaState).toBe('error');
    expect(item.hasAttribute('data-kui-tint')).toBe(false);
    expect(item.classList.contains('wa-dark')).toBe(false);
    expect(soft.dataset.imageError).toBe('true');
    complete = false;
    lead.setAttribute('src', '/replacement.jpg');
    await new Promise<void>((resolve) => globalThis.queueMicrotask(resolve));
    expect(item.dataset.mediaState).toBe('pending');
    expect(item.getAttribute('data-kui-tint')).toBe('dark');
    complete = true;
    width = 160;
    softWidth = 64;
    lead.dispatchEvent(new Event('load'));
    expect(item.dataset.mediaState).toBe('ready');
    expect(item.hasAttribute('data-kui-tint-accent')).toBe(true);
    expect(soft.hasAttribute('data-image-error')).toBe(false);
    stop();
    width = 0;
    lead.dispatchEvent(new Event('error'));
    expect(item.dataset.mediaState).toBe('ready');
  });

  it('handles an untinted media card used as the wiring root', () => {
    const item = card(false);
    const stop = wireContentItemMedia(item);
    expect(item.dataset.mediaState).toBe('error');
    expect(item.hasAttribute('data-kui-tint')).toBe(false);
    stop();
  });
});
