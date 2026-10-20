-- LEGACY / INSECURE: Do not run for the current app. See MOBILE_SUPABASE_SETUP.md
-- and supabase/migrations/202610200001_secure_cashbook.sql instead.
-- Add team_code column to transactions table
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS team_code TEXT;

-- Add recipient_email column to settings table
ALTER TABLE settings ADD COLUMN IF NOT EXISTS recipient_email TEXT;

-- Create index on team_code for faster queries
CREATE INDEX IF NOT EXISTS idx_transactions_team_code ON transactions(team_code);

-- Update RLS policies to allow team-based access
DROP POLICY IF EXISTS "Enable insert for all users" ON transactions;
DROP POLICY IF EXISTS "Enable select for all users" ON transactions;
DROP POLICY IF EXISTS "Enable update for all users" ON transactions;
DROP POLICY IF EXISTS "Enable delete for all users" ON transactions;

CREATE POLICY "Enable all operations for team members" ON transactions
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Update settings policies
DROP POLICY IF EXISTS "Enable insert for all users" ON settings;
DROP POLICY IF EXISTS "Enable select for all users" ON settings;
DROP POLICY IF EXISTS "Enable update for all users" ON settings;
DROP POLICY IF EXISTS "Enable delete for all users" ON settings;

CREATE POLICY "Enable all operations for settings" ON settings
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Enable Realtime for transactions table
ALTER PUBLICATION supabase_realtime ADD TABLE transactions;
