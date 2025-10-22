const NodeFileSystem = require('./NodeFileSystem');
const GoogleDrive = require('./GoogleDrive');

/**
 * Factory for creating FileSystem implementations
 * Provides centralized creation and configuration of file system instances
 */
class FileSystemFactory {
  /**
   * Create a file system instance based on the specified type
   * @param {string} type - The type of file system to create ('node', 'memory', etc.)
   * @param {Object} config - Configuration options for the file system
   * @returns {IFileSystem} - File system instance
   */
  static createFileSystem(type = 'node', config = {}) {
    const rootDir = process.env.FS_ROOT_DIR || process.env.fs_root_dir || '';
    const normalizedRoot = (rootDir || '').toString().replace(/^[\/]+/, '').replace(/[\/]+$/, '');
    const mergedConfig = { ...config };

    switch (type.toLowerCase()) {
      case 'node':
      case 'fs':
      case 'filesystem':
        return new NodeFileSystem({ rootDir: normalizedRoot });
      
      case 'google':
      case 'googledrive':
      case 'gdrive':
        // Only set basePath if not already provided in config
        const googleConfig = { ...mergedConfig };
        if (!googleConfig.basePath && normalizedRoot) {
          googleConfig.basePath = `/${normalizedRoot}`;
        }
        return new GoogleDrive(googleConfig);
      
      // Future implementations can be added here
      // case 'memory':
      //   return new MemoryFileSystem(config);
      // case 'aws':
      //   return new AWSFileSystem(config);
      // case 'mock':
      //   return new MockFileSystem(config);
      
      default:
        throw new Error(`Unsupported file system type: ${type}`);
    }
  }

  /**
   * Create a Node.js file system instance (default)
   * @param {Object} config - Configuration options
   * @returns {NodeFileSystem} - Node file system instance
   */
  static createNodeFileSystem(config = {}) {
    const rootDir = process.env.FS_ROOT_DIR || process.env.fs_root_dir || '';
    const normalizedRoot = (rootDir || '').toString().replace(/^[\/]+/, '').replace(/[\/]+$/, '');
    return new NodeFileSystem({ rootDir: normalizedRoot, ...config });
  }

  /**
   * Get the default file system type from environment or config
   * @returns {string} - Default file system type
   */
  static getDefaultType() {
    return process.env.FS_TYPE || 'node';
  }

  /**
   * Create a file system instance using default configuration
   * @returns {IFileSystem} - File system instance
   */
  static createDefault() {
    const type = this.getDefaultType();
    return this.createFileSystem(type);
  }

  /**
   * Create a Google Drive file system instance
   * @param {Object} config - Configuration options
   * @returns {GoogleDrive} - Google Drive file system instance
   */
  static createGoogleDriveFileSystem(config = {}) {
    const rootDir = process.env.FS_ROOT_DIR || process.env.fs_root_dir || '';
    const normalizedRoot = (rootDir || '').toString().replace(/^[\/]+/, '').replace(/[\/]+$/, '');
    
    // Only set basePath if not already provided in config
    const googleConfig = { ...config };
    if (!googleConfig.basePath && normalizedRoot) {
      googleConfig.basePath = `/${normalizedRoot}`;
    }
    return new GoogleDrive(googleConfig);
  }

  /**
   * Get available file system types
   * @returns {string[]} - Array of available file system types
   */
  static getAvailableTypes() {
    return ['node', 'google', 'googledrive', 'gdrive'];
  }

  /**
   * Check if a file system type is supported
   * @param {string} type - File system type to check
   * @returns {boolean} - True if supported, false otherwise
   */
  static isSupported(type) {
    return this.getAvailableTypes().includes(type.toLowerCase());
  }
}

module.exports = FileSystemFactory;
