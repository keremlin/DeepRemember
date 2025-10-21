# TTS (Text-to-Speech) Module

This module provides a flexible and extensible architecture for Text-to-Speech functionality in the DeepRemember application.

## Environment Configuration

The TTS module uses environment variables for configuration. Set these in your `.env` file or environment:

```bash
# TTS Configuration
TTS_TYPE=piper          # TTS service type (piper, elevenlabs)
TTS_VOICE=pavoque       # Voice to use for speech generation
TTS_MODEL=tts-1-hd      # TTS model to use
TTS_API_KEY=your_api_key # API key for TTS services (ElevenLabs)
```

These variables are loaded from `backend/config/app.js` and can be overridden by environment variables.

## Architecture

The TTS module follows the Factory pattern with an interface-based design:

- **ITts.js** - Interface defining the contract for all TTS implementations
- **TtsFactory.js** - Factory class for creating TTS service instances
- **Piper.js** - Implementation using OpenAI's TTS API (local endpoint)
- **ElevenLabs.js** - Implementation using ElevenLabs API

## Usage

### Basic Usage

```javascript
const TtsFactory = require('./tts/TtsFactory');

// Create a TTS service instance (uses environment configuration)
const ttsService = TtsFactory.createTtsService();

// Convert text to speech (uses configured voice and model)
try {
    const audioBuffer = await ttsService.convert('Hello world');
    
    // Save audio buffer to file
    fs.writeFileSync('output.wav', audioBuffer);
} catch (error) {
    console.error('TTS conversion failed:', error.message);
}
```

### Configuration-Based Usage

```javascript
// The factory automatically uses environment configuration:
// - TTS_TYPE from environment (default: 'piper')
// - TTS_VOICE from environment (default: 'pavoque') 
// - TTS_MODEL from environment (default: 'tts-1-hd')
// - TTS_API_KEY from environment (for ElevenLabs)

const ttsService = TtsFactory.createTtsService();
console.log('TTS Config:', TtsFactory.getConfig());
// Output: { type: 'piper', voice: 'pavoque', model: 'tts-1-hd', apiKey: 'Not set' }
```

### Advanced Configuration

```javascript
// Create with specific configuration
const ttsService = TtsFactory.createTtsService({
    type: 'elevenlabs',
    options: {
        apiKey: 'your_elevenlabs_api_key',
        voiceId: 'JBFqnCBsd6RMkjVDRZzb',
        model: 'eleven_multilingual_v2',
        outputFormat: 'mp3_44100_128',
        timeout: 30000
    }
});
```

## Available Services

### Piper TTS
- **Type**: `piper`
- **Description**: Uses OpenAI's TTS API via local endpoint
- **Default Voice**: `pavoque`
- **Default Model**: `tts-1-hd`
- **Endpoint**: `http://localhost:8000/v1/audio/speech`
- **Requirements**: Local OpenAI API server running on port 8000

### ElevenLabs TTS
- **Type**: `elevenlabs`
- **Description**: Uses ElevenLabs API for high-quality text-to-speech
- **Default Voice ID**: `JBFqnCBsd6RMkjVDRZzb`
- **Default Model**: `eleven_multilingual_v2`
- **Default Output Format**: `mp3_44100_128`
- **Requirements**: ElevenLabs API key (`TTS_API_KEY` environment variable)
- **Package**: `@elevenlabs/elevenlabs-js`

## Interface Methods

### `convert(text, options)`
Converts text to speech audio.

**Parameters:**
- `text` (string): Text to convert to speech
- `options` (object): Optional configuration
  - `voice` (string): Voice to use
  - `model` (string): TTS model to use
  - `timeout` (number): Request timeout in milliseconds

**Returns:** `Promise<Buffer>` - Audio data as Buffer

**Throws:** `Error` - If conversion fails

### `getName()`
Returns the name of the TTS service.

**Returns:** `string` - Service name

### `isAvailable()`
Checks if the TTS service is available.

**Returns:** `Promise<boolean>` - True if service is available

### ElevenLabs-Specific Methods

#### `getAvailableVoices()`
Gets all available voices from ElevenLabs API.

**Returns:** `Promise<Array>` - Array of available voices

**Example:**
```javascript
const elevenlabsService = TtsFactory.createTtsServiceByType('elevenlabs');
const voices = await elevenlabsService.getAvailableVoices();
console.log('Available voices:', voices);
```

## Factory Methods

### `createTtsService(config)`
Creates a TTS service instance based on configuration.

**Parameters:**
- `config` (object): Configuration object
  - `type` (string): Type of TTS service
  - `options` (object): Service-specific options

**Returns:** `ITts` - TTS service instance

### `getAvailableTypes()`
Returns all available TTS service types.

**Returns:** `string[]` - Array of available service types

## Setup Instructions

### Piper TTS Setup
1. Install and run OpenAI API server locally on port 8000
2. Set `TTS_TYPE=piper` in your environment
3. Configure voice and model as needed

### ElevenLabs TTS Setup
1. Install the ElevenLabs package:
   ```bash
   npm install @elevenlabs/elevenlabs-js
   ```

2. Get your API key from [ElevenLabs](https://elevenlabs.io/)

3. Set environment variables:
   ```bash
   TTS_TYPE=elevenlabs
   TTS_API_KEY=your_elevenlabs_api_key
   ```

4. Optionally configure voice ID, model, and output format:
   ```bash
   TTS_VOICE=JBFqnCBsd6RMkjVDRZzb  # Voice ID
   TTS_MODEL=eleven_multilingual_v2  # Model
   ```

## Error Handling

The TTS module includes comprehensive error handling:

- Service availability checks
- Timeout handling
- Graceful degradation when services are unavailable
- Detailed error logging

## Extending the Module

To add a new TTS service:

1. Create a new implementation class extending `ITts`
2. Implement all required interface methods
3. Add the new service type to `TtsFactory`
4. Update the factory's `createTtsService` method

Example:

```javascript
class MyCustomTts extends ITts {
    async convert(text, options = {}) {
        // Implementation here
    }
    
    getName() {
        return 'My Custom TTS';
    }
    
    async isAvailable() {
        // Check availability
    }
}
```
