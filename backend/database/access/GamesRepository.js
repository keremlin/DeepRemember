const config = require('../../config/app');

// Conditional logging helper
function dbLog(...args) {
  if (config.DB_LOG) {
    console.log(...args);
  }
}

/**
 * Games Repository - Handles all games and game_data database operations
 */
class GamesRepository {
  constructor(database) {
    this.db = database;
  }

  // ─────────────────────────────────────────────────────────────
  // games table
  // ─────────────────────────────────────────────────────────────

  /**
   * Get all games
   * @returns {Promise<Array>} Array of game definitions
   */
  async getAllGames() {
    try {
      const rows = await this.db.query(
        `SELECT * FROM games ORDER BY name ASC`,
        {}
      );
      return (rows || []).map(this._mapGame);
    } catch (error) {
      console.error('[Games-REPO] getAllGames error:', error);
      throw error;
    }
  }

  /**
   * Get a game by ID
   * @param {number} gameId
   * @returns {Promise<Object|null>}
   */
  async getGameById(gameId) {
    try {
      const row = await this.db.queryOne(
        `SELECT * FROM games WHERE id = ?`,
        { id: gameId }
      );
      return row ? this._mapGame(row) : null;
    } catch (error) {
      console.error('[Games-REPO] getGameById error:', error);
      throw error;
    }
  }

  /**
   * Create a new game definition
   * @param {Object} data
   * @param {string} data.name
   * @param {string} [data.description]
   * @returns {Promise<Object>} Created game
   */
  async createGame(data) {
    try {
      const result = await this.db.execute(
        `INSERT INTO games (name, description) VALUES (?, ?)`,
        {
          name: data.name,
          description: data.description || null
        }
      );
      const id = result.lastInsertRowid || result.lastInsertRowId;
      return await this.getGameById(id);
    } catch (error) {
      console.error('[Games-REPO] createGame error:', error);
      throw error;
    }
  }

  /**
   * Update a game definition
   * @param {number} gameId
   * @param {Object} data
   * @returns {Promise<boolean>}
   */
  async updateGame(gameId, data) {
    try {
      const result = await this.db.execute(
        `UPDATE games SET name = ?, description = ? WHERE id = ?`,
        {
          name: data.name,
          description: data.description || null,
          id: gameId
        }
      );
      return result.changes > 0;
    } catch (error) {
      console.error('[Games-REPO] updateGame error:', error);
      throw error;
    }
  }

  /**
   * Delete a game definition
   * @param {number} gameId
   * @returns {Promise<boolean>}
   */
  async deleteGame(gameId) {
    try {
      const result = await this.db.execute(
        `DELETE FROM games WHERE id = ?`,
        { id: gameId }
      );
      return result.changes > 0;
    } catch (error) {
      console.error('[Games-REPO] deleteGame error:', error);
      throw error;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // game_data table
  // ─────────────────────────────────────────────────────────────

  /**
   * Save a game session result
   * @param {Object} data
   * @param {string} data.name       - Optional display name / label for the session
   * @param {string} data.level      - Difficulty level (e.g. 'A1', 'B2', ...)
   * @param {string} data.userId     - User identifier
   * @param {number} data.gameId     - FK to games.id
   * @param {number} data.score      - Score achieved
   * @returns {Promise<Object>} Created game_data entry
   */
  async saveGameData(data) {
    try {
      const result = await this.db.execute(
        `INSERT INTO game_data (name, level, user_id, game_id, score) VALUES (?, ?, ?, ?, ?)`,
        {
          name: data.name || null,
          level: data.level || null,
          user_id: data.userId,
          game_id: data.gameId,
          score: data.score || 0
        }
      );
      const id = result.lastInsertRowid || result.lastInsertRowId;
      return await this.getGameDataById(id);
    } catch (error) {
      console.error('[Games-REPO] saveGameData error:', error);
      throw error;
    }
  }

  /**
   * Get a single game_data entry by ID
   * @param {number} id
   * @returns {Promise<Object|null>}
   */
  async getGameDataById(id) {
    try {
      const row = await this.db.queryOne(
        `SELECT * FROM game_data WHERE id = ?`,
        { id }
      );
      return row ? this._mapGameData(row) : null;
    } catch (error) {
      console.error('[Games-REPO] getGameDataById error:', error);
      throw error;
    }
  }

  /**
   * Get all game_data entries for a user
   * @param {string} userId
   * @param {number} [gameId]  - Optional: filter by game
   * @returns {Promise<Array>}
   */
  async getGameDataByUser(userId, gameId = null) {
    try {
      let sql = `SELECT * FROM game_data WHERE user_id = ?`;
      const params = { user_id: userId };

      if (gameId !== null) {
        sql += ` AND game_id = ?`;
        params.game_id = gameId;
      }

      sql += ` ORDER BY date DESC`;

      const rows = await this.db.query(sql, params);
      return (rows || []).map(this._mapGameData);
    } catch (error) {
      console.error('[Games-REPO] getGameDataByUser error:', error);
      throw error;
    }
  }

  /**
   * Get all game_data entries for a specific game
   * @param {number} gameId
   * @returns {Promise<Array>}
   */
  async getGameDataByGame(gameId) {
    try {
      const rows = await this.db.query(
        `SELECT * FROM game_data WHERE game_id = ? ORDER BY date DESC`,
        { game_id: gameId }
      );
      return (rows || []).map(this._mapGameData);
    } catch (error) {
      console.error('[Games-REPO] getGameDataByGame error:', error);
      throw error;
    }
  }

  /**
   * Get the best score of a user for a specific game
   * @param {string} userId
   * @param {number} gameId
   * @returns {Promise<number>} Best score, or 0 if no entries
   */
  async getBestScore(userId, gameId) {
    try {
      const rows = await this.db.query(
        `SELECT score FROM game_data WHERE user_id = ? AND game_id = ? ORDER BY score DESC`,
        { user_id: userId, game_id: gameId }
      );
      return (rows && rows.length > 0) ? (rows[0].score ?? 0) : 0;
    } catch (error) {
      console.error('[Games-REPO] getBestScore error:', error);
      throw error;
    }
  }

  /**
   * Delete all game_data for a user (e.g. account deletion)
   * @param {string} userId
   * @returns {Promise<number>} Number of deleted rows
   */
  async deleteGameDataByUser(userId) {
    try {
      const result = await this.db.execute(
        `DELETE FROM game_data WHERE user_id = ?`,
        { user_id: userId }
      );
      return result.changes || 0;
    } catch (error) {
      console.error('[Games-REPO] deleteGameDataByUser error:', error);
      throw error;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Private mapping helpers
  // ─────────────────────────────────────────────────────────────

  _mapGame(row) {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      createDate: row.create_date
    };
  }

  _mapGameData(row) {
    return {
      id: row.id,
      name: row.name,
      level: row.level,
      userId: row.user_id,
      gameId: row.game_id,
      date: row.date,
      score: row.score
    };
  }
}

module.exports = GamesRepository;
