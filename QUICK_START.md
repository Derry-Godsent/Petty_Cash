# Petty Cash Tracker - Quick Start Guide

## What You Have Now

✅ **Supabase Integration** - Real cloud database for permanent data storage
✅ **PWA Ready** - Installable on mobile devices like a native app
✅ **Auto Updates** - New versions deploy instantly to all users
✅ **Vercel Ready** - Optimized for deployment

## Step-by-Step Setup (15 minutes)

### 1. Set Up Supabase (5 minutes)

1. Go to https://supabase.com and create a free account
2. Click "New Project" and create a project
3. Once created, go to **SQL Editor** (left sidebar)
4. Paste and run this SQL:

```sql
-- Create transactions table
CREATE TABLE transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  date DATE NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_date ON transactions(date);

-- Create settings table
CREATE TABLE settings (
  user_id TEXT PRIMARY KEY,
  recipient_name TEXT,
  recipient_phone TEXT,
  sender_name TEXT,
  company_name TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Enable Row Level Security
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Allow all operations (for personal use)
CREATE POLICY "Enable all for users" ON transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all for users" ON settings FOR ALL USING (true) WITH CHECK (true);
```

5. Go to **Settings > API** and copy:
   - Project URL
   - anon public key

6. Create a file named `.env` in your project root:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 2. Deploy to Vercel (5 minutes)

1. Push your code to GitHub:
```bash
git init
git add .
git commit -m "Petty Cash Tracker with Supabase"
git remote add origin https://github.com/YOUR_USERNAME/petty-cash.git
git push -u origin main
```

2. Go to https://vercel.com and sign in with GitHub
3. Click "New Project" and import your repository
4. Add environment variables:
   - `VITE_SUPABASE_URL` = your Supabase URL
   - `VITE_SUPABASE_ANON_KEY` = your Supabase anon key
5. Click "Deploy"

Your app is live at: `https://your-project.vercel.app`

### 3. Install on Mobile (2 minutes)

**On iPhone:**
1. Open your Vercel URL in Safari
2. Tap the Share button (square with arrow)
3. Scroll down and tap "Add to Home Screen"
4. Tap "Add"

**On Android:**
1. Open your Vercel URL in Chrome
2. Tap the three dots menu
3. Tap "Add to Home screen"
4. Tap "Add"

The app icon will appear on your home screen and work like a native app!

## How It Works

### Data Storage
- All transactions and settings are stored in Supabase (PostgreSQL)
- Data persists permanently in the cloud
- Accessible from any device
- No data loss from clearing browser cache
- Supabase handles automatic backups

### PWA Updates
- When you push changes to GitHub and Vercel redeploys
- The service worker detects the new version
- Users see an update prompt next time they open the app
- Updates apply instantly without app store review

### User Isolation
- Each browser gets a unique user ID stored in localStorage
- All data is associated with that user ID
- Multiple people can use the same app URL with separate data

## Features

- Track income and expenses in Ghana Cedis (GH₵)
- Generate weekly reports
- Send reports via WhatsApp with one tap
- Share view-only report links
- Installable as mobile app
- Automatic cloud backups
- Works offline (basic functionality)

## Troubleshooting

**App won't load?**
- Check that `.env` file has correct Supabase credentials
- Verify Supabase project is active
- Check browser console for errors

**Data not showing?**
- Check internet connection
- Verify Supabase tables were created
- Check browser console for API errors

**PWA won't install?**
- Must be served over HTTPS (Vercel does this automatically)
- Clear browser cache and try again
- Make sure you're using the deployed URL, not localhost

## Next Steps

1. ✅ Create Supabase project
2. ✅ Run SQL to create tables
3. ✅ Add `.env` file with credentials
4. ✅ Push to GitHub
5. ✅ Deploy to Vercel
6. ✅ Install on mobile
7. ✅ Start tracking petty cash!

Your app is production-ready!
