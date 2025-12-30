const config = require('../../config/app');

// Conditional logging helper
function dbLog(...args) {
  if (config.DB_LOG) {
    console.log(...args);
  }
}

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
   * Check if a card with the same word and translation already exists for a user
   */
  async checkDuplicateCard(userId, word, translation) {
    try {
      const normalizedWord = word.trim().toLowerCase();
      const normalizedTranslation = (translation || '').trim().toLowerCase();
      
      const existingCard = await this.db.queryOne(
        `SELECT card_id, word, translation FROM cards 
         WHERE user_id = ? 
         AND LOWER(TRIM(word)) = ? 
         AND LOWER(TRIM(COALESCE(translation, ''))) = ?`,
        { 
          user_id: userId,
          word: normalizedWord,
          translation: normalizedTranslation
        }
      );

      return existingCard || null;
    } catch (error) {
      console.error('[SRS-REPO] Check duplicate card error:', error);
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
          elapsed_days: Math.round(cardData.elapsed_days || 0),
          scheduled_days: Math.round(cardData.scheduled_days || 0),
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
   * @param {string} userId - User ID
   * @param {Object} options - Optional pagination and sorting options
   * @param {number} options.limit - Maximum number of cards to return
   * @param {number} options.offset - Number of cards to skip
   * @param {string} options.orderBy - Column to order by (default: 'word')
   * @param {string} options.orderDir - Order direction 'ASC' or 'DESC' (default: 'ASC')
   * @param {string} options.search - Search term to filter cards by word (uses LIKE pattern)
   * @returns {Promise<Object>} Object with cards array and total count
   */
  async getUserCards(userId, options = {}) {
    try {
      const { limit, offset, orderBy = 'word', orderDir = 'ASC', search } = options;
      
      // Debug logging
      dbLog('[SRS-REPO] getUserCards called with:', { userId, limit, offset, orderBy, orderDir, search });
      
      // Validate orderBy to prevent SQL injection
      const allowedOrderBy = ['word', 'created_at', 'due', 'state'];
      const safeOrderBy = allowedOrderBy.includes(orderBy) ? orderBy : 'word';
      const safeOrderDir = orderDir.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';
      
      // Build WHERE clause with optional search
      let whereClause = 'WHERE user_id = ?';
      const queryParams = [userId]; // Use array to ensure correct parameter order
      
      if (search && search.trim()) {
        const searchPattern = `%${search.trim()}%`;
        whereClause += ' AND word LIKE ?';
        queryParams.push(searchPattern);
        dbLog('[SRS-REPO] Adding search filter:', searchPattern);
      }
      
      // Build query with optional pagination
      let query = `SELECT * FROM cards ${whereClause} ORDER BY ${safeOrderBy} ${safeOrderDir}`;
      
      if (limit !== undefined && limit !== null) {
        query += ' LIMIT ?';
        queryParams.push(limit);
      }
      
      if (offset !== undefined && offset !== null && limit !== undefined && limit !== null) {
        query += ' OFFSET ?';
        queryParams.push(offset);
      }
      
      // Convert array to object for database query method (maintaining order)
      const params = {};
      queryParams.forEach((value, index) => {
        params[`param${index}`] = value;
      });
      
      dbLog('[SRS-REPO] Query:', query);
      dbLog('[SRS-REPO] Params array:', queryParams);
      dbLog('[SRS-REPO] Params object:', params);
      
      const cards = await this.db.query(query, params);
      dbLog('[SRS-REPO] Cards returned:', cards.length);
      
      // Get total count for pagination (with same search filter)
      // Always get count when pagination or search is enabled
      let totalCount = 0;
      if (limit !== undefined || offset !== undefined || (search && search.trim())) {
        const countQuery = `SELECT COUNT(*) as count FROM cards ${whereClause}`;
        const countParamsArray = [userId];
        if (search && search.trim()) {
          countParamsArray.push(`%${search.trim()}%`);
        }
        
        // Convert array to object for database query method
        const countParams = {};
        countParamsArray.forEach((value, index) => {
          countParams[`param${index}`] = value;
        });
        
        const countResult = await this.db.queryOne(countQuery, countParams);
        totalCount = countResult?.count || 0;
      }

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

      // If no pagination, return just the array for backward compatibility
      if (limit === undefined && offset === undefined) {
        return cardsWithLabels;
      }
      
      // Return paginated result with total count
      return {
        cards: cardsWithLabels,
        total: totalCount,
        limit: limit || null,
        offset: offset || 0,
        hasMore: offset + cardsWithLabels.length < totalCount
      };
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

      return (cards || []).map(card => ({
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
          elapsed_days: Math.round(cardData.elapsed_days || 0),
          scheduled_days: Math.round(cardData.scheduled_days || 0),
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
      dbLog(`[SRS-REPO] deleteCard called: userId=${userId}, cardId=${cardId}`);
      dbLog(`[SRS-REPO] Database instance:`, this.db.constructor.name);
      
      // Delete related card_labels first (CASCADE for Supabase PostgREST compatibility)
      // When using Supabase JavaScript client with PostgREST, CASCADE might not work
      // So we manually delete related records first
      dbLog('[SRS-REPO] Starting DELETE from card_labels...');
      try {
        const cardLabelsResult = await this.db.execute(
          'DELETE FROM card_labels WHERE card_id = ? AND user_id = ?',
          { card_id: cardId, user_id: userId }
        );
        dbLog(`[SRS-REPO] card_labels deleted. Changes: ${cardLabelsResult.changes}`);
      } catch (labelError) {
        // Ignore if card_labels doesn't exist or already deleted
        dbLog('[SRS-REPO] Note: Could not delete card_labels:', labelError.message);
        console.error('[SRS-REPO] card_labels error details:', labelError);
      }

      // Then delete the card itself
      dbLog('[SRS-REPO] Starting DELETE from cards...');
      try {
        const result = await this.db.execute(
          'DELETE FROM cards WHERE user_id = ? AND card_id = ?',
          { user_id: userId, card_id: cardId }
        );
        dbLog(`[SRS-REPO] cards deleted. Changes: ${result.changes}`);
        return result.changes > 0;
      } catch (cardError) {
        console.error('[SRS-REPO] cards error details:', cardError);
        throw cardError;
      }
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

      // Get label counts (including labels with 0 cards)
      const labelCounts = await this.db.query(
        `SELECT l.name, l.color, COALESCE(COUNT(cl.card_id), 0) as count
         FROM labels l
         LEFT JOIN card_labels cl ON l.id = cl.label_id AND cl.user_id = ?
         WHERE l.type = 'system' OR (l.type = 'user' AND l.user_id = ?)
         GROUP BY l.id, l.name, l.color
         ORDER BY l.type DESC, l.name ASC`,
        { user_id: userId, user_id2: userId }
      );

      return {
        totalCards: totalCards?.count || 0,
        dueCards: dueCards?.count || 0,
        learningCards: learningCards?.count || 0,
        reviewCards: reviewCards?.count || 0,
        relearningCards: relearningCards?.count || 0,
        labelCounts: (labelCounts || []).map(label => ({
          name: label.name,
          color: label.color,
          count: label.count
        }))
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
      dbLog('[SRS-REPO] Starting migration from memory to database...');
      
      for (const [userId, cards] of userCards.entries()) {
        // Create user
        await this.createUser(userId);
        
        // Create cards
        for (const card of cards) {
          await this.createCard(userId, card);
        }
        
        dbLog(`[SRS-REPO] Migrated ${cards.length} cards for user ${userId}`);
      }
      
      dbLog('[SRS-REPO] Migration completed successfully');
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

      return (labels || []).map(label => ({
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

      return (labels || []).map(label => ({
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

      return (labels || []).map(label => ({
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

      return (cards || []).map(card => ({
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

      return (cards || []).map(card => ({
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
        dbLog('[SRS-REPO] All system labels already exist');
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
            dbLog(`[SRS-REPO] Created system label: ${labelData.name}`);
          } else {
            dbLog(`[SRS-REPO] System label '${labelData.name}' already exists`);
          }
        } catch (error) {
          console.error(`[SRS-REPO] Error creating system label '${labelData.name}':`, error);
        }
      }

      // Verify final status
      const finalStatus = await this.checkSystemLabelsExist();
      if (finalStatus.allExist) {
        dbLog('[SRS-REPO] System labels initialization completed successfully');
      } else {
        console.warn('[SRS-REPO] System labels initialization completed with some issues');
      }
    } catch (error) {
      console.error('[SRS-REPO] Initialize system labels error:', error);
      throw error;
    }
  }

  /**
   * Start a new timer session for a user
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Timer session object
   */
  async startTimerSession(userId, activity = 'review_card') {
    try {
      await this.createUser(userId);
      
      const startDatetime = new Date().toISOString();
      
      const result = await this.db.execute(
        'INSERT INTO spend_time (user_id, start_datetime, length_seconds, activity) VALUES (?, ?, ?, ?)',
        {
          user_id: userId,
          start_datetime: startDatetime,
          length_seconds: 0,
          activity: activity
        }
      );

      return {
        id: result.lastInsertRowId,
        user_id: userId,
        start_datetime: startDatetime,
        length_seconds: 0,
        activity: activity
      };
    } catch (error) {
      console.error('[SRS-REPO] Start timer session error:', error);
      throw error;
    }
  }

  /**
   * Save/pause a timer session
   * @param {string} userId - User ID
   * @param {number|string} sessionId - Session ID
   * @param {number} lengthSeconds - Length in seconds
   * @returns {Promise<Object>} Updated timer session
   */
  async saveTimerSession(userId, sessionId, lengthSeconds) {
    try {
      const endDatetime = new Date().toISOString();
      
      // Ensure sessionId is a number (PostgreSQL SERIAL is integer)
      const sessionIdNum = typeof sessionId === 'string' ? parseInt(sessionId, 10) : sessionId;
      
      dbLog('[SRS-REPO] Saving timer session:', { 
        userId, 
        sessionId, 
        sessionIdNum,
        lengthSeconds, 
        endDatetime,
        lengthSecondsType: typeof lengthSeconds
      });
      
      // First verify the session exists
      const existingSession = await this.db.queryOne(
        'SELECT * FROM spend_time WHERE id = ? AND user_id = ?',
        {
          id: sessionIdNum,
          user_id: userId
        }
      );
      
      if (!existingSession) {
        throw new Error(`Session ${sessionIdNum} not found for user ${userId}`);
      }
      
      dbLog('[SRS-REPO] Existing session found:', existingSession);
      
      const result = await this.db.execute(
        'UPDATE spend_time SET end_datetime = ?, length_seconds = ? WHERE id = ? AND user_id = ?',
        {
          end_datetime: endDatetime,
          length_seconds: lengthSeconds,
          id: sessionIdNum,
          user_id: userId
        }
      );

      dbLog('[SRS-REPO] Update result:', result);
      
      if (result.changes === 0) {
        throw new Error(`No rows updated. Session ${sessionIdNum} may not exist or user mismatch.`);
      }

      const session = await this.db.queryOne(
        'SELECT * FROM spend_time WHERE id = ? AND user_id = ?',
        {
          id: sessionIdNum,
          user_id: userId
        }
      );

      dbLog('[SRS-REPO] Retrieved session after update:', session);

      if (!session) {
        throw new Error(`Session ${sessionIdNum} not found after update`);
      }

      return session;
    } catch (error) {
      console.error('[SRS-REPO] Save timer session error:', error);
      console.error('[SRS-REPO] Error details:', {
        userId,
        sessionId,
        lengthSeconds,
        errorMessage: error.message,
        errorStack: error.stack
      });
      throw error;
    }
  }

  /**
   * Get today's total time spent for a user (in seconds)
   * @param {string} userId - User ID
   * @param {string} activity - Activity type (optional, filters by activity if provided)
   * @returns {Promise<number>} Total seconds spent today
   */
  async getTodayTotalTime(userId, activity = null) {
    try {
      // Get today's date at midnight in UTC
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      const todayStart = today.toISOString();
      
      // Also get tomorrow's start for range query
      const tomorrow = new Date(today);
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
      const tomorrowStart = tomorrow.toISOString();
      
      // Get all completed sessions today and sum them manually
      // This works around Supabase's issue with aggregate queries returning empty arrays
      let query = `SELECT length_seconds, start_datetime 
         FROM spend_time 
         WHERE user_id = ? 
         AND start_datetime >= ?
         AND start_datetime < ?
         AND end_datetime IS NOT NULL`;
      const params = {
        user_id: userId,
        start_datetime: todayStart,
        tomorrow_start: tomorrowStart
      };
      
      if (activity) {
        query += ` AND activity = ?`;
        params.activity = activity;
      }
      
      const todaySessionsResult = await this.db.query(query, params);
      
      // Filter to only include sessions that actually started today (safety check)
      const todayOnly = Array.isArray(todaySessionsResult) 
        ? todaySessionsResult.filter(session => {
            if (!session.start_datetime) return false;
            const sessionDate = new Date(session.start_datetime);
            const todayDate = new Date(todayStart);
            return sessionDate >= todayDate && sessionDate < new Date(tomorrowStart);
          })
        : [];
      
      // Sum up the length_seconds manually
      let totalSeconds = 0;
      if (todayOnly.length > 0) {
        totalSeconds = todayOnly.reduce((sum, session) => {
          const seconds = parseInt(session.length_seconds || 0, 10);
          return sum + (isNaN(seconds) ? 0 : seconds);
        }, 0);
      }

      // Get active session and add its elapsed time
      const activeSession = await this.getActiveTimerSession(userId, activity);
      if (activeSession && activeSession.start_datetime) {
        const sessionStart = new Date(activeSession.start_datetime);
        const todayStartDate = new Date(todayStart);
        
        // Only count if the active session started today
        if (sessionStart >= todayStartDate) {
          const now = new Date();
          const elapsed = Math.floor((now - sessionStart) / 1000);
          totalSeconds += elapsed;
        }
      }
      
      return totalSeconds;
    } catch (error) {
      console.error('[SRS-REPO] Get today total time error:', error);
      console.error('[SRS-REPO] Error stack:', error.stack);
      throw error;
    }
  }

  /**
   * Get active timer session for a user (if any)
   * @param {string} userId - User ID
   * @param {string} activity - Activity type (optional, filters by activity if provided)
   * @returns {Promise<Object|null>} Active session or null
   */
  async getActiveTimerSession(userId, activity = null) {
    try {
      let query = `SELECT * FROM spend_time 
         WHERE user_id = ? 
         AND (end_datetime IS NULL OR end_datetime = '')`;
      const params = { user_id: userId };
      
      if (activity) {
        query += ` AND activity = ?`;
        params.activity = activity;
      }
      
      query += ` ORDER BY start_datetime DESC LIMIT 1`;
      
      const session = await this.db.queryOne(query, params);

      // Double-check that end_datetime is actually NULL (some DBs might return empty string)
      if (session && session.end_datetime !== null && session.end_datetime !== '') {
        dbLog('[SRS-REPO] Found session with end_datetime, ignoring:', session);
        return null;
      }

      return session || null;
    } catch (error) {
      console.error('[SRS-REPO] Get active timer session error:', error);
      throw error;
    }
  }

  /**
   * Get activity statistics grouped by activity for a user
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Array of objects with activity and totalSeconds
   */
  async getActivityStatistics(userId) {
    try {
      // Try GROUP BY query first
      const query = `SELECT activity, SUM(length_seconds) as total_seconds 
         FROM spend_time 
         WHERE user_id = ? 
         AND end_datetime IS NOT NULL
         GROUP BY activity
         ORDER BY total_seconds DESC`;
      
      const params = { user_id: userId };
      const results = await this.db.query(query, params);
      
      // If GROUP BY doesn't work, try fallback approach
      if (!Array.isArray(results) || results.length === 0) {
        // Fallback: Get all records and group manually
        const fallbackQuery = `SELECT activity, length_seconds 
           FROM spend_time 
           WHERE user_id = ? 
           AND end_datetime IS NOT NULL
           AND length_seconds > 0`;
        
        const allRecords = await this.db.query(fallbackQuery, params);
        
        // Group manually
        const activityMap = {};
        if (Array.isArray(allRecords)) {
          allRecords.forEach(record => {
            const activity = record.activity || 'unknown';
            const seconds = parseInt(record.length_seconds || 0, 10);
            if (seconds > 0) {
              activityMap[activity] = (activityMap[activity] || 0) + seconds;
            }
          });
        }
        
        // Convert to array and sort
        return Object.entries(activityMap)
          .map(([activity, totalSeconds]) => ({ activity, totalSeconds }))
          .sort((a, b) => b.totalSeconds - a.totalSeconds);
      }
      
      // Transform results to ensure consistent format
      return results.map(row => {
        const activity = row.activity || 'unknown';
        const totalSeconds = parseInt(row.total_seconds || row.totalSeconds || 0, 10);
        return {
          activity,
          totalSeconds
        };
      }).filter(stat => stat.totalSeconds > 0);
    } catch (error) {
      console.error('[SRS-REPO] Get activity statistics error:', error);
      throw error;
    }
  }
}

module.exports = DeepRememberRepository;
