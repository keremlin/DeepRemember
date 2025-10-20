const { Ollama } = require('./ollama');

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
      default:
        throw new Error(`Unsupported LLM provider: ${provider}`);
    }
  }
}

module.exports = { LlmFactory };


