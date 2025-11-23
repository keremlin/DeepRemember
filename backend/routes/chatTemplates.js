const express = require('express');
const databaseFactory = require('../database/access/DatabaseFactory');
const dbConfig = require('../config/database');
const ChatTemplateRepository = require('../database/access/ChatTemplateRepository');
const AuthMiddleware = require('../security/authMiddleware');

const router = express.Router();
const authMiddleware = new AuthMiddleware();

let chatTemplateRepository = null;
let useDatabase = false;

// Initialize repository
async function initializeRepository() {
  try {
    // Check if database is already initialized, if not initialize it
    let database;
    try {
      database = databaseFactory.getDatabase();
    } catch (error) {
      // Database not initialized yet, initialize it
      await databaseFactory.initialize(dbConfig.type, dbConfig[dbConfig.type]);
      database = databaseFactory.getDatabase();
    }
    
    chatTemplateRepository = new ChatTemplateRepository(database);
    useDatabase = true;
    console.log('[ChatTemplates] Repository initialized successfully');
  } catch (error) {
    console.error('[ChatTemplates] Repository initialization failed:', error);
    useDatabase = false;
  }
}

// Initialize on startup
initializeRepository();

// Get all templates for the authenticated user
router.get('/', authMiddleware.verifyToken, async (req, res) => {
  try {
    if (!useDatabase || !chatTemplateRepository) {
      return res.status(503).json({ error: 'Database not available' });
    }

    const userId = req.userId;
    const templates = await chatTemplateRepository.getUserTemplates(userId);

    res.json({ success: true, templates });
  } catch (error) {
    console.error('[ChatTemplates] Get templates error:', error);
    res.status(500).json({ error: 'Failed to get templates' });
  }
});

// Get a single template by ID
router.get('/:id', authMiddleware.verifyToken, async (req, res) => {
  try {
    if (!useDatabase || !chatTemplateRepository) {
      return res.status(503).json({ error: 'Database not available' });
    }

    const templateId = parseInt(req.params.id);
    const userId = req.userId;

    // Check if user has access to this template
    const userTemplates = await chatTemplateRepository.getUserTemplates(userId);
    const template = userTemplates.find(t => t.id === templateId);

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json({ success: true, template });
  } catch (error) {
    console.error('[ChatTemplates] Get template error:', error);
    res.status(500).json({ error: 'Failed to get template' });
  }
});

// Create a new template
router.post('/', authMiddleware.verifyToken, async (req, res) => {
  try {
    if (!useDatabase || !chatTemplateRepository) {
      return res.status(503).json({ error: 'Database not available' });
    }

    const userId = req.userId;
    const {
      thema,
      persons,
      scenario,
      questions_and_thema,
      words_to_use,
      words_not_to_use,
      grammar_to_use,
      level
    } = req.body;

    // Validate level if provided
    if (level && !['A1', 'A2', 'B1', 'B2'].includes(level)) {
      return res.status(400).json({ error: 'Invalid level. Must be A1, A2, B1, or B2' });
    }

    const templateData = {
      thema: thema || null,
      persons: persons || null,
      scenario: scenario || null,
      questions_and_thema: questions_and_thema || null,
      words_to_use: words_to_use || null,
      words_not_to_use: words_not_to_use || null,
      grammar_to_use: grammar_to_use || null,
      level: level || null
    };

    const template = await chatTemplateRepository.createTemplateForUser(userId, templateData);

    res.json({ success: true, template });
  } catch (error) {
    console.error('[ChatTemplates] Create template error:', error);
    res.status(500).json({ error: 'Failed to create template' });
  }
});

// Update a template
router.put('/:id', authMiddleware.verifyToken, async (req, res) => {
  try {
    if (!useDatabase || !chatTemplateRepository) {
      return res.status(503).json({ error: 'Database not available' });
    }

    const templateId = parseInt(req.params.id);
    const userId = req.userId;

    // Check if user has access to this template
    const userTemplates = await chatTemplateRepository.getUserTemplates(userId);
    const template = userTemplates.find(t => t.id === templateId);

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const {
      thema,
      persons,
      scenario,
      questions_and_thema,
      words_to_use,
      words_not_to_use,
      grammar_to_use,
      level
    } = req.body;

    // Validate level if provided
    if (level && !['A1', 'A2', 'B1', 'B2'].includes(level)) {
      return res.status(400).json({ error: 'Invalid level. Must be A1, A2, B1, or B2' });
    }

    const templateData = {
      thema: thema !== undefined ? thema : null,
      persons: persons !== undefined ? persons : null,
      scenario: scenario !== undefined ? scenario : null,
      questions_and_thema: questions_and_thema !== undefined ? questions_and_thema : null,
      words_to_use: words_to_use !== undefined ? words_to_use : null,
      words_not_to_use: words_not_to_use !== undefined ? words_not_to_use : null,
      grammar_to_use: grammar_to_use !== undefined ? grammar_to_use : null,
      level: level !== undefined ? level : null
    };

    const success = await chatTemplateRepository.updateTemplate(templateId, templateData);

    if (!success) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const updatedTemplate = await chatTemplateRepository.getTemplateById(templateId);
    res.json({ success: true, template: updatedTemplate });
  } catch (error) {
    console.error('[ChatTemplates] Update template error:', error);
    res.status(500).json({ error: 'Failed to update template' });
  }
});

// Delete a template
router.delete('/:id', authMiddleware.verifyToken, async (req, res) => {
  try {
    if (!useDatabase || !chatTemplateRepository) {
      return res.status(503).json({ error: 'Database not available' });
    }

    const templateId = parseInt(req.params.id);
    const userId = req.userId;

    // Check if user has access to this template
    const userTemplates = await chatTemplateRepository.getUserTemplates(userId);
    const template = userTemplates.find(t => t.id === templateId);

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const success = await chatTemplateRepository.deleteTemplate(templateId);

    if (!success) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('[ChatTemplates] Delete template error:', error);
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

module.exports = router;

