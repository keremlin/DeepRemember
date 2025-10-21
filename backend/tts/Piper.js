const ITts = require('./ITts');
const appConfig = require('../config/app');

/**
 * Piper TTS implementation using OpenAI's TTS API
 * This implementation uses the local OpenAI API endpoint for text-to-speech conversion
 */
class Piper extends ITts {
    constructor(options = {}) {
        super();
        this.baseUrl = options.baseUrl || 'http://localhost:8000';
        this.defaultVoice = options.voice || appConfig.TTS_VOICE;
        this.defaultModel = options.model || appConfig.TTS_MODEL;
        this.timeout = options.timeout || 10000;
    }

    /**
     * Convert text to speech using Piper TTS service
     * @param {string} text - The text to convert to speech
     * @param {Object} options - Optional configuration for TTS
     * @param {string} options.voice - Voice to use for speech generation
     * @param {string} options.model - TTS model to use
     * @param {number} options.timeout - Request timeout in milliseconds
     * @returns {Promise<Buffer>} - Audio data as Buffer
     * @throws {Error} - If conversion fails
     */
    async convert(text, options = {}) {
        if (!text || typeof text !== 'string') {
            throw new Error('Text parameter is required and must be a string');
        }

        const voice = options.voice || this.defaultVoice;
        const model = options.model || this.defaultModel;
        const timeout = options.timeout || this.timeout;

        try {
            console.log(`[Piper TTS] Converting to speech: "${text}"`);
            
            const response = await fetch(`${this.baseUrl}/v1/audio/speech`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    input: text,
                    voice: voice,
                    model: model
                }),
                timeout: timeout
            });

            if (!response.ok) {
                throw new Error(`TTS API error: ${response.status} - ${response.statusText}`);
            }

            // Get the audio data
            const audioBuffer = await response.arrayBuffer();
            console.log(`[Piper TTS] Successfully converted text to speech (${audioBuffer.byteLength} bytes)`);
            
            return Buffer.from(audioBuffer);
        } catch (error) {
            console.error(`[Piper TTS] Conversion failed:`, error.message);
            throw new Error(`Piper TTS conversion failed: ${error.message}`);
        }
    }

    /**
     * Get the name of this TTS service
     * @returns {string} - Service name
     */
    getName() {
        return 'Piper TTS';
    }

    /**
     * Check if the TTS service is available
     * @returns {Promise<boolean>} - True if service is available
     */
    async isAvailable() {
        try {
            const response = await fetch(`${this.baseUrl}/v1/models`, {
                method: 'GET',
                timeout: 5000
            });
            return response.ok;
        } catch (error) {
            console.warn(`[Piper TTS] Service availability check failed:`, error.message);
            return false;
        }
    }

    /**
     * Get the current configuration
     * @returns {Object} - Current configuration
     */
    getConfig() {
        return {
            baseUrl: this.baseUrl,
            defaultVoice: this.defaultVoice,
            defaultModel: this.defaultModel,
            timeout: this.timeout
        };
    }
}

module.exports = Piper;
