/**
 * Interface for Speech-to-Text (STT) services
 * Defines the contract that all STT implementations must follow
 */
class IStt {
  /**
   * Convert audio file to text/subtitles
   * @param {string} audioPath - Path to the audio file
   * @param {string} outputPath - Path where the subtitle file should be saved
   * @param {Object} options - Additional options for the conversion
   * @returns {Promise<Object>} - Promise that resolves with conversion result
   */
  async convert(audioPath, outputPath, options = {}) {
    throw new Error('convert method must be implemented by subclass');
  }
}

module.exports = IStt;
