const config = require('../../config/app');

// Conditional logging helper
function dbLog(...args) {
  if (config.DB_LOG) {
    console.log(...args);
  }
}

/**
 * ChatTemplate Repository - Handles all chat template database operations
 */
class ChatTemplateRepository {
  constructor(database) {
    this.db = database;
  }

  /**
   * Create a new chat template
   */
  async createTemplate(templateData) {
    try {
      // Use RETURNING id for PostgreSQL/Supabase compatibility
      // Handle conversation_rules as JSON string if it's an array
      const conversationRulesValue = templateData.conversation_rules 
        ? (Array.isArray(templateData.conversation_rules) 
            ? JSON.stringify(templateData.conversation_rules) 
            : templateData.conversation_rules)
        : null;

      const result = await this.db.execute(
        `INSERT INTO chattemplates (
          thema, persons, scenario, questions_and_thema, 
          words_to_use, words_not_to_use, grammar_to_use, level,
          communication_style, learning_goal, ai_role, conversation_rules
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`,
        {
          thema: templateData.thema || null,
          persons: templateData.persons || null,
          scenario: templateData.scenario || null,
          questions_and_thema: templateData.questions_and_thema || null,
          words_to_use: templateData.words_to_use || null,
          words_not_to_use: templateData.words_not_to_use || null,
          grammar_to_use: templateData.grammar_to_use || null,
          level: templateData.level || null,
          communication_style: templateData.communication_style || null,
          learning_goal: templateData.learning_goal || null,
          ai_role: templateData.ai_role || null,
          conversation_rules: conversationRulesValue
        }
      );

      // Handle both SQLite (lastInsertRowid) and PostgreSQL/Supabase (lastInsertRowId or rows[0].id)
      const templateId = result.lastInsertRowid || result.lastInsertRowId || (result.rows && result.rows[0] && result.rows[0].id) || null;

      if (!templateId) {
        throw new Error('Failed to get template ID after insertion');
      }

      return {
        id: templateId,
        ...templateData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    } catch (error) {
      console.error('[ChatTemplate-REPO] Create template error:', error);
      throw error;
    }
  }

  /**
   * Get all templates for a user
   */
  async getUserTemplates(userId) {
    try {
      // Get user's template associations
      const associations = await this.db.query(
        `SELECT template_id FROM user_chattemplates WHERE user_id = ?`,
        { user_id: userId }
      );

      if (!associations || associations.length === 0) {
        return [];
      }

      // Extract template IDs
      const templateIds = associations.map(a => a.template_id);

      // Build query with template IDs
      const idPlaceholders = templateIds.map(() => '?').join(',');
      const idParams = {};
      templateIds.forEach((id, idx) => {
        idParams[`id${idx}`] = id;
      });

      // Get templates by IDs
      const templates = await this.db.query(
        `SELECT * FROM chattemplates 
         WHERE id IN (${idPlaceholders})
         ORDER BY created_at DESC`,
        idParams
      );

      return (templates || []).map(template => {
        // Parse conversation_rules if it's a JSON string
        let conversationRules = template.conversation_rules;
        if (conversationRules && typeof conversationRules === 'string') {
          try {
            conversationRules = JSON.parse(conversationRules);
          } catch (e) {
            // If parsing fails, keep as string
          }
        }

        return {
          id: template.id,
          thema: template.thema,
          persons: template.persons,
          scenario: template.scenario,
          questions_and_thema: template.questions_and_thema,
          words_to_use: template.words_to_use,
          words_not_to_use: template.words_not_to_use,
          grammar_to_use: template.grammar_to_use,
          level: template.level,
          communication_style: template.communication_style,
          learning_goal: template.learning_goal,
          ai_role: template.ai_role,
          conversation_rules: conversationRules,
          created_at: template.created_at,
          updated_at: template.updated_at
        };
      });
    } catch (error) {
      console.error('[ChatTemplate-REPO] Get user templates error:', error);
      throw error;
    }
  }

  /**
   * Get a template by ID
   */
  async getTemplateById(templateId) {
    try {
      const template = await this.db.queryOne(
        'SELECT * FROM chattemplates WHERE id = ?',
        { id: templateId }
      );

      if (!template) {
        return null;
      }

      // Parse conversation_rules if it's a JSON string
      let conversationRules = template.conversation_rules;
      if (conversationRules && typeof conversationRules === 'string') {
        try {
          conversationRules = JSON.parse(conversationRules);
        } catch (e) {
          // If parsing fails, keep as string
        }
      }

      return {
        id: template.id,
        thema: template.thema,
        persons: template.persons,
        scenario: template.scenario,
        questions_and_thema: template.questions_and_thema,
        words_to_use: template.words_to_use,
        words_not_to_use: template.words_not_to_use,
        grammar_to_use: template.grammar_to_use,
        level: template.level,
        communication_style: template.communication_style,
        learning_goal: template.learning_goal,
        ai_role: template.ai_role,
        conversation_rules: conversationRules,
        created_at: template.created_at,
        updated_at: template.updated_at
      };
    } catch (error) {
      console.error('[ChatTemplate-REPO] Get template by ID error:', error);
      throw error;
    }
  }

  /**
   * Update a template
   */
  async updateTemplate(templateId, templateData) {
    try {
      // Handle conversation_rules as JSON string if it's an array
      const conversationRulesValue = templateData.conversation_rules 
        ? (Array.isArray(templateData.conversation_rules) 
            ? JSON.stringify(templateData.conversation_rules) 
            : templateData.conversation_rules)
        : null;

      const result = await this.db.execute(
        `UPDATE chattemplates SET 
          thema = ?, persons = ?, scenario = ?, questions_and_thema = ?,
          words_to_use = ?, words_not_to_use = ?, grammar_to_use = ?,
          level = ?, communication_style = ?, learning_goal = ?, 
          ai_role = ?, conversation_rules = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`,
        {
          thema: templateData.thema || null,
          persons: templateData.persons || null,
          scenario: templateData.scenario || null,
          questions_and_thema: templateData.questions_and_thema || null,
          words_to_use: templateData.words_to_use || null,
          words_not_to_use: templateData.words_not_to_use || null,
          grammar_to_use: templateData.grammar_to_use || null,
          level: templateData.level || null,
          communication_style: templateData.communication_style || null,
          learning_goal: templateData.learning_goal || null,
          ai_role: templateData.ai_role || null,
          conversation_rules: conversationRulesValue,
          id: templateId
        }
      );

      return result.changes > 0;
    } catch (error) {
      console.error('[ChatTemplate-REPO] Update template error:', error);
      throw error;
    }
  }

  /**
   * Delete a template
   */
  async deleteTemplate(templateId) {
    try {
      // Delete user associations first
      await this.db.execute(
        'DELETE FROM user_chattemplates WHERE template_id = ?',
        { template_id: templateId }
      );

      // Delete the template
      const result = await this.db.execute(
        'DELETE FROM chattemplates WHERE id = ?',
        { id: templateId }
      );

      return result.changes > 0;
    } catch (error) {
      console.error('[ChatTemplate-REPO] Delete template error:', error);
      throw error;
    }
  }

  /**
   * Associate a template with a user
   */
  async addTemplateToUser(userId, templateId) {
    try {
      const result = await this.db.execute(
        `INSERT INTO user_chattemplates (user_id, template_id) 
         VALUES (?, ?)`,
        { user_id: userId, template_id: templateId }
      );

      return result.changes > 0;
    } catch (error) {
      // If already exists, that's okay
      if (error.message && error.message.includes('UNIQUE constraint')) {
        return true;
      }
      console.error('[ChatTemplate-REPO] Add template to user error:', error);
      throw error;
    }
  }

  /**
   * Remove a template from a user
   */
  async removeTemplateFromUser(userId, templateId) {
    try {
      const result = await this.db.execute(
        `DELETE FROM user_chattemplates 
         WHERE user_id = ? AND template_id = ?`,
        { user_id: userId, template_id: templateId }
      );

      return result.changes > 0;
    } catch (error) {
      console.error('[ChatTemplate-REPO] Remove template from user error:', error);
      throw error;
    }
  }

  /**
   * Create a template and associate it with a user
   */
  async createTemplateForUser(userId, templateData) {
    try {
      // Create the template
      const template = await this.createTemplate(templateData);
      
      // Ensure we have a valid template ID
      if (!template || !template.id) {
        throw new Error('Failed to create template: No ID returned');
      }
      
      // Associate with user
      await this.addTemplateToUser(userId, template.id);
      
      return template;
    } catch (error) {
      console.error('[ChatTemplate-REPO] Create template for user error:', error);
      throw error;
    }
  }
}

module.exports = ChatTemplateRepository;

