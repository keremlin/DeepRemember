/**
 * Interface for Text-to-Speech (TTS) services
 * Defines the contract that all TTS implementations must follow
 */
class ITts {
    /**
     * Convert text to speech audio
     * @param {string} text - The text to convert to speech
     * @param {Object} options - Optional configuration for TTS
     * @param {string} options.voice - Voice to use for speech generation
     * @param {string} options.model - TTS model to use
     * @param {number} options.timeout - Request timeout in milliseconds
     * @returns {Promise<Buffer>} - Audio data as Buffer
     * @throws {Error} - If conversion fails
     */
    async convert(text, options = {}) {
        throw new Error('convert method must be implemented by TTS service');
    }

    /**
     * Get the name of this TTS service
     * @returns {string} - Service name
     */
    getName() {
        throw new Error('getName method must be implemented by TTS service');
    }

    /**
     * Check if the TTS service is available
     * @returns {Promise<boolean>} - True if service is available
     */
    async isAvailable() {
        throw new Error('isAvailable method must be implemented by TTS service');
    }
}

module.exports = ITts;

