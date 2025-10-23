const { google } = require('googleapis');
require('dotenv').config();

/**
 * Re-authenticate with Google Drive to get updated permissions
 * This is needed when new scopes are added to the application
 */

async function reAuthenticate() {
  console.log('🔄 Re-authenticating with Google Drive...');
  console.log('📋 New scopes include:');
  console.log('  - https://www.googleapis.com/auth/drive.file');
  console.log('  - https://www.googleapis.com/auth/drive.metadata.readonly');
  console.log('  - https://www.googleapis.com/auth/drive.readonly');
  console.log('');

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  const scopes = [
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/drive.metadata.readonly',
    'https://www.googleapis.com/auth/drive.readonly'
  ];

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent' // Force consent screen to get new permissions
  });

  console.log('🔗 Please visit this URL to re-authorize the application:');
  console.log('');
  console.log(authUrl);
  console.log('');
  console.log('📝 After authorization, you will be redirected to:');
  console.log(`   ${process.env.GOOGLE_REDIRECT_URI}`);
  console.log('');
  console.log('📋 Copy the authorization code from the URL and paste it below.');
  console.log('');

  // For development, we'll use the out-of-band flow
  console.log('🔄 Using out-of-band flow for easier development...');
  
  const outOfBandUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    prompt: 'consent'
  });

  console.log('🔗 Alternative URL (out-of-band):');
  console.log('');
  console.log(outOfBandUrl);
  console.log('');
  console.log('📋 Copy the authorization code from the page and run:');
  console.log('   node re-auth.js <authorization_code>');
}

// If authorization code is provided as argument
if (process.argv[2]) {
  const authCode = process.argv[2];
  
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  (async () => {
    try {
      const { tokens } = await oauth2Client.getToken(authCode);
      oauth2Client.setCredentials(tokens);

      console.log('✅ Successfully authenticated!');
      console.log('');
      console.log('📋 Add these tokens to your .env file:');
      console.log('');
      console.log(`GOOGLE_ACCESS_TOKEN=${tokens.access_token}`);
      console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
      console.log('');
      console.log('🔄 Restart your server after updating the .env file.');
    } catch (error) {
      console.error('❌ Authentication failed:', error.message);
    }
  })();
} else {
  reAuthenticate();
}

module.exports = { reAuthenticate };
