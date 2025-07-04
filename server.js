const express = require('express');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

const app = express();
const PORT = 4004;

// Serve static files (css, js, images, etc.)
app.use((req, res, next) => {
  const filePath = path.join(__dirname, req.path);
  console.log(`[STATIC] Request for: ${filePath}`);
  next();
});
app.use(express.static(path.join(__dirname)));

// Ensure files directory exists
const filesDir = path.join(__dirname, 'files');
if (!fs.existsSync(filesDir)) {
  fs.mkdirSync(filesDir);
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, filesDir);
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  }
});
const upload = multer({ storage: storage });

app.post('/upload-files', (req, res, next) => {
  console.log('[UPLOAD] Starting file upload...');
  next();
}, upload.fields([
  { name: 'mediaFile', maxCount: 1 },
  { name: 'subtitleFile', maxCount: 1 }
]), (req, res) => {
  if (!req.files || !req.files.mediaFile || !req.files.subtitleFile) {
    return res.status(400).json({ error: 'Both mediaFile and subtitleFile are required.' });
  }
  console.log('[UPLOAD] Finished file upload:', req.files.mediaFile[0].originalname, req.files.subtitleFile[0].originalname);
  res.json({ success: true, files: {
    mediaFile: req.files.mediaFile[0].originalname,
    subtitleFile: req.files.subtitleFile[0].originalname
  }});
});

// List all uploaded files as playlist
app.get('/files-list', (req, res) => {
  fs.readdir(filesDir, (err, files) => {
    if (err) return res.status(500).json({ error: 'Failed to read files directory.' });
    // Group files by base name (before extension)
    const mediaExts = ['.mp3', '.mp4', '.wav', '.ogg', '.webm', '.m4a'];
    const subtitleExts = ['.srt', '.vtt', '.txt'];
    const playlist = [];
    files.forEach(file => {
      const ext = path.extname(file).toLowerCase();
      const base = path.basename(file, ext);
      if (mediaExts.includes(ext)) {
        // Try to find a matching subtitle
        const subtitle = files.find(f => subtitleExts.includes(path.extname(f).toLowerCase()) && path.basename(f, path.extname(f)) === base);
        playlist.push({
          media: file,
          subtitle: subtitle || null
        });
      }
    });
    console.log(playlist);
    res.json({ playlist });
  });
});

// Serve index.html for the root route
app.get('/', (req, res) => {
  const filePath = path.join(__dirname, 'index.html');
  console.log(`[INDEX] Request for: ${filePath}`);
  res.sendFile(filePath);
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
}); 