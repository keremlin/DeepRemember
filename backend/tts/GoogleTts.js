const ITts = require('./ITts');
const appConfig = require('../config/app');
const { google } = require('googleapis');
const textToSpeech = require('@google-cloud/text-to-speech');
const databaseFactory = require('../database/access/DatabaseFactory');
const dbConfig = require('../config/database');
const AppVariablesRepository = require('../database/access/AppVariablesRepository');

/**
 * Google Cloud Text-to-Speech TTS implementation
 * Uses Google Cloud Text-to-Speech API with OAuth 2.0 authentication
 * Reuses existing Google Drive API credentials
 */
class GoogleTts extends ITts {
    constructor(options = {}) {
        super();
        
        // Reuse Google Drive OAuth credentials
        this.config = {
            clientId: options.clientId || process.env.GOOGLE_CLIENT_ID,
            clientSecret: options.clientSecret || process.env.GOOGLE_CLIENT_SECRET,
            redirectUri: options.redirectUri || process.env.GOOGLE_REDIRECT_URI,
            accessToken: options.accessToken || process.env.GOOGLE_ACCESS_TOKEN,
            refreshToken: options.refreshToken || process.env.GOOGLE_REFRESH_TOKEN,
            
            // TTS requires Cloud Platform scope
            scopes: options.scopes || [
                'https://www.googleapis.com/auth/cloud-platform'
            ],
            
            // TTS specific settings
            // Note: We don't use appConfig.TTS_VOICE since it's designed for other TTS services
            defaultVoice: options.voice || options.defaultVoice || appConfig.GOOGLE_TTS_VOICE || 'de-DE-Neural2-F',
            defaultLanguageCode: options.languageCode || appConfig.GOOGLE_TTS_LANGUAGE_CODE || 'de-DE',
            defaultSsmlGender: options.ssmlGender || appConfig.GOOGLE_TTS_SSML_GENDER || 'FEMALE',
            defaultAudioEncoding: options.audioEncoding || appConfig.GOOGLE_TTS_AUDIO_ENCODING || 'MP3',
            defaultSampleRate: options.sampleRate || 24000,
            
            ...options
        };

        this.oauth2Client = null;
        this.ttsClient = null;
        this.isInitialized = false;
        this.appVariablesRepository = null;
        this.repositoryInitialized = false;
        
        if (!this.config.clientId || !this.config.clientSecret) {
            throw new Error('Google OAuth credentials are required. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.');
        }
    }

    /**
     * Initialize the Google Cloud TTS client
     */
    async initialize() {
        if (this.isInitialized) return;

        try {
            // Create OAuth2 client (reusing Drive API credentials)
            this.oauth2Client = new google.auth.OAuth2(
                this.config.clientId,
                this.config.clientSecret,
                this.config.redirectUri
            );

            // Set credentials if available
            if (this.config.accessToken && this.config.refreshToken) {
                this.oauth2Client.setCredentials({
                    access_token: this.config.accessToken,
                    refresh_token: this.config.refreshToken
                });
            } else if (this.config.refreshToken) {
                // If we only have refresh token, set it and let it refresh
                this.oauth2Client.setCredentials({
                    refresh_token: this.config.refreshToken
                });
            }

            // Listen for token refresh events to capture new access tokens
            this.oauth2Client.on('tokens', (tokens) => {
                if (tokens.access_token) {
                    // Update the stored access token
                    this.config.accessToken = tokens.access_token;
                    // Optionally update environment variable (if running in Node.js)
                    if (process.env.GOOGLE_ACCESS_TOKEN !== undefined) {
                        process.env.GOOGLE_ACCESS_TOKEN = tokens.access_token;
                    }
                    console.log('[Google TTS] Access token refreshed automatically');
                }
                if (tokens.refresh_token) {
                    // Update refresh token if provided (rare, but possible)
                    this.config.refreshToken = tokens.refresh_token;
                    if (process.env.GOOGLE_REFRESH_TOKEN !== undefined) {
                        process.env.GOOGLE_REFRESH_TOKEN = tokens.refresh_token;
                    }
                }
            });

            // Create TTS client with the OAuth2 client
            this.ttsClient = new textToSpeech.TextToSpeechClient({
                authClient: this.oauth2Client
            });

            this.isInitialized = true;
            console.log('[Google TTS] Initialized successfully with automatic token refresh');
        } catch (error) {
            console.error('[Google TTS] Initialization failed:', error);
            throw error;
        }
    }

    /**
     * Get OAuth2 authorization URL for Google Cloud TTS
     * Call this if you get authentication errors - you need to re-authenticate with TTS scope
     */
    getAuthUrl() {
        if (!this.config.clientId || !this.config.clientSecret) {
            throw new Error('Google OAuth credentials not configured');
        }
        
        const oauth2Client = new google.auth.OAuth2(
            this.config.clientId,
            this.config.clientSecret,
            this.config.redirectUri
        );
        
        return oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: this.config.scopes,
            prompt: 'consent'
        });
    }

    /**
     * Initialize the app variables repository
     */
    async initializeRepository() {
        if (this.repositoryInitialized && this.appVariablesRepository) {
            return;
        }

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
            
            this.appVariablesRepository = new AppVariablesRepository(database);
            this.repositoryInitialized = true;
            console.log('[Google TTS] App variables repository initialized successfully');
        } catch (error) {
            console.error('[Google TTS] Repository initialization failed:', error);
            // Don't throw - allow TTS to work even if repository fails
            this.repositoryInitialized = false;
        }
    }

    /**
     * Check and update character count for monthly limit
     * @param {number} charCount - Number of characters to add
     * @returns {Promise<boolean>} - True if within limit and updated, false if exceeded
     */
    async checkAndUpdateCharacterCount(charCount) {
        try {
            await this.initializeRepository();
            
            if (!this.appVariablesRepository) {
                console.warn('[Google TTS] Repository not available, skipping character count check');
                return true; // Allow if repository unavailable
            }

            const KEY_NAME = 'GOOGLE_TTS_CHAR_NUMB';
            const MONTHLY_LIMIT = 999000;
            
            // Get current variable
            let variable = await this.appVariablesRepository.getByKeyname(KEY_NAME);
            
            // Initialize default structure if variable doesn't exist
            const now = new Date();
            const currentDateStr = `${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}/${now.getFullYear()}`;
            
            let charData;
            if (!variable) {
                // Create new variable with default values
                charData = {
                    count: 0,
                    startDate: currentDateStr
                };
                await this.appVariablesRepository.create({
                    keyname: KEY_NAME,
                    value: JSON.stringify(charData),
                    type: 'json',
                    description: 'Google TTS monthly character count tracker'
                });
            } else {
                // Parse existing JSON value
                try {
                    charData = JSON.parse(variable.value);
                } catch (e) {
                    // If parsing fails, reset to default
                    console.error('[Google TTS] Failed to parse existing variable:', e);
                }
            }

            // Check if we're in a new month
            // Parse date string in MM/DD/YYYY format
            const dateParts = charData.startDate.split('/');
            const startDate = new Date(
                parseInt(dateParts[2]), // year
                parseInt(dateParts[0]) - 1, // month (0-indexed)
                parseInt(dateParts[1]) // day
            );
            const isNewMonth = now.getMonth() !== startDate.getMonth() || 
                              now.getFullYear() !== startDate.getFullYear();

            if (isNewMonth) {
                // Reset count for new month
                charData.count = 0;
                charData.startDate = currentDateStr;
                console.log(`[Google TTS] New month detected, resetting character count. New start date: ${currentDateStr}`);
            }

            // Calculate new count
            const newCount = charData.count + charCount;

            // Update the count in database first
            charData.count = newCount;
            await this.appVariablesRepository.update(KEY_NAME, {
                value: JSON.stringify(charData)
            });

            // Get it again to verify
            variable = await this.appVariablesRepository.getByKeyname(KEY_NAME);
            if (variable) {
                try {
                    charData = JSON.parse(variable.value);
                } catch (e) {
                    console.error('[Google TTS] Failed to parse updated variable');
                }
            }

            // Check if limit is exceeded
            if (charData.count > MONTHLY_LIMIT) {
                const logMessage = `[Google TTS] Monthly character limit exceeded. Current count: ${charData.count}, Limit: ${MONTHLY_LIMIT}, Requested: ${charCount}`;
                console.warn(logMessage);
                return false;
            }

            console.log(`[Google TTS] Character count updated. Current: ${charData.count}/${MONTHLY_LIMIT}, Added: ${charCount}`);
            return true;
        } catch (error) {
            console.error('[Google TTS] Error checking character count:', error);
            // Allow TTS to proceed if there's an error checking the limit
            return true;
        }
    }

    /**
     * Convert text to speech using Google Cloud TTS
     * @param {string} text - The text to convert to speech
     * @param {Object} options - Optional configuration for TTS
     * @param {string} options.voice - Voice name to use
     * @param {string} options.languageCode - Language code (e.g., 'en-US')
     * @param {string} options.ssmlGender - SSML gender ('MALE', 'FEMALE', 'NEUTRAL')
     * @param {string} options.audioEncoding - Audio encoding ('MP3', 'LINEAR16', etc.)
     * @param {number} options.sampleRate - Sample rate in Hz
     * @returns {Promise<Buffer>} - Audio data as Buffer
     * @throws {Error} - If conversion fails
     */
    async convert(text, options = {}) {
        if (!text || typeof text !== 'string') {
            throw new Error('Text parameter is required and must be a string');
        }

        // Count characters and check monthly limit
        const charCount = text.length;
        const withinLimit = await this.checkAndUpdateCharacterCount(charCount);
        
        if (!withinLimit) {
            const logMessage = `[Google TTS] Monthly character limit (999000) exceeded. Google TTS API call blocked for text with ${charCount} characters.`;
            console.warn(logMessage);
            throw new Error(`Google TTS monthly character limit exceeded. Current usage exceeds 999000 characters for this month.`);
        }

        await this.initialize();

        const voice = options.voice || this.config.defaultVoice;
        const languageCode = options.languageCode || this.config.defaultLanguageCode;
        const ssmlGender = options.ssmlGender || this.config.defaultSsmlGender;
        const audioEncoding = options.audioEncoding || this.config.defaultAudioEncoding;
        const sampleRate = options.sampleRate || this.config.defaultSampleRate;

        try {
            console.log(`[Google TTS] Converting to speech: "${text}"`);
            console.log(`[Google TTS] Voice: ${voice}, Language: ${languageCode}, Gender: ${ssmlGender}, Encoding: ${audioEncoding}`);
            
            // Construct the request
            const request = {
                input: { text: text },
                voice: {
                    languageCode: languageCode,
                    name: voice,
                    ssmlGender: ssmlGender
                },
                audioConfig: {
                    audioEncoding: audioEncoding,
                    sampleRateHertz: sampleRate
                }
            };

            // Perform the text-to-speech request
            const [response] = await this.ttsClient.synthesizeSpeech(request);
            
            if (!response.audioContent) {
                throw new Error('No audio content returned from Google TTS');
            }

            // Convert audio content to Buffer
            const audioBuffer = Buffer.from(response.audioContent, 'base64');
            console.log(`[Google TTS] Successfully converted text to speech (${audioBuffer.byteLength} bytes)`);
            
            return audioBuffer;
        } catch (error) {
            console.error(`[Google TTS] Conversion failed:`, error.message);
            
            // Handle token expiration - try to refresh and retry once
            if ((error.message.includes('credentials') || error.message.includes('UNAUTHENTICATED') || error.message.includes('invalid_grant')) 
                && this.config.refreshToken && this.oauth2Client) {
                try {
                    console.log('[Google TTS] Access token expired, attempting to refresh...');
                    const { credentials } = await this.oauth2Client.refreshAccessToken();
                    this.oauth2Client.setCredentials(credentials);
                    
                    // Update stored tokens
                    if (credentials.access_token) {
                        this.config.accessToken = credentials.access_token;
                        if (process.env.GOOGLE_ACCESS_TOKEN !== undefined) {
                            process.env.GOOGLE_ACCESS_TOKEN = credentials.access_token;
                        }
                    }
                    
                    console.log('[Google TTS] Token refreshed successfully, retrying request...');
                    
                    // Retry the request with refreshed token
                    const [response] = await this.ttsClient.synthesizeSpeech(request);
                    
                    if (!response.audioContent) {
                        throw new Error('No audio content returned from Google TTS');
                    }

                    const audioBuffer = Buffer.from(response.audioContent, 'base64');
                    console.log(`[Google TTS] Successfully converted text to speech after token refresh (${audioBuffer.byteLength} bytes)`);
                    
                    return audioBuffer;
                } catch (refreshError) {
                    console.error('[Google TTS] Token refresh failed:', refreshError.message);
                    const authUrl = this.getAuthUrl();
                    throw new Error(`Google TTS authentication failed. Refresh token may be invalid. Please re-authenticate: ${authUrl}`);
                }
            }
            
            // Handle specific Google Cloud API errors
            if (error.message.includes('credentials') || error.message.includes('UNAUTHENTICATED')) {
                const authUrl = this.getAuthUrl();
                throw new Error(`Google TTS authentication failed. Your OAuth token needs Cloud Platform scope. Get new auth URL: ${authUrl}`);
            } else if (error.message.includes('authentication')) {
                throw new Error('Google TTS authentication failed');
            } else if (error.message.includes('permission')) {
                throw new Error('Google Cloud TTS API is not enabled or permission denied');
            } else if (error.message.includes('quota')) {
                throw new Error('Google Cloud TTS API quota exceeded');
            } else {
                throw new Error(`Google TTS conversion failed: ${error.message}`);
            }
        }
    }

    /**
     * Get the name of this TTS service
     * @returns {string} - Service name
     */
    getName() {
        return 'Google Cloud TTS';
    }

    /**
     * Check if the TTS service is available
     * @returns {Promise<boolean>} - True if service is available
     */
    async isAvailable() {
        try {
            await this.initialize();
            
            // Try a simple request to verify the service is working
            const testRequest = {
                input: { text: 'test' },
                voice: {
                    languageCode: this.config.defaultLanguageCode,
                    name: this.config.defaultVoice,
                    ssmlGender: this.config.defaultSsmlGender
                },
                audioConfig: {
                    audioEncoding: this.config.defaultAudioEncoding,
                    sampleRateHertz: this.config.defaultSampleRate
                }
            };

            await this.ttsClient.synthesizeSpeech(testRequest);
            return true;
        } catch (error) {
            console.warn(`[Google TTS] Service availability check failed:`, error.message);
            return false;
        }
    }

    /**
     * Get the current configuration
     * @returns {Object} - Current configuration
     */
    getConfig() {
        return {
            clientId: this.config.clientId ? '***' + this.config.clientId.slice(-4) : 'Not set',
            defaultVoice: this.config.defaultVoice,
            defaultLanguageCode: this.config.defaultLanguageCode,
            defaultSsmlGender: this.config.defaultSsmlGender,
            defaultAudioEncoding: this.config.defaultAudioEncoding,
            defaultSampleRate: this.config.defaultSampleRate
        };
    }

    /**
     * Get available voices from Google Cloud TTS
     * @param {string} languageCode - Optional language code to filter voices
     * @returns {Promise<Array>} - Array of available voices
     */
    async getAvailableVoices(languageCode = null) {
        try {
            await this.initialize();
            
            const request = {};
            if (languageCode) {
                request.languageCode = languageCode;
            }

            const [response] = await this.ttsClient.listVoices(request);
            return response.voices || [];
        } catch (error) {
            console.error(`[Google TTS] Failed to get available voices:`, error.message);
            return [];
        }
    }

    /**
     * Manually refresh the access token using the refresh token
     * @returns {Promise<Object>} - New credentials with access token
     */
    async refreshAccessToken() {
        if (!this.oauth2Client) {
            await this.initialize();
        }

        if (!this.config.refreshToken) {
            throw new Error('No refresh token available. Please re-authenticate using getAuthUrl()');
        }

        try {
            const { credentials } = await this.oauth2Client.refreshAccessToken();
            this.oauth2Client.setCredentials(credentials);
            
            // Update stored tokens
            if (credentials.access_token) {
                this.config.accessToken = credentials.access_token;
                if (process.env.GOOGLE_ACCESS_TOKEN !== undefined) {
                    process.env.GOOGLE_ACCESS_TOKEN = credentials.access_token;
                }
            }
            
            console.log('[Google TTS] Access token refreshed manually');
            return credentials;
        } catch (error) {
            console.error('[Google TTS] Failed to refresh access token:', error.message);
            const authUrl = this.getAuthUrl();
            throw new Error(`Token refresh failed. Please re-authenticate: ${authUrl}`);
        }
    }
}

module.exports = GoogleTts;

