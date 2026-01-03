const IDbCache = require('./IDbCache');

/**
 * In-Memory Database Cache Implementation
 * Provides caching for key-value database tables
 */
class DbCache extends IDbCache {
  constructor() {
    super();
    this.cache = new Map();
  }

  /**
   * Get a value from cache by key
   * @param {string} key - Cache key
   * @returns {Promise<Object|null>} Cached value or null if not found
   */
  async get(key) {
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }
    return null;
  }

  /**
   * Set a value in cache
   * @param {string} key - Cache key
   * @param {Object} value - Value to cache
   * @returns {Promise<void>}
   */
  async set(key, value) {
    this.cache.set(key, value);
  }

  /**
   * Check if a key exists in cache
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} True if key exists
   */
  async has(key) {
    return this.cache.has(key);
  }

  /**
   * Remove a specific key from cache
   * @param {string} key - Cache key
   * @returns {Promise<void>}
   */
  async delete(key) {
    this.cache.delete(key);
  }

  /**
   * Clear all cached values (invalidate entire cache)
   * @returns {Promise<void>}
   */
  async clear() {
    this.cache.clear();
  }

  /**
   * Get all cached keys
   * @returns {Promise<Array<string>>} Array of cache keys
   */
  async keys() {
    return Array.from(this.cache.keys());
  }

  /**
   * Get cache size (number of cached items)
   * @returns {Promise<number>} Number of cached items
   */
  async size() {
    return this.cache.size;
  }
}

module.exports = DbCache;

