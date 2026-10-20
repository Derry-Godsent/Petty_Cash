-- Complete database migration for Petty Cash Tracker
-- Run this in Supabase SQL Editor

-- ============================================
-- TRANSACTIONS TABLE SETUP
-- ============================================

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

-- Add missing columns to transactions table if they don't exist
DO $$ 
BEGIN
    -- Add id column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'transactions' AND column_name = 'id') THEN
        ALTER TABLE transactions ADD COLUMN id TEXT;
    END IF;
    
    -- Add user_id column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'transactions' AND column_name = 'user_id') THEN
        ALTER TABLE transactions ADD COLUMN user_id TEXT;
    END IF;
    
    -- Add date column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'transactions' AND column_name = 'date') THEN
        ALTER TABLE transactions ADD COLUMN date DATE;
    END IF;
    
    -- Add description column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'transactions' AND column_name = 'description') THEN
        ALTER TABLE transactions ADD COLUMN description TEXT;
    END IF;
    
    -- Add category column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'transactions' AND column_name = 'category') THEN
        ALTER TABLE transactions ADD COLUMN category TEXT;
    END IF;
    
    -- Add amount column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'transactions' AND column_name = 'amount') THEN
        ALTER TABLE transactions ADD COLUMN amount DECIMAL(10, 2);
    END IF;
    
    -- Add type column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'transactions' AND column_name = 'type') THEN
        ALTER TABLE transactions ADD COLUMN type TEXT;
    END IF;
    
    -- Add notes column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'transactions' AND column_name = 'notes') THEN
        ALTER TABLE transactions ADD COLUMN notes TEXT;
    END IF;
    
    -- Add team_code column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'transactions' AND column_name = 'team_code') THEN
        ALTER TABLE transactions ADD COLUMN team_code TEXT;
    END IF;
    
    -- Add created_at column if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'transactions' AND column_name = 'created_at') THEN
        ALTER TABLE transactions ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_team_code ON transactions(team_code);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);

-- ============================================
-- SETTINGS TABLE SETUP
-- ============================================

-- Check if settings table exists, create if not
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables 
                   WHERE table_schema = 'public' AND table_name = 'settings') THEN
        CREATE TABLE settings (
            user_id TEXT PRIMARY KEY,
            recipient_name TEXT,
            recipient_phone TEXT,
            recipient_email TEXT,
            sender_name TEXT,
            company_name TEXT,
            team_code TEXT,
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
        );
    END IF;
END $$;

-- Add missing columns to settings table if they don't exist
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

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on both tables
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to avoid conflicts
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

-- ============================================
-- VERIFICATION
-- ============================================

-- Show transactions table schema
SELECT 
    'transactions' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'transactions'
ORDER BY ordinal_position;

-- Show settings table schema
SELECT 
    'settings' as table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'settings'
ORDER BY ordinal_position;

-- Show RLS status
SELECT 
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('transactions', 'settings');
