// KF-XX4Y95: Form is a layout-neutral native form; wireForms keeps a
// submission from navigating while the submit event reaches the app.
import { delegateActions } from 'kerfjs/actions';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Form } from '../../src/components/forms/form/form.js';
import { wireForms } from '../../src/components/forms/form/wiring/wire-forms.js';

const render = (html: unknown) => {
  const host = document.createElement('div');
  host.innerHTML = String(html);
  document.body.append(host);
  return { host, form: host.firstElementChild as HTMLFormElement };
};

const submit = (form: HTMLFormElement) => {
  const event = new Event('submit', { bubbles: true, cancelable: true });
  form.dispatchEvent(event);
  return event;
};

afterEach(() => document.body.replaceChildren());

describe('Form', () => {
  it('renders a bare native form around its children', () => {
    const { form } = render(
      Form({ children: <input name="project" value="Kerf" /> }),
    );
    expect(form.tagName).toBe('FORM');
    expect(form.className).toBe('kui-form');
    expect(form.dataset.component).toBe('form');
    expect(form.hasAttribute('novalidate')).toBe(false);
    expect(form.hasAttribute('action')).toBe(false);
    expect(form.hasAttribute('data-action')).toBe(false);
    expect(new FormData(form).get('project')).toBe('Kerf');
  });

  it('forwards id, name, action, noValidate, class, slot, and data-*', () => {
    const { form } = render(
      Form({
        id: 'settings',
        name: 'settings',
        action: 'save-settings',
        noValidate: true,
        className: 'app-form',
        slot: 'body',
        rootAttributes: {
          'data-key': 'row-1',
          'data-action': 'forged',
          'data-component': 'forged',
        },
      }),
    );
    expect(form.id).toBe('settings');
    expect(form.getAttribute('name')).toBe('settings');
    expect(form.dataset.action).toBe('save-settings');
    expect(form.dataset.component).toBe('form');
    expect(form.dataset.key).toBe('row-1');
    expect(form.hasAttribute('novalidate')).toBe(true);
    expect(form.className).toBe('kui-form app-form');
    expect(form.getAttribute('slot')).toBe('body');
    expect(form.hasAttribute('action')).toBe(false);
  });
});

describe('wireForms', () => {
  it('cancels navigation while the submit action still runs', () => {
    const { host, form } = render(
      Form({
        action: 'save',
        children: <input name="project" value="Kerf" />,
      }),
    );
    const saved = vi.fn();
    const stopActions = delegateActions(host, 'submit', {
      save: (_event, element) =>
        saved(new FormData(element as HTMLFormElement).get('project')),
    });
    const stop = wireForms(host);
    const event = submit(form);
    expect(event.defaultPrevented).toBe(true);
    expect(saved).toHaveBeenCalledWith('Kerf');

    // A handler that stops propagation cannot let the submission through.
    form.addEventListener('submit', (inner) => inner.stopPropagation());
    expect(submit(form).defaultPrevented).toBe(true);

    stop();
    stopActions();
    expect(submit(form).defaultPrevented).toBe(false);
  });

  it('leaves a native form that is not a Kerf UI Form alone', () => {
    const { form } = render('<form><input name="q"></form>');
    const stop = wireForms(document);
    expect(submit(form).defaultPrevented).toBe(false);
    stop();
  });
});
