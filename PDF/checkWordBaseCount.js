// Load environment variables from .env file
require('dotenv').config({ path: require('path').join(__dirname, '..', 'backend', '.env') });

const databaseFactory = require('../backend/database/access/DatabaseFactory');
const dbConfig = require('../backend/config/database');
const WordBaseRepository = require('../backend/database/access/WordBaseRepository');

async function checkCount() {
  try {
    console.log('📊 Checking word_base table...');
    
    // Initialize database
    let database;
    try {
      database = databaseFactory.getDatabase();
    } catch (error) {
      await databaseFactory.initialize(dbConfig.type, dbConfig[dbConfig.type]);
      database = databaseFactory.getDatabase();
    }

    const wordBaseRepository = new WordBaseRepository(database);
    
    // Get total count
    const allWords = await wordBaseRepository.getAllWords();
    const count = allWords.length;
    
    console.log(`\n✅ Total words in database: ${count}`);
    
    // Get count by group
    const groups = {};
    allWords.forEach(word => {
      const group = word.groupAlphabetName || word.group_alphabet_name || 'Unknown';
      groups[group] = (groups[group] || 0) + 1;
    });
    
    console.log('\n📊 Words by alphabet group:');
    Object.keys(groups).sort().forEach(group => {
      console.log(`  ${group}: ${groups[group]}`);
    });
    
    if (database && typeof database.close === 'function') {
      await database.close();
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkCount();

