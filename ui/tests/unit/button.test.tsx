import { describe, expect, it, vi } from 'vitest';

import { Button } from '../../src/components/actions/button/button.js';

const render = (markup: unknown) => {
  const host = document.createElement('div');
  host.innerHTML = String(markup);
  return host.firstElementChild as HTMLElement;
};

describe('Button', () => {
  it('keeps the success tone across emphases and native states', () => {
    for (const emphasis of ['primary', 'secondary', 'plain'] as const) {
      const button = render(
        Button({ children: 'Price Check', tone: 'success', emphasis }),
      );
      expect(button.dataset.tone).toBe('success');
      expect(button.dataset.emphasis).toBe(emphasis);
      expect(button.textContent).toBe('Price Check');
    }
    const busy = render(
      Button({ children: 'Checking Prices', tone: 'success', loading: true }),
    );
    expect(busy.dataset.tone).toBe('success');
    expect(busy.getAttribute('aria-busy')).toBe('true');
    expect(busy.querySelector('.kui-button__spinner')).not.toBeNull();
    const disabled = render(
      Button({ children: 'Price Check', tone: 'success', disabled: true }),
    );
    expect(disabled.dataset.tone).toBe('success');
    expect(disabled.hasAttribute('disabled')).toBe(true);
  });

  it('renders a native button with the default tone, emphasis, and size', () => {
    const button = render(Button({ children: 'Save' }));
    expect(button.localName).toBe('button');
    expect(button.className).toBe('kui-button');
    expect(button.getAttribute('type')).toBe('button');
    expect(button.dataset).toMatchObject({
      component: 'button',
      tone: 'neutral',
      emphasis: 'primary',
      size: 'default',
    });
    expect(button.querySelector('.kui-button__label')!.textContent).toBe(
      'Save',
    );
    for (const attribute of [
      'aria-label',
      'title',
      'aria-busy',
      'aria-current',
      'data-loading',
      'data-icon-only',
      'disabled',
      'name',
      'value',
      'form',
    ])
      expect(button.hasAttribute(attribute)).toBe(false);
    expect(button.querySelector('.kui-button__icon')).toBe(null);
    expect(button.querySelector('.kui-button__spinner')).toBe(null);
  });

  it('carries form behavior, an action, a leading icon, and protected metadata', () => {
    const button = render(
      Button({
        children: 'Submit',
        tone: 'brand',
        emphasis: 'secondary',
        size: 'compact',
        icon: <svg data-lucide="send" />,
        type: 'submit',
        name: 'intent',
        value: 'publish',
        form: 'editor',
        action: 'publish',
        ariaLabel: 'Submit for review',
        id: 'submit',
        className: 'wide',
        slot: 'footer',
        rootAttributes: {
          'data-key': 'submit',
          'data-tone': 'danger',
          'data-dialog-close': '',
        },
      }),
    );
    expect(button.getAttribute('type')).toBe('submit');
    expect(button.getAttribute('name')).toBe('intent');
    expect(button.getAttribute('value')).toBe('publish');
    expect(button.getAttribute('form')).toBe('editor');
    expect(button.getAttribute('data-action')).toBe('publish');
    expect(button.getAttribute('aria-label')).toBe('Submit for review');
    expect(button.id).toBe('submit');
    expect(button.className).toBe('kui-button wide');
    expect(button.getAttribute('slot')).toBe('footer');
    expect(button.dataset.key).toBe('submit');
    expect(button.hasAttribute('data-dialog-close')).toBe(true);
    // The Button's own markers stay its own.
    expect(button.dataset.tone).toBe('brand');
    expect(button.dataset.emphasis).toBe('secondary');
    expect(button.dataset.size).toBe('compact');
    const icon = button.querySelector('.kui-button__icon')!;
    expect(icon.getAttribute('aria-hidden')).toBe('true');
    expect(icon.querySelector('[data-lucide="send"]')).not.toBe(null);
    expect(icon.nextElementSibling?.className).toBe('kui-button__label');
  });

  it('shows a spinner in place of the label while loading, and dims when disabled', () => {
    const busy = render(Button({ children: 'Saving', loading: true }));
    expect(busy.getAttribute('aria-busy')).toBe('true');
    expect(busy.hasAttribute('data-loading')).toBe(true);
    expect(busy.hasAttribute('disabled')).toBe(false);
    const spinner = busy.querySelector('.kui-button__spinner')!;
    expect(spinner.getAttribute('aria-hidden')).toBe('true');
    expect(spinner.querySelector('.kui-loading-spinner')).not.toBe(null);
    // The label still names the busy button.
    expect(busy.querySelector('.kui-button__label')!.textContent).toBe(
      'Saving',
    );
    expect(
      render(Button({ children: 'Save', disabled: true })).hasAttribute(
        'disabled',
      ),
    ).toBe(true);
  });

  it('renders a link with button chrome, and a disabled link without a destination', () => {
    const link = render(
      Button({ children: 'Docs', href: '/docs', target: '_blank' }),
    );
    expect(link.localName).toBe('a');
    expect(link.getAttribute('href')).toBe('/docs');
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.hasAttribute('type')).toBe(false);
    expect(link.hasAttribute('role')).toBe(false);
    expect(link.hasAttribute('aria-disabled')).toBe(false);
    const off = render(
      Button({
        children: 'Docs',
        href: '/docs',
        target: '_blank',
        disabled: true,
      }),
    );
    expect(off.hasAttribute('href')).toBe(false);
    expect(off.hasAttribute('target')).toBe(false);
    expect(off.getAttribute('role')).toBe('link');
    expect(off.getAttribute('aria-disabled')).toBe('true');
  });

  it('takes link as sugar over href and target (KF-RESJ2S)', () => {
    const fromString = render(Button({ children: 'Docs', link: '/docs' }));
    expect(fromString.localName).toBe('a');
    expect(fromString.getAttribute('href')).toBe('/docs');
    expect(fromString.hasAttribute('target')).toBe(false);
    // A link keeps the default emphasis: the look is chosen separately.
    expect(fromString.dataset.emphasis).toBe('primary');
    const fromUrl = render(
      Button({
        children: 'Docs',
        link: new URL('https://example.com/docs?a=1'),
      }),
    );
    expect(fromUrl.getAttribute('href')).toBe('https://example.com/docs?a=1');
    const withTarget = render(
      Button({ children: 'Docs', link: { href: '/docs', target: '_blank' } }),
    );
    expect(withTarget.getAttribute('href')).toBe('/docs');
    expect(withTarget.getAttribute('target')).toBe('_blank');
    const urlWithTarget = render(
      Button({
        children: 'Docs',
        link: { href: new URL('https://example.com/a'), target: '_top' },
      }),
    );
    expect(urlWithTarget.getAttribute('href')).toBe('https://example.com/a');
    expect(urlWithTarget.getAttribute('target')).toBe('_top');
    const off = render(
      Button({
        children: 'Docs',
        link: { href: '/docs', target: '_blank' },
        disabled: true,
      }),
    );
    expect(off.hasAttribute('href')).toBe(false);
    expect(off.hasAttribute('target')).toBe(false);
    expect(off.getAttribute('aria-disabled')).toBe('true');
  });

  it('adds rel="noopener noreferrer" only to an enabled new-tab link (KF-6GBJBP)', () => {
    const viaLink = render(
      Button({ children: 'Docs', link: { href: '/docs', target: '_blank' } }),
    );
    expect(viaLink.getAttribute('rel')).toBe('noopener noreferrer');
    const viaHref = render(
      Button({ children: 'Docs', href: '/docs', target: '_blank' }),
    );
    expect(viaHref.getAttribute('rel')).toBe('noopener noreferrer');
    for (const props of [
      { link: '/docs' },
      { link: { href: '/docs', target: '_top' as const } },
      { href: '/docs', target: '_self' as const },
      { link: { href: '/docs', target: '_blank' as const }, disabled: true },
    ]) {
      expect(
        render(Button({ children: 'Docs', ...props })).hasAttribute('rel'),
      ).toBe(false);
    }
    expect(Button({ children: 'Go' }).toString()).not.toContain('rel=');
  });

  it('rejects link together with href or target, and keeps the link guards', () => {
    expect(() =>
      Button({ children: 'Docs', link: '/docs', href: '/other' }),
    ).toThrow(/either link or href/);
    expect(() =>
      Button({ children: 'Docs', link: '/docs', target: '_blank' }),
    ).toThrow(/either link or href/);
    expect(() =>
      Button({ children: 'Docs', link: '/docs', pressed: true }),
    ).toThrow(/toggle/);
    expect(() =>
      Button({ children: 'Docs', link: '/docs', expanded: false }),
    ).toThrow(/disclosure/);
    expect(() =>
      Button({ children: 'Docs', link: '/docs', popoverTarget: 'menu' }),
    ).toThrow(/popover/);
  });

  it('screens a script link like any other href', () => {
    // kerf's attribute URL screening applies through the link prop too: in
    // production it warns and drops the destination.
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      for (const link of [
        'javascript:alert(1)',
        { href: 'javascript:alert(1)', target: '_blank' as const },
      ]) {
        const unsafe = render(Button({ children: 'Run', link }));
        expect(unsafe.hasAttribute('href')).toBe(false);
      }
    } finally {
      warn.mockRestore();
    }
  });

  it('draws the link emphasis on a button or a link (KF-RESJ2S)', () => {
    const action = render(
      Button({ children: 'Show Details', emphasis: 'link', action: 'more' }),
    );
    expect(action.localName).toBe('button');
    expect(action.dataset.emphasis).toBe('link');
    expect(action.dataset.action).toBe('more');
    const link = render(
      Button({ children: 'Source', emphasis: 'link', link: '#source' }),
    );
    expect(link.localName).toBe('a');
    expect(link.dataset.emphasis).toBe('link');
    for (const tone of ['neutral', 'brand', 'success', 'danger'] as const)
      expect(
        render(Button({ children: 'Go', emphasis: 'link', tone })).dataset.tone,
      ).toBe(tone);
    expect(() =>
      Button({ children: 'Live', emphasis: 'link', pressed: false }),
    ).toThrow(/link emphasis cannot be a toggle/);
    // Disclosure is fine on a link-looking button ("Show More").
    expect(
      render(
        Button({ children: 'More', emphasis: 'link', expanded: false }),
      ).getAttribute('aria-expanded'),
    ).toBe('false');
  });

  it('renders an icon-only square named by ariaLabel', () => {
    const square = render(
      Button({ icon: <svg data-lucide="plus" />, ariaLabel: 'Add' }),
    );
    expect(square.hasAttribute('data-icon-only')).toBe(true);
    expect(square.getAttribute('aria-label')).toBe('Add');
    expect(square.querySelector('.kui-button__label')).toBe(null);
  });

  it('is a toggle with pressed, reporting aria-pressed only when set', () => {
    const plain = render(<Button action="go">Go</Button>);
    expect(plain.hasAttribute('aria-pressed')).toBe(false);
    const on = render(
      <Button pressed emphasis="plain" action="toggle">
        Live
      </Button>,
    );
    expect(on.getAttribute('aria-pressed')).toBe('true');
    expect(on.dataset.emphasis).toBe('plain');
    const off = render(
      <Button pressed={false} icon={<span />} ariaLabel="Show Conversation" />,
    );
    expect(off.getAttribute('aria-pressed')).toBe('false');
    expect(off.hasAttribute('data-icon-only')).toBe(true);
  });

  it('marks the current step on buttons and links, including disabled ones', () => {
    const currentButton = render(<Button currentStep>Install</Button>);
    expect(currentButton.getAttribute('aria-current')).toBe('step');
    expect(currentButton.hasAttribute('aria-pressed')).toBe(false);
    expect(
      render(<Button currentStep={false}>Install</Button>).hasAttribute(
        'aria-current',
      ),
    ).toBe(false);
    const currentLink = render(
      <Button href="/setup/install" currentStep>
        Install
      </Button>,
    );
    expect(currentLink.localName).toBe('a');
    expect(currentLink.getAttribute('aria-current')).toBe('step');
    const disabledButton = render(
      <Button currentStep disabled>
        Install
      </Button>,
    );
    expect(disabledButton.hasAttribute('disabled')).toBe(true);
    expect(disabledButton.getAttribute('aria-current')).toBe('step');
    const disabledLink = render(
      <Button href="/setup/install" currentStep disabled>
        Install
      </Button>,
    );
    expect(disabledLink.hasAttribute('href')).toBe(false);
    expect(disabledLink.getAttribute('aria-disabled')).toBe('true');
    expect(disabledLink.getAttribute('aria-current')).toBe('step');
  });

  it('takes a pill shape and protects its shape marker', () => {
    expect(render(<Button>Rounded</Button>).hasAttribute('data-shape')).toBe(
      false,
    );
    const pill = render(
      <Button
        shape="pill"
        rootAttributes={
          { 'data-shape': 'rounded' } as Record<`data-${string}`, string>
        }
      >
        Pill
      </Button>,
    );
    expect(pill.dataset.shape).toBe('pill');
  });

  it('marks focusRingInset and protects the marker', () => {
    expect(
      render(<Button>Default</Button>).hasAttribute('data-focus-ring-inset'),
    ).toBe(false);
    expect(
      render(<Button focusRingInset={false}>Off</Button>).hasAttribute(
        'data-focus-ring-inset',
      ),
    ).toBe(false);
    expect(
      render(<Button focusRingInset>Inset</Button>).dataset.focusRingInset,
    ).toBe('true');
    expect(
      render(
        <Button href="/docs" focusRingInset>
          Docs
        </Button>,
      ).dataset.focusRingInset,
    ).toBe('true');
    const forged = render(
      <Button rootAttributes={{ 'data-focus-ring-inset': 'true' }}>
        Forged
      </Button>,
    );
    expect(forged.hasAttribute('data-focus-ring-inset')).toBe(false);
  });

  it('marks fill and protects the marker', () => {
    expect(render(<Button>Default</Button>).hasAttribute('data-fill')).toBe(
      false,
    );
    expect(
      render(<Button fill={false}>Off</Button>).hasAttribute('data-fill'),
    ).toBe(false);
    const filled = render(
      <Button tone="brand" fill>
        Continue
      </Button>,
    );
    expect(filled.tagName).toBe('BUTTON');
    expect(filled.dataset.fill).toBe('true');
    const link = render(
      <Button href="/docs" fill>
        Docs
      </Button>,
    );
    expect(link.tagName).toBe('A');
    expect(link.dataset.fill).toBe('true');
    const forged = render(
      <Button rootAttributes={{ 'data-fill': 'true' }}>Forged</Button>,
    );
    expect(forged.hasAttribute('data-fill')).toBe(false);
  });

  // KF-PAMQNM: a Button can be a native popover invoker naming its popup.
  it('opens a popover and reports the popup it opens', () => {
    const trigger = render(
      <Button
        popoverTarget="request"
        popoverTargetAction="hide"
        ariaHasPopup="dialog"
      >
        Deny
      </Button>,
    );
    expect(trigger.getAttribute('popovertarget')).toBe('request');
    expect(trigger.getAttribute('popovertargetaction')).toBe('hide');
    expect(trigger.getAttribute('aria-haspopup')).toBe('dialog');
    expect(() =>
      Button({ children: 'Docs', href: '/docs', popoverTarget: 'request' }),
    ).toThrow(/link Button cannot open a popover/);
  });

  // KF-DE348P: a disclosure control reports whether its content is open.
  it('is a disclosure control with expanded, reporting aria-expanded only when set', () => {
    expect(
      render(<Button action="go">Go</Button>).hasAttribute('aria-expanded'),
    ).toBe(false);
    const open = render(
      <Button expanded emphasis="plain" action="toggle-details">
        Details
      </Button>,
    );
    expect(open.getAttribute('aria-expanded')).toBe('true');
    expect(
      render(<Button expanded={false}>Details</Button>).getAttribute(
        'aria-expanded',
      ),
    ).toBe('false');
    expect(() =>
      Button({ children: 'Docs', href: '/docs', expanded: false }),
    ).toThrow(/link Button cannot be a disclosure control/);
  });

  it('refuses to make a link a toggle', () => {
    expect(() =>
      Button({ children: 'Docs', href: '/docs', pressed: true }),
    ).toThrow(/link Button cannot be a toggle/);
    expect(
      render(
        <Button href="/docs" shape="pill">
          Docs
        </Button>,
      ).dataset.shape,
    ).toBe('pill');
  });

  it('carries a native hover title beside an icon-only name', () => {
    const button = render(
      Button({
        icon: <svg data-lucide="ellipsis" />,
        ariaLabel: 'More Actions',
        title: 'More Actions for report.pdf',
      }),
    );
    expect(button.getAttribute('aria-label')).toBe('More Actions');
    expect(button.getAttribute('title')).toBe('More Actions for report.pdf');
    const link = render(
      Button({ children: 'Docs', href: '/docs', title: 'Open the docs' }),
    );
    expect(link.getAttribute('title')).toBe('Open the docs');
  });

  it('pins a count or dot badge to the corner, named only through badgeLabel', () => {
    const named = render(
      Button({
        icon: <svg data-lucide="mail" />,
        ariaLabel: 'Messages',
        badge: 4,
        badgeLabel: '4 unread',
      }),
    );
    expect(named.getAttribute('aria-label')).toBe('Messages, 4 unread');
    const count = named.querySelector('.kui-badge')!;
    expect(count.getAttribute('data-placement')).toBe('corner');
    expect(count.getAttribute('data-tone')).toBe('danger');
    expect(count.getAttribute('aria-hidden')).toBe('true');
    expect(count.textContent).toBe('4');
    // Without badgeLabel the count stays out of the name.
    const quiet = render(
      Button({ icon: <svg data-lucide="mail" />, ariaLabel: 'Mail', badge: 2 }),
    );
    expect(quiet.getAttribute('aria-label')).toBe('Mail');
    // A labeled button names the badge through the badge itself.
    const labeled = render(
      Button({
        children: 'Inbox',
        badge: true,
        badgeLabel: 'new mail',
        badgeTone: 'info',
      }),
    );
    const dot = labeled.querySelector('.kui-badge')!;
    expect(dot.getAttribute('data-size')).toBe('dot');
    expect(dot.getAttribute('aria-label')).toBe('new mail');
    expect(dot.getAttribute('data-tone')).toBe('info');
    const text = render(
      Button({ children: 'Inbox', badge: 'New', badgeLabel: 'new mail' }),
    );
    expect(text.querySelector('.kui-badge')!.getAttribute('aria-label')).toBe(
      'new mail',
    );
    const decorativeDot = render(Button({ children: 'Inbox', badge: true }));
    expect(
      decorativeDot.querySelector('.kui-badge')!.getAttribute('aria-hidden'),
    ).toBe('true');
    expect(
      render(Button({ children: 'Inbox', badge: '' })).querySelector(
        '.kui-badge',
      ),
    ).toBe(null);
  });
});
