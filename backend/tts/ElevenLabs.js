const ITts = require('./ITts');
const appConfig = require('../config/app');
const { ElevenLabsClient } = require('@elevenlabs/elevenlabs-js');

/**
 * ElevenLabs TTS implementation using ElevenLabs API
 * This implementation uses the ElevenLabs API for text-to-speech conversion
 */
class ElevenLabs extends ITts {
    constructor(options = {}) {
        super();
        this.apiKey = options.apiKey || appConfig.TTS_API_KEY;
        this.defaultVoiceId = options.voiceId || 'JBFqnCBsd6RMkjVDRZzb'; // Default voice ID
        this.defaultModel = options.model || 'eleven_multilingual_v2';
        this.defaultOutputFormat = options.outputFormat || 'mp3_44100_128';
        this.timeout = options.timeout || 30000; // Longer timeout for API calls
        
        if (!this.apiKey) {
            throw new Error('ElevenLabs API key is required. Set TTS_API_KEY environment variable.');
        }
    }

    /**
     * Convert text to speech using ElevenLabs TTS service
     * @param {string} text - The text to convert to speech
     * @param {Object} options - Optional configuration for TTS
     * @param {string} options.voiceId - Voice ID to use for speech generation
     * @param {string} options.model - TTS model to use
     * @param {string} options.outputFormat - Output format for audio
     * @param {number} options.timeout - Request timeout in milliseconds
     * @returns {Promise<Buffer>} - Audio data as Buffer
     * @throws {Error} - If conversion fails
     */
    async convert(text, options = {}) {
        if (!text || typeof text !== 'string') {
            throw new Error('Text parameter is required and must be a string');
        }

        const voiceId = options.voiceId || this.defaultVoiceId;
        const model = options.model || this.defaultModel;
        const outputFormat = options.outputFormat || this.defaultOutputFormat;
        const timeout = options.timeout || this.timeout;

        try {
            console.log(`[ElevenLabs TTS] Converting to speech: "${text}"`);
            
            const elevenlabs = new ElevenLabsClient({
                apiKey: this.apiKey
            });

            const audio = await elevenlabs.textToSpeech.convert(voiceId, {
                text: text,
                modelId: model,
                outputFormat: outputFormat
            });

            console.log(`[ElevenLabs TTS] Successfully converted text to speech`);
            
            // Convert the audio response to Buffer
            // The audio response from ElevenLabs can be in various formats
            if (audio instanceof ArrayBuffer) {
                return Buffer.from(audio);
            } else if (audio instanceof Uint8Array) {
                return Buffer.from(audio);
            } else if (audio && audio.arrayBuffer) {
                // If it's a Response-like object
                const arrayBuffer = await audio.arrayBuffer();
                return Buffer.from(arrayBuffer);
            } else if (audio && typeof audio.getReader === 'function') {
                // If it's a ReadableStream
                const reader = audio.getReader();
                const chunks = [];
                let done = false;
                
                while (!done) {
                    const { value, done: readerDone } = await reader.read();
                    done = readerDone;
                    if (value) {
                        chunks.push(value);
                    }
                }
                
                // Combine all chunks into a single Buffer
                const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
                const result = new Uint8Array(totalLength);
                let offset = 0;
                
                for (const chunk of chunks) {
                    result.set(chunk, offset);
                    offset += chunk.length;
                }
                
                return Buffer.from(result);
            } else if (audio && typeof audio.pipe === 'function') {
                // If it's a Node.js stream
                const chunks = [];
                return new Promise((resolve, reject) => {
                    audio.on('data', chunk => chunks.push(chunk));
                    audio.on('end', () => resolve(Buffer.concat(chunks)));
                    audio.on('error', reject);
                });
            } else if (audio && audio.buffer) {
                // If it has a buffer property
                return Buffer.from(audio.buffer);
            } else if (audio && audio.data) {
                // If it has a data property
                return Buffer.from(audio.data);
            } else {
                // Log the actual type for debugging
                console.error(`[ElevenLabs TTS] Unexpected audio format:`, typeof audio, audio?.constructor?.name);
                console.error(`[ElevenLabs TTS] Audio object keys:`, audio ? Object.keys(audio) : 'null/undefined');
                throw new Error(`Unexpected audio format from ElevenLabs API: ${typeof audio}`);
            }
        } catch (error) {
            console.error(`[ElevenLabs TTS] Conversion failed:`, error.message);
            
            // Handle specific ElevenLabs API errors
            if (error.message.includes('API key')) {
                throw new Error('ElevenLabs API key is invalid or missing');
            } else if (error.message.includes('voice')) {
                throw new Error('ElevenLabs voice ID is invalid');
            } else if (error.message.includes('quota')) {
                throw new Error('ElevenLabs API quota exceeded');
            } else {
                throw new Error(`ElevenLabs TTS conversion failed: ${error.message}`);
            }
        }
    }

    /**
     * Get the name of this TTS service
     * @returns {string} - Service name
     */
    getName() {
        return 'ElevenLabs TTS';
    }

    /**
     * Check if the TTS service is available
     * @returns {Promise<boolean>} - True if service is available
     */
    async isAvailable() {
        try {
            if (!this.apiKey) {
                return false;
            }

            const elevenlabs = new ElevenLabsClient({
                apiKey: this.apiKey
            });

            // Try to get user info to verify API key
            await elevenlabs.user.get();
            return true;
        } catch (error) {
            console.warn(`[ElevenLabs TTS] Service availability check failed:`, error.message);
            return false;
        }
    }

    /**
     * Get the current configuration
     * @returns {Object} - Current configuration
     */
    getConfig() {
        return {
            apiKey: this.apiKey ? '***' + this.apiKey.slice(-4) : 'Not set', // Mask API key for security
            defaultVoiceId: this.defaultVoiceId,
            defaultModel: this.defaultModel,
            defaultOutputFormat: this.defaultOutputFormat,
            timeout: this.timeout
        };
    }

    /**
     * Get available voices from ElevenLabs
     * @returns {Promise<Array>} - Array of available voices
     */
    async getAvailableVoices() {
        try {
            const elevenlabs = new ElevenLabsClient({
                apiKey: this.apiKey
            });

            const voices = await elevenlabs.voices.getAll();
            return voices.voices || [];
        } catch (error) {
            console.error(`[ElevenLabs TTS] Failed to get available voices:`, error.message);
            return [];
        }
    }
}

module.exports = ElevenLabs;
