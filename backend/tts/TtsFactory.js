const ITts = require('./ITts');
const Piper = require('./Piper');
const ElevenLabs = require('./ElevenLabs');
const GoogleTts = require('./GoogleTts');
const appConfig = require('../config/app');

/**
 * Factory class for creating TTS service instances
 * Manages different TTS implementations and their configurations
 */
class TtsFactory {
    /**
     * Create a TTS service instance based on configuration
     * @param {Object} config - Configuration object
     * @param {string} config.type - Type of TTS service ('piper', 'openai', etc.)
     * @param {Object} config.options - Service-specific options
     * @returns {ITts} - TTS service instance
     */
    static createTtsService(config = {}) {
        const { type = appConfig.TTS_TYPE, options = {} } = config;
        
        // Merge default options with provided options
        const defaultOptions = {
            voice: appConfig.TTS_VOICE,
            model: appConfig.TTS_MODEL,
            apiKey: appConfig.TTS_API_KEY
        };
        
        const mergedOptions = { ...defaultOptions, ...options };
        
        switch (type.toLowerCase()) {
            case 'piper':
                return new Piper(mergedOptions);
            case 'elevenlabs':
                return new ElevenLabs(mergedOptions);
            case 'google':
            case 'googletts':
                // Don't pass voice/model from defaultOptions for Google TTS
                // Google TTS uses different voice format
                const googleOptions = { ...options };
                // Only include voice if explicitly provided in options
                if (!googleOptions.voice && !googleOptions.defaultVoice) {
                    // Use Google-specific voice config if available
                    if (appConfig.GOOGLE_TTS_VOICE) {
                        googleOptions.voice = appConfig.GOOGLE_TTS_VOICE;
                    }
                }
                return new GoogleTts(googleOptions);
            case 'openai':
                // Future implementation
                throw new Error('OpenAI TTS implementation not yet available');
            default:
                throw new Error(`Unknown TTS service type: ${type}`);
        }
    }

    /**
     * Create a TTS service instance by type with specific configuration
     * @param {string} type - Type of TTS service
     * @param {Object} config - Service-specific configuration
     * @returns {ITts} - TTS service instance
     */
    static createTtsServiceByType(type, config = {}) {
        return this.createTtsService({ type, options: config });
    }

    /**
     * Get all available TTS service types
     * @returns {string[]} - Array of available service types
     */
    static getAvailableTypes() {
        return ['piper', 'elevenlabs', 'google'];
    }

    /**
     * Get the default configured TTS service type
     * @returns {string} - Default service type
     */
    static getConfiguredType() {
        return appConfig.TTS_TYPE;
    }

    /**
     * Get the current TTS configuration
     * @returns {Object} - Current TTS configuration
     */
    static getConfig() {
        return {
            type: appConfig.TTS_TYPE,
            voice: appConfig.TTS_VOICE,
            model: appConfig.TTS_MODEL,
            apiKey: appConfig.TTS_API_KEY ? '***' + appConfig.TTS_API_KEY.slice(-4) : 'Not set'
        };
    }
}

module.exports = TtsFactory;
