const express = require('express');
const databaseFactory = require('../database/access/DatabaseFactory');
const dbConfig = require('../config/database');
const UserConfigRepository = require('../database/access/UserConfigRepository');
const AuthMiddleware = require('../security/authMiddleware');

const router = express.Router();
const authMiddleware = new AuthMiddleware();

let userConfigRepository = null;
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
    
    userConfigRepository = new UserConfigRepository(database);
    useDatabase = true;
    console.log('[UserConfigs] Repository initialized successfully');
  } catch (error) {
    console.error('[UserConfigs] Repository initialization failed:', error);
    useDatabase = false;
  }
}

// Initialize on startup
initializeRepository();

// Get all configurations for the authenticated user
router.get('/', authMiddleware.verifyToken, async (req, res) => {
  try {
    if (!useDatabase || !userConfigRepository) {
      return res.status(503).json({ error: 'Database not available' });
    }

    const userId = req.userId;
    const configs = await userConfigRepository.getUserConfigs(userId);

    res.json({ success: true, configs });
  } catch (error) {
    console.error('[UserConfigs] Get configs error:', error);
    res.status(500).json({ error: 'Failed to get configurations' });
  }
});

// Get configurations by name for the authenticated user
router.get('/name/:name', authMiddleware.verifyToken, async (req, res) => {
  try {
    if (!useDatabase || !userConfigRepository) {
      return res.status(503).json({ error: 'Database not available' });
    }

    const userId = req.userId;
    const name = req.params.name;
    const configs = await userConfigRepository.getConfigsByName(userId, name);

    res.json({ success: true, configs });
  } catch (error) {
    console.error('[UserConfigs] Get configs by name error:', error);
    res.status(500).json({ error: 'Failed to get configurations by name' });
  }
});

// Get a single configuration by ID
router.get('/:id', authMiddleware.verifyToken, async (req, res) => {
  try {
    if (!useDatabase || !userConfigRepository) {
      return res.status(503).json({ error: 'Database not available' });
    }

    const configId = parseInt(req.params.id);
    const userId = req.userId;

    const config = await userConfigRepository.getConfigById(userId, configId);

    if (!config) {
      return res.status(404).json({ error: 'Configuration not found' });
    }

    res.json({ success: true, config });
  } catch (error) {
    console.error('[UserConfigs] Get config error:', error);
    res.status(500).json({ error: 'Failed to get configuration' });
  }
});

// Create a new configuration
router.post('/', authMiddleware.verifyToken, async (req, res) => {
  try {
    if (!useDatabase || !userConfigRepository) {
      return res.status(503).json({ error: 'Database not available' });
    }

    const userId = req.userId;
    const { name, label, value_type, value } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }

    // Validate value_type if provided
    const validValueTypes = ['string', 'number', 'boolean', 'json'];
    const finalValueType = value_type || 'string';
    if (!validValueTypes.includes(finalValueType)) {
      return res.status(400).json({ 
        error: `Invalid value_type. Must be one of: ${validValueTypes.join(', ')}` 
      });
    }

    const configData = {
      name,
      label: label || name,
      value_type: finalValueType,
      value: value !== undefined ? String(value) : ''
    };

    const config = await userConfigRepository.createConfig(userId, configData);

    res.json({ success: true, config });
  } catch (error) {
    console.error('[UserConfigs] Create config error:', error);
    res.status(500).json({ error: 'Failed to create configuration' });
  }
});

// Update a configuration
router.put('/:id', authMiddleware.verifyToken, async (req, res) => {
  try {
    if (!useDatabase || !userConfigRepository) {
      return res.status(503).json({ error: 'Database not available' });
    }

    const configId = parseInt(req.params.id);
    const userId = req.userId;

    // Check if config exists and belongs to user
    const existingConfig = await userConfigRepository.getConfigById(userId, configId);
    if (!existingConfig) {
      return res.status(404).json({ error: 'Configuration not found' });
    }

    const { name, label, value_type, value } = req.body;

    // Validate value_type if provided
    const validValueTypes = ['string', 'number', 'boolean', 'json'];
    if (value_type && !validValueTypes.includes(value_type)) {
      return res.status(400).json({ 
        error: `Invalid value_type. Must be one of: ${validValueTypes.join(', ')}` 
      });
    }

    const configData = {
      name: name !== undefined ? name : existingConfig.name,
      label: label !== undefined ? label : existingConfig.label,
      value_type: value_type !== undefined ? value_type : existingConfig.value_type,
      value: value !== undefined ? String(value) : existingConfig.value
    };

    const success = await userConfigRepository.updateConfig(userId, configId, configData);

    if (!success) {
      return res.status(404).json({ error: 'Configuration not found' });
    }

    const updatedConfig = await userConfigRepository.getConfigById(userId, configId);
    res.json({ success: true, config: updatedConfig });
  } catch (error) {
    console.error('[UserConfigs] Update config error:', error);
    res.status(500).json({ error: 'Failed to update configuration' });
  }
});

// Delete a configuration
router.delete('/:id', authMiddleware.verifyToken, async (req, res) => {
  try {
    if (!useDatabase || !userConfigRepository) {
      return res.status(503).json({ error: 'Database not available' });
    }

    const configId = parseInt(req.params.id);
    const userId = req.userId;

    // Check if config exists and belongs to user
    const existingConfig = await userConfigRepository.getConfigById(userId, configId);
    if (!existingConfig) {
      return res.status(404).json({ error: 'Configuration not found' });
    }

    const success = await userConfigRepository.deleteConfig(userId, configId);

    if (!success) {
      return res.status(404).json({ error: 'Configuration not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('[UserConfigs] Delete config error:', error);
    res.status(500).json({ error: 'Failed to delete configuration' });
  }
});

// Delete all configurations with a given name
router.delete('/name/:name', authMiddleware.verifyToken, async (req, res) => {
  try {
    if (!useDatabase || !userConfigRepository) {
      return res.status(503).json({ error: 'Database not available' });
    }

    const userId = req.userId;
    const name = req.params.name;

    const deletedCount = await userConfigRepository.deleteConfigsByName(userId, name);

    res.json({ success: true, deletedCount });
  } catch (error) {
    console.error('[UserConfigs] Delete configs by name error:', error);
    res.status(500).json({ error: 'Failed to delete configurations by name' });
  }
});

module.exports = router;


