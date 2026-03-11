// Unit tests for backend/config/app.js
// Rule: "Config lives in backend/config/ — no process.env accessed directly in routes"
// These tests assert that app.js exports ALL env-driven config that routes need.
// They FAIL before the missing keys are added and PASS after.

const config = require('../../../config/app');

describe('config/app.js completeness', () => {
  // Keys already present
  test('exports PORT', () => expect(config.PORT).toBeDefined());
  test('exports NODE_ENV', () => expect(config.NODE_ENV).toBeDefined());
  test('exports TTS_TYPE', () => expect(config.TTS_TYPE).toBeDefined());
  test('exports WHISPER_TYPE', () => expect(config.WHISPER_TYPE).toBeDefined());

  // Keys consumed by routes that were reading process.env directly (HIGH audit finding)
  test('exports FS_TYPE', () => expect(config.FS_TYPE).toBeDefined());
  test('exports LLM_PROVIDER', () => expect(config.LLM_PROVIDER).toBeDefined());
  test('exports LLM_MODEL', () => expect(config.LLM_MODEL).toBeDefined());
  test('exports LLM_BASE_URL', () => expect(config.LLM_BASE_URL).toBeDefined());
  test('exports LLM_API_KEY', () => expect(typeof config.LLM_API_KEY).toBe('string'));

  // Sanity-check types
  test('PORT is a number', () => expect(typeof config.PORT).toBe('number'));
  test('FS_TYPE is a string', () => expect(typeof config.FS_TYPE).toBe('string'));
  test('LLM_PROVIDER is a string', () => expect(typeof config.LLM_PROVIDER).toBe('string'));
});
