# AI-title - AI Powered Subtitle Player

A modern, modular Express.js web application for playing media files with AI-generated subtitles using OpenAI's Whisper.

## 🚀 Features

- **Media Player**: Support for audio and video files
- **Subtitle Generation**: Automatic subtitle generation using Whisper AI
- **Playlist Management**: Organize and manage your media files
- **Interactive Subtitles**: Click on words for potential translations
- **Responsive Design**: Works on desktop and mobile devices
- **Modular Architecture**: Clean, production-ready Express.js structure

## 📁 Project Structure

```
subtitle-player/
├── config/                 # Application configuration
│   └── app.js             # App settings and constants
├── middleware/             # Express middleware
│   └── uploadConfig.js    # Multer upload configuration
├── routes/                 # Express routes
│   ├── index.js           # Main page routes
│   ├── upload.js          # File upload routes
│   └── files.js           # Playlist and file management routes
├── public/                 # Static files
│   ├── styles.css         # CSS styles
│   └── js/
│       └── app.js         # Frontend JavaScript
├── views/                  # HTML templates
│   └── index.html         # Main application page
├── files/                  # Uploaded media and subtitle files
├── server.js              # Express.js server entry point
├── package.json           # Node.js dependencies
├── .gitignore             # Git ignore rules
└── README.md              # This file
```

## 🛠️ Installation

1. **Install Node.js** (version 14 or higher)
2. **Install Whisper** (for subtitle generation):
   ```bash
   pip install openai-whisper
   ```

3. **Install project dependencies**:
   ```bash
   npm install
   ```

## 🚀 Running the Application

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

The application will be available at: `http://localhost:4004`

## 📋 API Endpoints

### Upload Routes (`/routes/upload.js`)
- `POST /upload-files` - Upload media and subtitle files with Whisper integration

### Files Routes (`/routes/files.js`)
- `GET /files-list` - Get list of uploaded files as playlist
- `POST /delete-files` - Delete uploaded files

### Index Routes (`/routes/index.js`)
- `GET /` - Serve the main application

## 🎯 Usage

1. **Upload Media**: Select an audio/video file
2. **Upload Subtitle** (optional): Select a subtitle file (.srt, .vtt, .txt)
3. **Auto-Generate Subtitles**: For audio files, let Whisper generate subtitles automatically
4. **Play**: Use the media player controls to play your files
5. **Manage Playlist**: View, play, and delete files from your playlist

## 🔧 Configuration

Configuration is centralized in `config/app.js`:

- **Port**: Change `PORT` (default: 4004)
- **File Upload**: Configure max file size and allowed types
- **Whisper**: Set output format and other settings
- **Logging**: Configure log levels

## 🏗️ Architecture

### **Modular Design**
- **Routes**: Separated by functionality (upload, files, index)
- **Middleware**: Reusable upload configuration
- **Configuration**: Centralized app settings
- **Static Files**: Organized in public directory

### **Key Benefits**
- **Maintainability**: Easy to add new features and modify existing ones
- **Scalability**: Clean separation of concerns
- **Testing**: Each module can be tested independently
- **Production Ready**: Follows Express.js best practices

## 🎨 Customization

- **Styling**: Modify `public/styles.css` for visual changes
- **Functionality**: Edit `public/js/app.js` for behavior changes
- **Server Logic**: Modify routes in `routes/` directory
- **Configuration**: Update `config/app.js` for app settings

## 📱 Browser Support

- Chrome (recommended)
- Firefox
- Safari
- Edge

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes following the modular structure
4. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For issues and questions, please check the GitHub issues page or create a new issue. 