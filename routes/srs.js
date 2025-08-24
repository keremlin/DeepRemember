const express = require('express');
const { FSRS } = require('ts-fsrs');

const router = express.Router();

// Initialize FSRS instance
const fsrs = new FSRS();

// Store for user cards (in production, this should be a database)
const userCards = new Map();

// Initialize sample data for user123
const initializeSampleData = () => {
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
  
  userCards.set('user123', sampleCards);
  console.log('[SRS] Sample data initialized for user123');
};

// Initialize sample data on startup
initializeSampleData();

// Create a new card for learning
router.post('/create-card', (req, res) => {
  try {
    const { userId, word, translation, context } = req.body;
    
    if (!userId || !word) {
      return res.status(400).json({ error: 'userId and word are required' });
    }

    // Create a new card with basic FSRS structure
    const cardData = {
      id: `card_${Date.now()}`,
      word,
      translation: translation || '',
      context: context || '',
      state: 0, // Learning state
      due: new Date().toISOString(),
      stability: 0,
      difficulty: 0,
      elapsed_days: 0,
      scheduled_days: 0,
      reps: 0,
      lapses: 0,
      created: new Date().toISOString()
    };

    // Initialize user cards if not exists
    if (!userCards.has(userId)) {
      userCards.set(userId, []);
    }
    
    userCards.get(userId).push(cardData);
    
    res.json({
      success: true,
      card: cardData,
      message: 'Card created successfully'
    });
  } catch (error) {
    console.error('[SRS] Create card error:', error);
    res.status(500).json({ error: 'Failed to create card' });
  }
});

// Get cards for review
router.get('/review-cards/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const now = new Date();
    
    if (!userCards.has(userId)) {
      return res.json({ cards: [] });
    }
    
    const cards = userCards.get(userId);
    const dueCards = cards.filter(card => {
      const dueDate = new Date(card.due);
      return dueDate <= now;
    });
    
    res.json({
      success: true,
      cards: dueCards,
      total: cards.length,
      due: dueCards.length
    });
  } catch (error) {
    console.error('[SRS] Get review cards error:', error);
    res.status(500).json({ error: 'Failed to get review cards' });
  }
});

// Answer a card (rate the difficulty)
router.post('/answer-card', (req, res) => {
  try {
    const { userId, cardId, rating } = req.body;
    
    if (!userId || !cardId || rating === undefined) {
      return res.status(400).json({ error: 'userId, cardId, and rating are required' });
    }
    
    if (!userCards.has(userId)) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const cards = userCards.get(userId);
    const cardIndex = cards.findIndex(card => card.id === cardId);
    
    if (cardIndex === -1) {
      return res.status(404).json({ error: 'Card not found' });
    }
    
    const card = cards[cardIndex];
    
    // Simple SRS algorithm implementation
    const now = new Date();
    const currentTime = now.getTime();
    const dueTime = new Date(card.due).getTime();
    const elapsedDays = Math.max(0, (currentTime - dueTime) / (1000 * 60 * 60 * 24));
    
    // Update card based on rating (1-5 scale)
    let newState = card.state;
    let newStability = card.stability;
    let newDifficulty = card.difficulty;
    let newDue = new Date();
    
    if (rating <= 2) {
      // Again or Hard - back to learning
      newState = 0;
      newStability = Math.max(0, card.stability * 0.8);
      newDue = new Date(currentTime + 5 * 60 * 1000); // 5 minutes
    } else if (rating === 3) {
      // Good
      if (card.state === 0) {
        newState = 1; // Move to review
        newStability = 1.5;
        newDue = new Date(currentTime + 24 * 60 * 60 * 1000); // 1 day
      } else {
        newStability = card.stability * 1.2;
        newDue = new Date(currentTime + card.stability * 24 * 60 * 60 * 1000);
      }
    } else {
      // Easy or Perfect
      newStability = card.stability * 1.5;
      newDue = new Date(currentTime + card.stability * 24 * 60 * 60 * 1000);
    }
    
    // Update card data
    cards[cardIndex] = {
      ...card,
      state: newState,
      due: newDue.toISOString(),
      stability: Math.max(0.1, newStability),
      difficulty: Math.max(0.1, Math.min(1.0, card.difficulty + (rating - 3) * 0.1)),
      elapsed_days: elapsedDays,
      scheduled_days: Math.max(0, (newDue.getTime() - currentTime) / (1000 * 60 * 60 * 24)),
      reps: card.reps + 1,
      lapses: card.lapses + (rating <= 2 ? 1 : 0),
      lastReviewed: new Date().toISOString()
    };
    
    res.json({
      success: true,
      card: cards[cardIndex],
      result: {
        state: cards[cardIndex].state,
        due: cards[cardIndex].due,
        rating: rating
      },
      message: 'Card answered successfully'
    });
  } catch (error) {
    console.error('[SRS] Answer card error:', error);
    res.status(500).json({ error: 'Failed to answer card' });
  }
});

// Get user statistics
router.get('/stats/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    
    if (!userCards.has(userId)) {
      return res.json({
        totalCards: 0,
        dueCards: 0,
        learningCards: 0,
        reviewCards: 0,
        relearningCards: 0
      });
    }
    
    const cards = userCards.get(userId);
    const now = new Date();
    
    const stats = {
      totalCards: cards.length,
      dueCards: cards.filter(card => new Date(card.due) <= now).length,
      learningCards: cards.filter(card => card.state === 0).length,
      reviewCards: cards.filter(card => card.state === 1).length,
      relearningCards: cards.filter(card => card.state === 2).length
    };
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('[SRS] Get stats error:', error);
    res.status(500).json({ error: 'Failed to get statistics' });
  }
});

// Delete a card
router.delete('/delete-card/:userId/:cardId', (req, res) => {
  try {
    const { userId, cardId } = req.params;
    
    if (!userCards.has(userId)) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const cards = userCards.get(userId);
    const cardIndex = cards.findIndex(card => card.id === cardId);
    
    if (cardIndex === -1) {
      return res.status(404).json({ error: 'Card not found' });
    }
    
    cards.splice(cardIndex, 1);
    
    res.json({
      success: true,
      message: 'Card deleted successfully'
    });
  } catch (error) {
    console.error('[SRS] Delete card error:', error);
    res.status(500).json({ error: 'Failed to delete card' });
  }
});

// Get all cards in memory (for debugging/logging)
router.get('/debug/all-cards', (req, res) => {
  try {
    const allCards = {};
    const now = new Date();
    
    // Convert Map to object for JSON serialization
    userCards.forEach((cards, userId) => {
      allCards[userId] = cards.map(card => ({
        ...card,
        isDue: new Date(card.due) <= now,
        daysUntilDue: Math.ceil((new Date(card.due).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      }));
    });
    
    // Log to console for debugging
    console.log('\n=== SRS MEMORY DEBUG LOG ===');
    console.log(`Total users: ${userCards.size}`);
    
    userCards.forEach((cards, userId) => {
      console.log(`\n📚 User: ${userId}`);
      console.log(`   Total cards: ${cards.length}`);
      
      const dueCards = cards.filter(card => new Date(card.due) <= now);
      const learningCards = cards.filter(card => card.state === 0);
      const reviewCards = cards.filter(card => card.state === 1);
      const relearningCards = cards.filter(card => card.state === 2);
      
      console.log(`   Due cards: ${dueCards.length}`);
      console.log(`   Learning: ${learningCards.length}`);
      console.log(`   Review: ${reviewCards.length}`);
      console.log(`   Relearning: ${relearningCards.length}`);
      
      cards.forEach((card, index) => {
        const dueDate = new Date(card.due);
        const isDue = dueDate <= now;
        const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        
        console.log(`   ${index + 1}. ${card.word} → ${card.translation}`);
        console.log(`      State: ${card.state === 0 ? 'Learning' : card.state === 1 ? 'Review' : 'Relearning'}`);
        console.log(`      Due: ${dueDate.toLocaleString()} ${isDue ? '(DUE NOW)' : `(${daysUntilDue} days)`}`);
        console.log(`      Stability: ${card.stability.toFixed(2)}, Difficulty: ${card.difficulty.toFixed(2)}`);
        console.log(`      Reps: ${card.reps}, Lapses: ${card.lapses}`);
        console.log(`      Created: ${new Date(card.created).toLocaleDateString()}`);
      });
    });
    
    console.log('=== END SRS DEBUG LOG ===\n');
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      totalUsers: userCards.size,
      allCards: allCards
    });
  } catch (error) {
    console.error('[SRS] Debug all cards error:', error);
    res.status(500).json({ error: 'Failed to get debug information' });
  }
});

// Simple log endpoint (JSON format)
router.get('/debug/log', (req, res) => {
  try {
    const now = new Date();
    const logData = {
      timestamp: now.toISOString(),
      totalUsers: userCards.size,
      users: {}
    };
    
    userCards.forEach((cards, userId) => {
      const dueCards = cards.filter(card => new Date(card.due) <= now);
      const learningCards = cards.filter(card => card.state === 0);
      const reviewCards = cards.filter(card => card.state === 1);
      const relearningCards = cards.filter(card => card.state === 2);
      
      logData.users[userId] = {
        totalCards: cards.length,
        dueCards: dueCards.length,
        learningCards: learningCards.length,
        reviewCards: reviewCards.length,
        relearningCards: relearningCards.length,
        cards: cards.map((card, index) => {
          const dueDate = new Date(card.due);
          const isDue = dueDate <= now;
          const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          
          return {
            index: index + 1,
            id: card.id,
            word: card.word,
            translation: card.translation,
            context: card.context,
            state: card.state,
            stateName: card.state === 0 ? 'Learning' : card.state === 1 ? 'Review' : 'Relearning',
            due: card.due,
            dueDate: dueDate.toISOString(),
            isDue: isDue,
            daysUntilDue: daysUntilDue,
            stability: card.stability,
            difficulty: card.difficulty,
            reps: card.reps,
            lapses: card.lapses,
            created: card.created,
            createdDate: new Date(card.created).toISOString()
          };
        })
      };
    });
    
    res.json({
      success: true,
      log: logData
    });
  } catch (error) {
    console.error('[SRS] Log error:', error);
    res.status(500).json({ error: 'Failed to generate log' });
  }
});

module.exports = router;
