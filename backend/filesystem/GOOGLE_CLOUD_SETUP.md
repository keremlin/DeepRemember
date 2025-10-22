# Google Cloud Console Setup Guide for Google Drive Integration

## Overview

This guide walks you through setting up Google Cloud Console to enable Google Drive integration with the DeepRemember application using OAuth 2.0 authentication.

## Prerequisites

- Google account
- Access to Google Cloud Console
- Basic understanding of OAuth 2.0 flow

## Step 1: Create a Google Cloud Project

1. **Go to Google Cloud Console**
   - Visit [https://console.cloud.google.com/](https://console.cloud.google.com/)
   - Sign in with your Google account

2. **Create a New Project**
   - Click on the project dropdown at the top
   - Click "New Project"
   - Enter project name: `DeepRemember` (or your preferred name)
   - Click "Create"

3. **Select the Project**
   - Make sure your new project is selected in the project dropdown

## Step 2: Enable Google Drive API

1. **Navigate to APIs & Services**
   - In the left sidebar, go to "APIs & Services" > "Library"

2. **Search for Google Drive API**
   - Search for "Google Drive API"
   - Click on "Google Drive API" from the results

3. **Enable the API**
   - Click the "Enable" button
   - Wait for the API to be enabled

## Step 3: Configure OAuth Consent Screen

1. **Go to OAuth Consent Screen**
   - In the left sidebar, go to "APIs & Services" > "OAuth consent screen"

2. **Choose User Type**
   - Select "External" (unless you have a Google Workspace account)
   - Click "Create"

3. **Fill in App Information**
   ```
   App name: DeepRemember
   User support email: your-email@example.com
   App logo: (optional)
   App domain: (optional)
   Developer contact information: your-email@example.com
   ```

4. **Add Scopes**
   - Click "Add or Remove Scopes"
   - Add the following scopes:
     ```
     https://www.googleapis.com/auth/drive.file
     https://www.googleapis.com/auth/drive.metadata.readonly
     ```
   - Click "Update"

5. **Add Test Users** (for development)
   - Add your email address as a test user
   - This allows you to test the OAuth flow during development

6. **Save and Continue**
   - Review the summary
   - Click "Back to Dashboard"

## Step 4: Create OAuth 2.0 Credentials

1. **Go to Credentials**
   - In the left sidebar, go to "APIs & Services" > "Credentials"

2. **Create OAuth 2.0 Client ID**
   - Click "+ Create Credentials"
   - Select "OAuth client ID"

3. **Configure Application Type**
   - Application type: "Web application"
   - Name: "DeepRemember Web Client"

4. **Add Authorized Redirect URIs**
   - For development:
     ```
     http://localhost:3000/auth/google/callback
     http://localhost:5000/auth/google/callback
     ```
   - For production:
     ```
     https://yourdomain.com/auth/google/callback
     ```

5. **Create Credentials**
   - Click "Create"
   - **Important**: Copy the Client ID and Client Secret immediately
   - These will be used in your environment variables

## Step 5: Configure Environment Variables

1. **Create/Update .env file**
   ```bash
   # File System Configuration
   FS_TYPE=google
   
   # Google OAuth 2.0 Credentials
   GOOGLE_CLIENT_ID=your_client_id_here.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your_client_secret_here
   GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback
   
   # Google Drive Configuration
   GOOGLE_DRIVE_ROOT_FOLDER_ID=root
   GOOGLE_DRIVE_BASE_PATH=/DeepRemember
   ```

2. **Replace placeholder values**
   - Use the actual Client ID and Client Secret from Step 4
   - Adjust redirect URI to match your application setup

## Step 6: OAuth Flow Implementation

### Option A: Manual Token Generation (Development)

1. **Create a simple OAuth flow script**
   ```javascript
   const { google } = require('googleapis');
   
   const oauth2Client = new google.auth.OAuth2(
     process.env.GOOGLE_CLIENT_ID,
     process.env.GOOGLE_CLIENT_SECRET,
     process.env.GOOGLE_REDIRECT_URI
   );
   
   // Generate auth URL
   const authUrl = oauth2Client.generateAuthUrl({
     access_type: 'offline',
     scope: [
       'https://www.googleapis.com/auth/drive.file',
       'https://www.googleapis.com/auth/drive.metadata.readonly'
     ],
     prompt: 'consent'
   });
   
   console.log('Authorize this app by visiting this url:', authUrl);
   ```

2. **Run the script and follow the OAuth flow**
   - Visit the generated URL
   - Sign in with your Google account
   - Grant permissions
   - Copy the authorization code from the callback URL

3. **Exchange code for tokens**
   ```javascript
   // Use the authorization code to get tokens
   const { tokens } = await oauth2Client.getToken(authorizationCode);
   console.log('Access Token:', tokens.access_token);
   console.log('Refresh Token:', tokens.refresh_token);
   ```

4. **Add tokens to .env**
   ```bash
   GOOGLE_ACCESS_TOKEN=ya29.a0AfH6SMC...
   GOOGLE_REFRESH_TOKEN=1//04...
   ```

### Option B: Express Route Implementation (Production)

1. **Add OAuth routes to your Express app**
   ```javascript
   const express = require('express');
   const { google } = require('googleapis');
   
   const router = express.Router();
   
   // OAuth2 client setup
   const oauth2Client = new google.auth.OAuth2(
     process.env.GOOGLE_CLIENT_ID,
     process.env.GOOGLE_CLIENT_SECRET,
     process.env.GOOGLE_REDIRECT_URI
   );
   
   // Initiate OAuth flow
   router.get('/auth/google', (req, res) => {
     const authUrl = oauth2Client.generateAuthUrl({
       access_type: 'offline',
       scope: [
         'https://www.googleapis.com/auth/drive.file',
         'https://www.googleapis.com/auth/drive.metadata.readonly'
       ],
       prompt: 'consent'
     });
     
     res.redirect(authUrl);
   });
   
   // Handle OAuth callback
   router.get('/auth/google/callback', async (req, res) => {
     try {
       const { tokens } = await oauth2Client.getToken(req.query.code);
       oauth2Client.setCredentials(tokens);
       
       // Store tokens securely (database, session, etc.)
       // For now, we'll just display them
       res.json({
         success: true,
         accessToken: tokens.access_token,
         refreshToken: tokens.refresh_token
       });
     } catch (error) {
       res.status(500).json({ error: error.message });
     }
   });
   
   module.exports = router;
   ```

## Step 7: Test the Integration

1. **Start your application**
   ```bash
   npm start
   ```

2. **Test file operations**
   ```javascript
   const FileSystemFactory = require('./filesystem/FileSystemFactory');
   const fileSystem = FileSystemFactory.createDefault();
   
   // Test writing a file
   await fileSystem.writeFile('/test.txt', 'Hello Google Drive!');
   
   // Test reading directory
   const files = await fileSystem.readdirAsync('/');
   console.log('Files:', files);
   ```

## Step 8: Production Considerations

### Security
1. **Use HTTPS in production**
   - Update redirect URI to use HTTPS
   - Ensure all OAuth flows use secure connections

2. **Secure token storage**
   - Store tokens in encrypted database
   - Implement token refresh logic
   - Use environment variables for sensitive data

3. **Scope limitations**
   - Use minimal required scopes
   - Regularly review and audit permissions

### Monitoring
1. **Enable API monitoring**
   - Go to "APIs & Services" > "Dashboard"
   - Monitor API usage and errors

2. **Set up alerts**
   - Configure quota alerts
   - Monitor authentication failures

### Backup Strategy
1. **Multiple authentication methods**
   - Consider service account authentication for server-to-server
   - Implement fallback to local file system

## Troubleshooting

### Common Issues

1. **"Invalid client" error**
   - Verify Client ID and Secret
   - Check project configuration

2. **"Redirect URI mismatch" error**
   - Ensure redirect URI matches exactly
   - Check for trailing slashes
   - Verify protocol (http vs https)

3. **"Access blocked" error**
   - Add your email as test user
   - Check OAuth consent screen configuration
   - Verify app verification status

4. **"Token expired" error**
   - Implement token refresh logic
   - Check refresh token validity

### Debug Steps

1. **Check Google Cloud Console**
   - Verify API is enabled
   - Check OAuth consent screen
   - Review credentials configuration

2. **Test OAuth flow manually**
   - Use Google OAuth 2.0 Playground
   - Verify scopes and permissions

3. **Check application logs**
   - Enable debug logging
   - Review error messages

## API Quotas and Limits

### Google Drive API Limits
- **Requests per day**: 1,000,000,000
- **Requests per 100 seconds per user**: 1,000
- **Requests per 100 seconds**: 10,000

### Best Practices
1. **Implement rate limiting**
2. **Cache frequently accessed data**
3. **Use batch requests when possible**
4. **Monitor quota usage**

## Support and Resources

- [Google Drive API Documentation](https://developers.google.com/drive/api)
- [OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Google Cloud Console](https://console.cloud.google.com/)
- [Google APIs Explorer](https://developers.google.com/apis-explorer)

## Next Steps

After completing this setup:

1. **Test all file operations**
2. **Implement error handling**
3. **Add monitoring and logging**
4. **Set up production environment**
5. **Create backup strategies**
6. **Document your specific configuration**

Your Google Drive integration is now ready to use!

