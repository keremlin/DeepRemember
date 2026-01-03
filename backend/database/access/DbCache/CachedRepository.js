const DbCache = require('./DbCache');

/**
 * Cached Repository Wrapper
 * Wraps a repository to provide transparent caching for key-value operations
 * 
 * Uses JavaScript Proxy to intercept method calls and provide caching transparently
 */
class CachedRepository {
  /**
   * @param {Object} repository - The repository instance to wrap
   * @param {Object} options - Cache configuration options
   * @param {string} options.keyField - The field name used as the cache key (default: 'keyname')
   * @param {string} options.getByKeyMethod - Method name to get by key (default: 'getByKeyname')
   * @param {DbCache} options.cache - Optional custom cache instance (default: new DbCache())
   */
  constructor(repository, options = {}) {
    this.repository = repository;
    this.keyField = options.keyField || 'keyname';
    this.getByKeyMethod = options.getByKeyMethod || 'getByKeyname';
    this.cache = options.cache || new DbCache();

    // Create a proxy to intercept method calls
    return new Proxy(this, {
      get: (target, prop) => {
        // If it's a method we've explicitly defined, return it
        if (typeof target[prop] === 'function') {
          return target[prop].bind(target);
        }

        // Intercept the getByKeyname method to use cache
        if (prop === target.getByKeyMethod) {
          return async (key) => {
            // Check cache first
            const cached = await target.cache.get(key);
            if (cached !== null) {
              return cached;
            }

            // If not in cache, load from database
            const method = target.repository[target.getByKeyMethod];
            if (!method) {
              throw new Error(`Method ${target.getByKeyMethod} not found in repository`);
            }

            const value = await method.call(target.repository, key);
            
            // Store in cache if found
            if (value !== null) {
              await target.cache.set(key, value);
            }

            return value;
          };
        }

        // Intercept create, update, delete methods to invalidate cache
        if (prop === 'create') {
          return async (data) => {
            const result = await target.repository.create(data);
            await target.cache.clear();
            return result;
          };
        }

        if (prop === 'update') {
          return async (key, data) => {
            const result = await target.repository.update(key, data);
            await target.cache.clear();
            return result;
          };
        }

        if (prop === 'delete') {
          return async (key) => {
            const result = await target.repository.delete(key);
            await target.cache.clear();
            return result;
          };
        }

        if (prop === 'deleteById') {
          return async (id) => {
            const result = await target.repository.deleteById(id);
            await target.cache.clear();
            return result;
          };
        }

        // For all other methods, proxy to the underlying repository
        const value = target.repository[prop];
        if (typeof value === 'function') {
          return value.bind(target.repository);
        }
        
        return value;
      }
    });
  }

  /**
   * Manually invalidate the entire cache
   * @returns {Promise<void>}
   */
  async invalidateCache() {
    await this.cache.clear();
  }

  /**
   * Get cache statistics
   * @returns {Promise<Object>} Cache statistics
   */
  async getCacheStats() {
    return {
      size: await this.cache.size(),
      keys: await this.cache.keys()
    };
  }
}

module.exports = CachedRepository;

