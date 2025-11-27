const { LLM } = require('./llm');
const GroqSDK = require('groq-sdk');
const appConfig = require('../config/app');

class Groq extends LLM {
  constructor(config = {}) {
    super();
    this.apiKey = config.apiKey || process.env.LLM_API_KEY || '';
    this.baseUrl = config.baseUrl || process.env.LLM_BASE_URL; // optional override
    this.defaultModel = config.model || process.env.LLM_MODEL || 'llama-3.1-8b-instant';
    this.defaultStream = config.stream === undefined ? false : !!config.stream;
    this.client = new GroqSDK({ apiKey: this.apiKey, baseURL: this.baseUrl });
  }

  async query(prompt, options = {}) {
    if (!this.apiKey) {
      throw new Error('Missing LLM_API_KEY for Groq provider');
    }

    const model = options.model || this.defaultModel;
    const stream = options.stream === undefined ? this.defaultStream : !!options.stream;

    // Log prompt if enabled
    if (appConfig.LOG_LLM_PROMPTS) {
      console.log('[LLM Prompt Log] Groq - Model:', model, '- Stream:', stream);
      console.log('[LLM Prompt Log] Prompt:', prompt);
      console.log('[LLM Prompt Log] Options:', JSON.stringify(options, null, 2));
    }

    if (stream) {
      const completion = await this.client.chat.completions.create({
        model,
        stream: true,
        messages: [ { role: 'user', content: prompt } ]
      });

      let aggregated = '';
      for await (const chunk of completion) {
        const piece = (chunk && chunk.choices && chunk.choices[0] && chunk.choices[0].delta && chunk.choices[0].delta.content) || '';
        if (piece) aggregated += piece;
      }

      return { response: aggregated };
    }

    const completion = await this.client.chat.completions.create({
      model,
      stream: false,
      messages: [ { role: 'user', content: prompt } ]
    });

    const content = completion && completion.choices && completion.choices[0] && completion.choices[0].message && completion.choices[0].message.content
      ? completion.choices[0].message.content
      : '';

    return { response: content };
  }
}

module.exports = { Groq };


