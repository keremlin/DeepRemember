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
 * Supabase Database Implementation using ONLY Supabase JavaScript Client
 * No direct PostgreSQL connections - all operations through Supabase API
 */
class SupabaseDatabaseJavaScriptClient extends IDatabase {
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

      // Create Supabase client with IPv4 configuration
      this.client = createClient(this.config.url, this.config.serviceRoleKey, {
        schema: this.config.schema,
        auth: {
          persistSession: false
        },
        global: {
          headers: {
            'Connection': 'keep-alive'
          }
        },
        db: {
          schema: this.config.schema
        }
      });

      // Create tables if they don't exist (this will also test the connection)
      await this.createTables();
      
      this.isInitialized = true;
      
      
      // Always ensure admin user exists (after initialization)
      await this.createAdminUser();
    } catch (error) {
      
      throw error;
    }
  }

  /**
   * Create database tables using Supabase JavaScript Client
   */
  async createTables() {
    
    
    const tables = [
      {
        name: 'users',
        sql: `CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          user_id TEXT UNIQUE NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )`
      },
      {
        name: 'cards',
        sql: `CREATE TABLE IF NOT EXISTS cards (
          id SERIAL PRIMARY KEY,
          card_id INTEGER,
          user_id TEXT NOT NULL,
          word TEXT NOT NULL,
          translation TEXT NOT NULL,
          context TEXT DEFAULT '',
          state INTEGER DEFAULT 0,
          due TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          next_review TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          stability REAL DEFAULT 0,
          difficulty REAL DEFAULT 0,
          elapsed_days INTEGER DEFAULT 0,
          scheduled_days INTEGER DEFAULT 0,
          reps INTEGER DEFAULT 0,
          lapses INTEGER DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          last_reviewed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
        )`
      },
      {
        name: 'sentence_analysis_cache',
        sql: `CREATE TABLE IF NOT EXISTS sentence_analysis_cache (
          id SERIAL PRIMARY KEY,
          sentence TEXT NOT NULL,
          analysis_result JSONB NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          UNIQUE(sentence)
        )`
      },
      {
        name: 'labels',
        sql: `CREATE TABLE IF NOT EXISTS labels (
          id SERIAL PRIMARY KEY,
          name TEXT UNIQUE NOT NULL,
          color TEXT DEFAULT '#007bff',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )`
      },
      {
        name: 'card_labels',
        sql: `CREATE TABLE IF NOT EXISTS card_labels (
          id SERIAL PRIMARY KEY,
          card_id INTEGER NOT NULL,
          label_id INTEGER NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE,
          FOREIGN KEY (label_id) REFERENCES labels(id) ON DELETE CASCADE,
          UNIQUE(card_id, label_id)
        )`
      },
      {
        name: 'word_base',
        sql: `CREATE TABLE IF NOT EXISTS word_base (
          id SERIAL PRIMARY KEY,
          word TEXT NOT NULL,
          translate TEXT,
          sample_sentence TEXT,
          group_alphabet_name TEXT NOT NULL,
          type_of_word TEXT NOT NULL,
          plural_sign TEXT,
          article TEXT,
          female_form TEXT,
          meaning TEXT,
          more_info TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )`
      }
    ];

    for (const table of tables) {
      try {
        await this.executeSQLDirectly(table.sql);
        
      } catch (error) {
        
      }
    }
    
    
  }

  /**
   * Execute SQL directly using Supabase JavaScript Client RPC
   */
  async executeSQLDirectly(sql) {
    try {
      // Use Supabase's built-in execute_sql function via RPC
      const { error } = await this.client.rpc('execute_sql', { 
        sql_query: sql
      });
      
      if (error) {
        throw error;
      }
      
      return true;
      
    } catch (error) {
      // If execute_sql doesn't exist, try creating it first
      if (error.message.includes('function execute_sql') || error.message.includes('does not exist')) {
        await this.createExecuteSQLFunction();
        // Retry the original query
        const { error: retryError } = await this.client.rpc('execute_sql', { 
          sql_query: sql
        });
        
        if (retryError) {
          throw retryError;
        }
        
        return true;
      }
      throw error;
    }
  }

  /**
   * Create the execute_sql function if it doesn't exist
   */
  async createExecuteSQLFunction() {
    const createFunctionSQL = `
      CREATE OR REPLACE FUNCTION execute_sql(sql_query text)
      RETURNS void
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
        EXECUTE sql_query;
      END;
      $$;
    `;

    try {
      // Use direct REST API to create the function
      const response = await fetch(`${this.config.url}/rest/v1/rpc/execute_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.serviceRoleKey}`,
          'apikey': this.config.serviceRoleKey
        },
        body: JSON.stringify({ 
          sql_query: createFunctionSQL
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to create execute_sql function: ${response.statusText}`);
      }
      
      
    } catch (error) {
      
    }
  }

  /**
   * Create admin user
   */
  async createAdminUser() {
    try {
      const adminUserId = 'admin';
      const existingUser = await this.queryOne(
        'SELECT * FROM users WHERE user_id = $1',
        { $1: adminUserId }
      );

      if (!existingUser) {
        await this.execute(
          'INSERT INTO users (user_id) VALUES ($1)',
          { $1: adminUserId }
        );
        
      } else {
        
      }
    } catch (error) {
      
    }
  }

  /**
   * Close the database connection
   */
  async close() {
    this.client = null;
    this.isInitialized = false;
    
  }

  /**
   * Execute a query with parameters using Supabase JavaScript Client
   */
  async query(sql, params = {}) {
    if (!this.isInitialized) {
      throw new Error('Database not initialized');
    }

    try {
      // Log SELECT queries
      if (sql.trim().toLowerCase().startsWith('select')) {
        const paramsArray = Object.values(params || {});
        dbLog('[DB-SQL]', sql, '| PARAMS:', paramsArray.length > 0 ? paramsArray : 'none');
      }

      // Check if this is a complex query that should use RPC
      if (this.isComplexQuery(sql)) {
        return await this.executeComplexQuery(sql, params);
      }

      // Convert SQL to Supabase JavaScript Client format
      const { tableName, operation, conditions, fields } = this.parseSQL(sql, params);
      
      if (!tableName || tableName === 'unknown') {
        // Fallback to RPC for unrecognized queries
        return await this.executeComplexQuery(sql, params);
      }
      
      let query = this.client.from(tableName);
      const sqlLower = sql.toLowerCase().trim();
      
      switch (operation.toLowerCase()) {
        case 'select':
          if (fields && fields !== '*') {
            query = query.select(fields);
          } else {
            query = query.select('*');
          }
          break;
        case 'count':
          // If COUNT query has LIKE clause, handle it in trySimpleQuery instead
          if (sqlLower.includes('like')) {
            return await this.executeComplexQuery(sql, params);
          }
          // Handle simple COUNT queries using count: 'exact'
          query = query.select('*', { count: 'exact', head: true });
          break;
        case 'insert':
          return await this.handleInsert(query, sql, params);
        case 'update':
          return await this.handleUpdate(query, sql, params);
        case 'delete':
          return await this.handleDelete(query, sql, params);
        default:
          // For complex queries, use RPC
          
          return await this.executeComplexQuery(sql, params);
      }

      // Apply conditions
      if (conditions && conditions.length > 0) {
        for (const condition of conditions) {
          query = query[condition.operator](condition.column, condition.value);
        }
      }

      // Handle LIMIT and OFFSET from SQL
      // First check params object for limit (most reliable)
      let limitValue = params.limit || params.$limit;
      
      // If not in params, try to extract from SQL
      if (limitValue === undefined || limitValue === null) {
        const limitMatch = sql.match(/limit\s+(\d+)/i);
        if (limitMatch) {
          // Literal number in SQL
          limitValue = parseInt(limitMatch[1], 10);
        } else if (sql.match(/limit\s+\?/i)) {
          // Placeholder ? - try to find by position
          const paramValues = Object.values(params);
          const limitIndex = sql.toLowerCase().indexOf('limit');
          if (limitIndex !== -1) {
            // Count ? placeholders before LIMIT to find the right param
            const beforeLimit = sql.substring(0, limitIndex);
            const questionMarks = (beforeLimit.match(/\?/g) || []).length;
            if (paramValues[questionMarks] !== undefined) {
              limitValue = paramValues[questionMarks];
            }
          }
        }
      }
      
      if (limitValue !== null && limitValue !== undefined) {
        query = query.limit(limitValue);
      } else {
        // If no LIMIT specified, set a high limit to get all rows (Supabase default is 1000)
        query = query.limit(3000);
      }

      // Handle OFFSET
      let offsetValue = null;
      const offsetMatch = sql.match(/offset\s+(\d+)/i);
      if (offsetMatch) {
        // Literal number in SQL
        offsetValue = parseInt(offsetMatch[1], 10);
      } else if (sql.match(/offset\s+\?/i)) {
        // Placeholder ? - get from params
        offsetValue = params.offset || params.$offset;
        if (offsetValue === undefined) {
          // Try to find offset in params by position
          const paramValues = Object.values(params);
          const offsetIndex = sql.toLowerCase().indexOf('offset');
          if (offsetIndex !== -1) {
            const beforeOffset = sql.substring(0, offsetIndex);
            const questionMarks = (beforeOffset.match(/\?/g) || []).length;
            if (paramValues[questionMarks] !== undefined) {
              offsetValue = paramValues[questionMarks];
            }
          }
        }
      }
      
      if (offsetValue !== null && offsetValue !== undefined) {
        const finalLimit = limitValue !== null && limitValue !== undefined ? limitValue : 3000;
        query = query.range(offsetValue, offsetValue + finalLimit - 1);
      }

      const { data, error, count } = await query;
      
      if (error) {
        throw error;
      }

      // Handle COUNT queries differently
      if (operation.toLowerCase() === 'count') {
        
        return [{ count: count || 0 }];
      }

      const rows = Array.isArray(data) ? data : (data ? [data] : []);
      // Normalize known tables/fields to app expectations
      const normalized = this.normalizeRowsForSelect(tableName, rows);
      
      return normalized;
    } catch (error) {
      
      throw error;
    }
  }

  /**
   * Normalize rows returned from Supabase to match app field expectations
   */
  normalizeRowsForSelect(tableName, rows) {
    if (!rows || rows.length === 0) return rows;
    if (tableName === 'cards') {
      return rows.map(r => ({
        ...r,
        card_id: r.card_id ?? r.id,
        due: r.due ?? r.next_review ?? null,
        last_reviewed: r.last_reviewed ?? r.updated_at ?? null,
      }));
    }
    return rows;
  }

  /**
   * Check if a query is complex and should use RPC instead of direct client methods
   */
  isComplexQuery(sql) {
    const sqlLower = sql.toLowerCase().trim();
    
    // Simple DELETE, INSERT, UPDATE are NOT complex - handle them directly
    if (sqlLower.match(/^(delete\s+from|insert\s+into|update)\s+\w+/i)) {
      return false;
    }
    
    // Simple COUNT queries without LIKE should NOT be complex (handled by parseSQL)
    // COUNT queries WITH LIKE should be complex (handled by trySimpleQuery)
    if (sqlLower.startsWith('select count(*) as count from cards where user_id = ?') && !sqlLower.includes('word like ?')) {
      return false; // Handle these in parseSQL path
    }
    
    // COUNT queries with LIKE should be handled by trySimpleQuery
    if (sqlLower.startsWith('select count(*) as count from cards where user_id = ?') && sqlLower.includes('word like ?')) {
      return true; // Force through executeComplexQuery -> trySimpleQuery
    }
    
    // Simple SELECT with ORDER BY should NOT be complex
    if (sqlLower.match(/^select\s+\*\s+from\s+\w+\s+where\s+\w+\s*=\s*\?\s+order\s+by\s+\w+\s+(asc|desc)$/)) {
      return false; // This should be handled by the normal query path
    }
    
    // Simple SELECT with multiple AND conditions and ORDER BY should NOT be complex
    // Pattern: SELECT * FROM table WHERE col1 = ? AND col2 = ? ORDER BY col ASC/DESC
    if (sqlLower.match(/^select\s+\*\s+from\s+\w+\s+where\s+[\w\s=?\s]+and\s+\w+\s*=\s*\?\s+order\s+by\s+\w+\s+(asc|desc)$/i)) {
      return false; // This should be handled by the normal query path
    }
    
    // Check for SQL functions (excluding simple ORDER BY on its own)
    const sqlFunctions = ['count(', 'sum(', 'avg(', 'min(', 'max(', 'distinct', 'group by', 'having'];
    const hasFunction = sqlFunctions.some(func => sqlLower.includes(func));
    
    // Check for joins
    const hasJoin = sqlLower.includes('join');
    
    // Check for subqueries
    const hasSubquery = sqlLower.includes('(') && sqlLower.includes('select');
    
    // Check for CASE expressions
    const hasCase = sqlLower.includes('case') && sqlLower.includes('when');
    
    // Check for LIKE queries with multiple parameters
    const hasLikeWithParams = sqlLower.includes('like') && sqlLower.includes('$');
    
    // Check for complex WHERE clauses with multiple conditions
    // But exclude simple AND conditions with = ? patterns (e.g., "col1 = ? AND col2 = ?")
    const whereMatch = sqlLower.match(/where\s+([\s\S]*?)(?:\s+order\s+by|\s+limit|\s+offset|$)/i);
    let hasComplexWhere = false;
    if (whereMatch) {
      const whereClause = whereMatch[1].trim();
      // Check if it's ONLY simple equality patterns: col = ? AND col = ? (can have multiple ANDs)
      // Allow newlines and whitespace in the pattern
      const onlySimpleEquals = /^(\w+\s*=\s*\?\s+and\s+)+(\w+\s*=\s*\?)$/i.test(whereClause.replace(/\s+/g, ' '));
      
      if (onlySimpleEquals) {
        hasComplexWhere = false; // Simple AND conditions with = ?, not complex
      } else {
        // Check for OR, IN, NOT NULL, IS NULL, LIKE, or comparison operators
        hasComplexWhere = whereClause.includes(' or ') || 
                         whereClause.includes(' in ') || 
                         whereClause.includes(' not null') || 
                         whereClause.includes(' is null') ||
                         whereClause.includes(' like ') ||
                         whereClause.match(/[<>=!]+/); // Comparison operators
      }
    }
    
    // Check for LIMIT/OFFSET (can make a query complex if not in simple form)
    const hasLimit = sqlLower.includes('limit') || sqlLower.includes('offset');
    
    return hasFunction || hasJoin || hasSubquery || hasCase || hasLikeWithParams || hasComplexWhere;
  }

  /**
   * Execute complex queries using RPC
   */
  async executeComplexQuery(sql, params = {}) {
    try {
      // First, try to use Supabase JavaScript Client methods for simple queries
      const simpleResult = await this.trySimpleQuery(sql, params);
      if (simpleResult !== null) {
        return simpleResult;
      }

      // For complex queries, use direct REST API instead of RPC
      return await this.executeViaRestAPI(sql, params);
    } catch (error) {
      
      throw error;
    }
  }

  /**
   * Execute queries via Supabase REST API using direct SQL
   */
  async executeViaRestAPI(sql, params = {}) {
    try {
      // Replace parameter placeholders (?) with actual values from params object
      let processedSQL = sql;
      const paramValues = Object.values(params);
      let paramIndex = 0;
      
      // Replace ? placeholders with actual values
      processedSQL = processedSQL.replace(/\?/g, () => {
        if (paramIndex < paramValues.length) {
          const value = paramValues[paramIndex++];
          if (value === null || value === undefined) {
            return 'NULL';
          } else if (typeof value === 'string') {
            const escaped = value.replace(/'/g, "''");
            return `'${escaped}'`;
          } else if (typeof value === 'number') {
            return String(value);
          } else {
            return `'${String(value)}'`;
          }
        }
        return 'NULL';
      });
      
      // Also handle $1, $2 style parameters
      Object.keys(params).forEach(key => {
        const value = params[key];
        if (key.startsWith('$')) {
          const placeholder = key;
          processedSQL = processedSQL.replace(new RegExp(placeholder.replace('$', '\\$'), 'g'), 
            value === null || value === undefined ? 'NULL' :
            typeof value === 'string' ? `'${value.replace(/'/g, "''")}'` : value
          );
        }
      });

      // Use Supabase REST API with direct SQL query
      const response = await fetch(`${this.config.url}/rest/v1/rpc/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.serviceRoleKey}`,
          'apikey': this.config.serviceRoleKey,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({ 
          query: processedSQL
        })
      });

      if (!response.ok) {
        return await this.fallbackToClientQuery(sql, params);
      }

      const data = await response.json();
      
      if (Array.isArray(data)) {
        return data;
      } else if (data && typeof data === 'object') {
        return [data];
      } else {
        return [];
      }
    } catch (error) {
      
      // Fallback to using the JavaScript client
      return await this.fallbackToClientQuery(sql, params);
    }
  }

  /**
   * Fallback to using Supabase JavaScript Client for queries
   */
  async fallbackToClientQuery(sql, params) {
    try {
      const sqlLower = sql.toLowerCase().trim();
      
      // Handle SELECT queries
      if (sqlLower.startsWith('select')) {
        const selectMatch = sql.match(/select\s+(.*?)\s+from\s+(\w+)/i);
        if (selectMatch) {
          const fields = selectMatch[1];
          const tableName = selectMatch[2];
          
          let query = this.client.from(tableName);
          
          // Handle field selection
          if (fields === '*') {
            query = query.select('*');
          } else {
            // Clean up field names - remove table aliases and handle wildcards
            const cleanFields = fields.split(',').map(field => {
              const trimmed = field.trim();
              // Handle table aliases like "l.*" or "l.name"
              if (trimmed.includes('.')) {
                const parts = trimmed.split('.');
                return parts[1]; // Return the actual field name
              }
              return trimmed;
            }).join(',');
            
            query = query.select(cleanFields);
          }
          
          // Handle WHERE conditions
          const whereMatch = sql.match(/where\s+(.*?)(?:\s+order\s+by|$)/i);
          if (whereMatch) {
            const whereClause = whereMatch[1];
            
            // Try $1, $2 pattern first
            let conditionMatch = whereClause.match(/(\w+)\s*=\s*\$(\d+)/i);
            if (conditionMatch) {
              const column = conditionMatch[1];
              const paramIndex = parseInt(conditionMatch[2]);
              const paramKey = `$${paramIndex}`;
              query = query.eq(column, params[paramKey]);
            }
            // Try ? pattern (used by DeepRememberRepository)
            else {
              const questionMatch = whereClause.match(/(\w+)\s*=\s*\?/i);
              if (questionMatch) {
                const column = questionMatch[1];
                const paramValue = params[column] || Object.values(params)[0];
                if (paramValue !== undefined) {
                  query = query.eq(column, paramValue);
                }
              }
            }
          }
          
          // Handle ORDER BY
          const orderMatch = sql.match(/order\s+by\s+(.*)/i);
          if (orderMatch) {
            const orderClause = orderMatch[1];
            // If ORDER BY uses CASE expressions or non-column tokens, skip applying order in client fallback
            if (!/\bcase\b\s+when/i.test(orderClause)) {
              const orderParts = orderClause.split(',').map(part => part.trim());
              orderParts.forEach(part => {
                const partMatch = part.match(/(\w+\.)?(\w+)\s*(asc|desc)?/i);
                if (partMatch) {
                  const column = partMatch[2];
                  // Skip if parsed token is actually a keyword like CASE
                  if (column && column.toLowerCase() !== 'case') {
                    const direction = partMatch[3]?.toLowerCase() === 'desc' ? 'desc' : 'asc';
                    query = query.order(column, { ascending: direction !== 'desc' });
                  }
                }
              });
            }
          }
          
          const { data, error } = await query;
          if (error) throw error;
          
          return data || [];
        }
      }
      
      // If we can't handle it, return empty array
      
      return [];
    } catch (error) {
      
      return [];
    }
  }

  /**
   * Try to execute simple queries using Supabase JavaScript Client methods
   */
  async trySimpleQuery(sql, params) {
    try {
      const sqlLower = sql.toLowerCase().trim();
      
      // Handle GROUP BY queries with SUM (e.g., activity statistics)
      if (sqlLower.includes('sum(') && sqlLower.includes('group by') && sqlLower.includes('from spend_time')) {
        const paramValues = Object.values(params);
        const userId = params.user_id || paramValues[0];
        
        if (userId) {
          let query = this.client
            .from('spend_time')
            .select('activity, length_seconds, start_datetime, end_datetime');
          
          query = query.eq('user_id', userId);
          query = query.not('end_datetime', 'is', null);
          
          // Apply date filters if present
          if (sqlLower.includes('start_datetime >= ?')) {
            const dateStart = params.date_start || paramValues[1];
            if (dateStart) {
              query = query.gte('start_datetime', dateStart);
            }
          }
          
          if (sqlLower.includes('start_datetime < ?')) {
            const dateEnd = params.date_end || paramValues[2];
            if (dateEnd) {
              query = query.lt('start_datetime', dateEnd);
            }
          }
          
          const { data, error } = await query;
          if (error) {
            throw error;
          }
          
          // Group manually and sum
          const activityMap = {};
          if (Array.isArray(data)) {
            data.forEach(record => {
              const activity = record.activity || 'unknown';
              const seconds = parseInt(record.length_seconds || 0, 10);
              if (seconds > 0) {
                activityMap[activity] = (activityMap[activity] || 0) + seconds;
              }
            });
          }
          
          return Object.entries(activityMap)
            .map(([activity, totalSeconds]) => ({ activity, totalSeconds }))
            .sort((a, b) => b.totalSeconds - a.totalSeconds);
        }
      }
      
      // Handle COUNT stats on cards table FIRST (total, due, by state, with search)
      // This MUST run before the generic COUNT handler to catch cards queries with LIKE
      if (sqlLower.startsWith('select') && sqlLower.includes('count') && sqlLower.includes('from cards')) {
        // Parse the specific query patterns from DeepRememberRepository
        if (sqlLower.includes('where user_id = ?')) {
          const paramValues = Object.values(params);
          const userId = params.user_id || params.$1 || params.param0 || paramValues[0];
          
          // Total cards: SELECT COUNT(*) as count FROM cards WHERE user_id = ?
          // OR with search: SELECT COUNT(*) as count FROM cards WHERE user_id = ? AND word LIKE ?
          const hasSearchInCount = sqlLower.includes('word like ?');
          const hasOtherAnd = sqlLower.includes('and') && !hasSearchInCount;
          
          // Handle simple count (no AND) or count with search (has word LIKE)
          // Skip if it has other AND conditions (due, state, etc.) - those are handled below
          if (!hasOtherAnd) {
            if (userId) {
              let countQuery = this.client
                .from('cards')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId);
              
              // Handle LIKE clause for word search
              if (hasSearchInCount) {
                // Search pattern is param1 (second parameter after user_id)
                const searchPattern = params.param1 || params.search || params.$2 || paramValues[1];
                if (searchPattern && typeof searchPattern === 'string') {
                  countQuery = countQuery.ilike('word', searchPattern);
                  console.log('[SupabaseDB] COUNT query with search:', searchPattern);
                } else {
                  console.log('[SupabaseDB] COUNT query - search pattern not found. Params:', params, 'Values:', paramValues);
                }
              }
              
              const { count, error } = await countQuery;
              if (error) {
                console.error('[SupabaseDB] COUNT query error:', error);
                throw error;
              }
              
              console.log('[SupabaseDB] COUNT result:', count, 'for userId:', userId, 'hasSearch:', hasSearchInCount);
              return [{ count: count || 0 }];
            }
          }
          // Due cards: SELECT COUNT(*) as count FROM cards WHERE user_id = ? AND due <= ?
          else if (sqlLower.includes('due <= ?')) {
            const userId = params.user_id || params.$1;
            const dueTime = params.due || params.$2;
            
            if (userId && dueTime) {
              const dueIso = typeof dueTime === 'string' ? dueTime : new Date(dueTime).toISOString();
              const { count, error } = await this.client
                .from('cards')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId)
                .or(`due.lte.${dueIso},next_review.lte.${dueIso}`);
              if (error) throw error;
              
              return [{ count: count || 0 }];
            }
          }
          // State cards: SELECT COUNT(*) as count FROM cards WHERE user_id = ? AND state = 0/1/2
          else if (sqlLower.includes('state =')) {
            const userId = params.user_id || params.$1;
            const stateMatch = sqlLower.match(/state\s*=\s*(\d+)/i);
            
            if (userId && stateMatch) {
              const stateValue = parseInt(stateMatch[1], 10);
              const { count, error } = await this.client
                .from('cards')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId)
                .eq('state', stateValue);
              if (error) throw error;
              
              return [{ count: count || 0 }];
            }
          }
        }
      }
      
      // Handle generic COUNT queries (but skip cards queries - handled above)
      if (sqlLower.includes('count(*)') && sqlLower.includes('from') && !sqlLower.includes('from cards')) {
        const tableMatch = sqlLower.match(/from\s+(\w+)/);
        if (tableMatch) {
          const tableName = tableMatch[1];
          let query = this.client.from(tableName).select('*', { count: 'exact', head: true });
          
          // Add WHERE conditions if present
          const whereMatch = sql.match(/where\s+(.*)/i);
          if (whereMatch) {
            const whereClause = whereMatch[1];
            const conditionMatch = whereClause.match(/(\w+)\s*=\s*\$(\d+)/i);
            if (conditionMatch) {
              const column = conditionMatch[1];
              const paramIndex = parseInt(conditionMatch[2]);
              const paramKey = `$${paramIndex}`;
              query = query.eq(column, params[paramKey]);
            }
          }
          
          const { count, error } = await query;
          if (error) throw error;
          
          return [{ count: count || 0 }];
        }
      }
      
      // Handle "similar words" pattern on cards table with LIKE filters
      if (sqlLower.includes('from cards') && sqlLower.includes('like') && sqlLower.includes('user_id')) {
        // Expect params: $1 user_id, $2 word like, $3 translation like, optional $4..$6 for CASE
        const userId = params.$1 ?? params.user_id;
        const wordLike = params.$2 ?? params.word_like;
        const translationLike = params.$3 ?? params.translation_like;

        if (userId && (wordLike || translationLike)) {
          let query = this.client
            .from('cards')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(10);

          if (wordLike && translationLike) {
            // Use OR filter for word/translation ilike
            // Supabase expects pattern without quotes
            const w = typeof wordLike === 'string' ? wordLike : `${wordLike}`;
            const t = typeof translationLike === 'string' ? translationLike : `${translationLike}`;
            query = query.or(`word.ilike.${w},translation.ilike.${t}`);
          } else if (wordLike) {
            const w = typeof wordLike === 'string' ? wordLike : `${wordLike}`;
            query = query.ilike('word', w);
          } else if (translationLike) {
            const t = typeof translationLike === 'string' ? translationLike : `${translationLike}`;
            query = query.ilike('translation', t);
          }

          const { data, error } = await query;
          if (error) throw error;
          return this.normalizeRowsForSelect('cards', Array.isArray(data) ? data : (data ? [data] : []));
        }
      }

      // Handle simple SELECT with WHERE and ORDER BY (with optional LIKE search, LIMIT, OFFSET)
      if (sqlLower.startsWith('select') && sqlLower.includes('from cards') && sqlLower.includes('where user_id = ?') && sqlLower.includes('order by')) {
        // Extract parameters in order: user_id, search (if LIKE), limit, offset
        const paramValues = Object.values(params);
        const userId = params.user_id || params.$1 || params.param0 || paramValues[0];
        
        if (userId) {
          let query = this.client.from('cards').select('*').eq('user_id', userId);
          
          // Extract and handle LIKE clause for word search
          if (sqlLower.includes('word like ?')) {
            // Search pattern is the second parameter (param1 or paramValues[1])
            const searchPattern = params.param1 || params.search || params.$2 || paramValues[1];
            
            if (searchPattern && typeof searchPattern === 'string') {
              // Supabase ilike expects the pattern with % wildcards
              query = query.ilike('word', searchPattern);
            }
          }
          
          // Extract ORDER BY
          const orderMatch = sql.match(/order\s+by\s+(\w+)\s+(asc|desc)/i);
          if (orderMatch) {
            const column = orderMatch[1];
            const direction = orderMatch[2].toLowerCase();
            query = query.order(column, { ascending: direction === 'asc' });
          }
          
          // Extract LIMIT and OFFSET
          // Parameter order: [0] = user_id, [1] = search (if exists), [2] = limit, [3] = offset
          let limitValue = null;
          const hasSearch = sqlLower.includes('word like ?');
          
          if (sqlLower.includes('limit ?')) {
            // Limit is param2 if search exists, otherwise param1
            const limitIndex = hasSearch ? 2 : 1;
            limitValue = params[`param${limitIndex}`] || params.limit || paramValues[limitIndex];
            if (limitValue !== undefined && limitValue !== null) {
              limitValue = parseInt(limitValue, 10);
              query = query.limit(limitValue);
            }
          }
          
          if (sqlLower.includes('offset ?')) {
            // Offset is param3 if search exists, otherwise param2
            const offsetIndex = hasSearch ? 3 : 2;
            const offsetValue = params[`param${offsetIndex}`] || params.offset || paramValues[offsetIndex];
            if (offsetValue !== undefined && offsetValue !== null) {
              const offset = parseInt(offsetValue, 10);
              const limit = limitValue || 1000;
              query = query.range(offset, offset + limit - 1);
            }
          }
          
          const { data, error } = await query;
          if (error) throw error;
          
          return this.normalizeRowsForSelect('cards', Array.isArray(data) ? data : (data ? [data] : []));
        }
      }
      
      // Handle label counts specifically
      if (sqlLower.includes('from labels') && sqlLower.includes('left join card_labels')) {
        // Build an approximate using two queries and merge in memory
        const { data: labels, error: labelsError } = await this.client
          .from('labels')
          .select('id,name,color,type,user_id');
        if (labelsError) throw labelsError;

        const userIdParam = params.$1 || params.user_id || params.user_id2;
        const { data: cl, error: clError } = await this.client
          .from('card_labels')
          .select('label_id, card_id, user_id')
          .eq('user_id', userIdParam);
        if (clError) throw clError;

        const counts = new Map();
        (cl || []).forEach(x => counts.set(x.label_id, (counts.get(x.label_id) || 0) + 1));
        const rows = (labels || [])
          .filter(l => l.type === 'system' || (l.type === 'user' && l.user_id === userIdParam))
          .map(l => ({ name: l.name, color: l.color, count: counts.get(l.id) || 0 }));
        // Sort to mimic ORDER BY type DESC, name ASC
        rows.sort((a, b) => a.name.localeCompare(b.name));
        return rows;
      }

      // Handle JOIN queries from labels with card_labels to get labels for a card
      // Pattern: SELECT l.* FROM labels l JOIN card_labels cl ON l.id = cl.label_id WHERE cl.card_id = ? AND cl.user_id = ?
      if (sqlLower.includes('from labels l') && sqlLower.includes('join card_labels cl') && sqlLower.includes('cl.card_id')) {
        const cardId = params.card_id || params.$1;
        const userId = params.user_id || params.$2;

        if (cardId && userId) {
          // First, get the label IDs for this card from the junction table
          const { data: cardLabelData, error: cardLabelError } = await this.client
            .from('card_labels')
            .select('label_id')
            .eq('card_id', cardId)
            .eq('user_id', userId);

          if (cardLabelError) throw cardLabelError;

          if (!cardLabelData || cardLabelData.length === 0) {
            return [];
          }

          // Extract label IDs
          const labelIds = cardLabelData.map(cl => cl.label_id);

          // Then, get the actual labels
          const { data: labels, error: labelsError } = await this.client
            .from('labels')
            .select('*')
            .in('id', labelIds);

          if (labelsError) throw labelsError;

          // Sort by type ASC, name ASC to match ORDER BY l.type ASC, l.name ASC
          const sortedLabels = (labels || []).sort((a, b) => {
            if (a.type !== b.type) {
              return a.type.localeCompare(b.type);
            }
            return a.name.localeCompare(b.name);
          });

          return sortedLabels;
        }
      }

      // Handle JOIN queries from cards with card_labels to get cards by label
      // Pattern: SELECT c.* FROM cards c JOIN card_labels cl ON c.card_id = cl.card_id AND c.user_id = cl.user_id WHERE cl.user_id = ? AND cl.label_id = ?
      if (sqlLower.includes('from cards c') && sqlLower.includes('join card_labels cl') && sqlLower.includes('cl.label_id')) {
        const userId = params.user_id || params.$1;
        const labelId = params.label_id || params.$2;
        const dueTime = params.due || params.$3;

        if (userId && labelId) {
          // First, get the card IDs for this label from the junction table
          const { data: cardLabelData, error: cardLabelError } = await this.client
            .from('card_labels')
            .select('card_id')
            .eq('user_id', userId)
            .eq('label_id', labelId);

          if (cardLabelError) throw cardLabelError;

          if (!cardLabelData || cardLabelData.length === 0) {
            return [];
          }

          // Extract card IDs
          const cardIds = cardLabelData.map(cl => cl.card_id);

          // Then, get the actual cards
          let query = this.client
            .from('cards')
            .select('*')
            .eq('user_id', userId)
            .in('card_id', cardIds);

          // If there's a due filter, add it
          if (dueTime) {
            query = query.or(`due.lte.${dueTime},next_review.lte.${dueTime}`);
          }

          const { data: cards, error: cardsError } = await query;

          if (cardsError) throw cardsError;

          // Sort by appropriate field
          const sortedCards = (cards || []).sort((a, b) => {
            if (dueTime && a.due && b.due) {
              return new Date(a.due) - new Date(b.due);
            }
            if (a.created_at && b.created_at) {
              return new Date(a.created_at) - new Date(b.created_at);
            }
            return 0;
          });

          return this.normalizeRowsForSelect('cards', sortedCards);
        }
      }
      
      return null; // Let RPC handle it
    } catch (error) {
      return null; // Let RPC handle it
    }
  }

  /**
   * Execute a single query that returns one row
   */
  async queryOne(sql, params = {}) {
    const results = await this.query(sql, params);
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Execute a query that doesn't return results (INSERT, UPDATE, DELETE)
   */
  async execute(sql, params = {}) {
    if (!this.isInitialized) {
      throw new Error('Database not initialized');
    }

    dbLog('[SupabaseJS] execute() called with SQL:', sql.substring(0, 80));

    try {
      // Check if this is a complex query that should use RPC
      if (this.isComplexQuery(sql)) {
        dbLog('[SupabaseJS] Query is complex, using executeComplexQuery');
        await this.executeComplexQuery(sql, params);
        return { changes: 1, lastInsertRowId: null };
      }

      const { tableName, operation } = this.parseSQL(sql, params);
      dbLog('[SupabaseJS] Parsed SQL - tableName:', tableName, 'operation:', operation);
      
      // Use direct insert for word_base table to avoid schema cache issues with quoted column names
      if (tableName === 'word_base' && operation.toLowerCase() === 'insert') {
        dbLog('[SupabaseJS] Using direct insert for word_base table');
        try {
          // Extract values from SQL and params
          const values = this.extractValues(sql, params);
          dbLog('[SupabaseJS] Extracted values for word_base:', Object.keys(values));
          
          // Use Supabase client insert with proper column names
          const { data, error } = await this.client
            .from('word_base')
            .insert(values)
            .select('id')
            .single();
          
          if (error) {
            console.error('[SupabaseJS] Insert error:', error);
            throw error;
          }
          
          const lastId = data && data.id ? data.id : null;
          dbLog('[SupabaseJS] Insert successful, ID:', lastId);
          return { changes: 1, lastInsertRowId: lastId };
        } catch (error) {
          console.error('[SupabaseJS] Direct insert failed:', error);
          // Fallback to executeSQLDirectly
          dbLog('[SupabaseJS] Falling back to executeSQLDirectly');
          let processedSQL = sql.replace(/RETURNING\s+id/i, '');
          const paramValues = Object.values(params);
          let paramIndex = 0;
          
          processedSQL = processedSQL.replace(/\?/g, () => {
            if (paramIndex < paramValues.length) {
              const value = paramValues[paramIndex++];
              if (value === null || value === undefined) {
                return 'NULL';
              } else if (typeof value === 'string') {
                const escaped = value.replace(/'/g, "''");
                return `'${escaped}'`;
              } else if (typeof value === 'number') {
                return String(value);
              } else {
                return `'${String(value).replace(/'/g, "''")}'`;
              }
            }
            return 'NULL';
          });
          
          await this.executeSQLDirectly(processedSQL + ' RETURNING id');
          const lastIdResult = await this.query('SELECT lastval() as id', {});
          const lastId = lastIdResult && lastIdResult[0] ? lastIdResult[0].id : null;
          return { changes: 1, lastInsertRowId: lastId };
        }
      }
      
      if (!tableName || tableName === 'unknown') {
        // Fallback to RPC for unrecognized queries
        dbLog('[SupabaseJS] TableName unknown, using executeComplexQuery');
        await this.executeComplexQuery(sql, params);
        return { changes: 1, lastInsertRowId: null };
      }
      
      let query = this.client.from(tableName);
      
      let result;
      
      switch (operation.toLowerCase()) {
        case 'insert':
          dbLog('[SupabaseJS] Calling handleInsert');
          result = await this.handleInsert(query, sql, params);
          break;
        case 'update':
          dbLog('[SupabaseJS] Calling handleUpdate');
          result = await this.handleUpdate(query, sql, params);
          break;
        case 'delete':
          dbLog('[SupabaseJS] Calling handleDelete for table:', tableName);
          result = await this.handleDelete(query, sql, params);
          dbLog('[SupabaseJS] handleDelete returned:', result);
          break;
        default:
          // For complex queries, use RPC
          dbLog('[SupabaseJS] Default case, using executeComplexQuery');
          await this.executeComplexQuery(sql, params);
          result = { changes: 1, lastInsertRowId: null };
      }

      // Normalize rows for inserts/updates that return representation
      if (Array.isArray(result?.data)) {
        result.data = this.normalizeRowsForSelect(tableName, result.data);
      }
      dbLog('[SupabaseJS] execute() returning:', result);
      return result;
    } catch (error) {
      console.error('[SupabaseJS] execute() error:', error);
      throw error;
    }
  }

  /**
   * Handle INSERT operations
   */
  async handleInsert(query, sql, params) {
    // Log the exact SQL query
    const paramsArray = Object.values(params || {});
    dbLog('[DB-SQL]', sql, '| PARAMS:', paramsArray.length > 0 ? paramsArray : 'none');
    
    const values = this.extractValues(sql, params);
    
    // Debug logging to see what values we're trying to insert
    
    
    const { data, error } = await query.insert(values).select();
    
    if (error) {
      
      throw error;
    }

    this.lastInsertId = data && data.length > 0 ? data[0].id : null;
    
    return {
      changes: data ? data.length : 1,
      lastInsertRowId: this.lastInsertId
    };
  }

  /**
   * Handle UPDATE operations
   */
  async handleUpdate(query, sql, params) {
    // Log the exact SQL query
    const paramsArray = Object.values(params || {});
    dbLog('[DB-SQL]', sql, '| PARAMS:', paramsArray.length > 0 ? paramsArray : 'none');
    
    const { values, conditions } = this.extractUpdateData(sql, params);
    dbLog('[SupabaseJS] Extracted update values keys:', Object.keys(values || {}));
    dbLog('[SupabaseJS] Extracted update conditions:', JSON.stringify(conditions || []));
    dbLog('[SupabaseJS] Params structure:', typeof params, 'isArray:', Array.isArray(params), 'keys:', Object.keys(params || {}));
    
    let updateQuery = query.update(values);
    
    // Apply conditions with proper method calls
    if (conditions && conditions.length > 0) {
      for (const condition of conditions) {
        dbLog('[SupabaseJS] Applying update condition:', condition.operator, condition.column, condition.value);
        
        // Use proper method chaining with the Supabase query builder
        if (condition.operator === 'eq') {
          updateQuery = updateQuery.eq(condition.column, condition.value);
        } else if (condition.operator === 'neq') {
          updateQuery = updateQuery.neq(condition.column, condition.value);
        } else if (condition.operator === 'gt') {
          updateQuery = updateQuery.gt(condition.column, condition.value);
        } else if (condition.operator === 'gte') {
          updateQuery = updateQuery.gte(condition.column, condition.value);
        } else if (condition.operator === 'lt') {
          updateQuery = updateQuery.lt(condition.column, condition.value);
        } else if (condition.operator === 'lte') {
          updateQuery = updateQuery.lte(condition.column, condition.value);
        } else if (condition.operator === 'like') {
          updateQuery = updateQuery.like(condition.column, condition.value);
        } else if (condition.operator === 'ilike') {
          updateQuery = updateQuery.ilike(condition.column, condition.value);
        } else {
          // Fallback to eq for unknown operators
          console.warn('[SupabaseJS] Unknown operator:', condition.operator, 'using eq');
          updateQuery = updateQuery.eq(condition.column, condition.value);
        }
      }
    }

    dbLog('[SupabaseJS] Executing update query...');
    const { data, error } = await updateQuery.select();
    
    if (error) {
      console.error('[SupabaseJS] Update error:', error);
      throw error;
    }

    dbLog('[SupabaseJS] Update successful, rows affected:', data?.length || 0);
    return {
      changes: data ? data.length : 1,
      lastInsertRowId: null
    };
  }

  /**
   * Handle DELETE operations
   */
  async handleDelete(query, sql, params) {
    // Log the exact SQL query
    const paramsArray = Object.values(params || {});
    dbLog('[DB-SQL]', sql, '| PARAMS:', paramsArray.length > 0 ? paramsArray : 'none');
    
    const conditions = this.extractDeleteConditions(sql, params);
    dbLog('[SupabaseJS] Extracted conditions:', JSON.stringify(conditions));
    dbLog('[SupabaseJS] Params structure:', typeof params, 'keys:', Object.keys(params || {}));
    
    // Start with .delete() to get the DELETE query builder
    let deleteQuery = query.delete();
    
    // Apply conditions to the DELETE query builder
    if (conditions && conditions.length > 0) {
      for (const condition of conditions) {
        dbLog('[SupabaseJS] Applying condition:', condition.operator, condition.column, condition.value);
        
        // Use proper method chaining with the Supabase query builder
        if (condition.operator === 'eq') {
          deleteQuery = deleteQuery.eq(condition.column, condition.value);
        } else if (condition.operator === 'neq') {
          deleteQuery = deleteQuery.neq(condition.column, condition.value);
        } else if (condition.operator === 'gt') {
          deleteQuery = deleteQuery.gt(condition.column, condition.value);
        } else if (condition.operator === 'gte') {
          deleteQuery = deleteQuery.gte(condition.column, condition.value);
        } else if (condition.operator === 'lt') {
          deleteQuery = deleteQuery.lt(condition.column, condition.value);
        } else if (condition.operator === 'lte') {
          deleteQuery = deleteQuery.lte(condition.column, condition.value);
        } else if (condition.operator === 'like') {
          deleteQuery = deleteQuery.like(condition.column, condition.value);
        } else if (condition.operator === 'ilike') {
          deleteQuery = deleteQuery.ilike(condition.column, condition.value);
        } else {
          // Fallback to eq for unknown operators
          console.warn('[SupabaseJS] Unknown operator:', condition.operator, 'using eq');
          deleteQuery = deleteQuery.eq(condition.column, condition.value);
        }
      }
    }

    dbLog('[SupabaseJS] Executing delete query...');
    const { data, error } = await deleteQuery.select();
    
    if (error) {
      console.error('[SupabaseJS] Delete error:', error);
      throw error;
    }

    dbLog('[SupabaseJS] Delete successful, rows deleted:', data?.length || 0);
    return {
      changes: data ? data.length : 1,
      lastInsertRowId: null
    };
  }

  /**
   * Parse SQL query to extract components
   */
  parseSQL(sql, params) {
    const trimmedSQL = sql.trim().toLowerCase();
    
    if (trimmedSQL.startsWith('select')) {
      return this.parseSelectSQL(sql, params);
    } else if (trimmedSQL.startsWith('insert')) {
      return this.parseInsertSQL(sql, params);
    } else if (trimmedSQL.startsWith('update')) {
      return this.parseUpdateSQL(sql, params);
    } else if (trimmedSQL.startsWith('delete')) {
      return this.parseDeleteSQL(sql, params);
    }
    
    return { tableName: 'unknown', operation: 'unknown' };
  }

  /**
   * Parse SELECT SQL
   */
  parseSelectSQL(sql, params) {
    const match = sql.match(/select\s+(.*?)\s+from\s+(\w+)/i);
    if (match) {
      const fields = match[1];
      const tableName = match[2];
      
      const conditions = this.extractConditions(sql, params);
      
      // Handle COUNT queries specially
      if (fields.toLowerCase().includes('count(*)')) {
        return {
          tableName,
          operation: 'count',
          fields: '*',
          conditions: conditions
        };
      }
      
      return {
        tableName,
        operation: 'select',
        fields,
        conditions: conditions
      };
    }
    return { tableName: 'unknown', operation: 'select' };
  }

  /**
   * Parse INSERT SQL
   */
  parseInsertSQL(sql, params) {
    const match = sql.match(/insert\s+into\s+(\w+)/i);
    if (match) {
      return {
        tableName: match[1],
        operation: 'insert'
      };
    }
    return { tableName: 'unknown', operation: 'insert' };
  }

  /**
   * Parse UPDATE SQL
   */
  parseUpdateSQL(sql, params) {
    const match = sql.match(/update\s+(\w+)/i);
    if (match) {
      return {
        tableName: match[1],
        operation: 'update',
        conditions: this.extractConditions(sql, params)
      };
    }
    return { tableName: 'unknown', operation: 'update' };
  }

  /**
   * Parse DELETE SQL
   */
  parseDeleteSQL(sql, params) {
    const match = sql.match(/delete\s+from\s+(\w+)/i);
    if (match) {
      return {
        tableName: match[1],
        operation: 'delete',
        conditions: this.extractConditions(sql, params)
      };
    }
    return { tableName: 'unknown', operation: 'delete' };
  }

  /**
   * Extract conditions from SQL
   */
  extractConditions(sql, params) {
    const conditions = [];
    // Use [\s\S] to match any character including newlines
    const whereMatch = sql.match(/where\s+([\s\S]*)/i);
    
    if (whereMatch) {
      let whereClause = whereMatch[1];
      // Remove ORDER BY, GROUP BY, LIMIT, OFFSET clauses that might be at the end
      whereClause = whereClause.replace(/\s+(?:order\s+by|group\s+by|limit|offset)[\s\S]*$/i, '').trim();
      
      // Handle ? placeholders (used by DeepRememberRepository)
      const questionMarkMatches = whereClause.match(/(\w+)\s*=\s*\?/gi);
      if (questionMarkMatches) {
        const paramValues = Object.values(params);
        let paramIndex = 0;
        questionMarkMatches.forEach(match => {
          const columnMatch = match.match(/(\w+)\s*=\s*\?/i);
          if (columnMatch) {
            const column = columnMatch[1];
            // Priority: 1) column name in params (for named params like {user_id: ..., name: ...})
            //          2) positional $1/$2 style params
            //          3) array index from Object.values
            const paramValue = params[column] !== undefined ? params[column]
                           : (params[`$${paramIndex + 1}`] !== undefined ? params[`$${paramIndex + 1}`]
                           : paramValues[paramIndex]);
            
            if (paramValue !== undefined) {
              conditions.push({
                column: column,
                operator: 'eq',
                value: paramValue
              });
            }
            paramIndex++;
          }
        });
      }
      
      // Handle $1, $2 patterns
      const dollarMatches = whereClause.match(/(\w+)\s*=\s*\$(\d+)/gi);
      if (dollarMatches) {
        dollarMatches.forEach(match => {
          const conditionMatch = match.match(/(\w+)\s*=\s*\$(\d+)/i);
          if (conditionMatch) {
            const column = conditionMatch[1];
            const paramIndex = parseInt(conditionMatch[2]);
            const paramKey = `$${paramIndex}`;
            
            conditions.push({
              column: column,
              operator: 'eq',
              value: params[paramKey]
            });
          }
        });
      }
      
      // Handle special operators like <=
      const lteMatches = whereClause.match(/(\w+)\s*<=\s*\?/gi);
      if (lteMatches) {
        let paramIndex = 0;
        lteMatches.forEach(match => {
          const columnMatch = match.match(/(\w+)\s*<=\s*\?/i);
          if (columnMatch) {
            const column = columnMatch[1];
            const paramKey = `$${paramIndex + 1}`;
            const paramValue = params[paramKey] || params[column];
            
            if (paramValue !== undefined) {
              conditions.push({
                column: column,
                operator: 'lte',
                value: paramValue
              });
            }
            paramIndex++;
          }
        });
      }
      
      // Handle literal values like "state = 0"
      const literalMatches = whereClause.match(/(\w+)\s*=\s*(\d+)/gi);
      if (literalMatches) {
        literalMatches.forEach(match => {
          const literalMatch = match.match(/(\w+)\s*=\s*(\d+)/i);
          if (literalMatch) {
            const column = literalMatch[1];
            const value = parseInt(literalMatch[2], 10);
            
            // Only add if we don't already have this column
            const existingCondition = conditions.find(c => c.column === column);
            if (!existingCondition) {
              conditions.push({
                column: column,
                operator: 'eq',
                value: value
              });
            }
          }
        });
      }
    }
    
    return conditions;
  }

  /**
   * Extract values from INSERT SQL
   */
  extractValues(sql, params) {
    // Parse INSERT INTO table (col1, col2) VALUES (val1, val2) format
    const insertMatch = sql.match(/insert\s+into\s+(\w+)\s*\(([^)]+)\)\s*values\s*\(([^)]+)\)/i);
    
    if (insertMatch) {
      const tableName = insertMatch[1];
      const columnsStr = insertMatch[2];
      const valuesStr = insertMatch[3];
      
      // Strip quotes from column names (PostgreSQL quoted identifiers)
      const columns = columnsStr.split(',').map(col => col.trim().replace(/^"|"$/g, ''));
      const values = valuesStr.split(',').map(val => val.trim());
      
      const result = {};
      columns.forEach((column, index) => {
        if (values[index]) {
          const value = values[index];
          let paramValue = null;
          
          if (value.startsWith('$')) {
            const paramKey = value;
            paramValue = params[paramKey];
          } else if (value === '?') {
            // Map by column name (the repository builds params with matching names)
            // e.g., columns: user_id, card_id, word, ... and params has those keys
            // Try both the column name as-is and without quotes
            const columnKey = column.replace(/^"|"$/g, '');
            if (Object.prototype.hasOwnProperty.call(params, columnKey)) {
              paramValue = params[columnKey];
            } else if (Object.prototype.hasOwnProperty.call(params, column)) {
              paramValue = params[column];
            } else {
              // Fallback: attempt numeric $n style based on 1-index position
              const fallbackKey = `$${index + 1}`;
              paramValue = params[fallbackKey];
            }
          } else {
            // Handle literal values
            paramValue = value.replace(/^'|'$/g, ''); // Remove quotes
          }
          
          // Handle date/time fields properly
          if (paramValue !== null && paramValue !== undefined) {
            // Use the column name without quotes for the result object
            const resultColumnName = column.replace(/^"|"$/g, '');
            if (this.isDateField(resultColumnName)) {
              result[resultColumnName] = this.normalizeDateValue(paramValue);
            } else if (this.isIntegerField(resultColumnName)) {
              const intVal = parseInt(paramValue, 10);
              result[resultColumnName] = Number.isFinite(intVal) ? intVal : 0;
            } else if (this.isRealField(resultColumnName)) {
              const floatVal = parseFloat(paramValue);
              result[resultColumnName] = Number.isFinite(floatVal) ? floatVal : 0;
            } else {
              result[resultColumnName] = paramValue;
            }
          }
        }
      });
      
      return result;
    }
    
    // Fallback for simple INSERT INTO table VALUES (val1, val2) format
    const valuesMatch = sql.match(/values\s*\(([^)]+)\)/i);
    if (valuesMatch) {
      const valuesStr = valuesMatch[1];
      const paramMatches = valuesStr.match(/\$(\d+)/g);
      
      if (paramMatches) {
        const values = {};
        paramMatches.forEach((param, index) => {
          const paramIndex = parseInt(param.substring(1));
          const paramKey = `$${paramIndex}`;
          // This is a simplified approach - in reality, you'd need to map column names
          values[`column_${index}`] = params[paramKey];
        });
        return values;
      }
    }
    
    return {};
  }

  /**
   * Check if a column is a date/time field
   */
  isDateField(columnName) {
    const dateFields = ['due', 'next_review', 'created_at', 'updated_at', 'last_reviewed'];
    return dateFields.includes(columnName.toLowerCase());
  }

  /**
   * Check if a column is an integer field
   */
  isIntegerField(columnName) {
    const intFields = ['state', 'elapsed_days', 'scheduled_days', 'reps', 'lapses'];
    return intFields.includes(columnName.toLowerCase());
  }

  /**
   * Check if a column is a real/float field
   */
  isRealField(columnName) {
    const realFields = ['stability', 'difficulty', 'ease_factor'];
    return realFields.includes(columnName.toLowerCase());
  }

  /**
   * Normalize date values for database insertion
   */
  normalizeDateValue(value) {
    if (value === null || value === undefined) {
      return null;
    }
    
    // If it's already a valid date string or Date object, use it
    if (value instanceof Date) {
      return value.toISOString();
    }
    
    if (typeof value === 'string') {
      // If it's a valid date string, use it
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
    }
    
    // If it's a number (timestamp), convert it
    if (typeof value === 'number') {
      if (value === 0) {
        // Return current time for 0 values
        return new Date().toISOString();
      }
      return new Date(value).toISOString();
    }
    
    // Default to current time
    return new Date().toISOString();
  }

  /**
   * Extract UPDATE data
   */
  extractUpdateData(sql, params) {
    dbLog('[SupabaseJS] extractUpdateData called');
    // Use [\s\S] to match any character including newlines
    const setMatch = sql.match(/set\s+([\s\S]*?)\s+where/i);
    dbLog('[SupabaseJS] SET match result:', !!setMatch);
    
    if (setMatch) {
      const setClause = setMatch[1];
      const values = {};
      
      dbLog('[SupabaseJS] Full SET clause:', setClause);
      
      // Handle ? placeholders - extract column names and map from params object
      const setMatches = setClause.match(/(\w+)\s*=\s*\?/g);
      dbLog('[SupabaseJS] Found ? matches:', setMatches);
      
      if (setMatches) {
        setMatches.forEach(match => {
          const fieldMatch = match.match(/(\w+)\s*=\s*\?/);
          if (fieldMatch) {
            const column = fieldMatch[1];
            dbLog(`[SupabaseJS] Processing column: ${column}, exists in params: ${params && params[column] !== undefined}`);
            // Skip CURRENT_TIMESTAMP and other functions that aren't in params
            if (params && params[column] !== undefined) {
              values[column] = params[column];
              dbLog(`[SupabaseJS] Mapped ${column} = ${params[column]}`);
            }
          }
        });
      }
      
      // Also handle $1, $2 format for compatibility
      const dollarMatches = setClause.match(/(\w+)\s*=\s*\$(\d+)/g);
      if (dollarMatches) {
        dollarMatches.forEach(match => {
          const fieldMatch = match.match(/(\w+)\s*=\s*\$(\d+)/);
          if (fieldMatch) {
            const column = fieldMatch[1];
            const paramIndex = parseInt(fieldMatch[2]);
            const paramKey = `$${paramIndex}`;
            values[column] = params[paramKey];
          }
        });
      }
      
      dbLog('[SupabaseJS] Final extracted values keys:', Object.keys(values));
      dbLog('[SupabaseJS] Final values:', values);
      
      return {
        values: values,
        conditions: this.extractConditions(sql, params)
      };
    }
    
    dbLog('[SupabaseJS] No SET clause found');
    return { values: {}, conditions: [] };
  }

  /**
   * Extract DELETE conditions
   */
  extractDeleteConditions(sql, params) {
    return this.extractConditions(sql, params);
  }

  /**
   * Begin a transaction (Supabase doesn't support explicit transactions via JS client)
   */
  async beginTransaction() {
    
    return { id: 'no-transaction', client: this.client };
  }

  /**
   * Commit a transaction (no-op for Supabase JavaScript Client)
   */
  async commitTransaction(transaction) {
    
  }

  /**
   * Rollback a transaction (no-op for Supabase JavaScript Client)
   */
  async rollbackTransaction(transaction) {
    
  }

  /**
   * Get the last inserted row ID
   */
  async getLastInsertId() {
    return this.lastInsertId;
  }

  /**
   * Check if the database is connected
   */
  async isConnected() {
    try {
      if (!this.client) {
        return false;
      }
      
      // Test connection by querying a simple table
      const { error } = await this.client.from('users').select('id').limit(1);
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
      database: 'Supabase (JavaScript Client)',
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
}

module.exports = SupabaseDatabaseJavaScriptClient;
