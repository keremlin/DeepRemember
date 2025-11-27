# LLM Integration

This folder contains the abstraction and implementations used to interact with Large Language Models (LLMs).

## Available LLM APIs

The project supports **2 LLM providers**:

### 1. Ollama
- **Type**: Local/self-hosted LLM server
- **Default model**: `llama3.2`
- **Base URL**: `http://localhost:11434` (default)
- **API key**: Not required
- **Implementation**: `backend/llm/ollama.js`

### 2. Groq
- **Type**: Cloud-based LLM API
- **Default model**: `llama-3.1-8b-instant`
- **Base URL**: Groq's default (can be overridden)
- **API key**: Required
- **Implementation**: `backend/llm/groq.js`

## Files

- `llm.js`: Interface defining a single `query(prompt, options)` method.
- `ollama.js`: Implementation of `llm.js` that calls an Ollama server.
- `groq.js`: Implementation of `llm.js` using the official `groq-sdk`.
- `LlmFactory.js`: Factory that selects and instantiates the desired LLM based on environment variables.

## Configuration

Configure via environment variables in `backend/.env`:

```env
LLM_PROVIDER=ollama          # or "groq"
LLM_BASE_URL=http://localhost:11434  # For Ollama
LLM_MODEL=llama3.2           # Model name
LLM_STREAM=false             # true/false for streaming
LLM_API_KEY=                 # Required for Groq
LOG_LLM_PROMPTS=false        # Enable/disable logging of prompts sent to LLM (true/false)
```

### Environment Variables

- `LLM_PROVIDER`: which LLM implementation to use. Supported: `ollama`, `groq`.
- `LLM_BASE_URL`: base URL of the LLM server (for Ollama).
- `LLM_MODEL`: model name to use (e.g., `llama3.2`).
- `LLM_STREAM`: whether to request streamed responses (`true`/`false`).
- `LLM_API_KEY`: API key for providers that require it (Groq).
- `LOG_LLM_PROMPTS`: enable/disable logging of prompts sent to LLM (`true`/`false`). When enabled, logs the model, stream settings, prompt content, and options before sending to the LLM.

## Usage in the Project

### Factory Pattern

The project uses a factory pattern to create LLM clients:

```javascript
const { LlmFactory } = require('../llm/LlmFactory');
const llmClient = LlmFactory.create();
```

### Query Method

All LLM implementations use the same interface:

```javascript
const data = await llmClient.query(prompt, options);
// Returns: { response: "..." }
```

**Options:**
- `model`: Override default model
- `stream`: Enable/disable streaming (default: false)

### Example Usage

**Non-streaming usage:**
```js
const { LlmFactory } = require('../llm/LlmFactory');
const llmClient = LlmFactory.create();
const data = await llmClient.query('Translate this sentence to German.', { stream: false });
console.log(data.response);
```

**Streaming usage (server-side aggregation):**
```js
const { LlmFactory } = require('../llm/LlmFactory');
const llmClient = LlmFactory.create();
const data = await llmClient.query('Explain SRS briefly.', { stream: true });
console.log(data.response); // aggregated content
```

## API Endpoints Using LLM

The LLM is used in **3 endpoints** in `backend/routes/deepRemember.js`:

### 1. POST `/api/deep-remember/translate-word`
- **Purpose**: Translate words and generate sample sentences
- **Usage**: `llmClient.query(prompt, { stream: false })`
- **Location**: Line 475

### 2. POST `/api/deep-remember/analyze-sentence`
- **Purpose**: Analyze sentence structure, grammar, and translation
- **Usage**: `llmClient.query(prompt, { stream: false })`
- **Location**: Line 578

### 3. POST `/api/deep-remember/translate`
- **Purpose**: Unified translation endpoint (word or sentence)
- **Usage**: `llmClient.query(prompt, { stream: false })`
- **Location**: Line 647

## Provider-Specific Notes

### Ollama

- Uses `LLM_BASE_URL` (default `http://localhost:11434`).
- Default model is `llama3.2` unless overridden by `LLM_MODEL`.
- No API key required.
- Runs locally, requires Ollama server to be running.

### Groq

- Uses the official `groq-sdk`. Install is already included in backend `package.json`.
- Requires `LLM_API_KEY` in `.env`.
- Optional `LLM_BASE_URL` can override SDK base URL (defaults to Groq's).
- Default model is `llama-3.1-8b-instant` unless overridden by `LLM_MODEL`.
- Cloud-based service, requires internet connection.

## Summary Table

| Provider | API Type | Requires API Key | Default Model | Used For |
|----------|----------|------------------|---------------|----------|
| **Ollama** | Local server | No | `llama3.2` | Translation, sentence analysis |
| **Groq** | Cloud API | Yes | `llama-3.1-8b-instant` | Translation, sentence analysis |

## Extending

To add a new provider:

1. Create `yourProvider.js` implementing the `LLM` interface.
2. Update `LlmFactory.js` to handle `LLM_PROVIDER=yourProvider`.
3. Add any new environment variables as needed.

All LLM calls go through the factory pattern, so switching providers only requires changing the `LLM_PROVIDER` environment variable.
