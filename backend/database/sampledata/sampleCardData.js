/**
 * Sample Card Data for DeepRemember Learning System
 * This file contains sample vocabulary cards for demonstration purposes
 */

/**
 * Get sample cards for a specific user
 * @param {string} userId - The user ID
 * @returns {Array} Array of sample card objects
 */
function getSampleCards(userId = 'user123') {
  const sampleCards = [
    {
      id: 'card_001',
      word: 'hello',
      translation: 'hola',
      context: 'Hello, how are you today?',
      state: 0,
      due: new Date().toISOString(),
      stability: 0,
      difficulty: 0,
      elapsed_days: 0,
      scheduled_days: 0,
      reps: 0,
      lapses: 0,
      created: new Date(Date.now() - 86400000).toISOString() // 1 day ago
    },
    {
      id: 'card_002',
      word: 'world',
      translation: 'mundo',
      context: 'The world is beautiful.',
      state: 1,
      due: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago (due for review)
      stability: 1.5,
      difficulty: 0.3,
      elapsed_days: 1,
      scheduled_days: 1,
      reps: 2,
      lapses: 0,
      created: new Date(Date.now() - 172800000).toISOString() // 2 days ago
    },
    {
      id: 'card_003',
      word: 'computer',
      translation: 'computadora',
      context: 'I work on my computer every day.',
      state: 1,
      due: new Date(Date.now() + 86400000).toISOString(), // 1 day from now
      stability: 2.5,
      difficulty: 0.2,
      elapsed_days: 3,
      scheduled_days: 3,
      reps: 5,
      lapses: 1,
      created: new Date(Date.now() - 259200000).toISOString() // 3 days ago
    },
    {
      id: 'card_004',
      word: 'language',
      translation: 'idioma',
      context: 'Learning a new language is fun.',
      state: 0,
      due: new Date().toISOString(),
      stability: 0,
      difficulty: 0,
      elapsed_days: 0,
      scheduled_days: 0,
      reps: 0,
      lapses: 0,
      created: new Date().toISOString()
    },
    {
      id: 'card_005',
      word: 'study',
      translation: 'estudiar',
      context: 'I study English every evening.',
      state: 1,
      due: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago (due for review)
      stability: 1.8,
      difficulty: 0.4,
      elapsed_days: 2,
      scheduled_days: 2,
      reps: 3,
      lapses: 0,
      created: new Date(Date.now() - 345600000).toISOString() // 4 days ago
    }
  ];
  
  return sampleCards;
}

/**
 * Initialize sample data for a user
 * @param {Map} userCards - The user cards map
 * @param {string} userId - The user ID (default: 'user123')
 */
function initializeSampleData(userCards, userId = 'user123') {
  const sampleCards = getSampleCards(userId);
  userCards.set(userId, sampleCards);
  console.log(`[DeepRemember] Sample data initialized for ${userId}`);
}

/**
 * Get sample cards with dynamic dates (useful for testing)
 * @param {string} userId - The user ID
 * @returns {Array} Array of sample card objects with current dates
 */
function getSampleCardsWithCurrentDates(userId = 'user123') {
  const now = Date.now();
  const sampleCards = [
    {
      id: 'card_001',
      word: 'hello',
      translation: 'hola',
      context: 'Hello, how are you today?',
      state: 0,
      due: new Date(now).toISOString(),
      stability: 0,
      difficulty: 0,
      elapsed_days: 0,
      scheduled_days: 0,
      reps: 0,
      lapses: 0,
      created: new Date(now - 86400000).toISOString() // 1 day ago
    },
    {
      id: 'card_002',
      word: 'world',
      translation: 'mundo',
      context: 'The world is beautiful.',
      state: 1,
      due: new Date(now - 3600000).toISOString(), // 1 hour ago (due for review)
      stability: 1.5,
      difficulty: 0.3,
      elapsed_days: 1,
      scheduled_days: 1,
      reps: 2,
      lapses: 0,
      created: new Date(now - 172800000).toISOString() // 2 days ago
    },
    {
      id: 'card_003',
      word: 'computer',
      translation: 'computadora',
      context: 'I work on my computer every day.',
      state: 1,
      due: new Date(now + 86400000).toISOString(), // 1 day from now
      stability: 2.5,
      difficulty: 0.2,
      elapsed_days: 3,
      scheduled_days: 3,
      reps: 5,
      lapses: 1,
      created: new Date(now - 259200000).toISOString() // 3 days ago
    },
    {
      id: 'card_004',
      word: 'language',
      translation: 'idioma',
      context: 'Learning a new language is fun.',
      state: 0,
      due: new Date(now).toISOString(),
      stability: 0,
      difficulty: 0,
      elapsed_days: 0,
      scheduled_days: 0,
      reps: 0,
      lapses: 0,
      created: new Date(now).toISOString()
    },
    {
      id: 'card_005',
      word: 'study',
      translation: 'estudiar',
      context: 'I study English every evening.',
      state: 1,
      due: new Date(now - 7200000).toISOString(), // 2 hours ago (due for review)
      stability: 1.8,
      difficulty: 0.4,
      elapsed_days: 2,
      scheduled_days: 2,
      reps: 3,
      lapses: 0,
      created: new Date(now - 345600000).toISOString() // 4 days ago
    }
  ];
  
  return sampleCards;
}

module.exports = {
  getSampleCards,
  initializeSampleData,
  getSampleCardsWithCurrentDates
};
