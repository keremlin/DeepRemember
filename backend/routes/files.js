const express = require('express');
const path = require('path');
const FileSystemFactory = require('../filesystem/FileSystemFactory');
const fileSystem = FileSystemFactory.createDefault();
const { filesDir } = require('../middleware/uploadConfig');

const router = express.Router();

// Helper function to get content type based on file extension
function getContentType(filename) {
  const ext = path.extname(filename).toLowerCase();
  const contentTypes = {
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.m4a': 'audio/mp4',
    '.srt': 'text/plain',
    '.vtt': 'text/vtt',
    '.txt': 'text/plain',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.ogg': 'audio/ogg'
  };
  return contentTypes[ext] || 'application/octet-stream';
}

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

// Dynamic file serving route (for Google Drive files)
router.get('/files/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = `files/${filename}`;
    
    if (process.env.FS_TYPE && process.env.FS_TYPE.toLowerCase() === 'google') {
      // Google Drive: Stream file content
      const stream = fileSystem.createReadStream(filePath);
      
      // Set appropriate headers
      res.setHeader('Content-Type', getContentType(filename));
      res.setHeader('Cache-Control', 'public, max-age=3600');
      
      // Pipe the stream to response
      stream.on('error', (error) => {
        console.error(`[FILE_SERVE] Error streaming file ${filename}:`, error);
        res.status(404).json({ error: 'File not found' });
      });
      
      stream.pipe(res);
    } else {
      // Local filesystem: Use static serving (fallback)
      const filePath = path.join(__dirname, '../files', filename);
      res.sendFile(filePath, (err) => {
        if (err) {
          console.error(`[FILE_SERVE] Error serving local file ${filename}:`, err);
          res.status(404).json({ error: 'File not found' });
        }
      });
    }
  } catch (error) {
    console.error(`[FILE_SERVE] Error serving file ${req.params.filename}:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
