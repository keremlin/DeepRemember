/**
 * Utility class for converting JSON transcription data to SRT format
 * Handles various transcription formats and converts them to standard SRT subtitles
 */
class ConvertJsonToSrt {
  /**
   * Convert transcription JSON to SRT format
   * @param {Object} transcription - Transcription data from various STT services
   * @param {string} format - Format type ('verbose_json', 'text', 'auto')
   * @returns {string} - SRT formatted content
   */
  static convert(transcription, format = 'auto') {
    if (!transcription) {
      throw new Error('Transcription data is required');
    }

    // Auto-detect format if not specified
    if (format === 'auto') {
      format = this.detectFormat(transcription);
    }

    switch (format.toLowerCase()) {
      case 'verbose_json':
        return this.createSRTFromVerboseJson(transcription);
      
      case 'text':
      case 'simple':
        return this.createSimpleSRT(transcription.text || transcription);
      
      default:
        // Fallback to simple SRT
        return this.createSimpleSRT(transcription.text || transcription);
    }
  }

  /**
   * Auto-detect the format of transcription data
   * @param {Object} transcription - Transcription data
   * @returns {string} - Detected format
   */
  static detectFormat(transcription) {
    if (typeof transcription === 'string') {
      return 'text';
    }

    if (transcription.segments && Array.isArray(transcription.segments)) {
      return 'verbose_json';
    }

    if (transcription.text) {
      return 'text';
    }

    return 'text'; // Default fallback
  }

  /**
   * Create SRT content from verbose JSON response with segments
   * @param {Object} transcription - Transcription response with segments
   * @returns {string} - SRT formatted content
   */
  static createSRTFromVerboseJson(transcription) {
    if (!transcription.segments || !Array.isArray(transcription.segments)) {
      return this.createSimpleSRT(transcription.text || '');
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
   * Create simple SRT content from plain text
   * @param {string} text - Transcription text
   * @returns {string} - SRT formatted content
   */
  static createSimpleSRT(text) {
    if (!text || typeof text !== 'string') {
      return '1\n00:00:00,000 --> 00:00:10,000\nNo transcription available\n';
    }

    return `1\n00:00:00,000 --> 00:00:10,000\n${text.trim()}\n`;
  }

  /**
   * Format time in seconds to SRT format (HH:MM:SS,mmm)
   * @param {number} seconds - Time in seconds
   * @returns {string} - Formatted time string
   */
  static formatTime(seconds) {
    if (typeof seconds !== 'number' || isNaN(seconds)) {
      return '00:00:00,000';
    }

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const milliseconds = Math.floor((seconds % 1) * 1000);

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${milliseconds.toString().padStart(3, '0')}`;
  }

  /**
   * Validate SRT content
   * @param {string} srtContent - SRT formatted content
   * @returns {boolean} - True if valid SRT format
   */
  static validateSRT(srtContent) {
    if (!srtContent || typeof srtContent !== 'string') {
      return false;
    }

    // Basic SRT format validation
    const lines = srtContent.split('\n');
    let hasSequence = false;
    let hasTimecode = false;
    let hasText = false;

    for (const line of lines) {
      const trimmedLine = line.trim();
      
      if (/^\d+$/.test(trimmedLine)) {
        hasSequence = true;
      } else if (/^\d{2}:\d{2}:\d{2},\d{3}\s*-->\s*\d{2}:\d{2}:\d{2},\d{3}$/.test(trimmedLine)) {
        hasTimecode = true;
      } else if (trimmedLine && !hasSequence && !hasTimecode) {
        hasText = true;
      }
    }

    return hasSequence && hasTimecode && hasText;
  }

  /**
   * Get supported input formats
   * @returns {string[]} - Array of supported input formats
   */
  static getSupportedFormats() {
    return ['verbose_json', 'text', 'simple', 'auto'];
  }
}

module.exports = ConvertJsonToSrt;
