import { describe, expect, it } from 'vitest';

import { Button } from '../../src/components/actions/button/button.js';

const render = (markup: unknown) => {
  const host = document.createElement('div');
  host.innerHTML = String(markup);
  return host.firstElementChild as HTMLElement;
};

describe('Button', () => {
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
      'aria-busy',
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
});
