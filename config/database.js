/**
 * Database Configuration
 */
module.exports = {
  // Default database type
  type: process.env.DB_TYPE || 'sqlite',
  
  // SQLite configuration
  sqlite: {
    dbPath: process.env.SQLITE_DB_PATH || './database/db/deepRemember.db',
    // WAL mode for better concurrency
    pragma: {
      journal_mode: 'WAL',
      synchronous: 'NORMAL',
      cache_size: -64000, // 64MB cache
      temp_store: 'MEMORY'
    }
  },
  
  // MySQL configuration (for future use)
  mysql: {
    host: process.env.MYSQL_HOST || 'localhost',
    port: process.env.MYSQL_PORT || 3306,
    user: process.env.MYSQL_USER || 'root',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || 'deepRemember_app',
    charset: 'utf8mb4',
    timezone: 'UTC'
  },
  
  // PostgreSQL configuration (for future use)
  postgresql: {
    host: process.env.PG_HOST || 'localhost',
    port: process.env.PG_PORT || 5432,
    user: process.env.PG_USER || 'postgres',
    password: process.env.PG_PASSWORD || '',
    database: process.env.PG_DATABASE || 'deepRemember_app',
    ssl: process.env.PG_SSL === 'true'
  },
  
  // Connection pool settings
  pool: {
    min: parseInt(process.env.DB_POOL_MIN) || 2,
    max: parseInt(process.env.DB_POOL_MAX) || 10,
    acquireTimeoutMillis: parseInt(process.env.DB_ACQUIRE_TIMEOUT) || 60000,
    createTimeoutMillis: parseInt(process.env.DB_CREATE_TIMEOUT) || 30000,
    destroyTimeoutMillis: parseInt(process.env.DB_DESTROY_TIMEOUT) || 5000,
    idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT) || 30000,
    reapIntervalMillis: parseInt(process.env.DB_REAP_INTERVAL) || 1000,
    createRetryIntervalMillis: parseInt(process.env.DB_CREATE_RETRY_INTERVAL) || 200
  },
  
  // Migration settings
  migration: {
    // Enable automatic migration from memory to database
    autoMigrate: process.env.DB_AUTO_MIGRATE !== 'false',
    // Backup memory data before migration
    backupMemory: process.env.DB_BACKUP_MEMORY !== 'false'
  },
  
  // Logging settings
  logging: {
    enabled: process.env.DB_LOGGING !== 'false',
    level: process.env.DB_LOG_LEVEL || 'info'
  }
};
