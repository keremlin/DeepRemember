const express = require('express');
const path = require('path');
const fs = require('fs');
const FileSystemFactory = require('../filesystem/FileSystemFactory');
const fileSystem = FileSystemFactory.createDefault();
const { upload, filesDir } = require('../middleware/uploadConfig');
const SstFactory = require('../stt/SstFactory');

const router = express.Router();

// Upload files endpoint
router.post('/upload-files', (req, res, next) => {
  console.log('[UPLOAD] Starting file upload...');
  next();
}, upload.fields([
  { name: 'mediaFile', maxCount: 1 },
  { name: 'subtitleFile', maxCount: 1 }
]), async (req, res) => {
  if (!req.files || !req.files.mediaFile) {
    return res.status(400).json({ error: 'Media file is required.' });
  }

  const mediaFile = req.files.mediaFile[0];
  const subtitleFile = req.files.subtitleFile ? req.files.subtitleFile[0] : null;
  const generateSubtitle = req.body.generateSubtitle === 'true';

  try {
    if (subtitleFile) {
      // Both files provided
      console.log('[UPLOAD] Finished file upload:', mediaFile.originalname, subtitleFile.originalname);
      
      if (process.env.FS_TYPE && process.env.FS_TYPE.toLowerCase() === 'google') {
        // Google Drive flow: Upload both files to Drive
        try {
          // Verify files exist before reading
          if (!fs.existsSync(mediaFile.path)) {
            throw new Error(`Media file not found at ${mediaFile.path}. Upload may have failed.`);
          }
          if (!fs.existsSync(subtitleFile.path)) {
            throw new Error(`Subtitle file not found at ${subtitleFile.path}. Upload may have failed.`);
          }
          
          const mediaData = await fs.promises.readFile(mediaFile.path);
          const subData = await fs.promises.readFile(subtitleFile.path);
          const cloudMediaPath = path.posix.join('files', mediaFile.originalname);
          const cloudSubPath = path.posix.join('files', subtitleFile.originalname);
          await fileSystem.writeFile(cloudMediaPath, mediaData);
          await fileSystem.writeFile(cloudSubPath, subData);
          console.log('[UPLOAD] Both files uploaded to Google Drive');
        } catch (syncErr) {
          console.warn('[UPLOAD] Google Drive upload failed:', syncErr.message);
        }
      }
      
      res.json({ 
        success: true, 
        files: {
          mediaFile: mediaFile.originalname,
          subtitleFile: subtitleFile.originalname
        },
        refreshPlaylist: true
      });
    } else if (generateSubtitle) {
      // Audio-only upload with STT subtitle generation
      console.log('[UPLOAD] Audio uploaded, generating subtitle with STT service:', mediaFile.originalname);
      
      const baseName = path.basename(mediaFile.originalname, path.extname(mediaFile.originalname));
      
      try {
        let mediaPath, subtitlePath, tempMediaPath = null;
        
        if (process.env.FS_TYPE && process.env.FS_TYPE.toLowerCase() === 'google') {
          // Google Drive flow: Upload to Drive first, then process locally
          console.log('[UPLOAD] Google Drive mode: Uploading to Drive first');
          
          // Verify file exists before reading
          if (!fs.existsSync(mediaFile.path)) {
            throw new Error(`Media file not found at ${mediaFile.path}. Upload may have failed.`);
          }
          
          // Upload media file to Google Drive
          const mediaData = await fs.promises.readFile(mediaFile.path);
          const cloudMediaPath = path.posix.join('files', mediaFile.originalname);
          await fileSystem.writeFile(cloudMediaPath, mediaData);
          console.log('[UPLOAD] Media file uploaded to Google Drive');
          
          // Create temporary local file for STT processing
          tempMediaPath = path.join(__dirname, '..', 'temp', mediaFile.originalname);
          const tempDir = path.dirname(tempMediaPath);
          if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
          }
          
          // Copy uploaded file to temp location for STT
          fs.copyFileSync(mediaFile.path, tempMediaPath);
          mediaPath = tempMediaPath;
          subtitlePath = path.join(__dirname, '..', 'temp', baseName + '.srt');
        } else {
          // Node FS flow: Use local paths directly
          const localBase = fileSystem.resolvePath ? fileSystem.resolvePath(filesDir) : filesDir;
          mediaPath = path.join(localBase, mediaFile.originalname);
          subtitlePath = path.join(localBase, baseName + '.srt');
        }
        
        // Create STT service instance using configured type
        const sstService = SstFactory.createSstService();
        
        // Convert audio to subtitles
        const result = await sstService.convert(mediaPath, subtitlePath);
        
        if (result.success) {
          console.log('[UPLOAD] Subtitle generated successfully');
          
          if (process.env.FS_TYPE && process.env.FS_TYPE.toLowerCase() === 'google') {
            // Google Drive flow: Upload generated subtitle to Drive
            const subData = await fs.promises.readFile(subtitlePath);
            const cloudSubPath = path.posix.join('files', baseName + '.srt');
            await fileSystem.writeFile(cloudSubPath, subData);
            console.log('[UPLOAD] Subtitle uploaded to Google Drive');
            
            // Clean up temporary files
            if (tempMediaPath && fs.existsSync(tempMediaPath)) {
              fs.unlinkSync(tempMediaPath);
            }
            if (fs.existsSync(subtitlePath)) {
              fs.unlinkSync(subtitlePath);
            }
            console.log('[UPLOAD] Temporary files cleaned up');
          }
          
          res.json({ 
            success: true, 
            files: {
              mediaFile: mediaFile.originalname,
              subtitleFile: baseName + '.srt'
            },
            refreshPlaylist: true
          });
        } else {
          throw new Error('STT conversion failed');
        }
      } catch (sstError) {
        console.error('[UPLOAD] STT Error:', sstError);
        return res.status(500).json({ error: 'Failed to generate subtitle: ' + sstError.message });
      }
    } else {
      // Only media file provided but no subtitle generation requested
      console.log('[UPLOAD] Media file uploaded without subtitle:', mediaFile.originalname);
      
      if (process.env.FS_TYPE && process.env.FS_TYPE.toLowerCase() === 'google') {
        // Google Drive flow: Upload media file to Drive
        try {
          // Verify file exists before reading
          if (!fs.existsSync(mediaFile.path)) {
            throw new Error(`Media file not found at ${mediaFile.path}. Upload may have failed.`);
          }
          
          const mediaData = await fs.promises.readFile(mediaFile.path);
          const cloudMediaPath = path.posix.join('files', mediaFile.originalname);
          await fileSystem.writeFile(cloudMediaPath, mediaData);
          console.log('[UPLOAD] Media file uploaded to Google Drive');
        } catch (syncErr) {
          console.warn('[UPLOAD] Google Drive upload failed:', syncErr.message);
        }
      }
      
      res.json({ 
        success: true, 
        files: {
          mediaFile: mediaFile.originalname,
          subtitleFile: null
        },
        refreshPlaylist: true
      });
    }
  } catch (error) {
    console.error('[UPLOAD] Error:', error);
    res.status(500).json({ error: 'Upload failed: ' + error.message });
  }
});

module.exports = router;
