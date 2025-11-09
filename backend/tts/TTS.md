# TTS (Text-to-Speech) Module

This module provides a flexible and extensible architecture for Text-to-Speech functionality in the DeepRemember application.

## Environment Configuration

The TTS module uses environment variables for configuration. Set these in your `.env` file or environment:

```bash
# TTS Configuration
TTS_TYPE=piper          # TTS service type (piper, elevenlabs, google)
TTS_VOICE=pavoque       # Voice for TTS (ElevenLabs format), NOT used for Google TTS
TTS_MODEL=tts-1-hd      # TTS model to use
TTS_API_KEY=your_api_key # API key for TTS services (ElevenLabs)

# Google Cloud TTS specific settings
GOOGLE_TTS_VOICE=de-DE-Neural2-F  # Voice for Google TTS
GOOGLE_TTS_LANGUAGE_CODE=de-DE   # Language code for Google TTS
GOOGLE_TTS_SSML_GENDER=FEMALE    # Gender for Google TTS (MALE or FEMALE)

# Google Cloud TTS (reuses Google Drive OAuth credentials)
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_ACCESS_TOKEN=your_access_token
GOOGLE_REFRESH_TOKEN=your_refresh_token
```

These variables are loaded from `backend/config/app.js` and can be overridden by environment variables.

## Architecture

The TTS module follows the Factory pattern with an interface-based design:

- **ITts.js** - Interface defining the contract for all TTS implementations
- **TtsFactory.js** - Factory class for creating TTS service instances
- **Piper.js** - Implementation using OpenAI's TTS API (local endpoint)
- **ElevenLabs.js** - Implementation using ElevenLabs API
- **GoogleTts.js** - Implementation using Google Cloud Text-to-Speech API

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

### Google Cloud TTS
- **Type**: `google` or `googletts`
- **Description**: Uses Google Cloud Text-to-Speech API
- **Default Voice**: `de-DE-Neural2-F`
- **Default Language Code**: `de-DE`
- **Default SSML Gender**: `FEMALE` (MALE or FEMALE are supported, NEUTRAL is not supported)
- **Default Audio Encoding**: `MP3` (output format)
- **Default Sample Rate**: `24000 Hz`
- **Output Format**: MP3 (saved as `.mp3` files)
- **Requirements**: Google OAuth credentials (reuses Google Drive API credentials)
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`
  - `GOOGLE_ACCESS_TOKEN`
  - `GOOGLE_REFRESH_TOKEN`
- **Package**: `@google-cloud/text-to-speech`
- **Note**: Reuses existing Google Drive OAuth credentials - no additional setup needed

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

### Google Cloud TTS-Specific Methods

#### `getAvailableVoices(languageCode)`
Gets all available voices from Google Cloud TTS API.

**Parameters:**
- `languageCode` (string, optional): Language code to filter voices (e.g., 'de-DE')

**Returns:** `Promise<Array>` - Array of available voices

**Example:**
```javascript
const googleService = TtsFactory.createTtsServiceByType('google');
const voices = await googleService.getAvailableVoices('de-DE');
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

### Google Cloud TTS Setup
1. Install the Google Cloud Text-to-Speech package:
   ```bash
   npm install @google-cloud/text-to-speech
   ```

2. Enable the Cloud Text-to-Speech API in your Google Cloud Console:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Select your project
   - Navigate to "APIs & Services" > "Library"
   - Search for "Cloud Text-to-Speech API"
   - Click "Enable"

3. **Important: OAuth Token Requirements**
   
   Google Cloud TTS requires the `cloud-platform` scope, which is different from Google Drive scopes. Your existing Google Drive OAuth token will NOT work for TTS!
   
   **✅ Automatic Token Refresh**
   
   The Google TTS implementation automatically handles token refresh using refresh tokens. When your access token expires (after ~1 hour), it will automatically refresh using the refresh token, so you don't need to manually re-authenticate.
   
   **To get a refresh token, the OAuth setup MUST include:**
   - `access_type=offline` - This ensures Google provides a refresh token
   - `prompt=consent` - This forces Google to show the consent screen and provide a refresh token
   
   The setup script (`setup-google-tts-oauth.js`) is already configured with these parameters.
   
   You have two options:
   
   **Option A: Re-authenticate with combined scopes (Recommended)**
   
   Run the setup script to get new tokens with both Drive and TTS scopes:
   ```bash
   cd backend
   node tts/setup-google-tts-oauth.js
   ```
   
   This will generate new tokens that work for both Google Drive and Google Cloud TTS. The setup script ensures you get a refresh token for automatic token renewal.
   
   **Option B: Use separate credentials**
   
   If you want to keep Drive and TTS separate, you can create separate OAuth client IDs or use different tokens for each service.

4. Ensure you have Google OAuth credentials configured:
   ```bash
   GOOGLE_CLIENT_ID=your_client_id
   GOOGLE_CLIENT_SECRET=your_client_secret
   GOOGLE_REDIRECT_URI=your_redirect_uri
   ```
   
   After running the setup script, update your `.env` file with the new tokens:
   ```bash
   GOOGLE_ACCESS_TOKEN=your_new_access_token
   GOOGLE_REFRESH_TOKEN=your_new_refresh_token
   ```

5. Set environment variables:
   ```bash
   TTS_TYPE=google
   GOOGLE_TTS_VOICE=de-DE-Neural2-F  # Optional: specify voice (default is de-DE-Neural2-F)
   GOOGLE_TTS_LANGUAGE_CODE=de-DE    # Optional: specify language code (default is de-DE)
   ```

6. **Troubleshooting**: 
   
   - **UNAUTHENTICATED errors**: Your OAuth token doesn't have the Cloud Platform scope. Run the setup script from step 3 to get new tokens with the correct scopes.
   
   - **Token expiration errors**: If you see "invalid_grant" or token expiration errors, make sure you have a refresh token set in `GOOGLE_REFRESH_TOKEN`. The system will automatically refresh access tokens, but it needs a valid refresh token. If you don't have one, re-run the setup script with `access_type=offline` and `prompt=consent`.
   
   - **No refresh token received**: If the setup script doesn't provide a refresh token, you may have already authorized the app. Revoke access in your Google Account settings and re-run the setup script.
   
   - **Voice errors**: If you get "Voice does not exist" errors, make sure you're using Google Cloud TTS voice names (like `de-DE-Neural2-F`), not ElevenLabs voice IDs. Set `GOOGLE_TTS_VOICE` in your `.env` file.
   
   - **Gender errors**: Google Cloud TTS doesn't support `NEUTRAL` gender. Use `MALE` or `FEMALE` by setting `GOOGLE_TTS_SSML_GENDER` in your `.env` file.
   
   - **File format**: Google TTS outputs MP3 format and saves files with `.mp3` extension. Other TTS services may use different formats.
   
   **Note**: Make sure you run the setup script from the `backend` directory so it can find your `.env` file.

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
