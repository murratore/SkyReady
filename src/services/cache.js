/**
 * Cache Service
 * Handles caching of API responses and other data with TTL support
 */

const CACHE_PREFIX = 'astroweather_cache_';
const DEFAULT_TTL = 3 * 60 * 60 * 1000; // 3 hours in milliseconds

class CacheService {
    constructor() {
        this.memoryCache = new Map();
    }

    /**
     * Generate a cache key
     */
    _generateKey(key) {
        return `${CACHE_PREFIX}${key}`;
    }

    /**
     * Get cached data
     * @param {string} key - Cache key
     * @returns {any|null} Cached data or null if expired/missing
     */
    get(key) {
        const cacheKey = this._generateKey(key);

        // Try memory cache first
        if (this.memoryCache.has(cacheKey)) {
            const cached = this.memoryCache.get(cacheKey);
            if (Date.now() < cached.expiry) {
                return cached.data;
            }
            this.memoryCache.delete(cacheKey);
        }

        // Try localStorage
        try {
            const stored = localStorage.getItem(cacheKey);
            if (stored) {
                const cached = JSON.parse(stored);
                if (Date.now() < cached.expiry) {
                    // Restore to memory cache
                    this.memoryCache.set(cacheKey, cached);
                    return cached.data;
                }
                // Expired, remove it
                localStorage.removeItem(cacheKey);
            }
        } catch (e) {
            console.warn('Cache read error:', e);
        }

        return null;
    }

    /**
     * Set cached data
     * @param {string} key - Cache key
     * @param {any} data - Data to cache
     * @param {number} ttl - Time to live in milliseconds (default: 3 hours)
     */
    set(key, data, ttl = DEFAULT_TTL) {
        const cacheKey = this._generateKey(key);
        const cached = {
            data,
            expiry: Date.now() + ttl,
            timestamp: Date.now()
        };

        // Store in memory
        this.memoryCache.set(cacheKey, cached);

        // Store in localStorage
        try {
            localStorage.setItem(cacheKey, JSON.stringify(cached));
        } catch (e) {
            console.warn('Cache write error:', e);
            // If storage is full, clear old cache entries
            this._cleanupStorage();
        }
    }

    /**
     * Remove cached data
     * @param {string} key - Cache key
     */
    remove(key) {
        const cacheKey = this._generateKey(key);
        this.memoryCache.delete(cacheKey);
        try {
            localStorage.removeItem(cacheKey);
        } catch (e) {
            console.warn('Cache remove error:', e);
        }
    }

    /**
     * Clear all cache
     */
    clear() {
        this.memoryCache.clear();
        try {
            const keys = Object.keys(localStorage).filter(k => k.startsWith(CACHE_PREFIX));
            keys.forEach(k => localStorage.removeItem(k));
        } catch (e) {
            console.warn('Cache clear error:', e);
        }
    }

    /**
     * Get cache metadata (for debugging/display)
     */
    getMeta(key) {
        const cacheKey = this._generateKey(key);
        try {
            const stored = localStorage.getItem(cacheKey);
            if (stored) {
                const cached = JSON.parse(stored);
                return {
                    timestamp: new Date(cached.timestamp),
                    expiry: new Date(cached.expiry),
                    isExpired: Date.now() >= cached.expiry,
                    age: Date.now() - cached.timestamp
                };
            }
        } catch (e) {
            // Ignore
        }
        return null;
    }

    /**
     * Cleanup old cache entries when storage is full
     */
    _cleanupStorage() {
        try {
            const keys = Object.keys(localStorage).filter(k => k.startsWith(CACHE_PREFIX));
            const entries = keys.map(k => {
                try {
                    const data = JSON.parse(localStorage.getItem(k));
                    return { key: k, timestamp: data.timestamp || 0 };
                } catch {
                    return { key: k, timestamp: 0 };
                }
            });

            // Sort by oldest first and remove half
            entries.sort((a, b) => a.timestamp - b.timestamp);
            const toRemove = Math.ceil(entries.length / 2);
            entries.slice(0, toRemove).forEach(e => localStorage.removeItem(e.key));
        } catch (e) {
            console.warn('Cache cleanup error:', e);
        }
    }
}

export const cacheService = new CacheService();
export default cacheService;
