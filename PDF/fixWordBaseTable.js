/**
 * Fix word_base table structure
 * This script ensures the table has the correct column names with proper casing
 */

// Load environment variables from .env file
require('dotenv').config({ path: require('path').join(__dirname, '..', 'backend', '.env') });

const databaseFactory = require('../backend/database/access/DatabaseFactory');
const dbConfig = require('../backend/config/database');

async function fixTable() {
  try {
    console.log('🔧 Fixing word_base table structure...');
    
    // Initialize database
    let database;
    try {
      database = databaseFactory.getDatabase();
    } catch (error) {
      await databaseFactory.initialize(dbConfig.type, dbConfig[dbConfig.type]);
      database = databaseFactory.getDatabase();
    }

    // Drop and recreate the table with correct structure
    const dropTableSQL = `DROP TABLE IF EXISTS word_base CASCADE;`;
    const createTableSQL = `
      CREATE TABLE word_base (
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
      );
      
      CREATE INDEX IF NOT EXISTS idx_word_base_word ON word_base(word);
      CREATE INDEX IF NOT EXISTS idx_word_base_group_alphabet_name ON word_base(group_alphabet_name);
      CREATE INDEX IF NOT EXISTS idx_word_base_type_of_word ON word_base(type_of_word);
    `;

    console.log('🗑️  Dropping existing table...');
    await database.execute(dropTableSQL, {});
    
    console.log('📝 Creating table with correct structure...');
    await database.execute(createTableSQL, {});
    
    console.log('✅ Table structure fixed successfully!');
    
    if (database && typeof database.close === 'function') {
      await database.close();
    }
  } catch (error) {
    console.error('❌ Error fixing table:', error);
    throw error;
  }
}

if (require.main === module) {
  fixTable()
    .then(() => {
      console.log('✨ Script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

module.exports = { fixTable };

