const multer = require('multer');
const path = require('path');
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
    const resolvedPath = fileSystem.resolvePath ? fileSystem.resolvePath(filesDir) : path.join(__dirname, '..', '..', 'files');
    console.log('[UPLOADCONFIG] Resolved path:', resolvedPath);
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
