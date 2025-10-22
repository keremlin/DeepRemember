const NodeFileSystem = require('./NodeFileSystem');

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
    switch (type.toLowerCase()) {
      case 'node':
      case 'fs':
      case 'filesystem':
        return new NodeFileSystem();
      
      // Future implementations can be added here
      // case 'memory':
      //   return new MemoryFileSystem(config);
      // case 'cloud':
      //   return new CloudFileSystem(config);
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
    return new NodeFileSystem();
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
   * Get available file system types
   * @returns {string[]} - Array of available file system types
   */
  static getAvailableTypes() {
    return ['node'];
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
