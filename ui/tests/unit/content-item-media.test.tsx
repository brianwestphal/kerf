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
  it('forwards offscreen hero deferral only when media requests it', () => {
    const deferred = String(
      ContentItem({
        media: { src: '/lead.jpg', alt: 'Lead', deferOffscreen: true },
        children: 'Story',
      }),
    );
    expect(deferred).toContain('data-defer-offscreen="true"');
    expect(String(ContentItem({ children: 'Story' }))).not.toContain(
      'data-defer-offscreen',
    );
    expect(
      String(ContentItem({ media: { src: '/lead.jpg', alt: 'Lead' } })),
    ).not.toContain('data-defer-offscreen');
  });

  it('restores tint after a failed lead source is replaced and keeps the soft copy decorative', async () => {
    const root = document.createElement('div');
    const item = card();
    root.append(item);
    const lead = item.querySelector<HTMLImageElement>(
      '.kui-content-item__media .kui-backdrop-image__media',
    )!;
    const soft = item.querySelector<HTMLImageElement>(
      '.kui-content-item__media .kui-backdrop-image__blurred',
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
    expect(item.classList.contains('kui-dark')).toBe(false);
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

  // KF-E44H0A: an app's own scheme outlives a media tint that fails.
  it('keeps a card scheme the app set when its media fails', () => {
    const root = document.createElement('div');
    root.innerHTML = String(
      ContentItem({
        media: { src: '/lead.jpg', alt: 'Lead' },
        tint: { color: fillColor('#283a54'), scheme: 'dark' },
        scheme: 'dark',
        children: 'Story',
      }),
    );
    const item = root.firstElementChild as HTMLElement;
    expect(item.dataset.scheme).toBe('dark');
    const stop = wireContentItemMedia(item);
    expect(item.dataset.mediaState).toBe('error');
    expect(item.hasAttribute('data-kui-tint')).toBe(false);
    expect(item.getAttribute('data-kui-scheme')).toBe('dark');
    expect(item.classList.contains('kui-dark')).toBe(true);
    stop();
    // Without an app scheme, a failed tint takes its scope with it.
    const tinted = card();
    const stopTinted = wireContentItemMedia(tinted);
    expect(tinted.hasAttribute('data-kui-scheme')).toBe(false);
    expect(tinted.classList.contains('kui-dark')).toBe(false);
    stopTinted();
  });

  it('handles an untinted media card used as the wiring root', () => {
    const item = card(false);
    const stop = wireContentItemMedia(item);
    expect(item.dataset.mediaState).toBe('error');
    expect(item.hasAttribute('data-kui-tint')).toBe(false);
    stop();
  });

  it('restores native image state after morph-written attributes and stops on disposal', async () => {
    const root = document.createElement('div');
    const item = card();
    root.append(item);
    const lead = item.querySelector<HTMLImageElement>(
      '.kui-content-item__media .kui-backdrop-image__media',
    )!;
    let width = 0;
    Object.defineProperties(lead, {
      complete: { get: () => true },
      naturalWidth: { get: () => width },
    });
    const settle = () =>
      new Promise<void>((resolve) => globalThis.setTimeout(resolve, 0));
    const stop = wireContentItemMedia(root);
    expect(item.dataset.mediaState).toBe('error');

    for (const attribute of ['data-theme', 'data-other']) {
      item.dataset.mediaState = 'pending';
      item.setAttribute('data-kui-tint', 'dark');
      item.setAttribute('data-kui-tint-accent', '');
      item.classList.add('kui-dark');
      item.setAttribute(attribute, 'changed');
      await settle();
      expect(item.dataset.mediaState).toBe('error');
      expect(item.hasAttribute('data-kui-tint')).toBe(false);
      expect(item.hasAttribute('data-kui-tint-accent')).toBe(false);
      expect(item.classList.contains('kui-dark')).toBe(false);
    }

    width = 160;
    lead.dispatchEvent(new Event('load'));
    expect(item.dataset.mediaState).toBe('ready');
    item.dataset.mediaState = 'pending';
    item.removeAttribute('data-kui-tint');
    item.removeAttribute('data-kui-tint-accent');
    item.classList.remove('kui-dark');
    await settle();
    expect(item.dataset.mediaState).toBe('ready');
    expect(item.getAttribute('data-kui-tint')).toBe('dark');
    expect(item.hasAttribute('data-kui-tint-accent')).toBe(true);
    expect(item.classList.contains('kui-dark')).toBe(true);

    width = 0;
    lead.dispatchEvent(new Event('error'));
    expect(item.dataset.mediaState).toBe('error');
    stop();
    item.dataset.mediaState = 'pending';
    await settle();
    expect(item.dataset.mediaState).toBe('pending');
  });
});
