/**
 * Database Cache Interface
 * Defines the contract for all cache implementations
 */
class IDbCache {
  /**
   * Get a value from cache by key
   * @param {string} key - Cache key
   * @returns {Promise<Object|null>} Cached value or null if not found
   */
  async get(key) {
    throw new Error('get() method must be implemented');
  }

  /**
   * Set a value in cache
   * @param {string} key - Cache key
   * @param {Object} value - Value to cache
   * @returns {Promise<void>}
   */
  async set(key, value) {
    throw new Error('set() method must be implemented');
  }

  /**
   * Check if a key exists in cache
   * @param {string} key - Cache key
   * @returns {Promise<boolean>} True if key exists
   */
  async has(key) {
    throw new Error('has() method must be implemented');
  }

  /**
   * Remove a specific key from cache
   * @param {string} key - Cache key
   * @returns {Promise<void>}
   */
  async delete(key) {
    throw new Error('delete() method must be implemented');
  }

  /**
   * Clear all cached values (invalidate entire cache)
   * @returns {Promise<void>}
   */
  async clear() {
    throw new Error('clear() method must be implemented');
  }

  /**
   * Get all cached keys
   * @returns {Promise<Array<string>>} Array of cache keys
   */
  async keys() {
    throw new Error('keys() method must be implemented');
  }

  /**
   * Get cache size (number of cached items)
   * @returns {Promise<number>} Number of cached items
   */
  async size() {
    throw new Error('size() method must be implemented');
  }
}

module.exports = IDbCache;

