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
}

module.exports = DeepRememberRepository;
