# Petty Cash Tracker

A professional petty cash tracking application with Supabase backend, WhatsApp integration, and PWA support.

## Features

- **Real-time Cloud Storage** - All data stored in Supabase PostgreSQL
- **PWA Installable** - Works like a native mobile app
- **Automatic Updates** - New versions deploy instantly via Vercel
- **WhatsApp Integration** - Send weekly reports directly
- **Shareable Links** - View reports without login
- **Offline Support** - Basic functionality works offline
- **Multi-user Support** - Each user has isolated data

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL)
- **Deployment**: Vercel
- **PWA**: Service Worker + Web App Manifest

## Quick Start

### Prerequisites

- Node.js 18+ installed
- Supabase account (free tier works)
- Vercel account (free tier works)
- GitHub account

### 1. Clone and Install

```bash
git clone https://github.com/YOUR_USERNAME/petty-cash-tracker.git
cd petty-cash-tracker
npm install
```

### 2. Set Up Supabase

1. Create a new project at https://supabase.com
2. Go to SQL Editor and run the SQL from `SETUP_GUIDE.md`
3. Get your Project URL and anon key from Settings > API
4. Create `.env` file:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 3. Local Development

```bash
npm run dev
```

Open http://localhost:5173

### 4. Deploy to Vercel

1. Push to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

See `QUICK_START.md` for detailed instructions.

## Project Structure

```
├── src/
│   ├── components/       # React components
│   ├── lib/             # Supabase client and database functions
│   ├── utils/           # Utility functions
│   ├── types.ts         # TypeScript types
│   ├── App.tsx          # Main app component
│   └── main.tsx         # Entry point
├── public/
│   ├── manifest.json    # PWA manifest
│   ├── sw.js           # Service worker
│   └── icon.svg        # App icon
├── .env.example        # Environment variables template
├── vercel.json         # Vercel configuration
└── SETUP_GUIDE.md      # Detailed setup instructions
```

## Database Schema

### transactions
- `id` (TEXT, PK)
- `user_id` (TEXT)
- `date` (DATE)
- `description` (TEXT)
- `category` (TEXT)
- `amount` (DECIMAL)
- `type` (TEXT: 'income' | 'expense')
- `notes` (TEXT)
- `created_at` (TIMESTAMP)

### settings
- `user_id` (TEXT, PK)
- `recipient_name` (TEXT)
- `recipient_phone` (TEXT)
- `sender_name` (TEXT)
- `company_name` (TEXT)
- `updated_at` (TIMESTAMP)

## PWA Features

### Installation
- Installable on iOS and Android
- Appears on home screen like native app
- Runs in standalone mode

### Updates
- Service worker checks for updates
- Automatic update prompts
- No app store review needed

### Offline Support
- Basic UI works offline
- Data syncs when back online

## WhatsApp Integration

### Weekly Reports
- Generate formatted weekly reports
- Send directly via WhatsApp
- Include shareable link for full view

### Shareable Links
- Encoded in URL hash
- No login required to view
- Professional report format

## Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anon/public key |

## Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
```

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Android)

## License

MIT

## Support

For issues or questions, please open an issue on GitHub.
