const LocalWhisper = require('./localWhisper');
const GroqStt = require('./Groq');
const config = require('../config/app');

/**
 * Factory class for creating STT service instances
 * Provides a centralized way to instantiate different STT implementations
 * Configuration is read from environment variables and config files
 */
class SstFactory {
  /**
   * Create an STT service instance using configured type
   * @param {Object} configOverride - Override configuration options
   * @returns {IStt} - STT service instance
   */
  static createSstService(configOverride = {}) {
    const sstType = configOverride.type || config.WHISPER_TYPE;
    const sstConfig = {
      outputFormat: configOverride.outputFormat || config.WHISPER_OUTPUT_FORMAT,
      model: configOverride.model || config.WHISPER_MODEL,
      ...configOverride
    };

    return this.createSstServiceByType(sstType, sstConfig);
  }

  /**
   * Create an STT service instance by specific type
   * @param {string} type - Type of STT service ('LocalWhisper', 'groq', etc.)
   * @param {Object} config - Configuration options for the STT service
   * @returns {IStt} - STT service instance
   */
  static createSstServiceByType(type, config = {}) {
    switch (type.toLowerCase()) {
      case 'localwhisper':
      case 'whisper':
        return new LocalWhisper(config);
      
      case 'groq':
      case 'groqstt':
        return new GroqStt(config);
      
      // Future STT services can be added here
      // case 'google':
      //   return new GoogleStt(config);
      // case 'azure':
      //   return new AzureStt(config);
      
      default:
        throw new Error(`Unsupported STT service type: ${type}. Available types: ${this.getAvailableTypes().join(', ')}`);
    }
  }

  /**
   * Get available STT service types
   * @returns {string[]} - Array of available STT service types
   */
  static getAvailableTypes() {
    return ['LocalWhisper', 'Groq'];
  }

  /**
   * Get the currently configured STT service type
   * @returns {string} - Currently configured STT service type
   */
  static getConfiguredType() {
    return config.WHISPER_TYPE;
  }
}

module.exports = SstFactory;
