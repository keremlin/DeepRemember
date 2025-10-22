const express = require('express');
const path = require('path');
const FileSystemFactory = require('../filesystem/FileSystemFactory');
const fileSystem = FileSystemFactory.createDefault();
const { filesDir } = require('../middleware/uploadConfig');

const router = express.Router();

// List all uploaded files as playlist
router.get('/files-list', (req, res) => {
  console.log('[FILES] Reading directory:', filesDir);
  fileSystem.readdir(filesDir, (err, files) => {
    if (err) {
      console.log('[FILES] Error reading directory:', err);
      return res.status(500).json({ error: 'Failed to read files directory.' });
    }
    
    console.log('[FILES] Found files:', files);
    
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
    
    console.log('[FILES] Playlist:', playlist);
    res.json({ playlist });
  });
});

// Delete files endpoint
router.post('/delete-files', (req, res) => {
  const { media, subtitle } = req.body;
  if (!media) return res.status(400).json({ error: 'Media file is required.' });
  
  const mediaPath = path.join(filesDir, media);
  let deleted = { media: false, subtitle: false };
  
  fileSystem.unlink(mediaPath, err => {
    deleted.media = !err;
    if (subtitle) {
      const subtitlePath = path.join(filesDir, subtitle);
      fileSystem.unlink(subtitlePath, err2 => {
        deleted.subtitle = !err2;
        res.json({ success: true, deleted });
      });
    } else {
      res.json({ success: true, deleted });
    }
  });
});

module.exports = router;
