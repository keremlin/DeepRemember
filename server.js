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

// Serve index.html for the root route
app.get('/', (req, res) => {
  const filePath = path.join(__dirname, 'index.html');
  console.log(`[INDEX] Request for: ${filePath}`);
  res.sendFile(filePath);
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
}); 