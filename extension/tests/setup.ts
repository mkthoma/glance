const storage = new Map<string, unknown>();

const localArea: chrome.storage.StorageArea = {
  async get(keys?: string | string[] | Record<string, unknown> | null) {
    if (keys == null) {
      return Object.fromEntries(storage.entries());
    }

    if (typeof keys === "string") {
      return { [keys]: storage.get(keys) };
    }

    if (Array.isArray(keys)) {
      return Object.fromEntries(keys.map((key) => [key, storage.get(key)]));
    }

    return Object.fromEntries(
      Object.entries(keys).map(([key, fallback]) => [
        key,
        storage.has(key) ? storage.get(key) : fallback
      ])
    );
  },

  async set(items: Record<string, unknown>) {
    for (const [key, value] of Object.entries(items)) {
      storage.set(key, value);
    }
  },

  async remove(keys: string | string[]) {
    const values = Array.isArray(keys) ? keys : [keys];
    for (const key of values) {
      storage.delete(key);
    }
  },

  async clear() {
    storage.clear();
  }
} as chrome.storage.StorageArea;

Object.assign(globalThis, {
  chrome: {
    storage: {
      local: localArea
    }
  }
});

beforeEach(async () => {
  await chrome.storage.local.clear();
});
