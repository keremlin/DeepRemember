# Supabase Setup Guide
## Choosing a database implementation

DeepRemember supports three backend database implementations behind a common `IDatabase` interface. You can switch between them without changing code by setting `DB_TYPE` in the backend `.env` file.

- `sqlite`: Local SQLite database (single file on disk)
- `supabase`: Supabase hybrid (legacy) client that used both `@supabase/supabase-js` and direct Postgres (pg) connections
- `supabase-js-client`: Modern implementation that uses only `@supabase/supabase-js` over HTTPS (recommended)

### How to switch

1) Open `backend/.env` and set one of:

```env
DB_TYPE=sqlite
```

```env
DB_TYPE=supabase
```

```env
DB_TYPE=supabase-js-client
```

2) Restart the backend server:

```bash
node server.js
```

The `DB_TYPE` is read by `backend/database/access/DatabaseFactory.js`, which instantiates the appropriate implementation and initializes tables and services accordingly.

### Recommended setting

- Use `DB_TYPE=supabase-js-client` for production and for environments where direct Postgres connectivity (IPv4/IPv6) may be restricted. This mode uses only HTTPS via the Supabase JavaScript Client and avoids direct TCP connections.

### Required environment variables (Supabase)

When using `supabase` or `supabase-js-client`, ensure the following are present in `backend/.env`:

```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

Optional (performance/network tuning):

```env
NODE_OPTIONS=--dns-result-order=ipv4first --max-old-space-size=4096
PGSSLMODE=require
```

No code changes are required when switching DB implementations; only update `DB_TYPE` and restart the server.


This guide provides complete instructions for setting up Supabase database for the DeepRemember application.

## Prerequisites

- Supabase account and project
- Node.js and npm installed
- Access to your Supabase project dashboard

## Step 1: Get Supabase Credentials

1. Go to [supabase.com](https://supabase.com) and sign in
2. Create a new project or select an existing one
3. Go to **Settings** → **API**
4. Copy the following values:
   - **Project URL** (looks like: `https://your-project-id.supabase.co`)
   - **anon public** key (starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)
   - **service_role** key (starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)

## Step 2: Get PostgreSQL Connection String

1. Go to **Settings** → **Database**
2. Scroll down to **Connection Info**
3. Copy the **Connection string** (looks like: `postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres`)
4. Replace `[PASSWORD]` with your actual database password

## Step 3: Configure Environment Variables

Create or update your `.env` file in the backend directory:

```env
# Database Configuration
DB_TYPE=supabase

# Supabase Configuration
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
SUPABASE_DB_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres

# Migration Settings
MIGRATION_AUTO_MIGRATE=true
```

## Step 4: Install Dependencies

```bash
npm install
```

## Step 5: Set Up Database Tables

### Option A: Manual Setup (If Automatic Fails)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** (in the left sidebar)
3. Click **"New query"**
4. Copy and paste the SQL script below
5. Click **"Run"** to execute the script

```sql
-- Create all required tables
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cards (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  card_id TEXT NOT NULL,
  word TEXT NOT NULL,
  translation TEXT,
  context TEXT,
  state INTEGER DEFAULT 0,
  due TIMESTAMP WITH TIME ZONE NOT NULL,
  stability REAL DEFAULT 0,
  difficulty REAL DEFAULT 0,
  elapsed_days INTEGER DEFAULT 0,
  scheduled_days INTEGER DEFAULT 0,
  reps INTEGER DEFAULT 0,
  lapses INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_reviewed TIMESTAMP WITH TIME ZONE,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  UNIQUE(user_id, card_id)
);

CREATE TABLE IF NOT EXISTS sentence_analysis_cache (
  id SERIAL PRIMARY KEY,
  hash TEXT UNIQUE NOT NULL,
  analysis_data TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS labels (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('system', 'user')),
  user_id TEXT,
  color TEXT DEFAULT '#3B82F6',
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(name, user_id, type),
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS card_labels (
  id SERIAL PRIMARY KEY,
  card_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  label_id INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (card_id, user_id) REFERENCES cards(card_id, user_id) ON DELETE CASCADE,
  FOREIGN KEY (label_id) REFERENCES labels(id) ON DELETE CASCADE,
  UNIQUE(card_id, user_id, label_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_cards_user_id ON cards(user_id);
CREATE INDEX IF NOT EXISTS idx_cards_due ON cards(due);
CREATE INDEX IF NOT EXISTS idx_cards_state ON cards(state);
CREATE INDEX IF NOT EXISTS idx_sentence_analysis_hash ON sentence_analysis_cache(hash);
CREATE INDEX IF NOT EXISTS idx_labels_user_id ON labels(user_id);
CREATE INDEX IF NOT EXISTS idx_labels_type ON labels(type);
CREATE INDEX IF NOT EXISTS idx_card_labels_card_id ON card_labels(card_id, user_id);
CREATE INDEX IF NOT EXISTS idx_card_labels_label_id ON card_labels(label_id);

-- Create admin user
INSERT INTO users (user_id) VALUES ('user123') ON CONFLICT (user_id) DO NOTHING;
```

### Option B: Automatic Setup (If Manual Fails)

If you encounter issues with manual setup, you can try automatic setup:

1. Ensure `SUPABASE_DB_URL` is set in your `.env` file
2. Run the application: `npm start`
3. The application will automatically create tables and admin user

## Step 6: Verify Setup

1. Go to **Table Editor** in your Supabase dashboard
2. Verify these tables exist:
   - `users`
   - `cards`
   - `labels`
   - `card_labels`
   - `sentence_analysis_cache`
3. Check that the `users` table contains an admin user with `user_id = 'user123'`

## Step 7: Start the Application

```bash
npm start
```

The application should start successfully and connect to your Supabase database.

## Troubleshooting

### Common Issues

1. **"Database not initialized" error**
   - Check that all environment variables are set correctly
   - Verify your Supabase credentials are valid

2. **"Tables not found" error**
   - Run the manual setup SQL script
   - Check that tables were created in Table Editor

3. **"Admin user not found" error**
   - Verify the admin user exists in the `users` table
   - Check that `user_id = 'user123'` exists

4. **Connection timeout errors**
   - Verify your PostgreSQL connection string is correct
   - Check that your Supabase project is not paused

### Environment Variable Checklist

- [ ] `DB_TYPE=supabase`
- [ ] `SUPABASE_URL` is set and correct
- [ ] `SUPABASE_ANON_KEY` is set and correct
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is set and correct
- [ ] `SUPABASE_DB_URL` is set and correct (with actual password)

## Migration from SQLite

If you're migrating from SQLite to Supabase:

1. Follow the setup steps above
2. The application will automatically migrate sample data when it starts
3. Your existing data will be transferred to Supabase automatically

## Production Deployment

For production deployment:

1. Use environment variables instead of `.env` file
2. Ensure your Supabase project is not paused
3. Consider setting up database backups
4. Monitor your Supabase usage and limits

## Support

If you encounter issues:

1. Check the Supabase dashboard for any service issues
2. Verify your project is not paused or over limits
3. Check the application logs for specific error messages
4. Ensure all environment variables are correctly set

## File Structure

After setup, you should have these key files:
- `SUPABASE_SETUP.md` - Complete setup guide with SQL script included
- `.env` - Environment variables (keep secure)
- `backend/database/access/SupabaseDatabase.js` - Database implementation

---

# Authentication Setup Summary

## Environment Configuration

The authentication system requires additional environment variables in your `.env` file:

```env
# Client URL (for password reset redirects)
CLIENT_URL=http://localhost:3000

# Server Configuration
PORT=4004
NODE_ENV=development
```

## Authentication Features

The system includes comprehensive authentication capabilities:

### Core Features
- **User Registration** with email/password validation
- **User Login/Logout** with JWT token management
- **Email Confirmation** flow for new registrations
- **Password Reset** functionality (email-based)
- **Account Deletion** with data cleanup
- **Token Verification** and refresh mechanisms

### Security Features
- **Password Validation** (minimum 6 characters)
- **Email Format Validation**
- **JWT Token Verification** middleware
- **Resource Ownership Verification** (users can only access their own data)
- **CORS Configuration** for secure cross-origin requests
- **Input Sanitization** and error handling
- **Method Binding** to prevent context loss in middleware

### Database Integration
- **Supabase Auth** for user management
- **Email-based User IDs** (user_id = email address)
- **User-specific Card Storage** with automatic isolation
- **Automatic User Record Creation** on email confirmation
- **Session Management** with secure token handling
- **Data Isolation** between users (foreign key constraints)

## Setup Instructions

1. **Configure Environment Variables**: Add the authentication-specific variables to your `.env` file
2. **Start Backend Server**: `npm start` (authentication routes will be available)
3. **Start Client**: `npm run dev` (authentication UI will be accessible)
4. **Test Registration**: Create a new user account
5. **Verify Email**: Check email for confirmation link
6. **Test Login**: Login with confirmed credentials

## API Endpoints

The authentication system provides these endpoints:

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/confirm-email` - Email confirmation
- `POST /api/auth/resend-confirmation` - Resend confirmation email
- `GET /api/auth/me` - Get current user info
- `PUT /api/auth/change-password` - Change password
- `DELETE /api/auth/account` - Delete account

## User Flow

1. **Registration**: User registers → receives confirmation email
2. **Email Confirmation**: User clicks link → user record created in database
3. **Login**: User logs in → JWT token issued → user record ensured
4. **Data Access**: All user data (cards, labels) associated with email address
5. **Logout**: Token invalidated → session ended

The authentication system is fully integrated with the Supabase database and provides secure, user-specific data management for the DeepRemember application.