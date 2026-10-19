# Team-Based Access & Real-Time Sync Setup

## What's New

Your Petty Cash Tracker now supports **team-based access** with **real-time synchronization**:

✅ **Shared Data** - You and your boss see the exact same transactions
✅ **Real-Time Updates** - Changes appear instantly on all devices
✅ **Team Codes** - Simple code-based access sharing
✅ **Email Notifications** - Boss gets notified when you add transactions

## How It Works

### Team Code System
- Each team gets a unique code (e.g., `TEAM-ABC123`)
- You create the code in Settings
- Share the code with your boss
- Your boss enters the same code in their app
- Both of you now see the same data in real-time

### Real-Time Sync
- When you add a transaction, it appears on your boss's device instantly
- When your boss views the report, they see your latest updates
- No need to refresh or reload - updates happen automatically

## Setup Instructions

### Step 1: Update Database Schema

Run this SQL in your Supabase SQL Editor:

```sql
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
```

### Step 2: Enable Realtime in Supabase

1. Go to your Supabase Dashboard
2. Click **Database** → **Replication**
3. Enable replication for the `transactions` table
4. This allows real-time updates to be pushed to all connected clients

### Step 3: Set Up Your Team Code

1. Open the app
2. Go to **Settings** tab
3. Scroll to **Team Access** section
4. Click **Generate** to create a team code
5. Save your settings
6. Share the team code with your boss (e.g., via WhatsApp)

### Step 4: Boss Joins the Team

Your boss needs to:

1. Open the app on their device
2. Go to **Settings** tab
3. Scroll to **Team Access** section
4. Enter the team code you shared (e.g., `TEAM-ABC123`)
5. Save settings
6. They now see all your transactions in real-time!

## Usage Flow

### For You (Employee)

1. **Add transactions** as usual
2. Changes sync instantly to your boss's device
3. Send weekly reports via WhatsApp
4. Your boss already has the latest data - no need to wait for the report!

### For Your Boss

1. **Open the app** with the team code
2. **See all transactions** in real-time
3. **View reports** anytime - always up to date
4. **No manual syncing** needed

## Email Notifications (Optional)

To enable email notifications when you add transactions:

### Option 1: Supabase Edge Functions

Create an Edge Function in Supabase that sends emails when transactions are inserted.

```javascript
// Example Edge Function (supabase/functions/notify-transaction/index.ts)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const { record } = await req.json()
  
  // Get team settings to find recipient email
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )
  
  const { data: settings } = await supabase
    .from('settings')
    .select('recipient_email, sender_name')
    .eq('team_code', record.team_code)
    .single()
  
  if (settings?.recipient_email) {
    // Send email using your email service (e.g., SendGrid, Resend)
    // Implementation depends on your email provider
  }
  
  return new Response(JSON.stringify({ success: true }))
})
```

### Option 2: External Service

Use a service like Zapier or Make.com to:
1. Watch for new rows in the `transactions` table
2. Send an email to the recipient

## Testing the Setup

### Test Real-Time Sync

1. Open the app on two devices (or two browser tabs)
2. Log in with the same team code on both
3. Add a transaction on Device 1
4. Watch it appear instantly on Device 2
5. Delete a transaction on Device 2
6. Watch it disappear on Device 1

### Test Team Access

1. You: Add several transactions
2. Boss: Open app with team code
3. Boss should see all your transactions
4. You: Add another transaction
5. Boss: Should see it appear without refreshing

## Troubleshooting

### "Team code not working"
- Make sure both devices have the exact same team code (case-sensitive)
- Check that the SQL migration was run successfully
- Verify Realtime is enabled for the transactions table

### "Updates not syncing in real-time"
- Check browser console for WebSocket errors
- Verify Supabase Realtime is enabled
- Try refreshing the page to reconnect

### "Boss sees 0 transactions"
- Verify boss entered the correct team code
- Check that transactions have the team_code field populated
- Run this query to check: `SELECT * FROM transactions WHERE team_code = 'YOUR_CODE'`

## Security Notes

⚠️ **Current Setup**: The app uses simple team codes without authentication. Anyone with the code can access the data.

For production use with sensitive data, consider:
- Adding Supabase Auth for user authentication
- Implementing proper RLS policies based on authenticated users
- Using row-level security to restrict access by user ID

## Benefits

✅ **No more data mismatch** - Everyone sees the same thing
✅ **Real-time visibility** - Boss can check anytime
✅ **Reduced reporting overhead** - Data is always current
✅ **Better accountability** - Transparent, instant updates
✅ **Mobile-friendly** - Works on any device with the team code

## Next Steps

1. ✅ Run the SQL migration
2. ✅ Enable Realtime in Supabase
3. ✅ Generate your team code
4. ✅ Share code with your boss
5. ✅ Test real-time sync
6. ✅ Start using the app!

Your petty cash tracking is now fully collaborative and real-time!
