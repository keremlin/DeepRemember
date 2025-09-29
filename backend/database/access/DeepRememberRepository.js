/**
 * DeepRemember Repository - Handles all DeepRemember-specific database operations
 */
class DeepRememberRepository {
  constructor(database) {
    this.db = database;
  }

  /**
   * Create or get a user
   */
  async createUser(userId) {
    try {
      // Check if user exists
      const existingUser = await this.db.queryOne(
        'SELECT * FROM users WHERE user_id = ?',
        { user_id: userId }
      );

      if (existingUser) {
        return existingUser;
      }

      // Create new user
      const result = await this.db.execute(
        'INSERT INTO users (user_id) VALUES (?)',
        { user_id: userId }
      );

      return {
        id: result.lastInsertRowid,
        user_id: userId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    } catch (error) {
      console.error('[SRS-REPO] Create user error:', error);
      throw error;
    }
  }

  /**
   * Create a new card
   */
  async createCard(userId, cardData) {
    try {
      // Ensure user exists
      await this.createUser(userId);

      const result = await this.db.execute(
        `INSERT INTO cards (
          user_id, card_id, word, translation, context, state, due,
          stability, difficulty, elapsed_days, scheduled_days, reps, lapses
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        {
          user_id: userId,
          card_id: cardData.id,
          word: cardData.word,
          translation: cardData.translation || '',
          context: cardData.context || '',
          state: cardData.state,
          due: cardData.due,
          stability: cardData.stability,
          difficulty: cardData.difficulty,
          elapsed_days: cardData.elapsed_days,
          scheduled_days: cardData.scheduled_days,
          reps: cardData.reps,
          lapses: cardData.lapses
        }
      );

      return {
        id: result.lastInsertRowid,
        ...cardData
      };
    } catch (error) {
      console.error('[SRS-REPO] Create card error:', error);
      throw error;
    }
  }

  /**
   * Get all cards for a user
   */
  async getUserCards(userId) {
    try {
      const cards = await this.db.query(
        'SELECT * FROM cards WHERE user_id = ? ORDER BY created_at ASC',
        { user_id: userId }
      );

      // Get labels for each card
      const cardsWithLabels = await Promise.all(
        cards.map(async (card) => {
          const labels = await this.getCardLabels(userId, card.card_id);
          return {
            id: card.card_id,
            word: card.word,
            translation: card.translation,
            context: card.context,
            state: card.state,
            due: card.due,
            stability: card.stability,
            difficulty: card.difficulty,
            elapsed_days: card.elapsed_days,
            scheduled_days: card.scheduled_days,
            reps: card.reps,
            lapses: card.lapses,
            created: card.created_at,
            lastReviewed: card.last_reviewed,
            labels: labels
          };
        })
      );

      return cardsWithLabels;
    } catch (error) {
      console.error('[SRS-REPO] Get user cards error:', error);
      throw error;
    }
  }

  /**
   * Search for similar words
   */
  async searchSimilarWords(userId, query) {
    try {
      const searchQuery = `%${query}%`;
      const cards = await this.db.query(
        `SELECT * FROM cards 
         WHERE user_id = ? 
         AND (word LIKE ? OR translation LIKE ?)
         ORDER BY 
           CASE 
             WHEN word = ? THEN 1
             WHEN word LIKE ? THEN 2
             WHEN translation LIKE ? THEN 3
             ELSE 4
           END,
           created_at DESC
         LIMIT 10`,
        { 
          user_id: userId, 
          word_like: searchQuery, 
          translation_like: searchQuery,
          exact_word: query,
          word_starts: `${query}%`,
          translation_starts: `${query}%`
        }
      );

      return cards.map(card => ({
        id: card.card_id,
        word: card.word,
        translation: card.translation,
        context: card.context,
        state: card.state,
        due: card.due,
        reps: card.reps,
        lapses: card.lapses,
        created: card.created_at
      }));
    } catch (error) {
      console.error('[SRS-REPO] Search similar words error:', error);
      throw error;
    }
  }

  /**
   * Get cards due for review
   */
  async getDueCards(userId) {
    try {
      const now = new Date().toISOString();
      const cards = await this.db.query(
        'SELECT * FROM cards WHERE user_id = ? AND due <= ? ORDER BY due ASC',
        { user_id: userId, due: now }
      );

      // Get labels for each card
      const cardsWithLabels = await Promise.all(
        cards.map(async (card) => {
          const labels = await this.getCardLabels(userId, card.card_id);
          return {
            id: card.card_id,
            word: card.word,
            translation: card.translation,
            context: card.context,
            state: card.state,
            due: card.due,
            stability: card.stability,
            difficulty: card.difficulty,
            elapsed_days: card.elapsed_days,
            scheduled_days: card.scheduled_days,
            reps: card.reps,
            lapses: card.lapses,
            created: card.created_at,
            lastReviewed: card.last_reviewed,
            labels: labels
          };
        })
      );

      return cardsWithLabels;
    } catch (error) {
      console.error('[SRS-REPO] Get due cards error:', error);
      throw error;
    }
  }

  /**
   * Update a card
   */
  async updateCard(userId, cardId, cardData) {
    try {
      const result = await this.db.execute(
        `UPDATE cards SET 
          word = ?, translation = ?, context = ?, state = ?, due = ?,
          stability = ?, difficulty = ?, elapsed_days = ?, scheduled_days = ?,
          reps = ?, lapses = ?, last_reviewed = ?, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ? AND card_id = ?`,
        {
          word: cardData.word,
          translation: cardData.translation || '',
          context: cardData.context || '',
          state: cardData.state,
          due: cardData.due,
          stability: cardData.stability,
          difficulty: cardData.difficulty,
          elapsed_days: cardData.elapsed_days,
          scheduled_days: cardData.scheduled_days,
          reps: cardData.reps,
          lapses: cardData.lapses,
          last_reviewed: cardData.lastReviewed || new Date().toISOString(),
          user_id: userId,
          card_id: cardId
        }
      );

      return result.changes > 0;
    } catch (error) {
      console.error('[SRS-REPO] Update card error:', error);
      throw error;
    }
  }

  /**
   * Delete a card
   */
  async deleteCard(userId, cardId) {
    try {
      const result = await this.db.execute(
        'DELETE FROM cards WHERE user_id = ? AND card_id = ?',
        { user_id: userId, card_id: cardId }
      );

      return result.changes > 0;
    } catch (error) {
      console.error('[SRS-REPO] Delete card error:', error);
      throw error;
    }
  }

  /**
   * Get user statistics
   */
  async getUserStats(userId) {
    try {
      const now = new Date().toISOString();
      
      const totalCards = await this.db.queryOne(
        'SELECT COUNT(*) as count FROM cards WHERE user_id = ?',
        { user_id: userId }
      );

      const dueCards = await this.db.queryOne(
        'SELECT COUNT(*) as count FROM cards WHERE user_id = ? AND due <= ?',
        { user_id: userId, due: now }
      );

      const learningCards = await this.db.queryOne(
        'SELECT COUNT(*) as count FROM cards WHERE user_id = ? AND state = 0',
        { user_id: userId }
      );

      const reviewCards = await this.db.queryOne(
        'SELECT COUNT(*) as count FROM cards WHERE user_id = ? AND state = 1',
        { user_id: userId }
      );

      const relearningCards = await this.db.queryOne(
        'SELECT COUNT(*) as count FROM cards WHERE user_id = ? AND state = 2',
        { user_id: userId }
      );

      return {
        totalCards: totalCards.count,
        dueCards: dueCards.count,
        learningCards: learningCards.count,
        reviewCards: reviewCards.count,
        relearningCards: relearningCards.count
      };
    } catch (error) {
      console.error('[SRS-REPO] Get user stats error:', error);
      throw error;
    }
  }

  /**
   * Get all users
   */
  async getAllUsers() {
    try {
      return await this.db.query('SELECT * FROM users ORDER BY created_at ASC');
    } catch (error) {
      console.error('[SRS-REPO] Get all users error:', error);
      throw error;
    }
  }

  /**
   * Delete a user and all their cards
   */
  async deleteUser(userId) {
    try {
      const result = await this.db.execute(
        'DELETE FROM users WHERE user_id = ?',
        { user_id: userId }
      );

      return result.changes > 0;
    } catch (error) {
      console.error('[SRS-REPO] Delete user error:', error);
      throw error;
    }
  }

  /**
   * Get database statistics
   */
  async getDatabaseStats() {
    try {
      const stats = await this.db.getStats();
      return stats;
    } catch (error) {
      console.error('[SRS-REPO] Get database stats error:', error);
      throw error;
    }
  }

  /**
   * Migrate data from in-memory storage to database
   */
  async migrateFromMemory(userCards) {
    try {
      console.log('[SRS-REPO] Starting migration from memory to database...');
      
      for (const [userId, cards] of userCards.entries()) {
        // Create user
        await this.createUser(userId);
        
        // Create cards
        for (const card of cards) {
          await this.createCard(userId, card);
        }
        
        console.log(`[SRS-REPO] Migrated ${cards.length} cards for user ${userId}`);
      }
      
      console.log('[SRS-REPO] Migration completed successfully');
    } catch (error) {
      console.error('[SRS-REPO] Migration error:', error);
      throw error;
    }
  }

  /**
   * Get cached sentence analysis by hash
   */
  async getSentenceAnalysis(hash) {
    try {
      const analysis = await this.db.queryOne(
        'SELECT * FROM sentence_analysis_cache WHERE hash = ?',
        { hash: hash }
      );
      return analysis;
    } catch (error) {
      console.error('[DeepRememberRepository] Error getting sentence analysis:', error);
      throw error;
    }
  }

  /**
   * Store sentence analysis in cache
   */
  async storeSentenceAnalysis(hash, analysisData) {
    try {
      await this.db.execute(
        'INSERT OR REPLACE INTO sentence_analysis_cache (hash, analysis_data, created_at) VALUES (?, ?, ?)',
        { 
          hash: hash, 
          analysis_data: analysisData, 
          created_at: new Date().toISOString() 
        }
      );
    } catch (error) {
      console.error('[DeepRememberRepository] Error storing sentence analysis:', error);
      throw error;
    }
  }

  // ==================== LABEL MANAGEMENT METHODS ====================

  /**
   * Create a new label
   */
  async createLabel(userId, labelData) {
    try {
      // Only ensure user exists for user labels, not system labels
      if (labelData.type === 'user' && userId) {
        await this.createUser(userId);
      }

      const result = await this.db.execute(
        `INSERT INTO labels (name, type, user_id, color, description) 
         VALUES (?, ?, ?, ?, ?)`,
        {
          name: labelData.name,
          type: labelData.type, // 'system' or 'user'
          user_id: labelData.type === 'system' ? null : userId,
          color: labelData.color || '#3B82F6',
          description: labelData.description || ''
        }
      );

      return {
        id: result.lastInsertRowid,
        name: labelData.name,
        type: labelData.type,
        user_id: labelData.type === 'system' ? null : userId,
        color: labelData.color || '#3B82F6',
        description: labelData.description || '',
        created_at: new Date().toISOString()
      };
    } catch (error) {
      console.error('[SRS-REPO] Create label error:', error);
      throw error;
    }
  }

  /**
   * Get all labels for a user (both system and user labels)
   */
  async getUserLabels(userId) {
    try {
      const labels = await this.db.query(
        `SELECT * FROM labels 
         WHERE type = 'system' OR (type = 'user' AND user_id = ?) 
         ORDER BY type ASC, name ASC`,
        { user_id: userId }
      );

      return labels.map(label => ({
        id: label.id,
        name: label.name,
        type: label.type,
        user_id: label.user_id,
        color: label.color,
        description: label.description,
        created_at: label.created_at
      }));
    } catch (error) {
      console.error('[SRS-REPO] Get user labels error:', error);
      throw error;
    }
  }

  /**
   * Get system labels
   */
  async getSystemLabels() {
    try {
      const labels = await this.db.query(
        "SELECT * FROM labels WHERE type = 'system' ORDER BY name ASC"
      );

      return labels.map(label => ({
        id: label.id,
        name: label.name,
        type: label.type,
        user_id: label.user_id,
        color: label.color,
        description: label.description,
        created_at: label.created_at
      }));
    } catch (error) {
      console.error('[SRS-REPO] Get system labels error:', error);
      throw error;
    }
  }

  /**
   * Update a label
   */
  async updateLabel(labelId, labelData) {
    try {
      const result = await this.db.execute(
        `UPDATE labels SET 
          name = ?, color = ?, description = ?, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        {
          name: labelData.name,
          color: labelData.color,
          description: labelData.description,
          id: labelId
        }
      );

      return result.changes > 0;
    } catch (error) {
      console.error('[SRS-REPO] Update label error:', error);
      throw error;
    }
  }

  /**
   * Delete a user label (system labels cannot be deleted)
   */
  async deleteLabel(userId, labelId) {
    try {
      const result = await this.db.execute(
        `DELETE FROM labels 
         WHERE id = ? AND type = 'user' AND user_id = ?`,
        { id: labelId, user_id: userId }
      );

      return result.changes > 0;
    } catch (error) {
      console.error('[SRS-REPO] Delete label error:', error);
      throw error;
    }
  }

  /**
   * Add a label to a card
   */
  async addLabelToCard(userId, cardId, labelId) {
    try {
      const result = await this.db.execute(
        `INSERT INTO card_labels (card_id, user_id, label_id) 
         VALUES (?, ?, ?)`,
        { card_id: cardId, user_id: userId, label_id: labelId }
      );

      return result.changes > 0;
    } catch (error) {
      console.error('[SRS-REPO] Add label to card error:', error);
      throw error;
    }
  }

  /**
   * Remove a label from a card
   */
  async removeLabelFromCard(userId, cardId, labelId) {
    try {
      const result = await this.db.execute(
        `DELETE FROM card_labels 
         WHERE card_id = ? AND user_id = ? AND label_id = ?`,
        { card_id: cardId, user_id: userId, label_id: labelId }
      );

      return result.changes > 0;
    } catch (error) {
      console.error('[SRS-REPO] Remove label from card error:', error);
      throw error;
    }
  }

  /**
   * Get labels for a specific card
   */
  async getCardLabels(userId, cardId) {
    try {
      const labels = await this.db.query(
        `SELECT l.* FROM labels l
         JOIN card_labels cl ON l.id = cl.label_id
         WHERE cl.card_id = ? AND cl.user_id = ?
         ORDER BY l.type ASC, l.name ASC`,
        { card_id: cardId, user_id: userId }
      );

      return labels.map(label => ({
        id: label.id,
        name: label.name,
        type: label.type,
        user_id: label.user_id,
        color: label.color,
        description: label.description,
        created_at: label.created_at
      }));
    } catch (error) {
      console.error('[SRS-REPO] Get card labels error:', error);
      throw error;
    }
  }

  /**
   * Get cards filtered by label
   */
  async getCardsByLabel(userId, labelId) {
    try {
      const cards = await this.db.query(
        `SELECT c.* FROM cards c
         JOIN card_labels cl ON c.card_id = cl.card_id AND c.user_id = cl.user_id
         WHERE cl.user_id = ? AND cl.label_id = ?
         ORDER BY c.created_at ASC`,
        { user_id: userId, label_id: labelId }
      );

      return cards.map(card => ({
        id: card.card_id,
        word: card.word,
        translation: card.translation,
        context: card.context,
        state: card.state,
        due: card.due,
        stability: card.stability,
        difficulty: card.difficulty,
        elapsed_days: card.elapsed_days,
        scheduled_days: card.scheduled_days,
        reps: card.reps,
        lapses: card.lapses,
        created: card.created_at,
        lastReviewed: card.last_reviewed
      }));
    } catch (error) {
      console.error('[SRS-REPO] Get cards by label error:', error);
      throw error;
    }
  }

  /**
   * Get due cards filtered by label
   */
  async getDueCardsByLabel(userId, labelId) {
    try {
      const now = new Date().toISOString();
      const cards = await this.db.query(
        `SELECT c.* FROM cards c
         JOIN card_labels cl ON c.card_id = cl.card_id AND c.user_id = cl.user_id
         WHERE cl.user_id = ? AND cl.label_id = ? AND c.due <= ?
         ORDER BY c.due ASC`,
        { user_id: userId, label_id: labelId, due: now }
      );

      return cards.map(card => ({
        id: card.card_id,
        word: card.word,
        translation: card.translation,
        context: card.context,
        state: card.state,
        due: card.due,
        stability: card.stability,
        difficulty: card.difficulty,
        elapsed_days: card.elapsed_days,
        scheduled_days: card.scheduled_days,
        reps: card.reps,
        lapses: card.lapses,
        created: card.created_at,
        lastReviewed: card.last_reviewed
      }));
    } catch (error) {
      console.error('[SRS-REPO] Get due cards by label error:', error);
      throw error;
    }
  }

  /**
   * Check if system labels exist
   */
  async checkSystemLabelsExist() {
    try {
      const wordLabel = await this.db.queryOne(
        "SELECT * FROM labels WHERE name = 'word' AND type = 'system'"
      );
      const sentenceLabel = await this.db.queryOne(
        "SELECT * FROM labels WHERE name = 'sentence' AND type = 'system'"
      );
      
      return {
        word: !!wordLabel,
        sentence: !!sentenceLabel,
        allExist: !!(wordLabel && sentenceLabel)
      };
    } catch (error) {
      console.error('[SRS-REPO] Check system labels error:', error);
      return { word: false, sentence: false, allExist: false };
    }
  }

  /**
   * Initialize default system labels
   */
  async initializeSystemLabels() {
    try {
      // Check current status
      const status = await this.checkSystemLabelsExist();
      
      if (status.allExist) {
        console.log('[SRS-REPO] All system labels already exist');
        return;
      }

      const systemLabels = [
        { name: 'word', color: '#3B82F6', description: 'Cards created from individual words' },
        { name: 'sentence', color: '#10B981', description: 'Cards created from sentences' }
      ];

      for (const labelData of systemLabels) {
        try {
          // Check if this specific label already exists
          const existingLabel = await this.db.queryOne(
            "SELECT * FROM labels WHERE name = ? AND type = 'system'",
            { name: labelData.name }
          );

          if (!existingLabel) {
            await this.createLabel(null, { ...labelData, type: 'system' });
            console.log(`[SRS-REPO] Created system label: ${labelData.name}`);
          } else {
            console.log(`[SRS-REPO] System label '${labelData.name}' already exists`);
          }
        } catch (error) {
          console.error(`[SRS-REPO] Error creating system label '${labelData.name}':`, error);
        }
      }

      // Verify final status
      const finalStatus = await this.checkSystemLabelsExist();
      if (finalStatus.allExist) {
        console.log('[SRS-REPO] System labels initialization completed successfully');
      } else {
        console.warn('[SRS-REPO] System labels initialization completed with some issues');
      }
    } catch (error) {
      console.error('[SRS-REPO] Initialize system labels error:', error);
      throw error;
    }
  }
}

module.exports = DeepRememberRepository;
