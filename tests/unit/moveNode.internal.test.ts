import { afterEach, describe, expect, it, vi } from 'vitest';

import { moveNode } from '../../src/utils/moveNode.js';

afterEach(() => {
  document.body.innerHTML = '';
});

/** A parent + three connected children `a`, `b`, `c` attached to the document. */
function threeRows(): { parent: HTMLElement; a: HTMLElement; b: HTMLElement; c: HTMLElement } {
  const parent = document.createElement('ul');
  const a = document.createElement('li');
  const b = document.createElement('li');
  const c = document.createElement('li');
  a.textContent = 'a';
  b.textContent = 'b';
  c.textContent = 'c';
  parent.append(a, b, c);
  document.body.appendChild(parent);
  return { parent, a, b, c };
}

const order = (parent: Element): string =>
  Array.from(parent.children).map((el) => el.textContent).join('');

describe('moveNode', () => {
  describe('fallback path (no moveBefore on the engine)', () => {
    it('relocates a connected node via insertBefore', () => {
      const { parent, a, c } = threeRows();
      expect('moveBefore' in parent).toBe(false); // happy-dom has no moveBefore
      // Move `c` to sit before `a`.
      moveNode(parent, c, a);
      expect(order(parent)).toBe('cab');
    });

    it('appends when ref is null', () => {
      const { parent, a } = threeRows();
      moveNode(parent, a, null);
      expect(order(parent)).toBe('bca');
    });

    it('inserts a fresh (detached) node via insertBefore', () => {
      const { parent, b } = threeRows();
      const fresh = document.createElement('li');
      fresh.textContent = 'x';
      expect(fresh.isConnected).toBe(false);
      moveNode(parent, fresh, b);
      expect(order(parent)).toBe('axbc');
    });
  });

  describe('moveBefore path (engine supports state-preserving moves)', () => {
    it('routes a connected node through moveBefore, not insertBefore', () => {
      const { parent, a, c } = threeRows();
      // Stub a spec-faithful moveBefore that performs the move like insertBefore.
      const moveBefore = vi.fn((node: Node, ref: Node | null) => {
        HTMLElement.prototype.insertBefore.call(parent, node, ref);
      });
      (parent as unknown as { moveBefore: typeof moveBefore }).moveBefore = moveBefore;
      const insertSpy = vi.spyOn(parent, 'insertBefore');

      moveNode(parent, c, a);

      expect(moveBefore).toHaveBeenCalledTimes(1);
      expect(moveBefore).toHaveBeenCalledWith(c, a);
      expect(insertSpy).not.toHaveBeenCalled();
      expect(order(parent)).toBe('cab');
    });

    it('appends via moveBefore when ref is null', () => {
      const { parent, a } = threeRows();
      const moveBefore = vi.fn((node: Node, ref: Node | null) => {
        HTMLElement.prototype.insertBefore.call(parent, node, ref);
      });
      (parent as unknown as { moveBefore: typeof moveBefore }).moveBefore = moveBefore;

      moveNode(parent, a, null);

      expect(moveBefore).toHaveBeenCalledWith(a, null);
      expect(order(parent)).toBe('bca');
    });

    it('falls back to insertBefore for a detached node even when moveBefore exists', () => {
      // moveBefore would throw for a not-yet-connected node, so the isConnected
      // guard must keep fresh inserts on the insertBefore path.
      const { parent, b } = threeRows();
      const moveBefore = vi.fn();
      (parent as unknown as { moveBefore: typeof moveBefore }).moveBefore = moveBefore;
      const fresh = document.createElement('li');
      fresh.textContent = 'x';

      moveNode(parent, fresh, b);

      expect(moveBefore).not.toHaveBeenCalled();
      expect(order(parent)).toBe('axbc');
    });
  });
});
