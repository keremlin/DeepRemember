module.exports = {
  PORT: process.env.PORT || 4004,
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // File upload settings
  MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB
  ALLOWED_MEDIA_TYPES: ['audio/*', 'video/*'],
  ALLOWED_SUBTITLE_TYPES: ['.srt', '.vtt', '.txt'],
  
  // Whisper settings
  WHISPER_OUTPUT_FORMAT: 'srt',
  
  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || 'info'
};
