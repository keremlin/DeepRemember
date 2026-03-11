const express = require('express');
const databaseFactory = require('../database/access/DatabaseFactory');
const dbConfig = require('../config/database');
const GamesRepository = require('../database/access/GamesRepository');
const AuthMiddleware = require('../security/authMiddleware');

const router = express.Router();
const authMiddleware = new AuthMiddleware();

let gamesRepository = null;
let useDatabase = false;

// Initialize repository
async function initializeRepository() {
  try {
    let database;
    try {
      database = databaseFactory.getDatabase();
    } catch (error) {
      await databaseFactory.initialize(dbConfig.type, dbConfig[dbConfig.type]);
      database = databaseFactory.getDatabase();
    }
    gamesRepository = new GamesRepository(database);
    useDatabase = true;
    console.log('[Games] Repository initialized successfully');
  } catch (error) {
    console.error('[Games] Repository initialization failed:', error);
    useDatabase = false;
  }
}

initializeRepository();

// ─────────────────────────────────────────────────────────────
// GET /api/games/artikel/words
// Return a smart word selection for a new Artikel-game round.
// Distribution: 40 % new · 35 % previously wrong · 25 % correct (oldest first)
// Query: ?count=30  (default 30)
// ─────────────────────────────────────────────────────────────
router.get('/artikel/words', authMiddleware.verifyToken, async (req, res) => {
  try {
    if (!useDatabase || !gamesRepository) {
      return res.status(503).json({ success: false, error: 'Database not available' });
    }
    const userId = req.userId;
    const count = req.query.count ? parseInt(req.query.count) : 30;
    const words = await gamesRepository.getArtikelWordSelection(userId, count);
    res.json({ success: true, words });
  } catch (error) {
    console.error('[Games] GET /artikel/words error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/games
// List all game definitions
// ─────────────────────────────────────────────────────────────
router.get('/', authMiddleware.verifyToken, async (req, res) => {
  try {
    if (!useDatabase || !gamesRepository) {
      return res.status(503).json({ success: false, error: 'Database not available' });
    }
    const games = await gamesRepository.getAllGames();
    res.json({ success: true, games });
  } catch (error) {
    console.error('[Games] GET / error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/games/data
// Save a game session result
// Body: { gameId, correct, total, level? }
// Score formula: Score = C * (C/G) * 100  (rounded)
// ─────────────────────────────────────────────────────────────
router.post('/data', authMiddleware.verifyToken, async (req, res) => {
  try {
    if (!useDatabase || !gamesRepository) {
      return res.status(503).json({ success: false, error: 'Database not available' });
    }

    const userId = req.userId;
    const { gameId, correct, total, level, wordAnswers } = req.body;

    if (!gameId) {
      return res.status(400).json({ success: false, error: 'gameId is required' });
    }

    const C = parseInt(correct) || 0;
    const G = parseInt(total) || 0;

    // Accuracy-Based Score: Score = C * (C/G) * 100
    const score = G > 0 ? Math.round((C * C / G) * 100) : 0;

    const entry = await gamesRepository.saveGameData({
      name: 'Artikel-Spiel',
      level: level || '1',
      userId,
      gameId: parseInt(gameId),
      score
    });

    // Upsert per-word answer stats when word-level data is provided
    if (Array.isArray(wordAnswers) && wordAnswers.length > 0) {
      for (const wa of wordAnswers) {
        if (!wa.wordBaseId) continue;
        await gamesRepository.upsertArtikelUserWordAnswer({
          wordBaseId:    wa.wordBaseId,
          userId,
          correctDelta:  wa.correct || 0,
          wrongDelta:    wa.wrong   || 0,
          lastAnswer:    wa.correct > 0 ? 'correct' : 'wrong',
          lastGameDataId: entry?.id ?? null
        });
      }
    }

    const bestScore = await gamesRepository.getBestScore(userId, parseInt(gameId));

    res.json({
      success: true,
      entry,
      score,
      bestScore,
      accuracy: G > 0 ? Math.round((C / G) * 100) : 0
    });
  } catch (error) {
    console.error('[Games] POST /data error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/games/data
// Get game history for the authenticated user
// Query: ?gameId=1
// ─────────────────────────────────────────────────────────────
router.get('/data', authMiddleware.verifyToken, async (req, res) => {
  try {
    if (!useDatabase || !gamesRepository) {
      return res.status(503).json({ success: false, error: 'Database not available' });
    }

    const userId = req.userId;
    const gameId = req.query.gameId ? parseInt(req.query.gameId) : null;

    const data = await gamesRepository.getGameDataByUser(userId, gameId);
    const bestScore = gameId ? await gamesRepository.getBestScore(userId, gameId) : null;

    res.json({ success: true, data, bestScore });
  } catch (error) {
    console.error('[Games] GET /data error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
