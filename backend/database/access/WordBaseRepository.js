const config = require('../../config/app');

// Conditional logging helper
function dbLog(...args) {
  if (config.DB_LOG) {
    console.log(...args);
  }
}

/**
 * WordBase Repository - Handles all word_base database operations
 */
class WordBaseRepository {
  constructor(database) {
    this.db = database;
  }

  /**
   * Create a new word entry
   * @param {Object} wordData - Word data
   * @param {string} wordData.word - The word
   * @param {string} wordData.translate - Translation (optional)
   * @param {string} wordData.sample_sentence - Sample sentence (optional)
   * @param {string} wordData.group_alphabet_name - Alphabet group name
   * @param {string} wordData.type_of_word - Type of word (noun, verb, etc.)
   * @param {string} wordData.plural_sign - Plural sign (optional)
   * @param {string} wordData.article - Article (optional)
   * @param {string} wordData.female_form - Female form (optional)
   * @param {string} wordData.meaning - Meaning (optional)
   * @param {string} wordData.more_info - More info (optional)
   * @returns {Promise<Object>} Created word entry
   */
  async createWord(wordData) {
    try {
      // Use quoted identifiers for camelCase column names to work with PostgreSQL/Supabase
      // Use RETURNING to get the inserted ID
      const result = await this.db.execute(
        `INSERT INTO word_base (
          word, translate, sample_sentence, group_alphabet_name, type_of_word,
          plural_sign, article, female_form, meaning, more_info
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
        {
          word: wordData.word,
          translate: wordData.translate || null,
          sample_sentence: wordData.sample_sentence || null,
          group_alphabet_name: wordData.groupAlphabetName,
          type_of_word: wordData.type_of_word,
          plural_sign: wordData.plural_sign || null,
          article: wordData.article || null,
          female_form: wordData.female_form || null,
          meaning: wordData.meaning || null,
          more_info: wordData.more_info || null
        }
      );

      // Get the created word
      const wordId = result.lastInsertRowid || result.lastInsertRowId || (result.rows && result.rows[0] && result.rows[0].id);
      
      return await this.getWordById(wordId);
    } catch (error) {
      console.error('[WordBase-REPO] Create word error:', error);
      throw error;
    }
  }

  /**
   * Get all words with optional filters
   * @param {Object} filters - Optional filters
   * @param {string} filters.group_alphabet_name - Filter by alphabet group
   * @param {string} filters.type_of_word - Filter by word type
   * @param {string} filters.search - Search term for word field
   * @param {number} filters.limit - Limit results
   * @param {number} filters.offset - Offset for pagination
   * @returns {Promise<Array>} Array of words
   */
  async getAllWords(filters = {}) {
    try {
      // Build WHERE conditions
      const conditions = [];
      const params = {};

      if (filters.groupAlphabetName || filters.group_alphabet_name) {
        conditions.push(`group_alphabet_name = ?`);
        params.group_alphabet_name = filters.groupAlphabetName || filters.group_alphabet_name;
      }

      if (filters.type_of_word) {
        conditions.push(`type_of_word = ?`);
        params.type_of_word = filters.type_of_word;
      }

      if (filters.search) {
        conditions.push(`word LIKE ?`);
        params.search = `%${filters.search}%`;
      }

      // Build SQL query
      let sql = `SELECT * FROM word_base`;
      if (conditions.length > 0) {
        sql += ` WHERE ${conditions.join(' AND ')}`;
      }
      sql += ` ORDER BY word ASC`;

      if (filters.limit) {
        sql += ` LIMIT ?`;
        params.limit = filters.limit;
      }

      if (filters.offset) {
        sql += ` OFFSET ?`;
        params.offset = filters.offset;
      }

      const words = await this.db.query(sql, params);

      return (words || []).map(word => ({
        id: word.id,
        word: word.word,
        translate: word.translate,
        sample_sentence: word.sample_sentence,
        groupAlphabetName: word.group_alphabet_name,
        type_of_word: word.type_of_word,
        plural_sign: word.plural_sign,
        article: word.article,
        female_form: word.female_form,
        meaning: word.meaning,
        more_info: word.more_info,
        created_at: word.created_at,
        updated_at: word.updated_at
      }));
    } catch (error) {
      console.error('[WordBase-REPO] Get all words error:', error);
      throw error;
    }
  }

  /**
   * Get a word by ID
   * @param {number} wordId - Word ID
   * @returns {Promise<Object|null>} Word or null if not found
   */
  async getWordById(wordId) {
    try {
      const word = await this.db.queryOne(
        `SELECT * FROM word_base WHERE id = ?`,
        { id: wordId }
      );

      if (!word) {
        return null;
      }

      return {
        id: word.id,
        word: word.word,
        translate: word.translate,
        sample_sentence: word.sample_sentence,
        groupAlphabetName: word.group_alphabet_name,
        type_of_word: word.type_of_word,
        plural_sign: word.plural_sign,
        article: word.article,
        female_form: word.female_form,
        meaning: word.meaning,
        more_info: word.more_info,
        created_at: word.created_at,
        updated_at: word.updated_at
      };
    } catch (error) {
      console.error('[WordBase-REPO] Get word by ID error:', error);
      throw error;
    }
  }

  /**
   * Get words by alphabet group
   * @param {string} groupAlphabetName - Alphabet group name
   * @returns {Promise<Array>} Array of words
   */
  async getWordsByGroup(groupAlphabetName) {
    try {
      const words = await this.db.query(
        `SELECT * FROM word_base 
         WHERE group_alphabet_name = ? 
         ORDER BY word ASC`,
        { group_alphabet_name: groupAlphabetName }
      );

      return (words || []).map(word => ({
        id: word.id,
        word: word.word,
        translate: word.translate,
        sample_sentence: word.sample_sentence,
        groupAlphabetName: word.group_alphabet_name,
        type_of_word: word.type_of_word,
        plural_sign: word.plural_sign,
        article: word.article,
        female_form: word.female_form,
        meaning: word.meaning,
        more_info: word.more_info,
        created_at: word.created_at,
        updated_at: word.updated_at
      }));
    } catch (error) {
      console.error('[WordBase-REPO] Get words by group error:', error);
      throw error;
    }
  }

  /**
   * Get words by type
   * @param {string} typeOfWord - Type of word
   * @returns {Promise<Array>} Array of words
   */
  async getWordsByType(typeOfWord) {
    try {
      const words = await this.db.query(
        `SELECT * FROM word_base 
         WHERE type_of_word = ? 
         ORDER BY word ASC`,
        { type_of_word: typeOfWord }
      );

      return (words || []).map(word => ({
        id: word.id,
        word: word.word,
        translate: word.translate,
        sample_sentence: word.sample_sentence,
        groupAlphabetName: word.group_alphabet_name,
        type_of_word: word.type_of_word,
        plural_sign: word.plural_sign,
        article: word.article,
        female_form: word.female_form,
        meaning: word.meaning,
        more_info: word.more_info,
        created_at: word.created_at,
        updated_at: word.updated_at
      }));
    } catch (error) {
      console.error('[WordBase-REPO] Get words by type error:', error);
      throw error;
    }
  }

  /**
   * Search words by word text
   * @param {string} searchTerm - Search term
   * @returns {Promise<Array>} Array of matching words
   */
  async searchWords(searchTerm) {
    try {
      const words = await this.db.query(
        `SELECT * FROM word_base 
         WHERE word LIKE ? 
         ORDER BY word ASC`,
        { search: `%${searchTerm}%` }
      );

      return (words || []).map(word => ({
        id: word.id,
        word: word.word,
        translate: word.translate,
        sample_sentence: word.sample_sentence,
        groupAlphabetName: word.group_alphabet_name,
        type_of_word: word.type_of_word,
        plural_sign: word.plural_sign,
        article: word.article,
        female_form: word.female_form,
        meaning: word.meaning,
        more_info: word.more_info,
        created_at: word.created_at,
        updated_at: word.updated_at
      }));
    } catch (error) {
      console.error('[WordBase-REPO] Search words error:', error);
      throw error;
    }
  }

  /**
   * Update a word
   * @param {number} wordId - Word ID
   * @param {Object} wordData - Updated word data
   * @returns {Promise<boolean>} True if updated successfully
   */
  async updateWord(wordId, wordData) {
    try {
      const result = await this.db.execute(
        `UPDATE word_base SET 
          word = ?, translate = ?, sample_sentence = ?, group_alphabet_name = ?,
          type_of_word = ?, plural_sign = ?, article = ?, female_form = ?,
          meaning = ?, more_info = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`,
        {
          word: wordData.word,
          translate: wordData.translate !== undefined ? wordData.translate : null,
          sample_sentence: wordData.sample_sentence !== undefined ? wordData.sample_sentence : null,
          group_alphabet_name: wordData.groupAlphabetName,
          type_of_word: wordData.type_of_word,
          plural_sign: wordData.plural_sign !== undefined ? wordData.plural_sign : null,
          article: wordData.article !== undefined ? wordData.article : null,
          female_form: wordData.female_form !== undefined ? wordData.female_form : null,
          meaning: wordData.meaning !== undefined ? wordData.meaning : null,
          more_info: wordData.more_info !== undefined ? wordData.more_info : null,
          id: wordId
        }
      );

      return result.changes > 0;
    } catch (error) {
      console.error('[WordBase-REPO] Update word error:', error);
      throw error;
    }
  }

  /**
   * Delete a word
   * @param {number} wordId - Word ID
   * @returns {Promise<boolean>} True if deleted successfully
   */
  async deleteWord(wordId) {
    try {
      const result = await this.db.execute(
        `DELETE FROM word_base WHERE id = ?`,
        { id: wordId }
      );

      return result.changes > 0;
    } catch (error) {
      console.error('[WordBase-REPO] Delete word error:', error);
      throw error;
    }
  }

  /**
   * Bulk insert words
   * @param {Array<Object>} wordsArray - Array of word objects
   * @returns {Promise<number>} Number of inserted words
   */
  async bulkInsertWords(wordsArray) {
    if (!wordsArray || wordsArray.length === 0) {
      return 0;
    }

    let insertedCount = 0;
    const errors = [];

    // Insert words individually, but continue on errors
    for (const wordData of wordsArray) {
      try {
        await this.createWord(wordData);
        insertedCount++;
      } catch (error) {
        // Log error but continue with next word
        errors.push({
          word: wordData.word,
          error: error.message
        });
        // Continue with next word instead of failing entire batch
      }
    }

    // Log errors if any
    if (errors.length > 0) {
      console.warn(`[WordBase-REPO] ${errors.length} words failed to insert out of ${wordsArray.length}`);
      if (errors.length <= 5) {
        errors.forEach(err => {
          console.warn(`  - "${err.word}": ${err.error}`);
        });
      }
    }

    return insertedCount;
  }
}

module.exports = WordBaseRepository;

