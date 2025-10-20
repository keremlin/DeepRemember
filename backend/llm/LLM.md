# LLM Integration

This folder contains the abstraction and implementations used to interact with Large Language Models (LLMs).

## Files

- `llm.js`: Interface defining a single `query(prompt, options)` method.
- `ollama.js`: Implementation of `llm.js` that calls an Ollama server.
- `LlmFactory.js`: Factory that selects and instantiates the desired LLM based on environment variables.

## Environment Variables

The backend reads the following environment variables in `server.js` via `dotenv`. Configure them in `backend/.env`:

```env
LLM_PROVIDER=ollama
LLM_BASE_URL=http://localhost:11434
LLM_MODEL=llama3.2
LLM_STREAM=false
```

- `LLM_PROVIDER`: which LLM implementation to use. Currently supported: `ollama`.
- `LLM_BASE_URL`: base URL of the LLM server (for Ollama).
- `LLM_MODEL`: model name to use (e.g., `llama3.2`).
- `LLM_STREAM`: whether to request streamed responses (`true`/`false`).

## Usage

Use the factory to obtain the configured LLM client:

```js
const { LlmFactory } = require('../llm/LlmFactory');
const llmClient = LlmFactory.create();

const data = await llmClient.query('your prompt here', { model: 'llama3.2', stream: false });
```

In this project, `backend/routes/deepRemember.js` uses the LLM client for translation and sentence analysis endpoints.

## Extending

To add a new provider:
1. Create `yourProvider.js` implementing the `LLM` interface.
2. Update `LlmFactory.js` to handle `LLM_PROVIDER=yourProvider`.
3. Add any new environment variables as needed.


