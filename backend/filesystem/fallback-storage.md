# Fallback Storage Documentation

## Overview

The **fallback-storage** directory is a local backup system used when Google Drive is unavailable or encounters errors. This mechanism ensures that file operations can complete successfully even when cloud storage fails, preventing data loss and maintaining application availability.

## Purpose

The fallback storage serves three critical functions:

### 1. **Handle Synchronous Operations**
   - Google Drive operations are asynchronous by nature
   - Some legacy code expects synchronous file writes
   - The fallback provides immediate synchronous responses

### 2. **Ensure Data Availability**
   - When Google Drive is down or authentication fails
   - Files are still saved locally
   - Prevents loss of user data

### 3. **Improve Performance**
   - Immediate local saves avoid network latency
   - Upload to Google Drive happens in the background
   - Better user experience

## How It Works

When using Google Drive as the filesystem, the fallback mechanism works as follows:

```javascript
// When writeFileSync() is called:
1. Write to local fallback-storage immediately (fast, synchronous)
2. Upload to Google Drive asynchronously in background (slower, non-blocking)
```

### Detailed Process

1. **File Write Request**: Application requests a file write
2. **Immediate Local Write**: File is written to `./fallback-storage/voice/file.mp3` immediately
3. **Return Success**: Caller receives success response without waiting
4. **Background Upload**: Attempts to upload to Google Drive in the background
5. **Error Handling**: If Drive upload fails, logs warning but local copy remains safe

### Code Implementation

From `GoogleDrive.js`:

```javascript
writeFileSync(filePath, data, options = {}) {
  if (this.config.fallbackToLocal) {
    // Write to local fallback first
    const localPath = path.join(this.config.localFallbackPath, filePath);
    
    // Ensure directory exists
    const dirPath = path.dirname(localPath);
    this.localFs.mkdirSync(dirPath, { recursive: true });
    
    // Write file synchronously
    this.localFs.writeFileSync(localPath, data, options);
    console.log(`[GOOGLE_DRIVE] Written to local fallback: ${localPath}`);
    
    // Upload to Google Drive asynchronously (don't wait)
    this.writeFile(filePath, data, options).catch(error => {
      console.warn(`[GOOGLE_DRIVE] Failed to write file to Google Drive: ${error.message}`);
    });
    
    return localPath;
  }
}
```

## Directory Structure

The fallback-storage directory mirrors the application's file structure:

```
backend/fallback-storage/
├── files/          # General files fallback
│   └── [uploaded files]
└── voice/          # Audio files fallback
    ├── Ich_-2d91d226.mp3
    ├── Ich_-2d91d226.wav
    └── ...
```

## Configuration

The fallback storage is configured in `GoogleDrive.js`:

```javascript
this.config = {
  // ... other config ...
  
  // Compatibility settings
  fallbackToLocal: config.fallbackToLocal !== false, // Default: true
  localFallbackPath: config.localFallbackPath || './fallback-storage',
  
  // ... other config ...
};
```

### Environment Variables

You can configure fallback behavior via environment variables:

```bash
# Disable fallback to local storage (not recommended)
GOOGLE_DRIVE_FALLBACK_TO_LOCAL=false

# Custom fallback path
GOOGLE_DRIVE_LOCAL_FALLBACK_PATH=./custom-fallback
```

## Benefits

### 1. **No Data Loss**
   - Files are always saved locally first
   - Even if Google Drive fails, data is preserved
   - Critical for production reliability

### 2. **Performance**
   - Immediate response to file write requests
   - No waiting for network operations
   - Better user experience

### 3. **Offline Support**
   - Application works without internet connection
   - Local files are immediately available
   - Sync happens when connection is restored

### 4. **Backward Compatibility**
   - Supports synchronous file operations
   - Works with existing code that expects sync APIs
   - No need to refactor legacy code

## Important Considerations

### ⚠️ Data Synchronization

**Important**: If Google Drive is unavailable, files are stored locally ONLY. Consider:

- **Periodic Sync**: Implement a sync mechanism to upload local files to Drive
- **Monitoring**: Set up alerts for Drive upload failures
- **Manual Sync**: Provide tools to manually sync local files to Drive

### Best Practices

1. **Monitor Drive Upload Failures**
   ```javascript
   this.writeFile(filePath, data, options).catch(error => {
     console.error(`[GOOGLE_DRIVE] Failed to upload to Drive`, error);
     // Send alert to monitoring system
   });
   ```

2. **Implement Sync Job**
   ```javascript
   // Periodically sync fallback files to Drive
   async function syncFallbackFiles() {
     const files = await fileSystem.readdir('./fallback-storage/voice');
     for (const file of files) {
       await uploadToDrive(file);
     }
   }
   ```

3. **Disk Space Management**
   - Monitor local disk usage
   - Implement cleanup for old files
   - Set up alerts for low disk space

## Troubleshooting

### Common Issues

#### 1. Files Not Syncing to Drive
**Problem**: Files exist in fallback-storage but not in Google Drive

**Solutions**:
- Check Google Drive authentication
- Verify OAuth tokens are valid
- Check network connectivity
- Review error logs for upload failures

#### 2. Fallback Storage Growing Large
**Problem**: Local directory consuming too much disk space

**Solutions**:
- Implement automatic cleanup of old files
- Set up periodic sync to Drive
- Monitor disk usage

#### 3. Missing Files After Restart
**Problem**: Files disappear after server restart

**Cause**: Files may only exist in fallback storage if Drive sync failed

**Solution**: Implement startup sync to upload pending files

## Migration Scenarios

### Scenario 1: Local to Cloud Migration
When moving from local storage to Google Drive:

1. Enable fallback storage
2. Files are automatically uploaded to Drive
3. Old files remain in fallback as backup
4. Verify all files are in Drive
5. Optionally clean up fallback storage

### Scenario 2: Drive Failure Recovery
When Google Drive is unavailable:

1. Files continue to be saved locally
2. Application continues to function
3. Monitor Drive status
4. When Drive is restored, sync local files
5. Verify all files are uploaded

## Related Documentation

- [FileSystem Module](FILESYSTEM.md) - General filesystem documentation
- [Google Drive Setup](GOOGLE_CLOUD_SETUP.md) - Google Drive configuration
- [Google Drive Environment Variables](GOOGLE_DRIVE_ENV.md) - Environment configuration
- [OAuth Fix Guide](FIX_OAUTH_403.md) - Troubleshooting OAuth issues

## Summary

The fallback-storage directory is a **critical safety net** that:

- ✅ Prevents data loss
- ✅ Improves performance
- ✅ Enables offline operation
- ✅ Maintains backward compatibility

It ensures your application remains reliable and available even when cloud storage encounters issues.

