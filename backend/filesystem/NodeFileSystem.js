const fs = require('fs');
const IFileSystem = require('./IFileSystem');

/**
 * Node.js File System implementation
 * Wraps the native Node.js fs module methods
 */
class NodeFileSystem extends IFileSystem {
  /**
   * Synchronously check if a file or directory exists
   * @param {string} path - The path to check
   * @returns {boolean} - True if the path exists, false otherwise
   */
  existsSync(path) {
    return fs.existsSync(path);
  }

  /**
   * Synchronously create a directory
   * @param {string} path - The directory path to create
   * @param {Object} options - Options for directory creation (e.g., { recursive: true })
   * @returns {string|undefined} - The first directory path created, or undefined
   */
  mkdirSync(path, options) {
    return fs.mkdirSync(path, options);
  }

  /**
   * Synchronously write data to a file
   * @param {string} file - The file path
   * @param {string|Buffer|Uint8Array} data - The data to write
   * @param {string|Object} options - Write options (encoding, mode, flag)
   * @returns {undefined}
   */
  writeFileSync(file, data, options) {
    return fs.writeFileSync(file, data, options);
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
    return fs.readdir(path, options, callback);
  }

  /**
   * Asynchronously delete a file or symbolic link
   * @param {string} path - The file path to delete
   * @param {Function} callback - Callback function (err)
   * @returns {undefined}
   */
  unlink(path, callback) {
    return fs.unlink(path, callback);
  }

  /**
   * Create a readable stream for a file
   * @param {string} path - The file path
   * @param {Object} options - Stream options (encoding, flags, mode, etc.)
   * @returns {ReadStream} - A readable stream
   */
  createReadStream(path, options) {
    return fs.createReadStream(path, options);
  }
}

module.exports = NodeFileSystem;
