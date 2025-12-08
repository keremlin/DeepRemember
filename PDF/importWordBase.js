/**
 * Import Words from JSON to Database
 * 
 * This script imports all words from ALPHABETISCHER_WORTSCHATZ.json into the word_base table.
 * 
 * Usage:
 *   node PDF/importWordBase.js
 * 
 * Requirements:
 *   - The JSON file must be in the PDF folder
 *   - Database configuration must be set in backend/.env
 *   - The word_base table must exist (created automatically on first database initialization)
 * 
 * The script will:
 *   - Validate all words in the JSON file
 *   - Import words in batches of 100
 *   - Continue importing even if some words fail
 *   - Provide a detailed summary at the end
 */

// Load environment variables from .env file
require('dotenv').config({ path: require('path').join(__dirname, '..', 'backend', '.env') });

const fs = require('fs');
const path = require('path');
const databaseFactory = require('../backend/database/access/DatabaseFactory');
const dbConfig = require('../backend/config/database');
const WordBaseRepository = require('../backend/database/access/WordBaseRepository');

/**
 * Import words from JSON file to word_base table
 */
async function importWords() {
  let database = null;
  let wordBaseRepository = null;

  try {
    console.log('🚀 Starting word import process...');
    
    // Initialize database
    console.log('📊 Initializing database...');
    try {
      database = databaseFactory.getDatabase();
      console.log('✅ Database already initialized');
    } catch (error) {
      console.log('🔄 Initializing new database connection...');
      await databaseFactory.initialize(dbConfig.type, dbConfig[dbConfig.type]);
      database = databaseFactory.getDatabase();
      console.log('✅ Database initialized successfully');
    }

    // Create repository
    wordBaseRepository = new WordBaseRepository(database);
    console.log('✅ WordBaseRepository created');

    // Read JSON file
    const jsonFilePath = path.join(__dirname, 'ALPHABETISCHER_WORTSCHATZ.json');
    console.log(`📖 Reading JSON file: ${jsonFilePath}`);
    
    if (!fs.existsSync(jsonFilePath)) {
      throw new Error(`JSON file not found: ${jsonFilePath}`);
    }

    const fileContent = fs.readFileSync(jsonFilePath, 'utf8');
    const words = JSON.parse(fileContent);

    if (!Array.isArray(words)) {
      throw new Error('JSON file must contain an array of word objects');
    }

    console.log(`📝 Found ${words.length} words in JSON file`);

    // Validate and prepare words
    const validWords = [];
    const invalidWords = [];

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      
      // Validate required fields
      if (!word.word || !word.groupAlphabetName || !word.type_of_word) {
        invalidWords.push({
          index: i + 1,
          word: word.word || 'N/A',
          reason: 'Missing required fields (word, groupAlphabetName, or type_of_word)'
        });
        continue;
      }

      // Prepare word data (handle null values)
      // Note: The JSON uses groupAlphabetName, but the database column is group_alphabet_name
      // The repository will handle the mapping
      const wordData = {
        word: String(word.word).trim(),
        translate: word.translate ? String(word.translate).trim() : null,
        sample_sentence: word.sample_sentence ? String(word.sample_sentence).trim() : null,
        groupAlphabetName: String(word.groupAlphabetName).trim(),
        type_of_word: String(word.type_of_word).trim(),
        plural_sign: word.plural_sign ? String(word.plural_sign).trim() : null,
        article: word.article ? String(word.article).trim() : null,
        female_form: word.female_form ? String(word.female_form).trim() : null,
        meaning: word.meaning ? String(word.meaning).trim() : null,
        more_info: word.more_info ? String(word.more_info).trim() : null
      };

      // Skip empty words
      if (!wordData.word) {
        invalidWords.push({
          index: i + 1,
          word: 'N/A',
          reason: 'Empty word field'
        });
        continue;
      }

      validWords.push(wordData);
    }

    console.log(`✅ Valid words: ${validWords.length}`);
    if (invalidWords.length > 0) {
      console.log(`⚠️  Invalid words: ${invalidWords.length}`);
      if (invalidWords.length <= 10) {
        console.log('Invalid words details:');
        invalidWords.forEach(invalid => {
          console.log(`  - Index ${invalid.index}: ${invalid.word} - ${invalid.reason}`);
        });
      }
    }

    // Import words in batches to avoid memory issues
    const batchSize = 100;
    let importedCount = 0;
    let errorCount = 0;
    const errors = [];

    console.log(`\n📦 Starting bulk import in batches of ${batchSize}...`);

    for (let i = 0; i < validWords.length; i += batchSize) {
      const batch = validWords.slice(i, i + batchSize);
      const batchNumber = Math.floor(i / batchSize) + 1;
      const totalBatches = Math.ceil(validWords.length / batchSize);

      try {
        console.log(`\n📦 Processing batch ${batchNumber}/${totalBatches} (words ${i + 1}-${Math.min(i + batchSize, validWords.length)})...`);
        
        // Import batch
        const insertedCount = await wordBaseRepository.bulkInsertWords(batch);
        importedCount += insertedCount;
        
        console.log(`✅ Batch ${batchNumber} completed: ${insertedCount} words imported`);
      } catch (error) {
        console.error(`❌ Error in batch ${batchNumber}:`, error.message);
        errorCount += batch.length;
        errors.push({
          batch: batchNumber,
          error: error.message,
          words: batch.length
        });

        // Try to import individually to see which ones fail
        console.log(`🔄 Attempting individual import for batch ${batchNumber}...`);
        for (const wordData of batch) {
          try {
            await wordBaseRepository.createWord(wordData);
            importedCount++;
            errorCount--;
          } catch (individualError) {
            errors.push({
              word: wordData.word,
              error: individualError.message
            });
          }
        }
      }

      // Progress indicator
      const progress = ((i + batch.length) / validWords.length * 100).toFixed(1);
      console.log(`📊 Progress: ${progress}% (${importedCount}/${validWords.length} imported)`);
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 IMPORT SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total words in JSON: ${words.length}`);
    console.log(`Valid words: ${validWords.length}`);
    console.log(`Invalid words: ${invalidWords.length}`);
    console.log(`Successfully imported: ${importedCount}`);
    console.log(`Failed: ${errorCount}`);
    console.log('='.repeat(60));

    if (errors.length > 0 && errors.length <= 20) {
      console.log('\n⚠️  Errors encountered:');
      errors.forEach(err => {
        if (err.word) {
          console.log(`  - Word "${err.word}": ${err.error}`);
        } else {
          console.log(`  - Batch ${err.batch}: ${err.error}`);
        }
      });
    } else if (errors.length > 20) {
      console.log(`\n⚠️  ${errors.length} errors encountered (too many to display)`);
    }

    if (importedCount > 0) {
      console.log('\n✅ Import completed successfully!');
    } else {
      console.log('\n❌ No words were imported. Please check the errors above.');
    }

  } catch (error) {
    console.error('\n❌ Fatal error during import:', error);
    console.error(error.stack);
    process.exit(1);
  } finally {
    // Close database connection if needed
    if (database && typeof database.close === 'function') {
      try {
        await database.close();
        console.log('\n🔌 Database connection closed');
      } catch (error) {
        console.error('Error closing database:', error);
      }
    }
  }
}

// Run the import
if (require.main === module) {
  importWords()
    .then(() => {
      console.log('\n✨ Script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Script failed:', error);
      process.exit(1);
    });
}

module.exports = { importWords };

