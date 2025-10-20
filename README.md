# AI Trainer - Separated Frontend & Backend

A modern, modular application for learning with AI-generated subtitles using OpenAI's Whisper, now with separated frontend and backend architecture.

## 🏗️ Project Structure

```
aitrainer/
├── frontend/                 # Frontend (Client-side)
│   ├── public/              # Static assets
│   │   ├── js/              # JavaScript files
│   │   │   ├── app.js       # Main application logic
│   │   │   ├── deepRemember.js # Learning system logic
│   │   │   └── InteliSentence.js # Sentence analysis
│   │   └── styles.css       # Main stylesheet
│   ├── views/               # HTML templates
│   │   ├── index.html       # Main page
│   │   ├── deepRemember.html # Learning system page
│   │   └── sentenceAnalysisModal.html # Modal template
│   └── package.json         # Frontend dependencies
├── backend/                  # Backend (Server-side)
│   ├── routes/              # Express routes
│   │   ├── index.js         # Main routes
│   │   ├── upload.js        # File upload routes
│   │   ├── files.js         # File management routes
│   │   ├── deepRemember.js  # Learning system routes
│   │   └── srs.js          # Spaced repetition routes
│   ├── config/              # Configuration
│   │   ├── app.js          # App settings
│   │   └── database.js     # Database config
│   ├── database/           # Database layer
│   │   ├── access/         # Database access objects
│   │   ├── db/             # Database files
│   │   └── sampledata/     # Sample data
│   ├── middleware/         # Express middleware
│   │   └── uploadConfig.js # Upload configuration
│   ├── server.js           # Main server file
│   └── package.json        # Backend dependencies
├── files/                   # User uploaded files
├── voice/                   # Voice recordings
├── package.json            # Root package.json
└── README.md               # This file
```

## 🚀 Features

- **Media Player**: Support for audio and video files
- **Subtitle Generation**: Automatic subtitle generation using Whisper AI
- **Playlist Management**: Organize and manage your media files
- **Interactive Subtitles**: Click on words for potential translations
- **DeepRemember Learning System**: Spaced repetition system for vocabulary learning
- **Responsive Design**: Works on desktop and mobile devices
- **Modular Architecture**: Clean separation of frontend and backend

## 🛠️ Installation & Setup

### Prerequisites
- Node.js (version 14 or higher)
- Whisper (for subtitle generation): `pip install openai-whisper`
- Supabase account (for remote database) - optional, can use SQLite for local development

### Quick Start
```bash
# Install all dependencies (root, backend, and frontend)
npm run install-all

# Start the application
npm start
```

### Manual Setup
```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install

# Start the server
cd ../backend
npm start
```

### Database Configuration

The application supports both SQLite (local) and Supabase (remote) databases:

#### Option 1: Supabase (Recommended for production)
1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Create a `.env` file in the `backend/` directory:
```env
DB_TYPE=supabase
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```
3. Run the setup SQL in your Supabase SQL editor (see [Supabase Setup Guide](backend/SUPABASE_SETUP.md))
4. Test the connection: `npm run test:supabase`

#### Option 2: SQLite (Local development)
1. Create a `.env` file in the `backend/` directory:
```env
DB_TYPE=sqlite
SQLITE_DB_PATH=./database/db/deepRemember.db
```

#### Switching DB implementations
You can switch between SQLite, Supabase (hybrid), and Supabase JavaScript Client by setting `DB_TYPE` in `backend/.env`. See the [Supabase Setup Guide](backend/SUPABASE_SETUP.md) for details and recommended settings.

### LLM Integration

See the LLM documentation: [backend/llm/LLM.md](backend/llm/LLM.md)

#### Migration from SQLite to Supabase
If you have existing data in SQLite and want to migrate to Supabase:
```bash
npm run migrate:supabase
```

## 🎯 Usage

1. **Upload Media**: Select an audio/video file
2. **Upload Subtitle** (optional): Select a subtitle file (.srt, .vtt, .txt)
3. **Auto-Generate Subtitles**: For audio files, let Whisper generate subtitles automatically
4. **Play**: Use the media player controls to play your files
5. **Manage Playlist**: View, play, and delete files from your playlist
6. **DeepRemember Learning**: Access the spaced repetition system at `/deepRemember` for vocabulary learning

## 📋 API Endpoints

### Upload Routes (`/backend/routes/upload.js`)
- `POST /upload-files` - Upload media and subtitle files with Whisper integration

### Files Routes (`/backend/routes/files.js`)
- `GET /files-list` - Get list of uploaded files as playlist
- `POST /delete-files` - Delete uploaded files

### DeepRemember Routes (`/backend/routes/deepRemember.js`)
- `POST /deepRemember/create-card` - Create a new learning card
- `GET /deepRemember/review-cards/:userId` - Get cards due for review
- `POST /deepRemember/answer-card` - Answer a card with difficulty rating
- `GET /deepRemember/stats/:userId` - Get user learning statistics
- `DELETE /deepRemember/delete-card/:userId/:cardId` - Delete a learning card

### Index Routes (`/backend/routes/index.js`)
- `GET /` - Serve the main application
- `GET /deepRemember` - Serve the DeepRemember learning system

## 🔧 Configuration

Configuration is centralized in `backend/config/app.js`:

- **Port**: Change `PORT` (default: 4004)
- **File Upload**: Configure max file size and allowed types
- **Whisper**: Set output format and other settings
- **Logging**: Configure log levels

## 🏗️ Architecture Benefits

### Frontend (`/frontend/`)
- **Static Assets**: CSS, JavaScript, and HTML templates
- **Client-side Logic**: Media player, UI interactions, API calls
- **Responsive Design**: Mobile-friendly interface
- **Modular JavaScript**: Separated concerns for different features

### Backend (`/backend/`)
- **Express.js Server**: RESTful API endpoints
- **File Processing**: Upload handling and Whisper integration
- **Database Layer**: Supports both SQLite (local) and Supabase (remote) with repository pattern
- **Middleware**: Upload configuration and error handling
- **Route Organization**: Separated by functionality

### Separation Benefits
- **Maintainability**: Clear separation of concerns
- **Scalability**: Frontend and backend can be deployed separately
- **Development**: Teams can work on frontend/backend independently
- **Testing**: Easier to test frontend and backend separately
- **Deployment**: Can serve frontend from CDN, backend from server

## 🚀 Deployment

### Development
```bash
npm start
```

### Production
```bash
npm run build
```

The application will be available at: `http://localhost:4004`

## 📁 File Organization

- **Frontend**: All client-side code in `/frontend/`
- **Backend**: All server-side code in `/backend/`
- **Shared Resources**: `/files/` and `/voice/` remain in root for easy access
- **Configuration**: Centralized in `/backend/config/`

This structure makes it easy to:
- Deploy frontend to a CDN
- Deploy backend to a server
- Scale each part independently
- Maintain and update components separately