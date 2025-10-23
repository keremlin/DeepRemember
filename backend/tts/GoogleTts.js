const ITts = require('./ITts');
const appConfig = require('../config/app');
const { google } = require('googleapis');
const textToSpeech = require('@google-cloud/text-to-speech');

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
            defaultAudioEncoding: options.audioEncoding || 'MP3',
            defaultSampleRate: options.sampleRate || 24000,
            
            ...options
        };

        this.oauth2Client = null;
        this.ttsClient = null;
        this.isInitialized = false;
        
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
            }

            // Create TTS client with the OAuth2 client
            this.ttsClient = new textToSpeech.TextToSpeechClient({
                authClient: this.oauth2Client
            });

            this.isInitialized = true;
            console.log('[Google TTS] Initialized successfully');
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
}

module.exports = GoogleTts;

