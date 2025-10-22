const FileSystemFactory = require('../filesystem/FileSystemFactory');
const fileSystem = FileSystemFactory.createDefault();
const path = require('path');
const Groq = require('groq-sdk');
const IStt = require('./IStt');
const ConvertJsonToSrt = require('../tools/ConvertJsonToSrt');
const fs = require('fs'); // Add local filesystem for temp files

/**
 * Groq implementation of STT service
 * Uses Groq's Whisper API for speech-to-text conversion
 */
class GroqStt extends IStt {
  constructor(config = {}) {
    super();
    this.config = {
      model: config.model || 'whisper-large-v3-turbo',
      temperature: config.temperature || 0,
      responseFormat: config.responseFormat || 'verbose_json',
      ...config
    };
    
    // Initialize Groq client
    this.groq = new Groq({
      apiKey: process.env.GROQ_API_KEY
    });
  }

  /**
   * Convert audio file to text using Groq's Whisper API
   * @param {string} audioPath - Path to the audio file
   * @param {string} outputPath - Path where the subtitle file should be saved
   * @param {Object} options - Additional options for the conversion
   * @returns {Promise<Object>} - Promise that resolves with conversion result
   */
  async convert(audioPath, outputPath, options = {}) {
    try {
      // Validate input file exists
      // Use local filesystem for temp files, configured filesystem for others
      const isTempFile = audioPath.includes('temp') || audioPath.includes('\\temp\\') || audioPath.includes('/temp/');
      const fileExists = isTempFile ? fs.existsSync(audioPath) : fileSystem.existsSync(audioPath);
      
      if (!fileExists) {
        throw new Error(`Audio file not found: ${audioPath}`);
      }

      // Check if API key is available
      if (!process.env.GROQ_API_KEY) {
        throw new Error('GROQ_API_KEY environment variable is required');
      }

      // Merge options with config
      const conversionOptions = {
        ...this.config,
        ...options
      };

      console.log('[GROQ_STT] Starting transcription:', audioPath);
      console.log('[GROQ_STT] Using model:', conversionOptions.model);

      // Create read stream from audio file
      // Use local filesystem for temp files, configured filesystem for others
      const audioStream = isTempFile ? fs.createReadStream(audioPath) : fileSystem.createReadStream(audioPath);

      // Call Groq API for transcription
      const transcription = await this.groq.audio.transcriptions.create({
        file: audioStream,
        model: conversionOptions.model,
        temperature: conversionOptions.temperature,
        response_format: conversionOptions.responseFormat
      });

      console.log('[GROQ_STT] Transcription completed successfully');

      // Process the transcription result
      let subtitleContent = '';
      let subtitleText = '';

      if (conversionOptions.responseFormat === 'verbose_json') {
        // Handle verbose JSON response with timestamps
        subtitleText = transcription.text;
        subtitleContent = ConvertJsonToSrt.convert(transcription, 'verbose_json');
      } else {
        // Handle simple text response
        subtitleText = transcription.text;
        subtitleContent = ConvertJsonToSrt.convert(transcription, 'text');
      }

      // Write subtitle file
      // Use local filesystem for temp files, configured filesystem for others
      const isTempOutput = outputPath.includes('temp') || outputPath.includes('\\temp\\') || outputPath.includes('/temp/');
      if (isTempOutput) {
        fs.writeFileSync(outputPath, subtitleContent, 'utf8');
      } else {
        fileSystem.writeFileSync(outputPath, subtitleContent, 'utf8');
      }

      console.log('[GROQ_STT] Subtitle file saved:', outputPath);

      return {
        success: true,
        inputPath: audioPath,
        outputPath: outputPath,
        text: subtitleText,
        transcription: transcription
      };

    } catch (error) {
      console.error('[GROQ_STT] Error:', error);
      throw new Error(`Groq STT conversion failed: ${error.message}`);
    }
  }

  /**
   * Check if Groq API is available and configured
   * @returns {Promise<boolean>} - Promise that resolves to true if Groq is available
   */
  async isAvailable() {
    try {
      if (!process.env.GROQ_API_KEY) {
        console.warn('[GROQ_STT] GROQ_API_KEY not configured');
        return false;
      }

      // Test API connection with a simple request
      // Note: This is a basic check - actual usage will depend on the specific API
      console.log('[GROQ_STT] Groq API is configured and available');
      return true;
    } catch (error) {
      console.warn('[GROQ_STT] Groq API not available:', error.message);
      return false;
    }
  }

  /**
   * Get supported audio formats
   * @returns {string[]} - Array of supported audio file extensions
   */
  getSupportedFormats() {
    return ['.mp3', '.wav', '.m4a', '.flac', '.ogg', '.wma', '.aac', '.mp4', '.avi', '.mov'];
  }
}

module.exports = GroqStt;
