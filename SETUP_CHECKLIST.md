# Supabase Quick Setup Checklist

Use this checklist to set up Supabase for your Petty Cash Tracker.

## Pre-Setup
- [ ] Node.js installed (run `node -v` to check)
- [ ] Code editor (VS Code recommended)
- [ ] GitHub account
- [ ] Vercel account (free)

## Step 1: Create Supabase Project (5 min)
- [ ] Go to https://supabase.com
- [ ] Sign up / Log in
- [ ] Click "New Project"
- [ ] Name: `petty-cash-tracker`
- [ ] Set strong database password (SAVE IT!)
- [ ] Region: Choose closest to you
- [ ] Wait for project creation (2-3 min)

## Step 2: Create Database Tables (3 min)
- [ ] Click "SQL Editor" in left sidebar
- [ ] Click "New query"
- [ ] Copy entire SQL from SUPABASE_SETUP.md (Step 2.2)
- [ ] Paste and click "Run"
- [ ] Verify: Click "Table Editor" - see `transactions` and `settings`

## Step 3: Get API Credentials (2 min)
- [ ] Click "Settings" (gear icon) in left sidebar
- [ ] Click "API"
- [ ] Copy "Project URL" (looks like: https://xxx.supabase.co)
- [ ] Copy "anon public" key (starts with: eyJ...)

## Step 4: Create .env File (1 min)
- [ ] In project root, create file named `.env`
- [ ] Add these lines (replace with your values):

```
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR-ANON-KEY-HERE
```

## Step 5: Test Locally (2 min)
- [ ] Run `npm install`
- [ ] Run `npm run dev`
- [ ] Open http://localhost:5173
- [ ] Try adding a transaction
- [ ] Check Supabase Table Editor - see your transaction

## Step 6: Deploy to Vercel (5 min)
- [ ] Push code to GitHub:
  ```bash
  git add .
  git commit -m "Setup complete"
  git push
  ```
- [ ] Go to https://vercel.com
- [ ] Import your GitHub repo
- [ ] Add environment variables:
  - [ ] `VITE_SUPABASE_URL` = your URL
  - [ ] `VITE_SUPABASE_ANON_KEY` = your key
- [ ] Click "Deploy"
- [ ] Wait for deployment (1-2 min)

## Step 7: Install on Mobile (2 min)
- [ ] Open your Vercel URL on mobile
- [ ] iOS: Share > Add to Home Screen
- [ ] Android: Menu > Add to Home screen
- [ ] Open app from home screen
- [ ] Test adding a transaction

## Verification Checklist
- [ ] App loads without errors
- [ ] Can add transactions
- [ ] Transactions appear in Supabase Table Editor
- [ ] Can view transaction history
- [ ] Can generate weekly report
- [ ] Can send via WhatsApp
- [ ] Can install on mobile as PWA
- [ ] Updates deploy automatically

## Troubleshooting

**"Missing Supabase environment variables"**
- Check `.env` file exists in project root
- Verify variable names start with `VITE_`
- Restart dev server

**"Failed to load data"**
- Check browser console (F12)
- Verify Supabase URL and key are correct
- Check SQL was run successfully

**Data not showing in Supabase**
- Check browser console for errors
- Verify network tab shows successful requests
- Check RLS policies are enabled

**Permission denied errors**
- Re-run SQL script to ensure policies exist
- Check RLS is enabled on both tables

## Quick Commands

```bash
# Install dependencies
npm install

# Run locally
npm run dev

# Build for production
npm run build

# Deploy to Vercel
git push  # Vercel auto-deploys
```

## Important Notes

✅ **Data is stored in Supabase** - not in browser
✅ **Each browser gets unique user ID** - data is isolated
✅ **Free tier is sufficient** for personal use
✅ **Automatic backups** - Supabase handles this
✅ **Updates deploy instantly** - no app store needed

## Support

- Supabase Docs: https://supabase.com/docs
- Full Guide: See SUPABASE_SETUP.md
- Quick Start: See QUICK_START.md

---

**Estimated Total Time: 20 minutes**

Once complete, your app is production-ready!
