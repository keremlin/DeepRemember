const FileSystemFactory = require('../filesystem/FileSystemFactory');
const TtsFactory = require('../tts/TtsFactory');
const appConfig = require('../config/app');

/**
 * Check Google API health - tests connectivity to Google services
 * @returns {Promise<Object>} - Health check results for Google APIs
 */
async function checkGoogleApiHealth() {
  const startTime = Date.now();
  const health = {
    status: 'unknown',
    responseTime: 0,
    services: {
      drive: {
        enabled: false,
        configured: false,
        connected: false,
        authenticated: false,
        test: null,
        error: null
      },
      tts: {
        enabled: false,
        configured: false,
        connected: false,
        authenticated: false,
        test: null,
        error: null
      }
    },
    error: null
  };

  try {
    // Check if Google services are enabled
    const fsType = (process.env.FS_TYPE || '').toLowerCase();
    const ttsType = (appConfig.TTS_TYPE || '').toLowerCase();
    
    const driveEnabled = fsType === 'google';
    const ttsEnabled = ttsType === 'google' || ttsType === 'googletts';

    health.services.drive.enabled = driveEnabled;
    health.services.tts.enabled = ttsEnabled;

    // Test Google Drive API
    if (driveEnabled) {
      try {
        const driveHealth = await testGoogleDrive();
        health.services.drive = {
          ...health.services.drive,
          ...driveHealth
        };
      } catch (driveError) {
        health.services.drive.error = driveError.message;
        health.services.drive.connected = false;
        health.services.drive.authenticated = false;
      }
    } else {
      health.services.drive.configured = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
    }

    // Test Google TTS API
    if (ttsEnabled) {
      try {
        const ttsHealth = await testGoogleTts();
        health.services.tts = {
          ...health.services.tts,
          ...ttsHealth
        };
      } catch (ttsError) {
        health.services.tts.error = ttsError.message;
        health.services.tts.connected = false;
        health.services.tts.authenticated = false;
      }
    } else {
      health.services.tts.configured = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
    }

    // Determine overall status
    const driveOk = !driveEnabled || (health.services.drive.connected && health.services.drive.authenticated);
    const ttsOk = !ttsEnabled || (health.services.tts.connected && health.services.tts.authenticated);
    
    if (driveOk && ttsOk) {
      health.status = 'healthy';
    } else if (health.services.drive.error || health.services.tts.error) {
      health.status = 'unhealthy';
    } else {
      health.status = 'degraded';
    }

    health.responseTime = Date.now() - startTime;
    return health;
  } catch (error) {
    health.status = 'unhealthy';
    health.error = error.message;
    health.responseTime = Date.now() - startTime;
    return health;
  }
}

/**
 * Test Google Drive API connectivity
 * @returns {Promise<Object>} - Drive API health check results
 */
async function testGoogleDrive() {
  const testStartTime = Date.now();
  const result = {
    enabled: true,
    configured: false,
    connected: false,
    authenticated: false,
    test: null,
    error: null,
    responseTime: 0
  };

  try {
    // Check if credentials are configured
    const hasCredentials = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
    result.configured = hasCredentials;

    if (!hasCredentials) {
      result.error = 'Google OAuth credentials not configured';
      result.responseTime = Date.now() - testStartTime;
      return result;
    }

    // Create Google Drive file system instance
    const fileSystem = FileSystemFactory.createFileSystem('google');
    
    // Try to initialize (this will test OAuth)
    try {
      await fileSystem.initialize();
      result.authenticated = true;
      result.connected = true;
    } catch (initError) {
      result.error = `Initialization failed: ${initError.message}`;
      result.responseTime = Date.now() - testStartTime;
      return result;
    }

    // Test actual API call - try to get user info
    // Use the already initialized fileSystem's drive instance if available
    try {
      // Access the drive instance from the initialized fileSystem
      // Since GoogleDrive class has drive property after initialization
      if (fileSystem.drive) {
        // Test with a simple API call - get about info (user info)
        const aboutResponse = await fileSystem.drive.about.get({
          fields: 'user,storageQuota'
        });

        result.test = {
          success: true,
          user: aboutResponse.data.user ? {
            displayName: aboutResponse.data.user.displayName,
            emailAddress: aboutResponse.data.user.emailAddress
          } : null,
          storageQuota: aboutResponse.data.storageQuota ? {
            limit: aboutResponse.data.storageQuota.limit,
            usage: aboutResponse.data.storageQuota.usage,
            usageInDrive: aboutResponse.data.storageQuota.usageInDrive
          } : null
        };
        result.connected = true;
        result.authenticated = true;
      } else {
        // Fallback: create a new client for testing
        const { google } = require('googleapis');
        const oauth2Client = new google.auth.OAuth2(
          process.env.GOOGLE_CLIENT_ID,
          process.env.GOOGLE_CLIENT_SECRET,
          process.env.GOOGLE_REDIRECT_URI
        );

        if (process.env.GOOGLE_ACCESS_TOKEN && process.env.GOOGLE_REFRESH_TOKEN) {
          oauth2Client.setCredentials({
            access_token: process.env.GOOGLE_ACCESS_TOKEN,
            refresh_token: process.env.GOOGLE_REFRESH_TOKEN
          });
        }

        const drive = google.drive({ version: 'v3', auth: oauth2Client });
        
        // Test with a simple API call - get about info (user info)
        const aboutResponse = await drive.about.get({
          fields: 'user,storageQuota'
        });

        result.test = {
          success: true,
          user: aboutResponse.data.user ? {
            displayName: aboutResponse.data.user.displayName,
            emailAddress: aboutResponse.data.user.emailAddress
          } : null,
          storageQuota: aboutResponse.data.storageQuota ? {
            limit: aboutResponse.data.storageQuota.limit,
            usage: aboutResponse.data.storageQuota.usage,
            usageInDrive: aboutResponse.data.storageQuota.usageInDrive
          } : null
        };
        result.connected = true;
        result.authenticated = true;
      }
    } catch (apiError) {
      result.error = `API test failed: ${apiError.message}`;
      // Still mark as authenticated if initialization worked
      if (result.authenticated) {
        result.connected = false; // But API call failed
      }
    }

    result.responseTime = Date.now() - testStartTime;
    return result;
  } catch (error) {
    result.error = error.message;
    result.responseTime = Date.now() - testStartTime;
    return result;
  }
}

/**
 * Test Google TTS API connectivity
 * @returns {Promise<Object>} - TTS API health check results
 */
async function testGoogleTts() {
  const testStartTime = Date.now();
  const result = {
    enabled: true,
    configured: false,
    connected: false,
    authenticated: false,
    test: null,
    error: null,
    responseTime: 0
  };

  try {
    // Check if credentials are configured
    const hasCredentials = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
    result.configured = hasCredentials;

    if (!hasCredentials) {
      result.error = 'Google OAuth credentials not configured';
      result.responseTime = Date.now() - testStartTime;
      return result;
    }

    // Check if TTS service account credentials are configured
    const hasServiceAccount = !!process.env.GOOGLE_APPLICATION_CREDENTIALS;
    
    // Create TTS service instance
    const ttsService = TtsFactory.createTtsService();
    
    // Check if it's actually Google TTS
    if (ttsService.getName && ttsService.getName() !== 'Google Cloud TTS') {
      result.error = 'TTS service is not Google TTS';
      result.responseTime = Date.now() - testStartTime;
      return result;
    }

    // Try to initialize
    try {
      await ttsService.initialize();
      result.authenticated = true;
    } catch (initError) {
      result.error = `Initialization failed: ${initError.message}`;
      result.responseTime = Date.now() - testStartTime;
      return result;
    }

    // Test actual API call - check availability
    try {
      const isAvailable = await ttsService.isAvailable();
      result.connected = isAvailable;
      result.authenticated = isAvailable;
      
      if (isAvailable) {
        result.test = {
          success: true,
          message: 'Google TTS API is accessible and working'
        };
      } else {
        result.error = 'Google TTS API is not available';
      }
    } catch (apiError) {
      result.error = `API test failed: ${apiError.message}`;
      // Still mark as authenticated if initialization worked
      if (result.authenticated) {
        result.connected = false; // But not connected
      }
    }

    result.responseTime = Date.now() - testStartTime;
    return result;
  } catch (error) {
    result.error = error.message;
    result.responseTime = Date.now() - testStartTime;
    return result;
  }
}

module.exports = {
  checkGoogleApiHealth,
  testGoogleDrive,
  testGoogleTts
};

