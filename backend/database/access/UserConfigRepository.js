const config = require('../../config/app');

// Conditional logging helper
function dbLog(...args) {
  if (config.DB_LOG) {
    console.log(...args);
  }
}

/**
 * UserConfig Repository - Handles all user configuration database operations
 */
class UserConfigRepository {
  constructor(database) {
    this.db = database;
  }

  /**
   * Create a new user configuration
   * @param {string} userId - User ID
   * @param {Object} configData - Configuration data
   * @param {string} configData.name - Configuration name
   * @param {string} configData.label - Configuration label
   * @param {string} configData.value_type - Type of value (string, number, boolean, json)
   * @param {string} configData.value - Configuration value
   * @returns {Promise<Object>} Created configuration
   */
  async createConfig(userId, configData) {
    try {
      const result = await this.db.execute(
        `INSERT INTO user_configs (
          user_id, name, label, value_type, value
        ) VALUES (?, ?, ?, ?, ?)`,
        {
          user_id: userId,
          name: configData.name,
          label: configData.label || configData.name,
          value_type: configData.value_type || 'string',
          value: configData.value || ''
        }
      );

      // Get the created config
      const configId = result.lastInsertRowid || result.lastInsertRowId || (result.rows && result.rows[0] && result.rows[0].id);
      
      return await this.getConfigById(userId, configId);
    } catch (error) {
      console.error('[UserConfig-REPO] Create config error:', error);
      throw error;
    }
  }

  /**
   * Get all configurations for a user
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Array of configurations
   */
  async getUserConfigs(userId) {
    try {
      const configs = await this.db.query(
        `SELECT * FROM user_configs 
         WHERE user_id = ? 
         ORDER BY created_at DESC`,
        { user_id: userId }
      );

      return (configs || []).map(config => ({
        id: config.id,
        user_id: config.user_id,
        name: config.name,
        label: config.label,
        value_type: config.value_type,
        value: config.value,
        created_at: config.created_at,
        updated_at: config.updated_at
      }));
    } catch (error) {
      console.error('[UserConfig-REPO] Get user configs error:', error);
      throw error;
    }
  }

  /**
   * Get a configuration by ID
   * @param {string} userId - User ID
   * @param {number} configId - Configuration ID
   * @returns {Promise<Object|null>} Configuration or null if not found
   */
  async getConfigById(userId, configId) {
    try {
      const config = await this.db.queryOne(
        `SELECT * FROM user_configs 
         WHERE id = ? AND user_id = ?`,
        { id: configId, user_id: userId }
      );

      if (!config) {
        return null;
      }

      return {
        id: config.id,
        user_id: config.user_id,
        name: config.name,
        label: config.label,
        value_type: config.value_type,
        value: config.value,
        created_at: config.created_at,
        updated_at: config.updated_at
      };
    } catch (error) {
      console.error('[UserConfig-REPO] Get config by ID error:', error);
      throw error;
    }
  }

  /**
   * Get configurations by name for a user
   * @param {string} userId - User ID
   * @param {string} name - Configuration name
   * @returns {Promise<Array>} Array of configurations with the given name
   */
  async getConfigsByName(userId, name) {
    try {
      const configs = await this.db.query(
        `SELECT * FROM user_configs 
         WHERE user_id = ? AND name = ? 
         ORDER BY created_at DESC`,
        { user_id: userId, name: name }
      );

      return (configs || []).map(config => ({
        id: config.id,
        user_id: config.user_id,
        name: config.name,
        label: config.label,
        value_type: config.value_type,
        value: config.value,
        created_at: config.created_at,
        updated_at: config.updated_at
      }));
    } catch (error) {
      console.error('[UserConfig-REPO] Get configs by name error:', error);
      throw error;
    }
  }

  /**
   * Update a configuration
   * @param {string} userId - User ID
   * @param {number} configId - Configuration ID
   * @param {Object} configData - Updated configuration data
   * @returns {Promise<boolean>} True if updated successfully
   */
  async updateConfig(userId, configId, configData) {
    try {
      const result = await this.db.execute(
        `UPDATE user_configs SET 
          name = ?, label = ?, value_type = ?, value = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND user_id = ?`,
        {
          name: configData.name,
          label: configData.label,
          value_type: configData.value_type,
          value: configData.value,
          id: configId,
          user_id: userId
        }
      );

      return result.changes > 0;
    } catch (error) {
      console.error('[UserConfig-REPO] Update config error:', error);
      throw error;
    }
  }

  /**
   * Delete a configuration
   * @param {string} userId - User ID
   * @param {number} configId - Configuration ID
   * @returns {Promise<boolean>} True if deleted successfully
   */
  async deleteConfig(userId, configId) {
    try {
      const result = await this.db.execute(
        `DELETE FROM user_configs 
         WHERE id = ? AND user_id = ?`,
        { id: configId, user_id: userId }
      );

      return result.changes > 0;
    } catch (error) {
      console.error('[UserConfig-REPO] Delete config error:', error);
      throw error;
    }
  }

  /**
   * Delete all configurations with a given name for a user
   * @param {string} userId - User ID
   * @param {string} name - Configuration name
   * @returns {Promise<number>} Number of deleted configurations
   */
  async deleteConfigsByName(userId, name) {
    try {
      const result = await this.db.execute(
        `DELETE FROM user_configs 
         WHERE user_id = ? AND name = ?`,
        { user_id: userId, name: name }
      );

      return result.changes;
    } catch (error) {
      console.error('[UserConfig-REPO] Delete configs by name error:', error);
      throw error;
    }
  }
}

module.exports = UserConfigRepository;


