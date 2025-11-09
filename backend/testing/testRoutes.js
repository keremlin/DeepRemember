const express = require('express');
const router = express.Router();
const dbConfig = require('../config/database');
const appConfig = require('../config/app');
const FileSystemFactory = require('../filesystem/FileSystemFactory');
const databaseFactory = require('../database/access/DatabaseFactory');
const { checkGoogleApiHealth } = require('./googleApiHealthCheck');

/**
 * Test API endpoint - Only accessible when TEST_API=true in .env
 * Returns comprehensive information about server configuration, services, and endpoints
 * 
 * @route GET /api/test/local112358
 * @access Public (but only when TEST_API=true)
 */
router.get('/local112358', async (req, res) => {
  // Log test API request
  console.log('[TEST-API] Test API endpoint requested from', req.ip || req.connection.remoteAddress);
  
  // Check if TEST_API is enabled
  if (process.env.TEST_API !== 'true') {
    return res.status(403).json({
      success: false,
      error: 'Test API is disabled. Set TEST_API=true in .env to enable.',
      message: 'This endpoint is only available when TEST_API=true'
    });
  }

  const baseUrl = `${req.protocol}://${req.get('host')}`;
  const port = process.env.PORT || 4004;

  // Get Supabase configuration
  const supabaseConfig = {
    enabled: dbConfig.type === 'supabase' || dbConfig.type === 'supabase-js-client',
    type: dbConfig.type,
    url: process.env.SUPABASE_URL || '',
    anonKey: process.env.SUPABASE_ANON_KEY ? 
      `${process.env.SUPABASE_ANON_KEY.substring(0, 20)}...` : '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? 
      `${process.env.SUPABASE_SERVICE_ROLE_KEY.substring(0, 20)}...` : '',
    schema: dbConfig.supabase.schema,
    dbUrl: process.env.SUPABASE_DB_URL ? 
      process.env.SUPABASE_DB_URL.replace(/:[^:@]+@/, ':****@') : '', // Mask password
    configured: !!(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY)
  };

  // Get Google configuration
  const googleConfig = {
    drive: {
      enabled: (process.env.FS_TYPE || '').toLowerCase() === 'google',
      clientId: process.env.GOOGLE_CLIENT_ID ? 
        `${process.env.GOOGLE_CLIENT_ID.substring(0, 20)}...` : '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ? 
        '****' : '',
      redirectUri: process.env.GOOGLE_REDIRECT_URI || '',
      accessToken: process.env.GOOGLE_ACCESS_TOKEN ? 
        `${process.env.GOOGLE_ACCESS_TOKEN.substring(0, 20)}...` : '',
      refreshToken: process.env.GOOGLE_REFRESH_TOKEN ? 
        `${process.env.GOOGLE_REFRESH_TOKEN.substring(0, 20)}...` : '',
      rootFolderId: process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || 'root',
      basePath: process.env.GOOGLE_DRIVE_BASE_PATH || '/DeepRemember',
      configured: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)
    },
    tts: {
      enabled: (appConfig.TTS_TYPE || '').toLowerCase() === 'google',
      voice: appConfig.GOOGLE_TTS_VOICE,
      languageCode: appConfig.GOOGLE_TTS_LANGUAGE_CODE,
      ssmlGender: appConfig.GOOGLE_TTS_SSML_GENDER,
      audioEncoding: appConfig.GOOGLE_TTS_AUDIO_ENCODING,
      credentialsPath: process.env.GOOGLE_APPLICATION_CREDENTIALS || '',
      configured: !!process.env.GOOGLE_APPLICATION_CREDENTIALS
    }
  };

  // Get database configuration
  const databaseConfig = {
    type: dbConfig.type,
    sqlite: {
      enabled: dbConfig.type === 'sqlite',
      dbPath: dbConfig.sqlite.dbPath,
      configured: true
    },
    supabase: supabaseConfig,
    pool: dbConfig.pool
  };

  // Get file system configuration
  const fileSystemConfig = {
    type: FileSystemFactory.getDefaultType(),
    rootDir: process.env.FS_ROOT_DIR || '',
    google: googleConfig.drive
  };

  // Get LLM configuration
  const llmConfig = {
    provider: process.env.LLM_PROVIDER || 'ollama',
    baseUrl: process.env.LLM_BASE_URL || 'http://localhost:11434',
    model: process.env.LLM_MODEL || 'llama3.2',
    stream: process.env.LLM_STREAM === 'true',
    apiKey: process.env.LLM_API_KEY ? 
      `${process.env.LLM_API_KEY.substring(0, 10)}...` : ''
  };

  // Get STT configuration
  const sttConfig = {
    type: appConfig.WHISPER_TYPE,
    model: appConfig.WHISPER_MODEL,
    outputFormat: appConfig.WHISPER_OUTPUT_FORMAT
  };

  // Get TTS configuration
  const ttsConfig = {
    type: appConfig.TTS_TYPE,
    voice: appConfig.TTS_VOICE,
    model: appConfig.TTS_MODEL,
    apiKey: appConfig.TTS_API_KEY ? 
      `${appConfig.TTS_API_KEY.substring(0, 10)}...` : '',
    google: googleConfig.tts
  };

  // Build API endpoints list
  const apiEndpoints = {
    auth: [
      { method: 'POST', path: '/api/auth/register', description: 'Register a new user' },
      { method: 'POST', path: '/api/auth/login', description: 'Login user' },
      { method: 'POST', path: '/api/auth/logout', description: 'Logout user', auth: true },
      { method: 'GET', path: '/api/auth/me', description: 'Get current user info', auth: true },
      { method: 'POST', path: '/api/auth/reset-password', description: 'Send password reset email' },
      { method: 'PUT', path: '/api/auth/change-password', description: 'Change user password', auth: true },
      { method: 'DELETE', path: '/api/auth/account', description: 'Delete user account', auth: true },
      { method: 'POST', path: '/api/auth/confirm-email', description: 'Confirm email' },
      { method: 'POST', path: '/api/auth/resend-confirmation', description: 'Resend email confirmation' },
      { method: 'POST', path: '/api/auth/verify-token', description: 'Verify JWT token' }
    ],
    deepRemember: [
      { method: 'POST', path: '/deepRemember/create-card', description: 'Create a new learning card', auth: true },
      { method: 'GET', path: '/deepRemember/review-cards/:userId', description: 'Get cards for review', auth: true },
      { method: 'POST', path: '/deepRemember/convert-to-speech', description: 'Convert text to speech', auth: true },
      { method: 'GET', path: '/deepRemember/get-audio/:word/:sentence', description: 'Get audio URL', auth: true },
      { method: 'POST', path: '/deepRemember/translate-word', description: 'Translate word', auth: true },
      { method: 'POST', path: '/deepRemember/analyze-sentence', description: 'Analyze sentence', auth: true },
      { method: 'POST', path: '/deepRemember/translate', description: 'Translate text', auth: true },
      { method: 'POST', path: '/deepRemember/save-sentence-analysis', description: 'Save sentence analysis', auth: true },
      { method: 'GET', path: '/deepRemember/search-similar/:userId/:query', description: 'Search similar words', auth: true },
      { method: 'GET', path: '/deepRemember/all-cards/:userId', description: 'Get all cards', auth: true },
      { method: 'PUT', path: '/deepRemember/update-card/:userId/:cardId', description: 'Update card' },
      { method: 'POST', path: '/deepRemember/answer-card', description: 'Answer a card' },
      { method: 'GET', path: '/deepRemember/stats/:userId', description: 'Get user statistics' },
      { method: 'DELETE', path: '/deepRemember/delete-card/:userId/:cardId', description: 'Delete a card' },
      { method: 'GET', path: '/deepRemember/debug/all-cards', description: 'Debug: Get all cards' },
      { method: 'GET', path: '/deepRemember/debug/log', description: 'Debug: Get log data' }
    ],
    srs: [
      { method: 'POST', path: '/api/srs/create-card', description: 'Create a new SRS card' },
      { method: 'GET', path: '/api/srs/review-cards/:userId', description: 'Get cards for review' },
      { method: 'POST', path: '/api/srs/answer-card', description: 'Answer a card' },
      { method: 'GET', path: '/api/srs/stats/:userId', description: 'Get user statistics' },
      { method: 'DELETE', path: '/api/srs/delete-card/:userId/:cardId', description: 'Delete a card' },
      { method: 'GET', path: '/api/srs/debug/all-cards', description: 'Debug: Get all cards' },
      { method: 'GET', path: '/api/srs/debug/log', description: 'Debug: Get log data' },
      { method: 'GET', path: '/api/srs/labels/:userId', description: 'Get all labels for a user' },
      { method: 'GET', path: '/api/srs/labels/system', description: 'Get system labels' },
      { method: 'GET', path: '/api/srs/labels/system/status', description: 'Check system labels status' },
      { method: 'POST', path: '/api/srs/labels/:userId', description: 'Create a new user label' },
      { method: 'PUT', path: '/api/srs/labels/:userId/:labelId', description: 'Update a user label' },
      { method: 'DELETE', path: '/api/srs/labels/:userId/:labelId', description: 'Delete a user label' },
      { method: 'POST', path: '/api/srs/cards/:userId/:cardId/labels', description: 'Add label to card' },
      { method: 'DELETE', path: '/api/srs/cards/:userId/:cardId/labels/:labelId', description: 'Remove label from card' },
      { method: 'GET', path: '/api/srs/cards/:userId/:cardId/labels', description: 'Get labels for a card' },
      { method: 'GET', path: '/api/srs/cards/:userId/label/:labelId', description: 'Get cards filtered by label' },
      { method: 'GET', path: '/api/srs/review-cards/:userId/label/:labelId', description: 'Get due cards filtered by label' }
    ],
    files: [
      { method: 'GET', path: '/files-list', description: 'List all uploaded files' },
      { method: 'POST', path: '/delete-files', description: 'Delete files' },
      { method: 'GET', path: '/files/:filename', description: 'Get file' },
      { method: 'GET', path: '/voice/:filename', description: 'Get voice file' }
    ],
    upload: [
      { method: 'POST', path: '/upload-files', description: 'Upload files (media and/or subtitle)' }
    ],
    pages: [
      { method: 'GET', path: '/', description: 'Home page' },
      { method: 'GET', path: '/deepRemember', description: 'DeepRemember page' }
    ],
    test: [
      { method: 'GET', path: '/api/test/local112358', description: 'Test API endpoint (this endpoint)' }
    ]
  };

  // Convert endpoints to links
  const endpointLinks = {};
  Object.keys(apiEndpoints).forEach(category => {
    endpointLinks[category] = apiEndpoints[category].map(endpoint => ({
      ...endpoint,
      url: `${baseUrl}${endpoint.path}`,
      fullUrl: `${baseUrl}${endpoint.path}`
    }));
  });

  // Server information
  const serverInfo = {
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    uptime: process.uptime(),
    uptimeFormatted: `${Math.floor(process.uptime() / 3600)}h ${Math.floor((process.uptime() % 3600) / 60)}m ${Math.floor(process.uptime() % 60)}s`,
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      external: Math.round(process.memoryUsage().external / 1024 / 1024),
      rss: Math.round(process.memoryUsage().rss / 1024 / 1024)
    },
    environment: appConfig.NODE_ENV,
    port: port,
    baseUrl: baseUrl,
    timestamp: new Date().toISOString()
  };

  // Get database health check
  let dbHealth = null;
  try {
    dbHealth = await databaseFactory.checkHealth();
  } catch (dbHealthError) {
    dbHealth = {
      status: 'error',
      error: dbHealthError.message,
      connected: false
    };
  }

  // Get Google API health check
  let googleHealth = null;
  try {
    googleHealth = await checkGoogleApiHealth();
  } catch (googleHealthError) {
    googleHealth = {
      status: 'error',
      error: googleHealthError.message,
      responseTime: 0
    };
  }

  // Service status
  const serviceStatus = {
    database: {
      type: dbConfig.type,
      configured: dbConfig.type === 'sqlite' ? true : supabaseConfig.configured,
      status: dbHealth ? dbHealth.status : 'unknown',
      health: dbHealth
    },
    fileSystem: {
      type: fileSystemConfig.type,
      configured: fileSystemConfig.type === 'node' ? true : googleConfig.drive.configured,
      status: googleHealth && googleHealth.services.drive ? 
        (googleHealth.services.drive.connected ? 'healthy' : 'unhealthy') : 'unknown',
      health: googleHealth ? googleHealth.services.drive : null
    },
    llm: {
      provider: llmConfig.provider,
      configured: llmConfig.provider === 'ollama' ? true : !!llmConfig.apiKey,
      status: 'unknown'
    },
    stt: {
      type: sttConfig.type,
      configured: true,
      status: 'unknown'
    },
    tts: {
      type: ttsConfig.type,
      configured: ttsConfig.type === 'piper' ? true : !!ttsConfig.apiKey || googleConfig.tts.configured,
      status: googleHealth && googleHealth.services.tts ? 
        (googleHealth.services.tts.connected ? 'healthy' : 'unhealthy') : 'unknown',
      health: googleHealth ? googleHealth.services.tts : null
    }
  };

  // Response
  const response = {
    success: true,
    message: 'Test API endpoint - Server configuration and status',
    timestamp: serverInfo.timestamp,
    server: serverInfo,
    databaseHealth: dbHealth, // Database health check results
    googleApiHealth: googleHealth, // Google API health check results
    services: {
      database: databaseConfig,
      fileSystem: fileSystemConfig,
      llm: llmConfig,
      stt: sttConfig,
      tts: ttsConfig
    },
    connections: {
      supabase: supabaseConfig,
      google: {
        ...googleConfig,
        health: googleHealth ? {
          overall: googleHealth.status,
          drive: googleHealth.services.drive,
          tts: googleHealth.services.tts,
          responseTime: googleHealth.responseTime
        } : null
      }
    },
    serviceStatus: serviceStatus,
    apiEndpoints: endpointLinks,
    configuration: {
      app: {
        port: appConfig.PORT,
        nodeEnv: appConfig.NODE_ENV,
        logLevel: appConfig.LOG_LEVEL,
        maxFileSize: appConfig.MAX_FILE_SIZE,
        allowedMediaTypes: appConfig.ALLOWED_MEDIA_TYPES,
        allowedSubtitleTypes: appConfig.ALLOWED_SUBTITLE_TYPES
      },
      database: {
        type: dbConfig.type,
        pool: dbConfig.pool,
        migration: dbConfig.migration
      }
    }
  };

  res.json(response);
});

module.exports = router;

