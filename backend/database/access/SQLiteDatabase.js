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
      const FileSystemFactory = require('../../filesystem/FileSystemFactory');
      const fileSystem = FileSystemFactory.createDefault();
      const dbDir = path.dirname(this.dbPath);
      if (!fileSystem.existsSync(dbDir)) {
        fileSystem.mkdirSync(dbDir, { recursive: true });
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

    const createSentenceAnalysisCacheTable = `
      CREATE TABLE IF NOT EXISTS sentence_analysis_cache (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        hash TEXT UNIQUE NOT NULL,
        analysis_data TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    const createSentenceAnalysisIndexes = `
      CREATE INDEX IF NOT EXISTS idx_sentence_analysis_hash ON sentence_analysis_cache(hash);
    `;

    const createLabelsTable = `
      CREATE TABLE IF NOT EXISTS labels (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('system', 'user')),
        user_id TEXT,
        color TEXT DEFAULT '#3B82F6',
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(name, user_id, type),
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
      )
    `;

    const createCardLabelsTable = `
      CREATE TABLE IF NOT EXISTS card_labels (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        card_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        label_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (card_id, user_id) REFERENCES cards(card_id, user_id) ON DELETE CASCADE,
        FOREIGN KEY (label_id) REFERENCES labels(id) ON DELETE CASCADE,
        UNIQUE(card_id, user_id, label_id)
      )
    `;

    const createLabelIndexes = `
      CREATE INDEX IF NOT EXISTS idx_labels_user_id ON labels(user_id);
      CREATE INDEX IF NOT EXISTS idx_labels_type ON labels(type);
      CREATE INDEX IF NOT EXISTS idx_card_labels_card_id ON card_labels(card_id, user_id);
      CREATE INDEX IF NOT EXISTS idx_card_labels_label_id ON card_labels(label_id);
    `;

    const createChatTemplatesTable = `
      CREATE TABLE IF NOT EXISTS chattemplates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        thema TEXT,
        persons TEXT,
        scenario TEXT,
        questions_and_thema TEXT,
        words_to_use TEXT,
        words_not_to_use TEXT,
        grammar_to_use TEXT,
        level TEXT CHECK (level IN ('A1', 'A2', 'B1', 'B2')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    const createUserChatTemplatesTable = `
      CREATE TABLE IF NOT EXISTS user_chattemplates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        template_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
        FOREIGN KEY (template_id) REFERENCES chattemplates(id) ON DELETE CASCADE,
        UNIQUE(user_id, template_id)
      )
    `;

    const createChatTemplateIndexes = `
      CREATE INDEX IF NOT EXISTS idx_user_chattemplates_user_id ON user_chattemplates(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_chattemplates_template_id ON user_chattemplates(template_id);
      CREATE INDEX IF NOT EXISTS idx_chattemplates_level ON chattemplates(level);
    `;

    const createUserConfigsTable = `
      CREATE TABLE IF NOT EXISTS user_configs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        label TEXT NOT NULL,
        value_type TEXT NOT NULL DEFAULT 'string',
        value TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
      )
    `;

    const createUserConfigsIndexes = `
      CREATE INDEX IF NOT EXISTS idx_user_configs_user_id ON user_configs(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_configs_name ON user_configs(user_id, name);
    `;

    try {
      this.db.exec(createUsersTable);
      this.db.exec(createCardsTable);
      this.db.exec(createSentenceAnalysisCacheTable);
      this.db.exec(createLabelsTable);
      this.db.exec(createCardLabelsTable);
      this.db.exec(createChatTemplatesTable);
      this.db.exec(createUserChatTemplatesTable);
      this.db.exec(createUserConfigsTable);
      this.db.exec(createIndexes);
      this.db.exec(createSentenceAnalysisIndexes);
      this.db.exec(createLabelIndexes);
      this.db.exec(createChatTemplateIndexes);
      this.db.exec(createUserConfigsIndexes);
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
      
      // Count the number of placeholders in the SQL
      const placeholderCount = (sql.match(/\?/g) || []).length;
      
      // If we have named parameters but the SQL uses positional placeholders,
      // we need to extract the values in the right order
      const paramValues = Object.values(params);
      
      // Only take as many values as there are placeholders
      const finalParams = paramValues.slice(0, placeholderCount);
      
      const results = stmt.all(finalParams);
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
      
      // Count the number of placeholders in the SQL
      const placeholderCount = (sql.match(/\?/g) || []).length;
      const paramValues = Object.values(params);
      const finalParams = paramValues.slice(0, placeholderCount);
      
      const result = stmt.get(finalParams);
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
      
      // Count the number of placeholders in the SQL
      const placeholderCount = (sql.match(/\?/g) || []).length;
      const paramValues = Object.values(params);
      const finalParams = paramValues.slice(0, placeholderCount);
      
      const result = stmt.run(finalParams);
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
   * Check database health - performs comprehensive health check
   * @returns {Promise<Object>} - Health check results
   */
  async checkHealth() {
    const startTime = Date.now();
    const health = {
      status: 'unknown',
      connected: false,
      responseTime: 0,
      database: 'SQLite',
      path: this.dbPath,
      initialized: this.isInitialized,
      tests: {
        connection: false,
        query: false,
        tables: false
      },
      stats: {},
      error: null
    };

    try {
      // Test 1: Check if initialized and connected
      health.connected = this.isInitialized && this.db !== null;
      health.tests.connection = health.connected;

      if (!health.connected) {
        health.status = 'unhealthy';
        health.error = 'Database not initialized or connection lost';
        health.responseTime = Date.now() - startTime;
        return health;
      }

      // Test 2: Simple query test
      try {
        const testQuery = this.db.prepare('SELECT 1 as test').get();
        health.tests.query = testQuery && testQuery.test === 1;
      } catch (queryError) {
        health.tests.query = false;
        health.error = `Query test failed: ${queryError.message}`;
      }

      // Test 3: Check if tables exist and get stats
      try {
        const userCount = this.db.prepare('SELECT COUNT(*) as count FROM users').get();
        const cardCount = this.db.prepare('SELECT COUNT(*) as count FROM cards').get();
        let labelCount = { count: 0 };
        try {
          labelCount = this.db.prepare('SELECT COUNT(*) as count FROM labels').get();
        } catch (e) {
          // Labels table might not exist, that's okay
        }
        
        health.stats = {
          users: userCount.count,
          cards: cardCount.count,
          labels: labelCount.count || 0
        };
        health.tests.tables = true;
      } catch (tableError) {
        health.tests.tables = false;
        health.error = `Table check failed: ${tableError.message}`;
      }

      // Determine overall status
      const allTestsPassed = health.tests.connection && health.tests.query && health.tests.tables;
      health.status = allTestsPassed ? 'healthy' : 'degraded';

      health.responseTime = Date.now() - startTime;
      return health;
    } catch (error) {
      health.status = 'unhealthy';
      health.error = error.message;
      health.responseTime = Date.now() - startTime;
      return health;
    }
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
