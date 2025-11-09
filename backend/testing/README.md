# Testing API Endpoint

This folder contains the test API endpoint for server diagnostics and configuration information.

## Endpoint

**GET** `/api/test/local112358`

## Security

This endpoint is **only accessible when `TEST_API=true`** is set in the `.env` file. If the environment variable is not set to `true`, the endpoint will return a 403 Forbidden error.

## Usage

1. Add `TEST_API=true` to your `backend/.env` file
2. Restart the backend server
3. Access the endpoint: `http://localhost:4004/api/test/local112358`

## Response

The endpoint returns a comprehensive JSON response containing:

### Server Information
- Node.js version
- Platform and architecture
- Server uptime
- Memory usage
- Environment details
- Base URL and port

### Service Configurations
- **Database**: Type, connection details (Supabase/SQLite), pool settings
- **File System**: Type (Node/Google Drive), configuration
- **LLM**: Provider (Ollama/Groq), model, API settings
- **STT**: Type (LocalWhisper/Groq), model configuration
- **TTS**: Type (Piper/ElevenLabs/Google), voice settings

### Connection Information
- **Supabase**: URL, keys (masked), schema, database URL (password masked)
- **Google**: 
  - Drive: OAuth credentials (masked), tokens (masked), folder configuration
  - TTS: Voice settings, language, credentials path

### API Endpoints
All available API endpoints organized by category:
- Auth endpoints
- DeepRemember endpoints
- SRS endpoints
- Files endpoints
- Upload endpoints
- Pages
- Test endpoints

Each endpoint includes:
- HTTP method
- Path
- Description
- Full URL
- Authentication requirement (if any)

### Service Status
Status information for each service (configured/not configured)

## Security Notes

⚠️ **Important**: This endpoint exposes configuration details including:
- Partial API keys (first 10-20 characters)
- Connection strings (with passwords masked)
- Service configurations

**Only enable this endpoint in development/testing environments!**

Never enable `TEST_API=true` in production.

## Example Response

```json
{
  "success": true,
  "message": "Test API endpoint - Server configuration and status",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "server": {
    "nodeVersion": "v18.0.0",
    "platform": "win32",
    "arch": "x64",
    "uptime": 3600,
    "memory": {
      "used": 50,
      "total": 100,
      "rss": 150
    },
    "environment": "development",
    "port": 4004,
    "baseUrl": "http://localhost:4004"
  },
  "connections": {
    "supabase": {
      "enabled": true,
      "url": "https://xxx.supabase.co",
      "anonKey": "eyJhbGciOiJIUzI1NiIs...",
      "configured": true
    },
    "google": {
      "drive": {
        "enabled": true,
        "clientId": "123456789-abc...",
        "configured": true
      }
    }
  },
  "apiEndpoints": {
    "auth": [...],
    "deepRemember": [...],
    "srs": [...]
  }
}
```

