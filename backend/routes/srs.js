const express = require('express');
const databaseFactory = require('../database/access/DatabaseFactory');
const dbConfig = require('../config/database');
const AuthMiddleware = require('../security/authMiddleware');

const router = express.Router();
const authMiddleware = new AuthMiddleware();

let srsRepository = null;

// Initialize database
async function initializeDatabase() {
  try {
    console.log('[SRS] Initializing database...');
    srsRepository = await databaseFactory.initialize(dbConfig.type, dbConfig[dbConfig.type]);
    console.log('[SRS] Database initialized successfully');
  } catch (error) {
    console.error('[SRS] Database initialization failed:', error);
  }
}

initializeDatabase();

// Initialize system labels with retry after DB is ready
async function initializeSystemLabelsWithRetry() {
  let attempts = 0;
  const maxAttempts = 5;

  while (attempts < maxAttempts) {
    try {
      if (srsRepository) {
        await srsRepository.initializeSystemLabels();
        console.log('[SRS] System labels initialization completed');
        return;
      } else {
        console.log('[SRS] System labels initialization skipped (database not ready)');
        return;
      }
    } catch (error) {
      attempts++;
      console.warn(`[SRS] System labels initialization attempt ${attempts} failed:`, error.message);
      if (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 2000 * attempts));
      } else {
        console.error('[SRS] Failed to initialize system labels after all attempts');
      }
    }
  }
}

setTimeout(initializeSystemLabelsWithRetry, 2000);

// Create a new card for learning
router.post('/create-card', authMiddleware.verifyToken, async (req, res) => {
  try {
    if (!srsRepository) return res.status(503).json({ error: 'Database not initialized' });

    const { userId, word, translation, context, labels } = req.body;

    if (!userId || !word) {
      return res.status(400).json({ error: 'userId and word are required' });
    }

    const cardData = {
      id: `card_${Date.now()}`,
      word,
      translation: translation || '',
      context: context || '',
      state: 0,
      due: new Date().toISOString(),
      stability: 0,
      difficulty: 0,
      elapsed_days: 0,
      scheduled_days: 0,
      reps: 0,
      lapses: 0,
      created: new Date().toISOString()
    };

    const result = await srsRepository.createCard(userId, cardData);

    if (labels && Array.isArray(labels) && labels.length > 0) {
      for (const labelId of labels) {
        try {
          await srsRepository.addLabelToCard(userId, result.id, labelId);
        } catch (labelError) {
          console.warn(`[SRS] Failed to add label ${labelId} to card ${result.id}:`, labelError);
        }
      }
    }

    const cardLabels = await srsRepository.getCardLabels(userId, result.id);

    res.json({
      success: true,
      card: { ...result, labels: cardLabels },
      message: 'Card created successfully'
    });
  } catch (error) {
    console.error('[SRS] Create card error:', error);
    res.status(500).json({ error: 'Failed to create card' });
  }
});

// Get cards for review
router.get('/review-cards/:userId', authMiddleware.verifyToken, async (req, res) => {
  try {
    if (!srsRepository) return res.status(503).json({ error: 'Database not initialized' });

    const { userId } = req.params;

    const cards = await srsRepository.getDueCards(userId);
    const allCards = await srsRepository.getUserCards(userId);

    res.json({
      success: true,
      cards: cards,
      total: allCards.length,
      due: cards.length
    });
  } catch (error) {
    console.error('[SRS] Get review cards error:', error);
    res.status(500).json({ error: 'Failed to get review cards' });
  }
});

// Answer a card (rate the difficulty)
router.post('/answer-card', authMiddleware.verifyToken, async (req, res) => {
  try {
    if (!srsRepository) return res.status(503).json({ error: 'Database not initialized' });

    const { userId, cardId, rating } = req.body;

    if (!userId || !cardId || rating === undefined) {
      return res.status(400).json({ error: 'userId, cardId, and rating are required' });
    }

    const updatedCard = await srsRepository.answerCard(userId, cardId, rating);

    if (!updatedCard) {
      return res.status(404).json({ error: 'Card not found' });
    }

    res.json({
      success: true,
      card: updatedCard,
      result: {
        state: updatedCard.state,
        due: updatedCard.due,
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
router.get('/stats/:userId', authMiddleware.verifyToken, async (req, res) => {
  try {
    if (!srsRepository) return res.status(503).json({ error: 'Database not initialized' });

    const { userId } = req.params;
    const stats = await srsRepository.getUserStats(userId);
    res.json({ success: true, stats });
  } catch (error) {
    console.error('[SRS] Get stats error:', error);
    res.status(500).json({ error: 'Failed to get statistics' });
  }
});

// Delete a card
router.delete('/delete-card/:userId/:cardId', authMiddleware.verifyToken, async (req, res) => {
  try {
    if (!srsRepository) return res.status(503).json({ error: 'Database not initialized' });

    const { userId, cardId } = req.params;
    console.log(`[SRS] DELETE request received: userId=${userId}, cardId=${cardId}`);

    const success = await srsRepository.deleteCard(userId, cardId);
    if (!success) {
      return res.status(404).json({ error: 'Card not found' });
    }

    res.json({ success: true, message: 'Card deleted successfully' });
  } catch (error) {
    console.error('[SRS] Delete card error:', error);
    res.status(500).json({ error: 'Failed to delete card' });
  }
});

// Get all cards in memory (for debugging/logging)
router.get('/debug/all-cards', authMiddleware.verifyToken, async (req, res) => {
  try {
    if (!srsRepository) return res.status(503).json({ error: 'Database not initialized' });

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
      allCards: allCards
    });
  } catch (error) {
    console.error('[SRS] Debug all cards error:', error);
    res.status(500).json({ error: 'Failed to get debug information' });
  }
});

// Simple log endpoint (JSON format)
router.get('/debug/log', authMiddleware.verifyToken, async (req, res) => {
  try {
    if (!srsRepository) return res.status(503).json({ error: 'Database not initialized' });

    const now = new Date();
    const allUsers = await srsRepository.getAllUsers();
    const logData = {
      timestamp: now.toISOString(),
      totalUsers: allUsers.length,
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

    res.json({ success: true, log: logData });
  } catch (error) {
    console.error('[SRS] Log error:', error);
    res.status(500).json({ error: 'Failed to generate log' });
  }
});

// ==================== LABEL MANAGEMENT ENDPOINTS ====================

// Get all labels for a user (system + user labels)
router.get('/labels/:userId', authMiddleware.verifyToken, async (req, res) => {
  try {
    if (!srsRepository) return res.status(503).json({ error: 'Database not initialized' });

    const { userId } = req.params;
    const labels = await srsRepository.getUserLabels(userId);
    res.json({ success: true, labels });
  } catch (error) {
    console.error('[SRS] Get labels error:', error);
    res.status(500).json({ error: 'Failed to get labels' });
  }
});

// Get system labels only
router.get('/labels/system', authMiddleware.verifyToken, async (req, res) => {
  try {
    if (!srsRepository) return res.status(503).json({ error: 'Database not initialized' });

    const labels = await srsRepository.getSystemLabels();
    res.json({ success: true, labels });
  } catch (error) {
    console.error('[SRS] Get system labels error:', error);
    res.status(500).json({ error: 'Failed to get system labels' });
  }
});

// Check system labels status (for debugging)
router.get('/labels/system/status', authMiddleware.verifyToken, async (req, res) => {
  try {
    if (!srsRepository) return res.status(503).json({ error: 'Database not initialized' });

    const status = await srsRepository.checkSystemLabelsExist();
    const labels = await srsRepository.getSystemLabels();

    res.json({
      success: true,
      status,
      labels,
      message: status.allExist ? 'All system labels exist' : 'Some system labels are missing'
    });
  } catch (error) {
    console.error('[SRS] Get system labels status error:', error);
    res.status(500).json({ error: 'Failed to get system labels status' });
  }
});

// Create a new user label
router.post('/labels/:userId', authMiddleware.verifyToken, async (req, res) => {
  try {
    if (!srsRepository) return res.status(503).json({ error: 'Database not initialized' });

    const { userId } = req.params;
    const { name, color, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Label name is required' });
    }

    const label = await srsRepository.createLabel(userId, {
      name,
      type: 'user',
      color: color || '#3B82F6',
      description: description || ''
    });

    res.json({ success: true, label, message: 'Label created successfully' });
  } catch (error) {
    console.error('[SRS] Create label error:', error);
    res.status(500).json({ error: 'Failed to create label' });
  }
});

// Update a user label
router.put('/labels/:userId/:labelId', authMiddleware.verifyToken, async (req, res) => {
  try {
    if (!srsRepository) return res.status(503).json({ error: 'Database not initialized' });

    const { labelId } = req.params;
    const { name, color, description } = req.body;

    const success = await srsRepository.updateLabel(labelId, { name, color, description });

    if (!success) {
      return res.status(404).json({ error: 'Label not found or not editable' });
    }

    res.json({ success: true, message: 'Label updated successfully' });
  } catch (error) {
    console.error('[SRS] Update label error:', error);
    res.status(500).json({ error: 'Failed to update label' });
  }
});

// Delete a user label
router.delete('/labels/:userId/:labelId', authMiddleware.verifyToken, async (req, res) => {
  try {
    if (!srsRepository) return res.status(503).json({ error: 'Database not initialized' });

    const { userId, labelId } = req.params;

    const success = await srsRepository.deleteLabel(userId, labelId);

    if (!success) {
      return res.status(404).json({ error: 'Label not found or not deletable' });
    }

    res.json({ success: true, message: 'Label deleted successfully' });
  } catch (error) {
    console.error('[SRS] Delete label error:', error);
    res.status(500).json({ error: 'Failed to delete label' });
  }
});

// Add a label to a card
router.post('/cards/:userId/:cardId/labels', authMiddleware.verifyToken, async (req, res) => {
  try {
    if (!srsRepository) return res.status(503).json({ error: 'Database not initialized' });

    const { userId, cardId } = req.params;
    const { labelId } = req.body;

    if (!labelId) {
      return res.status(400).json({ error: 'labelId is required' });
    }

    const success = await srsRepository.addLabelToCard(userId, cardId, labelId);

    if (!success) {
      return res.status(400).json({ error: 'Failed to add label to card' });
    }

    res.json({ success: true, message: 'Label added to card successfully' });
  } catch (error) {
    console.error('[SRS] Add label to card error:', error);
    res.status(500).json({ error: 'Failed to add label to card' });
  }
});

// Remove a label from a card
router.delete('/cards/:userId/:cardId/labels/:labelId', authMiddleware.verifyToken, async (req, res) => {
  try {
    if (!srsRepository) return res.status(503).json({ error: 'Database not initialized' });

    const { userId, cardId, labelId } = req.params;

    const success = await srsRepository.removeLabelFromCard(userId, cardId, labelId);

    if (!success) {
      return res.status(404).json({ error: 'Label not found on card' });
    }

    res.json({ success: true, message: 'Label removed from card successfully' });
  } catch (error) {
    console.error('[SRS] Remove label from card error:', error);
    res.status(500).json({ error: 'Failed to remove label from card' });
  }
});

// Get labels for a specific card
router.get('/cards/:userId/:cardId/labels', authMiddleware.verifyToken, async (req, res) => {
  try {
    if (!srsRepository) return res.status(503).json({ error: 'Database not initialized' });

    const { userId, cardId } = req.params;
    const labels = await srsRepository.getCardLabels(userId, cardId);

    res.json({ success: true, labels });
  } catch (error) {
    console.error('[SRS] Get card labels error:', error);
    res.status(500).json({ error: 'Failed to get card labels' });
  }
});

// Get cards filtered by label
router.get('/cards/:userId/label/:labelId', authMiddleware.verifyToken, async (req, res) => {
  try {
    if (!srsRepository) return res.status(503).json({ error: 'Database not initialized' });

    const { userId, labelId } = req.params;
    const cards = await srsRepository.getCardsByLabel(userId, labelId);

    res.json({ success: true, cards });
  } catch (error) {
    console.error('[SRS] Get cards by label error:', error);
    res.status(500).json({ error: 'Failed to get cards by label' });
  }
});

// Get due cards filtered by label
router.get('/review-cards/:userId/label/:labelId', authMiddleware.verifyToken, async (req, res) => {
  try {
    if (!srsRepository) return res.status(503).json({ error: 'Database not initialized' });

    const { userId, labelId } = req.params;
    const cards = await srsRepository.getDueCardsByLabel(userId, labelId);

    res.json({ success: true, cards });
  } catch (error) {
    console.error('[SRS] Get due cards by label error:', error);
    res.status(500).json({ error: 'Failed to get due cards by label' });
  }
});

module.exports = router;
