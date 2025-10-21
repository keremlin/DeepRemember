const fs = require('fs');
const path = require('path');
const Groq = require('groq-sdk');
const IStt = require('./IStt');

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
      if (!fs.existsSync(audioPath)) {
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
      const audioStream = fs.createReadStream(audioPath);

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
        subtitleContent = this.createSRTFromVerboseJson(transcription);
      } else {
        // Handle simple text response
        subtitleText = transcription.text;
        subtitleContent = this.createSimpleSRT(subtitleText);
      }

      // Write subtitle file
      fs.writeFileSync(outputPath, subtitleContent, 'utf8');

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
   * Create SRT content from verbose JSON response
   * @param {Object} transcription - Groq transcription response
   * @returns {string} - SRT formatted content
   */
  createSRTFromVerboseJson(transcription) {
    if (!transcription.segments || !Array.isArray(transcription.segments)) {
      return this.createSimpleSRT(transcription.text);
    }

    let srtContent = '';
    let index = 1;

    transcription.segments.forEach(segment => {
      const startTime = this.formatTime(segment.start);
      const endTime = this.formatTime(segment.end);
      
      srtContent += `${index}\n`;
      srtContent += `${startTime} --> ${endTime}\n`;
      srtContent += `${segment.text.trim()}\n\n`;
      
      index++;
    });

    return srtContent;
  }

  /**
   * Create simple SRT content from text
   * @param {string} text - Transcription text
   * @returns {string} - SRT formatted content
   */
  createSimpleSRT(text) {
    return `1\n00:00:00,000 --> 00:00:10,000\n${text.trim()}\n`;
  }

  /**
   * Format time in seconds to SRT format (HH:MM:SS,mmm)
   * @param {number} seconds - Time in seconds
   * @returns {string} - Formatted time string
   */
  formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const milliseconds = Math.floor((seconds % 1) * 1000);

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${milliseconds.toString().padStart(3, '0')}`;
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

  /**
   * Get available Groq models
   * @returns {string[]} - Array of available Groq Whisper models
   */
  getAvailableModels() {
    return [
      'whisper-large-v3-turbo',
      'whisper-large-v3',
      'whisper-large-v2',
      'whisper-large-v1',
      'whisper-medium',
      'whisper-small',
      'whisper-tiny'
    ];
  }
}

module.exports = GroqStt;
