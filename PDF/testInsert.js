require('dotenv').config({ path: require('path').join(__dirname, '..', 'backend', '.env') });
const databaseFactory = require('../backend/database/access/DatabaseFactory');
const dbConfig = require('../backend/config/database');
const WordBaseRepository = require('../backend/database/access/WordBaseRepository');

(async () => {
  try {
    await databaseFactory.initialize(dbConfig.type, dbConfig[dbConfig.type]);
    const database = databaseFactory.getDatabase();
    const repo = new WordBaseRepository(database);
    
    const testWord = {
      word: "test",
      translate: null,
      sample_sentence: "This is a test.",
      groupAlphabetName: "T",
      type_of_word: "noun",
      plural_sign: null,
      article: null,
      female_form: null,
      meaning: null,
      more_info: null
    };
    
    console.log('Inserting test word...');
    const result = await repo.createWord(testWord);
    console.log('✅ Success! Inserted word:', result);
    
    const count = await repo.getAllWords();
    console.log('Total words:', count.length);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
})();

