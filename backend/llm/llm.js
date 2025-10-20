// Simple LLM interface with a single query method
class LLM {
  // Query the LLM with a prompt. Options can include model, stream, etc.
  // Subclasses must implement this method and return a JSON object result
  // consistent with the underlying provider's response shape.
  async query(prompt, options = {}) { // eslint-disable-line no-unused-vars
    throw new Error('LLM.query(prompt, options) must be implemented by subclasses');
  }
}

module.exports = { LLM };


