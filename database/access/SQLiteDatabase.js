const Database = require('better-sqlite3');
const IDatabase = require('./IDatabase');
const path = require('path');

/**
 * SQLite Database Implementation using better-sqlite3
 */
class SQLiteDatabase extends IDatabase {
  constructor(dbPath = null) {
    super();
    this.dbPath = dbPath || path.join(__dirname, '..', 'db', 'deepRemember.db');
    this.db = null;
    this.isInitialized = false;
  }

  /**
   * Initialize the database connection and create tables
   */
  async initialize() {
    try {
      // Create database directory if it doesn't exist
      const fs = require('fs');
      const dbDir = path.dirname(this.dbPath);
      if (!fs.existsSync(dbDir)) {
        fs.mkdirSync(dbDir, { recursive: true });
      }

      // Open database connection
      this.db = new Database(this.dbPath);
      
      // Enable WAL mode for better concurrency
      this.db.pragma('journal_mode = WAL');
      
      // Create tables if they don't exist
      await this.createTables();
      
      this.isInitialized = true;
      console.log(`[DB] SQLite database initialized at: ${this.dbPath}`);
    } catch (error) {
      console.error('[DB] Failed to initialize SQLite database:', error);
      throw error;
    }
  }

  /**
   * Create database tables
   */
  async createTables() {
    const createUsersTable = `
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT UNIQUE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    const createCardsTable = `
      CREATE TABLE IF NOT EXISTS cards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        card_id TEXT NOT NULL,
        word TEXT NOT NULL,
        translation TEXT,
        context TEXT,
        state INTEGER DEFAULT 0,
        due DATETIME NOT NULL,
        stability REAL DEFAULT 0,
        difficulty REAL DEFAULT 0,
        elapsed_days INTEGER DEFAULT 0,
        scheduled_days INTEGER DEFAULT 0,
        reps INTEGER DEFAULT 0,
        lapses INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_reviewed DATETIME,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
        UNIQUE(user_id, card_id)
      )
    `;

    const createIndexes = `
      CREATE INDEX IF NOT EXISTS idx_cards_user_id ON cards(user_id);
      CREATE INDEX IF NOT EXISTS idx_cards_due ON cards(due);
      CREATE INDEX IF NOT EXISTS idx_cards_state ON cards(state);
    `;

    try {
      this.db.exec(createUsersTable);
      this.db.exec(createCardsTable);
      this.db.exec(createIndexes);
      console.log('[DB] Database tables created successfully');
    } catch (error) {
      console.error('[DB] Failed to create tables:', error);
      throw error;
    }
  }

  /**
   * Close the database connection
   */
  async close() {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.isInitialized = false;
      console.log('[DB] Database connection closed');
    }
  }

  /**
   * Execute a query with parameters
   */
  async query(sql, params = {}) {
    if (!this.isInitialized) {
      throw new Error('Database not initialized');
    }

    try {
      const stmt = this.db.prepare(sql);
      const results = stmt.all(Object.values(params));
      return results;
    } catch (error) {
      console.error('[DB] Query error:', error);
      throw error;
    }
  }

  /**
   * Execute a single query that returns one row
   */
  async queryOne(sql, params = {}) {
    if (!this.isInitialized) {
      throw new Error('Database not initialized');
    }

    try {
      const stmt = this.db.prepare(sql);
      const result = stmt.get(Object.values(params));
      return result || null;
    } catch (error) {
      console.error('[DB] QueryOne error:', error);
      throw error;
    }
  }

  /**
   * Execute a query that doesn't return results
   */
  async execute(sql, params = {}) {
    if (!this.isInitialized) {
      throw new Error('Database not initialized');
    }

    try {
      const stmt = this.db.prepare(sql);
      const result = stmt.run(Object.values(params));
      return {
        changes: result.changes,
        lastInsertRowid: result.lastInsertRowid
      };
    } catch (error) {
      console.error('[DB] Execute error:', error);
      throw error;
    }
  }

  /**
   * Begin a transaction
   */
  async beginTransaction() {
    if (!this.isInitialized) {
      throw new Error('Database not initialized');
    }

    try {
      const transaction = this.db.transaction(() => {});
      return transaction;
    } catch (error) {
      console.error('[DB] Begin transaction error:', error);
      throw error;
    }
  }

  /**
   * Commit a transaction
   */
  async commitTransaction(transaction) {
    if (!this.isInitialized) {
      throw new Error('Database not initialized');
    }

    try {
      // In better-sqlite3, transactions are automatically committed
      // when the transaction function completes
      return true;
    } catch (error) {
      console.error('[DB] Commit transaction error:', error);
      throw error;
    }
  }

  /**
   * Rollback a transaction
   */
  async rollbackTransaction(transaction) {
    if (!this.isInitialized) {
      throw new Error('Database not initialized');
    }

    try {
      // In better-sqlite3, transactions are automatically rolled back
      // if an error occurs within the transaction function
      return true;
    } catch (error) {
      console.error('[DB] Rollback transaction error:', error);
      throw error;
    }
  }

  /**
   * Get the last inserted row ID
   */
  async getLastInsertId() {
    if (!this.isInitialized) {
      throw new Error('Database not initialized');
    }

    try {
      const result = this.db.prepare('SELECT last_insert_rowid() as id').get();
      return result.id;
    } catch (error) {
      console.error('[DB] Get last insert ID error:', error);
      throw error;
    }
  }

  /**
   * Check if the database is connected
   */
  async isConnected() {
    return this.isInitialized && this.db !== null;
  }

  /**
   * Get database statistics
   */
  async getStats() {
    if (!this.isInitialized) {
      throw new Error('Database not initialized');
    }

    try {
      const userCount = this.db.prepare('SELECT COUNT(*) as count FROM users').get();
      const cardCount = this.db.prepare('SELECT COUNT(*) as count FROM cards').get();
      
      return {
        users: userCount.count,
        cards: cardCount.count,
        database: 'SQLite',
        path: this.dbPath
      };
    } catch (error) {
      console.error('[DB] Get stats error:', error);
      throw error;
    }
  }
}

module.exports = SQLiteDatabase;
