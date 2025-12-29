const express = require('express');
const databaseFactory = require('../database/access/DatabaseFactory');
const dbConfig = require('../config/database');
const authMiddleware = require('../security/authMiddleware');

const router = express.Router();
const auth = new authMiddleware();

let srsRepository = null;

// Initialize database
async function initializeDatabase() {
  try {
    if (!srsRepository) {
      srsRepository = await databaseFactory.initialize(dbConfig.type, dbConfig[dbConfig.type]);
    }
  } catch (error) {
    console.error('[TIMER] Database initialization failed:', error);
  }
}

// Initialize on startup
initializeDatabase();

// Start a new timer session
router.post('/start', auth.verifyToken.bind(auth), async (req, res) => {
  try {
    const userId = req.userId;
    const { activity } = req.body;
    const activityValue = activity || 'review_card';
    
    if (!srsRepository) {
      await initializeDatabase();
    }

    // Check if there's an active session for this activity
    const activeSession = await srsRepository.getActiveTimerSession(userId, activityValue);
    if (activeSession) {
      // Return existing active session
      return res.json({
        success: true,
        session: activeSession,
        message: 'Active session already exists'
      });
    }

    // Start new session
    const session = await srsRepository.startTimerSession(userId, activityValue);
    
    res.json({
      success: true,
      session,
      message: 'Timer session started'
    });
  } catch (error) {
    console.error('[TIMER] Start session error:', error);
    res.status(500).json({ error: 'Failed to start timer session' });
  }
});

// Pause/save a timer session
router.post('/pause', auth.verifyToken.bind(auth), async (req, res) => {
  try {
    const userId = req.userId;
    const { sessionId, lengthSeconds } = req.body;
    
    if (lengthSeconds === undefined) {
      return res.status(400).json({ error: 'lengthSeconds is required' });
    }

    if (!srsRepository) {
      await initializeDatabase();
    }

    // Always get the active session from database to ensure we're updating the correct one
    let activeSession = await srsRepository.getActiveTimerSession(userId);
    
    // Verify the session is truly active (end_datetime should be NULL)
    if (activeSession && activeSession.end_datetime !== null && activeSession.end_datetime !== '') {
      activeSession = null;
    }
    
    if (!activeSession) {
      return res.status(404).json({ error: 'No active session found' });
    }

    // Use the active session ID from database
    const actualSessionId = activeSession.id;
    const session = await srsRepository.saveTimerSession(userId, actualSessionId, lengthSeconds);
    
    res.json({
      success: true,
      session,
      message: 'Timer session paused and saved'
    });
  } catch (error) {
    console.error('[TIMER] Pause session error:', error);
    res.status(500).json({ error: 'Failed to pause timer session', details: error.message });
  }
});

// Resume timer (start new session after pause)
router.post('/resume', auth.verifyToken.bind(auth), async (req, res) => {
  try {
    const userId = req.userId;
    const { activity } = req.body;
    const activityValue = activity || 'review_card';
    
    if (!srsRepository) {
      await initializeDatabase();
    }

    // Always create a NEW session when resuming (don't reuse old sessions)
    const session = await srsRepository.startTimerSession(userId, activityValue);
    
    res.json({
      success: true,
      session,
      message: 'Timer session resumed (new session created)'
    });
  } catch (error) {
    console.error('[TIMER] Resume session error:', error);
    res.status(500).json({ error: 'Failed to resume timer session' });
  }
});

// End timer session (save and close)
router.post('/end', auth.verifyToken.bind(auth), async (req, res) => {
  try {
    const userId = req.userId;
    const { sessionId, lengthSeconds } = req.body;
    
    if (lengthSeconds === undefined) {
      return res.status(400).json({ error: 'lengthSeconds is required' });
    }

    if (!srsRepository) {
      await initializeDatabase();
    }

    // Always get the active session from database to ensure we're updating the correct one
    let activeSession = await srsRepository.getActiveTimerSession(userId);
    
    if (!activeSession) {
      return res.status(404).json({ error: 'No active session found' });
    }

    // Use the active session ID from database
    const actualSessionId = activeSession.id;
    const session = await srsRepository.saveTimerSession(userId, actualSessionId, lengthSeconds);
    
    res.json({
      success: true,
      session,
      message: 'Timer session ended and saved'
    });
  } catch (error) {
    console.error('[TIMER] End session error:', error);
    res.status(500).json({ error: 'Failed to end timer session' });
  }
});

// Get today's total time
router.get('/today-total', auth.verifyToken.bind(auth), async (req, res) => {
  try {
    const userId = req.userId;
    const activity = req.query.activity || null;
    
    if (!srsRepository) {
      await initializeDatabase();
    }

    const totalSeconds = await srsRepository.getTodayTotalTime(userId, activity);
    
    res.json({
      success: true,
      totalSeconds,
      message: 'Today\'s total time retrieved'
    });
  } catch (error) {
    console.error('[TIMER] Get today total error:', error);
    res.status(500).json({ error: 'Failed to get today\'s total time', details: error.message });
  }
});

// Get active session
router.get('/active', auth.verifyToken.bind(auth), async (req, res) => {
  try {
    const userId = req.userId;
    const activity = req.query.activity || null;
    
    if (!srsRepository) {
      await initializeDatabase();
    }

    const session = await srsRepository.getActiveTimerSession(userId, activity);
    
    res.json({
      success: true,
      session,
      message: 'Active session retrieved'
    });
  } catch (error) {
    console.error('[TIMER] Get active session error:', error);
    res.status(500).json({ error: 'Failed to get active session' });
  }
});

module.exports = router;

