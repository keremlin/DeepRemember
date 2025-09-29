const express = require('express');
const { FSRS } = require('ts-fsrs');
const databaseFactory = require('../database/access/DatabaseFactory');
const dbConfig = require('../config/database');

const router = express.Router();

// Initialize FSRS instance
const fsrs = new FSRS();

// Store for user cards (fallback to memory if database fails)
const userCards = new Map();
let srsRepository = null;
let useDatabase = false;

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
      created: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
      labels: [] // Labels will be added when using database
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
      created: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
      labels: []
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
      created: new Date(Date.now() - 259200000).toISOString(), // 3 days ago
      labels: []
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
      created: new Date().toISOString(),
      labels: []
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
      created: new Date(Date.now() - 345600000).toISOString(), // 4 days ago
      labels: []
    }
  ];
  
  userCards.set('user123', sampleCards);
  console.log('[SRS] Sample data initialized for user123');
};

// Initialize database and sample data
async function initializeDatabase() {
  try {
    console.log('[SRS] Initializing database...');
    srsRepository = await databaseFactory.initialize(dbConfig.type, dbConfig[dbConfig.type]);
    useDatabase = true;
    console.log('[SRS] Database initialized successfully');
    
    // Migrate sample data to database
    if (dbConfig.migration.autoMigrate) {
      await srsRepository.migrateFromMemory(userCards);
      console.log('[SRS] Sample data migrated to database');
    }
  } catch (error) {
    console.error('[SRS] Database initialization failed, falling back to memory storage:', error);
    useDatabase = false;
    // Initialize sample data in memory as fallback
    initializeSampleData();
  }
}

// Initialize database and sample data on startup
initializeDatabase();

// Initialize system labels when database is ready
async function initializeSystemLabels() {
  try {
    if (useDatabase && srsRepository) {
      await srsRepository.initializeSystemLabels();
      console.log('[SRS] System labels initialization completed');
    } else {
      console.log('[SRS] System labels initialization skipped (using memory mode)');
    }
  } catch (error) {
    console.error('[SRS] Failed to initialize system labels:', error);
  }
}

// Initialize system labels after database initialization with retry mechanism
async function initializeSystemLabelsWithRetry() {
  let attempts = 0;
  const maxAttempts = 5;
  
  while (attempts < maxAttempts) {
    try {
      if (useDatabase && srsRepository) {
        await srsRepository.initializeSystemLabels();
        console.log('[SRS] System labels initialization completed');
        return;
      } else {
        console.log('[SRS] System labels initialization skipped (using memory mode)');
        return;
      }
    } catch (error) {
      attempts++;
      console.warn(`[SRS] System labels initialization attempt ${attempts} failed:`, error.message);
      
      if (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 2000 * attempts)); // Exponential backoff
      } else {
        console.error('[SRS] Failed to initialize system labels after all attempts');
      }
    }
  }
}

// Initialize system labels after database initialization
setTimeout(initializeSystemLabelsWithRetry, 2000);

// Create a new card for learning
router.post('/create-card', async (req, res) => {
  try {
    const { userId, word, translation, context, labels } = req.body;
    
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

    if (useDatabase && srsRepository) {
      // Use database
      const result = await srsRepository.createCard(userId, cardData);
      
      // Add labels to the card if provided
      if (labels && Array.isArray(labels) && labels.length > 0) {
        for (const labelId of labels) {
          try {
            await srsRepository.addLabelToCard(userId, result.id, labelId);
          } catch (labelError) {
            console.warn(`[SRS] Failed to add label ${labelId} to card ${result.id}:`, labelError);
          }
        }
      }
      
      // Get the card with its labels
      const cardLabels = await srsRepository.getCardLabels(userId, result.id);
      
      res.json({
        success: true,
        card: { ...result, labels: cardLabels },
        message: 'Card created successfully in database'
      });
    } else {
      // Use memory storage
      if (!userCards.has(userId)) {
        userCards.set(userId, []);
      }
      userCards.get(userId).push(cardData);
      
      res.json({
        success: true,
        card: { ...cardData, labels: [] },
        message: 'Card created successfully in memory'
      });
    }
  } catch (error) {
    console.error('[SRS] Create card error:', error);
    res.status(500).json({ error: 'Failed to create card' });
  }
});

// Get cards for review
router.get('/review-cards/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (useDatabase && srsRepository) {
      // Use database
      const cards = await srsRepository.getDueCards(userId);
      const allCards = await srsRepository.getUserCards(userId);
      
      res.json({
        success: true,
        cards: cards,
        total: allCards.length,
        due: cards.length
      });
    } else {
      // Use memory storage
      if (!userCards.has(userId)) {
        return res.json({ cards: [] });
      }
      
      const cards = userCards.get(userId);
      const now = new Date();
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
    }
  } catch (error) {
    console.error('[SRS] Get review cards error:', error);
    res.status(500).json({ error: 'Failed to get review cards' });
  }
});

// Answer a card (rate the difficulty)
router.post('/answer-card', async (req, res) => {
  try {
    const { userId, cardId, rating } = req.body;
    
    if (!userId || !cardId || rating === undefined) {
      return res.status(400).json({ error: 'userId, cardId, and rating are required' });
    }

    // Simple SRS algorithm implementation
    const now = new Date();
    const currentTime = now.getTime();
    
    if (useDatabase && srsRepository) {
      // Use database
      const allCards = await srsRepository.getUserCards(userId);
      const card = allCards.find(c => c.id === cardId);
      
      if (!card) {
        return res.status(404).json({ error: 'Card not found' });
      }
      
      const dueTime = new Date(card.due).getTime();
      const elapsedDays = Math.max(0, (currentTime - dueTime) / (1000 * 60 * 60 * 24));
      
      // Update card based on rating (1-5 scale)
      let newState = card.state;
      let newStability = card.stability;
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
      
      const updatedCard = {
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
      
      await srsRepository.updateCard(userId, cardId, updatedCard);
      
      res.json({
        success: true,
        card: updatedCard,
        result: {
          state: updatedCard.state,
          due: updatedCard.due,
          rating: rating
        },
        message: 'Card answered successfully in database'
      });
    } else {
      // Use memory storage
      if (!userCards.has(userId)) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      const cards = userCards.get(userId);
      const cardIndex = cards.findIndex(card => card.id === cardId);
      
      if (cardIndex === -1) {
        return res.status(404).json({ error: 'Card not found' });
      }
      
      const card = cards[cardIndex];
      const dueTime = new Date(card.due).getTime();
      const elapsedDays = Math.max(0, (currentTime - dueTime) / (1000 * 60 * 60 * 24));
      
      // Update card based on rating (1-5 scale)
      let newState = card.state;
      let newStability = card.stability;
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
        message: 'Card answered successfully in memory'
      });
    }
  } catch (error) {
    console.error('[SRS] Answer card error:', error);
    res.status(500).json({ error: 'Failed to answer card' });
  }
});

// Get user statistics
router.get('/stats/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (useDatabase && srsRepository) {
      // Use database
      const stats = await srsRepository.getUserStats(userId);
      res.json({
        success: true,
        stats
      });
    } else {
      // Use memory storage
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
    }
  } catch (error) {
    console.error('[SRS] Get stats error:', error);
    res.status(500).json({ error: 'Failed to get statistics' });
  }
});

// Delete a card
router.delete('/delete-card/:userId/:cardId', async (req, res) => {
  try {
    const { userId, cardId } = req.params;
    
    if (useDatabase && srsRepository) {
      // Use database
      const success = await srsRepository.deleteCard(userId, cardId);
      if (!success) {
        return res.status(404).json({ error: 'Card not found' });
      }
      
      res.json({
        success: true,
        message: 'Card deleted successfully from database'
      });
    } else {
      // Use memory storage
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
        message: 'Card deleted successfully from memory'
      });
    }
  } catch (error) {
    console.error('[SRS] Delete card error:', error);
    res.status(500).json({ error: 'Failed to delete card' });
  }
});

// Get all cards in memory (for debugging/logging)
router.get('/debug/all-cards', async (req, res) => {
  try {
    if (useDatabase && srsRepository) {
      // Use database
      const allUsers = await srsRepository.getAllUsers();
      const allCards = {};
      
      for (const user of allUsers) {
        const cards = await srsRepository.getUserCards(user.user_id);
        allCards[user.user_id] = cards;
      }
      
      res.json({
        success: true,
        timestamp: new Date().toISOString(),
        totalUsers: allUsers.length,
        allCards: allCards,
        storage: 'database'
      });
    } else {
      // Use memory storage
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
      
      res.json({
        success: true,
        timestamp: new Date().toISOString(),
        totalUsers: userCards.size,
        allCards: allCards,
        storage: 'memory'
      });
    }
  } catch (error) {
    console.error('[SRS] Debug all cards error:', error);
    res.status(500).json({ error: 'Failed to get debug information' });
  }
});

// Simple log endpoint (JSON format)
router.get('/debug/log', async (req, res) => {
  try {
    const now = new Date();
    
    if (useDatabase && srsRepository) {
      // Use database
      const allUsers = await srsRepository.getAllUsers();
      const logData = {
        timestamp: now.toISOString(),
        totalUsers: allUsers.length,
        storage: 'database',
        users: {}
      };
      
      for (const user of allUsers) {
        const cards = await srsRepository.getUserCards(user.user_id);
        const stats = await srsRepository.getUserStats(user.user_id);
        
        logData.users[user.user_id] = {
          ...stats,
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
      }
      
      res.json({
        success: true,
        log: logData
      });
    } else {
      // Use memory storage
      const logData = {
        timestamp: now.toISOString(),
        totalUsers: userCards.size,
        storage: 'memory',
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
    }
  } catch (error) {
    console.error('[SRS] Log error:', error);
    res.status(500).json({ error: 'Failed to generate log' });
  }
});

// ==================== LABEL MANAGEMENT ENDPOINTS ====================

// Get all labels for a user (system + user labels)
router.get('/labels/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    if (useDatabase && srsRepository) {
      const labels = await srsRepository.getUserLabels(userId);
      res.json({
        success: true,
        labels
      });
    } else {
      // Memory fallback - return empty array for now
      res.json({
        success: true,
        labels: []
      });
    }
  } catch (error) {
    console.error('[SRS] Get labels error:', error);
    res.status(500).json({ error: 'Failed to get labels' });
  }
});

// Get system labels only
router.get('/labels/system', async (req, res) => {
  try {
    if (useDatabase && srsRepository) {
      const labels = await srsRepository.getSystemLabels();
      res.json({
        success: true,
        labels
      });
    } else {
      // Memory fallback - return basic system labels
      res.json({
        success: true,
        labels: [
          { id: 'sys_word', name: 'word', type: 'system', color: '#3B82F6', description: 'Cards created from individual words' },
          { id: 'sys_sentence', name: 'sentence', type: 'system', color: '#10B981', description: 'Cards created from sentences' }
        ]
      });
    }
  } catch (error) {
    console.error('[SRS] Get system labels error:', error);
    res.status(500).json({ error: 'Failed to get system labels' });
  }
});

// Check system labels status (for debugging)
router.get('/labels/system/status', async (req, res) => {
  try {
    if (useDatabase && srsRepository) {
      const status = await srsRepository.checkSystemLabelsExist();
      const labels = await srsRepository.getSystemLabels();
      
      res.json({
        success: true,
        status,
        labels,
        message: status.allExist ? 'All system labels exist' : 'Some system labels are missing'
      });
    } else {
      res.json({
        success: true,
        status: { word: true, sentence: true, allExist: true },
        labels: [
          { id: 'sys_word', name: 'word', type: 'system', color: '#3B82F6', description: 'Cards created from individual words' },
          { id: 'sys_sentence', name: 'sentence', type: 'system', color: '#10B981', description: 'Cards created from sentences' }
        ],
        message: 'Using memory mode - system labels available'
      });
    }
  } catch (error) {
    console.error('[SRS] Get system labels status error:', error);
    res.status(500).json({ error: 'Failed to get system labels status' });
  }
});

// Create a new user label
router.post('/labels/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { name, color, description } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Label name is required' });
    }

    if (useDatabase && srsRepository) {
      const label = await srsRepository.createLabel(userId, {
        name,
        type: 'user',
        color: color || '#3B82F6',
        description: description || ''
      });
      
      res.json({
        success: true,
        label,
        message: 'Label created successfully'
      });
    } else {
      // Memory fallback - not implemented for labels
      res.status(503).json({ error: 'Label management not available in memory mode' });
    }
  } catch (error) {
    console.error('[SRS] Create label error:', error);
    res.status(500).json({ error: 'Failed to create label' });
  }
});

// Update a user label
router.put('/labels/:userId/:labelId', async (req, res) => {
  try {
    const { userId, labelId } = req.params;
    const { name, color, description } = req.body;
    
    if (useDatabase && srsRepository) {
      const success = await srsRepository.updateLabel(labelId, {
        name,
        color,
        description
      });
      
      if (!success) {
        return res.status(404).json({ error: 'Label not found or not editable' });
      }
      
      res.json({
        success: true,
        message: 'Label updated successfully'
      });
    } else {
      res.status(503).json({ error: 'Label management not available in memory mode' });
    }
  } catch (error) {
    console.error('[SRS] Update label error:', error);
    res.status(500).json({ error: 'Failed to update label' });
  }
});

// Delete a user label
router.delete('/labels/:userId/:labelId', async (req, res) => {
  try {
    const { userId, labelId } = req.params;
    
    if (useDatabase && srsRepository) {
      const success = await srsRepository.deleteLabel(userId, labelId);
      
      if (!success) {
        return res.status(404).json({ error: 'Label not found or not deletable' });
      }
      
      res.json({
        success: true,
        message: 'Label deleted successfully'
      });
    } else {
      res.status(503).json({ error: 'Label management not available in memory mode' });
    }
  } catch (error) {
    console.error('[SRS] Delete label error:', error);
    res.status(500).json({ error: 'Failed to delete label' });
  }
});

// Add a label to a card
router.post('/cards/:userId/:cardId/labels', async (req, res) => {
  try {
    const { userId, cardId } = req.params;
    const { labelId } = req.body;
    
    if (!labelId) {
      return res.status(400).json({ error: 'labelId is required' });
    }

    if (useDatabase && srsRepository) {
      const success = await srsRepository.addLabelToCard(userId, cardId, labelId);
      
      if (!success) {
        return res.status(400).json({ error: 'Failed to add label to card' });
      }
      
      res.json({
        success: true,
        message: 'Label added to card successfully'
      });
    } else {
      res.status(503).json({ error: 'Label management not available in memory mode' });
    }
  } catch (error) {
    console.error('[SRS] Add label to card error:', error);
    res.status(500).json({ error: 'Failed to add label to card' });
  }
});

// Remove a label from a card
router.delete('/cards/:userId/:cardId/labels/:labelId', async (req, res) => {
  try {
    const { userId, cardId, labelId } = req.params;
    
    if (useDatabase && srsRepository) {
      const success = await srsRepository.removeLabelFromCard(userId, cardId, labelId);
      
      if (!success) {
        return res.status(404).json({ error: 'Label not found on card' });
      }
      
      res.json({
        success: true,
        message: 'Label removed from card successfully'
      });
    } else {
      res.status(503).json({ error: 'Label management not available in memory mode' });
    }
  } catch (error) {
    console.error('[SRS] Remove label from card error:', error);
    res.status(500).json({ error: 'Failed to remove label from card' });
  }
});

// Get labels for a specific card
router.get('/cards/:userId/:cardId/labels', async (req, res) => {
  try {
    const { userId, cardId } = req.params;
    
    if (useDatabase && srsRepository) {
      const labels = await srsRepository.getCardLabels(userId, cardId);
      
      res.json({
        success: true,
        labels
      });
    } else {
      res.json({
        success: true,
        labels: []
      });
    }
  } catch (error) {
    console.error('[SRS] Get card labels error:', error);
    res.status(500).json({ error: 'Failed to get card labels' });
  }
});

// Get cards filtered by label
router.get('/cards/:userId/label/:labelId', async (req, res) => {
  try {
    const { userId, labelId } = req.params;
    
    if (useDatabase && srsRepository) {
      const cards = await srsRepository.getCardsByLabel(userId, labelId);
      
      res.json({
        success: true,
        cards
      });
    } else {
      res.json({
        success: true,
        cards: []
      });
    }
  } catch (error) {
    console.error('[SRS] Get cards by label error:', error);
    res.status(500).json({ error: 'Failed to get cards by label' });
  }
});

// Get due cards filtered by label
router.get('/review-cards/:userId/label/:labelId', async (req, res) => {
  try {
    const { userId, labelId } = req.params;
    
    if (useDatabase && srsRepository) {
      const cards = await srsRepository.getDueCardsByLabel(userId, labelId);
      
      res.json({
        success: true,
        cards
      });
    } else {
      res.json({
        success: true,
        cards: []
      });
    }
  } catch (error) {
    console.error('[SRS] Get due cards by label error:', error);
    res.status(500).json({ error: 'Failed to get due cards by label' });
  }
});

module.exports = router;
