# Fix: "Failed to save settings" Error

## Problem
You're getting "Failed to save settings. Please try again." when trying to save your settings.

## Root Cause
The database columns `recipient_email` and `team_code` don't exist in your Supabase `settings` table yet. The app is trying to save data to columns that haven't been created.

## Solution

### Step 1: Run the Database Migration

Go to your Supabase SQL Editor and run this SQL:

```sql
-- Add team_code column to transactions table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'transactions' AND column_name = 'team_code') THEN
        ALTER TABLE transactions ADD COLUMN team_code TEXT;
    END IF;
END $$;

-- Add recipient_email and team_code columns to settings table if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'settings' AND column_name = 'recipient_email') THEN
        ALTER TABLE settings ADD COLUMN recipient_email TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'settings' AND column_name = 'team_code') THEN
        ALTER TABLE settings ADD COLUMN team_code TEXT;
    END IF;
END $$;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_transactions_team_code ON transactions(team_code);

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Enable all operations for team members" ON transactions;
DROP POLICY IF EXISTS "Enable all operations for settings" ON settings;
DROP POLICY IF EXISTS "Enable insert for all users" ON transactions;
DROP POLICY IF EXISTS "Enable select for all users" ON transactions;
DROP POLICY IF EXISTS "Enable update for all users" ON transactions;
DROP POLICY IF EXISTS "Enable delete for all users" ON transactions;
DROP POLICY IF EXISTS "Enable insert for all users" ON settings;
DROP POLICY IF EXISTS "Enable select for all users" ON settings;
DROP POLICY IF EXISTS "Enable update for all users" ON settings;
DROP POLICY IF EXISTS "Enable delete for all users" ON settings;

-- Create new policies
CREATE POLICY "Enable all operations for team members" ON transactions
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Enable all operations for settings" ON settings
  FOR ALL
  USING (true)
  WITH CHECK (true);
```

### Step 2: Verify the Columns Exist

Run this query to confirm:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'settings' 
AND column_name IN ('recipient_email', 'team_code');
```

You should see 2 rows returned.

### Step 3: Test Saving Settings

1. Open your app
2. Go to Settings tab
3. Fill in your details (name, email, etc.)
4. Click "Save Settings"
5. It should now work!

## What Was Fixed in the Code

✅ **Better error messages** - Now shows the actual error instead of generic message
✅ **Console logging** - Added debug logs to help troubleshoot
✅ **Removed unused code** - Cleaned up unused imports
✅ **Fixed lint errors** - All TypeScript errors resolved

## Files Updated

- `src/lib/database.ts` - Added better error handling and logging
- `src/App.tsx` - Improved error messages with troubleshooting tips
- `src/components/Dashboard.tsx` - Removed unused imports
- `src/components/AddTransaction.tsx` - Removed unused imports
- `TROUBLESHOOTING.md` - Comprehensive troubleshooting guide

## Next Steps

1. ✅ Run the SQL migration above
2. ✅ Verify columns exist
3. ✅ Test saving settings
4. ✅ Push code to GitHub
5. ✅ Deploy to Vercel

## If It Still Doesn't Work

1. Open browser console (F12)
2. Try to save settings
3. Copy the exact error message
4. Check the TROUBLESHOOTING.md file for specific solutions

The error message will now tell you exactly what's wrong!
