const express = require('express');
const path = require('path');
const fs = require('fs');
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
      // Both files provided - original logic
      console.log('[UPLOAD] Finished file upload:', mediaFile.originalname, subtitleFile.originalname);
      res.json({ success: true, files: {
        mediaFile: mediaFile.originalname,
        subtitleFile: subtitleFile.originalname
      }});
    } else if (generateSubtitle) {
      // Audio-only upload with STT subtitle generation
      console.log('[UPLOAD] Audio uploaded, generating subtitle with STT service:', mediaFile.originalname);
      
      const mediaPath = path.join(filesDir, mediaFile.originalname);
      const baseName = path.basename(mediaFile.originalname, path.extname(mediaFile.originalname));
      const subtitlePath = path.join(filesDir, baseName + '.srt');
      
      try {
        // Create STT service instance using configured type
        const sstService = SstFactory.createSstService();
        
        // Convert audio to subtitles
        const result = await sstService.convert(mediaPath, subtitlePath);
        
        if (result.success) {
          console.log('[UPLOAD] Subtitle generated successfully');
          res.json({ success: true, files: {
            mediaFile: mediaFile.originalname,
            subtitleFile: baseName + '.srt'
          }});
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
      res.json({ success: true, files: {
        mediaFile: mediaFile.originalname,
        subtitleFile: null
      }});
    }
  } catch (error) {
    console.error('[UPLOAD] Error:', error);
    res.status(500).json({ error: 'Upload failed: ' + error.message });
  }
});

module.exports = router;
