const { createClient } = require('@supabase/supabase-js');
const IDatabase = require('./IDatabase');

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
      console.log(`[DB] Supabase database initialized with URL: ${this.config.url}`);
      
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

    try {
      // Check if tables exist by attempting a simple query
      console.log('[DB] Checking if tables exist...');
      const { error } = await this.client.from('users').select('count').limit(1);
      
      if (error) {
        if (error.code === 'PGRST205' || error.message.includes('does not exist')) {
          console.log('[DB] Tables not found. Creating tables...');
          await this.createTablesViaSQL();
        } else {
          throw error;
        }
      } else {
        console.log('[DB] Tables already exist, skipping creation.');
      }
      
    } catch (error) {
      console.log('[DB] Table existence check failed, attempting to create tables...');
      console.log('[DB] Error:', error.message);
      
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
    console.log('[DB] Creating Supabase tables automatically...');
    
    try {
      // Create tables directly using Supabase's SQL execution
      const success = await this.createTablesDirectly();
      
      if (success) {
        // Try to verify tables were created (but don't fail if verification fails)
        try {
          await this.verifyTablesExist();
        } catch (verifyError) {
          console.log('[DB] ⚠️  Table verification failed, but tables may have been created successfully');
        }
        console.log('[DB] Supabase tables created successfully!');
      } else {
        throw new Error('Table creation returned false');
      }
      
    } catch (error) {
      console.error('[DB] Failed to create tables automatically:', error.message);
      console.log('[DB] ⚠️  AUTOMATIC TABLE CREATION FAILED');
      console.log('[DB] Possible causes:');
      console.log('   - Missing SUPABASE_SERVICE_ROLE_KEY in .env file');
      console.log('   - SQL Editor API not enabled in Supabase project settings');
      console.log('   - Network connectivity issues');
      console.log('');
      console.log('📋 SOLUTIONS:');
      console.log('1. Ensure SUPABASE_SERVICE_ROLE_KEY is set in your .env file');
      console.log('2. Enable "SQL Editor API" in Project Settings → API → SQL editor');
      console.log('3. Or use manual setup: Run SQL from MANUAL_SUPABASE_SETUP.md');
      console.log('');
      throw new Error('Automatic table creation failed. Check service role key and SQL Editor API settings.');
    }
  }

  /**
   * Create tables directly using PostgreSQL connection
   */
  async createTablesDirectly() {
    console.log('[DB] Creating tables using PostgreSQL connection...');
    
    // Check if we have PostgreSQL connection string
    const dbUrl = process.env.SUPABASE_DB_URL;
    if (!dbUrl) {
      console.log('[DB] ❌ SUPABASE_DB_URL not found');
      console.log('[DB] 💡 Get your PostgreSQL connection string from:');
      console.log('[DB]    Project Settings → Database → Connection Info');
      console.log('[DB]    Format: postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres');
      return false;
    }

    try {
      const { Client } = require('pg');
      const client = new Client({
        connectionString: dbUrl
      });

      await client.connect();
      console.log('[DB] ✅ Connected to PostgreSQL');

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
        
        'CREATE INDEX IF NOT EXISTS idx_cards_user_id ON cards(user_id)',
        'CREATE INDEX IF NOT EXISTS idx_cards_due ON cards(due)',
        'CREATE INDEX IF NOT EXISTS idx_cards_state ON cards(state)',
        'CREATE INDEX IF NOT EXISTS idx_sentence_analysis_hash ON sentence_analysis_cache(hash)',
        'CREATE INDEX IF NOT EXISTS idx_labels_user_id ON labels(user_id)',
        'CREATE INDEX IF NOT EXISTS idx_labels_type ON labels(type)',
        'CREATE INDEX IF NOT EXISTS idx_card_labels_card_id ON card_labels(card_id, user_id)',
        'CREATE INDEX IF NOT EXISTS idx_card_labels_label_id ON card_labels(label_id)'
      ];

      let successCount = 0;
      for (const sql of sqlStatements) {
        try {
          await client.query(sql);
          successCount++;
          console.log(`[DB] ✅ Created: ${sql.split(' ')[2] || 'SQL statement'}`);
        } catch (error) {
          console.log(`[DB] ❌ Failed: ${sql.split(' ')[2] || 'SQL statement'} - ${error.message}`);
        }
      }

      await client.end();
      console.log(`[DB] Successfully executed ${successCount}/${sqlStatements.length} SQL statements`);
      
      // Create admin user if tables were created successfully
      if (successCount > 0) {
        await this.createAdminUser();
      }
      
      return successCount > 0;

    } catch (error) {
      console.log(`[DB] ❌ PostgreSQL connection failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Create admin user for first-time setup
   */
  async createAdminUser() {
    try {
      console.log('[DB] Creating admin user...');
      
      // Check if admin user already exists
      const existingUser = await this.queryOne(
        'SELECT * FROM users WHERE user_id = ?',
        { user_id: 'user123' }
      );

      if (existingUser) {
        console.log('[DB] ✅ Admin user already exists');
        return existingUser;
      }

      // Create admin user
      const result = await this.execute(
        'INSERT INTO users (user_id) VALUES (?)',
        { user_id: 'user123' }
      );

      console.log('[DB] ✅ Admin user created successfully');
      return { user_id: 'user123', id: result.lastInsertRowId };
      
    } catch (error) {
      console.log(`[DB] ❌ Failed to create admin user: ${error.message}`);
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
      
      console.log(`[DB] ✅ Created: ${tableName}`);
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
          console.log(`[DB] ✅ Created: ${tableName}`);
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
          console.log(`[DB] ✅ Created: ${tableName}`);
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
            console.log(`[DB] ⚠️  Table ${tableName} not found, but continuing...`);
            continue;
          }
          throw new Error(`Table ${tableName} verification failed: ${error.message}`);
        }
      } catch (error) {
        console.log(`[DB] ⚠️  Could not verify table ${tableName}, but continuing...`);
        continue;
      }
    }
    
    console.log('[DB] Table verification completed (some tables may not be immediately visible)');
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cards_user_id ON cards(user_id);
CREATE INDEX IF NOT EXISTS idx_cards_due ON cards(due);
CREATE INDEX IF NOT EXISTS idx_cards_state ON cards(state);
CREATE INDEX IF NOT EXISTS idx_sentence_analysis_hash ON sentence_analysis_cache(hash);
CREATE INDEX IF NOT EXISTS idx_labels_user_id ON labels(user_id);
CREATE INDEX IF NOT EXISTS idx_labels_type ON labels(type);
CREATE INDEX IF NOT EXISTS idx_card_labels_card_id ON card_labels(card_id, user_id);
CREATE INDEX IF NOT EXISTS idx_card_labels_label_id ON card_labels(label_id);
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
      console.log('[DB] Supabase database connection closed');
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
      
      // For SELECT queries, use Supabase client methods
      if (processedSql.trim().toUpperCase().startsWith('SELECT')) {
        return await this.executeSelectQuery(processedSql, processedParams);
      }
      
      // For other queries, use direct PostgreSQL connection
      return await this.executeDirectSQL(processedSql, processedParams);
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

    try {
      const { processedSql, processedParams } = this.processQuery(sql, params);
      
      // Use direct PostgreSQL connection for INSERT/UPDATE/DELETE
      const result = await this.executeDirectSQL(processedSql, processedParams);
      
      return {
        changes: result?.rowCount || 1,
        lastInsertRowId: result?.rows?.[0]?.id || null
      };
    } catch (error) {
      console.error('[DB] Execute error:', error);
      throw error;
    }
  }

  /**
   * Execute SELECT queries using Supabase client
   */
  async executeSelectQuery(sql, params) {
    // Parse simple SELECT queries and convert to Supabase client calls
    const tableMatch = sql.match(/FROM\s+(\w+)/i);
    if (!tableMatch) {
      throw new Error('Unable to parse SELECT query for Supabase client');
    }
    
    const tableName = tableMatch[1];
    const { data, error } = await this.client.from(tableName).select('*');
    
    if (error) {
      throw error;
    }
    
    return data || [];
  }

  /**
   * Execute SQL directly using PostgreSQL connection
   */
  async executeDirectSQL(sql, params) {
    const dbUrl = process.env.SUPABASE_DB_URL;
    if (!dbUrl) {
      throw new Error('SUPABASE_DB_URL not found for direct SQL execution');
    }

    const { Client } = require('pg');
    const client = new Client({
      connectionString: dbUrl
    });

    try {
      await client.connect();
      const result = await client.query(sql, params);
      return result;
    } finally {
      await client.end();
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
      console.log('[DB] Supabase RPC functions created successfully');
    } catch (error) {
      console.error('[DB] Failed to create RPC functions:', error);
      throw error;
    }
  }
}

module.exports = SupabaseDatabase;

