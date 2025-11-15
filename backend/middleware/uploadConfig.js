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
  // Try to use filesystem's resolvePath if available
  if (fileSystem.resolvePath) {
    try {
      const resolved = fileSystem.resolvePath(filesDir);
      // Ensure it's an absolute path
      const absPath = path.isAbsolute(resolved) ? resolved : path.resolve(resolved);
      console.log('[UPLOADCONFIG] Using filesystem resolvePath:', absPath);
      return absPath;
    } catch (err) {
      console.warn('[UPLOADCONFIG] filesystem.resolvePath failed, using fallback:', err.message);
    }
  }
  
  // Fallback 1: go up from backend/middleware to project root, then to files
  try {
    const fallbackPath1 = path.join(__dirname, '..', '..', 'files');
    const resolved1 = path.resolve(fallbackPath1);
    console.log('[UPLOADCONFIG] Using __dirname fallback path:', resolved1);
    return resolved1;
  } catch (err) {
    console.warn('[UPLOADCONFIG] __dirname fallback failed, using process.cwd():', err.message);
  }
  
  // Fallback 2: use process.cwd() (current working directory)
  const fallbackPath2 = path.join(process.cwd(), 'files');
  const resolved2 = path.resolve(fallbackPath2);
  console.log('[UPLOADCONFIG] Using process.cwd() fallback path:', resolved2);
  return resolved2;
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
    console.log('[UPLOADCONFIG] Directory exists check:', fs.existsSync(resolvedPath));
    
    // CRITICAL: Ensure the directory exists synchronously BEFORE calling the callback
    // Multer will try to write immediately after this callback returns
    if (!fs.existsSync(resolvedPath)) {
      try {
        console.log('[UPLOADCONFIG] Directory does not exist, creating now...');
        fs.mkdirSync(resolvedPath, { recursive: true });
        console.log('[UPLOADCONFIG] Successfully created local directory in destination callback:', resolvedPath);
        
        // Verify it was created
        if (!fs.existsSync(resolvedPath)) {
          const error = new Error(`Failed to create directory: ${resolvedPath}`);
          console.error('[UPLOADCONFIG] Directory creation verification failed:', error);
          return cb(error);
        }
      } catch (err) {
        console.error('[UPLOADCONFIG] Failed to create local directory in destination callback:', err);
        console.error('[UPLOADCONFIG] Error details:', {
          code: err.code,
          errno: err.errno,
          path: err.path,
          syscall: err.syscall
        });
        return cb(err); // Pass error to multer instead of continuing
      }
    } else {
      console.log('[UPLOADCONFIG] Directory already exists, proceeding...');
    }
    
    // Verify directory is writable
    try {
      fs.accessSync(resolvedPath, fs.constants.W_OK);
      console.log('[UPLOADCONFIG] Directory is writable');
    } catch (accessErr) {
      console.error('[UPLOADCONFIG] Directory is not writable:', accessErr);
      return cb(accessErr);
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
