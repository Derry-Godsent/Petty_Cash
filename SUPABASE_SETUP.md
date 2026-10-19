# Complete Supabase Setup Guide

This guide will walk you through setting up Supabase for your Petty Cash Tracker app from start to finish.

## Step 1: Create Supabase Account & Project

### 1.1 Sign Up
1. Go to https://supabase.com
2. Click "Start your project"
3. Sign up with GitHub (recommended) or email
4. Verify your email if needed

### 1.2 Create New Project
1. Click "New Project" button
2. Fill in the details:
   - **Organization**: Select your organization (or create one)
   - **Project name**: `petty-cash-tracker` (or any name you prefer)
   - **Database Password**: Create a strong password (save it somewhere safe!)
   - **Region**: Choose closest to your location (e.g., West EU for Ghana)
   - **Pricing Plan**: Free tier is sufficient
3. Click "Create new project"
4. Wait 2-3 minutes for the project to be provisioned

## Step 2: Create Database Tables

### 2.1 Open SQL Editor
1. In your Supabase dashboard, click "SQL Editor" in the left sidebar
2. Click "New query"

### 2.2 Run the Setup SQL
Copy and paste this entire SQL script, then click "Run":

```sql
-- ============================================
-- PETTY CASH TRACKER - DATABASE SETUP
-- ============================================

-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS settings CASCADE;

-- ============================================
-- TRANSACTIONS TABLE
-- ============================================
CREATE TABLE transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  date DATE NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  
  -- Constraints
  CONSTRAINT amount_positive CHECK (amount >= 0)
);

-- Add indexes for better performance
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_date ON transactions(date DESC);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_user_date ON transactions(user_id, date DESC);

-- Add helpful comments
COMMENT ON TABLE transactions IS 'Stores all petty cash transactions';
COMMENT ON COLUMN transactions.id IS 'Unique transaction ID (UUID)';
COMMENT ON COLUMN transactions.user_id IS 'User identifier for data isolation';
COMMENT ON COLUMN transactions.type IS 'Either income or expense';

-- ============================================
-- SETTINGS TABLE
-- ============================================
CREATE TABLE settings (
  user_id TEXT PRIMARY KEY,
  recipient_name TEXT DEFAULT '',
  recipient_phone TEXT DEFAULT '',
  sender_name TEXT DEFAULT '',
  company_name TEXT DEFAULT '',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

COMMENT ON TABLE settings IS 'User-specific application settings';
COMMENT ON COLUMN settings.user_id IS 'Unique user identifier';

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on both tables
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- ============================================
-- SECURITY POLICIES
-- ============================================

-- For transactions: Allow all operations (since we use anonymous user IDs)
CREATE POLICY "Enable insert for all users" ON transactions
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Enable select for all users" ON transactions
  FOR SELECT
  USING (true);

CREATE POLICY "Enable update for all users" ON transactions
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable delete for all users" ON transactions
  FOR DELETE
  USING (true);

-- For settings: Allow all operations
CREATE POLICY "Enable insert for all users" ON settings
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Enable select for all users" ON settings
  FOR SELECT
  USING (true);

CREATE POLICY "Enable update for all users" ON settings
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable delete for all users" ON settings
  FOR DELETE
  USING (true);

-- ============================================
-- HELPFUL FUNCTIONS
-- ============================================

-- Function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for settings table
CREATE TRIGGER update_settings_updated_at
  BEFORE UPDATE ON settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check if tables were created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('transactions', 'settings');

-- Check if indexes were created
SELECT indexname, tablename 
FROM pg_indexes 
WHERE tablename IN ('transactions', 'settings');

-- Check if RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('transactions', 'settings');
```

### 2.3 Verify Setup
After running the SQL, you should see:
- ✅ Two tables created: `transactions` and `settings`
- ✅ Multiple indexes created for performance
- ✅ RLS enabled on both tables
- ✅ Security policies created

You can verify by:
1. Click "Table Editor" in left sidebar
2. You should see `transactions` and `settings` tables

## Step 3: Get Your API Credentials

### 3.1 Navigate to API Settings
1. In Supabase dashboard, click "Settings" (gear icon) in left sidebar
2. Click "API" in the settings menu

### 3.2 Copy Your Credentials
You'll see two important values:

**Project URL:**
- Looks like: `https://abcdefg.supabase.co`
- Copy the entire URL

**anon public key:**
- A long string starting with `eyJ...`
- Click the "copy" button next to it
- This is safe to expose in client-side code

### 3.3 Create Environment File
In your project root directory, create a file named `.env`:

```env
# Supabase Configuration
# Get these from: https://app.supabase.com -> Your Project -> Settings -> API

VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...your-actual-key-here
```

**Important:**
- Replace `your-project-id.supabase.co` with your actual Project URL
- Replace the anon key with your actual anon public key
- Keep the `VITE_` prefix - this is required for Vite to expose them to the frontend
- Never commit `.env` to Git (it's already in `.gitignore`)

## Step 4: Test the Connection

### 4.1 Install Dependencies
```bash
npm install
```

### 4.2 Start Development Server
```bash
npm run dev
```

### 4.3 Test in Browser
1. Open http://localhost:5173
2. Open browser console (F12)
3. You should see no errors
4. Try adding a transaction
5. Check Supabase Table Editor - you should see the transaction there

### 4.4 Verify Data is Stored
1. Go back to Supabase dashboard
2. Click "Table Editor"
3. Click "transactions" table
4. You should see your test transaction

## Step 5: Deploy to Vercel

### 5.1 Push to GitHub
```bash
# Initialize git if not already done
git init
git add .
git commit -m "Petty Cash Tracker with Supabase integration"

# Add your GitHub remote
git remote add origin https://github.com/YOUR_USERNAME/petty-cash-tracker.git
git branch -M main
git push -u origin main
```

### 5.2 Deploy on Vercel
1. Go to https://vercel.com
2. Sign in with GitHub
3. Click "Add New Project"
4. Import your GitHub repository
5. Vercel will auto-detect Vite configuration
6. **Add Environment Variables:**
   - Click "Environment Variables" section
   - Add `VITE_SUPABASE_URL` with your Supabase URL
   - Add `VITE_SUPABASE_ANON_KEY` with your anon key
7. Click "Deploy"

### 5.3 Verify Deployment
1. Open your Vercel URL (e.g., https://petty-cash.vercel.app)
2. Test adding a transaction
3. Check Supabase - data should be there
4. Test on mobile - install as PWA

## Step 6: Configure Supabase for Production

### 6.1 Enable Email Auth (Optional but Recommended)
If you want to add user authentication later:
1. Go to Authentication > Providers
2. Enable Email provider
3. Configure email templates

### 6.2 Set Up Backups
Supabase free tier includes:
- Daily backups for 7 days
- Point-in-time recovery

For production, consider:
1. Upgrade to Pro tier ($25/month) for:
   - Daily backups for 7 days
   - Weekly backups for 4 weeks
   - Manual backup snapshots
2. Or use the export feature in the app regularly

### 6.3 Monitor Usage
1. Go to Supabase Dashboard > Reports
2. Monitor:
   - API requests
   - Database size
   - Bandwidth usage

Free tier limits:
- 500 MB database
- 2 GB bandwidth/month
- Unlimited API requests

## Troubleshooting

### Issue: "Missing Supabase environment variables"
**Solution:**
- Check that `.env` file exists in project root
- Verify variable names start with `VITE_`
- Restart dev server after creating `.env`

### Issue: "Failed to load data"
**Solution:**
- Check browser console for errors
- Verify Supabase URL and key are correct
- Check that SQL was run successfully
- Verify RLS policies are enabled

### Issue: "Data not showing in Supabase"
**Solution:**
- Check browser console for API errors
- Verify network tab shows successful requests
- Check that user_id is being generated
- Verify RLS policies allow operations

### Issue: "Permission denied" errors
**Solution:**
- Re-run the SQL script to ensure policies are created
- Check that RLS is enabled on both tables
- Verify policies use `USING (true)` and `WITH CHECK (true)`

### Issue: "Table not found" errors
**Solution:**
- Verify tables exist in Table Editor
- Re-run the SQL setup script
- Check table names match exactly (case-sensitive)

## Database Schema Reference

### transactions table
```sql
id              TEXT PRIMARY KEY      -- Unique transaction ID
user_id         TEXT NOT NULL         -- User identifier
date            DATE NOT NULL         -- Transaction date
description     TEXT NOT NULL         -- What was it for?
category        TEXT NOT NULL         -- Category (Office Supplies, Transport, etc.)
amount          DECIMAL(10,2)         -- Amount in GH₵
type            TEXT NOT NULL         -- 'income' or 'expense'
notes           TEXT                  -- Optional notes
created_at      TIMESTAMP             -- When it was created
```

### settings table
```sql
user_id           TEXT PRIMARY KEY    -- User identifier
recipient_name    TEXT                -- Report recipient name
recipient_phone   TEXT                -- WhatsApp number
sender_name       TEXT                -- Your name
company_name      TEXT                -- Company/department name
updated_at        TIMESTAMP           -- Last update time
```

## Security Notes

### Current Setup (Personal Use)
- RLS policies allow all operations
- User isolation via user_id in localStorage
- Suitable for single-user or small team use

### For Multi-User Production
If you need proper authentication:
1. Enable Supabase Auth
2. Update RLS policies to check `auth.uid()`
3. Update app to use Supabase Auth instead of localStorage user IDs

Example policy for authenticated users:
```sql
CREATE POLICY "Users can only see their own data" ON transactions
  FOR SELECT
  USING (auth.uid()::text = user_id);
```

## Backup Strategy

### Automatic (Supabase)
- Daily backups included in free tier
- Retained for 7 days

### Manual (Recommended)
1. Use the "Export Backup" feature in the app weekly
2. Store JSON files in cloud storage (Google Drive, Dropbox)
3. Keep at least 4 weeks of backups

### Emergency Recovery
If you need to restore:
1. Use the "Import Backup" feature in the app
2. Select your JSON backup file
3. All data will be restored

## Performance Tips

### Database
- Indexes are already created for common queries
- Transactions are ordered by date for fast retrieval
- User isolation ensures queries are scoped

### App
- Data is cached in browser for instant access
- Supabase calls are async and non-blocking
- Service worker provides offline support

## Cost Estimation

### Free Tier (Sufficient for Personal Use)
- 500 MB database (~50,000 transactions)
- 2 GB bandwidth/month
- Unlimited API requests
- Daily backups for 7 days

### When to Upgrade
Consider Pro tier ($25/month) if:
- Database exceeds 500 MB
- Bandwidth exceeds 2 GB/month
- Need longer backup retention
- Need priority support

## Support Resources

- **Supabase Docs**: https://supabase.com/docs
- **Discord Community**: https://discord.supabase.com
- **GitHub Issues**: Report bugs in your repo
- **Stack Overflow**: Tag questions with `supabase`

## Next Steps

After completing this setup:
1. ✅ Test the app thoroughly
2. ✅ Deploy to Vercel
3. ✅ Install on mobile as PWA
4. ✅ Start tracking petty cash
5. ✅ Share weekly reports via WhatsApp
6. ✅ Set up weekly backup routine

Your Petty Cash Tracker is now fully operational with cloud storage!
