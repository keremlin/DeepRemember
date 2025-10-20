# LLM Integration

This folder contains the abstraction and implementations used to interact with Large Language Models (LLMs).

## Files

- `llm.js`: Interface defining a single `query(prompt, options)` method.
- `ollama.js`: Implementation of `llm.js` that calls an Ollama server.
- `groq.js`: Implementation of `llm.js` using the official `groq-sdk`.
- `LlmFactory.js`: Factory that selects and instantiates the desired LLM based on environment variables.

## Environment Variables

The backend reads the following environment variables in `server.js` via `dotenv`. Configure them in `backend/.env`:

```env
LLM_PROVIDER=ollama
LLM_BASE_URL=http://localhost:11434
LLM_MODEL=llama3.2
LLM_STREAM=false
LLM_API_KEY= # required for providers that need API keys (e.g., groq)
```

- `LLM_PROVIDER`: which LLM implementation to use. Supported: `ollama`, `groq`.
- `LLM_BASE_URL`: base URL of the LLM server (for Ollama).
- `LLM_MODEL`: model name to use (e.g., `llama3.2`).
- `LLM_STREAM`: whether to request streamed responses (`true`/`false`).
- `LLM_API_KEY`: API key for providers that require it (Groq).

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

## Provider-specific notes

### Ollama

- Uses `LLM_BASE_URL` (default `http://localhost:11434`).
- Default model is `llama3.2` unless overridden by `LLM_MODEL`.

### Groq

- Uses the official `groq-sdk`. Install is already included in backend `package.json`.
- Requires `LLM_API_KEY` in `.env`.
- Optional `LLM_BASE_URL` can override SDK base URL (defaults to Groq's).
- Default model is `llama-3.1-8b-instant` unless overridden by `LLM_MODEL`.

Example non-streaming usage (factory-managed):

```js
const { LlmFactory } = require('../llm/LlmFactory');
const llmClient = LlmFactory.create();
const data = await llmClient.query('Translate this sentence to German.', { stream: false });
console.log(data.response);
```

Example streaming aggregation (server-side):

```js
const { LlmFactory } = require('../llm/LlmFactory');
const llmClient = LlmFactory.create();
const data = await llmClient.query('Explain SRS briefly.', { stream: true });
console.log(data.response); // aggregated content
```


