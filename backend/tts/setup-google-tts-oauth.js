/**
 * Setup script for Google Cloud TTS OAuth authentication
 * This script helps you get OAuth tokens with both Drive and TTS scopes
 */

const { google } = require('googleapis');
const readline = require('readline');

// Load environment variables
require('dotenv').config();

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/auth/google/callback';

if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error('❌ Missing required environment variables:');
    console.error('   GOOGLE_CLIENT_ID');
    console.error('   GOOGLE_CLIENT_SECRET');
    console.error('');
    console.error('Please set these in your .env file first.');
    console.error('Make sure you run this script from the backend directory.');
    process.exit(1);
}

// Combined scopes for both Drive and TTS
const SCOPES = [
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/drive.metadata.readonly',
    'https://www.googleapis.com/auth/drive.readonly',
    'https://www.googleapis.com/auth/cloud-platform' // Required for TTS
];

const oauth2Client = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    REDIRECT_URI
);

console.log('🚀 Google Cloud TTS OAuth Setup');
console.log('=============================\n');
console.log('This will generate new OAuth tokens with both Drive and TTS scopes.');
console.log('');
console.log('⚠️  IMPORTANT: This setup uses access_type=offline and prompt=consent');
console.log('   to ensure you receive a refresh token for automatic token renewal.');
console.log('   Without a refresh token, you\'ll need to re-authenticate every hour.\n');

const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent'
});

console.log('🔗 Step 1: Authorize the application');
console.log('   Visit this URL in your browser:');
console.log('');
console.log(`   ${authUrl}`);
console.log('');
console.log('📝 Step 2: After authorization, you will be redirected to your redirect URI.');
console.log('   Copy the authorization code from the URL and paste it below.\n');

rl.question('Enter the authorization code: ', async (code) => {
    try {
        console.log('');
        console.log('🔄 Step 3: Exchanging code for tokens...');
        
        const { tokens } = await oauth2Client.getToken(code);
        
        console.log('✅ Success! Here are your tokens:');
        console.log('\n📄 Add these to your .env file:');
        console.log('================================');
        console.log(`GOOGLE_ACCESS_TOKEN=${tokens.access_token}`);
        
        if (tokens.refresh_token) {
            console.log(`GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}`);
            console.log('================================\n');
            console.log('✅ Refresh token received! Your access token will be automatically');
            console.log('   refreshed when it expires (every ~1 hour).');
        } else {
            console.log('GOOGLE_REFRESH_TOKEN=<NOT_PROVIDED>');
            console.log('================================\n');
            console.log('⚠️  WARNING: No refresh token was provided!');
            console.log('   This usually happens if you\'ve already authorized this app before.');
            console.log('   You may need to revoke access and re-run this setup, or the');
            console.log('   access token will expire after ~1 hour and require re-authentication.\n');
        }
        
        console.log('These tokens now have permissions for both:');
        console.log('- Google Drive API');
        console.log('- Google Cloud Text-to-Speech API\n');
        
        console.log('🎉 Setup complete! Restart your application to apply the new configuration.');
        
        rl.close();
    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error('');
        console.error('🔍 Troubleshooting:');
        console.error('   1. Verify your Client ID and Client Secret');
        console.error('   2. Check that the redirect URI matches Google Cloud Console');
        console.error('   3. Ensure you have the correct scopes enabled');
        console.error('   4. Make sure you\'re using the correct authorization code');
        rl.close();
        process.exit(1);
    }
});

rl.on('close', () => {
    process.exit(0);
});

