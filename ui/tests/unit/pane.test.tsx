import { describe, expect, it } from 'vitest';

import { Pane } from '../../src/components/layout/pane/pane.js';

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

  it('compensates for safe areas on every side unless the app narrows the sides', () => {
    const all = String(Pane({ children: <span>Content</span> }));
    expect(all.match(/data-safe-area-[^=]+="true"/g)).toHaveLength(4);

    const narrowed = String(
      Pane({
        children: <span>Content</span>,
        safeAreaEdges: ['inline-start', 'block-end'],
      }),
    );
    expect(narrowed).toContain('data-safe-area-block-start="false"');
    expect(narrowed).toContain('data-safe-area-block-end="true"');
    expect(narrowed).toContain('data-safe-area-inline-start="true"');
    expect(narrowed).toContain('data-safe-area-inline-end="false"');

    const none = String(
      Pane({ children: <span>Content</span>, safeAreaEdges: [] }),
    );
    expect(none.match(/data-safe-area-[^=]+="false"/g)).toHaveLength(4);

    const forged = String(
      Pane({
        children: <span>Content</span>,
        rootAttributes: {
          // @ts-expect-error protected Pane safe-area state cannot be supplied by callers.
          'data-safe-area-block-start': 'false',
        },
      }),
    );
    expect(forged).toContain('data-safe-area-block-start="true"');
    expect(forged.match(/data-safe-area-block-start=/g)).toHaveLength(1);
  });

  it('opts into a protected deep content inset without changing the default', () => {
    expect(String(Pane({ children: <span>Body</span> }))).not.toContain(
      'data-deep-inset',
    );
    const html = String(
      Pane({
        children: <span>Body</span>,
        deepInset: true,
        rootAttributes: {
          // @ts-expect-error the Pane owns its deep inset state.
          'data-deep-inset': 'false',
        },
      }),
    );
    expect(html).toContain('data-deep-inset="true"');
    expect(html.match(/data-deep-inset=/g)).toHaveLength(1);
  });

  it('pins its chrome by default and opts into yielding it when short', () => {
    expect(String(Pane({ children: <span>Body</span> }))).not.toContain(
      'data-chrome-placement',
    );
    expect(
      String(Pane({ children: <span>Body</span>, chromePlacement: 'fixed' })),
    ).not.toContain('data-chrome-placement');
    expect(
      String(
        Pane({
          header: <span>Head</span>,
          children: <span>Body</span>,
          chromePlacement: 'auto',
        }),
      ),
    ).toContain('data-chrome-placement="auto"');
    // The placement is structural: consumer metadata cannot claim it.
    expect(
      String(
        Pane({
          children: <span>Body</span>,
          rootAttributes: {
            'data-chrome-placement': 'auto',
          } as unknown as Record<`data-${string}`, string>,
        }),
      ),
    ).not.toContain('data-chrome-placement');
  });

  it('opts into sunken scroll painting without changing chrome or metadata ownership', () => {
    const normal = String(Pane({ children: <span>Body</span> }));
    expect(normal).not.toContain('data-appearance');
    for (const chromePlacement of ['fixed', 'auto'] as const) {
      const html = String(
        Pane({
          appearance: 'sunken',
          chromePlacement,
          header: <span>Head</span>,
          children: <span>Body</span>,
          footer: <span>Foot</span>,
          rootAttributes: {
            // @ts-expect-error appearance is owned by Pane.
            'data-appearance': 'default',
          },
        }),
      );
      expect(html).toContain('data-appearance="sunken"');
      expect(html).toContain('data-chrome-dividers="always"');
      expect(html.match(/data-appearance=/g)).toHaveLength(1);
      expect(html).toContain('kui-pane__header');
      expect(html).toContain('kui-pane__footer');
    }
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
