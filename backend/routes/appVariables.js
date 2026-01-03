const express = require('express');
const databaseFactory = require('../database/access/DatabaseFactory');
const dbConfig = require('../config/database');
const AppVariablesRepository = require('../database/access/AppVariablesRepository');
const CachedRepository = require('../database/access/DbCache/CachedRepository');
const AuthMiddleware = require('../security/authMiddleware');

const router = express.Router();
const authMiddleware = new AuthMiddleware();

let appVariablesRepository = null;
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
    
    // Create base repository and wrap it with cache
    const baseRepository = new AppVariablesRepository(database);
    appVariablesRepository = new CachedRepository(baseRepository, {
      keyField: 'keyname',
      getByKeyMethod: 'getByKeyname'
    });
    useDatabase = true;
    console.log('[AppVariables] Repository initialized successfully with cache');
  } catch (error) {
    console.error('[AppVariables] Repository initialization failed:', error);
    useDatabase = false;
  }
}

// Initialize on startup
initializeRepository();

// Get all app variables
router.get('/', authMiddleware.verifyToken, async (req, res) => {
  try {
    if (!useDatabase || !appVariablesRepository) {
      return res.status(503).json({ error: 'Database not available' });
    }

    const variables = await appVariablesRepository.getAll();

    res.json({ success: true, variables });
  } catch (error) {
    console.error('[AppVariables] Get variables error:', error);
    res.status(500).json({ error: 'Failed to get app variables' });
  }
});

// Get a variable by keyname
router.get('/keyname/:keyname', authMiddleware.verifyToken, async (req, res) => {
  try {
    if (!useDatabase || !appVariablesRepository) {
      return res.status(503).json({ error: 'Database not available' });
    }

    const keyname = req.params.keyname;
    const variable = await appVariablesRepository.getByKeyname(keyname);

    if (!variable) {
      return res.status(404).json({ error: 'Variable not found' });
    }

    res.json({ success: true, variable });
  } catch (error) {
    console.error('[AppVariables] Get variable by keyname error:', error);
    res.status(500).json({ error: 'Failed to get app variable' });
  }
});

// Get a variable by ID
router.get('/:id', authMiddleware.verifyToken, async (req, res) => {
  try {
    if (!useDatabase || !appVariablesRepository) {
      return res.status(503).json({ error: 'Database not available' });
    }

    const id = parseInt(req.params.id);
    const variable = await appVariablesRepository.getById(id);

    if (!variable) {
      return res.status(404).json({ error: 'Variable not found' });
    }

    res.json({ success: true, variable });
  } catch (error) {
    console.error('[AppVariables] Get variable error:', error);
    res.status(500).json({ error: 'Failed to get app variable' });
  }
});

// Create a new app variable
router.post('/', authMiddleware.verifyToken, async (req, res) => {
  try {
    if (!useDatabase || !appVariablesRepository) {
      return res.status(503).json({ error: 'Database not available' });
    }

    const { keyname, value, type, description } = req.body;

    if (!keyname) {
      return res.status(400).json({ error: 'keyname is required' });
    }

    if (!type) {
      return res.status(400).json({ error: 'type is required' });
    }

    // Validate type
    const validTypes = ['text', 'json', 'number'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ 
        error: `Invalid type. Must be one of: ${validTypes.join(', ')}` 
      });
    }

    const variableData = {
      keyname,
      value: value !== undefined ? String(value) : '',
      type,
      description: description || null
    };

    const variable = await appVariablesRepository.create(variableData);

    res.json({ success: true, variable });
  } catch (error) {
    console.error('[AppVariables] Create variable error:', error);
    res.status(500).json({ error: error.message || 'Failed to create app variable' });
  }
});

// Update an app variable by keyname
router.put('/keyname/:keyname', authMiddleware.verifyToken, async (req, res) => {
  try {
    if (!useDatabase || !appVariablesRepository) {
      return res.status(503).json({ error: 'Database not available' });
    }

    const keyname = req.params.keyname;
    const { value, type, description } = req.body;

    // Check if variable exists
    const existingVariable = await appVariablesRepository.getByKeyname(keyname);
    if (!existingVariable) {
      return res.status(404).json({ error: 'Variable not found' });
    }

    const variableData = {};
    if (value !== undefined) variableData.value = String(value);
    if (type !== undefined) variableData.type = type;
    if (description !== undefined) variableData.description = description;

    const success = await appVariablesRepository.update(keyname, variableData);

    if (!success) {
      return res.status(404).json({ error: 'Variable not found' });
    }

    const updatedVariable = await appVariablesRepository.getByKeyname(keyname);
    res.json({ success: true, variable: updatedVariable });
  } catch (error) {
    console.error('[AppVariables] Update variable error:', error);
    res.status(500).json({ error: error.message || 'Failed to update app variable' });
  }
});

// Delete an app variable by keyname
router.delete('/keyname/:keyname', authMiddleware.verifyToken, async (req, res) => {
  try {
    if (!useDatabase || !appVariablesRepository) {
      return res.status(503).json({ error: 'Database not available' });
    }

    const keyname = req.params.keyname;

    // Check if variable exists
    const existingVariable = await appVariablesRepository.getByKeyname(keyname);
    if (!existingVariable) {
      return res.status(404).json({ error: 'Variable not found' });
    }

    const success = await appVariablesRepository.delete(keyname);

    if (!success) {
      return res.status(404).json({ error: 'Variable not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('[AppVariables] Delete variable error:', error);
    res.status(500).json({ error: 'Failed to delete app variable' });
  }
});

module.exports = router;

