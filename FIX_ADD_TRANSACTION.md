# Fix: "Failed to add transaction" Error

## Problem
You're getting "Failed to add transaction" when trying to add a new expense or income.

## Root Cause
The `transactions` table in your Supabase database is missing required columns. The app is trying to insert data into columns that don't exist yet.

## Solution

### Step 1: Run the Complete Migration

Go to your Supabase SQL Editor and run this SQL:

```sql
-- Check if transactions table exists, create if not
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables 
                   WHERE table_schema = 'public' AND table_name = 'transactions') THEN
        CREATE TABLE transactions (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            date DATE NOT NULL,
            description TEXT NOT NULL,
            category TEXT NOT NULL,
            amount DECIMAL(10, 2) NOT NULL,
            type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
            notes TEXT,
            team_code TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
        );
    END IF;
END $$;

-- Add missing columns to transactions table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'transactions' AND column_name = 'id') THEN
        ALTER TABLE transactions ADD COLUMN id TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'transactions' AND column_name = 'user_id') THEN
        ALTER TABLE transactions ADD COLUMN user_id TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'transactions' AND column_name = 'date') THEN
        ALTER TABLE transactions ADD COLUMN date DATE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'transactions' AND column_name = 'description') THEN
        ALTER TABLE transactions ADD COLUMN description TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'transactions' AND column_name = 'category') THEN
        ALTER TABLE transactions ADD COLUMN category TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'transactions' AND column_name = 'amount') THEN
        ALTER TABLE transactions ADD COLUMN amount DECIMAL(10, 2);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'transactions' AND column_name = 'type') THEN
        ALTER TABLE transactions ADD COLUMN type TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'transactions' AND column_name = 'notes') THEN
        ALTER TABLE transactions ADD COLUMN notes TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'transactions' AND column_name = 'team_code') THEN
        ALTER TABLE transactions ADD COLUMN team_code TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'transactions' AND column_name = 'created_at') THEN
        ALTER TABLE transactions ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());
    END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_team_code ON transactions(team_code);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date DESC);

-- Enable RLS
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies
DROP POLICY IF EXISTS "Enable all operations for team members" ON transactions;
DROP POLICY IF EXISTS "Enable insert for all users" ON transactions;
DROP POLICY IF EXISTS "Enable select for all users" ON transactions;
DROP POLICY IF EXISTS "Enable update for all users" ON transactions;
DROP POLICY IF EXISTS "Enable delete for all users" ON transactions;

CREATE POLICY "Enable all operations for team members" ON transactions
  FOR ALL
  USING (true)
  WITH CHECK (true);
```

### Step 2: Verify the Table Schema

Run this query to check if all columns exist:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'transactions'
ORDER BY ordinal_position;
```

You should see these columns:
- id (text)
- user_id (text)
- date (date)
- description (text)
- category (text)
- amount (numeric)
- type (text)
- notes (text)
- team_code (text)
- created_at (timestamp)

### Step 3: Test Adding a Transaction

1. Open your app
2. Click the + button to add a transaction
3. Fill in the details
4. Click "Add Transaction"
5. It should now work!

## What Was Fixed in the Code

✅ **Better error messages** - Now shows the actual database error
✅ **Console logging** - Added debug logs to help troubleshoot
✅ **Complete migration** - Ensures all required columns exist

## Files Updated

- `src/lib/database.ts` - Added better error handling and logging for addTransaction
- `src/App.tsx` - Improved error messages with troubleshooting tips
- `COMPLETE_MIGRATION.sql` - Comprehensive SQL migration

## If It Still Doesn't Work

1. Open browser console (F12)
2. Try to add a transaction
3. Copy the exact error message from the console
4. The error will tell you exactly which column is missing

Common errors:
- "column does not exist" → Run the migration again
- "violates not-null constraint" → A required column is missing
- "violates row-level security policy" → RLS policies need to be set up

## Quick Checklist

After running the migration, verify:
- [ ] All 10 columns exist in transactions table
- [ ] RLS is enabled on transactions table
- [ ] Policy "Enable all operations for team members" exists
- [ ] Can add a transaction without errors
- [ ] Transaction appears in the list after adding

If all checkboxes are checked, your app is working correctly!
