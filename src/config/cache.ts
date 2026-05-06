interface CacheEntry<T> { value: T; expiresAt: number; }

class Cache {
  private store = new Map<string, CacheEntry<any>>();

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) { this.store.delete(key); return null; }
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlSeconds = 60): void {
    this.store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  }

  clear(key: string): void { this.store.delete(key); }
  clearAll(): void { this.store.clear(); }

  clearPattern(pattern: string): void {
    const regex = new RegExp(`^${pattern.replace('*', '.*')}$`);
    for (const key of this.store.keys()) if (regex.test(key)) this.store.delete(key);
  }
}

export const cache = new Cache();
