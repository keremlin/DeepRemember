# Environment Variables for Google Drive FileSystem

## Required Environment Variables

### Google OAuth 2.0 Credentials
These are obtained from the Google Cloud Console:

```bash
# Google OAuth 2.0 Client ID
GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com

# Google OAuth 2.0 Client Secret
GOOGLE_CLIENT_SECRET=your_client_secret_here

# OAuth 2.0 Redirect URI (must match Google Cloud Console configuration)
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback
```

### Authentication Tokens
These are obtained after completing the OAuth flow:

```bash
# Access Token (expires, will be refreshed automatically)
GOOGLE_ACCESS_TOKEN=ya29.a0AfH6SMC...

# Refresh Token (long-lived, used to get new access tokens)
GOOGLE_REFRESH_TOKEN=1//04...
```

### Google Drive Configuration

```bash
# File System Type (set to 'google' to use Google Drive)
FS_TYPE=google

# Root folder ID in Google Drive (default: 'root' for My Drive)
GOOGLE_DRIVE_ROOT_FOLDER_ID=root

# Base path within Google Drive (default: '/DeepRemember')
GOOGLE_DRIVE_BASE_PATH=/DeepRemember
```

## Complete .env Example

```bash
# File System Configuration
FS_TYPE=google

# Google OAuth 2.0 Credentials
GOOGLE_CLIENT_ID=123456789-abcdefghijklmnop.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abcdefghijklmnopqrstuvwxyz
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback

# Google Drive Authentication Tokens
GOOGLE_ACCESS_TOKEN=ya29.a0AfH6SMC...
GOOGLE_REFRESH_TOKEN=1//04...

# Google Drive Configuration
GOOGLE_DRIVE_ROOT_FOLDER_ID=root
GOOGLE_DRIVE_BASE_PATH=/DeepRemember
```

## Environment Variable Descriptions

| Variable | Description | Required | Default | Example |
|----------|-------------|----------|---------|---------|
| `FS_TYPE` | File system type to use | Yes | `node` | `google` |
| `GOOGLE_CLIENT_ID` | OAuth 2.0 Client ID from Google Cloud Console | Yes | - | `123...apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | OAuth 2.0 Client Secret from Google Cloud Console | Yes | - | `GOCSPX-...` |
| `GOOGLE_REDIRECT_URI` | OAuth 2.0 Redirect URI | Yes | - | `http://localhost:3000/auth/callback` |
| `GOOGLE_ACCESS_TOKEN` | OAuth 2.0 Access Token | No* | - | `ya29.a0AfH6SMC...` |
| `GOOGLE_REFRESH_TOKEN` | OAuth 2.0 Refresh Token | No* | - | `1//04...` |
| `GOOGLE_DRIVE_ROOT_FOLDER_ID` | Root folder ID in Google Drive | No | `root` | `1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms` |
| `GOOGLE_DRIVE_BASE_PATH` | Base path within Google Drive | No | `/DeepRemember` | `/MyApp/Files` |

*Access and refresh tokens are required for authenticated operations but can be obtained through the OAuth flow.

## Security Notes

1. **Never commit tokens to version control**
2. **Use environment-specific .env files**
3. **Rotate credentials regularly**
4. **Use least-privilege scopes**
5. **Monitor API usage in Google Cloud Console**

## Token Management

### Initial Setup
1. Set up OAuth credentials in Google Cloud Console
2. Run the OAuth flow to get initial tokens
3. Store tokens in environment variables

### Token Refresh
The Google Drive implementation automatically refreshes access tokens using the refresh token when needed.

### Token Expiration
- Access tokens expire after 1 hour
- Refresh tokens can last indefinitely (until revoked)
- The system will automatically refresh tokens as needed

## Development vs Production

### Development
```bash
FS_TYPE=google
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback
GOOGLE_DRIVE_BASE_PATH=/DeepRemember-Dev
```

### Production
```bash
FS_TYPE=google
GOOGLE_REDIRECT_URI=https://yourdomain.com/auth/google/callback
GOOGLE_DRIVE_BASE_PATH=/DeepRemember-Prod
```

## Troubleshooting

### Common Issues

1. **Invalid Credentials**
   - Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
   - Check Google Cloud Console configuration

2. **Redirect URI Mismatch**
   - Ensure `GOOGLE_REDIRECT_URI` matches Google Cloud Console
   - Check for trailing slashes and protocol (http vs https)

3. **Token Expired**
   - Refresh tokens are handled automatically
   - If refresh fails, re-run OAuth flow

4. **Permission Denied**
   - Check OAuth scopes in Google Cloud Console
   - Verify user has granted necessary permissions

### Debug Mode
Enable debug logging:
```bash
DEBUG=googledrive
```

## Migration from Node.js FileSystem

To switch from local file system to Google Drive:

1. **Update environment variables:**
   ```bash
   FS_TYPE=node  # Change to:
   FS_TYPE=google
   ```

2. **Add Google OAuth credentials:**
   ```bash
   GOOGLE_CLIENT_ID=...
   GOOGLE_CLIENT_SECRET=...
   GOOGLE_REDIRECT_URI=...
   ```

3. **Complete OAuth flow to get tokens**

4. **Restart application**

The application will automatically use Google Drive for all file operations.

