// Simple in-memory cache with TTL (Time To Live)
interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

class SimpleCache {
  private cache = new Map<string, CacheItem<unknown>>();

  set<T>(key: string, data: T, ttl: number = 5 * 60 * 1000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data as T;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  deleteByPrefix(prefix: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }
}

export const cache = new SimpleCache();

export const CACHE_TTL = {
  CUSTOMERS: 5 * 60 * 1000,
  BRANCHES: 5 * 60 * 1000,
  // Bills change more frequently, so keep them fresh for a shorter window.
  BILLS: 2 * 60 * 1000,
  CONFIG: 5 * 60 * 1000,
} as const;

export const CACHE_KEYS = {
  CUSTOMERS: "customers",
  BRANCHES: "branches",
  BILLS_PREFIX: "bills_",
  BILLS: (branchId?: string) => `bills_${branchId || "all"}`,
  BRANCH_CONFIG: (branchId: string) => `branch_config_${branchId}`,
  TIER_CONFIG: (branchId: string) => `tier_config_${branchId}`,
} as const;

// Targeted invalidation so unrelated cached data (e.g. branch configs)
// survives writes to customers or bills.
export const invalidate = {
  customers: () => cache.delete(CACHE_KEYS.CUSTOMERS),
  bills: () => cache.deleteByPrefix(CACHE_KEYS.BILLS_PREFIX),
  branches: () => cache.delete(CACHE_KEYS.BRANCHES),
  branchConfig: (branchId: string) =>
    cache.delete(CACHE_KEYS.BRANCH_CONFIG(branchId)),
} as const;
