const express = require('express');
const path = require('path');
const fs = require('fs');
const FileSystemFactory = require('../filesystem/FileSystemFactory');
const fileSystem = FileSystemFactory.createDefault();
const { filesDir } = require('../middleware/uploadConfig');
const SstFactory = require('../stt/SstFactory');
const https = require('https');
const http = require('http');

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
      // Google Drive: Check fallback storage first, then try Drive
      const fs = require('fs');
      const fallbackPath = path.resolve(__dirname, '../fallback-storage', filePath);
      
      // Check if file exists in fallback storage
      if (fs.existsSync(fallbackPath)) {
        console.log(`[FILE_SERVE] Serving from fallback storage: ${fallbackPath}`);
        res.setHeader('Content-Type', getContentType(filename));
        res.setHeader('Cache-Control', 'public, max-age=3600');
        res.sendFile(fallbackPath);
        return;
      }
      
      // Try to stream from Google Drive
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
      // Local filesystem: Use static serving with range request support
      const fs = require('fs');
      const filePath = path.join(__dirname, '../files', filename);
      
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File not found' });
      }
      
      const stat = fs.statSync(filePath);
      const fileSize = stat.size;
      const range = req.headers.range;
      
      // Set headers
      res.setHeader('Content-Type', getContentType(filename));
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      
      // Handle range requests (required for seeking in audio/video)
      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = (end - start) + 1;
        
        const file = fs.createReadStream(filePath, { start, end });
        
        res.status(206); // Partial Content
        res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
        res.setHeader('Content-Length', chunksize);
        
        file.on('error', (err) => {
          console.error(`[FILE_SERVE] Error reading range for ${filename}:`, err);
          if (!res.headersSent) {
            res.status(500).json({ error: 'Error reading file range' });
          }
        });
        
        file.pipe(res);
      } else {
        // No range request - send entire file
        // Use createReadStream instead of sendFile to ensure headers are preserved
        const file = fs.createReadStream(filePath);
        
        res.setHeader('Content-Length', fileSize);
        res.status(200);
        
        file.on('error', (err) => {
          console.error(`[FILE_SERVE] Error reading file ${filename}:`, err);
          if (!res.headersSent) {
            res.status(500).json({ error: 'Error reading file' });
          }
        });
        
        file.pipe(res);
      }
    }
  } catch (error) {
    console.error(`[FILE_SERVE] Error serving file ${req.params.filename}:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Dynamic voice file serving route (for Google Drive files)
router.get('/voice/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = `voice/${filename}`;
    
    if (process.env.FS_TYPE && process.env.FS_TYPE.toLowerCase() === 'google') {
      // Google Drive: Check fallback storage first, then try Drive
      const fs = require('fs');
      const fallbackPath = path.resolve(__dirname, '../fallback-storage', filePath);
      
      console.log(`[VOICE_SERVE] Checking fallback storage at: ${fallbackPath}`);
      
      // Check if file exists in fallback storage
      if (fs.existsSync(fallbackPath)) {
        console.log(`[VOICE_SERVE] Serving from fallback storage: ${fallbackPath}`);
        res.setHeader('Content-Type', getContentType(filename));
        res.setHeader('Cache-Control', 'public, max-age=3600');
        res.sendFile(fallbackPath);
        return;
      }
      
      console.log(`[VOICE_SERVE] File not in fallback storage, trying Google Drive...`);
      
      // Try to stream from Google Drive
      const stream = fileSystem.createReadStream(filePath);
      
      // Set appropriate headers
      res.setHeader('Content-Type', getContentType(filename));
      res.setHeader('Cache-Control', 'public, max-age=3600');
      
      // Pipe the stream to response
      stream.on('error', (error) => {
        console.error(`[VOICE_SERVE] Error streaming file ${filename}:`, error);
        res.status(404).json({ error: 'Voice file not found' });
      });
      
      stream.pipe(res);
    } else {
      // Local filesystem: Use static serving (fallback)
      const filePath = path.join(__dirname, '../../voice', filename);
      res.sendFile(filePath, (err) => {
        if (err) {
          console.error(`[VOICE_SERVE] Error serving local file ${filename}:`, err);
          res.status(404).json({ error: 'Voice file not found' });
        }
      });
    }
  } catch (error) {
    console.error(`[VOICE_SERVE] Error serving voice file ${req.params.filename}:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Generate subtitle for external podcast URL
router.post('/generate-podcast-subtitle', async (req, res) => {
  let tempMp3Path = null;
  let localMp3Path = null;
  
  try {
    const { url, filename } = req.body;
    
    if (!url || !filename) {
      return res.status(400).json({ error: 'URL and filename are required' });
    }

    // Generate base name from filename (remove extension)
    const baseName = path.basename(filename, path.extname(filename));
    const subtitleFilename = baseName + '.srt';
    
    // Check if subtitle already exists
    const subtitleCloudPath = path.posix.join('files', subtitleFilename);
    const subtitleExists = fileSystem.existsSync ? 
      fileSystem.existsSync(subtitleCloudPath) : 
      false;
    
    if (subtitleExists) {
      console.log(`[PODCAST] Subtitle already exists: ${subtitleFilename}`);
      return res.json({ 
        success: true, 
        subtitleFile: subtitleFilename,
        alreadyExists: true 
      });
    }

    console.log(`[PODCAST] Generating subtitle for: ${filename}`);
    
    // Use temp directory for downloading and processing (STT services expect temp files to use fs.existsSync)
    const tempDir = path.join(__dirname, '..', 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    tempMp3Path = path.join(tempDir, filename);
    localMp3Path = tempMp3Path;
    
    // Get local files path for subtitle storage
    const getLocalFilesPath = () => {
      if (fileSystem.resolvePath) {
        try {
          const resolved = fileSystem.resolvePath('files');
          return path.isAbsolute(resolved) ? resolved : path.resolve(resolved);
        } catch (err) {
          console.warn('[PODCAST] resolvePath failed, using fallback');
        }
      }
      return path.join(__dirname, '..', '..', 'files');
    };
    
    const localFilesPath = getLocalFilesPath();
    
    // Ensure directory exists
    if (!fs.existsSync(localFilesPath)) {
      fs.mkdirSync(localFilesPath, { recursive: true });
    }

    // Download file from URL with redirect handling
    const downloadFile = (downloadUrl, maxRedirects = 5) => {
      return new Promise((resolve, reject) => {
        if (maxRedirects <= 0) {
          reject(new Error('Too many redirects'));
          return;
        }

        const protocol = downloadUrl.startsWith('https') ? https : http;
        const file = fs.createWriteStream(tempMp3Path);
        
        const request = protocol.get(downloadUrl, (response) => {
          // Handle redirects (301, 302, 307, 308)
          if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
            file.close();
            if (fs.existsSync(tempMp3Path)) {
              fs.unlinkSync(tempMp3Path);
            }
            
            // Handle relative redirects
            const redirectUrl = response.headers.location.startsWith('http') 
              ? response.headers.location 
              : new URL(response.headers.location, downloadUrl).href;
            
            console.log(`[PODCAST] Following redirect to: ${redirectUrl}`);
            // Recursively follow redirect
            downloadFile(redirectUrl, maxRedirects - 1)
              .then(resolve)
              .catch(reject);
            return;
          }
          
          // Handle errors
          if (response.statusCode < 200 || response.statusCode >= 300) {
            file.close();
            if (fs.existsSync(tempMp3Path)) {
              fs.unlinkSync(tempMp3Path);
            }
            reject(new Error(`Failed to download file: ${response.statusCode}`));
            return;
          }
          
          // Pipe response to file
          response.pipe(file);
          
          file.on('finish', () => {
            file.close();
            console.log(`[PODCAST] Downloaded MP3: ${filename}`);
            resolve();
          });
        });
        
        request.on('error', (err) => {
          file.close();
          if (fs.existsSync(tempMp3Path)) {
            fs.unlinkSync(tempMp3Path);
          }
          reject(err);
        });
      });
    };

    await downloadFile(url);

    // Generate subtitle using STT
    const sstService = SstFactory.createSstService();
    // Save subtitle to temp directory first (STT services work better with temp files)
    const tempSubtitlePath = path.join(tempDir, subtitleFilename);
    
    console.log(`[PODCAST] Generating subtitle with STT...`);
    const result = await sstService.convert(localMp3Path, tempSubtitlePath);
    
    if (!result || !result.success) {
      // Clean up downloaded MP3
      if (fs.existsSync(tempMp3Path)) {
        fs.unlinkSync(tempMp3Path);
      }
      throw new Error('STT conversion failed');
    }

    console.log(`[PODCAST] Subtitle generated: ${subtitleFilename}`);

    // Upload subtitle to storage (local or cloud)
    if (process.env.FS_TYPE && process.env.FS_TYPE.toLowerCase() === 'google') {
      // Google Drive: Upload from temp to cloud
      if (fs.existsSync(tempSubtitlePath)) {
        try {
          const subData = await fs.promises.readFile(tempSubtitlePath);
          await fileSystem.writeFile(subtitleCloudPath, subData);
          // Clean up temp subtitle file after successful upload
          fs.unlinkSync(tempSubtitlePath);
          console.log(`[PODCAST] Subtitle uploaded to cloud storage: ${subtitleCloudPath}`);
        } catch (uploadError) {
          console.error('[PODCAST] Error uploading subtitle to cloud:', uploadError);
          // Keep temp file if upload fails
          throw uploadError;
        }
      }
    } else {
      // Local filesystem: Move from temp to files directory
      const localSubtitlePath = path.join(localFilesPath, subtitleFilename);
      if (fs.existsSync(tempSubtitlePath)) {
        fs.renameSync(tempSubtitlePath, localSubtitlePath);
        console.log(`[PODCAST] Subtitle saved to local files: ${localSubtitlePath}`);
      }
    }

    // Delete temporary MP3 file
    if (fs.existsSync(tempMp3Path)) {
      fs.unlinkSync(tempMp3Path);
      console.log(`[PODCAST] Deleted temporary MP3: ${filename}`);
    }

    res.json({ 
      success: true, 
      subtitleFile: subtitleFilename 
    });
  } catch (error) {
    console.error('[PODCAST] Error generating subtitle:', error);
    
    // Clean up on error
    if (tempMp3Path && fs.existsSync(tempMp3Path)) {
      try {
        fs.unlinkSync(tempMp3Path);
      } catch (unlinkErr) {
        console.error('[PODCAST] Error cleaning up temp file:', unlinkErr);
      }
    }
    
    res.status(500).json({ error: 'Failed to generate subtitle: ' + error.message });
  }
});

module.exports = router;
