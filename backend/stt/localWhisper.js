const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const IStt = require('./IStt');

/**
 * Local Whisper implementation of STT service
 * Uses OpenAI's Whisper command-line tool for speech-to-text conversion
 */
class LocalWhisper extends IStt {
  constructor(config = {}) {
    super();
    this.config = {
      outputFormat: 'srt',
      model: config.model || 'base', // whisper model size: tiny, base, small, medium, large, large-v2, large-v3
      language: null, // auto-detect if not specified
      ...config
    };
  }

  /**
   * Convert audio file to SRT subtitles using Whisper
   * @param {string} audioPath - Path to the audio file
   * @param {string} outputPath - Path where the subtitle file should be saved
   * @param {Object} options - Additional options for the conversion
   * @returns {Promise<Object>} - Promise that resolves with conversion result
   */
  async convert(audioPath, outputPath, options = {}) {
    return new Promise((resolve, reject) => {
      // Validate input file exists
      if (!fs.existsSync(audioPath)) {
        return reject(new Error(`Audio file not found: ${audioPath}`));
      }

      // Merge options with config
      const conversionOptions = {
        ...this.config,
        ...options
      };

      // Build Whisper command
      const whisperCommand = this.buildWhisperCommand(audioPath, outputPath, conversionOptions);
      
      console.log('[LOCAL_WHISPER] Running command:', whisperCommand);
      console.log('[LOCAL_WHISPER] Converting audio:', audioPath);

      // Execute Whisper command
      exec(whisperCommand, { cwd: path.dirname(audioPath) }, (error, stdout, stderr) => {
        if (error) {
          console.error('[LOCAL_WHISPER] Error:', error);
          console.error('[LOCAL_WHISPER] Stderr:', stderr);
          return reject(new Error(`Whisper conversion failed: ${error.message}`));
        }

        // Check if output file was created
        if (!fs.existsSync(outputPath)) {
          console.warn('[LOCAL_WHISPER] Warning: Output file not found after conversion');
        }

        console.log('[LOCAL_WHISPER] Conversion completed successfully');
        console.log('[LOCAL_WHISPER] Output:', stdout);

        resolve({
          success: true,
          inputPath: audioPath,
          outputPath: outputPath,
          stdout: stdout,
          stderr: stderr
        });
      });
    });
  }

  /**
   * Build the Whisper command string
   * @param {string} audioPath - Path to the audio file
   * @param {string} outputPath - Path where the subtitle file should be saved
   * @param {Object} options - Conversion options
   * @returns {string} - Whisper command string
   */
  buildWhisperCommand(audioPath, outputPath, options) {
    const outputDir = path.dirname(outputPath);
    const outputName = path.basename(outputPath, path.extname(outputPath));
    
    let command = `whisper --output_format ${options.outputFormat}`;
    
    // Add output directory if specified
    if (outputDir && outputDir !== '.') {
      command += ` --output_dir "${outputDir}"`;
    }
    
    // Add model if specified
    if (options.model) {
      command += ` --model ${options.model}`;
    }
    
    // Add language if specified
    if (options.language) {
      command += ` --language ${options.language}`;
    }
    
    // Add additional options
    if (options.task) {
      command += ` --task ${options.task}`;
    }
    
    if (options.fp16 !== undefined) {
      command += ` --fp16 ${options.fp16}`;
    }
    
    // Add input file (always last)
    command += ` "${audioPath}"`;
    
    return command;
  }

  /**
   * Check if Whisper is installed and available
   * @returns {Promise<boolean>} - Promise that resolves to true if Whisper is available
   */
  async isAvailable() {
    return new Promise((resolve) => {
      exec('whisper --version', (error, stdout, stderr) => {
        if (error) {
          console.warn('[LOCAL_WHISPER] Whisper not available:', error.message);
          resolve(false);
        } else {
          console.log('[LOCAL_WHISPER] Whisper version:', stdout.trim());
          resolve(true);
        }
      });
    });
  }

  /**
   * Get supported audio formats
   * @returns {string[]} - Array of supported audio file extensions
   */
  getSupportedFormats() {
    return ['.mp3', '.wav', '.m4a', '.flac', '.ogg', '.wma', '.aac', '.mp4', '.avi', '.mov'];
  }
}

module.exports = LocalWhisper;
