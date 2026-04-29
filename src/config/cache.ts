/**
 * Simple in-memory cache with TTL support
 * Usage: cache.set(key, value, ttlSeconds)
 *        cache.get(key)
 *        cache.clear(key) or cache.clearAll()
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

class Cache {
  private store = new Map<string, CacheEntry<any>>();

  /**
   * Get value from cache if not expired
   */
  get<T>(key: string): T | null {
    const entry = this.store.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry.value as T;
  }

  /**
   * Set value in cache with TTL in seconds
   */
  set<T>(key: string, value: T, ttlSeconds: number = 60): void {
    const expiresAt = Date.now() + ttlSeconds * 1000;
    this.store.set(key, { value, expiresAt });
  }

  /**
   * Clear a specific cache key
   */
  clear(key: string): void {
    this.store.delete(key);
  }

  /**
   * Clear all cache
   */
  clearAll(): void {
    this.store.clear();
  }

  /**
   * Clear all keys matching a pattern (e.g., "listings:*")
   */
  clearPattern(pattern: string): void {
    const regex = new RegExp(`^${pattern.replace('*', '.*')}$`);
    const keysToDelete: string[] = [];

    for (const key of this.store.keys()) {
      if (regex.test(key)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.store.delete(key));
  }
}

export const cache = new Cache();
