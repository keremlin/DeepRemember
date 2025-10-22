# Fix Google OAuth Error 403: access_denied

## Problem
You're getting Error 403: access_denied when trying to authorize the Google Drive application.

## Solution Steps

### Step 1: Configure OAuth Consent Screen

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/
   - Select project: `tts-project-475809`

2. **Navigate to OAuth Consent Screen**
   - Go to: APIs & Services → OAuth consent screen
   - Click "Edit App" if already created, or "Create" if new

3. **Configure App Information**
   ```
   App name: DeepRemember
   User support email: your-email@example.com
   App logo: (optional)
   App domain: (leave empty for now)
   Developer contact information: your-email@example.com
   ```

4. **Add Scopes**
   - Click "Add or Remove Scopes"
   - Add these scopes:
     ```
     https://www.googleapis.com/auth/drive.file
     https://www.googleapis.com/auth/drive.metadata.readonly
     ```
   - Click "Update"

5. **Add Test Users**
   - Scroll down to "Test users"
   - Click "Add Users"
   - Add your email address: `your-email@example.com`
   - Click "Save"

6. **Save and Continue**
   - Click "Save and Continue"
   - Review the summary
   - Click "Back to Dashboard"

### Step 2: Verify Credentials

1. **Go to Credentials**
   - Navigate to: APIs & Services → Credentials

2. **Check OAuth 2.0 Client ID**
   - Click on your OAuth 2.0 Client ID
   - Verify these settings:
     ```
     Application type: Web application
     Name: DeepRemember Web Client
     ```

3. **Check Authorized Redirect URIs**
   - Make sure you have exactly:
     ```
     http://localhost:3000/auth/google/callback
     ```
   - No trailing slash, exact match required

### Step 3: Enable Required APIs

1. **Go to APIs & Services → Library**
2. **Search for and enable:**
   - Google Drive API
   - Google Sheets API (if needed)

### Step 4: Test the OAuth Flow

1. **Use the corrected authorization URL**
2. **Make sure you're signed in with the same Google account** that you added as a test user
3. **Complete the authorization process**

## Common Issues and Solutions

### Issue 1: "This app isn't verified"
**Solution:** This is normal for development. Click "Advanced" → "Go to DeepRemember (unsafe)"

### Issue 2: "Error 403: access_denied"
**Solutions:**
- Make sure your email is added as a test user
- Check that redirect URI matches exactly
- Verify OAuth consent screen is configured
- Make sure you're using the correct Google account

### Issue 3: "Invalid redirect URI"
**Solution:** Check that the redirect URI in Google Cloud Console matches exactly:
```
http://localhost:3000/auth/google/callback
```

### Issue 4: "Scope not found"
**Solution:** Make sure the scopes are added in OAuth consent screen:
```
https://www.googleapis.com/auth/drive.file
https://www.googleapis.com/auth/drive.metadata.readonly
```

## Verification Checklist

- [ ] OAuth consent screen configured as External
- [ ] App name set to "DeepRemember"
- [ ] Required scopes added
- [ ] Your email added as test user
- [ ] Redirect URI matches exactly
- [ ] Google Drive API enabled
- [ ] Using the same Google account as test user

## Alternative: Use Service Account (Advanced)

If OAuth continues to fail, you can use a Service Account instead:

1. **Create Service Account**
   - Go to: APIs & Services → Credentials
   - Click "Create Credentials" → "Service Account"
   - Name: "DeepRemember Service Account"
   - Click "Create and Continue"

2. **Download Service Account Key**
   - Click on the created service account
   - Go to "Keys" tab
   - Click "Add Key" → "Create new key" → "JSON"
   - Download the JSON file

3. **Update Environment Variables**
   ```bash
   GOOGLE_SERVICE_ACCOUNT_KEY_PATH=path/to/service-account-key.json
   ```

## Next Steps

After fixing the OAuth consent screen:

1. **Run the OAuth setup again**
2. **Complete the authorization flow**
3. **Get your access and refresh tokens**
4. **Update your .env file**
5. **Test the Google Drive integration**

## Support

If you continue to have issues:
1. Check Google Cloud Console error logs
2. Verify all settings match exactly
3. Try with a different Google account
4. Consider using Service Account authentication

