const { Ollama } = require('./ollama');
const { Groq } = require('./groq');

class LlmFactory {
  static create() {
    const provider = (process.env.LLM_PROVIDER || 'ollama').toLowerCase();

    switch (provider) {
      case 'ollama':
        return new Ollama({
          baseUrl: process.env.LLM_BASE_URL,
          model: process.env.LLM_MODEL,
          stream: process.env.LLM_STREAM === 'true'
        });
      case 'groq':
        return new Groq({
          baseUrl: process.env.LLM_BASE_URL,
          model: process.env.LLM_MODEL,
          apiKey: process.env.LLM_API_KEY,
          stream: process.env.LLM_STREAM === 'true'
        });
      default:
        throw new Error(`Unsupported LLM provider: ${provider}`);
    }
  }
}

module.exports = { LlmFactory };


