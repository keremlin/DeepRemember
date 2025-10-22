const { google } = require('googleapis');
const IFileSystem = require('./IFileSystem');
const path = require('path');

/**
 * Google Drive implementation of IFileSystem interface
 * Provides file system operations using Google Drive API with OAuth 2.0
 * Includes compatibility layer for synchronous operations
 */
class GoogleDrive extends IFileSystem {
  constructor(config = {}) {
    super();
    this.config = {
      // OAuth 2.0 credentials
      clientId: config.clientId || process.env.GOOGLE_CLIENT_ID,
      clientSecret: config.clientSecret || process.env.GOOGLE_CLIENT_SECRET,
      redirectUri: config.redirectUri || process.env.GOOGLE_REDIRECT_URI,
      
      // Authentication tokens
      accessToken: config.accessToken || process.env.GOOGLE_ACCESS_TOKEN,
      refreshToken: config.refreshToken || process.env.GOOGLE_REFRESH_TOKEN,
      
      // Drive configuration
      rootFolderId: config.rootFolderId || process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || 'root',
      basePath: config.basePath || process.env.GOOGLE_DRIVE_BASE_PATH || '/DeepRemember',
      
      // API settings
      scopes: config.scopes || [
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/drive.metadata.readonly'
      ],
      
      // Compatibility settings
      fallbackToLocal: config.fallbackToLocal !== false, // Default to true
      localFallbackPath: config.localFallbackPath || './fallback-storage',
      
      ...config
    };

    this.oauth2Client = null;
    this.drive = null;
    this.isInitialized = false;
    this.fileCache = new Map(); // Cache for file metadata
    this.folderCache = new Map(); // Cache for folder structure
    
    // Fallback to local filesystem for sync operations
    if (this.config.fallbackToLocal) {
      const fs = require('fs');
      this.localFs = {
        existsSync: (path) => fs.existsSync(path),
        mkdirSync: (path, options) => fs.mkdirSync(path, options),
        writeFileSync: (path, data, options) => fs.writeFileSync(path, data, options)
      };
    }
  }

  /**
   * Normalize file path for Google Drive
   * Converts Windows paths to Unix-style paths and removes invalid characters
   */
  normalizePath(filePath) {
    if (!filePath) return '';
    
    // Convert backslashes to forward slashes
    let normalizedPath = filePath.replace(/\\/g, '/');
    
    // Remove Windows drive letters (C:, D:, etc.)
    normalizedPath = normalizedPath.replace(/^[A-Z]:/, '');
    
    // Remove leading slashes
    normalizedPath = normalizedPath.replace(/^\/+/, '');
    
    // Remove trailing slashes
    normalizedPath = normalizedPath.replace(/\/+$/, '');
    
    // Remove any remaining invalid characters for Google Drive
    normalizedPath = normalizedPath.replace(/[<>:"|?*]/g, '_');
    
    return normalizedPath;
  }

  /**
   * Resolve a folder path to a Google Drive folder ID
   */
  async resolveFolderId(folderPath) {
    await this.initialize();

    // Empty, '.', or '/' means base folder
    if (!folderPath || folderPath === '.' || folderPath === '/') {
      return this.baseFolderId || this.config.rootFolderId;
    }

    const normalized = this.normalizePath(folderPath);
    const fullPath = path.posix.join(this.config.basePath, normalized);
    const segments = fullPath.split('/').filter(part => part && part !== '.');

    let currentFolderId = this.baseFolderId || this.config.rootFolderId;
    for (const segment of segments) {
      currentFolderId = await this.findOrCreateFolder(segment, currentFolderId);
    }
    return currentFolderId;
  }

  /**
   * Initialize the Google Drive API client
   */
  async initialize() {
    if (this.isInitialized) return;

    try {
      // Validate required configuration
      if (!this.config.clientId || !this.config.clientSecret) {
        throw new Error('Google OAuth credentials (clientId, clientSecret) are required');
      }

      // Create OAuth2 client
      this.oauth2Client = new google.auth.OAuth2(
        this.config.clientId,
        this.config.clientSecret,
        this.config.redirectUri
      );

      // Set credentials if available
      if (this.config.accessToken && this.config.refreshToken) {
        this.oauth2Client.setCredentials({
          access_token: this.config.accessToken,
          refresh_token: this.config.refreshToken
        });
      }

      // Create Drive API instance
      this.drive = google.drive({ version: 'v3', auth: this.oauth2Client });

      // Ensure base path exists
      await this.ensureBasePath();

      this.isInitialized = true;
      console.log('[GOOGLE_DRIVE] Initialized successfully');
    } catch (error) {
      console.error('[GOOGLE_DRIVE] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Ensure the base path exists in Google Drive
   */
  async ensureBasePath() {
    if (this.config.basePath === '/') return;

    const pathParts = this.config.basePath.split('/').filter(part => part);
    let currentFolderId = this.config.rootFolderId;

    for (const folderName of pathParts) {
      const folderId = await this.findOrCreateFolder(folderName, currentFolderId);
      currentFolderId = folderId;
    }

    this.baseFolderId = currentFolderId;
  }

  /**
   * Find or create a folder by name in the specified parent folder
   */
  async findOrCreateFolder(folderName, parentId) {
    try {
      // Check cache first
      const cacheKey = `${parentId}/${folderName}`;
      if (this.folderCache.has(cacheKey)) {
        return this.folderCache.get(cacheKey);
      }

      // Search for existing folder
      const response = await this.drive.files.list({
        q: `name='${folderName}' and parents in '${parentId}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: 'files(id, name)'
      });

      if (response.data.files.length > 0) {
        const folderId = response.data.files[0].id;
        this.folderCache.set(cacheKey, folderId);
        return folderId;
      }

      // Create new folder
      const folderResponse = await this.drive.files.create({
        requestBody: {
          name: folderName,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [parentId]
        },
        fields: 'id'
      });

      const folderId = folderResponse.data.id;
      this.folderCache.set(cacheKey, folderId);
      return folderId;
    } catch (error) {
      console.error(`[GOOGLE_DRIVE] Error finding/creating folder ${folderName}:`, error);
      throw error;
    }
  }

  /**
   * Convert file path to Google Drive file ID
   */
  async pathToFileId(filePath) {
    await this.initialize();
    
    // Normalize the path using our utility function
    const normalizedPath = this.normalizePath(filePath);
    
    // Join with base path and normalize
    const fullPath = path.posix.join(this.config.basePath, normalizedPath);
    const pathParts = fullPath.split('/').filter(part => part && part !== '.');
    
    console.log(`[GOOGLE_DRIVE] Converting path: ${filePath} -> ${normalizedPath} -> ${fullPath} -> [${pathParts.join(', ')}]`);
    
    if (pathParts.length === 0) {
      return this.baseFolderId || this.config.rootFolderId;
    }

    let currentFolderId = this.baseFolderId || this.config.rootFolderId;
    
    // Navigate through folder structure
    for (let i = 0; i < pathParts.length - 1; i++) {
      const folderName = pathParts[i];
      currentFolderId = await this.findOrCreateFolder(folderName, currentFolderId);
    }

    // Check if the last part is a file
    const fileName = pathParts[pathParts.length - 1];
    const fileId = await this.findFile(fileName, currentFolderId);
    
    return fileId;
  }

  /**
   * Find a file by name in the specified parent folder
   */
  async findFile(fileName, parentId) {
    try {
      const response = await this.drive.files.list({
        q: `name='${fileName}' and parents in '${parentId}' and trashed=false`,
        fields: 'files(id, name, mimeType)'
      });

      return response.data.files.length > 0 ? response.data.files[0].id : null;
    } catch (error) {
      console.error(`[GOOGLE_DRIVE] Error finding file ${fileName}:`, error);
      throw error;
    }
  }

  /**
   * Synchronously check if a file or directory exists
   * Uses local fallback for immediate response
   */
  existsSync(filePath) {
    if (this.config.fallbackToLocal) {
      // Check local fallback first
      const localPath = path.join(this.config.localFallbackPath, filePath);
      if (this.localFs.existsSync(localPath)) {
        return true;
      }
      
      // For Google Drive, we can't do synchronous operations
      // Return false and log a warning
      console.warn(`[GOOGLE_DRIVE] existsSync called for ${filePath}. Google Drive operations are asynchronous. Using local fallback.`);
      return false;
    }
    
    console.warn(`[GOOGLE_DRIVE] existsSync called for ${filePath}. Google Drive operations are asynchronous. Consider using exists() method instead.`);
    return false;
  }

  /**
   * Asynchronously check if a file or directory exists
   */
  async exists(filePath) {
    await this.initialize();
    
    try {
      const fileId = await this.pathToFileId(filePath);
      return fileId !== null;
    } catch (error) {
      console.error(`[GOOGLE_DRIVE] Error checking existence of ${filePath}:`, error);
      return false;
    }
  }

  /**
   * Synchronously create a directory
   * Uses local fallback for immediate response
   */
  mkdirSync(dirPath, options = {}) {
    if (this.config.fallbackToLocal) {
      // Create local fallback directory
      const localPath = path.join(this.config.localFallbackPath, dirPath);
      try {
        this.localFs.mkdirSync(localPath, { recursive: true, ...options });
        console.log(`[GOOGLE_DRIVE] Created local fallback directory: ${localPath}`);
        
        // Also create in Google Drive asynchronously (don't wait)
        this.mkdir(dirPath, options).catch(error => {
          console.warn(`[GOOGLE_DRIVE] Failed to create directory in Google Drive: ${error.message}`);
        });
        
        return localPath;
      } catch (error) {
        console.error(`[GOOGLE_DRIVE] Error creating local fallback directory: ${error.message}`);
        return undefined;
      }
    }
    
    console.warn(`[GOOGLE_DRIVE] mkdirSync called for ${dirPath}. Google Drive operations are asynchronous. Consider using mkdir() method instead.`);
    return undefined;
  }

  /**
   * Asynchronously create a directory
   */
  async mkdir(dirPath, options = {}) {
    await this.initialize();
    
    try {
      // Normalize the path
      const normalizedPath = this.normalizePath(dirPath);
      
      const fullPath = path.posix.join(this.config.basePath, normalizedPath);
      const pathParts = fullPath.split('/').filter(part => part && part !== '.');
      
      let currentFolderId = this.baseFolderId || this.config.rootFolderId;
      
      for (const folderName of pathParts) {
        currentFolderId = await this.findOrCreateFolder(folderName, currentFolderId);
      }
      
      return currentFolderId;
    } catch (error) {
      console.error(`[GOOGLE_DRIVE] Error creating directory ${dirPath}:`, error);
      throw error;
    }
  }

  /**
   * Synchronously write data to a file
   * Uses local fallback for immediate response
   */
  writeFileSync(filePath, data, options = {}) {
    if (this.config.fallbackToLocal) {
      // Write to local fallback first
      const localPath = path.join(this.config.localFallbackPath, filePath);
      try {
        // Ensure directory exists
        const dirPath = path.dirname(localPath);
        this.localFs.mkdirSync(dirPath, { recursive: true });
        
        this.localFs.writeFileSync(localPath, data, options);
        console.log(`[GOOGLE_DRIVE] Written to local fallback: ${localPath}`);
        
        // Also write to Google Drive asynchronously (don't wait)
        this.writeFile(filePath, data, options).catch(error => {
          console.warn(`[GOOGLE_DRIVE] Failed to write file to Google Drive: ${error.message}`);
        });
        
        return localPath;
      } catch (error) {
        console.error(`[GOOGLE_DRIVE] Error writing to local fallback: ${error.message}`);
        return undefined;
      }
    }
    
    console.warn(`[GOOGLE_DRIVE] writeFileSync called for ${filePath}. Google Drive operations are asynchronous. Consider using writeFile() method instead.`);
    return undefined;
  }

  /**
   * Asynchronously write data to a file
   */
  async writeFile(filePath, data, options = {}) {
    await this.initialize();
    
    try {
      // Normalize the path
      const normalizedPath = this.normalizePath(filePath);
      
      const fullPath = path.posix.join(this.config.basePath, normalizedPath);
      const pathParts = fullPath.split('/').filter(part => part && part !== '.');
      const fileName = pathParts.pop();
      const dirPath = pathParts.join('/');
      
      // Ensure directory exists
      let parentId = this.baseFolderId || this.config.rootFolderId;
      if (pathParts.length > 0) {
        // Don't use mkdir here as it will duplicate the basePath
        // Instead, navigate through the path parts manually
        for (const folderName of pathParts) {
          parentId = await this.findOrCreateFolder(folderName, parentId);
        }
      }
      
      // Convert data to buffer if needed
      const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data, options.encoding || 'utf8');
      
      // Create a readable stream from the buffer
      const { Readable } = require('stream');
      const stream = new Readable();
      stream.push(buffer);
      stream.push(null); // End the stream
      
      // Check if file already exists
      const existingFileId = await this.findFile(fileName, parentId);
      
      const metadata = {
        name: fileName,
        parents: [parentId]
      };
      
      let response;
      if (existingFileId) {
        // Update existing file
        response = await this.drive.files.update({
          fileId: existingFileId,
          requestBody: metadata,
          media: {
            mimeType: options.mimeType || 'text/plain',
            body: stream
          }
        });
      } else {
        // Create new file
        response = await this.drive.files.create({
          requestBody: metadata,
          media: {
            mimeType: options.mimeType || 'text/plain',
            body: stream
          },
          fields: 'id'
        });
      }
      
      console.log(`[GOOGLE_DRIVE] File written: ${filePath}`);
      return response.data.id;
    } catch (error) {
      console.error(`[GOOGLE_DRIVE] Error writing file ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Asynchronously read the contents of a directory
   */
  readdir(dirPath, options, callback) {
    // Handle different parameter combinations
    if (typeof options === 'function') {
      callback = options;
      options = {};
    }

    this.readdirAsync(dirPath, options)
      .then(files => callback(null, files))
      .catch(error => callback(error));
  }

  /**
   * Asynchronously read directory contents (Promise-based)
   */
  async readdirAsync(dirPath, options = {}) {
    await this.initialize();
    
    try {
      // Resolve target folder ID (handles '', '.', '/', and nested folders)
      const folderId = await this.resolveFolderId(dirPath);
      
      const response = await this.drive.files.list({
        q: `parents in '${folderId}' and trashed=false`,
        fields: 'files(id, name, mimeType)',
        orderBy: 'name'
      });
      
      const files = response.data.files.map(file => ({
        name: file.name,
        id: file.id,
        isDirectory: file.mimeType === 'application/vnd.google-apps.folder'
      }));
      
      return files.map(file => file.name);
    } catch (error) {
      console.error(`[GOOGLE_DRIVE] Error reading directory ${dirPath}:`, error);
      throw error;
    }
  }

  /**
   * Asynchronously delete a file
   */
  unlink(filePath, callback) {
    this.unlinkAsync(filePath)
      .then(() => callback(null))
      .catch(error => callback(error));
  }

  /**
   * Asynchronously delete a file (Promise-based)
   */
  async unlinkAsync(filePath) {
    await this.initialize();
    
    try {
      const fileId = await this.pathToFileId(filePath);
      
      if (!fileId) {
        throw new Error(`File not found: ${filePath}`);
      }
      
      await this.drive.files.delete({
        fileId: fileId
      });
      
      console.log(`[GOOGLE_DRIVE] File deleted: ${filePath}`);
    } catch (error) {
      console.error(`[GOOGLE_DRIVE] Error deleting file ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Create a readable stream for a file
   */
  createReadStream(filePath, options = {}) {
    // For Google Drive, we need to create a custom readable stream
    const { Readable } = require('stream');
    
    const stream = new Readable({
      read() {
        // This will be implemented when data is requested
      }
    });
    
    // Initialize and fetch file data asynchronously
    this.initialize()
      .then(async () => {
        try {
          const fileId = await this.pathToFileId(filePath);
          
          if (!fileId) {
            stream.emit('error', new Error(`File not found: ${filePath}`));
            return;
          }
          
          const response = await this.drive.files.get({
            fileId: fileId,
            alt: 'media'
          }, {
            responseType: 'stream'
          });
          
          response.data.on('data', (chunk) => {
            stream.push(chunk);
          });
          
          response.data.on('end', () => {
            stream.push(null);
          });
          
          response.data.on('error', (error) => {
            stream.emit('error', error);
          });
          
        } catch (error) {
          stream.emit('error', error);
        }
      })
      .catch(error => {
        stream.emit('error', error);
      });
    
    return stream;
  }

  /**
   * Create required application folders if they don't exist
   * @param {string[]} folderNames - Array of folder names to create
   * @returns {Promise<void>} - Asynchronous implementation
   */
  async createFoldersIfNotExist(folderNames) {
    if (!Array.isArray(folderNames)) {
      throw new Error('folderNames must be an array');
    }

    await this.initialize();

    for (const folderName of folderNames) {
      if (typeof folderName !== 'string' || !folderName.trim()) {
        console.warn(`[GOOGLE_DRIVE] Skipping invalid folder name: ${folderName}`);
        continue;
      }

      const normalizedFolderName = folderName.trim();
      
      try {
        // For folder creation, we need to create the folder under the base path
        // So we pass the folder name directly to mkdir, which will handle the basePath
        const folderId = await this.mkdir(normalizedFolderName);
        
        if (folderId) {
          console.log(`[GOOGLE_DRIVE] Folder created/verified: ${normalizedFolderName}`);
        }
      } catch (error) {
        console.error(`[GOOGLE_DRIVE] Failed to create folder ${normalizedFolderName}:`, error.message);
      }
    }
  }

  /**
   * Get OAuth2 authorization URL for initial setup
   */
  getAuthUrl() {
    if (!this.oauth2Client) {
      throw new Error('OAuth2 client not initialized');
    }
    
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: this.config.scopes,
      prompt: 'consent'
    });
  }

  /**
   * Exchange authorization code for tokens
   */
  async getTokens(code) {
    if (!this.oauth2Client) {
      throw new Error('OAuth2 client not initialized');
    }
    
    const { tokens } = await this.oauth2Client.getToken(code);
    this.oauth2Client.setCredentials(tokens);
    
    return tokens;
  }

  /**
   * Refresh access token
   */
  async refreshToken() {
    if (!this.oauth2Client) {
      throw new Error('OAuth2 client not initialized');
    }
    
    const { credentials } = await this.oauth2Client.refreshAccessToken();
    this.oauth2Client.setCredentials(credentials);
    
    return credentials;
  }
}

module.exports = GoogleDrive;