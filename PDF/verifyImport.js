require('dotenv').config({ path: require('path').join(__dirname, '..', 'backend', '.env') });
const databaseFactory = require('../backend/database/access/DatabaseFactory');
const dbConfig = require('../backend/config/database');

(async () => {
  try {
    await databaseFactory.initialize(dbConfig.type, dbConfig[dbConfig.type]);
    const db = databaseFactory.getDatabase();
    
    // Get total count
    const countResult = await db.query('SELECT COUNT(*) as total FROM word_base', {});
    const total = countResult[0]?.total || countResult[0]?.count || 0;
    
    console.log(`\n✅ Total words in database: ${total}`);
    
    // Get sample of last 5 words
    const sample = await db.query(
      'SELECT id, word, group_alphabet_name, type_of_word FROM word_base ORDER BY id DESC LIMIT 5',
      {}
    );
    
    console.log('\n📝 Last 5 words imported:');
    sample.forEach(w => {
      console.log(`  ${w.id}. ${w.word} (${w.group_alphabet_name}, ${w.type_of_word})`);
    });
    
    // Get count by group
    const groups = await db.query(
      `SELECT group_alphabet_name, COUNT(*) as count 
       FROM word_base 
       GROUP BY group_alphabet_name 
       ORDER BY group_alphabet_name`,
      {}
    );
    
    console.log('\n📊 Words by alphabet group:');
    groups.forEach(g => {
      console.log(`  ${g.group_alphabet_name}: ${g.count}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();

