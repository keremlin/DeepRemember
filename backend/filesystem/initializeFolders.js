const FileSystemFactory = require('./FileSystemFactory');

/**
 * Initialize application folders on startup
 * Creates required folders (voice, files) if they don't exist
 */
async function initializeAppFolders() {
  try {
    console.log('[APP_INIT] Initializing application folders...');
    
    const fileSystem = FileSystemFactory.createDefault();
    const requiredFolders = ['voice', 'files'];
    
    // Check if the method exists and call it
    if (typeof fileSystem.createFoldersIfNotExist === 'function') {
      if (fileSystem.createFoldersIfNotExist.constructor.name === 'AsyncFunction') {
        // Async implementation (Google Drive)
        await fileSystem.createFoldersIfNotExist(requiredFolders);
      } else {
        // Sync implementation (Node FS)
        fileSystem.createFoldersIfNotExist(requiredFolders);
      }
      console.log('[APP_INIT] Application folders initialized successfully');
    } else {
      console.warn('[APP_INIT] createFoldersIfNotExist method not available, skipping folder initialization');
    }
  } catch (error) {
    console.error('[APP_INIT] Failed to initialize application folders:', error.message);
    // Don't throw - let the app continue even if folder creation fails
  }
}

module.exports = {
  initializeAppFolders
};
