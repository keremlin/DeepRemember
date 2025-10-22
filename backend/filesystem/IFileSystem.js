/**
 * Interface for File System operations
 * Defines the contract for file system implementations
 */
class IFileSystem {
  /**
   * Synchronously check if a file or directory exists
   * @param {string} path - The path to check
   * @returns {boolean} - True if the path exists, false otherwise
   */
  existsSync(path) {
    throw new Error('existsSync method must be implemented');
  }

  /**
   * Synchronously create a directory
   * @param {string} path - The directory path to create
   * @param {Object} options - Options for directory creation (e.g., { recursive: true })
   * @returns {string|undefined} - The first directory path created, or undefined
   */
  mkdirSync(path, options) {
    throw new Error('mkdirSync method must be implemented');
  }

  /**
   * Synchronously write data to a file
   * @param {string} file - The file path
   * @param {string|Buffer|Uint8Array} data - The data to write
   * @param {string|Object} options - Write options (encoding, mode, flag)
   * @returns {undefined}
   */
  writeFileSync(file, data, options) {
    throw new Error('writeFileSync method must be implemented');
  }

  /**
   * Asynchronously read the contents of a directory
   * @param {string} path - The directory path to read
   * @param {Object} options - Read options (encoding, withFileTypes)
   * @param {Function} callback - Callback function (err, files)
   * @returns {undefined}
   */
  readdir(path, options, callback) {
    throw new Error('readdir method must be implemented');
  }

  /**
   * Asynchronously delete a file or symbolic link
   * @param {string} path - The file path to delete
   * @param {Function} callback - Callback function (err)
   * @returns {undefined}
   */
  unlink(path, callback) {
    throw new Error('unlink method must be implemented');
  }

  /**
   * Create a readable stream for a file
   * @param {string} path - The file path
   * @param {Object} options - Stream options (encoding, flags, mode, etc.)
   * @returns {ReadStream} - A readable stream
   */
  createReadStream(path, options) {
    throw new Error('createReadStream method must be implemented');
  }
}

module.exports = IFileSystem;
