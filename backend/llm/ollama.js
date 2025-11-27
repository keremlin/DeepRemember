const { LLM } = require('./llm');
const appConfig = require('../config/app');

class Ollama extends LLM {
  constructor(config = {}) {
    super();
    this.baseUrl = config.baseUrl || process.env.LLM_BASE_URL || 'http://localhost:11434';
    this.defaultModel = config.model || process.env.LLM_MODEL || 'llama3.2';
    this.defaultStream = config.stream === undefined ? false : !!config.stream;
  }

  async query(prompt, options = {}) {
    const model = options.model || this.defaultModel;
    const stream = options.stream === undefined ? this.defaultStream : !!options.stream;
    const url = `${this.baseUrl}/api/generate`;

    // Log prompt if enabled
    if (appConfig.LOG_LLM_PROMPTS) {
      console.log('[LLM Prompt Log] Ollama - Model:', model, '- Stream:', stream, '- URL:', url);
      console.log('[LLM Prompt Log] Prompt:', prompt);
      console.log('[LLM Prompt Log] Options:', JSON.stringify(options, null, 2));
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt, stream })
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`Ollama error ${response.status}: ${text}`);
    }

    return await response.json();
  }
}

module.exports = { Ollama };


