/**
 * Safe Storage wrapper with primary in-memory store and optional localStorage fallback.
 * Prevents SecurityError and DOMException crashes in sandboxed YouTube Playables iframes.
 */
class SafeStorage {
  private memoryStore = new Map<string, string>();
  private localStorageAvailable: boolean | null = null;

  private isLocalStorageAvailable(): boolean {
    if (this.localStorageAvailable !== null) {
      return this.localStorageAvailable;
    }

    try {
      if (typeof window === 'undefined') {
        this.localStorageAvailable = false;
        return false;
      }
      // Accessing window.localStorage can throw a SecurityError in sandboxed iframes
      const storage = window.localStorage;
      if (!storage) {
        this.localStorageAvailable = false;
        return false;
      }
      const probe = '__yt_storage_probe__';
      storage.setItem(probe, '1');
      storage.removeItem(probe);
      this.localStorageAvailable = true;
      return true;
    } catch {
      // In sandboxed iframes (like YouTube Playables without allow-same-origin),
      // accessing localStorage throws SecurityError. Fall back strictly to memory.
      this.localStorageAvailable = false;
      return false;
    }
  }

  public getItem(key: string): string | null {
    // 1. Check in-memory store first (guaranteed safe)
    if (this.memoryStore.has(key)) {
      return this.memoryStore.get(key) ?? null;
    }

    // 2. Best-effort fallback to localStorage when permitted
    try {
      if (this.isLocalStorageAvailable()) {
        const val = window.localStorage.getItem(key);
        if (val !== null) {
          this.memoryStore.set(key, val);
          return val;
        }
      }
    } catch {
      this.localStorageAvailable = false;
    }

    return null;
  }

  public setItem(key: string, value: string): void {
    const stringVal = String(value);
    // 1. Always write to in-memory store first
    this.memoryStore.set(key, stringVal);

    // 2. Best-effort sync to localStorage if accessible
    try {
      if (this.isLocalStorageAvailable()) {
        window.localStorage.setItem(key, stringVal);
      }
    } catch {
      this.localStorageAvailable = false;
    }
  }

  public removeItem(key: string): void {
    this.memoryStore.delete(key);
    try {
      if (this.isLocalStorageAvailable()) {
        window.localStorage.removeItem(key);
      }
    } catch {
      this.localStorageAvailable = false;
    }
  }

  public clear(): void {
    this.memoryStore.clear();
    try {
      if (this.isLocalStorageAvailable()) {
        window.localStorage.clear();
      }
    } catch {
      this.localStorageAvailable = false;
    }
  }
}

export const safeStorage = new SafeStorage();
