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
  
  // TTS Service settings
  TTS_TYPE: process.env.TTS_TYPE || 'piper', // Available: piper, elevenlabs, google
  TTS_VOICE: process.env.TTS_VOICE || 'pavoque', // Voice for TTS (ElevenLabs format), NOT used for Google TTS
  TTS_MODEL: process.env.TTS_MODEL || 'tts-1-hd', // Model for TTS
  TTS_API_KEY: process.env.TTS_API_KEY || '', // API key for TTS services (ElevenLabs)
  
  // Google Cloud TTS specific settings
  GOOGLE_TTS_VOICE: process.env.GOOGLE_TTS_VOICE || 'de-DE-Neural2-F', // Voice for Google TTS
  GOOGLE_TTS_LANGUAGE_CODE: process.env.GOOGLE_TTS_LANGUAGE_CODE || 'de-DE', // Language code for Google TTS
  GOOGLE_TTS_SSML_GENDER: process.env.GOOGLE_TTS_SSML_GENDER || 'FEMALE', // Gender for Google TTS (MALE or FEMALE)
  GOOGLE_TTS_AUDIO_ENCODING: process.env.GOOGLE_TTS_AUDIO_ENCODING || 'MP3', // Audio encoding (MP3, LINEAR16, OGG_OPUS)
  
  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  DB_LOG: process.env.DB_LOG === 'true' || process.env.DB_LOG === '1'
};

