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

// Resolve the actual local path that multer needs
// When using Google Drive, resolvePath might not exist, so use fallback
const getLocalFilesPath = () => {
  if (fileSystem.resolvePath) {
    const resolved = fileSystem.resolvePath(filesDir);
    // Ensure it's an absolute path
    return path.isAbsolute(resolved) ? resolved : path.resolve(resolved);
  }
  // Fallback: go up from backend/middleware to project root, then to files
  const fallbackPath = path.join(__dirname, '..', '..', 'files');
  return path.resolve(fallbackPath);
};

// Ensure the local directory exists at module load time
// This is critical for Google Drive mode where the filesystem abstraction
// doesn't create the actual local directory that multer needs
const localFilesPath = getLocalFilesPath();
console.log('[UPLOADCONFIG] Local files path:', localFilesPath);

if (!fs.existsSync(localFilesPath)) {
  try {
    fs.mkdirSync(localFilesPath, { recursive: true });
    console.log('[UPLOADCONFIG] Created local directory at module load:', localFilesPath);
  } catch (err) {
    console.error('[UPLOADCONFIG] Failed to create local directory at module load:', err);
  }
} else {
  console.log('[UPLOADCONFIG] Local directory already exists:', localFilesPath);
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Use the pre-resolved path
    const resolvedPath = localFilesPath;
    console.log('[UPLOADCONFIG] Multer destination called, using path:', resolvedPath);
    
    // Double-check the directory exists (in case of issues)
    if (!fs.existsSync(resolvedPath)) {
      try {
        fs.mkdirSync(resolvedPath, { recursive: true });
        console.log('[UPLOADCONFIG] Created local directory in destination callback:', resolvedPath);
      } catch (err) {
        console.error('[UPLOADCONFIG] Failed to create local directory in destination callback:', err);
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
