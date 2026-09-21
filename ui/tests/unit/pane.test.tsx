import { describe, expect, it } from 'vitest';

import { Pane } from '../../src/pane.js';

describe('Pane', () => {
  it('renders one scrolling vertical content owner with separators off by default', () => {
    const html = String(Pane({ children: <span>Content</span> }));

    expect(html).toContain('class="kui-pane" data-component="pane"');
    expect(html).toContain('class="kui-pane__content kui-content"');
    expect(html).toContain('data-separator-block-start="false"');
    expect(html).toContain('data-separator-block-end="false"');
    expect(html).toContain('data-separator-inline-start="false"');
    expect(html).toContain('data-separator-inline-end="false"');
    expect(html).not.toContain('kui-pane__header');
    expect(html).not.toContain('kui-pane__footer');
  });

  it('organizes semantic header, content, and footer slots and opts into every edge', () => {
    const html = String(
      Pane({
        element: 'aside',
        contentElement: 'nav',
        id: 'workspace',
        label: 'Workspace',
        contentLabel: 'Workspace pages',
        className: 'rail',
        headerClassName: 'rail-header',
        contentClassName: 'rail-content',
        footerClassName: 'rail-footer',
        separators: ['block-start', 'block-end', 'inline-start', 'inline-end'],
        header: [<strong>Primary</strong>, <span>Secondary</span>],
        children: <a href="/inbox">Inbox</a>,
        footer: <small>Ready</small>,
        rootAttributes: { 'data-demo': 'pane' },
      }),
    );

    expect(html).toContain(
      '<aside data-demo="pane" class="kui-pane rail" id="workspace" data-component="pane"',
    );
    expect(html).toContain('aria-label="Workspace"');
    expect(html).toContain(
      '<header class="kui-pane__header kui-pane__toolbar rail-header"><strong>Primary</strong><span>Secondary</span></header>',
    );
    expect(html).toContain(
      '<nav class="kui-pane__content kui-content rail-content" aria-label="Workspace pages"><a href="/inbox">Inbox</a></nav>',
    );
    expect(html).toContain(
      '<footer class="kui-pane__footer rail-footer"><small>Ready</small></footer>',
    );
    expect(html.match(/data-separator-[^=]+="true"/g)).toHaveLength(4);
  });

  it('protects structural data attributes while forwarding safe metadata', () => {
    const html = String(
      Pane({
        children: <span>Content</span>,
        rootAttributes: {
          'data-owner': 'application',
          // @ts-expect-error protected Pane state cannot be supplied by callers.
          'data-component': 'other',
        },
      }),
    );
    expect(html).toContain('data-owner="application"');
    expect(html).toContain('data-component="pane"');
    expect(html).not.toContain('data-component="other"');
  });

  it.each([
    ['article', 'main'],
    ['main', 'section'],
    ['section', 'div'],
  ] as const)(
    'renders a semantic %s root with %s content',
    (element, contentElement) => {
      const html = String(
        Pane({ element, contentElement, children: <span>Content</span> }),
      );

      expect(html).toContain(`<${element}`);
      expect(html).toContain(`<${contentElement} class="kui-pane__content`);
    },
  );
});
