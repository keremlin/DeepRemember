const SQLiteDatabase = require('./SQLiteDatabase');
const SupabaseDatabase = require('./SupabaseDatabase');
const DeepRememberRepository = require('./DeepRememberRepository');

/**
 * Database Factory - Manages database instances and provides easy switching
 */
class DatabaseFactory {
  constructor() {
    this.database = null;
    this.repository = null;
    this.databaseType = null;
  }

  /**
   * Initialize database with specified type
   * @param {string} type - Database type ('sqlite', 'supabase', 'mysql', 'postgresql', etc.)
   * @param {Object} config - Database configuration
   */
  async initialize(type = 'supabase', config = {}) {
    try {
      this.databaseType = type.toLowerCase();
      
      switch (this.databaseType) {
        case 'sqlite':
          this.database = new SQLiteDatabase(config.dbPath);
          break;
        case 'supabase':
          this.database = new SupabaseDatabase(config);
          break;
        case 'mysql':
          // TODO: Implement MySQL database
          throw new Error('MySQL database not implemented yet');
        case 'postgresql':
          // TODO: Implement PostgreSQL database
          throw new Error('PostgreSQL database not implemented yet');
        default:
          throw new Error(`Unsupported database type: ${type}`);
      }

      // Initialize the database
      await this.database.initialize();
      
      // Create repository
      this.repository = new DeepRememberRepository(this.database);
      
      console.log(`[DB-FACTORY] Database initialized with type: ${this.databaseType}`);
      return this.repository;
    } catch (error) {
      console.error('[DB-FACTORY] Failed to initialize database:', error);
      throw error;
    }
  }

  /**
   * Get the current database instance
   */
  getDatabase() {
    if (!this.database) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.database;
  }

  /**
   * Get the current repository instance
   */
  getRepository() {
    if (!this.repository) {
      throw new Error('Repository not initialized. Call initialize() first.');
    }
    return this.repository;
  }

  /**
   * Get database type
   */
  getDatabaseType() {
    return this.databaseType;
  }

  /**
   * Close database connection
   */
  async close() {
    if (this.database) {
      await this.database.close();
      this.database = null;
      this.repository = null;
      this.databaseType = null;
      console.log('[DB-FACTORY] Database connection closed');
    }
  }

  /**
   * Check if database is connected
   */
  async isConnected() {
    if (!this.database) {
      return false;
    }
    return await this.database.isConnected();
  }

  /**
   * Get database statistics
   */
  async getStats() {
    if (!this.database) {
      throw new Error('Database not initialized');
    }
    return await this.database.getStats();
  }

  /**
   * Switch database type (reinitialize with new type)
   */
  async switchDatabase(type, config = {}) {
    console.log(`[DB-FACTORY] Switching database from ${this.databaseType} to ${type}`);
    
    // Close current connection
    await this.close();
    
    // Initialize new database
    return await this.initialize(type, config);
  }
}

// Create singleton instance
const databaseFactory = new DatabaseFactory();

module.exports = databaseFactory;
