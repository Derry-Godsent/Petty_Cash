-- Check and add team_code column to transactions table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'transactions' AND column_name = 'team_code') THEN
        ALTER TABLE transactions ADD COLUMN team_code TEXT;
    END IF;
END $$;

-- Check and add recipient_email column to settings table
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

-- Create index if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_transactions_team_code ON transactions(team_code);

-- Drop all existing policies
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

-- Verify the setup
SELECT 
    'transactions' as table_name,
    COUNT(*) as column_count,
    STRING_AGG(column_name, ', ') as columns
FROM information_schema.columns 
WHERE table_name = 'transactions'
GROUP BY table_name;

SELECT 
    'settings' as table_name,
    COUNT(*) as column_count,
    STRING_AGG(column_name, ', ') as columns
FROM information_schema.columns 
WHERE table_name = 'settings'
GROUP BY table_name;
