const { google } = require('googleapis');
const readline = require('readline');

// Load environment variables
require('dotenv').config();

/**
 * Simple OAuth setup script for Google Drive integration
 * Run this script to get your access and refresh tokens
 */

// Configuration from environment variables
const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/auth/google/callback';

if (!clientId || !clientSecret) {
  console.error('❌ Missing required environment variables:');
  console.error('   GOOGLE_CLIENT_ID');
  console.error('   GOOGLE_CLIENT_SECRET');
  console.error('');
  console.error('Please set these in your .env file first.');
  process.exit(1);
}

// Create OAuth2 client
const oauth2Client = new google.auth.OAuth2(
  clientId,
  clientSecret,
  redirectUri
);

// Scopes required for DeepRemember
const scopes = [
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.metadata.readonly'
];

async function setupOAuth() {
  try {
    console.log('🚀 Google Drive OAuth Setup for DeepRemember');
    console.log('');
    console.log('📋 Configuration:');
    console.log(`   Client ID: ${clientId}`);
    console.log(`   Redirect URI: ${redirectUri}`);
    console.log(`   Scopes: ${scopes.join(', ')}`);
    console.log('');

    // Generate authorization URL
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent'
    });

    console.log('🔗 Step 1: Authorize the application');
    console.log('   Visit this URL in your browser:');
    console.log('');
    console.log(`   ${authUrl}`);
    console.log('');

    // Create readline interface
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    // Wait for authorization code
    const authCode = await new Promise((resolve) => {
      rl.question('📝 Step 2: Enter the authorization code from the callback URL: ', (code) => {
        rl.close();
        resolve(code.trim());
      });
    });

    if (!authCode) {
      console.error('❌ No authorization code provided');
      process.exit(1);
    }

    console.log('');
    console.log('🔄 Step 3: Exchanging code for tokens...');

    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(authCode);
    oauth2Client.setCredentials(tokens);

    console.log('✅ Success! Here are your tokens:');
    console.log('');
    console.log('📄 Add these to your .env file:');
    console.log('');
    console.log(`GOOGLE_ACCESS_TOKEN=${tokens.access_token}`);
    console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
    console.log('');
    console.log('🔧 Complete .env configuration:');
    console.log('');
    console.log('# File System Configuration');
    console.log('FS_TYPE=google');
    console.log('');
    console.log('# Google OAuth 2.0 Credentials');
    console.log(`GOOGLE_CLIENT_ID=${clientId}`);
    console.log(`GOOGLE_CLIENT_SECRET=${clientSecret}`);
    console.log(`GOOGLE_REDIRECT_URI=${redirectUri}`);
    console.log('');
    console.log('# Google Drive Authentication Tokens');
    console.log(`GOOGLE_ACCESS_TOKEN=${tokens.access_token}`);
    console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
    console.log('');
    console.log('# Google Drive Configuration');
    console.log('GOOGLE_DRIVE_ROOT_FOLDER_ID=root');
    console.log('GOOGLE_DRIVE_BASE_PATH=/DeepRemember');
    console.log('');
    console.log('🎉 Setup complete! You can now use Google Drive as your file system.');
    console.log('   Restart your application to apply the new configuration.');

  } catch (error) {
    console.error('❌ OAuth setup failed:', error.message);
    console.error('');
    console.error('🔍 Troubleshooting:');
    console.error('   1. Verify your Client ID and Client Secret');
    console.error('   2. Check that the redirect URI matches Google Cloud Console');
    console.error('   3. Ensure you have the correct scopes enabled');
    console.error('   4. Make sure you\'re using the correct authorization code');
    process.exit(1);
  }
}

// Run the setup
setupOAuth();
