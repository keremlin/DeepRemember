const multer = require('multer');
const path = require('path');
const fs = require('fs');
const FileSystemFactory = require('../filesystem/FileSystemFactory');
const fileSystem = FileSystemFactory.createDefault();

// Ensure files directory exists (logical path under FS_ROOT_DIR)
const filesDir = 'files';
if (!fileSystem.existsSync(filesDir)) {
  fileSystem.mkdirSync(filesDir);
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Multer needs a real local path for disk storage
    // When using Google Drive, resolvePath might not exist, so use fallback
    const resolvedPath = fileSystem.resolvePath ? fileSystem.resolvePath(filesDir) : path.join(__dirname, '..', '..', 'files');
    console.log('[UPLOADCONFIG] Resolved path:', resolvedPath);
    
    // Ensure the local directory exists (multer needs a real local directory)
    // This is critical for Google Drive mode where the filesystem abstraction
    // doesn't create the actual local directory that multer needs
    if (!fs.existsSync(resolvedPath)) {
      try {
        fs.mkdirSync(resolvedPath, { recursive: true });
        console.log('[UPLOADCONFIG] Created local directory:', resolvedPath);
      } catch (err) {
        console.error('[UPLOADCONFIG] Failed to create local directory:', err);
        // Continue anyway - multer might handle it
      }
    }
    
    cb(null, resolvedPath);
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  }
});

// Create multer instance
const upload = multer({ storage: storage });

// Export the upload middleware for different file types
module.exports = {
  upload,
  filesDir
};
