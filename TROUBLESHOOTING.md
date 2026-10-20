# Troubleshooting: "Failed to save settings" Error

## What's Happening

When you see "Failed to save settings. Please try again.", it means the app is trying to save data to your Supabase database but encountering an error. The most common cause is that the database columns don't exist yet.

## Step 1: Run the Database Migration

Go to your Supabase dashboard:
1. Open https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql

2. Copy and paste this SQL:

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

3. Click "Run" or press Ctrl+Enter

4. You should see "Success. No rows returned"

## Step 2: Verify the Columns Exist

Run this query to check if the columns were created:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'settings' 
AND column_name IN ('recipient_email', 'team_code');
```

You should see 2 rows:
- recipient_email | text
- team_code | text

If you don't see these, the migration didn't work. Try running it again.

## Step 3: Check the Browser Console

After running the migration:
1. Open your app in the browser
2. Press F12 to open Developer Tools
3. Go to the "Console" tab
4. Try to save settings again
5. Look for error messages

You should now see detailed error messages like:
- "Saving settings for user: user_xxx"
- "Settings saved successfully"

If you still see errors, copy the exact error message and it will tell you what's wrong.

## Step 4: Test Saving Settings

1. Go to Settings tab
2. Fill in your name
3. Click "Save Settings"
4. It should now work without errors

## Common Errors and Solutions

### Error: "column recipient_email does not exist"
**Solution:** Run the SQL migration from Step 1

### Error: "new row violates row-level security policy"
**Solution:** The RLS policies weren't created. Run the SQL migration again.

### Error: "duplicate key value violates unique constraint"
**Solution:** This is normal - it means you're trying to save settings twice. The upsert should handle this automatically.

### Error: "relation does not exist"
**Solution:** The settings table doesn't exist. You need to create it first:

```sql
CREATE TABLE IF NOT EXISTS settings (
  user_id TEXT PRIMARY KEY,
  recipient_name TEXT,
  recipient_phone TEXT,
  recipient_email TEXT,
  sender_name TEXT,
  company_name TEXT,
  team_code TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
```

## Still Not Working?

If you're still getting errors after running the migration:

1. **Check your Supabase URL and key** in the `.env` file
2. **Refresh the page** to reload the app
3. **Clear browser cache** (Ctrl+Shift+R)
4. **Check the browser console** for detailed error messages
5. **Share the exact error message** from the console

## What the Migration Does

The SQL migration:
1. ✅ Adds `team_code` column to transactions table
2. ✅ Adds `recipient_email` column to settings table
3. ✅ Adds `team_code` column to settings table
4. ✅ Creates an index for faster team code queries
5. ✅ Sets up RLS policies to allow the app to read/write data
6. ✅ Ensures everything is set up correctly for team sync

## After Migration is Complete

Once the migration runs successfully:
- You can save email addresses
- You can generate and save team codes
- Settings will persist across page reloads
- Team sync will work properly

## Quick Checklist

- [ ] SQL migration ran successfully
- [ ] Columns exist in settings table (recipient_email, team_code)
- [ ] RLS policies are set up
- [ ] Browser console shows "Settings saved successfully"
- [ ] Can save settings without errors
- [ ] Settings persist after page reload

If all checkboxes are checked, your app is working correctly!
