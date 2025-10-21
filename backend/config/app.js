module.exports = {
  PORT: process.env.PORT || 4004,
  NODE_ENV: process.env.NODE_ENV || 'development',
  
  // File upload settings
  MAX_FILE_SIZE: 100 * 1024 * 1024, // 100MB
  ALLOWED_MEDIA_TYPES: ['audio/*', 'video/*'],
  ALLOWED_SUBTITLE_TYPES: ['.srt', '.vtt', '.txt'],
  
  // STT Service settings
  WHISPER_TYPE: process.env.WHISPER_TYPE || 'LocalWhisper', // Available: LocalWhisper, Groq
  WHISPER_MODEL: process.env.WHISPER_MODEL || 'whisper-large-v3-turbo', // For Groq: whisper-large-v3-turbo, whisper-large-v3, etc. For LocalWhisper: tiny, base, small, medium, large, large-v2, large-v3
  WHISPER_OUTPUT_FORMAT: 'srt',
  
  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || 'info'
};
