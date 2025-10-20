const { LLM } = require('./llm');

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


