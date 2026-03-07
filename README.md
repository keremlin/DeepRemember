# DeepRemember

A full-stack language learning application with spaced repetition (SRS), AI-powered chat, TTS/STT integration, and vocabulary management.

## Project Structure

```
deepremember/
├── client/                   # React 19 + Vite frontend
│   ├── src/
│   │   ├── main.jsx         # React entry point
│   │   ├── config/api.js    # API base URL
│   │   └── components/      # React components
│   │       ├── App.jsx      # Main app with view routing
│   │       ├── security/    # Auth (login, register)
│   │       ├── player/      # Audio player, file upload
│   │       ├── chat/        # Chat interface, templates
│   │       ├── ReviewSection/   # SRS flashcard review
│   │       ├── ManageCards/     # Card management
│   │       ├── basewords/       # Vocabulary management
│   │       └── Courses/Dictate/ # Dictation exercises
│   └── package.json
├── backend/                  # Express.js server
│   ├── server.js            # Main server file
│   ├── config/              # Configuration
│   │   ├── app.js           # App settings
│   │   └── database.js      # Database config
│   ├── routes/              # API endpoints
│   │   ├── srs.js           # Spaced repetition
│   │   ├── auth.js          # Authentication
│   │   ├── chatTemplates.js # Chat templates
│   │   ├── files.js         # File management
│   │   ├── llm.js           # LLM queries
│   │   ├── wordBase.js      # Vocabulary
│   │   └── ...
│   ├── database/access/     # Repository pattern
│   ├── llm/                 # LLM integrations
│   ├── tts/                 # Text-to-Speech
│   ├── stt/                 # Speech-to-Text
│   ├── filesystem/          # File storage
│   └── security/            # Auth middleware
├── files/                   # Uploaded media files
├── voice/                   # Generated voice files
└── package.json             # Root package.json
```

## Features

- **Spaced Repetition System (SRS)**: FSRS-based flashcard learning
- **AI Chat**: Configurable chat templates with grammar checking
- **Audio Player**: Media playback with subtitle support
- **Subtitle Generation**: Automatic transcription via Whisper (local or Groq)
- **Text-to-Speech**: Multiple TTS providers (Piper, ElevenLabs, Google)
- **Vocabulary Management**: Word base with sentence analysis caching
- **User Authentication**: Supabase Auth with email confirmation

## Quick Start

```bash
# Install all dependencies
npm run install-all

# Start both servers (Windows)
start-dev.bat
```

This opens two terminal windows:
- Backend: http://localhost:4004
- Client: http://localhost:5173

### Manual Setup

```bash
# Backend only
cd backend && npm start

# Client only (separate terminal)
cd client && npm run dev
```

**Note:** Backend does not hot-reload. Restart after code changes.

## Configuration

All configuration is done via environment variables in `backend/.env`.

### Database

| `DB_TYPE` | Description |
|-----------|-------------|
| `sqlite` | Local SQLite file (default for development) |
| `supabase-js-client` | Supabase via HTTPS only (recommended for production) |
| `supabase` | Supabase hybrid with direct Postgres connection |

See [Supabase Setup Guide](backend/SUPABASE_SETUP.md) for complete instructions.

### Service Providers

| Service | Environment Variable | Options |
|---------|---------------------|---------|
| LLM | `LLM_PROVIDER` | `groq`, `ollama` |
| TTS | `TTS_TYPE` | `piper`, `elevenlabs`, `google` |
| STT | `WHISPER_TYPE` | `LocalWhisper`, `Groq` |
| FileSystem | `FS_TYPE` | `node`, `googledrive` |

### Documentation

- [LLM Integration](backend/llm/LLM.md) - Groq and Ollama setup
- [TTS Services](backend/tts/TTS.md) - Piper, ElevenLabs, Google TTS
- [STT Services](backend/stt/README.md) - LocalWhisper and Groq STT
- [FileSystem](backend/filesystem/FILESYSTEM.md) - Local and Google Drive storage
  - [Google Drive Setup](backend/filesystem/GOOGLE_CLOUD_SETUP.md)
  - [Google Drive Environment](backend/filesystem/GOOGLE_DRIVE_ENV.md)

## API Endpoints

### Authentication (`/api/auth`)
- `POST /register`, `POST /login`, `POST /logout`
- `POST /confirm-email`, `GET /me`

### SRS (`/api/srs`)
- `GET /cards/:userId` - Get cards due for review
- `POST /cards` - Create card
- `POST /cards/answer` - Submit answer with FSRS rating

### Chat Templates (`/api/chat-templates`)
- `GET /`, `POST /`, `PUT /:id`, `DELETE /:id`

### Files (`/files`)
- `GET /files-list` - List uploaded files
- `POST /upload-files` - Upload media with auto-transcription
- `POST /delete-files` - Delete files

### LLM (`/api/llm`)
- `GET /models` - List available models
- `POST /query` - Query the LLM

## Architecture

### Design Patterns

**Factory Pattern** - Pluggable service providers:
- `LlmFactory` → Creates Groq or Ollama instances
- `TtsFactory` → Creates Piper, ElevenLabs, or Google TTS
- `SstFactory` → Creates LocalWhisper or Groq STT
- `DatabaseFactory` → Creates SQLite or Supabase connection
- `FileSystemFactory` → Creates Node.js or Google Drive filesystem

**Repository Pattern** - Data access abstraction:
- `DeepRememberRepository` - Main facade for all data operations
- Individual repositories: `UserConfigRepository`, `WordBaseRepository`, `ChatTemplateRepository`

### Database Schema

Key tables: `users`, `cards` (FSRS scheduling), `labels`, `card_labels`, `chattemplates`, `word_base`, `sentence_analysis_cache`

## Deployment

### Development
```bash
start-dev.bat
```

### Production Build
```bash
cd backend && npm run build
```