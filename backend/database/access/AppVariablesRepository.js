const config = require('../../config/app');

// Conditional logging helper
function dbLog(...args) {
  if (config.DB_LOG) {
    console.log(...args);
  }
}

/**
 * AppVariables Repository - Handles all app variables database operations
 */
class AppVariablesRepository {
  constructor(database) {
    this.db = database;
  }

  /**
   * Create a new app variable
   * @param {Object} variableData - Variable data
   * @param {string} variableData.keyname - Unique key name
   * @param {string} variableData.value - Variable value
   * @param {string} variableData.type - Type of value ('text', 'json', 'number')
   * @param {string} variableData.description - Optional description
   * @returns {Promise<Object>} Created variable
   */
  async create(variableData) {
    try {
      // Validate type
      const validTypes = ['text', 'json', 'number'];
      if (!validTypes.includes(variableData.type)) {
        throw new Error(`Invalid type. Must be one of: ${validTypes.join(', ')}`);
      }

      // Validate value based on type
      if (variableData.type === 'number' && isNaN(Number(variableData.value))) {
        throw new Error('Value must be a valid number when type is "number"');
      }

      if (variableData.type === 'json') {
        try {
          JSON.parse(variableData.value);
        } catch (e) {
          throw new Error('Value must be valid JSON when type is "json"');
        }
      }

      const result = await this.db.execute(
        `INSERT INTO app_variables (
          keyname, value, type, description
        ) VALUES (?, ?, ?, ?)`,
        {
          keyname: variableData.keyname,
          value: variableData.value || '',
          type: variableData.type,
          description: variableData.description || null
        }
      );

      // Get the created variable
      const variableId = result.lastInsertRowid || result.lastInsertRowId || (result.rows && result.rows[0] && result.rows[0].id);
      
      return await this.getByKeyname(variableData.keyname);
    } catch (error) {
      console.error('[AppVariables-REPO] Create variable error:', error);
      throw error;
    }
  }

  /**
   * Get all app variables
   * @returns {Promise<Array>} Array of variables
   */
  async getAll() {
    try {
      const variables = await this.db.query(
        `SELECT * FROM app_variables 
         ORDER BY keyname ASC`,
        {}
      );

      return (variables || []).map(variable => ({
        id: variable.id,
        keyname: variable.keyname,
        value: variable.value,
        type: variable.type,
        create_date: variable.create_date,
        update_date: variable.update_date,
        description: variable.description
      }));
    } catch (error) {
      console.error('[AppVariables-REPO] Get all variables error:', error);
      throw error;
    }
  }

  /**
   * Get a variable by keyname
   * @param {string} keyname - Variable keyname
   * @returns {Promise<Object|null>} Variable or null if not found
   */
  async getByKeyname(keyname) {
    try {
      const variable = await this.db.queryOne(
        `SELECT * FROM app_variables 
         WHERE keyname = ?`,
        { keyname: keyname }
      );

      if (!variable) {
        return null;
      }

      return {
        id: variable.id,
        keyname: variable.keyname,
        value: variable.value,
        type: variable.type,
        create_date: variable.create_date,
        update_date: variable.update_date,
        description: variable.description
      };
    } catch (error) {
      console.error('[AppVariables-REPO] Get variable by keyname error:', error);
      throw error;
    }
  }

  /**
   * Get a variable by ID
   * @param {number} id - Variable ID
   * @returns {Promise<Object|null>} Variable or null if not found
   */
  async getById(id) {
    try {
      const variable = await this.db.queryOne(
        `SELECT * FROM app_variables 
         WHERE id = ?`,
        { id: id }
      );

      if (!variable) {
        return null;
      }

      return {
        id: variable.id,
        keyname: variable.keyname,
        value: variable.value,
        type: variable.type,
        create_date: variable.create_date,
        update_date: variable.update_date,
        description: variable.description
      };
    } catch (error) {
      console.error('[AppVariables-REPO] Get variable by ID error:', error);
      throw error;
    }
  }

  /**
   * Update an app variable
   * @param {string} keyname - Variable keyname
   * @param {Object} variableData - Updated variable data
   * @param {string} variableData.value - Updated value
   * @param {string} variableData.type - Updated type (optional)
   * @param {string} variableData.description - Updated description (optional)
   * @returns {Promise<boolean>} True if updated successfully
   */
  async update(keyname, variableData) {
    try {
      // If type is being updated, validate it
      if (variableData.type) {
        const validTypes = ['text', 'json', 'number'];
        if (!validTypes.includes(variableData.type)) {
          throw new Error(`Invalid type. Must be one of: ${validTypes.join(', ')}`);
        }
      }

      // Get existing variable to check current type
      const existing = await this.getByKeyname(keyname);
      if (!existing) {
        throw new Error(`Variable with keyname "${keyname}" not found`);
      }

      // Use provided type or existing type
      const type = variableData.type || existing.type;

      // Validate value based on type
      if (variableData.value !== undefined) {
        if (type === 'number' && isNaN(Number(variableData.value))) {
          throw new Error('Value must be a valid number when type is "number"');
        }

        if (type === 'json') {
          try {
            JSON.parse(variableData.value);
          } catch (e) {
            throw new Error('Value must be valid JSON when type is "json"');
          }
        }
      }

      // Build update query dynamically
      const updateFields = [];
      const params = { keyname: keyname };

      if (variableData.value !== undefined) {
        updateFields.push('value = ?');
        params.value = variableData.value;
      }

      if (variableData.type !== undefined) {
        updateFields.push('type = ?');
        params.type = variableData.type;
      }

      if (variableData.description !== undefined) {
        updateFields.push('description = ?');
        params.description = variableData.description;
      }

      if (updateFields.length === 0) {
        return true; // Nothing to update
      }

      // update_date is automatically updated by trigger
      const sql = `UPDATE app_variables SET 
        ${updateFields.join(', ')}, update_date = CURRENT_TIMESTAMP
        WHERE keyname = ?`;

      const result = await this.db.execute(sql, params);

      return result.changes > 0;
    } catch (error) {
      console.error('[AppVariables-REPO] Update variable error:', error);
      throw error;
    }
  }

  /**
   * Delete an app variable by keyname
   * @param {string} keyname - Variable keyname
   * @returns {Promise<boolean>} True if deleted successfully
   */
  async delete(keyname) {
    try {
      const result = await this.db.execute(
        `DELETE FROM app_variables 
         WHERE keyname = ?`,
        { keyname: keyname }
      );

      return result.changes > 0;
    } catch (error) {
      console.error('[AppVariables-REPO] Delete variable error:', error);
      throw error;
    }
  }

  /**
   * Delete an app variable by ID
   * @param {number} id - Variable ID
   * @returns {Promise<boolean>} True if deleted successfully
   */
  async deleteById(id) {
    try {
      const result = await this.db.execute(
        `DELETE FROM app_variables 
         WHERE id = ?`,
        { id: id }
      );

      return result.changes > 0;
    } catch (error) {
      console.error('[AppVariables-REPO] Delete variable by ID error:', error);
      throw error;
    }
  }
}

module.exports = AppVariablesRepository;


