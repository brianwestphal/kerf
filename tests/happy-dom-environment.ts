// KF-14YDD6: Node's file-backed storage globals must not shadow DOM storage.
import { builtinEnvironments, type Environment } from 'vitest/runtime';

const storageKeys = ['localStorage', 'sessionStorage'];

const environment: Environment = {
  ...builtinEnvironments['happy-dom'],
  async setup(global, options) {
    const originals = new Map<string, PropertyDescriptor>();
    const restore = () => {
      for (const [key, descriptor] of originals)
        Object.defineProperty(global, key, descriptor);
    };
    try {
      for (const key of storageKeys) {
        const descriptor = Object.getOwnPropertyDescriptor(global, key);
        if (descriptor) {
          originals.set(key, descriptor);
          // Do not read the getter: Node warns or throws without a storage file.
          if (!Reflect.deleteProperty(global, key))
            throw new Error(`Cannot isolate host ${key} for happy-dom`);
        }
      }
      const result = await builtinEnvironments['happy-dom'].setup(
        global,
        options,
      );
      return {
        async teardown(target) {
          try {
            await result.teardown(target);
          } finally {
            restore();
          }
        },
      };
    } catch (error) {
      restore();
      throw error;
    }
  },
};

export default environment;
