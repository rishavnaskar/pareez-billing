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
      ttl
    });
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;

    const now = Date.now();
    if (now - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data as T;
  }

  clear(): void {
    this.cache.clear();
  }

  // Clean expired entries
  cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key);
      }
    }
  }
}

export const cache = new SimpleCache();

// Cache keys
export const CACHE_KEYS = {
  CUSTOMERS: 'customers',
  BRANCHES: 'branches',
  BILLS: (branchId?: string) => `bills_${branchId || 'all'}`,
  BILL_NUMBER: (branchId?: string) => `bill_number_${branchId || 'all'}_${new Date().toDateString()}`,
  BRANCH_CONFIG: (branchId: string) => `branch_config_${branchId}`,
  TIER_CONFIG: (branchId: string) => `tier_config_${branchId}`,
} as const;
