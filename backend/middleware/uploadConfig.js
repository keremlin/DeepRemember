const multer = require('multer');
const path = require('path');
const FileSystemFactory = require('../filesystem/FileSystemFactory');
const fileSystem = FileSystemFactory.createDefault();

// Ensure files directory exists
const filesDir = path.join(__dirname, '..', '..', 'files');
if (!fileSystem.existsSync(filesDir)) {
  fileSystem.mkdirSync(filesDir);
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, filesDir);
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
