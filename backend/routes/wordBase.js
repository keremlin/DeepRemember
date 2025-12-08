const express = require('express');
const databaseFactory = require('../database/access/DatabaseFactory');
const dbConfig = require('../config/database');
const WordBaseRepository = require('../database/access/WordBaseRepository');

const router = express.Router();

let wordBaseRepository = null;
let useDatabase = false;

// Initialize repository
async function initializeRepository() {
  try {
    // Check if database is already initialized, if not initialize it
    let database;
    try {
      database = databaseFactory.getDatabase();
    } catch (error) {
      // Database not initialized yet, initialize it
      await databaseFactory.initialize(dbConfig.type, dbConfig[dbConfig.type]);
      database = databaseFactory.getDatabase();
    }
    
    wordBaseRepository = new WordBaseRepository(database);
    useDatabase = true;
    console.log('[WordBase] Repository initialized successfully');
  } catch (error) {
    console.error('[WordBase] Repository initialization failed:', error);
    useDatabase = false;
  }
}

// Initialize on startup
initializeRepository();

// Get all words with optional filters
// Query params: groupAlphabetName, type_of_word, search, limit, offset
router.get('/', async (req, res) => {
  try {
    if (!useDatabase || !wordBaseRepository) {
      return res.status(503).json({ error: 'Database not available' });
    }

    const filters = {
      groupAlphabetName: req.query.groupAlphabetName || req.query.group_alphabet_name,
      type_of_word: req.query.type_of_word,
      search: req.query.search,
      limit: req.query.limit ? parseInt(req.query.limit) : undefined,
      offset: req.query.offset ? parseInt(req.query.offset) : undefined
    };

    // Remove undefined filters
    Object.keys(filters).forEach(key => filters[key] === undefined && delete filters[key]);

    const words = await wordBaseRepository.getAllWords(filters);

    res.json({ success: true, words, count: words.length });
  } catch (error) {
    console.error('[WordBase] Get words error:', error);
    res.status(500).json({ error: 'Failed to get words' });
  }
});

// Get a single word by ID
router.get('/:id', async (req, res) => {
  try {
    if (!useDatabase || !wordBaseRepository) {
      return res.status(503).json({ error: 'Database not available' });
    }

    const wordId = parseInt(req.params.id);

    if (isNaN(wordId)) {
      return res.status(400).json({ error: 'Invalid word ID' });
    }

    const word = await wordBaseRepository.getWordById(wordId);

    if (!word) {
      return res.status(404).json({ error: 'Word not found' });
    }

    res.json({ success: true, word });
  } catch (error) {
    console.error('[WordBase] Get word error:', error);
    res.status(500).json({ error: 'Failed to get word' });
  }
});

// Get words by alphabet group
router.get('/group/:groupAlphabetName', async (req, res) => {
  try {
    if (!useDatabase || !wordBaseRepository) {
      return res.status(503).json({ error: 'Database not available' });
    }

    const groupAlphabetName = req.params.groupAlphabetName;
    const words = await wordBaseRepository.getWordsByGroup(groupAlphabetName);

    res.json({ success: true, words, count: words.length });
  } catch (error) {
    console.error('[WordBase] Get words by group error:', error);
    res.status(500).json({ error: 'Failed to get words by group' });
  }
});

// Get words by type
router.get('/type/:typeOfWord', async (req, res) => {
  try {
    if (!useDatabase || !wordBaseRepository) {
      return res.status(503).json({ error: 'Database not available' });
    }

    const typeOfWord = req.params.typeOfWord;
    const words = await wordBaseRepository.getWordsByType(typeOfWord);

    res.json({ success: true, words, count: words.length });
  } catch (error) {
    console.error('[WordBase] Get words by type error:', error);
    res.status(500).json({ error: 'Failed to get words by type' });
  }
});

// Search words
router.get('/search/:searchTerm', async (req, res) => {
  try {
    if (!useDatabase || !wordBaseRepository) {
      return res.status(503).json({ error: 'Database not available' });
    }

    const searchTerm = req.params.searchTerm;
    const words = await wordBaseRepository.searchWords(searchTerm);

    res.json({ success: true, words, count: words.length });
  } catch (error) {
    console.error('[WordBase] Search words error:', error);
    res.status(500).json({ error: 'Failed to search words' });
  }
});

// Create a new word
router.post('/', async (req, res) => {
  try {
    if (!useDatabase || !wordBaseRepository) {
      return res.status(503).json({ error: 'Database not available' });
    }

    const { word, translate, sample_sentence, groupAlphabetName, type_of_word, 
            plural_sign, article, female_form, meaning, more_info } = req.body;

    if (!word || !groupAlphabetName || !type_of_word) {
      return res.status(400).json({ 
        error: 'word, groupAlphabetName, and type_of_word are required' 
      });
    }

    const wordData = {
      word,
      translate: translate || null,
      sample_sentence: sample_sentence || null,
      groupAlphabetName,
      type_of_word,
      plural_sign: plural_sign || null,
      article: article || null,
      female_form: female_form || null,
      meaning: meaning || null,
      more_info: more_info || null
    };

    const createdWord = await wordBaseRepository.createWord(wordData);

    res.status(201).json({ success: true, word: createdWord });
  } catch (error) {
    console.error('[WordBase] Create word error:', error);
    res.status(500).json({ error: 'Failed to create word' });
  }
});

// Bulk create words
router.post('/bulk', async (req, res) => {
  try {
    if (!useDatabase || !wordBaseRepository) {
      return res.status(503).json({ error: 'Database not available' });
    }

    const { words } = req.body;

    if (!Array.isArray(words) || words.length === 0) {
      return res.status(400).json({ error: 'words must be a non-empty array' });
    }

    // Validate each word has required fields
    for (const wordData of words) {
      if (!wordData.word || !wordData.groupAlphabetName || !wordData.type_of_word) {
        return res.status(400).json({ 
          error: 'Each word must have word, groupAlphabetName, and type_of_word' 
        });
      }
    }

    const insertedCount = await wordBaseRepository.bulkInsertWords(words);

    res.status(201).json({ success: true, insertedCount, total: words.length });
  } catch (error) {
    console.error('[WordBase] Bulk create words error:', error);
    res.status(500).json({ error: 'Failed to bulk create words' });
  }
});

// Update a word
router.put('/:id', async (req, res) => {
  try {
    if (!useDatabase || !wordBaseRepository) {
      return res.status(503).json({ error: 'Database not available' });
    }

    const wordId = parseInt(req.params.id);

    if (isNaN(wordId)) {
      return res.status(400).json({ error: 'Invalid word ID' });
    }

    // Check if word exists
    const existingWord = await wordBaseRepository.getWordById(wordId);
    if (!existingWord) {
      return res.status(404).json({ error: 'Word not found' });
    }

    const { word, translate, sample_sentence, groupAlphabetName, type_of_word,
            plural_sign, article, female_form, meaning, more_info } = req.body;

    if (!word || !groupAlphabetName || !type_of_word) {
      return res.status(400).json({ 
        error: 'word, groupAlphabetName, and type_of_word are required' 
      });
    }

    const wordData = {
      word,
      translate,
      sample_sentence,
      groupAlphabetName,
      type_of_word,
      plural_sign,
      article,
      female_form,
      meaning,
      more_info
    };

    const success = await wordBaseRepository.updateWord(wordId, wordData);

    if (!success) {
      return res.status(404).json({ error: 'Word not found' });
    }

    const updatedWord = await wordBaseRepository.getWordById(wordId);
    res.json({ success: true, word: updatedWord });
  } catch (error) {
    console.error('[WordBase] Update word error:', error);
    res.status(500).json({ error: 'Failed to update word' });
  }
});

// Delete a word
router.delete('/:id', async (req, res) => {
  try {
    if (!useDatabase || !wordBaseRepository) {
      return res.status(503).json({ error: 'Database not available' });
    }

    const wordId = parseInt(req.params.id);

    if (isNaN(wordId)) {
      return res.status(400).json({ error: 'Invalid word ID' });
    }

    // Check if word exists
    const existingWord = await wordBaseRepository.getWordById(wordId);
    if (!existingWord) {
      return res.status(404).json({ error: 'Word not found' });
    }

    const success = await wordBaseRepository.deleteWord(wordId);

    if (!success) {
      return res.status(404).json({ error: 'Word not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('[WordBase] Delete word error:', error);
    res.status(500).json({ error: 'Failed to delete word' });
  }
});

// Get total word count
router.get('/count/total', async (req, res) => {
  try {
    if (!useDatabase || !wordBaseRepository) {
      return res.status(503).json({ error: 'Database not available' });
    }

    const count = await wordBaseRepository.getWordCount();

    res.json({ success: true, count });
  } catch (error) {
    console.error('[WordBase] Get word count error:', error);
    res.status(500).json({ error: 'Failed to get word count' });
  }
});

module.exports = router;

