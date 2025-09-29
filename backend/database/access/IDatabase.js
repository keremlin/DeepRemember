/**
 * Abstract Database Interface
 * Defines the contract for all database implementations
 */
class IDatabase {
  /**
   * Initialize the database connection
   */
  async initialize() {
    throw new Error('initialize() method must be implemented');
  }

  /**
   * Close the database connection
   */
  async close() {
    throw new Error('close() method must be implemented');
  }

  /**
   * Execute a query with parameters
   * @param {string} sql - SQL query
   * @param {Object} params - Query parameters
   * @returns {Promise<Array>} - Query results
   */
  async query(sql, params = {}) {
    throw new Error('query() method must be implemented');
  }

  /**
   * Execute a single query that returns one row
   * @param {string} sql - SQL query
   * @param {Object} params - Query parameters
   * @returns {Promise<Object|null>} - Single row result
   */
  async queryOne(sql, params = {}) {
    throw new Error('queryOne() method must be implemented');
  }

  /**
   * Execute a query that doesn't return results (INSERT, UPDATE, DELETE)
   * @param {string} sql - SQL query
   * @param {Object} params - Query parameters
   * @returns {Promise<Object>} - Execution result
   */
  async execute(sql, params = {}) {
    throw new Error('execute() method must be implemented');
  }

  /**
   * Begin a transaction
   * @returns {Promise<Object>} - Transaction object
   */
  async beginTransaction() {
    throw new Error('beginTransaction() method must be implemented');
  }

  /**
   * Commit a transaction
   * @param {Object} transaction - Transaction object
   */
  async commitTransaction(transaction) {
    throw new Error('commitTransaction() method must be implemented');
  }

  /**
   * Rollback a transaction
   * @param {Object} transaction - Transaction object
   */
  async rollbackTransaction(transaction) {
    throw new Error('rollbackTransaction() method must be implemented');
  }

  /**
   * Get the last inserted row ID
   * @returns {Promise<number>} - Last inserted ID
   */
  async getLastInsertId() {
    throw new Error('getLastInsertId() method must be implemented');
  }

  /**
   * Check if the database is connected
   * @returns {Promise<boolean>} - Connection status
   */
  async isConnected() {
    throw new Error('isConnected() method must be implemented');
  }
}

module.exports = IDatabase;
