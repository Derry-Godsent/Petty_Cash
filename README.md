# Petty Cash Tracker

A mobile-optimized petty cash tracking application with real-time team sync, built with React, TypeScript, Tailwind CSS, and Supabase.

## Features

- 💰 Track income and expenses in Ghana Cedis (GH₵)
- 📊 Generate weekly reports
- 📱 Mobile-optimized interface
- 👥 Real-time team sync with team codes
- 💬 Send reports via WhatsApp
- 🔍 Clickable transactions to view details
- 🏷️ Custom categories for your business
- 💾 Cloud storage with Supabase
- 📤 Export/Import backup functionality

## Quick Start

### 1. Set Up Supabase

1. Go to [Supabase](https://supabase.com) and create a new project
2. Go to SQL Editor and run the migration script from `supabase-migration.sql`
3. Go to Settings → API and copy your Project URL and anon key

### 2. Configure Environment Variables

Create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Run Development Server

```bash
npm run dev
```

### 5. Build for Production

```bash
npm run build
```

## Deployment to Vercel

1. Push your code to GitHub
2. Go to [Vercel](https://vercel.com) and import your repository
3. Add environment variables in Vercel:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy!

## Team Sync Setup

### For You (Employee):

1. Open the app → Settings → Team Access
2. Click "Generate" to create a team code
3. Save settings
4. Share the team code with your boss

### For Your Boss:

1. Open the app → Settings → Team Access
2. Enter the team code you shared
3. Save settings
4. They now see all your transactions in real-time!

## Database Schema

### transactions table
- `id` (TEXT, PK)
- `user_id` (TEXT)
- `team_code` (TEXT, optional)
- `date` (DATE)
- `description` (TEXT)
- `category` (TEXT)
- `amount` (DECIMAL)
- `type` (TEXT: 'income' | 'expense')
- `notes` (TEXT)
- `created_at` (TIMESTAMP)

### settings table
- `user_id` (TEXT, PK)
- `recipient_name` (TEXT)
- `recipient_phone` (TEXT)
- `recipient_email` (TEXT)
- `sender_name` (TEXT)
- `company_name` (TEXT)
- `team_code` (TEXT)
- `updated_at` (TIMESTAMP)

## Categories

### Expense Categories
- Transport / Fuel
- Marketing Materials
- Printing & Stationery
- Cleaning Supplies
- Laundry Supplies
- Fumigation Chemicals
- Equipment Rental
- Equipment Maintenance
- Protective Gear
- Staff Meals
- Communication / Airtime
- Courier / Delivery
- Advertising
- Client Entertainment
- Miscellaneous

### Income Categories
- Cash Advance
- Petty Cash Top-up
- Refund
- Reimbursement
- Other Income

You can also add custom categories!

## Mobile Optimizations

- Prevents iOS zoom on input focus
- Safe area support for notches
- Touch-friendly buttons (44px minimum)
- Smooth animations
- Offline-capable PWA

## Troubleshooting

### Email/Team Code Not Saving

Make sure you've run the SQL migration to add the `recipient_email` and `team_code` columns:

```sql
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS team_code TEXT;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS recipient_email TEXT;
```

### Real-Time Sync Not Working

1. Enable Realtime in Supabase: Database → Replication → Enable for `transactions` table
2. Make sure both users have the same team code
3. Check browser console for WebSocket errors

### Transactions Not Showing

1. Verify Supabase credentials in `.env`
2. Check browser console for errors
3. Verify RLS policies allow access

## Tech Stack

- **Frontend**: React 18 + TypeScript
- **Styling**: Tailwind CSS 4
- **Database**: Supabase (PostgreSQL)
- **Icons**: Lucide React
- **Date Handling**: date-fns
- **Build Tool**: Vite

## License

MIT

## Support

For issues or questions, please open an issue on GitHub.
