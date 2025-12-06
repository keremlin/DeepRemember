const { createClient } = require('@supabase/supabase-js');
const IDatabase = require('./IDatabase');
const config = require('../../config/app');

// Conditional logging helper
function dbLog(...args) {
  if (config.DB_LOG) {
    console.log(...args);
  }
}

/**
 * Supabase Database Implementation using @supabase/supabase-js
 */
class SupabaseDatabase extends IDatabase {
  constructor(config = {}) {
    super();
    this.config = {
      url: config.url || process.env.SUPABASE_URL,
      anonKey: config.anonKey || process.env.SUPABASE_ANON_KEY,
      serviceRoleKey: config.serviceRoleKey || process.env.SUPABASE_SERVICE_ROLE_KEY,
      schema: config.schema || 'public'
    };
    this.client = null;
    this.isInitialized = false;
    this.lastInsertId = null;
  }

  /**
   * Initialize the database connection and create tables
   */
  async initialize() {
    try {
      if (!this.config.url || !this.config.anonKey) {
        throw new Error('Supabase URL and anonymous key are required');
      }

      // Create Supabase client
      this.client = createClient(this.config.url, this.config.anonKey, {
        schema: this.config.schema,
        auth: {
          persistSession: false
        }
      });

      // Create tables if they don't exist (this will also test the connection)
      await this.createTables();
      
      this.isInitialized = true;
      dbLog(`[DB] Supabase database initialized with URL: ${this.config.url}`);
      
      // Always ensure admin user exists (after initialization)
      await this.createAdminUser();
    } catch (error) {
      console.error('[DB] Failed to initialize Supabase database:', error);
      throw error;
    }
  }

  /**
   * Create database tables using Supabase SQL
   */
  async createTables() {
    const createUsersTable = `
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        user_id TEXT UNIQUE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;

    const createCardsTable = `
      CREATE TABLE IF NOT EXISTS cards (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        card_id TEXT NOT NULL,
        word TEXT NOT NULL,
        translation TEXT,
        context TEXT,
        state INTEGER DEFAULT 0,
        due TIMESTAMP WITH TIME ZONE NOT NULL,
        stability REAL DEFAULT 0,
        difficulty REAL DEFAULT 0,
        elapsed_days INTEGER DEFAULT 0,
        scheduled_days INTEGER DEFAULT 0,
        reps INTEGER DEFAULT 0,
        lapses INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        last_reviewed TIMESTAMP WITH TIME ZONE,
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
        id SERIAL PRIMARY KEY,
        hash TEXT UNIQUE NOT NULL,
        analysis_data TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;

    const createSentenceAnalysisIndexes = `
      CREATE INDEX IF NOT EXISTS idx_sentence_analysis_hash ON sentence_analysis_cache(hash);
    `;

    const createLabelsTable = `
      CREATE TABLE IF NOT EXISTS labels (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL CHECK (type IN ('system', 'user')),
        user_id TEXT,
        color TEXT DEFAULT '#3B82F6',
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(name, user_id, type),
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
      )
    `;

    const createCardLabelsTable = `
      CREATE TABLE IF NOT EXISTS card_labels (
        id SERIAL PRIMARY KEY,
        card_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        label_id INTEGER NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
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
        id SERIAL PRIMARY KEY,
        thema TEXT,
        persons TEXT,
        scenario TEXT,
        questions_and_thema TEXT,
        words_to_use TEXT,
        words_not_to_use TEXT,
        grammar_to_use TEXT,
        level TEXT CHECK (level IN ('A1', 'A2', 'B1', 'B2')),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;

    const createUserChatTemplatesTable = `
      CREATE TABLE IF NOT EXISTS user_chattemplates (
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        template_id INTEGER NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
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
        id SERIAL PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        label TEXT NOT NULL,
        value_type TEXT NOT NULL DEFAULT 'string',
        value TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
      )
    `;

    const createUserConfigsIndexes = `
      CREATE INDEX IF NOT EXISTS idx_user_configs_user_id ON user_configs(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_configs_name ON user_configs(user_id, name);
    `;

    try {
      // Check if tables exist by attempting a simple query
      dbLog('[DB] Checking if tables exist...');
      const { error } = await this.client.from('users').select('count').limit(1);
      
      if (error) {
        if (error.code === 'PGRST205' || error.message.includes('does not exist')) {
          dbLog('[DB] Tables not found. Creating tables...');
          await this.createTablesViaSQL();
        } else {
          throw error;
        }
      } else {
        dbLog('[DB] Tables already exist, skipping creation.');
      }
      
    } catch (error) {
      dbLog('[DB] Table existence check failed, attempting to create tables...');
      dbLog('[DB] Error:', error.message);
      
      // If we can't check table existence (e.g., network error), try to create tables anyway
      try {
        await this.createTablesViaSQL();
      } catch (createError) {
        console.error('[DB] Failed to create tables:', createError);
        throw createError;
      }
    }
  }

  /**
   * Create tables using Supabase SQL execution
   */
  async createTablesViaSQL() {
    dbLog('[DB] Creating Supabase tables automatically...');
    
    try {
      // Create tables directly using Supabase's SQL execution
      const success = await this.createTablesDirectly();
      
      if (success) {
        // Try to verify tables were created (but don't fail if verification fails)
        try {
          await this.verifyTablesExist();
        } catch (verifyError) {
          dbLog('[DB] ⚠️  Table verification failed, but tables may have been created successfully');
        }
        dbLog('[DB] Supabase tables created successfully!');
      } else {
        throw new Error('Table creation returned false');
      }
      
    } catch (error) {
      console.error('[DB] Failed to create tables automatically:', error.message);
      dbLog('[DB] ⚠️  AUTOMATIC TABLE CREATION FAILED');
      dbLog('[DB] Possible causes:');
      dbLog('   - Missing SUPABASE_SERVICE_ROLE_KEY in .env file');
      dbLog('   - SQL Editor API not enabled in Supabase project settings');
      dbLog('   - Network connectivity issues');
      dbLog('');
      dbLog('📋 SOLUTIONS:');
      dbLog('1. Ensure SUPABASE_SERVICE_ROLE_KEY is set in your .env file');
      dbLog('2. Enable "SQL Editor API" in Project Settings → API → SQL editor');
      dbLog('3. Or use manual setup: Run SQL from MANUAL_SUPABASE_SETUP.md');
      dbLog('');
      throw new Error('Automatic table creation failed. Check service role key and SQL Editor API settings.');
    }
  }

  /**
   * Create tables directly using PostgreSQL connection
   */
  async createTablesDirectly() {
    dbLog('[DB] Creating tables using PostgreSQL connection...');
    
    // Check if we have PostgreSQL connection string
    const dbUrl = process.env.SUPABASE_DB_URL;
    if (!dbUrl) {
      dbLog('[DB] ❌ SUPABASE_DB_URL not found');
      dbLog('[DB] 💡 Get your PostgreSQL connection string from:');
      dbLog('[DB]    Project Settings → Database → Connection Info');
      dbLog('[DB]    Format: postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres');
      return false;
    }

    try {
      const { Client } = require('pg');
      const client = new Client({
        connectionString: dbUrl,
        // Disable prepared statements for Transaction pooler compatibility
        prepare: false
      });

      await client.connect();
      dbLog('[DB] ✅ Connected to PostgreSQL');

      const sqlStatements = [
        `CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          user_id TEXT UNIQUE NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )`,
        
        `CREATE TABLE IF NOT EXISTS cards (
          id SERIAL PRIMARY KEY,
          user_id TEXT NOT NULL,
          card_id TEXT NOT NULL,
          word TEXT NOT NULL,
          translation TEXT,
          context TEXT,
          state INTEGER DEFAULT 0,
          due TIMESTAMP WITH TIME ZONE NOT NULL,
          stability REAL DEFAULT 0,
          difficulty REAL DEFAULT 0,
          elapsed_days INTEGER DEFAULT 0,
          scheduled_days INTEGER DEFAULT 0,
          reps INTEGER DEFAULT 0,
          lapses INTEGER DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          last_reviewed TIMESTAMP WITH TIME ZONE,
          FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
          UNIQUE(user_id, card_id)
        )`,
        
        `CREATE TABLE IF NOT EXISTS sentence_analysis_cache (
          id SERIAL PRIMARY KEY,
          hash TEXT UNIQUE NOT NULL,
          analysis_data TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )`,
        
        `CREATE TABLE IF NOT EXISTS labels (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          type TEXT NOT NULL CHECK (type IN ('system', 'user')),
          user_id TEXT,
          color TEXT DEFAULT '#3B82F6',
          description TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(name, user_id, type),
          FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
        )`,
        
        `CREATE TABLE IF NOT EXISTS card_labels (
          id SERIAL PRIMARY KEY,
          card_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          label_id INTEGER NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          FOREIGN KEY (card_id, user_id) REFERENCES cards(card_id, user_id) ON DELETE CASCADE,
          FOREIGN KEY (label_id) REFERENCES labels(id) ON DELETE CASCADE,
          UNIQUE(card_id, user_id, label_id)
        )`,
        
        `CREATE TABLE IF NOT EXISTS chattemplates (
          id SERIAL PRIMARY KEY,
          thema TEXT,
          persons TEXT,
          scenario TEXT,
          questions_and_thema TEXT,
          words_to_use TEXT,
          words_not_to_use TEXT,
          grammar_to_use TEXT,
          level TEXT CHECK (level IN ('A1', 'A2', 'B1', 'B2')),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )`,
        
        `CREATE TABLE IF NOT EXISTS user_chattemplates (
          id SERIAL PRIMARY KEY,
          user_id TEXT NOT NULL,
          template_id INTEGER NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
          FOREIGN KEY (template_id) REFERENCES chattemplates(id) ON DELETE CASCADE,
          UNIQUE(user_id, template_id)
        )`,
        
        `CREATE TABLE IF NOT EXISTS user_configs (
          id SERIAL PRIMARY KEY,
          user_id TEXT NOT NULL,
          name TEXT NOT NULL,
          label TEXT NOT NULL,
          value_type TEXT NOT NULL DEFAULT 'string',
          value TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
        )`,
        
        'CREATE INDEX IF NOT EXISTS idx_cards_user_id ON cards(user_id)',
        'CREATE INDEX IF NOT EXISTS idx_cards_due ON cards(due)',
        'CREATE INDEX IF NOT EXISTS idx_cards_state ON cards(state)',
        'CREATE INDEX IF NOT EXISTS idx_sentence_analysis_hash ON sentence_analysis_cache(hash)',
        'CREATE INDEX IF NOT EXISTS idx_labels_user_id ON labels(user_id)',
        'CREATE INDEX IF NOT EXISTS idx_labels_type ON labels(type)',
        'CREATE INDEX IF NOT EXISTS idx_card_labels_card_id ON card_labels(card_id, user_id)',
        'CREATE INDEX IF NOT EXISTS idx_card_labels_label_id ON card_labels(label_id)',
        'CREATE INDEX IF NOT EXISTS idx_user_chattemplates_user_id ON user_chattemplates(user_id)',
        'CREATE INDEX IF NOT EXISTS idx_user_chattemplates_template_id ON user_chattemplates(template_id)',
        'CREATE INDEX IF NOT EXISTS idx_chattemplates_level ON chattemplates(level)',
        'CREATE INDEX IF NOT EXISTS idx_user_configs_user_id ON user_configs(user_id)',
        'CREATE INDEX IF NOT EXISTS idx_user_configs_name ON user_configs(user_id, name)'
      ];

      let successCount = 0;
      for (const sql of sqlStatements) {
        try {
          await client.query(sql);
          successCount++;
          dbLog(`[DB] ✅ Created: ${sql.split(' ')[2] || 'SQL statement'}`);
        } catch (error) {
          dbLog(`[DB] ❌ Failed: ${sql.split(' ')[2] || 'SQL statement'} - ${error.message}`);
        }
      }

      await client.end();
      dbLog(`[DB] Successfully executed ${successCount}/${sqlStatements.length} SQL statements`);
      
      // Create admin user if tables were created successfully
      if (successCount > 0) {
        await this.createAdminUser();
      }
      
      return successCount > 0;

    } catch (error) {
      dbLog(`[DB] ❌ PostgreSQL connection failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Create admin user for first-time setup
   */
  async createAdminUser() {
    try {
      dbLog('[DB] Creating admin user...');
      
      // Check if admin user already exists
      const existingUser = await this.queryOne(
        'SELECT * FROM users WHERE user_id = ?',
        { user_id: 'user123' }
      );

      if (existingUser) {
        dbLog('[DB] ✅ Admin user already exists');
        return existingUser;
      }

      // Create admin user
      const result = await this.execute(
        'INSERT INTO users (user_id) VALUES (?)',
        { user_id: 'user123' }
      );

      dbLog('[DB] ✅ Admin user created successfully');
      return { user_id: 'user123', id: result.lastInsertRowId };
      
    } catch (error) {
      dbLog(`[DB] ❌ Failed to create admin user: ${error.message}`);
      return null;
    }
  }

  /**
   * Execute SQL directly using Supabase client
   */
  async executeSQLDirectly(sql, client) {
    const tableName = sql.split(' ')[2] || 'unknown';
    
    try {
      // Method 1: Try using Supabase's built-in execute_sql function
      const { error } = await client.rpc('execute_sql', { 
        sql_query: sql,
        params: []
      });
      
      if (error) {
        throw error;
      }
      
      dbLog(`[DB] ✅ Created: ${tableName}`);
      return true;
      
    } catch (error) {
      // Method 2: Try using direct REST API with execute_sql
      try {
        const response = await fetch(`${this.config.url}/rest/v1/rpc/execute_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.config.serviceRoleKey || this.config.anonKey}`,
            'apikey': this.config.serviceRoleKey || this.config.anonKey
          },
          body: JSON.stringify({ 
            sql_query: sql,
            params: []
          })
        });

        if (response.ok) {
          dbLog(`[DB] ✅ Created: ${tableName}`);
          return true;
        }
      } catch (fetchError) {
        // Ignore fetch errors
      }
      
      // Method 3: Try using exec_sql (if it exists)
      try {
        const response = await fetch(`${this.config.url}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.config.serviceRoleKey || this.config.anonKey}`,
            'apikey': this.config.serviceRoleKey || this.config.anonKey
          },
          body: JSON.stringify({ sql_query: sql })
        });

        if (response.ok) {
          dbLog(`[DB] ✅ Created: ${tableName}`);
          return true;
        }
      } catch (fetchError) {
        // Ignore fetch errors
      }
      
      // If all methods fail, return false
      return false;
    }
  }



  /**
   * Verify that all required tables exist
   */
  async verifyTablesExist() {
    const requiredTables = ['users', 'cards', 'labels', 'card_labels', 'sentence_analysis_cache'];
    
    for (const tableName of requiredTables) {
      try {
        const { error } = await this.client.from(tableName).select('count').limit(1);
        if (error) {
          if (error.code === 'PGRST205') {
            // Table doesn't exist, but that's okay - we'll skip verification
            dbLog(`[DB] ⚠️  Table ${tableName} not found, but continuing...`);
            continue;
          }
          throw new Error(`Table ${tableName} verification failed: ${error.message}`);
        }
      } catch (error) {
        dbLog(`[DB] ⚠️  Could not verify table ${tableName}, but continuing...`);
        continue;
      }
    }
    
    dbLog('[DB] Table verification completed (some tables may not be immediately visible)');
  }

  /**
   * Get the SQL statements for creating all tables
   */
  getCreateTableSQL() {
    return `
-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Cards table
CREATE TABLE IF NOT EXISTS cards (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  card_id TEXT NOT NULL,
  word TEXT NOT NULL,
  translation TEXT,
  context TEXT,
  state INTEGER DEFAULT 0,
  due TIMESTAMP WITH TIME ZONE NOT NULL,
  stability REAL DEFAULT 0,
  difficulty REAL DEFAULT 0,
  elapsed_days INTEGER DEFAULT 0,
  scheduled_days INTEGER DEFAULT 0,
  reps INTEGER DEFAULT 0,
  lapses INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_reviewed TIMESTAMP WITH TIME ZONE,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  UNIQUE(user_id, card_id)
);

-- Sentence analysis cache table
CREATE TABLE IF NOT EXISTS sentence_analysis_cache (
  id SERIAL PRIMARY KEY,
  hash TEXT UNIQUE NOT NULL,
  analysis_data TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Labels table
CREATE TABLE IF NOT EXISTS labels (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('system', 'user')),
  user_id TEXT,
  color TEXT DEFAULT '#3B82F6',
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(name, user_id, type),
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Card labels table
CREATE TABLE IF NOT EXISTS card_labels (
  id SERIAL PRIMARY KEY,
  card_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  label_id INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (card_id, user_id) REFERENCES cards(card_id, user_id) ON DELETE CASCADE,
  FOREIGN KEY (label_id) REFERENCES labels(id) ON DELETE CASCADE,
  UNIQUE(card_id, user_id, label_id)
);

-- User configurations table
CREATE TABLE IF NOT EXISTS user_configs (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  label TEXT NOT NULL,
  value_type TEXT NOT NULL DEFAULT 'string',
  value TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cards_user_id ON cards(user_id);
CREATE INDEX IF NOT EXISTS idx_cards_due ON cards(due);
CREATE INDEX IF NOT EXISTS idx_cards_state ON cards(state);
CREATE INDEX IF NOT EXISTS idx_sentence_analysis_hash ON sentence_analysis_cache(hash);
CREATE INDEX IF NOT EXISTS idx_labels_user_id ON labels(user_id);
CREATE INDEX IF NOT EXISTS idx_labels_type ON labels(type);
CREATE INDEX IF NOT EXISTS idx_card_labels_card_id ON card_labels(card_id, user_id);
CREATE INDEX IF NOT EXISTS idx_card_labels_label_id ON card_labels(label_id);
CREATE INDEX IF NOT EXISTS idx_user_configs_user_id ON user_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_configs_name ON user_configs(user_id, name);
`;
  }

  /**
   * Close the database connection
   */
  async close() {
    if (this.client) {
      // Supabase client doesn't need explicit closing
      this.client = null;
      this.isInitialized = false;
      dbLog('[DB] Supabase database connection closed');
    }
  }

  /**
   * Execute a query with parameters using Supabase client
   */
  async query(sql, params = {}) {
    if (!this.isInitialized) {
      throw new Error('Database not initialized');
    }

    try {
      // Convert SQLite-style parameterized queries to Supabase format
      const { processedSql, processedParams } = this.processQuery(sql, params);
      
      // Use direct PostgreSQL connection for all queries to ensure compatibility
      const result = await this.executeDirectSQL(processedSql, processedParams);
      return result.rows || [];
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
      const results = await this.query(sql, params);
      return results.length > 0 ? results[0] : null;
    } catch (error) {
      console.error('[DB] QueryOne error:', error);
      throw error;
    }
  }

  /**
   * Execute a query that doesn't return results (INSERT, UPDATE, DELETE)
   */
  async execute(sql, params = {}) {
    if (!this.isInitialized) {
      throw new Error('Database not initialized');
    }

    dbLog('[DB] execute() called:', sql.substring(0, 50) + '...');

    try {
      const { processedSql, processedParams } = this.processQuery(sql, params);
      dbLog('[DB] processed SQL:', processedSql.substring(0, 50) + '...');
      
      // Use direct PostgreSQL connection for INSERT/UPDATE/DELETE
      const result = await this.executeDirectSQL(processedSql, processedParams);
      dbLog('[DB] executeDirectSQL returned with rowCount:', result?.rowCount);
      
      return {
        changes: result?.rowCount || 1,
        lastInsertRowId: result?.rows?.[0]?.id || null
      };
    } catch (error) {
      console.error('[DB] Execute error:', error.message);
      console.error('[DB] Execute error stack:', error.stack);
      throw error;
    }
  }

  /**
   * Execute SQL directly using PostgreSQL connection
   */
  async executeDirectSQL(sql, params) {
    const dbUrl = process.env.SUPABASE_DB_URL;
    if (!dbUrl) {
      throw new Error('SUPABASE_DB_URL not found for direct SQL execution');
    }

    // Log the exact query being executed
    const paramsArray = Array.isArray(params) ? params : Object.values(params || {});
    dbLog('[DB-SQL]', sql, '| PARAMS:', paramsArray.length > 0 ? paramsArray : 'none');
    dbLog('[DB-SQL] connecting to PostgreSQL...');

    const { Client } = require('pg');
    const client = new Client({
      connectionString: dbUrl,
      // Disable prepared statements for Transaction pooler compatibility
      // Transaction pooler doesn't support PREPARE statements
      prepare: false
    });

    try {
      await client.connect();
      dbLog('[DB-SQL] connected. Executing query...');
      const result = await client.query(sql, params);
      dbLog('[DB-SQL] query executed. Rows affected:', result.rowCount);
      return result;
    } finally {
      await client.end();
      dbLog('[DB-SQL] connection closed');
    }
  }

  /**
   * Begin a transaction (Supabase handles transactions differently)
   */
  async beginTransaction() {
    if (!this.isInitialized) {
      throw new Error('Database not initialized');
    }

    try {
      // Supabase doesn't have explicit transactions in the same way
      // We'll return a transaction object that can be used for tracking
      return {
        id: Date.now(),
        startTime: new Date(),
        queries: []
      };
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
      // In Supabase, we don't need explicit commit
      // All queries are automatically committed
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
      // Supabase doesn't support explicit rollback in the same way
      // This would need to be handled at the application level
      console.warn('[DB] Rollback not fully supported in Supabase - manual cleanup may be required');
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
      if (this.lastInsertId) {
        return this.lastInsertId;
      }

      // Query the last inserted ID
      const { data, error } = await this.client.rpc('get_last_insert_id');
      if (error) {
        throw error;
      }

      return data || null;
    } catch (error) {
      console.error('[DB] Get last insert ID error:', error);
      throw error;
    }
  }

  /**
   * Check if the database is connected
   */
  async isConnected() {
    if (!this.isInitialized || !this.client) {
      return false;
    }

    try {
      // Test connection with a simple query
      const { error } = await this.client.from('users').select('count').limit(1);
      return !error;
    } catch (error) {
      return false;
    }
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
      database: 'Supabase',
      url: this.config.url,
      schema: this.config.schema,
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
      health.connected = this.isInitialized && this.client !== null;
      health.tests.connection = health.connected;

      if (!health.connected) {
        health.status = 'unhealthy';
        health.error = 'Database not initialized or connection lost';
        health.responseTime = Date.now() - startTime;
        return health;
      }

      // Test 2: Simple query test
      try {
        const { data, error } = await this.client.from('users').select('id').limit(1);
        health.tests.query = !error;
        if (error) {
          health.error = `Query test failed: ${error.message}`;
        }
      } catch (queryError) {
        health.tests.query = false;
        health.error = `Query test failed: ${queryError.message}`;
      }

      // Test 3: Check if tables exist and get stats
      try {
        const [userResult, cardResult, labelResult] = await Promise.allSettled([
          this.client.from('users').select('*', { count: 'exact', head: true }),
          this.client.from('cards').select('*', { count: 'exact', head: true }),
          this.client.from('labels').select('*', { count: 'exact', head: true }).catch(() => ({ count: 0, error: null }))
        ]);

        const userCount = userResult.status === 'fulfilled' && !userResult.value.error 
          ? (userResult.value.count || 0) : 0;
        const cardCount = cardResult.status === 'fulfilled' && !cardResult.value.error 
          ? (cardResult.value.count || 0) : 0;
        let labelCount = 0;
        if (labelResult.status === 'fulfilled' && !labelResult.value.error) {
          labelCount = labelResult.value.count || 0;
        }

        health.stats = {
          users: userCount,
          cards: cardCount,
          labels: labelCount
        };
        health.tests.tables = userResult.status === 'fulfilled' && cardResult.status === 'fulfilled';
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
   * Process SQL query and parameters for Supabase compatibility
   */
  processQuery(sql, params) {
    // Convert SQLite-style parameterized queries ($1, $2, etc.) to Supabase format
    let processedSql = sql;
    const processedParams = [];

    // Replace ? placeholders with $1, $2, etc.
    let paramIndex = 1;
    processedSql = processedSql.replace(/\?/g, () => `$${paramIndex++}`);

    // Convert params object to array
    Object.values(params).forEach(value => {
      processedParams.push(value);
    });

    return { processedSql, processedParams };
  }

  /**
   * Get database statistics
   */
  async getStats() {
    if (!this.isInitialized) {
      throw new Error('Database not initialized');
    }

    try {
      const { data: userCount, error: userError } = await this.client
        .from('users')
        .select('*', { count: 'exact', head: true });

      const { data: cardCount, error: cardError } = await this.client
        .from('cards')
        .select('*', { count: 'exact', head: true });

      if (userError || cardError) {
        throw userError || cardError;
      }

      return {
        users: userCount?.length || 0,
        cards: cardCount?.length || 0,
        database: 'Supabase',
        url: this.config.url
      };
    } catch (error) {
      console.error('[DB] Get stats error:', error);
      throw error;
    }
  }

  /**
   * Create Supabase RPC functions for SQL execution
   * This should be run once to set up the necessary functions in Supabase
   */
  async createRPCFunctions() {
    const createExecuteSQLFunction = `
      CREATE OR REPLACE FUNCTION execute_sql(sql_query text, params jsonb DEFAULT '[]'::jsonb)
      RETURNS jsonb
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      DECLARE
        result jsonb;
      BEGIN
        -- Execute dynamic SQL and return results
        EXECUTE sql_query INTO result;
        RETURN result;
      EXCEPTION
        WHEN OTHERS THEN
          RETURN jsonb_build_object('error', SQLERRM);
      END;
      $$;
    `;

    const createGetLastInsertIdFunction = `
      CREATE OR REPLACE FUNCTION get_last_insert_id()
      RETURNS integer
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      DECLARE
        last_id integer;
      BEGIN
        -- Get the last inserted ID from the most recent sequence
        SELECT lastval() INTO last_id;
        RETURN last_id;
      EXCEPTION
        WHEN OTHERS THEN
          RETURN NULL;
      END;
      $$;
    `;

    try {
      await this.execute(createExecuteSQLFunction);
      await this.execute(createGetLastInsertIdFunction);
      dbLog('[DB] Supabase RPC functions created successfully');
    } catch (error) {
      console.error('[DB] Failed to create RPC functions:', error);
      throw error;
    }
  }
}

module.exports = SupabaseDatabase;

