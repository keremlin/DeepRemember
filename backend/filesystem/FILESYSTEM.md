# FileSystem Module Documentation

## Overview

The FileSystem module provides an abstraction layer for file system operations in the DeepRemember backend. It implements the Factory pattern and Interface pattern to allow for flexible file system implementations and easy testing.

## Architecture

The filesystem module consists of three main components:

1. **IFileSystem.js** - Interface defining the contract for file system operations
2. **NodeFileSystem.js** - Concrete implementation using Node.js native `fs` module
3. **FileSystemFactory.js** - Factory for creating file system instances

## File Structure

```
backend/filesystem/
├── IFileSystem.js          # Interface definition
├── NodeFileSystem.js       # Node.js implementation
├── FileSystemFactory.js    # Factory for creating instances
└── FILESYSTEM.md          # This documentation
```

## Interface (IFileSystem.js)

The `IFileSystem` interface defines the contract that all file system implementations must follow:

### Methods

| Method | Type | Description | Parameters |
|--------|------|-------------|------------|
| `existsSync(path)` | Synchronous | Check if file/directory exists | `path: string` |
| `mkdirSync(path, options)` | Synchronous | Create directory | `path: string`, `options: Object` |
| `writeFileSync(file, data, options)` | Synchronous | Write data to file | `file: string`, `data: Buffer|string`, `options: Object` |
| `readdir(path, options, callback)` | Asynchronous | Read directory contents | `path: string`, `options: Object`, `callback: Function` |
| `unlink(path, callback)` | Asynchronous | Delete file | `path: string`, `callback: Function` |
| `createReadStream(path, options)` | Synchronous | Create readable stream | `path: string`, `options: Object` |

## Implementation (NodeFileSystem.js)

The `NodeFileSystem` class implements the `IFileSystem` interface by wrapping the Node.js native `fs` module methods.

### Features

- **Direct Mapping**: Each interface method directly maps to the corresponding `fs` method
- **Parameter Handling**: Handles different parameter combinations (e.g., `readdir` with optional options)
- **Error Propagation**: Passes through all errors from the underlying `fs` module
- **Type Safety**: Maintains the same API as the native `fs` module

### Usage Example

```javascript
const NodeFileSystem = require('./NodeFileSystem');
const fs = new NodeFileSystem();

// Check if file exists
if (fs.existsSync('/path/to/file.txt')) {
  console.log('File exists');
}

// Create directory
fs.mkdirSync('/path/to/directory', { recursive: true });

// Write file
fs.writeFileSync('/path/to/file.txt', 'Hello World', 'utf8');

// Read directory
fs.readdir('/path/to/directory', (err, files) => {
  if (err) throw err;
  console.log(files);
});

// Delete file
fs.unlink('/path/to/file.txt', (err) => {
  if (err) throw err;
  console.log('File deleted');
});

// Create read stream
const stream = fs.createReadStream('/path/to/file.txt');
```

## Factory (FileSystemFactory.js)

The `FileSystemFactory` provides centralized creation and configuration of file system instances.

### Methods

| Method | Description | Parameters | Returns |
|--------|-------------|------------|---------|
| `createFileSystem(type, config)` | Create file system by type | `type: string`, `config: Object` | `IFileSystem` |
| `createNodeFileSystem(config)` | Create Node.js file system | `config: Object` | `NodeFileSystem` |
| `createDefault()` | Create default file system | None | `IFileSystem` |
| `getDefaultType()` | Get default type from env | None | `string` |
| `getAvailableTypes()` | Get available types | None | `string[]` |
| `isSupported(type)` | Check if type is supported | `type: string` | `boolean` |

### Environment Configuration

The factory uses the `FS_TYPE` environment variable to determine the default file system type:

```bash
# .env file
FS_TYPE=node
```

### Usage Examples

```javascript
const FileSystemFactory = require('./FileSystemFactory');

// Create default file system (uses FS_TYPE env var)
const fs = FileSystemFactory.createDefault();

// Create specific type
const fs = FileSystemFactory.createFileSystem('node');

// Create Node.js file system directly
const fs = FileSystemFactory.createNodeFileSystem();

// Check available types
const types = FileSystemFactory.getAvailableTypes();
console.log(types); // ['node']

// Check if type is supported
if (FileSystemFactory.isSupported('node')) {
  console.log('Node file system is supported');
}
```

## Integration in Backend

The filesystem module is integrated throughout the backend in the following files:

### Files Using FileSystemFactory

1. **`backend/routes/deepRemember.js`**
   - Voice file management
   - Audio file creation and checking

2. **`backend/routes/files.js`**
   - File listing and deletion
   - Directory operations

3. **`backend/middleware/uploadConfig.js`**
   - Upload directory creation

4. **`backend/stt/Groq.js`**
   - Audio file validation and streaming
   - Subtitle file writing

5. **`backend/stt/localWhisper.js`**
   - File existence validation

6. **`backend/database/access/SQLiteDatabase.js`**
   - Database directory creation

### Integration Pattern

All files follow the same integration pattern:

```javascript
const FileSystemFactory = require('../filesystem/FileSystemFactory');
const fileSystem = FileSystemFactory.createDefault();

// Use fileSystem instead of direct fs calls
if (fileSystem.existsSync(path)) {
  // ...
}
```

## Benefits

### 1. **Abstraction**
- File system operations are abstracted behind a clean interface
- Implementation details are hidden from consuming code

### 2. **Testability**
- Easy to create mock implementations for testing
- Can inject test file systems without modifying production code

### 3. **Flexibility**
- Can easily swap implementations (e.g., cloud storage, in-memory)
- Environment-based configuration allows different setups

### 4. **Consistency**
- All file operations go through the same interface
- Uniform error handling and API across the application

### 5. **Maintainability**
- Centralized file system logic
- Easy to modify behavior without touching multiple files

### 6. **Future-Proof**
- Ready for additional implementations (cloud, memory, etc.)
- Extensible architecture

## Future Implementations

The factory is designed to easily accommodate future file system implementations:

### Potential Implementations

1. **MemoryFileSystem**
   ```javascript
   case 'memory':
     return new MemoryFileSystem(config);
   ```

2. **CloudFileSystem**
   ```javascript
   case 'cloud':
     return new CloudFileSystem(config);
   ```

3. **MockFileSystem**
   ```javascript
   case 'mock':
     return new MockFileSystem(config);
   ```

### Adding New Implementations

To add a new file system implementation:

1. Create a new class that extends `IFileSystem`
2. Implement all required methods
3. Add the case to `FileSystemFactory.createFileSystem()`
4. Update `getAvailableTypes()` method
5. Add environment variable support if needed

## Environment Variables

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `FS_TYPE` | File system type to use | `node` | `FS_TYPE=node` |

## Error Handling

The filesystem module maintains the same error handling behavior as the native Node.js `fs` module:

- **Synchronous methods**: Throw errors immediately
- **Asynchronous methods**: Pass errors to callback functions
- **Streams**: Emit error events

## Performance Considerations

- **Synchronous methods**: Use sparingly in production
- **Streams**: Use for large files to avoid memory issues
- **Caching**: Consider implementing caching for frequently accessed files

## Testing

### Unit Testing

```javascript
const MockFileSystem = require('./MockFileSystem');
const fileSystem = new MockFileSystem();

// Test file operations
fileSystem.writeFileSync('/test.txt', 'content');
expect(fileSystem.existsSync('/test.txt')).toBe(true);
```

### Integration Testing

```javascript
// Use environment variable to switch to test file system
process.env.FS_TYPE = 'mock';
const fileSystem = FileSystemFactory.createDefault();
```

## Migration Guide

### From Direct fs Usage

**Before:**
```javascript
const fs = require('fs');
if (fs.existsSync(path)) {
  fs.writeFileSync(path, data);
}
```

**After:**
```javascript
const FileSystemFactory = require('../filesystem/FileSystemFactory');
const fileSystem = FileSystemFactory.createDefault();
if (fileSystem.existsSync(path)) {
  fileSystem.writeFileSync(path, data);
}
```

## Troubleshooting

### Common Issues

1. **Environment Variable Not Set**
   - Defaults to 'node' if `FS_TYPE` is not set
   - Check `.env` file configuration

2. **Unsupported File System Type**
   - Error: "Unsupported file system type: xyz"
   - Check `getAvailableTypes()` for supported types

3. **File System Not Found**
   - Ensure the implementation file exists
   - Check import paths

### Debug Mode

Enable debug logging by setting:
```bash
DEBUG=filesystem
```

## Contributing

When contributing to the filesystem module:

1. Follow the existing interface contract
2. Add comprehensive tests
3. Update documentation
4. Consider backward compatibility
5. Add error handling for edge cases

## License

This filesystem module is part of the DeepRemember project and follows the same license terms.
