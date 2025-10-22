const fs = require('fs');
const IFileSystem = require('./IFileSystem');

/**
 * Node.js File System implementation
 * Wraps the native Node.js fs module methods
 */
class NodeFileSystem extends IFileSystem {
  constructor(config = {}) {
    super();
    this.rootDir = (config.rootDir || '').toString().replace(/[\\/]+$/, '');
    this.appRoot = process.cwd();
  }

  resolvePath(p) {
    const pathModule = require('path');
    const normalized = (p || '').toString();
    const base = this.rootDir ? pathModule.join(this.appRoot, this.rootDir) : this.appRoot;
    return pathModule.isAbsolute(normalized) ? normalized : pathModule.join(base, normalized);
  }
  /**
   * Synchronously check if a file or directory exists
   * @param {string} path - The path to check
   * @returns {boolean} - True if the path exists, false otherwise
   */
  existsSync(path) {
    return fs.existsSync(this.resolvePath(path));
  }

  /**
   * Synchronously create a directory
   * @param {string} path - The directory path to create
   * @param {Object} options - Options for directory creation (e.g., { recursive: true })
   * @returns {string|undefined} - The first directory path created, or undefined
   */
  mkdirSync(path, options) {
    return fs.mkdirSync(this.resolvePath(path), options);
  }

  /**
   * Synchronously write data to a file
   * @param {string} file - The file path
   * @param {string|Buffer|Uint8Array} data - The data to write
   * @param {string|Object} options - Write options (encoding, mode, flag)
   * @returns {undefined}
   */
  writeFileSync(file, data, options) {
    return fs.writeFileSync(this.resolvePath(file), data, options);
  }

  /**
   * Asynchronously read the contents of a directory
   * @param {string} path - The directory path to read
   * @param {Object} options - Read options (encoding, withFileTypes)
   * @param {Function} callback - Callback function (err, files)
   * @returns {undefined}
   */
  readdir(path, options, callback) {
    // Handle different parameter combinations
    if (typeof options === 'function') {
      callback = options;
      options = undefined;
    }
    return fs.readdir(this.resolvePath(path), options, callback);
  }

  /**
   * Asynchronously delete a file or symbolic link
   * @param {string} path - The file path to delete
   * @param {Function} callback - Callback function (err)
   * @returns {undefined}
   */
  unlink(path, callback) {
    return fs.unlink(this.resolvePath(path), callback);
  }

  /**
   * Create a readable stream for a file
   * @param {string} path - The file path
   * @param {Object} options - Stream options (encoding, flags, mode, etc.)
   * @returns {ReadStream} - A readable stream
   */
  createReadStream(path, options) {
    return fs.createReadStream(this.resolvePath(path), options);
  }

  /**
   * Create required application folders if they don't exist
   * @param {string[]} folderNames - Array of folder names to create
   * @returns {void} - Synchronous implementation
   */
  createFoldersIfNotExist(folderNames) {
    if (!Array.isArray(folderNames)) {
      throw new Error('folderNames must be an array');
    }

    folderNames.forEach(folderName => {
      if (typeof folderName !== 'string' || !folderName.trim()) {
        console.warn(`[NODE_FS] Skipping invalid folder name: ${folderName}`);
        return;
      }

      const folderPath = this.resolvePath(folderName.trim());
      
      if (!this.existsSync(folderPath)) {
        try {
          this.mkdirSync(folderPath, { recursive: true });
          console.log(`[NODE_FS] Created folder: ${folderPath}`);
        } catch (error) {
          console.error(`[NODE_FS] Failed to create folder ${folderPath}:`, error.message);
        }
      } else {
        console.log(`[NODE_FS] Folder already exists: ${folderPath}`);
      }
    });
  }
}

module.exports = NodeFileSystem;
